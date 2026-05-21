# 10 — Prisma Studio and Introspection Debugging

---

## T — TL;DR

Prisma Studio is a web-based GUI for browsing and editing your database through the Prisma schema. It runs locally on `localhost:5555` and requires no setup beyond a configured `schema.prisma`. Use it for: quick data inspection, manual record editing during development, verifying migrations worked, and debugging relation loading. It is a development-only tool — never expose it in production.

---

## K — Key Concepts

```bash
# ── Launching Prisma Studio ────────────────────────────────────────────────
npx prisma studio

# Output:
# Prisma Studio is up on http://localhost:5555
# Opens browser automatically

# Custom port:
npx prisma studio --port 5556

# Custom schema path:
npx prisma studio --schema ./custom/schema.prisma

# Prisma Studio reads DATABASE_URL from .env — same connection as your app
```

```
── What Prisma Studio shows ─────────────────────────────────────────────────

Left sidebar:  list of all models (tables) from schema.prisma
Main area:     paginated table view of all rows
Top bar:       Add record | Filter | Sort | column visibility toggle

Per-model features:
  - Browse all rows with pagination (50 rows per page default)
  - Click a row to edit individual field values
  - Add new records via a form with field type validation
  - Delete records
  - Navigate relations: click FK values to jump to related records
  - Filter rows by field value
  - Sort by any column

Limitations:
  - Cannot run custom SQL queries
  - Cannot bulk update/delete
  - Does not show views (only models)
  - Does not show raw PostgreSQL metadata (indexes, constraints)
  - Only shows fields that are in schema.prisma (not @ignore fields)
```

```bash
# ── Introspection debugging — what to do when db pull generates wrong schema ──

# Problem 1: Relation not detected
# Cause: FK constraint missing in the database (column exists but no constraint)
# Fix: add the FK constraint via migration, then re-run db pull
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id);
npx prisma db pull  # relation now detected ✅

# Problem 2: Wrong type for a column
# Cause: custom PostgreSQL type or extension type not recognized
# Check column type:
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'your_table';

# Problem 3: Enum not detected
# Cause: column uses TEXT with a CHECK constraint instead of a real ENUM type
# CHECK constraints are not reflected as enums — add manually or convert column to ENUM type

# Problem 4: Composite FK not reflecting as @@id
# Cause: db pull checks pk type — if composite PK exists it should detect it
# Verify: \d tablename in psql to see the actual primary key definition
```

```bash
# ── Useful diagnostic commands alongside Prisma ────────────────────────────

# Check current migration status
npx prisma migrate status

# Validate schema.prisma syntax without applying anything
npx prisma validate

# Format schema.prisma (auto-formats whitespace and ordering)
npx prisma format

# Show all tables and their sizes in PostgreSQL
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check which migrations are in the DB
SELECT migration_name, finished_at, applied_steps_count
FROM _prisma_migrations
ORDER BY finished_at ASC;

# Check for schema drift (DB vs schema.prisma)
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel    prisma/schema.prisma \
  --script
# No output = no drift ✅
```

```bash
# ── prisma format — auto-format schema.prisma ─────────────────────────────
npx prisma format

# Before:
# model User{id Int @id @default(autoincrement()) email String @unique name String? createdAt DateTime @default(now())}

# After (formatted):
# model User {
#   id        Int      @id @default(autoincrement())
#   email     String   @unique
#   name      String?
#   createdAt DateTime @default(now())
# }

# Run as part of git pre-commit hook or CI lint check
```

```bash
# ── prisma validate — catch schema errors without migrating ───────────────
npx prisma validate

# Common validation errors caught:
# ✗ The field `userId` on model `Post` is a relation field of type `User`
#   but is missing the @relation attribute
# ✗ Error validating model `Order`:
#   The unique index name `orders_customer_status_unique` is not valid.
#   Index names can contain only ASCII letters, numbers, dashes and underscores.
# ✗ Error: Field `email` in model `User` can't be unique and optional at the same time
#   without a value for `@default`

# Run before committing schema changes:
npx prisma validate && git add prisma/schema.prisma
```

```typescript
// ── Debugging Prisma Client queries — enable query logging ────────────────
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

// Log every query with parameters
prisma.$on("query", (e) => {
  console.log("Query:", e.query);
  console.log("Params:", e.params);
  console.log("Duration:", e.duration, "ms");
  console.log("---");
});

// Or simpler: log all to stdout
const prismaDebug = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Inspect the generated SQL for a specific query:
// Temporarily wrap with event logging, run the query once, check console output
```

---

## W — Why It Matters

- Prisma Studio is the fastest way to verify a migration worked correctly — after running `prisma migrate dev`, open Studio and browse the new model to confirm rows can be created, the new fields are there, and relations load correctly. Faster than writing a test query or opening psql.
- `prisma validate` as a pre-commit hook prevents broken schemas from entering the codebase — a schema error that only surfaces when running `migrate dev` can block the whole team. Validating in CI or pre-commit catches the error at the source.
- Query logging in development (`log: ['query']`) shows the exact SQL Prisma generates, including parameters — this is how you catch N+1 queries, unexpected full table scans, and over-fetching before they reach production. Seeing 50 queries logged for a single page request is an immediate N+1 diagnosis.

---

## I — Interview Q&A

### Q: How do you diagnose and fix an N+1 query problem introduced by Prisma?

**A:** Enable query logging: `new PrismaClient({ log: ['query'] })`. Then load a page and watch the console — if you see one query followed by N identical queries with different IDs, that's N+1. The fix in Prisma is to add `include` or `select` with nested relations to the original query, so Prisma fetches everything in a single JOIN (with `relationJoins` preview feature) or two queries (default: one for parents, one bulk query for all children using `IN (ids)`). For example: `prisma.post.findMany({ include: { author: true } })` — instead of fetching 100 posts and then querying each author, Prisma fetches all posts, collects the unique `authorId` values, and fetches all matching users in one `WHERE id IN (...)` query.

---

## C — Common Pitfalls + Fix

### ❌ Running Prisma Studio against a production database

```bash
# ❌ DATABASE_URL points to production
DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/prod_db"
npx prisma studio
# Opens a browser with FULL READ/WRITE access to production data
# One accidental click deletes a production record ❌
```

**Fix:** Only run Studio against local or staging databases; use environment switching:

```bash
# ✅ Use a local or dev database for Studio
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp_dev" \
  npx prisma studio

# Or use a separate .env.local:
npx dotenv -e .env.local -- prisma studio

# Production data exploration: use psql with a read-only user
psql $PRODUCTION_READONLY_URL
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete developer workflow validation script that: (1) validates `schema.prisma` syntax; (2) checks for schema drift vs the local dev database; (3) formats the schema; (4) runs a quick Prisma Client health check (connects and runs one query); (5) outputs a pass/fail summary. Also show how to add query logging to a `PrismaClient` singleton that only logs in development, and write a `checkDatabaseConnection` utility function.

### Solution

```bash
#!/bin/bash
# scripts/dev-check.sh — Run before starting development

set -e
PASS=0
FAIL=0

check() {
  local label=$1
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Prisma Dev Workflow Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Checking schema..."
check "Schema syntax valid"  npx prisma validate
check "Schema formatted"     npx prisma format --check 2>/dev/null || true

echo ""
echo "Checking database..."
check "Migrations up to date" npx prisma migrate status 2>/dev/null
check "No schema drift" bash -c '
  DIFF=$(npx prisma migrate diff \
    --from-schema-datasource prisma/schema.prisma \
    --to-schema-datamodel prisma/schema.prisma \
    --script 2>&1)
  [ -z "$DIFF" ]
'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ $FAIL -eq 0 ] && exit 0 || exit 1
```

```typescript
// src/lib/prisma.ts — singleton with dev logging + health check

import { PrismaClient, Prisma } from "@prisma/client";

function createPrismaClient() {
  const logConfig: Prisma.PrismaClientOptions["log"] =
    process.env.NODE_ENV === "development"
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [{ emit: "stdout", level: "error" }];

  const client = new PrismaClient({ log: logConfig });

  if (process.env.NODE_ENV === "development") {
    // Log slow queries (> 200ms) to help catch N+1 in development
    (client as any).$on("query", (e: Prisma.QueryEvent) => {
      if (e.duration > 200) {
        console.warn(`[SLOW QUERY ${e.duration}ms]`, e.query);
      }
    });
  }

  return client;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ── Health check utility ───────────────────────────────────────────────────
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// Usage in a health-check API route:
// const db = await checkDatabaseConnection()
// if (!db.connected) return Response.json({ status: 'error', db }, { status: 503 })
// return Response.json({ status: 'ok', db })
```

---

## ✅ Day 7 Complete — Prisma Database Workflows

| #   | Subtopic                                   | Status |
| --- | ------------------------------------------ | ------ |
| 1   | Introspection — `prisma db pull`           | ☐      |
| 2   | Working with an Existing Database          | ☐      |
| 3   | Baseline Migration Mindset                 | ☐      |
| 4   | Schema Evolution — Safe Patterns           | ☐      |
| 5   | Unsupported Feature Awareness              | ☐      |
| 6   | `prisma migrate diff`                      | ☐      |
| 7   | Raw SQL with `$queryRaw` and `$executeRaw` | ☐      |
| 8   | Custom SQL in Migrations                   | ☐      |
| 9   | `prisma db seed`                           | ☐      |
| 10  | Prisma Studio and Introspection Debugging  | ☐      |

> **Your next action:** Run `npx prisma studio` against your local dev database. Browse one model. Add one test record. Delete it. That's it — you've completed the full Day 7 loop.
