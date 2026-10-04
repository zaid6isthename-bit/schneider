import { BuildingDef } from './types';
import { COP_REF, DELTA_T_INT, DT_H, OCC_THRESHOLD, getCop } from './constants';

export interface ThermalStepResult {
  u: number;
  hvacKw: number;
  tInNext: number;
}

export function simulateThermalStep(
  tIn: number,
  tOut: number,
  occ: number,
  tTarget: number,
  building: BuildingDef
): ThermalStepResult {
  const tFree = tOut + DELTA_T_INT * occ;
  const alpha = DT_H / building.tau;

  // Controller choice:
  // u_raw = (Tfree - Tin - (Ttgt - Tin)/alpha) / K
  const uRaw = (tFree - tIn - (tTarget - tIn) / alpha) / building.K;
  const u = Math.max(0, Math.min(1, uRaw));

  // State update using clamped u:
  // Tin[k+1] = Tin[k] + alpha * (Tfree - K * u - Tin[k])
  const tInNext = tIn + alpha * (tFree - building.K * u - tIn);

  // Electrical power
  const copFactor = COP_REF / getCop(tOut);
  const hvacKw = building.hvacRatedKw * u * copFactor;

  return { u, hvacKw, tInNext };
}

export interface ComfortEvaluation {
  comfortPct: number;
  violationSteps: number;
  maxExceedanceC: number;
}

export function evaluateComfort(
  tInSeries: number[],
  occSeries: number[],
  comfortMin: number,
  comfortMax: number
): ComfortEvaluation {
  let occSumComfortable = 0;
  let totalOccScored = 0;
  let violationSteps = 0;
  let maxExceedanceC = 0;

  for (let k = 0; k < tInSeries.length; k++) {
    const occ = occSeries[k];
    if (occ >= OCC_THRESHOLD) {
      totalOccScored += occ;
      const t = tInSeries[k];
      const isComfortable = t >= comfortMin - 1e-4 && t <= comfortMax + 1e-4;

      if (isComfortable) {
        occSumComfortable += occ;
      } else {
        violationSteps++;
        const exceedance = t < comfortMin ? comfortMin - t : t - comfortMax;
        if (exceedance > maxExceedanceC) {
          maxExceedanceC = exceedance;
        }
      }
    }
  }

  const comfortPct = totalOccScored > 0 ? (occSumComfortable / totalOccScored) * 100 : 100;
  return { comfortPct, violationSteps, maxExceedanceC };
}
