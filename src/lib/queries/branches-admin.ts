import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/currency";

export type BranchRow = {
  id: string;
  name: string;
  location: string | null;
  createdAt: Date;
  productCount: number;
  salesCount: number;
  inventoryValue: number;
  outstandingUtang: number;
};

/** Branches with per-branch summary stats for the management page. */
export async function getBranchesWithStats(): Promise<BranchRow[]> {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { products: true, sales: true } },
      products: { select: { currentStock: true, costPrice: true } },
      utangs: {
        select: { amount: true, payments: { select: { amount: true } } },
      },
    },
  });

  return branches.map((b) => {
    const inventoryValue = b.products.reduce(
      (s, p) => s + p.currentStock * p.costPrice,
      0
    );
    let outstanding = 0;
    for (const u of b.utangs) {
      const paid = u.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = u.amount - paid;
      if (remaining > 0) outstanding += remaining;
    }
    return {
      id: b.id,
      name: b.name,
      location: b.location,
      createdAt: b.createdAt,
      productCount: b._count.products,
      salesCount: b._count.sales,
      inventoryValue: roundMoney(inventoryValue),
      outstandingUtang: roundMoney(outstanding),
    };
  });
}
