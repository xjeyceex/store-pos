-- CreateTable
CREATE TABLE "UtangItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utangId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UtangItem_utangId_fkey" FOREIGN KEY ("utangId") REFERENCES "Utang" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UtangItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UtangItem_utangId_idx" ON "UtangItem"("utangId");

-- CreateIndex
CREATE INDEX "UtangItem_productId_idx" ON "UtangItem"("productId");
