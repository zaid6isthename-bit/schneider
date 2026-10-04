import { BuildingDef, BuildingSeries } from './types';
import {
  DT_H,
  EF_BASE,
  STEPS_PER_DAY,
  TREE_ABSORPTION_DAILY,
  efMultAtHour,
} from './constants';

export function computeEmissions(
  buildings: BuildingDef[],
  seriesRecord: Record<string, BuildingSeries>
): {
  efKgPerKwh: number[];
  clusterEmissionsKg: number;
  buildingEmissionsGrossKg: Record<string, number>;
} {
  const efKgPerKwh: number[] = new Array(STEPS_PER_DAY);
  const buildingEmissionsGrossKg: Record<string, number> = {};

  for (const b of buildings) {
    buildingEmissionsGrossKg[b.id] = 0;
  }

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const hour = k * 0.25;
    efKgPerKwh[k] = EF_BASE * efMultAtHour(hour);
  }

  let clusterEmissionsKg = 0;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const ef = efKgPerKwh[k];
    let clusterPhysicalNetImportKw = 0;

    for (const b of buildings) {
      const s = seriesRecord[b.id];
      const physicalKw = s.physicalGridKw[k];
      clusterPhysicalNetImportKw += physicalKw;

      if (physicalKw > 0) {
        buildingEmissionsGrossKg[b.id] += ef * DT_H * physicalKw;
      }
    }

    if (clusterPhysicalNetImportKw > 0) {
      clusterEmissionsKg += ef * DT_H * clusterPhysicalNetImportKw;
    }
  }

  return { efKgPerKwh, clusterEmissionsKg, buildingEmissionsGrossKg };
}

export function computeTreeDays(avoidedEmissionsKg: number): number {
  if (avoidedEmissionsKg <= 0) return 0;
  return avoidedEmissionsKg / TREE_ABSORPTION_DAILY;
}
