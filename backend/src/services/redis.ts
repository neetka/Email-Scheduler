import Redis from 'ioredis';
import { config } from '../config';

export const redisConnectionOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
};

export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

export async function disconnectRedis() {
  await redisClient.quit();
  console.log('🔌 Redis disconnected');
}
