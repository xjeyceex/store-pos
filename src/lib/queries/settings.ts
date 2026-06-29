import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type StoreSettings = {
  id: number;
  storeName: string;
  currency: string;
  defaultLowStockThreshold: number;
};

/** Returns store settings, creating the default singleton row if missing. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) {
    return {
      id: existing.id,
      storeName: existing.storeName,
      currency: existing.currency,
      defaultLowStockThreshold: existing.defaultLowStockThreshold,
    };
  }
  const created = await prisma.settings.create({ data: { id: 1 } });
  return {
    id: created.id,
    storeName: created.storeName,
    currency: created.currency,
    defaultLowStockThreshold: created.defaultLowStockThreshold,
  };
});

/** Convenience: just the currency code (defaults to PHP). */
export const getCurrency = cache(async (): Promise<string> => {
  const settings = await getSettings();
  return settings.currency || "PHP";
});
