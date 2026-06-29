"use server";

import { prisma } from "@/lib/prisma";
import {
  utangSchema,
  utangUpdateSchema,
  utangPaymentSchema,
  type UtangInput,
  type UtangUpdateInput,
  type UtangPaymentInput,
} from "@/lib/validations/utang";
import { roundMoney } from "@/lib/currency";
import { parseDateInput } from "@/lib/dates";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import { computeUtangStatus } from "@/lib/utang-status";
import type { ActionResult } from "@/lib/types";

async function refreshUtangStatus(utangId: string): Promise<void> {
  const utang = await prisma.utang.findUnique({
    where: { id: utangId },
    include: { payments: true },
  });
  if (!utang) return;
  const totalPaid = utang.payments.reduce((s, p) => s + p.amount, 0);
  const status = computeUtangStatus(utang.amount, totalPaid);
  if (status !== utang.status) {
    await prisma.utang.update({ where: { id: utangId }, data: { status } });
  }
}

export async function createUtang(input: UtangInput): Promise<ActionResult> {
  const parsed = utangSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const utangDate = parseDateInput(d.date);

  const lines = d.items.map((it) => {
    const productId = it.productId ? it.productId : null;
    const unitPrice = roundMoney(it.unitPrice);
    return {
      productId,
      name: it.name,
      quantity: it.quantity,
      unitPrice,
      lineTotal: roundMoney(unitPrice * it.quantity),
    };
  });
  const amount = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));

  // Total quantity needed per catalog product (a product may appear twice).
  const neededByProduct = new Map<string, number>();
  for (const l of lines) {
    if (l.productId) {
      neededByProduct.set(
        l.productId,
        (neededByProduct.get(l.productId) ?? 0) + l.quantity
      );
    }
  }

  let branchId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: d.customerId },
      });
      if (!customer) throw new Error("Customer not found.");
      branchId = customer.branchId;

      // Validate stock for every catalog product up front.
      for (const [productId, needed] of neededByProduct) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("A selected product no longer exists.");
        if (product.currentStock < needed) {
          throw new Error(
            `Not enough stock. Only ${product.currentStock} of ${product.name} left.`
          );
        }
      }

      const utang = await tx.utang.create({
        data: {
          branchId: customer.branchId,
          customerId: d.customerId,
          amount,
          utangDate,
          notes: d.notes || null,
          status: "UNPAID",
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      // Reduce stock once per product and log the movement.
      for (const [productId, needed] of neededByProduct) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) continue;
        const before = product.currentStock;
        const after = before - needed;
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: after },
        });
        await tx.inventoryLog.create({
          data: {
            branchId: customer.branchId,
            productId,
            productName: product.name,
            quantityBefore: before,
            quantityChange: -needed,
            quantityAfter: after,
            reason: "UTANG",
            note: `Utang: ${customer.name}`,
            createdAt: utangDate,
          },
        });
      }

      return utang;
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add utang.",
    };
  }

  if (branchId) await recomputeDailySummary(branchId, utangDate);
  revalidateAll();
  return { success: true, message: "Utang added." };
}

export async function updateUtang(
  id: string,
  input: UtangUpdateInput
): Promise<ActionResult> {
  const parsed = utangUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const existing = await prisma.utang.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Utang not found." };
  }
  await prisma.utang.update({
    where: { id },
    data: {
      customerId: d.customerId,
      utangDate: parseDateInput(d.date),
      notes: d.notes || null,
    },
  });
  await refreshUtangStatus(id);
  revalidateAll();
  return { success: true, message: "Utang updated." };
}

export async function deleteUtang(id: string): Promise<ActionResult> {
  const existing = await prisma.utang.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    return { success: false, error: "Utang not found." };
  }

  // Restore stock for any catalog items before deleting.
  const restoreByProduct = new Map<string, number>();
  for (const it of existing.items) {
    if (it.productId) {
      restoreByProduct.set(
        it.productId,
        (restoreByProduct.get(it.productId) ?? 0) + it.quantity
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [productId, qty] of restoreByProduct) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) continue;
        const before = product.currentStock;
        const after = before + qty;
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: after },
        });
        await tx.inventoryLog.create({
          data: {
            branchId: existing.branchId,
            productId,
            productName: product.name,
            quantityBefore: before,
            quantityChange: qty,
            quantityAfter: after,
            reason: "RETURN",
            note: "Utang deleted",
          },
        });
      }
      await tx.utang.delete({ where: { id } });
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete utang.",
    };
  }

  await recomputeDailySummary(existing.branchId, existing.utangDate);
  revalidateAll();
  return { success: true, message: "Utang deleted and stock restored." };
}

export async function recordPayment(
  input: UtangPaymentInput
): Promise<ActionResult> {
  const parsed = utangPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const utang = await prisma.utang.findUnique({
    where: { id: d.utangId },
    include: { payments: true },
  });
  if (!utang) {
    return { success: false, error: "Utang not found." };
  }
  const totalPaid = utang.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = roundMoney(utang.amount - totalPaid);
  if (remaining <= 0) {
    return { success: false, error: "This utang is already fully paid." };
  }

  await prisma.utangPayment.create({
    data: {
      utangId: d.utangId,
      amount: roundMoney(d.amount),
      paymentDate: parseDateInput(d.date),
    },
  });
  await refreshUtangStatus(d.utangId);
  revalidateAll();
  return { success: true, message: "Payment recorded." };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const payment = await prisma.utangPayment.findUnique({ where: { id } });
  if (!payment) {
    return { success: false, error: "Payment not found." };
  }
  await prisma.utangPayment.delete({ where: { id } });
  await refreshUtangStatus(payment.utangId);
  revalidateAll();
  return { success: true, message: "Payment deleted." };
}
