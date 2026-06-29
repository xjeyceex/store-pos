"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, ShoppingCart, Receipt } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FieldError } from "@/components/shared/field-error";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { formatDate, toISODate } from "@/lib/dates";
import { saleSchema, type SaleInput } from "@/lib/validations/sale";
import { createSale, deleteSale } from "@/lib/actions/sales";
import type { ProductOption } from "@/lib/queries/products";
import type { SaleRow } from "@/lib/queries/sales";

export function SalesClient({
  products,
  sales,
  currency,
}: {
  products: ProductOption[];
  sales: SaleRow[];
  currency: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof saleSchema>, unknown, SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues: { productId: "", quantity: 1, date: toISODate(new Date()) },
  });

  const productId = watch("productId");
  const quantity = Number(watch("quantity")) || 0;
  const selected = products.find((p) => p.id === productId);
  const revenue = selected ? selected.sellingPrice * quantity : 0;
  const profit = selected
    ? (selected.sellingPrice - selected.costPrice) * quantity
    : 0;

  async function onSubmit(values: SaleInput) {
    const result = await createSale(values);
    if (result.success) {
      toast.success(result.message ?? "Sale recorded");
      reset({ productId: "", quantity: 1, date: toISODate(new Date()) });
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteSale(id);
    if (result.success) toast.success(result.message ?? "Deleted");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Sale Entry</CardTitle>
          <CardDescription>
            Record a sale. Stock and profit update automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No products yet"
              description="Add products before recording sales."
            />
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
            >
              <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
                <Label>Product</Label>
                <Controller
                  control={control}
                  name="productId"
                  render={({ field }) => (
                    <Select
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v)}
                      items={products.map((p) => ({ value: p.id, label: p.name }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={p.currentStock <= 0}
                          >
                            {p.name} ({formatNumber(p.currentStock)} left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.productId?.message} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  {...register("quantity")}
                />
                <FieldError message={errors.quantity?.message} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register("date")} />
                <FieldError message={errors.date?.message} />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Record Sale"}
              </Button>

              {selected ? (
                <div className="rounded-lg bg-muted/50 p-3 text-sm sm:col-span-2 lg:col-span-4">
                  <span className="text-muted-foreground">Revenue: </span>
                  <span className="font-medium">
                    {formatCurrency(revenue, currency)}
                  </span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Profit: </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(profit, currency)}
                  </span>
                </div>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Recent Sales</h2>
        {sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales recorded yet"
            description="Recorded sales will appear here."
          />
        ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.saleDate)}
                    </TableCell>
                    <TableCell className="font-medium">{s.productName}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(s.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(s.revenue, currency)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.grossProfit, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ConfirmDialog
                          title="Delete sale?"
                          description="This restores the sold stock and removes the sale."
                          onConfirm={() => handleDelete(s.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete sale"
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
        )}
      </div>
    </div>
  );
}
