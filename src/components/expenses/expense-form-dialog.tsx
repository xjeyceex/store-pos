"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/shared/field-error";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expense";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import type { ExpenseRow } from "@/lib/queries/expenses";

export function ExpenseFormDialog({
  trigger,
  expense,
}: {
  trigger: React.ReactElement;
  expense?: ExpenseRow;
}) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(expense);

  const defaults: ExpenseInput = React.useMemo(
    () => ({
      description: expense?.description ?? "",
      category: (expense?.category as ExpenseInput["category"]) ?? "MISCELLANEOUS",
      amount: expense?.amount ?? 0,
      date: expense ? toISODate(expense.expenseDate) : toISODate(new Date()),
    }),
    [expense]
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof expenseSchema>, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: ExpenseInput) {
    const result = isEdit
      ? await updateExpense(expense!.id, values)
      : await createExpense(values);
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
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            Track your store&apos;s operating expenses.
          </DialogDescription>
        </DialogHeader>

        <form
          id="expense-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Meralco bill"
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  items={EXPENSE_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.category?.message} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...register("amount")}
              />
              <FieldError message={errors.amount?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input id="expense-date" type="date" {...register("date")} />
              <FieldError message={errors.date?.message} />
            </div>
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
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
