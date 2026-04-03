// Manual Migration Application Script
// This migration removes company_id from platform_accounts and account_assignments

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Migration: Remove company_id from Platform Accounts          ║
╚════════════════════════════════════════════════════════════════╝

⚠️  This migration needs to be applied manually via Supabase Dashboard:

1. Go to: https://plxpehtkabmfkdlgjyin.supabase.co/project/_/sql

2. Copy and paste the SQL from:
   supabase/migrations/20260404000000_remove_company_id_from_platform_accounts.sql

3. Click "Run" to execute the migration

4. After successful execution, run:
   npm run gen:types

Alternatively, if you have Supabase CLI installed:
   npx supabase db push

`);

process.exit(0);
