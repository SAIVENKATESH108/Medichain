import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, ArrowRight, Eye, Lock, Activity, Scale,
  Brain, FileCheck, Sparkles, Cpu, ChevronDown, Check,
  Database, Play, Pill
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemePaletteSwitcher from '../components/layout/ThemePaletteSwitcher';

function AnimatedCounter({ end, suffix = '', prefix = '', decimals = 0 }: { end: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, started]);

  return <span ref={ref}>{prefix}{decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}{suffix}</span>;
}

const DEMO_MEDICINES = [
  {
    name: 'Augmentin 625 Duo',
    mfg: 'GlaxoSmithKline Pharmaceuticals Ltd',
    batch: 'GSK-2026-X88',
    status: 'VERIFIED',
    schedule: 'Schedule H (Rx)',
    riskScore: 6,
    activeSalts: 'Amoxicillin (500mg) + Clavulanic Acid (125mg)',
    compliance: 'CDSCO Form 28 / OpenFDA NDA-050564 Compliant',
    color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    name: 'Insulin Glargine 100 IU/ml',
    mfg: 'Biocon Biologics India',
    batch: 'BIO-2025-G41',
    status: 'VERIFIED',
    schedule: 'Schedule G (Cold Chain 2-8°C)',
    riskScore: 4,
    activeSalts: 'Recombinant Human Insulin Glargine',
    compliance: 'WHO Prequalified / CDSCO Schedule G Compliant',
    color: 'border-cyan-500/40 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20',
  },
  {
    name: 'Alprazolam 0.5mg Tablets',
    mfg: 'Torrent Pharmaceuticals',
    batch: 'TOR-2026-H12',
    status: 'SUSPICIOUS',
    schedule: 'Schedule H1 (Habit-Forming Register)',
    riskScore: 78,
    activeSalts: 'Alprazolam IP (0.5mg)',
    compliance: '⚠️ Missing State Narcotics Schedule H1 Register Entry',
    color: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20',
  },
  {
    name: 'Azithral 500mg (Counterfeit Sample)',
    mfg: 'Unknown Underground Labs LLC',
    batch: 'FAKE-9921-ZZ',
    status: 'COUNTERFEIT',
    schedule: 'Schedule H (Counterfeit Seizure)',
    riskScore: 98,
    activeSalts: 'Chalk Powder & Talc (0mg API)',
    compliance: '🚨 Critical Anomaly: Form 19 Quarantine Dispatched',
    color: 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const [selectedDemoMed, setSelectedDemoMed] = useState(DEMO_MEDICINES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(4);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const heroY = useTransform(scrollY, [0, 500], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  const handleRunSimulation = (med: typeof DEMO_MEDICINES[0]) => {
    setSelectedDemoMed(med);
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 500);
    setTimeout(() => setSimStep(3), 1100);
    setTimeout(() => {
      setSimStep(4);
      setIsSimulating(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-300">
      {/* ─── Top Floating Landing Navbar ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/40 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                MediChain<span className="text-cyan-500 dark:text-cyan-400">Verify</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-600 dark:text-cyan-300 font-bold">
                NewStart 2026
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
            <a href="#pipeline" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">6-Agent Pipeline</a>
            <a href="#simulator" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">Live 3D Simulator</a>
            <a href="#ledger" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">SHA-256 Ledger</a>
            <a href="#compliance" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">CDSCO & FDA</a>
            <a href="#faq" className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemePaletteSwitcher />

            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="glow-btn-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="glow-btn-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION WITH 3D AMBIENT MESH & SCANNER SIMULATION ─── */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Glowing 3D Background Spheres */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-[650px] h-[650px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[140px] animate-pulse-slow" />
          <div className="absolute top-1/3 right-10 w-[550px] h-[550px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[140px] animate-pulse-slow" />
          <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-600/15 rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Hero Value Proposition */}
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              className="lg:col-span-7 space-y-6 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  NewStart 2026 &bull; PS #5
                </span>
                <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/30 px-3 py-1 rounded-full text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gemini 3.6 Flash & OpenRouter Free Tier
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Autonomous AI for{' '}
                <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                  Medicine Authentication
                </span>{' '}
                & Supply Chain Safety.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Empowering hospital pharmacists, supply chain auditors, and drug regulators with multi-agent packaging OCR inspection, real-time OpenFDA & CDSCO registry verification, and tamper-evident SHA-256 cryptographic ledgers.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  className="glow-btn-cyan px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 cursor-pointer shadow-xl shadow-cyan-500/25 group transition-transform hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Launch Verification Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#simulator"
                  className="px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:border-cyan-500/40"
                >
                  <Play className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>Try 3D Live Simulator</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-white/10 max-w-lg">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                    <AnimatedCounter end={12847} suffix="+" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Verifications Synced</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    <AnimatedCounter end={342} suffix=" Lots" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Counterfeits Flagged</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    <AnimatedCounter end={99.98} decimals={2} suffix="%" />
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Ledger Integrity</p>
                </div>
              </div>
            </motion.div>

            {/* Right Col: 3D Holographic Medicine Scanner Visualizer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl p-6 bg-white/90 dark:bg-gradient-to-b dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-950/90 border border-slate-200 dark:border-cyan-500/30 shadow-2xl dark:shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl space-y-4">
                {/* Scanning Laser Beam Animation */}
                <div className="relative h-56 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-4">
                  {/* Neon Grid in Packaging Box */}
                  <div className="absolute inset-0 bg-[radial-gradient(#06b6d420_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Laser Scan line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan z-20" />

                  {/* 3D Medicine Box Representation */}
                  <div className="relative z-10 w-44 h-32 rounded-xl bg-gradient-to-tr from-cyan-950/80 via-slate-900 to-slate-800 border-2 border-cyan-400/60 p-3 shadow-2xl flex flex-col justify-between transform -rotate-2 hover:rotate-0 transition-transform">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[9px]">
                        Rx Schedule H
                      </span>
                      <div className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-[8px] font-mono text-cyan-300">
                        2D
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-black text-white leading-tight">Amoxicillin 500mg</p>
                      <p className="text-[9px] text-cyan-300 font-mono">Batch: CIP-2026-X88</p>
                      <p className="text-[8px] text-slate-400 font-mono">EXP: 2028-05-31</p>
                    </div>

                    <div className="flex items-center justify-between text-[8px] text-emerald-400 font-mono border-t border-white/10 pt-1">
                      <span>CDSCO: DL-CIP-001</span>
                      <span className="font-bold">Cipla Ltd</span>
                    </div>
                  </div>

                  {/* OCR Recognition Bounding Tag Overlays */}
                  <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-md">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>OCR: 99.4% Match</span>
                  </div>

                  <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>SHA-256 Ledger Sealed</span>
                  </div>
                </div>

                {/* Real-time Multi-Agent Telemetry Indicators */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Cpu className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                      Agent Pipeline Telemetry
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Sub-500ms Active</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Decryption</p>
                      <p className="font-bold text-cyan-600 dark:text-cyan-300 font-mono">Gemini 3.6</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Safety Shield</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-300 font-mono">Nemotron 3.5</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Reasoning</p>
                      <p className="font-bold text-purple-600 dark:text-purple-300 font-mono">GLM 5.2</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE 3D MEDICINE SIMULATOR SECTION ─── */}
      <section id="simulator" className="py-16 md:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Interactive 3D Sandbox
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Simulate Live Multi-Agent Verification
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click any pharmaceutical test dossier below to watch our 6-agent verification pipeline evaluate the batch parameters in real time.
            </p>
          </div>

          {/* Test Medicine Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_MEDICINES.map((med, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleRunSimulation(med)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  selectedDemoMed.name === med.name
                    ? 'bg-white dark:bg-slate-900 border-cyan-500 dark:border-cyan-400 shadow-xl dark:shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.02]'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${med.color}`}>
                    {med.status}
                  </span>
                  <Pill className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{med.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{med.mfg}</p>
                <p className="text-[11px] text-cyan-600 dark:text-cyan-300 font-mono mt-2">Batch: {med.batch}</p>
              </button>
            ))}
          </div>

          {/* Live Simulator Inspection Board */}
          <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl border-cyan-500/20 bg-white/90 dark:bg-slate-900/90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-bold">
                  {isSimulating ? '⏳ Multi-Agent Pipeline Evaluating...' : 'Active Inspection Dossier'}
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedDemoMed.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedDemoMed.mfg} &bull; {selectedDemoMed.batch}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider ${selectedDemoMed.color}`}>
                  Verdict: {selectedDemoMed.status}
                </span>
                <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono">
                  Risk Score: <strong className="text-slate-900 dark:text-white">{selectedDemoMed.riskScore}/100</strong>
                </span>
              </div>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { stage: 'Stage 1: Agent 0', label: 'Safety Guardrail', state: simStep >= 1 ? 'PASS (Safe)' : 'Evaluating...', icon: Lock },
                { stage: 'Stage 2: Agent 1', label: 'Packaging OCR', state: simStep >= 2 ? 'Decrypted (99.4%)' : 'Processing...', icon: Eye },
                { stage: 'Stage 3: Agent 2-3', label: 'CDSCO & OpenFDA', state: simStep >= 3 ? 'Registry Cross-Ref' : 'Pending...', icon: Database },
                { stage: 'Stage 4: Agent 4-6', label: 'SHA-256 Ledger', state: simStep >= 4 ? 'Block Sealed' : 'Hashing...', icon: Shield },
              ].map((s, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-mono uppercase">{s.stage}</span>
                    <s.icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{s.label}</p>
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-300 font-semibold">{s.state}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Active Formulation: </span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedDemoMed.activeSalts}</span>
              </div>
              <div className="text-cyan-600 dark:text-cyan-300 font-bold">
                <span>{selectedDemoMed.compliance}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6-AGENT ARCHITECTURE PIPELINE SECTION ─── */}
      <section id="pipeline" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Architecture Blueprint
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            6 Specialized Domain AI Agents
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Each verification undergoes multi-layer domain reasoning with safety guardrails, CDSCO statutory cross-referencing, and human governance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              num: '0',
              title: 'Agent 0: Content Safety Guardrail',
              model: 'NVIDIA Nemotron 3.5 Content Safety (Free)',
              desc: 'Enforces input validation policies, screening against prompt injection, dangerous chemical synthesis, and label forgery scripts.',
              icon: Lock,
              border: 'hover:border-rose-500',
              badge: 'Pre-Inference Shield',
            },
            {
              num: '1',
              title: 'Agent 1: Packaging Vision Decryptor',
              model: 'Google Gemini 3.6 Flash & Nemotron VL 12B',
              desc: 'Extracts batch numbers, manufacturing/expiry dates, CDSCO manufacturing license numbers, and GS1 2D DataMatrix codes.',
              icon: Eye,
              border: 'hover:border-cyan-500',
              badge: 'Multimodal OCR',
            },
            {
              num: '2',
              title: 'Agent 2: CDSCO & Registry Cross-Ref',
              model: 'OpenFDA API + 10k Indian Medicines Dataset',
              desc: 'Queries real-time FDA NDC registries and 10,000+ Indian medicines database with 7-day TTL O(1) LRU Caching.',
              icon: Database,
              border: 'hover:border-teal-500',
              badge: 'National Registries',
            },
            {
              num: '3',
              title: 'Agent 3: Regulatory Compliance Engine',
              model: 'Deterministic Rules & Statutory Engine',
              desc: 'Applies Indian Drugs & Cosmetics Act 1940 rules, checking Schedule H, H1, X requirements, WHO Essential Medicines, and NLEM.',
              icon: Scale,
              border: 'hover:border-indigo-500',
              badge: 'Statutory Compliance',
            },
            {
              num: '4',
              title: 'Agent 4: Multi-Agent Decision Synthesizer',
              model: 'Z.ai GLM 5.2 (1M Reasoning) & ModelRouter',
              desc: 'Fuses multi-agent signals into a definitive verdict (VERIFIED, SUSPICIOUS, or COUNTERFEIT) with autonomous circuit-breaker failover.',
              icon: Brain,
              border: 'hover:border-amber-500',
              badge: 'Decision Fusion',
            },
            {
              num: '5',
              title: 'Agent 5: Human Review & Form 19 Dispatch',
              model: 'Mandatory Pharmacist & Inspector Governance',
              desc: 'Drafts quarantine orders and CDSCO Form 19 regulatory violation drafts for mandatory human sign-off before regulatory escalation.',
              icon: FileCheck,
              border: 'hover:border-emerald-500',
              badge: 'Human Governance',
            },
          ].map((agent, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`p-6 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 ${agent.border} transition-all shadow-xl backdrop-blur-xl space-y-4 flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-mono text-[10px] font-bold">
                    {agent.badge}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <agent.icon className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{agent.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{agent.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-cyan-600 dark:text-cyan-300/80">
                Engine: {agent.model}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── IMMUTABLE SHA-256 HASH-CHAIN SECTION ─── */}
      <section id="ledger" className="py-16 md:py-24 bg-slate-100/60 dark:bg-slate-900/30 border-t border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Cryptographic Integrity
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                Tamper-Evident SHA-256 Audit Ledger
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Every verified packaging photo, OCR transcript, and regulatory decision is cryptographically sealed into a sequential SHA-256 hash-chain stored in PostgreSQL.
              </p>

              <div className="space-y-3">
                {[
                  'Mathematical proof against retroactive tampering or deletion',
                  'Canonical JSON serialization with deterministic hashing',
                  'Instant ledger integrity verification across 100,000+ historical blocks',
                  'Non-repudiation audit trail for regulatory court filings',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(user ? '/ledger-explorer' : '/login')}
                  className="glow-btn-cyan px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Inspect Cryptographic Ledger</span>
                </button>
              </div>
            </div>

            {/* 3D Hash Blocks Visualizer */}
            <div className="lg:col-span-6 space-y-3">
              {[
                { block: '#142', event: 'VERIFICATION_EVALUATED', res: 'REP-8A9F21', hash: '9e81b302...a70f4', prev: 'b73a218f...4e9c1', color: 'border-cyan-500/40 bg-white dark:bg-slate-900' },
                { block: '#141', event: 'QUARANTINE_LOT_LOCKED', res: 'LOT-CIP-2026', hash: 'b73a218f...4e9c1', prev: 'f412d091...8c3a2', color: 'border-rose-500/40 bg-white dark:bg-slate-900' },
                { block: '#140', event: 'FORM_19_DISPATCHED', res: 'CDSCO-F19-481', hash: 'f412d091...8c3a2', prev: '00000000...00000', color: 'border-teal-500/40 bg-white dark:bg-slate-900' },
              ].map((b, i) => (
                <div key={i} className={`p-4 rounded-2xl ${b.color} font-mono text-xs space-y-1.5 shadow-md border`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white">{b.block} &bull; {b.event}</span>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold">{b.res}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Current Hash: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{b.hash}</span></p>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px]">Previous Hash: <span>{b.prev}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FREQUENTLY ASKED QUESTIONS (FAQ) ─── */}
      <section id="faq" className="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Clear Answers
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Learn more about our AI verification models, regulatory frameworks, and enterprise integrations.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'How does MediChain Verify detect counterfeit medicines from photos?',
              a: 'Our multimodal vision decryptor (Gemini 3.6 Flash & NVIDIA Nemotron VL) inspects micro-typography, manufacturer holograms, packaging foil seams, statutory CDSCO warning bars, and compares batch expiration dates against OpenFDA and Indian medicine registries.',
            },
            {
              q: 'Are the AI models 100% free and scalable?',
              a: 'Yes! We route requests through Google Gemini 3.6 Flash free tier and OpenRouter free-tier models (NVIDIA Nemotron 3.5 Content Safety, Google Gemma 4 26B/31B, Z.ai GLM 5.2) backed by a 3-strike circuit breaker and sub-millisecond O(1) LRU Caching.',
            },
            {
              q: 'How is tamper-evident blockchain security achieved?',
              a: 'Every inspection is serialized into an append-only SHA-256 cryptographic hash-chain where each block encapsulates the previous block hash, canonical payload, timestamp, and digital signature.',
            },
            {
              q: 'What happens when a medicine is flagged as COUNTERFEIT?',
              a: 'The system automatically locks the batch into the Quarantine Vault, generates a draft CDSCO Form 19 regulatory incident report, and routes the dossier to the Regulatory Review Queue for mandatory pharmacist sign-off.',
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-cyan-500' : ''}`} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CALL TO ACTION BANNER ─── */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="cta-banner-container rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 border border-cyan-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d420_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="glow-pill-emerald px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-block">
              Ready for Deployment
            </span>
            <h2 className="text-3xl sm:text-4xl font-black !text-white drop-shadow-md">
              Secure Your Pharmaceutical Supply Chain Today
            </h2>
            <p className="text-sm !text-cyan-100/90 leading-relaxed font-medium">
              Join hospitals, pharmaceutical distributors, and regulatory agencies in eliminating counterfeit drugs with verifiable multi-agent AI.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="glow-btn-cyan px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xl shadow-cyan-500/30 hover:scale-105 transition-transform !text-white"
              >
                <span>{user ? 'Go to Workspace Dashboard' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-8 px-4 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-bold text-slate-700 dark:text-slate-400">MediChain Verify Enterprise &bull; NewStart 2026</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-slate-500">
          <span>CDSCO & OpenFDA Aligned</span>
          <span>SHA-256 Ledger Enforced</span>
        </div>
      </footer>
    </div>
  );
}
