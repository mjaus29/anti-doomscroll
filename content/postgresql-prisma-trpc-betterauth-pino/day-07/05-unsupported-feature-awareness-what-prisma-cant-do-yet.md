# 5 — Unsupported Feature Awareness — What Prisma Can't Do (Yet)

---

## T — TL;DR

Prisma does not support every PostgreSQL feature in its schema DSL. Key gaps include: PostgreSQL views (partial support via preview), CHECK constraints, triggers, stored procedures, materialized views, generated columns, row-level security (RLS), and partial/expression indexes (schema only, not via `@@index`). For these, you write raw SQL in migration files or use `prisma migrate diff` to incorporate them. Knowing these limits prevents wasted time and wrong architectural decisions.

---

## K — Key Concepts

```
── Prisma feature support matrix (PostgreSQL) ────────────────────────────────

Feature                      │ Prisma Support │ Workaround
─────────────────────────────┼────────────────┼──────────────────────────────────
Tables                       │ ✅ Full        │ —
Columns + types              │ ✅ Full        │ —
Primary keys                 │ ✅ Full        │ —
Foreign keys + onDelete      │ ✅ Full        │ —
Unique constraints           │ ✅ Full        │ —
Regular indexes (@@index)    │ ✅ Full        │ —
Enums                        │ ✅ Full        │ —
Default values               │ ✅ Full        │ —
Array columns (String[])     │ ✅ Full        │ —
JSONB columns                │ ✅ Full        │ —
Views                        │ ⚠️ Preview    │ previewFeatures = ["views"]
Materialized views           │ ❌ None        │ Raw SQL in migration
Triggers                     │ ❌ None        │ Raw SQL in migration
Stored procedures/functions  │ ❌ None        │ Raw SQL in migration + $queryRaw
CHECK constraints            │ ❌ None        │ Raw SQL in migration
Partial indexes              │ ❌ Schema only │ Raw SQL in migration (CREATE INDEX ... WHERE)
Expression indexes           │ ❌ None        │ Raw SQL in migration
Generated columns (STORED)   │ ❌ None        │ Raw SQL in migration
Row-level security (RLS)     │ ❌ None        │ Raw SQL in migration
Extensions (pgcrypto, etc.)  │ ⚠️ Preview    │ previewFeatures = ["postgresqlExtensions"]
Full-text search (tsvector)  │ ❌ None        │ Raw SQL + $queryRaw
Sequences (custom)           │ ❌ None        │ Raw SQL in migration
Table inheritance            │ ❌ None        │ Not recommended with Prisma
Composite types              │ ❌ None        │ JSONB as workaround
```

```prisma
// ── Views — partial support via preview feature ───────────────────────────
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["views"]
}

// After running db pull with views in the DB, or after adding manually:
view ActiveUserView {
  id        Int    @unique
  email     String
  postCount Int

  @@map("active_users_view")
}

// In migration.sql (you write this — Prisma can't generate it):
// CREATE VIEW active_users_view AS
//   SELECT u.id, u.email, COUNT(p.id)::INT AS post_count
//   FROM users u
//   LEFT JOIN posts p ON p.author_id = u.id
//   WHERE u.is_active = true
//   GROUP BY u.id, u.email;

// TypeScript: prisma.activeUserView.findMany() — read-only ✅
// Cannot INSERT/UPDATE/DELETE on views
```

```sql
-- ── CHECK constraints — raw SQL in migration ──────────────────────────────
-- Prisma schema has no CHECK constraint syntax
-- Add to migration.sql manually:

ALTER TABLE "products"
  ADD CONSTRAINT "products_price_positive"
  CHECK ("price" > 0);

ALTER TABLE "users"
  ADD CONSTRAINT "users_age_valid"
  CHECK ("age" >= 0 AND "age" <= 150);

-- After running this migration, the constraint exists in PostgreSQL
-- Prisma does NOT know about it — it won't appear in schema.prisma
-- It IS enforced at the DB level for all writes (including raw SQL) ✅
```

```sql
-- ── Triggers — raw SQL in migration ───────────────────────────────────────
-- Prisma's @updatedAt is Prisma-level only (not a DB trigger)
-- For true DB-level auto-update, create a trigger:

-- In migration.sql:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now updated_at is managed by PostgreSQL, not just Prisma
-- Applies even to raw SQL updates that bypass Prisma ✅
```

```sql
-- ── Generated columns — raw SQL in migration ──────────────────────────────
-- PostgreSQL supports GENERATED ALWAYS AS (expr) STORED columns
-- Prisma does NOT support these in the schema DSL

-- In migration.sql:
ALTER TABLE "order_items"
  ADD COLUMN "line_total"
  NUMERIC(12,2)
  GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- In schema.prisma — use @default(dbgenerated("...")) or just use @ignore if you don't need it
-- Or map it as a read-only field:
```

```prisma
// Mapping a generated column in Prisma:
model OrderItem {
  id        Int     @id @default(autoincrement())
  quantity  Int
  unitPrice Decimal @db.Decimal(12, 2) @map("unit_price")
  lineTotal Decimal @db.Decimal(12, 2) @map("line_total")
           // ↑ Prisma reads it but won't try to set it if you never include it in create/update
           // Use @default(dbgenerated("...")) to tell Prisma this has a DB-side default
  @@map("order_items")
}
```

```prisma
// ── PostgreSQL extensions — preview feature ────────────────────────────────
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto, pg_trgm, uuid_ossp]  // declare extensions
}

// Prisma generates: CREATE EXTENSION IF NOT EXISTS "pgcrypto";
// in the migration SQL

// Use in schema:
model User {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // gen_random_uuid() is from pgcrypto/pgcrypto — available if extension is installed
}
```

---

## W — Why It Matters

- Understanding Prisma's limitations prevents architectural mistakes — if you design your entire application's security around row-level security (RLS) and then discover Prisma can't manage RLS policies in migrations, you have a gap. Knowing the limits upfront lets you plan for raw SQL in migrations.
- CHECK constraints are invisible to Prisma but enforced by PostgreSQL — this is actually a good thing. You add them via raw SQL in migrations, and they protect your data at the database level even when code bypasses Prisma. Knowing they won't appear in `schema.prisma` means you need to track them via migration files and comments.
- The `views` preview feature enables a powerful read-model pattern — define complex aggregation or join logic as a PostgreSQL view, map it in Prisma as a `view` block, and query it with full TypeScript types via `prisma.viewName.findMany()`. This is much cleaner than raw SQL for frequently-used read queries.

---

## I — Interview Q&A

### Q: What are the main PostgreSQL features that Prisma doesn't support natively, and how do you handle them?

**A:** The main gaps are: (1) **CHECK constraints** — no Prisma schema syntax; add via raw SQL in migration files. (2) **Triggers** — write raw SQL `CREATE TRIGGER` / `CREATE FUNCTION` in migrations; they persist in PostgreSQL regardless of Prisma. (3) **Materialized views** — no Prisma support; create via raw SQL in migrations; query via `$queryRaw`. (4) **Partial and expression indexes** — Prisma's `@@index` only supports full column indexes; write `CREATE INDEX ... WHERE` and `CREATE INDEX ON (expression)` directly in migration SQL. (5) **Row-level security** — no Prisma schema support; create `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` in migrations. (6) **Generated columns** — use `@default(dbgenerated("..."))` for the initial value but the `GENERATED ALWAYS AS ... STORED` syntax must be in raw migration SQL. The general pattern: if Prisma can't express it in `schema.prisma`, write the SQL in a migration file using `--create-only` to edit it before applying.

---

## C — Common Pitfalls + Fix

### ❌ Expecting Prisma to preserve manually-added CHECK constraints across `db push`

```bash
# You added a CHECK constraint via raw SQL:
# ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price > 0);

# Then you run db push to sync another schema change
npx prisma db push
# ⚠️ db push may DROP and RECREATE the table in some cases
# CHECK constraint is LOST ❌

# Or: migrate dev detects the constraint as "drift" and proposes to drop it
```

**Fix:** Use `migrate dev` (not `db push`) and never use `migrate dev` for constraints — use `--create-only`:

```bash
# ✅ Add CHECK constraint via a dedicated migration file
npx prisma migrate dev --name add_price_check_constraint --create-only

# Edit migration.sql (Prisma won't generate CHECK syntax — add manually):
# ALTER TABLE "products"
#   ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0);

npx prisma migrate dev  # applies it

# Now the constraint is in the migration history and won't be dropped by future migrations
```

---

## K — Coding Challenge + Solution

### Challenge

For a `Product` model, implement three PostgreSQL features that Prisma can't generate automatically: (1) a CHECK constraint ensuring `price > 0 AND price < 100000`; (2) a partial unique index ensuring SKU uniqueness only among active products (`is_active = true`); (3) a trigger that logs price changes to a `price_change_log` table. Show: the Prisma schema, the migration files with raw SQL, and how to query the results including `$queryRaw` for the log.

### Solution

```prisma
// prisma/schema.prisma

model Product {
  id        Int      @id @default(autoincrement())
  sku       String   @db.VarChar(50)
  name      String
  price     Decimal  @db.Decimal(10, 2)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@map("products")
}

// price_change_log is managed purely by the trigger — Prisma can still read it
model PriceChangeLog {
  id         Int      @id @default(autoincrement())
  productId  Int      @map("product_id")
  oldPrice   Decimal  @db.Decimal(10, 2) @map("old_price")
  newPrice   Decimal  @db.Decimal(10, 2) @map("new_price")
  changedAt  DateTime @default(now()) @map("changed_at") @db.Timestamptz

  @@map("price_change_log")
}
```

```bash
# Generate migration for the Prisma-managed schema changes
npx prisma migrate dev --name add_products_and_price_log --create-only
```

```sql
-- prisma/migrations/20250615_add_products_and_price_log/migration.sql

-- Prisma generates the CREATE TABLE statements
-- We ADD the custom SQL below them:

-- CreateTable (Prisma generated)
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable (Prisma generated)
CREATE TABLE "price_change_log" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "old_price" DECIMAL(10,2) NOT NULL,
    "new_price" DECIMAL(10,2) NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_change_log_pkey" PRIMARY KEY ("id")
);

-- ── (1) CHECK constraint — Prisma can't generate this ─────────────────────
ALTER TABLE "products"
  ADD CONSTRAINT "products_price_range"
  CHECK ("price" > 0 AND "price" < 100000);

-- ── (2) Partial unique index — Prisma's @@index can't do WHERE ────────────
CREATE UNIQUE INDEX "products_sku_active_unique"
  ON "products" ("sku")
  WHERE "is_active" = true;
-- Active products must have unique SKUs; inactive products can share SKUs (archived/reused)

-- ── (3) Trigger for price change logging ─────────────────────────────────
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the price actually changed
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_change_log (product_id, old_price, new_price, changed_at)
    VALUES (NEW.id, OLD.price, NEW.price, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_price_change
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();
```

```typescript
// Querying price change history with $queryRaw
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface PriceChangeRow {
  product_id: number;
  product_name: string;
  old_price: string;
  new_price: string;
  changed_at: Date;
}

// Raw query to join price_change_log with products
const priceHistory = await prisma.$queryRaw<PriceChangeRow[]>`
  SELECT
    pcl.product_id,
    p.name  AS product_name,
    pcl.old_price::TEXT,
    pcl.new_price::TEXT,
    pcl.changed_at
  FROM price_change_log pcl
  JOIN products p ON p.id = pcl.product_id
  WHERE pcl.product_id = ${42}
  ORDER BY pcl.changed_at DESC
  LIMIT 20
`;

// Or use Prisma Client for the log model (fully typed):
const logs = await prisma.priceChangeLog.findMany({
  where: { productId: 42 },
  orderBy: { changedAt: "desc" },
  take: 20,
});
```

---

---
