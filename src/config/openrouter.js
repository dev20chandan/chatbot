import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:5000", // Optional, for OpenRouter rankings
        "X-Title": "SaaS Chatbot", // Optional, for OpenRouter rankings
    }
});

export default openai;
