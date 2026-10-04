import { describe, it, expect } from 'vitest';
import { simulate, runAll } from '@/simulation/engine';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import { SEED } from '@/simulation/constants';

describe('Engine Performance Benchmark', () => {
  it('engine run < 50 ms for six buildings (PRD §13 Milestone 9 requirement)', () => {
    // Warm-up run
    simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot: { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 },
      seed: SEED,
    });

    const start = performance.now();
    const iterations = 20;
    for (let i = 0; i < iterations; i++) {
      simulate({
        buildings: DEFAULT_BUILDINGS,
        scenario: SCENARIOS.hot_weekday,
        mode: 'network',
        autopilot: { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 },
        seed: SEED + i,
      });
    }
    const totalTimeMs = performance.now() - start;
    const avgTimePerRunMs = totalTimeMs / iterations;

    console.log(`Average engine simulation time: ${avgTimePerRunMs.toFixed(2)} ms per run`);
    expect(avgTimePerRunMs).toBeLessThan(50);
  });
});
