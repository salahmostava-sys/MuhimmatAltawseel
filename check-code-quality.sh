#!/bin/bash
# check-code-quality.sh
# سكريبت للفحص التلقائي لجودة الكود

set -e

echo "🔍 بدء الفحص الشامل للنظام..."
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# ─── 1. فحص Query Keys بدون userId ───────────────────────────────────────
echo ""
echo "📊 [1/7] فحص Query Keys..."

MISSING_USERID=$(grep -r "useQuery" frontend/modules --include="*.ts" --include="*.tsx" -A 3 | \
  grep "queryKey:" | \
  grep -v "userId" | \
  grep -v "uid" | \
  grep -v "// OK" | \
  wc -l)

if [ "$MISSING_USERID" -gt 0 ]; then
  echo -e "${RED}❌ وجدت $MISSING_USERID query بدون userId${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  echo "   الملفات المتأثرة:"
  grep -r "useQuery" frontend/modules --include="*.ts" --include="*.tsx" -A 3 | \
    grep "queryKey:" | \
    grep -v "userId" | \
    grep -v "uid" | \
    head -5
else
  echo -e "${GREEN}✅ جميع Query Keys تحتوي على userId${NC}"
fi

# ─── 2. فحص localStorage Usage ────────────────────────────────────────────
echo ""
echo "💾 [2/7] فحص استخدام localStorage..."

LOCALSTORAGE_USAGE=$(grep -r "localStorage" frontend/modules --include="*.ts" --include="*.tsx" | \
  grep -v "// OK" | \
  grep -v "node_modules" | \
  wc -l)

if [ "$LOCALSTORAGE_USAGE" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  وجدت $LOCALSTORAGE_USAGE استخدام لـ localStorage${NC}"
  echo "   توصية: انقل البيانات المهمة إلى Supabase"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ استخدام localStorage محدود${NC}"
fi

# ─── 3. فحص console.log في Production ────────────────────────────────────
echo ""
echo "🖨️  [3/7] فحص console.log..."

CONSOLE_LOGS=$(grep -r "console.log" frontend --include="*.ts" --include="*.tsx" | \
  grep -v "node_modules" | \
  grep -v "// DEBUG" | \
  wc -l)

if [ "$CONSOLE_LOGS" -gt 10 ]; then
  echo -e "${YELLOW}⚠️  وجدت $CONSOLE_LOGS console.log${NC}"
  echo "   توصية: استخدم logger بدلاً من console.log"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ استخدام console.log محدود${NC}"
fi

# ─── 4. فحص Environment Variables ─────────────────────────────────────────
echo ""
echo "🔐 [4/7] فحص Environment Variables..."

if [ ! -f "frontend/.env.local" ]; then
  echo -e "${RED}❌ ملف .env.local غير موجود${NC}"
  echo "   قم بنسخ .env.example إلى .env.local"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  # فحص المتغيرات المطلوبة
  REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_PUBLISHABLE_KEY")
  
  for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$VAR=" frontend/.env.local; then
      echo -e "${RED}❌ المتغير $VAR غير موجود في .env.local${NC}"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  done
  
  if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ جميع Environment Variables موجودة${NC}"
  fi
fi

# ─── 5. فحص TypeScript Errors ─────────────────────────────────────────────
echo ""
echo "📝 [5/7] فحص TypeScript..."

cd frontend
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ لا توجد أخطاء TypeScript${NC}"
else
  echo -e "${RED}❌ وجدت أخطاء TypeScript${NC}"
  echo "   قم بتشغيل: npm run build"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
cd ..

# ─── 6. فحص Bundle Size ───────────────────────────────────────────────────
echo ""
echo "📦 [6/7] فحص Bundle Size..."

if [ -d "frontend/dist" ]; then
  BUNDLE_SIZE=$(du -sh frontend/dist | cut -f1)
  echo "   حجم Bundle: $BUNDLE_SIZE"
  
  # فحص إذا كان أكبر من 5MB
  SIZE_IN_MB=$(du -sm frontend/dist | cut -f1)
  if [ "$SIZE_IN_MB" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Bundle كبير جداً (> 5MB)${NC}"
    echo "   توصية: راجع QUICK_FIXES_GUIDE.md للتحسين"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo -e "${GREEN}✅ حجم Bundle مقبول${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  لم يتم build المشروع بعد${NC}"
  echo "   قم بتشغيل: npm run build"
fi

# ─── 7. فحص Dependencies ──────────────────────────────────────────────────
echo ""
echo "📚 [7/7] فحص Dependencies..."

cd frontend
if command -v npm &> /dev/null; then
  OUTDATED=$(npm outdated 2>/dev/null | wc -l)
  
  if [ "$OUTDATED" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  وجدت $OUTDATED حزمة قديمة${NC}"
    echo "   قم بتشغيل: npm outdated"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  else
    echo -e "${GREEN}✅ Dependencies محدثة${NC}"
  fi
fi
cd ..

# ─── النتيجة النهائية ─────────────────────────────────────────────────────
echo ""
echo "================================"
echo "📊 ملخص الفحص:"
echo "================================"

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ لم يتم العثور على مشاكل!${NC}"
  echo ""
  echo "🎉 النظام في حالة ممتازة!"
  exit 0
else
  echo -e "${RED}❌ وجدت $ISSUES_FOUND مشكلة${NC}"
  echo ""
  echo "📖 للحصول على الحلول:"
  echo "   1. راجع SYSTEM_AUDIT_REPORT.md"
  echo "   2. راجع QUICK_FIXES_GUIDE.md"
  echo "   3. استخدم Code Issues Panel"
  exit 1
fi
