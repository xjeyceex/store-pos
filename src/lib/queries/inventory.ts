import { prisma } from "@/lib/prisma";

export type InventoryLogRow = {
  id: string;
  productId: string | null;
  productName: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  note: string | null;
  createdAt: Date;
};

export async function getInventoryLogs(
  branchId?: string | null,
  limit = 200
): Promise<InventoryLogRow[]> {
  return prisma.inventoryLog.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      productId: true,
      productName: true,
      quantityBefore: true,
      quantityChange: true,
      quantityAfter: true,
      reason: true,
      note: true,
      createdAt: true,
    },
  });
}
