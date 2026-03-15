import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis.js';

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: 20, // 20 messages
    duration: 60, // per 60 seconds
});

export const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.user.id);
        next();
    } catch (rejRes) {
        res.status(429).json({ message: 'Too many requests. Please wait a minute.' });
    }
};
