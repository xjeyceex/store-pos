import { prisma } from "@/lib/prisma";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import { orderNewestInventoryLog } from "@/lib/queries/sort";

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

const logSelect = {
  id: true,
  productId: true,
  productName: true,
  quantityBefore: true,
  quantityChange: true,
  quantityAfter: true,
  reason: true,
  note: true,
  createdAt: true,
} as const;

function buildInventoryLogWhere(
  branchId: string,
  query?: string,
  reason?: string
): Prisma.InventoryLogWhereInput {
  const q = query?.trim();
  return {
    branchId,
    ...(reason && reason !== "ALL" ? { reason } : {}),
    ...(q ? { productName: { contains: q } } : {}),
  };
}

export async function getInventoryLogsPage(
  branchId: string,
  opts: {
    page?: number;
    pageSize?: number;
    query?: string;
    reason?: string;
  } = {}
): Promise<PaginatedResult<InventoryLogRow>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildInventoryLogWhere(branchId, opts.query, opts.reason);

  const [totalItems, items] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      orderBy: orderNewestInventoryLog,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: logSelect,
    }),
  ]);

  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getInventoryLogs(
  branchId?: string | null,
  limit = 200
): Promise<InventoryLogRow[]> {
  return prisma.inventoryLog.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: orderNewestInventoryLog,
    take: limit,
    select: logSelect,
  });
}
