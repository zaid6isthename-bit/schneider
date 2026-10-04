'use client';

import React, { useState } from 'react';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { SCENARIOS } from '@/simulation/scenarios';
import { CLIMATE_PRESETS } from '@/simulation/constants';
import { AutopilotTriangle } from '@/components/simulator/AutopilotTriangle';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { clusterDemandSeries } from '@/simulation/selectors';
import { formatClock, formatInr, formatKg, formatKwh, formatKw, formatPct } from '@/lib/format';
import { ScenarioDef } from '@/simulation/types';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Sliders, RotateCcw } from 'lucide-react';

export default function SimulatorPage() {
  const scenarioId = usePlaybackStore((s) => s.scenarioId);
  const setScenarioId = usePlaybackStore((s) => s.setScenarioId);
  const setCustomScenario = usePlaybackStore((s) => s.setCustomScenario);
  const autopilot = usePlaybackStore((s) => s.autopilot);
  const setAutopilot = usePlaybackStore((s) => s.setAutopilot);

  const runs = useSimulation();
  const { baseline, network, network_dr } = runs;
  const activeOptRun = network_dr ?? network;

  const currentScenario = SCENARIOS[scenarioId] ?? {
    id: 'custom',
    name: 'Custom Parameterized Scenario',
    dayType: 'weekday',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.0,
  };

  // Custom panel parameters
  const [tMean, setTMean] = useState(currentScenario.Tmean);
  const [cloudBase, setCloudBase] = useState(currentScenario.cloudBase);
  const [occScale, setOccScale] = useState(currentScenario.occScale);
  const [dayType, setDayType] = useState<'weekday' | 'weekend'>(currentScenario.dayType);
  const [hasDrEvent, setHasDrEvent] = useState(!!currentScenario.drEvent);

  const handleCustomUpdate = (
    newTMean = tMean,
    newCloud = cloudBase,
    newOcc = occScale,
    newDay = dayType,
    newDr = hasDrEvent
  ) => {
    setTMean(newTMean);
    setCloudBase(newCloud);
    setOccScale(newOcc);
    setDayType(newDay);
    setHasDrEvent(newDr);

    const custom: ScenarioDef = {
      id: `custom_${newTMean}_${newCloud}_${newOcc}_${newDay}`,
      name: `Custom (${newTMean}°C, Cloud: ${newCloud.toFixed(2)}, Occ: ${newOcc.toFixed(2)})`,
      dayType: newDay,
      Tmean: newTMean,
      A: 7,
      cloudBase: newCloud,
      occScale: newOcc,
      drEvent: newDr
        ? {
            startStep: 72,
            endStep: 79,
            requestKw: 400,
          }
        : undefined,
    };
    setCustomScenario(custom);
  };

  const waveformData = clusterDemandSeries(runs);

  // Compute common max Y domain for fair split view
  let maxKwFound = 100;
  for (const d of waveformData) {
    if (d.baselineDemandKw > maxKwFound) maxKwFound = d.baselineDemandKw;
    if (d.networkDemandKw > maxKwFound) maxKwFound = d.networkDemandKw;
  }
  const commonYDomain = [0, Math.ceil(maxKwFound * 1.1)];

  // Delta table
  const bTotals = baseline.clusterTotals;
  const oTotals = activeOptRun.clusterTotals;

  const DELTAS = [
    {
      metric: 'Total Electricity Cost (₹)',
      base: formatInr(bTotals.totalCostInr),
      opt: formatInr(oTotals.totalCostInr),
      delta: formatInr(bTotals.totalCostInr - oTotals.totalCostInr),
      pct: `${(((oTotals.totalCostInr - bTotals.totalCostInr) / bTotals.totalCostInr) * 100).toFixed(1)}%`,
      isGood: oTotals.totalCostInr <= bTotals.totalCostInr,
    },
    {
      metric: 'Energy Consumed (kWh)',
      base: formatKwh(bTotals.totalKwh),
      opt: formatKwh(oTotals.totalKwh),
      delta: formatKwh(bTotals.totalKwh - oTotals.totalKwh),
      pct: `${(((oTotals.totalKwh - bTotals.totalKwh) / bTotals.totalKwh) * 100).toFixed(1)}%`,
      isGood: oTotals.totalKwh <= bTotals.totalKwh,
    },
    {
      metric: 'Peak Feeder Load (kW)',
      base: formatKw(bTotals.peakKw, 0),
      opt: formatKw(oTotals.peakKw, 0),
      delta: formatKw(bTotals.peakKw - oTotals.peakKw, 0),
      pct: `${(((oTotals.peakKw - bTotals.peakKw) / bTotals.peakKw) * 100).toFixed(1)}%`,
      isGood: oTotals.peakKw <= bTotals.peakKw,
    },
    {
      metric: 'Gross Carbon Emissions (kg)',
      base: formatKg(bTotals.emissionsKg, 0),
      opt: formatKg(oTotals.emissionsKg, 0),
      delta: formatKg(bTotals.emissionsKg - oTotals.emissionsKg, 0),
      pct: `${(((oTotals.emissionsKg - bTotals.emissionsKg) / bTotals.emissionsKg) * 100).toFixed(1)}%`,
      isGood: oTotals.emissionsKg <= bTotals.emissionsKg,
    },
    {
      metric: 'Worst-Building Comfort Score (%)',
      base: formatPct(bTotals.worstComfortPct),
      opt: formatPct(oTotals.worstComfortPct),
      delta: `${(oTotals.worstComfortPct - bTotals.worstComfortPct).toFixed(1)}%`,
      pct: '—',
      isGood: oTotals.worstComfortPct >= bTotals.worstComfortPct,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
              PHYSICS &amp; SENSITIVITY SWEEP
            </span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
            Interactive Scenario &amp; Sensitivity Simulator
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Real-time sensitivity analysis · 6 predefined scenarios + full custom parameter sweeping
          </p>
        </div>
      </div>

      {/* Scenario Buttons & Custom Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Selectors & Custom Sliders */}
        <div className="lg:col-span-8 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-5 shadow-sm space-y-5">
          {/* Climate Zone Presets (Patch 1 P7.1) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
                Climate Zone Presets (P7.1)
              </h3>
              <span className="text-[10px] font-mono text-amber-700 font-semibold">
                Latent humidity not modeled
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(CLIMATE_PRESETS).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    handleCustomUpdate(c.Tmean, c.cloudBase, occScale, dayType, hasDrEvent);
                  }}
                  className="p-2.5 rounded-lg text-left text-xs transition-colors border bg-surface-container-low/40 border-surface-container-high/60 text-on-surface hover:bg-surface-container-low hover:border-primary/40"
                >
                  <div className="font-semibold text-secondary">{c.name}</div>
                  <div className="text-[10px] text-on-surface-variant">{c.representativeCity}</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {c.Tmean}°C · A:{c.A} · {c.cloudBase}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider mb-2">
              1. Select Prescribed Scenario (§6)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(SCENARIOS).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setScenarioId(s.id);
                    setTMean(s.Tmean);
                    setCloudBase(s.cloudBase);
                    setOccScale(s.occScale);
                    setDayType(s.dayType);
                    setHasDrEvent(!!s.drEvent);
                  }}
                  className={`p-2.5 rounded-lg text-left text-xs transition-colors border ${
                    scenarioId === s.id
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : 'bg-surface-container-low/40 border-surface-container-high/60 text-on-surface hover:bg-surface-container-low hover:border-primary/40'
                  }`}
                >
                  <div className="font-sans font-semibold">{s.name}</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {s.Tmean} °C · {s.dayType} {s.drEvent ? '· DR Event' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Sliders Panel */}
          <div className="pt-4 border-t border-surface-container-high/60 space-y-4">
            <h3 className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
              2. Custom Parameter Tuning
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tmean */}
              <div className="space-y-1.5 p-3 rounded-lg bg-surface-container-low/40 border border-surface-container-high/40">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface-variant font-medium">Mean Outdoor Temp:</span>
                  <span className="text-primary font-bold font-mono">{tMean} °C</span>
                </div>
                <input
                  type="range"
                  min="26"
                  max="46"
                  step="1"
                  value={tMean}
                  onChange={(e) => handleCustomUpdate(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Cloud Base */}
              <div className="space-y-1.5 p-3 rounded-lg bg-surface-container-low/40 border border-surface-container-high/40">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface-variant font-medium">Cloud Clearness (cloudBase):</span>
                  <span className="text-amber-700 font-bold font-mono">{cloudBase.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={cloudBase}
                  onChange={(e) => handleCustomUpdate(tMean, Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Occupancy Scale */}
              <div className="space-y-1.5 p-3 rounded-lg bg-surface-container-low/40 border border-surface-container-high/40">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-on-surface-variant font-medium">Occupancy Multiplier:</span>
                  <span className="text-secondary font-bold font-mono">{occScale.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.3"
                  step="0.05"
                  value={occScale}
                  onChange={(e) => handleCustomUpdate(tMean, cloudBase, Number(e.target.value))}
                  className="w-full accent-secondary cursor-pointer"
                />
              </div>

              {/* Day Type & DR Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low/40 border border-surface-container-high/40">
                <div className="flex items-center gap-2 font-sans text-xs">
                  <label className="text-on-surface-variant font-medium">Day:</label>
                  <select
                    value={dayType}
                    onChange={(e) =>
                      handleCustomUpdate(
                        tMean,
                        cloudBase,
                        occScale,
                        e.target.value as 'weekday' | 'weekend'
                      )
                    }
                    className="bg-surface-container-lowest border border-surface-container-high text-on-surface rounded px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="weekday">Weekday</option>
                    <option value="weekend">Weekend</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-on-surface font-semibold">
                  <input
                    type="checkbox"
                    checked={hasDrEvent}
                    onChange={(e) =>
                      handleCustomUpdate(tMean, cloudBase, occScale, dayType, e.target.checked)
                    }
                    className="accent-primary"
                  />
                  <span>Utility DR Event</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Autopilot Triangle */}
        <div className="lg:col-span-4">
          <AutopilotTriangle weights={autopilot} onChange={setAutopilot} />
        </div>
      </div>

      {/* Split View: Baseline vs THERMOS Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartFrame
          title="Baseline (No Autonomous Optimization)"
          subtitle="Fixed setpoints (24°C), immediate EV charging, uncoordinated self-consumption"
          data={waveformData}
        >
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waveformData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" interval={11} stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={commonYDomain} unit=" kW" tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} iconType="circle" />
                <Area type="linear" dataKey="solarKw" name="Rooftop Solar" fill="#facc15" fillOpacity={0.25} stroke="#d97706" isAnimationActive={false} />
                <Line type="linear" dataKey="baselineDemandKw" name="Baseline Load (kW)" stroke="#64748b" strokeWidth={2.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="THERMOS Network (L1 + L2 + L3)"
          subtitle="Dynamic precooling, peak shaving, battery arbitrage, P2P trading"
          data={waveformData}
        >
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={waveformData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} />
                <YAxis stroke="#626469" fontSize={11} domain={commonYDomain} unit=" kW" tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} iconType="circle" />
                <Area type="linear" dataKey="solarKw" name="Rooftop Solar" fill="#9FAF00" fillOpacity={0.25} stroke="#9FAF00" isAnimationActive={false} />
                <Line type="linear" dataKey="networkDemandKw" name="THERMOS Load (kW)" stroke="#009530" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      {/* Delta Comparison Table */}
      <div className="rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-headline-sm text-sm font-bold text-on-surface">
            Simulation Delta Table (Baseline vs THERMOS Under Current Parameters)
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Exact physics differentials computed over 96 discrete 15-minute steps.
          </p>
        </div>

        <div className="overflow-x-auto rounded border border-surface-container-high/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="px-4 py-2.5 font-sans font-semibold">Metric</th>
                <th className="px-4 py-2.5 text-right">Baseline Run</th>
                <th className="px-4 py-2.5 text-right">THERMOS Optimized</th>
                <th className="px-4 py-2.5 text-right">Physical Delta</th>
                <th className="px-4 py-2.5 text-right">Relative Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 bg-surface-container-lowest">
              {DELTAS.map((row) => (
                <tr key={row.metric} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-2.5 font-sans font-semibold text-on-surface">{row.metric}</td>
                  <td className="px-4 py-2.5 text-right text-on-surface-variant">{row.base}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-on-surface">{row.opt}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary">{row.delta}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-bold ${
                      row.isGood ? 'text-primary' : 'text-error'
                    }`}
                  >
                    {row.pct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
