import { Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import type { CashPosition } from "@/lib/types";

export function CashPositionCard({
  cash,
  currency,
}: {
  cash: CashPosition;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          Today&apos;s Cash Position
        </CardTitle>
        <CardDescription>
          Opening cash carries over from yesterday.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Opening Cash</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(cash.openingCash, currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">+ Cash Sales</span>
          <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(cash.cashSales, currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">− Expenses</span>
          <span className="font-medium tabular-nums text-destructive">
            {formatCurrency(cash.expenses, currency)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-base">
          <span className="font-medium">Closing Cash</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(cash.closingCash, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
