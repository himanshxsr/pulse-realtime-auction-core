import { Redis, type RedisOptions } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://127.0.0.1:6379';

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number): number {
    return Math.min(times * 50, 2000);
  },
};

export const pubClient = new Redis(REDIS_URL, redisOptions);
export const subClient = new Redis(REDIS_URL, redisOptions);
export const cmdClient = new Redis(REDIS_URL, redisOptions);

pubClient.on('error', (err: Error) => {
  console.error('[Redis pubClient Error]:', err.message);
});

subClient.on('error', (err: Error) => {
  console.error('[Redis subClient Error]:', err.message);
});

cmdClient.on('error', (err: Error) => {
  console.error('[Redis cmdClient Error]:', err.message);
});

export async function closeRedisConnections(): Promise<void> {
  await Promise.all([
    pubClient.quit().catch(() => {}),
    subClient.quit().catch(() => {}),
    cmdClient.quit().catch(() => {}),
  ]);
}
