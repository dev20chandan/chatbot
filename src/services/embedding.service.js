import openai from '../config/openrouter.js';

/**
 * Generates vector embedding for a given text using OpenAI's model
 * @param {string} text - The input text to embed
 * @returns {Promise<number[]>} - The numeric vector embedding
 */
export const generateEmbedding = async (text) => {
    try {
        const response = await openai.embeddings.create({
            model: "openai/text-embedding-3-small", // or text-embedding-ada-002 as specified in dimensions (1536)
            input: text,
            encoding_format: "float",
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
};
