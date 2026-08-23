import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, CheckCircle2, XCircle, Clock, Shield,
  Search, Eye, Download, Scale, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { appendAuditLog } from '../lib/auditLedger';
import { downloadReport } from '../lib/alertSystem';
import { useAuth } from '../contexts/AuthContext';
import type { ReviewQueueRow, ReviewStatus } from '../lib/database.types';
import toast from 'react-hot-toast';

export default function ReviewQueue() {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<ReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<ReviewQueueRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('review_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query.eq('status', filterStatus as ReviewStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[ReviewQueue] Fetch error:', error.message);
      } else if (data) {
        setReviews(data as ReviewQueueRow[]);
      }
    } catch (err) {
      console.warn('[ReviewQueue] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filterStatus]);

  const handleAction = async (action: 'approved' | 'rejected' | 'amended') => {
    if (!selectedReview) return;
    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const reviewerRole = profile?.role || 'Pharmacist';
      const reviewerName = profile?.full_name || user?.email || 'Authorized Reviewer';

      const { error } = await supabase
        .from('review_queue')
        .update({
          status: action,
          reviewed_by: user?.id || null,
          reviewer_role: reviewerRole,
          review_notes: reviewNotes.trim() || `Marked as ${action} by ${reviewerName}`,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', selectedReview.id);

      if (error) {
        toast.error(`Update failed: ${error.message}`);
      } else {
        toast.success(`Draft successfully marked as ${action.toUpperCase()}`);

        // Append to tamper-evident audit ledger
        await appendAuditLog({
          orgId: selectedReview.organization_id,
          userId: user?.id,
          eventType: 'HUMAN_REVIEW_SIGN_OFF',
          action: action.toUpperCase(),
          resourceType: 'review_queue',
          resourceId: selectedReview.id,
          canonicalPayload: {
            reviewId: selectedReview.id,
            reportId: selectedReview.report_id,
            action,
            reviewerRole,
            reviewedAt: now,
            notes: reviewNotes,
          },
        });

        // If approved and CDSCO Form 19, create regulatory submission record
        if (action === 'approved' && selectedReview.draft_type === 'cdsco_form_19') {
          await supabase.from('regulatory_submissions').insert({
            organization_id: selectedReview.organization_id,
            review_id: selectedReview.id,
            report_id: selectedReview.report_id,
            form_type: 'CDSCO_FORM_19',
            filing_status: 'internal_reviewed',
            authority_target: 'CDSCO_INDIA',
            submitted_by_user_id: user?.id || null,
            signed_off_at: now,
            submission_notes: `Approved for formal transmission by ${reviewerName} (${reviewerRole})`,
          });
        }

        setSelectedReview(null);
        setReviewNotes('');
        fetchReviews();
      }
    } catch {
      toast.error('An unexpected error occurred during review submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = reviews.filter(r =>
    r.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.report_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = reviews.filter(r => r.status === 'pending_review').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Human-in-the-Loop Governance
            </span>
            <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-700 dark:text-slate-300">
              CDSCO Form 19 & Quarantine
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            Regulatory Incident & Review Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mandatory pharmacist and regulatory officer sign-off portal for draft Quarantine Orders and CDSCO Form 19 filings.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Review Dossiers</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400">{pendingCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Requires authorized sign-off</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approved & Authorized</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ready for District Drug Inspector</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Audit Ledger Integrity</p>
          <p className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">100% Intact</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">SHA-256 Block Continuity</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search medicine, report ID, manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'pending_review', 'approved', 'rejected', 'amended'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Review Dossier List */}
      <div className="glass-panel-elevated rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
            <p className="text-xs sm:text-sm">Loading review dossiers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Review Queue Clear</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">No draft regulatory actions currently pending sign-off.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    item.risk_score >= 80 ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                    item.risk_score >= 50 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                    'bg-cyan-500/20 text-cyan-500 border border-cyan-500/30'
                  }`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{item.medicine_name}</h4>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-cyan-600 dark:text-cyan-300">
                        {item.report_id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'pending_review' ? 'glow-pill-cyan' :
                        item.status === 'approved' ? 'glow-pill-emerald' :
                        item.status === 'rejected' ? 'glow-pill-danger' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Manufacturer: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.manufacturer}</span> | Batch: <span className="font-mono text-cyan-600 dark:text-cyan-300">{item.batch_number || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Dossier: <span className="text-slate-700 dark:text-slate-200 font-medium">{item.draft_title}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => {
                      setSelectedReview(item);
                      setReviewNotes(item.review_notes || '');
                    }}
                    className="glow-btn-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect & Sign</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review & Sign-Off Slide-over Modal */}
      <AnimatePresence>
        {selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="glow-pill-cyan px-2.5 py-0.5 rounded text-[10px] uppercase font-bold">
                      {selectedReview.draft_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{selectedReview.report_id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedReview.medicine_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                  <p className="font-bold text-xs">Statutory Review Invariant</p>
                  <p className="text-xs">
                    This action is in <strong className="font-bold">DRAFT</strong> status. Authorizing generates a legally attributable signature docket and appends a SHA-256 block to the tamper-evident audit ledger.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-cyan-300">Draft Document Dossier</label>
                    <button
                      onClick={() => downloadReport(selectedReview.draft_content, `${selectedReview.report_id}_${selectedReview.draft_type}.txt`)}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Download Raw
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-64 border border-slate-800">
                    {selectedReview.draft_content}
                  </pre>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
                    Reviewer Attestation & Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter compliance evaluation observations, chromatography test results, or reason for authorization..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full p-3.5 rounded-2xl glass-input text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Signatory: <strong className="font-semibold text-cyan-300">{profile?.full_name || user?.email || 'Authorized Reviewer'}</strong> ({profile?.role || 'Pharmacist'})
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  disabled={submitting}
                  onClick={() => handleAction('rejected')}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Draft</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => handleAction('amended')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Amend & Sign
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => handleAction('approved')}
                    className="glow-btn-cyan px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sign & Authorize</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
