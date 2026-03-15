import ErrorLog from '../models/errorLog.model.js';

/**
 * Global Error Handler Middleware
 */
export const errorHandler = async (err, req, res, next) => {
    try {
        // Save error details to MongoDB
        await ErrorLog.create({
            userId: req.user?.id || null,
            endpoint: req.originalUrl,
            method: req.method,
            errorMessage: err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    } catch (logError) {
        console.error('Error logging failure:', logError.message);
    }

    // Always send a clean JSON response to the client
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: "Internal Server Error"
    });
};
