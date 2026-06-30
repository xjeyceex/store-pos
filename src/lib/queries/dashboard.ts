import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import { getStockStatus } from "@/lib/stock";
import { todayRange, dayKey } from "@/lib/dates";
import { getPeriodStats } from "@/lib/queries/analytics";
import {
  orderNewestExpense,
  orderNewestInventoryLog,
  orderNewestPayment,
  orderNewestSale,
} from "@/lib/queries/sort";
import type {
  InventorySummary,
  CashPosition,
} from "@/lib/types";

function branchFilter(branchId?: string | null) {
  return branchId ? { branchId } : {};
}

export async function getInventorySummary(
  branchId?: string | null
): Promise<InventorySummary> {
  const products = await prisma.product.findMany({
    where: branchFilter(branchId),
    select: {
      currentStock: true,
      costPrice: true,
      sellingPrice: true,
      minStockLevel: true,
    },
  });

  let inventoryValue = 0;
  let potentialRevenue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    inventoryValue += p.currentStock * p.costPrice;
    potentialRevenue += p.currentStock * p.sellingPrice;
    const status = getStockStatus(p.currentStock, p.minStockLevel);
    if (status === "OUT_OF_STOCK") outOfStockCount += 1;
    else if (status === "LOW_STOCK") lowStockCount += 1;
  }

  inventoryValue = roundMoney(inventoryValue);
  potentialRevenue = roundMoney(potentialRevenue);

  return {
    inventoryValue,
    potentialRevenue,
    potentialProfit: roundMoney(potentialRevenue - inventoryValue),
    lowStockCount,
    outOfStockCount,
    productCount: products.length,
  };
}

export async function getOutstandingUtangTotal(
  branchId?: string | null
): Promise<number> {
  const utangs = await prisma.utang.findMany({
    where: branchFilter(branchId),
    include: { payments: { select: { amount: true } } },
  });
  let total = 0;
  for (const u of utangs) {
    const paid = u.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = u.amount - paid;
    if (remaining > 0) total += remaining;
  }
  return roundMoney(total);
}

export async function getCashPositionToday(
  branchId?: string | null
): Promise<CashPosition> {
  const stats = await getPeriodStats(todayRange(), branchId);
  const key = dayKey(new Date());

  let openingCash: number;
  if (branchId) {
    const prior = await prisma.dailySummary.findFirst({
      where: { branchId, date: { lt: key } },
      orderBy: { date: "desc" },
      select: { closingCash: true },
    });
    openingCash = roundMoney(prior?.closingCash ?? 0);
  } else {
    // Consolidated: sum each branch's most recent prior closing cash.
    const branches = await prisma.branch.findMany({ select: { id: true } });
    let sum = 0;
    for (const b of branches) {
      const prior = await prisma.dailySummary.findFirst({
        where: { branchId: b.id, date: { lt: key } },
        orderBy: { date: "desc" },
        select: { closingCash: true },
      });
      sum += prior?.closingCash ?? 0;
    }
    openingCash = roundMoney(sum);
  }

  const cashSales = stats.revenue;
  const expenses = stats.expenses;
  const closingCash = roundMoney(openingCash + cashSales - expenses);
  return { openingCash, cashSales, expenses, closingCash };
}

// ----- Recent activity -----
export type RecentSale = {
  id: string;
  productName: string;
  quantity: number;
  revenue: number;
  grossProfit: number;
  saleDate: Date;
  branchName: string | null;
};

export type RecentExpense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expenseDate: Date;
  branchName: string | null;
};

export type RecentInventory = {
  id: string;
  productName: string;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  createdAt: Date;
  branchName: string | null;
};

export type RecentPayment = {
  id: string;
  customerName: string;
  amount: number;
  paymentDate: Date;
  branchName: string | null;
};

export async function getRecentActivity(branchId?: string | null, take = 6) {
  const where = branchFilter(branchId);
  const [sales, expenses, inventory, payments] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: orderNewestSale,
      take,
      select: {
        id: true,
        productName: true,
        quantity: true,
        revenue: true,
        grossProfit: true,
        saleDate: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where,
      orderBy: orderNewestExpense,
      take,
      select: {
        id: true,
        description: true,
        category: true,
        amount: true,
        expenseDate: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.inventoryLog.findMany({
      where,
      orderBy: orderNewestInventoryLog,
      take,
      select: {
        id: true,
        productName: true,
        quantityChange: true,
        quantityAfter: true,
        reason: true,
        createdAt: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.utangPayment.findMany({
      where: branchId ? { utang: { branchId } } : undefined,
      orderBy: orderNewestPayment,
      take,
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        utang: {
          select: {
            customer: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    sales: sales.map((s) => ({
      id: s.id,
      productName: s.productName,
      quantity: s.quantity,
      revenue: s.revenue,
      grossProfit: s.grossProfit,
      saleDate: s.saleDate,
      branchName: s.branch?.name ?? null,
    })) as RecentSale[],
    expenses: expenses.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: e.amount,
      expenseDate: e.expenseDate,
      branchName: e.branch?.name ?? null,
    })) as RecentExpense[],
    inventory: inventory.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantityChange: i.quantityChange,
      quantityAfter: i.quantityAfter,
      reason: i.reason,
      createdAt: i.createdAt,
      branchName: i.branch?.name ?? null,
    })) as RecentInventory[],
    payments: payments.map((p) => ({
      id: p.id,
      customerName: p.utang.customer.name,
      amount: p.amount,
      paymentDate: p.paymentDate,
      branchName: p.utang.branch?.name ?? null,
    })) as RecentPayment[],
  };
}
