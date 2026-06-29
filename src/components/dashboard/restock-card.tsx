import Link from "next/link";
import { AlertTriangle, PackageCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockStatusBadge } from "@/components/shared/status-badges";
import { formatNumber } from "@/lib/currency";
import type { ProductRow } from "@/lib/queries/products";

export function RestockCard({ products }: { products: ProductRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          Needs Restocking
        </CardTitle>
        <CardDescription>
          Products at or below their minimum stock level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <PackageCheck className="size-6 text-emerald-500" />
            All products are well stocked.
          </div>
        ) : (
          <div className="space-y-1">
            {products.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <Link
                  href="/inventory"
                  className="min-w-0 truncate text-sm font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(p.currentStock)} / {formatNumber(p.minStockLevel)}
                  </span>
                  <StockStatusBadge status={p.stockStatus} />
                </div>
              </div>
            ))}
            {products.length > 8 ? (
              <Link
                href="/products"
                className="block pt-2 text-xs text-primary hover:underline"
              >
                View all {products.length} products needing restock →
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
