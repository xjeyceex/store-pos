import type { BarcodeLookupResult } from "@/lib/barcode-meta";

export async function fetchBarcodeLookup(
  code: string
): Promise<BarcodeLookupResult | { error: string }> {
  const res = await fetch(
    `/api/barcode/lookup?code=${encodeURIComponent(code)}`
  );

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      error:
        "Barcode lookup failed. Refresh the page and try again — the server returned an unexpected response.",
    };
  }

  let data: BarcodeLookupResult | { error?: string };
  try {
    data = (await res.json()) as BarcodeLookupResult | { error?: string };
  } catch {
    return { error: "Barcode lookup failed. Could not read the server response." };
  }

  if (!res.ok) {
    const message =
      "error" in data && data.error ? data.error : "Lookup failed.";
    return { error: message };
  }
  return data as BarcodeLookupResult;
}
