import { describe, it, expect } from 'vitest';
import { simulate, runAll } from '@/simulation/engine';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import {
  BATT_CEIL,
  BATT_DEGRADATION,
  BATT_ETA_CH,
  BATT_ETA_DIS,
  BATT_FLOOR_DEFAULT,
  BATT_FLOOR_HOSPITAL,
  BUYER_MARGIN,
  COP_REF,
  DELTA_T_INT,
  DEMAND_CHARGE,
  DR_RATE,
  DT_H,
  EF_BASE,
  FEED_IN,
  OA_FRACTION,
  PLATFORM_FEE,
  SEED,
  STEPS_PER_DAY,
  WHEELING,
  efMultAtHour,
  getCop,
  tariffAt,
} from '@/simulation/constants';
import { Mode } from '@/simulation/types';

describe('THERMOS 2.0 Engine Invariants', () => {
  const autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 };
  const modes: Mode[] = ['baseline', 'building', 'network', 'network_dr'];
  const scenarioList = Object.values(SCENARIOS);

  it('Invariant 1: Determinism — two runs with same input yield identical hash and data', () => {
    const run1 = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });

    const run2 = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });

    expect(run1.hash).toBe(run2.hash);
    expect(run1.clusterTotals.totalCostInr).toBe(run2.clusterTotals.totalCostInr);
  });

  for (const scenario of scenarioList) {
    describe(`Scenario: ${scenario.id}`, () => {
      for (const mode of modes) {
        // Skip network_dr for scenarios with no DR event unless it's grid_crisis
        if (mode === 'network_dr' && !scenario.drEvent) continue;

        describe(`Mode: ${mode}`, () => {
          const run = simulate({
            buildings: DEFAULT_BUILDINGS,
            scenario,
            mode,
            autopilot,
            seed: SEED,
          });

          it('Invariant 2: Array lengths = 96, no NaN, no Infinity', () => {
            expect(run.tariffInrKwh).toHaveLength(STEPS_PER_DAY);
            expect(run.tariffPeriod).toHaveLength(STEPS_PER_DAY);
            expect(run.efKgPerKwh).toHaveLength(STEPS_PER_DAY);
            expect(run.marketVolumeKw).toHaveLength(STEPS_PER_DAY);
            expect(run.marketVwap).toHaveLength(STEPS_PER_DAY);

            for (const b of DEFAULT_BUILDINGS) {
              const s = run.buildings[b.id];
              const seriesKeys: (keyof typeof s)[] = [
                'occ', 'tOut', 'ghi', 'solarKw', 'baseKw', 'plugKw', 'lightingKw',
                'hvacKw', 'evKw', 'loadKw', 'battChargeKw', 'battDischargeKw',
                'battSocKwh', 'tIn', 'tTarget', 'hvacU', 'gridPointLocalKw',
                'physicalGridKw', 'billedGridKw', 'soldKw', 'boughtKw', 'stepCostInr'
              ];

              for (const k of seriesKeys) {
                const arr = s[k] as number[];
                expect(arr).toHaveLength(STEPS_PER_DAY);
                for (let step = 0; step < STEPS_PER_DAY; step++) {
                  expect(Number.isFinite(arr[step])).toBe(true);
                }
              }
            }
          });

          it('Invariant 3: Per-building energy balance each step: physicalGrid = load + charge − discharge − solar', () => {
            for (const b of DEFAULT_BUILDINGS) {
              const s = run.buildings[b.id];
              for (let k = 0; k < STEPS_PER_DAY; k++) {
                const expectedPhysical = s.loadKw[k] + s.battChargeKw[k] - s.battDischargeKw[k] - s.solarKw[k];
                expect(Math.abs(s.physicalGridKw[k] - expectedPhysical)).toBeLessThan(1e-6);
              }
            }
          });

          it('Invariant 4: Battery bounds and power limits', () => {
            for (const b of DEFAULT_BUILDINGS) {
              if (b.batteryKwh <= 0) continue;
              const s = run.buildings[b.id];
              const floorFrac = b.type === 'hospital' ? BATT_FLOOR_HOSPITAL : BATT_FLOOR_DEFAULT;
              const floorKwh = b.batteryKwh * floorFrac;
              const ceilKwh = b.batteryKwh * BATT_CEIL;

              for (let k = 0; k < STEPS_PER_DAY; k++) {
                expect(s.battSocKwh[k]).toBeGreaterThanOrEqual(floorKwh - 1e-4);
                expect(s.battSocKwh[k]).toBeLessThanOrEqual(ceilKwh + 1e-4);
                expect(s.battChargeKw[k]).toBeLessThanOrEqual(b.batteryKw + 1e-4);
                expect(s.battDischargeKw[k]).toBeLessThanOrEqual(b.batteryKw + 1e-4);
              }
            }
          });

          it('Invariant 5: HVAC bounds and Tin recurrence', () => {
            for (const b of DEFAULT_BUILDINGS) {
              const s = run.buildings[b.id];
              const alpha = DT_H / b.tau;

              for (let k = 0; k < STEPS_PER_DAY; k++) {
                expect(s.hvacU[k]).toBeGreaterThanOrEqual(0);
                expect(s.hvacU[k]).toBeLessThanOrEqual(1.0 + 1e-6);

                const copFactor = COP_REF / getCop(s.tOut[k]);
                const hvacKwCore = b.hvacRatedKw * s.hvacU[k] * copFactor;
                const ventRatio =
                  s.airflowDesignLps[k] > 0 ? s.airflowLps[k] / s.airflowDesignLps[k] : 1.0;
                const expectedNominal = hvacKwCore * (1.0 - OA_FRACTION + OA_FRACTION * ventRatio);
                expect(Math.abs(s.hvacKwNominal[k] - expectedNominal)).toBeLessThan(1e-4);
                expect(s.hvacKw[k]).toBeCloseTo(s.hvacKwActual[k], 4);

                if (k < STEPS_PER_DAY - 1) {
                  const tFree = s.tOut[k] + DELTA_T_INT * s.occ[k];
                  const expectedNextTin = s.tIn[k] + alpha * (tFree - b.K * s.hvacU[k] - s.tIn[k]);
                  expect(Math.abs(s.tIn[k + 1] - expectedNextTin)).toBeLessThan(1e-5);
                }
              }
            }
          });

          if (mode === 'network' || mode === 'network_dr') {
            it('Invariant 6: Market conservation: Σ sold = Σ bought and Σ billedGrid = Σ physicalGrid', () => {
              for (let k = 0; k < STEPS_PER_DAY; k++) {
                let stepSold = 0;
                let stepBought = 0;
                let stepPhysical = 0;
                let stepBilled = 0;

                for (const b of DEFAULT_BUILDINGS) {
                  const s = run.buildings[b.id];
                  stepSold += s.soldKw[k];
                  stepBought += s.boughtKw[k];
                  stepPhysical += s.physicalGridKw[k];
                  stepBilled += s.billedGridKw[k];
                }

                expect(Math.abs(stepSold - stepBought)).toBeLessThan(1e-6);
                expect(Math.abs(stepBilled - stepPhysical)).toBeLessThan(1e-6);
              }
            });

            it('Invariant 7: Buyer never pays more than tariff − BUYER_MARGIN all-in', () => {
              for (const t of run.trades) {
                const tariff = tariffAt(t.step).inrPerKwh;
                const allInCost = t.priceInrKwh + PLATFORM_FEE + WHEELING;
                expect(allInCost).toBeLessThanOrEqual(tariff - BUYER_MARGIN + 1e-6);
              }
            });
          }

          it('Invariant 9: Cost recomputed from first principles matches building and cluster totals', () => {
            let totalClusterCost = 0;
            for (const b of DEFAULT_BUILDINGS) {
              const s = run.buildings[b.id];
              let stepCostSum = 0;
              let maxBilledImport = 0;

              for (let k = 0; k < STEPS_PER_DAY; k++) {
                stepCostSum += s.stepCostInr[k];
                const billedImport = Math.max(0, s.billedGridKw[k]);
                if (billedImport > maxBilledImport) {
                  maxBilledImport = billedImport;
                }
              }

              const expectedDemandCharge = maxBilledImport * (DEMAND_CHARGE / 30.0);
              const expectedTotal = stepCostSum + expectedDemandCharge;

              expect(Math.abs(run.buildingTotals[b.id].totalCostInr - expectedTotal)).toBeLessThan(0.01);
              totalClusterCost += expectedTotal;
            }

            expect(Math.abs(run.clusterTotals.totalCostInr - totalClusterCost)).toBeLessThan(0.05);
          });

          it('Invariant 10: Comfort metric recomputed independently equals reported comfortPct', () => {
            for (const b of DEFAULT_BUILDINGS) {
              const s = run.buildings[b.id];
              let comfortableOccSum = 0;
              let totalScoredOcc = 0;

              for (let k = 0; k < STEPS_PER_DAY; k++) {
                if (s.occ[k] >= 0.10) {
                  totalScoredOcc += s.occ[k];
                  if (s.tIn[k] >= b.comfortMin - 1e-4 && s.tIn[k] <= b.comfortMax + 1e-4) {
                    comfortableOccSum += s.occ[k];
                  }
                }
              }

              const expectedPct = totalScoredOcc > 0 ? (comfortableOccSum / totalScoredOcc) * 100 : 100;
              expect(Math.abs(run.buildingTotals[b.id].comfortPct - expectedPct)).toBeLessThan(1e-4);
            }
          });

          it('Invariant 12: Emissions recomputed independently equal reported clusterEmissions', () => {
            let expectedClusterEmissions = 0;
            for (let k = 0; k < STEPS_PER_DAY; k++) {
              const hour = k * 0.25;
              const ef = EF_BASE * efMultAtHour(hour);
              let clusterNetPhysical = 0;
              for (const b of DEFAULT_BUILDINGS) {
                clusterNetPhysical += run.buildings[b.id].physicalGridKw[k];
              }
              if (clusterNetPhysical > 0) {
                expectedClusterEmissions += ef * DT_H * clusterNetPhysical;
              }
            }

            expect(Math.abs(run.clusterTotals.emissionsKg - expectedClusterEmissions)).toBeLessThan(1e-4);
          });

          if (mode === 'network_dr' && scenario.drEvent) {
            it('Invariant 11: DR achieved ≤ requestKw, achieved ≤ measured, payout formula', () => {
              expect(run.dr).toBeDefined();
              if (run.dr) {
                const event = scenario.drEvent!;
                for (let k = event.startStep; k <= event.endStep; k++) {
                  expect(run.dr.achievedKw[k]).toBeLessThanOrEqual(event.requestKw + 1e-6);
                  const measured = Math.max(0, run.dr.refImportKw[k] - run.dr.eventImportKw[k]);
                  expect(run.dr.achievedKw[k]).toBeLessThanOrEqual(measured + 1e-6);
                }

                let sumAchievedKwh = 0;
                for (let k = event.startStep; k <= event.endStep; k++) {
                  sumAchievedKwh += run.dr.achievedKw[k] * DT_H;
                }
                const expectedPayout = sumAchievedKwh * DR_RATE;
                expect(Math.abs(run.dr.payoutInr - expectedPayout)).toBeLessThan(1e-4);
              }
            });
          }
        });
      }
    });
  }

  it('Invariant 8: EV delivered energy conservation between baseline and optimized modes', () => {
    const baseRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'baseline',
      autopilot,
      seed: SEED,
    });

    const optRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });

    for (const b of DEFAULT_BUILDINGS) {
      let baseKwh = 0;
      let optKwh = 0;
      const siteLimitKw = 0.6 * b.evSessionsCount * 7.4;

      for (let k = 0; k < STEPS_PER_DAY; k++) {
        baseKwh += baseRun.buildings[b.id].evKw[k] * DT_H;
        optKwh += optRun.buildings[b.id].evKw[k] * DT_H;

        expect(baseRun.buildings[b.id].evKw[k]).toBeLessThanOrEqual(siteLimitKw + 1e-4);
        expect(optRun.buildings[b.id].evKw[k]).toBeLessThanOrEqual(siteLimitKw + 1e-4);
      }
      expect(Math.abs(baseKwh - optKwh)).toBeLessThan(1e-3);
    }
  });
});
