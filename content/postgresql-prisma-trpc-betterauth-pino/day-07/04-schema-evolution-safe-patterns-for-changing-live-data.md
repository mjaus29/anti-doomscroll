# 4 — Schema Evolution — Safe Patterns for Changing Live Data

---

## T — TL;DR

Schema evolution on a live production database requires treating every change as a multi-step process: expand, migrate data, contract. The core rule is **never make a breaking change in a single deployment** — a breaking migration that removes or renames a column while the old application code is still running causes downtime. The expand-contract pattern (also called the blue-green migration pattern) keeps the database and application in sync across zero-downtime deployments.

---

## K — Key Concepts

```
── The expand-contract pattern ───────────────────────────────────────────────

Breaking change example: rename column "body" → "content" on posts table

WRONG (single deployment — causes downtime):
  Deploy 1: Rename column in DB (RENAME COLUMN body TO content)
  → App still running with old code reading "body" column → crashes ❌

RIGHT (expand-contract — zero downtime):
  Deploy 1 (EXPAND):   Add "content" column (nullable), keep "body"
                        App writes to both columns, reads from "body" (old code still works)
  Deploy 2 (MIGRATE):  Backfill "content" from "body" for existing rows
                        App writes to both, reads from "content" (new code)
  Deploy 3 (CONTRACT): Remove "body" column (old code no longer deployed)
                        App reads/writes only "content"

Each deploy is independent and safe — no single point of breakage.
```

```bash
# ── Expand phase: add the new column ─────────────────────────────────────

# Edit schema.prisma: add content String? alongside existing body String?
npx prisma migrate dev --name expand_add_content_to_posts --create-only

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;

# Apply
npx prisma migrate dev

# At this point: BOTH body and content exist in DB
# New app code writes to both, reads from content
# Old app code reads/writes body — still works ✅
```

```bash
# ── Migrate phase: backfill existing data ────────────────────────────────

npx prisma migrate dev --name migrate_backfill_content_from_body --create-only

# Edit migration.sql:
# UPDATE "posts" SET "content" = "body" WHERE "content" IS NULL;
# ALTER TABLE "posts" ALTER COLUMN "content" SET NOT NULL;

npx prisma migrate dev

# All rows now have content populated
# App reads/writes content; body column still exists but ignored
```

```bash
# ── Contract phase: remove the old column ────────────────────────────────
# Only run this AFTER the new code is fully deployed everywhere (all pods, all workers)

# Edit schema.prisma: remove body field
npx prisma migrate dev --name contract_remove_body_from_posts

# Generated SQL:
# ALTER TABLE "posts" DROP COLUMN "body";

# ⚠️ Only run when you're 100% sure no deployed code reads body ✅
```

```
── Common schema changes and their safe approach ─────────────────────────────

Change                    │ Steps                              │ Risk
──────────────────────────┼────────────────────────────────────┼──────────────────
Add nullable column        │ One migration                      │ Zero — safe immediately
Add NOT NULL column        │ Expand(nullable) → backfill → contract(NOT NULL) │ Medium
Rename column              │ Expand(add new) → copy data → app update → contract(drop old) │ High
Remove column              │ Deploy app without reading it → then drop │ Medium
Change column type (compat)│ Add new column → copy+cast → swap → drop │ High
Add index (concurrent)     │ CREATE INDEX CONCURRENTLY          │ Zero — non-blocking
Add FK constraint          │ Backfill nulls → add constraint    │ Medium
Add UNIQUE constraint      │ Deduplicate data → add constraint  │ Medium
Rename table               │ Add view with old name → migrate app → drop view │ High
```

```sql
-- ── CREATE INDEX CONCURRENTLY — zero-downtime index addition ──────────────
-- Standard CREATE INDEX locks the table for the duration (blocks writes)
-- CREATE INDEX CONCURRENTLY builds the index without a write lock

-- Add to migration.sql manually:
CREATE INDEX CONCURRENTLY "posts_content_search_idx" ON "posts"("content");

-- ⚠️ CONCURRENTLY cannot run inside a transaction block
-- ⚠️ Prisma wraps migrations in transactions by default
-- Fix: add the pragma to opt out of the transaction for this migration:
```

```sql
-- prisma/migrations/20250615_add_search_index/migration.sql

-- This migration uses CONCURRENTLY which cannot run inside a transaction.
-- Prisma will run this migration without a wrapping transaction.

-- PRAGMA: no_transaction (Prisma 4.x+)

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_content_search_idx"
  ON "posts" USING GIN(to_tsvector('english', "content"));
```

```prisma
// ── Soft delete pattern — schema evolution without removing data ───────────
// Instead of DELETE, mark rows as deleted
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz  // null = active, date = deleted

  @@map("users")
}

// Partial index for active users only (only index non-deleted):
// Added manually in migration SQL:
// CREATE INDEX "users_email_active_idx" ON "users"("email") WHERE "deleted_at" IS NULL;
// CREATE UNIQUE INDEX "users_email_unique_active" ON "users"("email") WHERE "deleted_at" IS NULL;
// (unique email among non-deleted users only)
```

---

## W — Why It Matters

- The expand-contract pattern is what separates hobby projects from production systems — in hobby projects, you shut down the app, run migrations, restart. In production, you must maintain availability during deployments. Any migration that removes or renames a column while the old app code is still running breaks every request that touches that column.
- `CREATE INDEX CONCURRENTLY` is the correct way to add indexes to large production tables — a standard `CREATE INDEX` takes an exclusive write lock on the table for the entire build duration. On a 50-million-row table this can take minutes, blocking all writes. `CONCURRENTLY` builds the index without blocking, at the cost of taking longer to complete.
- Soft deletes (`deletedAt`) are a schema evolution pattern in themselves — they preserve the row's history, allow "undelete", and prevent FK violation errors when deleting parent records that have child rows in other tables. The trade-off is that every query must filter `WHERE deleted_at IS NULL`, which is enforced at the application or view level.

---

## I — Interview Q&A

### Q: How do you rename a column in a production PostgreSQL database without causing downtime?

**A:** Use the expand-contract pattern across three deployments. **Deployment 1 (Expand):** Add the new column (`content`) as nullable alongside the old column (`body`). Deploy new application code that writes to both columns and reads from the old one. Old code still works — `body` is unchanged. **Deployment 2 (Migrate):** Run a backfill migration that copies all data from `body` to `content` for existing rows, then makes `content` NOT NULL. Deploy new application code that reads from and writes to `content` only. Both columns still exist in the database. **Deployment 3 (Contract):** Once all application instances have been updated and no deployed code reads from `body`, drop the `body` column. Never use `ALTER TABLE RENAME COLUMN` while any application code still references the old column name — the rename and the code change must not happen simultaneously in production.

---

## C — Common Pitfalls + Fix

### ❌ Adding a NOT NULL column with no default to a table with existing rows

```bash
# Schema change: add isVerified Boolean (required, no default) to existing users table

npx prisma migrate dev --name add_is_verified_to_users
# Generated SQL:
# ALTER TABLE "users" ADD COLUMN "is_verified" BOOLEAN NOT NULL;
# ERROR: column "is_verified" of relation "users" contains null values ❌
# Fails because existing rows have no value for the new column
```

**Fix:** Two-step migration — add nullable, backfill, then apply NOT NULL:

```bash
# Step 1: add as nullable
npx prisma migrate dev --name add_is_verified_nullable --create-only
# Edit SQL:
# ALTER TABLE "users" ADD COLUMN "is_verified" BOOLEAN;
npx prisma migrate dev

# Step 2: backfill + add NOT NULL constraint
npx prisma migrate dev --name backfill_is_verified --create-only
# Edit SQL:
# UPDATE "users" SET "is_verified" = false WHERE "is_verified" IS NULL;
# ALTER TABLE "users" ALTER COLUMN "is_verified" SET NOT NULL;
# ALTER TABLE "users" ALTER COLUMN "is_verified" SET DEFAULT false;
npx prisma migrate dev

# Update schema.prisma:
# isVerified Boolean @default(false) @map("is_verified")
```

---

## K — Coding Challenge + Solution

### Challenge

You need to split the `name String` column on a `Customer` model into `firstName String` and `lastName String?`. The table has 100,000 rows in production. Design the complete expand-contract migration sequence: (1) expand migration SQL; (2) backfill migration SQL (use PostgreSQL `split_part`); (3) contract migration SQL; (4) the intermediate `schema.prisma` states at each step; (5) what application code changes happen between each deployment.

### Solution

```prisma
// ── Starting schema ────────────────────────────────────────────────────────
model Customer {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  @@map("customers")
}
```

```bash
# ── Deployment 1: EXPAND — add new columns ────────────────────────────────
npx prisma migrate dev --name expand_add_first_last_name --create-only
```

```sql
-- migration.sql (expand):
ALTER TABLE "customers" ADD COLUMN "first_name" TEXT;
ALTER TABLE "customers" ADD COLUMN "last_name"  TEXT;
-- Both nullable — existing rows get NULL, no errors ✅
```

```prisma
// schema.prisma after Deployment 1:
model Customer {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String                        // kept — still read by old code
  firstName String? @map("first_name")   // new — null for now
  lastName  String? @map("last_name")    // new — null for now
  @@map("customers")
}
// App writes: name (old), firstName + lastName (new) — reads: name (old code)
```

```bash
# ── Deployment 2: MIGRATE — backfill + make firstName NOT NULL ────────────
npx prisma migrate dev --name migrate_backfill_name_split --create-only
```

```sql
-- migration.sql (backfill):
-- Split existing name into first_name / last_name
UPDATE "customers"
SET
  "first_name" = TRIM(split_part("name", ' ', 1)),
  "last_name"  = NULLIF(TRIM(
    substring("name" FROM position(' ' IN "name") + 1)
  ), '')
WHERE "first_name" IS NULL;

-- Make first_name required (all rows now have a value)
ALTER TABLE "customers"
  ALTER COLUMN "first_name" SET NOT NULL,
  ALTER COLUMN "first_name" SET DEFAULT '';
```

```prisma
// schema.prisma after Deployment 2:
model Customer {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String                         // still kept
  firstName String  @map("first_name")    // now NOT NULL
  lastName  String? @map("last_name")     // still nullable
  @@map("customers")
}
// App reads/writes: firstName + lastName (new code)
// App also still writes name for backward compat
```

```bash
# ── Deployment 3: CONTRACT — remove old name column ───────────────────────
# Only after ALL app instances read firstName/lastName and NO code reads name
npx prisma migrate dev --name contract_remove_name_column
# Prisma generates: ALTER TABLE "customers" DROP COLUMN "name";
```

```prisma
// schema.prisma after Deployment 3 (final):
model Customer {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  firstName String  @map("first_name")
  lastName  String? @map("last_name")
  @@map("customers")
}
```

---

---
