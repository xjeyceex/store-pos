"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Receipt, Minus, Plus, ShoppingCart } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DesktopTable,
  MobileRecordCard,
  MobileRecordList,
} from "@/components/shared/mobile-record-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { useServerPagination } from "@/components/shared/use-server-pagination";
import { fetchSalesPage } from "@/lib/actions/lists";
import type { PaginatedResult } from "@/lib/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FieldError } from "@/components/shared/field-error";
import {
  BarcodeScannerDialog,
  ScanBarcodeButton,
} from "@/components/barcode/barcode-scanner-dialog";
import { QuickAddAndSellDialog } from "@/components/sales/quick-add-and-sell-dialog";
import { CashPaymentSection } from "@/components/sales/cash-payment-section";
import { SaleCartPanel } from "@/components/sales/sale-cart-panel";
import {
  CUSTOM_ITEM,
  SearchableItemSelect,
} from "@/components/sales/searchable-item-select";
import { formatCurrency, formatNumber, roundMoney } from "@/lib/currency";
import { formatDate, toISODate } from "@/lib/dates";
import { fetchBarcodeLookup } from "@/lib/barcode-client";
import { saleSchema, type SaleInput } from "@/lib/validations/sale";
import { createSales, deleteSale } from "@/lib/actions/sales";
import { recordSaleAsUtang } from "@/lib/actions/utang";
import {
  cartTotal,
  mergeCartLine,
  toCartPayload,
  type CartLine,
} from "@/lib/sales-cart";
import type { BarcodeLookupResult } from "@/lib/barcode-meta";
import type { ProductOption } from "@/lib/queries/products";
import type { SaleRow } from "@/lib/queries/sales";

const CUSTOM = CUSTOM_ITEM;

const defaultValues: z.input<typeof saleSchema> = {
  productId: "",
  name: "",
  unitPrice: 0,
  quantity: 1,
  date: toISODate(new Date()),
};

export function SalesClient({
  products,
  initialSales,
  customers,
  currency,
  defaultMinStock = 5,
}: {
  products: ProductOption[];
  initialSales: PaginatedResult<SaleRow>;
  customers: { id: string; name: string }[];
  currency: string;
  defaultMinStock?: number;
}) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [continuousScan, setContinuousScan] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [quickAddLookup, setQuickAddLookup] =
    React.useState<BarcodeLookupResult | null>(null);
  const [scanBusy, setScanBusy] = React.useState(false);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cashReceived, setCashReceived] = React.useState("");
  const [utangCustomerId, setUtangCustomerId] = React.useState("");
  const [utangCustomerName, setUtangCustomerName] = React.useState("");
  const [utangPending, setUtangPending] = React.useState(false);
  const [checkoutPending, setCheckoutPending] = React.useState(false);

  const {
    register,
    control,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<z.input<typeof saleSchema>, unknown, SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues,
  });

  const productId = watch("productId");
  const quantity = Number(watch("quantity")) || 0;
  const unitPrice = Number(watch("unitPrice")) || 0;
  const saleDate = watch("date");
  const isCustom = !productId;
  const selected = products.find((p) => p.id === productId);

  const cartGrandTotal = cartTotal(cart);
  const receivedAmount = roundMoney(Number.parseFloat(cashReceived) || 0);
  const hasCashInput = cashReceived.trim() !== "";
  const cashInsufficient =
    cart.length > 0 && hasCashInput && receivedAmount < cartGrandTotal;

  const {
    items: sales,
    page: salesPage,
    pageSize: salesPageSize,
    totalPages: salesTotalPages,
    totalItems: salesTotalItems,
    setPage: setSalesPage,
    isPending: salesPending,
  } = useServerPagination(initialSales, fetchSalesPage);

  function clearPayment() {
    setCashReceived("");
    setUtangCustomerId("");
    setUtangCustomerName("");
  }

  function clearSale() {
    setCart([]);
    clearPayment();
    reset(defaultValues);
  }

  function handleUtangCustomerChange(customerId: string, customerName: string) {
    setUtangCustomerId(customerId);
    setUtangCustomerName(customerName);
  }

  function selectProduct(value: string) {
    if (value === CUSTOM) {
      setValue("productId", "");
      setValue("name", "");
      setValue("unitPrice", 0);
      return;
    }
    const p = products.find((x) => x.id === value);
    setValue("productId", value);
    setValue("name", "");
    if (p) setValue("unitPrice", p.sellingPrice);
  }

  function adjustQty(delta: number) {
    const next = Math.max(1, quantity + delta);
    setValue("quantity", next);
  }

  function addProductToCart(
    line: Omit<CartLine, "key">,
    opts?: { silent?: boolean }
  ) {
    if (line.productId) {
      const p = products.find((x) => x.id === line.productId);
      const inCart = cart
        .filter((c) => c.productId === line.productId)
        .reduce((s, c) => s + c.quantity, 0);
      const stock = p?.currentStock ?? 0;
      if (inCart + line.quantity > stock) {
        toast.error(
          stock <= 0
            ? `${line.name} is out of stock.`
            : `Only ${formatNumber(stock - inCart)} of ${line.name} left in stock.`
        );
        return false;
      }
    }

    setCart((prev) => mergeCartLine(prev, line));
    if (!opts?.silent) toast.success(`${line.name} added`);
    return true;
  }

  async function handleAddToCart() {
    const valid = await trigger();
    if (!valid) return;

    const values = watch();
    const qty = Number(values.quantity) || 1;

    if (values.productId) {
      const p = products.find((x) => x.id === values.productId);
      if (!p) return;
      const added = addProductToCart({
        productId: p.id,
        name: p.name,
        unitPrice: p.sellingPrice,
        quantity: qty,
      });
      if (!added) return;
    } else {
      const name = values.name?.trim();
      const price = roundMoney(Number(values.unitPrice) || 0);
      if (!name || price <= 0) return;
      addProductToCart({
        name,
        unitPrice: price,
        quantity: qty,
      });
    }

    reset({
      ...defaultValues,
      date: values.date ?? defaultValues.date,
    });
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  function adjustCartQty(key: string, delta: number) {
    setCart((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) return prev;

      const nextQty = line.quantity + delta;
      if (nextQty < 1) return prev.filter((l) => l.key !== key);

      if (line.productId) {
        const p = products.find((x) => x.id === line.productId);
        const inCart = prev
          .filter((c) => c.productId === line.productId && c.key !== key)
          .reduce((s, c) => s + c.quantity, 0);
        const stock = p?.currentStock ?? 0;
        if (inCart + nextQty > stock) {
          toast.error(`Only ${formatNumber(stock - inCart)} of ${line.name} left.`);
          return prev;
        }
      }

      return prev.map((l) =>
        l.key === key ? { ...l, quantity: nextQty } : l
      );
    });
  }

  async function handleBarcodeScan(code: string) {
    if (scanBusy) return;
    setScanBusy(true);
    try {
      const result = await fetchBarcodeLookup(code);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (result.source === "local" && result.productId) {
        const p = products.find((x) => x.id === result.productId);
        const price = p?.sellingPrice ?? result.sellingPrice ?? 0;
        addProductToCart(
          {
            productId: result.productId,
            name: result.name ?? p?.name ?? "Product",
            unitPrice: price,
            quantity: 1,
          },
          { silent: true }
        );
        toast.success(`${result.name ?? p?.name} added to sale`);
        return;
      }

      if (result.source === "openfoodfacts") {
        setQuickAddLookup(result);
        setQuickAddOpen(true);
        return;
      }

      toast.error("Barcode not recognized. Add the product manually first.");
    } finally {
      setScanBusy(false);
    }
  }

  async function handleRecordUtang() {
    if (!cashInsufficient || cart.length === 0) return;

    if (!utangCustomerId && !utangCustomerName.trim()) {
      toast.error("Select or enter a customer for utang.");
      return;
    }

    setUtangPending(true);
    try {
      const result = await recordSaleAsUtang({
        items: toCartPayload(cart),
        date: saleDate ?? "",
        customerId: utangCustomerId,
        customerName: utangCustomerName.trim(),
        cashReceived: receivedAmount,
      });

      if (result.success && result.data?.customerId) {
        toast.success(result.message ?? "Utang recorded");
        clearSale();
        router.push(`/utang/${result.data.customerId}`);
      } else if (!result.success) {
        toast.error(result.error);
      }
    } finally {
      setUtangPending(false);
    }
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Add at least one item to the sale.");
      return;
    }
    if (cashInsufficient) {
      toast.error("Amount paid is less than the total.");
      return;
    }

    setCheckoutPending(true);
    try {
      const result = await createSales({
        date: saleDate ?? "",
        items: toCartPayload(cart),
      });
      if (result.success) {
        toast.success(result.message ?? "Sale recorded");
        clearSale();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setCheckoutPending(false);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteSale(id);
    if (result.success) {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    } else toast.error(result.error);
  }

  const canAdd =
    (selected && quantity > 0) ||
    (isCustom && unitPrice > 0 && Boolean(watch("name")?.trim()));

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Quick Sale</CardTitle>
              <CardDescription>
                Add items to the sale, then record payment. Scan or pick
                products — multiple items per transaction.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <ScanBarcodeButton onClick={() => setScannerOpen(true)} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={continuousScan}
                  onChange={(e) => setContinuousScan(e.target.checked)}
                  className="size-3.5 rounded border-input"
                />
                Continuous scan
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Item</Label>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <SearchableItemSelect
                  products={products}
                  currency={currency}
                  value={field.value ?? ""}
                  onValueChange={(v) => selectProduct(v)}
                />
              )}
            />
            <FieldError message={errors.productId?.message} />
          </div>

          {isCustom ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sale-name">Item name</Label>
                <Input
                  id="sale-name"
                  className="h-11"
                  placeholder="e.g. Kape, Bigas"
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sale-price">Selling price</Label>
                <Input
                  id="sale-price"
                  className="h-11"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("unitPrice")}
                />
                <FieldError message={errors.unitPrice?.message} />
              </div>
            </div>
          ) : selected ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>
                <span className="text-muted-foreground">Price: </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(selected.sellingPrice, currency)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">In stock: </span>
                <span className="font-medium tabular-nums">
                  {formatNumber(selected.currentStock)}
                </span>
              </span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Decrease quantity"
                  onClick={() => adjustQty(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <Input
                  id="quantity"
                  className="h-11 text-center text-lg font-medium tabular-nums"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  {...register("quantity")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Increase quantity"
                  onClick={() => adjustQty(1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <FieldError message={errors.quantity?.message} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                className="h-11"
                type="date"
                {...register("date")}
              />
              <FieldError message={errors.date?.message} />
            </div>

            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-11 w-full sm:w-auto sm:min-w-36"
              disabled={!canAdd}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="size-4" />
              Add to sale
            </Button>
          </div>

          {isCustom ? (
            <p className="text-xs text-muted-foreground">
              New items are added to Products with this price. You can edit
              cost and stock later.
            </p>
          ) : null}

          <SaleCartPanel
            lines={cart}
            currency={currency}
            onRemove={removeFromCart}
            onAdjustQty={adjustCartQty}
          />

          {cart.length > 0 ? (
            <>
              <CashPaymentSection
                total={cartGrandTotal}
                currency={currency}
                cashReceived={cashReceived}
                onCashReceivedChange={setCashReceived}
                utangCustomerId={utangCustomerId}
                utangCustomerName={utangCustomerName}
                onUtangCustomerChange={handleUtangCustomerChange}
                customers={customers}
                onRecordUtang={handleRecordUtang}
                utangPending={utangPending}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={checkoutPending || utangPending}
                  onClick={() => {
                    setCart([]);
                    clearPayment();
                  }}
                >
                  Clear sale
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-11 sm:min-w-40"
                  disabled={checkoutPending || cashInsufficient || utangPending}
                  onClick={handleCheckout}
                >
                  {checkoutPending ? "Saving..." : "Record Sale"}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Recent Sales</h2>
        {salesTotalItems === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales recorded yet"
            description="Recorded sales will appear here."
          />
        ) : (
          <div className={salesPending ? "opacity-60" : undefined}>
            <>
              <MobileRecordList>
                {sales.map((s) => (
                  <MobileRecordCard
                    key={s.id}
                    title={s.productName}
                    subtitle={formatDate(s.saleDate)}
                    fields={[
                      { label: "Qty", value: formatNumber(s.quantity) },
                      {
                        label: "Revenue",
                        value: formatCurrency(s.revenue, currency),
                      },
                      {
                        label: "Profit",
                        value: (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(s.grossProfit, currency)}
                          </span>
                        ),
                      },
                    ]}
                    actions={
                      <ConfirmDialog
                        title="Delete sale?"
                        description="This restores the sold stock and removes the sale."
                        onConfirm={() => handleDelete(s.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10"
                            aria-label="Delete sale"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    }
                  />
                ))}
              </MobileRecordList>

              <DesktopTable>
                <Card className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(s.saleDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.productName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(s.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(s.revenue, currency)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(s.grossProfit, currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <ConfirmDialog
                                title="Delete sale?"
                                description="This restores the sold stock and removes the sale."
                                onConfirm={() => handleDelete(s.id)}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete sale"
                                  >
                                    <Trash2 className="size-4 text-destructive" />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </DesktopTable>

              <PaginationControls
                page={salesPage}
                totalPages={salesTotalPages}
                totalItems={salesTotalItems}
                pageSize={salesPageSize}
                onPageChange={setSalesPage}
              />
            </>
          </div>
        )}
      </div>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScan}
        continuous={continuousScan}
      />
      <QuickAddAndSellDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        lookup={quickAddLookup}
        currency={currency}
        defaultMinStock={defaultMinStock}
        onSold={() => router.refresh()}
      />
    </div>
  );
}
