import { BuildingDef, FeatureFlags } from './types';
import { DEFAULT_FEATURES, LIGHT_DIM_MAX } from './constants';

export interface NonHvacLoads {
  baseKw: number;
  plugKw: number;
  lightingKw: number;
  deliveredLightingFraction: number;
}

export function computeNonHvacLoads(
  building: BuildingDef,
  occ: number,
  hour: number,
  ghi: number,
  isOptimized: boolean,
  isDrActive: boolean,
  features: FeatureFlags = DEFAULT_FEATURES
): NonHvacLoads {
  const baseKw = building.baseKw;
  const plugKw = building.plugKw * occ;

  // P1: Realistic Baseline Lighting
  if (!isOptimized) {
    let lightingKw = 0;
    if (building.schedule.is24h) {
      lightingKw = building.lightKw * Math.max(occ, 0.5);
    } else {
      const isInsideWindow =
        hour >= building.schedule.startHour && hour < building.schedule.endHour;
      if (isInsideWindow) {
        lightingKw = building.lightKw * Math.max(occ, 0.8);
      } else {
        lightingKw = building.lightKw * 0.15; // security lighting
      }
    }
    return {
      baseKw,
      plugKw,
      lightingKw,
      deliveredLightingFraction: 1.0,
    };
  }

  // Optimized Mode
  let dim = 0;
  if (features.lightingDim) {
    const daylightFrac = building.daylightFraction;
    const ghiFactor = Math.min(1.0, ghi / 600.0);
    dim = LIGHT_DIM_MAX * daylightFrac * ghiFactor;
  }

  let lightingKw = building.lightKw * occ * (1.0 - dim);

  if (isDrActive) {
    // PRD §5.10: extra lighting dim +0.10 (multiplicative on remaining lighting)
    lightingKw *= 0.90;
  }

  const deliveredLightingFraction = Math.max(0.75, 1.0 - dim);

  return {
    baseKw,
    plugKw,
    lightingKw,
    deliveredLightingFraction,
  };
}
