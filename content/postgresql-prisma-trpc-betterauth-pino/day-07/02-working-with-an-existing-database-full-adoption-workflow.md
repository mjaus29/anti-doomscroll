# 2 — Working with an Existing Database — Full Adoption Workflow

---

## T — TL;DR

Adopting Prisma on an existing database is a five-step workflow: introspect → clean up schema → baseline migrations → generate client → iterate with `migrate dev`. The critical insight is that you do **not** re-create the database — you tell Prisma "the database already has this schema, start tracking changes from here." Every step is reversible until you commit the baseline.

---

## K — Key Concepts

```
── The five-step adoption workflow ───────────────────────────────────────────

Step 1: INTROSPECT
  npx prisma db pull
  → schema.prisma generated from existing DB

Step 2: CLEAN UP
  Rename models/fields to TypeScript conventions
  Add @@map / @map for every renamed model/field
  Add @@index where missing (FK columns, common query columns)
  Fix onDelete rules (db pull defaults to NoAction — change to Cascade/SetNull as needed)
  Add @db.Timestamptz where appropriate
  Add @updatedAt if DB has update triggers managing that column

Step 3: BASELINE
  Create an empty migration file
  Mark it as "already applied" with prisma migrate resolve --applied
  → Prisma now tracks future changes, ignores the initial state

Step 4: GENERATE
  npx prisma generate
  → Prisma Client with full TypeScript types for all models

Step 5: ITERATE
  From now on: edit schema.prisma → npx prisma migrate dev → review SQL → commit
  Normal development workflow
```

```bash
# ── Step 1: Introspect ────────────────────────────────────────────────────
# Ensure .env has DATABASE_URL pointing to existing DB
npx prisma db pull
# schema.prisma now reflects the existing database
```

```prisma
// ── Step 2: Clean up — example before/after ───────────────────────────────

// BEFORE (raw db pull output):
model order_items {
  id          Int     @id @default(autoincrement())
  order_id    Int
  product_id  Int
  unit_price  Decimal @db.Decimal(10, 2)
  quantity    Int     @default(1)
  orders      orders  @relation(fields: [order_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  @@index([order_id])
}

// AFTER (cleaned up):
model OrderItem {
  id         Int     @id @default(autoincrement())
  unitPrice  Decimal @db.Decimal(12, 2) @map("unit_price")
  quantity   Int     @default(1)

  orderId    Int     @map("order_id")
  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  productId  Int     @map("product_id")
  product    Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

```bash
# ── Step 3: Baseline — critical for migration tracking ───────────────────

# Create the migrations directory and baseline file
mkdir -p prisma/migrations/20250615000000_baseline

# Create an EMPTY migration.sql — the DB already has the schema
# We are NOT applying any SQL, just marking a starting point
echo "" > prisma/migrations/20250615000000_baseline/migration.sql
# Or just create an empty file:
touch prisma/migrations/20250615000000_baseline/migration.sql

# Tell Prisma: "consider this migration already applied"
npx prisma migrate resolve --applied "20250615000000_baseline"

# Verify:
npx prisma migrate status
# ✔ Database schema is up to date!
# 1 migration found: 20250615000000_baseline (applied)
```

```bash
# ── Step 4: Generate client ───────────────────────────────────────────────
npx prisma generate
# ✔ Generated Prisma Client (v7.x.x) to ./node_modules/.prisma/client
# TypeScript types now available for all models
```

```bash
# ── Step 5: Iterate — first real migration ────────────────────────────────
# Edit schema.prisma: add a new field or model
# Example: add a phone field to users

# In schema.prisma:
# model User {
#   ...
#   phone String? @map("phone_number")
# }

npx prisma migrate dev --name add_phone_to_users

# Prisma computes diff between current schema and baseline DB
# Generates: ALTER TABLE "users" ADD COLUMN "phone_number" TEXT;
# Applies it
# Regenerates client ✅
```

```
── What to fix when cleaning up db pull output ───────────────────────────────

Issue                          │ Fix
───────────────────────────────┼──────────────────────────────────────────────
snake_case model names          │ PascalCase + @@map("snake_case")
snake_case field names          │ camelCase + @map("snake_case")
onDelete: NoAction everywhere   │ Change to Cascade/SetNull/Restrict per business rule
Missing @@index on FK columns   │ Add @@index([fkField]) — db pull adds some but not all
DateTime? without @db.Timestamptz│ Add @db.Timestamptz if column is TIMESTAMPTZ
Nullable columns that are always set│ Remove the ? if the column is logically required
Missing @updatedAt              │ Add if a trigger auto-manages the column
Relation names unclear          │ Rename relation field to be semantically meaningful
                                │ e.g. users → members, posts → articles
```

---

## W — Why It Matters

- The baseline step is what most developers skip, and it causes `migrate dev` to try to CREATE tables that already exist — resulting in migration failures. The empty migration file with `migrate resolve --applied` is the handshake that says "Prisma, the database already has everything up to this point."
- Changing `onDelete: NoAction` to appropriate cascade rules during cleanup is a business logic decision, not just cosmetic — `NoAction` means "do nothing when the parent is deleted" which often silently creates orphaned rows. Deciding the correct `onDelete` rule for each relation is part of understanding the data model.
- The cleanup step (Step 2) is also a learning opportunity — reading through the generated schema and understanding every table and relation gives you a map of the existing codebase's data model that no documentation can replace.

---

## I — Interview Q&A

### Q: How do you adopt Prisma on an existing project that already has a PostgreSQL database with 30 tables?

**A:** The workflow is: (1) **Introspect** — run `prisma db pull` to generate `schema.prisma` from the existing database. This produces a complete schema with all 30 tables as models, with correct types, constraints, and FK relations. (2) **Clean up** — rename models and fields to TypeScript conventions (PascalCase/camelCase) and add `@@map`/`@map` to preserve the actual DB names. Fix `onDelete: NoAction` rules to proper cascade rules. Add missing indexes on FK columns. (3) **Baseline** — create an empty migration file in `prisma/migrations/` and run `prisma migrate resolve --applied` to tell Prisma the database already has this schema. (4) **Generate** — run `prisma generate` to produce the typed Prisma Client. (5) **Iterate** — all future schema changes use `prisma migrate dev` normally. The key is the baseline step — without it, the first `migrate dev` would try to CREATE all 30 tables and fail because they already exist.

---

## C — Common Pitfalls + Fix

### ❌ Skipping the baseline — `migrate dev` tries to create existing tables

```bash
# ❌ After db pull and cleanup, running migrate dev without baselining
npx prisma migrate dev --name init

# Prisma generates:
# CREATE TABLE "users" (...);   ← already exists!
# CREATE TABLE "posts" (...);   ← already exists!
# ERROR: relation "users" already exists ❌
```

**Fix:** Always baseline before the first `migrate dev`:

```bash
# ✅ Baseline first
mkdir -p prisma/migrations/20250615000000_baseline
touch prisma/migrations/20250615000000_baseline/migration.sql
npx prisma migrate resolve --applied "20250615000000_baseline"

# Now migrate dev only generates SQL for NEW changes
npx prisma migrate dev --name add_new_feature  # ✅ only adds the new feature
```

---

## K — Coding Challenge + Solution

### Challenge

You inherit a project with this existing PostgreSQL schema: `products (id SERIAL, sku VARCHAR(50) UNIQUE, name TEXT, price NUMERIC(10,2), stock_qty INT DEFAULT 0, is_active BOOL DEFAULT true, created_at TIMESTAMPTZ)` and `product_reviews (id SERIAL, product_id INT FK→products, reviewer_email TEXT, rating SMALLINT, body TEXT NULLABLE, reviewed_at TIMESTAMPTZ)`. Simulate the complete adoption: (1) write the `db pull` output; (2) write the cleaned schema; (3) show the baseline commands; (4) show the first new migration adding a `category TEXT` column to products.

### Solution

```prisma
// ── (1) db pull output ────────────────────────────────────────────────────

model products {
  id              Int              @id @default(autoincrement())
  sku             String           @unique @db.VarChar(50)
  name            String
  price           Decimal          @db.Decimal(10, 2)
  stock_qty       Int              @default(0)
  is_active       Boolean          @default(true)
  created_at      DateTime?        @db.Timestamptz(6)
  product_reviews product_reviews[]
}

model product_reviews {
  id             Int      @id @default(autoincrement())
  product_id     Int
  reviewer_email String
  rating         Int      @db.SmallInt
  body           String?
  reviewed_at    DateTime? @db.Timestamptz(6)
  products       products @relation(
    fields: [product_id],
    references: [id],
    onDelete: NoAction,
    onUpdate: NoAction
  )
  @@index([product_id])
}
```

```prisma
// ── (2) Cleaned-up schema ─────────────────────────────────────────────────

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id        Int             @id @default(autoincrement())
  sku       String          @unique @db.VarChar(50)
  name      String
  price     Decimal         @db.Decimal(10, 2)
  stockQty  Int             @default(0)  @map("stock_qty")
  isActive  Boolean         @default(true) @map("is_active")
  createdAt DateTime        @default(now()) @map("created_at") @db.Timestamptz

  reviews   ProductReview[] // renamed relation field

  @@map("products")
}

model ProductReview {
  id            Int      @id @default(autoincrement())
  reviewerEmail String   @map("reviewer_email")
  rating        Int      @db.SmallInt
  body          String?
  reviewedAt    DateTime @default(now()) @map("reviewed_at") @db.Timestamptz

  productId     Int      @map("product_id")
  product       Product  @relation(
    fields:   [productId],
    references: [id],
    onDelete: Cascade   // delete product → delete its reviews (intentional)
  )

  @@index([productId])
  @@map("product_reviews")
}
```

```bash
# ── (3) Baseline commands ─────────────────────────────────────────────────

mkdir -p prisma/migrations/20250615000000_baseline
touch prisma/migrations/20250615000000_baseline/migration.sql
npx prisma migrate resolve --applied "20250615000000_baseline"
npx prisma generate

# Verify:
npx prisma migrate status
# ✔ Database schema is up to date!
```

```bash
# ── (4) First new migration: add category to products ─────────────────────

# Edit schema.prisma — add to Product model:
# category String? @default("uncategorized")

npx prisma migrate dev --name add_category_to_products

# Generated migration SQL:
# ALTER TABLE "products" ADD COLUMN "category" TEXT DEFAULT 'uncategorized';

# schema.prisma after:
# model Product {
#   ...
#   category  String? @default("uncategorized")
#   ...
# }
```

---

---
