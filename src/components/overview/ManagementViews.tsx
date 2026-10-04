'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useSimulation } from '@/store/useSimulation';
import {
  endUseBreakdown,
  occupancyHeatmap,
  energyIntensityTable,
} from '@/simulation/selectors';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { simulate } from '@/simulation/engine';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import { BarChart3, Users, Gauge, Info } from 'lucide-react';

export function ManagementViews() {
  const runs = useSimulation();
  const [heatmapMode, setHeatmapMode] = useState<'weekday' | 'weekend'>('weekday');
  const [hoveredCell, setHoveredCell] = useState<{
    buildingName: string;
    hour: number;
    val: number;
  } | null>(null);

  const breakdownData = endUseBreakdown(runs);
  const intensityData = energyIntensityTable(runs);

  // Compute weekend run for heatmap
  const weekendRun = React.useMemo(() => {
    return simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.sunday_surplus,
      mode: 'network',
      autopilot: { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 },
      seed: 20261004,
    });
  }, []);

  const heatmap = occupancyHeatmap(runs.network, weekendRun);
  const activeHeatmapData = heatmapMode === 'weekday' ? heatmap.weekday : heatmap.weekend;

  return (
    <div className="space-y-space-lg">
      {/* Section Header */}
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
          <Gauge className="w-5 h-5 text-secondary" />
          Management Views: End-Use Breakdown, Occupancy &amp; Energy Intensity
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Actionable facility insights, sub-metered load disaggregation, and building energy intensity benchmarks
        </p>
      </div>

      {/* 1. Cluster End-Use Disaggregation (Full-Width Horizontal) */}
      <ChartFrame
        title="Cluster End-Use Disaggregation (kWh/day)"
        subtitle="Baseline timer schedule vs THERMOS optimized sub-metered end uses"
        badge="SUB-METERED"
        data={breakdownData}
      >
        <div className="h-[280px] w-full pt-space-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="category" stroke="#626469" fontSize={11} fontFamily="JetBrains Mono" />
              <YAxis stroke="#626469" fontSize={11} fontFamily="JetBrains Mono" unit=" kWh" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-[#E2E4E8] bg-white/95 p-3 text-xs shadow-xl font-mono text-[#262626]">
                      <div className="font-semibold text-[#009530] mb-1 pb-1 border-b border-[#E2E4E8]">
                        {label}
                      </div>
                      {payload.map((p) => (
                        <div key={p.name} className="flex justify-between gap-4 py-0.5">
                          <span className="text-[#626469]">{p.name}:</span>
                          <span className="font-bold text-[#262626]">{Number(p.value).toFixed(1)} kWh</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="baselineKwh" name="Baseline" fill="#626469" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimizedKwh" name="THERMOS Optimized" fill="#009530" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {/* 2. Occupancy Pattern Heatmap (Horizontal directly UNDER End-Use Breakdown) */}
      <div className="p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-surface-container-high">
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
              <Users className="w-4 h-4 text-secondary" />
              Occupancy Pattern Heatmap
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Hourly average zone occupancy across cluster buildings (0.0 to 1.0) spanning 24 diurnal intervals
            </p>
          </div>

          <div className="flex items-center gap-space-sm">
            {hoveredCell && (
              <div className="hidden md:flex items-center gap-1.5 px-space-sm py-space-2xs rounded bg-surface-container text-xs font-mono">
                <span className="font-bold text-on-surface">{hoveredCell.buildingName}</span>
                <span className="text-on-surface-variant">at {hoveredCell.hour.toString().padStart(2, '0')}:00 →</span>
                <span className="font-bold text-secondary">{(hoveredCell.val * 100).toFixed(0)}% occ</span>
              </div>
            )}

            {/* Day Type Toggle */}
            <div className="flex items-center bg-surface-container-low border border-surface-container-high rounded-lg p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setHeatmapMode('weekday')}
                className={`px-space-sm py-space-2xs rounded font-label-caps uppercase text-xs font-bold transition-colors ${
                  heatmapMode === 'weekday'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Weekday
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('weekend')}
                className={`px-space-sm py-space-2xs rounded font-label-caps uppercase text-xs font-bold transition-colors ${
                  heatmapMode === 'weekend'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Weekend
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Full-Width Heatmap Matrix */}
        <div className="overflow-x-auto mt-space-sm">
          <div className="min-w-[760px] w-full">
            {/* Hour Header Numbers across 24 columns */}
            <div className="flex items-center mb-1.5 font-label-caps text-[10px] text-on-surface-variant">
              <span className="w-36 shrink-0 font-bold uppercase tracking-wider pl-1">Facility Archetype</span>
              <div className="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 text-center">
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} className="text-on-surface-variant/80 font-mono text-[9px]">
                    {h % 2 === 0 ? `${h}h` : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Building Rows */}
            {heatmap.buildings.map((b) => (
              <div key={b.id} className="flex items-center mb-1.5 hover:bg-surface-container-low/40 rounded px-1 py-0.5 transition-colors">
                <div className="w-36 shrink-0 pr-2">
                  <div className="font-telemetry-sm text-xs font-bold text-on-surface truncate">
                    {b.name}
                  </div>
                  <div className="text-[10px] uppercase font-mono text-on-surface-variant">
                    {DEFAULT_BUILDINGS.find((x) => x.id === b.id)?.type}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
                  {activeHeatmapData.map((d) => {
                    const val = (d as any)[b.id] ?? 0;
                    const opacity = Math.max(0.08, val);

                    return (
                      <div
                        key={d.hour}
                        onMouseEnter={() => setHoveredCell({ buildingName: b.name, hour: d.hour, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className="h-8 rounded flex items-center justify-center transition-all group relative cursor-pointer hover:ring-1 hover:ring-primary shadow-2xs"
                        style={{
                          backgroundColor: `rgba(0, 149, 48, ${opacity})`,
                          border: val > 0.65 ? '1px solid rgba(0, 149, 48, 0.45)' : '1px solid rgba(0, 0, 0, 0.04)',
                        }}
                        title={`${b.name} at ${d.timeLabel}: ${(val * 100).toFixed(0)}% occupancy`}
                      >
                        {val >= 0.5 && (
                          <span className="text-[9px] font-mono text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            {Math.round(val * 100)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* X-axis Hour Marks below */}
            <div className="flex items-center mt-2 pt-2 border-t border-surface-container-high font-label-caps text-[10px] text-on-surface-variant">
              <span className="w-36 shrink-0 font-bold uppercase tracking-wider pl-1">24h Schedule</span>
              <div className="flex-1 flex justify-between px-1 font-mono text-[10px]">
                <span>00:00 (Night)</span>
                <span>06:00 (Morning Ramp)</span>
                <span>12:00 (Solar Peak)</span>
                <span>17:00 (Grid Peak)</span>
                <span>21:00 (Setback)</span>
                <span>23:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend & Calibration Footnote */}
        <div className="mt-space-sm pt-space-xs border-t border-surface-container-high/60 flex flex-wrap items-center justify-between gap-2 font-telemetry-sm text-telemetry-sm text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-secondary/10 border border-secondary/20" /> Low (0–30%)
            </span>
            <span className="flex items-center gap-1 ml-3">
              <span className="w-3 h-3 rounded bg-secondary/50 border border-secondary/60" /> Mid (30–70%)
            </span>
            <span className="flex items-center gap-1 ml-3">
              <span className="w-3 h-3 rounded bg-secondary border border-secondary" /> High (&gt;70%)
            </span>
          </span>
          <span className="font-mono text-[11px]">Calibrated commercial schedules · Seed: 20261004</span>
        </div>
      </div>

      {/* 3. Energy Intensity Table with ECBC / BEE Benchmark check */}
      <div className="p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs mb-space-sm pb-space-xs border-b border-surface-container-high">
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
              <BarChart3 className="w-4 h-4 text-secondary" />
              Energy Intensity (EUI) &amp; ECBC Benchmark Tracking
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Normalized daily and annualized kWh per square meter (kWh/m²/day and kWh/m²/yr)
            </p>
          </div>
          <span className="font-label-caps text-label-caps px-space-sm py-space-2xs rounded bg-surface-container-low text-on-surface-variant border border-surface-container-high">
            ECBC Standard: Pending external source audit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-telemetry-sm text-telemetry-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-caps uppercase text-on-surface-variant">
                <th className="py-2.5 px-3 border-b border-surface-container-high">Building</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high">Type</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">Area (m²)</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">Daily kWh (Base / Opt)</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">Daily EUI</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">Annual EUI</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">Energy Saved</th>
                <th className="py-2.5 px-3 border-b border-surface-container-high text-right">ECBC/BEE Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
              {intensityData.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-on-surface">{b.name}</td>
                  <td className="py-2.5 px-3 uppercase text-on-surface-variant text-[10px]">{b.type}</td>
                  <td className="py-2.5 px-3 text-right">{b.areaM2.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    {b.baseKwhDay.toFixed(0)} / <span className="text-secondary font-bold">{b.optKwhDay.toFixed(0)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {b.baseEuiDay.toFixed(2)} / <span className="text-secondary">{b.optEuiDay.toFixed(2)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {b.baseEuiAnnual.toFixed(1)} / <span className="text-secondary font-bold">{b.optEuiAnnual.toFixed(1)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-secondary font-bold">
                    -{b.energyReductionPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant italic">
                    {b.benchmarkEui !== null ? (
                      <span className="text-on-surface">{b.benchmarkEui} kWh/m²</span>
                    ) : (
                      <span className="text-on-surface-variant flex items-center justify-end gap-1 text-[11px]">
                        <Info className="w-3 h-3 text-amber-500" />
                        Benchmark not configured; add a sourced value
                      </span>
                    )}
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
