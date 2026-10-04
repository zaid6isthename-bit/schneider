import { BuildingDef } from './types';
import {
  CEILING_M,
  C_LIMIT_SCORE,
  C_OUT,
  C_TARGET,
  DCV_MIN_FRACTION,
  G_PERSON,
  OA_FRACTION,
  OCC_THRESHOLD,
  VENT_L_PER_S_PERSON,
} from './constants';

export {
  CEILING_M,
  C_LIMIT_SCORE,
  C_OUT,
  C_TARGET,
  DCV_MIN_FRACTION,
  G_PERSON,
  OA_FRACTION,
  OCC_THRESHOLD,
  VENT_L_PER_S_PERSON,
};

export interface IaqStepResult {
  cNext: number; // indoor CO2 ppm at end of step
  ventAirflowLps: number; // Q in L/s
  ventRatio: number; // Q / Q_design
}

export function computeVentilationAirflow(
  building: BuildingDef,
  occ: number,
  hour: number,
  isBaseline: boolean,
  dcvEnabled: boolean
): { ventAirflowLps: number; qDesignLps: number } {
  const designOccupants = building.areaM2 / building.m2PerPerson;
  const qDesignLps = designOccupants * VENT_L_PER_S_PERSON;
  const nOccupants = occ * designOccupants;

  if (isBaseline) {
    const isInsideWindow =
      building.schedule.is24h ||
      (hour >= building.schedule.startHour && hour < building.schedule.endHour);

    const ventAirflowLps = isInsideWindow ? qDesignLps : 0.2 * qDesignLps;
    return { ventAirflowLps, qDesignLps };
  }

  // Optimized mode
  if (dcvEnabled) {
    // Q = clamp(G_PERSON · N · 1e6 / (C_TARGET − C_OUT), DCV_MIN_FRACTION · Q_design, Q_design)
    const qRequired = (G_PERSON * nOccupants * 1e6) / Math.max(1, C_TARGET - C_OUT);
    const ventAirflowLps = Math.max(
      DCV_MIN_FRACTION * qDesignLps,
      Math.min(qDesignLps, qRequired)
    );
    return { ventAirflowLps, qDesignLps };
  } else {
    // DCV feature flag off: run at design flow
    return { ventAirflowLps: qDesignLps, qDesignLps };
  }
}

export function simulateIaqStep(
  cCurrent: number,
  building: BuildingDef,
  occ: number,
  ventAirflowLps: number,
  qDesignLps: number
): IaqStepResult {
  const designOccupants = building.areaM2 / building.m2PerPerson;
  const nOccupants = occ * designOccupants;
  const vLitres = building.areaM2 * CEILING_M * 1000.0;

  const qSafe = Math.max(1e-6, ventAirflowLps);
  const cEq = C_OUT + (G_PERSON * nOccupants * 1e6) / qSafe;

  // Exact differential solution over 900 seconds (15 minutes):
  // C[k+1] = Ceq + (C[k] - Ceq) * exp(-Q * 900 / V)
  const decay = Math.exp((-qSafe * 900.0) / vLitres);
  const cNext = cEq + (cCurrent - cEq) * decay;

  const ventRatio = qDesignLps > 0 ? ventAirflowLps / qDesignLps : 1.0;

  return {
    cNext,
    ventAirflowLps,
    ventRatio,
  };
}

export function evaluateIaqSeries(
  co2Series: number[],
  occSeries: number[]
): {
  iaqPct: number;
  peakCo2Ppm: number;
  co2ExceedSteps: number;
} {
  let occSumPassing = 0;
  let totalOccScored = 0;
  let peakCo2Ppm = 0;
  let co2ExceedSteps = 0;

  for (let k = 0; k < co2Series.length; k++) {
    const c = co2Series[k];
    const occ = occSeries[k];

    if (c > peakCo2Ppm) peakCo2Ppm = c;

    if (occ >= OCC_THRESHOLD) {
      totalOccScored += occ;
      if (c <= C_LIMIT_SCORE) {
        occSumPassing += occ;
      } else {
        co2ExceedSteps++;
      }
    }
  }

  const iaqPct = totalOccScored > 0 ? (occSumPassing / totalOccScored) * 100 : 100;

  return {
    iaqPct,
    peakCo2Ppm,
    co2ExceedSteps,
  };
}

export function computeOccupantCapacity(areaM2: number, m2PerPerson: number) {
  const designOccupants = areaM2 / m2PerPerson;
  const volumeLiters = areaM2 * CEILING_M * 1000.0;
  const qDesignLps = designOccupants * VENT_L_PER_S_PERSON;
  return { designOccupants, volumeLiters, qDesignLps };
}

export function calculateExactCo2Step(
  cCurrent: number,
  nOccupants: number,
  ventAirflowLps: number,
  vLitres: number,
  dtSeconds = 900
): number {
  const qSafe = Math.max(1e-6, ventAirflowLps);
  const cEq = C_OUT + (G_PERSON * nOccupants * 1e6) / qSafe;
  const decay = Math.exp((-qSafe * dtSeconds) / vLitres);
  return cEq + (cCurrent - cEq) * decay;
}

export function getOccupantDensity(type: string): number {
  const densities: Record<string, number> = {
    office: 10,
    retail: 4,
    hospital: 15,
    university: 5,
    it: 8,
    hotel: 25,
  };
  return densities[type] ?? 10;
}

export function computeDcvAirflow(
  nOccupants: number,
  qDesignLps: number,
  cTarget = C_TARGET,
  cOut = C_OUT,
  minFraction = DCV_MIN_FRACTION
): number {
  const qRequired = (G_PERSON * nOccupants * 1e6) / Math.max(1, cTarget - cOut);
  return Math.max(minFraction * qDesignLps, Math.min(qDesignLps, qRequired));
}
