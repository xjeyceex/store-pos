import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STOCK_STATUS_LABELS,
  utangStatusLabel,
  type StockStatus,
} from "@/lib/constants";

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const styles: Record<StockStatus, string> = {
    IN_STOCK:
      "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
    LOW_STOCK:
      "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400",
    OUT_OF_STOCK:
      "border-destructive/40 text-destructive",
  };
  return (
    <Badge variant="outline" className={cn(styles[status])}>
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UtangStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
    PARTIALLY_PAID:
      "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400",
    UNPAID: "border-destructive/40 text-destructive",
  };
  return (
    <Badge variant="outline" className={cn(styles[status] ?? "")}>
      {utangStatusLabel(status)}
    </Badge>
  );
}
