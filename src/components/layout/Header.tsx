'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, Radio } from 'lucide-react';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { SCENARIOS } from '@/simulation/scenarios';
import { formatClock } from '@/lib/format';
import { savingsAtStep } from '@/simulation/selectors';

export function Header() {
  const {
    cursor,
    playing,
    realtimeSync,
    speed,
    scenarioId,
    setCursor,
    togglePlay,
    setSpeed,
    setScenarioId,
    reset,
    syncToRealTime,
  } = usePlaybackStore();

  const runs = useSimulation();
  const ticker = savingsAtStep(runs, cursor);

  // Real-time sync: update cursor to actual wall clock every second when not playing
  useEffect(() => {
    if (!realtimeSync || playing) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const step = hour * 4 + minute / 15;
      const newCursor = Math.min(95.99, Math.max(0, step));
      // Directly update store without triggering realtimeSync = false
      usePlaybackStore.setState({ cursor: newCursor, realtimeSync: true });
    }, 1000);

    return () => clearInterval(interval);
  }, [realtimeSync, playing]);

  // RequestAnimationFrame playback loop (simulation mode)
  // 1x = 1 sim-step (15 min) per 3 real seconds -> rate = (1 / 3) * speed steps/sec
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      lastTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const tick = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (time - lastTimeRef.current) / 1000;
        // 1 step = 15 sim-minutes. At 1x, advance 1 step per 3 real seconds
        const stepsPerSecond = (1 / 3) * speed;
        const nextCursor = (usePlaybackStore.getState().cursor + deltaSeconds * stepsPerSecond) % 96;
        usePlaybackStore.setState({ cursor: Math.min(95.99, nextCursor), realtimeSync: false });
      }
      lastTimeRef.current = time;
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playing, speed]);

  const stepNumber = Math.floor(cursor);
  const formattedTime = formatClock(cursor);

  // Real wall clock time for display
  const now = new Date();
  const wallClock = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-b border-[#E2E4E8]">
      <div className="h-28 w-full px-gutter-desktop flex flex-col justify-between py-space-xs">
        {/* TOP ROW */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-space-lg">
            <div className="flex items-baseline gap-space-sm">
              <Link
                href="/overview"
                className="font-headline-md text-headline-md font-bold tracking-tight text-[#009530] flex items-center gap-1.5"
              >
                THERMOS 2.0
              </Link>
              <span className="font-label-caps text-label-caps uppercase text-[#626469] hidden xl:inline">
                Smart Buildings · Energy Efficiency & Occupant Experience · Grid Integration
              </span>
            </div>
            <Link
              href="/methodology"
              className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-[#F2F2F2] rounded-lg hover:bg-[#E2E4E8] transition-colors border border-[#E2E4E8]"
            >
              <span className="w-2 h-2 rounded-full bg-[#3DCD58] animate-pulse" />
              <span className="font-label-caps text-label-caps text-[#262626] font-bold uppercase tracking-wider">
                SIMULATED DATA · ASSUMPTIONS ON /methodology
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-space-lg">
            {/* Live Accrued Savings Ticker */}
            <div className="flex items-center gap-space-sm bg-[#F2F2F2] px-space-md py-space-xs rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-[#E2E4E8]">
              <span className="font-label-caps text-label-caps uppercase text-[#626469] font-bold">
                ₹ Saved Today:
              </span>
              <span className="font-telemetry-md text-telemetry-md font-bold text-[#009530]">
                ₹{Math.round(ticker.cumulativeInr).toLocaleString()}
              </span>
              <span className="font-telemetry-sm text-telemetry-sm text-white bg-[#009530] px-space-xs py-space-2xs rounded font-bold">
                (+₹{ticker.inrPerMin.toFixed(1)}/min)
              </span>
            </div>

            <div className="flex items-center gap-space-sm">
              <Link
                href="/methodology"
                aria-label="Documentation"
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#626469] hover:text-[#262626] transition-colors border border-[#E2E4E8]"
              >
                <span className="material-symbols-outlined text-[18px]">help_outline</span>
              </Link>
              <Link
                href="/profile"
                aria-label="Operator Profile & Clearance"
                className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center shadow-sm hover:ring-2 hover:ring-[#009530]/40 transition-all cursor-pointer"
                title="Operator Profile & Credentials"
              >
                <span className="material-symbols-outlined text-white text-[18px]">person</span>
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: SCENARIO, PLAYBACK & TARIFF BAR */}
        <div className="flex items-center justify-between w-full pt-space-xs border-t border-[#E2E4E8]">
          <div className="flex items-center gap-space-base">
            {/* Scenario Dropdown */}
            <div className="flex items-center gap-space-xs bg-white px-space-sm py-space-2xs rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-[#E2E4E8]">
              <span className="font-label-caps text-label-caps uppercase text-[#626469]">Scenario:</span>
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                className="bg-transparent font-telemetry-sm text-telemetry-sm text-[#262626] font-bold focus:outline-none cursor-pointer"
              >
                {Object.values(SCENARIOS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Play/Pause & Speed Stepper */}
            <div className="flex items-center gap-space-2xs bg-white p-space-2xs rounded-lg border border-[#E2E4E8]">
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Toggle Playback"
                className="w-7 h-7 flex items-center justify-center rounded bg-[#262626] text-white hover:bg-[#009530] transition-colors shadow-sm"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={syncToRealTime}
                aria-label="Sync to Real Time"
                title="Sync to real-time clock"
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  realtimeSync
                    ? 'bg-[#009530] text-white'
                    : 'text-[#626469] hover:bg-[#F2F2F2] hover:text-[#262626]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={reset}
                aria-label="Reset to Real Time"
                className="w-7 h-7 flex items-center justify-center rounded text-[#626469] hover:bg-[#F2F2F2] hover:text-[#262626] transition-colors"
                title="Reset to real-time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center text-[#626469] font-telemetry-sm text-telemetry-sm ml-1">
                {([1, 4, 16] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-space-xs py-space-2xs rounded font-semibold transition-colors ${
                      speed === s
                        ? 'bg-[#E2E4E8] text-[#262626] font-bold'
                        : 'hover:bg-[#F2F2F2]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Step Time Readout */}
            <div className="flex items-center gap-space-xs px-space-sm py-space-2xs bg-white rounded-lg border border-[#E2E4E8]">
              <span className="material-symbols-outlined text-[16px] text-[#626469]">schedule</span>
              <span className="font-telemetry-md text-telemetry-md font-bold text-[#262626]">
                {formattedTime}
              </span>
              <span className="font-telemetry-sm text-telemetry-sm text-[#626469]">
                · Step {stepNumber}/95
              </span>
              {realtimeSync && (
                <span className="flex items-center gap-1 ml-1 px-space-xs py-space-2xs rounded bg-[#009530]/10 text-[#009530] font-label-caps text-label-caps font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3DCD58] animate-pulse" />
                  LIVE
                </span>
              )}
              {playing && !realtimeSync && (
                <span className="flex items-center gap-1 ml-1 px-space-xs py-space-2xs rounded bg-[#FFD100]/15 text-[#E47F00] font-label-caps text-label-caps font-bold">
                  SIM {speed}x
                </span>
              )}
            </div>
          </div>

          {/* Time-of-Day Tariff Progress Bar */}
          <div className="flex-1 max-w-xl mx-space-lg flex flex-col gap-space-2xs">
            <div className="flex items-center justify-between font-label-caps text-label-caps text-[#626469]">
              <span>00:00 (Off-Peak)</span>
              <span>06:00 (Normal)</span>
              <span>17:00 (Peak)</span>
              <span>22:00 (DR Alert)</span>
            </div>
            <div
              className="relative w-full h-2 rounded bg-[#E2E4E8] flex overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setCursor(ratio * 95.99);
              }}
            >
              <div className="h-full bg-[#3DCD58] opacity-80 w-[25%]" title="Off-Peak: ₹6.0/kWh" />
              <div className="h-full bg-[#9FA0A4] w-[45%]" title="Normal: ₹8.5/kWh" />
              <div className="h-full bg-[#FFD100] w-[20%]" title="Peak: ₹11.0/kWh" />
              <div className="h-full bg-[#B10043] w-[10%]" title="DR Alert: Peak/Emergency" />
              {/* Active Scrubber Head */}
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-[#262626] rounded-full shadow-sm z-10 transition-all duration-75"
                style={{ left: `${(cursor / 96) * 100}%` }}
              />
            </div>
          </div>

          {/* Grid Sync Indicators */}
          <div className="flex items-center gap-space-xs">
            <span className="font-label-caps text-label-caps px-space-xs py-space-2xs rounded bg-[#009530] text-white font-bold">
              GRID: OPTIMAL
            </span>
            <span className="font-label-caps text-label-caps px-space-xs py-space-2xs rounded bg-[#F2F2F2] text-[#626469] font-bold border border-[#E2E4E8]">
              SYNC: 50.02 HZ
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
