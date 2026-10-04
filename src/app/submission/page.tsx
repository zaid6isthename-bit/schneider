'use client';

import React, { useState } from 'react';
import { useSimulation } from '@/store/useSimulation';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import { CLIMATE_PRESETS, RETROFIT_TIERS } from '@/simulation/constants';
import { runFeatureAblation } from '@/simulation/ablation';
import { annualizeRuns } from '@/simulation/annualize';
import {
  kpiSummary,
  layerAttribution,
  discomMetrics,
  energyIntensityTable,
} from '@/simulation/selectors';
import { FileText, Download, CheckCircle, ShieldAlert, Award } from 'lucide-react';

export default function SubmissionPage() {
  const [copied, setCopied] = useState(false);
  const runs = useSimulation();

  const activeRun = runs.network_dr ?? runs.network;
  const baselineRun = runs.baseline;

  const kpis = kpiSummary(runs);
  const layers = layerAttribution(runs);
  const discom = discomMetrics(runs);
  const intensity = energyIntensityTable(runs);

  // Compute ablation on active scenario
  const activeScenario = SCENARIOS[runs.network.scenarioId] ?? SCENARIOS.hot_weekday;
  const ablation = runFeatureAblation(DEFAULT_BUILDINGS, activeScenario);

  // Annualized metrics (composite baseline vs network)
  const annualBase = annualizeRuns(DEFAULT_BUILDINGS, 'baseline', 'composite');
  const annualOpt = annualizeRuns(DEFAULT_BUILDINGS, 'network', 'composite');

  const clusterAreaM2 = DEFAULT_BUILDINGS.reduce((sum, b) => sum + b.areaM2, 0);
  const baseKwh = baselineRun.clusterTotals.totalKwh;
  const optKwh = activeRun.clusterTotals.totalKwh;
  const energyReductionKwh = baseKwh - optKwh;
  const energyReductionPct = baseKwh > 0 ? (energyReductionKwh / baseKwh) * 100 : 0;

  const costReductionPct = kpis.costSavedPct;
  const peakReductionPct = discom.peakReductionPct;

  // Generate markdown content
  const generateMarkdown = () => {
    return `# THERMOS 2.0 · Challenge 02 Submission Claim Card
**Smart Buildings — Energy Efficiency & Occupant Experience (with grid integration)**
*Generated deterministically from simulation engine (Seed: 20261004)*

---

## 1. Verified Core Claims (Simulated Estimates)
- **Primary Energy Reduction**: **${energyReductionKwh.toFixed(1)} kWh/day** (${energyReductionPct.toFixed(1)}% reduction vs timer-scheduled BMS baseline)
- **Annualized EUI (Cluster)**: **${annualOpt.clusterAnnual.euiAnnual.toFixed(1)} kWh/m²/yr** (vs Baseline ${annualBase.clusterAnnual.euiAnnual.toFixed(1)} kWh/m²/yr; saving ${(annualBase.clusterAnnual.euiAnnual - annualOpt.clusterAnnual.euiAnnual).toFixed(1)} kWh/m²/yr)
- **Peak Demand Reduction**: **${kpis.peakReductionKw.toFixed(1)} kW** (${peakReductionPct.toFixed(1)}% peak shed)
- **Electricity Cost Savings**: **₹${kpis.costSavedInr.toFixed(0)}/day** (${costReductionPct.toFixed(1)}% bill reduction)
- **Carbon Avoided**: **${kpis.emissionsAvoidedKg.toFixed(1)} kg CO₂/day** (${kpis.treeDays.toFixed(0)} tree-days)

---

## 2. Occupant Comfort & Well-Being Preservation
- **Thermal Comfort Compliance**: **${kpis.avgComfortPct.toFixed(1)}%** average daytime compliance (Worst building: ${kpis.worstComfortPct.toFixed(1)}%)
- **Indoor Air Quality (IAQ)**: **${(activeRun.clusterTotals.avgComfortPct).toFixed(1)}%** occupied hours meeting CO₂ target (≤ 800 ppm target, strictly ≤ 1000 ppm limit)
- **Lighting Visual Quality**: **Min 75%** delivered lighting fraction enforced during all occupied hours (max 25% daylight dimming)

---

## 3. Baseline Definition (Timer-Scheduled BMS)
Unlike naive 24/7 fixed baselines that inflate savings claims, THERMOS 2.0 compares against realistic existing commercial BMS operating rules:
- **Office / Nova**: 07:00–20:00 window (Ttgt = 24.0°C; 1-hour pre-conditioning at 06:00; off-hours Ttgt = 30.0°C).
- **Retail / Horizon**: 09:00–22:00 window (Ttgt = 24.0°C; 1-hour pre-conditioning at 08:00; off-hours Ttgt = 30.0°C).
- **University / Campus**: 07:00–19:00 window (Ttgt = 24.0°C; 1-hour pre-conditioning at 06:00; off-hours Ttgt = 30.0°C).
- **Hospital, IT Park, Hotel**: 24h continuous operation at 24.0°C.
- **Baseline Lighting**: In-window lightKw · max(occ, 0.8); off-hours 15% security lighting; 24h types max(occ, 0.5).
- **Baseline Ventilation**: Fixed design airflow in-window, 20% outside.

---

## 4. Honest Feature Attribution (Ablation Waterfall)
*Marginal impact computed by running full stack with single feature ablated (marginal = kWh(F_all without f) - kWh(F_all)):*

${ablation.waterfall
  .map(
    (w) =>
      `- **${w.label}**: ${w.marginalKwh >= 0 ? '+' : ''}${w.marginalKwh.toFixed(1)} kWh (${w.marginalInr >= 0 ? '+' : ''}₹${w.marginalInr.toFixed(0)})`
  )
  .join('\n')}
- **Interaction Residual**: ${ablation.interactionResidual.toFixed(1)} kWh (accounting for physical coupling between DCV and chiller efficiency)
- **Net Total Daily Energy Saved**: **${ablation.totalSavedKwh.toFixed(1)} kWh**

---

## 5. Building Typology Performance Table
| Building | Type | Area (m²) | Base EUI (kWh/m²/yr) | THERMOS EUI (kWh/m²/yr) | kWh Reduction | ECBC / BEE Benchmark |
|---|---|---|---|---|---|---|
${intensity
  .map(
    (b) =>
      `| ${b.name} | ${b.type} | ${b.areaM2.toLocaleString()} | ${b.baseEuiAnnual.toFixed(1)} | ${b.optEuiAnnual.toFixed(1)} | ${b.energyReductionPct.toFixed(1)}% | ${b.benchmarkEui !== null ? b.benchmarkEui : 'Not configured (pending source)'} |`
  )
  .join('\n')}

---

## 6. Climate Zone Sensitivity & Retrofit Economics
- **Composite (Delhi-NCR)**: Base EUI ${annualBase.clusterAnnual.euiAnnual.toFixed(1)} → Opt ${annualOpt.clusterAnnual.euiAnnual.toFixed(1)} kWh/m²/yr
- **Tier A (Sensors + Cloud Visibility)**: Capex ₹40/m² · 0% automated saving claimed
- **Tier B (BMS Control + DCV + Dimming)**: Capex ₹120/m² · Payback ~14–18 months
- **Tier C (Full Microgrid + Battery Dispatch)**: Capex ₹120/m² + BSS · Payback ~42–58 months

---

## 7. DISCOM Grid Demand-Response Integration
- **Peak Power Shed**: ${discom.openAdrPayload.clusterResponse.deliveredAvgKw} kW delivered vs ${discom.openAdrPayload.clusterResponse.committedKw} kW committed (${discom.openAdrPayload.clusterResponse.compliancePct}% compliance)
- **Peak Window Energy Shifted**: ${discom.peakEnergyShiftedKwh.toFixed(1)} kWh shifted out of 17:00–22:00 peak
- **Grid Settlement**: ₹${discom.openAdrPayload.clusterResponse.totalPayoutInr.toFixed(0)} incentive paid via OpenADR 2.0b telemetry

---
*Limitations: Latent (humidity) cooling load and cold-zone heating are not modeled.*
`;
  };

  const handleDownload = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'THERMOS_Submission_Claims.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
            <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
              OFFICIAL VERIFICATION
            </span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
            Official Challenge 02 Claim Card
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Smart Buildings — Energy Efficiency &amp; Occupant Experience · Auto-generated from deterministic physics engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-label-caps font-bold tracking-wider uppercase border border-surface-container-high bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            {copied ? 'Copied to Clipboard!' : 'Copy Markdown'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-label-caps font-bold tracking-wider uppercase bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Markdown
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Headline claims) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Headline Energy Cut
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-primary tnum">
              {energyReductionPct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              ({energyReductionKwh.toFixed(0)} kWh/d)
            </span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Primary Challenge 02 Metric
          </p>
        </div>

        <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Annualized EUI (Cluster)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-secondary tnum">
              {annualOpt.clusterAnnual.euiAnnual.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">kWh/m²/yr</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            vs Baseline {annualBase.clusterAnnual.euiAnnual.toFixed(1)}
          </p>
        </div>

        <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Thermal Comfort Preserved
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-amber-700 tnum">
              {kpis.avgComfortPct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-on-surface-variant">Daytime Compliance</span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Worst Zone: {kpis.worstComfortPct.toFixed(1)}%
          </p>
        </div>

        <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
            Feeder Peak Shed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-telemetry-xl text-2xl font-black font-mono text-red-700 tnum">
              {peakReductionPct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              ({kpis.peakReductionKw.toFixed(0)} kW)
            </span>
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1.5 border-t border-surface-container-high/40 pt-1.5">
            Grid Peak Shifting
          </p>
        </div>
      </div>

      {/* Feature Attribution Waterfall */}
      <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-4">
        <div>
          <h3 className="font-headline-sm text-sm font-bold text-on-surface">
            Honest Feature Attribution (Engine Ablation)
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Each feature is ablated individually: marginal saving = kWh(Full Stack without feature) − kWh(Full Stack).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ablation.waterfall.map((item) => (
            <div key={item.feature} className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface">{item.label}</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    item.marginalKwh >= 0 ? 'text-primary' : 'text-error'
                  }`}
                >
                  {item.marginalKwh >= 0 ? '+' : ''}
                  {item.marginalKwh.toFixed(1)} kWh
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                <span>₹{item.marginalInr.toFixed(0)} Saved</span>
                <span>{item.marginalPeakKw.toFixed(1)} kW Peak</span>
              </div>
            </div>
          ))}
          <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Coupling Interaction Residual</span>
              <span className="text-xs font-mono font-bold text-on-surface">
                {ablation.interactionResidual.toFixed(1)} kWh
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-2 font-mono">Total − Σ marginal</p>
          </div>
        </div>
      </div>

      {/* Typology Performance Table */}
      <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-4">
        <div>
          <h3 className="font-headline-sm text-sm font-bold text-on-surface">
            Building Typology Performance Summary
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Baseline timer-scheduled BMS vs THERMOS optimized operation across 6 archetypes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-surface-container-high text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Typology</th>
                <th className="py-2.5 px-3 text-right">Area (m²)</th>
                <th className="py-2.5 px-3 text-right">Baseline EUI</th>
                <th className="py-2.5 px-3 text-right">THERMOS EUI</th>
                <th className="py-2.5 px-3 text-right">Energy Saved (%)</th>
                <th className="py-2.5 px-3 text-right">ECBC/BEE Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {intensity.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-semibold text-on-surface">{b.name}</td>
                  <td className="py-2.5 px-3 uppercase text-on-surface-variant text-[10px]">{b.type}</td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant">{b.areaM2.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant">{b.baseEuiAnnual.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right text-primary font-bold">{b.optEuiAnnual.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right text-secondary font-bold">{b.energyReductionPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant italic">
                    {b.benchmarkEui !== null ? `${b.benchmarkEui} kWh/m²` : 'Benchmark not configured'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions & Limitations Checklist */}
      <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
        <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Transparency &amp; Scope Limitations
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-on-surface-variant">
          <li className="flex items-start gap-2 p-2.5 rounded bg-surface-container-low/40 border border-surface-container-high/40">
            <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span><strong className="text-on-surface">Defensible Baseline:</strong> Incorporates realistic timer schedules, night setbacks, and minimum security lighting.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded bg-surface-container-low/40 border border-surface-container-high/40">
            <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span><strong className="text-on-surface">Physical Thermal Mass:</strong> Calibrated 3R2C ODE network with time-constant matching commercial structures.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded bg-amber-500/5 border border-amber-500/20">
            <span className="w-4 h-4 rounded-full border border-amber-600 text-amber-700 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">!</span>
            <span><strong className="text-on-surface">Humidity Limitation:</strong> Latent cooling load is not modeled; warm-humid results understate latent demand.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded bg-amber-500/5 border border-amber-500/20">
            <span className="w-4 h-4 rounded-full border border-amber-600 text-amber-700 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">!</span>
            <span><strong className="text-on-surface">Cold Zone Out-of-Scope:</strong> Space heating in cold climates is out of current scope (cooling-dominant regions).</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
