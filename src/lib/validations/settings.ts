import { z } from "zod";

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(80),
  currency: z.string().trim().min(1, "Currency is required").max(8),
  defaultLowStockThreshold: z.coerce
    .number()
    .int("Whole number only")
    .min(0, "Cannot be negative"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
