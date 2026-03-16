import Document from '../models/document.model.js';
import { generateEmbedding } from './embedding.service.js';
import fs from 'fs';
import mongoose from 'mongoose';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Chunks text into smaller pieces
 */
const chunkText = (text, maxLength = 1000) => {
    const sentences = text.split('. ');
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length < maxLength) {
            currentChunk += sentence + ". ";
        } else {
            chunks.push(currentChunk.trim());
            currentChunk = sentence + ". ";
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
};

const extractPdfText = async (buffer) => {
    const parser = new PDFParse({ data: buffer });

    try {
        const result = await parser.getText();
        return result?.text || '';
    } finally {
        await parser.destroy();
    }
};

const normalizeUserId = (userId) => {
    if (userId instanceof mongoose.Types.ObjectId) {
        return userId;
    }

    return new mongoose.Types.ObjectId(userId);
};

export const processDocument = async (userId, file) => {
    try {
        const buffer = fs.readFileSync(file.path);
        let text = "";

        if (file.mimetype === 'application/pdf') {
            text = await extractPdfText(buffer);
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const data = await mammoth.extractRawText({ buffer });
            text = data.value;
        } else {
            text = buffer.toString('utf-8');
        }

        const normalizedText = text.trim();
        if (!normalizedText) {
            throw new Error('Uploaded document did not contain readable text');
        }

        const chunks = chunkText(normalizedText).filter(Boolean);
        const docId = Date.now().toString();

        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk);
            await Document.create({
                userId,
                docId,
                title: file.originalname,
                text: chunk,
                embedding
            });
        }
    } finally {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
};

export const retrieveDocumentContext = async (userId, queryEmbedding) => {
    const normalizedUserId = normalizeUserId(userId);

    try {
        const docs = await Document.aggregate([
            {
                $vectorSearch: {
                    index: "document_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: 3,
                    filter: { userId: normalizedUserId }
                }
            },
            { $project: { text: 1, score: { $meta: "vectorSearchScore" } } }
        ]);
        return docs.map(d => d.text);
    } catch (error) {
        console.error('Document vector retrieval failed, using fallback:', error.message);

        const fallbackDocs = await Document.find({ userId: normalizedUserId })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        return fallbackDocs.map(doc => doc.text);
    }
};

export const listDocuments = async (userId) => {
    const normalizedUserId = normalizeUserId(userId);

    return Document.aggregate([
        { $match: { userId: normalizedUserId } },
        {
            $group: {
                _id: '$docId',
                title: { $first: '$title' },
                chunkCount: { $sum: 1 },
                createdAt: { $min: '$createdAt' }
            }
        },
        { $sort: { createdAt: -1 } }
    ]);
};

export const listDocumentChunks = async (userId, docId) => {
    return Document.find({ userId, docId })
        .sort({ createdAt: 1 })
        .lean();
};
