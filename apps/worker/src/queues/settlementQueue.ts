import { Queue, type Job } from 'bullmq';
import { redisConnection } from '../config/db.js';

export interface SettlementJobData {
  auctionId: string;
}

export const settlementQueue = new Queue<SettlementJobData>('auction-settlement', {
  connection: redisConnection,
});

export async function scheduleAuctionSettlement(
  auctionId: string,
  delayMs: number
): Promise<Job<SettlementJobData>> {
  const jobId = `settle-${auctionId}`;
  return await settlementQueue.add(
    'settle-auction',
    { auctionId },
    {
      delay: Math.max(0, delayMs),
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}
