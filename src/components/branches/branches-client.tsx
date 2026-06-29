"use client";

import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Check,
  ArrowRightLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { deleteBranch } from "@/lib/actions/branches";
import type { BranchRow } from "@/lib/queries/branches-admin";

export function BranchesClient({
  branches,
  activeBranchId,
  currency,
}: {
  branches: BranchRow[];
  activeBranchId: string | null;
  currency: string;
}) {
  async function handleDelete(id: string) {
    const result = await deleteBranch(id);
    if (result.success) toast.success(result.message ?? "Deleted");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Each branch is an independent store. Use the switcher in the sidebar
          to operate on one, or choose &quot;All Branches&quot; for consolidated
          reports.
        </p>
        <BranchFormDialog
          trigger={
            <Button className="shrink-0">
              <Plus className="size-4" />
              Add Branch
            </Button>
          }
        />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first branch to start tracking your store."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const isActive = b.id === activeBranchId;
            return (
              <Card key={b.id} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <h3 className="truncate font-semibold">{b.name}</h3>
                    </div>
                    {b.location ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {b.location}
                      </p>
                    ) : null}
                  </div>
                  {isActive ? (
                    <Badge className="shrink-0 gap-1">
                      <Check className="size-3" />
                      Active
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Products</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(b.productCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Sales</dt>
                      <dd className="font-medium tabular-nums">
                        {formatNumber(b.salesCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Inventory Value
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(b.inventoryValue, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Outstanding Utang
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatCurrency(b.outstandingUtang, currency)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center gap-1 border-t pt-3">
                    {!isActive ? (
                      <form action="/api/branch" method="POST" className="flex-1">
                        <input type="hidden" name="branchId" value={b.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <ArrowRightLeft className="size-4" />
                          Switch to
                        </Button>
                      </form>
                    ) : (
                      <span className="flex-1 text-xs text-muted-foreground">
                        Currently active branch
                      </span>
                    )}
                    <BranchFormDialog
                      branch={b}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit branch"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <ConfirmDialog
                      title="Delete branch?"
                      description={`"${b.name}" and ALL of its products, sales, expenses, inventory logs, customers, and utang will be permanently deleted. This cannot be undone.`}
                      confirmLabel="Delete branch"
                      onConfirm={() => handleDelete(b.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete branch"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Created {formatDate(b.createdAt)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
