import express from 'express';
import { body, validationResult } from 'express-validator';
import { processChat } from '../services/chat.service.js';

const router = express.Router();

/**
 * @route   POST /chat
 * @desc    Chat with the AI and trigger memory system
 */
router.post(
    '/',
    [
        body('userId').isString().notEmpty().withMessage('userId is required'),
        body('message').isString().notEmpty().withMessage('message is required'),
    ],
    async (req, res) => {
        // Validation check
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { userId, message } = req.body;

        try {
            const response = await processChat(userId, message);
            res.status(200).json({
                success: true,
                data: {
                    userId,
                    assistant: response
                }
            });
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while processing chat'
            });
        }
    }
);

export default router;
