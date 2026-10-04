'use client';

import React from 'react';
import { useSimulation } from '@/store/useSimulation';
import { layerAttribution } from '@/simulation/selectors';
import { formatInr } from '@/lib/format';

export function LayerAttributionChart() {
  const runs = useSimulation();
  const layers = layerAttribution(runs);

  const baselineCost = layers.baselineCost;
  const buildingCost = layers.buildingCost;
  const networkCost = layers.networkCost;

  const totalSavingInr = Math.max(0, baselineCost - networkCost);
  const totalSavingPct = baselineCost > 0 ? (totalSavingInr / baselineCost) * 100 : 0;

  const netSpendPct = baselineCost > 0 ? (networkCost / baselineCost) * 100 : 100;
  const l1SavingPct = baselineCost > 0 ? (layers.l1SavingInr / baselineCost) * 100 : 0;
  const l2SavingPct = baselineCost > 0 ? (layers.l2UpliftInr / baselineCost) * 100 : 0;

  return (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm justify-between">
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
          Savings Attribution by Layer
        </span>
        <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
          NET -{totalSavingPct.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Unoptimized Baseline Spend:
        </span>
        <span className="font-telemetry-sm text-telemetry-sm font-bold text-on-surface">
          {formatInr(baselineCost)}
        </span>
      </div>

      {/* Layer Stack Bar */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container-high">
        {/* Final Net Spend */}
        <div
          className="bg-primary-container h-full transition-all duration-300"
          style={{ width: `${netSpendPct}%` }}
          title={`Net Spend: ${formatInr(networkCost)}`}
        />
        {/* L1 Building Opt */}
        <div
          className="bg-secondary h-full transition-all duration-300"
          style={{ width: `${l1SavingPct}%` }}
          title={`L1 Building: -${formatInr(layers.l1SavingInr)}`}
        />
        {/* L2 P2P Uplift */}
        {l2SavingPct > 0 && (
          <div
            className="bg-secondary-fixed-dim h-full transition-all duration-300"
            style={{ width: `${l2SavingPct}%` }}
            title={`L2 P2P: -${formatInr(layers.l2UpliftInr)}`}
          />
        )}
      </div>

      {/* Bullet Legend Items */}
      <div className="space-y-space-2xs pt-space-xs font-telemetry-sm text-telemetry-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
            <span className="text-on-surface-variant">L1 Building Thermal Opt:</span>
          </div>
          <span className="font-bold text-secondary">
            -{formatInr(layers.l1SavingInr)} ({l1SavingPct.toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim inline-block" />
            <span className="text-on-surface-variant">L2 P2P Microgrid Uplift:</span>
          </div>
          <span className="font-bold text-secondary">
            {layers.l2UpliftInr > 0
              ? `-${formatInr(layers.l2UpliftInr)} (${l2SavingPct.toFixed(1)}%)`
              : '₹0 (0.0%)'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-surface-variant inline-block" />
            <span className="text-on-surface-variant">L3 Demand Response Event:</span>
          </div>
          <span className="text-on-surface-variant font-medium">
            {runs.network_dr ? 'Active DR Dispatch' : '₹0 (Idle)'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/40">
          <span className="font-body-sm text-body-sm font-bold text-on-surface">
            Final Net Spend:
          </span>
          <span className="font-telemetry-md text-telemetry-md font-bold text-on-surface">
            {formatInr(networkCost)}
          </span>
        </div>
      </div>
    </div>
  );
}
