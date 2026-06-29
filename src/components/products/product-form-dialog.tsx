"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shared/field-error";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/currency";
import type { ProductRow } from "@/lib/queries/products";

export function ProductFormDialog({
  trigger,
  product,
  categories,
  currency,
  defaultMinStock = 5,
}: {
  trigger: React.ReactElement;
  product?: ProductRow;
  categories: string[];
  currency: string;
  defaultMinStock?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(product);

  const form = useForm<z.input<typeof productSchema>, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      categoryName: product?.categoryName ?? "",
      costPrice: product?.costPrice ?? 0,
      sellingPrice: product?.sellingPrice ?? 0,
      currentStock: product?.currentStock ?? 0,
      minStockLevel: product?.minStockLevel ?? defaultMinStock,
      notes: product?.notes ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? "",
        categoryName: product?.categoryName ?? "",
        costPrice: product?.costPrice ?? 0,
        sellingPrice: product?.sellingPrice ?? 0,
        currentStock: product?.currentStock ?? 0,
        minStockLevel: product?.minStockLevel ?? defaultMinStock,
        notes: product?.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cost = Number(watch("costPrice")) || 0;
  const selling = Number(watch("sellingPrice")) || 0;
  const profit = selling - cost;

  async function onSubmit(values: ProductInput) {
    const result = isEdit
      ? await updateProduct(product!.id, values)
      : await createProduct(values);

    if (result.success) {
      toast.success(result.message ?? "Saved");
      setOpen(false);
      reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product details. Changing stock here logs an adjustment."
              : "Add a new product to your store."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" placeholder="e.g. Lucky Me Pancit Canton" {...register("name")} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoryName">Category</Label>
            <Input
              id="categoryName"
              list="product-categories"
              placeholder="e.g. Noodles"
              {...register("categoryName")}
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <FieldError message={errors.categoryName?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("costPrice")}
              />
              <FieldError message={errors.costPrice?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("sellingPrice")}
              />
              <FieldError message={errors.sellingPrice?.message} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Profit per item:{" "}
            <span
              className={
                profit >= 0
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : "font-medium text-destructive"
              }
            >
              {formatCurrency(profit, currency)}
            </span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                inputMode="numeric"
                {...register("currentStock")}
              />
              <FieldError message={errors.currentStock?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minStockLevel">Min Stock Level</Label>
              <Input
                id="minStockLevel"
                type="number"
                min="0"
                inputMode="numeric"
                {...register("minStockLevel")}
              />
              <FieldError message={errors.minStockLevel?.message} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} placeholder="Optional" {...register("notes")} />
            <FieldError message={errors.notes?.message} />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
