import { BuildingDef, MultiRunResult, ScenarioDef } from './types';
import { DEFAULT_BUILDINGS } from './buildings';
import { createRNG } from './rng';
import { simulate } from './engine';
import { SCENARIOS } from './scenarios';

export interface ScalePoint {
  n: number;
  totalUpliftInr: number;
  upliftPerBuildingInr: number;
  totalTradedKwh: number;
}

export function generateSyntheticCluster(n: number, seed = 20261004): BuildingDef[] {
  const rng = createRNG(seed + n);
  const result: BuildingDef[] = [];
  const archetypes = DEFAULT_BUILDINGS;

  for (let i = 0; i < n; i++) {
    const template = archetypes[i % archetypes.length];
    // Jitter ±15% on loads, solar, battery
    const jitter = () => rng.uniform(0.85, 1.15);

    const b: BuildingDef = {
      ...template,
      id: `${template.id}-${i + 1}`,
      name: `${template.name} #${i + 1}`,
      areaM2: Math.round(template.areaM2 * jitter()),
      baseKw: Math.round(template.baseKw * jitter()),
      plugKw: Math.round(template.plugKw * jitter()),
      lightKw: Math.round(template.lightKw * jitter()),
      hvacRatedKw: Math.round(template.hvacRatedKw * jitter()),
      solarKwp: Math.round(template.solarKwp * jitter()),
      batteryKwh: Math.round(template.batteryKwh * jitter()),
      batteryKw: Math.round(template.batteryKw * jitter()),
      evSessionsCount: Math.round(template.evSessionsCount * jitter()),
    };
    result.push(b);
  }

  return result;
}

export function runScaleTest(
  clusterSizes: number[] = [6, 12, 24, 48],
  scenario: ScenarioDef = SCENARIOS.hot_weekday,
  seed = 20261004
): ScalePoint[] {
  const points: ScalePoint[] = [];

  for (const n of clusterSizes) {
    const buildings = generateSyntheticCluster(n, seed);
    const autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 };

    const buildingRun = simulate({
      buildings,
      scenario,
      mode: 'building',
      autopilot,
      seed,
    });

    const networkRun = simulate({
      buildings,
      scenario,
      mode: 'network',
      autopilot,
      seed,
    });

    const totalUpliftInr = Math.max(
      0,
      buildingRun.clusterTotals.totalCostInr - networkRun.clusterTotals.totalCostInr
    );
    const upliftPerBuildingInr = n > 0 ? totalUpliftInr / n : 0;
    const totalTradedKwh = networkRun.clusterTotals.totalP2pTradedKwh;

    points.push({
      n,
      totalUpliftInr,
      upliftPerBuildingInr,
      totalTradedKwh,
    });
  }

  return points;
}
