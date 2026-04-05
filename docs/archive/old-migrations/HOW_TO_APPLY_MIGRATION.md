# تطبيق Migration - إزالة company_id

## الخطوات:

### 1. افتح Supabase SQL Editor
👉 https://plxpehtkabmfkdlgjyin.supabase.co/project/_/sql/new

### 2. انسخ محتوى الملف التالي بالكامل:
📄 `supabase/APPLY_THIS_MIGRATION.sql`

### 3. الصق في SQL Editor واضغط "Run"

### 4. بعد النجاح، قم بتحديث Types:
```bash
cd frontend
npm run gen:types
```

### 5. اختبر التطبيق:
```bash
npm run dev
```

---

## ملاحظة مهمة:
❌ لا تنسخ من `MIGRATION_GUIDE.md` (يحتوي على Markdown)
✅ انسخ من `APPLY_THIS_MIGRATION.sql` (SQL نقي فقط)

---

تم! 🎉
