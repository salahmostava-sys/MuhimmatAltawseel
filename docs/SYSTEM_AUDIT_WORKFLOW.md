# System Audit Workflow

## Fast local verification

Run the daily safety gate:

```bash
cd d:\MuhimmatAltawseel
node scripts/system-audit.mjs
```

This checks:

- `frontend` package layout and frontend `verify`
- AI backend Python smoke tests when required packages are installed locally
- Supabase audit SQL files presence

## Strict frontend audit

Run the stricter frontend pass when you want warning cleanup and coverage:

```bash
cd d:\MuhimmatAltawseel
node scripts/system-audit.mjs --strict-frontend
```

This adds:

- `frontend` strict ESLint warnings gate
- frontend coverage via `npm run audit:frontend`

## Optional Supabase SQL execution

If you have a safe database URL and `psql` installed, you can execute the read-only smoke SQL:

PowerShell:

```powershell
cd d:\MuhimmatAltawseel
$env:SUPABASE_DB_URL = "postgresql://..."
node scripts/system-audit.mjs --skip-frontend --skip-backend --run-supabase-sql
```

Executed files:

- `supabase/tenant_rls_smoke_tests.sql`
- `supabase/phase_1_5_validation_checks.sql`

`maintenance_system_tests.sql` remains manual because it includes transactional mutation checks.
