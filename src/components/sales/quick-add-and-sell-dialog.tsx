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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { createProduct } from "@/lib/actions/products";
import { createSale } from "@/lib/actions/sales";
import { toISODate } from "@/lib/dates";
import type { BarcodeLookupResult } from "@/lib/barcode-meta";

const quickAddSchema = productSchema.pick({
  name: true,
  barcode: true,
  categoryName: true,
  costPrice: true,
  sellingPrice: true,
});

type QuickAddInput = z.infer<typeof quickAddSchema>;

export function QuickAddAndSellDialog({
  open,
  onOpenChange,
  lookup,
  currency,
  defaultMinStock = 5,
  onSold,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookup: BarcodeLookupResult | null;
  currency: string;
  defaultMinStock?: number;
  onSold?: () => void;
}) {
  void currency;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof quickAddSchema>, unknown, QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      name: "",
      barcode: "",
      categoryName: "",
      costPrice: 0,
      sellingPrice: 0,
    },
  });

  React.useEffect(() => {
    if (open && lookup) {
      reset({
        name: lookup.name ?? "",
        barcode: lookup.barcode,
        categoryName: lookup.categoryName ?? "",
        costPrice: 0,
        sellingPrice: 0,
      });
    }
  }, [open, lookup, reset]);

  async function onSubmit(values: QuickAddInput) {
    const productInput: ProductInput = {
      ...values,
      currentStock: 1,
      minStockLevel: defaultMinStock,
      notes: "",
    };

    const created = await createProduct(productInput);
    if (!created.success) {
      toast.error(created.error);
      return;
    }

    const productId = created.data?.id;
    if (!productId) {
      toast.error("Product was created but could not record the sale.");
      return;
    }

    const sale = await createSale({
      productId,
      quantity: 1,
      date: toISODate(new Date()),
    });

    if (!sale.success) {
      toast.error(sale.error);
      return;
    }

    toast.success(sale.message ?? "Product added and sale recorded.");
    onOpenChange(false);
    onSold?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add product &amp; sell</DialogTitle>
          <DialogDescription>
            This barcode is not in your catalog yet. Set a price, then we&apos;ll
            add it and record one sale.
          </DialogDescription>
        </DialogHeader>

        <form
          id="quick-add-sell-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="quick-name">Product name</Label>
            <Input id="quick-name" {...register("name")} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quick-barcode">Barcode</Label>
            <Input id="quick-barcode" readOnly {...register("barcode")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quick-category">Category</Label>
            <Input id="quick-category" {...register("categoryName")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="quick-cost">Cost price</Label>
              <Input
                id="quick-cost"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("costPrice")}
              />
              <FieldError message={errors.costPrice?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-sell">Selling price</Label>
              <Input
                id="quick-sell"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                autoFocus
                {...register("sellingPrice")}
              />
              <FieldError message={errors.sellingPrice?.message} />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="quick-add-sell-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add & record sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
