import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import { computeUtangStatus } from "@/lib/utang-status";
import type { UtangStatus } from "@/lib/constants";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalUtang: number;
  totalPaid: number;
  balance: number;
  openCount: number;
  createdAt: Date;
};

type CustomerWithUtangs = Awaited<
  ReturnType<
    typeof prisma.customer.findMany<{
      include: { utangs: { include: { payments: { select: { amount: true } } } } };
    }>
  >
>[number];

function mapCustomerRow(c: CustomerWithUtangs): CustomerRow {
  let totalUtang = 0;
  let totalPaid = 0;
  let openCount = 0;
  for (const u of c.utangs) {
    totalUtang += u.amount;
    const paid = u.payments.reduce((s, p) => s + p.amount, 0);
    totalPaid += paid;
    if (u.amount - paid > 0.0001) openCount += 1;
  }
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    totalUtang: roundMoney(totalUtang),
    totalPaid: roundMoney(totalPaid),
    balance: roundMoney(Math.max(0, totalUtang - totalPaid)),
    openCount,
    createdAt: c.createdAt,
  };
}

function buildCustomerWhere(
  branchId: string,
  query?: string
): Prisma.CustomerWhereInput {
  const q = query?.trim();
  return {
    branchId,
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { phone: { contains: q } }],
        }
      : {}),
  };
}

export async function getCustomersPage(
  branchId: string,
  opts: { page?: number; pageSize?: number; query?: string } = {}
): Promise<PaginatedResult<CustomerRow>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildCustomerWhere(branchId, opts.query);

  const [totalItems, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { utangs: { include: { payments: { select: { amount: true } } } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return buildPaginatedResult(
    customers.map(mapCustomerRow),
    totalItems,
    page,
    pageSize
  );
}

export async function getCustomers(
  branchId?: string | null
): Promise<CustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: branchId ? { branchId } : undefined,
    include: { utangs: { include: { payments: { select: { amount: true } } } } },
    orderBy: { name: "asc" },
  });
  return customers.map(mapCustomerRow);
}

export async function getCustomerOptions(branchId?: string | null) {
  return prisma.customer.findMany({
    where: branchId ? { branchId } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type UtangItemRow = {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type UtangEntry = {
  id: string;
  amount: number;
  paid: number;
  remaining: number;
  status: UtangStatus;
  utangDate: Date;
  notes: string | null;
  items: UtangItemRow[];
  payments: { id: string; amount: number; paymentDate: Date }[];
};

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalUtang: number;
  totalPaid: number;
  balance: number;
  utangs: UtangEntry[];
};

export type CustomerSummary = Omit<CustomerDetail, "utangs">;

function mapUtangEntry(
  u: Awaited<
    ReturnType<
      typeof prisma.utang.findMany<{
        include: {
          payments: true;
          items: true;
        };
      }>
    >
  >[number]
): UtangEntry {
  const paid = u.payments.reduce((s, p) => s + p.amount, 0);
  return {
    id: u.id,
    amount: roundMoney(u.amount),
    paid: roundMoney(paid),
    remaining: roundMoney(Math.max(0, u.amount - paid)),
    status: computeUtangStatus(u.amount, paid),
    utangDate: u.utangDate,
    notes: u.notes,
    items: u.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.name,
      quantity: it.quantity,
      unitPrice: roundMoney(it.unitPrice),
      lineTotal: roundMoney(it.lineTotal),
    })),
    payments: u.payments.map((p) => ({
      id: p.id,
      amount: roundMoney(p.amount),
      paymentDate: p.paymentDate,
    })),
  };
}

export async function getCustomerSummary(
  id: string
): Promise<CustomerSummary | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      utangs: { include: { payments: { select: { amount: true } } } },
    },
  });
  if (!customer) return null;

  let totalUtang = 0;
  let totalPaid = 0;
  for (const u of customer.utangs) {
    totalUtang += u.amount;
    totalPaid += u.payments.reduce((s, p) => s + p.amount, 0);
  }

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    totalUtang: roundMoney(totalUtang),
    totalPaid: roundMoney(totalPaid),
    balance: roundMoney(Math.max(0, totalUtang - totalPaid)),
  };
}

export async function getCustomerUtangsPage(
  customerId: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResult<UtangEntry>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = { customerId };

  const [totalItems, utangs] = await Promise.all([
    prisma.utang.count({ where }),
    prisma.utang.findMany({
      where,
      include: {
        payments: { orderBy: { paymentDate: "desc" } },
        items: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { utangDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return buildPaginatedResult(
    utangs.map(mapUtangEntry),
    totalItems,
    page,
    pageSize
  );
}

export async function getCustomerDetail(
  id: string
): Promise<CustomerDetail | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      utangs: {
        include: {
          payments: { orderBy: { paymentDate: "desc" } },
          items: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { utangDate: "desc" },
      },
    },
  });
  if (!customer) return null;

  let totalUtang = 0;
  let totalPaid = 0;
  const utangs: UtangEntry[] = customer.utangs.map((u) => {
    const entry = mapUtangEntry(u);
    totalUtang += u.amount;
    totalPaid += u.payments.reduce((s, p) => s + p.amount, 0);
    return entry;
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    totalUtang: roundMoney(totalUtang),
    totalPaid: roundMoney(totalPaid),
    balance: roundMoney(Math.max(0, totalUtang - totalPaid)),
    utangs,
  };
}
