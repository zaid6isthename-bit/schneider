import { BuildingDef, ClimateZoneId, Mode, MultiRunResult, ScenarioDef } from './types';
import { SCENARIOS } from './scenarios';
import { CLIMATE_PRESETS, DEFAULT_FEATURES } from './constants';
import { simulate } from './engine';

export interface AnnualMetrics {
  annualKwh: number;
  annualCostInr: number;
  euiAnnual: number; // kWh/m²/year
}

export function annualizeRuns(
  buildings: BuildingDef[],
  mode: Mode,
  climateZone: ClimateZoneId = 'composite',
  seed = 20261004
): {
  buildingAnnual: Record<string, AnnualMetrics>;
  clusterAnnual: AnnualMetrics;
} {
  const preset = CLIMATE_PRESETS[climateZone] ?? CLIMATE_PRESETS.composite;

  // Apply climate preset temperatures and cloud base to scenario profiles
  const hotScenario: ScenarioDef = {
    ...SCENARIOS.hot_weekday,
    Tmean: preset.Tmean,
    A: preset.A,
    cloudBase: preset.cloudBase,
  };

  const mildScenario: ScenarioDef = {
    ...SCENARIOS.mild_weekday,
    Tmean: preset.Tmean - 6,
    A: Math.max(3, preset.A - 2),
    cloudBase: Math.min(1.0, preset.cloudBase * 0.95),
  };

  const monsoonScenario: ScenarioDef = {
    ...SCENARIOS.monsoon,
    Tmean: preset.Tmean - 5,
    A: Math.max(2, preset.A - 4),
    cloudBase: 0.35,
  };

  const sundayScenario: ScenarioDef = {
    ...SCENARIOS.sunday_surplus,
    Tmean: preset.Tmean,
    A: preset.A,
    cloudBase: preset.cloudBase,
  };

  const autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 };

  const rHot = simulate({ buildings, scenario: hotScenario, mode, autopilot, seed });
  const rMild = simulate({ buildings, scenario: mildScenario, mode, autopilot, seed });
  const rMonsoon = simulate({ buildings, scenario: monsoonScenario, mode, autopilot, seed });
  const rSunday = simulate({ buildings, scenario: sundayScenario, mode, autopilot, seed });

  const buildingAnnual: Record<string, AnnualMetrics> = {};
  let clusterWeightedDailyKwh = 0;
  let clusterWeightedDailyCost = 0;
  let clusterArea = 0;

  for (const b of buildings) {
    clusterArea += b.areaM2;

    const eHot = rHot.buildingTotals[b.id].totalKwh;
    const eMild = rMild.buildingTotals[b.id].totalKwh;
    const eMonsoon = rMonsoon.buildingTotals[b.id].totalKwh;
    const eSun = rSunday.buildingTotals[b.id].totalKwh;

    const cHot = rHot.buildingTotals[b.id].totalCostInr;
    const cMild = rMild.buildingTotals[b.id].totalCostInr;
    const cMonsoon = rMonsoon.buildingTotals[b.id].totalCostInr;
    const cSun = rSunday.buildingTotals[b.id].totalCostInr;

    // Weekday weighted average: 0.40 hot, 0.40 mild, 0.20 monsoon
    const eWeekdayAvg = 0.4 * eHot + 0.4 * eMild + 0.2 * eMonsoon;
    const cWeekdayAvg = 0.4 * cHot + 0.4 * cMild + 0.2 * cMonsoon;

    // Annual weighting: 5/7 weekdays + 2/7 weekends
    const weightedDailyKwh = (5 / 7) * eWeekdayAvg + (2 / 7) * eSun;
    const weightedDailyCost = (5 / 7) * cWeekdayAvg + (2 / 7) * cSun;

    const annualKwh = 365 * weightedDailyKwh;
    const annualCostInr = 365 * weightedDailyCost;
    const euiAnnual = annualKwh / b.areaM2;

    buildingAnnual[b.id] = {
      annualKwh,
      annualCostInr,
      euiAnnual,
    };

    clusterWeightedDailyKwh += weightedDailyKwh;
    clusterWeightedDailyCost += weightedDailyCost;
  }

  const clusterAnnualKwh = 365 * clusterWeightedDailyKwh;
  const clusterAnnualCost = 365 * clusterWeightedDailyCost;
  const clusterEuiAnnual = clusterArea > 0 ? clusterAnnualKwh / clusterArea : 0;

  return {
    buildingAnnual,
    clusterAnnual: {
      annualKwh: clusterAnnualKwh,
      annualCostInr: clusterAnnualCost,
      euiAnnual: clusterEuiAnnual,
    },
  };
}
