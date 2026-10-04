import { RunResult } from '@/simulation/types';
import { PEAK_END_STEP, PEAK_START_STEP } from '@/simulation/constants';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';

export type AppTheme = 'normal' | 'peak' | 'solar' | 'dr' | 'night';

export function themeFor(k: number, run?: RunResult): AppTheme {
  const stepIdx = Math.max(0, Math.min(95, Math.floor(k)));
  const hour = (stepIdx * 0.25) % 24;

  // 1. DR active
  if (run?.dr && stepIdx >= run.dr.event.startStep && stepIdx <= run.dr.event.endStep) {
    return 'dr';
  }

  // 2. Peak tariff (17:00–22:00)
  if (stepIdx >= PEAK_START_STEP && stepIdx <= PEAK_END_STEP) {
    return 'peak';
  }

  // 3. Solar: if cluster export > 5% of cluster load
  if (run) {
    let clusterLoad = 0;
    let clusterExport = 0;
    for (const b of DEFAULT_BUILDINGS) {
      const s = run.buildings[b.id];
      if (s) {
        clusterLoad += s.loadKw[stepIdx];
        if (s.billedGridKw[stepIdx] < 0) {
          clusterExport += -s.billedGridKw[stepIdx];
        }
      }
    }
    if (clusterLoad > 0 && clusterExport / clusterLoad > 0.05) {
      return 'solar';
    }
  }

  // 4. Night: hour < 6 or >= 21
  if (hour < 6 || hour >= 21) {
    return 'night';
  }

  // 5. Normal
  return 'normal';
}
