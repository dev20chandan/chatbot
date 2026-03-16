import Document from '../models/document.model.js';
import { generateEmbedding } from './embedding.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
import fs from 'fs';

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

export const processDocument = async (userId, file) => {
    try {
        const buffer = fs.readFileSync(file.path);
        let text = "";

        if (file.mimetype === 'application/pdf') {
            const data = await pdfParse(buffer);
            text = data.text;
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const data = await mammoth.extractRawText({ buffer });
            text = data.value;
        } else {
            text = buffer.toString('utf-8');
        }

        console.log('======>here>>>>',text,'====>>>text')

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
    try {
        const docs = await Document.aggregate([
            {
                $vectorSearch: {
                    index: "document_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: 3,
                    filter: { userId: userId }
                }
            },
            { $project: { text: 1, score: { $meta: "vectorSearchScore" } } }
        ]);
        return docs.map(d => d.text);
    } catch (error) {
        return [];
    }
};
