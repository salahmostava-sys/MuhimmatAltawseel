# نظام الدوام والمنصات المختلطة

## نظرة عامة

تم إضافة نظام شامل لدعم 3 أنواع من المنصات:
1. **منصات الطلبات** (orders): حساب الراتب بناءً على عدد الطلبات
2. **منصات الدوام** (shift): حساب الراتب بناءً على ساعات العمل
3. **منصات مختلطة** (hybrid): حساب ذكي يعتمد على تحقيق شروط الدوام أو التحويل للطلبات

---

## التعديلات على قاعدة البيانات

### 1. إضافة حقل `work_type` في جدول `apps`

```sql
ALTER TABLE apps ADD COLUMN work_type TEXT DEFAULT 'orders' 
  CHECK (work_type IN ('orders', 'shift', 'hybrid'));
```

**القيم الممكنة:**
- `orders`: منصات الطلبات (هنقرستيشن، جاهز، مرسول)
- `shift`: منصات الدوام
- `hybrid`: منصات مختلطة (نينجا)

### 2. جدول `daily_shifts` - تسجيل ساعات الدوام

```sql
CREATE TABLE daily_shifts (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  app_id UUID REFERENCES apps(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(employee_id, app_id, date)
);
```

**الحقول:**
- `hours_worked`: عدد ساعات العمل (0-24)
- `notes`: ملاحظات اختيارية
- Unique constraint: موظف واحد + منصة واحدة + تاريخ واحد

### 3. جدول `app_hybrid_rules` - قواعد المنصات المختلطة

```sql
CREATE TABLE app_hybrid_rules (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id) UNIQUE,
  min_hours_for_shift DECIMAL(4,2) NOT NULL,
  shift_rate DECIMAL(10,2) NOT NULL,
  fallback_to_orders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**الحقول:**
- `min_hours_for_shift`: الحد الأدنى من الساعات لاحتساب الدوام (مثلاً 11 ساعة)
- `shift_rate`: سعر الدوام اليومي بالريال (مثلاً 150 ريال)
- `fallback_to_orders`: التحويل لحساب الطلبات عند عدم تحقيق الساعات

### 4. منع التداخل بين الطلبات والدوام

تم إضافة Triggers لمنع تسجيل طلبات ودوام في نفس اليوم لنفس الموظف والمنصة:

```sql
CREATE TRIGGER prevent_orders_shifts_overlap_on_orders
  BEFORE INSERT OR UPDATE ON daily_orders
  FOR EACH ROW EXECUTE FUNCTION check_no_overlap_orders_shifts();

CREATE TRIGGER prevent_orders_shifts_overlap_on_shifts
  BEFORE INSERT OR UPDATE ON daily_shifts
  FOR EACH ROW EXECUTE FUNCTION check_no_overlap_orders_shifts();
```

---

## الملفات الجديدة

### Frontend

#### Types
- `frontend/shared/types/shifts.ts` - أنواع TypeScript للدوام والمنصات المختلطة

#### Services
- `frontend/services/shiftService.ts` - خدمة التعامل مع بيانات الدوام
- `frontend/services/hybridRuleService.ts` - خدمة قواعد المنصات المختلطة

#### Components
- `frontend/modules/settings/components/AppWorkTypeSettings.tsx` - إعدادات نوع العمل للمنصة
- `frontend/modules/orders/components/ShiftsTab.tsx` - تبويب الدوام في صفحة الطلبات

### Database
- `supabase/migrations/20260405000000_add_shifts_and_hybrid_work_types.sql` - Migration كامل

---

## كيفية الاستخدام

### 1. إعداد منصة طلبات (مثل هنقرستيشن)

```typescript
// في صفحة إعدادات المنصات
await appService.update(appId, {
  ...appData,
  work_type: 'orders'
});
```

**النتيجة:** يتم حساب الراتب بناءً على عدد الطلبات فقط.

### 2. إعداد منصة دوام

```typescript
await appService.update(appId, {
  ...appData,
  work_type: 'shift'
});
```

**النتيجة:** يتم حساب الراتب بناءً على عدد أيام الدوام وساعات العمل.

### 3. إعداد منصة مختلطة (مثل نينجا)

```typescript
// تحديث نوع المنصة
await appService.update(appId, {
  ...appData,
  work_type: 'hybrid'
});

// إضافة قواعد الدوام المختلط
await hybridRuleService.upsert({
  app_id: appId,
  min_hours_for_shift: 11,      // 11 ساعة كحد أدنى
  shift_rate: 150,               // 150 ريال لليوم
  fallback_to_orders: true       // التحويل للطلبات عند عدم التحقيق
});
```

**النتيجة:** 
- إذا حقق الموظف 11 ساعة أو أكثر → يحاسب 150 ريال (دوام)
- إذا لم يحقق 11 ساعة → يحاسب بعدد الطلبات

---

## أمثلة عملية

### مثال 1: موظف على منصة طلبات (هنقرستيشن)

```
اليوم 1: 20 طلب
اليوم 2: 15 طلب
اليوم 3: 25 طلب
───────────────────
الإجمالي: 60 طلب × 2 ريال = 120 ريال
```

### مثال 2: موظف على منصة دوام

```
اليوم 1: 11 ساعة ✓
اليوم 2: 10 ساعة ✗ (لا يحتسب)
اليوم 3: 12 ساعة ✓
───────────────────
الإجمالي: 2 يوم × 150 ريال = 300 ريال
```

### مثال 3: موظف على منصة مختلطة (نينجا)

```
اليوم 1: 11 ساعة → 150 ريال (دوام)
اليوم 2: 9 ساعات + 20 طلب → 40 ريال (طلبات)
اليوم 3: 12 ساعة → 150 ريال (دوام)
───────────────────
الإجمالي: 340 ريال
```

---

## منطق الحساب في محرك الرواتب

### منصات الطلبات

```typescript
const ordersCount = await orderService.getTotalByEmployee(employeeId, appId, monthYear);
const salary = ordersCount * pricePerOrder;
```

### منصات الدوام

```typescript
const shifts = await shiftService.getMonthRaw(year, month);
const validShifts = shifts.filter(s => 
  s.employee_id === employeeId && 
  s.app_id === appId && 
  s.hours_worked >= minHours
);
const salary = validShifts.length * dailyShiftRate;
```

### منصات مختلطة

```typescript
const hybridRule = await hybridRuleService.getByAppId(appId);
const shifts = await shiftService.getMonthRaw(year, month);
const orders = await orderService.getMonthRaw(year, month);

let salary = 0;
for (const day of daysInMonth) {
  const shift = shifts.find(s => s.date === day && s.employee_id === employeeId);
  const dayOrders = orders.find(o => o.date === day && o.employee_id === employeeId);
  
  if (shift && shift.hours_worked >= hybridRule.min_hours_for_shift) {
    // حقق الساعات → دوام
    salary += hybridRule.shift_rate;
  } else if (dayOrders && hybridRule.fallback_to_orders) {
    // لم يحقق الساعات → طلبات
    salary += dayOrders.orders_count * pricePerOrder;
  }
}
```

---

## الخطوات التالية للتنفيذ الكامل

### ✅ تم إنجازه:
1. Migration قاعدة البيانات
2. Types و Services
3. مكونات الواجهة الأساسية

### 🔄 يحتاج إلى إكمال:
1. **دمج ShiftsTab في صفحة الطلبات**
   - إضافة تبويب "الدوام" بجانب "الطلبات"
   - ربط البيانات مع الـ hooks

2. **تحديث محرك الرواتب**
   - إضافة منطق حساب الدوام
   - إضافة منطق المنصات المختلطة
   - تحديث تقارير الرواتب

3. **إضافة AppWorkTypeSettings في صفحة المنصات**
   - عرض إعدادات نوع العمل لكل منصة
   - واجهة تعديل القواعد المختلطة

4. **تحديث التقارير والإحصائيات**
   - فصل تقارير الطلبات عن الدوام
   - إضافة مؤشرات أداء للدوام

5. **تطبيق Migration على قاعدة البيانات**
   ```bash
   supabase db push
   ```

6. **إعادة توليد Types**
   ```bash
   cd frontend
   npm run gen:types
   ```

---

## ملاحظات مهمة

⚠️ **منع التداخل:** لا يمكن للموظف تسجيل طلبات ودوام في نفس اليوم على نفس المنصة

✅ **المرونة:** كل منصة يمكن أن يكون لها نظام حساب مختلف

📊 **التقارير:** يجب فصل تقارير الطلبات عن تقارير الدوام للوضوح

🔒 **الأمان:** RLS مفعّل على جميع الجداول الجديدة

---

## الدعم والصيانة

للإضافات المستقبلية:
- يمكن إضافة أنواع عمل جديدة بسهولة
- يمكن تخصيص قواعد مختلفة لكل منصة
- النظام قابل للتوسع لدعم أنماط حساب أكثر تعقيداً
