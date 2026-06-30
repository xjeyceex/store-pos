import { prisma } from "@/lib/prisma";
import { computeProduct, getStockStatus } from "@/lib/stock";
import type { StockStatus } from "@/lib/constants";
import {
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import { orderNewestProduct } from "@/lib/queries/sort";

export type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  profitPerItem: number;
  inventoryValue: number;
  stockStatus: StockStatus;
};

export type ProductOption = {
  id: string;
  name: string;
  barcode: string | null;
  sellingPrice: number;
  costPrice: number;
  currentStock: number;
};

function mapProductRow(
  p: Awaited<
    ReturnType<typeof prisma.product.findMany<{ include: { category: true } }>>
  >[number]
): ProductRow {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    currentStock: p.currentStock,
    minStockLevel: p.minStockLevel,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ...computeProduct(p),
  };
}

function buildProductWhere(
  branchId: string,
  query?: string,
  category?: string
): Prisma.ProductWhereInput {
  const q = query?.trim();
  return {
    branchId,
    ...(category && category !== "ALL"
      ? { category: { name: category } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { barcode: { contains: q } },
            { category: { name: { contains: q } } },
          ],
        }
      : {}),
  };
}

export async function getProductsPage(
  branchId: string,
  opts: {
    page?: number;
    pageSize?: number;
    query?: string;
    category?: string;
  } = {}
): Promise<PaginatedResult<ProductRow>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildProductWhere(branchId, opts.query, opts.category);

  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: orderNewestProduct,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return buildPaginatedResult(
    products.map(mapProductRow),
    totalItems,
    page,
    pageSize
  );
}

export async function searchProductOptions(
  branchId: string,
  query: string,
  limit = 50
): Promise<ProductOption[]> {
  const q = query.trim();
  return prisma.product.findMany({
    where: {
      branchId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { barcode: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      sellingPrice: true,
      costPrice: true,
      currentStock: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });
}

export async function getProducts(
  branchId?: string | null
): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: branchId ? { branchId } : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return products.map(mapProductRow);
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function getProductOptions(
  branchId?: string | null
): Promise<ProductOption[]> {
  return prisma.product.findMany({
    where: branchId ? { branchId } : undefined,
    select: {
      id: true,
      name: true,
      barcode: true,
      sellingPrice: true,
      costPrice: true,
      currentStock: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getLowStockProducts(
  branchId?: string | null
): Promise<ProductRow[]> {
  const products = await getProducts(branchId);
  return products.filter((p) => p.stockStatus === "LOW_STOCK");
}

export async function getOutOfStockProducts(
  branchId?: string | null
): Promise<ProductRow[]> {
  const products = await getProducts(branchId);
  return products.filter((p) => p.stockStatus === "OUT_OF_STOCK");
}

export async function getRestockProducts(
  branchId?: string | null
): Promise<ProductRow[]> {
  const products = await getProducts(branchId);
  return products.filter(
    (p) => p.stockStatus === "LOW_STOCK" || p.stockStatus === "OUT_OF_STOCK"
  );
}

/** Recompute helper used after raw stock writes. */
export function deriveStockStatus(stock: number, min: number): StockStatus {
  return getStockStatus(stock, min);
}
