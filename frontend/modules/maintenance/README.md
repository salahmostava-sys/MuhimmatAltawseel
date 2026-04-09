# وحدة الصيانة والمخزون — Maintenance Module

## نظرة عامة

وحدة إدارة صيانة المركبات وقطع الغيار. تتيح تسجيل عمليات الصيانة، تتبع المخزون، والخصم التلقائي للقطع المستخدمة.

**المسار:** `/maintenance`
**التبويبات:** سجل الصيانة | المخزون وقطع الغيار

---

## الجداول المستخدمة

### `spare_parts` — قطع الغيار

| العمود | النوع | الوصف |
|---|---|---|
| `id` | UUID | المعرّف |
| `name_ar` | TEXT | اسم القطعة بالعربي |
| `part_number` | TEXT | رقم القطعة (اختياري) |
| `stock_quantity` | INTEGER | الكمية المتوفرة |
| `min_stock_alert` | INTEGER | حد التنبيه (الحد الأدنى) |
| `unit` | TEXT | وحدة القياس (افتراضي: `'قطعة'`) |
| `unit_cost` | NUMERIC | تكلفة الوحدة |
| `supplier` | TEXT | المورّد |
| `notes` | TEXT | ملاحظات |

عند انخفاض `stock_quantity` تحت `min_stock_alert`، يظهر تنبيه في صفحة التنبيهات.

---

### `maintenance_logs` — سجل الصيانة

| العمود | النوع | الوصف |
|---|---|---|
| `id` | UUID | المعرّف |
| `vehicle_id` | UUID → `vehicles` | المركبة |
| `employee_id` | UUID → `employees` | السائق (يتم تعيينه تلقائياً) |
| `maintenance_date` | DATE | تاريخ الصيانة |
| `type` | TEXT | نوع الصيانة (انظر الأنواع أدناه) |
| `odometer_reading` | INTEGER | قراءة العداد |
| `total_cost` | NUMERIC | التكلفة الإجمالية (تُحسب تلقائياً) |
| `status` | TEXT | الحالة: `مكتملة` / `جارية` / `ملغاة` |
| `notes` | TEXT | ملاحظات |
| `created_by` | UUID | المستخدم الذي أنشأ السجل |

**أنواع الصيانة المتاحة:**

| القيمة | الوصف |
|---|---|
| `غيار زيت` | تغيير الزيت |
| `صيانة دورية` | صيانة دورية شاملة |
| `إطارات` | تغيير أو إصلاح الإطارات |
| `بطارية` | استبدال البطارية |
| `فرامل` | إصلاح الفرامل |
| `أعطال` | إصلاح أعطال طارئة |
| `أخرى` | أنواع أخرى |

---

### `maintenance_parts` — القطع المستخدمة في الصيانة

| العمود | النوع | الوصف |
|---|---|---|
| `id` | UUID | المعرّف |
| `maintenance_log_id` | UUID → `maintenance_logs` | سجل الصيانة |
| `spare_part_id` | UUID → `spare_parts` | القطعة |
| `quantity_used` | INTEGER | الكمية المستخدمة |
| `cost_at_time` | NUMERIC | تكلفة الوحدة وقت الاستخدام |

---

## التعيين التلقائي للسائق (Auto-Assign)

عند إنشاء سجل صيانة **بدون تحديد** `employee_id`، يقوم trigger في قاعدة البيانات بتعيين السائق تلقائياً:

```
Trigger: fill_maintenance_employee
BEFORE INSERT ON maintenance_logs
```

**الآلية:**

1. يبحث في جدول `vehicle_assignments` عن آخر تعيين مفتوح (غير مُرجَع) لنفس المركبة
2. يأخذ التعيين الأحدث (`ORDER BY created_at DESC LIMIT 1`)
3. الشرط: `returned_at IS NULL` (التعيين لا يزال فعّالاً)
4. يضع `employee_id` من التعيين في سجل الصيانة

```sql
SELECT va.employee_id INTO v_emp_id
FROM public.vehicle_assignments va
WHERE va.vehicle_id = NEW.vehicle_id
  AND va.returned_at IS NULL
ORDER BY va.created_at DESC
LIMIT 1;
```

> إذا لم يُعثَر على تعيين مفتوح، يبقى `employee_id = NULL`.

---

## خصم المخزون التلقائي (Auto Stock Deduction)

عند إضافة قطع مستخدمة في سجل صيانة، يتم خصم الكمية تلقائياً من المخزون.

### عند الإضافة

```
Trigger: deduct_spare_part_stock
AFTER INSERT ON maintenance_parts
```

- يخصم `quantity_used` من `spare_parts.stock_quantity`
- إذا أصبح المخزون **أقل من صفر** → يرمي خطأ:
  > `الكمية المطلوبة (X) أكبر من المخزون المتاح (Y) للقطعة Z`

### عند الحذف

```
Trigger: restore_spare_part_stock
AFTER DELETE ON maintenance_parts
```

- يعيد `quantity_used` إلى `spare_parts.stock_quantity`

### حساب التكلفة الإجمالية

```
Trigger: update_maintenance_total_cost
AFTER INSERT/UPDATE/DELETE ON maintenance_parts
```

- يحسب `SUM(quantity_used * cost_at_time)` لكل القطع المرتبطة بسجل الصيانة
- يحدّث `maintenance_logs.total_cost` تلقائياً

---

## كيف تضيف نوع صيانة جديد

### 1. أضف القيمة في قيد قاعدة البيانات

أنشئ migration جديد:

```bash
supabase migration new add_maintenance_type_xxx
```

```sql
ALTER TABLE public.maintenance_logs
  DROP CONSTRAINT IF EXISTS maintenance_logs_type_check;

ALTER TABLE public.maintenance_logs
  ADD CONSTRAINT maintenance_logs_type_check
  CHECK (type IN (
    'غيار زيت', 'صيانة دورية', 'إطارات', 'بطارية',
    'فرامل', 'أعطال', 'أخرى',
    'النوع_الجديد'    -- ← أضف هنا
  ));
```

طبّق:

```bash
supabase db push
```

### 2. أضف الخيار في الـ Frontend

في `frontend/modules/maintenance/components/AddMaintenanceModal.tsx`، أضف القيمة الجديدة في قائمة أنواع الصيانة:

```tsx
const MAINTENANCE_TYPES = [
  'غيار زيت',
  'صيانة دورية',
  'إطارات',
  'بطارية',
  'فرامل',
  'أعطال',
  'أخرى',
  'النوع_الجديد',  // ← أضف هنا
];
```

---

## هيكل الملفات

```
frontend/modules/maintenance/
├── pages/
│   └── MaintenancePage.tsx          ← الصفحة الرئيسية (تبويبات)
├── components/
│   ├── MaintenanceLogsTab.tsx       ← تبويب سجل الصيانة
│   ├── SparePartsTab.tsx            ← تبويب المخزون وقطع الغيار
│   └── AddMaintenanceModal.tsx      ← نافذة إضافة صيانة
└── index.ts                         ← barrel export
```

**الخدمات والـ Hooks:**

```
frontend/services/maintenanceService.ts       ← CRUD للصيانة والمخزون
frontend/shared/hooks/useMaintenanceData.ts   ← useMaintenanceLogs + useSpareParts
```

---

## ملاحظات

- جدول `spare_parts` لم يُنشأ بعد في بيئة الإنتاج — صفحة التنبيهات تتعامل مع غيابه بصمت (ترجع بيانات فارغة)
- الـ RLS يسمح بالقراءة لأي مستخدم نشط، والتعديل للـ `admin` و `operations` فقط
- عند حذف سجل صيانة، يتم إرجاع القطع للمخزون تلقائياً عبر trigger
