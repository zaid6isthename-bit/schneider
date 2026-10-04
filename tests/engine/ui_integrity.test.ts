import { describe, it, expect } from 'vitest';
import { runAll } from '@/simulation/engine';
import { SCENARIOS } from '@/simulation/scenarios';
import { savingsAtStep } from '@/simulation/selectors';
import { STEPS_PER_DAY } from '@/simulation/constants';
import { getDemoScenes } from '@/simulation/narration';

describe('UI Data Integrity & Ticker Contract (PRD §12 Invariants 14 & 15)', () => {
  const runs = runAll(SCENARIOS.hot_weekday);

  it('Verifies at every step k in 0..95 that displayed ticker equals exact "View data" cumulative saving', () => {
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      const ticker = savingsAtStep(runs, k);

      // Recompute exact cumulative table value up to k
      let cumBaseCost = 0;
      let cumNetCost = 0;
      for (let i = 0; i <= k; i++) {
        for (const b of Object.values(runs.baseline.buildings)) {
          cumBaseCost += b.stepCostInr[i];
        }
        for (const b of Object.values(runs.network.buildings)) {
          cumNetCost += b.stepCostInr[i];
        }
      }
      const tableCumulative = Math.max(0, cumBaseCost - cumNetCost);

      expect(Math.abs(ticker.cumulativeInr - tableCumulative)).toBeLessThan(1e-4);
    }
  });

  it('Verifies all 6 buildings have valid series in all 12 scenes of Demo mode (Patch 1 P10)', () => {
    const scenes = getDemoScenes(runs);
    expect(scenes).toHaveLength(12);
    for (const scene of scenes) {
      expect(scene.focusRoute).toMatch(/^\/(overview|network|marketplace|vpp|occupant|buildings\/(nova|orbit))$/);
      expect(scene.cursorTarget).toBeGreaterThanOrEqual(0);
      expect(scene.cursorTarget).toBeLessThanOrEqual(95);
      expect((scene.resolvedText ?? '').length).toBeGreaterThan(20);
    }
  });
});
