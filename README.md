# Sari-Sari Store Tracker

A simple, mobile-friendly web app for running a small Philippine **sari-sari store** — or several. It tracks inventory, sales, profit, expenses, and _utang_ (customer credit), with a dashboard, charts, and exportable reports. It is intentionally **not** a full POS — no receipts, barcodes, or employees.

Built for a single local user (no login). Currency defaults to **PHP (₱)**.

## Features

- **Branches & centralized reporting** — Manage multiple store branches from one account. Each branch is an independent store with its own products, stock, sales, expenses, customers, utang, and cash ledger. A branch switcher in the sidebar scopes the whole app to one branch, while **"All Branches"** consolidates the Dashboard and Reports across every branch — no manual consolidation. Add, edit, switch, or delete branches from the Branches page.
- **Dashboard** — Today / Week / Month / Year sales, profit, and expenses; outstanding utang, low/out-of-stock counts, inventory value, potential profit, and today's cash position; recent activity feeds (with per-branch labels in the consolidated view).
- **Analytics charts** — Revenue vs. expenses, daily/weekly/monthly profit, daily sales, top-selling products, inventory value trend, and a product-performance table — all driven by a shared date-range filter.
- **Products** — Full CRUD with category, cost/selling price, stock, and minimum stock level. Auto-computed profit per item and stock status (In / Low / Out).
- **Inventory** — Stock In, Stock Out, and Adjustment actions, each logged with before/change/after quantities; full movement history with search and filters.
- **Quick Sales** — One-tap sale entry that snapshots prices, reduces stock, and records revenue, cost, and gross profit.
- **Expenses** — Categorized expense tracking with period totals.
- **Utang** — Customers, debts, and payments with auto status (Unpaid / Partially Paid / Paid) and remaining balance; per-customer detail with payment history. Debts are **itemized** (e.g. 2× Kape, 1× Bigas) using catalog products (auto-priced) or custom items, and the total is computed from the lines. Taking catalog items on utang automatically reduces stock (logged as a "Utang" inventory movement) and restores it if the utang is deleted. Utang stays separate from Sales/Profit.
- **Reports** — 7 report types (Daily/Weekly/Monthly Sales, Profit, Expense, Inventory, Utang) with date filtering and **CSV export**.
- **Cash flow** — Opening cash auto-carries over from the previous day's closing cash.

## Tech stack

- **Next.js 16** (App Router, TypeScript, `src/`) + **Server Actions**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives)
- **Prisma 7** + **SQLite** (via the `better-sqlite3` driver adapter)
- **React Hook Form** + **Zod** validation
- **Recharts** for charts, **date-fns** for period math, **lucide-react** icons, **sonner** toasts, **next-themes** for dark mode

## Getting started

Requires **Node.js 20+**.

```bash
# 1. Install dependencies
npm install

# 2. Generate the Prisma client (outputs to src/generated/prisma)
npm run db:generate

# 3. Create the SQLite database (dev.db) from the schema
npm run db:migrate

# 4. Seed realistic sample data (3 branches, each with products, 30 days of sales, expenses, utang)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The database connection string lives in `.env`:

```
DATABASE_URL="file:./dev.db"
```

## Scripts

| Script               | Description                                         |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server                        |
| `npm run build`      | Production build                                    |
| `npm run start`      | Start the production server                         |
| `npm run lint`       | Run ESLint                                          |
| `npm run db:generate`| Generate the Prisma client                          |
| `npm run db:migrate` | Create/apply migrations and the SQLite database     |
| `npm run db:seed`    | Reset and seed the database with sample data        |
| `npm run db:studio`  | Open Prisma Studio to inspect the database          |

## Project structure

```
prisma/
  schema.prisma        # 12 models (Branch, Product, Category, InventoryLog, Sale,
                       # Expense, Customer, Utang, UtangItem, UtangPayment,
                       # DailySummary, Settings)
  seed.ts              # Realistic Filipino sari-sari sample data across 3 branches
src/
  app/                 # Routes: dashboard (/), products, inventory(+history),
                       # sales, expenses, utang(+[customerId]), reports, branches, settings
  components/          # ui/ (shadcn), layout/, dashboard/, shared/, and per-module UIs
  lib/
    actions/           # Server Actions (mutations + read actions for charts/reports)
    queries/           # Prisma read queries (analytics, dashboard, reports, lists, summaries)
    validations/       # Zod schemas per module
    currency.ts, dates.ts, constants.ts, csv.ts, prisma.ts, ...
  generated/prisma/    # Generated Prisma client (gitignored)
```

## Design notes

- **Multi-branch scoping** — Operational data (products, sales, expenses, customers, utang, inventory logs, daily summaries) carries a `branchId`. Queries take an optional branch filter; when omitted (the "All Branches" view) they aggregate across every branch. The active branch is stored in a cookie and resolved server-side; each branch keeps its own independent cash carry-over via a `@@unique([branchId, date])` `DailySummary`.
- **Money is stored as `Float`** and rounded to 2 decimals at write time (avoids `Decimal` serialization friction across Server Actions; adequate for store scale).
- **Prices are snapshotted** onto each `Sale`, so historical reports stay accurate when product prices change later.
- **`DailySummary`** caches per-day revenue, expenses, profit, cash, and inventory value to power a fast dashboard, trend charts, and cash carry-over. It is recomputed after each relevant mutation.
- **SQLite has no native enums**, so enum-like fields (reasons, categories, statuses) are stored as strings and validated with Zod.
- Deleting a product keeps historical `Sale` and `InventoryLog` rows (`onDelete: SetNull`).
