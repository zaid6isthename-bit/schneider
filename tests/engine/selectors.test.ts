import { describe, it, expect } from 'vitest';
import { runAll } from '@/simulation/engine';
import { SCENARIOS } from '@/simulation/scenarios';
import {
  clusterDemandSeries,
  clusterSolarSeries,
  buildingStack,
  indoorTemp,
  batterySoc,
  marketPriceSeries,
  savingsAtStep,
  kpiSummary,
  layerAttribution,
} from '@/simulation/selectors';
import { resolvePlaceholders, getDemoScenes } from '@/simulation/narration';
import { STEPS_PER_DAY } from '@/simulation/constants';

describe('UI Selectors and Narration Verification', () => {
  const runs = runAll(SCENARIOS.hot_weekday);

  it('Invariant 13: Chart selector arrays accurately map source arrays from RunResult', () => {
    // Cluster demand selector
    const demandSeries = clusterDemandSeries(runs);
    expect(demandSeries).toHaveLength(STEPS_PER_DAY);
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      let expectedBaseLoad = 0;
      for (const b of Object.values(runs.baseline.buildings)) {
        expectedBaseLoad += b.loadKw[k];
      }
      expect(Math.abs(demandSeries[k].baselineDemandKw - expectedBaseLoad)).toBeLessThan(1e-5);
    }

    // Solar series selector
    const solarSeries = clusterSolarSeries(runs.network);
    expect(solarSeries).toHaveLength(STEPS_PER_DAY);
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      let expectedSolar = 0;
      for (const b of Object.values(runs.network.buildings)) {
        expectedSolar += b.solarKw[k];
      }
      expect(Math.abs(solarSeries[k].solarKw - expectedSolar)).toBeLessThan(1e-5);
    }

    // Building stack selector
    const stack = buildingStack(runs.network, 'nova');
    expect(stack).toHaveLength(STEPS_PER_DAY);
    const novaS = runs.network.buildings['nova'];
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      expect(stack[k].hvacKw).toBe(novaS.hvacKw[k]);
      expect(stack[k].solarKw).toBe(novaS.solarKw[k]);
    }

    // Indoor temp selector
    const temp = indoorTemp(runs.network, 'nova');
    expect(temp).toHaveLength(STEPS_PER_DAY);
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      expect(temp[k].tIn).toBe(novaS.tIn[k]);
      expect(temp[k].tTarget).toBe(novaS.tTarget[k]);
    }

    // Battery SoC selector
    const soc = batterySoc(runs.network, 'nova');
    expect(soc).toHaveLength(STEPS_PER_DAY);
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      expect(soc[k].socKwh).toBe(novaS.battSocKwh[k]);
    }

    // Market price selector
    const prices = marketPriceSeries(runs.network);
    expect(prices).toHaveLength(STEPS_PER_DAY);
    for (let k = 0; k < STEPS_PER_DAY; k++) {
      expect(prices[k].gridTariff).toBe(runs.network.tariffInrKwh[k]);
      expect(prices[k].volumeKw).toBe(runs.network.marketVolumeKw[k]);
    }
  });

  it('Invariant 14: Ticker test: at integer cursor values, cumulative savings equal exact cumulative sum', () => {
    for (let step = 0; step < STEPS_PER_DAY; step++) {
      const saving = savingsAtStep(runs, step);

      let expectedBaseCost = 0;
      let expectedNetCost = 0;
      for (let i = 0; i <= step; i++) {
        for (const b of Object.values(runs.baseline.buildings)) {
          expectedBaseCost += b.stepCostInr[i];
        }
        for (const b of Object.values(runs.network.buildings)) {
          expectedNetCost += b.stepCostInr[i];
        }
      }

      const expectedSaving = Math.max(0, expectedBaseCost - expectedNetCost);
      expect(Math.abs(saving.cumulativeInr - expectedSaving)).toBeLessThan(1e-4);
    }
  });

  it('Resolves all demo scene placeholders without throwing', () => {
    const scenes = getDemoScenes(runs);
    expect(scenes).toHaveLength(12);
    for (const s of scenes) {
      expect(s.resolvedText).toBeDefined();
      expect(s.resolvedText?.includes('{')).toBe(false);
      expect(s.resolvedText?.includes('}')).toBe(false);
      expect(s.dwellSeconds).toBeGreaterThan(0);
    }
  });

  it('Invariant 16: Grep check: No Math.random outside rng.ts and no localStorage', () => {
    const fs = require('fs');
    const path = require('path');

    function scanDir(dir: string, fileList: string[] = []) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath, fileList);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const srcFiles = scanDir(path.resolve(__dirname, '../../src'));
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (!file.endsWith('rng.ts')) {
        expect(content.includes('Math.random()')).toBe(false);
      }
      expect(content.includes('localStorage')).toBe(false);
    }
  });
});
