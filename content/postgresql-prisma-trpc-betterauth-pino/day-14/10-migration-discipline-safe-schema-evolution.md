# 10 — Migration Discipline — Safe Schema Evolution

---

## T — TL;DR

Every schema change must go through Prisma migrations — `prisma migrate dev` in development, `prisma migrate deploy` in production. Migrations are SQL files in `prisma/migrations/`, checked into git. They are immutable once deployed. Safe migration patterns: add columns with defaults, never rename (add + deprecate + remove across releases), never delete prematurely. Backward-compatible migrations allow zero-downtime deploys.

---

## K — Key Concepts

```bash
# ── Development workflow ───────────────────────────────────────────────────
# After changing schema.prisma:
npx prisma migrate dev --name add_user_plan_column
# 1. Detects diff between schema.prisma and current DB
# 2. Generates SQL migration file in prisma/migrations/
# 3. Applies migration to dev database
# 4. Regenerates Prisma Client

# Always name migrations descriptively:
# add_user_role_field
# create_orders_table
# rename_status_to_order_status  (though renaming is risky — see below)
# add_index_orders_customer_id

# ── Production deployment ──────────────────────────────────────────────────
npx prisma migrate deploy
# Applies all pending migrations in order
# Does NOT prompt — safe for CI/CD
# Reports which migrations were applied

# ── Check migration status ────────────────────────────────────────────────
npx prisma migrate status
# Shows: applied, pending, failed migrations
```

```typescript
// ── Safe pattern 1: Adding a nullable column ──────────────────────────────
// ✅ Safe: existing rows get NULL — no default required
// schema.prisma:
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  phoneNumber String?  // ADD COLUMN phone_number TEXT  ← zero downtime
}

// ── Safe pattern 2: Adding a column WITH a default ────────────────────────
// ✅ Safe: existing rows get the default value
model User {
  plan String @default("free")
  // ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
}

// ── Risky pattern: Adding NOT NULL without default ────────────────────────
// ❌ Fails if table has existing rows
model User {
  requiredField String  // NOT NULL, no default → ALTER TABLE fails if rows exist
}
// Fix: add as nullable first, backfill, then add NOT NULL constraint:
// Migration 1: ADD COLUMN required_field TEXT
// Data script:  UPDATE users SET required_field = 'default_value' WHERE required_field IS NULL
// Migration 2:  ALTER TABLE users ALTER COLUMN required_field SET NOT NULL
```

```sql
-- ── prisma/migrations/20250615_add_plan_column/migration.sql ──────────────
-- Prisma generates this — review before applying in production

-- AddColumn
ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';

-- Migration file is IMMUTABLE — never edit after applying to any environment
-- To fix: create a new migration that corrects the issue
```

```bash
# ── Handling migration conflicts (team workflow) ───────────────────────────

# Team member A creates migration: 20250615_add_phone
# Team member B creates migration: 20250615_add_plan
# Both branch from same DB state — conflict when merging

# Resolution:
npx prisma migrate dev  # re-generates from current schema + existing migrations
# OR:
# Squash: if conflicts are in dev only, reset and regenerate

# ── Reset dev database (DESTRUCTIVE — dev only) ──────────────────────────
npx prisma migrate reset
# Drops all tables, re-runs all migrations, re-seeds ← dev/test only ❌ never prod

# ── Squash migrations (dev only) ─────────────────────────────────────────
# If dev has 30 draft migrations and they haven't been deployed to staging:
# 1. npx prisma migrate reset (destroy dev db)
# 2. Edit/delete old migration files
# 3. npx prisma migrate dev --name initial_schema
# Produces one clean migration ← only safe before first staging deploy
```

```typescript
// ── Expand-contract pattern for zero-downtime renames ─────────────────────
// Goal: rename column `status` to `order_status`
//
// Step 1 (Expand): Add new column, keep old — deploy app writes to BOTH
// ALTER TABLE orders ADD COLUMN order_status TEXT;
// UPDATE orders SET order_status = status;

// Step 2: Change app code to read from new column, write to both
// (Deploy — old code still works, new code works too)

// Step 3 (Contract): Remove old column — deploy app only uses new column
// ALTER TABLE orders DROP COLUMN status;

// With Prisma + @map:
model Order {
  orderStatus String @map("status")   // @map lets you rename the Prisma field
  // without renaming the PG column — no migration needed for the Prisma field name
}
// Use @map to rename the Prisma field without changing the DB column ✅
```

```bash
# ── Production migration checklist ───────────────────────────────────────

# Before running prisma migrate deploy in production:
# ✅ 1. Migration tested on staging with production-scale data
# ✅ 2. Estimated migration duration < 1 second per table (or uses online DDL)
# ✅ 3. No LOCK TABLE statements (ALTER TABLE in PG 18 is mostly lock-free)
# ✅ 4. New NOT NULL columns have DEFAULT values
# ✅ 5. Dropped columns/tables are no longer referenced in application code
# ✅ 6. Migration rolled back successfully in staging (test ROLLBACK manually)
# ✅ 7. Database backup taken before applying
# ✅ 8. Migration status checked: prisma migrate status → no pending before deploy
```

---

## W — Why It Matters

- Migration files in git are the database changelog — reviewing a PR diff includes both code changes and the exact SQL that will run against production. This is the single most important practice for database safety in a team environment.
- The expand-contract pattern is necessary for zero-downtime deploys — if you rename a column in one deployment, the old application code (still running on some pods during rolling deploy) uses the old column name and fails. Expanding first (both columns exist) means both old and new code work simultaneously during the deployment window.
- `prisma migrate deploy` (not `dev`) in production is a safety guarantee — `dev` can prompt, generate new migrations interactively, or reset the database. `deploy` only applies pending migrations, never drops anything, and exits with a non-zero code if anything fails — safe for CI/CD pipelines.

---

## I — Interview Q&A

### Q: What is the expand-contract pattern for database migrations and why is it necessary for zero-downtime deployments?

**A:** When you need to rename a column, you can't do it in a single migration and deploy — during a rolling deploy, some pods run old code (using the old column name) and some run new code (using the new name). If the column is renamed mid-deploy, old pods crash. The expand-contract pattern solves this over three deployments: (1) Expand — add the new column, copy data from old to new, deploy app that writes to both columns; (2) Migrate — deploy app that reads from the new column but still writes to both; (3) Contract — drop the old column, deploy final app that only uses the new column. This ensures at every point in the deploy, all running pods have a working schema. In Prisma, you can often avoid a DB rename entirely by using `@map("old_column_name")` to map a new Prisma field name to the existing column without any schema migration.

---

## C — Common Pitfalls + Fix

### ❌ Editing a migration file after it's been applied to any environment

```bash
# ❌ Editing prisma/migrations/20250610_add_user/migration.sql after it ran on staging
# Prisma stores the checksum of applied migrations
# If you edit the file, the next prisma migrate status shows it as "changed" ← mismatch ❌
# Can cause migrate deploy to fail in production
```

**Fix:** Never edit applied migrations — create a new one:

```bash
# ✅ Created a new corrective migration instead
npx prisma migrate dev --name fix_user_column_type
# New SQL file: ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(20)
# Old migration unchanged — history preserved ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Your `User` model needs three changes: (1) add `planTier` (String, default 'free', NOT NULL); (2) add `trialEndsAt` (DateTime?, timestamptz); (3) rename Prisma field `name` to `displayName` while keeping the PostgreSQL column as `name`. Write the updated model fields with proper `@map` and `@db` attributes. State which changes are zero-downtime safe.

### Solution

```prisma
// Updated User model fields (partial)
model User {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String   @unique

  // Rename in Prisma only — @map keeps DB column as "name"
  // Zero-downtime: no SQL migration needed, Prisma field name changes only ✅
  displayName String?  @map("name")

  // New column with DEFAULT — safe for existing rows ✅
  planTier    String   @default("free") @map("plan_tier")

  // New nullable column — safe for existing rows ✅
  trialEndsAt DateTime? @db.Timestamptz @map("trial_ends_at")

  createdAt   DateTime  @default(now()) @db.Timestamptz @map("created_at")
  updatedAt   DateTime  @updatedAt      @db.Timestamptz @map("updated_at")

  @@map("users")
}

// Zero-downtime analysis:
// displayName @map("name"): ✅ No SQL migration — only Prisma type change
// planTier @default("free"): ✅ ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'free'
//   Existing rows get 'free' — no lock held beyond metadata update
// trialEndsAt DateTime?: ✅ ADD COLUMN trial_ends_at TIMESTAMPTZ
//   Nullable — existing rows get NULL — instant in PG 18
```

---

---
