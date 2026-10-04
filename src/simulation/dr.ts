import { BuildingDef, BuildingSeries, DrEvent, DrResult } from './types';
import { DR_FEE_PCT, DR_RATE, DT_H, STEPS_PER_DAY } from './constants';

export function evaluateDrEvent(
  event: DrEvent,
  buildings: BuildingDef[],
  refSeriesRecord: Record<string, BuildingSeries>,
  eventSeriesRecord: Record<string, BuildingSeries>
): DrResult {
  const refImportKw = new Array(STEPS_PER_DAY).fill(0);
  const eventImportKw = new Array(STEPS_PER_DAY).fill(0);
  const achievedKw = new Array(STEPS_PER_DAY).fill(0);
  const shortfallKw = new Array(STEPS_PER_DAY).fill(0);
  const contributionKw: Record<string, number[]> = {};

  for (const b of buildings) {
    contributionKw[b.id] = new Array(STEPS_PER_DAY).fill(0);
  }

  let totalAchievedKwh = 0;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let rImp = 0;
    let eImp = 0;

    for (const b of buildings) {
      const bRef = Math.max(0, refSeriesRecord[b.id].billedGridKw[k]);
      const bEvent = Math.max(0, eventSeriesRecord[b.id].billedGridKw[k]);
      rImp += bRef;
      eImp += bEvent;

      if (k >= event.startStep && k <= event.endStep) {
        contributionKw[b.id][k] = Math.max(0, bRef - bEvent);
      }
    }

    refImportKw[k] = rImp;
    eventImportKw[k] = eImp;

    if (k >= event.startStep && k <= event.endStep) {
      const measured = Math.max(0, rImp - eImp);
      const achieved = Math.min(event.requestKw, measured);
      const shortfall = Math.max(0, event.requestKw - achieved);

      achievedKw[k] = achieved;
      shortfallKw[k] = shortfall;
      totalAchievedKwh += achieved * DT_H;
    }
  }

  const payoutInr = totalAchievedKwh * DR_RATE;
  const feeInr = payoutInr * DR_FEE_PCT;

  return {
    event,
    refImportKw,
    eventImportKw,
    achievedKw,
    shortfallKw,
    contributionKw,
    payoutInr,
    feeInr,
  };
}
