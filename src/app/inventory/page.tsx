import Link from "next/link";
import { History } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InventoryClient } from "@/components/inventory/inventory-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getProducts } from "@/lib/queries/products";
import { getCurrency } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Inventory"
          description="Track every stock movement with a full audit log."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const [products, currency] = await Promise.all([
    getProducts(ctx.branchId),
    getCurrency(),
  ]);

  const mapped = products.map((p) => ({
    id: p.id,
    name: p.name,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    currentStock: p.currentStock,
    minStockLevel: p.minStockLevel,
  }));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`Stock movements for ${ctx.branchName}.`}
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/inventory/history" />}>
          <History className="size-4" />
          View History
        </Button>
      </PageHeader>
      <InventoryClient products={mapped} currency={currency} />
    </div>
  );
}
