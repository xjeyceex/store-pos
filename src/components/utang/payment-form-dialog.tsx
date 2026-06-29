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
import { FieldError } from "@/components/shared/field-error";
import { formatCurrency } from "@/lib/currency";
import { toISODate } from "@/lib/dates";
import {
  utangPaymentSchema,
  type UtangPaymentInput,
} from "@/lib/validations/utang";
import { recordPayment } from "@/lib/actions/utang";

export function PaymentFormDialog({
  trigger,
  utangId,
  remaining,
  currency,
}: {
  trigger: React.ReactElement;
  utangId: string;
  remaining: number;
  currency: string;
}) {
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof utangPaymentSchema>, unknown, UtangPaymentInput>({
    resolver: zodResolver(utangPaymentSchema),
    defaultValues: {
      utangId,
      amount: remaining > 0 ? remaining : 0,
      date: toISODate(new Date()),
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        utangId,
        amount: remaining > 0 ? remaining : 0,
        date: toISODate(new Date()),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: UtangPaymentInput) {
    const result = await recordPayment(values);
    if (result.success) {
      toast.success(result.message ?? "Payment recorded");
      setOpen(false);
      reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Remaining balance: {formatCurrency(remaining, currency)}
          </DialogDescription>
        </DialogHeader>

        <form
          id="payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <input type="hidden" {...register("utangId")} />
          <div className="grid gap-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              {...register("amount")}
            />
            <FieldError message={errors.amount?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-date">Date</Label>
            <Input id="payment-date" type="date" {...register("date")} />
            <FieldError message={errors.date?.message} />
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
          <Button type="submit" form="payment-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
