'use client';

import React, { useState, useRef } from 'react';
import { AutopilotWeights } from '@/simulation/types';
import { computeAutopilotTargets } from '@/simulation/optimizer';

interface AutopilotTriangleProps {
  weights: AutopilotWeights;
  onChange: (weights: AutopilotWeights) => void;
}

// Equilateral triangle geometry
const V_COMFORT = { x: 150, y: 30 }; // Top
const V_COST = { x: 30, y: 230 };    // Bottom Left
const V_CARBON = { x: 270, y: 230 }; // Bottom Right

export function AutopilotTriangle({ weights, onChange }: AutopilotTriangleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute (x, y) from barycentric weights
  const posX =
    weights.wComfort * V_COMFORT.x +
    weights.wCost * V_COST.x +
    weights.wCarbon * V_CARBON.x;
  const posY =
    weights.wComfort * V_COMFORT.y +
    weights.wCost * V_COST.y +
    weights.wCarbon * V_CARBON.y;

  // Readouts for Nova (22–26 °C) as standard archetype reference
  const { peakHoldTarget, precoolTarget } = computeAutopilotTargets(22, 26, weights);

  function pointToWeights(x: number, y: number): AutopilotWeights {
    // Area method for barycentric weights
    const detT =
      (V_COST.y - V_CARBON.y) * (V_COMFORT.x - V_CARBON.x) +
      (V_CARBON.x - V_COST.x) * (V_COMFORT.y - V_CARBON.y);

    let w1 =
      ((V_COST.y - V_CARBON.y) * (x - V_CARBON.x) + (V_CARBON.x - V_COST.x) * (y - V_CARBON.y)) /
      detT;
    let w2 =
      ((V_CARBON.y - V_COMFORT.y) * (x - V_CARBON.x) + (V_COMFORT.x - V_CARBON.x) * (y - V_CARBON.y)) /
      detT;
    let w3 = 1 - w1 - w2;

    // Clamp into triangle bounds [0, 1]
    w1 = Math.max(0, Math.min(1, w1));
    w2 = Math.max(0, Math.min(1, w2));
    w3 = Math.max(0, Math.min(1, w3));
    const sum = w1 + w2 + w3 || 1;

    return {
      wComfort: w1 / sum,
      wCost: w2 / sum,
      wCarbon: w3 / sum,
    };
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 260 / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const newWeights = pointToWeights(svgX, svgY);
    onChange(newWeights);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-4 shadow-sm flex flex-col items-center">
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-surface-container-high/60 text-xs">
        <h3 className="font-headline-sm font-bold text-on-surface text-xs">
          Autopilot Barycentric Trade-Off
        </h3>
        <span className="font-label-caps text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
          Tri-Objective Weight
        </span>
      </div>

      <div className="relative w-full max-w-[280px] aspect-[300/260]">
        <svg
          ref={svgRef}
          viewBox="0 0 300 260"
          className="w-full h-full cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Shaded Triangle Background */}
          <polygon
            points={`${V_COMFORT.x},${V_COMFORT.y} ${V_COST.x},${V_COST.y} ${V_CARBON.x},${V_CARBON.y}`}
            fill="#F2F2F2"
            stroke="#009530"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />

          {/* Guidelines from vertices to center */}
          <line
            x1={V_COMFORT.x}
            y1={V_COMFORT.y}
            x2={150}
            y2={163}
            stroke="#9FA0A4"
            strokeDasharray="2 2"
          />
          <line
            x1={V_COST.x}
            y1={V_COST.y}
            x2={150}
            y2={163}
            stroke="#9FA0A4"
            strokeDasharray="2 2"
          />
          <line
            x1={V_CARBON.x}
            y1={V_CARBON.y}
            x2={150}
            y2={163}
            stroke="#9FA0A4"
            strokeDasharray="2 2"
          />

          {/* Vertex Labels */}
          <text
            x={V_COMFORT.x}
            y={V_COMFORT.y - 12}
            textAnchor="middle"
            className="fill-[#E47F00] font-sans text-[11px] font-bold"
          >
            Comfort ({(weights.wComfort * 100).toFixed(0)}%)
          </text>
          <text
            x={V_COST.x}
            y={V_COST.y + 16}
            textAnchor="middle"
            className="fill-black font-sans text-[11px] font-bold"
          >
            Cost ({(weights.wCost * 100).toFixed(0)}%)
          </text>
          <text
            x={V_CARBON.x}
            y={V_CARBON.y + 16}
            textAnchor="middle"
            className="fill-[#009530] font-sans text-[11px] font-bold"
          >
            Carbon ({(weights.wCarbon * 100).toFixed(0)}%)
          </text>

          {/* Draggable Dot Handle */}
          <circle
            cx={posX}
            cy={posY}
            r="12"
            fill="#009530"
            fillOpacity="0.25"
            className={isDragging ? 'scale-125' : ''}
          />
          <circle
            cx={posX}
            cy={posY}
            r="6"
            fill="#009530"
            stroke="#ffffff"
            strokeWidth="2"
            className="shadow-sm"
          />
        </svg>
      </div>

      {/* Target Read-outs */}
      <div className="w-full mt-3 pt-3 border-t border-surface-container-high/60 grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded bg-surface-container-low/60 border border-surface-container-high/60">
          <div className="text-[10px] text-on-surface-variant font-sans font-medium">Pre-cool Target</div>
          <div className="text-secondary font-bold text-sm mt-0.5">{precoolTarget.toFixed(2)} °C</div>
        </div>
        <div className="p-2.5 rounded bg-surface-container-low/60 border border-surface-container-high/60">
          <div className="text-[10px] text-on-surface-variant font-sans font-medium">Peak Hold Target</div>
          <div className="text-amber-700 font-bold text-sm mt-0.5">{peakHoldTarget.toFixed(2)} °C</div>
        </div>
      </div>
    </div>
  );
}
