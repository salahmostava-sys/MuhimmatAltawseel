# Muhimmat Al-Tawseel — Replit Configuration

## Project Overview
A delivery operations management platform with a React frontend and a FastAPI AI analytics backend.

## Architecture
- **Frontend**: Vite + React + TypeScript (`frontend/`)
  - Runs on port 5000
  - Connects to Supabase for auth and database
  - Connects to AI backend for ML analytics (optional)
  - Uses Tailwind CSS + Radix UI components
- **AI Backend**: FastAPI + Python (`ai-backend/`)
  - Runs on port 8000
  - Provides ML endpoints: order prediction, salary forecasting, anomaly detection, etc.
  - Purely stateless; no database

## Running the App
- **Frontend workflow**: `cd frontend && npm run dev` (port 5000, webview)
- **AI Backend workflow**: `cd ai-backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload` (port 8000, console)

## Required Environment Variables (Secrets)
- `VITE_SUPABASE_URL` — Supabase project URL (https://xxx.supabase.co)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_AI_BACKEND_URL` — URL of the AI backend (optional, e.g. https://your-repl.replit.app:8000 or http://localhost:8000)
- `VITE_SENTRY_DSN` — Sentry DSN for error tracking (optional)

## Package Manager
- Frontend: npm (package-lock.json present)
- Backend: pip / Python 3.12

## Key Files
- `frontend/vite.config.ts` — Vite config (port 5000, host 0.0.0.0)
- `frontend/services/supabase/client.ts` — Supabase client setup
- `frontend/services/aiService.ts` — AI backend API client
- `ai-backend/main.py` — FastAPI app entrypoint
- `ai-backend/model.py` — ML model functions
- `ai-backend/requirements.txt` — Python dependencies
