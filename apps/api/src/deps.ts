import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from './config';

export const pg = new Pool({ connectionString: config.databaseUrl, max: 10 });

export const redis = new Redis(config.redisUrl, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: true,
});
redis.on('error', (err) => {
  // ioredis retries automatically; just log
  console.error('[redis]', err.message);
});
