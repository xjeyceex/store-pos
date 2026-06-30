export const DEFAULT_PAGE_SIZE = 15;

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPaginationRange(
  page: number,
  pageSize: number,
  totalItems: number
): { start: number; end: number } {
  if (totalItems === 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return { start, end };
}

export function normalizePage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), totalPages);
}

export function buildPaginatedResult<T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = normalizePage(page, totalPages);
  return {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}

export function paginateSlice<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}
