"use server";

import { prisma } from "@/lib/prisma";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { revalidateAll } from "@/lib/revalidate";
import { fieldErrorsFromZod } from "@/lib/zod-helpers";
import type { ActionResult } from "@/lib/types";

export async function updateSettings(
  input: SettingsInput
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      storeName: d.storeName,
      currency: d.currency,
      defaultLowStockThreshold: d.defaultLowStockThreshold,
    },
    update: {
      storeName: d.storeName,
      currency: d.currency,
      defaultLowStockThreshold: d.defaultLowStockThreshold,
    },
  });
  revalidateAll();
  return { success: true, message: "Settings saved." };
}
