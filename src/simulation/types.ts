export type Mode = 'baseline' | 'building' | 'network' | 'network_dr';

export type TariffPeriod = 'offpeak' | 'normal' | 'peak';

export type ClimateZoneId = 'composite' | 'hot_dry' | 'warm_humid' | 'moderate';

export interface ClimatePreset {
  id: ClimateZoneId;
  name: string;
  representativeCity: string;
  Tmean: number;
  A: number;
  cloudBase: number;
}

export interface FeatureFlags {
  setback: boolean;
  peakHold: boolean;
  lightingDim: boolean;
  dcv: boolean;
  evShift: boolean;
  battery: boolean;
}

export const DEFAULT_FEATURES: FeatureFlags = {
  setback: true,
  peakHold: true,
  lightingDim: true,
  dcv: true,
  evShift: true,
  battery: true,
};

export interface ConstantEntry {
  key: string;
  name: string;
  value: number | string;
  unit: string;
  label: 'assumption' | 'illustrative';
  note: string;
}

export interface BuildingScheduleWindow {
  startHour: number;
  endHour: number;
  is24h: boolean;
}

export interface BuildingDef {
  id: string;
  name: string;
  type: 'office' | 'retail' | 'hospital' | 'university' | 'it' | 'hotel';
  areaM2: number;
  baseKw: number;
  plugKw: number;
  lightKw: number;
  hvacRatedKw: number;
  K: number; // °C cooling power per full HVAC unit
  tau: number; // thermal time constant in hours
  solarKwp: number;
  batteryKwh: number;
  batteryKw: number;
  evSessionsCount: number;
  comfortMin: number;
  comfortMax: number;
  daylightFraction: number;
  m2PerPerson: number;
  schedule: BuildingScheduleWindow;
  benchmarkEui: number | null; // ECBC / BEE benchmark (kWh/m²/yr), null if not configured
}

export type RetrofitTierId = 'A' | 'B' | 'C';

export interface EvSession {
  id: string;
  buildingId: string;
  arrivalStep: number;
  departStep: number;
  energyKwh: number;
  maxKw: number;
}

export interface DrEvent {
  eventId?: string;
  startStep: number;
  endStep: number;
  requestKw: number;
  rateInrPerKwh?: number;
}

export interface FaultConfig {
  buildingId: string;
  faultStartStep: number; // e.g. step 40 (10:00)
  faultDegMax: number;    // e.g. 0.12 (12% degradation)
  rampSteps: number;      // e.g. 8 steps
}

export interface ScenarioDef {
  id: string;
  name: string;
  dayType: 'weekday' | 'weekend';
  Tmean: number;
  A: number;
  cloudBase: number;
  occScale: number;
  drEvent?: DrEvent;
  fault?: FaultConfig;
  climateZone?: ClimateZoneId;
}

export interface AutopilotWeights {
  wComfort: number;
  wCost: number;
  wCarbon: number;
}

export interface SimInput {
  buildings: BuildingDef[];
  scenario: ScenarioDef;
  mode: Mode;
  autopilot: AutopilotWeights;
  seed: number;
  features?: Partial<FeatureFlags>;
}

export interface BuildingSeries {
  id: string;
  occ: number[];
  tOut: number[];
  ghi: number[];
  solarKw: number[];
  baseKw: number[];
  plugKw: number[];
  lightingKw: number[];
  hvacKw: number[];
  hvacKwNominal: number[];
  hvacKwActual: number[];
  effectiveCop: number[];
  evKw: number[];
  loadKw: number[];
  battChargeKw: number[];
  battDischargeKw: number[];
  battSocKwh: number[];
  tIn: number[];
  tTarget: number[];
  hvacU: number[];
  co2Ppm: number[];
  ventAirflowLps: number[];
  airflowLps: number[];
  airflowDesignLps: number[];
  lightingFraction: number[];
  gridPointLocalKw: number[];
  physicalGridKw: number[];
  billedGridKw: number[];
  soldKw: number[];
  boughtKw: number[];
  stepCostInr: number[];
}

export interface Trade {
  step: number;
  sellerId: string;
  buyerId: string;
  kw: number;
  priceInrKwh: number;
  source: 'export' | 'battery';
}

export interface OrderBookStep {
  step: number;
  sellOffers: {
    buildingId: string;
    kw: number;
    askInrKwh: number;
    source: 'export' | 'battery';
  }[];
  buyRequests: {
    buildingId: string;
    kw: number;
    bidMaxInrKwh: number;
    gridTariffInrKwh: number;
  }[];
}

export interface BuildingTotals {
  kWhDay: number;
  euiDay: number; // kWh/m²/day
  euiAnnual: number; // kWh/m²/yr
  energyReductionPct: number; // primary headline metric
  costReductionPct: number;
  peakReductionPct: number;

  totalKwh: number;
  solarKwh: number;
  importKwh: number;
  exportKwh: number;
  netBilledKwh: number;
  stepCostInr: number;
  demandChargeInr: number;
  totalCostInr: number;
  peakKw: number;
  emissionsGrossKg: number;
  comfortPct: number;
  violationSteps: number;
  maxExceedanceC: number;
  hoursOutsideBandOccupied: number;
  iaqPct: number; // % occupied steps CO2 <= 1000 ppm
  peakCo2Ppm: number;
  co2ExceedSteps: number;
  minLightingFraction: number; // delivered lighting fraction >= 0.75
  p2pBoughtKwh: number;
  p2pSoldKwh: number;
  p2pNetBenefitInr: number;
}

export interface ClusterTotals {
  kWhDay: number;
  euiDay: number;
  euiAnnual: number;
  energyReductionPct: number; // primary headline metric
  costReductionPct: number;
  peakReductionPct: number;

  totalKwh: number;
  solarKwh: number;
  importKwh: number;
  exportKwh: number;
  netBilledKwh: number;
  energyCostInr: number;
  demandChargeInr: number;
  totalCostInr: number;
  peakKw: number;
  emissionsKg: number;
  treeDays: number;
  worstComfortPct: number;
  avgComfortPct: number;
  worstIaqPct: number;
  avgIaqPct: number;
  minClusterLightingFraction: number;
  totalP2pTradedKwh: number;
  totalP2pSavingsInr: number;
  platformFeeInr: number;
}

export interface DrResult {
  event: DrEvent;
  refImportKw: number[];
  eventImportKw: number[];
  achievedKw: number[];
  shortfallKw: number[];
  contributionKw: Record<string, number[]>;
  payoutInr: number;
  feeInr: number;
}

export interface RunResult {
  mode: Mode;
  scenarioId: string;
  seed: number;
  hash: string;
  features: FeatureFlags;
  buildings: Record<string, BuildingSeries>;
  tariffInrKwh: number[];
  tariffPeriod: TariffPeriod[];
  efKgPerKwh: number[];
  trades: Trade[];
  orderBook: OrderBookStep[];
  marketVolumeKw: number[];
  marketVwap: (number | null)[];
  dr?: DrResult;
  fdd?: Record<string, FddResult>;
  buildingTotals: Record<string, BuildingTotals>;
  clusterTotals: ClusterTotals;
}

export interface MultiRunResult {
  baseline: RunResult;
  building: RunResult;
  network: RunResult;
  network_dr?: RunResult;
}

export interface Decision {
  id: string;
  step: number;
  buildingId: string;
  kind:
    | 'PRECOOL_START'
    | 'PEAK_HOLD'
    | 'BATTERY_PEAK_DISCHARGE'
    | 'EV_SHIFT'
    | 'TRADE'
    | 'DR_COMMIT'
    | 'DR_DELIVERED'
    | 'DCV_VENTILATION'
    | 'EQUIPMENT_FAULT';
  title: string;
  why: string[];
  resultKwh: number;
  resultInr: number;
}

export interface FeatureAblationItem {
  feature: keyof FeatureFlags;
  label: string;
  marginalKwh: number;
  marginalInr: number;
  marginalPeakKw: number;
}

export interface AblationResult {
  allFeaturesKwh: number;
  allFeaturesInr: number;
  allFeaturesPeakKw: number;
  totalSavedKwh: number;
  totalSavedInr: number;
  totalSavedPeakKw: number;
  waterfall: FeatureAblationItem[];
  residualKwh: number;
  interactionResidual: number;
  residualInr: number;
  residualPeakKw: number;
}

export interface FddResult {
  buildingId: string;
  flagStep: number | null;
  faultStartStep: number;
  detectionDelaySteps: number | null;
  wastedKwh: number;
  wastedInr: number;
  residuals: number[];
}
