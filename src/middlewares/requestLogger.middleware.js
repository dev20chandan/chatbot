import Log from '../models/log.model.js';

/**
 * Middleware to log every incoming request and its performance
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', async () => {
        try {
            const responseTimeMs = Date.now() - start;
            
            // Fail silently to prevent logging issues from affecting the user experience
            await Log.create({
                userId: req.user?.id || null, // Assumes auth middleware has run
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                responseTimeMs
            });
        } catch (error) {
            // Log to console as fallback, but don't throw
            console.error('Logging failure:', error.message);
        }
    });

    next();
};
