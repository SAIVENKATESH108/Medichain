import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Download, X,
  Eye, Lock, Activity, CheckCircle2
} from 'lucide-react';
import { mockReports } from '../data/mockData';
import type { MockReport } from '../data/mockData';
import type { Verification } from '../lib/database.types';
import { formatDate, downloadCsv } from '../lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Reports() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('All');
  const [selectedReport, setSelectedReport] = useState<MockReport | null>(null);
  const [page, setPage] = useState(1);
  const [dbReports, setDbReports] = useState<MockReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const perPage = 10;

  useEffect(() => {
    let cancelled = false;

    async function fetchReports() {
      setLoading(true);

      try {
        const query = supabase
          .from('verifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (user?.id) {
          query.or(`user_id.eq.${user.id},user_id.is.null`);
        }

        const { data, error } = await query;

        if (cancelled) return;

        if (error) {
          console.warn('[Reports] Fetch error:', error.message);
          setDbReports([]);
          setUsingMockData(true);
        } else if (data && data.length > 0) {
          const mapped: MockReport[] = data.map((row: Verification) => ({
            id: row.report_id || row.id,
            medicineName: row.medicine_name || '',
            manufacturer: row.manufacturer || '',
            batchNumber: row.batch_number || '',
            verdict: row.verdict || 'SUSPICIOUS',
            confidence: row.confidence ?? 0,
            riskScore: row.risk_score ?? 0,
            country: row.country || '',
            date: row.created_at || '',
            expiryDate: row.expiry_date || '',
          }));
          setDbReports(mapped);
          setUsingMockData(false);
        } else {
          setDbReports([]);
          setUsingMockData(false);
        }
      } catch {
        setDbReports([]);
        setUsingMockData(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => { cancelled = true; };
  }, [user?.id]);

  const allReports = usingMockData ? mockReports : dbReports;

  const filtered = allReports.filter((r) => {
    const matchesSearch =
      r.medicineName.toLowerCase().includes(search.toLowerCase()) ||
      r.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      r.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchesVerdict = verdictFilter === 'All' || r.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No reports to export');
      return;
    }
    const headers = [
      { key: 'id', label: 'Report ID' },
      { key: 'medicineName', label: 'Medicine Name' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'verdict', label: 'Verdict' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'riskScore', label: 'Risk Score' },
      { key: 'country', label: 'Country' },
      { key: 'date', label: 'Date' },
    ];
    const rows = filtered.map((r) => ({
      id: r.id,
      medicineName: r.medicineName,
      manufacturer: r.manufacturer,
      batchNumber: r.batchNumber,
      verdict: r.verdict,
      confidence: `${r.confidence}%`,
      riskScore: `${r.riskScore}/100`,
      country: r.country,
      date: formatDate(r.date),
    }));
    downloadCsv(rows, headers, `medichain-audit-reports-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Audit report CSV exported successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Cryptographic Audit Records
            </span>
            <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
              {filtered.length} Dossiers Found
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Verification Records & Compliance Dossiers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Historical audit logs with full data provenance, CDSCO schedule classifications, and immutable ledger proofs.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="glow-btn-cyan px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Dossier</span>
        </button>
      </div>

      {/* Search & Filter Card */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, medicine, batch..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['All', 'VERIFIED', 'SUSPICIOUS', 'COUNTERFEIT'].map((v) => (
            <button
              key={v}
              onClick={() => { setVerdictFilter(v); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                verdictFilter === v
                  ? v === 'VERIFIED' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' :
                    v === 'COUNTERFEIT' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' :
                    'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="glass-panel-elevated rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
            Loading historical audit ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-500" />
            <h3 className="font-bold text-white text-base">No Matching Reports</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or medicine search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Report ID</th>
                  <th className="px-6 py-3.5">Medicine</th>
                  <th className="px-6 py-3.5">Manufacturer</th>
                  <th className="px-6 py-3.5">Batch</th>
                  <th className="px-6 py-3.5">Verdict</th>
                  <th className="px-6 py-3.5">Risk Score</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {paged.map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-3.5 font-mono text-cyan-400 font-bold">{report.id}</td>
                    <td className="px-6 py-3.5 font-bold text-white">{report.medicineName}</td>
                    <td className="px-6 py-3.5 text-slate-400">{report.manufacturer}</td>
                    <td className="px-6 py-3.5 font-mono text-cyan-300">{report.batchNumber || 'N/A'}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          report.verdict === 'VERIFIED' ? 'glow-pill-emerald' :
                          report.verdict === 'COUNTERFEIT' ? 'glow-pill-danger' : 'glow-pill-cyan'
                        }`}
                      >
                        {report.verdict}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-white">{report.riskScore}/100</td>
                    <td className="px-6 py-3.5 text-slate-400 font-mono">{formatDate(report.date)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filtered.length > perPage && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
            <span className="text-xs text-slate-400">
              Showing page <strong className="font-semibold text-white">{page}</strong> of <strong className="font-semibold text-white">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Report Inspection Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="glow-pill-cyan px-2.5 py-0.5 rounded text-xs font-mono">
                    {selectedReport.id}
                  </span>
                  <h3 className="font-bold text-white text-lg mt-1">{selectedReport.medicineName}</h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Manufacturer</span>
                  <span className="font-bold text-white">{selectedReport.manufacturer}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Batch Number</span>
                  <span className="font-mono font-bold text-cyan-300">{selectedReport.batchNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">AI Verification Verdict</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      selectedReport.verdict === 'VERIFIED' ? 'glow-pill-emerald' :
                      selectedReport.verdict === 'COUNTERFEIT' ? 'glow-pill-danger' : 'glow-pill-cyan'
                    }`}
                  >
                    {selectedReport.verdict}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Confidence Score</span>
                  <span className="font-bold text-white">{selectedReport.confidence}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Counterfeit Risk</span>
                  <span className="font-bold text-rose-400">{selectedReport.riskScore}/100</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Jurisdiction</span>
                  <span className="font-bold text-white">{selectedReport.country}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="glow-btn-cyan px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
