// Client-safe branch constants and types. Kept separate from
// `queries/branches.ts` (which imports `next/headers` + Prisma) so client
// components can use these without pulling server-only code into the bundle.

export const BRANCH_COOKIE = "branchId";
export const ALL_BRANCHES = "ALL";

export type BranchOption = {
  id: string;
  name: string;
  location: string | null;
};
