"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/shared/field-error";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { toISODate } from "@/lib/dates";
import { utangSchema, type UtangInput } from "@/lib/validations/utang";
import { createUtang } from "@/lib/actions/utang";
import type { ProductOption } from "@/lib/queries/products";

const CUSTOM = "__custom__";

export function UtangFormDialog({
  trigger,
  customers,
  presetCustomerId,
  products,
  currency,
}: {
  trigger: React.ReactElement;
  customers?: { id: string; name: string }[];
  presetCustomerId?: string;
  products: ProductOption[];
  currency: string;
}) {
  const [open, setOpen] = React.useState(false);
  const lockCustomer = Boolean(presetCustomerId);

  const defaults = React.useMemo<z.input<typeof utangSchema>>(
    () => ({
      customerId: presetCustomerId ?? "",
      date: toISODate(new Date()),
      notes: "",
      items: [{ productId: "", name: "", quantity: 1, unitPrice: 0 }],
    }),
    [presetCustomerId]
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof utangSchema>, unknown, UtangInput>({
    resolver: zodResolver(utangSchema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const items = watch("items") ?? [];
  const total = items.reduce(
    (s, it) => s + (Number(it?.quantity) || 0) * (Number(it?.unitPrice) || 0),
    0
  );

  const customerItems = (customers ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const productItems = [
    { value: CUSTOM, label: "Custom item" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  function selectProduct(index: number, value: string) {
    if (value === CUSTOM) {
      setValue(`items.${index}.productId`, "");
      setValue(`items.${index}.name`, "");
      setValue(`items.${index}.unitPrice`, 0);
      return;
    }
    const p = products.find((x) => x.id === value);
    setValue(`items.${index}.productId`, value);
    if (p) {
      setValue(`items.${index}.name`, p.name);
      setValue(`items.${index}.unitPrice`, p.sellingPrice);
    }
  }

  async function onSubmit(values: UtangInput) {
    const result = await createUtang(values);
    if (result.success) {
      toast.success(result.message ?? "Utang added");
      setOpen(false);
      reset(defaults);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Utang</DialogTitle>
          <DialogDescription>
            List the items taken on credit. Stock for catalog items will be
            reduced automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          id="utang-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1"
        >
          {!lockCustomer ? (
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v)}
                    items={customerItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.customerId?.message} />
            </div>
          ) : (
            <input type="hidden" {...register("customerId")} />
          )}

          <div className="grid gap-2">
            <Label>Items</Label>
            <div className="space-y-3">
              {fields.map((f, index) => {
                const row = items[index];
                const productId = row?.productId ?? "";
                const isCustom = !productId;
                const selected = products.find((p) => p.id === productId);
                const qty = Number(row?.quantity) || 0;
                const lineTotal =
                  qty * (Number(row?.unitPrice) || 0);
                const overStock =
                  selected != null && qty > selected.currentStock;

                return (
                  <div
                    key={f.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 gap-2">
                        <Controller
                          control={control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <Select
                              value={field.value ? field.value : CUSTOM}
                              onValueChange={(v) =>
                                selectProduct(index, v ?? CUSTOM)
                              }
                              items={productItems}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={CUSTOM}>
                                  Custom item
                                </SelectItem>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({formatNumber(p.currentStock)} in
                                    stock)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {isCustom ? (
                          <Input
                            placeholder="Item name (e.g. Kape)"
                            {...register(`items.${index}.name`)}
                          />
                        ) : (
                          <input
                            type="hidden"
                            {...register(`items.${index}.name`)}
                          />
                        )}
                        <FieldError
                          message={errors.items?.[index]?.name?.message}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">
                          Qty
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          {...register(`items.${index}.quantity`)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">
                          Unit Price
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          {...register(`items.${index}.unitPrice`)}
                        />
                      </div>
                      <div className="pb-2 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(lineTotal, currency)}
                      </div>
                    </div>
                    {overStock ? (
                      <p className="text-xs text-destructive">
                        Only {formatNumber(selected!.currentStock)} in stock.
                      </p>
                    ) : null}
                    <FieldError
                      message={
                        errors.items?.[index]?.quantity?.message ??
                        errors.items?.[index]?.unitPrice?.message
                      }
                    />
                  </div>
                );
              })}
            </div>
            <FieldError message={errors.items?.message} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                append({ productId: "", name: "", quantity: 1, unitPrice: 0 })
              }
            >
              <Plus className="size-4" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="utang-date">Date</Label>
              <Input id="utang-date" type="date" {...register("date")} />
            </div>
            <div className="grid items-end">
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="utang-notes">Notes</Label>
            <Textarea
              id="utang-notes"
              rows={2}
              placeholder="Optional"
              {...register("notes")}
            />
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
          <Button type="submit" form="utang-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Utang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
