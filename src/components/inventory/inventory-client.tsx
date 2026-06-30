"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Warehouse } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FieldError } from "@/components/shared/field-error";
import { StockStatusBadge } from "@/components/shared/status-badges";
import { formatNumber } from "@/lib/currency";
import { todayISODate } from "@/lib/dates";
import {
  reasonsForDirection,
  type MovementDirection,
  INVENTORY_ACTIONS,
} from "@/lib/constants";
import { getStockStatus } from "@/lib/stock";
import {
  inventoryMovementSchema,
  type InventoryMovementInput,
} from "@/lib/validations/inventory";
import { createInventoryMovement } from "@/lib/actions/inventory";
import type { ProductOption } from "@/lib/queries/products";

type ProductWithMin = ProductOption & { minStockLevel: number };

function quantityLabel(direction: MovementDirection): string {
  if (direction === "in") return "Quantity to add";
  if (direction === "out") return "Quantity to remove";
  return "New stock level";
}

function MovementForm({
  direction,
  products,
}: {
  direction: MovementDirection;
  products: ProductOption[];
}) {
  const reasons = reasonsForDirection(direction);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof inventoryMovementSchema>,
    unknown,
    InventoryMovementInput
  >({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: {
      productId: "",
      quantity: direction === "set" ? 0 : 1,
      reason: reasons[0].value,
      note: "",
      date: todayISODate(),
    },
  });

  async function onSubmit(values: InventoryMovementInput) {
    const result = await createInventoryMovement(values);
    if (result.success) {
      toast.success(result.message ?? "Inventory updated");
      reset({
        productId: "",
        quantity: direction === "set" ? 0 : 1,
        reason: reasons[0].value,
        note: "",
        date: todayISODate(),
      });
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="grid gap-2">
        <Label>Product</Label>
        <Controller
          control={control}
          name="productId"
          render={({ field }) => (
            <Select
              value={field.value || null}
              onValueChange={(v) => field.onChange(v)}
              items={products.map((p) => ({ value: p.id, label: p.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({formatNumber(p.currentStock)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.productId?.message} />
      </div>

      <div className="grid gap-2">
        <Label>Reason</Label>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v)}
              items={reasons.map((r) => ({ value: r.value, label: r.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.reason?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`qty-${direction}`}>{quantityLabel(direction)}</Label>
        <Input
          id={`qty-${direction}`}
          type="number"
          min="0"
          inputMode="numeric"
          {...register("quantity")}
        />
        <FieldError message={errors.quantity?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`date-${direction}`}>Date</Label>
        <Input id={`date-${direction}`} type="date" {...register("date")} />
        <FieldError message={errors.date?.message} />
      </div>

      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`note-${direction}`}>Note</Label>
        <Textarea
          id={`note-${direction}`}
          rows={2}
          placeholder="Optional"
          {...register("note")}
        />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Apply"}
        </Button>
      </div>
    </form>
  );
}

export function InventoryClient({
  products,
  currency,
}: {
  products: ProductWithMin[];
  currency: string;
}) {
  void currency;
  const [tab, setTab] = React.useState<MovementDirection>("in");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Update Inventory</CardTitle>
          <CardDescription>
            Stock in new deliveries, stock out damage or personal use, or set an
            exact count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <EmptyState
              icon={Warehouse}
              title="No products yet"
              description="Add products before managing inventory."
            />
          ) : (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as MovementDirection)}
            >
              <TabsList>
                {INVENTORY_ACTIONS.map((a) => (
                  <TabsTrigger key={a.value} value={a.value}>
                    {a.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {INVENTORY_ACTIONS.map((a) => (
                <TabsContent key={a.value} value={a.value} className="pt-4">
                  <MovementForm
                    direction={a.value as MovementDirection}
                    products={products}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {products.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Current Stock</h2>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(p.currentStock)}
                    </TableCell>
                    <TableCell>
                      <StockStatusBadge
                        status={getStockStatus(p.currentStock, p.minStockLevel)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
