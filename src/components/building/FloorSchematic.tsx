'use client';

import React from 'react';
import { BuildingDef, BuildingSeries } from '@/simulation/types';

interface FloorSchematicProps {
  building: BuildingDef;
  series: BuildingSeries;
  stepIdx: number;
}

// 12-Floor Normalized Weights from docs/DECISIONS.md
const FLOOR_WEIGHTS = [
  { floor: 12, name: 'L12 Penthouse / Plant Deck', weight: 0.06 },
  { floor: 11, name: 'L11 Core Office', weight: 0.09 },
  { floor: 10, name: 'L10 Core Office', weight: 0.09 },
  { floor: 9, name: 'L9 Core Office', weight: 0.09 },
  { floor: 8, name: 'L8 Facilities & Buffer', weight: 0.07 },
  { floor: 7, name: 'L7 Core Office', weight: 0.09 },
  { floor: 6, name: 'L6 Core Office', weight: 0.09 },
  { floor: 5, name: 'L5 Collaborative Hub', weight: 0.10 },
  { floor: 4, name: 'L4 Core Office', weight: 0.09 },
  { floor: 3, name: 'L3 Amenity & Cafeteria', weight: 0.10 },
  { floor: 2, name: 'L2 Retail & Podium', weight: 0.08 },
  { floor: 1, name: 'L1 Lobby & Transit', weight: 0.05 },
];

export function FloorSchematic({ building, series, stepIdx }: FloorSchematicProps) {
  const currentU = series.hvacU[stepIdx] ?? 0;
  const currentOcc = series.occ[stepIdx] ?? 0;
  const currentTin = series.tIn[stepIdx] ?? 24;

  return (
    <div className="rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-container-high/60">
        <div>
          <h3 className="font-headline-sm text-sm font-bold text-on-surface">
            12-Floor Schematic Building Thermal Elevation
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Illustrative vertical distribution · Shared building-level physics
          </p>
        </div>
        <div className="text-right text-xs font-mono">
          <div className="text-primary font-bold">HVAC u: {(currentU * 100).toFixed(0)}%</div>
          <div className="text-on-surface-variant">Occ: {(currentOcc * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* SVG Stacked 12-Floor Isometric/Elevation Schematic */}
      <div className="w-full h-72 flex items-center justify-center bg-surface-container-low/40 rounded-lg p-3 border border-surface-container-high/40">
        <svg viewBox="0 0 400 240" className="w-full h-full select-none">
          {/* Rooftop Solar PV & Chiller Deck */}
          <g transform="translate(100, 10)">
            <rect
              x="0"
              y="0"
              width="200"
              height="14"
              rx="2"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {building.solarKwp > 0 && (
              <text x="100" y="10" textAnchor="middle" className="fill-amber-800 font-mono text-[9px] font-bold">
                ☀ Rooftop PV: {building.solarKwp} kWp
              </text>
            )}
          </g>

          {/* 12 Stacked Floors */}
          {FLOOR_WEIGHTS.map((f, i) => {
            const y = 30 + i * 16;
            // Floor tint varies slightly by weight and building-level HVAC u
            const floorOcc = Math.min(1, currentOcc * (f.weight / 0.0833));
            const floorTintAlpha = 0.12 + currentU * 0.45;

            return (
              <g key={f.floor} transform={`translate(100, ${y})`} className="hover:opacity-90">
                {/* Floor Slab */}
                <rect
                  x="0"
                  y="0"
                  width="200"
                  height="14"
                  rx="1"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {/* Active HVAC Cooling Tint */}
                <rect
                  x="2"
                  y="2"
                  width="196"
                  height="10"
                  rx="1"
                  fill="#009530"
                  fillOpacity={floorTintAlpha}
                />
                {/* Floor Label */}
                <text x="8" y="10" className="fill-slate-700 font-mono text-[8px] font-bold">
                  L{f.floor}
                </text>
                {/* Occupancy Indicator */}
                <text x="192" y="10" textAnchor="end" className="fill-slate-600 font-mono text-[8px]">
                  {(floorOcc * 100).toFixed(0)}% occ
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 pt-2.5 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
        <span>Indoor Core: <strong className="text-on-surface">{currentTin.toFixed(1)} °C</strong></span>
        <span>Target Band: <strong className="text-on-surface">{building.comfortMin}–{building.comfortMax} °C</strong></span>
      </div>
    </div>
  );
}
