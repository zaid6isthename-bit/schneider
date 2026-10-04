import { useMemo } from 'react';
import { usePlaybackStore } from './playback';
import { runAll } from '@/simulation/engine';
import { SCENARIOS } from '@/simulation/scenarios';
import { MultiRunResult } from '@/simulation/types';

export function useSimulation(): MultiRunResult {
  const scenarioId = usePlaybackStore((s) => s.scenarioId);
  const customScenario = usePlaybackStore((s) => s.customScenario);
  const autopilot = usePlaybackStore((s) => s.autopilot);

  return useMemo(() => {
    const scenario = (customScenario && customScenario.id === scenarioId)
      ? customScenario
      : (SCENARIOS[scenarioId] ?? SCENARIOS.hot_weekday);
    return runAll(scenario, autopilot);
  }, [scenarioId, customScenario, autopilot]);
}
