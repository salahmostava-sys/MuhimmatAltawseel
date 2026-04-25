-- ============================================================================
-- Index Audit — pg_stat_user_indexes analysis (2026-04-26)
-- ============================================================================
-- Uncomment sections as you decide to act on them.

-- ═══════════════════════════════════════════════════════════════════════════
-- HIGH PRIORITY — unused indexes wasting write performance + storage
-- ═══════════════════════════════════════════════════════════════════════════

-- ❶ idx_admin_action_log_created_at  —  0 scans , 1032 kB
--    Every INSERT into admin_action_log pays the write penalty
--    of maintaining this index without reads ever using it.
--    DROP INDEX IF EXISTS idx_admin_action_log_created_at;

-- ❷ idx_daily_orders_perf_employee_date  —  0 scans , 168 kB
--    Created for performance_dashboard_rpcs.  If the feature is not yet
--    live, the index is pure overhead on every daily_orders write.
--    DROP INDEX IF EXISTS idx_daily_orders_perf_employee_date;

-- ❸ idx_daily_orders_status  —  0 scans , 48 kB
--    Status-based queries may not be967m in use.  Monitor one more week.
--    DROP INDEX IF EXISTS idx_daily_orders_status;

-- ═══════════════════════════════════════════════════════════════════════════
-- LOW PRIORITY — tiny indexes (≤16 kB) with ≤10 scans
-- ═══════════════════════════════════════════════════════════════════════════
-- These collectively waste ~256 kB and add minor write overhead.
-- Many are pkeys / unique constraints — those are SKIPPED below.

-- idx_employees_role_id                — 0 scans
-- idx_commercial_records_name_ci       — 0 scans
-- idx_salary_records_calc_status       — 0 scans
-- idx_attendance_employee_date_late    — 0 scans
-- idx_order_import_batches_status      — 0 scans
-- idx_finance_transactions_date        — 0 scans
-- idx_attendance_employee_status_date  — 0 scans
-- idx_employees_residency_expiry       — 0 scans

-- ═══════════════════════════════════════════════════════════════════════════
-- HEAVILY-USED — keep and monitor
-- ═══════════════════════════════════════════════════════════════════════════
-- user_roles_user_id_role_key          — 12.7M scans
-- profiles_pkey                        — 9.9M  scans
-- employees_pkey                       — 314K  scans
-- idx_daily_shifts_app_date            — 116K  scans
-- idx_daily_orders_employee_date       — 68K   scans
-- daily_orders_employee_id_date_app_id_key — 58K scans
-- salary_schemes_pkey                  — 52K   scans
-- auth_rate_limits (edge_rate_limits)  — 538   scans (rate-limiting: OK)
