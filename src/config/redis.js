import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

redisClient.on('connect', () => console.log('Redis Connected'));
redisClient.on('error', (err) => console.log('Redis Error:', err));

export default redisClient;
