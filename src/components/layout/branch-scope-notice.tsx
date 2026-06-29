import { Layers, Building2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown on operational pages (products, sales, etc.) when the user is viewing
 * "All Branches". Those pages act on a single branch, so we ask the user to
 * pick one from the branch switcher. Also covers the "no branches yet" case.
 */
export function BranchScopeNotice({
  hasBranches = true,
}: {
  hasBranches?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {hasBranches ? (
          <Layers className="size-10 text-primary" />
        ) : (
          <Building2 className="size-10 text-primary" />
        )}
        {hasBranches ? (
          <>
            <h3 className="text-lg font-semibold">You&apos;re viewing all branches</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              The Dashboard and Reports consolidate every branch. To manage
              products, sales, expenses, or utang, pick a specific branch from
              the branch switcher at the top of the sidebar.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold">No branches yet</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Create your first branch from the Branches page to start tracking
              products, sales, expenses, and utang.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
