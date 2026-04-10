# 🔍 Frontend Page Component Audit Report

**Generated**: 2026-04-10  
**Scope**: All page components in `frontend/modules/`  
**App Context**: Arabic RTL delivery management system (مهمة التوصيل)

---

## Table of Contents

1. [Shared Hooks Analysis](#shared-hooks-analysis)
2. [Page-by-Page Audit](#page-by-page-audit)
3. [Summary Table](#summary-table)

---

## Shared Hooks Analysis

### `useAuthQueryGate.ts`
- Pattern: Returns `{ enabled, authReady, userId, authLoading }` — queries should use `enabled` and scope keys with `authQueryUserId(userId)`.

### `usePermissions.ts`
- Pattern: Returns `{ permissions, loading, isAdmin }` — permissions default to DENY_ALL while loading, which is safe. Uses `useQuery` with `enabled: Boolean(user?.id && role)`.

---

## Page-by-Page Audit

---

### 1. `modules/advances/pages/AdvancesPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state (`advances`, `employees`) mirroring React Query data via `useEffect` — violates single source of truth, causes extra re-renders | 🟡 Medium |
| 2 | Code | `useEffect` for error toasting uses `advancesPageError` as dep — fires toast on every re-render where error is truthy (e.g. tab switch back) | 🟡 Medium |
| 3 | Code | `fetchAll` from `useAdvanceTable` is used for mutation callbacks — unclear if it calls `refetchAdvancesData`; potential stale data if it doesn't invalidate the query | 🟡 Medium |
| 4 | UI | No skeleton loader for the stats cards section — shows `0` values while data loads | 🟢 Low |
| 5 | TypeScript | Complex inline type for `employees` state: `{ id: string; name: string; national_id?: string \| null; sponsorship_status?: string \| null }[]` — should be extracted to a named type | 🟢 Low |
| 6 | TypeScript | `advRows` and `empRows` cast with `as Advance[]` and inline types — no runtime validation | 🟢 Low |

---

### 2. `modules/apps/pages/AppSettingsPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | UX | `handleWorkTypeChange` — no try/catch around `appService.update` and `queryClient.invalidateQueries`. If the update fails, no error toast is shown | 🔴 Critical |
| 2 | UX | No loading state shown during `handleWorkTypeChange` — user gets no feedback the action is in progress | 🟡 Medium |
| 3 | TypeScript | Destructuring `{ can_edit } = {}` from `usePermissions` — if `permissions` is undefined, `can_edit` would be undefined, not `false`. Works due to DENY_ALL default but fragile pattern | 🟢 Low |
| 4 | Code | `retry` option not set on the query — defaults to TanStack Query default (3 retries), which is fine but inconsistent with other pages that use `defaultQueryRetry` | 🟢 Low |

---

### 3. `modules/apps/pages/AppsPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | All logic extracted to `useAppsPage` hook — page is clean. Good pattern. | ✅ None |
| 2 | UI | Loading state shows skeleton pulses — good | ✅ None |
| 3 | UI | Empty state handled — good | ✅ None |
| 4 | UX | Delete dialog has both soft/hard delete with dependencies check and confirmation — well implemented | ✅ None |
| 5 | Code | `format(new Date(\`\${monthYear}-01\`))` — could throw if `monthYear` is malformed | 🟢 Low |

---

### 4. `modules/dashboard/pages/DashboardPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `export { default } from './DashboardPerformancePage'` at the bottom — the `Dashboard` component defined in this file is **never exported or used** (marked `eslint-disable @typescript-eslint/no-unused-vars`). This is dead code. | 🔴 Critical |
| 2 | Code | `fetchDashboardKpis` is defined outside the component but takes `activeEmployeeIdsInMonth` which comes from hooks — coupling between module-level function and component state | 🟡 Medium |
| 3 | TypeScript | Multiple inline type aliases (`DashboardApp`, `DashboardAttendanceToday`, etc.) defined at module scope — should be in a dedicated types file | 🟡 Medium |
| 4 | Code | `Promise.allSettled` is used but only `rpcResult` and `employeeAssignmentsResult` are treated as critical — others silently fallback. Good resilience but no logging for `additionalMetricsResult` failure | 🟢 Low |
| 5 | Code | `useDashboardRealtimeInvalidation` defined at module scope but used inside component via `useDashboard` — indirect hook composition is fine but hard to trace | 🟢 Low |

---

### 5. `modules/dashboard/pages/DashboardPerformancePage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Auth gate properly used with `useAuthQueryGate()` and `authQueryUserId()` — good | ✅ None |
| 2 | Code | `chatSystemPrompt` built from `useMemo` with try/catch — silently returns empty string on error | 🟢 Low |
| 3 | UI | Tab fallback uses plain `animate-pulse` skeleton — adequate | ✅ None |
| 4 | UX | Error state shows `QueryErrorRetry` — good | ✅ None |

---

### 6. `modules/employees/pages/EmployeesPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state: `data` mirrors `employeesData` via `useEffect` — same anti-pattern as AdvancesPage | 🟡 Medium |
| 2 | Code | `useAuthQueryGate()` is called but its return value is not used — the auth gate is used inside `useEmployeesData` presumably, but the page doesn't pass `enabled` to any queries of its own | 🟢 Low |
| 3 | Code | `setSelectedEmployee(null)` called inside the render body (not in an effect) when `isVisibleInMonth` is false — this is a **setState during render**, which is technically allowed in React but is a code smell and can cause unexpected re-renders | 🔴 Critical |
| 4 | Code | `uploadIntervalRef` cleanup in `useEffect` return — good | ✅ None |
| 5 | Code | Visibility change listener for auto-refetch after 90s away — good UX pattern | ✅ None |
| 6 | TypeScript | `employeesData as Employee[]` cast — no type guard | 🟢 Low |
| 7 | UI | Uses `QueryErrorRetry` for error state — good | ✅ None |

---

### 7. `modules/fuel/pages/FuelPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | All logic extracted to `useFuelPage` hook — clean separation | ✅ None |
| 2 | UI | Error state handled with `QueryErrorRetry` — good | ✅ None |
| 3 | UI | Wrapping `FuelFiltersToolbar` in empty fragment `<>...</>` inside `fuelToolbarEnd` — unnecessary | 🟢 Low |
| 4 | Code | No auth gate visible in the page — presumably handled in `useFuelPage` | 🟢 Low |

---

### 8. `modules/maintenance/pages/MaintenancePage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate (`useAuthQueryGate`) called — relies on child tab components for auth | 🟡 Medium |
| 2 | Code | No permission check at page level — presumably done in child components | 🟡 Medium |
| 3 | UI | No error state or loading state at page level — delegated to tab components | 🟡 Medium |
| 4 | UI | Exposes internal table names (`maintenance_logs`, `spare_parts`) to users in the description text — minor information leakage | 🟢 Low |

---

### 9. `modules/orders/pages/OrdersPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate at page level — delegated to lazy-loaded tab components | 🟡 Medium |
| 2 | Code | No permission check at page level | 🟡 Medium |
| 3 | UI | Tab content wrapped in `Suspense` with proper fallback — good | ✅ None |
| 4 | UI | No page-level error boundary | 🟡 Medium |

---

### 10. `modules/pages/AiAnalyticsPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Sequential `await` in a loop: `for (const my of monthKeys) { const c = await dashboardService.getMonthOrdersCount(my); }` — makes N sequential network calls instead of parallel | 🔴 Critical |
| 2 | Code | Auth gate properly used | ✅ None |
| 3 | UI | Loading and error states properly handled with skeletons and `QueryErrorRetry` | ✅ None |
| 4 | TypeScript | `(value: number \| undefined, name: string)` in Tooltip formatter — `value` can be undefined but passed to `toLocaleString` after null check — correct | ✅ None |

---

### 11. `modules/pages/Alerts.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `useAuthQueryGate()` called but return value unused — auth presumably handled in `useAlerts()` | 🟢 Low |
| 2 | Code | `handleResolve` has generic `catch (e)` with no error logging | 🟢 Low |
| 3 | UI | Loading state uses `Loader2` spinner — no skeleton loader | 🟢 Low |
| 4 | UI | Empty state with filter context handled — good | ✅ None |
| 5 | UI | Resolved alerts limited to first 20 with `slice(0, 20)` but no "show more" option | 🟢 Low |
| 6 | Code | `Icon` variable from `typeIcons` is declared but not used in resolved alerts section (only `CheckCircle2` is rendered) — unused variable `Icon` | 🟢 Low |

---

### 12. `modules/pages/Attendance.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate (`useAuthQueryGate`) called at page level | 🟡 Medium |
| 2 | Code | No permission check at page level | 🟡 Medium |
| 3 | UX | `handleImportAttendance` passes `employeeName` as `employee_id` with comment "Service should resolve name to ID" — this is likely broken or relying on backend magic | 🔴 Critical |
| 4 | Code | Import loop does `await` sequentially per row — no batching, could be very slow for large files | 🟡 Medium |
| 5 | Code | `_xlsxCache` uses module-level mutable `let` — fine for lazy loading but not tree-shakeable | 🟢 Low |
| 6 | UI | No loading skeleton for the attendance content — delegated to child components | 🟢 Low |

---

### 13. `modules/pages/EmployeeTiers.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state (`tiers`, `employees`, `apps`) mirroring React Query data via `useEffect` | 🟡 Medium |
| 2 | Code | `checkAbsconded` effect calls `employeeTierService.getActiveAssignmentWithVehicleByEmployee` without auth gate check — could fail if session is not ready | 🟡 Medium |
| 3 | Code | `handleDelete` has no try/catch — if `deleteTier` fails, no error toast | 🔴 Critical |
| 4 | Code | `EmployeeSelect` uses manual `mousedown` listener for outside-click detection instead of using a Popover/Combobox component — potential memory leak if ref changes | 🟡 Medium |
| 5 | Code | `useEffect` watching `[employees, tiers]` for absconded check fires on every data change — no debounce, `checkAbsconded` is async but not cleaned up | 🟡 Medium |
| 6 | TypeScript | `getTierFieldValue` returns `unknown` and uses `Record<string, unknown>` cast | 🟢 Low |
| 7 | Code | `importTiersExcel` — sequential `await` in loop for creating tiers | 🟡 Medium |

---

### 14. `modules/pages/ForgotPassword.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth context needed (public page) — correct | ✅ None |
| 2 | UI | Success and error states properly handled | ✅ None |
| 3 | Code | Custom email validation `isValidEmail` — duplicates what HTML5 `type="email"` does; could have edge cases | 🟢 Low |
| 4 | UI | Animation uses inline `<style>` tag — could use CSS module or Tailwind animation | 🟢 Low |

---

### 15. `modules/pages/Login.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `useEffect` fetching `dashboardService.getSystemSettings()` without error handling — `.then()` with no `.catch()` | 🟡 Medium |
| 2 | Code | `loadRememberedEmail()` uses `async` IIFE with cleanup — good pattern | ✅ None |
| 3 | Code | `error` variable re-assigned in try/catch/finally — works but confusing flow. `let error` is assigned inside `try` from `signIn` result and inside `catch` from thrown error | 🟢 Low |
| 4 | UI | No "Forgot Password" link on the login page — there is a ForgotPassword page but no link to it from Login | 🟡 Medium |
| 5 | TypeScript | `SystemSettings` interface defined locally — should be shared | 🟢 Low |

---

### 16. `modules/pages/Motorcycles.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state `data` mirrors `vehiclesData` via `useEffect` | 🟡 Medium |
| 2 | UX | `handleDelete` uses `confirm()` (browser native dialog) instead of a proper AlertDialog — inconsistent with rest of app | 🟡 Medium |
| 3 | Code | No auth gate called at page level — `useMotorcyclesData()` presumably handles it | 🟢 Low |
| 4 | UI | Skeleton rows for loading — good | ✅ None |
| 5 | UI | Empty state — good | ✅ None |
| 6 | Code | `handleImport` has sequential `await` in loop for `vehicleService.upsert` — slow for large files | 🟡 Medium |
| 7 | Code | Multiple unused variables prefixed with `_` (`_authBadge`) — dead code | 🟢 Low |

---

### 17. `modules/pages/NotFound.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `logError` called with non-Error argument (string + pathname) — works but inconsistent with logger API | 🟢 Low |
| 2 | UI | Clean 404 page with RTL support and home link — good | ✅ None |

---

### 18. `modules/pages/ProfilePage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate — relies on route-level auth protection and `ProfileSettingsContent` internal checks | 🟢 Low |
| 2 | UI | Clean wrapper page — delegates to `ProfileSettingsContent` | ✅ None |

---

### 19. `modules/pages/ResetPassword.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `authService.getSession()` called without `await` in `.then()` callback — works but session check is async and `setInvalidLink` may fire after unmount if user navigates away | 🟡 Medium |
| 2 | Code | `globalThis.location.hash` used instead of `useLocation` from React Router — bypasses router | 🟢 Low |
| 3 | UI | Animation uses inline `<style>` — same as ForgotPassword | 🟢 Low |
| 4 | UX | Success state auto-navigates after 2.5s — good but no way to cancel | 🟢 Low |

---

### 20. `modules/pages/SalarySchemes.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state (`schemes`, `tiers`, `snapshots`, `apps`) mirroring React Query data | 🟡 Medium |
| 2 | Code | `handleSnapshot` — sequential `await` in loop for `upsertSnapshot` per month | 🟡 Medium |
| 3 | UX | `handleArchive` — no confirmation dialog for archiving/restoring a scheme | 🟡 Medium |
| 4 | UX | `handleUnassignApp` — no confirmation dialog before unlinking app from scheme | 🟡 Medium |
| 5 | TypeScript | `schemeTiers as unknown as import('@services/supabase/types').Json` — unsafe double cast | 🔴 Critical |
| 6 | Code | Error handling in effects uses toast — consistent pattern | ✅ None |
| 7 | UI | Loading skeleton and empty state — good | ✅ None |

---

### 21. `modules/pages/SettingsHubOptimized.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate at page level — each tab content component presumably handles its own | 🟡 Medium |
| 2 | Code | No permission check at page level — any logged-in user can see all tabs; individual tabs should restrict | 🟡 Medium |
| 3 | UI | Lazy loading with `Suspense` and prefetching on hover/focus — excellent UX | ✅ None |
| 4 | Code | `onMouseOver`/`onMouseLeave` inline style manipulation — could use CSS `:hover` instead | 🟢 Low |
| 5 | UI | Help link `href="#"` — placeholder not implemented | 🟢 Low |
| 6 | UI | Sidebar uses hardcoded `w-[220px]` — not responsive on mobile | 🟡 Medium |

---

### 22. `modules/pages/UsersAndPermissions.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state `rows` mirroring `usersRows` from React Query | 🟡 Medium |
| 2 | Code | `saveMatrix` does sequential `await` per permission page entry — could be batched | 🟡 Medium |
| 3 | Code | Auth gate properly used | ✅ None |
| 4 | UI | Admin-only gate with fallback alert — good | ✅ None |
| 5 | UX | Delete user confirmation dialog — good | ✅ None |
| 6 | Code | `useEffect` auto-selects first user when `permUserId` is null — good | ✅ None |
| 7 | Code | Error effect fires toast on error change — consistent pattern | ✅ None |

---

### 23. `modules/pages/VehicleAssignment.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state (`assignments`, `vehicles`, `employees`) mirroring React Query data | 🟡 Medium |
| 2 | Code | `handlePrint` opens a new window and writes HTML with inline `<script>` — potential XSS if data contains malicious content (though unlikely from own DB) | 🟡 Medium |
| 3 | Code | No auth gate called at page level — presumably in `useVehicleAssignmentData` | 🟢 Low |
| 4 | UI | Loading skeletons, empty state, stats cards — good | ✅ None |
| 5 | UI | Free vehicles rule explanation banner — good UX | ✅ None |

---

### 24. `modules/platform-accounts/pages/PlatformAccountsPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | All logic extracted to `usePlatformAccountsPage` hook — very clean | ✅ None |
| 2 | Code | Wrapped in `memo()` — good for preventing unnecessary re-renders | ✅ None |
| 3 | UI | Error state with `QueryErrorRetry` — good | ✅ None |
| 4 | Code | Auth and permissions presumably handled in the hook | 🟢 Low |

---

### 25. `modules/salaries/pages/SalariesPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Massive component (~300+ lines of state + effects) — should be further decomposed into custom hooks | 🟡 Medium |
| 2 | Code | `useEffect` with manual timeout for draft syncing + `skipNextDraftSaveRef` + `lastDraftSignatureRef` — complex logic prone to race conditions | 🟡 Medium |
| 3 | Code | `batchQueue` ZIP generation uses `useEffect` with `setTimeout(async () => {...}, 150)` — fragile; no proper abort handling if component unmounts | 🔴 Critical |
| 4 | Code | `PLATFORM_COLORS` mutated in-place via `useEffect` using `Object.assign` and `delete` — mutating a shared module-level object is dangerous | 🔴 Critical |
| 5 | Code | Manual 15-second timeout for salary data fetch via `Promise.race` — good resilience but duplicates what retry config could do | 🟡 Medium |
| 6 | Code | `useRealtimePostgresChanges` for live order sync — good feature | ✅ None |
| 7 | TypeScript | `salaryBaseContext as SalaryBaseContextData` cast in `prepareSalaryState` call | 🟢 Low |
| 8 | Code | Auth gate properly used with `useAuthQueryGate()` | ✅ None |

---

### 26. `modules/violations/pages/ViolationResolverPage.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | All logic extracted to `useViolationTable` hook — clean | ✅ None |
| 2 | UI | Error state with `QueryErrorRetry` — good | ✅ None |
| 3 | UI | Stats cards, search/saved tabs, filters — well structured | ✅ None |
| 4 | Code | No direct auth gate call — presumably in `useViolationTable` | 🟢 Low |

---

### 27. `modules/pages/settings-hub/ActivityLogContent.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | Redundant local state (`logs`, `totalCount`) mirroring React Query data | 🟡 Medium |
| 2 | Code | Auth gate properly used | ✅ None |
| 3 | Code | `handleExport` calls `getAuditLogsForExport()` without error handling — if it fails, no toast | 🟡 Medium |
| 4 | UI | Skeleton rows for loading, empty state — good | ✅ None |
| 5 | UI | Pagination properly implemented | ✅ None |
| 6 | Code | Debounced search with cleanup — good | ✅ None |
| 7 | Code | No permission check — any authenticated user can see all audit logs | 🟡 Medium |

---

### 28. `modules/pages/settings-hub/CompanySettingsContent.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | No auth gate — query runs without `enabled` gated on auth state | 🟡 Medium |
| 2 | Code | No permission check — any user accessing settings can edit company info | 🟡 Medium |
| 3 | UI | Loading and error states properly handled | ✅ None |
| 4 | Code | `handleSave` has proper try/catch with toast | ✅ None |
| 5 | TypeScript | `data as { id: string }` cast after create — no type guard | 🟢 Low |

---

### 29. `modules/pages/settings-hub/ProfileSettingsContent.tsx`

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1 | Code | `if (profileData && !profileSynced)` check inside component body (not in effect) — setState during render | 🔴 Critical |
| 2 | Code | `previewUrl` from `URL.createObjectURL` is never revoked — memory leak | 🟡 Medium |
| 3 | Code | Auth properly checked via `enabled: !!user` on query | ✅ None |
| 4 | UI | Loading and error states — good | ✅ None |
| 5 | UX | Avatar upload with validation — good | ✅ None |
| 6 | Code | Password strength meter and match indicator — good UX | ✅ None |

---

## Summary Table

### Issues Per Category Per Page

| Page | UI | UX | Code | TypeScript | Total |
|------|----|----|------|-----------|-------|
| AdvancesPage | 1 🟢 | — | 3 🟡 | 2 🟢 | 6 |
| AppSettingsPage | — | 1 🔴, 1 🟡 | 1 🟢 | 1 🟢 | 4 |
| AppsPage | — | — | 1 🟢 | — | 1 |
| DashboardPage | — | — | 1 🔴, 2 🟡, 1 🟢 | 1 🟡 | 5 |
| DashboardPerformancePage | — | — | 1 🟢 | — | 1 |
| EmployeesPage | — | — | 1 🔴, 1 🟡, 1 🟢 | 1 🟢 | 4 |
| FuelPage | 1 🟢 | — | 1 🟢 | — | 2 |
| MaintenancePage | 1 🟡 | — | 2 🟡, 1 🟢 | — | 4 |
| OrdersPage | — | — | 3 🟡 | — | 3 |
| AiAnalyticsPage | — | — | 1 🔴 | — | 1 |
| Alerts | 1 🟢 | — | 2 🟢 | — | 3 |
| Attendance | 1 🟢 | 1 🔴 | 2 🟡, 1 🟢 | — | 5 |
| EmployeeTiers | — | — | 1 🔴, 4 🟡 | 1 🟢 | 6 |
| ForgotPassword | 1 🟢 | — | 1 🟢 | — | 2 |
| Login | — | 1 🟡 | 1 🟡, 1 🟢 | 1 🟢 | 4 |
| Motorcycles | — | 1 🟡 | 2 🟡, 2 🟢 | — | 5 |
| NotFound | — | — | 1 🟢 | — | 1 |
| ProfilePage | — | — | 1 🟢 | — | 1 |
| ResetPassword | — | — | 1 🟡, 2 🟢 | — | 3 |
| SalarySchemes | — | 2 🟡 | 2 🟡 | 1 🔴 | 5 |
| SettingsHubOptimized | 1 🟡, 1 🟢 | — | 2 🟡, 1 🟢 | — | 5 |
| UsersAndPermissions | — | — | 2 🟡 | — | 2 |
| VehicleAssignment | — | — | 2 🟡, 1 🟢 | — | 3 |
| PlatformAccountsPage | — | — | 1 🟢 | — | 1 |
| SalariesPage | — | — | 2 🔴, 3 🟡 | 1 🟢 | 6 |
| ViolationResolverPage | — | — | 1 🟢 | — | 1 |
| ActivityLogContent | — | — | 2 🟡 | — | 2 |
| CompanySettingsContent | — | — | 2 🟡 | 1 🟢 | 3 |
| ProfileSettingsContent | — | — | 1 🔴, 1 🟡 | — | 2 |

### Totals by Severity

| Severity | Count |
|----------|-------|
| 🔴 Critical | 11 |
| 🟡 Medium | 40 |
| 🟢 Low | 31 |
| **Total** | **82** |

### Totals by Category

| Category | 🔴 Critical | 🟡 Medium | 🟢 Low | Total |
|----------|------------|-----------|--------|-------|
| UI | 0 | 3 | 8 | 11 |
| UX | 2 | 5 | 0 | 7 |
| Code | 8 | 29 | 18 | 55 |
| TypeScript | 1 | 1 | 7 | 9 |

### Top Critical Issues to Address

1. **SalariesPage**: Mutating shared module-level `PLATFORM_COLORS` object in `useEffect` — can cause stale references across components
2. **SalariesPage**: Batch ZIP export via chained `useEffect`/`setTimeout` — no cleanup on unmount
3. **DashboardPage**: Entire `Dashboard` component is dead code — exported component comes from `DashboardPerformancePage`
4. **EmployeesPage**: `setSelectedEmployee(null)` called during render (not in effect)
5. **ProfileSettingsContent**: setState during render for profile sync
6. **AiAnalyticsPage**: Sequential API calls in loop instead of `Promise.all`
7. **Attendance**: Passing `employeeName` as `employee_id` in import
8. **EmployeeTiers**: `handleDelete` has no try/catch
9. **AppSettingsPage**: `handleWorkTypeChange` has no error handling
10. **SalarySchemes**: Unsafe `as unknown as Json` double cast
11. **Attendance**: No auth gate at page level

### Most Common Recurring Pattern: Redundant Local State

The following pages mirror React Query data into local `useState` via `useEffect`, causing unnecessary re-renders and violating single-source-of-truth:

- AdvancesPage
- EmployeesPage
- Motorcycles
- EmployeeTiers
- SalarySchemes
- VehicleAssignment
- UsersAndPermissions
- ActivityLogContent

**Recommendation**: Use `data` from `useQuery` directly, or derive computed values via `useMemo`.
