"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, UserPlus, HandCoins, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { CustomerFormDialog } from "@/components/utang/customer-form-dialog";
import { UtangFormDialog } from "@/components/utang/utang-form-dialog";
import {
  DesktopTable,
  MobileRecordCard,
  MobileRecordList,
} from "@/components/shared/mobile-record-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SearchInput } from "@/components/shared/search-input";
import { useServerPagination } from "@/components/shared/use-server-pagination";
import { fetchCustomersPage } from "@/lib/actions/lists";
import type { PaginatedResult } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import type { CustomerRow } from "@/lib/queries/utang";
import type { ProductOption } from "@/lib/queries/products";

export function UtangClient({
  initial,
  customerOptions,
  products,
  totalOutstanding,
  currency,
}: {
  initial: PaginatedResult<CustomerRow>;
  customerOptions: { id: string; name: string }[];
  products: ProductOption[];
  totalOutstanding: number;
  currency: string;
}) {
  const {
    items: customers,
    page,
    pageSize,
    totalPages,
    totalItems,
    query,
    setQuery,
    setPage,
    reloadFirstPage,
    isPending,
  } = useServerPagination(initial, fetchCustomersPage);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Outstanding Utang"
          value={formatCurrency(totalOutstanding, currency)}
          tone={totalOutstanding > 0 ? "warning" : "default"}
          icon={HandCoins}
          className="sm:col-span-1"
        />
        <StatCard label="Customers" value={String(totalItems)} />
        <StatCard
          label="With Balance"
          value={String(customers.filter((c) => c.balance > 0).length)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs">
          <SearchInput
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CustomerFormDialog
            trigger={
              <Button variant="outline" className="w-full sm:w-auto">
                <UserPlus className="size-4" />
                Add Customer
              </Button>
            }
          />
          <UtangFormDialog
            customers={customerOptions}
            products={products}
            currency={currency}
            trigger={
              <Button
                className="w-full sm:w-auto"
                disabled={customerOptions.length === 0}
              >
                <Plus className="size-4" />
                Add Utang
              </Button>
            }
          />
        </div>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No customers found"
          description={
            query
              ? "Try a different search."
              : "Add a customer to start tracking utang."
          }
        />
      ) : (
        <div className={isPending ? "opacity-60" : undefined}>
        <>
          <MobileRecordList>
            {customers.map((c) => (
              <MobileRecordCard
                key={c.id}
                title={
                  <Link href={`/utang/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                }
                subtitle={c.phone ?? "No phone"}
                fields={[
                  {
                    label: "Balance",
                    value: (
                      <span
                        className={
                          c.balance > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {formatCurrency(c.balance, currency)}
                      </span>
                    ),
                  },
                  { label: "Open", value: c.openCount },
                  {
                    label: "Total Utang",
                    value: formatCurrency(c.totalUtang, currency),
                  },
                  {
                    label: "Paid",
                    value: formatCurrency(c.totalPaid, currency),
                  },
                ]}
                actions={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    aria-label="View customer"
                    nativeButton={false}
                    render={<Link href={`/utang/${c.id}`} />}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTable>
            <Card className="p-0">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Total Utang</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/utang/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(c.totalUtang, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(c.totalPaid, currency)}
                  </TableCell>
                  <TableCell
                    className={
                      c.balance > 0
                        ? "text-right font-medium text-amber-600 dark:text-amber-400"
                        : "text-right font-medium text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {formatCurrency(c.balance, currency)}
                  </TableCell>
                  <TableCell className="text-right">{c.openCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="View customer"
                      nativeButton={false}
                      render={<Link href={`/utang/${c.id}`} />}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
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
