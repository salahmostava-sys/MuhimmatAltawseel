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

Run all of these in **Supabase → SQL Editor** in order:
1. `supabase/migrations/20260503000000_leave_requests.sql`
2. `supabase/migrations/20260503000001_performance_reviews.sql`
3. `supabase/migrations/20260503000002_fix_security_warnings_v2.sql`
4. `supabase/migrations/20260503000003_allow_negative_hours_worked.sql`
5. `supabase/migrations/20260503000004_add_is_archived_to_apps.sql` ← **new**

## Bug Fixes Applied (Latest Session)

### Critical Crashes Fixed
- **`recoverSessionSilently is not a function`**: Removed `// @refresh reset` from `AuthContext.tsx` (it caused full module reload, leaving `useAuth()` returning the empty default object during HMR transition). Added typed stub functions as the context default value.
- **`Cannot assign to this expression`**: `link?.href =` in `useFaviconBadge.ts` changed to `if (link) link.href =` (optional-chaining is invalid on LHS in oxc/Vite).

### Migrations — IF NOT EXISTS Safety
Added `CREATE TABLE IF NOT EXISTS` to 6 historical migration files so fresh deployments don't fail if tables pre-exist:
- `20260226083236_a06ac86d...sql` (22 tables — foundation schema)
- `20260308074600_505a58f7...sql` (vehicle_mileage)
- `20260318010209_91b4f4a3...sql` (employee_tiers)
- `20260320000001_vehicle_mileage_daily.sql`
- `20260328220000_fleet_spare_parts.sql`
- `20260328221000_fleet_maintenance_logs_and_parts.sql`

### Apps `is_archived` Column (#5)
- New migration `20260503000004_add_is_archived_to_apps.sql` adds `is_archived BOOLEAN DEFAULT false`.
- `appService.ts`: all query methods now filter `.eq('is_archived', false)`; `getAll` and `getMonthlyApps` include `is_archived` in the select list.

### SalariesPage Dirty-Row Protection (#3 partial)
- `SalariesPage.tsx` `useEffect` sync now preserves rows with `isDirty=true` when a background realtime or phase-2 refresh arrives, preventing in-progress edits from being overwritten.

### Known Remaining Debt
- `SalariesPage` full migration to `queryClient.setQueryData` (ISSUE #7) — still deferred; dirty-row preservation above mitigates the main runtime impact.
- 3 pairs of duplicate migration timestamps (historical, already applied — do not rename): `20260327120000`, `20260403000000`, `20260407000000`.
