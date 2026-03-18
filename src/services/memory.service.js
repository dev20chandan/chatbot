import Memory from '../models/memory.model.js';
import mongoose from 'mongoose';
import openai from '../config/openrouter.js';
import { generateEmbedding } from './embedding.service.js';

const normalizeUserId = (userId) => {
    if (userId instanceof mongoose.Types.ObjectId) {
        return userId;
    }

    return new mongoose.Types.ObjectId(userId);
};

/**
 * Advanced Memory Extraction using LLM
 */
export const extractAndStoreMemory = async (userId, message) => {
    try {
        const extractionPrompt = `Extract meaningful personal facts or preferences from this message. 
If no important info is present, return "NONE".
Message: "${message}"
Facts (bullet points):`;

        const completion = await openai.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            max_tokens: 256,
            messages: [{ role: "system", content: "You are a memory extraction unit." }, { role: "user", content: extractionPrompt }],
        });

        const facts = completion.choices[0].message.content;

        if (facts && !facts.includes("NONE")) {
            const embedding = await generateEmbedding(facts);
            await Memory.create({
                userId,
                text: facts,
                embedding
            });
            console.log(`Stored LLM-extracted memories for user ${userId}`);
        }
    } catch (error) {
        console.error('Memory extraction error:', error);
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

export const retrieveRelevantMemories = async (userId, queryEmbedding) => {
    const normalizedUserId = normalizeUserId(userId);

    try {
        const memories = await Memory.find({ userId: normalizedUserId })
            .select('text embedding')
            .lean();

        if (!memories.length) return [];

        return memories
            .map(m => ({ text: m.text, score: cosineSimilarity(queryEmbedding, m.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(m => m.text);
    } catch (error) {
        console.error('Memory retrieval failed:', error.message);
        return [];
    }
};

export const createMemory = async (userId, text) => {
    const normalizedText = text?.trim();
    if (!normalizedText) {
        throw new Error('Memory text is required');
    }

    const embedding = await generateEmbedding(normalizedText);
    return Memory.create({
        userId,
        text: normalizedText,
        embedding
    });
};

export const listMemories = async (userId) => {
    return Memory.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
};
