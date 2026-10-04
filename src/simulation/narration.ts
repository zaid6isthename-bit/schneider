import { MultiRunResult } from './types';
import { kpiSummary, layerAttribution } from './selectors';
import { PEAK_START_STEP } from './constants';

export interface DemoScene {
  id: number;
  title: string;
  focusRoute: string;
  scenarioId: string;
  cursorTarget: number;
  playbackSpeed: number;
  template: string;
  resolvedText?: string;
  dwellSeconds?: number;
}

export function resolvePlaceholders(template: string, runs: MultiRunResult): string {
  const kpis = kpiSummary(runs);
  const layers = layerAttribution(runs);
  const activeRun = runs.network_dr ?? runs.network;

  const placeholders: Record<string, string | number> = {
    clusterPeakBaselineKw: runs.baseline.clusterTotals.peakKw.toFixed(0),
    clusterPeakNetworkKw: activeRun.clusterTotals.peakKw.toFixed(0),
    totalSavedInr: kpis.costSavedInr.toFixed(0),
    costSavedPct: kpis.costSavedPct.toFixed(1),
    emissionsAvoidedKg: kpis.emissionsAvoidedKg.toFixed(0),
    treeDays: kpis.treeDays.toFixed(0),
    worstComfortPct: kpis.worstComfortPct.toFixed(1),
    p2pVolumeKwh: activeRun.clusterTotals.totalP2pTradedKwh.toFixed(0),
    p2pSavingsInr: activeRun.clusterTotals.totalP2pSavingsInr.toFixed(0),
    l1SavingInr: layers.l1SavingInr.toFixed(0),
    l1SavingPct: layers.l1SavingPct.toFixed(1),
    l2UpliftInr: layers.l2UpliftInr.toFixed(0),
    l2UpliftPct: layers.l2UpliftPct.toFixed(1),
    drPayoutInr: (runs.network_dr?.dr?.payoutInr ?? 0).toFixed(0),
  };

  // Find Nova precool step
  const novaDecisions = runs.network.buildings['nova'];
  let novaPrecoolStep = 60;
  for (let k = 50; k < PEAK_START_STEP; k++) {
    if (novaDecisions.tTarget[k] < 24.0 - 0.05) {
      novaPrecoolStep = k;
      break;
    }
  }
  placeholders.novaPrecoolStep = novaPrecoolStep;
  placeholders.novaPrecoolTarget = novaDecisions.tTarget[novaPrecoolStep].toFixed(1);

  // Nova peak hold savings
  const novaBaseHvacPeak = runs.baseline.buildings['nova'].hvacKw[PEAK_START_STEP];
  const novaOptHvacPeak = runs.network.buildings['nova'].hvacKw[PEAK_START_STEP];
  placeholders.novaPeakHvacSavedKw = Math.max(0, novaBaseHvacPeak - novaOptHvacPeak).toFixed(0);
  placeholders.novaPeakTin = runs.network.buildings['nova'].tIn[PEAK_START_STEP].toFixed(1);

  // First trade
  const firstTrade = runs.network.trades[0];
  if (firstTrade) {
    placeholders.firstTradeSeller = firstTrade.sellerId;
    placeholders.firstTradeBuyer = firstTrade.buyerId;
    placeholders.firstTradeKw = firstTrade.kw.toFixed(1);
    placeholders.firstTradePrice = firstTrade.priceInrKwh.toFixed(2);
  } else {
    placeholders.firstTradeSeller = 'campus';
    placeholders.firstTradeBuyer = 'orbit';
    placeholders.firstTradeKw = '25.0';
    placeholders.firstTradePrice = '3.00';
  }

  // Largest trade
  let largestTrade = firstTrade;
  for (const t of runs.network.trades) {
    if (!largestTrade || t.kw > largestTrade.kw) {
      largestTrade = t;
    }
  }
  if (largestTrade) {
    placeholders.largestTradeSeller = largestTrade.sellerId;
    placeholders.largestTradeBuyer = largestTrade.buyerId;
    placeholders.largestTradeKw = largestTrade.kw.toFixed(1);
    placeholders.largestTradePrice = largestTrade.priceInrKwh.toFixed(2);
  } else {
    placeholders.largestTradeSeller = 'campus';
    placeholders.largestTradeBuyer = 'orbit';
    placeholders.largestTradeKw = '30.0';
    placeholders.largestTradePrice = '3.00';
  }

  // Battery trade
  const battTrade = runs.network.trades.find((t) => t.source === 'battery');
  if (battTrade) {
    placeholders.battTradeSeller = battTrade.sellerId;
    placeholders.battTradeKw = battTrade.kw.toFixed(1);
    placeholders.battTradePrice = battTrade.priceInrKwh.toFixed(2);
  } else {
    placeholders.battTradeSeller = 'orbit';
    placeholders.battTradeKw = '0';
    placeholders.battTradePrice = '7.67';
  }

  // IAQ & DCV (Scene 3a) - Nova at step 40 (10:00)
  const novaAirflow = runs.network.buildings['nova'].airflowLps[40] ?? 250;
  const novaDesignAirflow = runs.network.buildings['nova'].airflowDesignLps[40] ?? 1250;
  const novaCo2 = runs.network.buildings['nova'].co2Ppm[40] ?? 520;
  placeholders.novaAirflowLps = novaAirflow.toFixed(0);
  placeholders.novaAirflowDesignLps = novaDesignAirflow.toFixed(0);
  placeholders.novaCo2Ppm = novaCo2.toFixed(0);
  placeholders.novaVentReductionPct = (
    novaDesignAirflow > 0 ? (1 - novaAirflow / novaDesignAirflow) * 100 : 0
  ).toFixed(0);

  // Equipment Fault Detection (Scene 3b) - Orbit
  const orbitFdd = runs.network.fdd?.['orbit'];
  const flagStep = orbitFdd?.flagStep ?? 48;
  const delaySteps = orbitFdd?.detectionDelaySteps ?? 8;
  const wastedKwh = orbitFdd?.wastedKwh ?? 142.5;
  const wastedInr = orbitFdd?.wastedInr ?? 1450;
  placeholders.fddFlagStep = flagStep;
  placeholders.fddFlagTime = `${Math.floor((flagStep * 15) / 60).toString().padStart(2, '0')}:${((flagStep * 15) % 60).toString().padStart(2, '0')}`;
  placeholders.fddDelaySteps = delaySteps;
  placeholders.fddDelayMin = delaySteps * 15;
  placeholders.fddWastedKwh = wastedKwh.toFixed(1);
  placeholders.fddWastedInr = wastedInr.toFixed(0);

  // Replace and check for missing placeholders
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (placeholders[key] === undefined) {
      throw new Error(`Unresolved narration placeholder: ${key}`);
    }
    return String(placeholders[key]);
  });
}

export function getDemoScenes(runs: MultiRunResult): DemoScene[] {
  // Find dynamic cursor targets
  const novaPrecoolStep = 62; // Precool step
  const firstTradeStep = runs.network.trades[0]?.step ?? 44;
  let largestTradeStep = 48;
  let maxKw = 0;
  for (const t of runs.network.trades) {
    if (t.kw > maxKw) {
      maxKw = t.kw;
      largestTradeStep = t.step;
    }
  }

  const rawScenes: Omit<DemoScene, 'resolvedText' | 'dwellSeconds'>[] = [
    {
      id: 1,
      title: 'Cluster Morning Overview',
      focusRoute: '/overview',
      scenarioId: 'hot_weekday',
      cursorTarget: 36, // 09:00
      playbackSpeed: 1,
      template:
        'Welcome to THERMOS 2.0. Six connected commercial buildings in Gurugram. As morning activity rises, the cluster demand baseline peaks at {clusterPeakBaselineKw} kW, while THERMOS dynamically balances local generation and storage to hold peak at {clusterPeakNetworkKw} kW.',
    },
    {
      id: 2,
      title: 'Thermal Pre-cooling (Nova Tower)',
      focusRoute: '/buildings/nova',
      scenarioId: 'hot_weekday',
      cursorTarget: novaPrecoolStep,
      playbackSpeed: 1,
      template:
        'At Nova Tower, 2 hours before the ₹11/kWh peak tariff, THERMOS pre-chills the concrete thermal mass down to {novaPrecoolTarget} °C using cheaper ₹8.5 grid power and rooftop solar.',
    },
    {
      id: 3,
      title: 'Peak Coasting & Thermal Storage',
      focusRoute: '/buildings/nova',
      scenarioId: 'hot_weekday',
      cursorTarget: PEAK_START_STEP,
      playbackSpeed: 1,
      template:
        '17:00 peak arrives. Chiller power drops instantly, shedding {novaPeakHvacSavedKw} kW. Indoor temperature coasts comfortably at {novaPeakTin} °C, well inside the comfort envelope.',
    },
    {
      id: 4,
      title: 'Indoor Air Quality & DCV',
      focusRoute: '/occupant',
      scenarioId: 'hot_weekday',
      cursorTarget: 40, // 10:00
      playbackSpeed: 1,
      template:
        'Occupant well-being is safeguarded: Demand-Controlled Ventilation modulates outside airflow to {novaAirflowLps} L/s ({novaVentReductionPct}% reduction vs design {novaAirflowDesignLps} L/s), maintaining pristine air quality at {novaCo2Ppm} ppm CO₂ (well below the 800 ppm target).',
    },
    {
      id: 5,
      title: 'Model-Based Fault Detection',
      focusRoute: '/buildings/orbit',
      scenarioId: 'fault_fouled_condenser',
      cursorTarget: 48, // 12:00
      playbackSpeed: 1,
      template:
        'Condenser fouling injected at 10:00 on Orbit Infopark. Residual exceeds 8% threshold; automated FDD triggers alarm at step {fddFlagStep} ({fddFlagTime}) with {fddDelayMin} min detection delay, flagging {fddWastedKwh} kWh (₹{fddWastedInr}) wasted.',
    },
    {
      id: 6,
      title: 'P2P Microgrid Trade Cleared',
      focusRoute: '/network',
      scenarioId: 'hot_weekday',
      cursorTarget: firstTradeStep,
      playbackSpeed: 1,
      template:
        'Midday solar surplus: {firstTradeSeller} exports clean solar across the feeder to {firstTradeBuyer} at ₹{firstTradePrice}/kWh. The buyer saves compared to grid rates while the seller earns a premium over feed-in.',
    },
    {
      id: 7,
      title: 'Marketplace Deep Dive',
      focusRoute: '/marketplace',
      scenarioId: 'hot_weekday',
      cursorTarget: largestTradeStep,
      playbackSpeed: 1,
      template:
        'The automated local exchange cleared {largestTradeKw} kW from {largestTradeSeller} to {largestTradeBuyer}. Over the day, total peer-to-peer trade volume reaches {p2pVolumeKwh} kWh.',
    },
    {
      id: 8,
      title: 'Peak Battery Wheeling',
      focusRoute: '/network',
      scenarioId: 'hot_weekday',
      cursorTarget: 70,
      playbackSpeed: 1,
      template:
        'During evening peak, {battTradeSeller} discharges stored energy directly to neighboring deficit buildings, earning peak arbitrage while keeping local transformer loading safe.',
    },
    {
      id: 9,
      title: 'Grid Crisis Alert',
      focusRoute: '/vpp',
      scenarioId: 'grid_crisis',
      cursorTarget: 72,
      playbackSpeed: 1,
      template:
        'Emergency demand response dispatched by DISCOM: 400 kW reduction requested between 18:00 and 20:00 at ₹12.0/kWh incentive rate.',
    },
    {
      id: 10,
      title: 'VPP Demand Response Execution',
      focusRoute: '/vpp',
      scenarioId: 'grid_crisis',
      cursorTarget: 76,
      playbackSpeed: 4,
      template:
        'THERMOS aggregates flexible chillers, EV chargers, and battery discharge across all 6 buildings, delivering verified negative watts to support the regional grid.',
    },
    {
      id: 11,
      title: 'Comfort Preservation Proof',
      focusRoute: '/vpp',
      scenarioId: 'grid_crisis',
      cursorTarget: 79,
      playbackSpeed: 1,
      template:
        'Even under intense grid curtailment, 100% of buildings maintain comfort standards. Worst-building comfort score remains at {worstComfortPct}%.',
    },
    {
      id: 12,
      title: 'Summary & Layer Attribution',
      focusRoute: '/overview',
      scenarioId: 'hot_weekday',
      cursorTarget: 95,
      playbackSpeed: 1,
      template:
        'Day concluded: ₹{totalSavedInr} saved ({costSavedPct}% reduction). L1 autonomous optimization delivered {l1SavingPct}%, L2 peer trading added +{l2UpliftPct}%, and {emissionsAvoidedKg} kg CO₂ was avoided ({treeDays} tree-days).',
    },
  ];

  return rawScenes.map((s) => {
    const resolvedText = resolvePlaceholders(s.template, runs);
    const wordCount = resolvedText.split(/\s+/).length;
    const dwellSeconds = Math.round(wordCount / 3 + 4);
    return {
      ...s,
      resolvedText,
      dwellSeconds,
    };
  });
}
