import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import Session from '../models/session.model.js';
import Chat from '../models/chat.model.js';

const router = express.Router();

// Get all sessions for user
/**
 * @swagger
 * /api/chat/sessions:
 *   get:
 *     summary: Get all sessions for authenticated user
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get('/sessions', protect, async (req, res) => {
    const sessions = await Session.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(sessions);
});

/**
 * @swagger
 * /api/chat/sessions:
 *   post:
 *     summary: Create a new chat session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Session created
 */
router.post('/sessions', protect, async (req, res) => {
    const session = await Session.create({ userId: req.user.id });
    res.status(201).json(session);
});

/**
 * @swagger
 * /api/chat/{sessionId}:
 *   get:
 *     summary: Get chat history for a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history
 */
router.get('/:sessionId', protect, async (req, res) => {
    const chats = await Chat.find({ sessionId: req.params.sessionId, isDeleted: false }).sort({ createdAt: 1 });
    res.json(chats);
});

/**
 * @swagger
 * /api/chat/sessions/{sessionId}:
 *   delete:
 *     summary: Soft delete a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session deleted successfully
 */
router.delete('/sessions/:sessionId', protect, async (req, res) => {
    await Session.findByIdAndUpdate(req.params.sessionId, { isDeleted: true });
    await Chat.updateMany({ sessionId: req.params.sessionId }, { isDeleted: true });
    res.json({ message: 'Session deleted' });
});

export default router;
