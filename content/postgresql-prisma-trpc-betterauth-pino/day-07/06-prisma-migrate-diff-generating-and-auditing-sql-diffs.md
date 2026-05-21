# 6 — `prisma migrate diff` — Generating and Auditing SQL Diffs

---

## T — TL;DR

`prisma migrate diff` computes the SQL needed to transform one schema state into another — without applying it. It's the lowest-level Prisma migration tool: you control the source ("from") and target ("to") and get back the SQL. Use it for: reviewing what `migrate dev` would generate, comparing environments, generating custom migration scripts, auditing drift, and creating baselines.

---

## K — Key Concepts

```bash
# ── migrate diff — core syntax ─────────────────────────────────────────────
npx prisma migrate diff \
  --from-<source> <value> \
  --to-<target>   <value> \
  [--script]       # output as executable SQL (omit for human-readable summary)
```

```bash
# ── From/To options ────────────────────────────────────────────────────────
# --from-empty                         start from empty DB (no tables)
# --from-schema-datamodel <file>       from a schema.prisma file
# --from-schema-datasource <file>      from schema.prisma using its datasource URL
# --from-url <connection-string>       from a live database
# --from-migrations <dir>              from a migrations directory state
# --to-empty                           target: empty DB (generates DROP statements)
# --to-schema-datamodel <file>         target: a schema.prisma file
# --to-schema-datasource <file>        target: schema.prisma datasource
# --to-url <connection-string>         target: a live database
# --to-migrations <dir>                target: a migrations directory state
```

```bash
# ── Common use cases ───────────────────────────────────────────────────────

# 1. What would migrate dev generate? (preview without applying)
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel    prisma/schema.prisma \
  --script
# FROM: current live DB state
# TO:   current schema.prisma definition
# OUTPUT: SQL to bring DB to match schema (what migrate dev would create)

# 2. Generate full schema creation SQL (for baseline or documentation)
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script
# FROM: empty database
# TO:   current schema.prisma
# OUTPUT: all CREATE TABLE, CREATE INDEX, etc. — the full schema SQL

# 3. Detect drift: compare live DB to schema.prisma
npx prisma migrate diff \
  --from-url $PRODUCTION_DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script
# FROM: live production database
# TO:   your schema.prisma
# OUTPUT: SQL to make production match schema
# If output is empty → no drift ✅
# If output has SQL → drift detected (production has extra/missing things) ⚠️

# 4. Compare two databases
npx prisma migrate diff \
  --from-url $STAGING_DATABASE_URL \
  --to-url   $PRODUCTION_DATABASE_URL \
  --script
# Shows what SQL would make staging match production (or vice versa)

# 5. What will the next migration contain? (before running migrate dev)
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script
# FROM: state after all existing migrations are applied
# TO:   current schema.prisma
# OUTPUT: exactly what the next migrate dev would generate
```

```bash
# ── Shadow database for diff computation ─────────────────────────────────
# migrate diff uses a shadow database to compute FROM state for --from-migrations
# The shadow DB must be accessible (same credentials or separate SHADOW_DATABASE_URL)
# Set in .env: SHADOW_DATABASE_URL="postgresql://..."
# Or: grant CREATE DATABASE to the DB user (Prisma auto-creates/drops shadow DB)
```

```bash
# ── Piping diff output to a file ─────────────────────────────────────────
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > docs/schema_snapshot_$(date +%Y%m%d).sql
# Creates a dated SQL snapshot file for documentation or audit purposes
```

```bash
# ── Non-zero exit code for CI drift detection ─────────────────────────────
# migrate diff exits with code 1 if there are differences, 0 if schemas match
# Use this in CI to fail the build if production has drifted from schema.prisma:

npx prisma migrate diff \
  --from-url $PRODUCTION_DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script

if [ $? -ne 0 ]; then
  echo "⚠️ Schema drift detected in production — investigate before deploying"
  exit 1
fi
```

---

## W — Why It Matters

- `migrate diff --from-migrations --to-schema-datamodel` is the safe preview tool — before running `migrate dev`, you can see exactly what SQL it will generate without touching the database. This is critical for complex schema changes where you want to review before applying.
- Drift detection in CI is a production reliability practice — schema drift (database doesn't match `schema.prisma`) is often caused by emergency hotfixes applied directly to production. A CI check that compares the live DB to `schema.prisma` on every merge to main catches drift early, before it compounds.
- The `--from-url $PROD_URL --to-schema-datamodel` direction is "what do I need to run on production?" — running this before `migrate deploy` on a new environment is a safety check that shows exactly what SQL will run, so there are no surprises.

---

## I — Interview Q&A

### Q: How would you use `prisma migrate diff` in a CI/CD pipeline?

**A:** Two uses: (1) **Pre-deploy SQL preview** — before deploying to production, run `migrate diff --from-url $PROD_URL --to-schema-datamodel prisma/schema.prisma --script` to see exactly what SQL will run on production. If the output is unexpected (e.g., a DROP TABLE), the deploy is stopped for review. (2) **Drift detection** — run `migrate diff --from-url $PROD_URL --to-schema-datamodel prisma/schema.prisma` in CI after every merge to main. If the exit code is non-zero (schemas differ), the CI pipeline fails with a warning that production has drifted from the codebase. This catches emergency hotfixes applied directly to production and forces the team to document them as proper migrations before the next deploy.

---

## C — Common Pitfalls + Fix

### ❌ Using `migrate diff` direction backwards — generates destructive SQL

```bash
# ❌ Wrong direction: "what do I need to do to make schema.prisma match the DB?"
# (instead of "what do I need to do to make the DB match schema.prisma?")
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \  # FROM: schema
  --to-url $PRODUCTION_DATABASE_URL \             # TO: production DB
  --script
# Output: DROP TABLE "new_feature_table"; ← because the DB doesn't have it yet
# This is backwards — generates destructive SQL ❌
```

**Fix:** Always think FROM=current-state TO=desired-state:

```bash
# ✅ Correct direction: DB is current state, schema.prisma is desired state
npx prisma migrate diff \
  --from-url $PRODUCTION_DATABASE_URL \           # FROM: current DB state
  --to-schema-datamodel prisma/schema.prisma \    # TO: desired schema state
  --script
# Output: CREATE TABLE "new_feature_table"; ← what we need to apply to prod ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a CI shell script that: (1) checks for schema drift between production and `schema.prisma`; (2) if drift is found, outputs the SQL diff and fails the build with a clear error message; (3) if no drift, previews what the next migration would generate; (4) if the migration preview is not empty, confirms the migration files are committed to git (not just in the schema). Use `prisma migrate diff` for all checks.

### Solution

```bash
#!/bin/bash
# scripts/ci-schema-check.sh

set -e  # exit on any error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Prisma Schema CI Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── (1) Detect drift between production DB and schema.prisma ──────────────
echo ""
echo "Step 1: Checking for production schema drift..."

DRIFT_SQL=$(npx prisma migrate diff \
  --from-url "$PRODUCTION_DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>&1)

DRIFT_EXIT=$?

if [ $DRIFT_EXIT -ne 0 ] || [ -n "$DRIFT_SQL" ]; then
  echo ""
  echo "❌ DRIFT DETECTED — production database does not match schema.prisma"
  echo ""
  echo "SQL needed to bring production in sync:"
  echo "─────────────────────────────────────────"
  echo "$DRIFT_SQL"
  echo "─────────────────────────────────────────"
  echo ""
  echo "Action required:"
  echo "  1. Investigate why production diverged from schema.prisma"
  echo "  2. Create a migration for any missing changes:"
  echo "     npx prisma migrate dev --name fix_production_drift"
  echo "  3. Or manually apply the SQL above to production"
  echo ""
  exit 1
fi

echo "✅ No drift — production matches schema.prisma"

# ── (2) Preview what the next migration would generate ────────────────────
echo ""
echo "Step 2: Previewing next migration content..."

NEXT_MIGRATION_SQL=$(npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>&1)

NEXT_EXIT=$?

if [ $NEXT_EXIT -ne 0 ] || [ -n "$NEXT_MIGRATION_SQL" ]; then
  echo ""
  echo "⚠️  Pending schema changes detected (schema.prisma differs from migration history):"
  echo "─────────────────────────────────────────"
  echo "$NEXT_MIGRATION_SQL"
  echo "─────────────────────────────────────────"

  # ── (3) Check if the migration files are committed ────────────────────
  echo ""
  echo "Step 3: Checking if migration files are committed to git..."

  UNCOMMITTED=$(git status --porcelain prisma/migrations/ 2>&1)

  if [ -n "$UNCOMMITTED" ]; then
    echo ""
    echo "❌ UNCOMMITTED MIGRATIONS — schema changes exist but migration files are not committed"
    echo ""
    echo "Uncommitted files:"
    echo "$UNCOMMITTED"
    echo ""
    echo "Action required:"
    echo "  npx prisma migrate dev --name your_migration_name"
    echo "  git add prisma/migrations/ prisma/schema.prisma"
    echo "  git commit -m 'feat: describe your schema change'"
    exit 1
  fi

  echo ""
  echo "❌ MISSING MIGRATION — schema.prisma has changes not reflected in migration files"
  echo "Run: npx prisma migrate dev --name describe_your_change"
  exit 1
fi

echo "✅ Migration history is in sync with schema.prisma"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All schema checks passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
```

---

---
