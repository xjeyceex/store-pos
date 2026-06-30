import { Store } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import type { BranchOption } from "@/lib/branch-meta";

export function AppShell({
  storeName,
  branches,
  selectedBranch,
  children,
}: {
  storeName: string;
  branches: BranchOption[];
  selectedBranch: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <Store className="size-5 text-primary" />
          <span className="truncate">{storeName}</span>
        </div>
        <div className="border-b p-3">
          <BranchSwitcher branches={branches} selected={selectedBranch} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          Sari-Sari Store Tracker
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col safe-x md:pl-60">
        <MobileNav
          storeName={storeName}
          branches={branches}
          selectedBranch={selectedBranch}
        />
        <main className="safe-bottom flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
