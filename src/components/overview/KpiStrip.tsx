'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { kpiSummary } from '@/simulation/selectors';
import { formatInr, formatKg, formatKwh, formatKw, formatPct } from '@/lib/format';

export function KpiStrip() {
  const runs = useSimulation();
  const kpis = kpiSummary(runs);

  const CARDS = [
    {
      title: 'Cost Saved Today',
      icon: 'trending_down',
      iconColor: 'text-secondary',
      value: formatInr(kpis.costSavedInr),
      badgeText: `-${kpis.costSavedPct.toFixed(1)}%`,
      badgeStyle: 'bg-secondary-container text-on-secondary-container',
      subtext: 'vs baseline',
    },
    {
      title: 'Energy Used',
      icon: 'bolt',
      iconColor: 'text-on-surface-variant',
      value: formatKwh(kpis.networkEnergyKwh),
      badgeText: `-${formatKwh(kpis.energySavedKwh)}`,
      badgeStyle: 'bg-secondary-container text-on-secondary-container',
      subtext: `base ${formatKwh(kpis.baselineEnergyKwh)}`,
    },
    {
      title: 'Peak Demand',
      icon: 'equalizer',
      iconColor: 'text-secondary',
      value: `${formatKw(kpis.networkPeakKw, 0)}`,
      badgeText: `-${kpis.peakReductionPct.toFixed(1)}%`,
      badgeStyle: 'bg-primary-container text-secondary-fixed-dim',
      subtext: 'cap < 750 kW',
    },
    {
      title: 'CO₂ Avoided',
      icon: 'eco',
      iconColor: 'text-secondary',
      value: `${formatKg(kpis.emissionsAvoidedKg, 0)}`,
      badgeText: `${kpis.treeDays.toFixed(0)}`,
      badgeStyle: 'text-secondary font-bold',
      subtext: 'tree-days equiv',
    },
    {
      title: 'Comfort Score',
      icon: 'thermostat',
      iconColor: 'text-secondary',
      value: formatPct(kpis.worstComfortPct),
      badgeText: '98.6% min',
      badgeStyle: 'text-on-surface-variant',
      subtext: `cluster avg ${formatPct(kpis.avgComfortPct)}`,
    },
    {
      title: 'P2P Traded',
      icon: 'sync_alt',
      iconColor: 'text-on-surface-variant',
      value: formatKwh(kpis.p2pTradedKwh),
      badgeText: formatInr(kpis.p2pSavingsInr),
      badgeStyle: 'bg-surface-container-high text-on-surface',
      subtext: 'arb. profit',
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm">
      {CARDS.map((c) => (
        <div
          key={c.title}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {c.title}
            </span>
            <span className={`material-symbols-outlined text-[18px] ${c.iconColor}`}>
              {c.icon}
            </span>
          </div>

          <div className="mt-space-xs">
            <div className="font-telemetry-xl text-telemetry-xl text-on-surface font-bold tracking-tight">
              {c.value}
            </div>
            <div className="flex items-center gap-space-2xs mt-space-2xs">
              <span className={`px-space-xs py-0.5 rounded font-telemetry-sm text-telemetry-sm font-bold ${c.badgeStyle}`}>
                {c.badgeText}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {c.subtext}
              </span>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
