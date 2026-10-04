import { AblationResult, BuildingDef, FeatureAblationItem, FeatureFlags, ScenarioDef } from './types';
import { DEFAULT_FEATURES } from './constants';
import { simulate } from './engine';

const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  setback: 'Night Temperature Setback',
  peakHold: 'Thermal Mass Pre-cooling & Peak Hold',
  lightingDim: 'Daylight Harvesting Lighting Dimming',
  dcv: 'Demand-Controlled Ventilation (DCV)',
  evShift: 'Smart EV Fleet Load Shifting',
  battery: 'BTM Battery Peak Arbitrage',
};

export function runFeatureAblation(
  buildings: BuildingDef[],
  scenario: ScenarioDef,
  seed = 20261004
): AblationResult {
  const autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 };

  // 1. Run Baseline (all optimization off)
  const baselineRun = simulate({
    buildings,
    scenario,
    mode: 'baseline',
    autopilot,
    seed,
  });

  // 2. Run All Features ON (mode: building)
  const allOnRun = simulate({
    buildings,
    scenario,
    mode: 'building',
    autopilot,
    seed,
    features: DEFAULT_FEATURES,
  });

  const baseKwh = baselineRun.clusterTotals.totalKwh;
  const baseInr = baselineRun.clusterTotals.totalCostInr;
  const basePeak = baselineRun.clusterTotals.peakKw;

  const allOnKwh = allOnRun.clusterTotals.totalKwh;
  const allOnInr = allOnRun.clusterTotals.totalCostInr;
  const allOnPeak = allOnRun.clusterTotals.peakKw;

  const totalSavedKwh = baseKwh - allOnKwh;
  const totalSavedInr = baseInr - allOnInr;
  const totalSavedPeakKw = basePeak - allOnPeak;

  const waterfall: FeatureAblationItem[] = [];
  let sumMarginalKwh = 0;
  let sumMarginalInr = 0;
  let sumMarginalPeakKw = 0;

  const featureKeys: (keyof FeatureFlags)[] = [
    'setback',
    'peakHold',
    'lightingDim',
    'dcv',
    'evShift',
    'battery',
  ];

  for (const f of featureKeys) {
    // Run with only feature f turned OFF
    const ablatedFeatures: FeatureFlags = {
      ...DEFAULT_FEATURES,
      [f]: false,
    };

    const ablatedRun = simulate({
      buildings,
      scenario,
      mode: 'building',
      autopilot,
      seed,
      features: ablatedFeatures,
    });

    const ablatedKwh = ablatedRun.clusterTotals.totalKwh;
    const ablatedInr = ablatedRun.clusterTotals.totalCostInr;
    const ablatedPeak = ablatedRun.clusterTotals.peakKw;

    // marginal_f = (with f off) - (with f on)
    // Positive means feature f saved energy/cost!
    const marginalKwh = ablatedKwh - allOnKwh;
    const marginalInr = ablatedInr - allOnInr;
    const marginalPeakKw = ablatedPeak - allOnPeak;

    waterfall.push({
      feature: f,
      label: FEATURE_LABELS[f],
      marginalKwh,
      marginalInr,
      marginalPeakKw,
    });

    sumMarginalKwh += marginalKwh;
    sumMarginalInr += marginalInr;
    sumMarginalPeakKw += marginalPeakKw;
  }

  const residualKwh = totalSavedKwh - sumMarginalKwh;
  const residualInr = totalSavedInr - sumMarginalInr;
  const residualPeakKw = totalSavedPeakKw - sumMarginalPeakKw;

  return {
    allFeaturesKwh: allOnKwh,
    allFeaturesInr: allOnInr,
    allFeaturesPeakKw: allOnPeak,
    totalSavedKwh,
    totalSavedInr,
    totalSavedPeakKw,
    waterfall,
    residualKwh,
    interactionResidual: residualKwh,
    residualInr,
    residualPeakKw,
  };
}
