"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { useDeferredFocus } from "@/components/shared/use-deferred-focus";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchProductOptionsSearch } from "@/lib/actions/lists";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ProductOption } from "@/lib/queries/products";

export const CUSTOM_ITEM = "__custom__";

export function SearchableItemSelect({
  products: initialProducts,
  currency,
  value,
  onValueChange,
  className,
  placeholder = "Search or select item",
}: {
  products: ProductOption[];
  currency: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState(initialProducts);
  const [searching, setSearching] = React.useState(false);
  const searchRef = useDeferredFocus(open);

  const selected =
    options.find((p) => p.id === value) ??
    initialProducts.find((p) => p.id === value);
  const isCustom = !value;
  const selectedLabel = isCustom
    ? "Custom item (new)"
    : (selected?.name ?? placeholder);

  React.useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (!q) {
      setOptions(initialProducts);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await fetchProductOptionsSearch(q);
        setOptions(results);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [open, query, initialProducts]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setOptions(initialProducts);
      setSearching(false);
    }
  }

  function handleSelect(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 w-full justify-between px-3 font-normal",
              !selected && isCustom && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--anchor-width) gap-0 p-0"
        sideOffset={4}
      >
        <div className="border-b p-2">
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or barcode..."
          />
        </div>

        <div
          className="max-h-60 overflow-y-auto p-1"
          role="listbox"
          aria-label="Items"
        >
          <OptionRow
            selected={isCustom}
            onClick={() => handleSelect(CUSTOM_ITEM)}
          >
            Custom item (new)
          </OptionRow>

          {searching && query.trim() ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No items match your search.
            </p>
          ) : (
            options.map((p) => {
              const outOfStock = p.currentStock <= 0;
              return (
                <OptionRow
                  key={p.id}
                  selected={value === p.id}
                  disabled={outOfStock}
                  onClick={() => handleSelect(p.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(p.sellingPrice, currency)} ·{" "}
                    {formatNumber(p.currentStock)} left
                  </span>
                </OptionRow>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({
  children,
  selected,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none",
        selected && "bg-accent text-accent-foreground",
        !selected && !disabled && "hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
        {children}
      </span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}
