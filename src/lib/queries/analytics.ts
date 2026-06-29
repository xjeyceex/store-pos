import {
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";

import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import {
  type DateRange,
  todayRange,
  thisWeekRange,
  thisMonthRange,
  thisYearRange,
  toISODate,
  formatShortDate,
  formatMonthLabel,
  startOfDayLocal,
  endOfDayLocal,
} from "@/lib/dates";
import type { PeriodStats, DashboardPeriods } from "@/lib/types";

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** `null`/`undefined` branchId => consolidated across all branches. */
function branchFilter(branchId?: string | null) {
  return branchId ? { branchId } : {};
}

export async function getPeriodStats(
  range: DateRange,
  branchId?: string | null
): Promise<PeriodStats> {
  const [saleAgg, expenseAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...branchFilter(branchId), saleDate: { gte: range.from, lte: range.to } },
      _sum: { revenue: true, productCost: true, grossProfit: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { ...branchFilter(branchId), expenseDate: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = roundMoney(saleAgg._sum.revenue ?? 0);
  const cogs = roundMoney(saleAgg._sum.productCost ?? 0);
  const grossProfit = roundMoney(saleAgg._sum.grossProfit ?? 0);
  const expenses = roundMoney(expenseAgg._sum.amount ?? 0);
  const netProfit = roundMoney(grossProfit - expenses);

  return {
    revenue,
    cogs,
    grossProfit,
    expenses,
    netProfit,
    salesCount: saleAgg._count,
  };
}

export async function getDashboardPeriods(
  branchId?: string | null
): Promise<DashboardPeriods> {
  const [today, week, month, year] = await Promise.all([
    getPeriodStats(todayRange(), branchId),
    getPeriodStats(thisWeekRange(), branchId),
    getPeriodStats(thisMonthRange(), branchId),
    getPeriodStats(thisYearRange(), branchId),
  ]);
  return { today, week, month, year };
}

// ----- Product performance -----
export type ProductPerformance = {
  productId: string | null;
  name: string;
  quantitySold: number;
  revenue: number;
  grossProfit: number;
};

export async function getProductPerformance(
  range: DateRange,
  branchId?: string | null
): Promise<ProductPerformance[]> {
  const grouped = await prisma.sale.groupBy({
    by: ["productId"],
    where: { ...branchFilter(branchId), saleDate: { gte: range.from, lte: range.to } },
    _sum: { quantity: true, revenue: true, grossProfit: true },
  });
  const products = await prisma.product.findMany({
    where: branchFilter(branchId),
    select: { id: true, name: true },
  });
  const nameMap = new Map(products.map((p) => [p.id, p.name]));

  return grouped
    .map((g) => ({
      productId: g.productId,
      name: g.productId
        ? nameMap.get(g.productId) ?? "Unknown product"
        : "Deleted product",
      quantitySold: g._sum.quantity ?? 0,
      revenue: roundMoney(g._sum.revenue ?? 0),
      grossProfit: roundMoney(g._sum.grossProfit ?? 0),
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
}

/** All current products, merged with their performance (0 if no sales). */
export async function getProductPerformanceAll(
  range: DateRange,
  branchId?: string | null
): Promise<ProductPerformance[]> {
  const perf = await getProductPerformance(range, branchId);
  const perfMap = new Map(
    perf.filter((p) => p.productId).map((p) => [p.productId as string, p])
  );
  const products = await prisma.product.findMany({
    where: branchFilter(branchId),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return products.map(
    (p) =>
      perfMap.get(p.id) ?? {
        productId: p.id,
        name: p.name,
        quantitySold: 0,
        revenue: 0,
        grossProfit: 0,
      }
  );
}

export async function getTopSellingProducts(
  range: DateRange,
  limit = 5,
  branchId?: string | null
): Promise<ProductPerformance[]> {
  const perf = await getProductPerformance(range, branchId);
  return perf.slice(0, limit);
}

export async function getMostProfitableProducts(
  range: DateRange,
  limit = 5,
  branchId?: string | null
): Promise<ProductPerformance[]> {
  const perf = await getProductPerformance(range, branchId);
  return [...perf].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, limit);
}

// ----- Per-product quantity across the standard periods (dashboard table) -----
export type ProductPeriodSales = {
  productId: string;
  name: string;
  today: number;
  week: number;
  month: number;
  year: number;
};

async function quantityByProduct(
  range: DateRange,
  branchId?: string | null
): Promise<Map<string, number>> {
  const grouped = await prisma.sale.groupBy({
    by: ["productId"],
    where: { ...branchFilter(branchId), saleDate: { gte: range.from, lte: range.to } },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const g of grouped) {
    if (g.productId) map.set(g.productId, g._sum.quantity ?? 0);
  }
  return map;
}

export async function getProductSalesByPeriods(
  branchId?: string | null
): Promise<ProductPeriodSales[]> {
  const [products, today, week, month, year] = await Promise.all([
    prisma.product.findMany({
      where: branchFilter(branchId),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    quantityByProduct(todayRange(), branchId),
    quantityByProduct(thisWeekRange(), branchId),
    quantityByProduct(thisMonthRange(), branchId),
    quantityByProduct(thisYearRange(), branchId),
  ]);
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    today: today.get(p.id) ?? 0,
    week: week.get(p.id) ?? 0,
    month: month.get(p.id) ?? 0,
    year: year.get(p.id) ?? 0,
  }));
}

// ----- Time series for charts -----
export type Granularity = "day" | "week" | "month";

export type SeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  salesCount: number;
};

function bucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "day") return toISODate(date);
  if (granularity === "week") return toISODate(startOfWeek(date, WEEK_OPTS));
  return format(startOfMonth(date), "yyyy-MM");
}

function bucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return formatShortDate(date);
  if (granularity === "week") return formatShortDate(startOfWeek(date, WEEK_OPTS));
  return formatMonthLabel(date);
}

export async function getProfitSeries(
  range: DateRange,
  granularity: Granularity,
  branchId?: string | null
): Promise<SeriesPoint[]> {
  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { ...branchFilter(branchId), saleDate: { gte: range.from, lte: range.to } },
      select: { saleDate: true, revenue: true, grossProfit: true },
    }),
    prisma.expense.findMany({
      where: { ...branchFilter(branchId), expenseDate: { gte: range.from, lte: range.to } },
      select: { expenseDate: true, amount: true },
    }),
  ]);

  let buckets: Date[];
  if (granularity === "day") {
    buckets = eachDayOfInterval({ start: range.from, end: range.to });
  } else if (granularity === "week") {
    buckets = eachWeekOfInterval({ start: range.from, end: range.to }, WEEK_OPTS);
  } else {
    buckets = eachMonthOfInterval({ start: range.from, end: range.to });
  }

  const map = new Map<string, SeriesPoint>();
  for (const b of buckets) {
    const key = bucketKey(b, granularity);
    map.set(key, {
      key,
      label: bucketLabel(b, granularity),
      revenue: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
      salesCount: 0,
    });
  }

  for (const s of sales) {
    const point = map.get(bucketKey(s.saleDate, granularity));
    if (point) {
      point.revenue += s.revenue;
      point.grossProfit += s.grossProfit;
      point.salesCount += 1;
    }
  }
  for (const e of expenses) {
    const point = map.get(bucketKey(e.expenseDate, granularity));
    if (point) {
      point.expenses += e.amount;
    }
  }

  return Array.from(map.values()).map((p) => ({
    ...p,
    revenue: roundMoney(p.revenue),
    grossProfit: roundMoney(p.grossProfit),
    expenses: roundMoney(p.expenses),
    netProfit: roundMoney(p.grossProfit - p.expenses),
    salesCount: p.salesCount,
  }));
}

export type InventoryTrendPoint = { key: string; label: string; value: number };

export type AnalyticsData = {
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  topProducts: ProductPerformance[];
  productPerformance: ProductPerformance[];
  inventoryTrend: InventoryTrendPoint[];
};

export async function getInventoryValueTrend(
  range: DateRange,
  branchId?: string | null
): Promise<InventoryTrendPoint[]> {
  const summaries = await prisma.dailySummary.findMany({
    where: {
      ...branchFilter(branchId),
      date: { gte: startOfDayLocal(range.from), lte: endOfDayLocal(range.to) },
    },
    orderBy: { date: "asc" },
    select: { date: true, inventoryValue: true },
  });

  // Consolidated view: sum each day's inventory value across all branches.
  if (!branchId) {
    const byDay = new Map<string, { date: Date; value: number }>();
    for (const s of summaries) {
      const key = toISODate(s.date);
      const entry = byDay.get(key);
      if (entry) entry.value += s.inventoryValue;
      else byDay.set(key, { date: s.date, value: s.inventoryValue });
    }
    return Array.from(byDay.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((e) => ({
        key: toISODate(e.date),
        label: formatShortDate(e.date),
        value: roundMoney(e.value),
      }));
  }

  return summaries.map((s) => ({
    key: toISODate(s.date),
    label: formatShortDate(s.date),
    value: roundMoney(s.inventoryValue),
  }));
}
