# ⚡ THERMOS 2.0 — Deterministic Microgrid & Demand Flexibility Engine

> *"Buildings that think, and trade, before they consume."*

![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Schneider Palette](https://img.shields.io/badge/Schneider_Electric-Design_System-009530?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-Engine_Tested-6E9F18?style=for-the-badge&logo=vitest)
![Deterministic Engine](https://img.shields.io/badge/Simulation-100%25_Deterministic-3DCD58?style=for-the-badge)
![Zero Backend](https://img.shields.io/badge/Deployment-Static_Vercel_Ready-000000?style=for-the-badge)

---

## 🌟 Overview

**THERMOS 2.0** is an enterprise-grade, browser-native simulation platform engineered for **microgrid energy optimization**, **peer-to-peer (P2P) double-auction energy marketplace**, and **Virtual Power Plant (VPP) demand flexibility dispatch**. 

Designed with the official **Schneider Electric Design Language**, THERMOS models 6 distinct building archetypes on a shared medium-voltage electrical feeder over a 24-hour diurnal cycle (96 discrete 15-minute dispatch intervals). 

The platform operates on a **100% deterministic engine**—no mock APIs, no hardcoded charts, and no unseeded random numbers. Every metric, chart point, status badge, network flow vector, and order book entry is computed in real time from physics-based mathematical models.

---

## 📸 Core Features & Capability Matrix

| Layer | Module | Core Functionality & Engineering Models |
|---|---|---|
| **L1** | **Building Microgrid Engine** | Dynamic thermal mass pre-cooling, 1-node RC thermal model, ambient COP calculation, solar PV yield with temperature coefficient derating, battery storage (SoC bounds, degradation pricing, pre-peak targeted charging), and EV charging dispatch. |
| **L2** | **P2P Energy Marketplace** | Continuous double-auction order book matching surplus solar/battery generation with deficit buildings. Real-time Volume-Weighted Average Price (VWAP) clearing, wheeling charges, platform fees, and live 24-hr P2P power flow network topology. |
| **L3** | **VPP Flexibility Dispatch** | Automated response to utility Demand Response (DR) events. Dynamic baseline calculation, feeder-wide load shed/shift optimization, building-by-building flexibility contribution tracking, and carbon avoidance accounting. |
| **UX** | **Schneider Electric UI System** | Strict compliance with Schneider Electric brand colors (`#009530` Signature Spruce Green, `#3DCD58` Life Green, `#626469` SE Dark Gray, `#FFD100` Sunflower Yellow). Features real-world wall clock sync, live chart data inspectors, CSV data export, interactive scenario sandbox, and ROI calculators. |

---

## 🎨 Schneider Electric Color Palette Specification

THERMOS 2.0 incorporates the official Schneider Electric palette according to strict design rules:

| Role | Token Name | Hex Code | Visual Application & Usage Ratio |
|---|---|---|---|
| 🟢 **Signature Green** | Schneider Spruce Green | `#009530` | **10–15%**: Primary brand accents, active navigation states, primary buttons, hero section borders. |
| 🟢 **Bright Green** | Life Green | `#3DCD58` | **2–5%**: Live telemetry indicators, high comfort scores, VWAP price curves, positive savings metrics. |
| 🟢 **Light Green** | Seeding Green | `#9FAF00` | Secondary status pills and low-severity warnings. |
| ⚫ **Dark Gray** | SE Dark Gray | `#626469` | **15–20%**: Section headers, card backgrounds, dark mode containers. |
| ◻️ **Light Gray** | SE Light Gray | `#9FA0A4` | **60–70%**: Workspace canvas backgrounds, subtle card borders (`#E2E4E8`), muted body copy. |
| ⚪ **White** | White | `#FFFFFF` | Primary card canvas backgrounds, modal windows, table rows. |
| ⚫ **Black** | Black | `#000000` | High-contrast typography, primary text headers. |
| 🟡 **Accent Yellow** | Sunflower Yellow | `#FFD100` | **<2%**: Solar PV generation profiles, energy export metrics. |
| 🟠 **Accent Orange** | Honeysuckle Orange | `#E47F00` | Grid tariff peak alert banners, thermal constraint warnings. |
| 🔵 **Accent Blue** | Sky Blue | `#42B4E6` | HVAC cooling load disaggregation, thermal mass pre-cooling indicators. |
| 🔴 **Accent Red** | Fuchsia Red | `#B10043` | Demand charge thresholds, critical battery low-SoC alerts. |

---

## 🧮 Mathematical & Algorithmic Foundations

### 1. Deterministic Seeding & Two-Pass Warmup
* **Mulberry32 PRNG**: Uses a constant seed (`SEED = 20261004`) to eliminate stochastic variation across client runs.
* **2-Pass Warmup**: The 96-step daily simulation is executed twice sequentially. End states from Pass 1 (indoor air temperatures $T_{\text{in}}$, battery state-of-charge $\text{SoC}$) serve as initial conditions for Pass 2, eliminating transient start-of-day initialization artifacts.

### 2. Thermal & Coefficient of Performance (COP) Model
Indoor air temperature $T_{\text{in}}(k+1)$ evolves according to:
$$T_{\text{in}}(k+1) = T_{\text{in}}(k) + \frac{\Delta t}{C_{\text{th}}} \left[ U A (T_{\text{out}}(k) - T_{\text{in}}(k)) + Q_{\text{occ}}(k) + Q_{\text{equip}}(k) - Q_{\text{hvac}}(k) \right]$$

HVAC Coefficient of Performance is modeled dynamically as a function of outdoor ambient temperature $T_{\text{out}}$:
$$\text{COP}(T_{\text{out}}) = \max\left(2.0,\, 4.2 - 0.07 \cdot (T_{\text{out}} - 27)\right)$$

### 3. Solar PV Yield & Temperature Derating
Solar cell temperature $T_{\text{cell}}$ and electrical output $P_{\text{pv}}$ are calculated using global horizontal irradiance (GHI):
$$T_{\text{cell}} = T_{\text{out}} + 0.025 \cdot \text{GHI}$$
$$P_{\text{pv}} = P_{\text{rated}} \cdot \left(\frac{\text{GHI}}{1000}\right) \cdot \eta_{\text{PR}} \cdot \left[1 - 0.004 \cdot (T_{\text{cell}} - 25)\right]$$

### 4. P2P Double-Auction Market Clearing
The peer-to-peer energy market executes continuous double-auction order matching:
* **Buyer Maximum Bid**: $P_{\text{buyer}}^{\text{max}} = T_{\text{grid}}(k) - \text{Fee}_{\text{wheeling}} - \text{Fee}_{\text{platform}} - \text{Margin}_{\text{buyer}}$
* **Seller Solar Ask**: $P_{\text{seller}}^{\text{solar}} = \text{FeedInTariff} + \text{Margin}_{\text{seller}}$
* **Seller Battery Ask**: $P_{\text{seller}}^{\text{batt}} = \frac{T_{\text{grid}}^{\text{offpeak}}}{\eta_{\text{RTE}}} + \text{Cost}_{\text{degradation}}$
* **Clearing Price (VWAP)**: Matched pairs execute at the midpoint price $P_{\text{clearing}} = \frac{P_{\text{buyer}} + P_{\text{seller}}}{2}$.

---

## 🏢 Microgrid Building Archetypes

| Building ID | Name | Archetype | Peak Load | PV System | Battery | EV Chargers |
|---|---|---|---|---|---|---|
| `bldg_1` | **Alpha Tower** | Commercial Office | 450 kW | 250 kWp | 300 kWh | 20x 11 kW |
| `bldg_2` | **Horizon Tech Park** | IT Park / Data Lab | 850 kW | 500 kWp | 600 kWh | 40x 22 kW |
| `bldg_3` | **St. Jude Medical** | General Hospital | 600 kW | 150 kWp | 500 kWh (40% floor) | 10x 11 kW |
| `bldg_4` | **Apex Hypermarket** | Retail Center | 380 kW | 300 kWp | 250 kWh | 15x 11 kW |
| `bldg_5` | **Grandview Resort** | Luxury Hotel | 520 kW | 180 kWp | 350 kWh | 25x 11 kW |
| `bldg_6` | **Greenfield Estates** | Residential Complex | 290 kW | 200 kWp | 200 kWh | 50x 7.4 kW |

---

## 🛠️ Project Structure

```
schneider/
├── docs/
│   ├── BUILD_LOG.md                 # Engineering execution log & milestones
│   └── DECISIONS.md                 # Architectural & design choices registry
├── src/
│   ├── app/                         # Next.js 14 App Router Pages
│   │   ├── page.tsx                 # Landing & Hero Page
│   │   ├── overview/                # Fleet Load, Disaggregation & Heatmap
│   │   ├── network/                 # Live 24-hr P2P Electrical Feeder Topology
│   │   ├── marketplace/             # Double-Auction Order Book & Price Waveform
│   │   ├── vpp/                     # Virtual Power Plant & DR Dispatch
│   │   ├── buildings/[id]/          # Deep-Dive Single Building Microgrid View
│   │   ├── simulator/               # Autopilot Scenario Tuning Sandbox
│   │   ├── roi/                     # Financial Return-on-Investment Engine
│   │   ├── profile/                 # Microgrid Operator Profile & Certifications
│   │   └── methodology/             # Open Assumptions Registry & Formulas
│   ├── components/                  # UI & Visual Components
│   │   ├── building/                # Thermal, Floor Plan & Battery Visualizers
│   │   ├── charts/                  # Recharts Wrapper with Table Inspector & CSV Export
│   │   ├── layout/                  # Header with Live Clock, Navigation & Sidebar
│   │   ├── network/                 # Interactive SVG Feeder Nodes & Power Vector Animation
│   │   └── ui/                      # Buttons, Cards, Badges, Tabs, Sliders
│   ├── simulation/                  # Pure Deterministic TypeScript Engine
│   │   ├── constants.ts             # Assumptions Registry & Grid Tariffs
│   │   ├── engine.ts                # Master 96-Step Simulation Runner
│   │   ├── optimizer.ts             # Linear Optimization & Heuristic Dispatch
│   │   ├── market.ts                # Double-Auction Order Book Engine
│   │   ├── dr.ts                    # VPP Demand Response Manager
│   │   ├── thermal.ts               # 1-Node RC Thermal Model
│   │   ├── battery.ts               # Storage Degradation & Pre-peak Targeting
│   │   ├── ev.ts                    # Smart EV Charging Scheduler
│   │   ├── weather.ts               # GHI Solar Irradiance & Ambient Temperature
│   │   ├── occupancy.ts             # Diurnal Occupancy Profiles
│   │   ├── selectors.ts             # Recharts Data Extraction Selectors
│   │   └── types.ts                 # Strict TypeScript Domain Interfaces
│   ├── store/                       # Client UI & Simulation Playback State
│   │   ├── playback.ts              # Time Cursor (0–95 steps) & Wall Clock Sync
│   │   └── ui.ts                    # Navigation & Modal UI State
│   └── lib/                         # Utility Libraries & Formatters
│       ├── format.ts                # Currency (₹ in-IN), Power (kW/kWh), Temp (°C)
│       └── theme.ts                 # Schneider Electric Theme Constants
├── tests/                           # Engine Verification & Unit Tests
│   └── engine.test.ts               # Physics Conservation, Energy Balance & Bounds Tests
├── package.json                     # Node Dependencies & Build Scripts
├── tailwind.config.ts               # Schneider Electric Color Token Configuration
├── tsconfig.json                    # Strict TypeScript Compiler Options
└── vitest.config.ts                 # Vitest Engine Test Configuration
```

---

## ⚡ Quick Start & Development Guide

### Prerequisites
* **Node.js**: `v18.17.0` or higher (Node `v20+` recommended)
* **npm**: `v9+`

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/schneider-thermos/thermos-2.git
cd thermos-2
npm install
```

### Running Locally
Start the Next.js development server with hot reload:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to view the application.

### Verification & Testing
Run TypeScript static type checking and unit test suites:
```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run Vitest unit & engine property tests
npm run test
```

### Production Build
Create an optimized production build:
```bash
npm run build
npm run start
```

---

## 📄 License & Attribution

Designed and developed for **Schneider Electric Microgrid & Demand Flexibility Innovations**. Built with Next.js, React, Tailwind CSS, Recharts, and Vitest.

*All numerical outputs are derived from deterministic physics formulations in accordance with standard building energy modeling guidelines.*
