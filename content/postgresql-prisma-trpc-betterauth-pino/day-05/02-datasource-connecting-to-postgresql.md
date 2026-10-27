# 2 — datasource — Connecting to PostgreSQL

---

## T — TL;DR

In Prisma 7 the `datasource` block only declares the engine (`provider = "postgresql"`). The connection string no longer lives in `schema.prisma`: the CLI reads it from `datasource.url` in `prisma.config.ts`, and your app passes a connection string to a driver adapter (`@prisma/adapter-pg`) when it builds `PrismaClient`. Always load it from an environment variable, never hard-code it. `url`, `directUrl` and `shadowDatabaseUrl` in the schema are removed in Prisma 7 (before Prisma 7 they were set in the datasource block).

---

## K — Key Concepts

```prisma
// ── Basic datasource (Prisma 7) ────────────────────────────────────────────
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  // no url here in Prisma 7 — see prisma.config.ts
}
```

```ts
// prisma.config.ts — used by the Prisma CLI (migrate, db pull, studio)
import 'dotenv/config'   // Prisma 7 does NOT load .env automatically
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
})
// Before Prisma 7: `url = env("DATABASE_URL")` inside the datasource block.
```

```ts
// src/lib/prisma.ts — runtime connection goes through a driver adapter
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
// The `datasources` / `datasourceUrl` constructor options were removed in Prisma 7.
```

```
// .env file (never commit to git):
// DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

```
── PostgreSQL connection string anatomy ─────────────────────────────────────

postgresql://[user]:[password]@[host]:[port]/[database]?[options]

Examples:
  Local dev:
  postgresql://postgres:password@localhost:5432/myapp_dev

  With search path (schema):
  postgresql://postgres:password@localhost:5432/myapp?schema=public

  With SSL (production):
  postgresql://user:pass@prod-host:5432/myapp?sslmode=require

  Supabase (connection pooler):
  postgresql://postgres.[project-ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres

  Neon (serverless):
  postgresql://user:pass@ep-name.region.aws.neon.tech/dbname?sslmode=require
```

```ts
// ── Poolers (PgBouncer, Supabase Pooler): two URLs, two places ─────────────
// PgBouncer in transaction mode can't run migrations reliably (DDL, SET, advisory locks),
// so the CLI needs a DIRECT (non-pooled) connection, while the app can use the POOLED one.

// prisma.config.ts → CLI (migrate, db pull) uses the direct URL
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_DATABASE_URL'),          // direct, non-pooled
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'), // optional, see below
  },
})

// src/lib/prisma.ts → runtime uses the pooled URL via the adapter
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL }) // pooled
export const prisma = new PrismaClient({ adapter })

// Before Prisma 7 this was `url` (pooled) + `directUrl` (direct) in the datasource block.
// In Prisma 7 the config `url` IS the direct one (the old `directUrl` role).

// .env:
// DATABASE_URL="postgresql://user:pass@pooler-host:6543/db"
// DIRECT_DATABASE_URL="postgresql://user:pass@direct-host:5432/db"

// When to split the URLs:
// ✅ Supabase with connection pooler enabled
// ✅ PgBouncer in transaction/statement mode
// ✅ Neon serverless (use pooled URL for app, direct for migrations)
// ❌ Not needed for direct connections (local dev, Railway, Render without pooler)
```

```ts
// ── shadowDatabaseUrl — for development migration workflow ────────────────
// Prisma needs a "shadow" database to safely calculate migration diffs
// Usually only needed when the main DB user lacks CREATE DATABASE permission
// Prisma 7: set it in prisma.config.ts → datasource.shadowDatabaseUrl (not in schema.prisma)

// Shadow database is a temporary DB Prisma creates, applies all migrations to,
// compares with the target DB, then drops it.
// Not needed in production (prisma migrate deploy doesn't use shadow DB)
```

```prisma
// ── schemas — PostgreSQL schema (namespace) support ───────────────────────
// PostgreSQL has schemas (namespaces) within a database
// Default schema is "public"

datasource db {
  provider = "postgresql"
  schemas  = ["public", "auth", "billing"]  // multi-schema support (Prisma 4.3+)
}

// Then on models:
model User {
  id    Int    @id @default(autoincrement())
  email String @unique

  @@schema("auth")  // this model lives in the "auth" PostgreSQL schema
}
```

```prisma
// ── provider options ───────────────────────────────────────────────────────
// Prisma 7 supported providers:
// "postgresql"  → PostgreSQL / CockroachDB
// "mysql"       → MySQL / MariaDB
// "sqlite"      → SQLite (file-based, great for tests)
// "sqlserver"   → Microsoft SQL Server / Azure SQL
// ("mongodb" is NOT supported by Prisma 7 yet — stay on Prisma 6 for MongoDB)

// Every provider needs a driver adapter at runtime in Prisma 7
// (e.g. @prisma/adapter-pg for PostgreSQL, @prisma/adapter-better-sqlite3 for SQLite).
datasource db {
  provider = "sqlite"
}
// Most scalar types work across providers — but @db. native types are provider-specific
```

```
── .env file setup ───────────────────────────────────────────────────────────

Project root .env (Prisma 7 does NOT load it for you — `import 'dotenv/config'`
at the top of prisma.config.ts, or use Node's --env-file / Bun):
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp_dev"

Never commit .env to git:
  .gitignore:
    .env
    .env.local
    .env.*.local

.env.example (safe to commit — shows required variables without values):
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
  DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

---

## W — Why It Matters

- Hardcoding the database URL in `schema.prisma` is a critical security mistake — connection strings contain credentials. `env('DATABASE_URL')` in `prisma.config.ts` (and `process.env.DATABASE_URL` in the adapter) reads from the environment so the secret lives only in `.env` (local) or a secrets manager (production).
- Splitting the two URLs is required when using connection poolers like PgBouncer or Supabase's pooler — in Prisma 7 the adapter gets the pooled URL for all runtime queries (efficient), while `prisma.config.ts` gives the CLI the direct URL (necessary because migrations require DDL statements that poolers can't handle in transaction mode).
- Using `?schema=public` in the connection string sets the PostgreSQL `search_path` — critical when your tables are in a non-default schema. Without it, Prisma may not find your tables even if they exist.

---

## I — Interview Q&A

### Q: How do you handle pooled vs direct connection URLs in Prisma 7?

**A:** The runtime connection string is passed to the driver adapter (`new PrismaPg({ connectionString })`) — typically a pooled connection via PgBouncer or Supabase's pooler for performance and scalability. The `datasource.url` in `prisma.config.ts` is used by the Prisma CLI for schema migrations (`prisma migrate dev`, `prisma migrate deploy`), so it should be the direct (non-pooled) connection. Before Prisma 7 this was the `url` / `directUrl` pair in the schema's datasource block. The distinction exists because connection poolers operating in transaction mode don't support PostgreSQL features that migrations require — specifically prepared statements and `SET` commands for session configuration. By separating the two, you get pooled performance at runtime and reliable migration execution.

---

## C — Common Pitfalls + Fix

### ❌ Hard-coding credentials in schema.prisma

```ts
// ❌ Credentials in source code — security incident waiting to happen
// prisma.config.ts
export default defineConfig({
  datasource: { url: 'postgresql://admin:supersecret123@prod-db.example.com:5432/myapp' },
})
```

**Fix:** Always read from the environment (in Prisma 7, in `prisma.config.ts` and the adapter, not in the schema):

```ts
// ✅ Credentials stay in .env (not committed to git)
export default defineConfig({
  datasource: { url: env('DATABASE_URL') },
})
```

```
// .env (add to .gitignore)
DATABASE_URL="postgresql://admin:supersecret123@prod-db.example.com:5432/myapp"
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `datasource` configuration for a production Next.js app deployed on Vercel with a Supabase PostgreSQL database using the connection pooler. Requirements: (1) runtime queries use the pooled URL (through the `pg` driver adapter), (2) migrations use the direct URL (in `prisma.config.ts`), (3) both URLs come from environment variables, (4) use the correct Supabase pooler connection string and keep the serverless pool small, (5) also write a `.env.example` file showing all required variables.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

```ts
// prisma.config.ts — CLI: direct URL, bypasses the pooler
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DIRECT_DATABASE_URL') },
})
```

```ts
// src/lib/prisma.ts — runtime: pooled URL through the pg adapter
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,   // pooled (Supabase transaction mode)
  max: 1,                                       // avoid connection exhaustion in serverless (Vercel)
})
export const prisma = new PrismaClient({ adapter })
// Before Prisma 7 this was `?pgbouncer=true&connection_limit=1` on the URL — those are
// Prisma-engine query params; the pg driver uses pool options such as `max` instead.
```

```bash
# .env.example — commit this file (no real values)
# ─── Supabase connection strings ─────────────────────────────────────────────
# Pooled connection (used by the pg adapter at runtime)
# Find in: Supabase Dashboard → Settings → Database → Connection String → Transaction mode
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Direct connection (used by prisma.config.ts / prisma migrate only)
# Find in: Supabase Dashboard → Settings → Database → Connection String → Session mode
DIRECT_DATABASE_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

```bash
# .env — your actual values (never commit)
DATABASE_URL="postgresql://postgres.abcdefghijklm:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DIRECT_DATABASE_URL="postgresql://postgres.abcdefghijklm:MyPassword123@db.abcdefghijklm.supabase.co:5432/postgres"
```

---

---
