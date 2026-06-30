"use client";

import * as React from "react";
import { Check, ChevronDown, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { useDeferredFocus } from "@/components/shared/use-deferred-focus";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function SearchableCustomerSelect({
  customers,
  customerId,
  customerName,
  onCustomerChange,
  className,
  placeholder = "Pick or enter customer",
}: {
  customers: { id: string; name: string }[];
  customerId: string;
  customerName: string;
  onCustomerChange: (customerId: string, customerName: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = useDeferredFocus(open);

  const selected = customers.find((c) => c.id === customerId);
  const isNew = !customerId && Boolean(customerName.trim());
  const q = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, q]);

  const exactMatch = customers.some(
    (c) => c.name.toLowerCase() === q && q.length > 0
  );
  const showNewOption = q.length > 0 && !exactMatch;

  const triggerLabel = selected
    ? selected.name
    : isNew
      ? customerName
      : placeholder;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function selectExisting(id: string, name: string) {
    onCustomerChange(id, name);
    setOpen(false);
    setQuery("");
  }

  function selectNew(name: string) {
    onCustomerChange("", name.trim());
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
              !selected && !isNew && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">{triggerLabel}</span>
          {isNew ? (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              New
            </span>
          ) : null}
        </span>
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
            placeholder="Search customers..."
          />
        </div>

        <div
          className="max-h-60 overflow-y-auto p-1"
          role="listbox"
          aria-label="Customers"
        >
          {filtered.length === 0 && !showNewOption ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No customers yet. Type a name below to add one.
            </p>
          ) : (
            filtered.map((c) => (
              <CustomerRow
                key={c.id}
                selected={customerId === c.id}
                onClick={() => selectExisting(c.id, c.name)}
              >
                {c.name}
              </CustomerRow>
            ))
          )}

          {showNewOption ? (
            <CustomerRow
              selected={isNew && customerName.toLowerCase() === q}
              onClick={() => selectNew(query)}
            >
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                Add &ldquo;{query.trim()}&rdquo; as new customer
              </span>
            </CustomerRow>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CustomerRow({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none",
        selected && "bg-accent text-accent-foreground",
        !selected && "hover:bg-muted"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}
