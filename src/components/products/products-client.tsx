"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StockStatusBadge } from "@/components/shared/status-badges";
import {
  DesktopTable,
  MobileRecordCard,
  MobileRecordList,
} from "@/components/shared/mobile-record-card";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { deleteProduct } from "@/lib/actions/products";
import type { ProductRow } from "@/lib/queries/products";

export function ProductsClient({
  products,
  categories,
  currency,
  defaultMinStock,
}: {
  products: ProductRow[];
  categories: string[];
  currency: string;
  defaultMinStock: number;
}) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("ALL");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.categoryName ?? "").toLowerCase().includes(q);
      const matchesCategory =
        category === "ALL" || p.categoryName === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  async function handleDelete(id: string) {
    const result = await deleteProduct(id);
    if (result.success) toast.success(result.message ?? "Deleted");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v ?? "ALL")}
            items={[
              { value: "ALL", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ProductFormDialog
          categories={categories}
          currency={currency}
          defaultMinStock={defaultMinStock}
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              Add Product
            </Button>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={
            products.length === 0
              ? "Add your first product to start tracking inventory."
              : "Try a different search or category filter."
          }
        />
      ) : (
        <>
          <MobileRecordList>
            {filtered.map((p) => (
              <MobileRecordCard
                key={p.id}
                title={p.name}
                subtitle={p.categoryName ?? "Uncategorized"}
                badge={<StockStatusBadge status={p.stockStatus} />}
                fields={[
                  {
                    label: "Price",
                    value: formatCurrency(p.sellingPrice, currency),
                  },
                  {
                    label: "Stock",
                    value: formatNumber(p.currentStock),
                  },
                  {
                    label: "Cost",
                    value: formatCurrency(p.costPrice, currency),
                  },
                  {
                    label: "Profit/Item",
                    value: formatCurrency(p.profitPerItem, currency),
                  },
                ]}
                actions={
                  <>
                    <ProductFormDialog
                      product={p}
                      categories={categories}
                      currency={currency}
                      defaultMinStock={defaultMinStock}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label="Edit product"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <ConfirmDialog
                      title="Delete product?"
                      description={`"${p.name}" will be removed. Past sales history is kept.`}
                      onConfirm={() => handleDelete(p.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label="Delete product"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                  </>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTable>
            <Card className="p-0">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Profit/Item</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Inv. Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.categoryName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.costPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.sellingPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.profitPerItem, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(p.currentStock)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.inventoryValue, currency)}
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge status={p.stockStatus} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ProductFormDialog
                        product={p}
                        categories={categories}
                        currency={currency}
                        defaultMinStock={defaultMinStock}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit product"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete product?"
                        description={`"${p.name}" will be removed. Past sales history is kept.`}
                        onConfirm={() => handleDelete(p.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete product"
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
        </>
      )}
    </div>
  );
}
