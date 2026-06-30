"use client";

import * as React from "react";
import { Store, Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import type { BranchOption } from "@/lib/branch-meta";

export function MobileNav({
  storeName,
  branches,
  selectedBranch,
}: {
  storeName: string;
  branches: BranchOption[];
  selectedBranch: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="safe-top sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Open menu"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Store className="size-5 text-primary" />
              <span className="truncate">{storeName}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="border-b p-3">
            <BranchSwitcher branches={branches} selected={selectedBranch} />
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
        <Store className="size-5 shrink-0 text-primary" />
        <span className="truncate">{storeName}</span>
      </div>
    </header>
  );
}
