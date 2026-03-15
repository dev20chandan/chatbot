import Memory from '../models/memory.model.js';
import openai from '../config/openai.js';
import { generateEmbedding } from './embedding.service.js';

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
    try {
        const memories = await Memory.aggregate([
            {
                $vectorSearch: {
                    index: "memory_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: 3,
                    filter: { userId: userId }
                }
            },
            { $project: { text: 1, score: { $meta: "vectorSearchScore" } } }
        ]);
        return memories.map(m => m.text);
    } catch (error) {
        return [];
    }
};
