'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { savingsAtStep } from '@/simulation/selectors';

export function CostTicker() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);

  // Exact cumulative sum at floor(cursor)
  const floorStep = Math.max(0, Math.min(95, Math.floor(cursor)));
  const frac = cursor - floorStep;

  const currentStepSavings = savingsAtStep(runs, floorStep);
  const nextStepSavings =
    floorStep < 95 ? savingsAtStep(runs, floorStep + 1) : currentStepSavings;

  // Linear interpolation within the step for smooth display tween
  const displayedCumulativeInr =
    currentStepSavings.cumulativeInr +
    (nextStepSavings.cumulativeInr - currentStepSavings.cumulativeInr) * frac;

  const intPart = Math.floor(displayedCumulativeInr);
  const fracPart = Math.floor((displayedCumulativeInr - intPart) * 100)
    .toString()
    .padStart(2, '0');

  const rate = Math.max(0, currentStepSavings.inrPerMin);

  return (
    <div className="bg-primary-container text-on-primary p-space-lg rounded-xl shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps uppercase text-on-primary-container font-bold">
          Arbitrage & Dispatch Velocity
        </span>
        <span className="px-space-xs py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold">
          LIVE SYNC
        </span>
      </div>

      <div className="mt-space-md">
        <span className="font-body-sm text-body-sm text-on-primary-container">
          Cumulative Savings Accrued:
        </span>
        <div className="font-telemetry-xl text-telemetry-xl font-bold text-secondary-container tracking-tight">
          ₹{intPart.toLocaleString()}
          <span className="text-body-lg text-on-primary-container font-normal">.{fracPart}</span>
        </div>
      </div>

      <div className="mt-space-base p-space-sm rounded-lg bg-surface-container-highest/10 flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary-fixed-dim animate-spin">
            autorenew
          </span>
          <span className="font-body-sm text-body-sm text-primary-fixed-dim">Savings Rate:</span>
        </div>
        <span className="font-telemetry-md text-telemetry-md font-bold text-secondary-fixed">
          ₹{rate.toFixed(2)} / sim-min
        </span>
      </div>
    </div>
  );
}
