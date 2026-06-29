"use server";

import { resolveDateRange, type DateRangePreset } from "@/lib/dates";
import { getReport, type ReportResult, type ReportType } from "@/lib/queries/reports";
import { getActiveBranchId } from "@/lib/queries/branches";

export async function fetchReport(input: {
  type: ReportType;
  preset: DateRangePreset;
  from?: string | null;
  to?: string | null;
}): Promise<ReportResult> {
  const range = resolveDateRange(input.preset, input.from ?? null, input.to ?? null);
  const branchId = await getActiveBranchId();
  return getReport(input.type, range, branchId);
}
