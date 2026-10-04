import { create } from 'zustand';
import { AutopilotWeights, ScenarioDef } from '@/simulation/types';
import { DEFAULT_SCENARIO_ID, SCENARIOS } from '@/simulation/scenarios';

/**
 * Compute the simulation cursor (0–95.99) from the current real-world clock.
 * Each step = 15 min, so cursor = hour * 4 + floor(minute / 15).
 */
function cursorFromRealTime(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  // Fractional step within the 15-min interval for smooth display
  const step = hour * 4 + minute / 15;
  return Math.min(95.99, Math.max(0, step));
}

interface PlaybackState {
  cursor: number; // 0..95.99
  playing: boolean;
  realtimeSync: boolean; // true = cursor tracks real wall clock
  speed: 1 | 4 | 16;
  scenarioId: string;
  customScenario?: ScenarioDef;
  autopilot: AutopilotWeights;

  setCursor: (cursor: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: 1 | 4 | 16) => void;
  setScenarioId: (id: string) => void;
  setCustomScenario: (scenario: ScenarioDef) => void;
  setAutopilot: (weights: AutopilotWeights) => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  syncToRealTime: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  cursor: 75, // Deterministic default step for consistent SSR & hydration
  playing: false,
  realtimeSync: true, // Start in real-time sync mode
  speed: 1,
  scenarioId: DEFAULT_SCENARIO_ID,
  autopilot: {
    wComfort: 1 / 3,
    wCost: 1 / 3,
    wCarbon: 1 / 3,
  },

  setCursor: (cursor) => set({ cursor: Math.max(0, Math.min(95.99, cursor)), realtimeSync: false }),
  setPlaying: (playing) => set((state) => ({
    playing,
    realtimeSync: playing ? false : state.realtimeSync,
  })),
  togglePlay: () => set((state) => ({
    playing: !state.playing,
    // When starting playback, disable real-time sync
    realtimeSync: !state.playing ? false : state.realtimeSync,
  })),
  setSpeed: (speed) => set({ speed }),
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setCustomScenario: (customScenario) => set({ customScenario, scenarioId: customScenario.id }),
  setAutopilot: (autopilot) => set({ autopilot }),
  stepForward: () =>
    set((state) => ({
      cursor: Math.min(95.99, Math.floor(state.cursor) + 1),
      realtimeSync: false,
    })),
  stepBackward: () =>
    set((state) => ({
      cursor: Math.max(0, Math.floor(state.cursor) - 1),
      realtimeSync: false,
    })),
  reset: () => set({
    cursor: cursorFromRealTime(),
    playing: false,
    realtimeSync: true,
  }),
  syncToRealTime: () => set({
    cursor: cursorFromRealTime(),
    playing: false,
    realtimeSync: true,
  }),
}));
