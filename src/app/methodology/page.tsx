'use client';

import React from 'react';
import { ASSUMPTIONS_REGISTRY } from '@/simulation/constants';
import { useSimulation } from '@/store/useSimulation';
import { ShieldCheck, AlertCircle, BookOpen, Hash } from 'lucide-react';

export default function MethodologyPage() {
  const runs = useSimulation();
  const activeRun = runs.network_dr ?? runs.network;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Title */}
      <div className="border-b border-surface-container-high/60 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
              <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                PHYSICS &amp; GOVERNANCE REGISTRY
              </span>
            </div>
            <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
              THERMOS 2.0 Simulation Methodology &amp; Assumptions
            </h1>
            <p className="text-xs font-mono text-on-surface-variant mt-0.5">
              Transparent documentation of deterministic physical constants, assumptions, equations, and known limitations.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low border border-surface-container-high px-3 py-1.5 rounded text-xs font-mono">
            <Hash className="w-4 h-4 text-primary" />
            <span className="text-on-surface-variant">Run Hash:</span>
            <span className="text-primary font-bold">{activeRun.hash}</span>
          </div>
        </div>
      </div>

      {/* Honesty Note */}
      <div className="p-4 rounded-lg border border-amber-600/30 bg-amber-500/10 text-on-surface text-sm flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-headline-sm font-bold text-amber-800 text-xs uppercase tracking-wider">
            Perfect-Foresight Forecast Honesty Note (§5.9)
          </h4>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            The optimization engine schedules heating, cooling, battery dispatch, and EV charging with perfect knowledge of the day&apos;s 96-step weather, occupancy, and tariff schedules (oracle model). In real commercial deployments, model predictive controllers (MPC) operate on stochastic rolling horizon forecasts with uncertainty buffers.
          </p>
        </div>
      </div>

      {/* Challenge 02 Mapping Table (Patch 1 P0) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-headline-sm text-base font-bold text-on-surface">
            Challenge 02 Mapping: Objectives → Features → Verification Pages
          </h2>
        </div>
        <p className="text-xs font-mono text-on-surface-variant">
          How each of the four official competition criteria is addressed, modeled, and evidenced in THERMOS 2.0.
        </p>

        <div className="overflow-x-auto rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="px-4 py-3 font-semibold w-1/4">Challenge 02 Objective</th>
                <th className="px-4 py-3 font-semibold w-1/3">Feature(s) Addressing It</th>
                <th className="px-4 py-3 font-semibold">Proving Page &amp; Verified Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 font-sans text-xs bg-surface-container-lowest">
              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-on-surface">
                  1. Measurably cut energy consumption (kWh / % intensity) vs defined baseline
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  Timer-scheduled BMS baseline with night setback, thermal pre-cooling, daylight harvesting dimming, and DCV ventilation coupling.
                </td>
                <td className="px-4 py-3 font-mono text-primary font-semibold">
                  <span className="font-bold">/submission</span> &amp; <span className="font-bold">/overview</span>: Energy reduction (kWh/day &amp; %), EUI_annual (kWh/m²/yr).
                </td>
              </tr>

              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-on-surface">
                  2. Improve occupant experience (thermal, IAQ, lighting quality)
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  3R2C ODE comfort guard, single-zone CO₂ mass-balance DCV (clamp ≤ 800 ppm), min 75% delivered light constraint.
                </td>
                <td className="px-4 py-3 font-mono text-secondary font-semibold">
                  <span className="font-bold">/occupant</span>: Thermal compliance %, IAQ compliance %, minLightingFraction ≥ 0.75.
                </td>
              </tr>

              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-on-surface">
                  3. Manager visibility into energy use, equipment, and occupancy
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  Sub-metered end-use breakdown, model-based statistical FDD on condenser fouling, 24×6 occupancy pattern heatmaps.
                </td>
                <td className="px-4 py-3 font-mono text-amber-700 font-semibold">
                  <span className="font-bold">/overview</span> (End-use &amp; Heatmap), <span className="font-bold">/buildings/[id]</span> (FDD residual r &gt; 8%, wasted kWh/₹).
                </td>
              </tr>

              <tr className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-on-surface">
                  4. Shift flexible loads off-peak &amp; enable DISCOM DR
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  Thermal mass peak hold, EV charging shift, BTM battery peak arbitrage, OpenADR 2.0b telemetry dispatch.
                </td>
                <td className="px-4 py-3 font-mono text-purple-700 font-semibold">
                  <span className="font-bold">/vpp</span>: Peak shifted kWh, load factor, delivered kW, OpenADR JSON telemetry.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Annualization Mix (P2.2) */}
      <section className="space-y-3">
        <h2 className="font-headline-sm text-base font-bold text-on-surface">
          Annualization Model &amp; Weather Mix (P2.2)
        </h2>
        <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest text-xs font-mono text-on-surface shadow-sm space-y-2">
          <p className="font-sans text-on-surface-variant">
            Annualized metrics simulate 4 distinct climate scenarios weighted by historical weather distribution:
          </p>
          <pre className="p-3 rounded bg-surface-container-low text-primary text-xs font-mono border border-surface-container-high/60">
{`Weekdays (5/7 of year):  hot_weekday 0.40, mild_weekday 0.40, monsoon 0.20
Weekends (2/7 of year):  sunday_surplus 1.00
EUI_annual = 365 · [ (5/7)·Σ(w_s · E_s) + (2/7)·E_sunday ] / areaM2`}
          </pre>
          <p className="font-sans text-[11px] text-on-surface-variant">
            Every annual figure represents a simulated estimate. EUI is reported in kWh/m²/year.
          </p>
        </div>
      </section>

      {/* Assumptions Registry Table */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-headline-sm text-base font-bold text-on-surface">
            1. Assumptions &amp; Constants Registry (§3)
          </h2>
        </div>
        <p className="text-xs font-mono text-on-surface-variant">
          All constants are defined in <code className="text-primary font-bold">src/simulation/constants.ts</code> and exported with strict categorization.
        </p>

        <div className="overflow-x-auto rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="px-4 py-3 font-semibold">Constant Name</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Classification</th>
                <th className="px-4 py-3 font-semibold">Notes &amp; Citations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 font-mono text-[11px] bg-surface-container-lowest">
              {ASSUMPTIONS_REGISTRY.map((entry) => (
                <tr key={entry.key} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-4 py-2.5 font-sans font-semibold text-on-surface">
                    {entry.name}
                    <div className="text-[10px] text-on-surface-variant font-mono">{entry.key}</div>
                  </td>
                  <td className="px-4 py-2.5 text-primary font-bold">{String(entry.value)}</td>
                  <td className="px-4 py-2.5 text-on-surface-variant">{entry.unit}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-label-caps font-bold uppercase ${
                        entry.label === 'assumption'
                          ? 'bg-secondary/10 text-secondary border border-secondary/30'
                          : 'bg-primary/10 text-primary border border-primary/30'
                      }`}
                    >
                      {entry.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-on-surface-variant text-[11px] leading-relaxed">
                    {entry.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Physics & Governing Equations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="font-headline-sm text-base font-bold text-on-surface">
            2. Governing Physical Formulas (§5)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-2">
            <h3 className="font-headline-sm font-bold text-on-surface text-sm">Thermal Mass Dynamics (§5.3)</h3>
            <pre className="p-2.5 rounded bg-surface-container-low text-on-surface text-[11px] overflow-x-auto border border-surface-container-high/60">
{`Tfree      = Tout + ΔT_INT · occ
α          = DT_H / τ   (DT_H = 0.25 h)
Tin[k+1]   = Tin[k] + α · (Tfree − K·u − Tin[k])
u_raw      = (Tfree − Tin[k] − (Ttgt − Tin[k])/α) / K
u          = clamp(u_raw, 0, 1)
COP(Tout)  = max(2.0, 4.2 − 0.07·(Tout − 27))
hvacKw     = hvacRatedKw · u · (COP_REF / COP(Tout))`}
            </pre>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Lumped-capacitance 1st-order differential envelope equation with external solar/ambient coupling and internal metabolic gains.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-2">
            <h3 className="font-headline-sm font-bold text-on-surface text-sm">Battery Cell Conservation (§5.6)</h3>
            <pre className="p-2.5 rounded bg-surface-container-low text-on-surface text-[11px] overflow-x-auto border border-surface-container-high/60">
{`RTE        = 0.90, η_ch = η_dis = √0.90 ≈ 0.9487
Charge:    soc[k+1] = soc[k] + P_ch · η_ch · DT_H
Discharge: soc[k+1] = soc[k] − (P_dis / η_dis) · DT_H
Bounds:    floor ≤ soc ≤ ceil (Hospital floor: 40%)
Degradation: Discharged_kWh · ₹1.0/kWh`}
            </pre>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Strict chemical state-of-charge conservation at the cell with Coulombic round-trip efficiency and wear depreciation.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-2">
            <h3 className="font-headline-sm font-bold text-on-surface text-sm">P2P Market Clearing (§5.11)</h3>
            <pre className="p-2.5 rounded bg-surface-container-low text-on-surface text-[11px] overflow-x-auto border border-surface-container-high/60">
{`Seller ask (solar):   FEED_IN + ₹0.50 = ₹3.00/kWh
Seller ask (battery): 6.0 / 0.9 + 1.0 = ₹7.667/kWh
Buyer bidMax:         Tariff − Fee − Wheeling − Margin
Clearing Price:       (SellerAsk + BuyerBidMax) / 2
All-in Buyer Cost:    Price + ₹0.30 Fee + ₹0.50 Wheeling
Guarantee:            AllInCost ≤ Tariff − ₹0.20 Margin`}
            </pre>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Double-auction bilateral matching with guaranteed consumer savings and producer rent over standard utility tariffs.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-2">
            <h3 className="font-headline-sm font-bold text-on-surface text-sm">Demand Response &amp; Settlement (§5.12, §5.13)</h3>
            <pre className="p-2.5 rounded bg-surface-container-low text-on-surface text-[11px] overflow-x-auto border border-surface-container-high/60">
{`measured(k) = max(0, refImport(k) − eventImport(k))
achieved(k) = min(requestKw, measured(k))
payoutInr   = Σ achieved(k) · DT_H · ₹12.0/kWh
feeInr      = 15% · payoutInr
Day Cost    = Σ StepCosts + PeakImport · ₹450/30`}
            </pre>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Negative-watt baseline verification against uncurtailed cluster reference run with pro-rata payout distribution.
            </p>
          </div>
        </div>
      </section>

      {/* Known Limitations (§14) */}
      <section className="space-y-3">
        <h2 className="font-headline-sm text-base font-bold text-on-surface">
          3. Known Limitations (§14)
        </h2>
        <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm text-xs text-on-surface-variant leading-relaxed space-y-2">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Single-day simulation:</strong> Operates over 96 discrete 15-minute intervals with a two-pass warm-up to initialize thermal inertia. Long-term multi-season degradation is approximated.</li>
            <li><strong>Perfect foresight:</strong> Schedulers leverage deterministic weather and occupancy profiles; real-world deployments utilize stochastic model predictive control (MPC).</li>
            <li><strong>Lossless distribution feeder:</strong> Internal microgrid electrical lines are modeled without ohmic I²R heat losses or reactive power impedance flow equations.</li>
            <li><strong>Tariffs and wheeling:</strong> Grid ToU tariffs, wheeling charges (₹0.50/kWh), and platform commissions are illustrative proxies. Actual open-access charges vary by Indian State Electricity Regulatory Commissions (SERCs).</li>
            <li><strong>Financial settlement:</strong> P2P energy trades constitute economic clearing settlements between sub-meters on a shared secondary substation feeder. Physical electron flow obeys Kirchhoff&apos;s laws.</li>
            <li><strong>Schematic vertical floors:</strong> The 12-floor building visualization illustrates normalized load and comfort distribution based on documented archetypal weights, not individual floor sensor telemetry.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
