'use client';

import React, { useState } from 'react';
import { KpiStrip } from '@/components/overview/KpiStrip';
import { LiveWaveform } from '@/components/overview/LiveWaveform';
import { EnergyBudgetBar } from '@/components/overview/EnergyBudgetBar';
import { CostTicker } from '@/components/overview/CostTicker';
import { LayerAttributionChart } from '@/components/overview/LayerAttributionChart';
import { ComparisonBars } from '@/components/overview/ComparisonBars';
import { InsightsFeed } from '@/components/overview/InsightsFeed';
import { NetworkMap } from '@/components/network/NetworkMap';
import { ManagementViews } from '@/components/overview/ManagementViews';
import { runScaleTest, ScalePoint } from '@/simulation/scale';
import { formatInr, formatKwh } from '@/lib/format';
import { X } from 'lucide-react';

export default function OverviewPage() {
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [scaleResults, setScaleResults] = useState<ScalePoint[] | null>(null);
  const [scalingLoading, setScaleLoading] = useState(false);
  const [cityBuildingsCount, setCityBuildingsCount] = useState<number>(250);

  const handleRunScale = () => {
    setScaleLoading(true);
    setTimeout(() => {
      const results = runScaleTest([6, 12, 24, 48]);
      setScaleResults(results);
      setScaleLoading(false);
    }, 50);
  };

  const avgUpliftPerBuilding = scaleResults
    ? scaleResults[scaleResults.length - 1].upliftPerBuildingInr
    : 450;
  const projectedCityVisionInr = cityBuildingsCount * avgUpliftPerBuilding;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Banner Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-high/60">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            Cluster Energy Overview
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sector 47 Microgrid Feeder · 6 Commercial Buildings · Deterministic Multi-Layer Optimization
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setScaleModalOpen(true);
            if (!scaleResults) handleRunScale();
          }}
          className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-lowest border border-surface-container-high hover:bg-surface-container-low transition-colors shadow-sm text-on-surface font-label-caps uppercase text-[11px] font-bold"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
          <span>City Scale Simulation (P2)</span>
        </button>
      </div>

      {/* 1. TOP KPI TELEMETRY STRIP (6 METRICS) */}
      <KpiStrip />

      {/* 2. MAIN ROW: 2/3 LIVE DEMAND WAVEFORM + 1/3 REAL-TIME EXECUTION & BUDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8">
          <LiveWaveform />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-space-base">
          <CostTicker />
          <EnergyBudgetBar />
          <LayerAttributionChart />
        </div>
      </div>

      {/* 3. BOTTOM ROW: 3 BESPOKE AUDIT COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
        {/* Left: 5-Metric Comparison Bars */}
        <ComparisonBars />

        {/* Center: P2P Dynamic Dispatch Mesh Mini-Map */}
        <div className="h-full min-h-[420px]">
          <NetworkMap compact={true} />
        </div>

        {/* Right: Autopilot Decision Trace Action Ledger */}
        <div className="h-full min-h-[420px]">
          <InsightsFeed />
        </div>
      </div>

      {/* 4. MANAGEMENT VIEWS: End-Use Breakdown, Occupancy Heatmap, EUI & ECBC Benchmarks */}
      <div className="pt-space-sm border-t border-surface-container-high/60">
        <ManagementViews />
      </div>

      {/* Scale Test Modal */}
      {scaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl bg-surface-container-lowest p-space-lg border border-surface-container-high shadow-2xl space-y-space-md animate-in fade-in">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[22px] text-secondary">apartment</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Microgrid N-Building Scaling & City Vision
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Simulating synthetic clusters N ∈ &#123;6, 12, 24, 48&#125; with deterministic seed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScaleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scalingLoading ? (
              <div className="py-12 text-center text-on-surface-variant font-telemetry-sm text-telemetry-sm">
                Running multi-cluster physical simulations...
              </div>
            ) : scaleResults ? (
              <div className="space-y-space-base">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-telemetry-sm text-telemetry-sm border-collapse">
                    <thead className="bg-surface-container-low font-label-caps uppercase text-on-surface-variant">
                      <tr>
                        <th className="p-2 border-b border-surface-container-high">Cluster Size</th>
                        <th className="p-2 border-b border-surface-container-high text-right">Total Traded (kWh)</th>
                        <th className="p-2 border-b border-surface-container-high text-right">Total P2P Uplift</th>
                        <th className="p-2 border-b border-surface-container-high text-right">Uplift / Building</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
                      {scaleResults.map((r) => (
                        <tr key={r.n} className="hover:bg-surface-container-low/40">
                          <td className="p-2 font-bold">{r.n} Buildings</td>
                          <td className="p-2 text-right font-mono">{r.totalTradedKwh.toLocaleString()} kWh</td>
                          <td className="p-2 text-right font-bold text-primary">{formatInr(r.totalUpliftInr)}</td>
                          <td className="p-2 text-right font-bold text-secondary">{formatInr(r.upliftPerBuildingInr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* City Vision Calculator */}
                <div className="p-space-base rounded-xl bg-surface-container-low border border-surface-container-high/60 space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface">
                      District-Scale City Extrapolation
                    </h4>
                    <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
                      ₹{avgUpliftPerBuilding.toFixed(0)} avg uplift/bldg/day
                    </span>
                  </div>

                  <div className="flex items-center gap-space-base">
                    <input
                      type="range"
                      min={50}
                      max={1000}
                      step={25}
                      value={cityBuildingsCount}
                      onChange={(e) => setCityBuildingsCount(parseInt(e.target.value, 10))}
                      className="flex-1 accent-secondary"
                    />
                    <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface min-w-[120px] text-right">
                      {cityBuildingsCount} Buildings
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-space-xs border-t border-surface-container-high/40">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Annual City Grid Value Created:
                    </span>
                    <span className="font-telemetry-xl text-telemetry-xl font-bold text-secondary">
                      {formatInr(projectedCityVisionInr * 365)} / yr
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
