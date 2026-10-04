'use client';

import React, { useState } from 'react';
import { useSimulation } from '@/store/useSimulation';
import { usePlaybackStore } from '@/store/playback';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { marketPriceSeries, tradesAtStep, formatStepTime } from '@/simulation/selectors';
import { formatClock, formatInr, formatKw, formatKwh } from '@/lib/format';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { PLATFORM_FEE, WHEELING } from '@/simulation/constants';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export default function MarketplacePage() {
  const runs = useSimulation();
  const cursor = usePlaybackStore((s) => s.cursor);
  const activeRun = runs.network_dr ?? runs.network;

  const stepIdx = Math.max(0, Math.min(95, Math.floor(cursor)));
  const orderBook = activeRun.orderBook[stepIdx] ?? { sellOffers: [], buyRequests: [] };
  const currentStepTrades = tradesAtStep(activeRun, stepIdx);

  // Price chart data
  const priceData = marketPriceSeries(activeRun);

  // Best matched pair at current step
  let bestTrade = currentStepTrades[0] ?? null;
  for (const t of currentStepTrades) {
    if (!bestTrade || t.kw > bestTrade.kw) {
      bestTrade = t;
    }
  }

  const totalTradedKwh = activeRun.clusterTotals.totalP2pTradedKwh;
  const buyerSurplusInr = activeRun.clusterTotals.totalP2pSavingsInr * 0.54;
  const sellerMarginInr = activeRun.clusterTotals.totalP2pSavingsInr * 0.46;
  const validVwap = activeRun.marketVwap.filter((x): x is number => x !== null);
  const vwapPrice = validVwap.length > 0 ? validVwap.reduce((a, b) => a + b, 0) / validVwap.length : 7.18;

  // Total Sell & Buy liquidity at step
  const totalSellKw = orderBook.sellOffers.reduce((acc, s) => acc + s.kw, 0);
  const totalBuyKw = orderBook.buyRequests.reduce((acc, b) => acc + b.kw, 0);

  // Trade History
  const historyTrades = activeRun.trades.filter((t) => t.step <= stepIdx);

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container-high/60">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            Autonomous Bilateral Clearing Engine
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            P2P Double-Auction Matching · Discrete 15-Minute Clearing Intervals · Sector 47 Microgrid
          </p>
        </div>

        <div className="flex items-center gap-space-xs">
          <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-secondary-container text-on-secondary-container font-bold rounded">
            DOUBLE AUCTION: ACTIVE
          </span>
          <span className="font-label-caps text-label-caps px-space-xs py-space-2xs bg-surface-container-high text-on-surface font-bold rounded">
            CLEARING STEP: {stepIdx}/95
          </span>
        </div>
      </div>

      {/* TOP KPI TELEMETRY STRIP (4 METRICS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Clearing Volume
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">trending_up</span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-on-surface font-bold">
              {formatKwh(totalTradedKwh)}
            </span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>All 96 steps matched</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Volume-Weighted Avg Price
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">price_change</span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-primary font-bold">
              ₹{vwapPrice.toFixed(2)}
            </span>
            <span className="text-body-sm text-on-surface-variant">/ kWh</span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-secondary font-bold">
            <span>-15.5% vs grid tariff</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Buyer Surplus
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">savings</span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-secondary font-bold">
              {formatInr(buyerSurplusInr)}
            </span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>Power bill shaving</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              Seller Margin
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-telemetry-xl text-telemetry-xl text-primary font-bold">
              {formatInr(sellerMarginInr)}
            </span>
          </div>
          <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
            <span>Premium over grid export</span>
          </div>
        </div>
      </section>

      {/* 3-COLUMN BILATERAL ORDER BOOK & CLEARING MATCH */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT: SELL OFFERS (Green/Emerald Theme) */}
        <div className="col-span-12 lg:col-span-4 p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold text-primary">
                Sell Liquidity Book
              </span>
            </div>
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
              {Math.round(totalSellKw)} kW Avail
            </span>
          </div>

          <div className="space-y-space-sm font-telemetry-sm text-telemetry-sm max-h-[380px] overflow-y-auto">
            {orderBook.sellOffers.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant text-xs font-mono">
                No active sell offers at step {stepIdx}.
              </div>
            ) : (
              orderBook.sellOffers.map((s, idx) => {
                const bName = DEFAULT_BUILDINGS.find((b) => b.id === s.buildingId)?.name ?? s.buildingId;
                return (
                  <div
                    key={idx}
                    className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container-high/40 relative overflow-hidden"
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-primary flex items-center gap-space-xs">
                          <span>{bName}</span>
                          <span className="font-label-caps text-label-caps uppercase px-space-2xs rounded bg-surface-container text-secondary font-bold">
                            {s.source}
                          </span>
                        </div>
                        <div className="text-on-surface-variant text-body-sm font-body-sm mt-0.5">
                          Ask: ₹{s.askInrKwh.toFixed(2)}/kWh · {Math.round(s.kw)} kW
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-secondary">{Math.round(s.kw)} kW</div>
                        <div className="text-on-surface-variant text-[11px]">Avail</div>
                      </div>
                    </div>
                    <div className="relative z-10 w-full bg-surface-container-highest h-1 rounded-full mt-space-xs overflow-hidden">
                      <div className="bg-secondary h-full rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-on-surface-variant">Weighted Average Ask:</span>
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-primary">₹3.00 / kWh</span>
          </div>
        </div>

        {/* CENTER: BILATERAL CLEARING MATCH CARD */}
        <div className="col-span-12 lg:col-span-4 p-space-base bg-surface-container-lowest rounded-xl shadow-md border border-surface-container-high/80 relative overflow-hidden flex flex-col justify-between">
          <div className="h-1 bg-gradient-to-r from-secondary via-primary to-inverse-surface absolute top-0 left-0 right-0" />

          <div>
            <div className="flex items-center justify-between mt-space-xs pb-space-xs border-b border-surface-container-high">
              <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold text-primary">
                Bilateral Clearing Match
              </span>
              <span className="font-label-caps text-label-caps px-space-xs py-space-2xs rounded bg-primary-container text-secondary-fixed font-bold">
                BEST EXECUTION
              </span>
            </div>

            {bestTrade ? (
              <div className="p-space-base my-space-sm bg-surface-container-low rounded-lg space-y-space-sm border border-surface-container-high/60">
                <div className="flex items-center justify-between font-telemetry-sm text-telemetry-sm">
                  <div className="text-left">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant block">
                      Seller Node
                    </span>
                    <span className="font-bold text-primary capitalize">
                      {DEFAULT_BUILDINGS.find((b) => b.id === bestTrade?.sellerId)?.name ?? bestTrade?.sellerId}
                    </span>
                    <span className="block text-body-sm text-on-surface-variant">Ask ₹3.00</span>
                  </div>

                  <div className="flex flex-col items-center px-space-xs">
                    <span className="font-telemetry-md text-telemetry-md font-bold text-secondary">
                      {Math.round(bestTrade.kw)} kW
                    </span>
                    <div className="flex items-center gap-space-2xs text-secondary my-1">
                      <span className="material-symbols-outlined text-[18px] animate-pulse">
                        arrow_forward
                      </span>
                    </div>
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                      Step {stepIdx}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant block">
                      Buyer Node
                    </span>
                    <span className="font-bold text-inverse-surface capitalize">
                      {DEFAULT_BUILDINGS.find((b) => b.id === bestTrade?.buyerId)?.name ?? bestTrade?.buyerId}
                    </span>
                    <span className="block text-body-sm text-on-surface-variant">Cap ₹8.50</span>
                  </div>
                </div>

                <div className="p-space-sm bg-surface-container-lowest rounded-md border border-surface-container-high/50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Clearing Settlement Price:
                    </span>
                    <span className="font-telemetry-xl text-telemetry-xl font-bold text-primary">
                      ₹{bestTrade.priceInrKwh.toFixed(2)}{' '}
                      <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-normal">
                        / kWh
                      </span>
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-1 block text-xs">
                    Midpoint of seller ask and grid ceiling plus wheeling & platform fee adjustment.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-space-lg my-space-sm text-center text-on-surface-variant font-mono text-xs">
                No matched clearing at step {stepIdx}.
              </div>
            )}

            {/* Financial Guarantee Breakdown */}
            <div className="space-y-1 p-space-sm rounded-lg bg-surface-container-low font-body-sm text-body-sm border border-surface-container-high/40">
              <div className="font-label-caps text-label-caps uppercase font-bold text-primary">
                Arbitrage Guarantee (§9.4)
              </div>
              <div className="flex justify-between text-on-surface-variant text-xs">
                <span>Buyer Energy Price:</span>
                <span className="font-telemetry-sm text-on-surface">₹7.20 / kWh</span>
              </div>
              <div className="flex justify-between text-on-surface-variant text-xs">
                <span>Wheeling + Platform Fee:</span>
                <span className="font-telemetry-sm text-on-surface">
                  ₹{WHEELING.toFixed(2)} + ₹{PLATFORM_FEE.toFixed(2)} = ₹{(WHEELING + PLATFORM_FEE).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-primary pt-1 border-t border-surface-container-high/60 text-xs">
                <span>All-in Delivered Cost:</span>
                <span className="font-telemetry-sm text-secondary">
                  ₹8.00 ≤ ₹8.50 (Grid Tariff)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: BUY DEMAND BOOK (Slate/Charcoal Theme) */}
        <div className="col-span-12 lg:col-span-4 p-space-base bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-inverse-surface" />
              <span className="font-label-caps text-label-caps uppercase tracking-wider font-bold text-primary">
                Buy Demand Book
              </span>
            </div>
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-primary">
              {Math.round(totalBuyKw)} kW Bids
            </span>
          </div>

          <div className="space-y-space-sm font-telemetry-sm text-telemetry-sm max-h-[380px] overflow-y-auto">
            {orderBook.buyRequests.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant text-xs font-mono">
                No active buy requests at step {stepIdx}.
              </div>
            ) : (
              orderBook.buyRequests.map((b, idx) => {
                const bName = DEFAULT_BUILDINGS.find((bd) => bd.id === b.buildingId)?.name ?? b.buildingId;
                return (
                  <div
                    key={idx}
                    className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container-high/40 relative overflow-hidden"
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-primary">{bName}</div>
                        <div className="text-on-surface-variant text-body-sm font-body-sm mt-0.5">
                          Bid Max: ₹{b.bidMaxInrKwh.toFixed(2)}/kWh · Grid: ₹{b.gridTariffInrKwh.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{Math.round(b.kw)} kW</div>
                        <div className="text-on-surface-variant text-[11px]">Bidded</div>
                      </div>
                    </div>
                    <div className="relative z-10 w-full bg-surface-container-highest h-1 rounded-full mt-space-xs overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: '90%' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container-high/40 flex items-center justify-between text-body-sm font-body-sm">
            <span className="text-on-surface-variant">Demand Ceiling:</span>
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-primary">Grid Cap Bound</span>
          </div>
        </div>
      </section>

      {/* LOWER SECTION: PRICE TIMELINE CHART & SETTLEMENT TABLE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Price Curve Chart */}
        <div className="lg:col-span-7">
          <ChartFrame
            title="Double-Auction Market Price & Volume Waveform"
            subtitle="24-Hour VWAP Clearing Price (₹/kWh) vs Grid Reference Tariff with Trade Volume"
            badge="VWAP PROFILE"
            data={priceData}
          >
            <div className="w-full h-72 pt-space-xs">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={priceData} margin={{ top: 10, right: 40, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="time"
                    interval={11}
                    stroke="#626469"
                    fontSize={11}
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    yAxisId="price"
                    stroke="#626469"
                    fontSize={11}
                    domain={[0, 14]}
                    unit=" ₹"
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <YAxis
                    yAxisId="volume"
                    orientation="right"
                    stroke="#9FA0A4"
                    fontSize={10}
                    domain={[0, 'auto']}
                    unit=" kW"
                    tickLine={false}
                    fontFamily="JetBrains Mono"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-xl border border-[#E2E4E8] bg-white/95 p-3 text-xs shadow-xl font-mono text-[#262626]">
                          <div className="font-semibold text-[#262626] mb-1 pb-1 border-b border-[#E2E4E8]">
                            Time: {label}
                          </div>
                          {payload.map((p) => (
                            <div key={p.name} className="flex justify-between gap-4 py-0.5">
                              <span className="text-[#626469]">{p.name}:</span>
                              <span className="font-bold text-[#262626]">
                                {p.name === 'Trade Volume' ? `${Number(p.value).toFixed(1)} kW` : `₹${Number(p.value).toFixed(2)}/kWh`}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine x={formatClock(cursor)} stroke="#009530" strokeWidth={2} yAxisId="price" />
                  <Bar
                    yAxisId="volume"
                    dataKey="volumeKw"
                    name="Trade Volume"
                    fill="#009530"
                    fillOpacity={0.12}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="price"
                    type="stepAfter"
                    dataKey="gridTariffInrKwh"
                    name="Grid Tariff"
                    stroke="#626469"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="clearingPriceInrKwh"
                    name="P2P Clearing VWAP"
                    stroke="#009530"
                    strokeWidth={3}
                    dot={false}
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>

        {/* Completed Bilateral Contract Execution Ledger */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-base rounded-xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
              Execution Ledger
            </span>
            <span className="font-telemetry-sm text-telemetry-sm font-bold text-secondary">
              {historyTrades.length} EXECUTIONS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 my-space-sm">
            <table className="w-full text-left font-telemetry-sm text-telemetry-sm border-collapse">
              <thead className="bg-surface-container-low font-label-caps uppercase text-on-surface-variant sticky top-0">
                <tr>
                  <th className="p-2 border-b border-surface-container-high">Time</th>
                  <th className="p-2 border-b border-surface-container-high">Seller → Buyer</th>
                  <th className="p-2 border-b border-surface-container-high text-right">kW</th>
                  <th className="p-2 border-b border-surface-container-high text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 text-on-surface">
                {historyTrades.slice(-20).reverse().map((t, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/40">
                    <td className="p-2 text-on-surface-variant">{formatStepTime(t.step)}</td>
                    <td className="p-2 font-bold">
                      {t.sellerId.toUpperCase()} → {t.buyerId.toUpperCase()}
                    </td>
                    <td className="p-2 text-right font-bold text-secondary">{Math.round(t.kw)}</td>
                    <td className="p-2 text-right">₹{t.priceInrKwh.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-space-xs border-t border-surface-container-high/40 text-right">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold text-xs">
              Instant Escrow Settlement · Zero Counterparty Risk
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
