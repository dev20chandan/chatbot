# AI SaaS Chatbot Backend

Express and Socket.IO backend for an authenticated multi-session chatbot with memory extraction and document RAG.

## Features

- JWT auth for register/login
- Multiple chat sessions per user
- Streaming chat responses over Socket.IO
- Memory extraction stored in MongoDB vector search
- PDF/TXT document ingestion for RAG
- Redis-backed caching and rate limiting
- Swagger docs at `/api-docs`

## Tech Stack

- Node.js, Express, Socket.IO
- MongoDB, Redis
- OpenAI API
- Docker Compose

## Environment

Copy `.env.example` to `.env` and set:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/saas_chatbot
OPENAI_API_KEY=sk-your-key
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
```

If you use Docker Compose, `MONGODB_URI` and `REDIS_URL` are supplied by `docker-compose.yml`. You still need `OPENAI_API_KEY` and `JWT_SECRET`.

## Run

### Docker

```bash
docker-compose up --build
```

### Local

Make sure MongoDB and Redis are running, then:

```bash
npm install
npm run dev
```

Open Swagger at `http://localhost:5000/api-docs`.

## MongoDB Vector Search

This project uses MongoDB `$vectorSearch`, which requires MongoDB Atlas or an Atlas-compatible local environment. A plain local MongoDB instance will not support memory/document retrieval through vector search.

Create these indices:

### `memory_index` on `memories`

```json
{
  "fields": [
    { "numDimensions": 1536, "path": "embedding", "similarity": "cosine", "type": "vector" },
    { "path": "userId", "type": "filter" }
  ]
}
```

### `document_index` on `documents`

```json
{
  "fields": [
    { "numDimensions": 1536, "path": "embedding", "similarity": "cosine", "type": "vector" },
    { "path": "userId", "type": "filter" }
  ]
}
```

## REST Flow Before Socket Use

The socket is authenticated, so you must do this first:

1. `POST /api/auth/register` or `POST /api/auth/login`
2. Copy the returned JWT token
3. `POST /api/chat/sessions` with `Authorization: Bearer <token>`
4. Copy the returned session `_id`
5. Connect the socket with the token and emit messages using that session id

## Socket Events

Connect with:

```js
const socket = io("http://localhost:5000", {
  auth: { token: "YOUR_JWT_TOKEN" }
});
```

Events:

- Emit `send_message` with `{ sessionId, message }`
- Listen for `chat_token` to receive streaming chunks
- Listen for `chat_done` to receive the final full message
- Listen for `error` for failures

## Socket UI

The app now renders a socket test console at `/socket-ui`.

Use it like this:

1. Start the server
2. Open `http://localhost:5000/socket-ui`
3. Register or log in from Swagger/Postman/curl
4. Paste the JWT token into the page
5. Create a session with `POST /api/chat/sessions`
6. Paste the returned session id into the page
7. Connect and send a message

## Project Structure

- `src/server.js`: Express app, Swagger setup, Socket.IO bootstrap
- `src/routes/`: Auth, session, and document routes
- `src/services/`: Chat, auth, memory, embedding, and RAG logic
- `src/sockets/chat.socket.js`: Socket auth and streaming event handlers
