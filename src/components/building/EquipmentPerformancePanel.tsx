'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { RunResult } from '@/simulation/types';
import { fddSeries } from '@/simulation/selectors';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { formatKw, formatInr, formatKwh } from '@/lib/format';
import { AlertTriangle, CheckCircle, Wrench, ShieldAlert } from 'lucide-react';

interface Props {
  buildingId: string;
  run: RunResult;
  cursor: number;
}

export function EquipmentPerformancePanel({ buildingId, run, cursor }: Props) {
  const { series, fdd } = fddSeries(run, buildingId);
  const isFaultScenario = run.scenarioId === 'fault_fouled_condenser' && buildingId === 'orbit';
  const hasAnomaly = fdd && fdd.flagStep !== null;

  return (
    <div className="space-y-space-md">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs border-b border-surface-container-high/60">
        <div>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
            <Wrench className="w-4 h-4 text-secondary" />
            Equipment Performance & Automated Fault Detection (FDD)
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Model-based thermal residual monitoring (Actual vs. Physics-Derived Nominal Expectation)
          </p>
        </div>

        <div className="flex items-center gap-space-xs">
          {hasAnomaly ? (
            <span className="flex items-center gap-1.5 px-space-sm py-space-2xs rounded-lg border border-error/40 bg-error-container text-on-error-container text-xs font-label-caps uppercase font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fault Flagged: Step {fdd.flagStep} (+{(fdd.detectionDelaySteps ?? 0) * 15}m delay)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-space-sm py-space-2xs rounded-lg bg-secondary-container text-on-secondary-container text-xs font-label-caps uppercase font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              Nominal Performance (Residual &lt; 8%)
            </span>
          )}
        </div>
      </div>

      {/* Synthetic Injected Fault Demonstration Banner */}
      {isFaultScenario && (
        <div className="p-space-base rounded-xl border border-tertiary-fixed-dim/40 bg-tertiary-container/10 flex items-start gap-space-sm">
          <ShieldAlert className="w-5 h-5 text-on-tertiary-container mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-headline-sm text-xs font-bold text-on-tertiary-container uppercase tracking-wide">
              Synthetic Injected Fault for Demonstration Active
            </div>
            <p className="text-on-surface-variant leading-relaxed font-body-sm">
              Chiller condenser tube fouling begins at step 40 (10:00 AM). COP degrades linearly by 12% over 8 steps.
              The residual monitor flags the fault when <span className="font-mono font-bold text-on-surface">r(k) &gt; 0.08</span> persists for 8 consecutive 15-minute steps.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards: Wasted Energy, Wasted Cost, Effective COP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">Wasted Cooling Energy</span>
          <div className="my-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
              {formatKwh(fdd?.wastedKwh ?? 0)}
            </span>
          </div>
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            From fault onset (step {fdd?.flagStep ?? 40}) to midnight
          </span>
        </div>

        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">Wasted Energy Cost</span>
          <div className="my-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-error">
              {formatInr(fdd?.wastedInr ?? 0)}
            </span>
          </div>
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            At step-specific dynamic tariff rates
          </span>
        </div>

        <div className="p-space-base rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">Effective Chiller COP</span>
          <div className="my-space-xs flex items-baseline gap-2">
            <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
              {series[Math.floor(cursor)] ? series[Math.floor(cursor)].effectiveCop.toFixed(2) : '3.60'}
            </span>
            <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
              (Nominal: {series[Math.floor(cursor)] ? (series[Math.floor(cursor)].effectiveCop / (1 - (isFaultScenario && Math.floor(cursor) >= 48 ? 0.12 : 0))).toFixed(2) : '3.60'})
            </span>
          </div>
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            Carnot-derived COP(Tout) × (1 - degradation)
          </span>
        </div>
      </div>

      {/* Dual Charts: Actual vs Expected HVAC kW, and Dimensionless Residual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Actual vs Expected HVAC kW */}
        <ChartFrame
          title="Chiller Power: Actual vs. Model Expectation"
          subtitle="hvacKwActual (measured) vs hvacKwNominal (fault-free expectation)"
          badge="HVAC KW"
          data={series}
        >
          <div className="h-64 w-full pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                {fdd && fdd.flagStep !== null && (
                  <ReferenceLine
                    x={series[fdd.flagStep]?.time}
                    stroke="#B10043"
                    strokeDasharray="3 3"
                    label={{ value: 'FDD Flag', fill: '#B10043', fontSize: 10 }}
                  />
                )}
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} unit=" kW" tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Line type="monotone" dataKey="hvacKwNominal" name="Nominal Expectation" stroke="#626469" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="hvacKwActual" name="Actual Measured" stroke="#009530" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        {/* Dimensionless Residual & Threshold */}
        <ChartFrame
          title="Dimensionless Residual r(k) & Alarm Threshold"
          subtitle="r(k) = (actual/nominal) - 1. Alarm triggers when r > 8% for 8 consecutive steps"
          badge="RESIDUAL R(K)"
          data={series}
        >
          <div className="h-64 w-full pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <ReferenceLine
                  y={0.08}
                  stroke="#B10043"
                  strokeDasharray="4 4"
                  label={{ value: '+8% Fault Alarm Limit', fill: '#B10043', fontSize: 10, position: 'insideTopLeft' }}
                />
                <ReferenceLine y={0} stroke="#626469" strokeDasharray="2 2" />
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} domain={[-0.05, 0.25]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip formatter={(v: any) => [`${(Number(v) * 100).toFixed(1)}%`, 'Residual']} />
                <Line type="monotone" dataKey="residual" name="Residual r(k)" stroke="#000000" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}
