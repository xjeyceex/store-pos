import type { UtangStatus } from "./constants";

export function computeUtangStatus(
  amount: number,
  totalPaid: number
): UtangStatus {
  if (totalPaid <= 0) return "UNPAID";
  if (totalPaid + 0.0001 >= amount) return "PAID";
  return "PARTIALLY_PAID";
}
