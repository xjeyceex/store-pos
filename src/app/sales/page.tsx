import { PageHeader } from "@/components/shared/page-header";
import { SalesClient } from "@/components/sales/sales-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getProductOptions } from "@/lib/queries/products";
import { getSales } from "@/lib/queries/sales";
import { getCurrency, getSettings } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Sales"
          description="Record sales quickly. No POS, no fuss."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const [products, sales, currency, settings] = await Promise.all([
    getProductOptions(ctx.branchId),
    getSales(ctx.branchId),
    getCurrency(),
    getSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales"
        description={`Record sales for ${ctx.branchName}. Pick from catalog or type a new item.`}
      />
      <SalesClient
        products={products}
        sales={sales}
        currency={currency}
        defaultMinStock={settings.defaultLowStockThreshold}
      />
    </div>
  );
}
