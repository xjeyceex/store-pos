import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InventoryHistoryClient } from "@/components/inventory/inventory-history-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getInventoryLogs } from "@/lib/queries/inventory";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function InventoryHistoryPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Inventory History"
          description="A complete log of every stock movement."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const logs = await getInventoryLogs(ctx.branchId);

  return (
    <div>
      <PageHeader
        title="Inventory History"
        description={`Stock movement log for ${ctx.branchName}.`}
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>
          <ArrowLeft className="size-4" />
          Back to Inventory
        </Button>
      </PageHeader>
      <InventoryHistoryClient logs={logs} />
    </div>
  );
}
