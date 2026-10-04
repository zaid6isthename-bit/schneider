// Number and currency formatters using en-IN locale per PRD §1

export function formatInr(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${Math.round(value).toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })}`;
}

export function formatInrPerKwh(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `₹${value.toFixed(2)}/kWh`;
}

export function formatKw(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0 kW';
  return `${value.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} kW`;
}

export function formatKwh(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0 kWh';
  return `${value.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} kWh`;
}

export function formatKg(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0 kg';
  return `${value.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} kg`;
}

export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatClock(k: number): string {
  const step = Math.max(0, Math.min(95.99, k));
  const totalMinutes = Math.floor(step * 15);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
