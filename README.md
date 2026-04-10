# مهمات التوصيل — MuhimmatAltawseel

نظام إدارة شركات التوصيل — يشمل إدارة الموظفين، الطلبات اليومية، الرواتب، السلف، المركبات، الحضور، والتنبيهات.

**Stack:** React 18 · TypeScript · Vite · Supabase · TanStack Query · Tailwind CSS · shadcn/ui

**Production:** [muhimat.vercel.app](https://muhimat.vercel.app)

---

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js ≥ 18
- npm أو pnpm

### الخطوات

```bash
# 1. Clone
git clone <repo-url>
cd MuhimmatAltawseel/frontend

# 2. Install
npm install

# 3. Environment variables
cp .env.example .env.local
# عدّل VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY

# 4. Run
npm run dev
```

يفتح على `http://localhost:5173`

---

## 📁 هيكل المشروع

```
MuhimmatAltawseel/
├── frontend/                  ← React SPA
│   ├── app/                   ← Routing, providers, config
│   │   ├── App.tsx            ← Route definitions
│   │   ├── routesManifest.ts  ← Sidebar navigation config
│   │   └── providers/         ← Auth, Settings, Temporal contexts
│   ├── modules/               ← Feature modules (كل feature منفصلة)
│   │   ├── employees/         ← الموظفين
│   │   ├── orders/            ← الطلبات اليومية
│   │   ├── salaries/          ← الرواتب
│   │   ├── advances/          ← السلف
│   │   ├── dashboard/         ← لوحة التحكم
│   │   ├── apps/              ← إدارة المنصات (أمازون، هنقرستيشن...)
│   │   ├── fuel/              ← استهلاك الوقود
│   │   ├── maintenance/       ← الصيانة والمخزون
│   │   ├── platform-accounts/ ← حسابات المنصات
│   │   ├── violations/        ← المخالفات
│   │   └── pages/             ← صفحات متنوعة (تنبيهات، مركبات، إلخ)
│   ├── services/              ← Supabase API layer
│   ├── shared/                ← مكونات وأدوات مشتركة
│   │   ├── components/        ← UI components مشتركة
│   │   ├── hooks/             ← Custom hooks مشتركة
│   │   ├── lib/               ← Utility functions
│   │   ├── constants/         ← ثوابت النظام
│   │   └── types/             ← Types مشتركة
│   └── docs/                  ← توثيق داخلي
│
└── supabase/                  ← Backend
    ├── functions/             ← Edge Functions
    │   ├── admin-update-user/ ← إدارة المستخدمين (إنشاء/حذف)
    │   ├── salary-engine/     ← محرك حساب الرواتب
    │   └── ai-chat/           ← AI Chat
    └── migrations/            ← 114 SQL migration
```

---

## 🧩 بنية الـ Module

كل module يتبع نفس النمط:

```
modules/[feature]/
├── pages/          ← صفحة/صفحات الـ feature (يُربط بالـ router)
├── components/     ← UI components خاصة بالـ feature
├── hooks/          ← Business logic + state management
├── model/ أو lib/  ← Pure functions, calculations, utils
└── types.ts        ← Type definitions
```

**تدفق البيانات:**
```
Page → Hook → Service → Supabase
                ↓
            TanStack Query (cache)
```

---

## 🗃️ Supabase Backend

### الجداول الرئيسية
| الجدول | الوصف |
|--------|-------|
| `employees` | بيانات الموظفين الأساسية |
| `daily_orders` | الطلبات اليومية لكل موظف/منصة |
| `daily_shifts` | ساعات الدوام اليومية |
| `salary_records` | سجلات الرواتب الشهرية |
| `advances` + `advance_installments` | السلف وأقساطها |
| `attendance` | الحضور والانصراف |
| `apps` | المنصات (أمازون، هنقرستيشن...) |
| `employee_apps` | ربط موظف ↔ منصة |
| `vehicles` | المركبات |
| `alerts` | التنبيهات المحفوظة |
| `user_roles` + `user_permissions` | الأدوار والصلاحيات |
| `profiles` | ملفات المستخدمين |
| `system_settings` | إعدادات النظام |

### Edge Functions
| الوظيفة | الغرض |
|---------|-------|
| `salary-engine` | حساب الرواتب (per employee / per month / preview) |
| `admin-update-user` | إنشاء/حذف مستخدمين (يحتاج admin role) |
| `ai-chat` | محادثة AI |

### Security
- **RLS** مُفعّل على كل الجداول
- **Role-based access**: admin, hr, finance, operations, viewer
- **Rate limiting** على Edge Functions
- **Audit logging** لكل العمليات الحساسة

---

## 🔧 الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل محلي |
| `npm run build` | بناء للإنتاج |
| `npm run test` | تشغيل الاختبارات |
| `npm run test:watch` | اختبارات مستمرة |
| `npm run test:coverage` | تغطية الاختبارات |
| `npm run lint` | فحص ESLint |
| `npm run lint:fix` | إصلاح ESLint تلقائي |
| `npm run verify` | lint + test + build |
| `npm run gen:types` | توليد Types من Supabase |

---

## 🚢 Deploy

### Frontend (Vercel)
- مربوط بـ GitHub — push = auto deploy
- Environment variables مضبوطة في Vercel Dashboard

### Edge Functions (Supabase)
```bash
npx supabase functions deploy salary-engine --no-verify-jwt
npx supabase functions deploy admin-update-user --no-verify-jwt
```

### Database Migrations
```bash
npx supabase db push
```

---

## 📝 ملاحظات للصيانة

1. **نظام الصلاحيات**: الأدوار والصلاحيات مُعرّفة في `shared/hooks/usePermissions.ts` و `shared/constants/permissionPages.ts`
2. **الشهر المحدد**: يُدار مركزياً عبر `TemporalContext` — كل الصفحات تتزامن
3. **Employee visibility**: موظفين الهروب/إنهاء الخدمة يُخفون تلقائياً — المنطق في `shared/lib/employeeVisibility.ts`
4. **Salary engine**: حساب الرواتب يمر عبر Edge Function → PostgreSQL RPC
5. **الـ imports**: استيراد Excel يدعم مطابقة ذكية للأسماء العربية
