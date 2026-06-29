import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
