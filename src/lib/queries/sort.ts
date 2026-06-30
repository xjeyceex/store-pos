/** Newest-first ordering for paginated lists (date field + createdAt tiebreaker). */
export const orderNewestSale = [
  { saleDate: "desc" as const },
  { createdAt: "desc" as const },
];

export const orderNewestExpense = [
  { expenseDate: "desc" as const },
  { createdAt: "desc" as const },
];

export const orderNewestUtang = [
  { utangDate: "desc" as const },
  { createdAt: "desc" as const },
];

export const orderNewestInventoryLog = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

export const orderNewestProduct = [
  { updatedAt: "desc" as const },
  { createdAt: "desc" as const },
];

export const orderNewestPayment = [
  { paymentDate: "desc" as const },
  { createdAt: "desc" as const },
];

export const orderNewestCustomer = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];
