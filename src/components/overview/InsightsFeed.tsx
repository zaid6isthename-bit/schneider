'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { decisionsFromRun, formatStepTime } from '@/simulation/selectors';
import { formatInr, formatKwh } from '@/lib/format';

export function InsightsFeed() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const allDecisions = decisionsFromRun(runs);

  const stepIdx = Math.max(0, Math.min(95, Math.floor(cursor)));
  const activeDecisions = allDecisions
    .filter((d) => d.step <= stepIdx)
    .sort((a, b) => b.step - a.step || b.id.localeCompare(a.id));

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
            Autopilot Decision Trace
          </span>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Action Ledger
          </h3>
        </div>
        <div className="flex items-center gap-space-xs">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
            {activeDecisions.length} LOGGED
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-space-sm pr-1 max-h-[380px] my-space-sm">
        {activeDecisions.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-[28px] text-outline-variant block mb-1">
              schedule
            </span>
            No automated decisions triggered before {formatStepTime(stepIdx)}. Advance cursor to observe
            dispatch events.
          </div>
        ) : (
          activeDecisions.map((d) => (
            <div
              key={d.id}
              className="p-space-sm rounded-lg border border-surface-container-high bg-surface-container-low/60 hover:bg-surface-container transition-colors text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    check_circle
                  </span>
                  {d.title}
                </span>
                <span className="font-telemetry-sm text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-lowest border border-surface-container-high">
                  {formatStepTime(d.step)} · {d.buildingId}
                </span>
              </div>

              <ul className="space-y-0.5 my-1 text-[11px] text-on-surface-variant pl-4 list-disc marker:text-secondary">
                {d.why.map((reason, idx) => (
                  <li key={idx} className="leading-snug">
                    {reason}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-1 mt-1 border-t border-surface-container-high/60 font-telemetry-sm text-[11px]">
                <span className="text-on-surface-variant">Verified Impact:</span>
                <span className="font-bold text-secondary">
                  +{formatInr(d.resultInr)} · {formatKwh(d.resultKwh)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto pt-space-xs border-t border-surface-container-high/40 text-right">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
          Deterministic Rule Execution · Zero Blackbox Bias
        </span>
      </div>
    </div>
  );
}
