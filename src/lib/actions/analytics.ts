"use server";

import { resolveDateRange, type DateRangePreset } from "@/lib/dates";
import {
  getProfitSeries,
  getTopSellingProducts,
  getProductPerformanceAll,
  getInventoryValueTrend,
  type AnalyticsData,
} from "@/lib/queries/analytics";
import { getActiveBranchId } from "@/lib/queries/branches";

export async function fetchAnalytics(input: {
  preset: DateRangePreset;
  from?: string | null;
  to?: string | null;
}): Promise<AnalyticsData> {
  const range = resolveDateRange(input.preset, input.from ?? null, input.to ?? null);
  const branchId = await getActiveBranchId();
  const [daily, weekly, monthly, topProducts, productPerformance, inventoryTrend] =
    await Promise.all([
      getProfitSeries(range, "day", branchId),
      getProfitSeries(range, "week", branchId),
      getProfitSeries(range, "month", branchId),
      getTopSellingProducts(range, 7, branchId),
      getProductPerformanceAll(range, branchId),
      getInventoryValueTrend(range, branchId),
    ]);
  return {
    daily,
    weekly,
    monthly,
    topProducts,
    productPerformance,
    inventoryTrend,
  };
}
