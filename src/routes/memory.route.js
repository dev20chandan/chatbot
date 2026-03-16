import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { createMemory, listMemories } from '../services/memory.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/memories:
 *   get:
 *     summary: List stored memories for authenticated user
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Memory list
 */
router.get('/', protect, async (req, res) => {
    try {
        const memories = await listMemories(req.user.id);
        res.status(200).json(memories);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/memories:
 *   post:
 *     summary: Create a memory manually for authenticated user
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Memory created
 */
router.post('/', protect, async (req, res) => {
    try {
        const memory = await createMemory(req.user.id, req.body.text);
        res.status(201).json(memory);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
