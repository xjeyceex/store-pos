import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// ----- helpers -----
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function atTime(day: Date, h: number, m = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

const WINDOW_DAYS = 30;

/** Per-branch daily summary recompute (mirrors the runtime logic). */
async function recomputeDailySummary(branchId: string, date: Date): Promise<void> {
  const key = startOfDay(date);
  const dayStart = atTime(key, 0, 0);
  const dayEnd = new Date(
    key.getFullYear(),
    key.getMonth(),
    key.getDate(),
    23,
    59,
    59,
    999
  );

  const [saleAgg, expenseAgg, products] = await Promise.all([
    prisma.sale.aggregate({
      where: { branchId, saleDate: { gte: dayStart, lte: dayEnd } },
      _sum: { revenue: true, grossProfit: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { branchId, expenseDate: { gte: dayStart, lte: dayEnd } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { branchId },
      select: { currentStock: true, costPrice: true },
    }),
  ]);

  const revenue = round(saleAgg._sum.revenue ?? 0);
  const grossProfit = round(saleAgg._sum.grossProfit ?? 0);
  const expenses = round(expenseAgg._sum.amount ?? 0);
  const netProfit = round(grossProfit - expenses);
  const salesCount = saleAgg._count;
  const inventoryValue = round(
    products.reduce((s, p) => s + p.currentStock * p.costPrice, 0)
  );

  const prior = await prisma.dailySummary.findFirst({
    where: { branchId, date: { lt: key } },
    orderBy: { date: "desc" },
  });
  const openingCash = round(prior?.closingCash ?? 0);
  const closingCash = round(openingCash + revenue - expenses);

  await prisma.dailySummary.upsert({
    where: { branchId_date: { branchId, date: key } },
    create: {
      branchId,
      date: key,
      revenue,
      expenses,
      grossProfit,
      netProfit,
      salesCount,
      openingCash,
      closingCash,
      inventoryValue,
    },
    update: {
      revenue,
      expenses,
      grossProfit,
      netProfit,
      salesCount,
      openingCash,
      closingCash,
      inventoryValue,
    },
  });
}

type ProductDef = {
  name: string;
  cat: string;
  cost: number;
  sell: number;
  stock: number;
  min: number;
};

const CATEGORIES = [
  "Beverages",
  "Snacks",
  "Canned Goods",
  "Noodles",
  "Condiments",
  "Personal Care",
  "Household",
  "Cigarettes",
  "Bread & Eggs",
];

const PRODUCTS: ProductDef[] = [
  { name: "Coca-Cola 1.5L", cat: "Beverages", cost: 55, sell: 70, stock: 40, min: 8 },
  { name: "Kopiko Brown 3-in-1", cat: "Beverages", cost: 6, sell: 8, stock: 150, min: 25 },
  { name: "C2 Green Tea 500ml", cat: "Beverages", cost: 18, sell: 25, stock: 36, min: 8 },
  { name: "Bear Brand Milk 33g", cat: "Beverages", cost: 10, sell: 14, stock: 60, min: 12 },
  { name: "Piattos Cheese", cat: "Snacks", cost: 12, sell: 18, stock: 50, min: 10 },
  { name: "Nova Multigrain", cat: "Snacks", cost: 12, sell: 18, stock: 45, min: 10 },
  { name: "Skyflakes Crackers", cat: "Snacks", cost: 6, sell: 9, stock: 80, min: 15 },
  { name: "Argentina Corned Beef 150g", cat: "Canned Goods", cost: 28, sell: 38, stock: 36, min: 8 },
  { name: "555 Sardines 155g", cat: "Canned Goods", cost: 16, sell: 22, stock: 48, min: 10 },
  { name: "Lucky Me Pancit Canton", cat: "Noodles", cost: 12, sell: 16, stock: 100, min: 20 },
  { name: "Lucky Me Beef Mami", cat: "Noodles", cost: 11, sell: 15, stock: 90, min: 20 },
  { name: "Datu Puti Soy Sauce 200ml", cat: "Condiments", cost: 12, sell: 17, stock: 30, min: 6 },
  { name: "Silver Swan Vinegar 200ml", cat: "Condiments", cost: 11, sell: 16, stock: 28, min: 6 },
  { name: "Safeguard Soap", cat: "Personal Care", cost: 26, sell: 34, stock: 40, min: 8 },
  { name: "Colgate Toothpaste 75g", cat: "Personal Care", cost: 45, sell: 58, stock: 24, min: 5 },
  { name: "Tide Powder Sachet", cat: "Household", cost: 8, sell: 12, stock: 70, min: 15 },
  { name: "Marlboro Red (stick)", cat: "Cigarettes", cost: 6, sell: 9, stock: 200, min: 40 },
  { name: "Tasty Bread Loaf", cat: "Bread & Eggs", cost: 45, sell: 60, stock: 12, min: 4 },
  { name: "Egg (per piece)", cat: "Bread & Eggs", cost: 7, sell: 9, stock: 90, min: 20 },
];

type ExpenseDef = {
  dayIndex: number;
  description: string;
  category: string;
  amount: number;
};

const EXPENSES: ExpenseDef[] = [
  { dayIndex: 0, description: "Monthly store rent", category: "RENT", amount: 3500 },
  { dayIndex: 2, description: "Internet (PLDT Home)", category: "INTERNET", amount: 999 },
  { dayIndex: 4, description: "Plastic bags & supplies", category: "SUPPLIES", amount: 180 },
  { dayIndex: 8, description: "Tricycle delivery", category: "TRANSPORTATION", amount: 120 },
  { dayIndex: 12, description: "Maynilad water bill", category: "WATER", amount: 320 },
  { dayIndex: 15, description: "Meralco electricity bill", category: "ELECTRICITY", amount: 1450 },
  { dayIndex: 20, description: "Restock supplies", category: "SUPPLIES", amount: 240 },
  { dayIndex: 22, description: "Jeep fare to market", category: "TRANSPORTATION", amount: 90 },
  { dayIndex: 25, description: "Store cleaning items", category: "MISCELLANEOUS", amount: 75 },
];

type RestockDef = { dayIndex: number; name: string; qty: number };

const RESTOCKS: RestockDef[] = [
  { dayIndex: 10, name: "Lucky Me Pancit Canton", qty: 80 },
  { dayIndex: 10, name: "Kopiko Brown 3-in-1", qty: 100 },
  { dayIndex: 18, name: "Coca-Cola 1.5L", qty: 24 },
  { dayIndex: 18, name: "Marlboro Red (stick)", qty: 100 },
];

const CUSTOMERS = [
  {
    name: "Aling Maria",
    phone: "0917 123 4567",
    utangs: [
      { amount: 250, dayIndex: 6, payments: [{ amount: 100, dayIndex: 14 }] },
      { amount: 120, dayIndex: 21, payments: [] },
    ],
  },
  {
    name: "Mang Tonyo",
    phone: "0922 555 1212",
    utangs: [
      { amount: 500, dayIndex: 3, payments: [{ amount: 500, dayIndex: 17 }] },
    ],
  },
  {
    name: "Ate Beth",
    phone: "0905 777 8899",
    utangs: [{ amount: 80, dayIndex: 24, payments: [] }],
  },
  {
    name: "Kuya Jun",
    phone: null,
    utangs: [
      {
        amount: 300,
        dayIndex: 9,
        payments: [
          { amount: 100, dayIndex: 16 },
          { amount: 50, dayIndex: 23 },
        ],
      },
    ],
  },
  {
    name: "Lola Pacing",
    phone: "0918 222 3344",
    utangs: [{ amount: 60, dayIndex: 27, payments: [] }],
  },
];

type BranchDef = {
  name: string;
  location: string;
  /** Scales sales volume so branches show different performance. */
  scale: number;
  /** How many of the sample customers this branch has. */
  customerCount: number;
};

const BRANCHES: BranchDef[] = [
  { name: "Aling Nena's — Main", location: "Brgy. Poblacion", scale: 1, customerCount: 5 },
  { name: "Aling Nena's — Public Market", location: "Public Market", scale: 0.7, customerCount: 3 },
  { name: "Aling Nena's — Highway", location: "National Highway", scale: 0.45, customerCount: 2 },
];

async function seedBranch(
  branchId: string,
  def: BranchDef,
  catIds: Record<string, string>,
  start: Date
) {
  // ----- products (independent per branch) -----
  const stockMap = new Map<
    string,
    { id: string; name: string; cost: number; sell: number; stock: number }
  >();
  for (const p of PRODUCTS) {
    const startStock = Math.max(p.min, Math.round(p.stock * (0.6 + def.scale * 0.6)));
    const created = await prisma.product.create({
      data: {
        branchId,
        name: p.name,
        categoryId: catIds[p.cat],
        costPrice: p.cost,
        sellingPrice: p.sell,
        currentStock: startStock,
        minStockLevel: p.min,
      },
    });
    await prisma.inventoryLog.create({
      data: {
        branchId,
        productId: created.id,
        productName: created.name,
        quantityBefore: 0,
        quantityChange: startStock,
        quantityAfter: startStock,
        reason: "NEW_STOCK",
        note: "Initial stock",
        createdAt: atTime(start, 7),
      },
    });
    stockMap.set(created.id, {
      id: created.id,
      name: created.name,
      cost: p.cost,
      sell: p.sell,
      stock: startStock,
    });
  }
  const productList = Array.from(stockMap.values());

  // ----- customers + utang -----
  for (const c of CUSTOMERS.slice(0, def.customerCount)) {
    const customer = await prisma.customer.create({
      data: { branchId, name: c.name, phone: c.phone ?? null },
    });
    for (const u of c.utangs) {
      const paid = u.payments.reduce((s, p) => s + p.amount, 0);
      const status =
        paid <= 0 ? "UNPAID" : paid >= u.amount ? "PAID" : "PARTIALLY_PAID";
      const utang = await prisma.utang.create({
        data: {
          branchId,
          customerId: customer.id,
          amount: u.amount,
          utangDate: atTime(addDays(start, u.dayIndex), 11),
          status,
        },
      });
      for (const pay of u.payments) {
        await prisma.utangPayment.create({
          data: {
            utangId: utang.id,
            amount: pay.amount,
            paymentDate: atTime(addDays(start, pay.dayIndex), 15),
          },
        });
      }
    }
  }

  // ----- daily sales, restocks, and expenses -----
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = addDays(start, i);

    for (const r of RESTOCKS.filter((x) => x.dayIndex === i)) {
      const prod = productList.find((p) => p.name === r.name);
      if (!prod) continue;
      const qty = Math.max(1, Math.round(r.qty * def.scale));
      const before = prod.stock;
      const after = before + qty;
      prod.stock = after;
      await prisma.product.update({
        where: { id: prod.id },
        data: { currentStock: after },
      });
      await prisma.inventoryLog.create({
        data: {
          branchId,
          productId: prod.id,
          productName: prod.name,
          quantityBefore: before,
          quantityChange: qty,
          quantityAfter: after,
          reason: "NEW_STOCK",
          note: "Delivery restock",
          createdAt: atTime(day, 8),
        },
      });
    }

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const base = isWeekend ? rand(6, 10) : rand(3, 7);
    const txns = Math.max(1, Math.round(base * def.scale));
    for (let t = 0; t < txns; t++) {
      const available = productList.filter((p) => p.stock > 0);
      if (available.length === 0) break;
      const prod = pick(available);
      const qty = Math.min(prod.stock, rand(1, 4));
      const before = prod.stock;
      const after = before - qty;
      prod.stock = after;
      const revenue = round(prod.sell * qty);
      const productCost = round(prod.cost * qty);
      const grossProfit = round(revenue - productCost);
      const saleDate = atTime(day, rand(8, 19), rand(0, 59));
      await prisma.sale.create({
        data: {
          branchId,
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitSellingPrice: prod.sell,
          unitCostPrice: prod.cost,
          revenue,
          productCost,
          grossProfit,
          saleDate,
          createdAt: saleDate,
        },
      });
      await prisma.product.update({
        where: { id: prod.id },
        data: { currentStock: after },
      });
      await prisma.inventoryLog.create({
        data: {
          branchId,
          productId: prod.id,
          productName: prod.name,
          quantityBefore: before,
          quantityChange: -qty,
          quantityAfter: after,
          reason: "SALE",
          createdAt: saleDate,
        },
      });
    }

    for (const e of EXPENSES.filter((x) => x.dayIndex === i)) {
      await prisma.expense.create({
        data: {
          branchId,
          description: e.description,
          category: e.category,
          amount: round(e.amount * (0.5 + def.scale * 0.5)),
          expenseDate: atTime(day, 10),
          createdAt: atTime(day, 10),
        },
      });
    }

    await recomputeDailySummary(branchId, day);
  }
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.utangPayment.deleteMany();
  await prisma.utangItem.deleteMany();
  await prisma.utang.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.branch.deleteMany();

  console.log("Seeding settings...");
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      storeName: "Aling Nena's Sari-Sari Store",
      currency: "PHP",
      defaultLowStockThreshold: 5,
    },
    create: {
      id: 1,
      storeName: "Aling Nena's Sari-Sari Store",
      currency: "PHP",
      defaultLowStockThreshold: 5,
    },
  });

  console.log("Seeding categories...");
  const catIds: Record<string, string> = {};
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({ data: { name } });
    catIds[name] = c.id;
  }

  const today = startOfDay(new Date());
  const start = addDays(today, -(WINDOW_DAYS - 1));

  for (const def of BRANCHES) {
    console.log(`Seeding branch: ${def.name}...`);
    const branch = await prisma.branch.create({
      data: { name: def.name, location: def.location },
    });
    await seedBranch(branch.id, def, catIds, start);
  }

  const [branchCount, productCount, saleCount, expenseCount] = await Promise.all([
    prisma.branch.count(),
    prisma.product.count(),
    prisma.sale.count(),
    prisma.expense.count(),
  ]);
  console.log(
    `Seed complete: ${branchCount} branches, ${productCount} products, ${saleCount} sales, ${expenseCount} expenses.`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
