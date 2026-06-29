"use server";

import { prisma } from "@/lib/prisma";
import { saleSchema, type SaleInput } from "@/lib/validations/sale";
import { roundMoney } from "@/lib/currency";
import { parseDateInput } from "@/lib/dates";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

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

  try {
    await prisma.$transaction(async (tx) => {
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

      const unitSellingPrice = roundMoney(product.sellingPrice);
      const unitCostPrice = roundMoney(product.costPrice);
      const revenue = roundMoney(unitSellingPrice * d.quantity);
      const productCost = roundMoney(unitCostPrice * d.quantity);
      const grossProfit = roundMoney(revenue - productCost);

      const before = product.currentStock;
      const after = before - d.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: after },
      });

      await tx.sale.create({
        data: {
          branchId: product.branchId,
          productId: product.id,
          productName: product.name,
          quantity: d.quantity,
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
          quantityChange: -d.quantity,
          quantityAfter: after,
          reason: "SALE",
          note: null,
          createdAt: saleDate,
        },
      });
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record sale.",
    };
  }

  if (branchId) await recomputeDailySummary(branchId, saleDate);
  revalidateAll();
  return { success: true, message: "Sale recorded." };
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
