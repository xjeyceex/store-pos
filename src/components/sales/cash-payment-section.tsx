"use client";

import { Banknote, HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCustomerSelect } from "@/components/sales/searchable-customer-select";
import { formatCurrency, roundMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CashPaymentSection({
  total,
  currency,
  cashReceived,
  onCashReceivedChange,
  utangCustomerId = "",
  utangCustomerName = "",
  onUtangCustomerChange,
  customers = [],
  onRecordUtang,
  utangPending = false,
  className,
}: {
  total: number;
  currency: string;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  utangCustomerId?: string;
  utangCustomerName?: string;
  onUtangCustomerChange?: (customerId: string, customerName: string) => void;
  customers?: { id: string; name: string }[];
  onRecordUtang?: () => void;
  utangPending?: boolean;
  className?: string;
}) {
  const received = roundMoney(Number.parseFloat(cashReceived) || 0);
  const hasInput = cashReceived.trim() !== "";
  const change = roundMoney(received - total);
  const insufficient = hasInput && received < total;
  const canShowChange = hasInput && received >= total;
  const utangBalance = roundMoney(total - received);
  const hasCustomer = Boolean(utangCustomerId || utangCustomerName?.trim());

  function setExactAmount() {
    onCashReceivedChange(total > 0 ? total.toFixed(2) : "0");
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-3 sm:p-4",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Banknote className="size-4 text-muted-foreground" />
        Cash payment
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="cash-received">Cash received</Label>
          <Input
            id="cash-received"
            className="h-11 text-lg font-medium tabular-nums"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            value={cashReceived}
            onChange={(e) => onCashReceivedChange(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full sm:w-auto sm:min-w-32"
          onClick={setExactAmount}
          disabled={total <= 0}
        >
          Exact amount
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Total due:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(total, currency)}
          </span>
        </span>

        {insufficient ? (
          <span className="font-medium text-destructive tabular-nums">
            Short {formatCurrency(Math.abs(change), currency)}
          </span>
        ) : null}

        {canShowChange ? (
          <span className="font-semibold tabular-nums">
            <span className="font-normal text-muted-foreground">Change: </span>
            <span className="text-lg text-destructive">
              {formatCurrency(change, currency)}
            </span>
          </span>
        ) : null}
      </div>

      {insufficient && onRecordUtang && onUtangCustomerChange ? (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HandCoins className="size-4 text-amber-600 dark:text-amber-400" />
            Record balance as utang
          </div>

          <div className="grid gap-2">
            <Label>Customer</Label>
            <SearchableCustomerSelect
              customers={customers}
              customerId={utangCustomerId}
              customerName={utangCustomerName}
              onCustomerChange={onUtangCustomerChange}
            />
            <p className="text-xs text-muted-foreground">
              Pick an existing customer or type a new name to create one.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {received > 0 ? (
              <>
                Paid {formatCurrency(received, currency)} cash ·{" "}
                {formatCurrency(utangBalance, currency)} on utang
              </>
            ) : (
              <>Full amount ({formatCurrency(total, currency)}) will be on utang.</>
            )}
          </p>

          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full sm:w-auto"
            disabled={utangPending || !hasCustomer}
            onClick={onRecordUtang}
          >
            {utangPending ? "Saving..." : "Record as Utang"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
