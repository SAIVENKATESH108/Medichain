/**
 * High-Performance Pharmaceutical Fuzzy String Matching Algorithms
 *
 * Algorithms:
 * 1. Levenshtein Edit Distance (O(M * N) with O(min(M,N)) memory optimization)
 * 2. Tri-Gram Jaccard Token Similarity (O(M + N))
 * 3. Pharmaceutical Suffix/Prefix Normalization
 */

export interface FuzzyMatchResult<T> {
  item: T;
  score: number; // 0.0 to 1.0 (1.0 = exact match)
  matchedField: string;
  distance: number;
}

/**
 * Calculates Levenshtein edit distance between two strings using 2-row memory optimization.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const str1 = a.length <= b.length ? a : b;
  const str2 = a.length <= b.length ? b : a;

  const len1 = str1.length;
  const len2 = str2.length;

  let prevRow = new Array(len1 + 1);
  let currRow = new Array(len1 + 1);

  for (let i = 0; i <= len1; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= len2; j++) {
    currRow[0] = j;
    const char2 = str2.charCodeAt(j - 1);

    for (let i = 1; i <= len1; i++) {
      const cost = str1.charCodeAt(i - 1) === char2 ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1,      // Deletion
        currRow[i - 1] + 1,  // Insertion
        prevRow[i - 1] + cost // Substitution
      );
    }

    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[len1];
}

/**
 * Computes Normalized Levenshtein Similarity (0.0 to 1.0)
 */
export function calculateLevenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = calculateLevenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Extracts character n-grams from a string.
 */
function extractNgrams(str: string, n: number = 3): Set<string> {
  const ngrams = new Set<string>();
  const padded = `__${str}__`;
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Computes Jaccard Similarity coefficient between n-gram token sets.
 * Jaccard = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(a: string, b: string, n: number = 3): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const ngramsA = extractNgrams(a.toLowerCase(), n);
  const ngramsB = extractNgrams(b.toLowerCase(), n);

  let intersectionSize = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) {
      intersectionSize++;
    }
  }

  const unionSize = ngramsA.size + ngramsB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0.0;
}

/**
 * Normalizes pharmaceutical brand names, salts, and dosage forms for clean matching.
 */
export function normalizePharmaceuticalString(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(tab|tablet|tablets|cap|capsule|capsules|inj|injection|syp|syrup|ointment|gel|suspension)\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|%)?\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches a dataset using composite similarity (Levenshtein + N-Gram Jaccard) with top-K ranking.
 */
export function findBestMatches<T>(
  query: string,
  items: T[],
  fieldExtractor: (item: T) => string,
  minThreshold: number = 0.5,
  limit: number = 5
): FuzzyMatchResult<T>[] {
  const normalizedQuery = normalizePharmaceuticalString(query);
  if (!normalizedQuery) return [];

  const results: FuzzyMatchResult<T>[] = [];

  for (const item of items) {
    const rawTarget = fieldExtractor(item);
    if (!rawTarget) continue;

    const normalizedTarget = normalizePharmaceuticalString(rawTarget);

    // Exact substring fast-path
    if (normalizedTarget.includes(normalizedQuery) || normalizedQuery.includes(normalizedTarget)) {
      const score = Math.max(0.85, calculateLevenshteinSimilarity(normalizedQuery, normalizedTarget));
      results.push({
        item,
        score,
        matchedField: rawTarget,
        distance: calculateLevenshteinDistance(normalizedQuery, normalizedTarget),
      });
      continue;
    }

    // Composite algorithm score: 60% Levenshtein + 40% Jaccard
    const levScore = calculateLevenshteinSimilarity(normalizedQuery, normalizedTarget);
    const jaccardScore = calculateJaccardSimilarity(normalizedQuery, normalizedTarget);
    const compositeScore = Number((levScore * 0.6 + jaccardScore * 0.4).toFixed(4));

    if (compositeScore >= minThreshold) {
      results.push({
        item,
        score: compositeScore,
        matchedField: rawTarget,
        distance: calculateLevenshteinDistance(normalizedQuery, normalizedTarget),
      });
    }
  }

  // Sort descending by score and slice top-K
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
