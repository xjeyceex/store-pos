import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(100),
  categoryName: z.string().trim().max(50).optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0, "Must be 0 or more"),
  sellingPrice: z.coerce.number().min(0, "Must be 0 or more"),
  currentStock: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  minStockLevel: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productDefaults: ProductInput = {
  name: "",
  categoryName: "",
  costPrice: 0,
  sellingPrice: 0,
  currentStock: 0,
  minStockLevel: 5,
  notes: "",
};
