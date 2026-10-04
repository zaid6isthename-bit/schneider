import { ClimatePreset, ConstantEntry, FeatureFlags, RetrofitTierId, TariffPeriod } from './types';

export const DEFAULT_FEATURES: FeatureFlags = {
  setback: true,
  peakHold: true,
  lightingDim: true,
  dcv: true,
  evShift: true,
  battery: true,
};

export const SEED = 20261004;

export const STEPS_PER_DAY = 96;
export const STEP_MIN = 15;
export const DT_H = 0.25;

export const TARIFF_OFFPEAK = 6.0; // ₹/kWh
export const TARIFF_NORMAL = 8.5; // ₹/kWh
export const TARIFF_PEAK = 11.0; // ₹/kWh

export const FEED_IN = 2.5; // ₹/kWh export credit
export const DEMAND_CHARGE = 450.0; // ₹/kW of max billed import/month; daily share = DEMAND_CHARGE / 30
export const WHEELING = 0.50; // ₹/kWh
export const PLATFORM_FEE = 0.30; // ₹/kWh
export const BUYER_MARGIN = 0.20; // ₹/kWh minimum buyer saving
export const SELLER_SOLAR_MARGIN = 0.50; // ₹/kWh above FEED_IN
export const SELLER_SOLAR_ASK = FEED_IN + SELLER_SOLAR_MARGIN; // ₹3.0/kWh

export const BATT_RTE = 0.90; // round-trip efficiency
export const BATT_ETA_CH = Math.sqrt(BATT_RTE); // √0.90
export const BATT_ETA_DIS = Math.sqrt(BATT_RTE); // √0.90
export const BATT_DEGRADATION = 1.0; // ₹/kWh discharged
export const BATT_FLOOR_DEFAULT = 0.20; // 20%
export const BATT_FLOOR_HOSPITAL = 0.40; // 40%
export const BATT_CEIL = 0.95; // 95%
export const BATT_PREPEAK_TARGET = 0.90; // 90% SoC
export const BATT_ASK_NETWORK = TARIFF_OFFPEAK / BATT_RTE + BATT_DEGRADATION; // ₹7.6667/kWh

export const DR_RATE = 12.0; // ₹/kWh of delivered reduction
export const DR_FEE_PCT = 0.15; // 15% of DR payout to THERMOS

export const EF_BASE = 0.71; // kg CO2/kWh
export const TREE_ABSORPTION_DAILY = 21.0 / 365.0; // 0.057534 kg CO2/tree/day (21 kg/tree/year)

export const PV_PR = 0.78;
export const PV_TEMP_COEFF = -0.004; // /°C above 25°C cell temp
export const GHI_MAX = 950.0; // W/m² at solar noon

export const COP_REF = 3.5;
export function getCop(tOut: number): number {
  return Math.max(2.0, 4.2 - 0.07 * (tOut - 27.0));
}

export const BASELINE_SETPOINT = 24.0; // °C
export const BASELINE_OFF_SETPOINT = 30.0; // °C (unoccupied timer-scheduled baseline, Patch 1 P1)
export const BASELINE_STARTUP_LEAD_STEPS = 4; // 1 hour morning pull-down lead
export const OCC_THRESHOLD = 0.10;
export const LIGHT_DIM_MAX = 0.25;
export const NIGHT_SETBACK = 27.0; // °C
export const SETBACK_LEAD = 6; // 6 steps = 90 min
export const PRECOOL_LEAD = 8; // 8 steps = 2 h before peak start
export const MIN_TRADE_KW = 1.0;
export const DELTA_T_INT = 3.0; // °C * occupancy
export const CAPEX_INR_PER_M2 = 120.0; // ₹/m²

// P3 IAQ & Ventilation Constants
export const C_OUT = 420.0; // ppm outdoor CO2
export const G_PERSON = 0.0052; // L/s CO2 generation per person
export const CEILING_M = 3.2; // ceiling height in meters
export const C_TARGET = 800.0; // ppm target indoor CO2
export const C_LIMIT_SCORE = 1000.0; // ppm comfort limit threshold
export const OA_FRACTION = 0.25; // outdoor air energy coupling fraction
export const VENT_L_PER_S_PERSON = 10.0; // design ventilation rate L/s per person
export const DCV_MIN_FRACTION = 0.20; // minimum ventilation floor fraction

// P4 Fault Detection Constants
export const FAULT_DEG = 0.12; // 12% condenser fouling COP degradation

// Peak window: steps 68–87 (17:00–21:45)
export const PEAK_START_STEP = 68;
export const PEAK_END_STEP = 87;

export const CLIMATE_PRESETS: Record<string, ClimatePreset> = {
  composite: {
    id: 'composite',
    name: 'Composite (Delhi-NCR)',
    representativeCity: 'Delhi-NCR',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
  },
  hot_dry: {
    id: 'hot_dry',
    name: 'Hot & Dry (Jodhpur/Ahmedabad)',
    representativeCity: 'Jodhpur / Ahmedabad',
    Tmean: 36,
    A: 8,
    cloudBase: 1.00,
  },
  warm_humid: {
    id: 'warm_humid',
    name: 'Warm & Humid (Mumbai/Chennai)',
    representativeCity: 'Mumbai / Chennai',
    Tmean: 31,
    A: 4,
    cloudBase: 0.80,
  },
  moderate: {
    id: 'moderate',
    name: 'Moderate (Bengaluru)',
    representativeCity: 'Bengaluru',
    Tmean: 27,
    A: 5,
    cloudBase: 0.90,
  },
};

export const RETROFIT_TIERS: Record<
  RetrofitTierId,
  {
    id: RetrofitTierId;
    name: string;
    scope: string;
    features: string[];
    capexPerM2: number;
  }
> = {
  A: {
    id: 'A',
    name: 'Tier A: Sensors & Cloud Analytics',
    scope: 'Sensors + cloud analytics (visibility only, no automated control)',
    features: [],
    capexPerM2: 40,
  },
  B: {
    id: 'B',
    name: 'Tier B: BMS Setpoint, DCV & Lighting Control',
    scope: '+ BMS setpoint/schedule control, DCV, lighting control',
    features: ['setback', 'peakHold', 'lightingDim', 'dcv', 'evShift'],
    capexPerM2: 120,
  },
  C: {
    id: 'C',
    name: 'Tier C: Full Microgrid & Battery Dispatch',
    scope: '+ battery dispatch + network/DR participation',
    features: ['setback', 'peakHold', 'lightingDim', 'dcv', 'evShift', 'battery'],
    capexPerM2: 120, // + battery capex entered separately (₹25,000 / kWh placeholder)
  },
};

export function tariffAt(k: number): { period: TariffPeriod; inrPerKwh: number } {
  const hour = (k * 0.25) % 24;
  if (hour >= 17 && hour < 22) {
    return { period: 'peak', inrPerKwh: TARIFF_PEAK };
  } else if (hour >= 6 && hour < 17) {
    return { period: 'normal', inrPerKwh: TARIFF_NORMAL };
  } else {
    return { period: 'offpeak', inrPerKwh: TARIFF_OFFPEAK };
  }
}

export function efMultAtHour(hour: number): number {
  const h = hour % 24;
  if (h >= 22 || h < 6) return 0.90;
  if (h >= 6 && h < 10) return 1.00;
  if (h >= 10 && h < 16) return 0.85;
  if (h >= 16 && h < 18) return 1.00;
  return 1.15; // 18 to 22
}

export const ASSUMPTIONS_REGISTRY: ConstantEntry[] = [
  {
    key: 'BASELINE_SCHEDULE',
    name: 'Timer-Scheduled BMS Baseline Operating Windows',
    value: 'Office: 7-20h, Retail: 9-22h, Univ: 7-19h, Hosp/IT/Hotel: 24h',
    unit: 'hours',
    label: 'assumption',
    note: 'Replaces artificial 24/7 setpoint with real-world commercial scheduled BMS (Patch 1 P1).',
  },
  {
    key: 'C_OUT',
    name: 'Ambient Background CO₂ Concentration',
    value: C_OUT,
    unit: 'ppm',
    label: 'assumption',
    note: 'Atmospheric baseline CO₂ concentration in outdoor ambient air.',
  },
  {
    key: 'G_PERSON',
    name: 'Metabolic CO₂ Generation Rate',
    value: G_PERSON,
    unit: 'L/s/person',
    label: 'assumption',
    note: 'ASHRAE 62.1 standard metabolic emission rate for light office/commercial activity.',
  },
  {
    key: 'C_TARGET',
    name: 'Demand-Controlled Ventilation (DCV) Target',
    value: C_TARGET,
    unit: 'ppm',
    label: 'assumption',
    note: 'Ventilation flow actively modulated to maintain indoor air quality at or below 800 ppm.',
  },
  {
    key: 'C_LIMIT_SCORE',
    name: 'IAQ Comfort Scoring Limit Threshold',
    value: C_LIMIT_SCORE,
    unit: 'ppm',
    label: 'assumption',
    note: 'Steps exceeding 1000 ppm while occupied are counted as IAQ air quality exceedances.',
  },
  {
    key: 'OA_FRACTION',
    name: 'Chiller Outdoor Air Ventilation Thermal Coupling',
    value: OA_FRACTION,
    unit: 'fraction',
    label: 'assumption',
    note: '25% of chiller thermal load is directly coupled to outdoor air intake; DCV delivers direct thermal savings.',
  },
  {
    key: 'VENT_L_PER_S_PERSON',
    name: 'Design Outdoor Air Ventilation Rate',
    value: VENT_L_PER_S_PERSON,
    unit: 'L/s/person',
    label: 'assumption',
    note: 'Standard design ventilation supply rate per design occupant.',
  },
  {
    key: 'DCV_MIN_FRACTION',
    name: 'DCV Minimum Turndown Floor',
    value: DCV_MIN_FRACTION,
    unit: 'fraction',
    label: 'assumption',
    note: 'Airflow never drops below 20% of design airflow to preserve building pressurization and base dilution.',
  },
  {
    key: 'FAULT_DEG',
    name: 'Condenser Fouling Maximum COP Degradation',
    value: `${FAULT_DEG * 100}%`,
    unit: '%',
    label: 'assumption',
    note: 'Synthetic injected fault for model-based automated fault detection (FDD) demonstration (Patch 1 P4).',
  },
  {
    key: 'TARIFF_OFFPEAK',
    name: 'Off-Peak Grid Tariff (22:00–06:00)',
    value: TARIFF_OFFPEAK,
    unit: '₹/kWh',
    label: 'illustrative',
    note: 'Illustrative ToU tariff, not tied to a single specific DISCOM.',
  },
  {
    key: 'TARIFF_NORMAL',
    name: 'Normal Grid Tariff (06:00–17:00)',
    value: TARIFF_NORMAL,
    unit: '₹/kWh',
    label: 'illustrative',
    note: 'Standard commercial daytime rate.',
  },
  {
    key: 'TARIFF_PEAK',
    name: 'Peak Grid Tariff (17:00–22:00)',
    value: TARIFF_PEAK,
    unit: '₹/kWh',
    label: 'illustrative',
    note: 'Evening evening system-peak rate.',
  },
  {
    key: 'FEED_IN',
    name: 'Solar Feed-in Tariff / Net Metering Credit',
    value: FEED_IN,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Discom compensation credit for exported surplus solar.',
  },
  {
    key: 'DEMAND_CHARGE',
    name: 'Monthly Contracted Demand Charge',
    value: DEMAND_CHARGE,
    unit: '₹/kW/month',
    label: 'assumption',
    note: 'Daily allocation = ₹450 / 30 = ₹15/kW of daily peak billed import.',
  },
  {
    key: 'WHEELING',
    name: 'Grid Wheeling Charge',
    value: WHEELING,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Paid to local distribution licensee for P2P power transit over common feeder.',
  },
  {
    key: 'PLATFORM_FEE',
    name: 'THERMOS Platform Clearing Fee',
    value: PLATFORM_FEE,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Paid by energy buyer to THERMOS platform per matched trade.',
  },
  {
    key: 'BUYER_MARGIN',
    name: 'Guaranteed Minimum Buyer Saving',
    value: BUYER_MARGIN,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Buyer all-in cost never exceeds (grid tariff − BUYER_MARGIN).',
  },
  {
    key: 'SELLER_SOLAR_MARGIN',
    name: 'Seller Premium Above Feed-in',
    value: SELLER_SOLAR_MARGIN,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Seller solar ask price = ₹2.5 + ₹0.5 = ₹3.0/kWh.',
  },
  {
    key: 'BATT_RTE',
    name: 'Battery Round-Trip Efficiency (RTE)',
    value: BATT_RTE,
    unit: 'ratio',
    label: 'assumption',
    note: '90% round trip; charge and discharge one-way efficiency η = √0.90 ≈ 0.9487.',
  },
  {
    key: 'BATT_DEGRADATION',
    name: 'Battery Degradation Cost',
    value: BATT_DEGRADATION,
    unit: '₹/kWh discharged',
    label: 'assumption',
    note: 'Reflects lifecycle cell replacement and warranty depreciation.',
  },
  {
    key: 'DR_RATE',
    name: 'Demand Response Incentive Rate',
    value: DR_RATE,
    unit: '₹/kWh',
    label: 'assumption',
    note: 'Utility payout for verified reduction during grid emergency.',
  },
  {
    key: 'DR_FEE_PCT',
    name: 'THERMOS VPP Aggregator Fee',
    value: `${DR_FEE_PCT * 100}%`,
    unit: '%',
    label: 'assumption',
    note: 'Aggregator share deducted from total DR settlement.',
  },
  {
    key: 'EF_BASE',
    name: 'Base Grid Emission Factor',
    value: EF_BASE,
    unit: 'kg CO₂/kWh',
    label: 'assumption',
    note: 'Illustrative regional grid emission intensity. Verify vs CEA baseline.',
  },
  {
    key: 'TREE_ABSORPTION',
    name: 'Tree Carbon Absorption Rate',
    value: '21 kg/year (0.0575 kg/day)',
    unit: 'kg CO₂/tree',
    label: 'assumption',
    note: 'Conversion factor for tree-days avoided metric.',
  },
  {
    key: 'PV_PR',
    name: 'Solar Rooftop Performance Ratio',
    value: PV_PR,
    unit: 'ratio',
    label: 'assumption',
    note: 'BOS losses, soiling, and inverter efficiency factor.',
  },
  {
    key: 'COP_REF',
    name: 'Chiller Reference COP',
    value: COP_REF,
    unit: 'ratio',
    label: 'assumption',
    note: 'Rated chiller efficiency at 27°C ambient.',
  },
  {
    key: 'CAPEX_INR_PER_M2',
    name: 'THERMOS Retrofit CapEx Estimate (Tier B)',
    value: CAPEX_INR_PER_M2,
    unit: '₹/m²',
    label: 'assumption',
    note: 'Sensors, BMS gateway, submetering and commissioning hardware cost.',
  },
];
