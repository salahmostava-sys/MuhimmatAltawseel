# Cleanup Report

Audit date: 2026-04-04

This report replaces the older generic cleanup note with a current code audit focused on
unused frontend code, legacy paths, and safe deletion candidates.

## Scope

- Runtime source reviewed:
  - `frontend/app`
  - `frontend/modules`
  - `frontend/shared`
  - `frontend/services`
- Static import graph review across the frontend runtime tree.
- Manual confirmation for known legacy patterns and route entrypoints.

## Headline Findings

- The frontend runtime tree currently contains about `435` source files.
- Static analysis found about `73` orphan candidates with no importer in the runtime graph.
- Orphan distribution:
  - `41` under `frontend/shared`
  - `31` under `frontend/modules`
  - `1` under `frontend/services`
- The project still carries an explicit migration layer:
  - `frontend/modules/README.md` states that legacy routes still live under `modules/pages/*`.
- Some live files contain fully retained legacy implementations that are not used anymore.

## Confirmed Architecture Drift

### 1. Legacy implementation left inside active files

- `frontend/modules/pages/SettingsHub.tsx`
  - Contains a full `SettingsHubLegacy` implementation.
  - The file exports `SettingsHubOptimized` instead.
  - This is dead code inside a live route file.

- `frontend/modules/dashboard/pages/DashboardPage.tsx`
  - Contains retained legacy blocks such as:
    - `LegacyDashboardHeader`
    - `LegacyAnalyticsTab`
    - `LegacyOverviewTab`
  - These blocks are explicitly silenced with unused warnings.

### 2. Transitional route layer still exists

- Many route files under `frontend/modules/pages/*` are thin wrappers that only re-export the
  real page from a domain folder.
- Example:
  - `frontend/modules/pages/Dashboard.tsx`
  - `frontend/modules/pages/Apps.tsx`
- This is not automatically wrong, but it adds indirection and maintenance overhead.

## High-Confidence Cleanup Candidates

These are the safest first targets because they showed no runtime importers and also match
dead-feature or abandoned-refactor patterns.

### A. Dead feature/service files

- `frontend/services/payrollService.ts`

### B. Dashboard files with no current importer

- `frontend/modules/dashboard/components/AiDashboardPanel.tsx`
- `frontend/modules/dashboard/components/ComprehensiveStats.tsx`
- `frontend/modules/dashboard/components/DashboardAiSummaryCard.tsx`
- `frontend/modules/dashboard/components/DashboardExportCard.tsx`
- `frontend/modules/dashboard/components/DashboardOrdersInsights.tsx`
- `frontend/modules/dashboard/components/DashboardTrendInsight.tsx`
- `frontend/modules/dashboard/components/FleetHealthTab.tsx`
- `frontend/modules/dashboard/components/HeatmapTab.tsx`
- `frontend/modules/dashboard/components/OperationalActionsBar.tsx`
- `frontend/modules/dashboard/components/OperationalStats.tsx`
- `frontend/modules/dashboard/hooks/useAiAnalytics.ts`

### C. Unused secondary list views

- `frontend/modules/employees/components/EmployeesFastList.tsx`
- `frontend/modules/orders/components/OrdersListTab.tsx`
- `frontend/modules/salaries/components/SalaryFastList.tsx`

### D. Unused barrel exports

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

## Medium-Confidence Candidates

These also appear unused in the import graph, but should be removed only after a shorter
manual verification pass because they may be reserved for future UI reuse or test flows.

### Shared UI components

- `frontend/shared/components/ui/accordion.tsx`
- `frontend/shared/components/ui/aspect-ratio.tsx`
- `frontend/shared/components/ui/avatar.tsx`
- `frontend/shared/components/ui/breadcrumb.tsx`
- `frontend/shared/components/ui/carousel.tsx`
- `frontend/shared/components/ui/chart.tsx`
- `frontend/shared/components/ui/context-menu.tsx`
- `frontend/shared/components/ui/data-table-excel-filter.tsx`
- `frontend/shared/components/ui/drawer.tsx`
- `frontend/shared/components/ui/form.tsx`
- `frontend/shared/components/ui/hover-card.tsx`
- `frontend/shared/components/ui/input-otp.tsx`
- `frontend/shared/components/ui/menubar.tsx`
- `frontend/shared/components/ui/navigation-menu.tsx`
- `frontend/shared/components/ui/pagination.tsx`
- `frontend/shared/components/ui/resizable.tsx`
- `frontend/shared/components/ui/sidebar.tsx`
- `frontend/shared/components/ui/slider.tsx`
- `frontend/shared/components/ui/toaster.tsx`
- `frontend/shared/components/ui/toggle-group.tsx`

### Shared utility/hooks

- `frontend/shared/components/NavLink.tsx`
- `frontend/shared/components/StatCard.tsx`
- `frontend/shared/components/UserProfileModal.tsx`
- `frontend/shared/components/advances/AddAdvanceModal.tsx`
- `frontend/shared/components/attendance/AttendanceStats.tsx`
- `frontend/shared/components/dashboard/RiderPredictionCard.tsx`
- `frontend/shared/components/filters/index.ts`
- `frontend/shared/hooks/useAppsData.ts`
- `frontend/shared/hooks/useDebounce.ts`
- `frontend/shared/hooks/useErrorHandler.ts`
- `frontend/shared/hooks/useFuelDailyPaged.ts`
- `frontend/shared/hooks/usePlatformAccountsPaged.ts`
- `frontend/shared/hooks/useRiderPredictions.ts`
- `frontend/shared/lib/formFieldClasses.ts`
- `frontend/shared/lib/formatters.ts`

## Not Recommended For Deletion In The First Pass

Even if some of these look unused in static analysis, they should stay out of the first
cleanup batch.

- `frontend/shared/test/**`
  - Test bootstrap and mocks are often loaded by tooling rather than imports we detect here.

- `frontend/shared/types/**`
  - Type-only imports and editor/tooling usage can hide real consumers.

- `frontend/modules/pages/*`
  - Some of these are route entry wrappers, not dead code.

- `supabase/migrations/**`
  - Old migrations are history, not runtime dead code.

- Root `*.md` files
  - These are clutter, but not the same as executable technical debt.

## Recommended Execution Order

### Phase 1. Safe code shrink with very low risk

- Remove dead legacy blocks from live files:
  - `SettingsHubLegacy`
  - `LegacyDashboardHeader`
  - `LegacyAnalyticsTab`
  - `LegacyOverviewTab`
- Delete `frontend/services/payrollService.ts`
- Delete obviously unused secondary list views:
  - `EmployeesFastList.tsx`
  - `OrdersListTab.tsx`
  - `SalaryFastList.tsx`

### Phase 2. Delete abandoned dashboard slices

- Remove orphan dashboard components and `useAiAnalytics.ts`.
- Run build and targeted dashboard smoke test after deletion.

### Phase 3. Remove unused barrel exports

- Delete unused `index.ts` re-export files that have no consumers.

### Phase 4. Shared UI pruning

- Remove unused `shared/components/ui/*` files in small batches.
- This should be done gradually because design-system files are easy to reintroduce later.

## Guardrails Before Cleanup

- Enable stricter detection after the first cleanup pass:
  - Turn `noUnusedLocals` on later.
  - Turn `noUnusedParameters` on later.
  - Consider upgrading `@typescript-eslint/no-unused-vars` from `warn` to `error`.
- Do not delete migrations as a code-size optimization.
- Do not delete route wrappers until route ownership is simplified.

## Outcome

The system is not bloated only because it is large.
It is bloated because it contains:

- incomplete refactors,
- retained legacy implementations,
- unused side-path UIs,
- unused barrel exports,
- and a large shared UI surface that exceeds current usage.

This makes the codebase a good candidate for a staged cleanup, not a risky rewrite.
