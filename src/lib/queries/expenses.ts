import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
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

const expenseSelect = {
  id: true,
  description: true,
  category: true,
  amount: true,
  expenseDate: true,
} as const;

function buildExpenseWhere(
  branchId: string,
  query?: string,
  category?: string
): Prisma.ExpenseWhereInput {
  const q = query?.trim();
  return {
    branchId,
    ...(category && category !== "ALL" ? { category } : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
  };
}

export async function getExpensesPage(
  branchId: string,
  opts: {
    page?: number;
    pageSize?: number;
    query?: string;
    category?: string;
  } = {}
): Promise<PaginatedResult<ExpenseRow>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildExpenseWhere(branchId, opts.query, opts.category);

  const [totalItems, items] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: expenseSelect,
    }),
  ]);

  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getExpenses(
  branchId?: string | null,
  limit = 200
): Promise<ExpenseRow[]> {
  return prisma.expense.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { expenseDate: "desc" },
    take: limit,
    select: expenseSelect,
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
