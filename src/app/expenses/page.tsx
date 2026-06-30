import { PageHeader } from "@/components/shared/page-header";
import { ExpensesClient } from "@/components/expenses/expenses-client";
import { BranchScopeNotice } from "@/components/layout/branch-scope-notice";
import { getExpensesPage, getExpenseTotals } from "@/lib/queries/expenses";
import { getCurrency } from "@/lib/queries/settings";
import { getBranchContext } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const ctx = await getBranchContext();

  if (ctx.mode === "all" || !ctx.branchId) {
    return (
      <div>
        <PageHeader
          title="Expenses"
          description="Track electricity, rent, supplies, and more."
        />
        <BranchScopeNotice hasBranches={ctx.branches.length > 0} />
      </div>
    );
  }

  const [expenses, totals, currency] = await Promise.all([
    getExpensesPage(ctx.branchId, { page: 1 }),
    getExpenseTotals(ctx.branchId),
    getCurrency(),
  ]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`Expenses for ${ctx.branchName}.`}
      />
      <ExpensesClient initial={expenses} totals={totals} currency={currency} />
    </div>
  );
}
