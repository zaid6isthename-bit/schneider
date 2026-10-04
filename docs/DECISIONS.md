# THERMOS 2.0 — Architecture & Engineering Decisions

This document records engineering and architectural decisions made where the PRD allowed design flexibility or was silent.

## 1. 12-Floor Schematic Building Distribution Table
As required by PRD §9.6, the 12-floor schematic view on `/buildings/[id]` displays an illustrative vertical distribution of occupancy and HVAC load. The building-level occupancy and HVAC power are distributed across the 12 floors using fixed normalized weights:

| Floor | Name | Weight | Primary Function / Notes |
|---|---|---|---|
| L12 | Executive / Penthouse / Plant Deck | 0.06 | Lower occupancy, specialized HVAC |
| L11 | High-density Floor | 0.09 | Standard core tenant |
| L10 | Standard Floor | 0.09 | Standard core tenant |
| L9 | Standard Floor | 0.09 | Standard core tenant |
| L8 | Mid-rise Mechanical / Buffer | 0.07 | Facilities and server room |
| L7 | Standard Floor | 0.09 | Standard core tenant |
| L6 | Standard Floor | 0.09 | Standard core tenant |
| L5 | Collaborative Hub / Meeting Floor | 0.10 | Variable occupancy peaks |
| L4 | Standard Floor | 0.09 | Standard core tenant |
| L3 | Amenity & Cafeteria | 0.10 | High lunchtime plug/cooling load |
| L2 | Retail / Podium Annex | 0.08 | Extended operating hours |
| L1 | Ground Lobby & Reception | 0.05 | High infiltration, transit occupancy |

Sum of weights = 1.00. This provides a visual representation of the thermal and occupancy gradient while strictly conserving the exact total building power and temperature state.

## 2. Seeded Random Number Generator
Deterministic PRNG uses the Mulberry32 algorithm seeded with `SEED = 20261004` (PRD §0.3). Normal distribution samples for temperature AR(1) noise are produced via the Box-Muller transform powered by Mulberry32.

## 3. UI Chart Architecture
Every chart is wrapped with `<ChartFrame>`, providing consistent SVG layout, axis legends, theme-aware styling, an interactive "View data" tabular modal/drawer, and one-click "Export CSV" functionality.

## 4. Playback and Scrubber Engine
Simulation is executed in memory at launch or upon scenario/autopilot adjustment. Playback cursor runs on a normalized 0–96 float range via `requestAnimationFrame` with 1×, 4×, and 16× speeds, synchronizing all active charts, SVG network particles, and live counters.

## 5. Patch 1: Challenge 02 Alignment Decisions

### 5.1 Realistic Timer-Scheduled BMS Baseline (P1)
- Replaces static 24°C continuous cooling baseline with real-world operating schedules.
- Daytime window: `Ttgt = 24.0°C`. Outside window: `Ttgt = 30.0°C` (HVAC effectively off), with 1-hour (4-step) morning pre-cooling warmup where `Ttgt = 24.0°C`.
- 24h facilities (Hospital, IT Park, Hotel) maintain continuous 24.0°C.
- Baseline lighting: `lightKw * max(occ, 0.8)` during scheduled hours, `lightKw * 0.15` (security lighting) outside hours; 24h types use `lightKw * max(occ, 0.5)`. No daylight dimming.
- Baseline ventilation: Fixed design airflow inside window; `0.2 * design` outside window. 24h types use fixed design airflow.

### 5.2 Honest Energy Intensity & Single-Feature Ablation (P2)
- Primary headline claims report energy reduction in kWh and percentage (`energyReductionPct`). Cost reduction and peak reduction are presented as secondary metrics.
- Annualization uses a 4-scenario weighted meteorological mix: 40% Hot Summer Weekday, 40% Mild Weekday, 20% Monsoon Overcast for weekdays (5/7), and 100% Sunday Surplus for weekends (2/7).
- Feature ablation executes isolated counterfactual runs toggling each feature (`setback`, `peakHold`, `lightingDim`, `dcv`, `evShift`, `battery`) off individually from all-on (`F_all`). Interaction residual `total - sum(marginal)` is explicitly surfaced, preserving negative bars where applicable.

### 5.3 Well-Mixed CO₂ IAQ Model & DCV Energy Link (P3)
- First-principles single-zone differential equation: `C[k+1] = Ceq + (C[k] - Ceq) * exp(-Q * 900 / V)` where `Ceq = C_OUT + G_PERSON * N * 1e6 / Q`.
- Outdoor air fraction `OA_FRACTION = 0.25` couples ventilation to HVAC power: `hvacKw = hvacKwCore * (0.75 + 0.25 * Q / Q_design)`.
- Minimum delivered lighting fraction is constrained to `>= 0.75` (max 25% dimming) during occupied steps to ensure visual comfort.

### 5.4 Model-Based Fault Detection & Diagnostics (P4)
- Synthetic condenser fouling fault (`fault_fouled_condenser`) on building `orbit` starting at step 40 (10:00), ramping COP degradation to 12% over 8 steps.
- Detector monitors dimensionless residual `r(k) = actualKw / nominalKw - 1` with an 8% threshold and an 8-step persistence window to eliminate false positives.

### 5.5 Climate Zones & Retrofit Tiers (P7)
- 4 climate presets (`composite`, `hot_dry`, `warm_humid`, `moderate`) based on representative Indian meteorological parameters.
- 3 retrofit tiers: Tier A (Sensors + Cloud Analytics, ₹40/m² capex, 0 automated kWh saving claimed), Tier B (+ Automated BMS/DCV/Lighting control, ₹120/m² capex), Tier C (+ Battery dispatch & DR network participation, ₹120/m² + ₹25,000/kWh battery capex). Simple payback is computed without artificial truncation.

### 5.6 Hand-Crafted SVG Architecture & Submission Claims (P8 & P9)
- Static hand-crafted 5-layer SVG diagram on `/architecture` mapping Field Layer, Edge Gateway, THERMOS Cloud, Control Outputs, and External DISCOM/Grid interfaces.
- Dedicated `/submission` claim card aggregating verified baseline metrics, energy intensity, comfort preservation, and one-click "Export Markdown" for contest submission.
