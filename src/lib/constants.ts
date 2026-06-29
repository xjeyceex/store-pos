import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Receipt,
  HandCoins,
  BarChart3,
  Building2,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export const APP_NAME = "Sari-Sari Store Tracker";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Products", href: "/products", icon: Package },
  { title: "Inventory", href: "/inventory", icon: Warehouse },
  { title: "Sales", href: "/sales", icon: ShoppingCart },
  { title: "Expenses", href: "/expenses", icon: Receipt },
  { title: "Utang", href: "/utang", icon: HandCoins },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Branches", href: "/branches", icon: Building2 },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
];

// ----- Expense categories -----
export const EXPENSE_CATEGORIES = [
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WATER", label: "Water" },
  { value: "INTERNET", label: "Internet" },
  { value: "RENT", label: "Rent" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map(
  (c) => c.value
) as [ExpenseCategory, ...ExpenseCategory[]];

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// ----- Inventory movement reasons -----
export type MovementDirection = "in" | "out" | "set";

// `system: true` reasons are generated automatically by sales/utang flows and
// are not selectable in the manual inventory forms (but still show in history).
export const INVENTORY_REASONS = [
  { value: "NEW_STOCK", label: "New Stock", direction: "in", system: false },
  { value: "RETURN", label: "Return", direction: "in", system: false },
  { value: "SALE", label: "Sale", direction: "out", system: true },
  { value: "UTANG", label: "Utang", direction: "out", system: true },
  { value: "DAMAGE", label: "Damage", direction: "out", system: false },
  { value: "PERSONAL_USE", label: "Personal Use", direction: "out", system: false },
  { value: "ADJUSTMENT", label: "Adjustment", direction: "set", system: false },
] as const;

export type InventoryReason = (typeof INVENTORY_REASONS)[number]["value"];

export const INVENTORY_REASON_VALUES = INVENTORY_REASONS.map(
  (r) => r.value
) as [InventoryReason, ...InventoryReason[]];

export function inventoryReasonLabel(value: string): string {
  return INVENTORY_REASONS.find((r) => r.value === value)?.label ?? value;
}

/** Reasons a user can pick manually for a given direction (excludes system reasons). */
export function reasonsForDirection(direction: MovementDirection) {
  return INVENTORY_REASONS.filter((r) => r.direction === direction && !r.system);
}

// ----- Inventory actions (UI grouping) -----
export const INVENTORY_ACTIONS = [
  { value: "in", label: "Stock In" },
  { value: "out", label: "Stock Out" },
  { value: "set", label: "Adjustment" },
] as const;

// ----- Utang statuses -----
export const UTANG_STATUSES = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
] as const;

export type UtangStatus = (typeof UTANG_STATUSES)[number]["value"];

export function utangStatusLabel(value: string): string {
  return UTANG_STATUSES.find((s) => s.value === value)?.label ?? value;
}

// ----- Stock status -----
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};
