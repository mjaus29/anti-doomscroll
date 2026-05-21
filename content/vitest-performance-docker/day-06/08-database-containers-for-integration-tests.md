# 8 — Database Containers for Integration Tests

---

## T — TL;DR

Integration tests need a real database. The standard pattern: start PostgreSQL in Docker with `tmpfs`, run migrations once in `beforeAll`, wrap each test in a transaction that rolls back in `afterEach`. This gives full DB fidelity, fast isolated tests, and zero cleanup code. Alternatively, use a fresh DB per test file with `pg_dump`/restore or Prisma's `--force-reset`.

---

## K — Key Concepts

```typescript
// ── Pattern 1: transaction rollback (fastest) ─────────────────────────────
// One DB, one migration, transaction wraps each test

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { execSync } from 'child_process'

beforeAll(async () => {
  // Run migrations once for the whole suite
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Per-test transaction isolation
let transactionPrisma: typeof prisma

beforeEach(async () => {
  // Start a transaction — all operations in this test use it
  // Prisma interactive transaction gives an isolated client
  // Note: full rollback approach requires raw pg client or Prisma extension
})

afterEach(async () => {
  // Rollback — all test data gone, no cleanup code needed ✅
  await prisma.$executeRaw`ROLLBACK`
})
```

```typescript
// ── Pattern 2: truncate tables between tests (simpler) ────────────────────
// Faster than migration re-run, simpler than transactions

async function truncateAllTables() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations')
  `
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`
    )
  }
}

afterEach(async () => {
  await truncateAllTables()  // clean slate for next test ✅
})
```

```typescript
// ── Pattern 3: database per test file — maximum isolation ─────────────────
// Each test file gets its own fresh DB — no sharing, no order dependency
// Trade-off: slower (N migrations), uses more connections

import { randomUUID } from 'crypto'

const DB_NAME = `test_${randomUUID().replace(/-/g, '')}`
let DATABASE_URL: string

beforeAll(async () => {
  // Create a unique database for this test file
  const adminClient = new Client({ connectionString: process.env.ADMIN_DATABASE_URL })
  await adminClient.connect()
  await adminClient.query(`CREATE DATABASE "${DB_NAME}"`)
  await adminClient.end()

  DATABASE_URL = process.env.DATABASE_URL!.replace('/test_db', `/${DB_NAME}`)

  // Run migrations on the new DB
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
  const adminClient = new Client({ connectionString: process.env.ADMIN_DATABASE_URL })
  await adminClient.connect()
  await adminClient.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`)
  await adminClient.end()
})
```

```yaml
# docker-compose.test.yml — DB for integration tests
services:
  test-db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER:     test
      POSTGRES_PASSWORD: test
      POSTGRES_DB:       test_db
      # Allow creating additional databases (for Pattern 3)
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "127.0.0.1:5433:5432"   # port 5433 — doesn't conflict with dev DB on 5432
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U test"]
      interval: 3s
      retries:  10
```

```bash
# ── Start test DB, run migrations, run tests ──────────────────────────────
# Useful local script: scripts/test-integration.sh

#!/bin/bash
set -e

# Start test DB
docker compose -f docker-compose.test.yml up -d test-db

# Wait for health
until docker compose -f docker-compose.test.yml exec test-db \
  pg_isready -U test; do sleep 1; done

# Run migrations
DATABASE_URL=postgresql://test:test@localhost:5433/test_db \
  npx prisma migrate deploy

# Run integration tests
DATABASE_URL=postgresql://test:test@localhost:5433/test_db \
  npx vitest run src/**/*.integration.test.ts

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

---

## W — Why It Matters

- The truncate pattern is 90% of what teams need — it's simpler than transaction rollback (no need to pass a transaction client through all layers), faster than re-running migrations (just `TRUNCATE`), and easier to reason about than per-file databases.
- Port 5433 for the test DB prevents collisions with the dev DB on 5432 — developers can keep both running simultaneously. CI doesn't have a dev DB, so it doesn't matter there, but locally it's essential.
- `RESTART IDENTITY` in the truncate clears serial sequences — without it, IDs keep incrementing across test runs, which can confuse tests that hardcode or snapshot IDs. Always include it.

---

## I — Interview Q&A

### Q: How do you ensure test isolation when running integration tests against a real PostgreSQL database?

**A:** Three strategies, ordered by speed vs isolation: (1) Transaction rollback — wrap each test in a database transaction using `BEGIN` in `beforeEach` and `ROLLBACK` in `afterEach`. All changes are undone atomically. Fastest approach but requires all code to accept a transaction client. (2) Table truncation — run `TRUNCATE ... RESTART IDENTITY CASCADE` on all tables in `afterEach`. Slightly slower than rollback but works with any database client without needing to thread a transaction through the code. (3) Database-per-file — create a unique database for each test file in `beforeAll`, drop it in `afterAll`. Maximum isolation, no shared state between files, but requires N migrations and N database connections. For most projects, option 2 (truncate) is the best balance of simplicity, speed, and isolation.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `CASCADE` in TRUNCATE — FK constraint errors

```sql
-- ❌ FK constraints prevent truncating parent tables when children exist
TRUNCATE TABLE users;
-- ERROR: cannot truncate a table referenced in a foreign key constraint

-- ✅ CASCADE clears all dependent tables in correct order
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a Vitest `setupTests.ts` that: (1) runs `prisma migrate deploy` once before all tests; (2) truncates all non-migration tables in `afterEach`; (3) disconnects Prisma in `afterAll`. Use a `DATABASE_URL` from environment.

### Solution

```typescript
// src/test/setup-db.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { execSync }                        from 'child_process'
import { prisma }                          from '@/lib/prisma'

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env:   { ...process.env },
  })
}, 60_000)  // 60s timeout for migrations

afterEach(async () => {
  // Fetch all user tables, exclude Prisma migration tracking
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `
  if (tables.length === 0) return

  const tableList = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(', ')

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

```typescript
// vitest.config.ts — use setup file for integration tests
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup-db.ts'],
    pool:       'forks',          // isolated processes — safe for DB tests
    poolOptions: { forks: { singleFork: true } },  // serial — shared DB
  },
})
```

---

---
