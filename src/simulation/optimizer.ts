import { AutopilotWeights, BuildingDef, DrEvent, FeatureFlags } from './types';
import {
  BASELINE_OFF_SETPOINT,
  BASELINE_SETPOINT,
  BASELINE_STARTUP_LEAD_STEPS,
  DEFAULT_FEATURES,
  NIGHT_SETBACK,
  OCC_THRESHOLD,
  PEAK_END_STEP,
  PEAK_START_STEP,
  PRECOOL_LEAD,
  SETBACK_LEAD,
} from './constants';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeAutopilotTargets(
  comfortMin: number,
  comfortMax: number,
  weights: AutopilotWeights
): { peakHoldTarget: number; precoolTarget: number } {
  const peakHoldTarget = comfortMax - lerp(0.2, 1.5, weights.wComfort);
  const precoolTarget = comfortMin + lerp(1.5, 0.5, weights.wCost);
  return { peakHoldTarget, precoolTarget };
}

export function pickTargetTemperature(
  k: number,
  building: BuildingDef,
  occSeries: number[],
  weights: AutopilotWeights,
  isOptimized: boolean,
  drEvent?: DrEvent,
  features: FeatureFlags = DEFAULT_FEATURES
): number {
  // P1: Realistic Timer-Scheduled BMS Baseline
  if (!isOptimized) {
    if (building.schedule.is24h) {
      return BASELINE_SETPOINT;
    }

    const startStep = building.schedule.startHour * 4;
    const endStep = building.schedule.endHour * 4;
    const morningLeadStep = startStep - BASELINE_STARTUP_LEAD_STEPS; // 1 h (4 steps) lead

    if (k >= morningLeadStep && k < endStep) {
      return BASELINE_SETPOINT;
    } else {
      return BASELINE_OFF_SETPOINT; // 30.0 °C
    }
  }

  // Optimized Mode with Feature Flags
  const { peakHoldTarget, precoolTarget } = computeAutopilotTargets(
    building.comfortMin,
    building.comfortMax,
    weights
  );

  const isDrActive = !!(drEvent && k >= drEvent.startStep && k <= drEvent.endStep);
  const isPeak = k >= PEAK_START_STEP && k <= PEAK_END_STEP;
  const isPrecool = k >= PEAK_START_STEP - PRECOOL_LEAD && k < PEAK_START_STEP;

  let tTarget = BASELINE_SETPOINT;

  // 1. If DR event active
  if (isDrActive) {
    tTarget = Math.max(peakHoldTarget, building.comfortMax - 0.2);
  }
  // 2. If step in peak window
  else if (isPeak && features.peakHold) {
    tTarget = peakHoldTarget;
  }
  // 3. If step in the PRECOOL_LEAD steps before peak start
  else if (isPrecool && features.peakHold) {
    tTarget = precoolTarget;
  }
  // 4. Night setback (if enabled and unoccupied)
  else if (features.setback && building.type !== 'hospital') {
    let maxFutureOcc = 0;
    const endK = Math.min(occSeries.length - 1, k + SETBACK_LEAD);
    for (let idx = k; idx <= endK; idx++) {
      if (occSeries[idx] > maxFutureOcc) {
        maxFutureOcc = occSeries[idx];
      }
    }
    if (maxFutureOcc < OCC_THRESHOLD) {
      tTarget = NIGHT_SETBACK;
    } else {
      tTarget = BASELINE_SETPOINT;
    }
  } else {
    tTarget = BASELINE_SETPOINT;
  }

  // Clamping rule (§5.8):
  // "All Ttgt values are clamped so that unoccupied steps may exceed the band,
  // but occupied-step targets stay within [comfortMin, comfortMax]."
  const currentOcc = occSeries[k];
  if (currentOcc >= OCC_THRESHOLD) {
    tTarget = Math.max(building.comfortMin, Math.min(building.comfortMax, tTarget));
  }

  return tTarget;
}
