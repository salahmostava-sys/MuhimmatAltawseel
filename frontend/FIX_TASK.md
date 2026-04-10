# Task: Fix ALL TypeScript errors

Read tsc-errors.txt first - it has 746 lines of errors across 46 files.

## Root Cause Analysis

### 1. Outdated Supabase types (shared/types/supabase.ts)
The generated DB types are missing many tables and columns that the code uses.

**Tables missing from types:**
- pricing_rules
- daily_shifts
- app_hybrid_rules
- fuel_records
- maintenance_records
- violations
- tiers
- spare_parts_inventory
- spare_parts
- maintenance_parts
- salary_drafts
- salary_slip_templates
- admin_action_log

**Columns missing:**
- work_type on apps table
- tier_id on employees table
- severity, is_resolved on alerts table
- cost, liters on fuel_records
- remaining_amount on advances
- license_status, city on employees for EmployeeLike
- sheet_snapshot on salary rows

**RPC functions missing:**
- replace_daily_orders_month_rpc
- performance_dashboard_rpc
- rider_profile_performance_rpc
- capture_salary_month_snapshot
- get_employee_count_by_city

### 2. tsconfig lib target too low
replaceAll not available - TS2550. Fix: add "es2021" to lib in tsconfig.app.json.

### 3. Type casting issues
Many services cast payloads as Record of string to unknown before passing to Supabase insert/upsert. Fix: use proper types or cast through unknown first.

### 4. Lucide icon type mismatch in AppSidebar.tsx
SidebarNavItemData icon type is too narrow - size is number only but Lucide icons accept string or number. Fix: widen the type.

### 5. Minor issues
- Missing "good" in performanceEngine rating tiers
- Missing "notes" on ShiftRow type
- Missing year/month vars in spreadsheetFileOps.ts line 210
- Missing default export on Alerts page
- v7_relativeSplatPath on router future config
- TOKEN_REFRESH_FAILED event comparison
- Missing AppRole type export
- Test setup observer mocks type casting
- cellBg/val missing on color map type in orders components

## Strategy
- Since we cannot regenerate Supabase types from the live database, manually add the missing tables, columns, enums, and RPC functions to shared/types/supabase.ts or create a supabase-extensions.d.ts that merges with existing types
- Fix tsconfig.app.json to include es2021 in lib
- Fix type casting issues with proper type assertions
- Fix the icon type in AppSidebar to accept LucideIcon
- Fix all other minor issues in individual files

## Verification
After fixing, run: npx tsc --noEmit
Target: 0 errors.
