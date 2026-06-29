"use client";

import { Building2, ChevronDown, Layers } from "lucide-react";

import { ALL_BRANCHES, type BranchOption } from "@/lib/branch-meta";
import { cn } from "@/lib/utils";

/** Form POST branch switch — works without JS fetch (reliable on LAN/mobile). */
export function BranchSwitcher({
  branches,
  selected,
  className,
}: {
  branches: BranchOption[];
  selected: string;
  className?: string;
}) {
  return (
    <form
      action="/api/branch"
      method="POST"
      className={cn("relative min-w-0", className)}
    >
      {selected === ALL_BRANCHES ? (
        <Layers className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-primary" />
      ) : (
        <Building2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-primary" />
      )}
      <select
        name="branchId"
        defaultValue={selected}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Active branch"
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background py-2 pr-8 pl-9 text-sm shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <option value={ALL_BRANCHES}>All Branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </form>
  );
}
