import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import {
  todayRange,
  thisWeekRange,
  thisMonthRange,
  thisYearRange,
} from "@/lib/dates";

export type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: Date;
};

export async function getExpenses(
  branchId?: string | null,
  limit = 200
): Promise<ExpenseRow[]> {
  return prisma.expense.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { expenseDate: "desc" },
    take: limit,
    select: {
      id: true,
      description: true,
      category: true,
      amount: true,
      expenseDate: true,
    },
  });
}

async function sumExpenses(
  from: Date,
  to: Date,
  branchId?: string | null
): Promise<number> {
  const agg = await prisma.expense.aggregate({
    where: {
      ...(branchId ? { branchId } : {}),
      expenseDate: { gte: from, lte: to },
    },
    _sum: { amount: true },
  });
  return roundMoney(agg._sum.amount ?? 0);
}

export async function getExpenseTotals(branchId?: string | null) {
  const today = todayRange();
  const week = thisWeekRange();
  const month = thisMonthRange();
  const year = thisYearRange();
  const [d, w, m, y] = await Promise.all([
    sumExpenses(today.from, today.to, branchId),
    sumExpenses(week.from, week.to, branchId),
    sumExpenses(month.from, month.to, branchId),
    sumExpenses(year.from, year.to, branchId),
  ]);
  return { today: d, week: w, month: m, year: y };
}
