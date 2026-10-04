// Mulberry32 seeded deterministic pseudo-random number generator
// PRD rule §0.3: SEED = 20261004. Strictly NO Math.random outside this file.

export interface RNG {
  next(): number; // [0, 1)
  uniform(min: number, max: number): number;
  int(min: number, max: number): number;
  nextNormal(mean?: number, stdDev?: number): number;
}

export function createRNG(seed: number): RNG {
  let s = seed >>> 0;

  function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function uniform(min: number, max: number): number {
    return min + next() * (max - min);
  }

  function int(min: number, max: number): number {
    return Math.floor(uniform(min, max + 1));
  }

  let haveSpare = false;
  let spare = 0;

  function nextNormal(mean = 0, stdDev = 1): number {
    if (haveSpare) {
      haveSpare = false;
      return spare * stdDev + mean;
    }

    let u = 0;
    let v = 0;
    let sSq = 0;
    while (sSq === 0 || sSq >= 1) {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      sSq = u * u + v * v;
    }

    const mul = Math.sqrt((-2 * Math.log(sSq)) / sSq);
    spare = v * mul;
    haveSpare = true;
    return (u * mul) * stdDev + mean;
  }

  return { next, uniform, int, nextNormal };
}
