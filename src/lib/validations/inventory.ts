import { z } from "zod";
import { INVENTORY_REASON_VALUES } from "@/lib/constants";

export const inventoryMovementSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  // For "in"/"out" this is the quantity to add/remove.
  // For "set" (adjustment) this is the new absolute stock level.
  quantity: z.coerce.number().int("Whole number only").min(0, "Cannot be negative"),
  reason: z.enum(INVENTORY_REASON_VALUES),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
