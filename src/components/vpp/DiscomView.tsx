'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { useSimulation } from '@/store/useSimulation';
import { discomMetrics, formatStepTime } from '@/simulation/selectors';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { STEPS_PER_DAY } from '@/simulation/constants';
import { formatKw, formatKwh, formatInr } from '@/lib/format';
import { Radio, ShieldAlert, Cpu, FileCode } from 'lucide-react';

export function DiscomView() {
  const runs = useSimulation();
  const discom = discomMetrics(runs);

  // Compile 24h cluster demand comparison: Baseline vs Optimized vs With DR
  const demandComparisonSeries = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    let baseLoad = 0;
    let optLoad = 0;
    let drLoad = 0;

    for (const b of DEFAULT_BUILDINGS) {
      baseLoad += runs.baseline.buildings[b.id].loadKw[k];
      optLoad += runs.network.buildings[b.id].loadKw[k];
      drLoad += (runs.network_dr ?? runs.network).buildings[b.id].loadKw[k];
    }

    return {
      step: k,
      time: formatStepTime(k),
      baselineKw: Math.round(baseLoad),
      optimizedKw: Math.round(optLoad),
      drKw: Math.round(drLoad),
    };
  });

  return (
    <div className="space-y-space-lg">
      {/* DISCOM Headline Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            Cluster Peak Demand
          </p>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
              {formatKw(discom.optPeakKw)}
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">
              (-{discom.peakReductionPct.toFixed(1)}%)
            </span>
          </div>
          <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-1">
            Baseline: {formatKw(discom.basePeakKw)} at {discom.timeOfPeak}
          </p>
        </div>

        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            Feeder Load Factor
          </p>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
              {(discom.optLoadFactor * 100).toFixed(1)}%
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">
              (+{((discom.optLoadFactor - discom.baseLoadFactor) * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-1">
            Baseline: {(discom.baseLoadFactor * 100).toFixed(1)}% (mean / peak)
          </p>
        </div>

        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            Peak Window Shifting
          </p>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-secondary">
              {formatKwh(discom.kwhMovedOutOfPeak)}
            </span>
          </div>
          <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-1">
            Shifted out of 17:00–22:00 peak tariff window
          </p>
        </div>

        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm">
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            DR Delivery Compliance
          </p>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-primary">
              {discom.drAchievedKwh.toFixed(0)} kWh
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">
              ({discom.drCompliancePct.toFixed(1)}%)
            </span>
          </div>
          <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-1">
            vs {discom.drRequestedKwh.toFixed(0)} kWh DISCOM event target
          </p>
        </div>
      </div>

      {/* 24-Hour DISCOM Demand Comparison Chart */}
      <ChartFrame
        title="DISCOM 11kV Feeder Load: Baseline vs. Optimized vs. Demand Response"
        subtitle="Illustrates physical sub-station relief during critical peak hours (17:00–22:00) and DR event (18:00–19:45)"
        badge="FEEDER LEVEL"
        data={demandComparisonSeries}
      >
        <div className="h-72 w-full pt-space-xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandComparisonSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <ReferenceArea
                x1="17:00"
                x2="21:45"
                fill="rgba(228, 127, 0, 0.12)"
                label={{ value: 'Peak Tariff Window (17:00–22:00)', position: 'insideTopLeft', fill: '#E47F00', fontSize: 10 }}
              />
              <ReferenceArea
                x1="18:00"
                x2="19:45"
                fill="rgba(177, 0, 67, 0.15)"
                label={{ value: 'Active DR Event', position: 'insideBottomLeft', fill: '#B10043', fontSize: 10 }}
              />
              <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
              <YAxis stroke="#626469" fontSize={11} unit=" kW" domain={[0, 'auto']} tickLine={false} fontFamily="JetBrains Mono" />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="baselineKw" name="1. Baseline Schedule" stroke="#626469" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="optimizedKw" name="2. THERMOS Optimized" stroke="#009530" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="drKw" name="3. Optimized with DR Event" stroke="#000000" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {/* OpenADR 2.0b Signal Payload Panel */}
      <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-surface-container-high mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <FileCode className="w-5 h-5 text-secondary" />
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                OpenADR 2.0b Telemetry & Virtual Top Node (VTN) Payload
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Live automated event payload dispatched by DISCOM and cluster VEN telemetry acknowledgment
              </p>
            </div>
          </div>
          <span className="font-label-caps text-label-caps uppercase px-space-sm py-space-2xs rounded bg-surface-container-low text-on-surface-variant border border-surface-container-high font-bold">
            Illustrative Payload · Not a Certified OpenADR Implementation
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          {/* JSON Payload Display */}
          <div className="lg:col-span-6 rounded-lg bg-primary-container p-space-sm font-mono text-xs overflow-x-auto text-primary-fixed border border-primary">
            <div className="flex items-center justify-between pb-space-2xs border-b border-on-primary-container/20 text-on-primary-container mb-space-2xs text-[10px] font-label-caps uppercase">
              <span>DISCOM VTN Inbound Dispatch Event</span>
              <span className="text-secondary-fixed">JSON Payload</span>
            </div>
            <pre className="text-[11px] leading-relaxed">
              {JSON.stringify(discom.openAdrPayload, null, 2)}
            </pre>
          </div>

          {/* Building Contribution Breakdown */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface mb-space-xs">
              Building VEN Participation Telemetry
            </h4>
            <div className="space-y-space-xs">
              {discom.openAdrPayload.buildingBreakdown.map((b) => {
                const reductionKw = Math.max(0, b.baseLoadPeakKw - b.optLoadPeakKw);
                return (
                  <div
                    key={b.buildingId}
                    className="p-space-xs rounded-lg bg-surface-container-low flex items-center justify-between text-xs font-telemetry-sm border border-surface-container-high/40"
                  >
                    <div>
                      <span className="font-bold text-on-surface">{b.name}</span>
                      <div className="text-[10px] text-on-surface-variant">
                        Peak: {b.baseLoadPeakKw.toFixed(0)} kW → {b.optLoadPeakKw.toFixed(0)} kW
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-secondary">
                        -{reductionKw.toFixed(0)} kW Shaved
                      </span>
                      <div className="text-[10px] text-on-surface-variant">Autonomous Setback + Battery</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Regulatory Disclaimer Banner */}
            <div className="mt-space-sm p-space-sm rounded-lg bg-tertiary-container/10 border border-tertiary-fixed-dim/40 flex items-start gap-space-xs text-xs">
              <ShieldAlert className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
              <p className="font-body-sm text-on-surface-variant text-[11px]">
                <strong className="text-on-surface font-semibold">Programme Caveat:</strong> DR participation depends on the DISCOM programme in each state. Tariffs, baseline verification methodologies, and incentive structures are illustrative.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
