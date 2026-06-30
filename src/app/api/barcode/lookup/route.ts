import { NextResponse } from "next/server";

import { lookupBarcode } from "@/lib/barcode-lookup";
import { getActiveBranchId } from "@/lib/queries/branches";

export async function GET(request: Request) {
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return NextResponse.json(
      { error: "Select a specific branch before scanning." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  if (!code.trim()) {
    return NextResponse.json({ error: "Missing barcode." }, { status: 400 });
  }

  const result = await lookupBarcode(branchId, code);
  return NextResponse.json(result);
}
