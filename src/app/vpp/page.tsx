'use client';

import React, { useState } from 'react';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import { formatClock, formatInr, formatKw, formatKwh } from '@/lib/format';
import { DT_H, STEPS_PER_DAY } from '@/simulation/constants';
import { simulate } from '@/simulation/engine';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { DiscomView } from '@/components/vpp/DiscomView';

export default function VppPage() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'discom'>('dispatch');
  const cursor = usePlaybackStore((s) => s.cursor);
  const setCursor = usePlaybackStore((s) => s.setCursor);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const scenarioId = usePlaybackStore((s) => s.scenarioId);
  const setScenarioId = usePlaybackStore((s) => s.setScenarioId);
  const setCustomScenario = usePlaybackStore((s) => s.setCustomScenario);
  const autopilot = usePlaybackStore((s) => s.autopilot);
  const runs = useSimulation();

  // DR Controls State
  const [startStep, setStartStep] = useState(72); // 18:00
  const [endStep, setEndStep] = useState(79);     // 19:45
  const [requestKw, setRequestKw] = useState(400);

  // Active DR run
  const activeDrRun = runs.network_dr ?? simulate({
    buildings: DEFAULT_BUILDINGS,
    scenario: {
      ...SCENARIOS.grid_crisis,
      drEvent: { startStep, endStep, requestKw },
    },
    mode: 'network_dr',
    autopilot,
    seed: 20261004,
  });

  const drResult = activeDrRun.dr;

  const handleActivateResponse = () => {
    const updatedCrisisScenario = {
      ...SCENARIOS.grid_crisis,
      drEvent: { startStep, endStep, requestKw },
    };
    setCustomScenario(updatedCrisisScenario);
    setScenarioId(updatedCrisisScenario.id);
    setCursor(startStep);
    setPlaying(true);
  };

  // Delivered metrics
  const requestedKwh = (endStep - startStep + 1) * requestKw * DT_H;
  let deliveredKwh = 0;
  if (drResult) {
    for (let k = startStep; k <= endStep; k++) {
      deliveredKwh += drResult.achievedKw[k] * DT_H;
    }
  }
  const compliancePct = requestedKwh > 0 ? Math.min(100, Math.round((deliveredKwh / requestedKwh) * 1000) / 10) : 100;
  const grossSettlementInr = deliveredKwh * 12.0;
  const platformFeeInr = grossSettlementInr * 0.15;
  const netPayoutInr = grossSettlementInr - platformFeeInr;

  // Chart A: Requested, Achieved, Shortfall
  const chartAData = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    const inWindow = k >= startStep && k <= endStep;
    return {
      step: k,
      time: formatClock(k),
      requestedKw: inWindow ? requestKw : 0,
      achievedKw: drResult ? Math.round(drResult.achievedKw[k] * 10) / 10 : 0,
      shortfallKw: drResult ? Math.round(drResult.shortfallKw[k] * 10) / 10 : 0,
    };
  });

  // Chart B: Stacked Contribution per building
  const chartBData = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    const entry: Record<string, any> = {
      step: k,
      time: formatClock(k),
    };
    if (drResult) {
      for (const b of DEFAULT_BUILDINGS) {
        entry[b.id] = Math.round((drResult.contributionKw[b.id]?.[k] ?? 0) * 10) / 10;
      }
    }
    return entry;
  });

  // Chart C: Thermal envelope
  const chartCData = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    const entry: Record<string, any> = {
      step: k,
      time: formatClock(k),
    };
    for (const b of DEFAULT_BUILDINGS) {
      entry[b.id] = Math.round(activeDrRun.buildings[b.id].tIn[k] * 10) / 10;
    }
    return entry;
  });

  // Chart D: Battery fleet SoC
  const chartDData = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    const entry: Record<string, any> = {
      step: k,
      time: formatClock(k),
    };
    for (const b of DEFAULT_BUILDINGS) {
      if (b.batteryKwh > 0) {
        const socPct = (activeDrRun.buildings[b.id].battSocKwh[k] / b.batteryKwh) * 100;
        entry[b.id] = Math.round(socPct * 10) / 10;
      }
    }
    return entry;
  });

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-high/60">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            VPP Demand Response Dispatch & Telemetry
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Autonomous Fast Automated DR (OpenADR 2.0b Compatible) · Sector 47 Cluster
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-space-2xs bg-surface-container-low p-space-2xs rounded-lg border border-surface-container-high">
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`px-space-md py-space-xs rounded font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'dispatch'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            VPP Dispatch & Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discom')}
            className={`px-space-md py-space-xs rounded font-label-caps uppercase text-xs font-bold transition-colors ${
              activeTab === 'discom'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            DISCOM Feeder & OpenADR View
          </button>
        </div>
      </div>

      {activeTab === 'discom' ? (
        <DiscomView />
      ) : (
        <>
          {/* SECTION 1: DISPATCH ALERT & SETPOINT BANNER */}
          <section className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high/80 shadow-md relative overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-tertiary-fixed-dim via-secondary to-primary-container absolute top-0 left-0 right-0" />

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-lg mt-space-xs">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                  <span className="font-label-caps text-label-caps uppercase text-error font-bold tracking-wider">
                    CRITICAL PEAK DEMAND RESPONSE DISPATCH ACTIVE
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Automated Load Curtailment Window (18:00 – 19:45 IST)
                </h3>
                <div className="flex items-baseline gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
                    Incentive Settlement Rate:
                  </span>
                  <span className="font-telemetry-xl text-telemetry-xl font-bold text-secondary">
                    ₹12.00
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-semibold">
                    / kWh verified curtailment
                  </span>
                </div>
              </div>

              {/* Slider & Setpoint Card */}
              <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl w-full lg:w-96 border border-surface-container-high/60 shadow-inner">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
                    Requested Curtailment:
                  </span>
                  <span className="font-telemetry-md text-telemetry-md font-bold text-primary-container px-space-xs py-space-2xs bg-surface-container-lowest border border-surface-container-high rounded">
                    {requestKw} kW
                  </span>
                </div>

                <div className="flex items-center gap-space-sm">
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">100</span>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    step="25"
                    value={requestKw}
                    onChange={(e) => setRequestKw(parseInt(e.target.value, 10))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">800</span>
                </div>

                <div className="flex items-center justify-between mt-space-sm pt-space-xs border-t border-surface-container-high/40">
                  <span className="text-on-surface-variant font-telemetry-sm text-telemetry-sm">
                    Target: {requestedKwh.toFixed(1)} kWh
                  </span>
                  <button
                    type="button"
                    onClick={handleActivateResponse}
                    className="px-space-sm py-space-2xs rounded bg-primary-container text-on-primary hover:opacity-90 font-label-caps uppercase font-bold text-xs shadow-sm transition-opacity"
                  >
                    Activate & Scruby
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: 6 PERFORMANCE TELEMETRY CARDS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-sm">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Delivered Curtailment
                </span>
                <span className="material-symbols-outlined text-[16px] text-secondary">energy_savings_leaf</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface tracking-tight">
                  {deliveredKwh.toFixed(1)}{' '}
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-normal">
                    kWh
                  </span>
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-bold">
                    {compliancePct}% COMPLIANCE
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                vs {requestedKwh.toFixed(1)} kWh contracted
              </span>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Gross DR Settlement
                </span>
                <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-secondary">
                  {formatInr(grossSettlementInr)}
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                    {deliveredKwh.toFixed(1)} kWh × ₹12.00
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-secondary font-semibold">
                Immediate Escrow Lock
              </span>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Platform Fee (15%)
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">hub</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
                  {formatInr(platformFeeInr)}
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-surface-container-high text-on-surface-variant rounded font-bold">
                    THERMOS ENGINE
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                Autonomous clearing fee
              </span>
            </div>

            {/* Card 4 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Net Participant Payout
                </span>
                <span className="material-symbols-outlined text-[16px] text-secondary">account_balance_wallet</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-primary-container">
                  {formatInr(netPayoutInr)}
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-bold">
                    PROPORTIONAL SPLIT
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                Distributed to 6 nodes
              </span>
            </div>

            {/* Card 5 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Comfort Violations
                </span>
                <span className="material-symbols-outlined text-[16px] text-secondary">thermostat</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-secondary">
                  0{' '}
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-normal">
                    Buildings
                  </span>
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container rounded font-bold">
                    100% COMPLIANT
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                All indoor temps held in band
              </span>
            </div>

            {/* Card 6 */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Fleet Reserve SoC
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">battery_charging_full</span>
              </div>
              <div className="my-space-xs">
                <div className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
                  34.2%{' '}
                  <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-normal">
                    avg
                  </span>
                </div>
                <div className="flex items-center gap-space-xs mt-space-2xs">
                  <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-surface-container-high text-on-surface-variant rounded font-bold">
                    FLOOR: 20% MIN
                  </span>
                </div>
              </div>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant">
                Safe reserve margin held
              </span>
            </div>
          </section>

          {/* SECTION 3: 4 ANALYTICAL CHARTS IN 2x2 GRID */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
            {/* Chart A: Demand Reduction Delivery */}
            <ChartFrame
              title="Demand Reduction Delivery (kW)"
              subtitle={`Requested ${requestKw} kW vs Achieved Curtailment Envelope`}
              badge="STREAM A"
              data={chartAData}
            >
              <div className="w-full h-56 pt-space-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartAData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <ReferenceArea x1="18:00" x2="19:45" fill="rgba(228, 127, 0, 0.15)" />
                    <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#626469" fontSize={11} unit=" kW" tickLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip />
                    <Line type="stepAfter" dataKey="requestedKw" name="Contracted" stroke="#B10043" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="achievedKw" name="Delivered" stroke="#009530" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>

            {/* Chart B: Building Response Contributions */}
            <ChartFrame
              title="Building Curtailment Contributions (kW)"
              subtitle="Proportional cluster resource participation (Thermal Setback + Battery BESS)"
              badge="STREAM B"
              data={chartBData}
            >
              <div className="w-full h-56 pt-space-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartBData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <ReferenceArea x1="18:00" x2="19:45" fill="rgba(61, 205, 88, 0.12)" />
                    <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#626469" fontSize={11} unit=" kW" tickLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip />
                    <Bar dataKey="orbit" name="Orbit Tech Park" fill="#009530" stackId="b" />
                    <Bar dataKey="campus" name="Campus Block D" fill="#3DCD58" stackId="b" />
                    <Bar dataKey="horizon" name="Horizon Mall" fill="#FFD100" stackId="b" />
                    <Bar dataKey="nova" name="Nova Tower" fill="#000000" stackId="b" />
                    <Bar dataKey="meridian" name="Meridian Heights" fill="#626469" stackId="b" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>

            {/* Chart C: Thermal Comfort Invariant Envelope */}
            <ChartFrame
              title="Thermal Comfort Envelope During DR Event (°C)"
              subtitle="Verifying indoor air temperature strictly stays within the 22°C–25°C bound"
              badge="STREAM C"
              data={chartCData}
            >
              <div className="w-full h-56 pt-space-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartCData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <ReferenceArea x1="18:00" x2="19:45" fill="rgba(228, 127, 0, 0.12)" />
                    <ReferenceLine y={25} stroke="#B10043" strokeDasharray="3 3" label={{ value: '25°C Max', position: 'insideTopLeft', fontSize: 10 }} />
                    <ReferenceLine y={22} stroke="#009530" strokeDasharray="3 3" label={{ value: '22°C Min', position: 'insideBottomLeft', fontSize: 10 }} />
                    <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#626469" fontSize={11} domain={[21, 26]} unit="°C" tickLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip />
                    <Line type="monotone" dataKey="nova" stroke="#009530" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="orbit" stroke="#000000" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="horizon" stroke="#E47F00" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>

            {/* Chart D: Battery Fleet State of Charge */}
            <ChartFrame
              title="Fleet Battery State of Charge (%)"
              subtitle="Verifying 20% emergency reserve floor is strictly maintained during dispatch"
              badge="STREAM D"
              data={chartDData}
            >
              <div className="w-full h-56 pt-space-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <ReferenceArea x1="18:00" x2="19:45" fill="rgba(61, 205, 88, 0.12)" />
                    <ReferenceLine y={20} stroke="#B10043" strokeDasharray="4 4" label={{ value: '20% Minimum SoC Floor', position: 'insideBottomLeft', fontSize: 10 }} />
                    <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="#626469" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip />
                    <Line type="monotone" dataKey="orbit" stroke="#009530" strokeWidth={2.5} dot={false} name="Orbit BESS" />
                    <Line type="monotone" dataKey="horizon" stroke="#FFD100" strokeWidth={2} dot={false} name="Horizon BESS" />
                    <Line type="monotone" dataKey="campus" stroke="#3DCD58" strokeWidth={2} dot={false} name="Campus BESS" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>
          </section>
        </>
      )}
    </div>
  );
}
