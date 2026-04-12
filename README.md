# SimilarBook – Similarity Search Social Platform

A social platform where users share tasks they're working on and discover others with similar goals, built with **FastAPI**, **React**, **PostgreSQL**, and **pgvector**.

## Features

- 🔍 **Semantic similarity search** – Find tasks similar to yours using pgvector cosine similarity (sentence-transformers embeddings)
- 🔐 **Token-based auth** – JWT access tokens + rotating refresh tokens stored hashed in the database
- 🔒 **End-to-end encrypted messaging** – NaCl box encryption; the server only stores ciphertext, private keys never leave the client
- 👥 **Social connections** – Send/accept connection requests, view profiles
- 📋 **Task feed** – Public task feed with similarity percentages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11) |
| Frontend | React 18 + Vite |
| Database | PostgreSQL 16 + pgvector |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Encryption | TweetNaCl (NaCl box) |
| Auth | JWT (jose) + bcrypt |

## Quick Start

### With Docker (recommended)

```bash
# Copy env file
cp backend/.env.example backend/.env
# Edit SECRET_KEY in backend/.env ← change this in production!

docker compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

### Manual setup

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Start PostgreSQL with pgvector (or use docker compose up db)
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Security Architecture

### Authentication
- Passwords hashed with **bcrypt** (12 rounds)
- Access tokens: **JWT** (HS256, 24h expiry) – stateless
- Refresh tokens: **random 64-byte URL-safe token**, hashed with SHA-256 before storage, rotated on each use, 30-day expiry

### End-to-End Encryption
- On registration, the browser generates a **NaCl box key pair** (`tweetnacl`)
- The **private key is stored in `localStorage`** and never transmitted
- The **public key is uploaded** to the server so others can encrypt messages for you
- When sending a message: `nacl.box(plaintext, nonce, recipientPublicKey, senderPrivateKey)` – only the ciphertext + nonce are stored on the server
- When reading: `nacl.box.open(ciphertext, nonce, senderPublicKey, myPrivateKey)` – decryption happens entirely in the browser

### API Security
- All authenticated endpoints require `Authorization: Bearer <token>`
- Messaging is only allowed between users with an **accepted connection**
- Private tasks are only visible to their owner

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register (generates E2E key pair client-side) |
| POST | `/api/v1/auth/token` | Login → access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/tasks/feed` | Public task feed |
| POST | `/api/v1/tasks/` | Create task (auto-embeds) |
| GET | `/api/v1/tasks/search/similar?q=...` | Semantic search |
| GET | `/api/v1/tasks/similar-to/{id}` | Similar tasks to a given task |
| POST | `/api/v1/connections/` | Send connection request |
| PATCH | `/api/v1/connections/{id}` | Accept/reject connection |
| POST | `/api/v1/messages/` | Send E2E encrypted message |
| GET | `/api/v1/messages/conversation/{userId}` | Fetch conversation |

Full interactive API docs available at `http://localhost:8000/docs`.

## Running Tests

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/
```
