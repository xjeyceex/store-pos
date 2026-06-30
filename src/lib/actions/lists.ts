"use server";

import { getActiveBranchId } from "@/lib/queries/branches";
import { getProductsPage, searchProductOptions } from "@/lib/queries/products";
import { getSalesPage } from "@/lib/queries/sales";
import { getExpensesPage } from "@/lib/queries/expenses";
import {
  getCustomersPage,
  getCustomerSummary,
  getCustomerUtangsPage,
} from "@/lib/queries/utang";
import { getInventoryLogsPage } from "@/lib/queries/inventory";
import { getReportPage } from "@/lib/queries/reports";
import { getProductPerformanceSoldPage } from "@/lib/queries/analytics";
import { resolveDateRange, type DateRangePreset } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { ReportType } from "@/lib/reports-meta";

type PageParams = {
  page?: number;
  pageSize?: number;
  query?: string;
};

export async function fetchProductsPage(
  params: PageParams & { category?: string }
) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
  return getProductsPage(branchId, params);
}

export async function fetchSalesPage(params: PageParams) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
  return getSalesPage(branchId, params);
}

export async function fetchExpensesPage(
  params: PageParams & { category?: string }
) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
  return getExpensesPage(branchId, params);
}

export async function fetchCustomersPage(params: PageParams) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
  return getCustomersPage(branchId, params);
}

export async function fetchInventoryLogsPage(
  params: PageParams & { reason?: string }
) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
  return getInventoryLogsPage(branchId, params);
}

export async function fetchCustomerUtangsPage(
  customerId: string,
  params: PageParams
) {
  return getCustomerUtangsPage(customerId, params);
}

export async function fetchReportPage(input: {
  type: ReportType;
  preset: DateRangePreset;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const branchId = await getActiveBranchId();
  const range = resolveDateRange(input.preset, input.from ?? null, input.to ?? null);
  return getReportPage(input.type, range, branchId, {
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function fetchProductPerformancePage(input: {
  preset: DateRangePreset;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const branchId = await getActiveBranchId();
  const range = resolveDateRange(input.preset, input.from ?? null, input.to ?? null);
  return getProductPerformanceSoldPage(range, branchId, {
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function fetchProductOptionsSearch(query: string) {
  const branchId = await getActiveBranchId();
  if (!branchId) return [];
  return searchProductOptions(branchId, query);
}

export { getCustomerSummary };
