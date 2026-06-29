"use server";

import { prisma } from "@/lib/prisma";
import { saleSchema, type SaleInput } from "@/lib/validations/sale";
import { roundMoney } from "@/lib/currency";
import { parseDateInput } from "@/lib/dates";
import { getActiveBranchId } from "@/lib/queries/branches";
import { getSettings } from "@/lib/queries/settings";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";
import type { Product } from "@/generated/prisma/client";

const NO_BRANCH = "Select a specific branch before making changes.";

async function resolveProductForSale(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  d: SaleInput,
  branchId: string
): Promise<{ product: Product; created: boolean }> {
  if (d.productId) {
    const product = await tx.product.findUnique({ where: { id: d.productId } });
    if (!product) throw new Error("Product not found.");
    if (product.branchId !== branchId) throw new Error("Product not found.");
    return { product, created: false };
  }

  const name = d.name!.trim();
  const sellingPrice = roundMoney(d.unitPrice!);
  const branchProducts = await tx.product.findMany({
    where: { branchId },
    select: { id: true, name: true },
  });
  const match = branchProducts.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (match) {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: match.id },
    });
    return { product, created: false };
  }

  const settings = await getSettings();
  const product = await tx.product.create({
    data: {
      branchId,
      name,
      costPrice: 0,
      sellingPrice,
      currentStock: d.quantity,
      minStockLevel: settings.defaultLowStockThreshold,
    },
  });

  await tx.inventoryLog.create({
    data: {
      branchId,
      productId: product.id,
      productName: product.name,
      quantityBefore: 0,
      quantityChange: d.quantity,
      quantityAfter: d.quantity,
      reason: "NEW_STOCK",
      note: "Added from quick sale",
    },
  });

  return { product, created: true };
}

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const saleDate = parseDateInput(d.date);
  let branchId: string | null = null;
  let productCreated = false;

  try {
    await prisma.$transaction(async (tx) => {
      if (d.productId) {
        const product = await tx.product.findUnique({
          where: { id: d.productId },
        });
        if (!product) throw new Error("Product not found.");
        branchId = product.branchId;

        if (product.currentStock < d.quantity) {
          throw new Error(
            `Not enough stock. Only ${product.currentStock} of ${product.name} left.`
          );
        }

        await recordSale(tx, product, d.quantity, saleDate);
        return;
      }

      branchId = await getActiveBranchId();
      if (!branchId) throw new Error(NO_BRANCH);

      const resolved = await resolveProductForSale(tx, d, branchId);
      productCreated = resolved.created;
      const { product } = resolved;

      if (!resolved.created && product.currentStock < d.quantity) {
        throw new Error(
          `Not enough stock. Only ${product.currentStock} of ${product.name} left.`
        );
      }

      await recordSale(tx, product, d.quantity, saleDate);
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record sale.",
    };
  }

  if (branchId) await recomputeDailySummary(branchId, saleDate);
  revalidateAll();
  return {
    success: true,
    message: productCreated
      ? "Sale recorded and product added to catalog."
      : "Sale recorded.",
  };
}

async function recordSale(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  product: Product,
  quantity: number,
  saleDate: Date
) {
  const unitSellingPrice = roundMoney(product.sellingPrice);
  const unitCostPrice = roundMoney(product.costPrice);
  const revenue = roundMoney(unitSellingPrice * quantity);
  const productCost = roundMoney(unitCostPrice * quantity);
  const grossProfit = roundMoney(revenue - productCost);

  const before = product.currentStock;
  const after = before - quantity;

  await tx.product.update({
    where: { id: product.id },
    data: { currentStock: after },
  });

  await tx.sale.create({
    data: {
      branchId: product.branchId,
      productId: product.id,
      productName: product.name,
      quantity,
      unitSellingPrice,
      unitCostPrice,
      revenue,
      productCost,
      grossProfit,
      saleDate,
    },
  });

  await tx.inventoryLog.create({
    data: {
      branchId: product.branchId,
      productId: product.id,
      productName: product.name,
      quantityBefore: before,
      quantityChange: -quantity,
      quantityAfter: after,
      reason: "SALE",
      note: null,
      createdAt: saleDate,
    },
  });
}

export async function deleteSale(id: string): Promise<ActionResult> {
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) {
    return { success: false, error: "Sale not found." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Restore stock if the product still exists.
      if (sale.productId) {
        const product = await tx.product.findUnique({
          where: { id: sale.productId },
        });
        if (product) {
          const before = product.currentStock;
          const after = before + sale.quantity;
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: after },
          });
          await tx.inventoryLog.create({
            data: {
              branchId: sale.branchId,
              productId: product.id,
              productName: product.name,
              quantityBefore: before,
              quantityChange: sale.quantity,
              quantityAfter: after,
              reason: "RETURN",
              note: "Sale deleted",
            },
          });
        }
      }
      await tx.sale.delete({ where: { id } });
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete sale.",
    };
  }

  await recomputeDailySummary(sale.branchId, sale.saleDate);
  revalidateAll();
  return { success: true, message: "Sale deleted and stock restored." };
}
