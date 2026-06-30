"use client";

import { useState, useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RangeFilter, type RangeValue } from "@/components/shared/range-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { fetchAnalytics } from "@/lib/actions/analytics";
import { fetchProductPerformancePage } from "@/lib/actions/lists";
import { formatCurrency, formatNumber } from "@/lib/currency";
import type { AnalyticsData, ProductPerformance } from "@/lib/queries/analytics";
import type { PaginatedResult } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type TooltipValue = number | string | readonly (number | string)[] | undefined;

function ChartCard({
  title,
  hasData,
  children,
}: {
  title: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <EmptyState
              title="No data"
              description="No records in this period yet."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsCharts({
  initial,
  initialProductPerformance,
  currency,
  initialRange,
}: {
  initial: AnalyticsData;
  initialProductPerformance: PaginatedResult<ProductPerformance>;
  currency: string;
  initialRange: RangeValue;
}) {
  const [range, setRange] = useState<RangeValue>(initialRange);
  const [data, setData] = useState<AnalyticsData>(initial);
  const [productPerf, setProductPerf] = useState(initialProductPerformance);
  const [isPending, startTransition] = useTransition();

  function loadProductPage(nextRange: RangeValue, page: number) {
    startTransition(async () => {
      const perf = await fetchProductPerformancePage({
        preset: nextRange.preset,
        from: nextRange.from || null,
        to: nextRange.to || null,
        page,
      });
      setProductPerf(perf);
    });
  }

  function handleRangeChange(next: RangeValue) {
    setRange(next);
    if (next.preset === "CUSTOM" && (!next.from || !next.to)) return;
    startTransition(async () => {
      const [result, perf] = await Promise.all([
        fetchAnalytics({
          preset: next.preset,
          from: next.from || null,
          to: next.to || null,
        }),
        fetchProductPerformancePage({
          preset: next.preset,
          from: next.from || null,
          to: next.to || null,
          page: 1,
        }),
      ]);
      setData(result);
      setProductPerf(perf);
    });
  }

  const money = (value: TooltipValue) => formatCurrency(Number(value), currency);

  const qty = (value: TooltipValue) => formatNumber(Number(value));

  const axisMoney = (value: number) => formatNumber(value);

  const hasDaily = data.daily.some(
    (d) => d.revenue !== 0 || d.expenses !== 0 || d.netProfit !== 0
  );
  const hasWeekly = data.weekly.some((d) => d.netProfit !== 0 || d.revenue !== 0);
  const hasMonthly = data.monthly.some(
    (d) => d.netProfit !== 0 || d.revenue !== 0
  );
  const hasTop = data.topProducts.length > 0;
  const hasTrend = data.inventoryTrend.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className={cn("w-full sm:w-auto", isPending && "pointer-events-none opacity-60")}>
          <RangeFilter value={range} onChange={handleRangeChange} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue vs Expenses" hasData={hasDaily}>
          <BarChart data={data.daily}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Daily Profit" hasData={hasDaily}>
          <AreaChart data={data.daily}>
            <defs>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Area
              type="monotone"
              dataKey="netProfit"
              name="Net Profit"
              stroke="var(--chart-1)"
              fill="url(#profitFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Daily Sales" hasData={hasDaily}>
          <BarChart data={data.daily}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Bar dataKey="revenue" name="Sales" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Inventory Value Trend" hasData={hasTrend}>
          <LineChart data={data.inventoryTrend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Line
              type="monotone"
              dataKey="value"
              name="Inventory Value"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title="Weekly Profit" hasData={hasWeekly}>
          <BarChart data={data.weekly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Bar dataKey="netProfit" name="Net Profit" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Monthly Profit" hasData={hasMonthly}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={48} />
            <Tooltip formatter={money} />
            <Bar dataKey="netProfit" name="Net Profit" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Top Selling Products" hasData={hasTop}>
          <BarChart data={data.topProducts} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip formatter={qty} />
            <Bar dataKey="quantitySold" name="Qty Sold" radius={[0, 3, 3, 0]}>
              {data.topProducts.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {productPerf.totalItems === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <EmptyState
                title="No product sales"
                description="No products were sold in this period."
              />
            </div>
          ) : (
            <>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerf.items.map((p, i) => (
                    <TableRow key={p.productId ?? p.name}>
                      <TableCell className="text-muted-foreground">
                        {(productPerf.page - 1) * productPerf.pageSize + i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(p.quantitySold)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.revenue, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.grossProfit, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={productPerf.page}
              totalPages={productPerf.totalPages}
              totalItems={productPerf.totalItems}
              pageSize={productPerf.pageSize}
              onPageChange={(page) => loadProductPage(range, page)}
              className="border-t-0 pt-0"
            />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
