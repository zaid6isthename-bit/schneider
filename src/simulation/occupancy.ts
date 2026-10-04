import { BuildingDef, ScenarioDef } from './types';
import { STEPS_PER_DAY } from './constants';

export const WEEKDAY_OCCUPANCY_PROFILES: Record<BuildingDef['type'], number[]> = {
  office: [
    0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.10, 0.30, 0.65, 0.90, 0.95, 0.92,
    0.80, 0.88, 0.95, 0.92, 0.80, 0.55, 0.25, 0.12, 0.06, 0.04, 0.03, 0.03,
  ],
  retail: [
    0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.05, 0.20, 0.40,
    0.55, 0.60, 0.55, 0.55, 0.65, 0.80, 0.95, 1.00, 0.95, 0.70, 0.20, 0.05,
  ],
  hospital: [
    0.55, 0.50, 0.50, 0.50, 0.50, 0.55, 0.65, 0.80, 0.95, 1.00, 1.00, 0.95,
    0.90, 0.90, 0.95, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55,
  ],
  university: [
    0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.10, 0.45, 0.85, 1.00, 1.00,
    0.80, 0.85, 1.00, 0.95, 0.70, 0.35, 0.15, 0.08, 0.05, 0.03, 0.02, 0.02,
  ],
  it: [
    0.30, 0.28, 0.25, 0.25, 0.25, 0.28, 0.35, 0.50, 0.75, 0.90, 0.95, 0.92,
    0.80, 0.88, 0.95, 0.92, 0.85, 0.75, 0.60, 0.50, 0.45, 0.40, 0.35, 0.32,
  ],
  hotel: [
    0.70, 0.70, 0.70, 0.70, 0.70, 0.65, 0.60, 0.50, 0.40, 0.35, 0.30, 0.30,
    0.35, 0.35, 0.35, 0.40, 0.45, 0.55, 0.70, 0.80, 0.85, 0.85, 0.80, 0.75,
  ],
};

export const K_WEEKEND: Record<BuildingDef['type'], number> = {
  office: 0.15,
  retail: 1.25,
  hospital: 0.90,
  university: 0.10,
  it: 0.40,
  hotel: 1.10,
};

export function interpolateHourlyTo15Min(hourly: number[]): number[] {
  const result: number[] = new Array(STEPS_PER_DAY);
  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const h = k * 0.25;
    const h0 = Math.floor(h);
    const frac = h - h0;
    const h1 = (h0 + 1) % 24;
    result[k] = hourly[h0] * (1 - frac) + hourly[h1] * frac;
  }
  return result;
}

export function generateOccupancySeries(building: BuildingDef, scenario: ScenarioDef): number[] {
  const baseHourly = WEEKDAY_OCCUPANCY_PROFILES[building.type];
  const occMin = Math.min(...baseHourly);
  const kWeekend = K_WEEKEND[building.type];

  // First interpolate the weekday profile to 15-min
  const interpolated15Min = interpolateHourlyTo15Min(baseHourly);

  return interpolated15Min.map((occ) => {
    let transformedOcc = occ;
    if (scenario.dayType === 'weekend') {
      transformedOcc = occMin + (occ - occMin) * kWeekend;
      transformedOcc = Math.max(0, Math.min(1, transformedOcc));
    }
    // Scenario multiplier applied last
    transformedOcc = transformedOcc * scenario.occScale;
    return Math.max(0, Math.min(1, transformedOcc));
  });
}
