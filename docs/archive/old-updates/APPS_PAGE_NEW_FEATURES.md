# ✨ ميزات جديدة - صفحة التطبيقات
## Apps Page New Features

---

## 🎯 الميزات المضافة

### 1. حذف المنصة بالكامل ✅

#### الوصف
إمكانية حذف المنصة نهائياً من النظام مع عرض جميع البيانات المرتبطة والتحذيرات.

#### المميزات
- ✅ **خياران للحذف:**
  - **أرشفة (Soft Delete):** إخفاء المنصة فقط مع الحفاظ على البيانات
  - **حذف نهائي (Hard Delete):** حذف المنصة والبيانات المرتبطة بالكامل

- ✅ **فحص الاعتماديات:**
  - عدد الموظفين المرتبطين
  - عدد سجلات الطلبات
  - عدد الأهداف الشهرية
  - عدد قواعد التسعير

- ✅ **تحذيرات واضحة:**
  - تنبيه عند وجود بيانات مرتبطة
  - تحذير من تأثير الحذف على الرواتب والتقارير
  - خيار التراجع قبل التأكيد

#### كيفية الاستخدام

```typescript
// 1. الضغط على زر الحذف في بطاقة المنصة
<AppCard onDelete={(app, event) => {
  event.stopPropagation();
  setDeleteApp(app);
}} />

// 2. يظهر Dialog مع خيارين:
// - أرشفة (افتراضي)
// - حذف نهائي (يظهر عند وجود بيانات مرتبطة)

// 3. عند اختيار "حذف نهائي":
// - يعرض جميع البيانات التي سيتم حذفها
// - تحذير واضح أن الإجراء لا يمكن التراجع عنه
// - زر تأكيد أحمر
```

#### الكود

```typescript
// services/appService.ts

// Soft delete
delete: async (id: string) => {
  const { error } = await supabase
    .from('apps')
    .update({ is_archived: true, is_active: false })
    .eq('id', id);
  if (error) handleSupabaseError(error, 'appService.delete');
},

// Hard delete
permanentDelete: async (id: string) => {
  const { error } = await supabase.from('apps').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'appService.permanentDelete');
},

// Check dependencies
getAppDependencies: async (id: string) => {
  const [employeeApps, dailyOrders, appTargets, pricingRules] = await Promise.all([
    supabase.from('employee_apps').select('id', { count: 'exact', head: true }).eq('app_id', id),
    supabase.from('daily_orders').select('id', { count: 'exact', head: true }).eq('app_id', id),
    supabase.from('app_targets').select('id', { count: 'exact', head: true }).eq('app_id', id),
    supabase.from('pricing_rules').select('id', { count: 'exact', head: true }).eq('app_id', id),
  ]);

  return {
    employeeAppsCount: employeeApps.count ?? 0,
    dailyOrdersCount: dailyOrders.count ?? 0,
    appTargetsCount: appTargets.count ?? 0,
    pricingRulesCount: pricingRules.count ?? 0,
    hasAnyDependencies: /* ... */,
  };
},
```

---

### 2. ربط بيانات الموظفين ✅

#### الوصف
عرض بيانات الموظفين الكاملة في جدول أداء المنصة.

#### البيانات المضافة
- ✅ **رقم الهوية الوطنية**
- ✅ **رقم الجوال**
- ✅ **المسمى الوظيفي**
- ✅ **حالة الموظف** (نشط/موقوف/منتهي)

#### قبل التحديث
```
| المندوب | حالة العمل | الطلبات | الهدف | التوقع | الحالة |
```

#### بعد التحديث
```
| المندوب | رقم الهوية | الجوال | حالة العمل | الطلبات | الهدف | التوقع | الحالة |
```

#### الكود

```typescript
// types.ts
export interface AppEmployee {
  id: string;
  name: string;
  national_id?: string | null;  // ✅ جديد
  phone?: string | null;         // ✅ جديد
  job_title?: string | null;     // ✅ جديد
  status: string;                // ✅ جديد
  monthOrders: number;
  targetShare: number | null;
  projectedMonthEnd: number | null;
  onTrack: boolean | null;
}

// appService.ts
getActiveEmployeeAppsWithEmployees: async (appId: string) => {
  const { data, error } = await supabase
    .from('employee_apps')
    .select('employee_id, employees!inner(id, name, national_id, phone, job_title, status, sponsorship_status)')
    .eq('app_id', appId)
    .eq('status', 'active');
  // ...
},
```

#### المكون

```typescript
// AppEmployeesPanel.tsx
<table>
  <thead>
    <tr>
      <th>المندوب</th>
      <th>رقم الهوية</th>      {/* ✅ جديد */}
      <th>الجوال</th>          {/* ✅ جديد */}
      <th>حالة العمل</th>
      <th>الطلبات المنفذة</th>
      <th>حصة الهدف</th>
      <th>التوقع</th>
      <th>الحالة</th>
    </tr>
  </thead>
  <tbody>
    {employees.map((employee) => (
      <tr key={employee.id}>
        <td>
          <div>
            <p className="font-bold">{employee.name}</p>
            {employee.job_title && (
              <p className="text-xs text-muted-foreground">
                {employee.job_title}
              </p>
            )}
          </div>
        </td>
        <td>{employee.national_id || '—'}</td>
        <td>{employee.phone || '—'}</td>
        <td>
          <span className={statusClass}>{statusLabel}</span>
        </td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

---

## 📊 الملفات المعدلة

### Backend/Services
1. ✅ `frontend/services/appService.ts`
   - إضافة `permanentDelete()`
   - إضافة `getAppDependencies()`
   - تحديث `getActiveEmployeeAppsWithEmployees()`

### Hooks
2. ✅ `frontend/modules/apps/hooks/useAppsPage.ts`
   - إضافة `deleteMode` state
   - إضافة `appDependencies` state
   - تحديث `deleteMutation`
   - إضافة `handleDeleteClick()`

### Components
3. ✅ `frontend/modules/apps/pages/AppsPage.tsx`
   - تحديث Delete Dialog
   - إضافة عرض الاعتماديات
   - إضافة خيار الحذف النهائي

4. ✅ `frontend/modules/apps/components/AppEmployeesPanel.tsx`
   - إضافة أعمدة بيانات الموظفين
   - تحسين عرض الحالة
   - إضافة المسمى الوظيفي

### Types
5. ✅ `frontend/modules/apps/types.ts`
   - تحديث `AppEmployee`
   - تحديث `AppEmployeeAssignmentRow`

### Models
6. ✅ `frontend/modules/apps/lib/appsModel.ts`
   - تحديث `buildAppEmployees()`

---

## 🧪 الاختبار

### اختبار الحذف

#### السيناريو 1: أرشفة منصة بدون بيانات
```
1. افتح صفحة التطبيقات
2. اضغط على زر الحذف لمنصة جديدة
3. يظهر Dialog "أرشفة المنصة"
4. اضغط "تأكيد الأرشفة"
5. ✅ يجب أن تختفي المنصة
```

#### السيناريو 2: أرشفة منصة بها بيانات
```
1. افتح صفحة التطبيقات
2. اضغط على زر الحذف لمنصة نشطة
3. يظهر Dialog مع تحذير:
   ⚠️ تنبيه: المنصة مرتبطةببيانات
   • X موظف مرتبط
   • Y سجل طلبات
   • Z هدف شهري
4. اضغط "تأكيد الأرشفة"
5. ✅ يجب أن تُخفى المنصة مع الحفاظ على البيانات
```

#### السيناريو 3: حذف نهائي
```
1. افتح صفحة التطبيقات
2. اضغط على زر الحذف لمنصة
3. يظهر Dialog الأرشفة
4. اضغط "حذف نهائي بدلاً من ذلك"
5. يتغير Dialog إلى تحذير أحمر:
   ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
   📊 البيانات المرتبطة التي سيتم حذفها:
   • X ربط موظف
   • Y سجل طلبات يومي
   • Z هدف شهري
   ⚠️ سيؤثر هذا على حسابات الرواتب والتقارير التاريخية!
6. اضغط "🗑️ تأكيد الحذف النهائي"
7. ✅ يجب أن تُحذف المنصة والبيانات المرتبطة
```

### اختبار بيانات الموظفين

#### السيناريو 1: عرض البيانات
```
1. افتح صفحة التطبيقات
2. اضغط على بطاقة منصة
3. يظهر جدول الموظفين
4. ✅ يجب أن يعرض:
   - اسم الموظف
   - المسمى الوظيفي (تحت الاسم)
   - رقم الهوية
   - رقم الجوال
   - حالة العمل (نشط/موقوف/منتهي)
   - الطلبات المنفذة
   - حصة الهدف
   - التوقع
   - الحالة (يحقق/تحت التارجت)
```

#### السيناريو 2: موظف بدون بيانات
```
1. افتح صفحة التطبيقات
2. اضغط على منصة
3. ✅ يجب أن يعرض "—" للحقول الفارغة:
   - رقم الهوية: —
   - الجوال: —
   - المسمى الوظيفي: (لا يظهر)
```

---

## 📝 ملاحظات مهمة

### الحذف النهائي
⚠️ **تحذير:** الحذف النهائي سيؤثر على:
- حسابات الرواتب التاريخية
- التقارير الشهرية
- الإحصائيات
- سجلات الطلبات

💡 **نصيحة:** استخدم الأرشفة بدلاً من الحذف النهائي إلا إذا كنت متأكداً.

### بيانات الموظفين
- البيانات تُجلب من جدول `employees`
- تظهر فقط للموظفين النشطين
- تُحدث تلقائياً عند تغيير بيانات الموظف

---

## 🚀 الخطوات التالية

### تحسينات مقترحة
1. إضافة تصدير بيانات الموظفين إلى Excel
2. إضافة فلترة حسب حالة الموظف
3. إضافة بحث في الجدول
4. إضافة ترتيب حسب الأعمدة

### ميزات إضافية
1. عرض تاريخ آخر طلب للموظف
2. عرض متوسط الطلبات اليومي
3. عرض أفضل يوم للموظف
4. إضافة رسم بياني للأداء

---

**تاريخ التحديث:** 2025-01-XX  
**الحالة:** ✅ مكتمل ومختبر
