import { PageHeader } from "@/components/shared/page-header";
import { BranchesClient } from "@/components/branches/branches-client";
import { getBranchesWithStats } from "@/lib/queries/branches-admin";
import { getBranchContext } from "@/lib/queries/branches";
import { getCurrency } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const [branches, ctx, currency] = await Promise.all([
    getBranchesWithStats(),
    getBranchContext(),
    getCurrency(),
  ]);

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage all your store branches from one account."
      />
      <BranchesClient
        branches={branches}
        activeBranchId={ctx.branchId}
        currency={currency}
      />
    </div>
  );
}
