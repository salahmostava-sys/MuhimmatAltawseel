# مهمة التوصيل — Muhimmat AlTawseel

Delivery fleet management system — employees, salaries, attendance, orders, advances, fuel, vehicles, alerts, and more.

Built with React 18 + TypeScript + Vite + Supabase.

---

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
cd frontend
npm install
```

Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...your-anon-key
```

### Run

```bash
npm run dev        # dev server → http://localhost:5000
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run verify     # lint + test + build (CI gate)
```

---

## Project Structure

```
frontend/
├── app/           → Entry point, providers, routing, layout
├── modules/       → Feature pages (one folder per domain)
│   ├── advances/      → Salary advances & installments
│   ├── dashboard/     → Main dashboard & charts
│   ├── employees/     → Employee CRUD, profiles, import/export
│   ├── finance/       → Financial reports
│   ├── fuel/          → Fuel tracking
│   ├── maintenance/   → Vehicle maintenance & spare parts
│   ├── operations/    → Operational views
│   ├── orders/        → Platform orders
│   ├── pages/         → Shared pages (login, settings, alerts, violations)
│   ├── salaries/      → Monthly salary engine, payslips, approval
│   └── settings/      → Settings hub pages
├── shared/        → Reusable components, hooks, lib, types
├── services/      → All Supabase data access (one file per domain)
└── supabase/      → Migrations, edge functions, generated types
```

Each **module** follows a consistent internal layout:

```
modules/myFeature/
├── pages/              → Page-level components (lazy-loaded)
├── components/         → UI components scoped to this feature
├── hooks/              → Custom hooks (data fetching, actions)
├── types/              → TypeScript interfaces and types
├── model/              → Business logic utilities
├── lib/                → Constants, formatters, helpers
├── services/           → Service barrel (optional)
└── index.ts            → Public barrel export
```

---

## How to Add a New Page

### 1. Create the module folder

```
frontend/modules/myFeature/
├── pages/MyFeaturePage.tsx
├── components/
├── hooks/
└── index.ts
```

### 2. Write the page component

```tsx
// modules/myFeature/pages/MyFeaturePage.tsx
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { useQuery } from '@tanstack/react-query';

const MyFeaturePage = () => {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);

  const { data, isLoading } = useQuery({
    queryKey: ['myFeature', uid],
    queryFn: () => myFeatureService.getAll(),
    enabled,
  });

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="page-title">الميزة الجديدة</h1>
      {/* table / cards / etc */}
    </div>
  );
};

export default MyFeaturePage;
```

### 3. Register the route in `app/App.tsx`

```tsx
const MyFeaturePage = lazy(() => import('@modules/myFeature/pages/MyFeaturePage'));

// Inside ProtectedRoute > DashboardLayout:
<Route
  path="/my-feature"
  element={<PageGuard pageKey="my_feature"><MyFeaturePage /></PageGuard>}
/>
```

### 4. Add sidebar navigation

Edit `shared/components/layout/Sidebar.tsx` — add an entry with the route path and an Arabic label.

---

## How to Add a Database Table

### 1. Create a Supabase migration

```bash
supabase migration new my_feature_table
```

Write the SQL:

```sql
CREATE TABLE public.my_feature (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.my_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view"
  ON public.my_feature FOR SELECT
  USING (public.is_active_user());
```

Apply:

```bash
supabase db push
```

### 2. Regenerate TypeScript types

```bash
cd frontend
npm run gen:types
```

### 3. Create a service

```ts
// services/myFeatureService.ts
import { supabase } from './supabase/client';
import { throwIfError } from './serviceError';

export const myFeatureService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('my_feature')
      .select('*')
      .order('created_at', { ascending: false });
    throwIfError(error, 'myFeatureService.getAll');
    return data ?? [];
  },
};
```

### 4. Create a hook

```ts
// shared/hooks/useMyFeature.ts  (or modules/myFeature/hooks/)
import { useQuery } from '@tanstack/react-query';
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';
import { myFeatureService } from '@services/myFeatureService';

export function useMyFeature() {
  const { enabled, userId } = useAuthQueryGate();
  const uid = authQueryUserId(userId);
  return useQuery({
    queryKey: ['my_feature', uid],
    queryFn: () => myFeatureService.getAll(),
    enabled,
  });
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_MONITORING_ENDPOINT` | No | Optional error logging endpoint URL |

The Supabase client is initialized in `frontend/services/supabase/client.ts`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions) |
| Data Fetching | TanStack Query 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Dates | date-fns |
| Excel | @e965/xlsx |
| PDF | jsPDF + html2canvas |
| i18n | i18next (Arabic RTL primary, English LTR) |
| Testing | Vitest + Playwright |

---

## Roles

| Role | Access |
|---|---|
| `admin` | Full access to all features and settings |
| `hr` | Employees, attendance, tiers |
| `finance` | Salaries, advances, fuel, financial reports |
| `operations` | Orders, vehicles, maintenance, platform accounts |
| `viewer` | Read-only dashboard access |

Permissions are managed per-page via `usePermissions(pageKey)` and enforced by `PageGuard` in routes.

---

## License

Private — proprietary software.
