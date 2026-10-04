# THERMOS 2.0 — Build Log & Verification Tracking

## Milestone Status Overview
- [x] **M1 Engine core:** constants, buildings, rng, weather, occupancy, load, thermal, EV, battery, baseline mode, cost, carbon, tests 1–5, 8–10, 12.
- [x] **M2 Optimizer + market + DR:** optimizer (building mode), market, network and DR modes, remaining tests (6, 7, 11), `runAll`, selectors, decisions.
- [x] **M3 Shell:** layout, header (scenario, playback, badge), theme tokens, `ChartFrame`, formatters, `/methodology`.
- [x] **M4 Overview:** KPI strip, waveform, budget, ticker, attribution, comparison bars, scale test (§9.11).
- [x] **M5 Network + Marketplace:** SVG map, arcs and particles, order book, price chart, history, leaderboard.
- [x] **M6 VPP:** controls, capacity commitment table, and four charts (A, B, C, D).
- [x] **M7 Buildings, Simulator, ROI, Autopilot triangle:** 12-floor schematic, equipment cards, 5 charts, scenario sliders, barycentric triangle.
- [x] **M8 Demo mode + landing:** guided 10-scene narration stepper with auto-play dwell timer, live low-opacity waveform background.
- [x] **M9 Polish & Performance:** production build verified, 0 TypeScript errors, engine execution time ~5.5 ms (< 50 ms budget), 157 automated vitest tests green.
- [x] **M10 Scale test:** N ∈ {6, 12, 24, 48} microgrid scaling and city vision calculator implemented.

## Verification & Engine Invariants
All 157 unit tests, property checks, and invariants are passing cleanly:
1. Determinism verified: byte-identical run result and hashes using Mulberry32 (`SEED = 20261004`).
2. Array lengths: 96 steps for all series, finite numbers only, no NaN/Infinity.
3. Conservation of energy: `physicalGrid = load + charge - discharge - solar` holds to `< 1e-6` kW across all 6 buildings and all 96 steps.
4. Battery state of charge respects strict floor/ceiling constraints, battery power ratings, and degradation calculations.
5. HVAC thermal recurrence formula recomputed independently matches the simulation state.
6. Market conservation: `Σ sold == Σ bought` and `Σ billedGrid == Σ physicalGrid` across all network trades.
7. Buyer margin protection: all-in P2P power cost never exceeds `tariff - BUYER_MARGIN`.
8. EV energy conservation between baseline and optimized modes maintained; site limits strictly honored.
9. Cost recomputed from first principles matches `totals.cost` within ₹0.01.
10. Comfort metrics computed independently equal reported `comfortPct`.
11. DR curtailment and incentive payouts strictly bounded by requested and measured values.
12. Carbon emissions recomputed independently match cluster totals.
13. Selectors map 1:1 with `RunResult` source arrays.
14. Ticker display contract: at integer cursor values, cumulative displayed saving strictly matches the exact step sum.
15. Engine execution performance: ~5.5 ms per run, surpassing the < 50 ms requirement.
16. Grep check: no `Math.random()` calls outside `rng.ts`; zero `localStorage` dependencies.

## Scenario Benchmark Metrics & Emergent Results (Honesty Report)

| Scenario | L1 Cost Saving | L2 P2P Uplift | Comfort (Worst/Avg) | Peak Reduction | CO₂ Avoided | DR Delivered |
|---|---|---|---|---|---|---|
| **Hot Summer Weekday (Default)** | 2.63% (₹15,711) | 0.00% (₹0) | 100.0% / 100.0% | 0 kW | 1,695.4 kg | N/A |
| **Severe Heatwave** | 3.27% (₹25,935) | 0.00% (₹0) | 100.0% / 100.0% | 0 kW | 1,976.9 kg | N/A |
| **Monsoon Overcast** | 1.64% (₹8,347) | 0.00% (₹0) | 100.0% / 100.0% | 0 kW | 1,226.1 kg | N/A |
| **Sunday Surplus** | 1.53% (₹8,223) | **0.52% (₹2,742)** | 100.0% / 100.0% | 0 kW | 1,584.4 kg | N/A |
| **Peak Commercial Occupancy** | 2.92% (₹20,060) | 0.00% (₹31) | 100.0% / 100.0% | 0 kW | 1,766.9 kg | N/A |
| **Grid Crisis / DR Event** | 2.63% (₹15,711) | 0.00% (₹0) | 100.0% / 100.0% | 0 kW | 1,853.1 kg | 1,266 kW-steps (₹3,798) |

## Patch 1: Challenge 02 Alignment Verification (All Tests Green)
- [x] **P1 Realistic Baseline:** Timer-scheduled BMS baseline with night setback (30°C / HVAC off), 1h morning pre-cool, and security lighting verified against all 6 building occupancy schedules.
- [x] **P2 Energy Intensity & Attribution:** kWhDay, EUI_day, EUI_annual, energyReductionPct (headline metric), costReductionPct, peakReductionPct computed deterministically. 4-scenario annualization mix (hot 40%, mild 40%, monsoon 20%, weekend 100%) and feature ablation waterfall with interaction residual verified.
- [x] **P3 Occupant Experience:** Exact mass-balance single-zone CO₂ differential solver, DCV airflow modulation, ventilation energy coupling (`OA_FRACTION = 0.25`), and min 75% delivered lighting fraction verified. Dedicated `/occupant` page with building league operational.
- [x] **P4 FDD & Equipment Performance:** Synthetic condenser fouling fault on Orbit starting at step 40 with 12% COP degradation ramp verified. Residual detector triggers flag at step 48 (detection delay = 8 steps), tracking wasted kWh and INR.
- [x] **P5 Management Views:** End-use stacked breakdown, occupancy heatmap, EUI intensity table, and ECBC/BEE benchmark handling (unconfigured benchmarks render empty/null without invented data per `docs/BENCHMARKS_TODO.md`).
- [x] **P6 DISCOM Integration:** Dedicated DISCOM view on `/vpp` with feeder baseline vs optimized vs DR, load factor, peak window shifting, sample OpenADR JSON payload, and state programme caveat banner.
- [x] **P7 Climate Presets & Retrofit Tiers:** 4 climate zones (`composite`, `hot_dry`, `warm_humid`, `moderate`) and 3 retrofit tiers (A: sensors & cloud analytics, B: BMS control/DCV/lighting, C: battery dispatch & network) on `/simulator` and `/roi`.
- [x] **P8 Architecture Diagram:** Static hand-crafted 5-layer SVG diagram on `/architecture` mapping Field, Edge, Cloud, Control Outputs, and External interfaces.
- [x] **P9 Submission Claims:** Submission claim card on `/submission` with verified metrics, ablation waterfall, and one-click "Export Markdown" contest submission.
- [x] **P10 Demo Mode Scenes:** 12 sequential scenes covering the full platform including Scene 4 (IAQ DCV optimization) and Scene 5 (FDD condenser fouling detection).

### Test Suite Summary
- **Test files passed:** 5 / 5 (`invariants.test.ts`, `patch1.test.ts`, `selectors.test.ts`, `performance.test.ts`, `ui_integrity.test.ts`)
- **Total tests passed:** 214 / 214 (100% green)
- **Engine performance:** ~7.2 ms per full simulation run (well below the < 50 ms budget)
- **Next.js Production Build:** 15 routes compiled with 0 TypeScript/lint errors.

