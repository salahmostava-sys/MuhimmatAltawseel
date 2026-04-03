export type NameMatchSuggestion = {
  id: string;
  name: string;
  similarity: number;
};

export type UnmatchedEmployeeName = {
  name: string;
  suggestions: NameMatchSuggestion[];
};

/**
 * حساب نسبة التشابه بين نصين باستخدام Levenshtein Distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * حساب نسبة التشابه بين نصين (0-100%)
 */
function similarityPercentage(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * تنظيف النص للمقارنة
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // توحيد المسافات
    .replace(/[أإآ]/g, 'ا') // توحيد الألف
    .replace(/[ىي]/g, 'ي') // توحيد الياء
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ''); // إزالة الرموز
}

/**
 * حساب نسبة التطابق المتقدمة (تدعم الأسماء الجزئية)
 */
function advancedSimilarity(searchName: string, candidateName: string): number {
  const normalizedSearch = normalizeText(searchName);
  const normalizedCandidate = normalizeText(candidateName);

  // 1. تطابق كامل
  if (normalizedSearch === normalizedCandidate) {
    return 100;
  }

  // 2. تطابق جزئي (الاسم المدخل موجود في الاسم الكامل)
  if (normalizedCandidate.includes(normalizedSearch)) {
    // نسبة التطابق بناءً على طول الاسم المدخل مقارنة بالاسم الكامل
    const ratio = normalizedSearch.length / normalizedCandidate.length;
    return 85 + (ratio * 15); // 85-100%
  }

  // 3. تطابق الكلمات (أي كلمة من الاسم المدخل موجودة في الاسم الكامل)
  const searchWords = normalizedSearch.split(' ').filter(Boolean);
  const candidateWords = normalizedCandidate.split(' ').filter(Boolean);
  
  let matchedWords = 0;
  for (const searchWord of searchWords) {
    for (const candidateWord of candidateWords) {
      // تطابق كامل للكلمة
      if (searchWord === candidateWord) {
        matchedWords++;
        break;
      }
      // تطابق جزئي للكلمة (الكلمة المدخلة موجودة في بداية كلمة من الاسم)
      if (candidateWord.startsWith(searchWord) && searchWord.length >= 3) {
        matchedWords += 0.8;
        break;
      }
      // تطابق جزئي (الكلمة المدخلة موجودة في أي مكان من الكلمة)
      if (candidateWord.includes(searchWord) && searchWord.length >= 3) {
        matchedWords += 0.6;
        break;
      }
    }
  }

  if (matchedWords > 0) {
    const wordMatchRatio = matchedWords / searchWords.length;
    return 60 + (wordMatchRatio * 25); // 60-85%
  }

  // 4. تشابه Levenshtein (للأسماء المتشابهة في الكتابة)
  const levenshteinSim = similarityPercentage(normalizedSearch, normalizedCandidate);
  
  // 5. تشابه أول كلمة (مهم للأسماء العربية)
  const firstSearchWord = searchWords[0] || '';
  const firstCandidateWord = candidateWords[0] || '';
  const firstWordSim = similarityPercentage(firstSearchWord, firstCandidateWord);

  // أخذ أعلى نسبة تشابه
  return Math.max(levenshteinSim, firstWordSim * 0.8);
}

/**
 * البحث عن أفضل مطابقة لاسم في قائمة
 */
export function findBestMatch(
  searchName: string,
  candidates: Array<{ id: string; name: string }>,
  threshold = 60 // خفض الحد الأدنى إلى 60%
): { match: { id: string; name: string } | null; similarity: number; suggestions: NameMatchSuggestion[] } {
  const matches = candidates.map((candidate) => ({
    ...candidate,
    similarity: advancedSimilarity(searchName, candidate.name),
  }));

  // ترتيب حسب نسبة التشابه
  matches.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = matches[0];
  const suggestions = matches.filter((m) => m.similarity >= threshold).slice(0, 5);

  return {
    match: bestMatch && bestMatch.similarity >= threshold ? bestMatch : null,
    similarity: bestMatch?.similarity || 0,
    suggestions,
  };
}

/**
 * مطابقة قائمة أسماء مع قائمة موظفين
 */
export function matchEmployeeNames(
  importedNames: string[],
  employees: Array<{ id: string; name: string }>,
  threshold = 60 // خفض الحد الأدنى إلى 60%
): {
  matched: Map<string, { id: string; name: string; similarity: number }>;
  unmatched: UnmatchedEmployeeName[];
} {
  const matched = new Map<string, { id: string; name: string; similarity: number }>();
  const unmatched: UnmatchedEmployeeName[] = [];

  for (const importedName of importedNames) {
    const result = findBestMatch(importedName, employees, threshold);
    
    if (result.match) {
      matched.set(importedName, {
        id: result.match.id,
        name: result.match.name,
        similarity: result.similarity,
      });
    } else {
      unmatched.push({
        name: importedName,
        suggestions: result.suggestions,
      });
    }
  }

  return { matched, unmatched };
}
