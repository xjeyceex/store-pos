import { z } from "zod";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/constants";

export const expenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(150),
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  amount: z.coerce.number().min(0.01, "Must be greater than 0"),
  date: z.string().optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
