// Client-safe report metadata and types (no Prisma imports), so client
// components can use them without pulling the database client into the bundle.

export type ReportType =
  | "DAILY_SALES"
  | "WEEKLY_SALES"
  | "MONTHLY_SALES"
  | "PROFIT"
  | "EXPENSE"
  | "INVENTORY"
  | "UTANG";

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "DAILY_SALES", label: "Daily Sales Report" },
  { value: "WEEKLY_SALES", label: "Weekly Sales Report" },
  { value: "MONTHLY_SALES", label: "Monthly Sales Report" },
  { value: "PROFIT", label: "Profit Report" },
  { value: "EXPENSE", label: "Expense Report" },
  { value: "INVENTORY", label: "Inventory Report" },
  { value: "UTANG", label: "Utang Report" },
];

export type ColumnType = "text" | "number" | "currency" | "date";

export type ReportColumn = {
  key: string;
  header: string;
  type: ColumnType;
};

export type ReportRow = Record<string, string | number>;

export type ReportResult = {
  type: ReportType;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals: ReportRow | null;
};
