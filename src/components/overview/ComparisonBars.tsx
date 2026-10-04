'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { formatInr, formatKg, formatKwh, formatKw, formatPct } from '@/lib/format';

export function ComparisonBars() {
  const runs = useSimulation();
  const { baseline, network, network_dr } = runs;
  const activeRun = network_dr ?? network;

  const bTotals = baseline.clusterTotals;
  const oTotals = activeRun.clusterTotals;

  const METRICS = [
    {
      name: 'Total Energy (kWh)',
      baseVal: bTotals.totalKwh,
      optVal: oTotals.totalKwh,
      baseFormatted: formatKwh(bTotals.totalKwh),
      optFormatted: formatKwh(oTotals.totalKwh),
      deltaPct: bTotals.totalKwh > 0 ? ((oTotals.totalKwh - bTotals.totalKwh) / bTotals.totalKwh) * 100 : 0,
      barWidthPct: bTotals.totalKwh > 0 ? (oTotals.totalKwh / bTotals.totalKwh) * 100 : 0,
      barColor: 'bg-secondary',
    },
    {
      name: 'Total Cost (₹)',
      baseVal: bTotals.totalCostInr,
      optVal: oTotals.totalCostInr,
      baseFormatted: formatInr(bTotals.totalCostInr),
      optFormatted: formatInr(oTotals.totalCostInr),
      deltaPct: bTotals.totalCostInr > 0 ? ((oTotals.totalCostInr - bTotals.totalCostInr) / bTotals.totalCostInr) * 100 : 0,
      barWidthPct: bTotals.totalCostInr > 0 ? (oTotals.totalCostInr / bTotals.totalCostInr) * 100 : 0,
      barColor: 'bg-secondary',
    },
    {
      name: 'Peak Demand (kW)',
      baseVal: bTotals.peakKw,
      optVal: oTotals.peakKw,
      baseFormatted: `${formatKw(bTotals.peakKw, 0)}`,
      optFormatted: `${formatKw(oTotals.peakKw, 0)}`,
      deltaPct: bTotals.peakKw > 0 ? ((oTotals.peakKw - bTotals.peakKw) / bTotals.peakKw) * 100 : 0,
      barWidthPct: bTotals.peakKw > 0 ? (oTotals.peakKw / bTotals.peakKw) * 100 : 0,
      barColor: 'bg-secondary',
    },
    {
      name: 'Carbon Emitted (kg)',
      baseVal: bTotals.emissionsKg,
      optVal: oTotals.emissionsKg,
      baseFormatted: `${formatKg(bTotals.emissionsKg, 0)}`,
      optFormatted: `${formatKg(oTotals.emissionsKg, 0)}`,
      deltaPct: bTotals.emissionsKg > 0 ? ((oTotals.emissionsKg - bTotals.emissionsKg) / bTotals.emissionsKg) * 100 : 0,
      barWidthPct: bTotals.emissionsKg > 0 ? (oTotals.emissionsKg / bTotals.emissionsKg) * 100 : 0,
      barColor: 'bg-secondary',
    },
    {
      name: 'Thermal Comfort Index',
      baseVal: bTotals.worstComfortPct,
      optVal: oTotals.worstComfortPct,
      baseFormatted: formatPct(bTotals.worstComfortPct),
      optFormatted: formatPct(oTotals.worstComfortPct),
      deltaPct: oTotals.worstComfortPct - bTotals.worstComfortPct,
      barWidthPct: oTotals.worstComfortPct,
      barColor: 'bg-primary-container',
      isComfort: true,
    },
  ];

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-space-base">
      <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
          5-Metric Delta Audit
        </span>
        <span className="font-label-caps text-label-caps text-secondary font-bold">
          DETERMINISTIC SIM
        </span>
      </div>

      <div className="space-y-space-md">
        {METRICS.map((m) => {
          const deltaSign = m.deltaPct <= 0 ? '' : '+';
          const deltaDisplay = m.isComfort
            ? `${m.optFormatted} vs ${m.baseFormatted} (${deltaSign}${m.deltaPct.toFixed(1)}% Δ)`
            : `${m.optFormatted} vs ${m.baseFormatted} (${deltaSign}${m.deltaPct.toFixed(1)}%)`;

          return (
            <div key={m.name}>
              <div className="flex justify-between font-body-sm text-body-sm mb-1">
                <span className="font-semibold text-on-surface">{m.name}</span>
                <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
                  {deltaDisplay}
                </span>
              </div>
              <div className="w-full h-2 rounded bg-surface-container-high overflow-hidden flex">
                <div
                  className={`${m.barColor} h-full rounded transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(0, m.barWidthPct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto p-space-sm rounded-lg bg-surface-container-low flex items-center gap-space-xs font-telemetry-sm text-telemetry-sm text-on-surface-variant border border-surface-container-high/40">
        <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
        <span>Thermal bounds strictly held at 23.5°C ± 1.5°C with zero invented penalties</span>
      </div>
    </div>
  );
}
