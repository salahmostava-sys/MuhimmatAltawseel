# دليل التنفيذ النهائي - نظام الدوام والمنصات المختلطة

## ✅ ما تم إنجازه

### 1. قاعدة البيانات
- ✅ Migration: `20260405000000_add_shifts_and_hybrid_work_types.sql`
- ✅ جدول `daily_shifts` لتسجيل ساعات الدوام
- ✅ جدول `app_hybrid_rules` لقواعد المنصات المختلطة
- ✅ حقل `work_type` في جدول `apps`
- ✅ Triggers لمنع التداخل بين الطلبات والدوام
- ✅ RLS Policies لجميع الجداول

### 2. Backend Services
- ✅ `shiftService.ts` - خدمة الدوام
- ✅ `hybridRuleService.ts` - خدمة القواعد المختلطة
- ✅ تحديث `appService.ts` لدعم `work_type`

### 3. Types
- ✅ `shifts.ts` - أنواع TypeScript كاملة

### 4. Frontend Components
- ✅ `ShiftsTab.tsx` - تبويب الدوام
- ✅ `ShiftsTabWrapper.tsx` - wrapper مع hooks
- ✅ `AppWorkTypeSettings.tsx` - إعدادات نوع العمل
- ✅ `AppSettingsPage.tsx` - صفحة إعدادات المنصات
- ✅ دمج تبويب الدوام في `OrdersPage.tsx`

### 5. التوثيق
- ✅ `SHIFTS_AND_HYBRID_PLATFORMS.md` - توثيق شامل
- ✅ `ORDERS_IMPORT_FIX.md` - توثيق إصلاح الاستيراد

---

## 🚀 خطوات التطبيق

### الخطوة 1: تطبيق Migration

```bash
cd d:\MuhimmatAltawseel
supabase db push
```

**المتوقع:** رسالة نجاح تأكيد تطبيق Migration

### الخطوة 2: إعادة توليد Types

```bash
cd frontend
npm run gen:types
```

**المتوقع:** تحديث ملف `types.ts` مع الجداول الجديدة

### الخطوة 3: إضافة Route لصفحة إعدادات المنصات

في ملف `frontend/app/App.tsx`:

```typescript
import { lazy } from 'react';

const AppSettingsPage = lazy(() => import('@modules/apps/pages/AppSettingsPage').then(m => ({ default: m.AppSettingsPage })));

// داخل Routes:
<Route
  path="/apps/settings"
  element={<PageGuard pageKey="apps"><AppSettingsPage /></PageGuard>}
/>
```

### الخطوة 4: إضافة رابط في Sidebar

في ملف `frontend/shared/components/layout/Sidebar.tsx`:

```typescript
{
  label: 'إعدادات المنصات',
  path: '/apps/settings',
  icon: Settings,
  pageKey: 'apps',
}
```

### الخطوة 5: اختبار النظام

#### أ) اختبار صفحة الطلبات
1. افتح `/orders`
2. انتقل لتبويب "⏰ الدوام"
3. تأكد من ظهور الجدول بدون أخطاء

#### ب) اختبار إعدادات المنصات
1. افتح `/apps/settings`
2. اختر منصة (مثل نينجا)
3. غيّر نوع العمل إلى "مختلط"
4. أدخل الإعدادات:
   - الحد الأدنى: 11 ساعة
   - سعر الدوام: 150 ريال
   - ✓ التحويل للطلبات
5. احفظ واتأكد من النجاح

#### ج) اختبار إدخال بيانات الدوام
1. في تبويب الدوام، اضغط "إضافة سطر"
2. اختر موظف ومنصة دوام
3. أدخل التاريخ وعدد الساعات
4. احفظ

#### د) اختبار منع التداخل
1. حاول إضافة طلبات لموظف في يوم له دوام
2. **المتوقع:** رسالة خطأ تمنع الحفظ

---

## 📋 الخطوات المتبقية (اختيارية)

### 1. تحديث محرك الرواتب

في ملف `frontend/services/salaryService.ts` أو RPC function:

```typescript
// إضافة منطق حساب الدوام
async function calculateShiftSalary(employeeId: string, appId: string, monthYear: string) {
  const app = await appService.getById(appId);
  
  if (app.work_type === 'shift') {
    const shifts = await shiftService.getByMonth(monthYear, { employeeId, appId });
    const validShifts = shifts.filter(s => s.hours_worked >= 8); // مثال: 8 ساعات كحد أدنى
    return validShifts.length * 150; // سعر الدوام
  }
  
  if (app.work_type === 'hybrid') {
    const rule = await hybridRuleService.getByAppId(appId);
    const shifts = await shiftService.getByMonth(monthYear, { employeeId, appId });
    const orders = await orderService.getByMonth(monthYear, { employeeId, appId });
    
    let salary = 0;
    // منطق الحساب المختلط...
    return salary;
  }
  
  // طلبات عادية
  return calculateOrdersSalary(employeeId, appId, monthYear);
}
```

### 2. تحديث التقارير

إضافة تقارير منفصلة للدوام:
- إجمالي ساعات الدوام لكل موظف
- متوسط ساعات العمل اليومية
- أيام الدوام الكاملة vs الناقصة

### 3. إضافة استيراد Excel للدوام

مشابه لاستيراد الطلبات، لكن مع أعمدة:
- اسم الموظف
- المنصة
- التاريخ
- ساعات العمل

---

## 🎯 أمثلة الاستخدام

### مثال 1: إعداد منصة نينجا (مختلطة)

```typescript
// 1. تحديث نوع المنصة
await appService.update('ninja-id', {
  ...ninjaApp,
  work_type: 'hybrid'
});

// 2. إضافة قواعد الدوام
await hybridRuleService.upsert({
  app_id: 'ninja-id',
  min_hours_for_shift: 11,
  shift_rate: 150,
  fallback_to_orders: true
});
```

### مثال 2: تسجيل دوام موظف

```typescript
await shiftService.upsert(
  'employee-id',
  '2025-04-05',
  'ninja-id',
  11.5, // ساعات العمل
  'دوام كامل'
);
```

### مثال 3: حساب راتب موظف على منصة مختلطة

```typescript
const rule = await hybridRuleService.getByAppId('ninja-id');
const shifts = await shiftService.getMonthRaw(2025, 4);
const orders = await orderService.getMonthRaw(2025, 4);

let salary = 0;
for (let day = 1; day <= 30; day++) {
  const shift = shifts.find(s => s.date === `2025-04-${day}` && s.employee_id === 'emp-id');
  const dayOrders = orders.find(o => o.date === `2025-04-${day}` && o.employee_id === 'emp-id');
  
  if (shift && shift.hours_worked >= rule.min_hours_for_shift) {
    salary += rule.shift_rate; // 150 ريال
  } else if (dayOrders) {
    salary += dayOrders.orders_count * 2; // سعر الطلب
  }
}
```

---

## ⚠️ ملاحظات مهمة

### منع التداخل
- ✅ لا يمكن تسجيل طلبات ودوام في نفس اليوم
- ✅ Trigger يمنع ذلك على مستوى قاعدة البيانات
- ✅ رسالة خطأ واضحة للمستخدم

### أنواع المنصات
- **orders**: حساب بالطلبات فقط (هنقرستيشن، جاهز، مرسول)
- **shift**: حساب بالدوام فقط
- **hybrid**: حساب ذكي (نينجا - دوام أو طلبات)

### القيم الافتراضية
- `work_type` الافتراضي: `'orders'`
- جميع المنصات الحالية ستكون `'orders'` تلقائياً

---

## 🐛 استكشاف الأخطاء

### خطأ: "لا يمكن تسجيل دوام في يوم يحتوي على طلبات"
**الحل:** احذف الطلبات أولاً، أو اختر يوم آخر

### خطأ: "work_type is not defined"
**الحل:** تأكد من تطبيق Migration وإعادة توليد Types

### خطأ: "ShiftsTabWrapper not found"
**الحل:** تأكد من إنشاء الملف في المسار الصحيح

---

## 📞 الدعم

للمساعدة أو الأسئلة:
1. راجع ملف `SHIFTS_AND_HYBRID_PLATFORMS.md`
2. تحقق من console للأخطاء
3. تأكد من تطبيق جميع الخطوات بالترتيب

---

## ✨ الخلاصة

النظام الآن يدعم:
- ✅ 3 أنواع من المنصات (طلبات، دوام، مختلط)
- ✅ تسجيل ساعات الدوام
- ✅ قواعد مخصصة للمنصات المختلطة
- ✅ منع التداخل بين الطلبات والدوام
- ✅ واجهة سهلة لإدارة الإعدادات

**جاهز للاستخدام!** 🎉
