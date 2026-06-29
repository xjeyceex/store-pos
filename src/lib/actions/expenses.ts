"use server";

import { prisma } from "@/lib/prisma";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expense";
import { roundMoney } from "@/lib/currency";
import { parseDateInput } from "@/lib/dates";
import { recomputeDailySummary } from "@/lib/queries/summaries";
import { getActiveBranchId } from "@/lib/queries/branches";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

const NO_BRANCH = "Select a specific branch before making changes.";

export async function createExpense(
  input: ExpenseInput
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
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
  const expenseDate = parseDateInput(d.date);

  await prisma.expense.create({
    data: {
      branchId,
      description: d.description,
      category: d.category,
      amount: roundMoney(d.amount),
      expenseDate,
    },
  });

  await recomputeDailySummary(branchId, expenseDate);
  revalidateAll();
  return { success: true, message: "Expense added." };
}

export async function updateExpense(
  id: string,
  input: ExpenseInput
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Expense not found." };
  }
  const expenseDate = parseDateInput(d.date);

  await prisma.expense.update({
    where: { id },
    data: {
      description: d.description,
      category: d.category,
      amount: roundMoney(d.amount),
      expenseDate,
    },
  });

  await recomputeDailySummary(existing.branchId, existing.expenseDate);
  if (existing.expenseDate.getTime() !== expenseDate.getTime()) {
    await recomputeDailySummary(existing.branchId, expenseDate);
  }
  revalidateAll();
  return { success: true, message: "Expense updated." };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Expense not found." };
  }
  await prisma.expense.delete({ where: { id } });
  await recomputeDailySummary(existing.branchId, existing.expenseDate);
  revalidateAll();
  return { success: true, message: "Expense deleted." };
}
