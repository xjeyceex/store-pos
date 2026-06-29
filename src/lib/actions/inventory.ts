"use server";

import { prisma } from "@/lib/prisma";
import {
  inventoryMovementSchema,
  type InventoryMovementInput,
} from "@/lib/validations/inventory";
import { INVENTORY_REASONS } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

export async function createInventoryMovement(
  input: InventoryMovementInput
): Promise<ActionResult> {
  const parsed = inventoryMovementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const reasonMeta = INVENTORY_REASONS.find((r) => r.value === d.reason);
  if (!reasonMeta) {
    return { success: false, error: "Invalid reason." };
  }

  const product = await prisma.product.findUnique({
    where: { id: d.productId },
  });
  if (!product) {
    return { success: false, error: "Product not found." };
  }

  const before = product.currentStock;
  let after: number;
  let change: number;

  if (reasonMeta.direction === "in") {
    if (d.quantity <= 0) {
      return { success: false, error: "Quantity must be at least 1." };
    }
    change = d.quantity;
    after = before + d.quantity;
  } else if (reasonMeta.direction === "out") {
    if (d.quantity <= 0) {
      return { success: false, error: "Quantity must be at least 1." };
    }
    if (d.quantity > before) {
      return {
        success: false,
        error: `Cannot remove ${d.quantity}. Only ${before} in stock.`,
      };
    }
    change = -d.quantity;
    after = before - d.quantity;
  } else {
    // set / adjustment: quantity is the new absolute stock level
    after = d.quantity;
    change = after - before;
  }

  const movementDate = parseDateInput(d.date);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: after },
    });
    await tx.inventoryLog.create({
      data: {
        branchId: product.branchId,
        productId: product.id,
        productName: product.name,
        quantityBefore: before,
        quantityChange: change,
        quantityAfter: after,
        reason: d.reason,
        note: d.note || null,
        createdAt: movementDate,
      },
    });
  });

  await recomputeDailySummary(product.branchId, movementDate);
  revalidateAll();
  return { success: true, message: "Inventory updated." };
}
