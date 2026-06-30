import { prisma } from "@/lib/prisma";
import type { BarcodeLookupResult } from "@/lib/barcode-meta";

const OFF_API = "https://world.openfoodfacts.org/api/v2/product";

/** Strip spaces and keep alphanumeric barcode characters. */
export function normalizeBarcode(raw: string): string | null {
  const code = raw.replace(/\s/g, "").trim();
  if (!code) return null;
  if (!/^[0-9A-Za-z-]{4,32}$/.test(code)) return null;
  return code;
}

/** UPC-A (12 digits) and EAN-13 (13 digits, often leading 0) are interchangeable. */
export function barcodeLookupVariants(barcode: string): string[] {
  const variants = new Set<string>([barcode]);
  if (/^\d{12}$/.test(barcode)) {
    variants.add(`0${barcode}`);
  }
  if (/^\d{13}$/.test(barcode) && barcode.startsWith("0")) {
    variants.add(barcode.slice(1));
  }
  return [...variants];
}

export async function getProductByBarcode(
  branchId: string,
  barcode: string
) {
  return prisma.product.findFirst({
    where: { branchId, barcode },
    include: { category: true },
  });
}

function mapLocalProduct(
  barcode: string,
  p: NonNullable<Awaited<ReturnType<typeof getProductByBarcode>>>
): BarcodeLookupResult {
  return {
    source: "local",
    barcode,
    name: p.name,
    categoryName: p.category?.name ?? null,
    productId: p.id,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    currentStock: p.currentStock,
  };
}

type OffProduct = {
  product_name?: string;
  product_name_en?: string;
  categories?: string;
  categories_tags?: string[];
};

function pickOffName(product: OffProduct): string | null {
  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    null;
  return name || null;
}

function pickOffCategory(product: OffProduct): string | null {
  if (product.categories) {
    const first = product.categories.split(",")[0]?.trim();
    if (first) return first;
  }
  const tag = product.categories_tags?.find(
    (t) => t.startsWith("en:") && !t.includes("undefined")
  );
  if (tag) {
    return tag
      .replace(/^en:/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  try {
    const res = await fetch(`${OFF_API}/${encodeURIComponent(barcode)}.json`, {
      headers: { "User-Agent": "SariSariStoreTracker/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      product?: OffProduct;
    };
    if (data.status !== 1 || !data.product) return null;
    const name = pickOffName(data.product);
    if (!name) return null;
    return {
      source: "openfoodfacts",
      barcode,
      name,
      categoryName: pickOffCategory(data.product),
      productId: null,
      costPrice: null,
      sellingPrice: null,
      currentStock: null,
    };
  } catch {
    return null;
  }
}

export async function lookupBarcode(
  branchId: string,
  rawCode: string
): Promise<BarcodeLookupResult> {
  const barcode = normalizeBarcode(rawCode);
  if (!barcode) {
    return {
      source: "not_found",
      barcode: rawCode.trim(),
      name: null,
      categoryName: null,
      productId: null,
      costPrice: null,
      sellingPrice: null,
      currentStock: null,
    };
  }

  for (const variant of barcodeLookupVariants(barcode)) {
    const match = await getProductByBarcode(branchId, variant);
    if (match) return mapLocalProduct(barcode, match);
  }

  const external = await lookupOpenFoodFacts(barcode);
  if (external) return external;

  return {
    source: "not_found",
    barcode,
    name: null,
    categoryName: null,
    productId: null,
    costPrice: null,
    sellingPrice: null,
    currentStock: null,
  };
}
