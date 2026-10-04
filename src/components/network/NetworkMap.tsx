'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { DEFAULT_BUILDINGS, getBuildingDesignPeakKw } from '@/simulation/buildings';
import { networkStatus, tradesAtStep } from '@/simulation/selectors';
import { formatInrPerKwh, formatKw } from '@/lib/format';
import { Trade } from '@/simulation/types';
import { X, ArrowRight, Zap, Battery, Sun } from 'lucide-react';

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  nova: { x: 170, y: 150 },
  orbit: { x: 480, y: 110 },
  campus: { x: 800, y: 160 },
  citycare: { x: 230, y: 430 },
  horizon: { x: 520, y: 470 },
  meridian: { x: 810, y: 420 },
  substation: { x: 500, y: 300 },
};

interface NetworkMapProps {
  compact?: boolean;
  onSelectBuilding?: (id: string) => void;
}

export function NetworkMap({ compact = false, onSelectBuilding }: NetworkMapProps) {
  const cursor = usePlaybackStore((s) => s.cursor);
  const runs = useSimulation();
  const activeRun = runs.network_dr ?? runs.network;

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const stepIdx = Math.max(0, Math.min(95, Math.floor(cursor)));
  const status = networkStatus(activeRun, stepIdx);
  const currentTrades = tradesAtStep(activeRun, stepIdx);

  // Calculate max trade kW for stroke scaling
  let maxTradeKw = 1.0;
  for (const t of activeRun.trades) {
    if (t.kw > maxTradeKw) maxTradeKw = t.kw;
  }

  // Animated particle phase state
  const [particlePhases, setParticlePhases] = useState<Record<number, number>>({});
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;
    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const dt = (time - lastTimeRef.current) / 1000;
        setParticlePhases((prev) => {
          const next = { ...prev };
          currentTrades.forEach((t, i) => {
            const speed = 0.2 + (t.kw / maxTradeKw) * 0.8;
            next[i] = ((next[i] ?? 0) + dt * speed) % 1.0;
          });
          return next;
        });
      }
      lastTimeRef.current = time;
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [currentTrades, maxTradeKw]);

  // Quadratic curve generator
  function getCurvePath(start: { x: number; y: number }, end: { x: number; y: number }) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const curvature = 45;
    const ctrlX = midX + perpX * curvature;
    const ctrlY = midY + perpY * curvature;
    return {
      d: `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`,
      ctrlX,
      ctrlY,
      midX: 0.25 * start.x + 0.5 * ctrlX + 0.25 * end.x,
      midY: 0.25 * start.y + 0.5 * ctrlY + 0.25 * end.y,
    };
  }

  // Point on quadratic curve at t in [0, 1]
  function getBezierPoint(
    start: { x: number; y: number },
    ctrl: { x: number; y: number },
    end: { x: number; y: number },
    t: number
  ) {
    const mt = 1 - t;
    const x = mt * mt * start.x + 2 * mt * t * ctrl.x + t * t * end.x;
    const y = mt * mt * start.y + 2 * mt * t * ctrl.y + t * t * end.y;
    return { x, y };
  }

  const selectedBuildingDef = DEFAULT_BUILDINGS.find((b) => b.id === selectedBuildingId);
  const selectedSeries = selectedBuildingId ? activeRun.buildings[selectedBuildingId] : null;

  return (
    <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden border border-surface-container-high bg-surface-container-lowest shadow-sm">
      {/* Map Header / Live Ticker */}
      <div className="flex flex-wrap items-center justify-between px-space-md py-space-sm bg-surface-container-low border-b border-surface-container-high/60 text-xs">
        <div className="flex items-center gap-space-sm">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Topology Visualizer (11kV Micro-Bus)
          </span>
          <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant hidden sm:inline">
            Step {stepIdx}/95 · Active Telemetry
          </span>
        </div>

        <div className="flex items-center gap-space-md text-label-caps font-label-caps text-on-surface-variant">
          <span className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container" /> Exporter
          </span>
          <span className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-error" /> Importer
          </span>
          <span className="flex items-center gap-space-xs">
            <span className="w-2.5 h-1 bg-secondary inline-block rounded" /> Bilateral Trade
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[460px] bg-surface-container-low/40 select-none">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="stitchGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#009530" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid Substation Feeder Lines */}
          <g opacity="0.65" stroke="#c2c8c3" strokeDasharray="4 4" strokeWidth="1.2">
            {DEFAULT_BUILDINGS.map((b) => {
              const pos = NODE_POSITIONS[b.id];
              const sub = NODE_POSITIONS.substation;
              return (
                <line
                  key={`grid-line-${b.id}`}
                  x1={sub.x}
                  y1={sub.y}
                  x2={pos.x}
                  y2={pos.y}
                />
              );
            })}
          </g>

          {/* Active Trade Arcs & Badges */}
          {currentTrades.map((t, idx) => {
            const sellerPos = NODE_POSITIONS[t.sellerId];
            const buyerPos = NODE_POSITIONS[t.buyerId];
            if (!sellerPos || !buyerPos) return null;

            const curve = getCurvePath(sellerPos, buyerPos);
            const strokeWidth = 2.5 + (5 * t.kw) / maxTradeKw;
            const phase = particlePhases[idx] ?? 0;
            const pPoint = getBezierPoint(sellerPos, { x: curve.ctrlX, y: curve.ctrlY }, buyerPos, phase);

            return (
              <g
                key={`trade-arc-${t.sellerId}-${t.buyerId}-${idx}`}
                className="cursor-pointer group"
                onClick={() => setSelectedTrade(t)}
              >
                {/* Visual Arc Base */}
                <path
                  d={curve.d}
                  fill="none"
                  stroke="#009530"
                  strokeWidth={strokeWidth}
                  strokeOpacity="0.8"
                  strokeLinecap="round"
                />

                {/* Animated dash flow */}
                <path
                  d={curve.d}
                  fill="none"
                  stroke="#3DCD58"
                  strokeWidth={Math.max(1.5, strokeWidth * 0.4)}
                  strokeDasharray="6 8"
                  strokeLinecap="round"
                />

                {/* Traveling Energy Particle */}
                <circle
                  cx={pPoint.x}
                  cy={pPoint.y}
                  r="4.5"
                  fill="#3DCD58"
                  stroke="#000000"
                  strokeWidth="1.5"
                  filter="url(#stitchGlow)"
                />

                {/* Badge Overlay */}
                <rect
                  x={curve.midX - 44}
                  y={curve.midY - 12}
                  width="88"
                  height="24"
                  rx="4"
                  fill="#262626"
                  className="shadow-md"
                />
                <text
                  x={curve.midX}
                  y={curve.midY + 4}
                  textAnchor="middle"
                  fill="#3DCD58"
                  fontFamily="JetBrains Mono"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(t.kw)} kW · ₹{t.priceInrKwh.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Central Substation Node */}
          <g id="node-substation" transform={`translate(${NODE_POSITIONS.substation.x}, ${NODE_POSITIONS.substation.y})`}>
            <circle r="36" fill="#F2F2F2" stroke="#626469" strokeWidth="1.5" />
            <circle r="26" fill="#000000" />
            <text y="-4" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter" fontSize="10" fontWeight="700">
              SUBSTATION
            </text>
            <text y="9" textAnchor="middle" fill="#3DCD58" fontFamily="JetBrains Mono" fontSize="9">
              66/11 kV
            </text>
            <text y="52" textAnchor="middle" fill="#626469" fontFamily="JetBrains Mono" fontSize="10" fontWeight="600">
              Grid Sync: 50.02 Hz
            </text>
          </g>

          {/* 6 Building Nodes */}
          {DEFAULT_BUILDINGS.map((b) => {
            const pos = NODE_POSITIONS[b.id];
            const series = activeRun.buildings[b.id];
            const netKw = series ? series.gridPointLocalKw[stepIdx] : 0;
            const isExporter = netKw < -1;
            const isImporter = netKw > 1;

            const badgeBg = isExporter ? '#3DCD58' : isImporter ? '#B10043' : '#F2F2F2';
            const badgeText = isExporter ? '#000000' : isImporter ? '#FFFFFF' : '#262626';
            const badgeLabel = isExporter
              ? `+${Math.abs(Math.round(netKw))} kW · Surp`
              : isImporter
              ? `-${Math.round(netKw)} kW · Def`
              : 'Balanced';

            const isSelected = selectedBuildingId === b.id;

            return (
              <g
                key={b.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedBuildingId(b.id);
                  if (onSelectBuilding) onSelectBuilding(b.id);
                }}
              >
                {/* Node Outer Ring */}
                <circle
                  r={isSelected ? 38 : 34}
                  fill="#ffffff"
                  stroke={isSelected ? '#000000' : isExporter ? '#009530' : '#626469'}
                  strokeWidth={isSelected ? 3.5 : 2}
                  className="transition-all duration-200"
                />
                <circle r="26" fill="#F2F2F2" />
                <text y="-2" textAnchor="middle" fill="#262626" fontFamily="Inter" fontSize="11" fontWeight="700">
                  {b.name.split(' ')[0]}
                </text>
                <text y="11" textAnchor="middle" fill="#626469" fontFamily="Inter" fontSize="9" className="capitalize">
                  {b.type}
                </text>

                {/* Status Badge */}
                <rect x="-44" y="38" width="88" height="18" rx="3" fill={badgeBg} />
                <text
                  y="50"
                  textAnchor="middle"
                  fill={badgeText}
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fontWeight="700"
                >
                  {badgeLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Building Flyout Sheet */}
        {selectedBuildingDef && selectedSeries && (
          <div className="absolute top-4 right-4 z-20 w-80 rounded-xl bg-surface-container-lowest/98 backdrop-blur-md p-space-base border border-surface-container-high shadow-xl">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <div>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {selectedBuildingDef.name}
                </h4>
                <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">
                  {selectedBuildingDef.type} · {selectedBuildingDef.areaM2.toLocaleString()} m²
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBuildingId(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-space-sm space-y-space-xs font-telemetry-sm text-telemetry-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Step Demand:</span>
                <span className="font-bold text-on-surface">
                  {formatKw(selectedSeries.loadKw[stepIdx])}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Solar Generation:</span>
                <span className="font-bold text-secondary">
                  {formatKw(selectedSeries.solarKw[stepIdx])}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Indoor Temperature:</span>
                <span className="font-bold text-on-surface">
                  {selectedSeries.tIn[stepIdx].toFixed(1)}°C
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Battery SoC:</span>
                <span className="font-bold text-on-surface">
                  {selectedBuildingDef.batteryKwh > 0
                    ? `${((selectedSeries.battSocKwh[stepIdx] / selectedBuildingDef.batteryKwh) * 100).toFixed(0)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-space-md pt-space-xs border-t border-surface-container-high flex justify-between items-center">
              <Link
                href={`/buildings/${selectedBuildingDef.id}`}
                className="font-label-caps text-label-caps uppercase font-bold text-secondary hover:underline flex items-center gap-1"
              >
                Open Building Terminal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary Strip */}
      <div className="px-space-md py-space-xs bg-surface-container-low border-t border-surface-container-high/60 flex items-center justify-between font-telemetry-sm text-telemetry-sm text-on-surface-variant">
        <span>Internal Cluster Clearing: <strong className="text-secondary font-bold">₹7.20 / kWh (vs Grid ₹8.50)</strong></span>
        <span>Active Bilateral Trades: <strong className="text-on-surface font-bold">{currentTrades.length}</strong></span>
      </div>
    </div>
  );
}
