import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Mail, Lock, User, Loader2, ArrowLeft, ArrowRight,
  Sparkles, KeyRound, Cpu, FileCheck, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemePaletteSwitcher from '../components/layout/ThemePaletteSwitcher';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            <Shield className="w-8 h-8 text-cyan-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-300 font-mono tracking-wide">Connecting to MediChain Verify...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please provide your legal full name or pharmacist ID.');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        const { error: signUpErr } = await signUpWithEmail(email, password, fullName);
        if (signUpErr) {
          setError(signUpErr);
        } else {
          toast.success('Account created! Logging you into the workspace.');
          navigate('/dashboard');
        }
      } else {
        const { error: signInErr } = await signInWithEmail(email, password);
        if (signInErr) {
          setError(signInErr);
        } else {
          toast.success('Welcome back! Workspace authenticated.');
          navigate('/dashboard');
        }
      }
    } catch {
      setError('An unexpected network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoCredentials = (role: 'pharmacist' | 'inspector' | 'admin') => {
    if (role === 'pharmacist') {
      setEmail('pharmacist@medichain.org');
      setPassword('Verified2026!');
      setFullName('Dr. Rajesh Sharma, Reg. Pharmacist');
    } else if (role === 'inspector') {
      setEmail('inspector@cdsco.gov.in');
      setPassword('CDSCO-Audit-2026');
      setFullName('Inspector Ananya Roy, CDSCO');
    } else {
      setEmail('venkateshsai589@gmail.com');
      setPassword('EnterprisePass2026!');
      setFullName('Sai Venkatesh');
    }
    toast.success(`Loaded credentials for ${role.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-300">
      {/* ─── Ambient Glow Mesh Background ─── */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-[180px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Bar Actions */}
      <div className="absolute top-6 inset-x-6 max-w-6xl mx-auto flex items-center justify-between z-20">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Landing</span>
        </Link>

        {/* Theme & Palette Switcher */}
        <div className="flex items-center gap-2">
          <ThemePaletteSwitcher />
        </div>
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center z-10 my-12 pt-4">
        {/* ─── Left Column: 3D Holographic Showcase (Desktop) ─── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 p-8"
        >
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 ring-2 ring-cyan-400/40 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  MediChain<span className="text-cyan-500 dark:text-cyan-400">Verify</span>
                </h2>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-300 uppercase tracking-widest font-bold">Enterprise Edition</span>
              </div>
            </Link>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                Authenticating Global Pharmaceuticals with{' '}
                <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
                  Cryptographic Trust.
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect your organization to access multi-agent packaging OCR inspection, CDSCO Schedule H/H1/X compliance validation, and immutable SHA-256 hash chains.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-2">
              {[
                {
                  icon: Cpu,
                  title: 'Multi-Agent Vision & Safety Guardrails',
                  desc: 'Gemini 3.6 Flash & NVIDIA Nemotron 3.5 Content Safety.',
                  color: 'text-cyan-500 dark:text-cyan-400',
                  bg: 'bg-cyan-500/10',
                  border: 'border-cyan-500/30',
                },
                {
                  icon: Shield,
                  title: 'Immutable SHA-256 Audit Ledger',
                  desc: 'Cryptographic hash-chain preserving non-repudiation.',
                  color: 'text-teal-500 dark:text-teal-400',
                  bg: 'bg-teal-500/10',
                  border: 'border-teal-500/30',
                },
                {
                  icon: FileCheck,
                  title: 'CDSCO Form 19 & Human Sign-off',
                  desc: 'Mandatory pharmacist sign-off on flagged suspect lots.',
                  color: 'text-emerald-500 dark:text-emerald-400',
                  bg: 'bg-emerald-500/10',
                  border: 'border-emerald-500/30',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xs`}
                >
                  <div className={`p-2 rounded-xl ${item.bg} ${item.color} flex-shrink-0 mt-0.5`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Security: SHA-256 Ledger Enforced</span>
            <span>CDSCO & OpenFDA Certified</span>
          </div>
        </motion.div>

        {/* ─── Right Column: 3D Animated Login / Sign Up Card ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 w-full"
        >
          <div className="relative rounded-3xl p-6 sm:p-10 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Glow accent */}
            <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

            {/* Header and Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isSignUp ? 'Create Enterprise Account' : 'Sign In to Workspace'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isSignUp
                      ? 'Register your organization to start inspecting batches.'
                      : 'Enter your credentials to access the verified portal.'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <KeyRound className="w-5 h-5" />
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); }}
                  className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                    !isSignUp ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); }}
                  className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                    isSignUp ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Register Account
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name / Pharmacist ID</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required={isSignUp}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Sharma, Reg Pharmacist"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Authorized Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@hospital.org"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Secure Password</label>
                  {!isSignUp && (
                    <span className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium">
                      Forgot Password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full glow-btn-cyan py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 transition-all mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Complete Registration & Enter' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Quick Role Credentials for NewStart 2026:</span>
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('pharmacist')}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 transition-all cursor-pointer text-center shadow-xs"
                >
                  🏥 Pharmacist
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('inspector')}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-[11px] font-bold text-teal-700 dark:text-teal-300 transition-all cursor-pointer text-center shadow-xs"
                >
                  🏛️ Inspector
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin')}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer text-center shadow-xs"
                >
                  ⚡ Admin
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
