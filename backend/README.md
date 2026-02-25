# VoiceAI India — Backend v2.0

AI-powered outbound calling for Gujarati/Hindi/English markets.  
Built by Rise Ascend Technologies.

## Stack
| Layer | Provider | Cost |
|-------|----------|------|
| LLM | Groq (Llama 3.1) → OpenAI GPT-4o mini | Free → ₹0.05/call |
| STT | Sarvam AI Saaras v3 | ₹30/hr |
| TTS | Sarvam AI Bulbul v2 | ₹15/10K chars |
| Telephony | Vobiz (primary) + Exotel (backup) | ~₹0.45/min |
| DB | Supabase (PostgreSQL) | Free tier |
| Deploy | Render (Singapore) | Free tier |

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill in .env values

# 3. Setup database
# Go to Supabase → SQL Editor → paste contents of src/db/schema.sql → Run

# 4. Start dev server
npm run dev
```

## Environment Variables

See `.env.example` for full list. Minimum required:
- `DATABASE_URL` — Supabase connection string
- `JWT_SECRET` — random string (min 32 chars)
- `GROQ_API_KEY` — from console.groq.com (free)
- `SARVAM_API_KEY` — from sarvam.ai (₹1,000 free credits)
- `VOBIZ_API_KEY` — from Vobiz dashboard

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Register |
| POST | /auth/login | Login |
| GET | /auth/me | Current user |
| GET | /campaigns | List campaigns |
| POST | /campaigns | Create campaign |
| PUT | /campaigns/:id | Update campaign |
| POST | /campaigns/:id/contacts | Upload CSV |
| POST | /campaigns/:id/launch | Launch campaign |
| POST | /campaigns/:id/pause | Pause campaign |
| GET | /campaigns/:id/stats | Get stats |
| GET | /campaigns/:id/calls | Call logs |
| POST | /webhooks/vobiz | Vobiz events |
| POST | /webhooks/exotel | Exotel events |
| GET | /health | Health check |

## Switching Providers

All provider switches are **env-only** — no code changes:

```bash
# Switch LLM from Groq to OpenAI
LLM_PROVIDER=openai

# Switch STT from Sarvam to Google  
STT_PROVIDER=google

# Switch TTS from Sarvam to Google
TTS_PROVIDER=google

# Switch telephony from Vobiz to Exotel
TELEPHONY_PROVIDER=exotel
```

## Architecture

```
HTTP Request → Route (validates) → Service (business logic) → Repository (DB)
WebSocket    → session.js → STT → LLM → TTS → WebSocket audio
```

