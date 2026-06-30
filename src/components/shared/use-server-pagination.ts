"use client";

import * as React from "react";

import type { PaginatedResult } from "@/lib/pagination";

export function useServerPagination<T>(
  initial: PaginatedResult<T>,
  loadPage: (params: {
    page: number;
    query: string;
  }) => Promise<PaginatedResult<T>>,
  debounceMs = 300
) {
  return useServerPaginationWithFilters(initial, loadPage, {}, debounceMs);
}

export function useServerPaginationWithFilters<T, F extends object>(
  initial: PaginatedResult<T>,
  loadPage: (params: { page: number; query: string } & F) => Promise<PaginatedResult<T>>,
  filters: F,
  debounceMs = 300
) {
  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState(initial);
  const [isPending, startTransition] = React.useTransition();
  const skipSearchEffect = React.useRef(true);

  const filterKey = JSON.stringify(filters);
  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;

  const loadPageRef = React.useRef(loadPage);
  loadPageRef.current = loadPage;

  const fetchPage = React.useCallback((page: number, nextQuery: string) => {
    startTransition(async () => {
      const result = await loadPageRef.current({
        page,
        query: nextQuery,
        ...filtersRef.current,
      });
      setData(result);
    });
  }, []);

  // Refetch page 1 when search query or filter values change (not on every render).
  React.useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    const timer = window.setTimeout(() => fetchPage(1, query), debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, filterKey, debounceMs, fetchPage]);

  const setPage = React.useCallback(
    (page: number) => fetchPage(page, query),
    [fetchPage, query]
  );

  const reloadFirstPage = React.useCallback(() => {
    fetchPage(1, query);
  }, [fetchPage, query]);

  const initialSignature = React.useMemo(
    () =>
      `${initial.page}:${initial.totalItems}:${initial.items
        .map((item) => JSON.stringify(item))
        .join("|")}`,
    [initial]
  );

  // Adopt refreshed server data when viewing page 1 (e.g. after router.refresh).
  React.useEffect(() => {
    if (data.page !== 1) return;
    setData((current) => {
      if (initial.page !== 1) return current;
      const currentSig = `${current.page}:${current.totalItems}:${current.items
        .map((item) => JSON.stringify(item))
        .join("|")}`;
      if (currentSig === initialSignature) return current;
      return initial;
    });
  }, [initial, initialSignature, data.page]);

  return {
    items: data.items,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages,
    totalItems: data.totalItems,
    query,
    setQuery,
    setPage,
    setData,
    reloadFirstPage,
    isPending,
  };
}
