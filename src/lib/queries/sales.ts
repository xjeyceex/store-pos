import { prisma } from "@/lib/prisma";

export type SaleRow = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitCostPrice: number;
  revenue: number;
  productCost: number;
  grossProfit: number;
  saleDate: Date;
};

export async function getSales(
  branchId?: string | null,
  limit = 200
): Promise<SaleRow[]> {
  return prisma.sale.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { saleDate: "desc" },
    take: limit,
    select: {
      id: true,
      productId: true,
      productName: true,
      quantity: true,
      unitSellingPrice: true,
      unitCostPrice: true,
      revenue: true,
      productCost: true,
      grossProfit: true,
      saleDate: true,
    },
  });
}
