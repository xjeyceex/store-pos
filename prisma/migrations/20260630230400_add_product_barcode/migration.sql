-- AlterTable
ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_branchId_barcode_key" ON "Product"("branchId", "barcode");
