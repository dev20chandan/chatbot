import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { listDocumentChunks, listDocuments, processDocument } from '../services/rag.service.js';

const router = express.Router();
const allowedMimeTypes = new Set([
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
    dest: 'src/uploads/',
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            return cb(null, true);
        }

        cb(new Error('Unsupported file type. Use PDF, TXT, or DOCX.'));
    }
});

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: List uploaded documents for authenticated user
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document list
 */
router.get('/', protect, async (req, res) => {
    try {
        const documents = await listDocuments(req.user.id);
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/docs/upload:
 *   post:
 *     summary: Upload and process a document (PDF/TXT/DOCX) for RAG
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
        res.status(200).json({
            success: true,
            message: 'Document processed successfully',
            filename: req.file.originalname
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/docs/{docId}/chunks:
 *   get:
 *     summary: List stored chunks for one uploaded document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document chunks
 */
router.get('/:docId/chunks', protect, async (req, res) => {
    try {
        const chunks = await listDocumentChunks(req.user.id, req.params.docId);
        res.status(200).json(chunks);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
