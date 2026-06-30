"use client";

import * as React from "react";
import { History } from "lucide-react";

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
import {
  DesktopTable,
  MobileRecordCard,
  MobileRecordList,
} from "@/components/shared/mobile-record-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { useServerPaginationWithFilters } from "@/components/shared/use-server-pagination";
import { fetchInventoryLogsPage } from "@/lib/actions/lists";
import type { PaginatedResult } from "@/lib/pagination";
import { formatDateTime } from "@/lib/dates";
import { formatNumber } from "@/lib/currency";
import { INVENTORY_REASONS, inventoryReasonLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { InventoryLogRow } from "@/lib/queries/inventory";

export function InventoryHistoryClient({
  initial,
}: {
  initial: PaginatedResult<InventoryLogRow>;
}) {
  const [reason, setReason] = React.useState("ALL");
  const {
    items: logs,
    page,
    pageSize,
    totalPages,
    totalItems,
    query,
    setQuery,
    setPage,
    isPending,
  } = useServerPaginationWithFilters(initial, fetchInventoryLogsPage, {
    reason,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs">
          <SearchInput
            placeholder="Search by product..."
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

      {totalItems === 0 ? (
        <EmptyState
          icon={History}
          title="No inventory movements"
          description="Stock changes from sales, restocks, and adjustments will appear here."
        />
      ) : (
        <div className={isPending ? "opacity-60" : undefined}>
        <>
          <MobileRecordList>
            {logs.map((l) => (
              <MobileRecordCard
                key={l.id}
                title={l.productName}
                subtitle={formatDateTime(l.createdAt)}
                badge={
                  <span className="text-xs font-medium">
                    {inventoryReasonLabel(l.reason)}
                  </span>
                }
                fields={[
                  { label: "Before", value: formatNumber(l.quantityBefore) },
                  {
                    label: "Change",
                    value: (
                      <span
                        className={cn(
                          l.quantityChange > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : l.quantityChange < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        )}
                      >
                        {l.quantityChange > 0 ? "+" : ""}
                        {formatNumber(l.quantityChange)}
                      </span>
                    ),
                  },
                  { label: "After", value: formatNumber(l.quantityAfter) },
                  {
                    label: "Note",
                    value: l.note ?? "—",
                    className: "col-span-2",
                  },
                ]}
              />
            ))}
          </MobileRecordList>

          <DesktopTable>
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
              {logs.map((l) => (
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
          </DesktopTable>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
        </div>
      )}
    </div>
  );
}
