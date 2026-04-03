# دليل حماية التعديلات المتزامنة
## Concurrent Editing Protection Implementation Guide

---

## ✅ ما تم إنجازه:

### 1. Database Migration
**الملف:** `supabase/migrations/20260407000000_concurrent_editing_protection.sql`

- ✅ إضافة `version` column لجدول `salary_records` (Optimistic Locking)
- ✅ إنشاء جدول `salary_drafts` لحفظ المسودات في الخادم
- ✅ إضافة RLS policies للأمان
- ✅ تفعيل Realtime للتنبيهات الفورية
- ✅ Auto-increment للـ version عند كل تحديث

### 2. Service Layer
**الملف:** `frontend/services/salaryDraftService.ts`

- ✅ `getDraftsForMonth()` - جلب المسودات من الخادم
- ✅ `saveDraft()` - حفظ مسودة واحدة
- ✅ `saveDraftsBatch()` - حفظ عدة مسودات دفعة واحدة
- ✅ `clearDraftsForMonth()` - مسح المسودات بعد الاعتماد
- ✅ `subscribeToDraftChanges()` - الاستماع للتغييرات الفورية

### 3. Domain Logic Updates
**الملف:** `frontend/modules/salaries/lib/salaryDomain.ts`

- ✅ تحديث `hydrateRowsWithDraft()` لاستخدام Supabase بدلاً من localStorage
- ✅ إزالة dependency على `salariesDraftKey`
- ✅ جعل الدالة async لدعم server calls

---

## 🔧 التغييرات المطلوبة:

### 1. تطبيق Migration على Database

```bash
cd supabase
supabase db push
```

أو في Production:
```bash
# رفع الملف يدوياً من Supabase Dashboard → SQL Editor
```

---

### 2. تحديث Salaries Page Component

**الملف:** `frontend/modules/salaries/pages/SalariesPage.tsx`

#### التغيير الأول: إزالة localStorage draft system

```typescript
// ❌ احذف هذا
const salariesDraftKey = `salaries-draft-${selectedMonth}`;

// ❌ احذف دالة saveDraft القديمة
const saveDraft = useCallback(() => {
  const draftMap: Record<string, SalaryDraftPatch> = {};
  rows.forEach((row) => {
    if (row.isDirty) {
      draftMap[row.id] = {
        incentives: row.incentives,
        violations: row.violations,
        customDeductions: row.customDeductions,
        sickAllowance: row.sickAllowance,
        transfer: row.transfer,
      };
    }
  });
  localStorage.setItem(salariesDraftKey, JSON.stringify(draftMap));
}, [rows, salariesDraftKey]);
```

#### التغيير الثاني: إضافة auto-save للخادم

```typescript
import { salaryDraftService } from '@services/salaryDraftService';
import { useDebounce } from '@shared/hooks/useDebounce';

// داخل المكون
const [savingDraft, setSavingDraft] = useState(false);

// Auto-save drafts to server (debounced)
const debouncedRows = useDebounce(rows, 2000); // حفظ بعد ثانيتين من التوقف عن الكتابة

useEffect(() => {
  const saveDrafts = async () => {
    const dirtyRows = debouncedRows.filter(r => r.isDirty && r.status === 'pending');
    if (dirtyRows.length === 0) return;

    setSavingDraft(true);
    try {
      const draftMap: Record<string, SalaryDraftPatch> = {};
      dirtyRows.forEach((row) => {
        draftMap[row.id] = {
          incentives: row.incentives,
          violations: row.violations,
          customDeductions: row.customDeductions,
          sickAllowance: row.sickAllowance,
          transfer: row.transfer,
        };
      });

      await salaryDraftService.saveDraftsBatch(selectedMonth, draftMap);
    } catch (error) {
      console.error('Failed to save drafts:', error);
    } finally {
      setSavingDraft(false);
    }
  };

  saveDrafts();
}, [debouncedRows, selectedMonth]);

// مؤشر الحفظ في الواجهة
{savingDraft && (
  <div className="text-xs text-muted-foreground flex items-center gap-1">
    <Loader2 size={12} className="animate-spin" />
    جارٍ الحفظ...
  </div>
)}
```

#### التغيير الثالث: مسح المسودات بعد الاعتماد

```typescript
// في دالة approveAll
const approveAll = async () => {
  // ... الكود الموجود
  
  // بعد نجاح الاعتماد
  await salaryDraftService.clearDraftsForMonth(selectedMonth);
  toast.success('✅ تم اعتماد الرواتب ومسح المسودات');
};
```

---

### 3. إضافة Optimistic Locking للحفظ

**الملف:** `frontend/services/salaryDataService.ts`

```typescript
// تحديث دالة upsertSalaryRecord
export const salaryDataService = {
  upsertSalaryRecord: async (record: SalaryRecordInput) => {
    // جلب الإصدار الحالي
    const { data: existing } = await supabase
      .from('salary_records')
      .select('version')
      .eq('employee_id', record.employee_id)
      .eq('month_year', record.month_year)
      .single();

    const currentVersion = existing?.version || 0;

    // محاولة التحديث مع فحص الإصدار
    const { data, error } = await supabase
      .from('salary_records')
      .upsert(record)
      .eq('version', currentVersion) // ✅ فحص الإصدار
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('تم تعديل السجل من مستخدم آخر. يرجى تحديث الصفحة.');
      }
      throwIfError(error, 'salaryDataService.upsertSalaryRecord');
    }

    if (!data || data.length === 0) {
      throw new Error('فشل الحفظ: تم تعديل السجل من مستخدم آخر');
    }

    return data[0];
  },
};
```

---

### 4. إضافة Real-time Notifications

**الملف:** `frontend/modules/salaries/pages/SalariesPage.tsx`

```typescript
import { useEffect } from 'react';

// داخل المكون
useEffect(() => {
  // الاستماع لتغييرات salary_records
  const subscription = supabase
    .channel(`salary_records:${selectedMonth}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'salary_records',
        filter: `month_year=eq.${selectedMonth}`,
      },
      (payload) => {
        const updated = payload.new as { employee_id: string; is_approved: boolean };
        
        // تحديث الصف في الواجهة
        setRows((prev) =>
          prev.map((r) =>
            r.employeeId === updated.employee_id
              ? { ...r, status: updated.is_approved ? 'approved' : 'pending' }
              : r
          )
        );

        // إظهار تنبيه
        toast.info('تم تحديث راتب من مستخدم آخر', {
          description: 'تم تحديث البيانات تلقائياً',
        });
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [selectedMonth]);
```

---

### 5. إنشاء useDebounce Hook (إذا لم يكن موجوداً)

**الملف:** `frontend/shared/hooks/useDebounce.ts`

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 🎯 النتيجة النهائية:

### قبل التحديث ❌
```
المستخدم A: يعدل → يحفظ في localStorage
المستخدم B: يعدل → يحفظ في localStorage
المستخدم A: يعتمد → يحفظ في DB
المستخدم B: يعتمد → يستبدل بيانات A ❌
```

### بعد التحديث ✅
```
المستخدم A: يعدل → يحفظ في Supabase (version 1)
المستخدم B: يعدل → يحفظ في Supabase (version 1)
المستخدم A: يعتمد → يحفظ في DB (version 2) ✅
المستخدم B: يعتمد → يفشل (version mismatch) → تنبيه "يرجى التحديث" ✅
```

---

## 📋 Checklist للتطبيق:

- [ ] تطبيق Migration على Database
- [ ] إضافة `salaryDraftService` import في SalariesPage
- [ ] إزالة localStorage draft system
- [ ] إضافة auto-save مع debounce
- [ ] تحديث `salaryDataService.upsertSalaryRecord` بـ version check
- [ ] إضافة Real-time subscription
- [ ] إنشاء `useDebounce` hook
- [ ] اختبار السيناريوهات:
  - [ ] مستخدمان يعدلان نفس الموظف
  - [ ] مستخدم يعتمد بينما الآخر يعدل
  - [ ] Auto-save يعمل بعد التوقف عن الكتابة
  - [ ] التنبيهات الفورية تظهر

---

## 🚀 خطوات التطبيق السريع:

```bash
# 1. تطبيق Migration
cd supabase && supabase db push

# 2. تشغيل المشروع
cd frontend && npm run dev

# 3. اختبار بفتح تبويبين
# - افتح نفس الصفحة في تبويبين
# - عدّل نفس الموظف في التبويبين
# - اعتمد من التبويب الأول
# - حاول الاعتماد من التبويب الثاني → يجب أن يظهر خطأ
```

---

## 💡 ملاحظات مهمة:

1. **localStorage القديم**: سيبقى موجوداً لكن لن يُستخدم. يمكن مسحه لاحقاً بـ migration script
2. **Performance**: Auto-save كل ثانيتين لن يؤثر على الأداء (debounced)
3. **Offline Support**: إذا انقطع الإنترنت، التعديلات ستبقى في الذاكرة حتى العودة
4. **Conflict Resolution**: عند حدوث تعارض، المستخدم يُطلب منه تحديث الصفحة

---

هل تريد المساعدة في تطبيق أي من هذه الخطوات؟
