# نظام الدوام والمنصات المختلطة - دليل التشغيل

## 📋 نظرة عامة

تم تطوير النظام ليدعم 3 أنواع من المنصات:

### 1️⃣ منصات الطلبات (Orders)
- **الوصف**: الراتب يُحسب بناءً على عدد الطلبات المنجزة
- **مثال**: هنقرستيشن، جاهز، طلبات
- **الحساب**: عدد الطلبات × سعر الطلب (حسب قواعد التسعير)

### 2️⃣ منصات الدوام (Shift)
- **الوصف**: الراتب يُحسب بناءً على ساعات العمل
- **مثال**: منصات توصيل بنظام الدوام الثابت
- **الحساب**: عدد الساعات × سعر الساعة

### 3️⃣ منصات مختلطة (Hybrid)
- **الوصف**: نظام ذكي يجمع بين الدوام والطلبات (مثل نينجا)
- **الحساب**:
  - إذا وصل الموظف للحد الأدنى من الساعات → يحصل على راتب الدوام الثابت
  - إذا لم يصل → يُحسب بناءً على الطلبات (إذا كان مفعّل)
  - إذا لم يصل ولا يوجد طلبات → لا راتب

---

## 🗄️ الجداول الجديدة

### `daily_shifts`
تسجيل ساعات العمل اليومية للموظفين

```sql
CREATE TABLE daily_shifts (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  app_id UUID REFERENCES apps(id),
  date DATE NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**الأعمدة**:
- `employee_id`: معرف الموظف
- `app_id`: معرف المنصة
- `date`: تاريخ الدوام
- `hours_worked`: عدد الساعات المعملة (مثال: 8.5 ساعة)
- `notes`: ملاحظات اختيارية

### `app_hybrid_rules`
قواعد المنصات المختلطة

```sql
CREATE TABLE app_hybrid_rules (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id) UNIQUE,
  min_hours_for_shift NUMERIC(5,2) NOT NULL,
  shift_rate NUMERIC(10,2) NOT NULL,
  fallback_to_orders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**الأعمدة**:
- `app_id`: معرف المنصة
- `min_hours_for_shift`: الحد الأدنى من الساعات للحصول على راتب الدوام (مثال: 160 ساعة)
- `shift_rate`: قيمة راتب الدوام الثابت (مثال: 3000 ريال)
- `fallback_to_orders`: هل يُحسب بناءً على الطلبات إذا لم يصل للحد الأدنى؟

### تحديث جدول `apps`
إضافة عمود `work_type`

```sql
ALTER TABLE apps ADD COLUMN work_type TEXT DEFAULT 'orders' 
  CHECK (work_type IN ('orders', 'shift', 'hybrid'));
```

---

## ⚙️ محرك الرواتب المحدث

### الدالة: `calculate_salary_for_employee_month`

تم تحديث الدالة لدعم الأنواع الثلاثة:

#### منطق الحساب:

```
FOR كل منصة نشطة للموظف:
  
  IF work_type = 'orders':
    ✓ جلب إجمالي الطلبات من daily_orders
    ✓ تطبيق قواعد التسعير (pricing_rules)
    ✓ حساب الأرباح = عدد الطلبات × السعر
  
  ELSE IF work_type = 'shift':
    ✓ جلب إجمالي الساعات من daily_shifts
    ✓ جلب سعر الساعة من pricing_rules (rule_type = 'shift')
    ✓ حساب الأرباح = عدد الساعات × سعر الساعة
  
  ELSE IF work_type = 'hybrid':
    ✓ جلب إجمالي الساعات من daily_shifts
    ✓ جلب قواعد المنصة من app_hybrid_rules
    
    IF الساعات >= min_hours_for_shift:
      → الأرباح = shift_rate (راتب ثابت)
    ELSE:
      IF fallback_to_orders = true:
        → جلب الطلبات وحساب بناءً عليها
      ELSE:
        → الأرباح = 0

النتيجة النهائية:
  base_salary (من الدرجة الوظيفية)
  + orders_earnings (من الطلبات)
  + shifts_earnings (من الدوام)
  - deductions (الخصومات والسلف)
  = net_salary (الراتب الصافي)
```

---

## 🖥️ الواجهة الأمامية

### 1. صفحة إعدادات المنصات
**المسار**: `/apps/settings`

**الوظائف**:
- عرض جميع المنصات مع نوع العمل الحالي
- تغيير نوع المنصة (orders / shift / hybrid)
- إعداد قواعد المنصات المختلطة:
  - الحد الأدنى من الساعات
  - قيمة راتب الدوام
  - تفعيل/تعطيل الاحتساب بالطلبات

### 2. تبويب الدوام في صفحة الطلبات
**المسار**: `/orders` → تبويب "الدوام"

**الوظائف**:
- عرض سجلات الدوام اليومية
- إضافة/تعديل/حذف ساعات العمل
- فلترة حسب الموظف والمنصة والتاريخ
- استيراد من Excel
- تصدير إلى Excel

### 3. مكونات الواجهة

#### `ShiftsTab.tsx`
عرض وإدارة سجلات الدوام

#### `ShiftsTabWrapper.tsx`
ربط البيانات والخدمات

#### `AppWorkTypeSettings.tsx`
إعدادات نوع العمل للمنصة

#### `AppSettingsPage.tsx`
صفحة قائمة المنصات

---

## 🔐 الأمان (RLS Policies)

### سياسات `daily_shifts`

```sql
-- القراءة: المستخدمون النشطون فقط
CREATE POLICY "Active users can view shifts"
  ON daily_shifts FOR SELECT
  USING (is_active_user(auth.uid()));

-- الإضافة: المستخدمون النشطون فقط
CREATE POLICY "Active users can insert shifts"
  ON daily_shifts FOR INSERT
  WITH CHECK (is_active_user(auth.uid()));

-- التعديل: المستخدمون النشطون فقط
CREATE POLICY "Active users can update shifts"
  ON daily_shifts FOR UPDATE
  USING (is_active_user(auth.uid()));

-- الحذف: المستخدمون النشطون فقط
CREATE POLICY "Active users can delete shifts"
  ON daily_shifts FOR DELETE
  USING (is_active_user(auth.uid()));
```

### سياسات `app_hybrid_rules`

```sql
-- القراءة: الجميع
CREATE POLICY "Anyone can view hybrid rules"
  ON app_hybrid_rules FOR SELECT
  USING (true);

-- التعديل: المستخدمون النشطون فقط
CREATE POLICY "Active users can manage hybrid rules"
  ON app_hybrid_rules FOR ALL
  USING (is_active_user(auth.uid()));
```

---

## 📊 أمثلة عملية

### مثال 1: منصة طلبات (هنقرستيشن)
```
work_type = 'orders'
الموظف أنجز 500 طلب في الشهر
قاعدة التسعير: 2 ريال للطلب
الراتب = 500 × 2 = 1000 ريال
```

### مثال 2: منصة دوام
```
work_type = 'shift'
الموظف عمل 180 ساعة في الشهر
سعر الساعة: 15 ريال
الراتب = 180 × 15 = 2700 ريال
```

### مثال 3: منصة مختلطة (نينجا)
```
work_type = 'hybrid'
min_hours_for_shift = 160 ساعة
shift_rate = 3000 ريال
fallback_to_orders = true

السيناريو أ: الموظف عمل 170 ساعة
  → وصل للحد الأدنى
  → الراتب = 3000 ريال (ثابت)

السيناريو ب: الموظف عمل 120 ساعة + 300 طلب
  → لم يصل للحد الأدنى
  → يُحسب بناءً على الطلبات
  → الراتب = 300 × 2 = 600 ريال

السيناريو ج: الموظف عمل 100 ساعة + 0 طلب
  → لم يصل للحد الأدنى
  → لا طلبات
  → الراتب = 0 ريال
```

---

## 🚀 خطوات التفعيل

### 1. تطبيق الـ Migrations

```bash
# في مجلد supabase
supabase db push
```

أو يدوياً عبر Supabase Dashboard → SQL Editor:
1. تنفيذ `20260405000000_add_shifts_and_hybrid_work_types.sql`
2. تنفيذ `20260403000000_update_salary_engine_for_shifts.sql` (محرك الرواتب المحدث)

### 2. التحقق من الجداول

```sql
-- التحقق من وجود الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('daily_shifts', 'app_hybrid_rules');

-- التحقق من عمود work_type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'apps' AND column_name = 'work_type';
```

### 3. إعداد منصة مختلطة (مثال: نينجا)

```sql
-- تحديث نوع المنصة
UPDATE apps 
SET work_type = 'hybrid' 
WHERE name = 'نينجا';

-- إضافة قواعد المنصة المختلطة
INSERT INTO app_hybrid_rules (app_id, min_hours_for_shift, shift_rate, fallback_to_orders)
VALUES (
  (SELECT id FROM apps WHERE name = 'نينجا'),
  160,  -- 160 ساعة كحد أدنى
  3000, -- 3000 ريال راتب ثابت
  true  -- احسب بالطلبات إذا لم يصل
);
```

### 4. إدخال بيانات دوام تجريبية

```sql
INSERT INTO daily_shifts (employee_id, app_id, date, hours_worked, notes)
VALUES (
  (SELECT id FROM employees WHERE name = 'أحمد محمد' LIMIT 1),
  (SELECT id FROM apps WHERE name = 'نينجا' LIMIT 1),
  '2025-01-15',
  8.5,
  'دوام عادي'
);
```

### 5. اختبار محرك الرواتب

```sql
-- حساب راتب موظف لشهر معين
SELECT * FROM calculate_salary_for_employee_month(
  '<employee_id>'::uuid,
  '2025-01',
  'cash',
  0,
  NULL
);

-- التحقق من النتائج
-- total_orders: إجمالي الطلبات (للمنصات orders)
-- total_shift_days: أيام الدوام (للمنصات shift/hybrid)
-- base_salary: الراتب الإجمالي من جميع المنصات
-- net_salary: الراتب الصافي بعد الخصومات
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: الرواتب تظهر 0 للمنصات المختلطة أو الدوام

**الحل**:
1. تأكد من وجود سجلات في `daily_shifts`
2. تأكد من وجود قواعد في `app_hybrid_rules`
3. تحقق من `work_type` في جدول `apps`
4. تأكد من تطبيق Migration الجديد للمحرك (`20260403000000_update_salary_engine_for_shifts.sql`)

```sql
-- فحص البيانات
SELECT 
  e.name as employee,
  a.name as app,
  a.work_type,
  COUNT(ds.id) as shift_records,
  SUM(ds.hours_worked) as total_hours
FROM employees e
JOIN daily_shifts ds ON ds.employee_id = e.id
JOIN apps a ON a.id = ds.app_id
WHERE ds.date >= '2025-01-01' AND ds.date <= '2025-01-31'
GROUP BY e.name, a.name, a.work_type;
```

### المشكلة: خطأ في دالة calculate_salary_for_employee_month

**الحل**:
تأكد من وجود الدالة المحدثة:

```sql
-- التحقق من وجود الدالة
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'calculate_salary_for_employee_month';

-- إذا لم تكن موجودة، طبق Migration المحرك
-- supabase db push أو نفذ الملف يدوياً
```

### المشكلة: خطأ في RLS Policies

**الحل**:
تأكد من وجود دالة `is_active_user`:

```sql
CREATE OR REPLACE FUNCTION public.is_active_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND is_active = true
  );
$$;
```

### المشكلة: لا تظهر تبويب الدوام

**الحل**:
تأكد من إضافة التبويب في `OrdersPage.tsx`:

```typescript
const ORDER_TABS = [
  { key: 'spreadsheet', label: 'جدول الطلبات' },
  { key: 'shifts', label: 'الدوام' }, // ← تأكد من وجود هذا السطر
] as const;
```

---

## 📝 ملاحظات مهمة

1. **التوافق مع الأنظمة القديمة**: المنصات التي لا تحتوي على `work_type` ستُعامل كـ `orders` افتراضياً
2. **الأداء**: الدالة محسّنة للأداء باستخدام indexes على `employee_id`, `app_id`, `date`
3. **التدقيق**: جميع العمليات مسجلة في `audit_log`
4. **الأمان**: جميع الجداول محمية بـ RLS policies

---

## 🔄 التحديثات المستقبلية

- [ ] دعم أنواع دوام متعددة (صباحي/مسائي/ليلي)
- [ ] حساب الإضافي (overtime) تلقائياً
- [ ] تقارير تحليلية للدوام
- [ ] تكامل مع أنظمة البصمة
- [ ] إشعارات تلقائية عند عدم الوصول للحد الأدنى

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، تواصل مع فريق التطوير.

**آخر تحديث**: يناير 2025
**الإصدار**: 2.0.0
