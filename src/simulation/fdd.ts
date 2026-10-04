import { FddResult } from './types';
import { DT_H, STEPS_PER_DAY, tariffAt } from './constants';

export function runFaultDetector(
  buildingId: string,
  hvacKwNominal: number[],
  hvacKwActual: number[],
  ratedKw: number,
  faultStartStep = 40
): FddResult {
  const residuals: number[] = new Array(STEPS_PER_DAY).fill(0);
  let consecutiveHighSteps = 0;
  let flagStep: number | null = null;
  let wastedKwh = 0;
  let wastedInr = 0;

  const threshold = 0.08; // 8% residual threshold
  const minNominalThreshold = 0.05 * ratedKw;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const nom = hvacKwNominal[k];
    const act = hvacKwActual[k];

    if (nom > minNominalThreshold) {
      const r = act / nom - 1.0;
      residuals[k] = r;

      if (r > threshold) {
        consecutiveHighSteps++;
        if (consecutiveHighSteps >= 8 && flagStep === null) {
          flagStep = k;
        }
      } else {
        consecutiveHighSteps = 0;
      }
    } else {
      residuals[k] = 0;
      consecutiveHighSteps = 0;
    }

    if (k >= faultStartStep) {
      const deltaKw = Math.max(0, act - nom);
      wastedKwh += deltaKw * DT_H;
      wastedInr += deltaKw * DT_H * tariffAt(k).inrPerKwh;
    }
  }

  const detectionDelaySteps = flagStep !== null ? flagStep - faultStartStep : null;

  return {
    buildingId,
    flagStep,
    faultStartStep,
    detectionDelaySteps,
    wastedKwh,
    wastedInr,
    residuals,
  };
}
