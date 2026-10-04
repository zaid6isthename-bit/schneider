import { BuildingDef, TariffPeriod } from './types';
import {
  BATT_CEIL,
  BATT_DEGRADATION,
  BATT_ETA_CH,
  BATT_ETA_DIS,
  BATT_FLOOR_DEFAULT,
  BATT_FLOOR_HOSPITAL,
  BATT_PREPEAK_TARGET,
  DT_H,
  efMultAtHour,
} from './constants';

export interface BatteryDispatchResult {
  chargeKw: number;
  dischargeKw: number;
  socNext: number;
  degradationCostInr: number;
}

export function getBatteryBounds(building: BuildingDef): { floorKwh: number; ceilKwh: number } {
  if (building.batteryKwh <= 0) {
    return { floorKwh: 0, ceilKwh: 0 };
  }
  const floorFrac = building.type === 'hospital' ? BATT_FLOOR_HOSPITAL : BATT_FLOOR_DEFAULT;
  return {
    floorKwh: building.batteryKwh * floorFrac,
    ceilKwh: building.batteryKwh * BATT_CEIL,
  };
}

export function dispatchBatteryBaseline(
  soc: number,
  preKw: number, // load_total - solarKw
  building: BuildingDef
): BatteryDispatchResult {
  if (building.batteryKwh <= 0 || building.batteryKw <= 0) {
    return { chargeKw: 0, dischargeKw: 0, socNext: 0, degradationCostInr: 0 };
  }

  const { floorKwh, ceilKwh } = getBatteryBounds(building);
  let chargeKw = 0;
  let dischargeKw = 0;

  if (preKw < -1e-6) {
    // Surplus solar: preKw < 0 -> surplus = -preKw
    const surplusKw = -preKw;
    const maxChargeBySoc = Math.max(0, (ceilKwh - soc) / (BATT_ETA_CH * DT_H));
    chargeKw = Math.min(surplusKw, building.batteryKw, maxChargeBySoc);
  } else if (preKw > 1e-6) {
    // Deficit: discharge to cover preKw
    const maxDischargeBySoc = Math.max(0, ((soc - floorKwh) * BATT_ETA_DIS) / DT_H);
    dischargeKw = Math.min(preKw, building.batteryKw, maxDischargeBySoc);
  }

  // Update SoC
  const socNext = soc + chargeKw * BATT_ETA_CH * DT_H - (dischargeKw / BATT_ETA_DIS) * DT_H;
  const clampedSocNext = Math.max(floorKwh, Math.min(ceilKwh, socNext));
  const dischargedKwh = dischargeKw * DT_H;
  const degradationCostInr = dischargedKwh * BATT_DEGRADATION;

  return { chargeKw, dischargeKw, socNext: clampedSocNext, degradationCostInr };
}

export function dispatchBatteryOptimizedLocal(
  soc: number,
  preKw: number,
  building: BuildingDef,
  period: TariffPeriod,
  hour: number,
  wCarbon: number,
  isDrActive: boolean
): BatteryDispatchResult {
  if (building.batteryKwh <= 0 || building.batteryKw <= 0) {
    return { chargeKw: 0, dischargeKw: 0, socNext: 0, degradationCostInr: 0 };
  }

  const { floorKwh, ceilKwh } = getBatteryBounds(building);
  let chargeKw = 0;
  let dischargeKw = 0;

  if (preKw < -1e-6) {
    // (a) Charge from surplus first
    const surplusKw = -preKw;
    const maxChargeBySoc = Math.max(0, (ceilKwh - soc) / (BATT_ETA_CH * DT_H));
    chargeKw = Math.min(surplusKw, building.batteryKw, maxChargeBySoc);
  } else if (isDrActive) {
    // DR active: battery discharge = min(power, deliverable, max(0, pre)) regardless of tariff period
    const maxDischargeBySoc = Math.max(0, ((soc - floorKwh) * BATT_ETA_DIS) / DT_H);
    dischargeKw = Math.min(Math.max(0, preKw), building.batteryKw, maxDischargeBySoc);
  } else if (period === 'peak') {
    // (c) Peak period: discharge min(pre, power, deliverable) to offset local import
    if (preKw > 1e-6) {
      const maxDischargeBySoc = Math.max(0, ((soc - floorKwh) * BATT_ETA_DIS) / DT_H);
      dischargeKw = Math.min(preKw, building.batteryKw, maxDischargeBySoc);
    }
  } else if (period === 'offpeak') {
    // (b) Off-peak: grid-charge toward BATT_PREPEAK_TARGET
    const allowGridCharge = wCarbon <= 0.5 || efMultAtHour(hour) <= 0.90;
    if (allowGridCharge) {
      const targetKwh = building.batteryKwh * BATT_PREPEAK_TARGET;
      if (soc < targetKwh) {
        const neededKwh = targetKwh - soc;
        const maxChargeBySoc = Math.max(0, (ceilKwh - soc) / (BATT_ETA_CH * DT_H));
        const desiredChargeKw = neededKwh / (BATT_ETA_CH * DT_H);
        chargeKw = Math.min(desiredChargeKw, building.batteryKw, maxChargeBySoc);
      }
    }
  }
  // (d) Otherwise hold

  const socNext = soc + chargeKw * BATT_ETA_CH * DT_H - (dischargeKw / BATT_ETA_DIS) * DT_H;
  const clampedSocNext = Math.max(floorKwh, Math.min(ceilKwh, socNext));
  const dischargedKwh = dischargeKw * DT_H;
  const degradationCostInr = dischargedKwh * BATT_DEGRADATION;

  return { chargeKw, dischargeKw, socNext: clampedSocNext, degradationCostInr };
}
