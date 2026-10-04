'use client';

import React, { useState } from 'react';
import { DEFAULT_BUILDINGS } from '@/simulation/buildings';
import { CLIMATE_PRESETS, RETROFIT_TIERS } from '@/simulation/constants';
import { annualizeRuns } from '@/simulation/annualize';
import { ClimateZoneId, RetrofitTierId } from '@/simulation/types';
import { formatInr, formatKwh } from '@/lib/format';
import { Calculator, Table } from 'lucide-react';

export default function RoiCalculatorPage() {
  const [selectedType, setSelectedType] = useState<string>('office');
  const [climateZone, setClimateZone] = useState<ClimateZoneId>('composite');
  const [tier, setTier] = useState<RetrofitTierId>('B');
  const [floorArea, setFloorArea] = useState<number>(42000);
  const [monthlyBill, setMonthlyBill] = useState<number>(3500000);
  const [batteryKwh, setBatteryKwh] = useState<number>(200);

  // Find archetype building
  const archetype = DEFAULT_BUILDINGS.find((b) => b.type === selectedType) ?? DEFAULT_BUILDINGS[0];

  // Annualized simulation runs for this archetype and climate zone
  const annualBase = annualizeRuns([archetype], 'baseline', climateZone);
  const annualOpt = annualizeRuns([archetype], tier === 'C' ? 'network' : 'building', climateZone);

  const baseKwh = annualBase.buildingAnnual[archetype.id]?.annualKwh ?? 1;
  const optKwh = annualOpt.buildingAnnual[archetype.id]?.annualKwh ?? 1;
  const kwhSavedSimulated = Math.max(0, baseKwh - optKwh);
  const pctSavingsSimulated = baseKwh > 0 ? kwhSavedSimulated / baseKwh : 0;

  // Tier logic per P7.2
  let tierSavingsPct = 0;
  let capexPerM2 = RETROFIT_TIERS[tier].capexPerM2;
  let totalCapex = floorArea * capexPerM2;

  if (tier === 'A') {
    tierSavingsPct = 0; // Tier A: visibility only, no automated saving claimed
  } else if (tier === 'B') {
    tierSavingsPct = pctSavingsSimulated;
  } else if (tier === 'C') {
    tierSavingsPct = pctSavingsSimulated * 1.15; // Network + battery arbitrage uplift
    totalCapex += batteryKwh * 25000; // ₹25,000 per kWh battery placeholder
  }

  const annualSavingsInr = monthlyBill * 12 * tierSavingsPct;
  const annualKwhSaved = (baseKwh / archetype.areaM2) * floorArea * tierSavingsPct;
  const monthlySavingsInr = annualSavingsInr / 12;

  const paybackMonths =
    tier === 'A'
      ? null
      : monthlySavingsInr > 0
      ? totalCapex / monthlySavingsInr
      : Infinity;

  // Cross-Typology Results Table (Typology × Climate Zone × Tier)
  const matrixData = React.useMemo(() => {
    const list = [];
    const zones: ClimateZoneId[] = ['composite', 'hot_dry', 'warm_humid', 'moderate'];
    const tiers: RetrofitTierId[] = ['A', 'B', 'C'];

    for (const b of DEFAULT_BUILDINGS) {
      for (const z of zones) {
        for (const t of tiers) {
          const simB = annualizeRuns([b], 'baseline', z);
          const simO = annualizeRuns([b], t === 'C' ? 'network' : 'building', z);
          const bk = simB.buildingAnnual[b.id].annualKwh;
          const ok = simO.buildingAnnual[b.id].annualKwh;
          const pct = bk > 0 ? (bk - ok) / bk : 0;

          const tPct = t === 'A' ? 0 : t === 'B' ? pct : pct * 1.15;
          let cap = b.areaM2 * RETROFIT_TIERS[t].capexPerM2;
          if (t === 'C') cap += b.batteryKwh * 25000;

          const estAnnualBill = b.areaM2 * 1200; // ~₹100/m²/month representative baseline
          const annualSav = estAnnualBill * tPct;
          const pbMonths = t === 'A' ? null : annualSav > 0 ? cap / (annualSav / 12) : 999;

          list.push({
            typology: b.type,
            buildingName: b.name,
            climateZone: z,
            tier: t,
            kwhReductionPct: (tPct * 100).toFixed(1),
            paybackMonths: pbMonths !== null ? pbMonths.toFixed(1) : 'N/A',
          });
        }
      }
    }
    return list;
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">payments</span>
            <span className="font-label-caps px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
              CAPEX &amp; CASHFLOW AUDIT
            </span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface mt-1">
            Retrofit &amp; Deployment Economics (P7.2)
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Multi-tier retrofit financial payback across 6 building typologies and 4 Indian climate zones
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs Column */}
        <div className="lg:col-span-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-5 shadow-sm space-y-4">
          <h3 className="font-headline-sm text-sm font-bold text-on-surface pb-2 border-b border-surface-container-high/60">
            1. Facility &amp; Retrofit Scope Inputs
          </h3>

          {/* Typology */}
          <div className="space-y-1.5 text-xs">
            <label className="text-on-surface-variant font-medium">Facility Typology:</label>
            <select
              value={selectedType}
              onChange={(e) => {
                const newType = e.target.value;
                setSelectedType(newType);
                const b = DEFAULT_BUILDINGS.find((x) => x.type === newType);
                if (b) {
                  setFloorArea(b.areaM2);
                  setBatteryKwh(b.batteryKwh || 200);
                }
              }}
              className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
            >
              {DEFAULT_BUILDINGS.map((b) => (
                <option key={b.type} value={b.type}>
                  {b.name} ({b.type})
                </option>
              ))}
            </select>
          </div>

          {/* Climate Zone */}
          <div className="space-y-1.5 text-xs">
            <label className="text-on-surface-variant font-medium">Climate Zone Preset:</label>
            <select
              value={climateZone}
              onChange={(e) => setClimateZone(e.target.value as ClimateZoneId)}
              className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.values(CLIMATE_PRESETS).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.representativeCity} · Tmean {c.Tmean}°C)
                </option>
              ))}
            </select>
          </div>

          {/* Retrofit Tier */}
          <div className="space-y-1.5 text-xs">
            <label className="text-on-surface-variant font-medium">Retrofit Tier Scope (P7.2):</label>
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    tier === t
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                      : 'border-surface-container-high/60 bg-surface-container-low/40 text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <div className="font-bold">Tier {t}</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    ₹{RETROFIT_TIERS[t].capexPerM2}/m²
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1.5 italic">
              {RETROFIT_TIERS[tier].name}: {RETROFIT_TIERS[tier].scope}
            </p>
          </div>

          {/* Floor Area */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <label className="font-medium">Total Conditioned Floor Area (m²):</label>
              <span className="font-mono text-on-surface font-bold">{floorArea.toLocaleString()} m²</span>
            </div>
            <input
              type="number"
              min="1000"
              max="200000"
              step="1000"
              value={floorArea}
              onChange={(e) => setFloorArea(Math.max(500, Number(e.target.value)))}
              className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Monthly Bill */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <label className="font-medium">Current Monthly Electricity Bill (₹):</label>
              <span className="font-mono text-primary font-bold">{formatInr(monthlyBill)}</span>
            </div>
            <input
              type="number"
              min="50000"
              max="50000000"
              step="50000"
              value={monthlyBill}
              onChange={(e) => setMonthlyBill(Math.max(10000, Number(e.target.value)))}
              className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Battery size for Tier C */}
          {tier === 'C' && (
            <div className="space-y-1.5 text-xs pt-2 border-t border-surface-container-high/60">
              <div className="flex justify-between text-on-surface-variant">
                <label className="font-medium">Battery Energy Storage Capacity (kWh):</label>
                <span className="font-mono text-secondary font-bold">{batteryKwh} kWh</span>
              </div>
              <input
                type="number"
                min="50"
                max="2000"
                step="50"
                value={batteryKwh}
                onChange={(e) => setBatteryKwh(Math.max(0, Number(e.target.value)))}
                className="w-full bg-surface-container-low border border-surface-container-high text-on-surface rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-on-surface-variant font-mono">Battery CapEx placeholder: ₹25,000 / kWh</span>
            </div>
          )}
        </div>

        {/* Results Output Column */}
        <div className="lg:col-span-6 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between space-y-4">
          <h3 className="font-headline-sm text-sm font-bold text-on-surface pb-2 border-b border-surface-container-high/60">
            2. Computed Financial &amp; Energy Payback
          </h3>

          <div className="space-y-3 font-mono">
            {/* Payback Card */}
            <div className="p-5 rounded-lg border border-primary/20 bg-primary/5">
              <div className="text-xs font-sans text-on-surface-variant font-semibold mb-1">
                Estimated Simple Payback Period
              </div>
              <div className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                {tier === 'A' ? (
                  <span className="text-base text-on-surface-variant font-sans font-medium">
                    Visibility only: no automated saving claimed
                  </span>
                ) : paybackMonths !== null && Number.isFinite(paybackMonths) ? (
                  `${paybackMonths.toFixed(1)} Months (${(paybackMonths / 12).toFixed(1)} Years)`
                ) : (
                  'N/A'
                )}
              </div>
              {paybackMonths !== null && paybackMonths > 120 && (
                <div className="text-xs text-amber-700 font-sans mt-1">
                  Payback exceeds 120 months (shown as-is per honest reporting requirement).
                </div>
              )}
            </div>

            {/* Figures Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
                <div className="text-on-surface-variant font-sans text-[11px]">Total Retrofit CapEx</div>
                <div className="text-base font-bold text-on-surface mt-0.5">
                  {formatInr(totalCapex)}
                </div>
                <div className="text-[10px] text-on-surface-variant font-sans">Hardware + edge gateway</div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
                <div className="text-on-surface-variant font-sans text-[11px]">Annual Bill Savings</div>
                <div className="text-base font-bold text-primary mt-0.5">
                  {formatInr(annualSavingsInr)}/yr
                </div>
                <div className="text-[10px] text-on-surface-variant font-sans">
                  {tier === 'A' ? '0% automated' : `${(tierSavingsPct * 100).toFixed(1)}% reduction`}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
                <div className="text-on-surface-variant font-sans text-[11px]">Annual Energy Saved</div>
                <div className="text-base font-bold text-secondary mt-0.5">
                  {formatKwh(annualKwhSaved)}
                </div>
                <div className="text-[10px] text-on-surface-variant font-sans">Estimated via P2.2 mix</div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container-high/60 bg-surface-container-low/40">
                <div className="text-on-surface-variant font-sans text-[11px]">Monthly Net Cashflow</div>
                <div className="text-base font-bold text-on-surface mt-0.5">
                  +{formatInr(monthlySavingsInr)}/mo
                </div>
                <div className="text-[10px] text-on-surface-variant font-sans">Operating expenditure offset</div>
              </div>
            </div>
          </div>

          {/* Assumptions beside result */}
          <div className="pt-3 border-t border-surface-container-high/60 text-[11px] text-on-surface-variant space-y-1 font-mono">
            <div className="text-on-surface font-semibold font-sans mb-1">
              Active Calculation Assumptions:
            </div>
            <div>• Tier CapEx: ₹{capexPerM2}/m² (placeholder pending vendor quotation)</div>
            <div>• P2.2 mix: 40% hot weekday, 40% mild, 20% monsoon, 100% weekend</div>
            <div>• Latent humidity cooling load not modeled; heating out of scope</div>
          </div>
        </div>
      </div>

      {/* Results Table: Typology × Climate Zone × Tier (Sample preview) */}
      <div className="p-5 rounded-lg border border-surface-container-high/60 bg-surface-container-lowest shadow-sm space-y-4">
        <div>
          <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
            <Table className="w-4 h-4 text-primary" />
            Results Matrix: Typology × Climate Zone × Retrofit Tier
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Parametric sweep showing projected energy conservation and payback durations.
          </p>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto rounded border border-surface-container-high/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-surface-container-low border-b border-surface-container-high text-on-surface-variant font-label-caps uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Building Archetype</th>
                <th className="py-2.5 px-3">Climate Zone</th>
                <th className="py-2.5 px-3 text-center">Tier</th>
                <th className="py-2.5 px-3 text-right">kWh Reduction (%)</th>
                <th className="py-2.5 px-3 text-right">Payback (Months)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 bg-surface-container-lowest">
              {matrixData.slice(0, 24).map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-2 px-3 font-sans font-medium text-on-surface">{row.buildingName}</td>
                  <td className="py-2 px-3 uppercase text-on-surface-variant text-[10px]">{row.climateZone}</td>
                  <td className="py-2 px-3 text-center font-bold text-primary">Tier {row.tier}</td>
                  <td className="py-2 px-3 text-right text-primary font-bold">{row.kwhReductionPct}%</td>
                  <td className="py-2 px-3 text-right text-on-surface font-semibold">{row.paybackMonths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
