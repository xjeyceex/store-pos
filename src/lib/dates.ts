import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  format,
} from "date-fns";

export type DateRange = { from: Date; to: Date };

// Philippine week convention: Monday start.
const WEEK_OPTS = { weekStartsOn: 1 as const };

export function startOfDayLocal(date: Date = new Date()): Date {
  return startOfDay(date);
}

export function endOfDayLocal(date: Date = new Date()): Date {
  return endOfDay(date);
}

/** Canonical key (midnight) used for the unique DailySummary.date column. */
export function dayKey(date: Date = new Date()): Date {
  return startOfDay(date);
}

export function todayRange(ref: Date = new Date()): DateRange {
  return { from: startOfDay(ref), to: endOfDay(ref) };
}

export function thisWeekRange(ref: Date = new Date()): DateRange {
  return {
    from: startOfWeek(ref, WEEK_OPTS),
    to: endOfWeek(ref, WEEK_OPTS),
  };
}

export function thisMonthRange(ref: Date = new Date()): DateRange {
  return { from: startOfMonth(ref), to: endOfMonth(ref) };
}

export function thisYearRange(ref: Date = new Date()): DateRange {
  return { from: startOfYear(ref), to: endOfYear(ref) };
}

export function lastMonthRange(ref: Date = new Date()): DateRange {
  const prev = subMonths(ref, 1);
  return { from: startOfMonth(prev), to: endOfMonth(prev) };
}

export function lastNDaysRange(n: number, ref: Date = new Date()): DateRange {
  return { from: startOfDay(subDays(ref, n - 1)), to: endOfDay(ref) };
}

// ----- Range presets used across charts and reports -----
export type DateRangePreset =
  | "TODAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export const RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "THIS_YEAR", label: "This Year" },
  { value: "CUSTOM", label: "Custom Range" },
];

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: Date | string | null,
  customTo?: Date | string | null,
  ref: Date = new Date()
): DateRange {
  switch (preset) {
    case "TODAY":
      return todayRange(ref);
    case "LAST_7_DAYS":
      return lastNDaysRange(7, ref);
    case "LAST_30_DAYS":
      return lastNDaysRange(30, ref);
    case "THIS_MONTH":
      return thisMonthRange(ref);
    case "LAST_MONTH":
      return lastMonthRange(ref);
    case "THIS_YEAR":
      return thisYearRange(ref);
    case "CUSTOM": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(ref);
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(ref);
      return { from, to };
    }
    default:
      return todayRange(ref);
  }
}

// ----- Formatters -----
export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatShortDate(date: Date | string): string {
  return format(new Date(date), "MMM d");
}

export function formatMonthLabel(date: Date | string): string {
  return format(new Date(date), "MMM yyyy");
}

/** yyyy-MM-dd for <input type="date"> and stable keys. */
export function toISODate(date: Date | string): string {
  return format(new Date(date), "yyyy-MM-dd");
}

/** Today's date for form defaults — call at render/submit time, not module load. */
export function todayISODate(): string {
  return toISODate(new Date());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Parses a yyyy-MM-dd value from a date input as a LOCAL date. When the value
 * is today (or empty), returns the current date/time so new records sort as
 * newest. Past dates are stored at local noon to avoid timezone rollovers.
 */
export function parseDateInput(value?: string | null): Date {
  if (!value) return new Date();
  const parts = value.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return new Date(value);
  const selected = new Date(y, m - 1, d);
  if (isSameCalendarDay(selected, new Date())) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
