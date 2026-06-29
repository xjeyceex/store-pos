import type { StockStatus } from "./constants";

/** Standard result shape returned by server actions. */
export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Aggregated profit/sales stats for a time period. */
export type PeriodStats = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
};

export type DashboardPeriods = {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
};

export type InventorySummary = {
  inventoryValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  productCount: number;
};

export type CashPosition = {
  openingCash: number;
  cashSales: number;
  expenses: number;
  closingCash: number;
};

export type ProductComputed = {
  profitPerItem: number;
  inventoryValue: number;
  stockStatus: StockStatus;
};

export type ChartPoint = {
  label: string;
  [key: string]: string | number;
};
