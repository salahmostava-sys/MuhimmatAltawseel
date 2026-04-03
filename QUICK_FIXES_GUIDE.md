# 🚀 دليل الحلول السريعة
## Quick Fixes Guide - Muhimmat AlTawseel

---

## 🔴 المشكلة #1: حساب الراتب في مكانين

### الوضع الحالي:
```typescript
// ❌ Client-side calculation
// modules/salaries/lib/salaryDomain.ts
export const calculatePlatformSalary = ({ ... }) => {
  // حساب معقد في المتصفح
  return Math.round(salary);
};

// ✅ Server-side calculation (الصحيح)
// modules/salaries/hooks/useSalaryPersistence.ts
const computeServerSalaryForPayment = async (row, monthYear) => {
  const calcData = await salaryDataService.calculateSalaryForEmployeeMonth(...);
  return calcData;
};
```

### الحل:

#### الخطوة 1: تحديث salaryDomain.ts
```typescript
// modules/salaries/lib/salaryDomain.ts

// احذف calculatePlatformSalary بالكامل
// واستبدلها بـ:

export const calculatePlatformSalaryPreview = ({ ... }) => {
  // حساب تقريبي للعرض فقط
  // أضف تحذير واضح
  return {
    salary: Math.round(estimatedSalary),
    isEstimate: true, // ⚠️ علامة أن هذا تقدير
  };
};
```

#### الخطوة 2: تحديث UI لعرض التحذير
```typescript
// modules/salaries/components/SalaryRow.tsx

{row.isEstimate && (
  <span className="text-xs text-warning">
    ⚠️ تقديري - سيتم الحساب النهائي عند الاعتماد
  </span>
)}
```

#### الخطوة 3: استخدم Server RPC دائماً عند الحفظ
```typescript
// modules/salaries/hooks/useSalaryPersistence.ts

// ✅ استخدم هذا فقط
const finalSalary = await salaryDataService.calculateSalaryForEmployeeMonth(
  employeeId,
  monthYear,
  paymentMethod,
  manualDeduction,
  null
);

// احفظ النتيجة
await salaryDataService.upsertSalaryRecord({
  ...finalSalary,
  is_approved: true,
});
```

---

## 🔴 المشكلة #2: Query Keys بدون userId

### البحث عن المشاكل:
```bash
# ابحث عن جميع useQuery بدون userId
grep -r "queryKey:" frontend/modules --include="*.ts" --include="*.tsx" | \
grep -v "userId" | \
grep -v "uid"
```

### الحل العام:

#### قبل:
```typescript
// ❌ مشكلة
const { data } = useQuery({
  queryKey: ['dashboard', monthYear],
  queryFn: () => fetchDashboard(monthYear),
});
```

#### بعد:
```typescript
// ✅ الحل
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';

const { enabled, userId } = useAuthQueryGate();
const uid = authQueryUserId(userId);

const { data } = useQuery({
  queryKey: ['dashboard', uid, monthYear], // ✅ أضف uid
  queryFn: () => fetchDashboard(monthYear),
  enabled, // ✅ أضف enabled
});
```

### الملفات التي تحتاج تحديث:

1. **modules/dashboard/hooks/useDashboard.ts** ✅ (تم بالفعل)
2. **modules/finance/** (إذا كان موجوداً)
3. **modules/orders/hooks/** (تحقق)
4. **modules/fuel/hooks/** (تحقق)
5. **modules/maintenance/hooks/** (تحقق)

### سكريبت للفحص التلقائي:
```bash
#!/bin/bash
# check-query-keys.sh

echo "🔍 Checking for query keys without userId..."

# ابحث عن useQuery بدون userId/uid
grep -r "useQuery" frontend/modules --include="*.ts" --include="*.tsx" -A 5 | \
grep "queryKey:" | \
grep -v "userId" | \
grep -v "uid" | \
grep -v "// OK" > missing-userid.txt

if [ -s missing-userid.txt ]; then
  echo "❌ Found queries without userId:"
  cat missing-userid.txt
  exit 1
else
  echo "✅ All queries have userId"
  exit 0
fi
```

---

## 🟠 المشكلة #3: شجرتا مصدر موازيتان (src/ و app/)

### الحل:

#### الخطوة 1: احذف src/ directory
```bash
cd frontend
rm -rf src/
```

#### الخطوة 2: حدّث vite.config.ts
```typescript
// vite.config.ts
export default defineConfig({
  root: '.', // ✅ بدلاً من './src'
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './app'),
      '@modules': path.resolve(__dirname, './modules'),
      '@services': path.resolve(__dirname, './services'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

#### الخطوة 3: حدّث index.html
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>مهمة التوصيل</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- ✅ غيّر المسار -->
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

#### الخطوة 4: حدّث tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["./app/*"],
      "@modules/*": ["./modules/*"],
      "@services/*": ["./services/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["app", "modules", "services", "shared"]
}
```

---

## 🟡 المشكلة #4: حالات الحضور المخصصة في localStorage

### الحل:

#### الخطوة 1: إنشاء Migration
```sql
-- supabase/migrations/20260408000000_custom_attendance_statuses.sql

CREATE TABLE IF NOT EXISTS public.custom_attendance_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_name TEXT NOT NULL,
  status_color TEXT NOT NULL DEFAULT '#6b7280',
  status_icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, status_name)
);

-- Enable RLS
ALTER TABLE public.custom_attendance_statuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own statuses"
ON public.custom_attendance_statuses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statuses"
ON public.custom_attendance_statuses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statuses"
ON public.custom_attendance_statuses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statuses"
ON public.custom_attendance_statuses FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_custom_attendance_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_attendance_statuses_updated_at
BEFORE UPDATE ON public.custom_attendance_statuses
FOR EACH ROW
EXECUTE FUNCTION update_custom_attendance_statuses_updated_at();
```

#### الخطوة 2: إنشاء Service
```typescript
// services/customAttendanceStatusService.ts

import { supabase } from './supabase/client';
import { throwIfError } from './serviceError';

export interface CustomAttendanceStatus {
  id: string;
  user_id: string;
  status_name: string;
  status_color: string;
  status_icon?: string;
  created_at: string;
  updated_at: string;
}

export const customAttendanceStatusService = {
  getAll: async (): Promise<CustomAttendanceStatus[]> => {
    const { data, error } = await supabase
      .from('custom_attendance_statuses')
      .select('*')
      .order('created_at', { ascending: true });

    throwIfError(error, 'customAttendanceStatusService.getAll');
    return data || [];
  },

  create: async (
    statusName: string,
    statusColor: string,
    statusIcon?: string
  ): Promise<CustomAttendanceStatus> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('custom_attendance_statuses')
      .insert({
        user_id: userId,
        status_name: statusName,
        status_color: statusColor,
        status_icon: statusIcon,
      })
      .select()
      .single();

    throwIfError(error, 'customAttendanceStatusService.create');
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('custom_attendance_statuses')
      .delete()
      .eq('id', id);

    throwIfError(error, 'customAttendanceStatusService.delete');
  },
};
```

#### الخطوة 3: تحديث DailyAttendance.tsx
```typescript
// shared/components/attendance/DailyAttendance.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customAttendanceStatusService } from '@services/customAttendanceStatusService';

// ❌ احذف هذا
// const [customStatuses, setCustomStatuses] = useState(() => {
//   const saved = localStorage.getItem('custom_attendance_statuses');
//   return saved ? JSON.parse(saved) : [];
// });

// ✅ استخدم هذا
const { data: customStatuses = [] } = useQuery({
  queryKey: ['custom-attendance-statuses', userId],
  queryFn: () => customAttendanceStatusService.getAll(),
  enabled: !!userId,
});

const addStatusMutation = useMutation({
  mutationFn: (status: { name: string; color: string; icon?: string }) =>
    customAttendanceStatusService.create(status.name, status.color, status.icon),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['custom-attendance-statuses'] });
  },
});
```

---

## 🟢 المشكلة #5: Bundle Size Optimization

### الحل:

#### تحديث vite.config.ts
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-hook-form',
          ],
          
          // UI components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
          ],
          
          // Charts
          'vendor-charts': ['recharts'],
          
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // React Query
          'vendor-query': ['@tanstack/react-query'],
          
          // Date utilities
          'vendor-date': ['date-fns'],
          
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // احذف console.log في production
        drop_debugger: true,
      },
    },
  },
  
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './app'),
      '@modules': path.resolve(__dirname, './modules'),
      '@services': path.resolve(__dirname, './services'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

---

## 📋 Checklist للتطبيق

### الأولوية العالية (هذا الأسبوع)
- [ ] توحيد حساب الراتب (server-side فقط)
- [ ] إضافة userId لجميع query keys
- [ ] فحص جميع useQuery بالسكريبت

### الأولوية المتوسطة (الأسبوع القادم)
- [ ] حذف src/ directory
- [ ] نقل custom_attendance_statuses إلى database
- [ ] تطبيق bundle size optimization

### الأولوية المنخفضة (الشهر القادم)
- [ ] إضافة error boundaries
- [ ] توحيد loading states
- [ ] تحسينات type safety

---

## 🧪 الاختبار

### بعد كل تغيير:
```bash
# 1. تشغيل الاختبارات
npm run test

# 2. فحص الـ build
npm run build

# 3. فحص الـ bundle size
npm run build && ls -lh dist/assets/

# 4. تشغيل الـ linter
npm run lint
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع `SYSTEM_AUDIT_REPORT.md` للتفاصيل الكاملة
2. راجع `CONCURRENT_EDITING_GUIDE.md` للتعديلات المتزامنة
3. استخدم Code Issues Panel للمشاكل المكتشفة

---

**آخر تحديث:** 2025-01-XX  
**الحالة:** جاهز للتطبيق ✅
