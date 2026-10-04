import { BuildingDef, OrderBookStep, TariffPeriod, Trade } from './types';
import {
  BATT_ASK_NETWORK,
  BATT_ETA_DIS,
  BUYER_MARGIN,
  DT_H,
  MIN_TRADE_KW,
  PLATFORM_FEE,
  SELLER_SOLAR_ASK,
  WHEELING,
} from './constants';
import { getBatteryBounds } from './battery';

export interface MarketSellerOffer {
  buildingId: string;
  kw: number;
  remainingKw: number;
  askInrKwh: number;
  source: 'export' | 'battery';
}

export interface MarketBuyerRequest {
  buildingId: string;
  kw: number;
  remainingKw: number;
  bidMaxInrKwh: number;
}

export interface MarketStepResult {
  trades: Trade[];
  orderBook: OrderBookStep;
  volumeKw: number;
  vwapInrKwh: number | null;
  buildingExtraDischargeKw: Record<string, number>;
  buildingSoldFromExportKw: Record<string, number>;
  buildingBoughtKw: Record<string, number>;
  updatedSocKwh: Record<string, number>;
}

export function runMarketStep(
  step: number,
  buildings: BuildingDef[],
  gridPointLocalKw: Record<string, number>,
  dischargeLocalKw: Record<string, number>,
  socKwh: Record<string, number>,
  period: TariffPeriod,
  gridTariffInrKwh: number,
  isDrActive: boolean
): MarketStepResult {
  const sellOffers: MarketSellerOffer[] = [];
  const buyRequests: MarketBuyerRequest[] = [];

  const bidMax = gridTariffInrKwh - PLATFORM_FEE - WHEELING - BUYER_MARGIN;

  for (const b of buildings) {
    const gpl = gridPointLocalKw[b.id];

    // 1. Export seller
    if (gpl < -1e-6) {
      const exportKw = -gpl;
      if (exportKw >= MIN_TRADE_KW) {
        sellOffers.push({
          buildingId: b.id,
          kw: exportKw,
          remainingKw: exportKw,
          askInrKwh: SELLER_SOLAR_ASK,
          source: 'export',
        });
      }
    }

    // 2. Battery seller
    if (b.batteryKwh > 0 && b.batteryKw > 0 && gpl <= 1e-6 && (period === 'peak' || isDrActive)) {
      const { floorKwh } = getBatteryBounds(b);
      const currSoc = socKwh[b.id] ?? 0;
      const localDis = dischargeLocalKw[b.id] ?? 0;

      const powerHeadroom = b.batteryKw - localDis;
      const energyDeliverableKw = ((currSoc - floorKwh) * BATT_ETA_DIS) / DT_H - localDis;
      const spare = Math.max(0, Math.min(powerHeadroom, energyDeliverableKw));

      if (spare >= MIN_TRADE_KW) {
        sellOffers.push({
          buildingId: b.id,
          kw: spare,
          remainingKw: spare,
          askInrKwh: BATT_ASK_NETWORK,
          source: 'battery',
        });
      }
    }

    // 3. Buyer
    if (gpl > 1e-6) {
      const demandKw = gpl;
      if (demandKw >= MIN_TRADE_KW && bidMax > 0) {
        buyRequests.push({
          buildingId: b.id,
          kw: demandKw,
          remainingKw: demandKw,
          bidMaxInrKwh: bidMax,
        });
      }
    }
  }

  // Pre-match snapshot for Order Book display
  const orderBook: OrderBookStep = {
    step,
    sellOffers: sellOffers.map((s) => ({
      buildingId: s.buildingId,
      kw: s.kw,
      askInrKwh: s.askInrKwh,
      source: s.source,
    })),
    buyRequests: buyRequests.map((b) => ({
      buildingId: b.buildingId,
      kw: b.kw,
      bidMaxInrKwh: b.bidMaxInrKwh,
      gridTariffInrKwh,
    })),
  };

  // Sort buyers desc by demand (tie: id asc)
  buyRequests.sort((a, b) => b.kw - a.kw || a.buildingId.localeCompare(b.buildingId));

  // Sort sellers asc by ask (tie: id asc)
  sellOffers.sort((a, b) => a.askInrKwh - b.askInrKwh || a.buildingId.localeCompare(b.buildingId));

  const trades: Trade[] = [];
  const buildingExtraDischargeKw: Record<string, number> = {};
  const buildingSoldFromExportKw: Record<string, number> = {};
  const buildingBoughtKw: Record<string, number> = {};
  const updatedSocKwh: Record<string, number> = { ...socKwh };

  for (const b of buildings) {
    buildingExtraDischargeKw[b.id] = 0;
    buildingSoldFromExportKw[b.id] = 0;
    buildingBoughtKw[b.id] = 0;
  }

  for (const buyer of buyRequests) {
    if (buyer.remainingKw < MIN_TRADE_KW) continue;

    for (const seller of sellOffers) {
      if (buyer.remainingKw < MIN_TRADE_KW) break;
      if (seller.remainingKw < MIN_TRADE_KW) continue;
      if (seller.buildingId === buyer.buildingId) continue; // No self-trading

      if (seller.askInrKwh <= buyer.bidMaxInrKwh + 1e-6) {
        const q = Math.min(buyer.remainingKw, seller.remainingKw);
        if (q < MIN_TRADE_KW) continue;

        const price = (seller.askInrKwh + buyer.bidMaxInrKwh) / 2.0;

        trades.push({
          step,
          sellerId: seller.buildingId,
          buyerId: buyer.buildingId,
          kw: q,
          priceInrKwh: price,
          source: seller.source,
        });

        buyer.remainingKw -= q;
        seller.remainingKw -= q;

        buildingBoughtKw[buyer.buildingId] += q;

        if (seller.source === 'export') {
          buildingSoldFromExportKw[seller.buildingId] += q;
        } else {
          buildingExtraDischargeKw[seller.buildingId] += q;
          // Apply battery discharge to SoC: (extraDischarge / η_dis) * DT_H
          updatedSocKwh[seller.buildingId] -= (q / BATT_ETA_DIS) * DT_H;
        }
      }
    }
  }

  let totalVolumeKw = 0;
  let totalValue = 0;
  for (const t of trades) {
    totalVolumeKw += t.kw;
    totalValue += t.kw * t.priceInrKwh;
  }

  const vwapInrKwh = totalVolumeKw > 0 ? totalValue / totalVolumeKw : null;

  return {
    trades,
    orderBook,
    volumeKw: totalVolumeKw,
    vwapInrKwh,
    buildingExtraDischargeKw,
    buildingSoldFromExportKw,
    buildingBoughtKw,
    updatedSocKwh,
  };
}
