# 3 — Baseline Migration Mindset — Starting Migrations Mid-Project

---

## T — TL;DR

The baseline migration mindset is the mental shift from "Prisma owns the schema from day one" to "Prisma tracks changes starting from a known point." A baseline is a snapshot that says "the database already looks like this — begin tracking new changes from here." This pattern applies whenever you introduce Prisma migrations into a project that wasn't greenfield, including: inheriting an old codebase, switching from another ORM, or recovering from direct SQL changes in a migration-tracked project.

---

## K — Key Concepts

```
── Three scenarios requiring a baseline ─────────────────────────────────────

Scenario 1: NEW Prisma adoption on existing DB
  Problem:  DB has tables; no prisma/migrations/ directory exists
  Solution: db pull → clean schema → empty baseline → resolve --applied

Scenario 2: Migration history lost / migrations folder deleted
  Problem:  DB exists; migrations folder was deleted or corrupted
  Solution: migrate diff to generate current schema SQL → create new baseline

Scenario 3: Environment divergence
  Problem:  Dev and staging have different migration histories
            (someone applied SQL manually to staging)
  Solution: migrate status → migrate diff to see the gap → decide: baseline staging or apply the diff
```

```bash
# ── Scenario 1: Complete baseline from scratch ─────────────────────────────

# 1. Introspect the database
npx prisma db pull

# 2. Clean up schema (rename, @@map, @map, fix onDelete)
#    ... manual edits ...

# 3. Create baseline migration
mkdir -p prisma/migrations/20250615000000_baseline
touch prisma/migrations/20250615000000_baseline/migration.sql
# The .sql file is intentionally EMPTY — DB already has the schema

# 4. Mark as applied
npx prisma migrate resolve --applied "20250615000000_baseline"

# 5. Generate client
npx prisma generate

# 6. Verify
npx prisma migrate status
# ✔ 1 migration found and applied in the database
```

```bash
# ── Scenario 2: Migration folder deleted — recreate baseline from current schema ──

# Generate the full SQL for the current schema state
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > /tmp/current_schema.sql

# Review the generated SQL
cat /tmp/current_schema.sql

# Create a new baseline migration with this SQL
mkdir -p prisma/migrations/20250615000000_recovered_baseline
cp /tmp/current_schema.sql prisma/migrations/20250615000000_recovered_baseline/migration.sql

# ⚠️ Do NOT apply this SQL — the DB already has the schema
# Just mark it as applied
npx prisma migrate resolve --applied "20250615000000_recovered_baseline"

npx prisma migrate status
# ✔ Database schema is up to date!
```

```bash
# ── Scenario 3: Environment divergence — staging has extra manual changes ──

# Check what's different between staging and your schema.prisma
npx prisma migrate diff \
  --from-url $STAGING_DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Output (example):
# -- AlterTable: column "loyalty_tier" exists in staging but not in schema.prisma
# ALTER TABLE "users" DROP COLUMN "loyalty_tier";
# ← staging has extra column that schema.prisma doesn't know about

# Decision: two options
# Option A: add the column to schema.prisma (accept the divergence)
# Option B: create a migration to remove the column from staging (clean up)
```

```
── The baseline mental model ─────────────────────────────────────────────────

Think of the migration history as a timeline:

  ────────────────────────────────────────────────────────▶ time
  [existing DB state]│[baseline]│[migration 1]│[migration 2]│...
                               ↑
                     Prisma starts tracking here

  Everything LEFT of the baseline: already in the DB, Prisma doesn't touch it
  Everything RIGHT of the baseline: managed by Prisma migrations going forward

  The baseline file can be:
  - EMPTY (most common for existing DBs): "I trust the DB already matches the schema"
  - Full schema SQL (for recovery): "here's exactly what the DB should look like"

  @@map / @map are the bridge:
  - The baseline snapshot describes the DB as it WAS (snake_case columns)
  - The Prisma schema models it as it SHOULD be in TypeScript (camelCase fields)
  - They coexist because @map connects them
```

```bash
# ── What the _prisma_migrations table looks like after baselining ──────────
# SELECT id, migration_name, finished_at, applied_steps_count FROM _prisma_migrations;
#
# id | migration_name                    | finished_at         | applied_steps_count
# ---+-----------------------------------+---------------------+--------------------
#  1 | 20250615000000_baseline           | 2025-06-15 14:30:00 | 0
#    ↑ finished_at is set (applied)        ↑ 0 steps = no SQL was run
#
# After first real migration:
#  2 | 20250615150000_add_phone_to_users | 2025-06-15 15:00:00 | 1
#    ↑ 1 step = one ALTER TABLE was run
```

---

## W — Why It Matters

- The baseline is a contract — it says "Prisma and the database agree on what exists right now." Without a baseline, every `migrate dev` or `migrate deploy` command fails because Prisma thinks it needs to CREATE things that already exist. The baseline is the foundation the entire migration history is built on.
- Scenario 3 (environment divergence) is more common than expected in team projects — a senior developer "just runs a quick ALTER" directly on staging, and now staging's schema differs from production's and from the migration history. Detecting this early with `migrate diff` prevents the divergence from silently compounding.
- An empty baseline file (0 bytes) is intentionally correct — it's not a mistake or placeholder. It means "0 SQL statements need to be run to reach this state" because the state already exists. The `applied_steps_count = 0` in `_prisma_migrations` confirms this.

---

## I — Interview Q&A

### Q: Why would you create an empty migration file and immediately mark it as applied with `--applied`?

**A:** An empty migration file in Prisma is a baseline marker — a timestamp in the migration history that says "the database already contains everything up to this point." When you run `prisma migrate resolve --applied "migration_name"`, Prisma adds a record in `_prisma_migrations` with `applied_steps_count = 0`, meaning no SQL was executed. This is necessary when adopting Prisma on an existing database because Prisma uses the migration history to compute what SQL to generate next — it diffs the schema against the most recent applied migration state. Without a baseline, Prisma either tries to re-create all existing tables (failing with "already exists") or has no reference point to compute diffs from. The empty baseline says "start computing diffs from the current schema as the zero point, not from an empty database."

---

## C — Common Pitfalls + Fix

### ❌ Creating a baseline with the full schema SQL and running it — drops/recreates existing data

```bash
# ❌ Generated full SQL and applied it as if the DB were empty
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/20250615000000_baseline/migration.sql

npx prisma migrate dev   # ← Tries to CREATE TABLE "users" — already exists!
# ERROR: relation "users" already exists ❌
# OR WORSE: if the DB was empty on another env, it runs DROP TABLE + CREATE ← data loss
```

**Fix:** Mark the baseline as applied WITHOUT running the SQL:

```bash
# ✅ Create the file (can contain full SQL for documentation purposes)
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/20250615000000_baseline/migration.sql

# Mark as applied WITHOUT executing the SQL
npx prisma migrate resolve --applied "20250615000000_baseline"
# ✅ 0 SQL statements run, but the migration is recorded as applied
# ✅ Future migrate dev only generates SQL for NEW changes
```

---

## K — Coding Challenge + Solution

### Challenge

You're joining a team mid-project. The database has been running for 6 months. There's a `schema.prisma` file but the `prisma/migrations/` folder was accidentally deleted by someone who ran `git clean -fdx`. The database is intact. Show the complete recovery workflow: (1) regenerate the baseline from the current schema; (2) verify the migration status; (3) make a new schema change (add `lastLoginAt DateTime?` to users); (4) verify that the new migration only contains the new change (not the entire schema). Include all CLI commands and explain what each does.

### Solution

```bash
# ── Situation ─────────────────────────────────────────────────────────────
# - prisma/schema.prisma exists (clean, with @@map and @map)
# - prisma/migrations/ was deleted
# - Database is intact with all existing tables

# ── Step 1: Recreate prisma/migrations/ directory ────────────────────────
mkdir -p prisma/migrations

# ── Step 2: Generate the current schema SQL for the baseline ──────────────
# This creates the SQL that represents the FULL current schema
# We use this as documentation and as the baseline content
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > /tmp/full_schema.sql

# Review it — make sure it looks right
wc -l /tmp/full_schema.sql    # count lines to see scope
head -50 /tmp/full_schema.sql # preview the top

# ── Step 3: Create the baseline migration folder and file ─────────────────
# Use today's timestamp for the migration name
mkdir -p prisma/migrations/20250615000000_recovered_baseline
cp /tmp/full_schema.sql prisma/migrations/20250615000000_recovered_baseline/migration.sql

# ── Step 4: Mark the baseline as applied WITHOUT running the SQL ──────────
# The DB already has this schema — we're just telling Prisma about it
npx prisma migrate resolve --applied "20250615000000_recovered_baseline"
# Output: "Migration 20250615000000_recovered_baseline marked as applied"

# ── Step 5: Verify status ─────────────────────────────────────────────────
npx prisma migrate status
# Output:
# 1 migration found in prisma/migrations
# ✔ Database schema is up to date!
# Applied: 20250615000000_recovered_baseline  (0 SQL steps)

# ── Step 6: Add the new field to schema.prisma ────────────────────────────
# Edit prisma/schema.prisma:
# model User {
#   ...
#   lastLoginAt DateTime? @map("last_login_at") @db.Timestamptz
# }

# ── Step 7: Generate a new migration for ONLY the new change ─────────────
npx prisma migrate dev --name add_last_login_at_to_users

# Prisma computes diff between:
#   FROM: state described by 20250615000000_recovered_baseline (full schema)
#   TO:   current schema.prisma (schema + new lastLoginAt field)
#
# Diff = only the new field!
# Generated SQL (only this, not the full schema):
# ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMPTZ;

# ── Step 8: Verify the new migration ─────────────────────────────────────
cat prisma/migrations/*/migration.sql
# ← only the ALTER TABLE statement, not all the CREATE TABLEs ✅

npx prisma migrate status
# 2 migrations found in prisma/migrations
# ✔ Database schema is up to date!

# ── Step 9: Commit everything ────────────────────────────────────────────
git add prisma/schema.prisma prisma/migrations/
git commit -m "chore: recover migration history + add last_login_at to users"
```

---

---
