import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {
  BRANCH_COOKIE,
  ALL_BRANCHES,
  type BranchOption,
} from "@/lib/branch-meta";

// Re-export the client-safe constants/types so existing server-side imports
// from this module keep working.
export { BRANCH_COOKIE, ALL_BRANCHES };
export type { BranchOption };

export type BranchContext = {
  branches: BranchOption[];
  /** "all" = consolidated view; "single" = one active branch. */
  mode: "all" | "single";
  /** The resolved active branch id. `null` when consolidated, or when no
   * branches exist yet. */
  branchId: string | null;
  branchName: string | null;
  /** The raw cookie value used by the switcher ("ALL" or a branch id). */
  selected: string;
};

export async function getBranches(): Promise<BranchOption[]> {
  return prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, location: true },
  });
}

/**
 * Resolves the active branch from the cookie. Falls back to the first branch
 * when the cookie is missing or points at a deleted branch.
 */
export async function getBranchContext(): Promise<BranchContext> {
  const branches = await getBranches();
  const store = await cookies();
  const raw = store.get(BRANCH_COOKIE)?.value;

  if (raw === ALL_BRANCHES) {
    return {
      branches,
      mode: "all",
      branchId: null,
      branchName: null,
      selected: ALL_BRANCHES,
    };
  }

  const matched = raw ? branches.find((b) => b.id === raw) : undefined;
  const active = matched ?? branches[0];
  return {
    branches,
    mode: "single",
    branchId: active?.id ?? null,
    branchName: active?.name ?? null,
    selected: active?.id ?? ALL_BRANCHES,
  };
}

/** The single active branch id, or `null` when consolidated / none exist. */
export async function getActiveBranchId(): Promise<string | null> {
  const ctx = await getBranchContext();
  return ctx.mode === "single" ? ctx.branchId : null;
}
