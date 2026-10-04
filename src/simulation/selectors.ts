import {
  BuildingSeries,
  Decision,
  MultiRunResult,
  RunResult,
  Trade,
} from './types';
import {
  DT_H,
  FEED_IN,
  PEAK_END_STEP,
  PEAK_START_STEP,
  STEPS_PER_DAY,
  tariffAt,
} from './constants';
import { detectDecisions } from './decisions';
import { DEFAULT_BUILDINGS } from './buildings';

export function formatStepTime(k: number): string {
  const totalMinutes = k * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function tariffBands() {
  return [
    { period: 'offpeak', startStep: 0, endStep: 23, startHour: '00:00', endHour: '06:00', inrPerKwh: 6.0 },
    { period: 'normal', startStep: 24, endStep: 67, startHour: '06:00', endHour: '17:00', inrPerKwh: 8.5 },
    { period: 'peak', startStep: 68, endStep: 87, startHour: '17:00', endHour: '22:00', inrPerKwh: 11.0 },
    { period: 'offpeak', startStep: 88, endStep: 95, startHour: '22:00', endHour: '24:00', inrPerKwh: 6.0 },
  ];
}

export function clusterDemandSeries(runs: MultiRunResult) {
  const result = new Array(STEPS_PER_DAY);
  const { baseline, network } = runs;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let baseLoad = 0;
    let netLoad = 0;
    let solarTotal = 0;

    for (const b of DEFAULT_BUILDINGS) {
      baseLoad += baseline.buildings[b.id].loadKw[k];
      netLoad += network.buildings[b.id].loadKw[k];
      solarTotal += network.buildings[b.id].solarKw[k];
    }

    result[k] = {
      step: k,
      time: formatStepTime(k),
      baselineDemandKw: baseLoad,
      networkDemandKw: netLoad,
      solarKw: solarTotal,
    };
  }

  return result;
}

export function clusterSolarSeries(run: RunResult) {
  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let solarKw = 0;
    for (const b of DEFAULT_BUILDINGS) {
      solarKw += run.buildings[b.id].solarKw[k];
    }
    result[k] = {
      step: k,
      time: formatStepTime(k),
      solarKw,
    };
  }
  return result;
}

export function savingsAtStep(runs: MultiRunResult, k: number): {
  cumulativeInr: number;
  inrPerMin: number;
} {
  const stepIdx = Math.max(0, Math.min(STEPS_PER_DAY - 1, Math.floor(k)));
  const { baseline, network } = runs;

  let cumBaseCost = 0;
  let cumNetCost = 0;
  let stepBaseCost = 0;
  let stepNetCost = 0;

  for (let i = 0; i <= stepIdx; i++) {
    for (const b of DEFAULT_BUILDINGS) {
      cumBaseCost += baseline.buildings[b.id].stepCostInr[i];
      cumNetCost += network.buildings[b.id].stepCostInr[i];
      if (i === stepIdx) {
        stepBaseCost += baseline.buildings[b.id].stepCostInr[i];
        stepNetCost += network.buildings[b.id].stepCostInr[i];
      }
    }
  }

  const cumulativeInr = Math.max(0, cumBaseCost - cumNetCost);
  const inrPerMin = (stepBaseCost - stepNetCost) / 15.0; // 15 sim-min per step

  return { cumulativeInr, inrPerMin };
}

export function budgetProgress(runs: MultiRunResult, k: number): {
  budgetKwh: number;
  consumedKwh: number;
  progressPct: number;
  deltaKwh: number;
  projectedKwh: number;
  paceText: string;
} {
  const stepIdx = Math.max(1, Math.min(STEPS_PER_DAY, Math.floor(k) + 1));
  const { baseline, network } = runs;

  const budgetKwh = baseline.clusterTotals.totalKwh;
  let consumedKwh = 0;
  let baseConsumedKwh = 0;

  for (let i = 0; i < stepIdx; i++) {
    for (const b of DEFAULT_BUILDINGS) {
      consumedKwh += network.buildings[b.id].loadKw[i] * DT_H;
      baseConsumedKwh += baseline.buildings[b.id].loadKw[i] * DT_H;
    }
  }

  const progressPct = budgetKwh > 0 ? (consumedKwh / budgetKwh) * 100 : 0;
  const deltaKwh = baseConsumedKwh - consumedKwh;
  const projectedKwh = consumedKwh / (stepIdx / STEPS_PER_DAY);
  const paceText = `projected end-of-day: ${projectedKwh.toFixed(0)} kWh (${((projectedKwh / budgetKwh) * 100).toFixed(1)}% of baseline)`;

  return {
    budgetKwh,
    consumedKwh,
    progressPct,
    deltaKwh,
    projectedKwh,
    paceText,
  };
}

export function kpiSummary(runs: MultiRunResult) {
  const { baseline, network, network_dr } = runs;
  const activeRun = network_dr ?? network;

  const costSavedInr = Math.max(0, baseline.clusterTotals.totalCostInr - activeRun.clusterTotals.totalCostInr);
  const costSavedPct = baseline.clusterTotals.totalCostInr > 0
    ? (costSavedInr / baseline.clusterTotals.totalCostInr) * 100
    : 0;

  const energySavedKwh = Math.max(0, baseline.clusterTotals.totalKwh - activeRun.clusterTotals.totalKwh);
  const peakReductionKw = Math.max(0, baseline.clusterTotals.peakKw - activeRun.clusterTotals.peakKw);
  const emissionsAvoidedKg = Math.max(0, baseline.clusterTotals.emissionsKg - activeRun.clusterTotals.emissionsKg);

  return {
    costSavedInr,
    costSavedPct,
    baselineCostInr: baseline.clusterTotals.totalCostInr,
    networkCostInr: activeRun.clusterTotals.totalCostInr,
    baselineEnergyKwh: baseline.clusterTotals.totalKwh,
    networkEnergyKwh: activeRun.clusterTotals.totalKwh,
    energySavedKwh,
    baselinePeakKw: baseline.clusterTotals.peakKw,
    networkPeakKw: activeRun.clusterTotals.peakKw,
    peakReductionKw,
    peakReductionPct: baseline.clusterTotals.peakKw > 0
      ? (peakReductionKw / baseline.clusterTotals.peakKw) * 100
      : 0,
    emissionsAvoidedKg,
    treeDays: activeRun.clusterTotals.treeDays,
    worstComfortPct: activeRun.clusterTotals.worstComfortPct,
    avgComfortPct: activeRun.clusterTotals.avgComfortPct,
    p2pTradedKwh: activeRun.clusterTotals.totalP2pTradedKwh,
    p2pSavingsInr: activeRun.clusterTotals.totalP2pSavingsInr,
  };
}

export function buildingStack(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  if (!s) return [];

  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    result[k] = {
      step: k,
      time: formatStepTime(k),
      baseKw: s.baseKw[k],
      plugKw: s.plugKw[k],
      lightingKw: s.lightingKw[k],
      hvacKw: s.hvacKw[k],
      evKw: s.evKw[k],
      battChargeKw: s.battChargeKw[k],
      solarKw: s.solarKw[k],
      loadTotalKw: s.loadKw[k],
      physicalGridKw: s.physicalGridKw[k],
      billedGridKw: s.billedGridKw[k],
    };
  }
  return result;
}

export function indoorTemp(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  const b = DEFAULT_BUILDINGS.find((x) => x.id === buildingId);
  if (!s || !b) return [];

  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    result[k] = {
      step: k,
      time: formatStepTime(k),
      tIn: s.tIn[k],
      tTarget: s.tTarget[k],
      tOut: s.tOut[k],
      comfortMin: b.comfortMin,
      comfortMax: b.comfortMax,
    };
  }
  return result;
}

export function batterySoc(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  const b = DEFAULT_BUILDINGS.find((x) => x.id === buildingId);
  if (!s || !b || b.batteryKwh <= 0) return [];

  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    result[k] = {
      step: k,
      time: formatStepTime(k),
      socKwh: s.battSocKwh[k],
      socPct: (s.battSocKwh[k] / b.batteryKwh) * 100,
      chargeKw: s.battChargeKw[k],
      dischargeKw: s.battDischargeKw[k],
    };
  }
  return result;
}

export function tradesAtStep(run: RunResult, k: number): Trade[] {
  const stepIdx = Math.floor(k);
  return run.trades.filter((t) => t.step === stepIdx);
}

export function marketPriceSeries(run: RunResult) {
  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    result[k] = {
      step: k,
      time: formatStepTime(k),
      gridTariffInrKwh: run.tariffInrKwh[k],
      clearingPriceInrKwh: run.marketVwap[k],
      feedIn: FEED_IN,
      vwap: run.marketVwap[k],
      volumeKw: run.marketVolumeKw[k],
    };
  }
  return result;
}

export function drSeries(run: RunResult) {
  if (!run.dr) return [];
  const { event, refImportKw, eventImportKw, achievedKw, shortfallKw } = run.dr;

  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const isEventWindow = k >= event.startStep && k <= event.endStep;
    result[k] = {
      step: k,
      time: formatStepTime(k),
      requestedKw: isEventWindow ? event.requestKw : 0,
      achievedKw: achievedKw[k],
      shortfallKw: shortfallKw[k],
      refImportKw: refImportKw[k],
      eventImportKw: eventImportKw[k],
    };
  }
  return result;
}

export function layerAttribution(runs: MultiRunResult): {
  baselineCost: number;
  buildingCost: number;
  networkCost: number;
  l1SavingInr: number;
  l1SavingPct: number;
  l2UpliftInr: number;
  l2UpliftPct: number;
  l3PayoutInr: number;
} {
  const baseCost = runs.baseline.clusterTotals.totalCostInr;
  const bldgCost = runs.building.clusterTotals.totalCostInr;
  const netCost = runs.network.clusterTotals.totalCostInr;

  const l1SavingInr = Math.max(0, baseCost - bldgCost);
  const l1SavingPct = baseCost > 0 ? (l1SavingInr / baseCost) * 100 : 0;

  const l2UpliftInr = Math.max(0, bldgCost - netCost);
  const l2UpliftPct = bldgCost > 0 ? (l2UpliftInr / bldgCost) * 100 : 0;

  const l3PayoutInr = runs.network_dr?.dr?.payoutInr ?? 0;

  return {
    baselineCost: baseCost,
    buildingCost: bldgCost,
    networkCost: netCost,
    l1SavingInr,
    l1SavingPct,
    l2UpliftInr,
    l2UpliftPct,
    l3PayoutInr,
  };
}

export function decisionsFromRun(runs: MultiRunResult): Decision[] {
  return detectDecisions(runs);
}

export function networkStatus(run: RunResult, k: number) {
  const stepIdx = Math.max(0, Math.min(STEPS_PER_DAY - 1, Math.floor(k)));
  const bldgStatus: Record<
    string,
    { status: 'surplus' | 'deficit' | 'balanced'; netKw: number }
  > = {};

  for (const b of DEFAULT_BUILDINGS) {
    const s = run.buildings[b.id];
    const netKw = s.billedGridKw[stepIdx];
    const peak = b.baseKw + b.plugKw + b.lightKw + b.hvacRatedKw;
    const threshold = 0.05 * peak;

    let status: 'surplus' | 'deficit' | 'balanced' = 'balanced';
    if (netKw < -threshold) {
      status = 'surplus';
    } else if (netKw > threshold) {
      status = 'deficit';
    }
    bldgStatus[b.id] = { status, netKw };
  }

  const stepTrades = tradesAtStep(run, stepIdx);
  const activeTradeKw = stepTrades.reduce((acc, t) => acc + t.kw, 0);

  // Cumulative volume and value up to current step
  let cumVolumeKwh = 0;
  let cumValueInr = 0;
  for (const t of run.trades) {
    if (t.step <= stepIdx) {
      cumVolumeKwh += t.kw * DT_H;
      cumValueInr += t.kw * DT_H * t.priceInrKwh;
    }
  }

  return {
    step: stepIdx,
    bldgStatus,
    stepTrades,
    activeTradeKw,
    cumVolumeKwh,
    cumValueInr,
  };
}

// ==========================================
// PATCH 1 SELECTORS (P3, P4, P5, P6)
// ==========================================

export function occupantSeries(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  const b = DEFAULT_BUILDINGS.find((x) => x.id === buildingId);
  if (!s || !b) return [];

  const result = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    result[k] = {
      step: k,
      time: formatStepTime(k),
      tIn: s.tIn[k],
      tTarget: s.tTarget[k],
      tOut: s.tOut[k],
      comfortMin: b.comfortMin,
      comfortMax: b.comfortMax,
      co2Ppm: s.co2Ppm[k],
      cTarget: 800,
      cLimit: 1000,
      airflowLps: s.airflowLps[k],
      airflowDesignLps: s.airflowDesignLps[k],
      lightingFraction: s.lightingFraction[k],
      occ: s.occ[k],
    };
  }
  return result;
}

export function occupantSummary(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  const b = DEFAULT_BUILDINGS.find((x) => x.id === buildingId);
  const t = run.buildingTotals[buildingId];
  if (!s || !b || !t) {
    return {
      comfortPct: 100,
      iaqPct: 100,
      minLightingFraction: 1.0,
      peakCo2Ppm: 420,
      maxExceedanceC: 0,
      hoursOutsideBand: 0,
      thermalStatus: 'Within band',
      iaqStatus: 'Optimal (≤ 800 ppm)',
      lightingStatus: 'Standard (≥ 75%)',
    };
  }

  const hoursOutsideBand = t.hoursOutsideBandOccupied ?? ((t.violationSteps * 15) / 60);
  const currentStep = 48; // 12:00 midday representative or cursor
  const currCo2 = s.co2Ppm[currentStep];
  const currT = s.tIn[currentStep];

  let thermalStatus = 'Optimal';
  if (currT < b.comfortMin) thermalStatus = 'Below band';
  else if (currT > b.comfortMax) thermalStatus = 'Above band';
  else thermalStatus = 'Within band';

  let iaqStatus = 'Optimal (≤ 800 ppm)';
  if (currCo2 > 1000) iaqStatus = 'Elevated (> 1000 ppm)';
  else if (currCo2 > 800) iaqStatus = 'Target Exceeded (> 800 ppm)';

  const minLightPct = Math.round(t.minLightingFraction * 100);
  const lightingStatus = `${minLightPct}% of design delivered`;

  return {
    comfortPct: t.comfortPct,
    iaqPct: t.iaqPct,
    minLightingFraction: t.minLightingFraction,
    peakCo2Ppm: t.peakCo2Ppm,
    maxExceedanceC: t.maxExceedanceC,
    hoursOutsideBand,
    thermalStatus,
    iaqStatus,
    lightingStatus,
  };
}

export function buildingLeague(runs: MultiRunResult) {
  const base = runs.baseline;
  const opt = runs.network_dr ?? runs.network;

  // Rank by baseline EUI vs optimized EUI
  const items = DEFAULT_BUILDINGS.map((b) => {
    const baseEui = base.buildingTotals[b.id].euiAnnual;
    const optEui = opt.buildingTotals[b.id].euiAnnual;
    const reductionPct = baseEui > 0 ? ((baseEui - optEui) / baseEui) * 100 : 0;
    const comfortPct = opt.buildingTotals[b.id]?.comfortPct ?? 100;
    const iaqPct = opt.buildingTotals[b.id]?.iaqPct ?? 100;
    return {
      id: b.id,
      name: b.name,
      type: b.type,
      areaM2: b.areaM2,
      baseEui,
      optEui,
      reductionPct,
      comfortPct,
      iaqPct,
    };
  });

  const baseSorted = [...items].sort((a, b) => a.baseEui - b.baseEui);
  const optSorted = [...items].sort((a, b) => a.optEui - b.optEui);

  return optSorted.map((item, optRank) => {
    const baseRank = baseSorted.findIndex((x) => x.id === item.id);
    const rankDelta = baseRank - optRank; // positive = improved rank
    return {
      ...item,
      baseRank: baseRank + 1,
      optRank: optRank + 1,
      rankDelta,
    };
  });
}

export function fddSeries(run: RunResult, buildingId: string) {
  const s = run.buildings[buildingId];
  const fdd = run.fdd?.[buildingId];
  if (!s) return { series: [], fdd: null };

  const series = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    series[k] = {
      step: k,
      time: formatStepTime(k),
      hvacKwActual: s.hvacKw[k],
      hvacKwNominal: s.hvacKwNominal[k],
      residualPct: (fdd?.residuals[k] ?? 0) * 100,
      effectiveCop: s.effectiveCop[k],
      isFaultStep: fdd?.flagStep !== null && k >= (fdd?.flagStep ?? 999),
    };
  }

  return {
    series,
    fdd: fdd ?? null,
  };
}

export function endUseBreakdown(runs: MultiRunResult, buildingId?: string) {
  const { baseline, network, network_dr } = runs;
  const activeOpt = network_dr ?? network;

  const buildings = buildingId
    ? DEFAULT_BUILDINGS.filter((b) => b.id === buildingId)
    : DEFAULT_BUILDINGS;

  let baseHvac = 0;
  let baseLight = 0;
  let basePlug = 0;
  let baseBase = 0;
  let baseEv = 0;

  let optHvac = 0;
  let optLight = 0;
  let optPlug = 0;
  let optBase = 0;
  let optEv = 0;

  for (const b of buildings) {
    const sBase = baseline.buildings[b.id];
    const sOpt = activeOpt.buildings[b.id];

    for (let k = 0; k < STEPS_PER_DAY; k++) {
      baseHvac += sBase.hvacKw[k] * DT_H;
      baseLight += sBase.lightingKw[k] * DT_H;
      basePlug += sBase.plugKw[k] * DT_H;
      baseBase += sBase.baseKw[k] * DT_H;
      baseEv += sBase.evKw[k] * DT_H;

      optHvac += sOpt.hvacKw[k] * DT_H;
      optLight += sOpt.lightingKw[k] * DT_H;
      optPlug += sOpt.plugKw[k] * DT_H;
      optBase += sOpt.baseKw[k] * DT_H;
      optEv += sOpt.evKw[k] * DT_H;
    }
  }

  return [
    {
      category: 'HVAC Cooling & Vent',
      baselineKwh: baseHvac,
      optimizedKwh: optHvac,
      savingKwh: Math.max(0, baseHvac - optHvac),
      savingPct: baseHvac > 0 ? ((baseHvac - optHvac) / baseHvac) * 100 : 0,
    },
    {
      category: 'Interior Lighting',
      baselineKwh: baseLight,
      optimizedKwh: optLight,
      savingKwh: Math.max(0, baseLight - optLight),
      savingPct: baseLight > 0 ? ((baseLight - optLight) / baseLight) * 100 : 0,
    },
    {
      category: 'Plug & IT Loads',
      baselineKwh: basePlug,
      optimizedKwh: optPlug,
      savingKwh: 0,
      savingPct: 0,
    },
    {
      category: 'Base Utilities',
      baselineKwh: baseBase,
      optimizedKwh: optBase,
      savingKwh: 0,
      savingPct: 0,
    },
    {
      category: 'EV Fleet Charging',
      baselineKwh: baseEv,
      optimizedKwh: optEv,
      savingKwh: Math.max(0, baseEv - optEv),
      savingPct: baseEv > 0 ? ((baseEv - optEv) / baseEv) * 100 : 0,
    },
  ];
}

export function occupancyHeatmap(runWeekday: RunResult, runWeekend: RunResult) {
  // 24 hours x 6 buildings
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getMatrix = (run: RunResult) => {
    return hours.map((hour) => {
      // 4 steps per hour: average occupancy
      const stepStart = hour * 4;
      const bldgOcc: Record<string, number> = {};
      for (const b of DEFAULT_BUILDINGS) {
        const s = run.buildings[b.id];
        let sum = 0;
        for (let sIdx = 0; sIdx < 4; sIdx++) {
          sum += s.occ[stepStart + sIdx];
        }
        bldgOcc[b.id] = sum / 4.0;
      }
      return {
        hour,
        timeLabel: `${hour.toString().padStart(2, '0')}:00`,
        ...bldgOcc,
      };
    });
  };

  return {
    weekday: getMatrix(runWeekday),
    weekend: getMatrix(runWeekend),
    buildings: DEFAULT_BUILDINGS.map((b) => ({ id: b.id, name: b.name })),
  };
}

export function energyIntensityTable(runs: MultiRunResult) {
  const base = runs.baseline;
  const opt = runs.network_dr ?? runs.network;

  return DEFAULT_BUILDINGS.map((b) => {
    const bTot = base.buildingTotals[b.id];
    const oTot = opt.buildingTotals[b.id];

    return {
      id: b.id,
      name: b.name,
      type: b.type,
      areaM2: b.areaM2,
      benchmarkEui: b.benchmarkEui,
      baseKwhDay: bTot.totalKwh,
      optKwhDay: oTot.totalKwh,
      baseEuiDay: bTot.euiDay,
      optEuiDay: oTot.euiDay,
      baseEuiAnnual: bTot.euiAnnual,
      optEuiAnnual: oTot.euiAnnual,
      energyReductionPct: bTot.totalKwh > 0 ? ((bTot.totalKwh - oTot.totalKwh) / bTot.totalKwh) * 100 : 0,
      costReductionPct: bTot.totalCostInr > 0 ? ((bTot.totalCostInr - oTot.totalCostInr) / bTot.totalCostInr) * 100 : 0,
      peakReductionPct: bTot.peakKw > 0 ? ((bTot.peakKw - oTot.peakKw) / bTot.peakKw) * 100 : 0,
    };
  });
}

export function discomMetrics(runs: MultiRunResult) {
  const { baseline, network, network_dr } = runs;
  const opt = network_dr ?? network;

  const basePeak = baseline.clusterTotals.peakKw;
  const optPeak = opt.clusterTotals.peakKw;

  // Time of peak
  let basePeakStep = 0;
  let optPeakStep = 0;
  let maxBaseLoad = -Infinity;
  let maxOptLoad = -Infinity;
  let basePeakWindowKwh = 0;
  let optPeakWindowKwh = 0;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let baseL = 0;
    let optL = 0;
    for (const b of DEFAULT_BUILDINGS) {
      baseL += baseline.buildings[b.id].loadKw[k];
      optL += opt.buildings[b.id].loadKw[k];
    }
    if (baseL > maxBaseLoad) {
      maxBaseLoad = baseL;
      basePeakStep = k;
    }
    if (optL > maxOptLoad) {
      maxOptLoad = optL;
      optPeakStep = k;
    }
    if (k >= PEAK_START_STEP && k <= PEAK_END_STEP) {
      basePeakWindowKwh += baseL * DT_H;
      optPeakWindowKwh += optL * DT_H;
    }
  }

  const baseMeanLoad = baseline.clusterTotals.totalKwh / 24;
  const optMeanLoad = opt.clusterTotals.totalKwh / 24;

  const baseLoadFactor = basePeak > 0 ? baseMeanLoad / basePeak : 0;
  const optLoadFactor = optPeak > 0 ? optMeanLoad / optPeak : 0;

  const peakEnergyShiftedKwh = Math.max(0, basePeakWindowKwh - optPeakWindowKwh);

  const drEvent = opt.dr?.event ?? {
    eventId: 'DR-DISCOM-DELHI-2026-001',
    startStep: PEAK_START_STEP,
    endStep: PEAK_END_STEP,
    requestKw: 150,
    rateInrPerKwh: 14.0,
  };

  const drAchievedAvgKw = opt.dr
    ? opt.dr.achievedKw.slice(drEvent.startStep, drEvent.endStep + 1).reduce((a, b) => a + b, 0) /
      (drEvent.endStep - drEvent.startStep + 1)
    : 0;

  const openAdrPayload = {
    event: {
      eventId: drEvent.eventId ?? 'DR-EVENT-DISCOM-001',
      startTime: formatStepTime(drEvent.startStep),
      endTime: formatStepTime(drEvent.endStep),
      requestedKw: drEvent.requestKw,
      rateInrPerKwh: drEvent.rateInrPerKwh ?? 12.0,
    },
    clusterResponse: {
      committedKw: drEvent.requestKw,
      deliveredAvgKw: Math.round(drAchievedAvgKw * 10) / 10,
      compliancePct:
        drEvent.requestKw > 0
          ? Math.round((drAchievedAvgKw / drEvent.requestKw) * 1000) / 10
          : 100,
      totalPayoutInr: opt.dr?.payoutInr ?? 0,
    },
    buildingBreakdown: DEFAULT_BUILDINGS.map((b) => ({
      buildingId: b.id,
      name: b.name,
      baseLoadPeakKw: Math.max(
        ...baseline.buildings[b.id].loadKw.slice(drEvent.startStep, drEvent.endStep + 1)
      ),
      optLoadPeakKw: Math.max(
        ...opt.buildings[b.id].loadKw.slice(drEvent.startStep, drEvent.endStep + 1)
      ),
      shedKw:
        Math.max(...baseline.buildings[b.id].loadKw.slice(drEvent.startStep, drEvent.endStep + 1)) -
        Math.max(...opt.buildings[b.id].loadKw.slice(drEvent.startStep, drEvent.endStep + 1)),
    })),
  };

  return {
    basePeakKw: basePeak,
    basePeakTime: formatStepTime(basePeakStep),
    timeOfPeak: formatStepTime(basePeakStep),
    optPeakKw: optPeak,
    optPeakTime: formatStepTime(optPeakStep),
    peakReductionPct: basePeak > 0 ? ((basePeak - optPeak) / basePeak) * 100 : 0,
    baseLoadFactor,
    optLoadFactor,
    peakEnergyShiftedKwh,
    kwhMovedOutOfPeak: peakEnergyShiftedKwh,
    drAchievedAvgKw,
    drAchievedKwh: drAchievedAvgKw * 2.0,
    drCompliancePct: openAdrPayload.clusterResponse.compliancePct,
    drRequestedKwh: openAdrPayload.event.requestedKw * 2.0,
    openAdrPayload,
  };
}
