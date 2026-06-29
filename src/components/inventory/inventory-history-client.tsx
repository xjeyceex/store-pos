"use client";

import * as React from "react";
import { Search, History } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/dates";
import { formatNumber } from "@/lib/currency";
import { INVENTORY_REASONS, inventoryReasonLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { InventoryLogRow } from "@/lib/queries/inventory";

export function InventoryHistoryClient({
  logs,
}: {
  logs: InventoryLogRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [reason, setReason] = React.useState("ALL");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      const matchesQuery = !q || l.productName.toLowerCase().includes(q);
      const matchesReason = reason === "ALL" || l.reason === reason;
      return matchesQuery && matchesReason;
    });
  }, [logs, query, reason]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          value={reason}
          onValueChange={(v) => setReason(v ?? "ALL")}
          items={[
            { value: "ALL", label: "All reasons" },
            ...INVENTORY_REASONS.map((r) => ({ value: r.value, label: r.label })),
          ]}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All reasons</SelectItem>
            {INVENTORY_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No inventory movements"
          description="Stock changes from sales, restocks, and adjustments will appear here."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(l.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{l.productName}</TableCell>
                  <TableCell>{inventoryReasonLabel(l.reason)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(l.quantityBefore)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      l.quantityChange > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : l.quantityChange < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {l.quantityChange > 0 ? "+" : ""}
                    {formatNumber(l.quantityChange)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(l.quantityAfter)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.note ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
