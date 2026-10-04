'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import {
  occupantSeries,
  occupantSummary,
  buildingLeague,
} from '@/simulation/selectors';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { Thermometer, Wind, Lightbulb, Trophy } from 'lucide-react';

export default function OccupantPage() {
  const [selectedBuildingId, setSelectedBuildingId] = useState('nova');
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const currentStep = Math.max(0, Math.min(95, Math.floor(cursor)));

  const activeRun = runs.network_dr ?? runs.network;
  const baselineRun = runs.baseline;

  const currentBuilding = DEFAULT_BUILDINGS.find((b) => b.id === selectedBuildingId) ?? DEFAULT_BUILDINGS[0];
  const summary = occupantSummary(activeRun, selectedBuildingId);
  const seriesOpt = occupantSeries(activeRun, selectedBuildingId);
  const seriesBase = occupantSeries(baselineRun, selectedBuildingId);

  // Merge series for comparative charts
  const combinedSeries = seriesOpt.map((opt, k) => {
    const base = seriesBase[k] || {};
    return {
      step: k,
      time: opt.time,
      tInOpt: Number(opt.tIn.toFixed(2)),
      tInBase: Number(base.tIn ? base.tIn.toFixed(2) : opt.tIn.toFixed(2)),
      comfortMin: opt.comfortMin,
      comfortMax: opt.comfortMax,
      co2PpmOpt: Math.round(opt.co2Ppm),
      co2PpmBase: Math.round(base.co2Ppm || opt.co2Ppm),
      cTarget: 800,
      cLimit: 1000,
      airflowOpt: Math.round(opt.airflowLps),
      airflowBase: Math.round(base.airflowLps || opt.airflowDesignLps),
      airflowDesign: Math.round(opt.airflowDesignLps),
      lightingFractionOpt: Math.round(opt.lightingFraction * 100),
      lightingFractionBase: Math.round((base.lightingFraction || 1.0) * 100),
      occ: Math.round(opt.occ * 100),
    };
  });

  const currStepData = combinedSeries[currentStep] || combinedSeries[0];
  const league = buildingLeague(runs);

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Header & Building Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container-high/60 pb-space-xs">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            Occupant Experience & Indoor Environmental Quality (IEQ)
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Real-Time Thermal Comfort, Well-Mixed CO₂ & Demand-Controlled Ventilation, Lighting Quality
          </p>
        </div>

        {/* Building Selector Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 md:pb-0 bg-surface-container-low p-space-2xs rounded-lg border border-surface-container-high">
          {DEFAULT_BUILDINGS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBuildingId(b.id)}
              className={`px-space-sm py-space-xs rounded font-label-caps uppercase text-xs font-bold transition-colors whitespace-nowrap ${
                selectedBuildingId === b.id
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Status Cards at Current Cursor Step */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Thermal Card */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="p-2 rounded-lg bg-tertiary-container/20 text-on-tertiary-container border border-tertiary-container/30">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Thermal Comfort</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Band: {currentBuilding.comfortMin}°C – {currentBuilding.comfortMax}°C
                </p>
              </div>
            </div>
            <span
              className={`font-label-caps text-label-caps px-space-xs py-space-2xs rounded font-bold uppercase ${
                summary.thermalStatus === 'Within band' || summary.thermalStatus === 'Optimal'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {summary.thermalStatus}
            </span>
          </div>

          <div className="mt-space-md flex items-baseline justify-between">
            <div>
              <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
                {currStepData.tInOpt}°C
              </span>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant ml-2">
                (Baseline: {currStepData.tInBase}°C)
              </span>
            </div>
            <div className="text-right">
              <span className="font-telemetry-md text-telemetry-md font-bold text-secondary">
                {summary.comfortPct.toFixed(1)}%
              </span>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Daytime Compliance
              </p>
            </div>
          </div>

          <div className="mt-space-sm pt-space-xs border-t border-surface-container-high/60 flex items-center justify-between font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            <span>Outside: 32.0°C</span>
            <span>Max Exceedance: {summary.maxExceedanceC.toFixed(2)}°C</span>
          </div>
        </div>

        {/* IAQ Card */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="p-2 rounded-lg bg-surface-container-high text-primary border border-surface-container-highest">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Indoor Air Quality (CO₂)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Target ≤ 800 ppm · Limit ≤ 1000 ppm
                </p>
              </div>
            </div>
            <span
              className={`font-label-caps text-label-caps px-space-xs py-space-2xs rounded font-bold uppercase ${
                currStepData.co2PpmOpt <= 800
                  ? 'bg-secondary-container text-on-secondary-container'
                  : currStepData.co2PpmOpt <= 1000
                  ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {summary.iaqStatus}
            </span>
          </div>

          <div className="mt-space-md flex items-baseline justify-between">
            <div>
              <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
                {currStepData.co2PpmOpt} ppm
              </span>
              <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant ml-2">
                (Baseline: {currStepData.co2PpmBase} ppm)
              </span>
            </div>
            <div className="text-right">
              <span className="font-telemetry-md text-telemetry-md font-bold text-secondary">
                {summary.iaqPct.toFixed(1)}%
              </span>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Occupied Air Quality
              </p>
            </div>
          </div>

          <div className="mt-space-sm pt-space-xs border-t border-surface-container-high/60 flex items-center justify-between font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            <span>Airflow: {currStepData.airflowOpt} L/s</span>
            <span>Design: {currStepData.airflowDesign} L/s</span>
          </div>
        </div>

        {/* Lighting Quality Card */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="p-2 rounded-lg bg-secondary-container/30 text-secondary border border-secondary/20">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Lighting Quality
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Daylight Dimming Guard: Min 75%
                </p>
              </div>
            </div>
            <span className="font-label-caps text-label-caps px-space-xs py-space-2xs rounded bg-secondary-container text-on-secondary-container font-bold uppercase">
              {summary.lightingStatus}
            </span>
          </div>

          <div className="mt-space-md flex items-baseline justify-between">
            <div>
              <span className="font-telemetry-xl text-telemetry-xl font-bold text-on-surface">
                {currStepData.lightingFractionOpt}%
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Delivered fraction of design
              </p>
            </div>
            <div className="text-right">
              <span className="font-telemetry-md text-telemetry-md font-bold text-secondary">
                ≥ 75% Floor
              </span>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Visual Comfort Enforced
              </p>
            </div>
          </div>

          <div className="mt-space-sm pt-space-xs border-t border-surface-container-high/60 flex items-center justify-between font-telemetry-sm text-telemetry-sm text-on-surface-variant">
            <span>Occupancy: {currStepData.occ}%</span>
            <span>Dimming Limit: 25% max</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Comparative Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Indoor Temperature Chart */}
        <ChartFrame
          title={`${currentBuilding.name}: 24h Indoor Temperature vs Comfort Band`}
          subtitle="Baseline timer schedule vs THERMOS autonomous setpoint optimization (°C)"
          badge="THERMAL ENVELOPE"
          data={combinedSeries}
        >
          <div className="w-full h-64 pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <ReferenceLine y={currentBuilding.comfortMax} stroke="#B10043" strokeDasharray="3 3" />
                <ReferenceLine y={currentBuilding.comfortMin} stroke="#009530" strokeDasharray="3 3" />
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} domain={[20, 31]} unit="°C" tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Line type="monotone" dataKey="tInBase" name="Baseline Temp" stroke="#626469" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="tInOpt" name="THERMOS Temp" stroke="#009530" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        {/* CO2 Concentration Chart */}
        <ChartFrame
          title={`${currentBuilding.name}: 24h Indoor CO₂ Concentration vs Target`}
          subtitle="Well-mixed single zone mass-balance: Baseline constant ventilation vs DCV flow (ppm)"
          badge="IAQ METRICS"
          data={combinedSeries}
        >
          <div className="w-full h-64 pt-space-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <ReferenceLine y={800} stroke="#009530" strokeDasharray="3 3" label={{ value: '800 ppm Target', position: 'insideTopLeft', fontSize: 10 }} />
                <ReferenceLine y={1000} stroke="#B10043" strokeDasharray="3 3" label={{ value: '1000 ppm Limit', position: 'insideTopLeft', fontSize: 10 }} />
                <XAxis dataKey="time" interval={11} stroke="#626469" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#626469" fontSize={11} domain={[400, 1100]} unit=" ppm" tickLine={false} fontFamily="JetBrains Mono" />
                <Tooltip />
                <Line type="monotone" dataKey="co2PpmBase" name="Baseline CO₂" stroke="#626469" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="co2PpmOpt" name="THERMOS DCV CO₂" stroke="#000000" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      {/* Building League Table */}
      <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
          <div className="flex items-center gap-space-xs">
            <Trophy className="w-5 h-5 text-secondary" />
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Simulated Cluster Building League
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Peer ranking across 6 archetypes by Annual Energy Use Intensity (EUI kWh/m²/yr)
              </p>
            </div>
          </div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            Simulated Sector 47 Cluster
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-telemetry-sm text-telemetry-sm border-collapse">
            <thead className="bg-surface-container-low font-label-caps uppercase text-on-surface-variant">
              <tr>
                <th className="p-3 border-b border-surface-container-high">Rank</th>
                <th className="p-3 border-b border-surface-container-high">Building</th>
                <th className="p-3 border-b border-surface-container-high">Type</th>
                <th className="p-3 border-b border-surface-container-high text-right">Baseline EUI</th>
                <th className="p-3 border-b border-surface-container-high text-right">Optimized EUI</th>
                <th className="p-3 border-b border-surface-container-high text-right">EUI Shaved</th>
                <th className="p-3 border-b border-surface-container-high text-right">Thermal</th>
                <th className="p-3 border-b border-surface-container-high text-right">IAQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
              {league.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-container-low/40 ${
                    selectedBuildingId === row.id ? 'bg-surface-container-low' : ''
                  }`}
                >
                  <td className="p-3 font-bold text-secondary">#{row.optRank}</td>
                  <td className="p-3 font-bold text-on-surface">{row.name}</td>
                  <td className="p-3 capitalize text-on-surface-variant">{row.type}</td>
                  <td className="p-3 text-right font-mono">{row.baseEui.toFixed(1)}</td>
                  <td className="p-3 text-right font-mono font-bold text-primary">
                    {row.optEui.toFixed(1)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-secondary">
                    -{row.reductionPct.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right font-mono">{row.comfortPct.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono">{row.iaqPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
