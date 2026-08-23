import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkExpiryDate,
  verifyManufacturer,
  searchFDADrug,
  searchFDARecalls,
  runDatabaseChecks,
} from '../src/lib/drugDatabase';

describe('Drug Database Integration (OpenFDA & Expiry / Manufacturer Verifications)', () => {
  describe('checkExpiryDate', () => {
    it('detects already expired dates correctly', () => {
      const result = checkExpiryDate('2020-01-01');
      expect(result.isExpired).toBe(true);
      expect(result.daysUntilExpiry).toBeLessThan(0);
      expect(result.warning).toContain('EXPIRED');
    });

    it('warns when expiry is within 30 days', () => {
      const nearFuture = new Date();
      nearFuture.setDate(nearFuture.getDate() + 15);
      const dateStr = nearFuture.toISOString().split('T')[0];

      const result = checkExpiryDate(dateStr);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(30);
      expect(result.warning).toContain('Expires in');
    });

    it('passes for valid future dates > 90 days', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 365);
      const dateStr = farFuture.toISOString().split('T')[0];

      const result = checkExpiryDate(dateStr);
      expect(result.isExpired).toBe(false);
      expect(result.warning).toBeNull();
    });

    it('handles empty or unparseable expiry dates gracefully', () => {
      const emptyResult = checkExpiryDate('');
      expect(emptyResult.isExpired).toBe(false);
      expect(emptyResult.warning).toContain('No expiry date provided');
    });
  });

  describe('verifyManufacturer', () => {
    it('recognizes verified global and Indian pharmaceutical manufacturers (exact/partial match)', () => {
      const cipla = verifyManufacturer('Cipla Ltd');
      expect(cipla.found).toBe(true);
      expect(cipla.matchScore).toBe(100);

      const pfizer = verifyManufacturer('Pfizer Pharmaceuticals');
      expect(pfizer.found).toBe(true);
      expect(pfizer.matchScore).toBe(100);

      const sunPharma = verifyManufacturer('Sun Pharma Laboratories');
      expect(sunPharma.found).toBe(true);
      expect(sunPharma.matchScore).toBeGreaterThanOrEqual(70);
    });

    it('flags unverified or fake manufacturers', () => {
      const fake = verifyManufacturer('Unknown Underground Labs LLC');
      expect(fake.found).toBe(false);
      expect(fake.matchScore).toBe(0);
      expect(fake.notes).toContain('not found in known pharmaceutical manufacturers database');
    });

    it('handles empty manufacturer strings safely', () => {
      const empty = verifyManufacturer('');
      expect(empty.found).toBe(false);
      expect(empty.matchScore).toBe(0);
    });
  });

  describe('searchFDADrug & searchFDARecalls with mocked network', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('parses valid OpenFDA drug lookup responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              brand_name: 'Lipitor',
              generic_name: 'Atorvastatin Calcium',
              labeler_name: 'Pfizer Laboratories Div Pfizer Inc',
              product_ndc: '0069-0155',
              dosage_form: 'TABLET, FILM COATED',
              route: ['ORAL'],
              active_ingredients: [{ name: 'ATORVASTATIN CALCIUM' }],
            },
          ],
        }),
      });

      const drug = await searchFDADrug('Atorvastatin');
      expect(drug.found).toBe(true);
      expect(drug.brand_name).toBe('Lipitor');
      expect(drug.product_ndc).toBe('0069-0155');
      expect(drug.active_ingredients).toEqual(['ATORVASTATIN CALCIUM']);
    });

    it('handles 404 (not in US FDA database) without throwing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const drug = await searchFDADrug('NonExistentDrug');
      expect(drug.found).toBe(false);
    });

    it('handles network error in searchFDARecalls gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const recalls = await searchFDARecalls('Amoxicillin', 'Cipla');
      expect(recalls.found).toBe(false);
      expect(recalls.recalls).toEqual([]);
    });

    it('runs aggregate runDatabaseChecks pipeline in parallel', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await runDatabaseChecks('Paracetamol', 'Cipla Ltd', '2028-10-01');
      expect(result).toHaveProperty('fdaDrug');
      expect(result).toHaveProperty('fdaRecalls');
      expect(result).toHaveProperty('expiryCheck');
      expect(result).toHaveProperty('manufacturerCheck');
      expect(result.manufacturerCheck.found).toBe(true);
      expect(result.expiryCheck.isExpired).toBe(false);
    });
  });
});
