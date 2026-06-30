import { PageHeader } from "@/components/shared/page-header";
import { UtangClient } from "@/components/utang/utang-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getCustomersPage, getCustomerOptions } from "@/lib/queries/utang";
import { getProductOptions } from "@/lib/queries/products";
import { getOutstandingUtangTotal } from "@/lib/queries/dashboard";
import { getCurrency } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function UtangPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Utang"
          description="Track customer credit and payments."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const [customers, customerOptions, products, totalOutstanding, currency] =
    await Promise.all([
      getCustomersPage(ctx.branchId, { page: 1 }),
      getCustomerOptions(ctx.branchId),
      getProductOptions(ctx.branchId),
      getOutstandingUtangTotal(ctx.branchId),
      getCurrency(),
    ]);

  return (
    <div>
      <PageHeader
        title="Utang"
        description={`Customer credit for ${ctx.branchName}.`}
      />
      <UtangClient
        initial={customers}
        customerOptions={customerOptions}
        products={products}
        totalOutstanding={totalOutstanding}
        currency={currency}
      />
    </div>
  );
}
