'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { clusterDemandSeries } from '@/simulation/selectors';
import { formatClock, formatKw } from '@/lib/format';

export function LiveWaveform() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const data = clusterDemandSeries(runs);

  const currentStep = Math.max(0, Math.min(95, Math.floor(cursor)));
  const cursorData = data[currentStep] ?? {
    baselineDemandKw: 0,
    networkDemandKw: 0,
    solarKw: 0,
    time: formatClock(cursor),
  };

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-base">
      <ChartFrame
        title="Cluster Demand vs Optimized Profile"
        badge="96-STEP 15-MIN DETERMINISTIC"
        subtitle="Total 6-building feeder load: Baseline schedule vs Autonomous THERMOS + Solar (kW)"
        data={data}
      >
        {/* Tariff Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-sm rounded-lg font-telemetry-sm text-telemetry-sm my-space-xs border border-surface-container-high/40">
          <div className="flex flex-wrap items-center gap-space-base">
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded bg-secondary-container opacity-60" />
              <span className="text-on-surface-variant font-medium">Off-Peak (22:00-06:00 · ₹6.0/kWh)</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded bg-surface-variant opacity-60" />
              <span className="text-on-surface-variant font-medium">Normal (06:00-17:00 · ₹8.5/kWh)</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded bg-tertiary-fixed-dim opacity-70" />
              <span className="text-on-tertiary-container font-bold">Peak Alert (17:00-22:00 · ₹11.0/kWh)</span>
            </div>
          </div>

          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="w-3.5 h-0.5 bg-outline inline-block" />
              <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">Baseline</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3.5 h-1 bg-primary-container inline-block" />
              <span className="text-primary-container font-label-caps text-label-caps uppercase font-bold">THERMOS Opt.</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded bg-secondary opacity-40 inline-block" />
              <span className="text-secondary font-label-caps text-label-caps uppercase">Solar Gen</span>
            </div>
          </div>
        </div>

        {/* Responsive Waveform Chart */}
        <div className="relative w-full h-80 pt-space-xs">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="solarStitchGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3DCD58" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#3DCD58" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Tariff Underlay Zones */}
              <ReferenceArea x1="00:00" x2="05:45" fill="rgba(61, 205, 88, 0.08)" />
              <ReferenceArea x1="17:00" x2="21:45" fill="rgba(228, 127, 0, 0.12)" />
              <ReferenceArea x1="22:00" x2="23:45" fill="rgba(61, 205, 88, 0.08)" />

              {/* Peak Shaving Cap Reference Line */}
              <ReferenceLine
                y={750}
                stroke="#B10043"
                strokeDasharray="4 4"
                label={{
                  value: 'CLUSTER PEAK CAP: 750 kW',
                  position: 'insideTopLeft',
                  fill: '#B10043',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'JetBrains Mono',
                }}
              />

              {/* Live Playback Cursor Vertical Line */}
              <ReferenceLine
                x={cursorData.time}
                stroke="#009530"
                strokeWidth={2}
              />

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
                    <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/95 backdrop-blur-md p-3 text-xs shadow-xl font-mono text-on-surface">
                      <div className="font-semibold text-primary mb-1 pb-1 border-b border-surface-container-high">
                        Time: {label}
                      </div>
                      {payload.map((p) => (
                        <div key={p.name} className="flex justify-between gap-4 py-0.5">
                          <span className="text-on-surface-variant">{p.name}:</span>
                          <span className="font-bold text-on-surface">{formatKw(Number(p.value))}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              {/* Solar Generation Area */}
              <Area
                type="monotone"
                dataKey="solarKw"
                name="Solar Generation"
                fill="url(#solarStitchGradient)"
                stroke="#009530"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />

              {/* Baseline Demand Line */}
              <Line
                type="monotone"
                dataKey="baselineDemandKw"
                name="Baseline Demand"
                stroke="#626469"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />

              {/* THERMOS Optimized Demand Line */}
              <Line
                type="monotone"
                dataKey="networkDemandKw"
                name="THERMOS Optimized"
                stroke="#009530"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Dynamic Live Cursor Badge */}
          <div className="absolute top-2 right-4 bg-surface-container-lowest/95 backdrop-blur-md p-space-sm rounded-lg shadow-md border border-surface-container-high/60 pointer-events-none hidden sm:block">
            <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-secondary font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              STEP {currentStep} · {cursorData.time} IST
            </div>
            <div className="grid grid-cols-2 gap-x-space-md gap-y-0.5 mt-space-2xs font-telemetry-sm text-telemetry-sm">
              <span className="text-on-surface-variant">Baseline:</span>
              <span className="text-right font-bold text-outline">
                {Math.round(cursorData.baselineDemandKw)} kW
              </span>
              <span className="text-on-surface-variant">THERMOS:</span>
              <span className="text-right font-bold text-primary">
                {Math.round(cursorData.networkDemandKw)} kW
              </span>
              <span className="text-on-surface-variant">Solar Feed:</span>
              <span className="text-right font-bold text-secondary">
                {Math.round(cursorData.solarKw)} kW
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Axis Quick Milestones */}
        <div className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant px-space-xs pt-space-xs border-t border-surface-container-high/40">
          <span>00:00 (STEP 0)</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00 (SOLAR NOON)</span>
          <span className="text-secondary font-bold">{cursorData.time} (NOW)</span>
          <span>18:00 (EVENING PEAK)</span>
          <span>21:00</span>
          <span>24:00 (STEP 95)</span>
        </div>
      </ChartFrame>
    </div>
  );
}
