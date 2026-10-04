'use client';

import React from 'react';
import Link from 'next/link';
import { useSimulation } from '@/store/useSimulation';
import { clusterDemandSeries } from '@/simulation/selectors';
import { ArrowRight, Play, Zap, ShieldCheck, Share2 } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

export default function LandingPage() {
  const runs = useSimulation();
  const series = clusterDemandSeries(runs);

  return (
    <div className="relative min-h-[82vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      {/* Background Live Real Data Waveform Plot */}
      <div className="absolute inset-0 pointer-events-none opacity-25 flex items-center justify-center">
        <div className="w-full max-w-5xl h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Area
                type="linear"
                dataKey="solarKw"
                fill="#9FAF00"
                fillOpacity={0.25}
                stroke="#9FAF00"
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="baselineDemandKw"
                stroke="#626469"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="networkDemandKw"
                stroke="#009530"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-[#3DCD58] animate-pulse" />
          THERMOS 2.0 · Sector 47 Microgrid Simulation
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-on-surface font-sans leading-tight">
          Buildings that think, and trade,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-[#009530] to-[#3DCD58]">
            before they consume.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Autonomous microgrid engine integrating per-building HVAC thermal inertia, peer-to-peer bilateral solar trading, and virtual power plant (VPP) demand response over a shared 11 kV feeder.
        </p>

        {/* Two Required CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Link
            href="/overview"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-sans font-bold text-sm transition-all shadow-md hover:scale-105"
          >
            <span>Enter THERMOS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/demo"
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-sans font-semibold text-sm transition-all hover:scale-105 shadow-sm"
          >
            <Play className="w-4 h-4 text-primary fill-current" />
            <span>Watch Guided Tour</span>
          </Link>
        </div>

        {/* Three Microgrid Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-secondary font-bold text-xs font-mono">
              <Zap className="w-4 h-4" />
              <span>LAYER 1</span>
            </div>
            <div className="text-sm font-semibold text-on-surface">Autonomous Edge Optimization</div>
            <div className="text-xs text-on-surface-variant">
              Chiller precooling, daylight dimming, and battery arbitrage without cloud latency.
            </div>
          </div>

          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs font-mono">
              <Share2 className="w-4 h-4" />
              <span>LAYER 2</span>
            </div>
            <div className="text-sm font-semibold text-on-surface">P2P Microgrid Exchange</div>
            <div className="text-xs text-on-surface-variant">
              Double-auction bilateral trading clearing surplus solar and battery discharge across neighbors.
            </div>
          </div>

          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>LAYER 3</span>
            </div>
            <div className="text-sm font-semibold text-on-surface">VPP Grid Response</div>
            <div className="text-xs text-on-surface-variant">
              Aggregated negative-watt curtailment verifying comfort preservation during utility grid emergencies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
