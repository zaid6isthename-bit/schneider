import { ScenarioDef } from './types';

export const SCENARIOS: Record<string, ScenarioDef> = {
  hot_weekday: {
    id: 'hot_weekday',
    name: 'Hot Summer Weekday (Default)',
    dayType: 'weekday',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.00,
  },
  mild_weekday: {
    id: 'mild_weekday',
    name: 'Mild Spring/Autumn Weekday (Patch 1 P2.2)',
    dayType: 'weekday',
    Tmean: 28,
    A: 5,
    cloudBase: 0.90,
    occScale: 1.00,
  },
  heatwave: {
    id: 'heatwave',
    name: 'Severe Heatwave',
    dayType: 'weekday',
    Tmean: 40,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.00,
  },
  monsoon: {
    id: 'monsoon',
    name: 'Monsoon Overcast',
    dayType: 'weekday',
    Tmean: 29,
    A: 3,
    cloudBase: 0.35,
    occScale: 1.00,
  },
  sunday_surplus: {
    id: 'sunday_surplus',
    name: 'Sunday Surplus',
    dayType: 'weekend',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.00,
  },
  full_capacity: {
    id: 'full_capacity',
    name: 'Peak Commercial Occupancy',
    dayType: 'weekday',
    Tmean: 36,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.15,
  },
  grid_crisis: {
    id: 'grid_crisis',
    name: 'Grid Crisis / Utility DR Event',
    dayType: 'weekday',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.00,
    drEvent: {
      startStep: 72, // 18:00
      endStep: 79,   // 19:45 inclusive (until 20:00)
      requestKw: 400,
    },
  },
  fault_fouled_condenser: {
    id: 'fault_fouled_condenser',
    name: 'Condenser Fouling Fault (Patch 1 P4)',
    dayType: 'weekday',
    Tmean: 34,
    A: 7,
    cloudBase: 0.95,
    occScale: 1.00,
    fault: {
      buildingId: 'orbit',
      faultStartStep: 40, // 10:00 AM
      faultDegMax: 0.12,   // 12% COP loss
      rampSteps: 8,       // Ramps over 8 steps
    },
  },
};

export const DEFAULT_SCENARIO_ID = 'hot_weekday';
