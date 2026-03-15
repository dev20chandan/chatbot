import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { processDocument } from '../services/rag.service.js';

const router = express.Router();
const upload = multer({ dest: 'src/uploads/' });

/**
 * @swagger
 * /api/docs/upload:
 *   post:
 *     summary: Upload and process a document (PDF/TXT) for RAG
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document processed successfully
 */
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        await processDocument(req.user.id, req.file);
        res.status(200).json({ success: true, message: 'Document processed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
