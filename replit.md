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

## UI/UX Improvements (Post-Migration)

- Tailwind keyframes added: `slide-up`, `scale-in`, `page-enter`, `float-slow`, `float-medium`, `pulse-ring`, `shimmer`
- CSS utilities in `index.css`: `page-enter`, `card-lift`, `stagger-1…6`
- **Login page**: staggered entrance animations, floating decorative circles in branding panel, glassmorphism feature cards, animated submit button with shimmer, caps-lock warning, security badge
- **AppLayout**: smooth `page-enter` animation on route change via `pageKey` state
- **AI Dashboard**: connected to real data (salary forecast, best employees, active riders count)

## New Modules Added

### إدارة الإجازات (Leave Management) — `/leaves`
- **DB**: `supabase/migrations/20260503000000_leave_requests.sql` — table `leave_requests` (must be run in Supabase SQL Editor)
- **Service**: `frontend/services/leaveService.ts`
- **Page**: `frontend/modules/leaves/pages/LeavesPage.tsx`
- **Modal**: `frontend/modules/leaves/components/AddLeaveModal.tsx`
- Leave types: annual, sick, emergency, unpaid, other
- Actions: add request, approve, reject, delete
- Filters: by type, status, employee name

### متابعة الوثائق (Document Expiry Tracking) — `/documents`
- **No new DB table** — queries existing `employees` columns: `residency_expiry`, `health_insurance_expiry`, `license_expiry`, `probation_end_date`
- **Page**: `frontend/modules/documents/pages/DocumentsPage.tsx`
- Shows all active employees with color-coded expiry badges per document
- Status levels: expired (red), urgent ≤7 days (orange), warning ≤30 days (yellow), ok (green), missing (grey)
- Clickable stat cards for quick filtering

### تقييم الأداء الشهري (Formal HR Performance Reviews) — `/performance-reviews`
- **DB**: `supabase/migrations/20260503000001_performance_reviews.sql` — table `hr_performance_reviews` (must be run in Supabase SQL Editor)
- **Service**: `frontend/services/hrReviewService.ts`
- **Page**: `frontend/modules/performance/pages/PerformanceReviewsPage.tsx`
- **Modal**: `frontend/modules/performance/components/AddReviewModal.tsx`
- 4 criteria scored 1–10: attendance, performance, behavior, commitment
- Auto-computes average + grade: ممتاز / جيد جداً / جيد / مقبول / ضعيف
- Month picker navigation, edit/delete support

## Pending SQL to Run in Supabase

Run these two files in **Supabase → SQL Editor** for the new modules to work:
1. `supabase/migrations/20260503000000_leave_requests.sql`
2. `supabase/migrations/20260503000001_performance_reviews.sql`

Previously pending (from earlier sessions):
3. `supabase/migrations/20260501000000_fix_security_warnings.sql`
4. `supabase/migrations/20260502000000_flip_admin_rider_logic.sql`
