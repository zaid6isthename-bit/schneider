import { RNG } from './rng';
import { BuildingDef, EvSession, DrEvent } from './types';
import { DT_H, STEPS_PER_DAY, tariffAt, efMultAtHour } from './constants';

interface EvWindowDef {
  arriveMinH: number;
  arriveMaxH: number;
  dwellMinH: number;
  dwellMaxH: number;
}

const EV_WINDOWS: Record<BuildingDef['type'], EvWindowDef> = {
  office: { arriveMinH: 8, arriveMaxH: 11, dwellMinH: 8, dwellMaxH: 9 },
  retail: { arriveMinH: 11, arriveMaxH: 20, dwellMinH: 1.5, dwellMaxH: 3 },
  hospital: { arriveMinH: 7, arriveMaxH: 20, dwellMinH: 4, dwellMaxH: 10 },
  university: { arriveMinH: 8, arriveMaxH: 11, dwellMinH: 6, dwellMaxH: 9 },
  it: { arriveMinH: 8, arriveMaxH: 12, dwellMinH: 8, dwellMaxH: 10 },
  hotel: { arriveMinH: 15, arriveMaxH: 22, dwellMinH: 10, dwellMaxH: 14 },
};

export function generateEvSessions(buildings: BuildingDef[], rng: RNG): Record<string, EvSession[]> {
  const result: Record<string, EvSession[]> = {};

  for (const b of buildings) {
    const sessions: EvSession[] = [];
    const win = EV_WINDOWS[b.type];

    for (let i = 0; i < b.evSessionsCount; i++) {
      const arriveH = rng.uniform(win.arriveMinH, win.arriveMaxH);
      const dwellH = rng.uniform(win.dwellMinH, win.dwellMaxH);
      const arrivalStep = Math.min(95, Math.floor(arriveH * 4));
      const dwellSteps = Math.round(dwellH * 4);
      const departStep = Math.min(95, arrivalStep + dwellSteps);

      const maxKw = 7.4;
      const nominalEnergy = rng.uniform(6, 22);
      const effectiveDwellH = (departStep - arrivalStep + 1) * DT_H;
      const energyKwh = Math.min(nominalEnergy, maxKw * effectiveDwellH);

      sessions.push({
        id: `${b.id}-ev-${i}`,
        buildingId: b.id,
        arrivalStep,
        departStep,
        energyKwh,
        maxKw,
      });
    }

    result[b.id] = sessions;
  }

  return result;
}

export function dispatchEvBaseline(building: BuildingDef, sessions: EvSession[]): { evKw: number[]; unmetKwh: number } {
  const siteLimitKw = 0.6 * building.evSessionsCount * 7.4;
  const evKw: number[] = new Array(STEPS_PER_DAY).fill(0);
  let totalUnmet = 0;

  // Track remaining energy needed per session
  const remainingEnergy = sessions.map((s) => s.energyKwh);

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let siteKwRemaining = siteLimitKw;

    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      const s = sessions[sIdx];
      if (k >= s.arrivalStep && k <= s.departStep && remainingEnergy[sIdx] > 1e-6) {
        const maxDeliverableKw = Math.min(s.maxKw, remainingEnergy[sIdx] / DT_H, siteKwRemaining);
        if (maxDeliverableKw > 0) {
          evKw[k] += maxDeliverableKw;
          remainingEnergy[sIdx] -= maxDeliverableKw * DT_H;
          siteKwRemaining -= maxDeliverableKw;
        }
      }
    }
  }

  for (let i = 0; i < sessions.length; i++) {
    if (remainingEnergy[i] > 1e-4) {
      totalUnmet += remainingEnergy[i];
    }
  }

  return { evKw, unmetKwh: totalUnmet };
}

export function dispatchEvOptimized(
  building: BuildingDef,
  sessions: EvSession[],
  wCarbon: number,
  drEvent?: DrEvent
): { evKw: number[]; unmetKwh: number } {
  const siteLimitKw = 0.6 * building.evSessionsCount * 7.4;
  const evKw: number[] = new Array(STEPS_PER_DAY).fill(0);

  // Compute normalized tariff and efMult over the day
  const tariffs = Array.from({ length: STEPS_PER_DAY }, (_, k) => tariffAt(k).inrPerKwh);
  const efMults = Array.from({ length: STEPS_PER_DAY }, (_, k) => efMultAtHour(k * 0.25));

  const minT = Math.min(...tariffs);
  const maxT = Math.max(...tariffs);
  const rangeT = maxT - minT || 1;

  const minE = Math.min(...efMults);
  const maxE = Math.max(...efMults);
  const rangeE = maxE - minE || 1;

  const stepScores = Array.from({ length: STEPS_PER_DAY }, (_, k) => {
    const normT = (tariffs[k] - minT) / rangeT;
    const normE = (efMults[k] - minE) / rangeE;
    return (1 - wCarbon) * normT + wCarbon * normE;
  });

  const remainingSiteKw = new Array(STEPS_PER_DAY).fill(siteLimitKw);
  let totalUnmet = 0;

  // Sort sessions by flexibility/slack (least slack first) so tight-window sessions get site allocation
  const sortedSessions = [...sessions].sort((a, b) => {
    const aSteps = a.departStep - a.arrivalStep + 1;
    const bSteps = b.departStep - b.arrivalStep + 1;
    const aSlack = aSteps * a.maxKw * DT_H - a.energyKwh;
    const bSlack = bSteps * b.maxKw * DT_H - b.energyKwh;
    return aSlack - bSlack;
  });

  for (const s of sortedSessions) {
    let energyLeft = s.energyKwh;
    // Build candidate steps
    let candidateSteps: number[] = [];
    for (let k = s.arrivalStep; k <= s.departStep; k++) {
      candidateSteps.push(k);
    }

    // If DR active, handle DR logic:
    // "no charging except sessions that would otherwise be unable to finish before departure"
    if (drEvent) {
      const nonDrSteps = candidateSteps.filter((k) => k < drEvent.startStep || k > drEvent.endStep);
      const maxDeliverableOutsideDr = nonDrSteps.length * s.maxKw * DT_H;
      if (maxDeliverableOutsideDr < energyLeft) {
        // Must charge some in DR window, at minimum rate needed
        // We will prioritize non-DR steps first, and only allocate necessary shortfall to DR steps
        candidateSteps.sort((a, b) => {
          const aInDr = a >= drEvent.startStep && a <= drEvent.endStep;
          const bInDr = b >= drEvent.startStep && b <= drEvent.endStep;
          if (aInDr !== bInDr) return aInDr ? 1 : -1;
          return stepScores[a] - stepScores[b];
        });
      } else {
        // Can completely avoid DR window
        candidateSteps = nonDrSteps.sort((a, b) => stepScores[a] - stepScores[b]);
      }
    } else {
      candidateSteps.sort((a, b) => stepScores[a] - stepScores[b]);
    }

    for (const k of candidateSteps) {
      if (energyLeft <= 1e-6) break;
      const deliverableKw = Math.min(s.maxKw, energyLeft / DT_H, remainingSiteKw[k]);
      if (deliverableKw > 0) {
        evKw[k] += deliverableKw;
        remainingSiteKw[k] -= deliverableKw;
        energyLeft -= deliverableKw * DT_H;
      }
    }

    if (energyLeft > 1e-4) {
      totalUnmet += energyLeft;
    }
  }

  return { evKw, unmetKwh: totalUnmet };
}
