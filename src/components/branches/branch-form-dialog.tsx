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
import { branchSchema, type BranchInput } from "@/lib/validations/branch";
import { createBranch, updateBranch } from "@/lib/actions/branches";
import type { BranchRow } from "@/lib/queries/branches-admin";

export function BranchFormDialog({
  trigger,
  branch,
}: {
  trigger: React.ReactElement;
  branch?: BranchRow;
}) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(branch);

  const defaults: BranchInput = React.useMemo(
    () => ({
      name: branch?.name ?? "",
      location: branch?.location ?? "",
    }),
    [branch]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof branchSchema>, unknown, BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: BranchInput) {
    const result = isEdit
      ? await updateBranch(branch!.id, values)
      : await createBranch(values);
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
          <DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle>
          <DialogDescription>
            A branch is an independent store with its own products, sales,
            expenses, and utang.
          </DialogDescription>
        </DialogHeader>

        <form id="branch-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              placeholder="e.g. Main Branch"
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="branch-location">Location (optional)</Label>
            <Input
              id="branch-location"
              placeholder="e.g. Brgy. San Isidro"
              {...register("location")}
            />
            <FieldError message={errors.location?.message} />
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
          <Button type="submit" form="branch-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
