"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Receipt, Minus, Plus } from "lucide-react";

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

const CUSTOM = "__custom__";

const defaultValues: z.input<typeof saleSchema> = {
  productId: "",
  name: "",
  unitPrice: 0,
  quantity: 1,
  date: toISODate(new Date()),
};

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof saleSchema>, unknown, SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues,
  });

  const productId = watch("productId");
  const quantity = Number(watch("quantity")) || 0;
  const unitPrice = Number(watch("unitPrice")) || 0;
  const isCustom = !productId;
  const selected = products.find((p) => p.id === productId);

  const productItems = [
    { value: CUSTOM, label: "Custom item (new)" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  const displayPrice = isCustom
    ? unitPrice
    : selected
      ? selected.sellingPrice
      : 0;
  const displayCost = isCustom ? 0 : selected ? selected.costPrice : 0;
  const revenue = displayPrice * quantity;
  const profit = (displayPrice - displayCost) * quantity;

  function selectProduct(value: string) {
    if (value === CUSTOM) {
      setValue("productId", "");
      setValue("name", "");
      setValue("unitPrice", 0);
      return;
    }
    const p = products.find((x) => x.id === value);
    setValue("productId", value);
    setValue("name", "");
    if (p) setValue("unitPrice", p.sellingPrice);
  }

  function adjustQty(delta: number) {
    const next = Math.max(1, quantity + delta);
    setValue("quantity", next);
  }

  async function onSubmit(values: SaleInput) {
    const payload: SaleInput = values.productId
      ? {
          productId: values.productId,
          quantity: values.quantity,
          date: values.date,
        }
      : {
          name: values.name,
          unitPrice: values.unitPrice,
          quantity: values.quantity,
          date: values.date,
        };

    const result = await createSale(payload);
    if (result.success) {
      toast.success(result.message ?? "Sale recorded");
      reset(defaultValues);
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
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Quick Sale</CardTitle>
          <CardDescription>
            Pick a product or type a new item — custom sales are saved to your
            product list automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Item</Label>
              <Controller
                control={control}
                name="productId"
                render={({ field }) => (
                  <Select
                    value={field.value ? field.value : CUSTOM}
                    onValueChange={(v) => selectProduct(v ?? CUSTOM)}
                    items={productItems}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Select or add item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CUSTOM}>Custom item (new)</SelectItem>
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

            {isCustom ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sale-name">Item name</Label>
                  <Input
                    id="sale-name"
                    className="h-11"
                    placeholder="e.g. Kape, Bigas"
                    autoFocus
                    {...register("name")}
                  />
                  <FieldError message={errors.name?.message} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sale-price">Selling price</Label>
                  <Input
                    id="sale-price"
                    className="h-11"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    {...register("unitPrice")}
                  />
                  <FieldError message={errors.unitPrice?.message} />
                </div>
              </div>
            ) : selected ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span>
                  <span className="text-muted-foreground">Price: </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(selected.sellingPrice, currency)}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">In stock: </span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(selected.currentStock)}
                  </span>
                </span>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Decrease quantity"
                    onClick={() => adjustQty(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    id="quantity"
                    className="h-11 text-center text-lg font-medium tabular-nums"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    {...register("quantity")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Increase quantity"
                    onClick={() => adjustQty(1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <FieldError message={errors.quantity?.message} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  className="h-11"
                  type="date"
                  {...register("date")}
                />
                <FieldError message={errors.date?.message} />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-11 w-full sm:w-auto sm:min-w-36"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Record Sale"}
              </Button>
            </div>

            {(selected || isCustom) && (displayPrice > 0 || isCustom) ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(revenue, currency)}
                  </span>
                </div>
                {!isCustom ? (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Profit: </span>
                    <span className="font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                      {formatCurrency(profit, currency)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isCustom ? (
              <p className="text-xs text-muted-foreground">
                New items are added to Products with this price. You can edit
                cost and stock later.
              </p>
            ) : null}
          </form>
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
