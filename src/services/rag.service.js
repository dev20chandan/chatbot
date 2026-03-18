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

/**
 * Computes cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
};

export const retrieveDocumentContext = async (userId, queryEmbedding) => {
    const normalizedUserId = normalizeUserId(userId);

    try {
        const docs = await Document.find({ userId: normalizedUserId })
            .select('text embedding')
            .lean();

        if (!docs.length) return [];

        return docs
            .map(doc => ({ text: doc.text, score: cosineSimilarity(queryEmbedding, doc.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(d => d.text);
    } catch (error) {
        console.error('Document retrieval failed:', error.message);
        return [];
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
