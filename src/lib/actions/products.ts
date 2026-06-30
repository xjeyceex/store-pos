"use server";

import { prisma } from "@/lib/prisma";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { roundMoney } from "@/lib/currency";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { getActiveBranchId } from "@/lib/queries/branches";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

const NO_BRANCH = "Select a specific branch before making changes.";
const BARCODE_TAKEN = "Barcode already used in this branch.";

function normalizeBarcodeInput(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function resolveCategoryId(
  categoryName?: string | null
): Promise<string | null> {
  const name = categoryName?.trim();
  if (!name) return null;
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.category.create({ data: { name } });
  return created.id;
}

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const branchId = await getActiveBranchId();
  if (!branchId) return { success: false, error: NO_BRANCH };
  const categoryId = await resolveCategoryId(d.categoryName);
  const barcode = normalizeBarcodeInput(d.barcode);

  try {
    const product = await prisma.product.create({
      data: {
        branchId,
        name: d.name,
        barcode,
        categoryId,
        costPrice: roundMoney(d.costPrice),
        sellingPrice: roundMoney(d.sellingPrice),
        currentStock: d.currentStock,
        minStockLevel: d.minStockLevel,
        notes: d.notes || null,
      },
    });

    if (d.currentStock > 0) {
      await prisma.inventoryLog.create({
        data: {
          branchId,
          productId: product.id,
          productName: product.name,
          quantityBefore: 0,
          quantityChange: d.currentStock,
          quantityAfter: d.currentStock,
          reason: "NEW_STOCK",
          note: "Initial stock",
        },
      });
    }

    await recomputeDailySummary(branchId, new Date());
    revalidateAll();
    return { success: true, message: "Product added.", data: { id: product.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: BARCODE_TAKEN };
    }
    throw error;
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Product not found." };
  }

  const categoryId = await resolveCategoryId(d.categoryName);
  const barcode = normalizeBarcodeInput(d.barcode);

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: d.name,
        barcode,
        categoryId,
        costPrice: roundMoney(d.costPrice),
        sellingPrice: roundMoney(d.sellingPrice),
        currentStock: d.currentStock,
        minStockLevel: d.minStockLevel,
        notes: d.notes || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: BARCODE_TAKEN };
    }
    throw error;
  }

  // If stock changed via the product form, record an adjustment log.
  if (d.currentStock !== existing.currentStock) {
    await prisma.inventoryLog.create({
      data: {
        branchId: existing.branchId,
        productId: id,
        productName: d.name,
        quantityBefore: existing.currentStock,
        quantityChange: d.currentStock - existing.currentStock,
        quantityAfter: d.currentStock,
        reason: "ADJUSTMENT",
        note: "Edited via product form",
      },
    });
  }

  await recomputeDailySummary(existing.branchId, new Date());
  revalidateAll();
  return { success: true, message: "Product updated." };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Product not found." };
  }
  // Sales and inventory logs keep their snapshot (productName) via SetNull.
  await prisma.product.delete({ where: { id } });
  await recomputeDailySummary(existing.branchId, new Date());
  revalidateAll();
  return { success: true, message: "Product deleted." };
}
