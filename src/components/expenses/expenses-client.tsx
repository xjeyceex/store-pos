"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import {
  DesktopTable,
  MobileRecordCard,
  MobileRecordList,
} from "@/components/shared/mobile-record-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { useServerPaginationWithFilters } from "@/components/shared/use-server-pagination";
import { fetchExpensesPage } from "@/lib/actions/lists";
import type { PaginatedResult } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/dates";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/constants";
import { deleteExpense } from "@/lib/actions/expenses";
import type { ExpenseRow } from "@/lib/queries/expenses";

export function ExpensesClient({
  initial,
  totals,
  currency,
}: {
  initial: PaginatedResult<ExpenseRow>;
  totals: { today: number; week: number; month: number; year: number };
  currency: string;
}) {
  const [category, setCategory] = React.useState("ALL");
  const {
    items: expenses,
    page,
    pageSize,
    totalPages,
    totalItems,
    query,
    setQuery,
    setPage,
    reloadFirstPage,
    isPending,
  } = useServerPaginationWithFilters(initial, fetchExpensesPage, { category });

  async function handleDelete(id: string) {
    const result = await deleteExpense(id);
    if (result.success) {
      toast.success(result.message ?? "Deleted");
      reloadFirstPage();
    } else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={formatCurrency(totals.today, currency)} />
        <StatCard label="This Week" value={formatCurrency(totals.week, currency)} />
        <StatCard label="This Month" value={formatCurrency(totals.month, currency)} />
        <StatCard label="This Year" value={formatCurrency(totals.year, currency)} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs">
              <SearchInput
                placeholder="Search expenses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "ALL")}
              items={[
                { value: "ALL", label: "All categories" },
                ...EXPENSE_CATEGORIES.map((c) => ({
                  value: c.value,
                  label: c.label,
                })),
              ]}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ExpenseFormDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="size-4" />
                Add Expense
              </Button>
            }
          />
        </div>

        {totalItems === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description={
              query || category !== "ALL"
                ? "Try a different search or filter."
                : "Record your store's expenses to track net profit."
            }
          />
        ) : (
          <div className={isPending ? "opacity-60" : undefined}>
          <>
            <MobileRecordList>
              {expenses.map((e) => (
                <MobileRecordCard
                  key={e.id}
                  title={e.description}
                  subtitle={formatDateTime(e.expenseDate)}
                  badge={
                    <Badge variant="secondary">
                      {expenseCategoryLabel(e.category)}
                    </Badge>
                  }
                  fields={[
                    {
                      label: "Amount",
                      value: formatCurrency(e.amount, currency),
                      className: "col-span-2",
                    },
                  ]}
                  actions={
                    <>
                      <ExpenseFormDialog
                        expense={e}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10"
                            aria-label="Edit expense"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete expense?"
                        description={`"${e.description}" will be removed.`}
                        onConfirm={() => handleDelete(e.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10"
                            aria-label="Delete expense"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    </>
                  }
                />
              ))}
            </MobileRecordList>

            <DesktopTable>
              <Card className="p-0">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(e.expenseDate)}
                    </TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {expenseCategoryLabel(e.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(e.amount, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ExpenseFormDialog
                          expense={e}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit expense"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          title="Delete expense?"
                          description={`"${e.description}" will be removed.`}
                          onConfirm={() => handleDelete(e.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete expense"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      </div>
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
    </div>
  );
}
