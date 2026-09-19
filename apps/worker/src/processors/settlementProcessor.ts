import { Worker, type Job } from 'bullmq';
import crypto from 'node:crypto';
import { pgPool, redisConnection } from '../config/db.js';
import { scheduleAuctionSettlement, type SettlementJobData } from '../queues/settlementQueue.js';

function ensureUuid(id: string): string {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(id)) {
    return id;
  }
  const hash = crypto.createHash('sha256').update(id).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

export async function processSettlementJob(job: Job<SettlementJobData>): Promise<Record<string, unknown>> {
  const { auctionId } = job.data;
  const stateKey = `auction:${auctionId}:state`;

  const rawState = await redisConnection.hgetall(stateKey);
  if (!rawState || Object.keys(rawState).length === 0) {
    console.warn(`[SettlementProcessor] Auction state not found in Redis for auction: ${auctionId}`);
    return { status: 'skipped', reason: 'state_not_found' };
  }

  const endTimeMs = parseInt(rawState['endTime'] ?? '0', 10);
  const nowMs = Date.now();

  if (nowMs < endTimeMs) {
    const remainingMs = endTimeMs - nowMs;
    console.log(
      `[SettlementProcessor] Auction ${auctionId} extended during bidding. Rescheduling settlement in ${remainingMs}ms`
    );
    await scheduleAuctionSettlement(auctionId, remainingMs);
    return { status: 'rescheduled', remainingMs };
  }

  const leaderId = rawState['leaderId'] || null;
  const leaderName = rawState['leaderName'] || 'Anonymous Bidder';
  const currentPriceCents = parseInt(rawState['currentPriceCents'] || '0', 10);
  const startingPriceCents = parseInt(rawState['startingPriceCents'] || '0', 10);
  const reservePriceCents = parseInt(rawState['reservePriceCents'] || '0', 10);
  const title = rawState['title'] || 'Auction Asset';
  const slug = rawState['slug'] || auctionId;

  const isSold = leaderId !== null && currentPriceCents >= reservePriceCents;
  const finalStatus = isSold ? 'COMPLETED' : 'UNSOLD';

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    let winnerUuid: string | null = null;
    if (leaderId) {
      winnerUuid = ensureUuid(leaderId);
      const userEmail = `${leaderId.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
      await client.query(
        `INSERT INTO users (id, email, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [winnerUuid, userEmail, leaderName]
      );
    }

    const auctionUuid = ensureUuid(auctionId);
    await client.query(
      `INSERT INTO auctions (id, slug, title, description, starting_price_cents, reserve_price_cents, current_price_cents, status, winner_id, start_time, end_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '1 hour', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         winner_id = EXCLUDED.winner_id,
         current_price_cents = EXCLUDED.current_price_cents,
         updated_at = NOW()`,
      [
        auctionUuid,
        slug,
        title,
        'Settled auction record',
        startingPriceCents,
        reservePriceCents,
        currentPriceCents,
        finalStatus,
        winnerUuid,
      ]
    );

    if (isSold && winnerUuid) {
      const timestamp = Date.now();
      const hashInput = `${auctionId}:${winnerUuid}:${currentPriceCents}:${timestamp}`;
      const transactionHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      await client.query(
        `INSERT INTO settlement_records (auction_id, winner_id, final_amount_cents, transaction_hash, settled_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (auction_id) DO UPDATE SET
           winner_id = EXCLUDED.winner_id,
           final_amount_cents = EXCLUDED.final_amount_cents,
           transaction_hash = EXCLUDED.transaction_hash,
           settled_at = NOW()`,
        [auctionUuid, winnerUuid, currentPriceCents, transactionHash]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[SettlementProcessor] SQL Transaction failed for auction ${auctionId}:`, error);
    throw error;
  } finally {
    client.release();
  }

  await redisConnection.hset(stateKey, 'status', finalStatus);

  const conclusionEvent = JSON.stringify({
    type: 'AUCTION_ENDED',
    auctionId,
    winnerId: leaderId,
    winnerName: leaderName,
    finalPriceCents: currentPriceCents,
    status: finalStatus,
    timestamp: Date.now(),
  });
  await redisConnection.publish(`auction:${auctionId}:events`, conclusionEvent);

  console.log(
    `[SettlementProcessor] Auction ${auctionId} successfully settled as ${finalStatus}. Winner: ${leaderName} (${currentPriceCents} cents)`
  );

  return {
    status: 'completed',
    auctionId,
    finalStatus,
    currentPriceCents,
    winnerId: leaderId,
  };
}

export const settlementWorker = new Worker<SettlementJobData>(
  'auction-settlement',
  processSettlementJob,
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

settlementWorker.on('completed', (job: Job<SettlementJobData>) => {
  console.log(`[BullMQ Worker] Job ${job.id} completed for auction ${job.data.auctionId}`);
});

settlementWorker.on('failed', (job: Job<SettlementJobData> | undefined, err: Error) => {
  console.error(`[BullMQ Worker] Job ${job?.id ?? 'unknown'} failed:`, err.message);
});
