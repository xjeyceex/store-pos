/*
  Warnings:

  - Added the required column `branchId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `DailySummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `InventoryLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Utang` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "id", "name", "notes", "phone") SELECT "createdAt", "id", "name", "notes", "phone" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE TABLE "new_DailySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "revenue" REAL NOT NULL DEFAULT 0,
    "expenses" REAL NOT NULL DEFAULT 0,
    "grossProfit" REAL NOT NULL DEFAULT 0,
    "netProfit" REAL NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "openingCash" REAL NOT NULL DEFAULT 0,
    "closingCash" REAL NOT NULL DEFAULT 0,
    "inventoryValue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySummary_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailySummary" ("closingCash", "createdAt", "date", "expenses", "grossProfit", "id", "inventoryValue", "netProfit", "openingCash", "revenue", "salesCount", "updatedAt") SELECT "closingCash", "createdAt", "date", "expenses", "grossProfit", "id", "inventoryValue", "netProfit", "openingCash", "revenue", "salesCount", "updatedAt" FROM "DailySummary";
DROP TABLE "DailySummary";
ALTER TABLE "new_DailySummary" RENAME TO "DailySummary";
CREATE INDEX "DailySummary_branchId_idx" ON "DailySummary"("branchId");
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");
CREATE UNIQUE INDEX "DailySummary_branchId_date_key" ON "DailySummary"("branchId", "date");
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "description", "expenseDate", "id") SELECT "amount", "category", "createdAt", "description", "expenseDate", "id" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_branchId_idx" ON "Expense"("branchId");
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
CREATE INDEX "Expense_category_idx" ON "Expense"("category");
CREATE TABLE "new_InventoryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InventoryLog" ("createdAt", "id", "note", "productId", "productName", "quantityAfter", "quantityBefore", "quantityChange", "reason") SELECT "createdAt", "id", "note", "productId", "productName", "quantityAfter", "quantityBefore", "quantityChange", "reason" FROM "InventoryLog";
DROP TABLE "InventoryLog";
ALTER TABLE "new_InventoryLog" RENAME TO "InventoryLog";
CREATE INDEX "InventoryLog_branchId_idx" ON "InventoryLog"("branchId");
CREATE INDEX "InventoryLog_productId_idx" ON "InventoryLog"("productId");
CREATE INDEX "InventoryLog_createdAt_idx" ON "InventoryLog"("createdAt");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellingPrice" REAL NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "costPrice", "createdAt", "currentStock", "id", "minStockLevel", "name", "notes", "sellingPrice", "updatedAt") SELECT "categoryId", "costPrice", "createdAt", "currentStock", "id", "minStockLevel", "name", "notes", "sellingPrice", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitSellingPrice" REAL NOT NULL,
    "unitCostPrice" REAL NOT NULL,
    "revenue" REAL NOT NULL,
    "productCost" REAL NOT NULL,
    "grossProfit" REAL NOT NULL,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("createdAt", "grossProfit", "id", "productCost", "productId", "productName", "quantity", "revenue", "saleDate", "unitCostPrice", "unitSellingPrice") SELECT "createdAt", "grossProfit", "id", "productCost", "productId", "productName", "quantity", "revenue", "saleDate", "unitCostPrice", "unitSellingPrice" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");
CREATE TABLE "new_Utang" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "utangDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Utang_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Utang_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Utang" ("amount", "createdAt", "customerId", "id", "notes", "status", "utangDate") SELECT "amount", "createdAt", "customerId", "id", "notes", "status", "utangDate" FROM "Utang";
DROP TABLE "Utang";
ALTER TABLE "new_Utang" RENAME TO "Utang";
CREATE INDEX "Utang_branchId_idx" ON "Utang"("branchId");
CREATE INDEX "Utang_customerId_idx" ON "Utang"("customerId");
CREATE INDEX "Utang_status_idx" ON "Utang"("status");
CREATE INDEX "Utang_utangDate_idx" ON "Utang"("utangDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Branch_name_idx" ON "Branch"("name");
