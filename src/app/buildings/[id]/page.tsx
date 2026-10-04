'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { FloorSchematic } from '@/components/building/FloorSchematic';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { EquipmentPerformancePanel } from '@/components/building/EquipmentPerformancePanel';
import { buildingStack, indoorTemp, batterySoc } from '@/simulation/selectors';
import { formatClock, formatInr, formatKw, formatKwh } from '@/lib/format';
import { STEPS_PER_DAY } from '@/simulation/constants';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Building2, Wind, Lightbulb, BatteryCharging, Zap, Sun } from 'lucide-react';

export default function BuildingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || 'nova';

  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const activeRun = runs.network_dr ?? runs.network;
  const baselineRun = runs.baseline;

  const building = DEFAULT_BUILDINGS.find((b) => b.id === id) ?? DEFAULT_BUILDINGS[0];
  const series = activeRun.buildings[building.id];
  const baseSeries = baselineRun.buildings[building.id];
  const stepIdx = Math.max(0, Math.min(95, Math.floor(cursor)));

  // 1. Stacked Area Load by Component
  const stackData = buildingStack(activeRun, building.id).map((row, k) => ({
    ...row,
    baselineLoadKw: baseSeries.loadKw[k],
  }));

  // 2. Indoor Temperature vs Target
  const tempData = indoorTemp(activeRun, building.id);

  // 3. Battery SoC & Power
  const socData = batterySoc(activeRun, building.id);

  // 4. Grid Point: Physical vs Billed
  const gridPointData = Array.from({ length: STEPS_PER_DAY }, (_, k) => ({
    step: k,
    time: formatClock(k),
    physicalGridKw: series.physicalGridKw[k],
    billedGridKw: series.billedGridKw[k],
  }));

  // 5. Cumulative Cost: Baseline vs Optimized
  let cumBaseCost = 0;
  let cumOptCost = 0;
  const costData = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    cumBaseCost += baseSeries.stepCostInr[k];
    cumOptCost += series.stepCostInr[k];
    return {
      step: k,
      time: formatClock(k),
      baselineCostInr: Math.round(cumBaseCost),
      optimizedCostInr: Math.round(cumOptCost),
      savedInr: Math.max(0, Math.round(cumBaseCost - cumOptCost)),
    };
  });

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Building Header & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-high/60">
        <div className="flex items-center gap-space-sm">
          <Building2 className="w-6 h-6 text-secondary" />
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              {building.name}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant capitalize">
              {building.type} Archetype · {building.areaM2.toLocaleString()} m² · Sector 47
            </p>
          </div>
        </div>

        {/* Building Selector Buttons */}
        <div className="flex flex-wrap items-center gap-space-xs bg-surface-container-low border border-surface-container-high p-space-2xs rounded-lg">
          {DEFAULT_BUILDINGS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => router.push(`/buildings/${b.id}`)}
              className={`px-space-sm py-space-xs font-label-caps uppercase text-xs font-bold rounded transition-colors ${
                b.id === building.id
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Status Cards at Cursor */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm font-mono text-xs">
        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-sans mb-1">
            <span className="font-label-caps uppercase text-[10px] font-bold">Chiller / AHU</span>
            <Wind className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="font-telemetry-xl text-lg font-bold text-on-surface">{formatKw(series.hvacKw[stepIdx])}</div>
          <div className="font-telemetry-sm text-[10px] text-on-surface-variant">
            Control: {(series.hvacU[stepIdx] * 100).toFixed(0)}% · Cap: {building.hvacRatedKw} kW
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-sans mb-1">
            <span className="font-label-caps uppercase text-[10px] font-bold">Lighting</span>
            <Lightbulb className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
          </div>
          <div className="font-telemetry-xl text-lg font-bold text-on-surface">
            {formatKw(series.lightingKw[stepIdx])}
          </div>
          <div className="font-telemetry-sm text-[10px] text-on-surface-variant">
            Harvest: {building.daylightFraction * 100}% glass
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-sans mb-1">
            <span className="font-label-caps uppercase text-[10px] font-bold">EV Chargers</span>
            <BatteryCharging className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="font-telemetry-xl text-lg font-bold text-on-surface">{formatKw(series.evKw[stepIdx])}</div>
          <div className="font-telemetry-sm text-[10px] text-on-surface-variant">{building.evSessionsCount} Fleet Ports</div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-sans mb-1">
            <span className="font-label-caps uppercase text-[10px] font-bold">Battery Storage</span>
            <Zap className="w-3.5 h-3.5 text-secondary-fixed-dim" />
          </div>
          <div className="font-telemetry-xl text-lg font-bold text-on-surface">
            {building.batteryKwh > 0 ? `${series.battSocKwh[stepIdx].toFixed(0)} kWh` : 'None'}
          </div>
          <div className="font-telemetry-sm text-[10px] text-on-surface-variant">
            {building.batteryKw > 0
              ? `${series.battChargeKw[stepIdx] > 0 ? `+${series.battChargeKw[stepIdx].toFixed(0)} kW chg` : `${series.battDischargeKw[stepIdx].toFixed(0)} kW dis`}`
              : 'No Storage'}
          </div>
        </div>

        <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container-high/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-sans mb-1">
            <span className="font-label-caps uppercase text-[10px] font-bold">Rooftop Solar</span>
            <Sun className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="font-telemetry-xl text-lg font-bold text-secondary">
            {formatKw(series.solarKw[stepIdx])}
          </div>
          <div className="font-telemetry-sm text-[10px] text-on-surface-variant">Rated {building.solarKwp} kWp</div>
        </div>
      </div>

      {/* Row: 12-Floor Schematic & Indoor Temperature vs Target */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-5">
          <FloorSchematic building={building} series={series} stepIdx={stepIdx} />
        </div>
        <div className="lg:col-span-7">
          <ChartFrame
            title="Indoor Temperature & HVAC Target vs Comfort Envelope"
            subtitle={`Envelope: ${building.comfortMin}–${building.comfortMax} °C · Dynamic Pre-cooling & Coasting`}
            badge="THERMAL STATE"
            data={tempData}
          >
            <div className="w-full h-72 pt-space-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <ReferenceArea
                    y1={building.comfortMin}
                    y2={building.comfortMax}
                    fill="rgba(61, 205, 88, 0.12)"
                    label={{
                      value: `Comfort Envelope (${building.comfortMin}–${building.comfortMax} °C)`,
                      position: 'insideBottomRight',
                      fill: '#009530',
                      fontSize: 10,
                    }}
                  />
                  <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                  <YAxis stroke="#626469" fontSize={11} unit=" °C" domain={[19, 32]} tickLine={false} fontFamily="JetBrains Mono" />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="tOut" name="Outdoor Ambient (Tout)" stroke="#FFD100" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="stepAfter" dataKey="tTarget" name="HVAC Target Setpoint" stroke="#009530" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tIn" name="Indoor Air Temp (Tin)" stroke="#000000" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      </div>

      {/* Equipment Performance Panel (Patch 1 FDD) */}
      <div className="p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60">
        <EquipmentPerformancePanel buildingId={building.id} run={activeRun} cursor={cursor} />
      </div>

      {/* Stacked Load by Component */}
      <ChartFrame
        title="Sub-metered Electrical Load Disaggregation (kW)"
        subtitle="HVAC, Lighting, Plug, Base, and EV Fleet charging vs Baseline total envelope"
        badge="LOAD DISAGGREGATION"
        data={stackData}
      >
        <div className="w-full h-72 pt-space-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stackData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
              <YAxis stroke="#626469" fontSize={11} unit=" kW" domain={[0, 'auto']} tickLine={false} fontFamily="JetBrains Mono" />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="baselineLoadKw" name="Baseline Load" stroke="#626469" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Area type="monotone" dataKey="baseKw" name="Base Load" stackId="1" fill="#626469" stroke="#626469" />
              <Area type="monotone" dataKey="plugKw" name="Plug Loads" stackId="1" fill="#F2F2F2" stroke="#9FA0A4" />
              <Area type="monotone" dataKey="lightingKw" name="Lighting" stackId="1" fill="#FFF8D6" stroke="#FFD100" />
              <Area type="monotone" dataKey="evKw" name="EV Charging" stackId="1" fill="#3DCD58" stroke="#009530" />
              <Area type="monotone" dataKey="hvacKw" name="HVAC Cooling" stackId="1" fill="#42B4E6" stroke="#42B4E6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {/* Grid Point: Physical vs Billed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <ChartFrame
          title="Grid Connection: Physical Flow vs Billed Demand"
          subtitle="Difference illustrates peer-to-peer microgrid trades settled autonomously"
          badge="GRID POINT"
          data={gridPointData}
        >
          <div className="w-full h-64 pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gridPointData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} unit=" kW" tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="physicalGridKw" name="Physical Grid Import" stroke="#B10043" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="billedGridKw" name="DISCOM Billed Demand" stroke="#000000" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        {/* Cumulative Cost Accrual */}
        <ChartFrame
          title="Cumulative Electricity Spend Accrual (₹)"
          subtitle="Demonstrating daily cost savings divergence between baseline schedule and THERMOS"
          badge="FINANCIAL ACCRUAL"
          data={costData}
        >
          <div className="w-full h-64 pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} unit=" ₹" tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="baselineCostInr" name="Baseline Cost" stroke="#626469" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="optimizedCostInr" name="THERMOS Cost" stroke="#009530" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}
