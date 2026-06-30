/** Client-safe barcode lookup result types. */
export type BarcodeLookupSource = "local" | "openfoodfacts" | "not_found";

export type BarcodeLookupResult = {
  source: BarcodeLookupSource;
  barcode: string;
  name: string | null;
  categoryName: string | null;
  /** Set when source is local. */
  productId: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  currentStock: number | null;
};
