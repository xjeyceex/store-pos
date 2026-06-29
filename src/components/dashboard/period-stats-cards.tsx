import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { DashboardPeriods, PeriodStats } from "@/lib/types";

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PeriodCard({
  title,
  stats,
  currency,
}: {
  title: string;
  stats: PeriodStats;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricRow label="Sales" value={formatCurrency(stats.revenue, currency)} />
        <MetricRow
          label="Profit"
          value={formatCurrency(stats.netProfit, currency)}
          tone={stats.netProfit >= 0 ? "positive" : "negative"}
        />
        <MetricRow
          label="Expenses"
          value={formatCurrency(stats.expenses, currency)}
        />
      </CardContent>
    </Card>
  );
}

export function PeriodStatsCards({
  periods,
  currency,
}: {
  periods: DashboardPeriods;
  currency: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <PeriodCard title="Today" stats={periods.today} currency={currency} />
      <PeriodCard title="This Week" stats={periods.week} currency={currency} />
      <PeriodCard title="This Month" stats={periods.month} currency={currency} />
      <PeriodCard title="This Year" stats={periods.year} currency={currency} />
    </div>
  );
}
