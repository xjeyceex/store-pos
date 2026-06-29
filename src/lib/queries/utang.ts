import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";
import { computeUtangStatus } from "@/lib/utang-status";
import type { UtangStatus } from "@/lib/constants";

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

export async function getCustomers(
  branchId?: string | null
): Promise<CustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: branchId ? { branchId } : undefined,
    include: { utangs: { include: { payments: { select: { amount: true } } } } },
    orderBy: { name: "asc" },
  });
  return customers.map((c) => {
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
  });
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
    const paid = u.payments.reduce((s, p) => s + p.amount, 0);
    totalUtang += u.amount;
    totalPaid += paid;
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
