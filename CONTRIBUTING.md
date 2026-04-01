# دليل المساهمة — مهمة التوصيل

## القواعد الإلزامية

### 1. كل `useQuery` محمي بـ `useAuthQueryGate` — بدون استثناء

```tsx
// ❌ خطأ — لا تستخدم enabled: true مباشرة
const { data } = useQuery({
  queryKey: ['items'],
  queryFn: () => myService.getAll(),
  enabled: true,
});

// ✅ صح — استخدم useAuthQueryGate دائماً
import { useAuthQueryGate, authQueryUserId } from '@shared/hooks/useAuthQueryGate';

const { enabled, userId } = useAuthQueryGate();
const uid = authQueryUserId(userId);

const { data } = useQuery({
  queryKey: ['items', uid],
  queryFn: () => myService.getAll(),
  enabled,
});
```

> **ليه؟** لأن `useAuthQueryGate` يضمن إن الطلب يروح بس لما المستخدم يكون مسجّل دخول والـ session جاهزة. بدونه ممكن يحصل request فاضي أو خطأ `401`.

---

### 2. كل Service يعمل `throw` — مش `return null`

```ts
// ❌ خطأ — إخفاء الخطأ
async getAll() {
  const { data, error } = await supabase.from('items').select('*');
  if (error) return null;
  return data;
}

// ✅ صح — استخدم throwIfError
import { throwIfError } from './serviceError';

async getAll() {
  const { data, error } = await supabase.from('items').select('*');
  throwIfError(error, 'myService.getAll');
  return data ?? [];
}
```

> **ليه؟** لما الـ service يرمي خطأ، TanStack Query يمسكه ويعرضه في `isError` — فالـ UI يقدر يعرض رسالة واضحة بدل بيانات فاضية بدون سبب.

---

### 3. الـ Imports بالـ Aliases فقط

```ts
// ❌ خطأ — مسارات نسبية طويلة
import { Button } from '../../../shared/components/ui/button';
import { driverService } from '../../services/driverService';

// ✅ صح — استخدم الـ aliases
import { Button } from '@shared/components/ui/button';
import { driverService } from '@services/driverService';
```

**الـ Aliases المتاحة:**

| Alias | المسار |
|---|---|
| `@app/*` | `frontend/app/*` |
| `@services/*` | `frontend/services/*` |
| `@modules/*` | `frontend/modules/*` |
| `@shared/*` | `frontend/shared/*` |

---

### 4. ممنوع `: any` في TypeScript

```ts
// ❌ خطأ
const data: any = response.data;
function process(items: any[]) { ... }

// ✅ صح — حدد النوع
const data: Employee[] = response.data;
function process(items: Employee[]) { ... }

// لو مش عارف النوع بالظبط، استخدم unknown
const data: unknown = response.data;
```

> الـ linter بيرفض `any` تلقائياً (`@typescript-eslint/no-explicit-any`).

---

### 5. حجم الملف أقل من 300 سطر

| الحجم | الإجراء |
|---|---|
| أقل من 300 سطر | مقبول |
| 300–500 سطر | يفضل تقسيمه |
| أكثر من 500 سطر | **لازم يتفصل** لمكونات أصغر |

**طريقة التقسيم:**

```
modules/myFeature/
├── pages/MyFeaturePage.tsx          ← تركيب فقط (state + layout)
├── components/
│   ├── MyFeatureTable.tsx           ← الجدول
│   ├── MyFeatureFilters.tsx         ← البحث والفلاتر
│   └── MyFeatureActionsBar.tsx      ← أزرار التصدير والطباعة
├── hooks/
│   └── useMyFeatureActions.ts       ← دوال الحفظ والحذف والتصدير
└── types/
    └── myFeature.types.ts           ← الأنواع والثوابت
```

---

### 6. قبل كل Commit

```bash
cd frontend

# 1. تأكد إن البناء يعدي بدون أخطاء
npm run build    # → 0 errors

# 2. تأكد إن الاختبارات تعدي
npm run test     # → 0 failures

# 3. أو الاتنين مع بعض
npm run verify   # lint + test + build
```

**صيغة رسالة الـ commit:**

```
feat(salaries): add merged PDF export
fix(alerts): handle missing spare_parts table
refactor(employees): extract EmployeeTable component
```

---

## هيكل Module جديد

```
modules/myFeature/
├── pages/
│   └── MyFeaturePage.tsx      ← الصفحة (lazy-loaded من App.tsx)
├── components/
│   ├── MyFeatureTable.tsx     ← عرض البيانات
│   └── MyFeatureForm.tsx      ← نموذج الإدخال
├── hooks/
│   └── useMyFeature.ts        ← جلب البيانات + العمليات
├── types/
│   └── myFeature.types.ts     ← الأنواع
└── index.ts                   ← barrel export
```

**مثال `index.ts`:**

```ts
export { default as MyFeaturePage } from './pages/MyFeaturePage';
```

**تسجيل الصفحة في `app/App.tsx`:**

```tsx
const MyFeaturePage = lazy(() => import('@modules/myFeature/pages/MyFeaturePage'));

<Route
  path="/my-feature"
  element={<PageGuard pageKey="my_feature"><MyFeaturePage /></PageGuard>}
/>
```

---

## واجهة المستخدم (UI)

- كل النصوص بالعربي إلا لو الميزة تتطلب إنجليزي
- اتجاه RTL دائماً (`dir="rtl"`)
- استخدم Tailwind — تجنب inline styles
- الأزرار والـ actions لازم تكون responsive
- حالات التحميل والفارغ والخطأ لازم تكون واضحة للمستخدم

---

## ملخص سريع

| القاعدة | الأداة |
|---|---|
| حماية الاستعلامات | `useAuthQueryGate()` |
| معالجة الأخطاء | `throwIfError(error, context)` |
| المسارات | `@app`, `@shared`, `@services`, `@modules` |
| الأنواع | لا `any` — حدد النوع دائماً |
| حجم الملف | أقل من 300 سطر |
| قبل الـ commit | `npm run build` + `npm run test` |
