import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import { type DateRange, formatDate } from "@/lib/dates";
import {
  expenseCategoryLabel,
  utangStatusLabel,
  STOCK_STATUS_LABELS,
} from "@/lib/constants";
import { getStockStatus } from "@/lib/stock";
import { getProfitSeries } from "@/lib/queries/analytics";
import {
  DEFAULT_PAGE_SIZE,
  getTotalPages,
  paginateSlice,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import type {
  ReportColumn,
  ReportResult,
  ReportRow,
  ReportType,
} from "@/lib/reports-meta";

export {
  REPORT_TYPES,
  type ColumnType,
  type ReportColumn,
  type ReportResult,
  type ReportRow,
  type ReportType,
} from "@/lib/reports-meta";

function salesReportColumns(periodHeader: string): ReportColumn[] {
  return [
    { key: "period", header: periodHeader, type: "text" },
    { key: "salesCount", header: "Sales", type: "number" },
    { key: "revenue", header: "Revenue", type: "currency" },
    { key: "grossProfit", header: "Gross Profit", type: "currency" },
  ];
}

async function buildSalesReport(
  range: DateRange,
  granularity: "day" | "week" | "month",
  type: ReportType,
  title: string,
  periodHeader: string,
  branchId?: string | null
): Promise<ReportResult> {
  const series = await getProfitSeries(range, granularity, branchId);
  const rows: ReportRow[] = series.map((p) => ({
    period: p.label,
    salesCount: p.salesCount,
    revenue: p.revenue,
    grossProfit: p.grossProfit,
  }));
  const totals: ReportRow = {
    period: "Total",
    salesCount: series.reduce((s, p) => s + p.salesCount, 0),
    revenue: roundMoney(series.reduce((s, p) => s + p.revenue, 0)),
    grossProfit: roundMoney(series.reduce((s, p) => s + p.grossProfit, 0)),
  };
  return { type, title, columns: salesReportColumns(periodHeader), rows, totals };
}

async function buildProfitReport(
  range: DateRange,
  branchId?: string | null
): Promise<ReportResult> {
  const series = await getProfitSeries(range, "day", branchId);
  const rows: ReportRow[] = series.map((p) => ({
    period: p.label,
    revenue: p.revenue,
    grossProfit: p.grossProfit,
    expenses: p.expenses,
    netProfit: p.netProfit,
  }));
  const totals: ReportRow = {
    period: "Total",
    revenue: roundMoney(series.reduce((s, p) => s + p.revenue, 0)),
    grossProfit: roundMoney(series.reduce((s, p) => s + p.grossProfit, 0)),
    expenses: roundMoney(series.reduce((s, p) => s + p.expenses, 0)),
    netProfit: roundMoney(series.reduce((s, p) => s + p.netProfit, 0)),
  };
  return {
    type: "PROFIT",
    title: "Profit Report",
    columns: [
      { key: "period", header: "Date", type: "text" },
      { key: "revenue", header: "Revenue", type: "currency" },
      { key: "grossProfit", header: "Gross Profit", type: "currency" },
      { key: "expenses", header: "Expenses", type: "currency" },
      { key: "netProfit", header: "Net Profit", type: "currency" },
    ],
    rows,
    totals,
  };
}

async function buildExpenseReport(
  range: DateRange,
  branchId?: string | null
): Promise<ReportResult> {
  const expenses = await prisma.expense.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      expenseDate: { gte: range.from, lte: range.to },
    },
    orderBy: { expenseDate: "desc" },
  });
  const rows: ReportRow[] = expenses.map((e) => ({
    date: formatDate(e.expenseDate),
    description: e.description,
    category: expenseCategoryLabel(e.category),
    amount: roundMoney(e.amount),
  }));
  const totals: ReportRow = {
    date: "Total",
    description: "",
    category: "",
    amount: roundMoney(expenses.reduce((s, e) => s + e.amount, 0)),
  };
  return {
    type: "EXPENSE",
    title: "Expense Report",
    columns: [
      { key: "date", header: "Date", type: "text" },
      { key: "description", header: "Description", type: "text" },
      { key: "category", header: "Category", type: "text" },
      { key: "amount", header: "Amount", type: "currency" },
    ],
    rows,
    totals,
  };
}

async function buildInventoryReport(
  branchId?: string | null
): Promise<ReportResult> {
  const products = await prisma.product.findMany({
    where: branchId ? { branchId } : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const rows: ReportRow[] = products.map((p) => ({
    name: p.name,
    category: p.category?.name ?? "Uncategorized",
    stock: p.currentStock,
    costPrice: roundMoney(p.costPrice),
    sellingPrice: roundMoney(p.sellingPrice),
    inventoryValue: roundMoney(p.currentStock * p.costPrice),
    status: STOCK_STATUS_LABELS[getStockStatus(p.currentStock, p.minStockLevel)],
  }));
  const totals: ReportRow = {
    name: "Total",
    category: "",
    stock: products.reduce((s, p) => s + p.currentStock, 0),
    costPrice: "",
    sellingPrice: "",
    inventoryValue: roundMoney(
      products.reduce((s, p) => s + p.currentStock * p.costPrice, 0)
    ),
    status: "",
  };
  return {
    type: "INVENTORY",
    title: "Inventory Report",
    columns: [
      { key: "name", header: "Product", type: "text" },
      { key: "category", header: "Category", type: "text" },
      { key: "stock", header: "Stock", type: "number" },
      { key: "costPrice", header: "Cost", type: "currency" },
      { key: "sellingPrice", header: "Price", type: "currency" },
      { key: "inventoryValue", header: "Value", type: "currency" },
      { key: "status", header: "Status", type: "text" },
    ],
    rows,
    totals,
  };
}

async function buildUtangReport(
  range: DateRange,
  branchId?: string | null
): Promise<ReportResult> {
  const utangs = await prisma.utang.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      utangDate: { gte: range.from, lte: range.to },
    },
    include: { customer: true, payments: true },
    orderBy: { utangDate: "desc" },
  });
  const rows: ReportRow[] = utangs.map((u) => {
    const paid = u.payments.reduce((s, p) => s + p.amount, 0);
    return {
      date: formatDate(u.utangDate),
      customer: u.customer.name,
      amount: roundMoney(u.amount),
      paid: roundMoney(paid),
      remaining: roundMoney(Math.max(0, u.amount - paid)),
      status: utangStatusLabel(u.status),
    };
  });
  const totals: ReportRow = {
    date: "Total",
    customer: "",
    amount: roundMoney(utangs.reduce((s, u) => s + u.amount, 0)),
    paid: roundMoney(
      utangs.reduce(
        (s, u) => s + u.payments.reduce((x, p) => x + p.amount, 0),
        0
      )
    ),
    remaining: roundMoney(
      utangs.reduce((s, u) => {
        const paid = u.payments.reduce((x, p) => x + p.amount, 0);
        return s + Math.max(0, u.amount - paid);
      }, 0)
    ),
    status: "",
  };
  return {
    type: "UTANG",
    title: "Utang Report",
    columns: [
      { key: "date", header: "Date", type: "text" },
      { key: "customer", header: "Customer", type: "text" },
      { key: "amount", header: "Amount", type: "currency" },
      { key: "paid", header: "Paid", type: "currency" },
      { key: "remaining", header: "Remaining", type: "currency" },
      { key: "status", header: "Status", type: "text" },
    ],
    rows,
    totals,
  };
}

export type PaginatedReportResult = ReportResult & {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

function paginateReportRows(
  result: ReportResult,
  page: number,
  pageSize: number
): PaginatedReportResult {
  const totalItems = result.rows.length;
  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    ...result,
    rows: paginateSlice(result.rows, safePage, pageSize),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}

async function buildInventoryReportPage(
  branchId: string | null | undefined,
  page: number,
  pageSize: number
): Promise<PaginatedReportResult> {
  const where: Prisma.ProductWhereInput = branchId ? { branchId } : {};
  const [totalItems, products, allProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.findMany({
      where,
      select: { currentStock: true, costPrice: true, minStockLevel: true },
    }),
  ]);

  const rows: ReportRow[] = products.map((p) => ({
    name: p.name,
    category: p.category?.name ?? "Uncategorized",
    stock: p.currentStock,
    costPrice: roundMoney(p.costPrice),
    sellingPrice: roundMoney(p.sellingPrice),
    inventoryValue: roundMoney(p.currentStock * p.costPrice),
    status: STOCK_STATUS_LABELS[getStockStatus(p.currentStock, p.minStockLevel)],
  }));

  const totals: ReportRow = {
    name: "Total",
    category: "",
    stock: allProducts.reduce((s, p) => s + p.currentStock, 0),
    costPrice: "",
    sellingPrice: "",
    inventoryValue: roundMoney(
      allProducts.reduce((s, p) => s + p.currentStock * p.costPrice, 0)
    ),
    status: "",
  };

  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    type: "INVENTORY",
    title: "Inventory Report",
    columns: [
      { key: "name", header: "Product", type: "text" },
      { key: "category", header: "Category", type: "text" },
      { key: "stock", header: "Stock", type: "number" },
      { key: "costPrice", header: "Cost", type: "currency" },
      { key: "sellingPrice", header: "Price", type: "currency" },
      { key: "inventoryValue", header: "Value", type: "currency" },
      { key: "status", header: "Status", type: "text" },
    ],
    rows,
    totals,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}

async function buildExpenseReportPage(
  range: DateRange,
  branchId: string | null | undefined,
  page: number,
  pageSize: number
): Promise<PaginatedReportResult> {
  const where: Prisma.ExpenseWhereInput = {
    ...(branchId ? { branchId } : {}),
    expenseDate: { gte: range.from, lte: range.to },
  };

  const [totalItems, expenses, sumAgg] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  const rows: ReportRow[] = expenses.map((e) => ({
    date: formatDate(e.expenseDate),
    description: e.description,
    category: expenseCategoryLabel(e.category),
    amount: roundMoney(e.amount),
  }));

  const totals: ReportRow = {
    date: "Total",
    description: "",
    category: "",
    amount: roundMoney(sumAgg._sum.amount ?? 0),
  };

  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    type: "EXPENSE",
    title: "Expense Report",
    columns: [
      { key: "date", header: "Date", type: "text" },
      { key: "description", header: "Description", type: "text" },
      { key: "category", header: "Category", type: "text" },
      { key: "amount", header: "Amount", type: "currency" },
    ],
    rows,
    totals,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}

async function buildUtangReportPage(
  range: DateRange,
  branchId: string | null | undefined,
  page: number,
  pageSize: number
): Promise<PaginatedReportResult> {
  const where: Prisma.UtangWhereInput = {
    ...(branchId ? { branchId } : {}),
    utangDate: { gte: range.from, lte: range.to },
  };

  const [totalItems, utangs, allUtangs] = await Promise.all([
    prisma.utang.count({ where }),
    prisma.utang.findMany({
      where,
      include: { customer: true, payments: true },
      orderBy: { utangDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.utang.findMany({
      where,
      include: { payments: { select: { amount: true } } },
    }),
  ]);

  const rows: ReportRow[] = utangs.map((u) => {
    const paid = u.payments.reduce((s, p) => s + p.amount, 0);
    return {
      date: formatDate(u.utangDate),
      customer: u.customer.name,
      amount: roundMoney(u.amount),
      paid: roundMoney(paid),
      remaining: roundMoney(Math.max(0, u.amount - paid)),
      status: utangStatusLabel(u.status),
    };
  });

  const totals: ReportRow = {
    date: "Total",
    customer: "",
    amount: roundMoney(allUtangs.reduce((s, u) => s + u.amount, 0)),
    paid: roundMoney(
      allUtangs.reduce(
        (s, u) => s + u.payments.reduce((x, p) => x + p.amount, 0),
        0
      )
    ),
    remaining: roundMoney(
      allUtangs.reduce((s, u) => {
        const paid = u.payments.reduce((x, p) => x + p.amount, 0);
        return s + Math.max(0, u.amount - paid);
      }, 0)
    ),
    status: "",
  };

  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    type: "UTANG",
    title: "Utang Report",
    columns: [
      { key: "date", header: "Date", type: "text" },
      { key: "customer", header: "Customer", type: "text" },
      { key: "amount", header: "Amount", type: "currency" },
      { key: "paid", header: "Paid", type: "currency" },
      { key: "remaining", header: "Remaining", type: "currency" },
      { key: "status", header: "Status", type: "text" },
    ],
    rows,
    totals,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getReportPage(
  type: ReportType,
  range: DateRange,
  branchId: string | null | undefined,
  opts: { page?: number; pageSize?: number } = {}
): Promise<PaginatedReportResult> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  switch (type) {
    case "INVENTORY":
      return buildInventoryReportPage(branchId, page, pageSize);
    case "EXPENSE":
      return buildExpenseReportPage(range, branchId, page, pageSize);
    case "UTANG":
      return buildUtangReportPage(range, branchId, page, pageSize);
    default: {
      const full = await getReport(type, range, branchId);
      return paginateReportRows(full, page, pageSize);
    }
  }
}

export async function getReport(
  type: ReportType,
  range: DateRange,
  branchId?: string | null
): Promise<ReportResult> {
  switch (type) {
    case "DAILY_SALES":
      return buildSalesReport(range, "day", type, "Daily Sales Report", "Date", branchId);
    case "WEEKLY_SALES":
      return buildSalesReport(
        range,
        "week",
        type,
        "Weekly Sales Report",
        "Week Of",
        branchId
      );
    case "MONTHLY_SALES":
      return buildSalesReport(
        range,
        "month",
        type,
        "Monthly Sales Report",
        "Month",
        branchId
      );
    case "PROFIT":
      return buildProfitReport(range, branchId);
    case "EXPENSE":
      return buildExpenseReport(range, branchId);
    case "INVENTORY":
      return buildInventoryReport(branchId);
    case "UTANG":
      return buildUtangReport(range, branchId);
    default:
      return buildProfitReport(range, branchId);
  }
}
