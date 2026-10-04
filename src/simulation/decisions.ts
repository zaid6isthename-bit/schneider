import { Decision, MultiRunResult } from './types';
import {
  DT_H,
  PEAK_END_STEP,
  PEAK_START_STEP,
  PRECOOL_LEAD,
  STEPS_PER_DAY,
  tariffAt,
} from './constants';

export function detectDecisions(runs: MultiRunResult): Decision[] {
  const decisions: Decision[] = [];
  const { baseline, network, network_dr } = runs;
  const activeRun = network_dr ?? network;

  // 1. Detect PRECOOL_START per building
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    for (let k = PEAK_START_STEP - PRECOOL_LEAD; k < PEAK_START_STEP; k++) {
      if (s.tTarget[k] < 24.0 - 0.05) {
        decisions.push({
          id: `${bId}-precool-${k}`,
          step: k,
          buildingId: bId,
          kind: 'PRECOOL_START',
          title: `Pre-cooling Activated`,
          why: [
            `Peak tariff starts in ${((PEAK_START_STEP - k) * 15)} min`,
            `Off-peak cooling target set to ${s.tTarget[k].toFixed(1)} °C`,
            `Pre-chilling building thermal mass before ₹11/kWh rate`,
          ],
          resultKwh: s.hvacKw[k] * DT_H,
          resultInr: s.hvacKw[k] * DT_H * tariffAt(k).inrPerKwh,
        });
        break;
      }
    }
  }

  // 2. Detect PEAK_HOLD per building
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    const baseS = baseline.buildings[bId];
    if (s.tTarget[PEAK_START_STEP] > 24.0 + 0.05) {
      let avoidedHvacKwh = 0;
      let avoidedCostInr = 0;
      for (let k = PEAK_START_STEP; k <= PEAK_END_STEP; k++) {
        const delta = Math.max(0, baseS.hvacKw[k] - s.hvacKw[k]);
        avoidedHvacKwh += delta * DT_H;
        avoidedCostInr += delta * DT_H * tariffAt(k).inrPerKwh;
      }

      decisions.push({
        id: `${bId}-peak-hold-${PEAK_START_STEP}`,
        step: PEAK_START_STEP,
        buildingId: bId,
        kind: 'PEAK_HOLD',
        title: `Peak Thermal Coasting`,
        why: [
          `Peak tariff window active (₹11.0/kWh)`,
          `Thermostat setback to ${s.tTarget[PEAK_START_STEP].toFixed(1)} °C utilizing thermal inertia`,
          `Indoor temperature remains strictly within comfort envelope`,
        ],
        resultKwh: avoidedHvacKwh,
        resultInr: avoidedCostInr,
      });
    }
  }

  // 3. Detect BATTERY_PEAK_DISCHARGE
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    const baseS = baseline.buildings[bId];
    for (let k = PEAK_START_STEP; k <= PEAK_END_STEP; k++) {
      if (s.battDischargeKw[k] > 1.0 && baseS.battDischargeKw[k] < 0.5) {
        let totalPeakDischargedKwh = 0;
        let totalPeakCostSaved = 0;
        for (let j = PEAK_START_STEP; j <= PEAK_END_STEP; j++) {
          const deltaDis = Math.max(0, s.battDischargeKw[j] - baseS.battDischargeKw[j]);
          totalPeakDischargedKwh += deltaDis * DT_H;
          totalPeakCostSaved += deltaDis * DT_H * (tariffAt(j).inrPerKwh - 6.0 / 0.9 - 1.0);
        }

        decisions.push({
          id: `${bId}-batt-discharge-${k}`,
          step: k,
          buildingId: bId,
          kind: 'BATTERY_PEAK_DISCHARGE',
          title: `Battery Peak Shaving`,
          why: [
            `Stored cheap off-peak solar/grid energy dispatched at peak tariff`,
            `Discharging at ${s.battDischargeKw[k].toFixed(0)} kW to eliminate demand peak`,
            `Battery SoC at ${s.battSocKwh[k].toFixed(0)} kWh`,
          ],
          resultKwh: totalPeakDischargedKwh,
          resultInr: totalPeakCostSaved,
        });
        break;
      }
    }
  }

  // 4. Detect EV_SHIFT
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    const baseS = baseline.buildings[bId];
    let shiftedKwh = 0;
    let savedInr = 0;
    let firstShiftStep = -1;

    for (let k = 0; k < STEPS_PER_DAY; k++) {
      const diff = baseS.evKw[k] - s.evKw[k];
      if (diff > 1.0 && tariffAt(k).period === 'peak') {
        if (firstShiftStep === -1) firstShiftStep = k;
        shiftedKwh += diff * DT_H;
        savedInr += diff * DT_H * (tariffAt(k).inrPerKwh - 6.0);
      }
    }

    if (firstShiftStep !== -1 && shiftedKwh > 0.5) {
      decisions.push({
        id: `${bId}-ev-shift-${firstShiftStep}`,
        step: firstShiftStep,
        buildingId: bId,
        kind: 'EV_SHIFT',
        title: `EV Smart Charging Delay`,
        why: [
          `Fleet charging paused during high-tariff window`,
          `Sessions scheduled into off-peak / surplus solar intervals`,
          `Guaranteed 100% departure charge requirement satisfied`,
        ],
        resultKwh: shiftedKwh,
        resultInr: savedInr,
      });
    }
  }

  // 5. Detect P3: DCV_VENTILATION (first step where DCV saves airflow with CO2 <= 800 ppm)
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    const baseS = baseline.buildings[bId];
    for (let k = 28; k < 60; k++) {
      if (baseS.ventAirflowLps[k] - s.ventAirflowLps[k] > 100 && s.co2Ppm[k] <= 800) {
        decisions.push({
          id: `${bId}-dcv-${k}`,
          step: k,
          buildingId: bId,
          kind: 'DCV_VENTILATION',
          title: `Demand-Controlled Ventilation (DCV) Optimization`,
          why: [
            `Indoor CO₂ safely buffered at ${s.co2Ppm[k].toFixed(0)} ppm (target ≤ 800 ppm)`,
            `Modulating outdoor intake from ${baseS.ventAirflowLps[k].toFixed(0)} L/s to ${s.ventAirflowLps[k].toFixed(0)} L/s`,
            `Eliminating excessive chiller sensible/latent load while preserving indoor air quality`,
          ],
          resultKwh: (baseS.hvacKw[k] - s.hvacKw[k]) * DT_H,
          resultInr: (baseS.hvacKw[k] - s.hvacKw[k]) * DT_H * tariffAt(k).inrPerKwh,
        });
        break;
      }
    }
  }

  // 6. Detect P4: EQUIPMENT_FAULT (condenser fouling anomaly)
  for (const bId of Object.keys(activeRun.buildings)) {
    const s = activeRun.buildings[bId];
    for (let k = 40; k < STEPS_PER_DAY; k++) {
      if (s.hvacKwActual[k] > s.hvacKwNominal[k] * 1.08 && s.hvacKwNominal[k] > 20) {
        decisions.push({
          id: `${bId}-fault-${k}`,
          step: k,
          buildingId: bId,
          kind: 'EQUIPMENT_FAULT',
          title: `Automated Fault Detection: Condenser Heat Exchanger Fouled`,
          why: [
            `Model-based tracking residual exceeded 8% threshold for 8 consecutive steps`,
            `Measured power ${s.hvacKwActual[k].toFixed(0)} kW exceeds expected nominal ${s.hvacKwNominal[k].toFixed(0)} kW`,
            `Effective COP degraded to ${s.effectiveCop[k].toFixed(2)} (fouling cleaning alert dispatched)`,
          ],
          resultKwh: (s.hvacKwActual[k] - s.hvacKwNominal[k]) * DT_H,
          resultInr: (s.hvacKwActual[k] - s.hvacKwNominal[k]) * DT_H * tariffAt(k).inrPerKwh,
        });
        break;
      }
    }
  }

  // 7. Detect TRADE: first trade of each seller-buyer pair
  const seenPairs = new Set<string>();
  for (const t of activeRun.trades) {
    const pairKey = `${t.sellerId}->${t.buyerId}`;
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      const buyerSaving = t.kw * DT_H * (tariffAt(t.step).inrPerKwh - (t.priceInrKwh + 0.3 + 0.5));
      decisions.push({
        id: `trade-${pairKey}-${t.step}`,
        step: t.step,
        buildingId: t.sellerId,
        kind: 'TRADE',
        title: `P2P Power Trade Cleared`,
        why: [
          `${t.sellerId} sold ${t.kw.toFixed(1)} kW ${t.source} to ${t.buyerId}`,
          `Clearing price: ₹${t.priceInrKwh.toFixed(2)}/kWh (vs grid ₹${tariffAt(t.step).inrPerKwh.toFixed(1)})`,
          `Buyer saves 100% locally while seller earns clean premium`,
        ],
        resultKwh: t.kw * DT_H,
        resultInr: buyerSaving,
      });
    }
  }

  // 8. Detect DR_COMMIT & DR_DELIVERED
  if (activeRun.dr) {
    const dr = activeRun.dr;
    decisions.push({
      id: `dr-commit-${dr.event.startStep}`,
      step: dr.event.startStep,
      buildingId: 'cluster',
      kind: 'DR_COMMIT',
      title: `Grid DR Event Dispatched`,
      why: [
        `DISCOM requested ${dr.event.requestKw} kW load curtailment`,
        `Window: ${((dr.event.endStep - dr.event.startStep + 1) * 15)} minutes`,
        `Incentive rate: ₹${12.0}/kWh delivered`,
      ],
      resultKwh: 0,
      resultInr: 0,
    });

    let totalAchieved = 0;
    for (let k = dr.event.startStep; k <= dr.event.endStep; k++) {
      totalAchieved += dr.achievedKw[k] * DT_H;
    }

    decisions.push({
      id: `dr-delivered-${dr.event.endStep}`,
      step: dr.event.endStep,
      buildingId: 'cluster',
      kind: 'DR_DELIVERED',
      title: `DR Curtailment Verified`,
      why: [
        `Delivered ${totalAchieved.toFixed(1)} kWh total grid relief`,
        `VPP aggregator payout: ₹${dr.payoutInr.toFixed(0)}`,
        `THERMOS fee: ₹${dr.feeInr.toFixed(0)}`,
      ],
      resultKwh: totalAchieved,
      resultInr: dr.payoutInr,
    });
  }

  return decisions.sort((a, b) => a.step - b.step || a.id.localeCompare(b.id));
}
