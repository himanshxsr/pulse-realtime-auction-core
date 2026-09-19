import { closeWorkerConnections } from './config/db.js';
import { settlementWorker } from './processors/settlementProcessor.js';
import { settlementQueue } from './queues/settlementQueue.js';

async function bootstrapWorker(): Promise<void> {
  console.log('[Worker] BullMQ Auction Settlement Worker booting up...');
  await settlementWorker.waitUntilReady();
  console.log('[Worker] Settlement Worker ready. Listening on queue "auction-settlement".');
}

async function handleShutdown(signal: string): Promise<void> {
  console.log(`[Worker] Received ${signal}, closing BullMQ worker and database connections...`);
  try {
    await settlementWorker.close();
    await settlementQueue.close();
    await closeWorkerConnections();
    console.log('[Worker] Shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  handleShutdown('SIGINT').catch(() => process.exit(1));
});

process.on('SIGTERM', () => {
  handleShutdown('SIGTERM').catch(() => process.exit(1));
});

bootstrapWorker().catch((err) => {
  console.error('[Worker] Failed to start BullMQ settlement worker:', err);
  process.exit(1);
});
