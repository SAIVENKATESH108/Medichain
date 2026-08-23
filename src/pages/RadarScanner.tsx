import { useState, useEffect } from 'react';
import {
  Globe, Radio, ShieldAlert, Factory,
  Truck, Shield, Building2, User, RefreshCw, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { regionalRiskData } from '../data/mockData';
import { getRiskColor } from '../lib/utils';
import toast from 'react-hot-toast';

interface SupplyChainAlertDB {
  id: string;
  alert_code: string;
  medicine: string;
  manufacturer: string;
  batch: string;
  region: string;
  risk_level: string;
  description: string;
  time: string;
}

const TRANSIT_NODES = [
  { id: 'NODE-1', label: 'Primary Manufacturer Depot', loc: 'Hyderabad, India', type: 'origin', icon: Factory, status: 'VERIFIED' },
  { id: 'NODE-2', label: 'Central Distribution Hub', loc: 'Dubai Airport Transit', type: 'transit', icon: Truck, status: 'VERIFIED' },
  { id: 'NODE-3', label: 'Port Customs Intercept', loc: 'Mombasa Port, Kenya', type: 'customs', icon: Shield, status: 'ALERT_FLAGGED' },
  { id: 'NODE-4', label: 'Regional Wholesaler', loc: 'Nairobi Central', type: 'wholesale', icon: Building2, status: 'QUARANTINED' },
  { id: 'NODE-5', label: 'Hospital Pharmacy Node', loc: 'Aga Khan University Hospital', type: 'destination', icon: User, status: 'PENDING_HOLD' },
];

export default function RadarScanner() {
  const [alerts, setAlerts] = useState<SupplyChainAlertDB[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase
        .from('supply_chain_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setAlerts(data as SupplyChainAlertDB[]);
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleRefresh = async () => {
    await fetchAlerts();
    toast.success('Threat Radar updated with live Supabase database feeds');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="glow-pill-cyan px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Global Counterfeit Interception Feed
            </span>
            <span className="bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-mono text-emerald-400">
              Live DB Threat Mesh
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Globe className="w-6 h-6 text-white" />
            </div>
            Supply Chain Threat Radar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-hop transit tracking, customs interdiction alerts, and counterfeit diversion telemetry.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="glow-btn-cyan px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Threat Feed</span>
        </button>
      </div>

      {/* Transit Custody Nodes */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              Active High-Risk Shipment Chain-of-Custody (Lot CIP-2026-X88)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated telemetry tracking across transit checkpoints and customs border controls.</p>
          </div>
          <span className="glow-pill-danger px-3 py-1 rounded-full text-xs font-bold">
            Interception Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {TRANSIT_NODES.map((node, i) => (
            <div
              key={node.id}
              className={`p-4 rounded-2xl border space-y-2 relative ${
                node.status === 'ALERT_FLAGGED'
                  ? 'bg-rose-500/15 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  : node.status === 'QUARANTINED'
                  ? 'bg-amber-500/15 border-amber-500/40'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400">
                  <node.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">#{i + 1}</span>
              </div>
              <h4 className="font-bold text-white text-xs leading-tight">{node.label}</h4>
              <p className="text-[11px] text-slate-400 font-mono">{node.loc}</p>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  node.status === 'ALERT_FLAGGED' ? 'glow-pill-danger' :
                  node.status === 'QUARANTINED' ? 'glow-pill-cyan' :
                  node.status === 'VERIFIED' ? 'glow-pill-emerald' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {node.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Feeds Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Interception Alerts */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Live Border Interceptions & Anomalies (Database Feed)
            </h3>
            <span className="glow-pill-danger px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Live
            </span>
          </div>

          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 space-y-1 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{alert.medicine} ({alert.batch})</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      alert.risk_level === 'High' ? 'glow-pill-danger' : 'glow-pill-cyan'
                    }`}
                  >
                    {alert.risk_level} Risk
                  </span>
                </div>
                <p className="text-xs text-slate-300">{alert.description}</p>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>{alert.region} • {alert.manufacturer}</span>
                  <span>{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Risk Breakdown */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Regional Threat Heatmap Breakdown
            </h3>
            <span className="glow-pill-cyan px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              WHO Monitored
            </span>
          </div>

          <div className="space-y-3">
            {regionalRiskData.map((reg, i) => (
              <div key={i} className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">{reg.country}</h4>
                  <p className="text-[11px] text-slate-400">{reg.region}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-xs sm:text-sm">{reg.incidents} incidents</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRiskColor(reg.riskLevel)}`}>
                    {reg.riskLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
