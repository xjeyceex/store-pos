import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(80),
  location: z.string().trim().max(120).optional().or(z.literal("")),
});

export type BranchInput = z.infer<typeof branchSchema>;
