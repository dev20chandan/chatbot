import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.route.js';
import sessionRoutes from './routes/session.route.js';
import documentRoutes from './routes/document.route.js';
import { setupSockets } from './sockets/chat.socket.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false })); // Adjust for Swagger/Socket.io
app.use(cors());
app.use(express.json());

// 1. Request Logger (Apply before routes)
app.use(requestLogger);

// Swagger Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { 
            title: 'AI SaaS Chatbot API', 
            version: '1.0.0',
            description: 'API for Multi-User AI Chatbot with Memory and RAG'
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/*.js'], // Relative to project root (CWD in Docker)
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Socket.io
setupSockets(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', sessionRoutes);
app.use('/api/docs', documentRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Global Error Handler (Apply after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 SaaS Backend running on port ${PORT}`));
