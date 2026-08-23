/**
 * Regulatory Incident & Quarantine Review Dispatch System
 *
 * ARCHITECTURE PRINCIPLE:
 * Never claim autonomous regulatory filing. Any CDSCO Form 19 / quarantine action
 * is created as a DRAFT that lands in the `review_queue` table with an explicit
 * reviewer sign-off requirement before being marked as actioned.
 */

import { supabase } from './supabase';
import { appendAuditLog } from './auditLedger';
import type { VerificationResult } from './verificationEngine';
import type { ComplianceResult } from './complianceEngine';

// ─── Types ────────────────────────────────────────────────────────

export interface AlertAction {
  id: string;
  type: 'QUARANTINE' | 'REGULATORY_REPORT' | 'ALERT_NOTIFICATION' | 'ESCALATION' | 'BATCH_RECALL';
  status: 'draft_pending_review' | 'completed' | 'queued';
  timestamp: string;
  description: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reviewQueueId?: string;
}

export interface AutonomousActionResult {
  actions: AlertAction[];
  totalActionsTriggered: number;
  regulatoryReport: string | null;
  quarantineOrder: string | null;
  requiresReview: boolean;
}

function generateId(): string {
  return `ACT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Evaluates verification & compliance results and dispatches drafts into the Human Review Queue
 */
export async function executeAutonomousActions(
  verification: VerificationResult,
  compliance: ComplianceResult | null,
  medicineName: string,
  manufacturer: string,
  batchNumber: string,
  userId: string,
  orgId?: string,
): Promise<AutonomousActionResult> {
  console.log('%c[Review & Alert System] 📋 Preparing drafts for human review queue...', 'color: #DC2626; font-weight: bold');

  const actions: AlertAction[] = [];
  let regulatoryReport: string | null = null;
  let quarantineOrder: string | null = null;
  let requiresReview = false;

  const now = new Date().toISOString();

  // 1. COUNTERFEIT → Full draft response for human sign-off
  if (verification.verdict === 'COUNTERFEIT') {
    requiresReview = true;

    // Quarantine order draft
    const qId = generateId();
    quarantineOrder = generateQuarantineOrder(qId, medicineName, manufacturer, batchNumber, verification);

    const { data: qRow } = await supabase
      .from('review_queue')
      .insert({
        organization_id: orgId || null,
        report_id: verification.report_id,
        medicine_name: medicineName,
        manufacturer,
        batch_number: batchNumber || null,
        draft_type: 'quarantine_order',
        draft_title: `Quarantine Order Draft: ${medicineName} (Batch: ${batchNumber || 'N/A'})`,
        draft_content: quarantineOrder,
        risk_score: verification.risk_score,
        status: 'pending_review',
      })
      .select('id')
      .maybeSingle();

    actions.push({
      id: qId,
      type: 'QUARANTINE',
      status: 'draft_pending_review',
      timestamp: now,
      description: `Quarantine order draft created for batch ${batchNumber || 'UNKNOWN'}`,
      details: `Drafted immediate isolation notice for ${medicineName} (${manufacturer}). Sent to Human Review Queue for pharmacist/regulator sign-off.`,
      severity: 'critical',
      reviewQueueId: qRow?.id,
    });

    // Regulatory report draft (CDSCO Form 19)
    const rId = generateId();
    regulatoryReport = generateRegulatoryReport(rId, medicineName, manufacturer, batchNumber, verification, compliance);

    const { data: rRow } = await supabase
      .from('review_queue')
      .insert({
        organization_id: orgId || null,
        report_id: verification.report_id,
        medicine_name: medicineName,
        manufacturer,
        batch_number: batchNumber || null,
        draft_type: 'cdsco_form_19',
        draft_title: `CDSCO Form 19 Incident Report Draft: ${medicineName}`,
        draft_content: regulatoryReport,
        risk_score: verification.risk_score,
        status: 'pending_review',
      })
      .select('id')
      .maybeSingle();

    actions.push({
      id: rId,
      type: 'REGULATORY_REPORT',
      status: 'draft_pending_review',
      timestamp: now,
      description: 'CDSCO Form 19 counterfeit medicine draft report generated',
      details: 'Drafted regulatory incident report for CDSCO submission. Requires compliance officer signature prior to external submission.',
      severity: 'critical',
      reviewQueueId: rRow?.id,
    });

    // Internal stakeholder alert
    actions.push({
      id: generateId(),
      type: 'ALERT_NOTIFICATION',
      status: 'completed',
      timestamp: now,
      description: 'Internal threat notification broadcast',
      details: `High-priority verification alert logged for ${medicineName}.`,
      severity: 'critical',
    });
  }

  // 2. SUSPICIOUS → Escalation draft
  else if (verification.verdict === 'SUSPICIOUS') {
    requiresReview = true;

    actions.push({
      id: generateId(),
      type: 'ALERT_NOTIFICATION',
      status: 'completed',
      timestamp: now,
      description: `Suspicious medicine flagged: ${medicineName}`,
      details: `Medicine flagged for inspection. Confidence: ${verification.confidence}%, Risk: ${verification.risk_score}/100.`,
      severity: 'high',
    });

    const escContent = `Case escalated for manual inspection.\nMedicine: ${medicineName}\nBatch: ${batchNumber || 'N/A'}\nRisk Score: ${verification.risk_score}/100\nSummary: ${verification.summary}`;
    const { data: escRow } = await supabase
      .from('review_queue')
      .insert({
        organization_id: orgId || null,
        report_id: verification.report_id,
        medicine_name: medicineName,
        manufacturer,
        batch_number: batchNumber || null,
        draft_type: 'compliance_escalation',
        draft_title: `Suspicious Flag Review: ${medicineName}`,
        draft_content: escContent,
        risk_score: verification.risk_score,
        status: 'pending_review',
      })
      .select('id')
      .maybeSingle();

    actions.push({
      id: generateId(),
      type: 'ESCALATION',
      status: 'draft_pending_review',
      timestamp: now,
      description: 'Escalated to senior pharmacist for manual review',
      details: 'Automated verification was inconclusive. Dispatched to review queue with evidence.',
      severity: 'high',
      reviewQueueId: escRow?.id,
    });
  }

  // 3. Append to Tamper-Evident Hash-Chained Audit Ledger
  await appendAuditLog({
    orgId,
    userId,
    eventType: 'VERIFICATION_ACTIONS_EVALUATED',
    action: verification.verdict,
    resourceType: 'verifications',
    resourceId: verification.report_id,
    canonicalPayload: {
      reportId: verification.report_id,
      verdict: verification.verdict,
      riskScore: verification.risk_score,
      totalActions: actions.length,
      requiresReview,
      medicineName,
      batchNumber,
    },
  });

  return {
    actions,
    totalActionsTriggered: actions.length,
    regulatoryReport,
    quarantineOrder,
    requiresReview,
  };
}

// ─── Report Draft Generators ──────────────────────────────────────

function generateQuarantineOrder(
  orderId: string,
  medicineName: string,
  manufacturer: string,
  batchNumber: string,
  verification: VerificationResult,
): string {
  return `
╔══════════════════════════════════════════════════════════╗
║    DRAFT QUARANTINE ORDER — PENDING HUMAN SIGN-OFF       ║
╠══════════════════════════════════════════════════════════╣
║ Draft Order ID: ${orderId.padEnd(41)}║
║ Date Generated: ${new Date().toISOString().padEnd(41)}║
║ Review Status:  PENDING REVIEWER SIGN-OFF               ║
╠══════════════════════════════════════════════════════════╣
║ PRODUCT DETAILS                                          ║
║ Medicine:       ${medicineName.padEnd(41)}║
║ Manufacturer:   ${manufacturer.padEnd(41)}║
║ Batch Number:   ${(batchNumber || 'UNKNOWN').padEnd(41)}║
║ AI Verdict:     ${verification.verdict.padEnd(41)}║
║ Risk Score:     ${(verification.risk_score + '/100').padEnd(41)}║
╠══════════════════════════════════════════════════════════╣
║ RECOMMENDED ACTIONS (Upon Human Officer Approval)        ║
║ 1. Isolate units in physical quarantine holding area     ║
║ 2. Halt distribution and retail sales                    ║
║ 3. Notify District Drug Inspector through formal channels║
║ 4. Preserve samples for Government Analyst testing       ║
╠══════════════════════════════════════════════════════════╣
║ STATUTORY BASIS: Drugs & Cosmetics Act, 1940 (Sec 18)   ║
║ NOTICE: This document is an AI-assisted draft. Formal    ║
║ execution requires authorized sign-off in Review Queue.  ║
╚══════════════════════════════════════════════════════════╝
`.trim();
}

function generateRegulatoryReport(
  reportId: string,
  medicineName: string,
  manufacturer: string,
  batchNumber: string,
  verification: VerificationResult,
  compliance: ComplianceResult | null,
): string {
  const flags = compliance?.regulatoryFlags || [];
  const notes = compliance?.complianceNotes || [];

  return `
═══════════════════════════════════════════════════════════
   DRAFT REGULATORY INCIDENT REPORT — CDSCO Form 19
   (Requires Human Sign-off Before Regulatory Submission)
═══════════════════════════════════════════════════════════

Report ID:      ${reportId}
Generated:      ${new Date().toISOString()}
Classification: ${verification.verdict === 'COUNTERFEIT' ? 'SUSPECTED COUNTERFEIT' : 'COMPLIANCE VIOLATION'}
Status:         DRAFT — PENDING HUMAN SIGN-OFF

───────────────────────────────────────────────────────────
PRODUCT INFORMATION
───────────────────────────────────────────────────────────
Product Name:     ${medicineName}
Manufacturer:     ${manufacturer}
Batch/Lot Number: ${batchNumber || 'Not available'}
Drug Schedule:    ${compliance?.drugSchedule?.schedule || 'Not classified'}
WHO Essential:    ${compliance?.isWHOEssential ? 'Yes' : 'No'}

───────────────────────────────────────────────────────────
MULTI-AGENT VERIFICATION FINDINGS
───────────────────────────────────────────────────────────
AI Verdict:       ${verification.verdict}
Confidence:       ${verification.confidence}%
Risk Score:       ${verification.risk_score}/100
Summary:          ${verification.summary}

───────────────────────────────────────────────────────────
COMPLIANCE EVALUATION
───────────────────────────────────────────────────────────
Overall Score:    ${compliance?.overallScore || 'N/A'}/100
Status:           ${compliance?.status || 'Not assessed'}

Regulatory Flags:
${flags.map((f, i) => `  ${i + 1}. ${f}`).join('\n') || '  None'}

Compliance Notes:
${notes.map((n, i) => `  ${i + 1}. ${n}`).join('\n') || '  None'}

───────────────────────────────────────────────────────────
RECOMMENDED REGULATORY NEXT STEPS
───────────────────────────────────────────────────────────
  1. Authorized Pharmacist/Officer must review and sign draft
  2. Transmit formal Form 19 dossier to District Drug Inspector
  3. Submit batch samples for laboratory chromatography testing
═══════════════════════════════════════════════════════════
  NOTICE: Generated by MediChain AI Review Assistant.
  Not submitted to regulatory authorities without signature.
═══════════════════════════════════════════════════════════
`.trim();
}

export function downloadReport(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
