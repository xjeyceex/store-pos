import type { BarcodeLookupResult } from "@/lib/barcode-meta";

export async function fetchBarcodeLookup(
  code: string
): Promise<BarcodeLookupResult | { error: string }> {
  const res = await fetch(
    `/api/barcode/lookup?code=${encodeURIComponent(code)}`
  );
  const data = (await res.json()) as BarcodeLookupResult | { error?: string };
  if (!res.ok) {
    return { error: (data as { error?: string }).error ?? "Lookup failed." };
  }
  return data as BarcodeLookupResult;
}
