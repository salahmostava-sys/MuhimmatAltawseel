#!/usr/bin/env bash
# =========================================================
# github-cleanup.sh — تنظيف GitHub repository
# =========================================================
# الاستخدام:
#   bash scripts/github-cleanup.sh YOUR_GITHUB_TOKEN
# =========================================================

set -e

TOKEN="${1:-}"
OWNER="salahmostava-sys"
REPO="MuhimmatAltawseel"
REMOTE="https://${OWNER}:${TOKEN}@github.com/${OWNER}/${REPO}.git"
API="https://api.github.com/repos/${OWNER}/${REPO}"

if [ -z "$TOKEN" ]; then
  echo "❌ يجب تمرير الـ PAT: bash scripts/github-cleanup.sh YOUR_TOKEN"
  exit 1
fi

echo "🔍 التحقق من الاتصال..."
curl -sf -H "Authorization: token $TOKEN" "$API" > /dev/null && echo "✅ متصل بـ GitHub"

# ── 1. حذف الفروع القديمة ─────────────────────────────────
echo ""
echo "🌿 حذف الفروع القديمة..."

STALE_BRANCHES=(
  "deepsource-autofix-92dfe058"
  "session-019dc73e-1f28-76cb-ad0e-e01e04d33258"
)

for branch in "${STALE_BRANCHES[@]}"; do
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X DELETE \
    -H "Authorization: token $TOKEN" \
    "$API/git/refs/heads/$branch" 2>/dev/null || true)
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "422" ]; then
    echo "  ✅ $branch محذوف (أو لم يكن موجوداً)"
  else
    echo "  ⚠️  $branch — HTTP $STATUS"
  fi
done

# ── 2. إزالة الملفات غير المرغوبة من git index ───────────
echo ""
echo "🗂️  إزالة الملفات الخاصة بـ Replit من git tracking..."

FILES_TO_UNTRACK=(
  "REPO_CLEANUP_REPORT.md"
  ".replit"
)

for f in "${FILES_TO_UNTRACK[@]}"; do
  if git ls-files --error-unmatch "$f" &>/dev/null; then
    git rm --cached "$f"
    echo "  ✅ تم إلغاء تتبع: $f"
  else
    echo "  ℹ️  ليس في git: $f"
  fi
done

# ── 3. إضافة commit ورفعه ────────────────────────────────
if ! git diff --cached --quiet; then
  git commit -m "chore: untrack Replit-specific files from repo"
  git push "$REMOTE" main
  echo ""
  echo "✅ تم الـ commit والـ push"
else
  echo ""
  echo "ℹ️  لا تغييرات جديدة للـ commit"
fi

echo ""
echo "🎉 تم التنظيف بنجاح!"
echo "   الفروع المتبقية:"
curl -sf -H "Authorization: token $TOKEN" "$API/branches" | grep '"name"' | sed 's/.*"name": "\(.*\)".*/   - \1/'
