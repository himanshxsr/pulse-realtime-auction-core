import type {
  AuctionState,
  AuctionStatus,
  BidRecord,
  BidResult,
  BidSubmissionPayload,
} from '@pulse/shared-types';
import fs from 'node:fs';
import path from 'node:path';
import { cmdClient } from '../config/redis.js';

function getLuaScriptSource(): string {
  const possiblePaths = [
    path.join(__dirname, '../lua/resolve_bid.lua'),
    path.join(__dirname, '../../src/lua/resolve_bid.lua'),
    path.join(process.cwd(), 'src/lua/resolve_bid.lua'),
    path.join(process.cwd(), 'apps/server/src/lua/resolve_bid.lua'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }

  throw new Error('resolve_bid.lua script file not found');
}

export class BidEngine {
  private scriptSha: string | null = null;
  private luaSource: string;

  constructor() {
    this.luaSource = getLuaScriptSource();
  }

  public async init(): Promise<void> {
    try {
      const sha = await cmdClient.script('LOAD', this.luaSource);
      if (typeof sha === 'string') {
        this.scriptSha = sha;
      } else {
        throw new Error('Failed to load Redis Lua script');
      }
    } catch (error) {
      console.error('[BidEngine] Error loading Lua script into Redis:', error);
      throw error;
    }
  }

  public async submitBid(payload: BidSubmissionPayload): Promise<BidResult> {
    if (!this.scriptSha) {
      await this.init();
    }

    const stateKey = `auction:${payload.auctionId}:state`;
    const bidsKey = `auction:${payload.auctionId}:bids`;
    const proxiesKey = `auction:${payload.auctionId}:proxies`;

    const nowMs = Date.now().toString();
    const snipeWindowMs = '30000';
    const extendDurationMs = '60000';

    console.log('[BidEngine] Executing evalsha for bid:', {
      auctionId: payload.auctionId,
      bidderId: payload.bidderId,
      amountCents: payload.amountCents,
      keysCount: 3,
    });

    try {
      const resultJson = (await cmdClient.evalsha(
        this.scriptSha!,
        3,
        stateKey,
        bidsKey,
        proxiesKey,
        payload.bidderId,
        payload.bidderName,
        payload.amountCents.toString(),
        nowMs,
        snipeWindowMs,
        extendDurationMs
      )) as string;

      const parsed: BidResult = JSON.parse(resultJson);
      if (!parsed.success) {
        console.warn(
          `[BidEngine] Bid REJECTED by Lua script with code "${parsed.code}":`,
          parsed.reason || parsed
        );
      } else {
        console.log('[BidEngine] Bid ACCEPTED by Lua script:', parsed);
      }

      return parsed;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('NOSCRIPT')) {
        await this.init();
        const resultJson = (await cmdClient.evalsha(
          this.scriptSha!,
          3,
          stateKey,
          bidsKey,
          proxiesKey,
          payload.bidderId,
          payload.bidderName,
          payload.amountCents.toString(),
          nowMs,
          snipeWindowMs,
          extendDurationMs
        )) as string;
        const parsed = JSON.parse(resultJson) as BidResult;
        if (!parsed.success) {
          console.warn(
            `[BidEngine] Bid REJECTED by Lua script with code "${parsed.code}":`,
            parsed.reason || parsed
          );
        } else {
          console.log('[BidEngine] Bid ACCEPTED by Lua script:', parsed);
        }
        return parsed;
      }

      console.error('[BidEngine] Error executing submitBid:', errorMsg);
      return {
        code: 'ERROR',
        success: false,
        reason: errorMsg,
      };
    }
  }

  public async getAuctionState(auctionId: string): Promise<AuctionState | null> {
    const stateKey = `auction:${auctionId}:state`;
    let rawState = await cmdClient.hgetall(stateKey);

    if (!rawState || Object.keys(rawState).length === 0) {
      // Auto-seed lot if requested on demand
      await this.seedDemoAuction(auctionId);
      rawState = await cmdClient.hgetall(stateKey);
      if (!rawState || Object.keys(rawState).length === 0) {
        return null;
      }
    }

    return {
      id: rawState['id'] ?? auctionId,
      slug: rawState['slug'] ?? '',
      title: rawState['title'] ?? '',
      description: rawState['description'] ?? '',
      startingPriceCents: parseInt(rawState['startingPriceCents'] ?? '0', 10),
      reservePriceCents: parseInt(rawState['reservePriceCents'] ?? '0', 10),
      currentPriceCents: parseInt(rawState['currentPriceCents'] ?? '0', 10),
      minIncrementCents: parseInt(rawState['minIncrementCents'] ?? '0', 10),
      leaderId: rawState['leaderId'] || null,
      leaderName: rawState['leaderName'] || null,
      startTime: parseInt(rawState['startTime'] ?? '0', 10),
      endTime: parseInt(rawState['endTime'] ?? '0', 10),
      status: (rawState['status'] ?? 'DRAFT') as AuctionStatus,
      bidCount: parseInt(rawState['bidCount'] ?? '0', 10),
      antiSnipeCount: parseInt(rawState['antiSnipeCount'] ?? '0', 10),
      updatedAt: parseInt(rawState['updatedAt'] ?? '0', 10),
    };
  }

  public async getRecentBids(auctionId: string, limit: number = 20): Promise<BidRecord[]> {
    const bidsKey = `auction:${auctionId}:bids`;
    const rawBids = await cmdClient.zrevrange(bidsKey, 0, limit - 1, 'WITHSCORES');

    const records: BidRecord[] = [];
    for (let i = 0; i < rawBids.length; i += 2) {
      const member = rawBids[i];
      const scoreStr = rawBids[i + 1];

      if (member && scoreStr) {
        const parts = member.split(':');
        const bidderId = parts[0] ?? '';
        const bidderName = parts[1] ?? '';
        const timestamp = parseInt(parts[2] ?? '0', 10);
        const amountCents = parseInt(scoreStr, 10);

        records.push({
          id: `${auctionId}-${timestamp}-${i}`,
          auctionId,
          bidderId,
          bidderName,
          amountCents,
          timestamp,
        });
      }
    }

    return records;
  }

  public async seedDemoAuction(auctionId: string): Promise<AuctionState> {
    const stateKey = `auction:${auctionId}:state`;
    const exists = await cmdClient.exists(stateKey);

    if (exists === 0) {
      const now = Date.now();
      const startTime = now - 3600000;
      const endTime = now + 300000; // 5 minutes default

      let lotData: Record<string, string>;

      if (auctionId === 'lot-41' || auctionId === 'demo-auction-41') {
        lotData = {
          id: auctionId,
          slug: 'ms-dhoni-2011-wc-jersey',
          title: 'MS Dhoni 2011 World Cup Final Winning Match Jersey',
          description:
            'Original match-worn shirt from the historic 2011 World Cup victory in Mumbai with player signatures.',
          startingPriceCents: '120000000', // ₹12,00,000
          reservePriceCents: '150000000', // ₹15,00,000
          currentPriceCents: '180000000', // ₹18,00,000
          minIncrementCents: '2500000', // ₹25,000
          leaderId: 'user-bengaluru-03',
          leaderName: 'Priya Nair (Bengaluru)',
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          status: 'ACTIVE',
          bidCount: '3',
          antiSnipeCount: '0',
          updatedAt: now.toString(),
        };
      } else if (auctionId === 'lot-43' || auctionId === 'demo-auction-43') {
        lotData = {
          id: auctionId,
          slug: '1983-world-cup-gold-medal-replica',
          title: '1983 Prudential World Cup Historic Gold Medal Replica',
          description:
            'Official 40th anniversary commemorative 24k gold-plated medal crafted by Lord’s Cricket Ground silversmiths.',
          startingPriceCents: '80000000', // ₹8,00,000
          reservePriceCents: '100000000', // ₹10,00,000
          currentPriceCents: '120000000', // ₹12,00,000
          minIncrementCents: '2500000', // ₹25,000
          leaderId: 'user-ahmedabad-04',
          leaderName: 'Rohan Mehta (Ahmedabad)',
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          status: 'ACTIVE',
          bidCount: '2',
          antiSnipeCount: '0',
          updatedAt: now.toString(),
        };
      } else {
        // Default Lot #42 (demo-auction-1)
        lotData = {
          id: auctionId,
          slug: 'virat-kohli-2016-match-bat',
          title: 'Virat Kohli 2016 IPL Record-Breaking Match Bat (Signed)',
          description:
            'Authentic match-used bat from the historic 2016 IPL season with official hologram verification.',
          startingPriceCents: '160000000', // ₹16,00,000 (starting)
          reservePriceCents: '200000000', // ₹20,00,000 (reserve)
          currentPriceCents: '245000000', // ₹24,50,000 (current)
          minIncrementCents: '2500000', // ₹25,000
          leaderId: 'user-delhi-01',
          leaderName: 'Vikram Malhotra (Delhi)',
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          status: 'ACTIVE',
          bidCount: '4',
          antiSnipeCount: '0',
          updatedAt: now.toString(),
        };
      }

      await cmdClient.hset(stateKey, lotData);

      const bidsKey = `auction:${auctionId}:bids`;
      const initialBidMember = `${lotData['leaderId']}:${lotData['leaderName']}:${now - 60000}`;
      await cmdClient.zadd(bidsKey, parseInt(lotData['currentPriceCents']!, 10), initialBidMember);
    }

    const state = await this.getAuctionState(auctionId);
    if (!state) {
      throw new Error(`Failed to initialize or fetch demo auction ${auctionId}`);
    }
    return state;
  }

  public async resetDemoAuction(
    auctionId: string,
    durationMinutes: number = 5
  ): Promise<AuctionState> {
    const stateKey = `auction:${auctionId}:state`;
    const bidsKey = `auction:${auctionId}:bids`;

    const now = Date.now();
    const startTime = now - 3600000;
    const endTime = now + durationMinutes * 60 * 1000;

    let lotData: Record<string, string>;

    if (auctionId === 'lot-41' || auctionId === 'demo-auction-41') {
      lotData = {
        id: auctionId,
        slug: 'ms-dhoni-2011-wc-jersey',
        title: 'MS Dhoni 2011 World Cup Final Winning Match Jersey',
        description:
          'Original match-worn shirt from the historic 2011 World Cup victory in Mumbai with player signatures.',
        startingPriceCents: '120000000', // ₹12,00,000
        reservePriceCents: '150000000',
        currentPriceCents: '180000000', // ₹18,00,000
        minIncrementCents: '2500000',
        leaderId: 'user-bengaluru-03',
        leaderName: 'Priya Nair (Bengaluru)',
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        status: 'ACTIVE',
        bidCount: '3',
        antiSnipeCount: '0',
        updatedAt: now.toString(),
      };
    } else if (auctionId === 'lot-43' || auctionId === 'demo-auction-43') {
      lotData = {
        id: auctionId,
        slug: '1983-world-cup-gold-medal-replica',
        title: '1983 Prudential World Cup Historic Gold Medal Replica',
        description:
          'Official 40th anniversary commemorative 24k gold-plated medal crafted by Lord’s Cricket Ground silversmiths.',
        startingPriceCents: '80000000', // ₹8,00,000
        reservePriceCents: '100000000',
        currentPriceCents: '120000000', // ₹12,00,000
        minIncrementCents: '2500000',
        leaderId: 'user-ahmedabad-04',
        leaderName: 'Rohan Mehta (Ahmedabad)',
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        status: 'ACTIVE',
        bidCount: '2',
        antiSnipeCount: '0',
        updatedAt: now.toString(),
      };
    } else {
      lotData = {
        id: auctionId,
        slug: 'virat-kohli-2016-match-bat',
        title: 'Virat Kohli 2016 IPL Record-Breaking Match Bat (Signed)',
        description:
          'Authentic match-used bat from the historic 2016 IPL season with official hologram verification.',
        startingPriceCents: '160000000', // ₹16,00,000
        reservePriceCents: '200000000',
        currentPriceCents: '245000000', // ₹24,50,000
        minIncrementCents: '2500000', // ₹25,000
        leaderId: 'user-delhi-01',
        leaderName: 'Vikram Malhotra (Delhi)',
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        status: 'ACTIVE',
        bidCount: '4',
        antiSnipeCount: '0',
        updatedAt: now.toString(),
      };
    }

    await cmdClient.hset(stateKey, lotData);

    await cmdClient.del(bidsKey);
    const initialBidMember = `${lotData['leaderId']}:${lotData['leaderName']}:${now - 60000}`;
    await cmdClient.zadd(bidsKey, parseInt(lotData['currentPriceCents']!, 10), initialBidMember);

    const updatedState = await this.getAuctionState(auctionId);
    if (!updatedState) {
      throw new Error(`Failed to fetch state after reset for auction ${auctionId}`);
    }

    console.log(
      `[BidEngine] Demo auction "${auctionId}" reset successfully for ${durationMinutes} minutes.`
    );
    return updatedState;
  }
}

export const bidEngine = new BidEngine();
