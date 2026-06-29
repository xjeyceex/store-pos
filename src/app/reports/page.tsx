import { Layers } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ReportsClient } from "@/components/reports/reports-client";
import { resolveDateRange } from "@/lib/dates";
import { getCurrency } from "@/lib/queries/settings";
import { getReport, type ReportType } from "@/lib/queries/reports";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const initialType: ReportType = "DAILY_SALES";
  const range = resolveDateRange("LAST_30_DAYS");
  const ctx = await getBranchContext();
  const consolidated = ctx.mode === "all";
  const [currency, initial] = await Promise.all([
    getCurrency(),
    getReport(initialType, range, ctx.branchId),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description={
          consolidated
            ? `Consolidated across all ${ctx.branches.length} branch${ctx.branches.length === 1 ? "" : "es"}.`
            : `Reports for ${ctx.branchName ?? "your store"}.`
        }
      >
        {consolidated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Layers className="size-3.5" />
            All Branches
          </span>
        ) : null}
      </PageHeader>
      <ReportsClient
        initial={initial}
        initialType={initialType}
        currency={currency}
      />
    </div>
  );
}
