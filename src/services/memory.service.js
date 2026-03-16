import Memory from '../models/memory.model.js';
import mongoose from 'mongoose';
import openai from '../config/openai.js';
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
            model: "gpt-3.5-turbo",
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

export const retrieveRelevantMemories = async (userId, queryEmbedding) => {
    const normalizedUserId = normalizeUserId(userId);

    try {
        const memories = await Memory.aggregate([
            {
                $vectorSearch: {
                    index: "memory_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: 3,
                    filter: { userId: normalizedUserId }
                }
            },
            { $project: { text: 1, score: { $meta: "vectorSearchScore" } } }
        ]);
        return memories.map(m => m.text);
    } catch (error) {
        console.error('Memory vector retrieval failed, using fallback:', error.message);

        const fallbackMemories = await Memory.find({ userId: normalizedUserId })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        return fallbackMemories.map(memory => memory.text);
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
