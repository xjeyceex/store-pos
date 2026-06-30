import { PageHeader } from "@/components/shared/page-header";
import { ProductsClient } from "@/components/products/products-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getProductsPage, getCategories } from "@/lib/queries/products";
import { getSettings } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Products"
          description="Manage your store's products, prices, and stock levels."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const [products, categories, settings] = await Promise.all([
    getProductsPage(ctx.branchId, { page: 1 }),
    getCategories(),
    getSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Products"
        description={`Products, prices, and stock for ${ctx.branchName}.`}
      />
      <ProductsClient
        initial={products}
        categories={categories.map((c) => c.name)}
        currency={settings.currency}
        defaultMinStock={settings.defaultLowStockThreshold}
      />
    </div>
  );
}
