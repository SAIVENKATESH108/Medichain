import { describe, it, expect, vi } from 'vitest';
import { executeAutonomousActions } from '../src/lib/alertSystem';
import type { VerificationResult } from '../src/lib/verificationEngine';
import type { ComplianceResult } from '../src/lib/complianceEngine';

// Mock Supabase calls in alertSystem
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'mock-review-id' }, error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'mock-review-id' }, error: null }),
        })),
        then: vi.fn((resolve) => resolve({ data: null, error: null })),
      })),
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  },
}));

describe('Action & Alert Generation Invariants', () => {
  const mockCompliance: ComplianceResult = {
    overallScore: 35,
    status: 'NON_COMPLIANT',
    drugSchedule: {
      schedule: 'H',
      description: 'Schedule H antibiotic',
      restrictions: ['Prescription required'],
      requiresPrescription: true,
      labelRequirements: ['Rx symbol'],
    },
    isWHOEssential: true,
    labelChecks: [],
    batchValidation: {
      formatValid: false,
      matchedPattern: null,
      notes: 'Format mismatch',
    },
    regulatoryFlags: ['⛔ EXPIRED 100 days ago', '⚠️ Unrecognized batch pattern'],
    complianceNotes: ['Checked against CDSCO rules'],
  };

  it('generates draft quarantine orders and CDSCO Form 19 regulatory incident drafts for COUNTERFEIT verdict', async () => {
    const mockVerification: VerificationResult = {
      verdict: 'COUNTERFEIT',
      confidence: 96,
      risk_score: 95,
      summary: 'Packaging mismatch and unregistered batch number.',
      visual_analysis: { score: 20, findings: ['Inconsistent typography'] },
      supply_chain_check: { score: 10, status: 'Broken chain of custody', flags: ['Missing customs scan'] },
      batch_verification: { registered: false, database: 'CDSCO/OpenFDA', notes: 'Batch not recognized' },
      recommendations: ['Quarantine all units immediately', 'Notify regulatory authority'],
      report_id: 'RPT-TEST01',
    };

    const actionResult = await executeAutonomousActions(
      mockVerification,
      mockCompliance,
      'Amoxicillin 500mg',
      'Suspicious Labs',
      'UNK-9999',
      'test-user-id'
    );

    expect(actionResult.totalActionsTriggered).toBeGreaterThanOrEqual(3);
    expect(actionResult.quarantineOrder).not.toBeNull();
    expect(actionResult.quarantineOrder).toContain('QUARANTINE ORDER');
    expect(actionResult.quarantineOrder).toContain('Suspicious Labs');
    expect(actionResult.quarantineOrder).toContain('UNK-9999');

    expect(actionResult.quarantineOrder).toContain('Drugs & Cosmetics Act');

    expect(actionResult.regulatoryReport).not.toBeNull();
    expect(actionResult.regulatoryReport).toContain('CDSCO Form 19');
    expect(actionResult.regulatoryReport).toContain('SUSPECTED COUNTERFEIT');
    expect(actionResult.regulatoryReport).toContain('District Drug Inspector');

    // Confirm that action types are generated
    const actionTypes = actionResult.actions.map(a => a.type);
    expect(actionTypes).toContain('QUARANTINE');
    expect(actionTypes).toContain('REGULATORY_REPORT');
    expect(actionTypes).toContain('ALERT_NOTIFICATION');
  });

  it('generates escalation and alert notices for SUSPICIOUS verdict', async () => {
    const mockVerification: VerificationResult = {
      verdict: 'SUSPICIOUS',
      confidence: 72,
      risk_score: 60,
      summary: 'Discrepancy detected in label print quality.',
      visual_analysis: { score: 65, findings: ['Blurry text'] },
      supply_chain_check: { score: 70, status: 'Verified', flags: [] },
      batch_verification: { registered: true, database: 'Local DB', notes: 'Batch verified' },
      recommendations: ['Secondary inspection advised'],
      report_id: 'RPT-TEST02',
    };

    const actionResult = await executeAutonomousActions(
      mockVerification,
      mockCompliance,
      'Insulin Glargine',
      'Sanofi',
      'SNF-2026-001',
      'test-user-id'
    );

    const actionTypes = actionResult.actions.map(a => a.type);
    expect(actionTypes).toContain('ALERT_NOTIFICATION');
    expect(actionTypes).toContain('ESCALATION');
  });
});
