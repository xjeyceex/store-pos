import { z } from "zod";

export const saleSchema = z
  .object({
    productId: z.string().optional().or(z.literal("")),
    name: z.string().trim().max(100).optional().or(z.literal("")),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative").optional(),
    quantity: z.coerce.number().int("Whole number only").min(1, "At least 1"),
    date: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.productId) return;
    if (!data.name?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Item name is required",
        path: ["name"],
      });
    }
    if (data.unitPrice == null || Number.isNaN(data.unitPrice)) {
      ctx.addIssue({
        code: "custom",
        message: "Price is required",
        path: ["unitPrice"],
      });
    }
  });

export type SaleInput = z.infer<typeof saleSchema>;
