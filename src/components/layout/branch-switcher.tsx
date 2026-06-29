"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Layers } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveBranch } from "@/lib/actions/branches";
import { ALL_BRANCHES, type BranchOption } from "@/lib/branch-meta";
import { cn } from "@/lib/utils";

export function BranchSwitcher({
  branches,
  selected,
  className,
}: {
  branches: BranchOption[];
  selected: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      await setActiveBranch(value);
      router.refresh();
    });
  }

  const items = [
    { value: ALL_BRANCHES, label: "All Branches" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <Select
      value={selected}
      onValueChange={handleChange}
      disabled={isPending}
      items={items}
    >
      <SelectTrigger
        className={cn("h-9 w-full gap-2", isPending && "opacity-60", className)}
        aria-label="Active branch"
      >
        {selected === ALL_BRANCHES ? (
          <Layers className="size-4 shrink-0 text-primary" />
        ) : (
          <Building2 className="size-4 shrink-0 text-primary" />
        )}
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_BRANCHES}>All Branches</SelectItem>
        {branches.length > 0 ? <SelectSeparator /> : null}
        <SelectGroup>
          <SelectLabel>Branches</SelectLabel>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
