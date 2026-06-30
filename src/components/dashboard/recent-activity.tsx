"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { formatDateTime } from "@/lib/dates";
import { expenseCategoryLabel, inventoryReasonLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  RecentSale,
  RecentExpense,
  RecentInventory,
  RecentPayment,
} from "@/lib/queries/dashboard";

function Empty({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>
  );
}

function Row({
  primary,
  secondary,
  value,
  tone,
}: {
  primary: string;
  secondary: string;
  value: string;
  tone?: "positive" | "negative" | "default";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{primary}</p>
        <p className="truncate text-xs text-muted-foreground">{secondary}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-medium tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function withBranch(text: string, branchName: string | null, show: boolean) {
  return show && branchName ? `${branchName} • ${text}` : text;
}

export function RecentActivity({
  sales,
  expenses,
  inventory,
  payments,
  currency,
  showBranch = false,
}: {
  sales: RecentSale[];
  expenses: RecentExpense[];
  inventory: RecentInventory[];
  payments: RecentPayment[];
  currency: string;
  showBranch?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="inventory">Stock</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="pt-2">
            {sales.length === 0 ? (
              <Empty message="No sales yet." />
            ) : (
              sales.map((s) => (
                <Row
                  key={s.id}
                  primary={s.productName}
                  secondary={withBranch(
                    `${formatNumber(s.quantity)} pcs • ${formatDateTime(s.saleDate)}`,
                    s.branchName,
                    showBranch
                  )}
                  value={formatCurrency(s.revenue, currency)}
                  tone="positive"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="expenses" className="pt-2">
            {expenses.length === 0 ? (
              <Empty message="No expenses yet." />
            ) : (
              expenses.map((e) => (
                <Row
                  key={e.id}
                  primary={e.description}
                  secondary={withBranch(
                    `${expenseCategoryLabel(e.category)} • ${formatDateTime(e.expenseDate)}`,
                    e.branchName,
                    showBranch
                  )}
                  value={formatCurrency(e.amount, currency)}
                  tone="negative"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="inventory" className="pt-2">
            {inventory.length === 0 ? (
              <Empty message="No stock movements yet." />
            ) : (
              inventory.map((i) => (
                <Row
                  key={i.id}
                  primary={i.productName}
                  secondary={withBranch(
                    `${inventoryReasonLabel(i.reason)} • ${formatDateTime(i.createdAt)}`,
                    i.branchName,
                    showBranch
                  )}
                  value={`${i.quantityChange > 0 ? "+" : ""}${formatNumber(i.quantityChange)}`}
                  tone={
                    i.quantityChange > 0
                      ? "positive"
                      : i.quantityChange < 0
                        ? "negative"
                        : "default"
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="pt-2">
            {payments.length === 0 ? (
              <Empty message="No payments yet." />
            ) : (
              payments.map((p) => (
                <Row
                  key={p.id}
                  primary={p.customerName}
                  secondary={withBranch(
                    `Utang payment • ${formatDateTime(p.paymentDate)}`,
                    p.branchName,
                    showBranch
                  )}
                  value={formatCurrency(p.amount, currency)}
                  tone="positive"
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
