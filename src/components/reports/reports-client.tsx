"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { fetchReport } from "@/lib/actions/reports";
import {
  REPORT_TYPES,
  type ReportColumn,
  type ReportResult,
  type ReportType,
} from "@/lib/reports-meta";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { toCSV, downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

export function ReportsClient({
  initial,
  initialType,
  currency,
}: {
  initial: ReportResult;
  initialType: ReportType;
  currency: string;
}) {
  const [type, setType] = useState<ReportType>(initialType);
  const [range, setRange] = useState<RangeValue>({
    preset: "LAST_30_DAYS",
    from: "",
    to: "",
  });
  const [result, setResult] = useState<ReportResult>(initial);
  const [isPending, startTransition] = useTransition();

  function refresh(nextType: ReportType, nextRange: RangeValue) {
    if (nextRange.preset === "CUSTOM" && (!nextRange.from || !nextRange.to)) {
      return;
    }
    startTransition(async () => {
      const r = await fetchReport({
        type: nextType,
        preset: nextRange.preset,
        from: nextRange.from || null,
        to: nextRange.to || null,
      });
      setResult(r);
    });
  }

  function handleTypeChange(value: string | null) {
    const next = (value as ReportType) ?? "DAILY_SALES";
    setType(next);
    refresh(next, range);
  }

  function handleRangeChange(next: RangeValue) {
    setRange(next);
    refresh(type, next);
  }

  function formatCell(col: ReportColumn, value: string | number): string {
    if (value === "" || value === null || value === undefined) return "";
    if (col.type === "currency") return formatCurrency(Number(value), currency);
    if (col.type === "number") return formatNumber(Number(value));
    return String(value);
  }

  function handleExport() {
    const cols = result.columns.map((c) => ({ key: c.key, header: c.header }));
    const rows = result.totals
      ? [...result.rows, result.totals]
      : result.rows;
    const csv = toCSV(rows as Record<string, unknown>[], cols);
    downloadCSV(`${result.type.toLowerCase()}_report`, csv);
  }

  const isInventory = type === "INVENTORY";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Report Type</Label>
            <Select
              value={type}
              onValueChange={handleTypeChange}
              items={REPORT_TYPES.map((r) => ({ value: r.value, label: r.label }))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isInventory ? (
            <p className="pb-2 text-xs text-muted-foreground">
              Inventory report reflects current stock (no date filter).
            </p>
          ) : (
            <RangeFilter value={range} onChange={handleRangeChange} />
          )}

          <div className="ml-auto pb-0.5">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={result.rows.length === 0 || isPending}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{result.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {result.rows.length === 0 ? (
            <EmptyState
              title="No data"
              description="No records found for this report and period."
            />
          ) : (
            <div
              className={cn(
                "overflow-x-auto rounded-lg border",
                isPending && "opacity-60"
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((c) => (
                      <TableHead
                        key={c.key}
                        className={cn(
                          (c.type === "currency" || c.type === "number") &&
                            "text-right"
                        )}
                      >
                        {c.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            "tabular-nums",
                            (c.type === "currency" || c.type === "number") &&
                              "text-right"
                          )}
                        >
                          {formatCell(c, row[c.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {result.totals ? (
                    <TableRow className="border-t-2 font-semibold">
                      {result.columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            "tabular-nums",
                            (c.type === "currency" || c.type === "number") &&
                              "text-right"
                          )}
                        >
                          {formatCell(c, result.totals![c.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
