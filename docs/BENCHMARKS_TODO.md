# ECBC / BEE Benchmarks Sourcing Tracker (Patch 1 P5)

As required by Patch 1 P5, `benchmarkEui` is initialized to `null` to avoid inventing benchmark data. The UI displays *"Benchmark not configured; add a sourced value"* until an authentic, cited benchmark is provided from the Energy Conservation Building Code (ECBC) or Bureau of Energy Efficiency (BEE) Star Rating baseline.

| Building ID | Building Name | Typology | Climate Zone | Sourced Benchmark EUI (kWh/m²/yr) | Status | Citation / Document Reference |
|---|---|---|---|---|---|---|
| `nova` | Nova Tower | Commercial Office (Daytime) | Composite | `null` | Pending sourcing | ECBC 2017 Commercial Office Table 5.1 / BEE Star Rating |
| `horizon` | Horizon Mall | Retail / Shopping Mall | Composite | `null` | Pending sourcing | ECBC 2017 Retail Table 5.2 |
| `citycare` | CityCare Hospital | 24/7 Acute Healthcare | Composite | `null` | Pending sourcing | ECBC 2017 Hospital 24h Baseline |
| `campus` | Campus Block D | Educational / University | Composite | `null` | Pending sourcing | ECBC 2017 Institutional |
| `orbit` | Orbit Tech Park | IT / BPO (24/7 Operations) | Composite | `null` | Pending sourcing | BEE IT / BPO Data/Office Benchmark |
| `meridian` | Meridian Hotel | Hospitality / 4-Star Hotel | Composite | `null` | Pending sourcing | ECBC 2017 Hospitality |

### Action Items for Domain Engineers:
1. Source the 100-point EPI (Energy Performance Index in kWh/m²/year) from official BEE Star Label guidelines for each respective archetype.
2. Update `benchmarkEui` in `src/simulation/buildings.ts` once verified with regulatory citations.
