"use server";

import { prisma } from "@/lib/prisma";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { getActiveBranchId } from "@/lib/queries/branches";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

const NO_BRANCH = "Select a specific branch before making changes.";

export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerSchema.safeParse(input);
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
  const customer = await prisma.customer.create({
    data: {
      branchId,
      name: d.name,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  revalidateAll();
  return { success: true, message: "Customer added.", data: { id: customer.id } };
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Customer not found." };
  }
  await prisma.customer.update({
    where: { id },
    data: {
      name: d.name,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  revalidateAll();
  return { success: true, message: "Customer updated." };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Customer not found." };
  }
  // Cascades to utang and payments per schema.
  await prisma.customer.delete({ where: { id } });
  revalidateAll();
  return { success: true, message: "Customer deleted." };
}
