import { describe, it, expect } from 'vitest';
import { runComplianceChecks } from '../src/lib/complianceEngine';

describe('Pharmaceutical Compliance Rules Engine (CDSCO / WHO)', () => {
  it('correctly identifies Schedule H prescription drugs and flags prescription requirements', () => {
    const result = runComplianceChecks(
      'Amoxicillin 500mg',
      'Cipla Ltd',
      'CIP-2026-0441',
      '2028-06-15',
      'India',
      'Amoxicillin 500mg CIP-2026-0441 Exp: 06/2028 Cipla MRP Rs. 120'
    );

    expect(result.drugSchedule).not.toBeNull();
    expect(result.drugSchedule?.schedule).toBe('H');
    expect(result.drugSchedule?.requiresPrescription).toBe(true);
    expect(result.regulatoryFlags.some(f => f.includes('Schedule H: Prescription required'))).toBe(true);
    expect(result.regulatoryFlags.some(f => f.includes('Schedule H/H1 Warning'))).toBe(true);
  });

  it('correctly identifies Schedule H1 restricted habit-forming drugs', () => {
    const result = runComplianceChecks(
      'Alprazolam 0.5mg',
      'Torrent Pharma',
      'TOR-2026-1100',
      '2027-10-01',
      'India'
    );

    expect(result.drugSchedule?.schedule).toBe('H1');
    expect(result.drugSchedule?.requiresPrescription).toBe(true);
    expect(result.regulatoryFlags.some(f => f.includes('Schedule H1: Pharmacist must maintain sales record'))).toBe(true);
  });

  it('correctly identifies Schedule X narcotics with double-lock storage requirements', () => {
    const result = runComplianceChecks(
      'Morphine 10mg',
      'Hospital Labs',
      'MOR-2026-0001',
      '2027-05-15',
      'India'
    );

    expect(result.drugSchedule?.schedule).toBe('X');
    expect(result.regulatoryFlags.some(f => f.includes('Schedule X: Narcotic'))).toBe(true);
  });

  it('correctly flags WHO Model List of Essential Medicines', () => {
    const paracetamol = runComplianceChecks('Paracetamol 500mg', 'Cipla', 'CIP-2026-1000', '2028-01-01', 'India');
    expect(paracetamol.isWHOEssential).toBe(true);

    const nonEssential = runComplianceChecks('CustomCompoundXYZ', 'Lab', 'LAB-100', '2028-01-01', 'India');
    expect(nonEssential.isWHOEssential).toBe(false);
  });

  it('identifies expired medicines and generates critical violation flags', () => {
    const pastDate = '2020-01-01';
    const result = runComplianceChecks(
      'Paracetamol 500mg',
      'Cipla',
      'CIP-2026-0441',
      pastDate,
      'India',
      'Paracetamol 500mg CIP-2026-0441 exp 2020 Cipla mrp 50'
    );

    expect(result.regulatoryFlags.some(f => f.includes('EXPIRED') && f.includes('Section 18'))).toBe(true);
    expect(result.status).not.toBe('COMPLIANT');
  });

  it('validates batch number regex patterns', () => {
    const validStandard = runComplianceChecks('Paracetamol', 'Cipla', 'CIP-2026-0441', '2028-01-01', 'India');
    expect(validStandard.batchValidation.formatValid).toBe(true);

    const invalidFormat = runComplianceChecks('Paracetamol', 'Cipla', '!!!INVALID_BATCH!!!', '2028-01-01', 'India');
    expect(invalidFormat.batchValidation.formatValid).toBe(false);
    expect(invalidFormat.regulatoryFlags.some(f => f.includes('Batch number format does not match'))).toBe(true);
  });

  it('caps score at 75 when no image OCR data is supplied', () => {
    const resultWithoutOcr = runComplianceChecks('Paracetamol 500mg', 'Cipla', 'CIP-2026-0441', '2028-01-01', 'India');
    expect(resultWithoutOcr.overallScore).toBeLessThanOrEqual(75);
  });
});
