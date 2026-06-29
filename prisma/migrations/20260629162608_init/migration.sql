-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "sellingPrice" REAL NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Utang" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "utangDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Utang_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UtangPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utangId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UtangPayment_utangId_fkey" FOREIGN KEY ("utangId") REFERENCES "Utang" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "storeName" TEXT NOT NULL DEFAULT 'My Sari-Sari Store',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "defaultLowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "InventoryLog_productId_idx" ON "InventoryLog"("productId");

-- CreateIndex
CREATE INDEX "InventoryLog_createdAt_idx" ON "InventoryLog"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Utang_customerId_idx" ON "Utang"("customerId");

-- CreateIndex
CREATE INDEX "Utang_status_idx" ON "Utang"("status");

-- CreateIndex
CREATE INDEX "Utang_utangDate_idx" ON "Utang"("utangDate");

-- CreateIndex
CREATE INDEX "UtangPayment_utangId_idx" ON "UtangPayment"("utangId");

-- CreateIndex
CREATE INDEX "UtangPayment_paymentDate_idx" ON "UtangPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_date_key" ON "DailySummary"("date");

-- CreateIndex
CREATE INDEX "DailySummary_date_idx" ON "DailySummary"("date");
