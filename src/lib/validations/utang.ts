import { z } from "zod";

export const utangItemSchema = z.object({
  // Empty string => custom (non-catalog) item, which does not affect stock.
  productId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Item name is required").max(120),
  quantity: z.coerce.number().int("Whole number only").min(1, "Qty must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
});

export type UtangItemInput = z.infer<typeof utangItemSchema>;

export const utangSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  items: z.array(utangItemSchema).min(1, "Add at least one item"),
});

export type UtangInput = z.infer<typeof utangSchema>;

/** Editing an existing utang only changes its metadata, not its items/stock. */
export const utangUpdateSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type UtangUpdateInput = z.infer<typeof utangUpdateSchema>;

export const utangPaymentSchema = z.object({
  utangId: z.string().min(1, "Missing utang"),
  amount: z.coerce.number().min(0.01, "Must be greater than 0"),
  date: z.string().optional().or(z.literal("")),
});

export type UtangPaymentInput = z.infer<typeof utangPaymentSchema>;
