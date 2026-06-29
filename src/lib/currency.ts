export const DEFAULT_CURRENCY = "PHP";

/**
 * Rounds a monetary value to 2 decimal places. We store money as Float in
 * SQLite, so we normalize on every write to avoid floating point drift.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(
  value: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    // Fallback if an invalid currency code is configured.
    return `${currency} ${safe.toFixed(2)}`;
  }
}

export function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-PH").format(safe);
}

export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
}
