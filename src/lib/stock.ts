import type { StockStatus } from "./constants";
import { roundMoney } from "./currency";
import type { ProductComputed } from "./types";

export function getStockStatus(
  currentStock: number,
  minStockLevel: number
): StockStatus {
  if (currentStock <= 0) return "OUT_OF_STOCK";
  if (currentStock <= minStockLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

export function computeProduct(p: {
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
}): ProductComputed {
  return {
    profitPerItem: roundMoney(p.sellingPrice - p.costPrice),
    inventoryValue: roundMoney(p.currentStock * p.costPrice),
    stockStatus: getStockStatus(p.currentStock, p.minStockLevel),
  };
}
