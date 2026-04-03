# 🚀 تطبيق Migration: إزالة company_id من Platform Accounts

## ⚡ الطريقة السريعة (موصى بها)

### 1. افتح Supabase SQL Editor
👉 https://plxpehtkabmfkdlgjyin.supabase.co/project/_/sql/new

### 2. انسخ والصق الكود التالي:

```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS trg_sync_platform_accounts_company_id ON public.platform_accounts;
DROP TRIGGER IF EXISTS trg_sync_account_assignments_company_id ON public.account_assignments;

-- Drop functions
DROP FUNCTION IF EXISTS public.sync_platform_accounts_company_id();
DROP FUNCTION IF EXISTS public.sync_account_assignments_company_id();
DROP FUNCTION IF EXISTS public.platform_account_in_my_company(uuid);
DROP FUNCTION IF EXISTS public.assignment_in_my_company(uuid);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Platform accounts: select own company" ON public.platform_accounts;
DROP POLICY IF EXISTS "Platform accounts: manage own company" ON public.platform_accounts;
DROP POLICY IF EXISTS "Account assignments: select own company" ON public.account_assignments;
DROP POLICY IF EXISTS "Account assignments: insert own company" ON public.account_assignments;
DROP POLICY IF EXISTS "Account assignments: update own company" ON public.account_assignments;

-- Drop indexes
DROP INDEX IF EXISTS idx_platform_accounts_company_id;
DROP INDEX IF EXISTS idx_account_assignments_company_id;

-- Drop foreign key constraints
ALTER TABLE public.platform_accounts DROP CONSTRAINT IF EXISTS platform_accounts_company_id_fkey;
ALTER TABLE public.account_assignments DROP CONSTRAINT IF EXISTS account_assignments_company_id_fkey;

-- Drop columns
ALTER TABLE public.platform_accounts DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.account_assignments DROP COLUMN IF EXISTS company_id;

-- Recreate simple RLS policies without company_id
CREATE POLICY "platform_accounts_select"
  ON public.platform_accounts FOR SELECT
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)    OR
      has_role(auth.uid(), 'operations'::app_role) OR
      has_role(auth.uid(), 'finance'::app_role)
    )
  );

CREATE POLICY "platform_accounts_manage"
  ON public.platform_accounts FOR ALL
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)
    )
  )
  WITH CHECK (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)
    )
  );

CREATE POLICY "account_assignments_select"
  ON public.account_assignments FOR SELECT
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)    OR
      has_role(auth.uid(), 'operations'::app_role) OR
      has_role(auth.uid(), 'finance'::app_role)
    )
  );

CREATE POLICY "account_assignments_insert_update"
  ON public.account_assignments FOR INSERT
  WITH CHECK (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)
    )
  );

CREATE POLICY "account_assignments_update_only"
  ON public.account_assignments FOR UPDATE
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'hr'::app_role)
    )
  );
```

### 3. اضغط "Run" أو Ctrl+Enter

### 4. تحديث TypeScript Types

```bash
cd frontend
npm run gen:types
```

### 5. اختبار التطبيق

```bash
npm run dev
```

---

## ✅ ما تم تنفيذه

- ✅ حذف `company_id` column من `platform_accounts`
- ✅ حذف `company_id` column من `account_assignments`
- ✅ حذف جميع الـ triggers والـ functions المرتبطة
- ✅ حذف الـ indexes والـ foreign keys
- ✅ تحديث RLS policies لتعمل بدون company_id
- ✅ تبسيط الصلاحيات بناءً على الأدوار فقط

---

## 📝 ملاحظات

- الـ migration آمن ويستخدم `IF EXISTS` لتجنب الأخطاء
- جميع الـ policies الجديدة تعتمد على `is_active_user()` و `has_role()`
- لا حاجة لـ company_id بعد الآن في single-tenant architecture

---

## 🔍 التحقق من النجاح

بعد تطبيق الـ migration، تحقق من:

```sql
-- يجب أن تكون النتيجة فارغة
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('platform_accounts', 'account_assignments')
  AND column_name = 'company_id';
```

---

تم! 🎉
