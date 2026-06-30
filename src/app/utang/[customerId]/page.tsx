import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerDetailClient } from "@/components/utang/customer-detail-client";
import { getCustomerSummary, getCustomerUtangsPage } from "@/lib/queries/utang";
import { getProductOptions } from "@/lib/queries/products";
import { getCurrency } from "@/lib/queries/settings";
import { getActiveBranchId } from "@/lib/queries/branches";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const branchId = await getActiveBranchId();
  const [customer, initialUtangs, products, currency] = await Promise.all([
    getCustomerSummary(customerId),
    getCustomerUtangsPage(customerId, { page: 1 }),
    getProductOptions(branchId),
    getCurrency(),
  ]);

  if (!customer) notFound();

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        nativeButton={false}
        render={<Link href="/utang" />}
      >
        <ArrowLeft className="size-4" />
        Back to Utang
      </Button>
      <CustomerDetailClient
        customer={customer}
        initialUtangs={initialUtangs}
        products={products}
        currency={currency}
      />
    </div>
  );
}
