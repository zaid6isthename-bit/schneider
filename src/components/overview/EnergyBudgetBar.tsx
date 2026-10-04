'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { budgetProgress } from '@/simulation/selectors';
import { formatKwh } from '@/lib/format';

export function EnergyBudgetBar() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const info = budgetProgress(runs, cursor);
  const currentStep = Math.max(0, Math.min(95, Math.floor(cursor)));

  const baselineTotalKwh = runs.baseline.clusterTotals.totalKwh;
  const optimizedTotalKwh = (runs.network_dr ?? runs.network).clusterTotals.totalKwh;
  const shavedKwh = Math.max(0, baselineTotalKwh - optimizedTotalKwh);

  const progressPct = Math.min(100, Math.max(0, info.progressPct));
  const expectedPacePct = Math.min(100, (currentStep / 95) * 100);
  const headroomPct = expectedPacePct - progressPct;

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-base">
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
          Daily Energy Budget Pacing
        </span>
        <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
          STEP {currentStep} / 95
        </span>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-space-2xs">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {Math.round(info.consumedKwh).toLocaleString()}{' '}
            <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">
              kWh consumed
            </span>
          </span>
          <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface-variant">
            {progressPct.toFixed(1)}% of Budget
          </span>
        </div>

        {/* Stacked Pace Bar */}
        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden flex">
          <div
            className="bg-secondary h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
          {headroomPct > 0 && (
            <div
              className="bg-secondary-container opacity-40 h-full"
              style={{ width: `${headroomPct}%` }}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-space-2xs font-telemetry-sm text-telemetry-sm text-on-surface-variant">
          <span>Expected Pace: {expectedPacePct.toFixed(1)}%</span>
          <span className={headroomPct >= 0 ? 'text-secondary font-bold' : 'text-error font-bold'}>
            {headroomPct >= 0 ? `-${headroomPct.toFixed(1)}% Headroom` : `+${Math.abs(headroomPct).toFixed(1)}% Over`}
          </span>
        </div>
      </div>

      <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between font-body-sm text-body-sm border border-surface-container-high/40">
        <div className="flex flex-col">
          <span className="text-on-surface-variant font-medium text-xs">Projected End-of-Day:</span>
          <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface">
            {Math.round(optimizedTotalKwh).toLocaleString()} kWh
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-on-surface-variant font-medium text-xs">Baseline Envelope:</span>
          <span className="font-telemetry-md text-telemetry-md font-bold text-secondary">
            -{Math.round(shavedKwh).toLocaleString()} kWh Shaved
          </span>
        </div>
      </div>
    </div>
  );
}
