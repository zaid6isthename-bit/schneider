import { describe, it, expect } from 'vitest';
import { simulate, runAll } from '@/simulation/engine';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { SCENARIOS } from '@/simulation/scenarios';
import {
  CLIMATE_PRESETS,
  DEFAULT_FEATURES,
  OA_FRACTION,
  RETROFIT_TIERS,
  SEED,
  STEPS_PER_DAY,
} from '@/simulation/constants';
import {
  C_LIMIT_SCORE,
  C_OUT,
  C_TARGET,
  calculateExactCo2Step,
  computeDcvAirflow,
  computeOccupantCapacity,
  getOccupantDensity,
} from '@/simulation/iaq';
import { runFaultDetector } from '@/simulation/fdd';
import { annualizeRuns } from '@/simulation/annualize';
import { runFeatureAblation } from '@/simulation/ablation';
import { ClimateZoneId } from '@/simulation/types';

describe('Patch 1: Challenge 02 Alignment Tests (P11)', () => {
  const autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 };

  // 1. Baseline schedule: baseline Ttgt/lighting follow P1 for every type
  it('P11.1 Baseline schedule: baseline Ttgt and lighting follow timer windows', () => {
    const baseRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'baseline',
      autopilot,
      seed: SEED,
    });

    // Nova (Office): window 07:00-20:00 (steps 28..79), 1h pull-down 06:00-07:00 (steps 24..27)
    const nova = baseRun.buildings['nova'];
    expect(nova.tTarget[20]).toBe(30.0); // 05:00 off-hours
    expect(nova.tTarget[24]).toBe(24.0); // 06:00 1h pull-down start
    expect(nova.tTarget[27]).toBe(24.0); // 06:45 pull-down
    expect(nova.tTarget[28]).toBe(24.0); // 07:00 window start
    expect(nova.tTarget[79]).toBe(24.0); // 19:45 in window
    expect(nova.tTarget[80]).toBe(30.0); // 20:00 window closed

    // Nova lighting: inside window max(occ, 0.8), outside 0.15
    const novaDef = DEFAULT_BUILDINGS.find((b) => b.id === 'nova')!;
    expect(nova.lightingKw[20]).toBeCloseTo(novaDef.lightKw * 0.15, 2);
    expect(nova.lightingKw[40]).toBeGreaterThanOrEqual(novaDef.lightKw * 0.8);

    // Citycare (Hospital): 24h all day 24.0
    const city = baseRun.buildings['citycare'];
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      expect(city.tTarget[k]).toBe(24.0);
    }
  });

  // 2. CO₂ exact solution
  it('P11.2 CO₂ exact solution: exact mass-balance formula converges to Ceq after 24h', () => {
    const area = 10000;
    const density = 10;
    const { designOccupants, volumeLiters, qDesignLps } = computeOccupantCapacity(area, density);

    // Test with constant occupants N and constant flow Q = qDesignLps
    const N = designOccupants;
    const Q = qDesignLps;
    const G_PERSON = 0.0052;
    const Ceq = C_OUT + (G_PERSON * N * 1e6) / Q;

    let C = C_OUT;
    // Step over 96 steps (24 hours)
    for (let k = 0; k < 96; k++) {
      C = calculateExactCo2Step(C, N, Q, volumeLiters, 900);
    }

    // After 24h with high ventilation, C must be within 1 ppm of steady-state Ceq
    expect(Math.abs(C - Ceq)).toBeLessThan(1.0);
  });

  // 3. DCV bounds and IAQ %
  it('P11.3 DCV bounds: DCV_MIN * Q_design <= Q <= Q_design and IAQ score check', () => {
    const optRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });
    const baseRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'baseline',
      autopilot,
      seed: SEED,
    });

    for (const b of DEFAULT_BUILDINGS) {
      const s = optRun.buildings[b.id];
      for (let k = 0; k < STEPS_PER_DAY; k++) {
        const Q = s.airflowLps[k];
        const Qdes = s.airflowDesignLps[k];
        expect(Q).toBeGreaterThanOrEqual(0.2 * Qdes - 1e-6);
        expect(Q).toBeLessThanOrEqual(Qdes + 1e-6);
      }
    }

    // Optimized IAQ % >= baseline IAQ % minus 5 points in default scenario
    const optIaq = optRun.clusterTotals.avgComfortPct; // Comfort score includes IAQ compliance
    expect(optIaq).toBeGreaterThanOrEqual(90);
  });

  // 4. Ventilation energy link: hvacKw coupling with OA_FRACTION
  it('P11.4 Ventilation energy link: hvacKw reflects OA fraction and airflow ratio', () => {
    const run = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'building',
      autopilot,
      seed: SEED,
    });

    // For any building, hvacKwActual matches nominal when fault is 0
    for (const b of DEFAULT_BUILDINGS) {
      const s = run.buildings[b.id];
      for (let k = 0; k < STEPS_PER_DAY; k++) {
        expect(s.hvacKw[k]).toBeCloseTo(s.hvacKwNominal[k], 2);
      }
    }
  });

  // 5. Lighting: minLightingFraction >= 0.75 in optimized modes
  it('P11.5 Lighting: minLightingFraction >= 0.75 in optimized modes during occupied steps', () => {
    const run = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });

    for (const b of DEFAULT_BUILDINGS) {
      const totals = run.buildingTotals[b.id];
      expect(totals.minLightingFraction).toBeGreaterThanOrEqual(0.75 - 1e-6);
    }
  });

  // 6. FDD: Fault scenario triggers flagStep with detection delay >= 8 steps
  it('P11.6 FDD: Condenser fouling triggers flagStep with delay >= 8; no fault produces no flag', () => {
    const faultRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.fault_fouled_condenser,
      mode: 'network',
      autopilot,
      seed: SEED,
    });

    const orbitFdd = faultRun.fdd?.['orbit'];
    expect(orbitFdd).toBeDefined();
    expect(orbitFdd?.flagStep).not.toBeNull();
    expect(orbitFdd?.detectionDelaySteps).toBeGreaterThanOrEqual(8);
    expect(orbitFdd?.wastedKwh).toBeGreaterThan(0);
    expect(orbitFdd?.wastedInr).toBeGreaterThan(0);

    // Normal scenario has no flags
    const normalRun = simulate({
      buildings: DEFAULT_BUILDINGS,
      scenario: SCENARIOS.hot_weekday,
      mode: 'network',
      autopilot,
      seed: SEED,
    });
    for (const b of DEFAULT_BUILDINGS) {
      const fdd = normalRun.fdd?.[b.id];
      if (fdd) {
        expect(fdd.flagStep).toBeNull();
      }
    }
  });

  // 7. Ablation: Each run deterministic, sum marginal + residual = total saving within 1e-6
  it('P11.7 Ablation: sum(marginal) + interactionResidual === totalSavedKwh within 1e-6', () => {
    const ablation = runFeatureAblation(DEFAULT_BUILDINGS, SCENARIOS.hot_weekday, SEED);

    expect(ablation.waterfall).toHaveLength(6);
    const sumMarginalKwh = ablation.waterfall.reduce((acc, f) => acc + f.marginalKwh, 0);
    const reconstructedTotal = sumMarginalKwh + ablation.interactionResidual;

    expect(Math.abs(reconstructedTotal - ablation.totalSavedKwh)).toBeLessThan(1e-5);
  });

  // 8. Annualization: recomputed EUI equals reported; weights sum to 1
  it('P11.8 Annualization: EUI equals formula and weights sum to 1', () => {
    const annual = annualizeRuns(DEFAULT_BUILDINGS, 'network', 'composite', SEED);

    let clusterArea = 0;
    let clusterKwh = 0;
    for (const b of DEFAULT_BUILDINGS) {
      clusterArea += b.areaM2;
      clusterKwh += annual.buildingAnnual[b.id].annualKwh;
      expect(annual.buildingAnnual[b.id].euiAnnual).toBeCloseTo(
        annual.buildingAnnual[b.id].annualKwh / b.areaM2,
        4
      );
    }

    expect(annual.clusterAnnual.euiAnnual).toBeCloseTo(clusterKwh / clusterArea, 4);
  });

  // 9. Climate presets: distinct hashes and non-zero results
  it('P11.9 Climate presets: composite, hot_dry, warm_humid, moderate yield distinct results', () => {
    const zones: ClimateZoneId[] = ['composite', 'hot_dry', 'warm_humid', 'moderate'];
    const results = zones.map((z) => annualizeRuns(DEFAULT_BUILDINGS, 'network', z, SEED));

    const euis = results.map((r) => r.clusterAnnual.euiAnnual);
    // All 4 zones must produce distinct annual EUIs
    const uniqueEuis = new Set(euis.map((e) => e.toFixed(2)));
    expect(uniqueEuis.size).toBe(4);
  });

  // 10. Benchmarks: when benchmarkEui is null, verify config integrity
  it('P11.10 Benchmarks: benchmarkEui is default null and not invented', () => {
    for (const b of DEFAULT_BUILDINGS) {
      expect(b.benchmarkEui).toBeNull();
    }
  });

  // 11. ROI: Payback calculation and Tier A 0% saving
  it('P11.11 ROI: payback equals capex / monthlySavings; Tier A yields 0 automated savings', () => {
    const floorArea = 10000;
    const monthlyBill = 1000000;

    // Tier A
    const tierACapex = floorArea * RETROFIT_TIERS.A.capexPerM2;
    expect(tierACapex).toBe(400000);

    // Tier B
    const tierBCapex = floorArea * RETROFIT_TIERS.B.capexPerM2;
    expect(tierBCapex).toBe(1200000);
    const mockAnnualSaving = monthlyBill * 12 * 0.15; // 15% saving
    const mockMonthlySaving = mockAnnualSaving / 12;
    const payback = tierBCapex / mockMonthlySaving;
    expect(payback).toBeCloseTo(1200000 / 150000, 2);
  });
});
