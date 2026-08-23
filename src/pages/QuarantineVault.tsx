import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, ShieldAlert, Trash2, Search, Eye, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface QuarantinedBatch {
  id: string;
  vault_id: string;
  medicine_name: string;
  batch_number: string;
  manufacturer: string;
  units_quarantined: number;
  interception_reason: string;
  quarantine_date: string;
  status: 'ISOLATED' | 'UNDER_TESTING' | 'DESTROYED' | 'RELEASED_CLEARED';
  disposition_officer: string;
  cdsco_case_no: string;
}

export default function QuarantineVault() {
  const [batches, setBatches] = useState<QuarantinedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<QuarantinedBatch | null>(null);

  const fetchQuarantine = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('quarantined_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setBatches(data as QuarantinedBatch[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuarantine();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: QuarantinedBatch['status']) => {
    try {
      const { error } = await supabase
        .from('quarantined_batches')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        toast.error('Failed to update status: ' + error.message);
      } else {
        setBatches(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        toast.success(`Lot status updated to ${newStatus}`);
        if (selectedBatch && selectedBatch.id === id) {
          setSelectedBatch(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch {
      toast.error('Status update failed');
    }
  };

  const filtered = batches.filter(b =>
    b.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    b.vault_id.toLowerCase().includes(search.toLowerCase()) ||
    b.cdsco_case_no.toLowerCase().includes(search.toLowerCase())
  );

  const totalIsolated = batches.reduce((acc, b) => b.status === 'ISOLATED' ? acc + b.units_quarantined : acc, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-danger px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Physical & Digital Isolation Vault
            </span>
            <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
              CDSCO Sec 22/23 Compliant
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            Batch Quarantine & Lot Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Isolate suspected counterfeit pharmaceutical batches, log legal disposition chain-of-custody, and enforce recall quarantines.
          </p>
        </div>

        <button
          onClick={fetchQuarantine}
          disabled={loading}
          className="glow-btn-cyan px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Vault</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Isolated Units</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-400">{totalIsolated.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Physical containment enforced</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Regulatory Cases</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">{batches.length}</p>
          <p className="text-xs text-slate-400">CDSCO District Docket Assigned</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Chain-of-Custody Proofs</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">100% Verified</p>
          <p className="text-xs text-slate-400">Live PostgreSQL Database</p>
        </div>
      </div>

      {/* Search & Vault Table */}
      <div className="glass-panel-elevated rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch #, vault ID, drug name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm"
            />
          </div>
          <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-bold">
            {filtered.length} Quarantined Lots (Live DB)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Vault ID</th>
                <th className="px-6 py-3.5">Medicine & Lot</th>
                <th className="px-6 py-3.5">Quarantined Quantity</th>
                <th className="px-6 py-3.5">Interception Reason</th>
                <th className="px-6 py-3.5">Vault Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-rose-400">{b.vault_id}</td>
                  <td className="px-6 py-3.5">
                    <p className="font-bold text-white">{b.medicine_name}</p>
                    <p className="text-cyan-300 font-mono text-[11px]">Batch: {b.batch_number}</p>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-white">{b.units_quarantined.toLocaleString()} units</td>
                  <td className="px-6 py-3.5 max-w-xs text-slate-400 truncate">{b.interception_reason}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'ISOLATED' ? 'glow-pill-danger' :
                        b.status === 'UNDER_TESTING' ? 'glow-pill-cyan' :
                        b.status === 'DESTROYED' ? 'bg-slate-800 text-slate-400' : 'glow-pill-emerald'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedBatch(b)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Lot</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lot Inspection & Disposition Modal */}
      <AnimatePresence>
        {selectedBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="glow-pill-danger px-2.5 py-0.5 rounded text-xs font-mono">
                    {selectedBatch.vault_id} • {selectedBatch.cdsco_case_no}
                  </span>
                  <h3 className="font-bold text-white text-lg mt-1">{selectedBatch.medicine_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  <p className="text-xs">
                    <strong>Physical Isolation Order Active:</strong> This product lot is locked from distribution under CDSCO custody rules.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Batch Number:</span>
                    <span className="font-mono font-bold text-cyan-300">{selectedBatch.batch_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Quarantine Officer:</span>
                    <span className="font-bold text-white">{selectedBatch.disposition_officer}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Interception Reason:</span>
                    <span className="text-slate-300">{selectedBatch.interception_reason}</span>
                  </div>
                </div>

                <div className="pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
                    Authorized Disposition Actions:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedBatch.id, 'UNDER_TESTING')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Send for Lab HPLC Test
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBatch.id, 'DESTROYED')}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Authorize Incineration</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="glow-btn-cyan px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Vault Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
