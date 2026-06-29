import { revalidatePath } from "next/cache";

const DATA_PATHS = [
  "/",
  "/products",
  "/inventory",
  "/inventory/history",
  "/sales",
  "/expenses",
  "/utang",
  "/reports",
  "/branches",
  "/settings",
];

/**
 * Revalidates all data-driven pages. The app is small, so a broad revalidation
 * after each mutation keeps every view (dashboard, tables, charts) consistent.
 */
export function revalidateAll(): void {
  for (const path of DATA_PATHS) {
    revalidatePath(path);
  }
}
