import { z } from "zod";

export const saleSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().int("Whole number only").min(1, "At least 1"),
  date: z.string().optional().or(z.literal("")),
});

export type SaleInput = z.infer<typeof saleSchema>;
