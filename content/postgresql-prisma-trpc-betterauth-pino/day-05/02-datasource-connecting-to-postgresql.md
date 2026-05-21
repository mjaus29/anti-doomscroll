# 2 — datasource — Connecting to PostgreSQL

---

## T — TL;DR

The `datasource` block tells Prisma which database engine to use and how to connect to it. For PostgreSQL, the `provider` is `"postgresql"` and the `url` is a connection string — always loaded from an environment variable, never hard-coded. The `directUrl` and `shadowDatabaseUrl` fields are used for connection pooling (PgBouncer) and migration workflows respectively.

---

## K — Key Concepts

```prisma
// ── Basic datasource ───────────────────────────────────────────────────────
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// env("DATABASE_URL") reads from the .env file (or OS environment)
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

```prisma
// ── directUrl — for connection poolers (PgBouncer, Supabase Pooler) ────────
// PgBouncer in transaction mode doesn't support prepared statements
// Prisma needs a direct (non-pooled) connection for migrations
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled URL — used by Prisma Client at runtime
  directUrl = env("DIRECT_DATABASE_URL") // direct URL — used for prisma migrate
}

// .env:
// DATABASE_URL="postgresql://user:pass@pooler-host:6543/db?pgbouncer=true"
// DIRECT_DATABASE_URL="postgresql://user:pass@direct-host:5432/db"

// When to use directUrl:
// ✅ Supabase with connection pooler enabled
// ✅ PgBouncer in transaction/statement mode
// ✅ Neon serverless (use pooled URL for app, direct for migrations)
// ❌ Not needed for direct connections (local dev, Railway, Render without pooler)
```

```prisma
// ── shadowDatabaseUrl — for development migration workflow ────────────────
// Prisma needs a "shadow" database to safely calculate migration diffs
// Usually only needed when the main DB user lacks CREATE DATABASE permission

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

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
  url      = env("DATABASE_URL")
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
// "mysql"       → MySQL / MariaDB / PlanetScale
// "sqlite"      → SQLite (file-based, great for tests)
// "sqlserver"   → Microsoft SQL Server / Azure SQL
// "mongodb"     → MongoDB (different schema rules apply)

// For testing — switch to SQLite without changing models:
datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}
// Most scalar types work across providers — but @db. native types are provider-specific
```

```
── .env file setup ───────────────────────────────────────────────────────────

Project root .env (loaded automatically by Prisma CLI):
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

- Hardcoding the database URL in `schema.prisma` is a critical security mistake — connection strings contain credentials. `env("DATABASE_URL")` reads from environment at runtime so the secret lives only in `.env` (local) or a secrets manager (production).
- The `directUrl` + `url` split is required when using connection poolers like PgBouncer or Supabase's pooler — Prisma Client uses the pooled URL for all runtime queries (efficient), while `prisma migrate` uses the direct URL (necessary because migrations require DDL statements that poolers can't handle in transaction mode).
- Using `?schema=public` in the connection string sets the PostgreSQL `search_path` — critical when your tables are in a non-default schema. Without it, Prisma may not find your tables even if they exist.

---

## I — Interview Q&A

### Q: What is the difference between `url` and `directUrl` in a Prisma datasource?

**A:** `url` is the connection string Prisma Client uses at runtime for all database queries in your application — this is typically a pooled connection via PgBouncer or Supabase's connection pooler for performance and scalability. `directUrl` is a direct (non-pooled) connection string used exclusively by the Prisma CLI for schema migrations (`prisma migrate dev`, `prisma migrate deploy`). The distinction exists because connection poolers operating in transaction mode don't support PostgreSQL features that migrations require — specifically prepared statements and `SET` commands for session configuration. By separating the two URLs, you get pooled performance at runtime and reliable migration execution.

---

## C — Common Pitfalls + Fix

### ❌ Hard-coding credentials in schema.prisma

```prisma
// ❌ Credentials in source code — security incident waiting to happen
datasource db {
  provider = "postgresql"
  url      = "postgresql://admin:supersecret123@prod-db.example.com:5432/myapp"
}
```

**Fix:** Always use `env()`:

```prisma
// ✅ Credentials stay in .env (not committed to git)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```
// .env (add to .gitignore)
DATABASE_URL="postgresql://admin:supersecret123@prod-db.example.com:5432/myapp"
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `datasource` configuration for a production Next.js app deployed on Vercel with a Supabase PostgreSQL database using the connection pooler. Requirements: (1) runtime queries use the pooled URL, (2) migrations use the direct URL, (3) both URLs come from environment variables, (4) include the correct connection string options for Supabase's pooler, (5) also write a `.env.example` file showing all required variables.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  // Pooled URL for runtime Prisma Client queries
  // ?pgbouncer=true tells Prisma to disable prepared statements
  // connection_limit=1 avoids connection exhaustion in serverless (Vercel)
  url       = env("DATABASE_URL")

  // Direct URL for prisma migrate — bypasses the pooler
  directUrl = env("DIRECT_DATABASE_URL")
}
```

```bash
# .env.example — commit this file (no real values)
# ─── Supabase connection strings ─────────────────────────────────────────────
# Pooled connection (used by Prisma Client at runtime)
# Find in: Supabase Dashboard → Settings → Database → Connection String → Transaction mode
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection (used by prisma migrate only)
# Find in: Supabase Dashboard → Settings → Database → Connection String → Session mode
DIRECT_DATABASE_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

```bash
# .env — your actual values (never commit)
DATABASE_URL="postgresql://postgres.abcdefghijklm:MyPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_DATABASE_URL="postgresql://postgres.abcdefghijklm:MyPassword123@db.abcdefghijklm.supabase.co:5432/postgres"
```

---

---
