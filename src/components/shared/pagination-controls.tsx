"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPaginationRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalItems === 0) return null;

  const { start, end } = getPaginationRange(page, pageSize, totalItems);
  const singlePage = totalPages <= 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-center text-xs text-muted-foreground sm:text-left">
        {singlePage
          ? `Showing all ${totalItems} ${totalItems === 1 ? "item" : "items"}`
          : `Showing ${start}–${end} of ${totalItems}`}
      </p>

      {!singlePage ? (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2.5"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="min-w-24 px-2 text-center text-sm tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2.5"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
