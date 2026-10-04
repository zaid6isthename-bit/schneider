'use client';

import React from 'react';
import { Layers, ShieldCheck, Cpu, Cloud, ArrowRightLeft, Radio, Zap, HelpCircle } from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      {/* Title & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
            <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
              PHYSICAL &amp; LOGICAL TOPOLOGY
            </span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
            End-to-End System Architecture
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            5-tier instrumentation: Field telemetry, Edge safety gate, Cloud MPC optimization, Actuation outputs, and DISCOM OpenADR 2.0b
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-surface-container-low text-on-surface border border-surface-container-high">
            IEEE 1547 · BACnet/IP · OpenADR 2.0b
          </span>
        </div>
      </div>

      {/* Hand-built Layered SVG Architecture Diagram */}
      <div className="p-4 md:p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest overflow-x-auto shadow-sm">
        <div className="min-w-[950px]">
          <svg viewBox="0 0 1000 520" className="w-full h-auto text-on-surface select-none">
            <defs>
              {/* Flow Arrows Markers */}
              <marker id="arrow-data" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M 1 1 L 7 4 L 1 7 Z" fill="#626469" />
              </marker>
              <marker id="arrow-control" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M 1 1 L 7 4 L 1 7 Z" fill="#009530" />
              </marker>
              <marker id="arrow-energy" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M 1 1 L 7 4 L 1 7 Z" fill="#E47F00" />
              </marker>
              <marker id="arrow-money" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M 1 1 L 7 4 L 1 7 Z" fill="#000000" />
              </marker>
            </defs>

            {/* Background Column Bounding Boxes */}
            {/* 1. Field Layer */}
            <rect x="20" y="40" width="165" height="450" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="32" y="65" fill="#0f172a" fontSize="12" fontWeight="bold" fontFamily="monospace">1. FIELD LAYER</text>
            <text x="32" y="80" fill="#64748b" fontSize="10">Sensors &amp; DER Assets</text>

            {/* 2. Edge Gateway */}
            <rect x="210" y="40" width="165" height="450" rx="8" fill="#f0f9ff" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="222" y="65" fill="#0369a1" fontSize="12" fontWeight="bold" fontFamily="monospace">2. EDGE GATEWAY</text>
            <text x="222" y="80" fill="#64748b" fontSize="10">Protocols &amp; Local Safety</text>

            {/* 3. THERMOS Cloud */}
            <rect x="400" y="40" width="200" height="450" rx="8" fill="#f0fdf4" stroke="#86efac" strokeWidth="2" />
            <text x="412" y="65" fill="#15803d" fontSize="12" fontWeight="bold" fontFamily="monospace">3. THERMOS CLOUD</text>
            <text x="412" y="80" fill="#64748b" fontSize="10">Intelligence &amp; Coordination</text>

            {/* 4. Control Outputs */}
            <rect x="625" y="40" width="165" height="450" rx="8" fill="#f0f9ff" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="637" y="65" fill="#0369a1" fontSize="12" fontWeight="bold" fontFamily="monospace">4. CONTROL OUTPUTS</text>
            <text x="637" y="80" fill="#64748b" fontSize="10">Actuation &amp; Setpoints</text>

            {/* 5. External Grid */}
            <rect x="815" y="40" width="165" height="450" rx="8" fill="#fffbeb" stroke="#fcd34d" strokeWidth="1.5" />
            <text x="827" y="65" fill="#b45309" fontSize="12" fontWeight="bold" fontFamily="monospace">5. EXTERNAL GRID</text>
            <text x="827" y="80" fill="#64748b" fontSize="10">DISCOM &amp; Market Data</text>

            {/* --- FIELD LAYER BOXES --- */}
            <g transform="translate(30, 95)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">PIR &amp; BLE Sensors</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">Occupancy Count N(k)</text>
            </g>
            <g transform="translate(30, 155)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">CO₂ &amp; Temp Probes</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">Indoor Air Quality &amp; Tin</text>
            </g>
            <g transform="translate(30, 215)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">Class 0.2 Smart Meters</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">Main, Chiller, Light, Plugs</text>
            </g>
            <g transform="translate(30, 275)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">Solar PV Inverters</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">SunSpec Modbus Gen kW</text>
            </g>
            <g transform="translate(30, 335)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">BTM Battery Inverters</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">CAN / Modbus SoC &amp; kW</text>
            </g>
            <g transform="translate(30, 395)">
              <rect width="145" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1" />
              <text x="10" y="20" fill="#0f172a" fontSize="11" fontWeight="600">EV Fleet Chargers</text>
              <text x="10" y="36" fill="#64748b" fontSize="9">OCPP 1.6 / 2.0.1 Telemetry</text>
            </g>

            {/* --- EDGE GATEWAY BOXES --- */}
            <g transform="translate(220, 95)">
              <rect width="145" height="75" rx="6" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="10" y="20" fill="#0369a1" fontSize="11" fontWeight="bold">Protocol Adapters</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• BACnet/IP (BMS)</text>
              <text x="10" y="52" fill="#475569" fontSize="9.5">• Modbus TCP (Meters)</text>
              <text x="10" y="66" fill="#475569" fontSize="9.5">• MQTT / TLS 1.3</text>
            </g>
            <g transform="translate(220, 195)">
              <rect width="145" height="85" rx="6" fill="#ffffff" stroke="#f43f5e" strokeWidth="1.2" />
              <text x="10" y="20" fill="#be123c" fontSize="11" fontWeight="bold">Local Safety Guard</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• Hard thermal clamps</text>
              <text x="10" y="52" fill="#475569" fontSize="9.5">• Transformer limit 100%</text>
              <text x="10" y="66" fill="#475569" fontSize="9.5">• Chiller short-cycle lock</text>
              <text x="10" y="80" fill="#475569" fontSize="9.5">• Watchdog 30s timeout</text>
            </g>
            <g transform="translate(220, 310)">
              <rect width="145" height="80" rx="6" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.2" />
              <text x="10" y="20" fill="#b45309" fontSize="11" fontWeight="bold">BMS Schedule Fallback</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• Offline autonomy</text>
              <text x="10" y="52" fill="#475569" fontSize="9.5">• Auto-reverts to timer</text>
              <text x="10" y="66" fill="#475569" fontSize="9.5">• Zero blackout risk</text>
            </g>

            {/* --- THERMOS CLOUD BOXES --- */}
            <g transform="translate(410, 95)">
              <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">TimeSeries &amp; Telemetry Store</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">15-min granular state &amp; baseline cache</text>
            </g>
            <g transform="translate(410, 155)">
              <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">AI Forecasting Service</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">Weather, occupancy curves &amp; PV yield</text>
            </g>
            <g transform="translate(410, 215)">
              <rect width="180" height="60" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">L1 Building MPC Optimizer</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">• Pre-cooling &amp; peak coasting</text>
              <text x="10" y="52" fill="#64748b" fontSize="9">• DCV CO₂ ventilation &amp; dimming</text>
            </g>
            <g transform="translate(410, 283)">
              <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">Model-Based FDD Service</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">Residual r &gt; 8% chiller fouling detector</text>
            </g>
            <g transform="translate(410, 343)">
              <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">L2 Double-Auction P2P Market</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">Feeder-constrained solar trading &amp; billing</text>
            </g>
            <g transform="translate(410, 403)">
              <rect width="180" height="52" rx="6" fill="#ffffff" stroke="#86efac" strokeWidth="1.2" />
              <text x="10" y="20" fill="#15803d" fontSize="11" fontWeight="bold">L3 VPP / DR Orchestrator</text>
              <text x="10" y="38" fill="#64748b" fontSize="9">Cluster capacity dispatch &amp; settlements</text>
            </g>

            {/* --- CONTROL OUTPUTS BOXES --- */}
            <g transform="translate(635, 95)">
              <rect width="145" height="60" rx="6" fill="#ffffff" stroke="#7dd3fc" />
              <text x="10" y="20" fill="#0369a1" fontSize="11" fontWeight="bold">BMS Setpoints &amp; Fan</text>
              <text x="10" y="36" fill="#475569" fontSize="9">• Chilled water Tset (°C)</text>
              <text x="10" y="50" fill="#475569" fontSize="9">• VAV outdoor CFM / L/s</text>
            </g>
            <g transform="translate(635, 175)">
              <rect width="145" height="50" rx="6" fill="#ffffff" stroke="#7dd3fc" />
              <text x="10" y="20" fill="#0369a1" fontSize="11" fontWeight="bold">DALI / 0-10V Lighting</text>
              <text x="10" y="38" fill="#475569" fontSize="9">• Daylight dimming (≥ 75%)</text>
            </g>
            <g transform="translate(635, 245)">
              <rect width="145" height="50" rx="6" fill="#ffffff" stroke="#7dd3fc" />
              <text x="10" y="20" fill="#0369a1" fontSize="11" fontWeight="bold">EV Smart Charging</text>
              <text x="10" y="38" fill="#475569" fontSize="9">• Peak curtailment &amp; delay</text>
            </g>
            <g transform="translate(635, 315)">
              <rect width="145" height="60" rx="6" fill="#ffffff" stroke="#7dd3fc" />
              <text x="10" y="20" fill="#0369a1" fontSize="11" fontWeight="bold">BTM Battery Inverter</text>
              <text x="10" y="36" fill="#475569" fontSize="9">• Charge kW (Solar/Offpeak)</text>
              <text x="10" y="50" fill="#475569" fontSize="9">• Discharge kW (Peak/P2P)</text>
            </g>

            {/* --- EXTERNAL GRID BOXES --- */}
            <g transform="translate(825, 95)">
              <rect width="145" height="85" rx="6" fill="#ffffff" stroke="#fcd34d" />
              <text x="10" y="20" fill="#b45309" fontSize="11" fontWeight="bold">DISCOM Demand Response</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• OpenADR 2.0b Signal In</text>
              <text x="10" y="54" fill="#475569" fontSize="9.5">• Delivered kW Telemetry</text>
              <text x="10" y="70" fill="#15803d" fontSize="9.5">• DR Incentive Settled (₹)</text>
            </g>
            <g transform="translate(825, 205)">
              <rect width="145" height="60" rx="6" fill="#ffffff" stroke="#fcd34d" />
              <text x="10" y="20" fill="#b45309" fontSize="11" fontWeight="bold">Dynamic ToD Tariffs</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• Peak ₹11 / Normal ₹8.5</text>
              <text x="10" y="52" fill="#475569" fontSize="9.5">• Feed-in ₹3.0 / kWh</text>
            </g>
            <g transform="translate(825, 290)">
              <rect width="145" height="50" rx="6" fill="#ffffff" stroke="#fcd34d" />
              <text x="10" y="20" fill="#b45309" fontSize="11" fontWeight="bold">NWP Weather Service</text>
              <text x="10" y="38" fill="#475569" fontSize="9.5">• Ambient temp &amp; solar GHI</text>
            </g>

            {/* --- INTER-LAYER CONNECTING ARROWS --- */}
            {/* Field to Edge (Data: Grey) */}
            <line x1="175" y1="120" x2="215" y2="120" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow-data)" />
            <line x1="175" y1="180" x2="215" y2="140" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow-data)" />
            <line x1="175" y1="240" x2="215" y2="155" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow-data)" />

            {/* Edge to Cloud (Data: Grey) */}
            <line x1="365" y1="125" x2="405" y2="125" stroke="#64748b" strokeWidth="2.5" markerEnd="url(#arrow-data)" />

            {/* Cloud to Control Outputs (Control: Schneider Green) */}
            <line x1="590" y1="245" x2="630" y2="125" stroke="#009530" strokeWidth="2.5" markerEnd="url(#arrow-control)" />
            <line x1="590" y1="255" x2="630" y2="200" stroke="#009530" strokeWidth="2.5" markerEnd="url(#arrow-control)" />
            <line x1="590" y1="370" x2="630" y2="340" stroke="#009530" strokeWidth="2.5" markerEnd="url(#arrow-control)" />

            {/* Control Outputs back to Field (Control loop: Green) */}
            <path d="M 700 375 L 700 470 L 290 470 L 100 470 L 100 445" fill="none" stroke="#009530" strokeWidth="1.8" strokeDasharray="5 3" markerEnd="url(#arrow-control)" />

            {/* External to Cloud (Data: Grey, Control/DR: Cyan, Money: Green) */}
            <line x1="825" y1="120" x2="595" y2="425" stroke="#42B4E6" strokeWidth="2" strokeDasharray="3 3" markerEnd="url(#arrow-control)" />
            <line x1="825" y1="230" x2="595" y2="180" stroke="#626469" strokeWidth="2" markerEnd="url(#arrow-data)" />
            <line x1="825" y1="315" x2="595" y2="180" stroke="#626469" strokeWidth="2" markerEnd="url(#arrow-data)" />
            <line x1="595" y1="435" x2="825" y2="150" stroke="#000000" strokeWidth="2" markerEnd="url(#arrow-money)" />
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-surface-container-high/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-on-surface font-sans">Flow Types:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#626469]" />
              <span className="text-on-surface-variant">Data / Telemetry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#009530]" />
              <span className="text-[#009530] font-bold">Control &amp; Setpoints</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#E47F00]" />
              <span className="text-[#E47F00]">Physical Energy (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-black" />
              <span className="text-black font-bold">Financial / Settlement (₹)</span>
            </div>
          </div>
          <span className="text-on-surface-variant text-[11px]">IEEE 1547 · BACnet/IP · OpenADR 2.0b Compliant Schema</span>
        </div>
      </div>

      {/* Honesty Box: Simulated vs Real Prototype Implementation */}
      <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
        <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-base">verified</span>
          Prototype Verification: What is Simulated vs. What is Real
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-on-surface">
          <div className="space-y-2 p-4 rounded-lg bg-surface-container-low/50 border border-surface-container-high/40">
            <h4 className="font-label-caps text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">
              Simulated in this Demonstration
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant">
              <li>Building thermodynamic 3R2C network response to outdoor temperature.</li>
              <li>Synthetic zone occupancy profiles based on commercial building schedules.</li>
              <li>Synthetic sensor telemetry streams (indoor CO₂, plug loads, solar GHI).</li>
              <li>Simulated physical grid feeder power flow and transformer thermal loading.</li>
            </ul>
          </div>
          <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="font-label-caps text-primary font-bold text-[10px] uppercase tracking-wider">
              Real &amp; Fully Functional in Code
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-on-surface">
              <li>Deterministic double-auction microgrid market clearing algorithm.</li>
              <li>Exact analytical CO₂ exponential mass-balance differential solver.</li>
              <li>Model-based statistical Fault Detection &amp; Diagnostics (FDD) engine.</li>
              <li>Multi-objective autopilot optimizer balancing comfort, cost, and peak demand.</li>
              <li>Zero-dependency production dashboard with deterministic replay.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
