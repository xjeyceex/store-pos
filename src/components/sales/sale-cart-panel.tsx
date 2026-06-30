"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/currency";
import {
  cartLineTotal,
  cartTotal,
  type CartLine,
} from "@/lib/sales-cart";

export function SaleCartPanel({
  lines,
  currency,
  onRemove,
  onAdjustQty,
}: {
  lines: CartLine[];
  currency: string;
  onRemove: (key: string) => void;
  onAdjustQty: (key: string, delta: number) => void;
}) {
  if (lines.length === 0) return null;

  const total = cartTotal(lines);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
      <p className="mb-2 text-sm font-medium">Current sale</p>
      <ul className="divide-y divide-border/60">
        {lines.map((line) => (
          <li
            key={line.key}
            className="flex items-center gap-2 py-2.5 text-sm first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{line.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(line.quantity)} × {formatCurrency(line.unitPrice, currency)}
              </p>
            </div>
            <span className="shrink-0 font-medium tabular-nums">
              {formatCurrency(cartLineTotal(line), currency)}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Decrease quantity"
                onClick={() => onAdjustQty(line.key, -1)}
                disabled={line.quantity <= 1}
              >
                −
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Increase quantity"
                onClick={() => onAdjustQty(line.key, 1)}
              >
                +
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Remove item"
                onClick={() => onRemove(line.key)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
