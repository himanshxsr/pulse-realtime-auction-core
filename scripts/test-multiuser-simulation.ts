import type {
  AuctionExtendedPayload,
  AuctionState,
  BidAcceptedPayload,
  BidSubmissionPayload,
  OutbidAlertPayload,
} from '@pulse/shared-types';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env['TEST_SERVER_URL'] || 'http://localhost:4000';
const AUCTION_ID = 'demo-auction-1';

interface TestUser {
  id: string;
  name: string;
  socket?: Socket;
  latestState?: AuctionState;
  acceptedBids: BidAcceptedPayload[];
  outbidAlerts: OutbidAlertPayload[];
  extendedEvents: AuctionExtendedPayload[];
}

const testUsers: TestUser[] = [
  { id: 'bidder_aakash', name: 'Aakash (Mumbai)', acceptedBids: [], outbidAlerts: [], extendedEvents: [] },
  { id: 'bidder_priya', name: 'Priya (Bengaluru)', acceptedBids: [], outbidAlerts: [], extendedEvents: [] },
  { id: 'bidder_vikram', name: 'Vikram (Delhi)', acceptedBids: [], outbidAlerts: [], extendedEvents: [] },
  { id: 'bidder_ananya', name: 'Ananya (Kolkata)', acceptedBids: [], outbidAlerts: [], extendedEvents: [] },
  { id: 'bidder_rohan', name: 'Rohan (Ahmedabad)', acceptedBids: [], outbidAlerts: [], extendedEvents: [] },
];

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function runSimulation() {
  console.log('===============================================================');
  console.log('⚡ PULSE REALTIME AUCTION CORE - MULTI-USER SIMULATION TEST ⚡');
  console.log(`Connecting to: ${SERVER_URL} | Auction: ${AUCTION_ID}`);
  console.log('===============================================================\n');

  // STEP 1: Connect all 5 virtual bidders
  console.log('📌 STEP 1: Connecting 5 virtual bidders over Socket.io...');
  for (const u of testUsers) {
    u.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout connecting ${u.name}`)), 10000);
      u.socket!.on('connect', () => {
        clearTimeout(timeout);
        u.socket!.emit('auction:join', { auctionId: AUCTION_ID, userId: u.id });
        u.socket!.emit('room:join', { auctionId: AUCTION_ID });
        resolve();
      });
    });

    u.socket!.on('auction:state', (state: AuctionState) => {
      u.latestState = state;
    });

    u.socket!.on('bid:accepted', (payload: BidAcceptedPayload) => {
      u.acceptedBids.push(payload);
      u.latestState = payload.newState;
    });

    u.socket!.on('bid:outbid', (payload: OutbidAlertPayload) => {
      u.outbidAlerts.push(payload);
    });

    u.socket!.on('auction:extended', (payload: AuctionExtendedPayload) => {
      u.extendedEvents.push(payload);
    });

    console.log(`  ✓ ${u.name} connected [Socket ID: ${u.socket.id}]`);
  }

  // Initial reset to guarantee clean test state
  testUsers[0]!.socket!.emit('auction:reset', { auctionId: AUCTION_ID, durationMinutes: 5 });
  await sleep(1200);

  // Verify initial state received by all
  for (const u of testUsers) {
    if (!u.latestState) {
      throw new Error(`❌ ${u.name} did not receive initial auction:state!`);
    }
  }
  console.log(
    `  ✅ All 5 bidders successfully received initial auction state. Title: "${testUsers[0]!.latestState!.title}"\n`
  );

  // STEP 2: Bidder 1 (Aakash) raises paddle (+25k)
  console.log('📌 STEP 2: Bidder 1 (Aakash) raises paddle (+₹25,000)...');
  const currentState = testUsers[0]!.latestState!;
  const bid1Amount = currentState.currentPriceCents + currentState.minIncrementCents;

  const payload1: BidSubmissionPayload = {
    auctionId: AUCTION_ID,
    bidderId: testUsers[0]!.id,
    bidderName: testUsers[0]!.name,
    amountCents: bid1Amount,
    clientTimestamp: Date.now(),
  };

  testUsers[0]!.socket!.emit('auction:bid', payload1);
  await sleep(1000);

  // Check acceptance on all bidders
  for (const u of testUsers) {
    if (u.latestState?.leaderId !== testUsers[0]!.id) {
      throw new Error(
        `❌ Leader mismatch on ${u.name}. Expected ${testUsers[0]!.id}, got ${u.latestState?.leaderId}`
      );
    }
  }
  console.log(
    `  ✅ Bidder 1 accepted as leader on all 5 clients! Price: ₹${(bid1Amount / 100).toLocaleString('en-IN')}\n`
  );

  // STEP 3: Bidder 2 (Priya) outbids (+50k)
  console.log('📌 STEP 3: Bidder 2 (Priya) outbids (+₹50,000)...');
  const bid2Amount =
    testUsers[1]!.latestState!.currentPriceCents +
    testUsers[1]!.latestState!.minIncrementCents +
    2500000;

  const payload2: BidSubmissionPayload = {
    auctionId: AUCTION_ID,
    bidderId: testUsers[1]!.id,
    bidderName: testUsers[1]!.name,
    amountCents: bid2Amount,
    clientTimestamp: Date.now(),
  };

  testUsers[1]!.socket!.emit('auction:bid', payload2);
  await sleep(1000);

  // Verify Bidder 1 received outbid alert
  if (testUsers[0]!.outbidAlerts.length === 0) {
    throw new Error('❌ Bidder 1 (Aakash) did NOT receive bid:outbid alert!');
  }
  console.log(
    `  ✅ Bidder 1 received outbid alert! Bidder 2 (Priya) is now leading at ₹${(bid2Amount / 100).toLocaleString('en-IN')}\n`
  );

  // STEP 4: Bidder 3 (Vikram) submits High-Value Custom Bid (₹30,00,000)
  console.log('📌 STEP 4: Bidder 3 (Vikram) submits custom bid (₹30,00,000)...');
  const customAmountCents = 300000000; // ₹30,00,000

  const payload3: BidSubmissionPayload = {
    auctionId: AUCTION_ID,
    bidderId: testUsers[2]!.id,
    bidderName: testUsers[2]!.name,
    amountCents: customAmountCents,
    clientTimestamp: Date.now(),
  };

  testUsers[2]!.socket!.emit('auction:bid', payload3);
  await sleep(1000);

  for (const u of testUsers) {
    if (u.latestState?.currentPriceCents !== customAmountCents) {
      throw new Error(
        `❌ Price mismatch on ${u.name}. Expected ${customAmountCents}, got ${u.latestState?.currentPriceCents}`
      );
    }
  }
  console.log(
    `  ✅ High-value custom bid accepted across all clients! New Price: ₹${(customAmountCents / 100).toLocaleString('en-IN')}\n`
  );

  // STEP 5: Bidder 4 (Ananya) triggers anti-sniping (clock < 30s) -> verify auction:extended (+60s)
  console.log('📌 STEP 5: Bidder 4 (Ananya) triggers anti-sniping (clock < 30s)...');
  // First, set auction duration to 20 seconds (< 30s snipe window)
  testUsers[4]!.socket!.emit('auction:reset', { auctionId: AUCTION_ID, durationMinutes: 0.35 });
  await sleep(1200);

  const bid4Amount =
    testUsers[3]!.latestState!.currentPriceCents + testUsers[3]!.latestState!.minIncrementCents;

  const payload4: BidSubmissionPayload = {
    auctionId: AUCTION_ID,
    bidderId: testUsers[3]!.id,
    bidderName: testUsers[3]!.name,
    amountCents: bid4Amount,
    clientTimestamp: Date.now(),
  };

  testUsers[3]!.socket!.emit('auction:bid', payload4);
  await sleep(1200);

  for (const u of testUsers) {
    const hasExtendedSignal =
      u.extendedEvents.length > 0 || u.acceptedBids.some((b) => b.wasExtended);
    if (!hasExtendedSignal) {
      throw new Error(`❌ ${u.name} did NOT receive anti-sniping extension (+60s) signal!`);
    }
  }
  console.log(
    `  ✅ Anti-sniping triggered! All 5 bidders received anti-sniping extension (+60s) confirmation.\n`
  );

  // STEP 6: Bidder 5 (Rohan) triggers Native WebSocket Reset
  console.log('📌 STEP 6: Bidder 5 (Rohan) triggers native WebSocket auction reset...');
  testUsers[4]!.socket!.emit('auction:reset', { auctionId: AUCTION_ID, durationMinutes: 5 });
  await sleep(1200);

  for (const u of testUsers) {
    if (u.latestState?.status !== 'ACTIVE') {
      throw new Error(
        `❌ Auction status after reset on ${u.name} is ${u.latestState?.status}, expected ACTIVE`
      );
    }
  }
  console.log(`  ✅ All 5 bidders received reset auction state! Status: ACTIVE, Clock: 5:00\n`);

  // Cleanup connections
  console.log('🧹 Cleaning up socket connections...');
  for (const u of testUsers) {
    u.socket?.disconnect();
  }

  console.log('===============================================================');
  console.log('🎉 ALL 6 SIMULATION TESTS PASSED SUCCESSFULLY! (EXIT 0)');
  console.log('===============================================================');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('\n❌ SIMULATION TEST FAILED:', err.message || err);
  for (const u of testUsers) {
    u.socket?.disconnect();
  }
  process.exit(1);
});
