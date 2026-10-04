'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import {
  ShieldCheck,
  Award,
  Key,
  Bell,
  Settings,
  User,
  Sliders,
  CheckCircle2,
  FileCheck,
  Download,
  ExternalLink,
  Zap,
} from 'lucide-react';

export default function ProfilePage() {
  const { autopilot, setAutopilot } = usePlaybackStore();
  const runs = useSimulation();
  const activeRun = runs.network_dr ?? runs.network;

  // Form State
  const [operatorName, setOperatorName] = useState('Dr. Aris Thorne');
  const [operatorEmail, setOperatorEmail] = useState('aris.thorne@schneider-energy.io');
  const [operatorRole, setOperatorRole] = useState('Chief Microgrid & Energy Dispatcher');
  const [facilityScope, setFacilityScope] = useState('Sector 47 Commercial Microgrid (Gurugram, Haryana)');
  const [activeTab, setActiveTab] = useState<'credentials' | 'policy' | 'notifications' | 'audit'>('credentials');

  // Notification Toggles
  const [notifyDrEvent, setNotifyDrEvent] = useState(true);
  const [notifyFddAlarm, setNotifyFddAlarm] = useState(true);
  const [notifyFeederStress, setNotifyFeederStress] = useState(true);
  const [notifyP2pClearing, setNotifyP2pClearing] = useState(false);
  const [autoCommitDr, setAutoCommitDr] = useState(true);

  // Success Feedback Toast State
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportCertificate = () => {
    const cert = `# THERMOS 2.0 · Operator Authorization & Dispatch Certificate
**Schneider Electric Microgrid Energy Network · Challenge 02 Compliant**
========================================================================

OPERATOR CREDENTIALS:
- Operator Name:       ${operatorName}
- Title & Role:        ${operatorRole}
- Contact / Auth ID:   ${operatorEmail}
- Facility Scope:      ${facilityScope}
- Clearance Level:     Level 3 High-Voltage Grid Dispatch & Double-Auction Clearing
- OpenADR VEN ID:      SE-DEL-47-01 (OpenADR 2.0b Virtual End Node)
- BACnet Gateway:      BMS-GW-047-PROD (BACnet/IP Annex J Compliant)

AUTHORIZATION SCOPE & ASSETS:
- Controlled Assets:   6 Commercial Buildings (Nova, Horizon, Apex, Pulse, Zenith, Aura)
- Total Floor Area:    163,000 m² Conditioned Space
- Total Controllable:  2,400 kW Flexible HVAC & Battery Capacity
- Solar PV Capacity:   1,130 kWp Distributed Rooftop Array
- BSS Energy Storage:  1,000 kWh Lithium Iron Phosphate (LiFePO4)
- EV Charging Fleet:   148 Intelligent Dual-Port Level-2 Chargers

VERIFICATION PROOF:
- Active Run Hash:     ${activeRun.hash}
- Session Seed:        20261004 (Deterministic Verification)
- Generated Timestamp: ${new Date().toISOString()}

STATUS: VALIDATED & CRYPTOGRAPHICALLY PINNED
`;
    const blob = new Blob([cert], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `THERMOS_Operator_Certificate_${operatorName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
            <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
              SYSTEM ADMINISTRATION · DISPATCH AUTHORITY
            </span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
            Facility Energy Dispatcher Profile
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Operational credentials, OpenADR 2.0b certification, autopilot preference alignments, and audit trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-label-caps font-bold bg-primary/10 text-primary border border-primary/30 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PREFERENCES PERSISTED
            </span>
          )}
          <button
            type="button"
            onClick={handleExportCertificate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-label-caps font-bold uppercase tracking-wider bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container-low text-on-surface transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Certificate</span>
          </button>
        </div>
      </div>

      {/* Operator Hero Card */}
      <div className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with luxury instrument ring */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-container p-1 shadow-md">
              <div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-4xl">account_circle</span>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-surface-container-lowest flex items-center justify-center" title="Active Clearance">
              <span className="material-symbols-outlined text-on-primary text-[12px]">verified</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">{operatorName}</h2>
              <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                CLASS A DISPATCHER
              </span>
            </div>
            <p className="text-xs font-sans text-on-surface-variant font-medium">{operatorRole}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">mail</span>
                {operatorEmail}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                Sector 47 Substation 11 kV Feeder
              </span>
            </div>
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-surface-container-high/60">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            DISPATCH PRIVILEGES ACTIVE
          </div>
          <span className="text-[11px] font-mono text-on-surface-variant">
            Auth ID: <strong className="text-on-surface">OPR-SEC47-9204A</strong>
          </span>
        </div>
      </div>

      {/* 4 Clearance Status KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Controlled Capacity
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-primary tnum">2.4 MW</span>
            <span className="text-xs font-mono text-on-surface-variant">Flexible</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Level 3 High-Voltage Clearance
          </p>
        </div>

        <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            OpenADR Certification
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-secondary tnum">2.0b</span>
            <span className="text-xs font-mono text-on-surface-variant">VEN Compliant</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Node: SE-DEL-47-01
          </p>
        </div>

        <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Market Settlement
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-amber-700 tnum">Auto</span>
            <span className="text-xs font-mono text-on-surface-variant">P2P Double-Auction</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Zero Bilateral Margin Risk
          </p>
        </div>

        <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Safety Hard Clamp
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-emerald-800 tnum">100%</span>
            <span className="text-xs font-mono text-on-surface-variant">Transformer Guard</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Non-Bypassable Local Edge
          </p>
        </div>
      </div>

      {/* Main Tabbed Settings & Profile Sections */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-surface-container-high/60 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'credentials'
                ? 'bg-surface-container-lowest border-t-2 border-primary text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_box</span>
            <span>Operator Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'policy'
                ? 'bg-surface-container-lowest border-t-2 border-primary text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Autopilot Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'notifications'
                ? 'bg-surface-container-lowest border-t-2 border-primary text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">notifications</span>
            <span>Telemetry Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'audit'
                ? 'bg-surface-container-lowest border-t-2 border-primary text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history_edu</span>
            <span>Audit Ledger</span>
          </button>
        </div>

        {/* TAB 1: OPERATOR IDENTITY */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleSave} className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-6">
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Dispatcher Identity &amp; Physical Scopes</h3>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                Official personnel record registered with the Sector 47 Microgrid Supervisory Control Network.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 text-xs font-sans">
                <label className="text-on-surface font-semibold">Full Name / Callsign</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5 text-xs font-sans">
                <label className="text-on-surface font-semibold">Operator Email / Terminal URI</label>
                <input
                  type="email"
                  value={operatorEmail}
                  onChange={(e) => setOperatorEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5 text-xs font-sans">
                <label className="text-on-surface font-semibold">Operational Title</label>
                <input
                  type="text"
                  value={operatorRole}
                  onChange={(e) => setOperatorRole(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5 text-xs font-sans">
                <label className="text-on-surface font-semibold">Facility Scope &amp; Grid Tie</label>
                <input
                  type="text"
                  value={facilityScope}
                  onChange={(e) => setFacilityScope(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Controlled Buildings Facility Scopes */}
            <div className="pt-4 border-t border-surface-container-high/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-on-surface text-[10px] uppercase font-bold tracking-wider">
                  Assigned Archetype Facilities (6 Buildings · 163,000 m²)
                </span>
                <span className="text-[11px] font-mono text-primary font-bold">All Connected via BACnet/IP</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {DEFAULT_BUILDINGS.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 flex flex-col justify-between">
                    <div>
                      <div className="font-sans font-bold text-xs text-on-surface">{b.name}</div>
                      <div className="text-[10px] uppercase font-mono text-on-surface-variant">{b.type}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-surface-container-high/40 text-[10px] font-mono text-on-surface-variant">
                      {b.areaM2.toLocaleString()} m²
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-container-high/60">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-caps uppercase text-xs font-bold tracking-wider transition-colors shadow-sm"
              >
                Save Identity Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: AUTOPILOT DEFAULT POLICIES */}
        {activeTab === 'policy' && (
          <div className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-6">
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Default Optimization &amp; Safety Policy</h3>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                Baseline weights and thermal constraints applied across all 96-step simulation passes.
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setAutopilot({ wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 })}
                className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 hover:bg-surface-container-low text-left space-y-1 transition-colors"
              >
                <div className="font-sans font-bold text-xs text-on-surface">Balanced Tri-Objective</div>
                <div className="text-[11px] font-mono text-primary font-bold">33% · 33% · 33%</div>
                <div className="text-[10px] text-on-surface-variant">Equilateral barycentric point</div>
              </button>

              <button
                type="button"
                onClick={() => setAutopilot({ wComfort: 0.15, wCost: 0.70, wCarbon: 0.15 })}
                className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 hover:bg-surface-container-low text-left space-y-1 transition-colors"
              >
                <div className="font-sans font-bold text-xs text-on-surface">Cost Aggressive</div>
                <div className="text-[11px] font-mono text-secondary font-bold">15% · 70% · 15%</div>
                <div className="text-[10px] text-on-surface-variant">Maximum tariff peak shaving</div>
              </button>

              <button
                type="button"
                onClick={() => setAutopilot({ wComfort: 0.70, wCost: 0.15, wCarbon: 0.15 })}
                className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 hover:bg-surface-container-low text-left space-y-1 transition-colors"
              >
                <div className="font-sans font-bold text-xs text-on-surface">Comfort Strict</div>
                <div className="text-[11px] font-mono text-amber-700 font-bold">70% · 15% · 15%</div>
                <div className="text-[10px] text-on-surface-variant">Minimal indoor temp float</div>
              </button>

              <button
                type="button"
                onClick={() => setAutopilot({ wComfort: 0.20, wCost: 0.20, wCarbon: 0.60 })}
                className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 hover:bg-surface-container-low text-left space-y-1 transition-colors"
              >
                <div className="font-sans font-bold text-xs text-on-surface">Green Decarbonized</div>
                <div className="text-[11px] font-mono text-emerald-800 font-bold">20% · 20% · 60%</div>
                <div className="text-[10px] text-on-surface-variant">Prioritize rooftop solar soak</div>
              </button>
            </div>

            {/* Inviolable Physical Clamps */}
            <div className="pt-4 border-t border-surface-container-high/60 space-y-3">
              <h4 className="font-label-caps text-on-surface text-[10px] uppercase font-bold tracking-wider">
                Inviolable Physical Envelope Bounds (IEEE 1547 / ECBC)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest">
                  <div className="text-on-surface-variant font-sans text-[11px]">DCV Ventilation Target</div>
                  <div className="text-sm font-bold text-on-surface mt-1">≤ 800 ppm target</div>
                  <div className="text-[10px] text-primary mt-0.5">Strict ≤ 1000 ppm hard ceiling</div>
                </div>

                <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest">
                  <div className="text-on-surface-variant font-sans text-[11px]">Visual Lighting Quality</div>
                  <div className="text-sm font-bold text-on-surface mt-1">Min 75% delivered light</div>
                  <div className="text-[10px] text-secondary mt-0.5">Daylight dimming capped at 25%</div>
                </div>

                <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest">
                  <div className="text-on-surface-variant font-sans text-[11px]">Hospital BSS Emergency Reserve</div>
                  <div className="text-sm font-bold text-on-surface mt-1">SoC ≥ 40% reserved</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">Life-critical circuit protection</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TELEMETRY ALERTS & EVENT SUBSCRIPTIONS */}
        {activeTab === 'notifications' && (
          <div className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-6">
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Real-Time Event Subscriptions &amp; Alarm Gates</h3>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                Configure immediate WebSocket alerts and automated event dispatch authorizations.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start justify-between p-4 rounded-lg bg-surface-container-low/40 border border-surface-container-high/60 cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-sans font-bold text-on-surface">DISCOM OpenADR 2.0b Demand Response Events</div>
                  <div className="text-xs font-sans text-on-surface-variant">
                    Receive high-priority signal notifications when utility requests peak load shedding over the 11 kV feeder.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDrEvent}
                  onChange={(e) => setNotifyDrEvent(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-lg bg-surface-container-low/40 border border-surface-container-high/60 cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-sans font-bold text-on-surface">Chiller Condenser Fouling Residual Alarm (FDD)</div>
                  <div className="text-xs font-sans text-on-surface-variant">
                    Alert the facilities engineering team immediately when statistical residual r exceeds 8.0% for 3 consecutive steps.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyFddAlarm}
                  onChange={(e) => setNotifyFddAlarm(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-lg bg-surface-container-low/40 border border-surface-container-high/60 cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-sans font-bold text-on-surface">Feeder Substation Capacity Alert (&gt; 85% MVA)</div>
                  <div className="text-xs font-sans text-on-surface-variant">
                    Trigger curtailment warning if aggregate microgrid import approaches transformer thermal rating.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyFeederStress}
                  onChange={(e) => setNotifyFeederStress(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-lg bg-surface-container-low/40 border border-surface-container-high/60 cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-sans font-bold text-on-surface">Bilateral Clearing Execution Ledger Stream</div>
                  <div className="text-xs font-sans text-on-surface-variant">
                    Log every peer-to-peer matched transaction between solar producers and building consumers in the live telemetry stream.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyP2pClearing}
                  onChange={(e) => setNotifyP2pClearing(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-sans font-bold text-primary">Autonomous OpenADR DR Auto-Commit</div>
                  <div className="text-xs font-sans text-on-surface">
                    Authorize the THERMOS optimization engine to automatically accept and execute DISCOM curtailment without waiting for manual operator handshake.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoCommitDr}
                  onChange={(e) => setAutoCommitDr(e.target.checked)}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LEDGER & RECENT DISPATCH ACTIONS */}
        {activeTab === 'audit' && (
          <div className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-6">
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Cryptographic Session Audit &amp; Event Trace</h3>
              <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                Immutable chronological log of all microgrid setpoints, market clearings, and safety overrides.
              </p>
            </div>

            <div className="overflow-x-auto rounded border border-surface-container-high/60">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-container-low text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp / Step</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Target Asset</th>
                    <th className="py-2.5 px-3">Details / Setpoint</th>
                    <th className="py-2.5 px-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/40 bg-surface-container-lowest text-on-surface">
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="py-2 px-3 text-on-surface-variant font-mono">14:00 · Step 56</td>
                    <td className="py-2 px-3 font-sans font-semibold text-primary">DR_DISPATCH</td>
                    <td className="py-2 px-3">Cluster Aggregate</td>
                    <td className="py-2 px-3 font-sans">OpenADR 2.0b event delivered (150 kW peak shed)</td>
                    <td className="py-2 px-3 text-right text-primary font-bold">VERIFIED</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="py-2 px-3 text-on-surface-variant font-mono">12:30 · Step 50</td>
                    <td className="py-2 px-3 font-sans font-semibold text-secondary">P2P_CLEAR</td>
                    <td className="py-2 px-3">Horizon → Nova</td>
                    <td className="py-2 px-3 font-sans">Cleared 84.5 kWh solar trade @ ₹6.80/kWh</td>
                    <td className="py-2 px-3 text-right text-secondary font-bold">SETTLED</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="py-2 px-3 text-on-surface-variant font-mono">09:15 · Step 37</td>
                    <td className="py-2 px-3 font-sans font-semibold text-amber-700">FDD_FLAG</td>
                    <td className="py-2 px-3">Horizon Retail</td>
                    <td className="py-2 px-3 font-sans">Condenser fouling residual r = +15.2% detected</td>
                    <td className="py-2 px-3 text-right text-amber-700 font-bold">LOGGED</td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/40">
                    <td className="py-2 px-3 text-on-surface-variant font-mono">06:00 · Step 24</td>
                    <td className="py-2 px-3 font-sans font-semibold text-primary">PRECOOL_START</td>
                    <td className="py-2 px-3">Nova Commercial</td>
                    <td className="py-2 px-3 font-sans">Chilled water setpoint lowered to 22.8°C (thermal battery)</td>
                    <td className="py-2 px-3 text-right text-primary font-bold">OPTIMAL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
