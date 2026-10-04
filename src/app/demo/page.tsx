'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlaybackStore } from '@/store/playback';
import { useSimulation } from '@/store/useSimulation';
import { getDemoScenes, DemoScene } from '@/simulation/narration';
import { formatClock } from '@/lib/format';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
  X,
  Compass,
} from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();
  const runs = useSimulation();
  const scenes = getDemoScenes(runs);

  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(scenes[0]?.dwellSeconds ?? 8);

  const setCursor = usePlaybackStore((s) => s.setCursor);
  const setScenarioId = usePlaybackStore((s) => s.setScenarioId);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);

  const currentScene = scenes[currentSceneIdx];

  // Apply scene settings to playback engine when scene changes
  useEffect(() => {
    if (!currentScene) return;
    setScenarioId(currentScene.scenarioId);
    setCursor(currentScene.cursorTarget);
    setSpeed(currentScene.playbackSpeed as 1 | 4 | 16);
    setRemainingSeconds(currentScene.dwellSeconds ?? 8);
  }, [currentSceneIdx, currentScene, setScenarioId, setCursor, setSpeed]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Advance to next scene or loop
          setCurrentSceneIdx((curr) => (curr + 1) % scenes.length);
          return scenes[(currentSceneIdx + 1) % scenes.length]?.dwellSeconds ?? 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPlay, currentSceneIdx, scenes]);

  // Esc key listener to exit demo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/overview');
      }
      if (e.key === 'ArrowRight') {
        setCurrentSceneIdx((curr) => Math.min(scenes.length - 1, curr + 1));
      }
      if (e.key === 'ArrowLeft') {
        setCurrentSceneIdx((curr) => Math.max(0, curr - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, scenes.length]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">auto_stories</span>
          <h1 className="font-headline-sm text-xl font-bold tracking-tight text-on-surface">
            Guided Microgrid Tour: Scene {currentScene.id} of {scenes.length}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-label-caps font-bold uppercase tracking-wider transition-colors border ${
              autoPlay
                ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                : 'bg-surface-container-low text-on-surface border-surface-container-high'
            }`}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto-play ({remainingSeconds}s)</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/overview')}
            className="flex items-center gap-1 text-xs font-label-caps font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface px-2.5 py-1.5 rounded bg-surface-container-lowest border border-surface-container-high shadow-sm"
            title="Press Esc to exit"
          >
            <span>Exit Tour</span>
            <X className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Main Narrative Card */}
      <div className="rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-6 shadow-sm space-y-6">
        {/* Scene Title & Context Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-container-high/60">
          <div>
            <div className="font-label-caps text-xs uppercase tracking-wider text-primary font-bold">
              Scene {currentScene.id}: {currentScene.title}
            </div>
            <div className="text-xs font-mono text-on-surface-variant mt-0.5">
              Scenario: <strong className="text-on-surface">{currentScene.scenarioId}</strong> · Cursor Step: {currentScene.cursorTarget} ({formatClock(currentScene.cursorTarget)})
            </div>
          </div>

          <Link
            href={currentScene.focusRoute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-low hover:bg-surface-container-high/60 text-on-surface text-xs font-semibold transition-colors border border-surface-container-high/60"
          >
            <span>Open Focused Route ({currentScene.focusRoute})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Resolved Narration Text (Strictly derived from RunResult) */}
        <div className="p-6 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40 leading-relaxed text-on-surface text-base sm:text-lg font-sans">
          &ldquo;{currentScene.resolvedText}&rdquo;
        </div>

        {/* Navigation & Progress Dots */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-container-high/60">
          {/* Stepper Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentSceneIdx === 0}
              onClick={() => setCurrentSceneIdx((curr) => Math.max(0, curr - 1))}
              className="flex items-center gap-1 px-3 py-2 rounded bg-surface-container-low hover:bg-surface-container-high/60 border border-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-xs font-label-caps font-bold tracking-wider uppercase text-on-surface"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              disabled={currentSceneIdx === scenes.length - 1}
              onClick={() => setCurrentSceneIdx((curr) => Math.min(scenes.length - 1, curr + 1))}
              className="flex items-center gap-1 px-4 py-2 rounded bg-primary hover:bg-primary/90 text-on-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-label-caps font-bold tracking-wider uppercase shadow-sm"
            >
              <span>Next Scene</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {scenes.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSceneIdx(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentSceneIdx
                    ? 'w-7 bg-primary'
                    : 'w-2.5 bg-surface-container-high hover:bg-surface-container-highest'
                }`}
                title={`Scene ${s.id}: ${s.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
