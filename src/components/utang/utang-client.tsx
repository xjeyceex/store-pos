"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, UserPlus, HandCoins, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatCurrency } from "@/lib/currency";
import type { CustomerRow } from "@/lib/queries/utang";
import type { ProductOption } from "@/lib/queries/products";

export function UtangClient({
  customers,
  customerOptions,
  products,
  totalOutstanding,
  currency,
}: {
  customers: CustomerRow[];
  customerOptions: { id: string; name: string }[];
  products: ProductOption[];
  totalOutstanding: number;
  currency: string;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

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
        <StatCard label="Customers" value={String(customers.length)} />
        <StatCard
          label="With Balance"
          value={String(customers.filter((c) => c.balance > 0).length)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <CustomerFormDialog
            trigger={
              <Button variant="outline">
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
              <Button disabled={customerOptions.length === 0}>
                <Plus className="size-4" />
                Add Utang
              </Button>
            }
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No customers found"
          description={
            customers.length === 0
              ? "Add a customer to start tracking utang."
              : "Try a different search."
          }
        />
      ) : (
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
              {filtered.map((c) => (
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
      )}
    </div>
  );
}
