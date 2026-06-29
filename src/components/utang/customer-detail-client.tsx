"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Phone, HandCoins } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UtangStatusBadge } from "@/components/shared/status-badges";
import { CustomerFormDialog } from "@/components/utang/customer-form-dialog";
import { UtangFormDialog } from "@/components/utang/utang-form-dialog";
import { UtangEditDialog } from "@/components/utang/utang-edit-dialog";
import { PaymentFormDialog } from "@/components/utang/payment-form-dialog";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { deleteUtang, deletePayment } from "@/lib/actions/utang";
import { deleteCustomer as deleteCustomerAction } from "@/lib/actions/customers";
import type { CustomerDetail } from "@/lib/queries/utang";
import type { ProductOption } from "@/lib/queries/products";

export function CustomerDetailClient({
  customer,
  products,
  currency,
}: {
  customer: CustomerDetail;
  products: ProductOption[];
  currency: string;
}) {
  const router = useRouter();

  async function handleDeleteCustomer() {
    const result = await deleteCustomerAction(customer.id);
    if (result.success) {
      toast.success(result.message ?? "Customer deleted");
      router.push("/utang");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDeleteUtang(id: string) {
    const result = await deleteUtang(id);
    if (result.success) toast.success(result.message ?? "Deleted");
    else toast.error(result.error);
  }

  async function handleDeletePayment(id: string) {
    const result = await deletePayment(id);
    if (result.success) toast.success(result.message ?? "Deleted");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          {customer.phone ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {customer.phone}
            </p>
          ) : null}
          {customer.notes ? (
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomerFormDialog
            customer={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              notes: customer.notes,
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          />
          <UtangFormDialog
            presetCustomerId={customer.id}
            products={products}
            currency={currency}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Add Utang
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete customer?"
            description="This removes the customer and all their utang records."
            onConfirm={handleDeleteCustomer}
            trigger={
              <Button variant="outline" size="sm">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Utang"
          value={formatCurrency(customer.totalUtang, currency)}
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(customer.totalPaid, currency)}
          tone="positive"
        />
        <StatCard
          label="Balance"
          value={formatCurrency(customer.balance, currency)}
          tone={customer.balance > 0 ? "warning" : "positive"}
        />
      </div>

      {customer.utangs.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No utang yet"
          description="Add an utang record for this customer."
        />
      ) : (
        <div className="space-y-4">
          {customer.utangs.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CardTitle>{formatCurrency(u.amount, currency)}</CardTitle>
                    <UtangStatusBadge status={u.status} />
                  </div>
                  <div className="flex items-center gap-1">
                    {u.remaining > 0 ? (
                      <PaymentFormDialog
                        utangId={u.id}
                        remaining={u.remaining}
                        currency={currency}
                        trigger={
                          <Button variant="outline" size="sm">
                            <HandCoins className="size-4" />
                            Pay
                          </Button>
                        }
                      />
                    ) : null}
                    <UtangEditDialog
                      utang={{
                        id: u.id,
                        customerId: customer.id,
                        utangDate: u.utangDate,
                        notes: u.notes,
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit utang"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <ConfirmDialog
                      title="Delete utang?"
                      description="This removes the utang and its payments."
                      onConfirm={() => handleDeleteUtang(u.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete utang"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>Date: {formatDate(u.utangDate)}</span>
                  <span>
                    Paid:{" "}
                    <span className="text-foreground">
                      {formatCurrency(u.paid, currency)}
                    </span>
                  </span>
                  <span>
                    Remaining:{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(u.remaining, currency)}
                    </span>
                  </span>
                </div>
                {u.items.length > 0 ? (
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                    {u.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground">
                            {formatNumber(it.quantity)}×{" "}
                          </span>
                          {it.name}
                          {it.productId ? null : (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (custom)
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCurrency(it.unitPrice, currency)} ={" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(it.lineTotal, currency)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {u.notes ? (
                  <p className="text-sm text-muted-foreground">{u.notes}</p>
                ) : null}

                {u.payments.length > 0 ? (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Payment History
                      </p>
                      {u.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(p.paymentDate)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.amount, currency)}
                            </span>
                            <ConfirmDialog
                              title="Delete payment?"
                              description="This payment will be removed."
                              onConfirm={() => handleDeletePayment(p.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label="Delete payment"
                                >
                                  <Trash2 className="size-3.5 text-destructive" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
