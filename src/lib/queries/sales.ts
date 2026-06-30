import { prisma } from "@/lib/prisma";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import { orderNewestSale } from "@/lib/queries/sort";

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

const saleSelect = {
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
} as const;

function buildSalesWhere(
  branchId: string,
  query?: string
): Prisma.SaleWhereInput {
  const q = query?.trim();
  return {
    branchId,
    ...(q ? { productName: { contains: q } } : {}),
  };
}

export async function getSalesPage(
  branchId: string,
  opts: { page?: number; pageSize?: number; query?: string } = {}
): Promise<PaginatedResult<SaleRow>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildSalesWhere(branchId, opts.query);

  const [totalItems, items] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: orderNewestSale,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: saleSelect,
    }),
  ]);

  return buildPaginatedResult(items, totalItems, page, pageSize);
}

export async function getSales(
  branchId?: string | null,
  limit = 200
): Promise<SaleRow[]> {
  return prisma.sale.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: orderNewestSale,
    take: limit,
    select: saleSelect,
  });
}
