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
import { toISODate } from "@/lib/dates";
import {
  utangUpdateSchema,
  type UtangUpdateInput,
} from "@/lib/validations/utang";
import { updateUtang } from "@/lib/actions/utang";

type UtangEditData = {
  id: string;
  customerId: string;
  utangDate: Date;
  notes: string | null;
};

export function UtangEditDialog({
  trigger,
  utang,
}: {
  trigger: React.ReactElement;
  utang: UtangEditData;
}) {
  const [open, setOpen] = React.useState(false);

  const defaults = React.useMemo<UtangUpdateInput>(
    () => ({
      customerId: utang.customerId,
      date: toISODate(utang.utangDate),
      notes: utang.notes ?? "",
    }),
    [utang]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof utangUpdateSchema>, unknown, UtangUpdateInput>({
    resolver: zodResolver(utangUpdateSchema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: UtangUpdateInput) {
    const result = await updateUtang(utang.id, values);
    if (result.success) {
      toast.success(result.message ?? "Utang updated");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Utang</DialogTitle>
          <DialogDescription>
            Update the date or notes. To change items, delete and re-add the
            utang.
          </DialogDescription>
        </DialogHeader>

        <form
          id="utang-edit-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <input type="hidden" {...register("customerId")} />
          <div className="grid gap-2">
            <Label htmlFor="utang-edit-date">Date</Label>
            <Input id="utang-edit-date" type="date" {...register("date")} />
            <FieldError message={errors.date?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="utang-edit-notes">Notes</Label>
            <Textarea
              id="utang-edit-notes"
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
          <Button type="submit" form="utang-edit-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
