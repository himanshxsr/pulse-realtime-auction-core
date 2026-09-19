import { Redis, type RedisOptions } from 'ioredis';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL =
  process.env['DATABASE_URL'] ||
  'postgres://pulse_user:pulse_password@localhost:5432/pulse_auction';

export const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pgPool.on('error', (err: Error) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

const REDIS_URL = process.env['REDIS_URL'] || 'redis://127.0.0.1:6379';

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number): number {
    return Math.min(times * 50, 2000);
  },
};

export const redisConnection = new Redis(REDIS_URL, redisOptions);

redisConnection.on('error', (err: Error) => {
  console.error('[Worker Redis Error]:', err.message);
});

export async function closeWorkerConnections(): Promise<void> {
  await Promise.all([
    pgPool.end().catch(() => {}),
    redisConnection.quit().catch(() => {}),
  ]);
}
