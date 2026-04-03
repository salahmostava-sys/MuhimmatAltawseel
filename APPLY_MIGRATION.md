# ✅ تطبيق Migration - إزالة company_id من Platform Accounts

## 📋 الخطوات المطلوبة

### الخطوة 1: تطبيق SQL Migration

افتح Supabase SQL Editor وانسخ الكود التالي:

**🔗 رابط SQL Editor:**
https://plxpehtkabmfkdlgjyin.supabase.co/project/_/sql/new

**📄 الملف المطلوب:**
`supabase/migrations/20260404000000_remove_company_id_from_platform_accounts.sql`

---

### الخطوة 2: تحديث TypeScript Types

بعد تطبيق الـ migration بنجاح:

```bash
cd frontend
npm run gen:types
```

---

### الخطوة 3: اختبار التطبيق

```bash
cd frontend
npm run dev
```

ثم افتح صفحة Platform Accounts وتأكد من عمل جميع الوظائف.

---

## ✨ ملخص التغييرات

- ✅ حذف `company_id` من `platform_accounts`
- ✅ حذف `company_id` من `account_assignments`
- ✅ تحديث RLS policies
- ✅ حذف triggers و functions القديمة

---

## 🚨 ملاحظة مهمة

يجب تطبيق الـ migration عبر Supabase Dashboard لأن:
- لا يوجد Supabase CLI مثبت محلياً
- الـ anon key لا يملك صلاحيات تنفيذ DDL statements
- يتطلب service_role key أو تطبيق يدوي

---

## 📞 في حالة المشاكل

إذا واجهت أي أخطاء:
1. تحقق من الـ error message
2. تأكد من عدم وجود بيانات تعتمد على company_id
3. راجع الـ migration السابقة
