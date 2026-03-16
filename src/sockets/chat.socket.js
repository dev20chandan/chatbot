import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { processStreamingChat } from '../services/chat.service.js';

export const setupSockets = (server) => {
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    const extractSocketToken = (socket) => {
        const authHeader = socket.handshake.headers.authorization;
        const authToken = socket.handshake.auth?.token;
        const authAuthorization = socket.handshake.auth?.authorization;

        const rawToken = authHeader || authAuthorization || authToken;
        if (!rawToken) {
            return null;
        }

        return rawToken.startsWith('Bearer ')
            ? rawToken.slice(7).trim()
            : rawToken.trim();
    };

    // Authentication Middleware for Sockets
    io.use(async (socket, next) => {
        try {
            const token = extractSocketToken(socket);

            if (!token) throw new Error("No token");

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) throw new Error("User not found");

            socket.user = user;

            next();
        } catch (err) {
            console.error("Socket auth error:", err.message);
            next(new Error("Authentication error"));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        socket.on('send_message', async (data) => {
            const { sessionId, message } = data;
            try {
                await processStreamingChat(socket.user.id, sessionId, message, socket);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });

    return io;
};
