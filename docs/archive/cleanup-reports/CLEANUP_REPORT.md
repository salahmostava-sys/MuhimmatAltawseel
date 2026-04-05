# Cleanup Report

Audit date: 2026-04-04

This report captures the cleanup pass that was requested with one rule:
before deleting anything, check whether the code contains hidden useful behavior that is worth keeping.

## Result Summary

- Frontend runtime files before cleanup: `435`
- Frontend runtime files after cleanup: `417`
- Runtime orphan candidates before cleanup: `73`
- Runtime orphan candidates after cleanup: `57`
- Net reduction in runtime files: `18`
- Net reduction in orphan candidates: `16`

## What Was Reviewed First

Before deletion, the following categories were reviewed manually:

- legacy code left inside active route files
- duplicate services with logic already implemented elsewhere
- hidden alternate views that are not wired today but still provide real product value
- barrel export files that add indirection without runtime benefit

## What Was Kept On Purpose

These files are still not wired into the active runtime graph, but they were not deleted in this pass because they contain real reusable behavior rather than pure dead weight.

### Hidden views with real value

- `frontend/modules/employees/components/EmployeesFastList.tsx`
  - Fast paged employee list with print, export, import, and compact filters.
- `frontend/modules/orders/components/OrdersListTab.tsx`
  - Alternative paged orders list with export flow and month navigation.
- `frontend/modules/salaries/components/SalaryFastList.tsx`
  - Compact salary records list with export/import/print behavior.

### Dashboard slices worth a product decision before removal

- `frontend/modules/dashboard/components/AiDashboardPanel.tsx`
- `frontend/modules/dashboard/components/DashboardExportCard.tsx`
- `frontend/modules/dashboard/components/DashboardOrdersInsights.tsx`
- `frontend/modules/dashboard/components/DashboardTrendInsight.tsx`
- `frontend/modules/dashboard/components/OperationalStats.tsx`
- `frontend/modules/dashboard/hooks/useAiAnalytics.ts`

These look like shelved feature slices rather than accidental duplicates.

## What Was Deleted Or Simplified Now

### 1. Legacy code removed from live route files

- `frontend/modules/pages/SettingsHub.tsx`
  - Replaced with a thin direct re-export to `SettingsHubOptimized`.
  - Removed the embedded unused `SettingsHubLegacy` implementation.

- `frontend/modules/dashboard/pages/DashboardPage.tsx`
  - Removed retained legacy dashboard blocks and helper clutter that no longer powers the live page.
  - The active dashboard now relies only on the current `DashboardHeader`, `DashboardOverviewTab`, and lazy `DashboardAnalyticsTab` flow.

### 2. Duplicate service removed

- Deleted `frontend/services/payrollService.ts`
  - Its salary-calculation logic duplicated behavior already covered by the active salary domain/service path.

### 3. Unused barrel layers removed

Deleted these unused barrel files:

- `frontend/modules/advances/index.ts`
- `frontend/modules/advances/services/index.ts`
- `frontend/modules/alerts/index.ts`
- `frontend/modules/apps/index.ts`
- `frontend/modules/auth/index.ts`
- `frontend/modules/employees/index.ts`
- `frontend/modules/employees/services/index.ts`
- `frontend/modules/fuel/index.ts`
- `frontend/modules/fuel/services/index.ts`
- `frontend/modules/hr/index.ts`
- `frontend/modules/maintenance/index.ts`
- `frontend/modules/operations/index.ts`
- `frontend/modules/orders/index.ts`
- `frontend/modules/orders/services/index.ts`
- `frontend/modules/salaries/index.ts`
- `frontend/modules/salaries/services/index.ts`
- `frontend/modules/settings/index.ts`

### 4. Small structural follow-up

- Updated `frontend/modules/README.md`
  - Removed the recommendation to keep unused barrel layers as stable entry points.
- Updated `frontend/shared/hooks/useAuthedQuery.ts`
  - Fixed a real React Hooks ordering bug discovered during strict lint verification.

## Post-Cleanup Scan

After the cleanup pass, the remaining orphan candidates are concentrated in:

- dashboard experimental/alternative slices
- hidden fast-list views
- shared UI primitives not currently used by the shipped screens
- some shared utility/hooks and type/test infrastructure

## Remaining High-Value Next Candidates

These are still strong candidates for a later cleanup pass, but I intentionally did not delete them yet because each needs either a short product decision or one more confirmation round.

### Likely removable next

- `frontend/modules/dashboard/components/ComprehensiveStats.tsx`
- `frontend/modules/dashboard/components/FleetHealthTab.tsx`
- `frontend/modules/dashboard/components/HeatmapTab.tsx`
- `frontend/modules/dashboard/components/OperationalActionsBar.tsx`
- `frontend/shared/components/NavLink.tsx`
- `frontend/shared/components/StatCard.tsx`
- `frontend/shared/hooks/useAppsData.ts`
- `frontend/shared/hooks/useDebounce.ts`
- `frontend/shared/hooks/useErrorHandler.ts`
- `frontend/shared/lib/formFieldClasses.ts`
- `frontend/shared/lib/formatters.ts`

### Keep out of the next delete batch unless confirmed again

- `frontend/shared/test/**`
- `frontend/shared/types/**`
- `supabase/migrations/**`
- root documentation files

## Verification

The cleanup pass was verified with:

- `npm.cmd run lint:strict` in `frontend` -> passed
- `npm.cmd run build` in `frontend` -> passed

## Conclusion

This pass removed the clearest technical debt without deleting hidden useful behavior.

The biggest wins came from:

- removing dead legacy code inside live files
- removing duplicate service logic
- removing unused barrel indirection

The codebase is now smaller and cleaner, but the next meaningful reduction will come from deciding whether the hidden fast-list views and shelved dashboard slices should be surfaced or deleted.
