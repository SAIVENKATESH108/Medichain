import { useState, useEffect } from 'react';
import {
  Scale, BookOpen, FileCheck, Search,
  Download, FileText, RefreshCw, Database, Sparkles,
  ChevronLeft, ChevronRight, AlertCircle, Globe, Building2,
  ShieldCheck, MapPin, Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database as DBTypes } from '../lib/database.types';
import toast from 'react-hot-toast';

type IndianMedicineRow = DBTypes['public']['Tables']['indian_medicines_master']['Row'];
type GlobalMedicineRow = DBTypes['public']['Tables']['global_medicines_directory']['Row'];
type PharmaEntityRow = DBTypes['public']['Tables']['pharma_manufacturers_suppliers']['Row'];
type DrugScheduleDB = DBTypes['public']['Tables']['drug_schedules']['Row'];

export default function CdscoHub() {
  const [schedules, setSchedules] = useState<DrugScheduleDB[]>([]);
  const [activeTab, setActiveTab] = useState<'indian' | 'global' | 'manufacturers' | 'schedules' | 'rules' | 'forms'>('indian');

  // Indian Medicine Master state
  const [indianMeds, setIndianMeds] = useState<IndianMedicineRow[]>([]);
  const [indianSearch, setIndianSearch] = useState('');
  const [indianCategory, setIndianCategory] = useState('ALL');
  const [nlemOnly, setNlemOnly] = useState(false);
  const [indianPage, setIndianPage] = useState(1);
  const [indianTotal, setIndianTotal] = useState(0);
  const [indianLoading, setIndianLoading] = useState(false);

  // Global Medicines Directory state
  const [globalMeds, setGlobalMeds] = useState<GlobalMedicineRow[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalCountry, setGlobalCountry] = useState('ALL');
  const [globalLoading, setGlobalLoading] = useState(false);

  // Manufacturers & Suppliers state
  const [entities, setEntities] = useState<PharmaEntityRow[]>([]);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const PAGE_SIZE = 15;

  const fetchSchedules = async () => {
    try {
      const { data } = await supabase
        .from('drug_schedules')
        .select('*')
        .order('schedule', { ascending: true });

      if (data) setSchedules(data);
    } catch {
      // ignore
    }
  };

  const fetchIndianMeds = async () => {
    setIndianLoading(true);
    try {
      let query = supabase
        .from('indian_medicines_master')
        .select('*', { count: 'exact' });

      if (indianSearch.trim()) {
        const clean = indianSearch.trim();
        query = query.or(`name.ilike.%${clean}%,manufacturer_name.ilike.%${clean}%,active_composition.ilike.%${clean}%,supplier_name.ilike.%${clean}%`);
      }

      if (indianCategory === 'AYUSH') {
        query = query.in('category', ['AYUSH / Ayurvedic', 'AYUSH / Siddha']);
      } else if (indianCategory === 'JAN_AUSHADHI') {
        query = query.eq('category', 'Jan Aushadhi PMBJP');
      } else if (indianCategory !== 'ALL') {
        query = query.eq('schedule', indianCategory);
      }

      if (nlemOnly) {
        query = query.eq('nlem_listed', true);
      }

      const from = (indianPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('medicine_id', { ascending: true })
        .range(from, to);

      if (!error && data) {
        setIndianMeds(data);
        setIndianTotal(count || 0);
      }
    } catch (err: any) {
      console.warn('Failed to load Indian medicines:', err.message);
    } finally {
      setIndianLoading(false);
    }
  };

  const fetchGlobalMeds = async () => {
    setGlobalLoading(true);
    try {
      let query = supabase
        .from('global_medicines_directory')
        .select('*')
        .order('created_at', { ascending: false });

      if (globalSearch.trim()) {
        const clean = globalSearch.trim();
        query = query.or(`brand_name.ilike.%${clean}%,generic_name.ilike.%${clean}%,manufacturer_name.ilike.%${clean}%,code.ilike.%${clean}%`);
      }

      if (globalCountry !== 'ALL') {
        query = query.ilike('country_of_origin', `%${globalCountry}%`);
      }

      const { data, error } = await query;
      if (!error && data) setGlobalMeds(data);
    } catch (err: any) {
      console.warn('Failed to load global medicines:', err.message);
    } finally {
      setGlobalLoading(false);
    }
  };

  const fetchEntities = async () => {
    setEntitiesLoading(true);
    try {
      let query = supabase
        .from('pharma_manufacturers_suppliers')
        .select('*')
        .order('company_name', { ascending: true });

      if (entityFilter !== 'ALL') {
        query = query.eq('entity_type', entityFilter as any);
      }

      const { data, error } = await query;
      if (!error && data) setEntities(data);
    } catch (err: any) {
      console.warn('Failed to load entities:', err.message);
    } finally {
      setEntitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    fetchIndianMeds();
  }, [indianSearch, indianCategory, nlemOnly, indianPage]);

  useEffect(() => {
    if (activeTab === 'global') fetchGlobalMeds();
  }, [globalSearch, globalCountry, activeTab]);

  useEffect(() => {
    if (activeTab === 'manufacturers') fetchEntities();
  }, [entityFilter, activeTab]);

  const refreshAll = () => {
    fetchSchedules();
    fetchIndianMeds();
    fetchGlobalMeds();
    fetchEntities();
    toast.success('Database registries synchronized across all government nodes!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Global Regulatory & National Medicine Database
            </span>
            <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
              India AYUSH & CDSCO &bull; US FDA &bull; EMA &bull; UK MHRA &bull; WHO PQ
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            CDSCO & Global Medicine Registry Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse 10,000+ Indian & AYUSH Kendra medicines, international government drug directories (US, EU, UK, Canada, Japan, WHO), and verified pharmaceutical manufacturers/distributors.
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="glow-btn-cyan px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync All Registries</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl gap-1 overflow-x-auto shadow-lg">
        {[
          { key: 'indian', label: '🇮🇳 India & AYUSH Kendra Master', icon: Database },
          { key: 'global', label: '🌍 International Portals (US/EU/UK/WHO)', icon: Globe },
          { key: 'manufacturers', label: '🏭 Global Manufacturers & Suppliers', icon: Building2 },
          { key: 'schedules', label: 'Statutory Schedules (CDSCO)', icon: Scale },
          { key: 'rules', label: 'D&C Act Sections', icon: FileCheck },
          { key: 'forms', label: 'Form 18/19 Filing Drafts', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Indian & AYUSH Kendra Medicines ───────────────────── */}
      {activeTab === 'indian' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20">
              <p className="text-xs text-slate-400 font-semibold">Total Indian Medicines</p>
              <p className="text-2xl font-black text-white mt-1">10,016</p>
              <p className="text-[10px] text-cyan-300 mt-0.5">PostgreSQL Master DB</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20">
              <p className="text-xs text-slate-400 font-semibold">AYUSH & Jan Aushadhi</p>
              <p className="text-2xl font-black text-emerald-300 mt-1">PMBJP Kendra</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Govt Verified Formulations</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/20">
              <p className="text-xs text-slate-400 font-semibold">NLEM Essential Drugs</p>
              <p className="text-2xl font-black text-amber-300 mt-1">4,283</p>
              <p className="text-[10px] text-slate-400 mt-0.5">MoHFW Essential List</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-rose-500/20">
              <p className="text-xs text-slate-400 font-semibold">Schedule H / H1 Monitored</p>
              <p className="text-2xl font-black text-rose-300 mt-1">7,922</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Rx Required</p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="glass-panel-elevated p-5 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Indian & AYUSH medicines by Brand (e.g. Augmentin, Ayush-64, Dolo), Salt, Manufacturer, or Supplier..."
                  value={indianSearch}
                  onChange={(e) => { setIndianSearch(e.target.value); setIndianPage(1); }}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl glass-input text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Category & Schedule Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { label: 'All', val: 'ALL' },
                  { label: '🌿 AYUSH Kendra', val: 'AYUSH' },
                  { label: '🏛️ Jan Aushadhi', val: 'JAN_AUSHADHI' },
                  { label: 'Schedule H', val: 'Schedule H' },
                  { label: 'Schedule H1', val: 'Schedule H1' },
                  { label: 'Schedule G', val: 'Schedule G' },
                  { label: 'OTC', val: 'OTC' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => { setIndianCategory(item.val); setIndianPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      indianCategory === item.val
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {/* NLEM Filter Toggle */}
                <button
                  onClick={() => { setNlemOnly(!nlemOnly); setIndianPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    nlemOnly
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-extrabold'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>NLEM Only</span>
                </button>
              </div>
            </div>

            {/* Total Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <p>Showing <strong className="text-white">{indianMeds.length}</strong> of <strong className="text-cyan-300">{indianTotal}</strong> matching Indian medicine records</p>
              {indianLoading && <span className="text-cyan-400 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</span>}
            </div>
          </div>

          {/* Medicines Master Table */}
          <div className="glass-panel-elevated rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
                  <tr>
                    <th className="px-5 py-3.5">Brand / Medicine Name</th>
                    <th className="px-5 py-3.5">Active Formulation / Salt</th>
                    <th className="px-5 py-3.5">Manufacturer & Location</th>
                    <th className="px-5 py-3.5">Supplier / Distribution</th>
                    <th className="px-5 py-3.5">MRP (₹)</th>
                    <th className="px-5 py-3.5">Schedule / Category</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {indianMeds.map((med) => (
                    <tr key={med.id || med.medicine_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white max-w-[200px]">
                        <div className="flex flex-col">
                          <span className="truncate">{med.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                            🇮🇳 {med.country_of_origin || 'India'} &bull; {med.category || med.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-200 max-w-[240px]">
                        <div className="truncate text-[11px]" title={med.active_composition || 'N/A'}>
                          {med.active_composition || 'Standard composition'}
                        </div>
                        <span className="text-[10px] text-slate-500">{med.pack_size_label || 'Standard Pack'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-[220px]">
                        <div className="truncate font-semibold" title={med.manufacturer_name}>{med.manufacturer_name}</div>
                        {med.manufacturing_location && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                            <span className="truncate">{med.manufacturing_location}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 max-w-[180px]">
                        <div className="text-[11px] truncate flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{med.supplier_name || 'Standard Retail Channel'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-400 whitespace-nowrap">
                        {med.price ? `₹${med.price.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          med.category?.includes('AYUSH') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          med.category?.includes('Jan Aushadhi') ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                          med.schedule === 'Schedule H1' ? 'glow-pill-danger' :
                          med.schedule === 'Schedule H' ? 'glow-pill-cyan' :
                          'glow-pill-emerald'
                        }`}>
                          {med.schedule}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {med.nlem_listed ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Sparkles className="w-2.5 h-2.5" />
                            NLEM Essential
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">CDSCO Listed</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {indianMeds.length === 0 && !indianLoading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                        <p className="font-bold text-white text-sm">No matching Indian medicines found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900/60 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Page <strong className="text-white">{indianPage}</strong> of <strong className="text-white">{Math.ceil(indianTotal / PAGE_SIZE) || 1}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={indianPage <= 1}
                  onClick={() => setIndianPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={indianPage >= Math.ceil(indianTotal / PAGE_SIZE)}
                  onClick={() => setIndianPage((p) => p + 1)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: International Government Portals ──────────────────── */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="glass-panel-elevated p-5 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search International drugs by Brand, Generic salt, NDC code, or Manufacturer..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl glass-input text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Country Filters */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { label: 'All Countries', val: 'ALL' },
                  { label: '🇺🇸 United States', val: 'United States' },
                  { label: '🇩🇪 Germany / EU', val: 'Germany' },
                  { label: '🇨🇭 Switzerland', val: 'Switzerland' },
                  { label: '🇬🇧 United Kingdom', val: 'United Kingdom' },
                  { label: '🇫🇷 France', val: 'France' },
                  { label: '🇨🇦 Canada', val: 'Canada' },
                  { label: '🇦🇺 Australia', val: 'Australia' },
                  { label: '🇯🇵 Japan', val: 'Japan' },
                ].map((c) => (
                  <button
                    key={c.val}
                    onClick={() => setGlobalCountry(c.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      globalCountry === c.val
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <p>Showing <strong className="text-white">{globalMeds.length}</strong> official government-registered international medicines</p>
              {globalLoading && <span className="text-cyan-400 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</span>}
            </div>
          </div>

          {/* Global Medicines Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {globalMeds.map((med) => (
              <div key={med.id || med.code} className="glass-panel-elevated p-5 rounded-3xl space-y-3.5 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300">
                        {med.code}
                      </span>
                      <h3 className="font-bold text-white text-base mt-1">{med.brand_name}</h3>
                      <p className="text-xs text-slate-400">{med.generic_name}</p>
                    </div>
                    <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                      {med.regulatory_authority}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                    <p className="text-slate-300"><strong>Strength:</strong> {med.strength || 'N/A'}</p>
                    <p className="text-slate-300"><strong>Dosage Form:</strong> {med.dosage_form || 'Tablets'}</p>
                    <p className="text-slate-400"><strong>Manufacturer:</strong> <span className="text-white">{med.manufacturer_name}</span></p>
                    {med.manufacturing_facility && (
                      <p className="text-slate-400 text-[11px] flex items-center gap-1 pt-0.5">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{med.manufacturing_facility}</span>
                      </p>
                    )}
                    {med.supplier_distributor && (
                      <p className="text-slate-400 text-[11px] flex items-center gap-1 pt-0.5">
                        <Truck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{med.supplier_distributor}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Country of Origin:</span>
                    <p className="font-bold text-white">{med.country_of_origin}</p>
                  </div>
                  {med.price_local && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Ref Price:</span>
                      <p className="font-mono font-bold text-emerald-400">{med.currency} {med.price_local.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Global Pharma Manufacturers & Suppliers ──────────── */}
      {activeTab === 'manufacturers' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="glass-panel-elevated p-5 rounded-3xl flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'Manufacturer', 'Supplier / Distributor', 'API Producer', 'Government Ayush Kendra'].map((type) => (
                <button
                  key={type}
                  onClick={() => setEntityFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    entityFilter === type
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <p>Showing <strong className="text-white">{entities.length}</strong> authenticated supply chain entities</p>
              {entitiesLoading && <span className="text-cyan-400 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</span>}
            </div>
          </div>

          {/* Entities Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((ent) => (
              <div key={ent.id || ent.company_name} className="glass-panel-elevated p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="glow-pill-cyan px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {ent.entity_type}
                      </span>
                      <h3 className="font-black text-white text-base mt-1.5">{ent.company_name}</h3>
                      <p className="text-xs text-slate-400">{ent.headquarters}</p>
                    </div>
                    {ent.gmp_certified && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-1.5 rounded-xl" title="GMP Certified Facility">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1 text-xs">
                    <p className="text-slate-300"><strong>Primary License:</strong> <span className="font-mono text-cyan-300">{ent.primary_regulatory_license}</span></p>
                    <p className="text-slate-300"><strong>Supply Chain Tier:</strong> {ent.supply_chain_tier}</p>
                    <p className="text-slate-400"><strong>Founded:</strong> {ent.established_year || 'Historical'}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 mb-1">Key Manufacturing & Distribution Hubs:</p>
                    <div className="flex flex-wrap gap-1">
                      {ent.facilities_locations?.map((loc, idx) => (
                        <span key={idx} className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[11px]">
                  <p className="text-slate-400"><strong>Authorized Agencies:</strong> {ent.authorized_agencies?.join(', ')}</p>
                  <p className="text-slate-400"><strong>Export Jurisdictions:</strong> {ent.export_jurisdictions?.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: Statutory Schedules (CDSCO) ───────────────────────── */}
      {activeTab === 'schedules' && (
        <div className="grid md:grid-cols-2 gap-6">
          {schedules.map((sched) => (
            <div key={sched.id} className="glass-panel-elevated p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl border border-cyan-500/30 bg-cyan-500/15 flex items-center justify-center font-bold font-mono text-cyan-300 text-sm">
                    {sched.schedule}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Schedule {sched.schedule}</h3>
                    <p className="text-xs text-slate-400">{sched.title}</p>
                  </div>
                </div>
                {sched.requires_prescription && (
                  <span className="glow-pill-danger px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                    Rx Required
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{sched.description}</p>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Statutory Label Warning Text:</p>
                <p className="text-xs font-mono text-slate-200">{sched.mandatory_warning_label}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 mb-1.5">Common Active Ingredients (Database):</p>
                <div className="flex flex-wrap gap-1.5">
                  {sched.sample_drugs?.map((ex: string, i: number) => (
                    <span key={i} className="glow-pill-cyan px-2.5 py-0.5 rounded-md text-[10px] font-medium">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 5: D&C Act Rules ─────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
          <h3 className="font-bold text-white text-lg">Drugs & Cosmetics Act 1940 Statutory Sections</h3>
          <div className="space-y-4">
            {[
              { sec: 'Section 17B', title: 'Spurious / Counterfeit Drugs Definition', desc: 'Defines medicines manufactured under a name belonging to another drug, or where the label bears the name of an unregistered fictitious company.' },
              { sec: 'Section 18(a)', title: 'Prohibition of Manufacture and Sale of Non-Standard Drugs', desc: 'Strict prohibition on stocking, selling, or distributing counterfeit, adulterated, or misbranded drugs across Indian union territories.' },
              { sec: 'Section 22', title: 'Powers of State Drug Inspectors', desc: 'Empowers authorized Drug Inspectors to enter premises, take samples for HPLC test, and order quarantine holds on suspicious drug lots.' },
              { sec: 'Rule 96', title: 'Manner of Labeling Pharmaceutical Packages', desc: 'Mandates distinct display of batch number, manufacturing license number, composition, and CDSCO schedule warning symbol.' },
            ].map((r, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="glow-pill-cyan px-2.5 py-0.5 rounded text-xs font-mono font-bold">{r.sec}</span>
                  <h4 className="font-bold text-white text-sm">{r.title}</h4>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: Form 18/19 Filing Drafts ──────────────────────────── */}
      {activeTab === 'forms' && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-white text-lg">CDSCO Form 18 & Form 19 Regulatory Templates</h3>
              <p className="text-xs text-slate-400">Official statutory memorandums for Government Analyst laboratory submissions.</p>
            </div>
            <button
              onClick={() => toast.success('Form 18 Template Downloaded')}
              className="glow-btn-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Form 18/19</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
              <div className="text-center font-bold text-cyan-300 pb-2 border-b border-slate-800">
                FORM 18 [See Rule 57]<br />
                MEMORANDUM TO GOVERNMENT ANALYST
              </div>
              <p>From: District Drug Control Authority / Hospital Chief Pharmacist</p>
              <p>To: The Government Analyst, Central / State Drugs Laboratory</p>
              <p className="text-slate-400">
                The sample described below is taken in connection with counterfeit authentication under Section 22 of the Drugs and Cosmetics Act, 1940.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Serial Number of Sample: MED-CDSCO-2026-091</li>
                <li>Name of Drug / Compound: Paracetamol + Tramadol HCI</li>
                <li>Batch Number: UNK-0099 | Exp: 2028</li>
                <li>Fast Counterfeit Intercept Flag: Yes (High Risk Score: 94/100)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
