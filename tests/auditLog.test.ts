import { describe, it, expect } from 'vitest';
import {
  GENESIS_HASH,
  generateRecordHash,
  verifyLocalAuditChain,
} from '../src/lib/auditLedger';
import type { AuditLogRow } from '../src/lib/database.types';

describe('Tamper-Evident Hash-Chained Audit Ledger', () => {
  it('validates an untampered hash chain', async () => {
    const time1 = '2026-08-23T10:00:00.000Z';
    const payload1 = { event: 'VERIFICATION_CREATED', report_id: 'RPT-001', verdict: 'VERIFIED' };
    const hash1 = await generateRecordHash(GENESIS_HASH, payload1, time1);

    const record1: AuditLogRow = {
      id: 'uuid-1',
      sequence_number: 1,
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'VERIFICATION',
      action: 'CREATE',
      resource_type: 'verifications',
      resource_id: 'RPT-001',
      canonical_payload: payload1,
      previous_hash: GENESIS_HASH,
      current_hash: hash1,
      created_at: time1,
    };

    const time2 = '2026-08-23T10:01:00.000Z';
    const payload2 = { event: 'REVIEW_SUBMITTED', report_id: 'RPT-001', status: 'pending_review' };
    const hash2 = await generateRecordHash(hash1, payload2, time2);

    const record2: AuditLogRow = {
      id: 'uuid-2',
      sequence_number: 2,
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'REVIEW',
      action: 'SUBMIT',
      resource_type: 'review_queue',
      resource_id: 'REV-001',
      canonical_payload: payload2,
      previous_hash: hash1,
      current_hash: hash2,
      created_at: time2,
    };

    const result = await verifyLocalAuditChain([record1, record2]);
    expect(result.isValid).toBe(true);
    expect(result.totalVerified).toBe(2);
  });

  it('detects tampering when payload content is modified', async () => {
    const time1 = '2026-08-23T10:00:00.000Z';
    const originalPayload = { event: 'VERIFICATION_CREATED', report_id: 'RPT-001', verdict: 'COUNTERFEIT' };
    const hash1 = await generateRecordHash(GENESIS_HASH, originalPayload, time1);

    const record1: AuditLogRow = {
      id: 'uuid-1',
      sequence_number: 1,
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'VERIFICATION',
      action: 'CREATE',
      resource_type: 'verifications',
      resource_id: 'RPT-001',
      // Attacker altered payload to 'VERIFIED' without recalculating hash chain
      canonical_payload: { event: 'VERIFICATION_CREATED', report_id: 'RPT-001', verdict: 'VERIFIED' },
      previous_hash: GENESIS_HASH,
      current_hash: hash1,
      created_at: time1,
    };

    const result = await verifyLocalAuditChain([record1]);
    expect(result.isValid).toBe(false);
    expect(result.errorDetail).toContain('Tampering detected');
  });

  it('detects tampering when a record in the middle of the chain is deleted or missing', async () => {
    const time1 = '2026-08-23T10:00:00.000Z';
    const payload1 = { step: 1 };
    const hash1 = await generateRecordHash(GENESIS_HASH, payload1, time1);

    const time2 = '2026-08-23T10:01:00.000Z';
    const payload2 = { step: 2 };
    const hash2 = await generateRecordHash(hash1, payload2, time2);

    const time3 = '2026-08-23T10:02:00.000Z';
    const payload3 = { step: 3 };
    const hash3 = await generateRecordHash(hash2, payload3, time3);

    const record1: AuditLogRow = {
      id: 'uuid-1', sequence_number: 1, organization_id: 'org-1', user_id: 'user-1',
      event_type: 'E1', action: 'A1', resource_type: 'R1', resource_id: null,
      canonical_payload: payload1, previous_hash: GENESIS_HASH, current_hash: hash1, created_at: time1,
    };

    const record3: AuditLogRow = {
      id: 'uuid-3', sequence_number: 3, organization_id: 'org-1', user_id: 'user-1',
      event_type: 'E3', action: 'A3', resource_type: 'R3', resource_id: null,
      canonical_payload: payload3, previous_hash: hash2, current_hash: hash3, created_at: time3,
    };

    // record2 omitted (deleted)
    const result = await verifyLocalAuditChain([record1, record3]);
    expect(result.isValid).toBe(false);
    expect(result.errorDetail).toContain('Broken link');
  });
});
