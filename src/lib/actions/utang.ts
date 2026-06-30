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
import { saleAsUtangSchema, type SaleAsUtangInput } from "@/lib/validations/sale";
import { getActiveBranchId } from "@/lib/queries/branches";
import type { ActionResult } from "@/lib/types";

async function refreshUtangStatus(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma,
  utangId: string
): Promise<void> {
  const utang = await tx.utang.findUnique({
    where: { id: utangId },
    include: { payments: true },
  });
  if (!utang) return;
  const totalPaid = utang.payments.reduce((s, p) => s + p.amount, 0);
  const status = computeUtangStatus(utang.amount, totalPaid);
  if (status !== utang.status) {
    await tx.utang.update({ where: { id: utangId }, data: { status } });
  }
}

type UtangLine = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

async function createUtangRecord(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    customerId: string;
    utangDate: Date;
    notes: string | null;
    lines: UtangLine[];
    initialPayment?: number;
  }
) {
  const customer = await tx.customer.findUnique({
    where: { id: params.customerId },
  });
  if (!customer) throw new Error("Customer not found.");

  const amount = roundMoney(params.lines.reduce((s, l) => s + l.lineTotal, 0));
  const initialPayment = roundMoney(params.initialPayment ?? 0);

  if (initialPayment > amount) {
    throw new Error("Cash received cannot exceed the total.");
  }

  const neededByProduct = new Map<string, number>();
  for (const l of params.lines) {
    if (l.productId) {
      neededByProduct.set(
        l.productId,
        (neededByProduct.get(l.productId) ?? 0) + l.quantity
      );
    }
  }

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
      customerId: params.customerId,
      amount,
      utangDate: params.utangDate,
      notes: params.notes,
      status: "UNPAID",
      items: {
        create: params.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

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
        createdAt: params.utangDate,
      },
    });
  }

  if (initialPayment > 0) {
    await tx.utangPayment.create({
      data: {
        utangId: utang.id,
        amount: initialPayment,
        paymentDate: params.utangDate,
      },
    });
    await refreshUtangStatus(tx, utang.id);
  }

  return { utang, branchId: customer.branchId };
}

async function refreshUtangStatusStandalone(utangId: string): Promise<void> {
  await refreshUtangStatus(prisma, utangId);
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

  let branchId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const { branchId: bid } = await createUtangRecord(tx, {
        customerId: d.customerId,
        utangDate,
        notes: d.notes || null,
        lines,
      });
      branchId = bid;
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
  await refreshUtangStatusStandalone(id);
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
  await refreshUtangStatusStandalone(d.utangId);
  revalidateAll();
  return { success: true, message: "Payment recorded." };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const payment = await prisma.utangPayment.findUnique({ where: { id } });
  if (!payment) {
    return { success: false, error: "Payment not found." };
  }
  await prisma.utangPayment.delete({ where: { id } });
  await refreshUtangStatusStandalone(payment.utangId);
  revalidateAll();
  return { success: true, message: "Payment deleted." };
}

async function findOrCreateCustomer(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  branchId: string,
  name: string
) {
  const trimmed = name.trim();
  const customers = await tx.customer.findMany({ where: { branchId } });
  const match = customers.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;
  return tx.customer.create({
    data: { branchId, name: trimmed },
  });
}

export async function recordSaleAsUtang(
  input: SaleAsUtangInput
): Promise<ActionResult<{ customerId: string }>> {
  const parsed = saleAsUtangSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const utangDate = parseDateInput(d.date);
  const cashReceived = roundMoney(d.cashReceived);

  const branchId = await getActiveBranchId();
  if (!branchId) {
    return { success: false, error: "Select a specific branch before making changes." };
  }

  let line: UtangLine;
  let total = 0;

  if (d.productId) {
    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product || product.branchId !== branchId) {
      return { success: false, error: "Product not found." };
    }
    const unitPrice = roundMoney(product.sellingPrice);
    total = roundMoney(unitPrice * d.quantity);
    line = {
      productId: product.id,
      name: product.name,
      quantity: d.quantity,
      unitPrice,
      lineTotal: total,
    };
  } else {
    const unitPrice = roundMoney(d.unitPrice!);
    total = roundMoney(unitPrice * d.quantity);
    line = {
      productId: null,
      name: d.name!.trim(),
      quantity: d.quantity,
      unitPrice,
      lineTotal: total,
    };
  }

  if (total <= 0) {
    return { success: false, error: "Total must be greater than zero." };
  }
  if (cashReceived >= total) {
    return {
      success: false,
      error: "Cash covers the total. Use Record Sale instead.",
    };
  }

  let customerId: string | null = null;
  let summaryBranchId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      let customer;
      if (d.customerId?.trim()) {
        customer = await tx.customer.findUnique({
          where: { id: d.customerId },
        });
        if (!customer || customer.branchId !== branchId) {
          throw new Error("Customer not found.");
        }
      } else {
        customer = await findOrCreateCustomer(tx, branchId, d.customerName!);
      }
      customerId = customer.id;

      const { branchId: bid } = await createUtangRecord(tx, {
        customerId: customer.id,
        utangDate,
        notes: cashReceived > 0 ? `Partial cash: ${cashReceived}` : null,
        lines: [line],
        initialPayment: cashReceived,
      });
      summaryBranchId = bid;
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record utang.",
    };
  }

  if (summaryBranchId) await recomputeDailySummary(summaryBranchId, utangDate);
  revalidateAll();
  return {
    success: true,
    message: "Utang recorded.",
    data: { customerId: customerId! },
  };
}
