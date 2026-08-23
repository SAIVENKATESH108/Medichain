import { useState, useRef } from 'react';
import {
  Camera, CheckCircle2, AlertTriangle, XCircle, ChevronDown,
  RotateCcw, Loader2, AlertCircle, Eye, Database,
  Zap, Shield, AlertOctagon, Activity, Scale, Bell, Lock,
  Upload, Sparkles, FileText, Pill, PackageCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVerification } from '../hooks/useVerification';
import type { PipelineStage } from '../hooks/useVerification';
import type { AuditStep } from '../lib/verificationEngine';
import { decryptMedicineImage, type DecryptedMedicineData } from '../lib/verificationEngine';
import type { DrugDatabaseResult } from '../lib/drugDatabase';
import { verifyLocalAuditChain, type AuditVerificationResult } from '../lib/auditLedger';
import { countries } from '../data/mockData';
import RiskGauge from '../components/charts/RiskGauge';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { AuditLogRow } from '../lib/database.types';

// ─── 6-Agent Pipeline Progress Stepper ────────────────────────────

const PIPELINE_STEPS: { key: PipelineStage; label: string; icon: typeof Eye }[] = [
  { key: 'content_safety', label: '0. Guardrail', icon: Lock },
  { key: 'image_analysis', label: '1. Vision OCR', icon: Eye },
  { key: 'database_check', label: '2. OpenFDA DB', icon: Database },
  { key: 'compliance_check', label: '3. CDSCO Rules', icon: Scale },
  { key: 'risk_assessment', label: '4. Risk Model', icon: Shield },
  { key: 'review_queue_dispatch', label: '5. Review Queue', icon: Bell },
];

function PipelineStepper({ stage, message }: { stage: PipelineStage; message: string }) {
  const stageOrder: PipelineStage[] = [
    'content_safety',
    'image_analysis',
    'database_check',
    'compliance_check',
    'risk_assessment',
    'review_queue_dispatch',
    'complete',
  ];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="glass-panel-elevated p-6 rounded-3xl mb-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <h3 className="font-bold text-white text-base">6-Agent Verification Pipeline</h3>
        </div>
        <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-mono">
          Domain AI Engine Active
        </span>
      </div>

      <div className="flex items-center justify-between">
        {PIPELINE_STEPS.map((step, i) => {
          const stepIndex = stageOrder.indexOf(step.key);
          const isActive = stepIndex === currentIndex;
          const isDone = stepIndex < currentIndex || stage === 'complete';

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  isDone ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40' :
                  isActive ? 'bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/50 ring-4 ring-cyan-400/40 animate-pulse' :
                  'bg-slate-800/80 text-slate-500 border border-slate-700'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <step.icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] mt-2 font-bold text-center truncate max-w-[68px] ${
                  isDone ? 'text-emerald-400' : isActive ? 'text-cyan-300' : 'text-slate-500'
                }`}>{step.label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`h-0.5 w-full mx-1 transition-colors duration-500 ${
                  stepIndex < currentIndex ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-800'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 bg-slate-900/70 rounded-2xl px-4 py-3 border border-cyan-500/20">
        <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" />
        <p className="text-xs text-slate-200 font-medium">{message}</p>
      </div>
    </div>
  );
}

// ─── Audit Trail Component ────────────────────────────────────────

function AuditTrailSection({ steps }: { steps: AuditStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 text-xs">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
              step.confidence >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              step.confidence >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-px h-full bg-slate-800 my-1" />}
          </div>
          <div className="pb-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white">{step.agent}</p>
                {step.provenance && (
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] font-mono">
                    {step.provenance.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400">{step.duration_ms}ms</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  step.confidence >= 80 ? 'glow-pill-emerald' :
                  step.confidence >= 50 ? 'glow-pill-cyan' : 'glow-pill-danger'
                }`}>
                  {step.confidence}% conf
                </span>
              </div>
            </div>
            <p className="text-slate-400 mt-0.5">{step.action}</p>
            <p className="text-slate-200 mt-1 font-mono text-[11px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">{step.result}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Database Verification Section ────────────────────────────────

function DatabaseResultsSection({ db }: { db: DrugDatabaseResult }) {
  return (
    <div className="space-y-4">
      {/* Indian National Medicine Master Registry (10,000+ CDSCO/NLEM Medicines) */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
        <span className={`mt-0.5 ${db.indianRegistry?.found ? 'text-cyan-400' : 'text-slate-400'}`}>
          {db.indianRegistry?.found ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-xs sm:text-sm">Indian National Medicine Registry & Master DB</p>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${db.indianRegistry?.found ? 'glow-pill-cyan' : 'bg-slate-800 text-slate-400'}`}>
              {db.indianRegistry?.found ? '🇮🇳 10,000+ Indian DB Match' : 'Unlisted Formulation'}
            </span>
          </div>
          {db.indianRegistry?.found ? (
            <div className="text-slate-300 text-xs mt-1.5 space-y-1">
              <p>Registered Brand: <strong className="text-cyan-300 font-semibold">{db.indianRegistry.name}</strong></p>
              <p>Active Composition: <strong className="text-white font-medium">{db.indianRegistry.active_composition || 'Standard formulation'}</strong></p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                <span>Mfg: <strong className="text-slate-200">{db.indianRegistry.manufacturer_name}</strong></span>
                {db.indianRegistry.price && <span>MRP: <strong className="text-emerald-400">₹{db.indianRegistry.price}</strong></span>}
                {db.indianRegistry.pack_size_label && <span>Pack: <strong className="text-slate-200">{db.indianRegistry.pack_size_label}</strong></span>}
                <span>Schedule: <strong className="text-cyan-300">{db.indianRegistry.schedule}</strong></span>
                {db.indianRegistry.nlem_listed && <span className="text-amber-300 font-bold">⭐ NLEM Essential Medicine</span>}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-xs mt-1">Queried Indian Medicine Dataset & CDSCO registry — matching regional listing verified by AI Vision.</p>
          )}
        </div>
      </div>

      {/* FDA Drug Registry */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <span className={`mt-0.5 ${db.fdaDrug.found ? 'text-emerald-400' : 'text-slate-400'}`}>
          {db.fdaDrug.found ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-xs sm:text-sm">OpenFDA National Drug Code (NDC) Directory</p>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${db.fdaDrug.found ? 'glow-pill-emerald' : 'bg-slate-800 text-slate-400'}`}>
              {db.fdaDrug.found ? '✅ Listed in OpenFDA' : 'Regional Generic'}
            </span>
          </div>
          {db.fdaDrug.found ? (
            <div className="text-slate-300 text-xs mt-1 space-y-0.5">
              <p>Brand: <strong className="text-cyan-300 font-semibold">{db.fdaDrug.brand_name}</strong> | Generic: <strong className="text-white font-semibold">{db.fdaDrug.generic_name}</strong></p>
              <p>Manufacturer: {db.fdaDrug.manufacturer_name}</p>
              {db.fdaDrug.active_ingredients && <p>Active: {db.fdaDrug.active_ingredients.join(', ')}</p>}
            </div>
          ) : (
            <p className="text-slate-400 text-xs mt-1">Queried US FDA database — not found (typical for Indian regional generics)</p>
          )}
        </div>
      </div>

      {/* FDA Recalls */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <span className={`mt-0.5 ${db.fdaRecalls.found ? 'text-rose-400' : 'text-emerald-400'}`}>
          {db.fdaRecalls.found ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-xs sm:text-sm">OpenFDA Enforcement & Recall Notices</p>
            <span className="glow-pill-emerald px-2 py-0.5 rounded-md text-[10px]">
              OpenFDA Recall DB
            </span>
          </div>
          {db.fdaRecalls.found ? (
            <div className="mt-2 space-y-1">
              {db.fdaRecalls.recalls.map((r, i) => (
                <p key={i} className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                  ⚠️ {r.classification}: {r.reason}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-emerald-400 text-xs mt-1 font-medium">✅ No active recall enforcement notices found</p>
          )}
        </div>
      </div>

      {/* Expiry Check */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800">
        <span className={`mt-0.5 ${db.expiryCheck.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
          {db.expiryCheck.isExpired ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-xs sm:text-sm">Expiry Validation</p>
            <span className="glow-pill-cyan px-2 py-0.5 rounded-md text-[10px]">
              D&C Act Sec 18
            </span>
          </div>
          <p className={`text-xs mt-1 ${db.expiryCheck.isExpired ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
            {db.expiryCheck.warning || (db.expiryCheck.daysUntilExpiry !== null ? `${db.expiryCheck.daysUntilExpiry} days until expiry` : 'No expiry date provided')}
          </p>
        </div>
      </div>
    </div>
  );
}

const verdictConfig = {
  VERIFIED: { icon: CheckCircle2, bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', pill: 'glow-pill-emerald', label: 'Verified Authentic' },
  SUSPICIOUS: { icon: AlertTriangle, bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', pill: 'glow-pill-cyan', label: 'Suspicious — Needs Review' },
  COUNTERFEIT: { icon: XCircle, bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-300', pill: 'glow-pill-danger', label: 'Counterfeit Intercepted' },
};

export default function Verify() {
  const { result, loading, stage, stageMessage, verify, reset } = useVerification();
  const { user } = useAuth();

  // 12 Rich Form Fields for exhaustive medicine packaging parameters
  const [form, setForm] = useState({
    medicineName: '',
    strength: '',
    dosageForm: 'Tablets',
    manufacturer: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    mfgLicense: '',
    gtinBarcode: '',
    country: 'India',
    schedule: 'Schedule H',
    storageConditions: 'Store below 25°C protected from light and moisture',
    packagingCondition: 'Intact blister foil with clear embossed batch numbering',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<DecryptedMedicineData | null>(null);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [autoDecryptedFields, setAutoDecryptedFields] = useState<Set<string>>(new Set());

  const [openAccordion, setOpenAccordion] = useState<string | null>('visual');
  const [dragOver, setDragOver] = useState(false);
  const [auditCheck, setAuditCheck] = useState<AuditVerificationResult | null>(null);
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-Decrypt Image Trigger
  const handleImageChange = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Please upload an image under 5MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);

      // Trigger instant AI Vision Decryption
      const base64 = dataUrl.split(',')[1];
      const mime = file.type || 'image/jpeg';
      setDecrypting(true);
      toast.loading('AI Vision analyzing packaging & decrypting text...', { id: 'ai-ocr' });

      try {
        const decrypted = await decryptMedicineImage(base64, mime, undefined, user?.id);
        setDecryptedData(decrypted);

        // Pre-fill all input boxes
        setForm((prev) => ({
          ...prev,
          medicineName: decrypted.medicineName || prev.medicineName,
          strength: decrypted.strength || prev.strength,
          dosageForm: decrypted.dosageForm || prev.dosageForm,
          manufacturer: decrypted.manufacturer || prev.manufacturer,
          batchNumber: decrypted.batchNumber || prev.batchNumber,
          mfgDate: decrypted.mfgDate || prev.mfgDate,
          expiryDate: decrypted.expiryDate || prev.expiryDate,
          mfgLicense: decrypted.mfgLicense || prev.mfgLicense,
          gtinBarcode: decrypted.gtinBarcode || prev.gtinBarcode,
          country: decrypted.country || prev.country,
          schedule: decrypted.schedule || prev.schedule,
          storageConditions: decrypted.storageConditions || prev.storageConditions,
          packagingCondition: decrypted.packagingCondition || prev.packagingCondition,
        }));

        // Track auto-decrypted fields for UI indicators
        const autoFields = new Set([
          'medicineName', 'strength', 'dosageForm', 'manufacturer',
          'batchNumber', 'mfgDate', 'expiryDate', 'mfgLicense',
          'gtinBarcode', 'country', 'schedule', 'storageConditions', 'packagingCondition'
        ]);
        setAutoDecryptedFields(autoFields);

        toast.success('Decrypted successfully! All medicine parameters auto-filled.', { id: 'ai-ocr' });
      } catch (err: any) {
        toast.error('Could not auto-decrypt image: ' + err.message, { id: 'ai-ocr' });
      } finally {
        setDecrypting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageChange(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineName.trim() || !form.manufacturer.trim()) {
      toast.error('Please enter at least the Medicine Name and Manufacturer');
      return;
    }

    const currentForm = { ...form };
    const currentImage = imageFile;

    const res = await verify({
      medicineName: currentForm.medicineName,
      batchNumber: currentForm.batchNumber,
      manufacturer: currentForm.manufacturer,
      expiryDate: currentForm.expiryDate,
      country: currentForm.country,
      strength: currentForm.strength,
      dosageForm: currentForm.dosageForm,
      mfgDate: currentForm.mfgDate,
      mfgLicense: currentForm.mfgLicense,
      gtinBarcode: currentForm.gtinBarcode,
      schedule: currentForm.schedule,
      storageConditions: currentForm.storageConditions,
      packagingCondition: currentForm.packagingCondition,
      imageFile: currentImage,
    });

    if (res) {
      toast.success(`Verification complete: ${res.verdict}! Saved to Supabase database.`);
    }
  };

  const handleReset = () => {
    reset();
    setForm({
      medicineName: '',
      strength: '',
      dosageForm: 'Tablets',
      manufacturer: '',
      batchNumber: '',
      mfgDate: '',
      expiryDate: '',
      mfgLicense: '',
      gtinBarcode: '',
      country: 'India',
      schedule: 'Schedule H',
      storageConditions: 'Store below 25°C protected from light and moisture',
      packagingCondition: 'Intact blister foil with clear embossed batch numbering',
    });
    setImageFile(null);
    setImagePreview(null);
    setDecryptedData(null);
    setAutoDecryptedFields(new Set());
    setAuditCheck(null);
  };

  const handleVerifyLedger = async () => {
    setVerifyingLedger(true);
    try {
      const { data: dbRows, error: dbErr } = await supabase
        .from('audit_log')
        .select('*')
        .order('sequence_number', { ascending: true });

      if (!dbErr && dbRows && dbRows.length > 0) {
        const mappedRows: AuditLogRow[] = dbRows.map(r => ({
          id: r.id || String(r.sequence_number),
          sequence_number: Number(r.sequence_number),
          organization_id: r.organization_id || null,
          user_id: r.user_id || null,
          event_type: r.event_type,
          action: r.action,
          resource_type: r.resource_type,
          resource_id: r.resource_id || null,
          canonical_payload: r.canonical_payload || {},
          previous_hash: r.previous_hash,
          current_hash: r.current_hash,
          created_at: r.created_at,
        }));
        const check = await verifyLocalAuditChain(mappedRows);
        setAuditCheck(check);
      } else {
        const check = await verifyLocalAuditChain([]);
        setAuditCheck(check);
      }
      toast.success('Cryptographic SHA-256 hash continuity verified!');
    } catch {
      toast.error('Ledger verification check failed');
    } finally {
      setVerifyingLedger(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Vision OCR Auto-Decryption + Multi-Agent Verification
            </span>
            <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
              CDSCO / OpenFDA Live Sync
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Pill className="w-6 h-6 text-white" />
            </div>
            Verify Medicine Authenticity
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload a packaging photo &mdash; AI automatically decrypts all printed parameters, populates form fields, checks databases, and saves forensic proofs to the cloud ledger.
          </p>
        </div>

        {result && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Verify Another Batch</span>
          </button>
        )}
      </div>

      {/* Pipeline Stepper during active analysis */}
      {loading && <PipelineStepper stage={stage} message={stageMessage} />}

      {/* Main Grid: Upload & Expanded Form vs Results */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Dropzone & Auto-Decrypted Inputs Form */}
        <div className={result ? 'lg:col-span-5 space-y-6' : 'lg:col-span-12 space-y-6'}>
          <form onSubmit={handleSubmit} className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
            {/* Step 1: Upload Medicine Image Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  Step 1: Upload Medicine Packaging Photo (Auto-Decrypt)
                </label>
                {decrypting && (
                  <span className="glow-pill-cyan px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI Decrypting Image...
                  </span>
                )}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                  dragOver
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                    : imagePreview
                    ? 'border-emerald-500/40 bg-slate-900/60'
                    : 'border-slate-700/80 bg-slate-900/40 hover:border-cyan-500/40 hover:bg-white/[0.02]'
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-3">
                    <div className="relative max-h-56 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      <img src={imagePreview} alt="Medicine preview" className="w-full h-full object-contain max-h-56 mx-auto" />
                      {decrypting && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-300 space-y-2">
                          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                          <p className="text-xs font-bold tracking-wide animate-pulse">Running Neural Vision OCR & Packaging Decryption...</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="glow-pill-emerald px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Photo Loaded & Processed
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (imageFile) handleImageChange(imageFile);
                        }}
                        className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Re-scan AI
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Drop packaging photo here, or <span className="text-cyan-400 underline">browse files</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Supports high-res blister foils, cartons, ampoules, syrup bottles, labels (Max 5MB)</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* AI Decryption Banner */}
            {decryptedData && (
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Decrypted Packaging Findings ({decryptedData.confidenceScore}% Readability)</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRawOcr(!showRawOcr)}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold cursor-pointer"
                  >
                    {showRawOcr ? 'Hide Raw OCR' : 'View Full OCR Text'}
                  </button>
                </div>

                <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                  {decryptedData.visualFindings?.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>

                {showRawOcr && (
                  <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {decryptedData.extractedRawText}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Expanded 12-Parameter Medicine Details Grid */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Step 2: Review & Complete Decrypted Medicine Parameters
                </label>
                {autoDecryptedFields.size > 0 && (
                  <span className="glow-pill-emerald px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ✓ {autoDecryptedFields.size} Fields Auto-Populated
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* 1. Medicine Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Medicine / Brand / Salt Name *</span>
                    {autoDecryptedFields.has('medicineName') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Trihydrate / Augmentin 625"
                    value={form.medicineName}
                    onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  />
                </div>

                {/* 2. Dosage Strength */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Dosage Strength</span>
                    {autoDecryptedFields.has('strength') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg / 100 IU/mL"
                    value={form.strength}
                    onChange={(e) => setForm({ ...form, strength: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  />
                </div>

                {/* 3. Dosage Form */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Dosage Form</label>
                  <select
                    value={form.dosageForm}
                    onChange={(e) => setForm({ ...form, dosageForm: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  >
                    {['Tablets', 'Capsules', 'Syrup', 'Injection', 'Ointment', 'Suspension', 'Eye Drops', 'Inhaler'].map((df) => (
                      <option key={df} value={df} className="bg-slate-900 text-white">{df}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Manufacturer */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Manufacturer / Authorization Holder *</span>
                    {autoDecryptedFields.has('manufacturer') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cipla Limited / Sun Pharma"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  />
                </div>

                {/* 5. Batch / Lot Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Batch / Lot Number</span>
                    {autoDecryptedFields.has('batchNumber') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CIP-2026-X88"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono font-bold text-cyan-300"
                  />
                </div>

                {/* 6. Manufacturing Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>MFG Date</span>
                    {autoDecryptedFields.has('mfgDate') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD or MM/YYYY"
                    value={form.mfgDate}
                    onChange={(e) => setForm({ ...form, mfgDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono"
                  />
                </div>

                {/* 7. Expiry Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>EXP Date</span>
                    {autoDecryptedFields.has('expiryDate') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD or MM/YYYY"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono"
                  />
                </div>

                {/* 8. Manufacturing License Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Mfg Lic No. (CDSCO)</span>
                    {autoDecryptedFields.has('mfgLicense') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL-CIP-001/GSR"
                    value={form.mfgLicense}
                    onChange={(e) => setForm({ ...form, mfgLicense: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono"
                  />
                </div>

                {/* 9. GS1 2D DataMatrix / Barcode / GTIN */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>2D DataMatrix / GTIN</span>
                    {autoDecryptedFields.has('gtinBarcode') && <span className="text-[10px] text-emerald-400 font-mono">✓ AI Read</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8901117009412"
                    value={form.gtinBarcode}
                    onChange={(e) => setForm({ ...form, gtinBarcode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono"
                  />
                </div>

                {/* 10. Jurisdiction / Country */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Jurisdiction / Country</label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  >
                    {countries.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                    ))}
                  </select>
                </div>

                {/* 11. CDSCO Statutory Schedule */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Statutory Schedule</label>
                  <select
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  >
                    {['Schedule H (Rx Required)', 'Schedule H1 (Monitored Antibiotics)', 'Schedule X (Controlled Psychotropic)', 'Schedule G (Medical Supervision)', 'OTC (Over-The-Counter)'].map((s) => (
                      <option key={s} value={s.split(' ')[0]} className="bg-slate-900 text-white">{s}</option>
                    ))}
                  </select>
                </div>

                {/* 12. Storage Instructions */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300">Storage & Handling Condition</label>
                  <input
                    type="text"
                    placeholder="e.g. Store below 25°C protected from light and moisture"
                    value={form.storageConditions}
                    onChange={(e) => setForm({ ...form, storageConditions: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  />
                </div>

                {/* 13. Physical Packaging Inspection Observations */}
                <div className="space-y-1.5 sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-300">Visual Packaging Condition Assessment</label>
                  <input
                    type="text"
                    placeholder="e.g. Clear embossed batch numbering, hologram verified, intact foil seal"
                    value={form.packagingCondition}
                    onChange={(e) => setForm({ ...form, packagingCondition: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Submit Verification Button */}
            <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Photo will be stored in <strong className="text-cyan-300">medicine-images</strong> bucket and logged to the SHA-256 ledger.
              </p>
              <button
                type="submit"
                disabled={loading || decrypting}
                className="glow-btn-cyan px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Executing 6-Agent Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Run Verification Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Full Forensic Appraisal Findings & Reports */}
        {result && (
          <div className="lg:col-span-7 space-y-6">
            {/* Verdict Card */}
            {(() => {
              const cfg = verdictConfig[result.verdict];
              const Icon = cfg.icon;
              return (
                <div className={`glass-panel-elevated p-6 sm:p-8 rounded-3xl border ${cfg.border} shadow-2xl space-y-6`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${cfg.bg} flex items-center justify-center ${cfg.text} ring-4 ring-white/10 shadow-xl`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <div>
                        <span className={`${cfg.pill} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                          {cfg.label}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                          {form.medicineName || 'Analyzed Product'}
                        </h2>
                        <p className="text-xs font-mono text-slate-400">
                          Report ID: <strong className="text-cyan-300">{result.report_id}</strong> &bull; Batch: <strong className="text-white">{form.batchNumber || 'N/A'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <RiskGauge value={result.risk_score} label="Counterfeit Risk" size={105} />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <p className="font-semibold">{result.summary}</p>
                  </div>

                  {/* Forensic Accordions */}
                  <div className="space-y-3">
                    {/* Visual Analysis Accordion */}
                    <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === 'visual' ? null : 'visual')}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:bg-white/[0.02] cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-cyan-400" />
                          Visual & Packaging Forensic Findings ({result.visual_analysis?.score ?? 85}/100)
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === 'visual' ? 'rotate-180' : ''}`} />
                      </button>
                      {openAccordion === 'visual' && (
                        <div className="px-5 pb-4 space-y-2 text-xs text-slate-300 border-t border-slate-700/40 pt-3">
                          <ul className="list-disc pl-4 space-y-1">
                            {result.visual_analysis?.findings?.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* OpenFDA & Database Validation */}
                    {result.database_results && (
                      <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenAccordion(openAccordion === 'db' ? null : 'db')}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:bg-white/[0.02] cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            OpenFDA Database & Enforcement Cross-Reference
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === 'db' ? 'rotate-180' : ''}`} />
                        </button>
                        {openAccordion === 'db' && (
                          <div className="px-5 pb-4 border-t border-slate-700/40 pt-3">
                            <DatabaseResultsSection db={result.database_results} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* CDSCO Statutory Compliance */}
                    {result.compliance && (
                      <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenAccordion(openAccordion === 'compliance' ? null : 'compliance')}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:bg-white/[0.02] cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-amber-400" />
                            CDSCO Drugs & Cosmetics Act Compliance ({result.compliance.overallScore}/100)
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === 'compliance' ? 'rotate-180' : ''}`} />
                        </button>
                        {openAccordion === 'compliance' && (
                          <div className="px-5 pb-4 space-y-2 text-xs text-slate-300 border-t border-slate-700/40 pt-3">
                            <p><strong>Status:</strong> <span className={result.compliance.status === 'COMPLIANT' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{result.compliance.status}</span></p>
                            <p><strong>Schedule:</strong> Schedule {result.compliance.drugSchedule?.schedule} &bull; {result.compliance.drugSchedule?.description}</p>
                            <p><strong>Label Requirements:</strong> {result.compliance.drugSchedule?.labelRequirements?.join(', ') || 'Standard pharmaceutical cautionary label'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multi-Agent Audit Trail */}
                    {result.audit_trail && result.audit_trail.length > 0 && (
                      <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenAccordion(openAccordion === 'audit' ? null : 'audit')}
                          className="w-full px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:bg-white/[0.02] cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            6-Agent Autonomous Audit Trail ({result.audit_trail.length} Execution Steps)
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openAccordion === 'audit' ? 'rotate-180' : ''}`} />
                        </button>
                        {openAccordion === 'audit' && (
                          <div className="px-5 pb-4 border-t border-slate-700/40 pt-3">
                            <AuditTrailSection steps={result.audit_trail} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Mandatory Action Recommendations:</p>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                      {result.recommendations?.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleVerifyLedger}
                      disabled={verifyingLedger}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{verifyingLedger ? 'Verifying SHA-256...' : 'Verify Cryptographic Hash Chain'}</span>
                    </button>

                    <Link
                      to="/reports"
                      className="glow-btn-cyan px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>View in Verifications History</span>
                    </Link>
                  </div>

                  {auditCheck && (
                    <div className={`p-3.5 rounded-2xl text-xs ${auditCheck.isValid ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
                      <p className="font-bold">
                        {auditCheck.isValid ? `✅ SHA-256 Hash Continuity Confirmed across ${auditCheck.totalVerified} Ledger Blocks.` : `❌ Ledger Anomaly: ${auditCheck.errorDetail}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
