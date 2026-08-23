/**
 * Cryptographic Tamper-Evident Audit Ledger
 *
 * Implements a verifiable hash chain where each log entry contains:
 * - canonical_payload
 * - previous_hash
 * - current_hash = SHA256(previous_hash + canonical_payload_string + created_at)
 */

import { supabase } from './supabase';
import type { AuditLogRow } from './database.types';

export const GENESIS_HASH = 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';

/**
 * Calculates a SHA-256 hash using Web Crypto API
 */
export async function calculateSha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the expected hash for an audit record given its previous hash, payload, and timestamp
 */
export async function generateRecordHash(
  previousHash: string,
  canonicalPayload: Record<string, unknown>,
  createdAt: string,
): Promise<string> {
  const canonicalString = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
  const input = `${previousHash}${canonicalString}${createdAt}`;
  return calculateSha256(input);
}

/**
 * Appends a tamper-evident audit log record to Supabase
 */
export async function appendAuditLog(entry: {
  orgId?: string | null;
  userId?: string | null;
  eventType: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  canonicalPayload: Record<string, unknown>;
}): Promise<AuditLogRow | null> {
  try {
    // 1. Fetch the latest record in the organization chain
    const query = supabase
      .from('audit_log')
      .select('current_hash')
      .order('sequence_number', { ascending: false })
      .limit(1);

    if (entry.orgId) {
      query.eq('organization_id', entry.orgId);
    }

    const { data: latest } = await query;
    const previousHash = latest && latest.length > 0 ? latest[0].current_hash : GENESIS_HASH;
    const createdAt = new Date().toISOString();

    const currentHash = await generateRecordHash(previousHash, entry.canonicalPayload, createdAt);

    const { data: inserted, error } = await supabase
      .from('audit_log')
      .insert({
        organization_id: entry.orgId || null,
        user_id: entry.userId || null,
        event_type: entry.eventType,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        canonical_payload: entry.canonicalPayload,
        previous_hash: previousHash,
        current_hash: currentHash,
        created_at: createdAt,
      })
      .select()
      .single();

    if (error) {
      console.warn('[AuditLedger] Failed to append audit log:', error.message);
      return null;
    }

    return inserted as AuditLogRow;
  } catch (err) {
    console.warn('[AuditLedger] Error appending audit log:', err);
    return null;
  }
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalVerified: number;
  brokenSequence?: number;
  errorDetail?: string;
}

/**
 * Validates the cryptographic integrity of an array of audit records
 */
export async function verifyLocalAuditChain(records: AuditLogRow[]): Promise<AuditVerificationResult> {
  if (!records || records.length === 0) {
    return { isValid: true, totalVerified: 0 };
  }

  // Sort ascending by sequence
  const sorted = [...records].sort((a, b) => a.sequence_number - b.sequence_number);
  let lastHash = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];

    // Check previous hash link (for records after the first in the slice)
    if (i > 0 && r.previous_hash !== lastHash) {
      return {
        isValid: false,
        totalVerified: i,
        brokenSequence: r.sequence_number,
        errorDetail: `Broken link at sequence #${r.sequence_number}: previous_hash does not match hash of sequence #${sorted[i - 1].sequence_number}`,
      };
    }

    // Recalculate hash of row contents
    const expectedHash = await generateRecordHash(r.previous_hash, r.canonical_payload, r.created_at);
    if (r.current_hash !== expectedHash) {
      return {
        isValid: false,
        totalVerified: i,
        brokenSequence: r.sequence_number,
        errorDetail: `Tampering detected at sequence #${r.sequence_number}: content hash recalculation mismatch.`,
      };
    }

    lastHash = r.current_hash;
  }

  return {
    isValid: true,
    totalVerified: sorted.length,
  };
}
