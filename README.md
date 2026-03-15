# Production Grade AI SaaS Chatbot Backend

A scalable, multi-user AI chatbot system with persistent long-term memory, RAG support, and streaming responses.

## 🚀 Key Features

*   **Multi-User Auth**: JWT-based registration and login.
*   **Multi-Session Chat**: Users can have multiple independent conversations.
*   **Auto Memory Extraction**: Uses LLM to extract personal facts from messages and stores them in MongoDB Vector Search.
*   **Document RAG**: PDF/TXT support via vector chunking for document-based queries.
*   **Streaming Responses**: Real-time token streaming using `Socket.io`.
*   **Redis Layer**: Rate limiting (20 msg/min) and session caching.
*   **Auto Titles**: Automatically generates session titles using GPT-3.5.

## 🛠️ Tech Stack

*   **Backend**: Node.js (ES), Express, Socket.io
*   **Database**: MongoDB Atlas (Vector Search), Redis
*   **AI**: OpenAI (GPT-4 Turbo, Text-Embedding-3-Small)
*   **DevOps**: Docker, Docker Compose

---

## 🏗️ MongoDB Atlas Vector Indices

Create two different indices on your collections:

### 1. `memory_index` (Collection: `memories`)
```json
{
  "fields": [
    { "numDimensions": 1536, "path": "embedding", "similarity": "cosine", "type": "vector" },
    { "path": "userId", "type": "filter" }
  ]
}
```

### 2. `document_index` (Collection: `documents`)
```json
{
  "fields": [
    { "numDimensions": 1536, "path": "embedding", "similarity": "cosine", "type": "vector" },
    { "path": "userId", "type": "filter" }
  ]
}
```

---

## 🛠️ Setup & Running (Full Local)

You can run the entire stack (Node, MongoDB, Redis) locally using Docker Compose.

1.  **Configure `.env`**:
    Only `OPENAI_API_KEY` and `JWT_SECRET` are strictly required here if using Docker, as the DB and Redis URLs are pre-configured in the `docker-compose.yml`.

2.  **Run the Stack**:
    ```bash
    docker-compose up --build
    ```

3.  **Local Manual Run**:
    If running without Docker, ensure you have MongoDB and Redis installed on your machine and running on their default ports, then:
    ```bash
    npm install
    npm run dev
    ```

> [!IMPORTANT]
> **Vector Search Note**: MongoDB's `$vectorSearch` feature is an Atlas-specific feature. To test vector functionality locally with this specific codebase, it is recommended to use the [Atlas CLI](https://www.mongodb.com/docs/atlas/cli/stable/atlas-cli-deploy-local/) to spin up a local Atlas-compatible container, OR keep the `MONGODB_URI` pointing to your Atlas cluster while keeping the App and Redis local.

4.  **API Documentation**:
    Once running, visit `http://localhost:5000/api-docs` to view the Swagger UI.

---

## 📡 Socket.io Events

*   **Connect**: Pass token in `handshake.auth.token`.
*   **Listen**: `chat_token` (receives partial chunks), `chat_done` (full message).
*   **Emit**: `send_message` with `{ sessionId, message }`.

---

## 📂 Structure
- `/src/services`: Core logic (Auth, Embedding, Memory, RAG, Chat).
- `/src/sockets`: Socket.io streaming implementation.
- `/src/middlewares`: Auth and Redis-based Rate Limiter.
- `/src/routes`: REST endpoints for everything.
