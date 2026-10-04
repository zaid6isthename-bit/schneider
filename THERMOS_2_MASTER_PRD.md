# THERMOS 2.0 — MASTER BUILD PRD (paste whole file into your coding agent)

**Role:** You are a senior full-stack engineer and simulation engineer. Build the product below from scratch, end to end, in one repository. Follow this document literally. Where this document gives a formula, constant, table or algorithm, implement exactly that. Where it is silent, choose the simplest option and write the choice into `docs/DECISIONS.md`. Never invent data, APIs, library features or numbers.

**Product:** THERMOS — "Buildings that think, and trade, before they consume." A browser-only prototype of (L1) per-building energy optimization, (L2) a peer-to-peer energy network between 6 buildings on one feeder, and (L3) a virtual power plant (VPP) responding to a utility demand-response (DR) event. All numbers come from one deterministic simulation engine.

---

## 0. AGENT OPERATING RULES (highest priority)

1. **Single source of truth.** Every number, chart point, ticker, narration sentence and map animation is derived from a `RunResult` produced by the simulation engine (`/src/simulation`). No component may contain a hard-coded displayed number, a literal data array, or `Math.random()`.
2. **No decorative data.** Forbidden: looping CSS/SVG animations that imply data, fake noise, sine waves drawn independently of the engine, "pre-scripted" decisions, placeholder values. Allowed motion: cursor playback over precomputed series, number tweening between exact values, and particles whose count/speed are computed from the kW of the current step (and which stop when kW = 0).
3. **Determinism.** One seeded PRNG (mulberry32, seed constant `SEED = 20261004`). Same config → byte-identical `RunResult`. Seeded randomness is only used inside the engine, once, at config-build time.
4. **Chart contract.** Every chart reads from a selector (`/src/simulation/selectors.ts`) that returns arrays taken directly from `RunResult`. Each chart sits in `<ChartFrame>` with a **"View data"** toggle (table of the exact plotted values) and **"Export CSV"**. Line charts use `type="linear"` or `"stepAfter"` (no smoothing that changes shape). `isAnimationActive={false}` on data updates.
5. **Results are emergent. Do not tune.** Do not adjust formulas to hit a target saving. If results look weak, write that in `docs/BUILD_LOG.md`; you may change only values in the assumptions registry (§3) and building table (§4), and must log each change. Never edit a formula to force a pass.
6. **Honesty UI.** A permanent badge "SIMULATED DATA · ASSUMPTIONS ON /methodology" in the header. `/methodology` renders every constant in §3 with its label (assumption / illustrative), the optimizer's perfect-foresight note (§5.9), and the known limitations (§14).
7. **Pure engine.** `/src/simulation` is framework-free TypeScript (no React, no DOM). Must run in Node for tests.
8. **TypeScript strict**, no `any`. Run lint + typecheck + tests before declaring any milestone done. A milestone is not done while a test fails.
9. **Do not guess library APIs.** Check installed package versions and read their docs/types before use (Next.js, Recharts, Framer Motion, Vitest, Playwright). Pin versions exactly as installed.
10. **No backend, no database, no external API calls, no network at runtime.** Deploys as a static/Next.js app on Vercel.
11. Report at the end of each milestone: what was built, test results, any deviation, any assumption changed.

---

## 1. TECH STACK

- Next.js (App Router) + TypeScript strict, Tailwind CSS
- Recharts for all charts; custom SVG only for the network map and building floor view (both data-driven)
- Framer Motion (minimal: page/panel transitions, number tweens)
- Zustand for UI/playback state (engine results held in memoized selectors, not duplicated into state)
- Vitest (engine unit/property tests), Playwright (smoke + data-integrity E2E)
- Fonts via `next/font`: Inter (UI) and JetBrains Mono (numbers)
- Intl formatting: `en-IN` for ₹ and grouping

### Folder structure
```
/src
  /app  (/, /overview, /network, /marketplace, /vpp, /buildings/[id], /simulator, /roi, /demo, /methodology)
  /components (/ui, /charts, /network, /building, /layout, /demo)
  /simulation
    constants.ts   buildings.ts   scenarios.ts   rng.ts   weather.ts   occupancy.ts
    load.ts        thermal.ts     ev.ts         battery.ts  optimizer.ts
    market.ts      dr.ts          cost.ts       carbon.ts   engine.ts
    selectors.ts   decisions.ts   narration.ts  scale.ts    types.ts
  /store (playback.ts, ui.ts)
  /lib (format.ts, theme.ts)
/tests (engine/*.test.ts, e2e/*.spec.ts)
/docs (DECISIONS.md, BUILD_LOG.md)
```

---

## 2. TIME MODEL

- Simulate one day = 96 steps, `STEP_MIN = 15`, `DT_H = 0.25`. Step `k` covers `[k*15min, (k+1)*15min)`; hour-of-day `h = k * 0.25`.
- **Two-pass warm-up:** run the day twice; pass 1 is discarded and its end state (indoor temperatures, battery SoC) becomes pass 2's start state. Report pass 2 only. This removes start-of-day artifacts.
- Hourly profiles (24 values, index = hour) are linearly interpolated to 15-min; the value for hour 23 wraps to hour 0 at the day boundary.

---

## 3. ASSUMPTIONS REGISTRY (`constants.ts`; each exported with a `label: 'assumption' | 'illustrative'` and shown on /methodology)

| Constant | Value | Note |
|---|---|---|
| Tariff off-peak 22:00–06:00 | ₹6.0/kWh | illustrative ToU, not a specific DISCOM tariff |
| Tariff normal 06:00–17:00 | ₹8.5/kWh | illustrative |
| Tariff peak 17:00–22:00 | ₹11.0/kWh | illustrative |
| FEED_IN | ₹2.5/kWh | export credit, assumption |
| DEMAND_CHARGE | ₹450 per kW of max billed import per month; daily share = value/30 | assumption |
| WHEELING | ₹0.50/kWh | paid to utility on P2P energy, assumption (varies by state) |
| PLATFORM_FEE | ₹0.30/kWh | paid by buyer to THERMOS |
| BUYER_MARGIN | ₹0.20/kWh | minimum buyer saving |
| SELLER_SOLAR_MARGIN | ₹0.50/kWh above FEED_IN | seller ask for export energy (= ₹3.0) |
| BATT_RTE | 0.90 round trip; η_ch = η_dis = √0.90 | assumption |
| BATT_DEGRADATION | ₹1.0 per kWh discharged | applied in every mode |
| BATT_FLOOR / CEIL | 20% / 95% of kWh | hospital floor 40% |
| BATT_PREPEAK_TARGET | 90% SoC | |
| Battery ask (network) | `OFFPEAK_TARIFF / BATT_RTE + BATT_DEGRADATION` (= ₹7.667) | |
| DR_RATE | ₹12/kWh of delivered reduction | assumption |
| DR_FEE_PCT | 15% of DR payout to THERMOS | assumption |
| EF_BASE | 0.71 kg CO₂/kWh | assumption; user must verify vs CEA baseline before citing externally |
| EF multiplier by hour | 22–06: 0.90; 06–10: 1.00; 10–16: 0.85; 16–18: 1.00; 18–22: 1.15 | illustrative |
| TREE_ABSORPTION | 21 kg CO₂/tree/year → 0.0575 kg/tree/day | assumption |
| PV_PR | 0.78; temp coeff −0.004 /°C above 25 °C cell temp; `Tcell = Tout + 0.025·GHI` | |
| GHI_MAX | 950 W/m² at solar noon; sunrise 06:00, sunset 18:00 | |
| COP | `COP(T)=max(2.0, 4.2 − 0.07·(T−27))`, `COP_REF = 3.5` | |
| BASELINE_SETPOINT | 24.0 °C | |
| OCC_THRESHOLD | 0.10 (below = unoccupied; comfort not scored) | |
| LIGHT_DIM_MAX | 0.25 at GHI ≥ 600 W/m² | |
| NIGHT_SETBACK | 27.0 °C | |
| SETBACK_LEAD | 6 steps (90 min) | |
| PRECOOL_LEAD | 8 steps (2 h) before peak start | |
| MIN_TRADE_KW | 1.0 | |
| ΔT_INT | 3.0 °C × occupancy (internal gain) | |
| CAPEX_INR_PER_M2 | ₹120 | ROI calc only, assumption |

Tariff function: `tariffAt(k)` returns `{period, inrPerKwh}`. Peak window = steps 68–87 (17:00–21:45).

---

## 4. BUILDINGS (`buildings.ts`) — exactly these six

| id | name | type | area m² | baseKw | plugKw | lightKw | hvacRatedKw | K (°C) | τ (h) | solar kWp | battery kWh / kW | EV sessions | comfort band °C | daylight frac |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nova | Nova Tower | office | 42000 | 80 | 220 | 110 | 520 | 26 | 4 | 500 | 400 / 150 | 28 | 22–26 | 0.6 |
| horizon | Horizon Mall | retail | 55000 | 150 | 260 | 240 | 800 | 28 | 3 | 300 | 0 / 0 | 40 | 22–26 | 0.1 |
| citycare | CityCare Hospital | hospital | 28000 | 150 | 100 | 60 | 360 | 26 | 6 | 220 | 600 / 200 | 14 | 22–25 | 0.3 |
| campus | Campus Block D | university | 30000 | 60 | 120 | 60 | 260 | 26 | 5 | 800 | 500 / 200 | 30 | 22–27 | 0.6 |
| orbit | Orbit Tech Park | it | 70000 | 220 | 380 | 150 | 650 | 26 | 4 | 600 | 800 / 300 | 60 | 22–26 | 0.5 |
| meridian | Meridian Hotel | hotel | 20000 | 90 | 120 | 70 | 300 | 26 | 5 | 150 | 0 / 0 | 16 | 22–26 | 0.2 |

Location label: "Sector 47, Gurugram (simulated)". Hospital: no night setback, battery floor 40%.

### Occupancy profiles (weekday, hour 0→23)
```
office     [0.03,0.03,0.03,0.03,0.03,0.05,0.10,0.30,0.65,0.90,0.95,0.92,0.80,0.88,0.95,0.92,0.80,0.55,0.25,0.12,0.06,0.04,0.03,0.03]
retail     [0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.05,0.20,0.40,0.55,0.60,0.55,0.55,0.65,0.80,0.95,1.00,0.95,0.70,0.20,0.05]
hospital   [0.55,0.50,0.50,0.50,0.50,0.55,0.65,0.80,0.95,1.00,1.00,0.95,0.90,0.90,0.95,0.95,0.90,0.85,0.80,0.75,0.70,0.65,0.60,0.55]
university [0.02,0.02,0.02,0.02,0.02,0.02,0.03,0.10,0.45,0.85,1.00,1.00,0.80,0.85,1.00,0.95,0.70,0.35,0.15,0.08,0.05,0.03,0.02,0.02]
it         [0.30,0.28,0.25,0.25,0.25,0.28,0.35,0.50,0.75,0.90,0.95,0.92,0.80,0.88,0.95,0.92,0.85,0.75,0.60,0.50,0.45,0.40,0.35,0.32]
hotel      [0.70,0.70,0.70,0.70,0.70,0.65,0.60,0.50,0.40,0.35,0.30,0.30,0.35,0.35,0.35,0.40,0.45,0.55,0.70,0.80,0.85,0.85,0.80,0.75]
```
Weekend transform: `occ = occMin + (occ − occMin)·kWeekend`, clamp [0,1], with `occMin = min(profile)` and kWeekend: office 0.15, retail 1.25, hospital 0.90, university 0.10, it 0.40, hotel 1.10.
Scenario multiplier `occScale` applied last, then clamp to [0,1].

### EV sessions (generated once in `ev.ts` with the seeded RNG, in building order)
Per building, `sessions` count from table. Each session: `arrivalStep`, `departStep`, `energyKwh`, `maxKw = 7.4`.
- arrival hour uniform in window, dwell hours uniform in range, energy uniform(6, 22) kWh, then clipped to `maxKw · dwell`.
- Windows (arrive h / dwell h): office/nova 8–11 / 8–9; retail 11–20 / 1.5–3; hospital 7–20 / 4–10; university 8–11 / 6–9; it 8–12 / 8–10; hotel 15–22 / 10–14.
- `departStep = min(95, arrivalStep + round(dwell·4))`. Sessions never cross midnight.
- Site limit `evSiteLimitKw = 0.6 · sessions · 7.4`.

---

## 5. SIMULATION ENGINE SPEC

`simulate(input: SimInput): RunResult`, with `SimInput = { buildings, scenario, mode: 'baseline'|'building'|'network'|'network_dr', autopilot: {wComfort,wCost,wCarbon}, seed }`.
Modes: `baseline` = no optimization; `building` = L1; `network` = L1 + P2P market (L2); `network_dr` = L2 + DR event (L3).

### 5.1 Weather (`weather.ts`)
- `Tout(h) = Tmean + A·cos(2π(h−15)/24) + n(k)` where `n` is an AR(1) seeded series: `n[k] = 0.9·n[k−1] + ε`, `ε ~ N(0, 0.15)`, clamped ±1.0 °C. Scenario supplies `Tmean`, `A`.
- Clear-sky GHI: `GHI(h) = GHI_MAX · max(0, sin(π(h−6)/12))^1.2`. Actual `GHI = GHI_clearsky · cloud(k)`; `cloud(k) = scenario.cloudBase · (1 + c(k))`, `c` = seeded AR(1) clamped so `cloud ∈ [0.3, 1.0]` in clear scenarios, `[0.1, 0.6]` in monsoon.
- Solar: `solarKw = kWp · (GHI/1000) · PV_PR · (1 − 0.004·max(0, Tcell − 25))`.

### 5.2 Non-HVAC load
`occ(k)` as §4. `lightingKw(k) = lightKw · occ(k) · (1 − dim)` where `dim = 0` in baseline and `dim = LIGHT_DIM_MAX · daylightFraction · min(1, GHI/600)` in optimized modes (plus DR extra dim, §5.10). `plugKwNow = plugKw · occ`. `baseKwNow = baseKw` (constant).

### 5.3 Thermal model (`thermal.ts`) — one formula for every mode
State `Tin`. Per step with outdoor `Tout`, occupancy `occ`, HVAC fraction `u ∈ [0,1]`:
```
Tfree      = Tout + ΔT_INT·occ
α          = DT_H / τ
Tin[k+1]   = Tin[k] + α·(Tfree − K·u − Tin[k])
```
The controller chooses `u` to reach a target `Ttgt[k+1]`:
```
u_raw = (Tfree − Tin[k] − (Ttgt − Tin[k])/α) / K
u     = clamp(u_raw, 0, 1)         // then Tin[k+1] is computed with the CLAMPED u
```
Electrical power:
```
copFactor = COP_REF / COP(Tout)
hvacKw    = hvacRatedKw · u · copFactor
```
Baseline: `Ttgt = 24.0` always. Comfort violation emerges when `u` saturates at 1.

### 5.4 Comfort metric
`comfortPct = Σ_k occ(k)·[Tmin ≤ Tin(k) ≤ Tmax] / Σ_k occ(k)` over steps with `occ ≥ OCC_THRESHOLD`. Also report `violationSteps` and `maxExceedanceC`.

### 5.5 EV (`ev.ts`)
- Baseline: each session charges at `maxKw` from `arrivalStep` until `energyKwh` delivered (limited by `evSiteLimitKw`, first-come order).
- Optimized: for each session, build candidate steps `[arrivalStep, departStep]`; sort by `score(k)` ascending; deliver energy greedily at ≤ `maxKw` per step and ≤ remaining site limit per step; score = `(1−wCarbon)·norm(tariff) + wCarbon·norm(efMult)`, where `norm` = min-max over the day. If a session cannot complete (infeasible), deliver as much as possible and record `unmetKwh`.
- Total delivered energy is conserved between modes (test).

### 5.6 Battery (`battery.ts`)
State `soc` (kWh at the cell). Charge: `soc += P_ch·η_ch·DT_H`; discharge: `soc −= (P_dis/η_dis)·DT_H`. Limits: power ≤ battery kW, `soc ∈ [floor, ceil]`. Define `pre = load_total − solar` (kW, before battery).
- **Baseline (self-consumption):** if `pre < 0` charge with `min(−pre, headroom)`; if `pre > 0` discharge `min(pre, deliverable)` at any time of day.
- **Optimized:** (a) if `pre < 0` charge from surplus first; (b) in **off-peak** periods grid-charge toward `BATT_PREPEAK_TARGET`, limited by power; when `wCarbon > 0.5` grid-charge only in hours with EF multiplier ≤ 0.90; (c) in the **peak** period discharge `min(pre, power, deliverable)` to offset local import (no export in local dispatch); (d) otherwise hold.
- Degradation cost = `BATT_DEGRADATION × kWh discharged` in every mode.

### 5.7 Autopilot mapping (`optimizer.ts`)
Triangle gives barycentric weights `(wComfort, wCost, wCarbon)`, sum = 1, default (1/3, 1/3, 1/3). Parameters:
```
peakHoldTarget = comfortMax − lerp(0.2, 1.5, wComfort)
precoolTarget  = comfortMin + lerp(1.5, 0.5, wCost)
```
(`lerp(a,b,t)=a+(b−a)t`). `wCarbon` affects EV scoring and battery grid-charge rule as stated.

### 5.8 Setpoint schedule (optimized modes), evaluated per step in this priority order
1. If DR event active: `Ttgt = max(peakHoldTarget, comfortMax − 0.2)`.
2. If step in peak window: `Ttgt = peakHoldTarget`.
3. If step in the `PRECOOL_LEAD` steps before peak start: `Ttgt = precoolTarget`.
4. If type ≠ hospital and `max(occ[k..k+SETBACK_LEAD]) < OCC_THRESHOLD`: `Ttgt = NIGHT_SETBACK`.
5. Else `Ttgt = 24.0`.
All `Ttgt` values are clamped so that unoccupied steps may exceed the band, but occupied-step targets stay within `[comfortMin, comfortMax]`.

### 5.9 Forecast honesty
The optimizer uses the true weather/occupancy/tariff arrays (perfect-foresight oracle). State this on /methodology. Optional P2: "Forecast error" toggle that perturbs forecast inputs (±seeded noise) only for scheduling decisions while physics uses truth.

### 5.10 Per-step order of operations (per building, then network)
```
for k in 0..95:
  for each building b:
    1 compute occ, Tout, GHI, solarKw
    2 pick Ttgt (baseline: 24; else §5.8); compute u, hvacKw, Tin[k+1] (§5.3)
    3 lighting (with dim), plug, base, ev (§5.5)
    4 load_total = base + plug + lighting + hvac + ev
    5 battery local dispatch (§5.6) → charge, dischargeLocal, soc'
    6 gridPointLocal = load_total + charge − dischargeLocal − solarKw     // + = import, − = export
  if mode ∈ {network, network_dr}: run market (§5.11) → trades, extra battery discharge, finalize soc
  physicalGrid_b  = gridPointLocal_b − extraDischarge_b
  billedGrid_b    = physicalGrid_b + extraDischarge_b + soldFromExport_b − bought_b
                    (equivalently: gridPointLocal − bought + soldFromExport)
```
**DR (mode `network_dr`, steps in the event window only):** extra measures applied in step 2–5: `Ttgt` per §5.8 rule 1; EV: no charging except sessions that would otherwise be unable to finish before departure (those charge at the minimum rate needed); extra lighting dim `+0.10` (multiplicative on remaining lighting); battery discharge = `min(power, deliverable, max(0, pre))` regardless of tariff period.

### 5.11 Market (`market.ts`) — per step, network modes
1. **Sellers.**
   - Export seller: `qty = max(0, −gridPointLocal_b)`, `ask = FEED_IN + SELLER_SOLAR_MARGIN`.
   - Battery seller: only if building has a battery, `gridPointLocal_b ≤ 0`, and (period is peak or DR active): `spare = max(0, min(battKw − dischargeLocal, (soc−floor)·η_dis/DT_H − dischargeLocal))`, `ask = OFFPEAK_TARIFF/BATT_RTE + BATT_DEGRADATION`.
2. **Buyers.** `demand_b = max(0, gridPointLocal_b)`, `bidMax = tariff − PLATFORM_FEE − WHEELING − BUYER_MARGIN` (same for all buyers in a step).
3. **Match.** Buyers sorted by `demand` desc (tie: id). Sellers sorted by `ask` asc (tie: id). For each buyer, for each seller with remaining qty and `ask ≤ bidMax`: `q = min(buyerRemaining, sellerRemaining)`; skip if `q < MIN_TRADE_KW`; `price = (ask + bidMax)/2`; record `Trade{step, sellerId, buyerId, kw: q, priceInrKwh: price, source: 'export'|'battery'}`.
4. **Apply.** Seller's sold qty draws from export first, then battery. Battery part becomes `extraDischarge` and updates `soc` with η_dis. Buyer's `bought = Σ q`.
5. Guarantee by construction: buyer all-in cost `price + PLATFORM_FEE + WHEELING ≤ tariff − BUYER_MARGIN`.
6. Step summary: `volumeKw`, `vwapInrKwh` (volume-weighted average price, null if no trades).

### 5.12 DR event result (`dr.ts`)
`DrEvent = {startStep, endStep, requestKw}`. Reference run = same scenario, mode `network`, no event. For each event step:
```
refImport(k)   = Σ_b max(0, billedGrid_b^ref(k))
eventImport(k) = Σ_b max(0, billedGrid_b^event(k))
measured(k)    = max(0, refImport − eventImport)
achieved(k)    = min(requestKw, measured(k))
payoutInr      = Σ achieved(k)·DT_H·DR_RATE ;  feeInr = DR_FEE_PCT·payoutInr
```
Per-building contribution = `max(0, refImport_b − eventImport_b)`. Payout is split in proportion to contribution. Under-delivery is reported honestly (partial payout, shortfall kW per step). Comfort violations during the event come from the real `Tin` series.

### 5.13 Costs (`cost.ts`), per building per step then day total
```
importCost   = max(0, billedGrid)·DT_H·tariff
exportCredit = max(0, −billedGrid)·DT_H·FEED_IN
p2pBuy       = Σ bought_q·DT_H·(price + PLATFORM_FEE + WHEELING)
p2pSellRev   = Σ sold_q·DT_H·price
battDegr     = dischargedKwh·BATT_DEGRADATION
stepCost     = importCost − exportCredit + p2pBuy − p2pSellRev + battDegr
dayCost      = Σ stepCost + (max over k of max(0,billedGrid)) · DEMAND_CHARGE/30
```
Notes: for `baseline`/`building` modes, `billedGrid = physicalGrid` and there are no P2P terms. Platform revenue = `PLATFORM_FEE·kWh traded + DR fee`. DR payout is reported separately, not netted into energy cost. Units: kW × 0.25 h = kWh.

### 5.14 Carbon (`carbon.ts`)
`ef(k) = EF_BASE · efMult(hour)`. Cluster emissions `= Σ_k ef(k)·DT_H·max(0, Σ_b physicalGrid_b(k))`. P2P trading is a financial settlement and does not by itself change physical emissions; carbon benefit comes from physical load shifting, solar self-use and battery behavior. Show per-building gross emissions as `Σ ef·DT·max(0, physicalGrid_b)` labeled "gross". Trees equivalent = `avoidedKg / 0.0575` ("tree-days"), with the assumption stated beside it.

### 5.15 `RunResult` (types.ts) — arrays are length 96
```ts
interface BuildingSeries {
  id: string;
  occ: number[]; tOut: number[]; ghi: number[]; solarKw: number[];
  baseKw: number[]; plugKw: number[]; lightingKw: number[]; hvacKw: number[]; evKw: number[];
  loadKw: number[]; battChargeKw: number[]; battDischargeKw: number[]; battSocKwh: number[];
  tIn: number[]; tTarget: number[]; hvacU: number[];
  gridPointLocalKw: number[]; physicalGridKw: number[]; billedGridKw: number[];
  soldKw: number[]; boughtKw: number[]; stepCostInr: number[];
}
interface Trade { step:number; sellerId:string; buyerId:string; kw:number; priceInrKwh:number; source:'export'|'battery' }
interface RunResult {
  mode: Mode; scenarioId: string; seed: number; hash: string;       // hash of all arrays, for determinism test
  buildings: Record<string, BuildingSeries>;
  tariffInrKwh: number[]; tariffPeriod: ('offpeak'|'normal'|'peak')[]; efKgPerKwh: number[];
  trades: Trade[]; marketVolumeKw: number[]; marketVwap: (number|null)[];
  dr?: { event: DrEvent; refImportKw:number[]; eventImportKw:number[]; achievedKw:number[]; shortfallKw:number[]; contributionKw: Record<string, number[]>; payoutInr:number; feeInr:number };
  totals: { /* per building and cluster: kWh, cost breakdown, peakKw, emissionsKg, comfortPct, violationSteps */ };
}
```
Build `runAll(scenario, autopilot)` returning `{baseline, building, network, network_dr?}` (memoized by hash of input).

---

## 6. SCENARIOS (`scenarios.ts`)

| id | dayType | Tmean | A | cloudBase | occScale | DR event |
|---|---|---|---|---|---|---|
| hot_weekday (default) | weekday | 34 | 7 | 0.95 | 1.00 | none |
| heatwave | weekday | 40 | 7 | 0.95 | 1.00 | none |
| monsoon | weekday | 29 | 3 | 0.35 | 1.00 | none |
| sunday_surplus | weekend | 34 | 7 | 0.95 | 1.00 | none |
| full_capacity | weekday | 36 | 7 | 0.95 | 1.15 | none |
| grid_crisis | weekday | 34 | 7 | 0.95 | 1.00 | steps 72–79 (18:00–20:00), requestKw 400 |

`requestKw` and the window are adjustable in the VPP page; changing them re-runs the engine.

---

## 7. SELECTORS (`selectors.ts`) — the only bridge between engine and UI
Provide pure functions, each unit-tested against `RunResult`:
`clusterDemandSeries(run)`, `clusterSolarSeries(run)`, `tariffBands()`, `savingsAtStep(runs, k)` (cumulative, exact), `budgetProgress(runs, k)`, `kpiSummary(runs)`, `buildingStack(run, id)`, `indoorTemp(run, id)`, `batterySoc(run, id)`, `tradesAtStep(run, k)`, `marketPriceSeries(run)`, `drSeries(run)`, `layerAttribution(runs)`, `decisionsFromRun(runs)` (§9.9), `networkStatus(run, k)`.

**Layer attribution** (the headline): `L1 saving = cost(baseline) − cost(building)`; `L2 uplift = cost(building) − cost(network)`; `L3` shown only for events: DR payout (separate). Show percentages with the actual numbers, never fixed text.

---

## 8. PLAYBACK & STATE (`store/playback.ts`)
- `cursor: number` (float step index 0…96), `playing`, `speed ∈ {1,4,16}` where 1× = 1 simulated hour per 6 real seconds. Playback via `requestAnimationFrame`.
- Scrubbing sets `cursor`. All displayed values use `Math.floor(cursor)` for step-based values; tickers use exact cumulative sum up to `floor(cursor)` plus linear interpolation within the step for display only. At integer cursor the displayed value must equal the exact cumulative (test).
- Global controls (header): scenario selector, play/pause, speed, cursor scrubber with tariff-period bands, clock `HH:MM`.
- **State theme** derived by `themeFor(k)`: `dr` if DR active (amber), else `peak` if peak tariff, else `solar` if cluster export > 5% of cluster load, else `night` if hour <6 or ≥21, else `normal`. Applied as `data-theme` on `<body>`; CSS custom properties transition over 600 ms.

---

## 9. PAGES AND COMPONENTS

All charts: Recharts, `ChartFrame` wrapper, tooltip showing exact value + unit, axis titles with units, vertical `ReferenceLine` at the cursor, tariff bands as `ReferenceArea` (colored by `tariffPeriod`). Y-domains from data (`[0,'auto']` for power/energy). Colors from design tokens (§10).

### 9.1 `/` Landing (one screen)
Headline "Buildings that think, and trade, before they consume." Two buttons: **Enter THERMOS** (→/overview) and **Watch guided demo** (→/demo). Behind the headline: a live low-opacity render of the *real* cluster demand series for the default scenario (static plot, not a looping animation).

### 9.2 `/overview`
- **KPI strip** (all from `kpiSummary`): Cost saved today (₹), Energy (kWh) baseline vs network, Peak kW baseline vs network, CO₂ avoided (kg) + tree-days, Comfort % (worst building), Network trades (kWh) and P2P savings.
- **Live Demand Waveform** (ComposedChart, 96 pts): lines — cluster demand baseline, cluster demand network; area — cluster solar generation; tariff bands; cursor line. This replaces any "heartbeat" decoration; it is the real series.
- **Energy Budget bar:** `budget = Σ baseline kWh for the day`; progress = cumulative network kWh up to cursor / budget; under it, cumulative baseline-vs-network difference at cursor. Pace text computed: "projected end-of-day = cumulative_network / (cursor/96)" clearly labeled as linear projection.
- **Cost ticker:** cumulative ₹ saved at cursor and `₹/min` = this step's saving ÷ (15 sim-min); updates with playback.
- **Layer attribution chart:** stacked horizontal bar of cost: Baseline → +L1 → +L2 with real values and %.
- **Baseline vs THERMOS comparison bars** (5 small bar charts): energy, cost, peak kW, CO₂, comfort.
- **Insights feed:** generated by `decisions.ts` templates from actual data around the cursor (never invented).
- Network mini-map (same component as §9.3, compact).

### 9.3 `/network` — Network map (SVG, data-driven)
- ViewBox 1000×600. Node positions: nova (170,150), orbit (480,110), campus (800,160), citycare (230,430), horizon (520,470), meridian (810,420). Utility grid node "Substation" at (500,300). Each building has a thin permanent line to the substation.
- Node radius = `14 + 18·sqrt(designPeakKw / maxDesignPeakKw)`. Node fill by status at cursor (thresholds ±5% of that building's design peak on `billedGrid` or `gridPointLocal`): `surplus` (net export), `deficit` (net import), `balanced`. Label shows name and signed net kW.
- **Trade arcs:** for each trade at the current step, a quadratic curve seller→buyer; stroke width = `1.5 + 8·kw/maxTradeKwInRun`; label = kW and ₹/kWh. Particles: count = `clamp(round(kw/20),1,12)`, speed ∝ kw, positions advanced by `phase += kw·c·dt` from real-time frame delta; when no trades at the cursor step, no arcs and no particles render.
- Click node → side panel with that building's series at cursor + link to `/buildings/[id]`. Click arc → trade card (seller, buyer, kW, price, buyer saving ₹/kWh = `tariff − (price+fee+wheeling)`, seller premium over feed-in).
- Header metrics at cursor: active trades, kW traded, today's P2P volume (kWh), P2P value (₹).
- **Chart under the map:** stacked bar of traded kW per step by source (export vs battery) with cursor.

### 9.4 `/marketplace`
- **Order book at cursor step:** SELL offers (building, kW, ask, source) and BUY requests (building, kW, bidMax, current grid tariff). Values come from the market function's pre-match inputs, so `market.ts` must return `orderBook` per step in `RunResult`.
- **Match card:** best matched pair at the step (largest kW trade). **"Execute trade"** button = *replay* the step: sets cursor to that step, pauses, highlights the arc; counters show that step's real kWh (`kw·0.25`), buyer saving ₹, seller revenue ₹, and CO₂ note "financial settlement; physical emissions unchanged". Do not fake a transfer progress bar; animate a number tween from 0 to the exact step value over 1.2 s.
- **Price chart:** grid tariff, FEED_IN, VWAP clearing price (gaps where null) over the day + volume bars.
- **Trade history table** (all trades up to cursor), sortable.
- **Savings leaderboard:** per-building net P2P benefit for the day computed from §5.13 terms.

### 9.5 `/vpp`
- Controls: window start/end, requestKw slider (100–800 step 50), "Activate response" (runs/loads `network_dr`; since runs are memoized this is instant).
- **Commitment table** *before* activation = **forecast capacity per building** computed by running the DR run once and reading contribution; label it "capacity from simulation".
- **After activation (playback through the window):**
  - Chart A: requested (flat line in window), achieved, shortfall — from `dr.achievedKw/shortfallKw`.
  - Chart B: stacked contribution per building (`contributionKw`).
  - Chart C: cluster import: reference vs event.
  - Chart D: indoor temperature of the 6 buildings with comfort bands (proves comfort during event).
  - Cards: delivered kWh, payout ₹, THERMOS fee ₹, buildings with comfort violations (count from series), battery SoC at window end.
- If requestKw is not met, the UI shows the true shortfall in amber, no hiding.

### 9.6 `/buildings/[id]`
- **Floor view (SVG):** the 12-floor stacked schematic is *only* a visual of the building; each floor tinted by building-level state (HVAC `u`, occupancy) — all floors share the building-level value scaled by a fixed per-floor weight table you document in DECISIONS.md and label "illustrative distribution". Do not present it as per-floor measurement.
- Charts: (1) stacked area load by component (base/plug/lighting/HVAC/EV/battery charge) with solar line, baseline total as dashed line; (2) indoor temperature vs target with comfort band; (3) battery SoC (if present); (4) grid point: physical vs billed; (5) cost per step cumulative baseline vs optimized.
- Equipment status cards derived from series at cursor: Chiller/AHU (hvacKw, u), Lighting (lightingKw), EV chargers (evKw), Battery (SoC, kW), Solar (solarKw). No invented "health %" or "anomaly".

### 9.7 `/simulator`
- Six scenario buttons (§6) + **Custom** panel (Tmean slider 26–46, cloudBase 0.1–1.0, occScale 0.6–1.3, dayType, DR toggle). Any change re-runs the engine.
- Split view: **Baseline** vs **THERMOS network**, same chart type and same axis domains. Below: delta table (energy, cost, peak, CO₂, comfort) computed from totals.
- Autopilot triangle (SVG): draggable dot; barycentric weights shown numerically; on release re-run the engine; show the changed parameters (`peakHoldTarget`, `precoolTarget`) as read-outs.

### 9.8 `/roi` — ROI calculator (clearly "estimate")
Inputs: floor area (m²), building type (6 archetypes), monthly bill (₹). Method: `pct = (baselineCost − buildingCost)/baselineCost` for the matching archetype from the default scenario weekday run and the `sunday_surplus` run weighted 5/7 and 2/7 → `annualSavings = monthlyBill·12·pct`. `capex = area·CAPEX_INR_PER_M2`; `paybackMonths = capex/(annualSavings/12)`. Show formula, inputs and assumptions beside the output. If the entered numbers produce a payback >120 months, show it as is.

### 9.9 Decision log (`decisions.ts`) and replay
Decisions are **detected from the series**, never scripted. Detectors (each yields `{step, buildingId, kind, why[], resultKwh, resultInr}` with every number computed):
- `PRECOOL_START`: first step where `tTarget` drops below 24 before a peak.
- `PEAK_HOLD`: first peak step where `tTarget` rises above 24; result = HVAC kWh avoided vs baseline over the peak window.
- `BATTERY_PEAK_DISCHARGE`: first step where optimized battery discharges in peak while baseline did not; result = kWh and ₹.
- `EV_SHIFT`: session energy moved from baseline time to a cheaper tariff period; kWh shifted, ₹ saved.
- `TRADE`: first trade of each seller–buyer pair; result from trade rows.
- `DR_COMMIT` / `DR_DELIVERED` from `dr`.
Decision timeline: slider = cursor; list shows decisions with `step ≤ cursor`, newest on top; card "WHY" lines use real values (occupancy %, tariff, T_in, SoC).

### 9.10 `/methodology`
Render §3 table from constants, §5 formulas (as text), the perfect-foresight note, the limitations in §14, and the run hash.

### 9.11 Optional (P2) — Scale test
Button on `/overview`: generates N ∈ {6, 12, 24, 48} synthetic buildings by seeded sampling of the six archetypes (±15% jitter on loads/solar/battery, same type profiles), runs the `network` and `building` modes in a Web Worker, plots **measured** network uplift per building vs N. Label "measured on synthetic clusters". No extrapolation line beyond what was simulated. Any "city vision" figure must be an explicit calculator: `N × measuredPerBuildingDailyBenefit`, labeled "projection, not measurement".

---

## 10. VISUAL DESIGN SYSTEM
- Premium dark UI, Inter + JetBrains Mono for numerals, 8-pt spacing, 12–16 px radius cards with 1 px borders, subtle glass surfaces (`backdrop-blur` sparingly).
- Tokens (CSS custom properties, overridden per `data-theme`):
  - `normal`: bg `#0B1220`, surface `#111A2E`, accent `#38BDF8`
  - `peak`: accent `#F59E0B`
  - `solar`: accent `#FACC15`
  - `dr`: accent `#F97316`, border pulse tied to DR active state only
  - `night`: bg `#070B14`
- Series colors: baseline `#94A3B8` (dashed), THERMOS `#22D3EE`, solar `#FACC15`, battery `#A78BFA`, grid/import `#F87171`, export/P2P `#34D399`, comfort band `rgba(52,211,153,0.12)`.
- Tariff bands: off-peak `rgba(56,189,248,0.06)`, normal transparent, peak `rgba(245,158,11,0.10)`.
- Numbers: tabular figures, `en-IN` grouping, ₹ prefix, kW/kWh with sensible rounding (power 0–1 decimal, ₹ 0 decimals for totals, 2 for per-kWh prices).
- Responsive: desktop-first, usable on tablet; tables and wide charts scroll in their own container.
- Accessibility: all charts have an accessible label; color is never the only signal (status also uses text/icons).
- Optional sound (P3): off by default, mute toggle; subtle ping on `Decision` becoming visible. Skip entirely if time is short.

---

## 11. DEMO MODE (`/demo`) — guided, data-driven narration
A stepper over scenes. Each scene sets: route/panel focus, scenario, cursor target, playback speed, and a narration template. Narration strings use placeholders resolved from `RunResult` through `narration.ts` (e.g. `{clusterPeakBaselineKw}`); an unresolved placeholder must throw in dev and fail the test.

Scenes (scenario `hot_weekday` unless stated; cursor targets are *found by query*, not hard-coded):
1. Cluster overview at 09:00: six buildings, baseline vs THERMOS demand.
2. Building view (Nova Tower): precool before peak — cursor at `PRECOOL_START` step of nova.
3. Peak hold: cursor at first peak step; show HVAC kW saved and indoor temperature inside band.
4. Zoom out to the network map at the first trade step: who sells to whom, price, buyer saving.
5. Marketplace: replay the largest trade of the day.
6. Battery export in peak (first `source:'battery'` trade, if none then skip with a log).
7. Switch to `grid_crisis`: utility request banner (window, requestKw).
8. VPP activation: playback across the window; show achieved vs requested and shortfall if any.
9. Comfort proof: indoor temperatures during the event.
10. Closing: layer attribution (baseline → L1 → L2) and DR payout, real numbers.
Controls: Next/Back, Auto-play (each scene dwells N seconds, N = narration word count / 3 + 4), progress dots, Esc to exit.

---

## 12. TESTING & VERIFICATION (Vitest unless noted) — all must pass

**Engine invariants (run on all six scenarios and all four modes):**
1. Determinism: two runs with same input → identical `hash`.
2. Array lengths = 96 for every series; no `NaN`/`Infinity`.
3. Per-building energy balance each step: `physicalGrid = load + charge − discharge − solar` (within 1e-6), where `discharge = dischargeLocal + extraDischarge`.
4. Battery bounds: `floor ≤ soc ≤ ceil`; `charge, discharge ≤ battery kW`; SoC update equals the η formulas.
5. HVAC: `0 ≤ u ≤ 1`; `Tin` obeys §5.3 recurrence recomputed independently in the test.
6. Market conservation: per step `Σ sold = Σ bought`; `Σ billedGrid = Σ physicalGrid` (within 1e-6).
7. Buyer never pays more than `tariff − BUYER_MARGIN` all-in per P2P kWh; every trade price ≥ seller ask and ≤ bidMax.
8. EV: delivered energy per session ≤ `energyKwh`; modes baseline and optimized deliver equal total unless `unmetKwh > 0`; per-step site limit respected.
9. Cost recomputed from first principles in the test equals `totals.cost` (within ₹0.01).
10. Comfort metric recomputed independently equals reported `comfortPct`.
11. DR: `achieved ≤ requestKw`, `achieved ≤ measured`, payout = Σ achieved·0.25·DR_RATE; `dr` absent for scenarios without events.
12. Emissions recomputed independently equal reported.

**UI/data integrity:**
13. Selector tests: each chart selector's output arrays `toEqual` the source arrays from `RunResult`.
14. Ticker test: at integer cursor values, displayed cumulative saving equals the exact cumulative sum.
15. Playwright: open `/overview`, read the cost ticker, scrub the cursor to a step, assert the displayed number equals the "View data" table's cumulative value for that step; open every route and assert no console errors.
16. Grep check (script in CI): no `Math.random` outside `rng.ts`; no `localStorage` use required.

**Reporting (not assertions, record in `docs/BUILD_LOG.md`):** for each scenario print L1 saving %, L2 uplift %, comfort %, peak reduction %, DR achieved vs requested, CO₂ delta. If a saving is negative or an uplift is under 3%, report it plainly and propose assumption-registry changes; do not alter formulas.

---

## 13. BUILD ORDER (finish and test each milestone before the next)
- **M1 Engine core:** constants, buildings, rng, weather, occupancy, load, thermal, EV, battery, baseline mode, cost, carbon, tests 1–5, 8–10, 12.
- **M2 Optimizer + market + DR:** optimizer (building mode), market, network and DR modes, remaining tests (6, 7, 11), `runAll`, selectors, decisions.
- **M3 Shell:** layout, header (scenario, playback, badge), theme tokens, `ChartFrame`, formatters, `/methodology`.
- **M4 Overview:** KPI strip, waveform, budget, ticker, attribution, comparison bars.
- **M5 Network + Marketplace:** SVG map, arcs and particles, order book, price chart, history.
- **M6 VPP:** controls and four charts.
- **M7 Buildings, Simulator, ROI, Autopilot triangle.**
- **M8 Demo mode + landing.**
- **M9 Polish:** responsive pass, empty/loading states, E2E tests (15–16), performance (engine run < 50 ms for six buildings), deploy to Vercel.
- **M10 (optional):** scale test (§9.11), sound (§10).

---

## 14. KNOWN LIMITATIONS (shown on /methodology)
Single-day simulation; perfect-foresight scheduling; lossless internal network (no line losses); tariff, wheeling, DR and platform-fee values are illustrative; P2P trading is a financial settlement and does not change physical flows; the floor view is schematic; no real-time or real-building data; regulatory treatment of P2P/open access varies by state and is not modeled; no outage/islanding model.

## 15. OUT OF SCOPE (do not build)
3D building, AI chat copilot, separate backend/database, full equipment health module, full analytics suite, outage/emergency islanding simulation, authentication, real utility or weather APIs.

## 16. DEFINITION OF DONE
- All tests green; `npm run build` passes; deployed.
- Every chart has "View data" and CSV export; every number traceable to a selector.
- Changing any scenario or autopilot weight re-runs the engine and every page updates consistently.
- Demo mode runs end to end with resolved narration, using only real values.
- `docs/DECISIONS.md` and `docs/BUILD_LOG.md` are written and honest about results.
