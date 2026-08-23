import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShieldAlert, BarChart3, FileCheck, BookOpen, Globe,
  Cpu, Lock, MessageSquare, FileText, Settings, X, ArrowRight
} from 'lucide-react';
import { useAppDispatch, useAppSelector, setActiveModule, setCommandPaletteOpen, type NavigationModule } from '../../store';
import { Badge } from '@ninna-ui/primitives';

interface CommandItem {
  key: NavigationModule;
  path: string;
  title: string;
  desc: string;
  category: string;
  icon: typeof Search;
}

const commands: CommandItem[] = [
  { key: 'verify', path: '/verify', title: 'Verify Medicine', desc: 'Execute 6-agent domain AI verification pipeline', category: 'Core', icon: Search },
  { key: 'review-queue', path: '/review-queue', title: 'Regulatory Review Queue', desc: 'Pharmacist sign-off on draft Form 19 and Quarantine orders', category: 'Compliance', icon: FileCheck },
  { key: 'quarantine-vault', path: '/quarantine-vault', title: 'Batch Quarantine Vault', desc: 'Isolate suspected counterfeit lots and manage custody', category: 'Operations', icon: ShieldAlert },
  { key: 'dashboard', path: '/dashboard', title: 'Supply Chain Intelligence', desc: 'Real-time telemetry and regional counterfeit analytics', category: 'Intelligence', icon: BarChart3 },
  { key: 'radar-scanner', path: '/radar-scanner', title: 'Threat Radar', desc: 'Live global shipment tracking and port interception feed', category: 'Intelligence', icon: Globe },
  { key: 'telemetry-lab', path: '/telemetry-lab', title: 'AI Telemetry & Benchmark Lab', desc: 'Test Agent 0 safety and observe model latencies', category: 'AI Lab', icon: Cpu },
  { key: 'cdsco-hub', path: '/cdsco-hub', title: 'CDSCO Regulatory Hub', desc: 'Schedule H/H1/X statutory rules & Form 18/19 wizards', category: 'Compliance', icon: BookOpen },
  { key: 'ledger-explorer', path: '/ledger-explorer', title: 'SHA-256 Ledger Explorer', desc: 'Inspect sequential tamper-evident block hashes', category: 'Cryptographic', icon: Lock },
  { key: 'assistant', path: '/assistant', title: 'AI Safety Assistant', desc: 'Chatbot for drug verification and safety rules', category: 'AI Lab', icon: MessageSquare },
  { key: 'reports', path: '/reports', title: 'Audit Records', desc: 'Search and export historical verification dossiers', category: 'Operations', icon: FileText },
  { key: 'settings', path: '/settings', title: 'Settings & Organization', desc: 'Manage API keys, team members, and alert channels', category: 'Management', icon: Settings },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.navigation.commandPaletteOpen);
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch(setCommandPaletteOpen(!isOpen));
      } else if (e.key === 'Escape' && isOpen) {
        dispatch(setCommandPaletteOpen(false));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, isOpen]);

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd: CommandItem) => {
    dispatch(setActiveModule(cmd.key));
    dispatch(setCommandPaletteOpen(false));
    navigate(cmd.path);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]"
        >
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <Search className="w-5 h-5 text-cyan-600 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type a command or jump to module..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder-slate-400"
            />
            <button
              onClick={() => dispatch(setCommandPaletteOpen(false))}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results list */}
          <div className="p-2 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No matching workspace commands or modules found.
              </div>
            ) : (
              filtered.map((cmd) => (
                <button
                  key={cmd.key}
                  onClick={() => handleSelect(cmd)}
                  className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-cyan-50 group-hover:text-cyan-600 flex items-center justify-center text-slate-600 transition-colors">
                      <cmd.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{cmd.title}</span>
                        <Badge variant="soft" color="neutral" size="sm" className="text-[9px]">
                          {cmd.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-sm">{cmd.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 px-4">
            <span>Use ↑↓ to navigate • ↵ to select</span>
            <span>ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
