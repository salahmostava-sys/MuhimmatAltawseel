# تطبيق Migration: إزالة company_id من Platform Accounts

## الخطوات المطلوبة:

### 1️⃣ تطبيق الـ Migration على قاعدة البيانات

**الطريقة الأولى: عبر Supabase Dashboard (موصى بها)**

1. افتح Supabase SQL Editor:
   👉 https://plxpehtkabmfkdlgjyin.supabase.co/project/_/sql/new

2. انسخ محتوى الملف التالي بالكامل:
   📄 `supabase/migrations/20260404000000_remove_company_id_from_platform_accounts.sql`

3. الصق المحتوى في SQL Editor

4. اضغط على زر "Run" أو Ctrl+Enter

5. تأكد من ظهور رسالة "Success" بدون أخطاء

**الطريقة الثانية: عبر Supabase CLI (إذا كان مثبتاً)**

```bash
cd d:\MuhimmatAltawseel
npx supabase db push
```

---

### 2️⃣ تحديث TypeScript Types

بعد تطبيق الـ migration بنجاح، قم بتحديث الـ types:

```bash
cd frontend
npm run gen:types
```

---

### 3️⃣ التحقق من النتيجة

تحقق من أن الجداول تم تحديثها بنجاح:

```sql
-- تحقق من أن company_id تم حذفه
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'platform_accounts' 
  AND column_name = 'company_id';

-- يجب أن تكون النتيجة فارغة (0 rows)
```

---

## ملخص التغييرات:

✅ حذف عمود `company_id` من جدول `platform_accounts`
✅ حذف عمود `company_id` من جدول `account_assignments`
✅ حذف الـ triggers والـ functions المرتبطة بـ company_id
✅ حذف الـ indexes والـ foreign keys
✅ تحديث RLS policies لتعمل بدون company_id
✅ تبسيط الصلاحيات بناءً على الأدوار فقط

---

## في حالة حدوث مشاكل:

إذا واجهت أي أخطاء، يمكنك:

1. التحقق من الـ error message في Supabase Dashboard
2. التأكد من عدم وجود بيانات تعتمد على company_id
3. مراجعة الـ migration السابقة: `20260328100000_single_org_platform_accounts_triggers_and_rls.sql`

---

## الخطوة التالية:

بعد تطبيق الـ migration وتحديث الـ types، قم بتشغيل التطبيق للتأكد من عمل كل شيء بشكل صحيح:

```bash
cd frontend
npm run dev
```

ثم اختبر صفحة Platform Accounts للتأكد من عمل جميع الوظائف.
