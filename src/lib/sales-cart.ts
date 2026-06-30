import { roundMoney } from "@/lib/currency";
import type { SaleCartItemInput } from "@/lib/validations/sale";

export type CartLine = SaleCartItemInput & {
  key: string;
  /** Display fields — catalog lines mirror product at add time. */
  name: string;
  unitPrice: number;
};

export function cartLineTotal(line: Pick<CartLine, "unitPrice" | "quantity">) {
  return roundMoney(line.unitPrice * line.quantity);
}

export function cartTotal(lines: CartLine[]) {
  return roundMoney(lines.reduce((sum, line) => sum + cartLineTotal(line), 0));
}

export function mergeCartLine(cart: CartLine[], line: Omit<CartLine, "key">): CartLine[] {
  const idx = cart.findIndex(
    (c) =>
      (c.productId &&
        line.productId &&
        c.productId === line.productId) ||
      (!c.productId &&
        !line.productId &&
        c.name.toLowerCase() === line.name.toLowerCase() &&
        c.unitPrice === line.unitPrice)
  );

  if (idx >= 0) {
    const next = [...cart];
    next[idx] = {
      ...next[idx],
      quantity: next[idx].quantity + line.quantity,
    };
    return next;
  }

  return [...cart, { ...line, key: crypto.randomUUID() }];
}

export function toCartPayload(lines: CartLine[]) {
  return lines.map(({ productId, name, unitPrice, quantity }) =>
    productId
      ? { productId, quantity }
      : { name, unitPrice, quantity }
  );
}
