"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { branchSchema, type BranchInput } from "@/lib/validations/branch";
import { BRANCH_COOKIE, ALL_BRANCHES } from "@/lib/branch-meta";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persists the active branch (a branch id or "ALL") in a cookie. */
export async function setActiveBranch(value: string): Promise<void> {
  const store = await cookies();
  store.set(BRANCH_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function createBranch(
  input: BranchInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const branch = await prisma.branch.create({
    data: { name: d.name, location: d.location || null },
  });
  revalidateAll();
  return {
    success: true,
    message: "Branch added.",
    data: { id: branch.id },
  };
}

export async function updateBranch(
  id: string,
  input: BranchInput
): Promise<ActionResult> {
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Branch not found." };
  }
  await prisma.branch.update({
    where: { id },
    data: { name: d.name, location: d.location || null },
  });
  revalidateAll();
  return { success: true, message: "Branch updated." };
}

export async function deleteBranch(id: string): Promise<ActionResult> {
  const count = await prisma.branch.count();
  if (count <= 1) {
    return {
      success: false,
      error: "You must keep at least one branch.",
    };
  }
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Branch not found." };
  }
  // Cascades to all of this branch's products, sales, expenses, utang, etc.
  await prisma.branch.delete({ where: { id } });

  // If the deleted branch was the active one, reset the cookie so the app
  // falls back to another branch instead of an empty view.
  const store = await cookies();
  if (store.get(BRANCH_COOKIE)?.value === id) {
    store.set(BRANCH_COOKIE, ALL_BRANCHES, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }
  revalidateAll();
  return { success: true, message: "Branch and its data deleted." };
}
