'use client';

import React, { useState } from 'react';
import { NetworkMap } from '@/components/network/NetworkMap';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { formatClock, formatInr, formatKwh, formatKw } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { STEPS_PER_DAY } from '@/simulation/constants';
import { tradesAtStep, networkStatus } from '@/simulation/selectors';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';

export default function NetworkPage() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const activeRun = runs.network_dr ?? runs.network;
  const currentStep = Math.max(0, Math.min(95, Math.floor(cursor)));

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('orbit');

  const status = networkStatus(activeRun, currentStep);
  const currentTrades = tradesAtStep(activeRun, currentStep);

  const totalTradedKwh = activeRun.clusterTotals.totalP2pTradedKwh;
  const totalValueInr = activeRun.clusterTotals.totalP2pSavingsInr;
  const validVwap = activeRun.marketVwap.filter((x): x is number => x !== null);
  const vwapInr = validVwap.length > 0 ? validVwap.reduce((a, b) => a + b, 0) / validVwap.length : 7.20;

  // Feeder stress computation from peak load vs 2.5 MVA base
  const peakFeederKw = activeRun.clusterTotals.peakKw;
  const feederStressPct = Math.min(100, Math.round((peakFeederKw / 2500) * 1000) / 10);

  // Stacked bar of traded kW per step by source (export vs battery)
  const tradeVolumeSeries = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    let exportKw = 0;
    let batteryKw = 0;

    for (const t of activeRun.trades) {
      if (t.step === k) {
        if (t.source === 'export') {
          exportKw += t.kw;
        } else {
          batteryKw += t.kw;
        }
      }
    }

    return {
      step: k,
      time: formatClock(k),
      solarKw: Math.round(exportKw * 10) / 10,
      batteryKw: Math.round(batteryKw * 10) / 10,
      totalKw: Math.round((exportKw + batteryKw) * 10) / 10,
    };
  });

  const selectedBuildingDef = DEFAULT_BUILDINGS.find((b) => b.id === selectedBuildingId) ?? DEFAULT_BUILDINGS[1];
  const selectedSeries = activeRun.buildings[selectedBuildingDef.id];

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-high/60">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            P2P Microgrid Network Map & Feeder Flow
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sector 47 Substation Feeder · 11kV Radial Bus · Autonomous Bilateral Matching
          </p>
        </div>

        <div className="flex items-center gap-space-xs">
          <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container font-bold rounded">
            SYNC: 50.02 HZ
          </span>
          <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-surface-container-high text-on-surface font-bold rounded">
            FEEDER: 2.5 MVA
          </span>
        </div>
      </div>

      {/* TOP KPI TELEMETRY STRIP (4 METRICS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Total P2P Volume
            </span>
            <span className="px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-label-caps text-label-caps font-bold">
              CLEARED
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-on-surface font-bold">
              {formatKwh(totalTradedKwh)}
            </span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>+{((totalTradedKwh / 15000) * 100).toFixed(1)}% self-consumption</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Average Clearing Price
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">
              GRID: ₹8.50
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-primary font-bold">
              ₹{vwapInr.toFixed(2)}
            </span>
            <span className="text-body-sm text-on-surface-variant">/ kWh VWAP</span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-secondary font-bold">
            <span>-15.3% below grid tariff</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Net Value Created
            </span>
            <span className="px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-label-caps text-label-caps font-bold">
              PROFIT POOL
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-secondary font-bold">
              {formatInr(totalValueInr)}
            </span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>Shared between buyers & sellers</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Feeder Line Stress
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">
              2.5 MVA Base
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-primary font-bold">
              {feederStressPct}%
            </span>
            <span className="font-label-caps text-label-caps text-on-secondary-container px-space-xs rounded bg-secondary-container font-bold">
              SAFE
            </span>
          </div>
          <div className="mt-space-xs w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: `${feederStressPct}%` }} />
          </div>
        </div>
      </section>

      {/* MAIN INTERACTIVE NETWORK VIEWPORT */}
      <section className="w-full grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* Left 8-col: SVG Canvas */}
        <div className="xl:col-span-8 min-h-[500px]">
          <NetworkMap
            compact={false}
            onSelectBuilding={(id) => setSelectedBuildingId(id)}
          />
        </div>

        {/* Right 4-col: Node Telemetry & Bilateral Order Execution */}
        <div className="xl:col-span-4 flex flex-col gap-space-base">
          {/* Card 1: Selected Node Status */}
          <div className="p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <div>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
                  Active Selected Node
                </span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {selectedBuildingDef.name}
                </h3>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary uppercase px-space-xs py-0.5 rounded bg-secondary-container">
                {selectedBuildingDef.type}
              </span>
            </div>

            <div className="space-y-space-2xs font-telemetry-sm text-telemetry-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Step Power Demand:</span>
                <span className="font-bold text-on-surface">
                  {formatKw(selectedSeries ? selectedSeries.loadKw[currentStep] : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Solar Generation:</span>
                <span className="font-bold text-secondary">
                  {formatKw(selectedSeries ? selectedSeries.solarKw[currentStep] : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Battery Capacity:</span>
                <span className="font-bold text-on-surface">
                  {selectedBuildingDef.batteryKwh} kWh ({selectedBuildingDef.batteryKw} kW)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Thermal Setpoint:</span>
                <span className="font-bold text-on-surface">
                  {selectedSeries ? selectedSeries.tTarget[currentStep].toFixed(1) : 24.0}°C
                </span>
              </div>
            </div>

            {/* Price Component Waterfall */}
            <div className="p-space-sm bg-surface-container-low rounded-lg mt-space-xs">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold block mb-space-2xs">
                Cleared Bilateral Waterfall
              </span>
              <div className="space-y-1 font-telemetry-sm text-[11px]">
                <div className="flex justify-between">
                  <span>1. Base Seller Ask (LCOE):</span>
                  <span className="font-bold">₹3.00 / kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>2. Wheeling & Losses:</span>
                  <span className="font-bold">₹0.50 / kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>3. THERMOS Fee:</span>
                  <span className="font-bold">₹0.30 / kWh</span>
                </div>
                <div className="flex justify-between text-secondary font-bold pt-1 border-t border-surface-container-high/60">
                  <span>Delivered Clearing Price:</span>
                  <span>₹7.20 / kWh (vs Grid ₹8.50)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Step Active Trades Summary */}
          <div className="p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
                Step {currentStep} Active Contracts
              </span>
              <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
                {currentTrades.length} MATCHED
              </span>
            </div>

            <div className="space-y-space-xs max-h-56 overflow-y-auto">
              {currentTrades.length === 0 ? (
                <div className="py-6 text-center text-xs text-on-surface-variant font-mono">
                  No bilateral trades active at step {currentStep}.
                </div>
              ) : (
                currentTrades.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-space-xs rounded bg-surface-container-low flex items-center justify-between text-xs font-telemetry-sm border border-surface-container-high/40"
                  >
                    <div>
                      <span className="font-bold text-on-surface">{t.sellerId.toUpperCase()}</span>
                      <span className="text-secondary mx-1">→</span>
                      <span className="font-bold text-on-surface">{t.buyerId.toUpperCase()}</span>
                      <div className="text-[10px] text-on-surface-variant capitalize">{t.source} power</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-secondary">{Math.round(t.kw)} kW</div>
                      <div className="text-[10px] text-on-surface-variant">₹{t.priceInrKwh.toFixed(2)}/kWh</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* LOWER PANEL: 96-STEP POWER SOURCE STACKED CHART */}
      <section className="w-full">
        <ChartFrame
          title="24-Hour Deterministic Timeline: P2P Traded Power by Source"
          subtitle="96 Steps × 15-min: Solar Surplus Export vs Stored Battery BESS Dispatch (kW)"
          badge="BILATERAL CLEARING"
          data={tradeVolumeSeries}
        >
          <div className="w-full h-64 pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradeVolumeSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  interval={11}
                  stroke="#626469"
                  fontSize={11}
                  tickLine={false}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke="#626469"
                  fontSize={11}
                  domain={[0, 'auto']}
                  unit=" kW"
                  tickLine={false}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-[#E2E4E8] bg-white/95 p-3 text-xs shadow-xl font-mono text-[#262626]">
                        <div className="font-semibold text-[#262626] mb-1 pb-1 border-b border-[#E2E4E8]">
                          Step Time: {label}
                        </div>
                        {payload.map((p) => (
                          <div key={p.name} className="flex justify-between gap-4 py-0.5">
                            <span className="text-[#626469]">{p.name}:</span>
                            <span className="font-bold text-[#262626]">{formatKw(Number(p.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={formatClock(cursor)} stroke="#009530" strokeWidth={2} />
                <Bar dataKey="solarKw" name="Solar Surplus" fill="#9FAF00" stackId="a" />
                <Bar dataKey="batteryKw" name="BESS Battery Discharge" fill="#FFD100" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </section>
    </div>
  );
}
