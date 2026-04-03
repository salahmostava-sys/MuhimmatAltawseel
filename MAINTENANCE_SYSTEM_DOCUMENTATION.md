# 🔧 نظام الصيانة وإدارة قطع الغيار

## نظرة عامة

نظام متكامل لإدارة صيانة المركبات وتتبع قطع الغيار مع تحديث تلقائي للمخزون.

---

## 📊 بنية قاعدة البيانات

### الجداول الرئيسية:

#### 1. `spare_parts` - مخزون قطع الغيار
```sql
- id (uuid)
- name_ar (text) - اسم القطعة بالعربية
- part_number (text) - رقم القطعة
- stock_quantity (numeric) - الكمية المتوفرة
- min_stock_alert (numeric) - حد التنبيه الأدنى
- unit (text) - الوحدة (قطعة، لتر، كجم...)
- unit_cost (numeric) - تكلفة الوحدة
- supplier (text) - المورد
- notes (text) - ملاحظات
- created_at, updated_at
```

#### 2. `maintenance_logs` - سجلات الصيانة
```sql
- id (uuid)
- vehicle_id (uuid) → vehicles
- employee_id (uuid) → employees (السائق الحالي)
- maintenance_date (date)
- type (text) - نوع الصيانة
- odometer_reading (integer) - قراءة العداد
- total_cost (numeric) - التكلفة الإجمالية (محسوبة تلقائياً)
- status (text) - الحالة
- notes (text)
- created_by (uuid)
- created_at, updated_at
```

#### 3. `maintenance_parts` - ربط القطع بالصيانة
```sql
- id (uuid)
- maintenance_log_id (uuid) → maintenance_logs
- part_id (uuid) → spare_parts
- quantity_used (numeric) - الكمية المستخدمة
- cost_at_time (numeric) - السعر وقت الاستخدام
- created_at
```

---

## ⚙️ الآليات التلقائية (Triggers)

### 1. تعبئة السائق تلقائياً
**Trigger:** `trg_fill_maintenance_employee`
**Function:** `fill_maintenance_employee()`

عند إضافة سجل صيانة جديد:
- إذا لم يتم تحديد `employee_id`
- يتم البحث عن السائق الحالي للمركبة من `vehicle_assignments`
- يتم تعبئة `employee_id` تلقائياً

```sql
-- يبحث عن آخر تعيين نشط (returned_at IS NULL)
SELECT va.employee_id 
FROM vehicle_assignments va
WHERE va.vehicle_id = NEW.vehicle_id
  AND va.returned_at IS NULL
ORDER BY va.created_at DESC
LIMIT 1;
```

---

### 2. خصم المخزون تلقائياً
**Trigger:** `trg_deduct_stock`
**Function:** `deduct_spare_part_stock()`

عند إضافة قطعة غيار لسجل صيانة:
- يتم خصم `quantity_used` من `stock_quantity`
- يتم تحديث `updated_at`
- إذا أصبح المخزون سالباً، يتم رفض العملية

```sql
UPDATE spare_parts
SET stock_quantity = stock_quantity - NEW.quantity_used,
    updated_at = now()
WHERE id = NEW.part_id;

-- التحقق من عدم وجود مخزون سالب
IF stock_quantity < 0 THEN
  RAISE EXCEPTION 'المخزون غير كافٍ للقطعة المطلوبة';
END IF;
```

---

### 3. استرجاع المخزون عند الحذف
**Trigger:** `trg_restore_stock`
**Function:** `restore_spare_part_stock()`

عند حذف قطعة من سجل صيانة:
- يتم إرجاع `quantity_used` إلى `stock_quantity`
- يتم تحديث `updated_at`

```sql
UPDATE spare_parts
SET stock_quantity = stock_quantity + OLD.quantity_used,
    updated_at = now()
WHERE id = OLD.part_id;
```

---

### 4. حساب التكلفة الإجمالية
**Trigger:** `trg_update_total_cost`
**Function:** `update_maintenance_total_cost()`

عند إضافة/تعديل/حذف قطع الصيانة:
- يتم حساب `total_cost` تلقائياً
- الصيغة: `SUM(quantity_used × cost_at_time)`

```sql
UPDATE maintenance_logs
SET total_cost = (
    SELECT COALESCE(SUM(quantity_used * cost_at_time), 0)
    FROM maintenance_parts
    WHERE maintenance_log_id = log_id
  ),
  updated_at = now()
WHERE id = log_id;
```

---

## 🎯 سير العمل (Workflow)

### إضافة سجل صيانة جديد:

```typescript
// 1. المستخدم يختار المركبة
const vehicleId = "xxx";

// 2. يتم جلب السائق الحالي تلقائياً (للعرض فقط)
const driverName = await getCurrentDriverNameForVehicle(vehicleId);

// 3. المستخدم يضيف قطع الغيار
const parts = [
  { part_id: "part-1", quantity_used: 2, cost_at_time: 50 },
  { part_id: "part-2", quantity_used: 1, cost_at_time: 100 }
];

// 4. حفظ السجل
await createMaintenanceLog(
  {
    vehicle_id: vehicleId,
    maintenance_date: "2024-01-15",
    type: "غيار زيت",
    odometer_reading: 50000,
    notes: "صيانة دورية"
  },
  parts
);

// ✅ يحدث تلقائياً:
// - يتم إنشاء maintenance_log
// - يتم ربط employee_id بالسائق الحالي
// - يتم إضافة السجلات في maintenance_parts
// - يتم خصم الكميات من spare_parts
// - يتم حساب total_cost = (2×50) + (1×100) = 200
```

---

## 🛡️ الحماية والتحقق

### 1. منع المخزون السالب
```typescript
// في AddMaintenanceModal.tsx
const stockWarning = (row: PartRow): string | null => {
  const sp = partById[row.part_id];
  const q = parseFloat(row.quantity_used) || 0;
  
  if (q > sp.stock_quantity) {
    return 'الكمية أكبر من المخزون المتاح';
  }
  return null;
};

// يتم منع الحفظ إذا كانت هناك تحذيرات
const blocked = rows.some(r => stockWarning(r));
```

### 2. منع حذف قطع مستخدمة
```typescript
// في maintenanceService.ts
async function deleteSparePart(id: string) {
  // التحقق من الاستخدام
  const { count } = await supabase
    .from('maintenance_parts')
    .select('*', { count: 'exact', head: true })
    .eq('part_id', id);
  
  if (count > 0) {
    throw new Error('لا يمكن حذف القطعة لأنها مستخدمة في سجلات صيانة.');
  }
  
  // الحذف آمن
  await supabase.from('spare_parts').delete().eq('id', id);
}
```

---

## 📱 الواجهة الأمامية

### المكونات الرئيسية:

#### 1. `MaintenancePage.tsx`
- صفحة رئيسية مع Tabs
- Tab 1: سجلات الصيانة
- Tab 2: قطع الغيار

#### 2. `AddMaintenanceModal.tsx`
- نموذج إضافة صيانة جديدة
- اختيار المركبة → عرض السائق الحالي
- إضافة قطع غيار متعددة
- التحقق من المخزون في الوقت الفعلي
- حساب التكلفة الإجمالية

#### 3. `MaintenanceLogsTab.tsx`
- عرض جميع سجلات الصيانة
- فلترة حسب المركبة/النوع/التاريخ
- عرض التفاصيل والقطع المستخدمة
- حذف السجلات (يسترجع المخزون تلقائياً)

#### 4. `SparePartsTab.tsx`
- عرض مخزون قطع الغيار
- إضافة/تعديل/حذف القطع
- تنبيهات المخزون المنخفض
- عرض الكمية المتوفرة

---

## 🔔 تنبيهات المخزون المنخفض

```typescript
// في maintenanceService.ts
async function getLowStockSpareParts() {
  const { data } = await supabase
    .from('spare_parts')
    .select('id, name_ar, stock_quantity, min_stock_alert, unit');
  
  // فلترة القطع التي stock_quantity < min_stock_alert
  return data.filter(r => 
    Number(r.stock_quantity) < Number(r.min_stock_alert)
  );
}
```

يتم عرض التنبيهات في:
- Dashboard الرئيسي
- صفحة الصيانة
- صفحة التنبيهات

---

## 📊 التقارير والإحصائيات

### 1. تكلفة الصيانة لكل مركبة
```sql
SELECT 
  v.plate_number,
  COUNT(ml.id) as maintenance_count,
  SUM(ml.total_cost) as total_cost
FROM maintenance_logs ml
JOIN vehicles v ON v.id = ml.vehicle_id
GROUP BY v.id, v.plate_number
ORDER BY total_cost DESC;
```

### 2. أكثر القطع استخداماً
```sql
SELECT 
  sp.name_ar,
  SUM(mp.quantity_used) as total_used,
  COUNT(DISTINCT mp.maintenance_log_id) as usage_count
FROM maintenance_parts mp
JOIN spare_parts sp ON sp.id = mp.part_id
GROUP BY sp.id, sp.name_ar
ORDER BY total_used DESC;
```

### 3. تكلفة الصيانة الشهرية
```sql
SELECT 
  DATE_TRUNC('month', maintenance_date) as month,
  COUNT(*) as maintenance_count,
  SUM(total_cost) as total_cost
FROM maintenance_logs
GROUP BY month
ORDER BY month DESC;
```

---

## 🔄 سيناريوهات الاستخدام

### سيناريو 1: صيانة دورية
```
1. فني الصيانة يفتح صفحة الصيانة
2. يضغط "إضافة صيانة"
3. يختار المركبة → يظهر اسم السائق تلقائياً
4. يختار نوع الصيانة: "غيار زيت"
5. يضيف القطع:
   - زيت محرك: 4 لتر × 25 ريال
   - فلتر زيت: 1 قطعة × 30 ريال
6. يضغط "حفظ"
7. ✅ يتم:
   - حفظ السجل
   - خصم 4 لتر من زيت المحرك
   - خصم 1 قطعة من فلتر الزيت
   - حساب التكلفة: 130 ريال
```

### سيناريو 2: تنبيه مخزون منخفض
```
1. النظام يفحص المخزون تلقائياً
2. يجد: فلتر هواء (متوفر: 3، الحد الأدنى: 5)
3. يظهر تنبيه في Dashboard
4. مدير المخزون يفتح صفحة قطع الغيار
5. يرى القطع المنخفضة مميزة بالأحمر
6. يطلب من المورد
7. عند الاستلام، يعدل الكمية المتوفرة
```

### سيناريو 3: حذف سجل صيانة خاطئ
```
1. المستخدم يحذف سجل صيانة
2. ✅ يتم تلقائياً:
   - حذف السجل من maintenance_logs
   - حذف القطع من maintenance_parts (CASCADE)
   - إرجاع الكميات إلى spare_parts
   - تحديث المخزون
```

---

## 🎨 الميزات المتقدمة

### 1. تتبع تاريخ الصيانة لكل مركبة
- عرض جميع سجلات الصيانة السابقة
- حساب متوسط التكلفة الشهرية
- تنبيهات الصيانة الدورية

### 2. تحليل استهلاك القطع
- أكثر القطع استخداماً
- معدل الاستهلاك الشهري
- توقع الاحتياج المستقبلي

### 3. إدارة الموردين
- تتبع الموردين لكل قطعة
- مقارنة الأسعار
- تقييم الموردين

---

## 🔐 الصلاحيات

### RLS Policies:
```sql
-- قراءة سجلات الصيانة
CREATE POLICY "maintenance_logs_select"
  ON maintenance_logs FOR SELECT
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'operations') OR
      has_role(auth.uid(), 'finance')
    )
  );

-- إضافة/تعديل سجلات الصيانة
CREATE POLICY "maintenance_logs_manage"
  ON maintenance_logs FOR ALL
  USING (
    is_active_user(auth.uid()) AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'operations')
    )
  );
```

---

## 📝 الملاحظات الفنية

### 1. استخدام Transactions
جميع العمليات تتم داخل transactions لضمان:
- إما تنفيذ كامل أو rollback كامل
- عدم حدوث تضارب في البيانات
- سلامة المخزون

### 2. Optimistic Locking
- يتم التحقق من المخزون قبل الحفظ
- يتم عرض تحذيرات في الوقت الفعلي
- منع race conditions

### 3. Audit Trail
- تتبع من أنشأ السجل (`created_by`)
- تتبع تواريخ الإنشاء والتعديل
- إمكانية استرجاع التاريخ الكامل

---

## 🚀 التحسينات المستقبلية

1. **جدولة الصيانة الدورية**
   - تنبيهات تلقائية حسب الكيلومترات
   - تنبيهات حسب الوقت (كل 3 أشهر)

2. **تكامل مع الموردين**
   - طلبات شراء تلقائية
   - تتبع الشحنات

3. **تطبيق موبايل للفنيين**
   - تسجيل الصيانة من الموقع
   - مسح QR code للمركبة

4. **تحليلات متقدمة**
   - AI لتوقع الأعطال
   - تحسين جدولة الصيانة

---

تم! 🎉 النظام جاهز ويعمل بكفاءة عالية.
