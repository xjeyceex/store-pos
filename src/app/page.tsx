import {
  Coins,
  TrendingUp,
  Boxes,
  CreditCard,
  AlertTriangle,
  PackageX,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodStatsCards } from "@/components/dashboard/period-stats-cards";
import { CashPositionCard } from "@/components/dashboard/cash-position-card";
import { RestockCard } from "@/components/dashboard/restock-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { Layers } from "lucide-react";

import { formatCurrency, formatNumber } from "@/lib/currency";
import { resolveDateRange } from "@/lib/dates";
import { getCurrency, getSettings } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";
import { getDashboardPeriods } from "@/lib/queries/analytics";
import {
  getInventorySummary,
  getOutstandingUtangTotal,
  getCashPositionToday,
  getRecentActivity,
} from "@/lib/queries/dashboard";
import { getRestockProducts } from "@/lib/queries/products";
import {
  getProfitSeries,
  getTopSellingProducts,
  getProductPerformanceAll,
  getInventoryValueTrend,
  getProductPerformanceSoldPage,
  type AnalyticsData,
} from "@/lib/queries/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const range = resolveDateRange("LAST_30_DAYS");
  const ctx = await getBranchContext();
  const branchId = ctx.branchId; // null => consolidated across all branches
  const consolidated = ctx.mode === "all";
  const scopeLabel = consolidated
    ? `All Branches (${ctx.branches.length})`
    : ctx.branchName ?? "your store";

  const [
    settings,
    currency,
    periods,
    inventory,
    outstandingUtang,
    cash,
    restock,
    activity,
    daily,
    weekly,
    monthly,
    topProducts,
    productPerformance,
    inventoryTrend,
    productPerformancePage,
  ] = await Promise.all([
    getSettings(),
    getCurrency(),
    getDashboardPeriods(branchId),
    getInventorySummary(branchId),
    getOutstandingUtangTotal(branchId),
    getCashPositionToday(branchId),
    getRestockProducts(branchId),
    getRecentActivity(branchId, 8),
    getProfitSeries(range, "day", branchId),
    getProfitSeries(range, "week", branchId),
    getProfitSeries(range, "month", branchId),
    getTopSellingProducts(range, 7, branchId),
    getProductPerformanceAll(range, branchId),
    getInventoryValueTrend(range, branchId),
    getProductPerformanceSoldPage(range, branchId, { page: 1 }),
  ]);

  const analytics: AnalyticsData = {
    daily,
    weekly,
    monthly,
    topProducts,
    productPerformance,
    inventoryTrend,
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          consolidated
            ? `${settings.storeName} — consolidated across ${ctx.branches.length} branch${ctx.branches.length === 1 ? "" : "es"}.`
            : `${settings.storeName} — ${scopeLabel}.`
        }
      >
        {consolidated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Layers className="size-3.5" />
            All Branches
          </span>
        ) : null}
      </PageHeader>

      <div className="space-y-6">
        <PeriodStatsCards periods={periods} currency={currency} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Outstanding Utang"
            value={formatCurrency(outstandingUtang, currency)}
            icon={CreditCard}
            tone={outstandingUtang > 0 ? "warning" : "default"}
            hint="Total unpaid customer credit"
          />
          <StatCard
            label="Inventory Value"
            value={formatCurrency(inventory.inventoryValue, currency)}
            icon={Boxes}
            hint={`${formatNumber(inventory.productCount)} products in catalog`}
          />
          <StatCard
            label="Potential Profit"
            value={formatCurrency(inventory.potentialProfit, currency)}
            icon={TrendingUp}
            tone="positive"
            hint={`Potential revenue ${formatCurrency(inventory.potentialRevenue, currency)}`}
          />
          <StatCard
            label="Low Stock"
            value={formatNumber(inventory.lowStockCount)}
            icon={AlertTriangle}
            tone={inventory.lowStockCount > 0 ? "warning" : "default"}
            hint="At or below minimum level"
          />
          <StatCard
            label="Out of Stock"
            value={formatNumber(inventory.outOfStockCount)}
            icon={PackageX}
            tone={inventory.outOfStockCount > 0 ? "negative" : "default"}
            hint="Needs immediate restocking"
          />
          <StatCard
            label="Today's Closing Cash"
            value={formatCurrency(cash.closingCash, currency)}
            icon={Coins}
            tone="positive"
            hint={`Opening ${formatCurrency(cash.openingCash, currency)}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <CashPositionCard cash={cash} currency={currency} />
          <RestockCard products={restock} />
          <RecentActivity
            sales={activity.sales}
            expenses={activity.expenses}
            inventory={activity.inventory}
            payments={activity.payments}
            currency={currency}
            showBranch={consolidated}
          />
        </div>

        <AnalyticsCharts
          initial={analytics}
          initialProductPerformance={productPerformancePage}
          currency={currency}
          initialRange={{ preset: "LAST_30_DAYS", from: "", to: "" }}
        />
      </div>
    </div>
  );
}
