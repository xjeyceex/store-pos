import { prisma } from "@/lib/prisma";
import { computeProduct, getStockStatus } from "@/lib/stock";
import type { StockStatus } from "@/lib/constants";

export type ProductRow = {
  id: string;
  name: string;
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
  sellingPrice: number;
  costPrice: number;
  currentStock: number;
};

export async function getProducts(
  branchId?: string | null
): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: branchId ? { branchId } : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
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
  }));
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
