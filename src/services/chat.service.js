import Chat from '../models/chat.model.js';
import Session from '../models/session.model.js';
import openai from '../config/openai.js';
import { generateEmbedding } from './embedding.service.js';
import { retrieveRelevantMemories, extractAndStoreMemory } from './memory.service.js';
import { retrieveDocumentContext } from './rag.service.js';

export const processStreamingChat = async (userId, sessionId, message, socket) => {
    // 1. Save user message
    await Chat.create({ sessionId, userId, role: 'user', message });

    // 2. Refresh session context cache in Redis (Bonus feature)
    const recentHistory = await Chat.find({ sessionId, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

    const history = recentHistory.reverse().slice(0, -1).map(chat => ({
        role: chat.role,
        content: chat.message
    }));

    // 3. Generate query embedding
    const queryEmbedding = await generateEmbedding(message);

    // 4. Retrieve Context (Memories + Documents)
    const [memories, documents] = await Promise.all([
        retrieveRelevantMemories(userId, queryEmbedding),
        retrieveDocumentContext(userId, queryEmbedding)
    ]);

    // 5. Build System Prompt
    const systemPrompt = `You are a personalized assistant.
Long-term Memories about User:
${memories.join('\n') || 'None'}

Relevant Document Context:
${documents.join('\n') || 'None'}

Please use the provided contexts to answer accurately.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
    ];

    // 6. Streaming with OpenAI
    const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: messages,
        stream: true,
    });

    let assistantResponse = "";
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        assistantResponse += content;
        if (content) {
            socket.emit('chat_token', { sessionId, content });
        }
    }

    // 7. Final response handling
    socket.emit('chat_done', { sessionId, fullMessage: assistantResponse });
    await Chat.create({ sessionId, userId, role: 'assistant', message: assistantResponse });

    // 8. Auto-generate title if it's the first message
    if (recentHistory.length <= 2) {
        generateSessionTitle(sessionId, message);
    }

    // 9. Process memories in background
    extractAndStoreMemory(userId, message).catch(err => console.error(err));
};

const generateSessionTitle = async (sessionId, firstMessage) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "Generate a short 3-5 word title for a chat session based on this first message." }, { role: "user", content: firstMessage }],
        });
        const title = response.choices[0].message.content.replace(/"/g, '');
        await Session.findByIdAndUpdate(sessionId, { title });
    } catch (err) {
        console.error('Title generation error:', err);
    }
};
