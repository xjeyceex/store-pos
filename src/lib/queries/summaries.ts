import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import { dayKey, startOfDayLocal, endOfDayLocal } from "@/lib/dates";

/** Total inventory value (stock × cost), optionally scoped to one branch. */
export async function getTotalInventoryValue(
  branchId?: string | null
): Promise<number> {
  const products = await prisma.product.findMany({
    where: branchId ? { branchId } : undefined,
    select: { currentStock: true, costPrice: true },
  });
  return roundMoney(
    products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)
  );
}

async function computeDayMetrics(branchId: string, dayStart: Date, dayEnd: Date) {
  const [saleAgg, expenseAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { branchId, saleDate: { gte: dayStart, lte: dayEnd } },
      _sum: { revenue: true, productCost: true, grossProfit: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { branchId, expenseDate: { gte: dayStart, lte: dayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = roundMoney(saleAgg._sum.revenue ?? 0);
  const cogs = roundMoney(saleAgg._sum.productCost ?? 0);
  const grossProfit = roundMoney(saleAgg._sum.grossProfit ?? 0);
  const expenses = roundMoney(expenseAgg._sum.amount ?? 0);
  const netProfit = roundMoney(grossProfit - expenses);
  const salesCount = saleAgg._count;

  return { revenue, cogs, grossProfit, expenses, netProfit, salesCount };
}

/**
 * Recomputes the DailySummary for a branch on a given day and cascades the
 * opening/closing cash forward through any later summaries (opening cash
 * carries over from the previous day's closing cash). Each branch keeps its
 * own independent cash ledger.
 */
export async function recomputeDailySummary(
  branchId: string,
  date: Date
): Promise<void> {
  const key = dayKey(date);
  const metrics = await computeDayMetrics(
    branchId,
    startOfDayLocal(date),
    endOfDayLocal(date)
  );
  const inventoryValue = await getTotalInventoryValue(branchId);

  const prior = await prisma.dailySummary.findFirst({
    where: { branchId, date: { lt: key } },
    orderBy: { date: "desc" },
  });
  const openingCash = roundMoney(prior?.closingCash ?? 0);
  const closingCash = roundMoney(openingCash + metrics.revenue - metrics.expenses);

  // Drop cogs (not persisted) before writing.
  const { cogs: _cogs, ...persisted } = metrics;
  void _cogs;

  await prisma.dailySummary.upsert({
    where: { branchId_date: { branchId, date: key } },
    create: {
      branchId,
      date: key,
      ...persisted,
      openingCash,
      closingCash,
      inventoryValue,
    },
    update: { ...persisted, openingCash, closingCash, inventoryValue },
  });

  await cascadeCashForward(branchId, key);
}

async function cascadeCashForward(branchId: string, key: Date): Promise<void> {
  const current = await prisma.dailySummary.findUnique({
    where: { branchId_date: { branchId, date: key } },
  });
  let priorClosing = current?.closingCash ?? 0;

  const later = await prisma.dailySummary.findMany({
    where: { branchId, date: { gt: key } },
    orderBy: { date: "asc" },
  });

  for (const summary of later) {
    const openingCash = roundMoney(priorClosing);
    const closingCash = roundMoney(
      openingCash + summary.revenue - summary.expenses
    );
    if (
      openingCash !== summary.openingCash ||
      closingCash !== summary.closingCash
    ) {
      await prisma.dailySummary.update({
        where: { id: summary.id },
        data: { openingCash, closingCash },
      });
    }
    priorClosing = closingCash;
  }
}
