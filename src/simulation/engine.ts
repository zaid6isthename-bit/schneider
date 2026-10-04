import {
  BuildingDef,
  BuildingSeries,
  FddResult,
  FeatureFlags,
  Mode,
  MultiRunResult,
  OrderBookStep,
  RunResult,
  SimInput,
  Trade,
} from './types';
import {
  C_OUT,
  DEFAULT_FEATURES,
  DT_H,
  OA_FRACTION,
  OCC_THRESHOLD,
  SEED,
  STEPS_PER_DAY,
  getCop,
  tariffAt,
} from './constants';
import { createRNG } from './rng';
import { DEFAULT_BUILDINGS } from './buildings';
import { SCENARIOS } from './scenarios';
import { generateOccupancySeries } from './occupancy';
import { computeSolarKw, generateWeather } from './weather';
import { dispatchEvBaseline, dispatchEvOptimized, generateEvSessions } from './ev';
import { computeAutopilotTargets, pickTargetTemperature } from './optimizer';
import { evaluateComfort, simulateThermalStep } from './thermal';
import { computeNonHvacLoads } from './load';
import {
  dispatchBatteryBaseline,
  dispatchBatteryOptimizedLocal,
  getBatteryBounds,
} from './battery';
import { runMarketStep } from './market';
import { computeStepCost, computeTotals } from './cost';
import { computeEmissions, computeTreeDays } from './carbon';
import { evaluateDrEvent } from './dr';
import { computeVentilationAirflow, evaluateIaqSeries, simulateIaqStep } from './iaq';
import { runFaultDetector } from './fdd';

function fnv1aHash(str: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0');
}

export function simulate(
  input: SimInput,
  refNetworkSeries?: Record<string, BuildingSeries>
): RunResult {
  const { buildings, scenario, mode, autopilot, seed } = input;
  const features: FeatureFlags = {
    ...DEFAULT_FEATURES,
    ...(input.features ?? {}),
  };

  const rng = createRNG(seed);

  // 1. Weather and solar
  const weather = generateWeather(scenario, rng);

  // 2. Occupancy per building
  const occRecord: Record<string, number[]> = {};
  for (const b of buildings) {
    occRecord[b.id] = generateOccupancySeries(b, scenario);
  }

  // 3. EV sessions generated once with seeded RNG
  const evSessionsRecord = generateEvSessions(buildings, rng);
  const evKwRecord: Record<string, number[]> = {};

  const isOptimizedMode = mode !== 'baseline';
  const isDrMode = mode === 'network_dr';
  const drEvent = isDrMode ? scenario.drEvent : undefined;

  for (const b of buildings) {
    const sessions = evSessionsRecord[b.id] ?? [];
    if (!isOptimizedMode || !features.evShift) {
      evKwRecord[b.id] = dispatchEvBaseline(b, sessions).evKw;
    } else {
      evKwRecord[b.id] = dispatchEvOptimized(b, sessions, autopilot.wCarbon, drEvent).evKw;
    }
  }

  // 4. Two-pass simulation: pass 1 to reach steady state, pass 2 recorded
  // Initial states for pass 1:
  const tInState: Record<string, number> = {};
  const socState: Record<string, number> = {};
  const co2State: Record<string, number> = {};

  for (const b of buildings) {
    tInState[b.id] = 24.0;
    const { floorKwh, ceilKwh } = getBatteryBounds(b);
    socState[b.id] = b.batteryKwh > 0 ? (floorKwh + ceilKwh) / 2.0 : 0;
    co2State[b.id] = C_OUT;
  }

  function runPass(recordResults: boolean) {
    const seriesRecord: Record<string, BuildingSeries> = {};
    const allTrades: Trade[] = [];
    const allOrderBooks: OrderBookStep[] = [];
    const marketVolumeKw: number[] = new Array(STEPS_PER_DAY).fill(0);
    const marketVwap: (number | null)[] = new Array(STEPS_PER_DAY).fill(null);

    if (recordResults) {
      for (const b of buildings) {
        seriesRecord[b.id] = {
          id: b.id,
          occ: occRecord[b.id],
          tOut: weather.tOut,
          ghi: weather.ghi,
          solarKw: new Array(STEPS_PER_DAY).fill(0),
          baseKw: new Array(STEPS_PER_DAY).fill(0),
          plugKw: new Array(STEPS_PER_DAY).fill(0),
          lightingKw: new Array(STEPS_PER_DAY).fill(0),
          hvacKw: new Array(STEPS_PER_DAY).fill(0),
          hvacKwNominal: new Array(STEPS_PER_DAY).fill(0),
          hvacKwActual: new Array(STEPS_PER_DAY).fill(0),
          effectiveCop: new Array(STEPS_PER_DAY).fill(0),
          evKw: evKwRecord[b.id],
          loadKw: new Array(STEPS_PER_DAY).fill(0),
          battChargeKw: new Array(STEPS_PER_DAY).fill(0),
          battDischargeKw: new Array(STEPS_PER_DAY).fill(0),
          battSocKwh: new Array(STEPS_PER_DAY).fill(0),
          tIn: new Array(STEPS_PER_DAY).fill(0),
          tTarget: new Array(STEPS_PER_DAY).fill(0),
          hvacU: new Array(STEPS_PER_DAY).fill(0),
          co2Ppm: new Array(STEPS_PER_DAY).fill(0),
          ventAirflowLps: new Array(STEPS_PER_DAY).fill(0),
          airflowLps: new Array(STEPS_PER_DAY).fill(0),
          airflowDesignLps: new Array(STEPS_PER_DAY).fill(0),
          lightingFraction: new Array(STEPS_PER_DAY).fill(1.0),
          gridPointLocalKw: new Array(STEPS_PER_DAY).fill(0),
          physicalGridKw: new Array(STEPS_PER_DAY).fill(0),
          billedGridKw: new Array(STEPS_PER_DAY).fill(0),
          soldKw: new Array(STEPS_PER_DAY).fill(0),
          boughtKw: new Array(STEPS_PER_DAY).fill(0),
          stepCostInr: new Array(STEPS_PER_DAY).fill(0),
        };
      }
    }

    for (let k = 0; k < STEPS_PER_DAY; k++) {
      const hour = k * 0.25;
      const { period, inrPerKwh: tariff } = tariffAt(k);
      const isDrActiveNow = !!(drEvent && k >= drEvent.startStep && k <= drEvent.endStep);

      const gridPointLocalKw: Record<string, number> = {};
      const dischargeLocalKw: Record<string, number> = {};
      const chargeLocalKw: Record<string, number> = {};

      // 1-5: Per building calculations
      for (const b of buildings) {
        const occ = occRecord[b.id][k];
        const tOut = weather.tOut[k];
        const ghi = weather.ghi[k];
        const solar = computeSolarKw(b.solarKwp, ghi, tOut);

        const tTarget = pickTargetTemperature(
          k,
          b,
          occRecord[b.id],
          autopilot,
          isOptimizedMode,
          drEvent,
          features
        );

        const currentTin = tInState[b.id];
        const { u, hvacKw: hvacKwCore, tInNext } = simulateThermalStep(currentTin, tOut, occ, tTarget, b);
        tInState[b.id] = tInNext;

        // P3 IAQ & Ventilation calculation
        const { ventAirflowLps, qDesignLps } = computeVentilationAirflow(
          b,
          occ,
          hour,
          !isOptimizedMode,
          features.dcv
        );

        const currentCo2 = co2State[b.id];
        const { cNext, ventRatio } = simulateIaqStep(
          currentCo2,
          b,
          occ,
          ventAirflowLps,
          qDesignLps
        );
        co2State[b.id] = cNext;

        // P3 Energy Link: hvacKwNominal = hvacKwCore * (1 - OA_FRACTION + OA_FRACTION * ventRatio)
        const hvacKwNominal = hvacKwCore * (1.0 - OA_FRACTION + OA_FRACTION * ventRatio);

        // P4 Fault Injection (if configured for this building and step)
        let hvacKwActual = hvacKwNominal;
        const nominalCop = getCop(tOut);
        let effectiveCop = nominalCop;

        if (scenario.fault && scenario.fault.buildingId === b.id && k >= scenario.fault.faultStartStep) {
          const rampFraction = Math.min(
            1.0,
            (k - scenario.fault.faultStartStep + 1) / scenario.fault.rampSteps
          );
          const deg = scenario.fault.faultDegMax * rampFraction;
          hvacKwActual = hvacKwNominal / Math.max(0.1, 1.0 - deg);
          effectiveCop = nominalCop * (1.0 - deg);
        }

        const hvacKw = hvacKwActual;

        const { baseKw, plugKw, lightingKw, deliveredLightingFraction } = computeNonHvacLoads(
          b,
          occ,
          hour,
          ghi,
          isOptimizedMode,
          isDrActiveNow,
          features
        );

        const ev = evKwRecord[b.id][k];
        const loadTotal = baseKw + plugKw + lightingKw + hvacKw + ev;
        const pre = loadTotal - solar;

        const currentSoc = socState[b.id];
        let charge = 0;
        let dischargeLocal = 0;
        let socNext = currentSoc;

        if (!features.battery) {
          // Battery feature turned off
          charge = 0;
          dischargeLocal = 0;
          socNext = currentSoc;
        } else if (!isOptimizedMode) {
          const battRes = dispatchBatteryBaseline(currentSoc, pre, b);
          charge = battRes.chargeKw;
          dischargeLocal = battRes.dischargeKw;
          socNext = battRes.socNext;
        } else {
          const battRes = dispatchBatteryOptimizedLocal(
            currentSoc,
            pre,
            b,
            period,
            hour,
            autopilot.wCarbon,
            isDrActiveNow
          );
          charge = battRes.chargeKw;
          dischargeLocal = battRes.dischargeKw;
          socNext = battRes.socNext;
        }

        socState[b.id] = socNext;
        chargeLocalKw[b.id] = charge;
        dischargeLocalKw[b.id] = dischargeLocal;

        // gridPointLocal = load_total + charge − dischargeLocal − solarKw
        const gpl = loadTotal + charge - dischargeLocal - solar;
        gridPointLocalKw[b.id] = gpl;

        if (recordResults) {
          const s = seriesRecord[b.id];
          s.solarKw[k] = solar;
          s.baseKw[k] = baseKw;
          s.plugKw[k] = plugKw;
          s.lightingKw[k] = lightingKw;
          s.hvacKw[k] = hvacKw;
          s.hvacKwNominal[k] = hvacKwNominal;
          s.hvacKwActual[k] = hvacKwActual;
          s.effectiveCop[k] = effectiveCop;
          s.loadKw[k] = loadTotal;
          s.tIn[k] = currentTin;
          s.tTarget[k] = tTarget;
          s.hvacU[k] = u;
          s.co2Ppm[k] = currentCo2;
          s.ventAirflowLps[k] = ventAirflowLps;
          s.airflowLps[k] = ventAirflowLps;
          s.airflowDesignLps[k] = qDesignLps;
          s.lightingFraction[k] = deliveredLightingFraction;
          s.battChargeKw[k] = charge;
          s.battDischargeKw[k] = dischargeLocal;
          s.battSocKwh[k] = currentSoc;
          s.gridPointLocalKw[k] = gpl;
        }
      }

      // 6. Market clearing for network modes
      let stepTrades: Trade[] = [];
      let extraDischargeKw: Record<string, number> = {};
      let soldFromExportKw: Record<string, number> = {};
      let boughtKw: Record<string, number> = {};

      for (const b of buildings) {
        extraDischargeKw[b.id] = 0;
        soldFromExportKw[b.id] = 0;
        boughtKw[b.id] = 0;
      }

      if (mode === 'network' || mode === 'network_dr') {
        const marketResult = runMarketStep(
          k,
          buildings,
          gridPointLocalKw,
          dischargeLocalKw,
          socState,
          period,
          tariff,
          isDrActiveNow
        );

        stepTrades = marketResult.trades;
        extraDischargeKw = marketResult.buildingExtraDischargeKw;
        soldFromExportKw = marketResult.buildingSoldFromExportKw;
        boughtKw = marketResult.buildingBoughtKw;

        for (const b of buildings) {
          socState[b.id] = marketResult.updatedSocKwh[b.id];
        }

        if (recordResults) {
          allTrades.push(...stepTrades);
          allOrderBooks.push(marketResult.orderBook);
          marketVolumeKw[k] = marketResult.volumeKw;
          marketVwap[k] = marketResult.vwapInrKwh;
        }
      }

      // Finalize physicalGrid, billedGrid, stepCost
      if (recordResults) {
        for (const b of buildings) {
          const s = seriesRecord[b.id];
          const gpl = gridPointLocalKw[b.id];
          const extraDis = extraDischargeKw[b.id];
          const soldExp = soldFromExportKw[b.id];
          const bought = boughtKw[b.id];

          const physical = gpl - extraDis;
          const billed = gpl - bought + soldExp;
          const totalDischarge = dischargeLocalKw[b.id] + extraDis;

          s.physicalGridKw[k] = physical;
          s.billedGridKw[k] = billed;
          s.battDischargeKw[k] = totalDischarge;
          s.soldKw[k] = soldExp + extraDis;
          s.boughtKw[k] = bought;

          const costRes = computeStepCost(billed, tariff, totalDischarge, stepTrades, b.id);
          s.stepCostInr[k] = costRes.netStepCost;
        }
      }
    }

    return { seriesRecord, allTrades, allOrderBooks, marketVolumeKw, marketVwap };
  }

  // Pass 1: Warm-up
  runPass(false);

  // Pass 2: Exact recorded run starting from pass 1 end states
  const { seriesRecord, allTrades, allOrderBooks, marketVolumeKw, marketVwap } = runPass(true);

  // 5. Evaluate DR if network_dr mode
  let drResult = undefined;
  if (isDrMode && scenario.drEvent) {
    let refSeries = refNetworkSeries;
    if (!refSeries) {
      const refRun = simulate({
        buildings,
        scenario,
        mode: 'network',
        autopilot,
        seed,
        features,
      });
      refSeries = refRun.buildings;
    }
    drResult = evaluateDrEvent(scenario.drEvent, buildings, refSeries, seriesRecord);
  }

  // 6. Tariffs & Emissions arrays
  const tariffInrKwh = Array.from({ length: STEPS_PER_DAY }, (_, k) => tariffAt(k).inrPerKwh);
  const tariffPeriod = Array.from({ length: STEPS_PER_DAY }, (_, k) => tariffAt(k).period);

  const { efKgPerKwh, clusterEmissionsKg, buildingEmissionsGrossKg } = computeEmissions(
    buildings,
    seriesRecord
  );

  // 7. Costs and Totals
  const { buildingTotals, clusterTotals } = computeTotals(
    buildings,
    seriesRecord,
    tariffInrKwh,
    allTrades,
    drResult ? drResult.feeInr : 0
  );

  clusterTotals.emissionsKg = clusterEmissionsKg;

  // 8. Comfort & IAQ evaluations per building
  let sumComfort = 0;
  let worstComfort = 100;
  let sumIaq = 0;
  let worstIaq = 100;
  let minClusterLighting = 1.0;

  for (const b of buildings) {
    const s = seriesRecord[b.id];
    const comfort = evaluateComfort(s.tIn, s.occ, b.comfortMin, b.comfortMax);
    const iaq = evaluateIaqSeries(s.co2Ppm, s.occ);

    // Calculate hours outside band while occupied
    let hoursOutsideBand = 0;
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      if (s.occ[k] >= OCC_THRESHOLD) {
        if (s.tIn[k] < b.comfortMin - 1e-4 || s.tIn[k] > b.comfortMax + 1e-4) {
          hoursOutsideBand += DT_H;
        }
      }
    }

    const bTotal = buildingTotals[b.id];
    bTotal.comfortPct = comfort.comfortPct;
    bTotal.violationSteps = comfort.violationSteps;
    bTotal.maxExceedanceC = comfort.maxExceedanceC;
    bTotal.hoursOutsideBandOccupied = hoursOutsideBand;

    bTotal.iaqPct = iaq.iaqPct;
    bTotal.peakCo2Ppm = iaq.peakCo2Ppm;
    bTotal.co2ExceedSteps = iaq.co2ExceedSteps;

    bTotal.minLightingFraction = isOptimizedMode && features.lightingDim ? 0.75 : 1.0;
    if (bTotal.minLightingFraction < minClusterLighting) {
      minClusterLighting = bTotal.minLightingFraction;
    }

    bTotal.emissionsGrossKg = buildingEmissionsGrossKg[b.id];

    // Energy-intensity metrics (Patch 1 P2.1)
    bTotal.kWhDay = bTotal.totalKwh;
    bTotal.euiDay = bTotal.totalKwh / b.areaM2;
    bTotal.euiAnnual = (bTotal.totalKwh * 365) / b.areaM2; // base single-day proxy, refined in annualize.ts

    sumComfort += comfort.comfortPct;
    if (comfort.comfortPct < worstComfort) {
      worstComfort = comfort.comfortPct;
    }

    sumIaq += iaq.iaqPct;
    if (iaq.iaqPct < worstIaq) {
      worstIaq = iaq.iaqPct;
    }
  }

  clusterTotals.worstComfortPct = worstComfort;
  clusterTotals.avgComfortPct = sumComfort / buildings.length;
  clusterTotals.worstIaqPct = worstIaq;
  clusterTotals.avgIaqPct = sumIaq / buildings.length;
  clusterTotals.minClusterLightingFraction = minClusterLighting;

  const totalClusterArea = buildings.reduce((acc, b) => acc + b.areaM2, 0);
  clusterTotals.kWhDay = clusterTotals.totalKwh;
  clusterTotals.euiDay = totalClusterArea > 0 ? clusterTotals.totalKwh / totalClusterArea : 0;
  clusterTotals.euiAnnual = (clusterTotals.kWhDay * 365) / totalClusterArea;

  // Compute deterministic hash from critical series
  let hashContent = `${mode}:${scenario.id}:${seed}:${JSON.stringify(features)}`;
  for (const b of buildings) {
    const s = seriesRecord[b.id];
    hashContent += `|${b.id}:${s.physicalGridKw[10].toFixed(4)}:${s.billedGridKw[50].toFixed(4)}:${s.tIn[70].toFixed(4)}:${s.co2Ppm[60].toFixed(1)}`;
  }
  hashContent += `|vol:${marketVolumeKw.reduce((a, b) => a + b, 0).toFixed(2)}`;
  const hash = fnv1aHash(hashContent);

  // Compute FDD results per building (Patch 1 P4)
  const fddResults: Record<string, FddResult> = {};
  for (const b of buildings) {
    const s = seriesRecord[b.id];
    const faultStart = scenario.fault?.buildingId === b.id ? scenario.fault.faultStartStep : 40;
    fddResults[b.id] = runFaultDetector(
      b.id,
      s.hvacKwNominal,
      s.hvacKwActual,
      b.hvacRatedKw,
      faultStart
    );
  }

  return {
    mode,
    scenarioId: scenario.id,
    seed,
    hash,
    features,
    buildings: seriesRecord,
    tariffInrKwh,
    tariffPeriod,
    efKgPerKwh,
    trades: allTrades,
    orderBook: allOrderBooks,
    marketVolumeKw,
    marketVwap,
    dr: drResult,
    fdd: fddResults,
    buildingTotals,
    clusterTotals,
  };
}

const multiRunCache = new Map<string, MultiRunResult>();

export function runAll(
  scenario = SCENARIOS.hot_weekday,
  autopilot = { wComfort: 1 / 3, wCost: 1 / 3, wCarbon: 1 / 3 },
  buildings = DEFAULT_BUILDINGS,
  seed = SEED,
  features = DEFAULT_FEATURES
): MultiRunResult {
  const cacheKey = `${scenario.id}:${seed}:${autopilot.wComfort.toFixed(4)}:${autopilot.wCost.toFixed(4)}:${autopilot.wCarbon.toFixed(4)}:${buildings.map((b) => b.id).join(',')}:${scenario.drEvent ? `${scenario.drEvent.startStep}-${scenario.drEvent.endStep}-${scenario.drEvent.requestKw}` : 'nodr'}:${scenario.fault ? `${scenario.fault.buildingId}-${scenario.fault.faultStartStep}` : 'nofault'}:${JSON.stringify(features)}`;

  const cached = multiRunCache.get(cacheKey);
  if (cached) return cached;

  const baseline = simulate({ buildings, scenario, mode: 'baseline', autopilot, seed });
  const building = simulate({ buildings, scenario, mode: 'building', autopilot, seed, features });
  const network = simulate({ buildings, scenario, mode: 'network', autopilot, seed, features });

  let network_dr: RunResult | undefined = undefined;
  if (scenario.drEvent) {
    network_dr = simulate(
      { buildings, scenario, mode: 'network_dr', autopilot, seed, features },
      network.buildings
    );
  }

  // Populate relative reduction percentages against baseline
  const calcReductions = (targetRun: RunResult) => {
    const baseKwh = baseline.clusterTotals.totalKwh;
    const baseCost = baseline.clusterTotals.totalCostInr;
    const basePeak = baseline.clusterTotals.peakKw;

    targetRun.clusterTotals.energyReductionPct =
      baseKwh > 0 ? ((baseKwh - targetRun.clusterTotals.totalKwh) / baseKwh) * 100 : 0;
    targetRun.clusterTotals.costReductionPct =
      baseCost > 0 ? ((baseCost - targetRun.clusterTotals.totalCostInr) / baseCost) * 100 : 0;
    targetRun.clusterTotals.peakReductionPct =
      basePeak > 0 ? ((basePeak - targetRun.clusterTotals.peakKw) / basePeak) * 100 : 0;

    for (const b of buildings) {
      const bBase = baseline.buildingTotals[b.id];
      const bTarg = targetRun.buildingTotals[b.id];
      bTarg.energyReductionPct =
        bBase.totalKwh > 0 ? ((bBase.totalKwh - bTarg.totalKwh) / bBase.totalKwh) * 100 : 0;
      bTarg.costReductionPct =
        bBase.totalCostInr > 0 ? ((bBase.totalCostInr - bTarg.totalCostInr) / bBase.totalCostInr) * 100 : 0;
      bTarg.peakReductionPct =
        bBase.peakKw > 0 ? ((bBase.peakKw - bTarg.peakKw) / bBase.peakKw) * 100 : 0;
    }
  };

  calcReductions(building);
  calcReductions(network);
  if (network_dr) calcReductions(network_dr);

  // Calculate treeDays avoided vs baseline
  const avoidedBaselineKg = Math.max(0, baseline.clusterTotals.emissionsKg - network.clusterTotals.emissionsKg);
  network.clusterTotals.treeDays = computeTreeDays(avoidedBaselineKg);
  building.clusterTotals.treeDays = computeTreeDays(
    Math.max(0, baseline.clusterTotals.emissionsKg - building.clusterTotals.emissionsKg)
  );

  const result: MultiRunResult = { baseline, building, network, network_dr };
  multiRunCache.set(cacheKey, result);
  return result;
}
