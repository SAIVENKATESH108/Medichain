import { describe, it, expect } from 'vitest';
import {
  calculateLevenshteinDistance,
  calculateLevenshteinSimilarity,
  calculateJaccardSimilarity,
  normalizePharmaceuticalString,
  findBestMatches,
} from '../src/lib/algorithms/fuzzyMatcher';

describe('Pharmaceutical Fuzzy Matching Algorithms', () => {
  it('calculates exact and edit Levenshtein distances correctly', () => {
    expect(calculateLevenshteinDistance('Cipla', 'Cipla')).toBe(0);
    expect(calculateLevenshteinDistance('Cipla', 'Ciplaa')).toBe(1);
    expect(calculateLevenshteinDistance('Paracetamol', 'Paracetmol')).toBe(1);
    expect(calculateLevenshteinDistance('Amoxicillin', 'Azithromycin')).toBeGreaterThan(5);
  });

  it('computes normalized Levenshtein similarity (0.0 - 1.0)', () => {
    expect(calculateLevenshteinSimilarity('Cipla', 'Cipla')).toBe(1.0);
    expect(calculateLevenshteinSimilarity('Paracetamol 500mg', 'Paracetamol 650mg')).toBeGreaterThan(0.8);
    expect(calculateLevenshteinSimilarity('Aspirin', 'Xanax')).toBeLessThan(0.4);
  });

  it('computes N-gram Jaccard similarity', () => {
    const similarity = calculateJaccardSimilarity('Amoxicillin Trihydrate', 'Amoxicillin Potassium');
    expect(similarity).toBeGreaterThan(0.3);
  });

  it('normalizes pharma names by stripping dosage and suffixes', () => {
    expect(normalizePharmaceuticalString('Augmentin 625 Duo Tablet')).toBe('augmentin duo');
    expect(normalizePharmaceuticalString('Paracetamol 500 mg IP')).toBe('paracetamol ip');
    expect(normalizePharmaceuticalString('Cipla-Gen / 10ml Inj')).toBe('cipla gen');
  });

  it('performs ranked top-k fuzzy dataset search', () => {
    const dataset = [
      { name: 'Augmentin 625mg Tablet', salt: 'Amoxicillin + Clavulanic Acid' },
      { name: 'Amoxyclav 625', salt: 'Amoxicillin Clavulanate' },
      { name: 'Azithral 500', salt: 'Azithromycin' },
      { name: 'Ciplox 500', salt: 'Ciprofloxacin' },
    ];

    const matches = findBestMatches('Augmentin 625', dataset, (item) => item.name);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].item.name).toBe('Augmentin 625mg Tablet');
    expect(matches[0].score).toBeGreaterThan(0.8);
  });
});
