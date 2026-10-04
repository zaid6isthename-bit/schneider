import {
  BuildingDef,
  BuildingSeries,
  BuildingTotals,
  ClusterTotals,
  Trade,
} from './types';
import {
  DEMAND_CHARGE,
  DT_H,
  FEED_IN,
  PLATFORM_FEE,
  STEPS_PER_DAY,
  WHEELING,
} from './constants';

export interface StepCostResult {
  importCost: number;
  exportCredit: number;
  p2pBuyCost: number;
  p2pSellRev: number;
  battDegrCost: number;
  netStepCost: number;
}

export function computeStepCost(
  billedGridKw: number,
  tariffInrKwh: number,
  dischargedKw: number, // total battery discharge in this step (local + extra)
  stepTrades: Trade[],
  buildingId: string
): StepCostResult {
  const billedImportKw = Math.max(0, billedGridKw);
  const billedExportKw = Math.max(0, -billedGridKw);

  const importCost = billedImportKw * DT_H * tariffInrKwh;
  const exportCredit = billedExportKw * DT_H * FEED_IN;

  let p2pBuyCost = 0;
  let p2pSellRev = 0;

  for (const t of stepTrades) {
    if (t.buyerId === buildingId) {
      const allInRate = t.priceInrKwh + PLATFORM_FEE + WHEELING;
      p2pBuyCost += t.kw * DT_H * allInRate;
    }
    if (t.sellerId === buildingId) {
      p2pSellRev += t.kw * DT_H * t.priceInrKwh;
    }
  }

  // Battery degradation: dischargedKwh * BATT_DEGRADATION
  const battDegrCost = dischargedKw * DT_H * 1.0; // BATT_DEGRADATION = 1.0

  const netStepCost = importCost - exportCredit + p2pBuyCost - p2pSellRev + battDegrCost;

  return {
    importCost,
    exportCredit,
    p2pBuyCost,
    p2pSellRev,
    battDegrCost,
    netStepCost,
  };
}

export function computeTotals(
  buildings: BuildingDef[],
  seriesRecord: Record<string, BuildingSeries>,
  tariffInrKwh: number[],
  trades: Trade[],
  drFeeInr = 0
): {
  buildingTotals: Record<string, BuildingTotals>;
  clusterTotals: ClusterTotals;
} {
  const buildingTotals: Record<string, BuildingTotals> = {};

  let clusterTotalKwh = 0;
  let clusterSolarKwh = 0;
  let clusterImportKwh = 0;
  let clusterExportKwh = 0;
  let clusterNetBilledKwh = 0;
  let clusterEnergyCostInr = 0;
  let clusterDemandChargeInr = 0;
  let clusterTotalCostInr = 0;
  let clusterPeakKw = 0;
  let totalP2pTradedKwh = 0;
  let totalP2pSavingsInr = 0;
  let platformFeeInr = drFeeInr;

  // Track trade metrics per building
  const buildingP2pBoughtKwh: Record<string, number> = {};
  const buildingP2pSoldKwh: Record<string, number> = {};
  const buildingP2pNetBenefitInr: Record<string, number> = {};

  for (const b of buildings) {
    buildingP2pBoughtKwh[b.id] = 0;
    buildingP2pSoldKwh[b.id] = 0;
    buildingP2pNetBenefitInr[b.id] = 0;
  }

  for (const t of trades) {
    const kwh = t.kw * DT_H;
    const tariff = tariffInrKwh[t.step];
    totalP2pTradedKwh += kwh;
    platformFeeInr += kwh * PLATFORM_FEE;

    // Buyer savings: had they bought from grid, would have paid tariff.
    // Instead they paid price + fee + wheeling.
    const buyerSavingPerKwh = tariff - (t.priceInrKwh + PLATFORM_FEE + WHEELING);
    const buyerSavingInr = kwh * buyerSavingPerKwh;

    // Seller benefit:
    // If export, premium over FEED_IN = price - FEED_IN.
    // If battery, margin over (offpeak/RTE + degr)
    const sellerPremiumPerKwh =
      t.source === 'export' ? t.priceInrKwh - FEED_IN : t.priceInrKwh - (6.0 / 0.9 + 1.0);
    const sellerBenefitInr = kwh * sellerPremiumPerKwh;

    buildingP2pBoughtKwh[t.buyerId] += kwh;
    buildingP2pSoldKwh[t.sellerId] += kwh;

    buildingP2pNetBenefitInr[t.buyerId] += buyerSavingInr;
    buildingP2pNetBenefitInr[t.sellerId] += sellerBenefitInr;

    totalP2pSavingsInr += buyerSavingInr + sellerBenefitInr;
  }

  // Precompute cluster peak kw from sum of billed imports across buildings
  const clusterImportSeries = new Array(STEPS_PER_DAY).fill(0);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    let stepImport = 0;
    for (const b of buildings) {
      stepImport += Math.max(0, seriesRecord[b.id].billedGridKw[k]);
    }
    clusterImportSeries[k] = stepImport;
    if (stepImport > clusterPeakKw) {
      clusterPeakKw = stepImport;
    }
  }

  let comfortSum = 0;
  let worstComfortPct = 100;

  for (const b of buildings) {
    const s = seriesRecord[b.id];
    let totalKwh = 0;
    let solarKwh = 0;
    let importKwh = 0;
    let exportKwh = 0;
    let stepCostInrSum = 0;
    let maxBilledImportKw = 0;

    for (let k = 0; k < STEPS_PER_DAY; k++) {
      totalKwh += s.loadKw[k] * DT_H;
      solarKwh += s.solarKw[k] * DT_H;

      const billedImport = Math.max(0, s.billedGridKw[k]);
      const billedExport = Math.max(0, -s.billedGridKw[k]);

      importKwh += billedImport * DT_H;
      exportKwh += billedExport * DT_H;
      stepCostInrSum += s.stepCostInr[k];

      if (billedImport > maxBilledImportKw) {
        maxBilledImportKw = billedImport;
      }
    }

    const demandChargeInr = maxBilledImportKw * (DEMAND_CHARGE / 30.0);
    const totalCostInr = stepCostInrSum + demandChargeInr;
    const netBilledKwh = importKwh - exportKwh;

    buildingTotals[b.id] = {
      kWhDay: totalKwh,
      euiDay: totalKwh / b.areaM2,
      euiAnnual: (totalKwh * 365) / b.areaM2,
      energyReductionPct: 0,
      costReductionPct: 0,
      peakReductionPct: 0,
      totalKwh,
      solarKwh,
      importKwh,
      exportKwh,
      netBilledKwh,
      stepCostInr: stepCostInrSum,
      demandChargeInr,
      totalCostInr,
      peakKw: maxBilledImportKw,
      emissionsGrossKg: 0, // populated by carbon.ts
      comfortPct: 100, // populated by thermal.ts evaluation
      violationSteps: 0,
      maxExceedanceC: 0,
      hoursOutsideBandOccupied: 0,
      iaqPct: 100,
      peakCo2Ppm: 420,
      co2ExceedSteps: 0,
      minLightingFraction: 1.0,
      p2pBoughtKwh: buildingP2pBoughtKwh[b.id],
      p2pSoldKwh: buildingP2pSoldKwh[b.id],
      p2pNetBenefitInr: buildingP2pNetBenefitInr[b.id],
    };

    clusterTotalKwh += totalKwh;
    clusterSolarKwh += solarKwh;
    clusterImportKwh += importKwh;
    clusterExportKwh += exportKwh;
    clusterNetBilledKwh += netBilledKwh;
    clusterEnergyCostInr += stepCostInrSum;
    clusterDemandChargeInr += demandChargeInr;
    clusterTotalCostInr += totalCostInr;
  }

  const clusterTotals: ClusterTotals = {
    kWhDay: clusterTotalKwh,
    euiDay: 0,
    euiAnnual: 0,
    energyReductionPct: 0,
    costReductionPct: 0,
    peakReductionPct: 0,
    totalKwh: clusterTotalKwh,
    solarKwh: clusterSolarKwh,
    importKwh: clusterImportKwh,
    exportKwh: clusterExportKwh,
    netBilledKwh: clusterNetBilledKwh,
    energyCostInr: clusterEnergyCostInr,
    demandChargeInr: clusterDemandChargeInr,
    totalCostInr: clusterTotalCostInr,
    peakKw: clusterPeakKw,
    emissionsKg: 0, // populated by carbon.ts
    treeDays: 0,
    worstComfortPct: 100,
    avgComfortPct: 100,
    worstIaqPct: 100,
    avgIaqPct: 100,
    minClusterLightingFraction: 1.0,
    totalP2pTradedKwh,
    totalP2pSavingsInr,
    platformFeeInr,
  };

  return { buildingTotals, clusterTotals };
}
