# Celestial Chatbot

An astronomy companion web application providing RAG-grounded space Q&A, stellar classification, exoplanet thermodynamics, and real-time space weather telemetry.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [System / Request Flow](#system--request-flow)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Installation & Local Setup](#installation--local-setup)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Data Model](#data-model)
- [Security & Risk Controls](#security--risk-controls)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

Celestial Chatbot is a full-stack astrophysics platform built for space exploration and observational astronomy queries. It allows users to ask space questions answered by Gemini Flash with RAG vector grounding, classify physical star parameters using a zero-Python in-memory Random Forest model, analyze exoplanet habitability via deterministic thermodynamic equations, track live space weather and Near-Earth Asteroids, and archive query history in PostgreSQL.

---

## Key Features

- **Cosmic Q&A (RAG Grounded)**: Answers free-text space questions using Gemini Flash, grounded by PostgreSQL `pgvector` HNSW similarity search over catalogued astronomical reference documents and NASA APOD data. Includes clickable source citation badges.
- **Zero-Python Star Classifier**: Predicts star types (*Brown Dwarf, Red Dwarf, White Dwarf, Main Sequence, Subgiant, Giant, Supergiant, Hypergiant*) by walking a 60-tree Random Forest exported directly as JSON (`star_model.json`).
- **Interactive Hertzsprung-Russell (H-R) Diagram**: Plots analyzed stars on a native SVG logarithmic H-R diagram ($T_\text{eff}$ vs $L/L_\odot$) against 240 catalogued reference stars.
- **Exoplanet ESI & Habitability Engine**: Calculates the Earth Similarity Index (ESI), Goldilocks Habitable Zone bounds (Kopparapu 2014), and planetary taxonomy from physical inputs ($R_\oplus, S_\oplus, T_\text{eff}$). Includes explicit runaway greenhouse caveats for Venus-like planets.
- **Space Weather & Asteroid Radar**: Real-time telemetry displaying NOAA $Kp$-index geomagnetic storm sparklines, 24-hour solar flare forecasts, and NASA NeoWs Near-Earth Asteroid close approaches with single-flight request caching.
- **PostgreSQL User Archive**: Saves user prompts, image descriptions, and multi-column stellar measurements with full-text search capability.

---

## Architecture

The system consists of a React Single Page Application (SPA) frontend communicating over HTTP with a Node.js Express API gateway, backed by PostgreSQL with `pgvector` for persistence and vector search.

```mermaid
flowchart TB
    subgraph Client ["Browser / Single Page App"]
        FE["React + Vite + Tailwind"]
        Auth0Client["@auth0/auth0-react SDK"]
        SVGComp["Native SVG (H-R Diagram, ESI Gauge)"]
    end

    subgraph Auth ["Auth Provider"]
        Auth0Tenant["Auth0 Tenant (JWKS Endpoint)"]
    end

    subgraph API ["Backend API Gateway (Express)"]
        JWTMiddleware["requireAuth (RS256 JWT Check)"]
        RateLimiter["rateLimit (IPv6 /64 Subnet)"]
        Guardrails["guardrails (Input Scope & Physics Bounds)"]
        RFEngine["starModel.js (In-Memory Tree Walker)"]
        ThermoEngine["exoplanet.js (ESI & HZ Physics)"]
        CacheManager["Single-Flight NASA Cache"]
    end

    subgraph LLM ["AI & Vector Services"]
        GeminiFlash["Google Gemini Flash (LLM)"]
        GeminiEmbed["gemini-embedding-001 (768-dim)"]
    end

    subgraph DB ["Database Storage"]
        Postgres[("PostgreSQL 16 + pgvector")]
    end

    subgraph Upstream ["External Telemetry APIs"]
        NOAA["NOAA SWPC API"]
        NASA["NASA NeoWs API"]
    end

    FE -->|HTTP Bearer Token| JWTMiddleware
    Auth0Client -.->|Authenticate| Auth0Tenant
    JWTMiddleware -->|Verify Signature| Auth0Tenant
    JWTMiddleware --> RateLimiter
    RateLimiter --> Guardrails

    Guardrails -->|Walk star_model.json| RFEngine
    Guardrails -->|Physical Equations| ThermoEngine
    Guardrails -->|Vector Search| GeminiEmbed
    Guardrails -->|Prompt & Context| GeminiFlash
    Guardrails -->|Fetch Cached Data| CacheManager

    GeminiEmbed -->|<=> Cosine Distance| Postgres
    Guardrails -->|Archive & Queries| Postgres
    CacheManager -->|Telemetry Feeds| NOAA
    CacheManager -->|Asteroid Feeds| NASA
```

---

## System / Request Flow

### Grounded Q&A Flow (`POST /search`)

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend (React)
    participant Auth as Auth0 Middleware
    participant Guard as Physics / Scope Guardrails
    participant Embed as Gemini Embeddings API
    participant PG as PostgreSQL (pgvector)
    participant LLM as Gemini Flash API

    Client->>Auth: POST /search (Bearer JWT + Question)
    Auth->>Auth: Verify RS256 JWT Token
    Auth->>Guard: Validate Prompt (Length <= 500, Scope Check)
    Guard->>Embed: Generate 768-dim Vector (gemini-embedding-001)
    Embed-->>Guard: Return Truncated Vector
    Guard->>PG: Cosine Distance Search (<=>) with Threshold >= 0.65
    PG-->>Guard: Return Top-K Grounded Passages
    Guard->>LLM: Generate Response (Prompt + Passages + responseSchema)
    LLM-->>Guard: Return JSON Response with Sources
    Guard->>PG: Save Prompt to Archive Table
    Guard-->>Client: 200 OK (Answer + Citations)
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, TailwindCSS | Neumorphic UI, SPA Routing, Component Views |
| **Frontend Graphics** | Native SVG | H-R Diagram, ESI Gauge, Habitable Zone Bar |
| **Auth Provider** | Auth0 (`@auth0/auth0-react`) | Single Sign-On, User Identity, Access Tokens |
| **Backend Gateway** | Node.js 18+, Express 4.19 | HTTP REST API, Security Middlewares |
| **Machine Learning** | scikit-learn (export) / Node.js (walk) | 60-tree Random Forest (`star_model.json`) |
| **Vector Database** | PostgreSQL 16+ (Neon runs 18.x) + `pgvector 0.8.6` | User Archive, HNSW Vector Embeddings |
| **AI / LLM Service** | Google Gemini Flash (`gemini-3.5-flash`) & `gemini-embedding-001` | RAG Answer Generation & Vectorization |
| **Testing** | Vitest 3.2, Supertest 7.2 | Unit and Integration Tests |

---

## Repository Structure

```text
AMURoboclub-NSD-Hackathon/
├── AI-ML/                     # Python training code & scikit-learn model export
│   ├── train_star_model.py    # Fits Random Forest & exports star_model.json
│   ├── stars.csv              # 240-row catalogued star dataset
│   └── exoplanet.py           # Legacy Kepler light-curve script
├── backend/                   # Express API gateway
│   ├── db/                    # PostgreSQL connection pool & migrations
│   │   ├── migrate.js         # Schema & pgvector migration script
│   │   ├── pool.js            # Node pg Pool setup (max 5 connections)
│   │   └── archive.js         # Archive queries & parameterized ILIKE search
│   ├── ingest/                # RAG corpus ingestion scripts
│   ├── middlewares/           # Auth0, Rate Limiting, Guardrails, Image Validation
│   ├── models/                # Exported star_model.json artifact
│   ├── routes/                # Express API routes
│   ├── services/              # Business logic (Gemini, Star Classifier, ESI, NASA)
│   ├── tests/                 # Vitest test suites (189 tests)
│   ├── app.js                 # Express application configuration
│   └── server.js              # HTTP server entry point (Port 8080)
├── frontend/                  # React Vite Single Page App
│   ├── public/                # Static assets & SPA static.json
│   ├── src/
│   │   ├── components/        # HRDiagram, ESI Gauge, ErrorBoundary, SpaceWeather
│   │   ├── context/           # Auth0 AuthProvider wrapper
│   │   ├── lib/               # Axios API client & error handling
│   │   ├── pages/             # Home, AdvanceSearch, Exoplanet, Stargazing, History
│   │   ├── App.jsx            # React Router v6 setup
│   │   └── main.jsx           # Root DOM renderer & Auth0Provider setup
│   └── vite.config.js         # Vite build configuration
└── README.md
```

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **Docker**: Required for running PostgreSQL with `pgvector` locally
- **Python**: `v3.9+` *(Optional: only needed if retraining the star classifier model)*
- **Auth0 Account**: Free tenant with an configured Single Page Application and API

---

## Configuration

### Backend Environment Variables (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key | `AIzaSy...` |
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain (no scheme) | `celestial-chatbot.eu.auth0.com` |
| `AUTH0_AUDIENCE` | Yes | Auth0 API identifier | `celestial-chatbot-api` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://celestial:celestial_dev@localhost:5433/celestial` |
| `NASA_API_KEY` | No | NASA API key (defaults to `DEMO_KEY`) | `DEMO_KEY` |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowed origins | `http://localhost:5173` |
| `PORT` | No | Express HTTP server port (default: 8080) | `8080` |

### Frontend Environment Variables (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND_URL` | Yes | Express API gateway base URL | `http://localhost:8080` |
| `VITE_AUTH0_DOMAIN` | Yes | Auth0 tenant domain | `celestial-chatbot.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | Yes | Auth0 Single Page App Client ID | `KH3GDfBdFcik3...` |
| `VITE_AUTH0_AUDIENCE` | Yes | Auth0 API identifier | `celestial-chatbot-api` |

---

## Installation & Local Setup

### 1. Start PostgreSQL with `pgvector` (Docker)

```bash
docker run -d \
  --name celestial-postgres \
  -e POSTGRES_USER=celestial \
  -e POSTGRES_PASSWORD=celestial_dev \
  -e POSTGRES_DB=celestial \
  -p 5433:5432 \
  -v celestial-pgdata-vector:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

### 2. Set Up Backend & Run Migrations

```bash
cd backend
npm install
cp .env.example .env # Fill in GEMINI_API_KEY, AUTH0_DOMAIN, etc.
npm run db:migrate
npm run ingest      # Optional: Ingests baseline RAG vector knowledge
npm run server
```

### 3. Set Up & Run Frontend

In a separate terminal:

```bash
cd frontend
npm install
cp .env.example .env # Fill in VITE_AUTH0_* variables
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## Testing

Backend test suites are powered by **Vitest** and **Supertest**:

```bash
# Run all 9 test suites
npm test --prefix backend

# Run Vitest in watch mode
npm run test:watch --prefix backend
```

---

## API Reference

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | None | Health check. Returns server status. |
| `GET` | `/api/advanced-search/options` | None | Returns allowed star colors, spectral classes, and dataset ranges. |
| `POST` | `/api/advanced-search` | Bearer JWT | Classifies star parameters ($T, L, R, M_v, \text{Color}, \text{Spectral}$) and archives result. |
| `POST` | `/search` | Bearer JWT | Q&A prompt route. Performs RAG search, generates Gemini answer, returns citations. |
| `POST` | `/upload` | Bearer JWT | Accepts sky photos ($\le 5\text{ MB}$), validates magic bytes, returns Gemini description. |
| `GET` | `/api/exoplanet/options` | None | Returns supported exoplanet taxonomy bins and physical citation references. |
| `POST` | `/api/exoplanet` | Bearer JWT | Computes ESI score, Kopparapu HZ bounds, planet taxonomy, and greenhouse caveats. |
| `GET` | `/api/space-weather` | None | Returns cached NOAA SWPC geomagnetic $Kp$-index, sparklines, and flare forecasts. |
| `GET` | `/api/space-weather/asteroids` | None | Returns cached NASA NeoWs Near-Earth Asteroids close-approach data. |
| `GET` | `/api/archive` | Bearer JWT | Fetches user's prompts and classifications interleaved (`?q=` search, `?limit=`). |
| `GET` | `/api/archive/stats` | Bearer JWT | Returns per-star-class count and mean confidence for the authenticated user. |

---

## Authentication & Authorization

Authentication is handled via **Auth0 Single Sign-On**:
1. Frontend uses `@auth0/auth0-react` to authenticate users via Auth0 Universal Login.
2. Upon successful authentication, Auth0 issues an RS256-signed Access Token (`Bearer` header).
3. Express backend middleware (`requireAuth`) verifies token signatures against Auth0 tenant's JSON Web Key Set (`/.well-known/jwks.json`).
4. User identity is extracted from `req.auth.payload.sub` and used as the isolated foreign key `user_id` for all database interactions.

---

## Data Model

```mermaid
erDiagram
    users ||--o{ prompts : owns
    users ||--o{ classifications : owns

    prompts {
        bigserial id PK
        text user_id
        text prompt
        text response
        timestamptz created_at
    }

    classifications {
        bigserial id PK
        text user_id
        double_precision temperature
        double_precision luminosity
        double_precision radius
        double_precision absolute_magnitude
        text color
        text spectral_class
        integer predicted_type
        text predicted_label
        double_precision confidence
        text explanation
        timestamptz created_at
    }

    knowledge_passages {
        bigserial id PK
        text title
        text content
        text source_url
        vector_768 embedding
        timestamptz created_at
    }
```

---

## Security & Risk Controls

- **Magic-Byte File Filtering**: Uploads are validated against binary magic bytes (JPEG, PNG, GIF, BMP, WebP). SVG files are explicitly rejected to eliminate XSS vectors.
- **IPv6 Subnet Rate Limiting**: `express-rate-limit` uses a custom IP key generator aggregating IPv6 requests to `/64` subnets, preventing IP rotation abuse.
- **Prompt Size Caps**: Input questions are restricted to 500 characters and HTTP JSON request bodies are capped at 32 KB.
- **Error Message Sanitization**: 500 Internal Server Errors sanitize raw exception messages to prevent leaking database hostnames, credentials, or internal stack traces.

---

## Known Limitations

- **Free-Tier Cold Starts**: On the free hosting tiers the API sleeps after 15 minutes idle and the database suspends after 5. The first request after a quiet period takes 30-60 seconds. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the keep-alive strategy.
- **Gemini Free-Tier Quotas**: A free API key is capped at a few requests per minute and a few hundred per day, shared across Q&A, image description and corpus ingestion. Transient 429 and 503 responses are retried with backoff.
- **NASA API Rate Limit**: Without a `NASA_API_KEY`, the server uses NASA's `DEMO_KEY` (10 requests/hour server-wide). Protected by in-memory single-flight caching.
- **Single-Instance Cache**: The NASA response cache lives in process memory, so it is correct only while the API runs as one instance. Horizontal scaling would need a shared cache to stay within the upstream quota.

---

## License

ISC License. See package manifests for details.
