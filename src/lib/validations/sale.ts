import { z } from "zod";

const saleItemRefine = (
  data: {
    productId?: string;
    name?: string;
    unitPrice?: number;
  },
  ctx: z.RefinementCtx
) => {
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
};

export const saleSchema = z
  .object({
    productId: z.string().optional().or(z.literal("")),
    name: z.string().trim().max(100).optional().or(z.literal("")),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative").optional(),
    quantity: z.coerce.number().int("Whole number only").min(1, "At least 1"),
    date: z.string().optional().or(z.literal("")),
  })
  .superRefine(saleItemRefine);

export type SaleInput = z.infer<typeof saleSchema>;

export const saleCartItemSchema = z
  .object({
    productId: z.string().optional().or(z.literal("")),
    name: z.string().trim().max(100).optional().or(z.literal("")),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative").optional(),
    quantity: z.coerce.number().int("Whole number only").min(1, "At least 1"),
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

export type SaleCartItemInput = z.infer<typeof saleCartItemSchema>;

export const saleCartSchema = z.object({
  date: z.string().optional().or(z.literal("")),
  items: z.array(saleCartItemSchema).min(1, "Add at least one item"),
});

export type SaleCartInput = z.infer<typeof saleCartSchema>;

export const saleAsUtangSchema = z
  .object({
    date: z.string().optional().or(z.literal("")),
    items: z.array(saleCartItemSchema).min(1, "Add at least one item"),
    customerId: z.string().optional().or(z.literal("")),
    customerName: z.string().trim().max(100).optional().or(z.literal("")),
    cashReceived: z.coerce.number().min(0),
  })
  .superRefine((data, ctx) => {
    const hasId = Boolean(data.customerId?.trim());
    const hasName = Boolean(data.customerName?.trim());
    if (!hasId && !hasName) {
      ctx.addIssue({
        code: "custom",
        message: "Select or enter a customer",
        path: ["customerName"],
      });
    }
  });

export type SaleAsUtangInput = z.infer<typeof saleAsUtangSchema>;
