# 🔧 دليل ربط SonarCloud بالنظام
## SonarCloud Integration Guide

**الحالة الحالية:** ✅ معظم الإعدادات موجودة  
**ما تحتاج:** إضافة Secrets و Variables في GitHub

---

## 📋 الخطوات

### الخطوة 1: الحصول على SONAR_TOKEN

1. افتح: https://sonarcloud.io/account/security
2. اضغط "Generate Tokens"
3. أدخل اسم: `muhimmat-github-actions`
4. اضغط "Generate"
5. **انسخ التوكن** (لن تراه مرة أخرى!)

---

### الخطوة 2: إضافة GitHub Secrets

1. افتح مستودعك: https://github.com/salahmostava-sys/muhimmat
2. اذهب إلى: **Settings → Secrets and variables → Actions**
3. اضغط **"New repository secret"**
4. أضف:
   - **Name:** `SONAR_TOKEN`
   - **Value:** (التوكن الذي نسخته)
5. اضغط **"Add secret"**

---

### الخطوة 3: إضافة GitHub Variables

1. في نفس الصفحة: **Settings → Secrets and variables → Actions**
2. اضغط على تبويب **"Variables"**
3. اضغط **"New repository variable"**
4. أضف المتغيرات التالية:

#### المتغير الأول
- **Name:** `SONAR_ORGANIZATION`
- **Value:** `salahmostava-sys`
- اضغط **"Add variable"**

#### المتغير الثاني
- **Name:** `SONAR_PROJECT_KEY`
- **Value:** `salahmostava-sys_muhimmat`
- اضغط **"Add variable"**

---

### الخطوة 4: التحقق من الإعدادات

#### في `sonar-project.properties` ✅
```properties
sonar.projectName=muhimmat-frontend
sonar.sources=frontend
sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info
sonar.typescript.tsconfigPath=frontend/tsconfig.json
```

#### في `.sonarlint/connectedMode.json` ✅
```json
{
    "sonarCloudOrganization": "salahmostava-sys",
    "projectKey": "salahmostava-sys_muhimmat",
    "region": "EU"
}
```

#### في `.github/workflows/sonarcloud.yml` ✅
```yaml
if: ${{ env.SONAR_TOKEN != '' && vars.SONAR_ORGANIZATION != '' && vars.SONAR_PROJECT_KEY != '' }}
```

---

## 🚀 اختبار الربط

### الطريقة 1: عبر GitHub Actions

1. اذهب إلى: **Actions → SonarCloud**
2. اضغط **"Run workflow"**
3. اختر **Branch: main**
4. اضغط **"Run workflow"**
5. انتظر حتى ينتهي (5-10 دقائق)

### الطريقة 2: عبر Pull Request

1. أنشئ PR جديد
2. GitHub Actions سيشغل SonarCloud تلقائياً
3. انتظر النتائج

### الطريقة 3: عبر SonarCloud Dashboard

1. افتح: https://sonarcloud.io/organizations/salahmostava-sys/projects
2. ابحث عن: `muhimmat`
3. يجب أن ترى التحليل الأخير

---

## 📊 ما سيتم فحصه

### Code Quality
- ✅ Code Smells
- ✅ Bugs
- ✅ Vulnerabilities
- ✅ Security Hotspots
- ✅ Duplications

### Coverage
- ✅ Line Coverage
- ✅ Branch Coverage
- ✅ Test Coverage

### Metrics
- ✅ Complexity
- ✅ Maintainability
- ✅ Reliability
- ✅ Security

---

## 🔐 الأمان

### ✅ ما تم حماية
- `SONAR_TOKEN` - Secret (لا يظهر في Logs)
- `SONAR_ORGANIZATION` - Variable (عام)
- `SONAR_PROJECT_KEY` - Variable (عام)

### ⚠️ تحذيرات
- لا تشارك `SONAR_TOKEN` مع أحد
- لا تضعه في الكود
- استخدم GitHub Secrets فقط

---

## 📈 النتائج المتوقعة

### بعد التشغيل الأول
```
✅ Code Quality: A
✅ Reliability: A
✅ Security: A
✅ Maintainability: A
✅ Coverage: 70%+
```

### في SonarCloud Dashboard
- رابط المشروع: https://sonarcloud.io/project/overview?id=salahmostava-sys_muhimmat
- تقارير مفصلة
- تاريخ التحليلات
- مقارنة بين الإصدارات

---

## 🐛 استكشاف الأخطاء

### المشكلة: Workflow فشل
**الحل:**
1. تحقق من `SONAR_TOKEN` موجود
2. تحقق من `SONAR_ORGANIZATION` صحيح
3. تحقق من `SONAR_PROJECT_KEY` صحيح
4. اعد تشغيل الـ workflow

### المشكلة: لا توجد نتائج
**الحل:**
1. تأكد من وجود `frontend/coverage/lcov.info`
2. شغّل: `npm run test:coverage` محلياً
3. تحقق من المسارات في `sonar-project.properties`

### المشكلة: خطأ في التوكن
**الحل:**
1. أنشئ توكن جديد
2. حدّث `SONAR_TOKEN` في GitHub Secrets
3. اعد تشغيل الـ workflow

---

## 📞 الخطوات التالية

### بعد الإعداد الناجح
1. ✅ راقب النتائج في SonarCloud
2. ✅ أصلح المشاكل المكتشفة
3. ✅ حسّن Coverage
4. ✅ راقب الاتجاهات

### التحسينات المستقبلية
- [ ] إضافة Quality Gate
- [ ] إضافة Branch Protection Rules
- [ ] إضافة Notifications
- [ ] إضافة Custom Rules

---

## ✅ Checklist

### الإعداد
- [ ] نسخت `SONAR_TOKEN` من SonarCloud
- [ ] أضفت `SONAR_TOKEN` في GitHub Secrets
- [ ] أضفت `SONAR_ORGANIZATION` في GitHub Variables
- [ ] أضفت `SONAR_PROJECT_KEY` في GitHub Variables

### التحقق
- [ ] `sonar-project.properties` صحيح
- [ ] `.sonarlint/connectedMode.json` صحيح
- [ ] `.github/workflows/sonarcloud.yml` صحيح
- [ ] GitHub Secrets و Variables موجودة

### الاختبار
- [ ] شغلت Workflow يدوياً
- [ ] الـ workflow نجح
- [ ] النتائج ظهرت في SonarCloud
- [ ] Dashboard يعرض البيانات

---

## 🎯 الروابط المهمة

### SonarCloud
- **Dashboard:** https://sonarcloud.io/organizations/salahmostava-sys/projects
- **Project:** https://sonarcloud.io/project/overview?id=salahmostava-sys_muhimmat
- **Account:** https://sonarcloud.io/account/security

### GitHub
- **Repository:** https://github.com/salahmostava-sys/muhimmat
- **Settings:** https://github.com/salahmostava-sys/muhimmat/settings
- **Secrets:** https://github.com/salahmostava-sys/muhimmat/settings/secrets/actions
- **Variables:** https://github.com/salahmostava-sys/muhimmat/settings/variables/actions
- **Actions:** https://github.com/salahmostava-sys/muhimmat/actions

---

**آخر تحديث:** 2025-01-XX  
**الحالة:** ✅ جاهز للإعداد  
**الإصدار:** 1.0
