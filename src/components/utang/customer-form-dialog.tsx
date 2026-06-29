"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

export function CustomerFormDialog({
  trigger,
  customer,
}: {
  trigger: React.ReactElement;
  customer?: { id: string; name: string; phone: string | null; notes: string | null };
}) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      notes: customer?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        notes: customer?.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: CustomerInput) {
    const result = isEdit
      ? await updateCustomer(customer!.id, values)
      : await createCustomer(values);
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
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            Customers who buy on credit (utang).
          </DialogDescription>
        </DialogHeader>

        <form
          id="customer-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" placeholder="e.g. Aling Nena" {...register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-phone">Phone Number</Label>
            <Input
              id="customer-phone"
              placeholder="Optional"
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-notes">Notes</Label>
            <Textarea
              id="customer-notes"
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
          <Button type="submit" form="customer-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
