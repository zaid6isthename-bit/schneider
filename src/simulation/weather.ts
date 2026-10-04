import { RNG } from './rng';
import { ScenarioDef } from './types';
import { GHI_MAX, PV_PR, PV_TEMP_COEFF, STEPS_PER_DAY } from './constants';

export interface WeatherData {
  tOut: number[];
  ghi: number[];
}

export function generateWeather(scenario: ScenarioDef, rng: RNG): WeatherData {
  const tOut: number[] = new Array(STEPS_PER_DAY);
  const ghi: number[] = new Array(STEPS_PER_DAY);

  // Generate AR(1) temperature noise: n[k] = 0.9 * n[k-1] + eps, eps ~ N(0, 0.15), clamped ±1.0 °C
  let n = 0;
  // Generate AR(1) cloud noise: c[k] = 0.9 * c[k-1] + eps_c, eps_c ~ N(0, 0.05)
  let c = 0;

  const isMonsoon = scenario.cloudBase < 0.7;
  const cloudMin = isMonsoon ? 0.1 : 0.3;
  const cloudMax = isMonsoon ? 0.6 : 1.0;

  for (let k = 0; k < STEPS_PER_DAY; k++) {
    const h = k * 0.25;

    // Temperature
    const epsT = rng.nextNormal(0, 0.15);
    n = 0.9 * n + epsT;
    n = Math.max(-1.0, Math.min(1.0, n));
    const tOutMean = scenario.Tmean + scenario.A * Math.cos((2 * Math.PI * (h - 15)) / 24);
    tOut[k] = tOutMean + n;

    // Solar GHI
    const epsC = rng.nextNormal(0, 0.05);
    c = 0.9 * c + epsC;
    let cloud = scenario.cloudBase * (1 + c);
    cloud = Math.max(cloudMin, Math.min(cloudMax, cloud));

    let ghiClearsky = 0;
    if (h >= 6 && h <= 18) {
      const sinVal = Math.sin((Math.PI * (h - 6)) / 12);
      if (sinVal > 0) {
        ghiClearsky = GHI_MAX * Math.pow(sinVal, 1.2);
      }
    }
    ghi[k] = ghiClearsky * cloud;
  }

  return { tOut, ghi };
}

export function computeSolarKw(solarKwp: number, ghi: number, tOut: number): number {
  if (solarKwp <= 0 || ghi <= 0) return 0;
  const tCell = tOut + 0.025 * ghi;
  const tempCorrection = 1 + PV_TEMP_COEFF * Math.max(0, tCell - 25.0);
  const power = solarKwp * (ghi / 1000.0) * PV_PR * Math.max(0, tempCorrection);
  return Math.max(0, power);
}
