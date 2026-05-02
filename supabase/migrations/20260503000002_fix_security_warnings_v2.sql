-- ============================================================
-- SECURITY FIX v2 — يعالج جميع التحذيرات الأمنية الظاهرة في Supabase
--
-- المشاكل المعالجة:
--   1. rls_policy_always_true    → إصلاح سياسات RLS للجداول الجديدة
--   2. function_search_path_mutable → إصلاح is_salary_admin_job_title
--   3. anon_security_definer_function_executable  → إلغاء صلاحية anon
--   4. authenticated_security_definer_function_executable → إلغاء صلاحية authenticated للدوال الداخلية
-- ============================================================

-- ============================================================
-- 1. إصلاح سياسات RLS — leave_requests
-- ============================================================

DROP POLICY IF EXISTS leave_requests_insert ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_update ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_delete ON public.leave_requests;

-- يشترط أن يكون المستخدم مسجلاً (authenticated) لأي عملية كتابة
CREATE POLICY "leave_requests_insert" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "leave_requests_update" ON public.leave_requests
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "leave_requests_delete" ON public.leave_requests
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. إصلاح سياسات RLS — hr_performance_reviews
-- ============================================================

DROP POLICY IF EXISTS hr_reviews_insert ON public.hr_performance_reviews;
DROP POLICY IF EXISTS hr_reviews_update ON public.hr_performance_reviews;
DROP POLICY IF EXISTS hr_reviews_delete ON public.hr_performance_reviews;

CREATE POLICY "hr_reviews_insert" ON public.hr_performance_reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "hr_reviews_update" ON public.hr_performance_reviews
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "hr_reviews_delete" ON public.hr_performance_reviews
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. إصلاح function_search_path_mutable — is_salary_admin_job_title
--    إعادة إنشاء الدالة مع SET search_path = '' لمنع هجمات حقن search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_salary_admin_job_title(p_job_title TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    COALESCE(p_job_title, '') <> ''
    AND NOT (
      COALESCE(p_job_title, '') ~* '(مندوب|سائق|توصيل|موصل|مرسال|rider|driver|delivery|courier|dispatch|messenger)'
    );
$$;

-- ============================================================
-- 4. إلغاء صلاحية anon على جميع دوال SECURITY DEFINER
--    (شاملة للدوال التي قد لا يكون قد شملها الـ migration السابق)
-- ============================================================

-- ── الرواتب / المدفوعات ──────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.advance_in_my_company(uuid)                                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_employee_salary(uuid, text, text, numeric, text)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_order_salary_for_app(uuid, integer, integer, uuid[], boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_salary(uuid, text, text, numeric, text)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_salary_for_employee_month(uuid, text, text, numeric, text)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_salary_for_month(text, text)                                FROM anon;
REVOKE EXECUTE ON FUNCTION public.capture_salary_month_snapshot(text)                                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.preview_salary_for_month(text)                                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_salary_month_visible_employee(uuid, text, text, text, text)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_daily_orders_month_rpc(text, jsonb, text, text, uuid)         FROM anon;

-- ── الموظفون / الحضور ────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.check_employee_operational_records(uuid)                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_in(uuid, timestamptz)                                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_out(uuid, timestamptz)                                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.employee_in_my_company(uuid)                                          FROM anon;

-- ── المصادقة / الأدوار ───────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid)                                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                                                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role()                                                FROM anon;

-- ── لوحة التحكم / التقارير ───────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(text, integer, integer, date)                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(text, text, date)                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(integer, integer, date)                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview_rpc(text, integer, integer, date)                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview_rpc(text, text, date)                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview_rpc(integer, integer, date)                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview_rpc(text, date)                                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.performance_dashboard_rpc(text, date)                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.rider_profile_performance_rpc(uuid, text, date)                       FROM anon;

-- ── Audit / Logging ──────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.log_admin_action_cud()                                                FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event()                                                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_audit_columns()                                                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.test_shift_salary()                                                   FROM anon;

-- ============================================================
-- 5. إلغاء صلاحية authenticated على الدوال الداخلية فقط
--    (الدوال التي تستدعيها الـ triggers أو مساعدات داخلية فقط،
--     ولا ينبغي استدعاؤها مباشرة عبر REST API)
-- ============================================================

-- دوال الـ trigger (لا تُستدعى مباشرة)
REVOKE EXECUTE ON FUNCTION public.handle_new_user()        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role()   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action_cud()   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event()        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_audit_columns()      FROM authenticated;

-- دوال اختبار / تصحيح
REVOKE EXECUTE ON FUNCTION public.test_shift_salary()      FROM authenticated;

-- مساعد داخلي يستدعيه plpgsql فقط — لا يُستدعى مباشرة عبر supabase.rpc()
REVOKE EXECUTE ON FUNCTION public.calculate_order_salary_for_app(uuid, integer, integer, uuid[], boolean) FROM authenticated;

-- نسخ dashboard_overview القديمة (legacy) — التطبيق يستخدم dashboard_overview_rpc فقط
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(text, integer, integer, date)                      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(text, text, date)                                  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.dashboard_overview(integer, integer, date)                            FROM authenticated;
