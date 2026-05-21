
# 📅 Day 5 — Prisma Schema Fundamentals

> **Goal:** Master the `schema.prisma` file from the ground up — configure the datasource and generator, model every table with correct field types, constraints, enums, and native type mappings, understand how Prisma names map to PostgreSQL names, and generate a fully-typed Prisma Client ready for use in a TypeScript backend.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Prisma ORM 7.x · PostgreSQL 18 · TypeScript 6 · Node.js

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | schema.prisma — File Structure and the Three Blocks | 10 min |
| 2 | datasource — Connecting to PostgreSQL | 10 min |
| 3 | generator — Prisma Client Configuration | 10 min |
| 4 | Models — Declaring Tables and Fields | 12 min |
| 5 | Field Types — Scalar Types and the Type Mapping Rules | 12 min |
| 6 | Field Modifiers — Optional, List, Default, @id, @unique, @updatedAt | 12 min |
| 7 | Enums — Type-Safe Categorical Values | 10 min |
| 8 | Native Type Mapping — Precise PostgreSQL Type Control | 12 min |
| 9 | Model-to-Table Mapping — @@map, @map, @@schema, Naming Conventions | 10 min |
| 10 | Prisma Client Generation — prisma generate, Output, and Usage | 12 min |

---

---

# 1 — schema.prisma — File Structure and the Three Blocks

---

## T — TL;DR

`schema.prisma` is the single source of truth for your database schema and Prisma configuration. It contains exactly three kinds of blocks: `datasource` (one — what database to connect to), `generator` (one or more — what code to generate), and `model` / `enum` / `type` (many — the data shape). Everything flows from this file: migrations, the client, and TypeScript types.

---

## K — Key Concepts

```prisma
// schema.prisma — the complete anatomy

// ── 1. Generator block ────────────────────────────────────────────────────
// Tells Prisma what to generate and where.
// Always required. Usually one: the Prisma Client for TypeScript.
generator client {
  provider = "prisma-client-js"
}

// ── 2. Datasource block ───────────────────────────────────────────────────
// Tells Prisma which database to connect to and how.
// Exactly one datasource per schema file.
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── 3. Model blocks ───────────────────────────────────────────────────────
// Each model maps to a database table (by default).
// Fields map to columns.
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}

// ── 4. Enum blocks ────────────────────────────────────────────────────────
// A named set of allowed string values — maps to a PostgreSQL ENUM type.
enum Role {
  ADMIN
  USER
  MODERATOR
}

// ── 5. Type blocks (composite types) ─────────────────────────────────────
// For MongoDB only (embedded documents). Not used with PostgreSQL.
// Omit entirely for relational databases.
```

```
── File location and discovery ─────────────────────────────────────────────

Default location (Prisma looks here automatically):
  prisma/schema.prisma

Custom location (set in package.json):
  "prisma": { "schema": "src/db/schema.prisma" }

Or with CLI flag:
  npx prisma generate --schema=./custom/path/schema.prisma
  npx prisma migrate dev --schema=./custom/path/schema.prisma
```

```
── The three-block mental model ─────────────────────────────────────────────

datasource db     → WHERE is the database?
                    (connection string, provider type)

generator client  → WHAT code do we generate from the schema?
                    (Prisma Client, TypeScript types, output path)

model / enum      → WHAT does the data look like?
                    (tables, columns, types, relations, constraints)

Order in the file doesn't matter — Prisma processes all blocks regardless.
Convention: generator → datasource → enums → models (alphabetical or by domain).
```

```prisma
// ── Multi-file schema (Prisma 5.15+ preview, standard in Prisma 7) ─────────
// Prisma 7 supports splitting schema into multiple files.
// All files in the prisma/ directory are merged automatically.

// prisma/schema.prisma — main config
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// prisma/user.prisma — user domain
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}

// prisma/order.prisma — order domain
model Order {
  id     Int  @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id])
}

// CLI merges all .prisma files in the directory automatically
// npx prisma generate   ← reads all .prisma files in prisma/
```

```
── Comments in schema.prisma ────────────────────────────────────────────────

// Single-line comment — not included in generated code or migrations

/// Triple-slash doc comment — included in generated TypeScript JSDoc
/// This comment appears on the generated TypeScript type and on hover in IDE
model Product {
  /// The product's unique stock-keeping unit
  sku  String @unique
}
```

---

## W — Why It Matters

- `schema.prisma` is the contract between your TypeScript application and your PostgreSQL database — every model you define becomes a TypeScript type, a Prisma Client method, and (via migrations) a real table. Understanding its structure means you can read, write, and debug any Prisma project immediately.
- The three-block structure is intentionally minimal — datasource and generator are configuration, models are the schema. This separation means you can switch databases (change datasource provider) or swap code generators (change generator) without touching model definitions.
- Triple-slash `///` comments appear as JSDoc on generated types and show up in IDE auto-complete. This turns schema comments into living documentation — developers see field descriptions on hover without opening the schema file.

---

## I — Interview Q&A

### Q: What are the three main block types in `schema.prisma` and what is each responsible for?

**A:** The three block types are `datasource`, `generator`, and `model` (plus `enum` as a companion to models). The `datasource` block defines the database connection — which database provider (PostgreSQL, MySQL, SQLite) and the connection URL. The `generator` block defines what Prisma should generate from the schema — typically `prisma-client-js` which produces the typed Prisma Client and TypeScript types. The `model` blocks define the data structure — each model maps to a database table, with fields mapping to columns, complete with types, modifiers, and constraints. `enum` blocks define named sets of allowed values. All three types are processed together when you run `prisma generate` or `prisma migrate`.

### Q: Where does Prisma look for the schema file by default?

**A:** Prisma looks for `prisma/schema.prisma` relative to the project root by default. You can override this with the `--schema` CLI flag or by setting `"prisma": { "schema": "path/to/schema.prisma" }` in `package.json`. Prisma 5.15+ and Prisma 7 support multi-file schemas — all `.prisma` files in the `prisma/` directory (or a custom directory) are automatically merged into one logical schema.

---

## C — Common Pitfalls + Fix

### ❌ Using `type` blocks in a PostgreSQL schema (MongoDB-only feature)

```prisma
// ❌ type blocks are for MongoDB embedded documents only
type Address {
  street String
  city   String
}
model User {
  address Address  // ← invalid for PostgreSQL
}
```

**Fix:** Use a separate related model or JSONB field for PostgreSQL:

```prisma
// ✅ Option A: related model (normalized)
model User {
  id      Int     @id @default(autoincrement())
  address Address?
}
model Address {
  id     Int    @id @default(autoincrement())
  street String
  city   String
  userId Int    @unique
  user   User   @relation(fields: [userId], references: [id])
}

// ✅ Option B: Json field (flexible, denormalized)
model User {
  id      Int  @id @default(autoincrement())
  address Json?
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a complete bare-bones `schema.prisma` file for a blogging platform. Include: (1) a generator for Prisma Client JS, (2) a PostgreSQL datasource reading `DATABASE_URL` from the environment, (3) a `Post` model with fields for id, title, body, published status, and timestamps, (4) a `Category` enum with values `TECH`, `LIFESTYLE`, `BUSINESS`, (5) triple-slash doc comments on at least two fields. Follow the conventional block ordering.

### Solution

```prisma
// prisma/schema.prisma

// ── Generator ──────────────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
}

// ── Datasource ─────────────────────────────────────────────────────────────
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Enums ──────────────────────────────────────────────────────────────────
enum Category {
  TECH
  LIFESTYLE
  BUSINESS
}

// ── Models ─────────────────────────────────────────────────────────────────

/// A blog post written by an author.
/// Maps to the "posts" table in PostgreSQL.
model Post {
  /// Auto-incrementing primary key.
  id        Int      @id @default(autoincrement())

  /// The post headline — must be unique across all posts.
  title     String   @unique

  body      String
  published Boolean  @default(false)
  category  Category @default(TECH)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

---

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

# 3 — generator — Prisma Client Configuration

---

## T — TL;DR

The `generator` block tells Prisma what code to generate from your schema. The standard generator is `prisma-client-js` which produces the typed Prisma Client, TypeScript types, and DMMF (Data Model Meta Format). You can configure the output directory, add preview features, and even run multiple generators (e.g. also generating Zod schemas or JSON Schema). Run `prisma generate` to execute all generators.

---

## K — Key Concepts

```prisma
// ── Standard generator ─────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
}

// Default output: node_modules/.prisma/client
// Re-exported from: node_modules/@prisma/client
// Usage: import { PrismaClient } from '@prisma/client'
```

```prisma
// ── Generator fields ───────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client-js"   // required: which generator to use
  output          = "../src/generated/prisma"  // optional: custom output path
  binaryTargets   = ["native"]           // optional: OS targets for query engine
  previewFeatures = ["multiSchema"]      // optional: enable preview features
}
```

```prisma
// ── binaryTargets — deployment target configuration ───────────────────────
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native"]
  // "native" = detect current OS automatically (dev machines)
}

// For Docker (linux) + local dev (macOS or Windows):
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  // "linux-musl-openssl-3.0.x" = Alpine Linux (common Docker base image)
}

// For Vercel Edge / AWS Lambda (linux arm64):
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

// Common targets:
// native                    → auto-detect (development)
// linux-musl-openssl-3.0.x  → Alpine Linux (Docker alpine:3.x)
// linux-musl-arm64-openssl-3.0.x → Alpine ARM64 (M1/M2 Mac Docker)
// rhel-openssl-3.0.x        → Amazon Linux 2023, RHEL, Vercel, Lambda
// debian-openssl-3.0.x      → Debian/Ubuntu (default Dockerfile FROM node)
```

```prisma
// ── previewFeatures ────────────────────────────────────────────────────────
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions", "views"]
}

// Preview features as of Prisma 7:
// multiSchema          → use multiple PostgreSQL schemas in one schema file
// postgresqlExtensions → manage PostgreSQL extensions in schema.prisma
// views                → map Prisma models to SQL views (read-only)
// tracing              → OpenTelemetry tracing for Prisma queries
// relationJoins        → use SQL JOINs instead of separate queries for relations (performance)

// Check stable vs preview status at: https://pris.ly/d/preview-features
```

```prisma
// ── Custom output path ────────────────────────────────────────────────────
generator client {
  provider = "prisma-client-js"
  output   = "../src/lib/prisma-client"
  // Useful when: monorepos, custom module resolution, avoiding node_modules pollution
}

// Import changes to match:
import { PrismaClient } from '../lib/prisma-client'
// instead of:
import { PrismaClient } from '@prisma/client'
```

```prisma
// ── Multiple generators ────────────────────────────────────────────────────
// Run multiple generators simultaneously with prisma generate

generator client {
  provider = "prisma-client-js"
}

// Generate Zod validation schemas from Prisma models
generator zod {
  provider = "zod-prisma-types"
  output   = "./src/generated/zod"
}

// Generate JSON Schema
generator jsonSchema {
  provider = "prisma-json-schema-generator"
  output   = "./src/generated/json-schema"
}

// All generators run when you execute: npx prisma generate
```

```
── prisma generate — what it does ───────────────────────────────────────────

npx prisma generate

1. Reads schema.prisma (all .prisma files if multi-file)
2. Validates the schema (syntax + semantic checks)
3. Runs each generator block in parallel
4. For prisma-client-js:
   a. Generates TypeScript types for all models and enums
   b. Compiles the Prisma Client runtime
   c. Downloads the query engine binary for the target platform
   d. Outputs to node_modules/.prisma/client (default)
5. The @prisma/client package re-exports from .prisma/client

Run after:
  - Any schema change
  - Fresh npm install (postinstall hook recommended)
  - Changing binaryTargets or previewFeatures
```

```json
// package.json — auto-run prisma generate after npm install
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
// This ensures the Prisma Client is always regenerated after dependencies are installed
// Required in CI/CD and Vercel deployments
```

---

## W — Why It Matters

- `binaryTargets` is the most common deployment footgun — if you develop on macOS and deploy to a Linux Docker container without setting the correct target, the query engine binary won't work in the container and Prisma throws a cryptic "Query engine binary not found" error at runtime. Set both `"native"` and your deployment target explicitly.
- The `postinstall` hook in `package.json` is essential for CI/CD and platforms like Vercel — without it, `@prisma/client` is installed but the generated client code is missing, causing import errors at runtime.
- Multiple generators let you generate Zod schemas from Prisma models without maintaining two separate schemas — the Prisma model is the single source of truth for both database structure and TypeScript/Zod validation.

---

## I — Interview Q&A

### Q: Why do you need to run `prisma generate` after every schema change and after `npm install`?

**A:** `prisma generate` produces the Prisma Client — a set of TypeScript types and runtime code specific to your exact schema. The generated client lives in `node_modules/.prisma/client` and is not checked into git (it's in `.gitignore`). If you change a model and don't regenerate, TypeScript will have stale types — it won't know about new fields or models. After `npm install` (e.g. in CI or on a new machine), `node_modules` is freshly populated but the generated client doesn't exist yet — only the base `@prisma/client` package is present. Running `prisma generate` (or the `postinstall` hook) creates the generated client. Without it, `import { PrismaClient } from '@prisma/client'` will fail or have incomplete types.

---

## C — Common Pitfalls + Fix

### ❌ Missing binaryTarget for Docker deployment

```prisma
// ❌ Only "native" — works on dev machine but fails in Docker
generator client {
  provider = "prisma-client-js"
  // binaryTargets not set — defaults to ["native"]
}
```

```dockerfile
# ❌ In Docker: Prisma can't find the Linux query engine binary
# Error: "Query engine binary for current platform 'linux-musl' not found"
```

**Fix:** Add the Docker target:

```prisma
// ✅ Include both dev (native) and production (linux) targets
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
  // linux-musl = Alpine Linux (common in Docker FROM node:alpine)
  // debian-openssl-3.0.x for Debian/Ubuntu-based images
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the `generator` block for a production app that: (1) uses `prisma-client-js` with a custom output to `src/lib/db/client`, (2) includes binary targets for local macOS/Windows development AND Alpine Linux Docker deployment AND Vercel (RHEL), (3) enables the `relationJoins` preview feature for better JOIN performance, (4) add the `postinstall` script to `package.json`. Show the resulting import path.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  output          = "../src/lib/db/client"
  binaryTargets   = [
    "native",                         // local dev (macOS, Windows, Linux)
    "linux-musl-openssl-3.0.x",       // Docker Alpine (node:alpine)
    "linux-musl-arm64-openssl-3.0.x", // Docker Alpine ARM64 (M1/M2 Mac)
    "rhel-openssl-3.0.x"              // Vercel, AWS Lambda, Amazon Linux 2023
  ]
  previewFeatures = ["relationJoins"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```json
// package.json
{
  "name": "my-app",
  "scripts": {
    "postinstall": "prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy"
  }
}
```

```typescript
// src/lib/db/prisma.ts — singleton pattern
import { PrismaClient } from './client'  // ← custom output path

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

---

# 4 — Models — Declaring Tables and Fields

---

## T — TL;DR

A `model` in Prisma is a declaration of a database table. Each model has a name (PascalCase by convention), fields (columns), and at least one `@id` field. Fields have a name, a type, optional modifiers, and optional attributes. Model and field names follow Prisma's naming conventions but can be mapped to any PostgreSQL table/column name with `@@map` and `@map`.

---

## K — Key Concepts

```prisma
// ── Anatomy of a model ────────────────────────────────────────────────────
model ModelName {
  // fieldName   FieldType  modifier?  attribute(s)?
  id            Int         @id        @default(autoincrement())
  email         String                 @unique
  name          String?                // ? = optional (nullable)
  createdAt     DateTime               @default(now())
}
// ModelName   → PascalCase → maps to snake_case table "model_name" by default
// fieldName   → camelCase  → maps to snake_case column "field_name" by default
```

```prisma
// ── Every model needs a unique identifier ─────────────────────────────────

// Option 1: Single @id field (most common)
model User {
  id Int @id @default(autoincrement())
}

// Option 2: @id with UUID
model Session {
  id String @id @default(uuid())
}

// Option 3: @@id — composite primary key (for junction tables)
model PostTag {
  postId Int
  tagId  Int

  @@id([postId, tagId])
}
```

```prisma
// ── Complete realistic model ───────────────────────────────────────────────
model User {
  // Identity
  id        Int      @id @default(autoincrement())

  // Required fields (NOT NULL in PostgreSQL)
  email     String   @unique
  username  String   @unique

  // Optional fields (NULL allowed in PostgreSQL)
  firstName String?
  lastName  String?
  bio       String?

  // Fields with defaults
  isActive  Boolean  @default(true)
  role      Role     @default(USER)   // enum type (defined separately)

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt       // auto-updated on every save

  // Relation fields (virtual — not real columns)
  posts     Post[]
  profile   Profile?

  // Model-level attributes
  @@map("users")                      // maps to "users" table (not "User")
}
```

```prisma
// ── Required vs Optional fields ───────────────────────────────────────────

// Required (no ?)  → NOT NULL in PostgreSQL → must always have a value
name String        // String, not null

// Optional (with ?)  → NULL allowed in PostgreSQL → TypeScript type becomes: string | null
bio  String?       // String?, maps to string | null in TypeScript

// In TypeScript after generation:
// user.name  → string        (always present)
// user.bio   → string | null (may be null)
```

```prisma
// ── Relation fields — virtual fields, not columns ────────────────────────
model User {
  id    Int    @id @default(autoincrement())
  posts Post[] // ← NOT a column in PostgreSQL
               //    a virtual relation field for Prisma to load related posts
               //    no @relation attribute needed on the "one" side
}

model Post {
  id     Int  @id @default(autoincrement())
  userId Int                                    // ← REAL column (foreign key)
  user   User @relation(fields: [userId], references: [id])  // virtual
}

// Only "userId" becomes a real column.
// "user" and "posts" are Prisma's way to navigate relations — no DB column.
```

```prisma
// ── Model-level attributes ────────────────────────────────────────────────
model Product {
  id       Int    @id @default(autoincrement())
  sku      String
  tenantId Int

  // Multi-column unique constraint
  @@unique([sku, tenantId])

  // Multi-column index
  @@index([tenantId, sku])

  // Table name mapping
  @@map("products")

  // PostgreSQL schema (namespace)
  @@schema("inventory")
}
```

---

## W — Why It Matters

- Every Prisma model generates a TypeScript interface AND a set of Prisma Client methods (`prisma.user.findMany()`, `prisma.user.create()`, etc.). The model name directly determines the property name on the Prisma Client — `model User` → `prisma.user`.
- The distinction between real fields (become columns) and virtual relation fields (navigation only) is fundamental — misunderstanding this leads to confusion about why some model fields don't appear in the database schema. Only scalar fields and explicitly declared foreign key fields become columns.
- `@@map("users")` is not optional — without it, a model named `User` maps to a table named `User` (preserving the capital letter in PostgreSQL), which breaks the PostgreSQL convention of lowercase table names and may cause case-sensitivity issues depending on how the table was created.

---

## I — Interview Q&A

### Q: What is the difference between a scalar field and a relation field in a Prisma model?

**A:** A scalar field holds a value — it maps to a real column in the database table. Examples: `id Int`, `email String`, `createdAt DateTime`. A relation field is virtual — it exists only in Prisma's data model to express how models connect to each other and is used to load related records in queries. It does not become a column. For a relation to work, there must also be a scalar foreign key field (e.g. `userId Int`) that becomes the actual column in the database. The relation field (e.g. `user User`) is the Prisma-level navigation helper that lets you write `include: { user: true }`. You can think of scalar fields as "database columns" and relation fields as "TypeScript navigation properties".

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `@@map` — model name becomes the table name with wrong casing

```prisma
// ❌ Without @@map, Prisma uses the model name as the table name
model UserProfile {
  id Int @id @default(autoincrement())
}
// Creates/expects a table named "UserProfile" (capital letters)
// PostgreSQL convention: lowercase snake_case "user_profiles"
```

**Fix:** Always add `@@map` to set the PostgreSQL table name explicitly:

```prisma
// ✅
model UserProfile {
  id Int @id @default(autoincrement())

  @@map("user_profiles")
}
// Table name in PostgreSQL: "user_profiles" ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Define Prisma models for a task management system: `Workspace`, `Project`, `Task`, and a `ProjectMember` junction table. Rules: (1) all models use `@@map` with snake_case table names; (2) `Task` has a composite index on `(projectId, status)`; (3) `ProjectMember` uses a composite `@@id`; (4) `Workspace` has a unique `slug`; (5) include appropriate optional/required fields and timestamps. No relation fields yet — just scalar fields and model attributes.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Workspace {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("workspaces")
}

model Project {
  id          Int      @id @default(autoincrement())
  workspaceId Int
  name        String
  description String?
  isArchived  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("projects")
}

model Task {
  id          Int      @id @default(autoincrement())
  projectId   Int
  title       String
  description String?
  status      String   @default("todo")
  priority    String   @default("medium")
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId, status])   // composite index for filtering
  @@map("tasks")
}

model ProjectMember {
  projectId Int
  userId    Int
  role      String   @default("member")
  joinedAt  DateTime @default(now())

  @@id([projectId, userId])      // composite primary key
  @@map("project_members")
}
```

---

---

# 5 — Field Types — Scalar Types and the Type Mapping Rules

---

## T — TL;DR

Prisma has 12 scalar field types that map to PostgreSQL column types. Each Prisma type maps to a default PostgreSQL type AND generates a corresponding TypeScript type. The mapping is bidirectional — Prisma introspection reads existing PostgreSQL columns and assigns Prisma types. Understanding the defaults (and overrides with `@db.` attributes) lets you design schemas that are both type-safe and use the right PostgreSQL types.

---

## K — Key Concepts

```
── Prisma → PostgreSQL → TypeScript mapping table ────────────────────────────

Prisma Type   │ Default PostgreSQL Type │ TypeScript Type
──────────────┼─────────────────────────┼──────────────────────
String        │ text                    │ string
Boolean       │ boolean                 │ boolean
Int           │ integer                 │ number
BigInt        │ bigint                  │ bigint
Float         │ double precision        │ number
Decimal       │ decimal(65,30)          │ Decimal (Prisma class)
DateTime      │ timestamp(3)            │ Date
Json          │ jsonb                   │ JsonValue (Prisma type)
Bytes         │ bytea                   │ Buffer
String @db.Uuid│ uuid                   │ string
String[]      │ text[]                  │ string[]
Int[]         │ integer[]               │ number[]
```

```prisma
// ── String — maps to PostgreSQL TEXT by default ───────────────────────────
model Product {
  name        String    // text — unlimited length
  sku         String    // text
  code        String    @db.Char(3)    // CHAR(3) — fixed width
  summary     String    @db.VarChar(255)  // VARCHAR(255) — max length
  description String    @db.Text       // explicit TEXT (same as default)
}

// Rule: use plain String unless you have a specific PostgreSQL type reason.
// String → TEXT is the correct PostgreSQL default — no performance difference vs VARCHAR.
// Use @db.VarChar(n) only when the length limit IS the business constraint.
// Use @db.Uuid for UUID primary keys (covered in Subtopic 8).
```

```prisma
// ── Int and BigInt ────────────────────────────────────────────────────────
model User {
  id        Int    @id @default(autoincrement())  // INTEGER — 4 bytes, up to ~2 billion
  bigId     BigInt @id @default(autoincrement())  // BIGINT  — 8 bytes, up to ~9.2 × 10^18
  age       Int                                    // INTEGER
  views     BigInt                                 // BIGINT — large counters
  smallRank Int    @db.SmallInt                    // SMALLINT — 2 bytes, -32768 to 32767
}

// TypeScript distinction:
// Int    → number  (safe for JS numbers up to 2^53)
// BigInt → bigint  (requires n suffix: 1n, 42n — different from number in JS)

// Rule: use Int for most IDs and counts
//       use BigInt for high-volume tables (users at scale, events, analytics)
//       use @db.SmallInt for tiny ranges (age, rating 1-5, hour 0-23)
```

```prisma
// ── Float and Decimal ─────────────────────────────────────────────────────
model Transaction {
  // Float: approximate — good for scientific values, bad for money
  approximateRate Float    // DOUBLE PRECISION — ~15 significant digits

  // Decimal: exact — required for money
  amount          Decimal  // DECIMAL(65,30) default — very wide
  price           Decimal  @db.Decimal(12, 2)   // DECIMAL(12,2) — for currency

  // NEVER use Float for money — floating point arithmetic is approximate:
  // 0.1 + 0.2 = 0.30000000000000004 in floating point
}

// TypeScript:
// Float   → number  (standard JS number)
// Decimal → Prisma.Decimal  (special class for exact arithmetic, not native JS)
//   Usage: new Prisma.Decimal('19.99').add(new Prisma.Decimal('5.00'))
//   JSON serialization: Decimal is NOT a plain number — handle serialization carefully
```

```prisma
// ── DateTime ──────────────────────────────────────────────────────────────
model Post {
  createdAt  DateTime @default(now())    // timestamp(3) — millisecond precision
  updatedAt  DateTime @updatedAt         // timestamp(3) — auto-updated by Prisma
  publishedAt DateTime?                  // timestamp(3) — nullable

  // Want timezone-aware storage? Use native type:
  scheduledAt DateTime @db.Timestamptz   // TIMESTAMPTZ — stores UTC, displays in TZ

  // Date only (no time):
  birthDate  DateTime @db.Date           // DATE — '2025-06-15'

  // Time only (no date — rare):
  meetingTime DateTime @db.Time          // TIME
}

// TypeScript: all DateTime fields → Date object (JS Date)
// Caution: Prisma's default timestamp(3) is timezone-naive (TIMESTAMP WITHOUT TIME ZONE)
// For event timestamps, prefer @db.Timestamptz (TIMESTAMPTZ) — see Subtopic 8
```

```prisma
// ── Boolean ───────────────────────────────────────────────────────────────
model User {
  isActive    Boolean  @default(true)    // BOOLEAN
  isVerified  Boolean  @default(false)
  isDeleted   Boolean  @default(false)   // soft delete pattern
}
// TypeScript: boolean (true / false)
// PostgreSQL: boolean — accepts true/false, 't'/'f', 'yes'/'no', 1/0 on insert
```

```prisma
// ── Json ──────────────────────────────────────────────────────────────────
model Product {
  metadata   Json     @default("{}")   // JSONB (PostgreSQL default for Json)
  attributes Json?                     // nullable JSONB
}

// TypeScript: Prisma.JsonValue
// type JsonValue = string | number | boolean | null | JsonObject | JsonArray
// type JsonObject = { [key: string]: JsonValue }
// Prisma.JsonNull = explicit JSON null (vs Prisma.DbNull = SQL NULL)

// Querying JSONB in Prisma:
// prisma.product.findMany({
//   where: {
//     metadata: { path: ['color'], equals: 'red' }
//   }
// })
```

```prisma
// ── Bytes ─────────────────────────────────────────────────────────────────
model File {
  id      Int    @id @default(autoincrement())
  data    Bytes  // BYTEA — binary data
  hash    Bytes  // BYTEA — file hash
}
// TypeScript: Buffer (Node.js Buffer)
// Use case: small binary data, hashes, encrypted values
// For large files: store in object storage (S3), save only the URL in the DB
```

---

## W — Why It Matters

- `Float` for money is one of the most common schema mistakes — Prisma maps `Float` to `DOUBLE PRECISION`, which has floating-point precision errors. `0.1 + 0.2 ≠ 0.3` in IEEE 754 arithmetic. Use `Decimal` with `@db.Decimal(12,2)` for any monetary value.
- `DateTime` maps to `timestamp(3)` (timezone-naive) by default, not `timestamptz`. This is a deliberate Prisma choice for cross-database compatibility, but for production PostgreSQL apps handling multiple timezones, you should explicitly use `@db.Timestamptz`.
- The `BigInt` → `bigint` TypeScript mapping means you must use the `n` suffix in JavaScript (`42n` not `42`) and you cannot serialize it to JSON directly — `JSON.stringify({ id: 42n })` throws. You must convert: `id.toString()`.

---

## I — Interview Q&A

### Q: When should you use `Decimal` instead of `Float` in a Prisma schema, and what is the TypeScript implication?

**A:** Use `Decimal` whenever exact arithmetic is required — money, financial calculations, tax amounts, prices, quantities where rounding errors are unacceptable. `Float` maps to `DOUBLE PRECISION` which uses IEEE 754 binary floating-point arithmetic — it cannot exactly represent values like `0.1` or `0.3`, leading to rounding errors that compound in calculations. `Decimal` maps to PostgreSQL's `DECIMAL`/`NUMERIC` type which stores exact decimal values. The TypeScript implication: `Decimal` fields generate a `Prisma.Decimal` type (not a plain `number`) — arithmetic requires the `Prisma.Decimal` class methods or the `decimal.js` library. Crucially, `Decimal` values cannot be directly serialized to JSON — you must call `.toString()` or `.toNumber()` before sending via an API response.

---

## C — Common Pitfalls + Fix

### ❌ Using `Float` for currency/price fields

```prisma
// ❌ Float → DOUBLE PRECISION → floating-point precision errors
model Product {
  price Float  // 19.99 stored as 19.989999999999998 internally
}
```

**Fix:**

```prisma
// ✅ Decimal → DECIMAL(10,2) → exact representation
model Product {
  price Decimal @db.Decimal(10, 2)  // stores exactly 19.99
}
```

```typescript
// TypeScript: Decimal is not a plain number
const product = await prisma.product.findFirst()
// product.price is Prisma.Decimal, not number
console.log(product.price.toString())         // "19.99"
console.log(product.price.toNumber())         // 19.99 (converts to JS number — ok for display)
console.log(product.price.add(new Prisma.Decimal('5.00')).toString())  // "24.99"
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Product` model and an `OrderItem` model that demonstrates all of the following types in correct context: `String` (name, sku with VARCHAR), `Int` (stock quantity, autoincrement id), `BigInt` (total views counter), `Decimal` (price, cost with correct precision), `Float` (weight in kg — approximate is ok), `Boolean` (is_available), `DateTime` (timestamps with correct modifiers), `Json` (attributes), `Bytes` (thumbnail hash). Use correct field names with appropriate optional/required modifiers.

### Solution

```prisma
model Product {
  // Identity
  id           Int      @id @default(autoincrement())

  // String variations
  name         String                      // TEXT — unlimited
  sku          String   @unique @db.VarChar(50)  // VARCHAR(50) — enforced max
  slug         String   @unique            // TEXT

  // Exact money values
  price        Decimal  @db.Decimal(12, 2) // DECIMAL(12,2) — e.g. 9999999999.99
  costPrice    Decimal? @db.Decimal(12, 2) // nullable — we may not know cost

  // Approximate physical measurement — Float is fine here
  weightKg     Float?                      // DOUBLE PRECISION — weight doesn't need exact decimal

  // Integer counts
  stockCount   Int      @default(0)        // INTEGER
  reorderLevel Int      @default(10)       // INTEGER

  // Large counter
  totalViews   BigInt   @default(0)        // BIGINT — can exceed 2 billion

  // Boolean flags
  isAvailable  Boolean  @default(true)     // BOOLEAN
  isFeatured   Boolean  @default(false)    // BOOLEAN

  // Flexible attributes
  attributes   Json     @default("{}")     // JSONB

  // Binary data
  imageHash    Bytes?                      // BYTEA — thumbnail hash (nullable)

  // Timestamps
  createdAt    DateTime @default(now())    // TIMESTAMP(3)
  updatedAt    DateTime @updatedAt         // TIMESTAMP(3) — auto-updated

  @@map("products")
}

model OrderItem {
  id         Int     @id @default(autoincrement())
  orderId    Int
  productId  Int
  quantity   Int                           // INTEGER
  unitPrice  Decimal @db.Decimal(12, 2)   // exact snapshot price at purchase time
  discount   Decimal @default(0) @db.Decimal(5, 4) // 0.0000–1.0000 (percentage)
  createdAt  DateTime @default(now())

  @@map("order_items")
}
```

---

---

# 6 — Field Modifiers — Optional, List, Default, @id, @unique, @updatedAt

---

## T — TL;DR

Field modifiers and attributes control a field's nullability (`?`), its default value (`@default`), whether it's the primary key (`@id`), whether it must be unique (`@unique`), and automatic timestamp management (`@updatedAt`). These map directly to PostgreSQL column constraints (`NOT NULL`, `DEFAULT`, `PRIMARY KEY`, `UNIQUE`) and some are Prisma-only behaviours (like `@updatedAt`).

---

## K — Key Concepts

```prisma
// ── ? — Optional modifier (nullable) ─────────────────────────────────────
model User {
  id          Int     @id @default(autoincrement())
  email       String                // required — NOT NULL in PostgreSQL
  displayName String?               // optional — NULL allowed in PostgreSQL
  bio         String?               // optional
  deletedAt   DateTime?             // nullable timestamp (soft delete)
}
// TypeScript:
// user.email       → string         (always a string)
// user.displayName → string | null  (may be null)
// user.bio         → string | null

// Rule: add ? when the business rule is "this value may not exist"
//       omit ? when the value must always be present
```

```prisma
// ── @default — column default values ──────────────────────────────────────
model Post {
  id          Int      @id @default(autoincrement()) // auto-increment integer PK
  uuid        String   @default(uuid())              // UUID v4 generated by Prisma
  dbUuid      String   @default(dbgenerated("gen_random_uuid()"))  // UUID by PostgreSQL
  title       String
  published   Boolean  @default(false)               // constant false
  viewCount   Int      @default(0)                   // constant 0
  role        Role     @default(USER)                // enum default
  score       Float    @default(0.0)                 // constant 0.0
  createdAt   DateTime @default(now())               // now() at insert time
  config      Json     @default("{}")                // empty JSON object
  tags        String[] @default([])                  // empty array default
}

// @default(autoincrement()) → SERIAL / GENERATED AS IDENTITY
// @default(uuid())          → Prisma generates UUID in application (not DB)
// @default(dbgenerated("fn()")) → PostgreSQL evaluates the function
// @default(now())           → now() evaluated at INSERT time
// @default(cuid())          → Prisma generates a CUID (collision-resistant ID)
// @default(nanoid())        → Prisma generates a NanoID
```

```prisma
// ── @id — primary key ─────────────────────────────────────────────────────
model User {
  // Integer auto-increment (most common)
  id    Int    @id @default(autoincrement())

  // UUID string primary key
  id    String @id @default(uuid())

  // CUID primary key (Prisma-specific, good for distributed systems)
  id    String @id @default(cuid())

  // Database-generated UUID (PostgreSQL generates the value)
  id    String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
}

// @@id — composite primary key (model level)
model PostTag {
  postId Int
  tagId  Int
  @@id([postId, tagId])
}
```

```prisma
// ── @unique — unique constraint ───────────────────────────────────────────
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique            // single-column unique
  username String @unique            // single-column unique

  // These create: UNIQUE (email) and UNIQUE (username) constraints in PostgreSQL
  // And indexes automatically
}

// @@unique — multi-column unique constraint (model level)
model Subscription {
  id     Int @id @default(autoincrement())
  userId Int
  planId Int

  @@unique([userId, planId])  // one subscription per user per plan
}
```

```prisma
// ── @updatedAt — automatic timestamp on update ────────────────────────────
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())   // set once on INSERT
  updatedAt DateTime @updatedAt        // set automatically on every UPDATE by Prisma
}

// @updatedAt is a Prisma-level behaviour:
// - Prisma Client sets this field to now() on every UPDATE automatically
// - Does NOT create a PostgreSQL trigger
// - If you update the row via raw SQL (bypassing Prisma), updatedAt is NOT updated
// - PostgreSQL equivalent: a trigger using BEFORE UPDATE

// TypeScript:
// updatedAt: Date — always a Date, never null
```

```prisma
// ── [] — List modifier (arrays) ────────────────────────────────────────────
model Post {
  tags       String[]   @default([])  // TEXT[] in PostgreSQL
  scores     Int[]                    // INTEGER[] in PostgreSQL
  metadata   Json[]                   // JSONB[] in PostgreSQL
}

// Querying arrays in Prisma:
// prisma.post.findMany({ where: { tags: { has: 'postgresql' } } })
// prisma.post.findMany({ where: { tags: { hasSome: ['a', 'b'] } } })
// prisma.post.findMany({ where: { tags: { hasEvery: ['a', 'b'] } } })
// prisma.post.findMany({ where: { tags: { isEmpty: false } } })

// Arrays only work with PostgreSQL — not SQLite or MySQL
// Scalar lists (String[], Int[]) are PostgreSQL-native
```

```prisma
// ── @ignore — exclude field from Prisma Client ────────────────────────────
model User {
  id           Int     @id @default(autoincrement())
  email        String
  passwordHash String  @ignore  // exists in DB but excluded from Prisma Client
  // passwordHash won't appear in TypeScript types or query results
  // Useful for: columns managed by another system, deprecated columns
}

// @@ignore — exclude entire model
model LegacyAuditLog {
  id        Int @id
  // ... old columns
  @@ignore  // table exists in DB but not in Prisma Client
}
```

---

## W — Why It Matters

- `@updatedAt` is a Prisma-level behaviour, NOT a database trigger — if you update a row via raw SQL or another ORM, `updatedAt` will NOT be automatically updated. For critical audit fields, combine `@updatedAt` with a PostgreSQL trigger for full coverage.
- `@default(uuid())` vs `@default(dbgenerated("gen_random_uuid()"))` — the first generates the UUID in Node.js (Prisma), the second in PostgreSQL. The DB-generated version is slightly safer for concurrent inserts and works correctly even when Prisma Client is bypassed, but requires `@db.Uuid` to tell Prisma the actual column type.
- `@@unique` creates both a unique constraint AND an index in PostgreSQL. You don't need a separate `@@index` on the same columns. Knowing this prevents duplicate indexes (one for the constraint, one explicit) which wastes storage and slows writes.

---

## I — Interview Q&A

### Q: What is the difference between `@default(now())` and `@updatedAt` in Prisma?

**A:** `@default(now())` is evaluated once when a row is first created (INSERT) — it sets the `createdAt` timestamp to the current time at creation and never changes it again. `@updatedAt` is a Prisma-managed field that is automatically set to the current time on every UPDATE operation made through the Prisma Client. It is not a database-level constraint or trigger — Prisma injects the current timestamp into the UPDATE query before sending it. This means: if you update the row via raw SQL, another ORM, or a direct database tool, `updatedAt` will not be automatically changed. For full audit coverage, combine `@updatedAt` with a PostgreSQL `BEFORE UPDATE` trigger.

---

## C — Common Pitfalls + Fix

### ❌ Using `@default(uuid())` without `@db.Uuid` — wrong PostgreSQL column type

```prisma
// ❌ Generates UUID in JS but stores in TEXT column (not UUID type)
model Session {
  id String @id @default(uuid())
  // PostgreSQL column type: TEXT — valid but not optimal
  // No UUID format validation, no UUID-specific indexing
}
```

**Fix:** Add `@db.Uuid` to use PostgreSQL's native UUID column type:

```prisma
// ✅ UUID column type — format-validated, storage-efficient (16 bytes vs text)
model Session {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  // Or: id String @id @default(uuid()) @db.Uuid
  // PostgreSQL column: UUID type
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `Comment` model that demonstrates every modifier covered in this subtopic: `@id` with UUID, `?` on multiple fields, `@default` with multiple value types (constant, `now()`, enum, empty array), `@unique` (single column), `@@unique` (multi-column), `@updatedAt`, a `String[]` array field, and `@ignore` on one field. Include appropriate `@@map`.

### Solution

```prisma
enum CommentStatus {
  VISIBLE
  HIDDEN
  FLAGGED
}

model Comment {
  // UUID primary key — DB-generated
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // Required scalar fields
  postId      Int
  authorId    Int
  body        String

  // Optional fields
  parentId    Int?           // nullable — top-level comments have no parent
  editedAt    DateTime?      // null until first edit

  // Defaults
  status      CommentStatus  @default(VISIBLE)
  likeCount   Int            @default(0)
  isDeleted   Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Array field — PostgreSQL TEXT[]
  mentionedUserIds Int[]     @default([])

  // Unique constraints
  externalId  String?        @unique       // single-column unique (nullable — multiple NULLs ok)

  // Ignored field — internal hash stored in DB but excluded from Prisma Client
  contentHash String?        @ignore

  // Multi-column unique: an author can only have one pinned comment per post
  isPinned    Boolean        @default(false)

  @@unique([postId, authorId, isPinned])  // constraint: one pinned comment per author per post
  @@map("comments")
}
```

---

---

# 7 — Enums — Type-Safe Categorical Values

---

## T — TL;DR

Prisma `enum` blocks define a named set of allowed string values — they map to PostgreSQL `ENUM` types, providing type safety in TypeScript and storage efficiency in the database. Enums are defined at the schema level (outside models) and referenced as field types. All enum values in Prisma are string-based; the TypeScript generated type is a union of the values.

---

## K — Key Concepts

```prisma
// ── Defining enums ────────────────────────────────────────────────────────
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

```prisma
// ── Using enums as field types ─────────────────────────────────────────────
model User {
  id    Int      @id @default(autoincrement())
  email String   @unique
  role  UserRole @default(USER)    // required, default USER
}

model Order {
  id     Int         @id @default(autoincrement())
  status OrderStatus @default(PENDING)  // required
}

model Task {
  id       Int      @id @default(autoincrement())
  priority Priority @default(MEDIUM)
  // Optional enum field:
  category Priority?  // nullable — no category assigned yet
}
```

```prisma
// ── Enum naming: Prisma value vs PostgreSQL value ─────────────────────────
// By default, Prisma enum values are used as-is in PostgreSQL
// Prisma value: ADMIN → PostgreSQL ENUM value: 'ADMIN'
// Prisma value: USER  → PostgreSQL ENUM value: 'USER'

// ── @map on enum values — map to different PostgreSQL ENUM values ─────────
enum UserRole {
  ADMIN      @map("admin")       // Prisma: ADMIN → PostgreSQL: 'admin'
  MODERATOR  @map("moderator")
  USER       @map("user")
  GUEST      @map("guest")
}

// ── @@map on enum block — map to different PostgreSQL ENUM type name ───────
enum UserRole {
  ADMIN
  USER

  @@map("user_role")  // PostgreSQL type name: user_role (not "UserRole")
}
```

```prisma
// ── Full enum with both @@map and @map ─────────────────────────────────────
enum OrderStatus {
  PENDING    @map("pending")
  CONFIRMED  @map("confirmed")
  PROCESSING @map("processing")
  SHIPPED    @map("shipped")
  DELIVERED  @map("delivered")
  CANCELLED  @map("cancelled")
  REFUNDED   @map("refunded")

  @@map("order_status")
}

// In PostgreSQL:
// CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'processing', ...);
// TypeScript: enum values are still OrderStatus.PENDING, OrderStatus.CONFIRMED etc.
```

```typescript
// ── Generated TypeScript for enums ────────────────────────────────────────
// Prisma generates a const enum-like object AND a TypeScript type

// Generated by Prisma:
export const UserRole: {
  ADMIN:     'ADMIN',
  MODERATOR: 'MODERATOR',
  USER:      'USER',
  GUEST:     'GUEST'
}
export type UserRole = (typeof UserRole)[keyof typeof UserRole]
// type UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST'

// Usage in application code:
import { UserRole } from '@prisma/client'

const user = await prisma.user.create({
  data: {
    email: 'mark@example.com',
    role: UserRole.ADMIN  // ✅ type-safe
    // role: 'ADMIN'      // ✅ also works (string literal)
    // role: 'superuser'  // ❌ TypeScript error — not a valid UserRole
  }
})

// Filter by enum:
const admins = await prisma.user.findMany({
  where: { role: UserRole.ADMIN }
})

// Filter by multiple enum values:
const activeStaff = await prisma.user.findMany({
  where: {
    role: { in: [UserRole.ADMIN, UserRole.MODERATOR] }
  }
})
```

```prisma
// ── Enum limitations and alternatives ─────────────────────────────────────
// PostgreSQL ENUM limitation: you can ADD values but cannot REMOVE or RENAME
// ALTER TYPE order_status ADD VALUE 'on_hold';  -- OK ✅
// ALTER TYPE order_status RENAME VALUE 'cancelled' TO 'canceled';  -- requires PG 10+
// Removing a value requires recreating the type ← painful ❌

// Alternative: String field with @db.VarChar + CHECK constraint
// (managed via Prisma migration raw SQL)
model Task {
  status String @default("todo")
  // In migration: ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done'))
  // Easier to modify: just update the CHECK constraint
}

// When to use Enum:
// ✅ Stable, well-defined small set of values (role, order status)
// ✅ You want TypeScript exhaustive checking
// ✅ Values don't change frequently

// When to use String instead:
// ✅ Values may be added/removed often
// ✅ Values come from external systems (dynamic)
// ✅ Lookup table pattern (for frequently-changing lists)
```

---

## W — Why It Matters

- Prisma enums generate TypeScript union types — TypeScript will give you a compile-time error if you try to set a `role` to an invalid value. This type safety cascades through your entire codebase — any function receiving a `UserRole` parameter is automatically validated.
- PostgreSQL ENUM types are stored as 4-byte integers internally (mapped via the pg_type catalog) — they're more storage-efficient than VARCHAR and have a sort order. But the trade-off is the difficulty of modifying them in production.
- The `@@map` + `@map` pattern for enums allows you to use SCREAMING_SNAKE_CASE in Prisma/TypeScript (idiomatic for enums) while storing lowercase values in PostgreSQL (idiomatic for PostgreSQL identifiers) — best of both worlds without breaking either convention.

---

## I — Interview Q&A

### Q: What are the trade-offs between using a Prisma `enum` and a plain `String` field for categorical values?

**A:** A Prisma `enum` maps to a PostgreSQL `ENUM` type — it provides: (1) TypeScript compile-time type safety (invalid values cause TS errors), (2) PostgreSQL-level constraint enforcement (only valid values accepted), (3) storage efficiency (4 bytes internally). The trade-off: PostgreSQL ENUMs are hard to modify — you can add values with `ALTER TYPE ... ADD VALUE` but removing or renaming values requires recreating the type, which is painful in production. A `String` field is flexible — you can change allowed values via a CHECK constraint or application validation without schema changes. Use enums for stable, well-defined value sets (user roles, payment states). Use String for frequently-changing categorical values or when integrating with external systems that may introduce new values.

---

## C — Common Pitfalls + Fix

### ❌ Defining the enum inside the model (not valid in Prisma)

```prisma
// ❌ Enums cannot be nested inside model blocks
model User {
  enum Role { ADMIN USER }  // ← syntax error
  role Role
}
```

**Fix:** Define enums at the top level, before or after models:

```prisma
// ✅ Top-level enum definition
enum Role {
  ADMIN
  USER
}

model User {
  id   Int  @id @default(autoincrement())
  role Role @default(USER)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Define a complete set of enums for an e-commerce platform: `OrderStatus` (with lowercase PostgreSQL values via `@map`), `PaymentMethod`, `ShippingCarrier`, `ProductCondition`. Use `@@map` on each enum for snake_case PostgreSQL type names. Then create a `Shipment` model that uses three of these enums as field types with appropriate defaults. Show the TypeScript usage for filtering shipments by carrier.

### Solution

```prisma
// ── Enums ──────────────────────────────────────────────────────────────────

enum OrderStatus {
  PENDING    @map("pending")
  CONFIRMED  @map("confirmed")
  PROCESSING @map("processing")
  SHIPPED    @map("shipped")
  DELIVERED  @map("delivered")
  CANCELLED  @map("cancelled")
  REFUNDED   @map("refunded")

  @@map("order_status")
}

enum PaymentMethod {
  CREDIT_CARD   @map("credit_card")
  DEBIT_CARD    @map("debit_card")
  BANK_TRANSFER @map("bank_transfer")
  GCASH         @map("gcash")
  PAYMAYA       @map("paymaya")
  COD           @map("cod")

  @@map("payment_method")
}

enum ShippingCarrier {
  LALAMOVE  @map("lalamove")
  GRAB      @map("grab")
  LBC       @map("lbc")
  JNT       @map("jnt")
  STANDARD  @map("standard")

  @@map("shipping_carrier")
}

enum ProductCondition {
  NEW         @map("new")
  REFURBISHED @map("refurbished")
  USED        @map("used")
  DAMAGED     @map("damaged")

  @@map("product_condition")
}

// ── Model using enums ──────────────────────────────────────────────────────

model Shipment {
  id              Int             @id @default(autoincrement())
  orderId         Int
  carrier         ShippingCarrier @default(STANDARD)
  status          OrderStatus     @default(PROCESSING)
  trackingNumber  String?         @unique
  estimatedAt     DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@map("shipments")
}
```

```typescript
// TypeScript usage — type-safe enum filtering
import { PrismaClient, ShippingCarrier, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Filter by carrier
const lalamoveShipments = await prisma.shipment.findMany({
  where: {
    carrier: ShippingCarrier.LALAMOVE
  }
})

// Filter by multiple carriers
const expressShipments = await prisma.shipment.findMany({
  where: {
    carrier: { in: [ShippingCarrier.LALAMOVE, ShippingCarrier.GRAB] },
    status: { not: OrderStatus.CANCELLED }
  },
  orderBy: { estimatedAt: 'asc' }
})

// ❌ TypeScript error — 'fedex' is not a valid ShippingCarrier
const invalid = await prisma.shipment.findMany({
  where: { carrier: 'fedex' }  // Type '"fedex"' is not assignable to type 'ShippingCarrier'
})
```

---

---

# 8 — Native Type Mapping — Precise PostgreSQL Type Control

---

## T — TL;DR

Prisma's default type mappings cover most cases, but sometimes you need the exact PostgreSQL type — `TIMESTAMPTZ` instead of `TIMESTAMP`, `DECIMAL(12,2)` instead of `DECIMAL(65,30)`, `UUID` instead of `TEXT`. The `@db.` attribute namespace lets you specify the exact PostgreSQL column type while keeping the Prisma scalar type for TypeScript compatibility.

---

## K — Key Concepts

```prisma
// ── Syntax: @db.NativeType ─────────────────────────────────────────────────
// Format: @db.PostgreSQLTypeName
// or:     @db.PostgreSQLTypeName(parameters)

model Example {
  //  PrismaType  @db.PostgreSQLType
  id     String  @db.Uuid              // UUID column
  price  Decimal @db.Decimal(12, 2)    // DECIMAL(12,2)
  name   String  @db.VarChar(100)      // VARCHAR(100)
  ts     DateTime @db.Timestamptz      // TIMESTAMPTZ
}
```

```prisma
// ── String native types ────────────────────────────────────────────────────
model StringTypes {
  a  String  // default → TEXT (unlimited)
  b  String  @db.Text        // explicit TEXT (same as default)
  c  String  @db.VarChar(255) // VARCHAR(255)
  d  String  @db.Char(3)     // CHAR(3) — fixed width, pads with spaces
  e  String  @db.Uuid        // UUID (16 bytes, format validated by PostgreSQL)
  f  String  @db.Inet        // INET — IP address type
  g  String  @db.Citext      // CITEXT — case-insensitive text (requires extension)
  h  String  @db.Bit(8)      // BIT(8) — fixed-length bit string
  i  String  @db.VarBit(16)  // VARBIT(16) — variable bit string
  j  String  @db.Xml         // XML — validated XML
}
```

```prisma
// ── Numeric native types ───────────────────────────────────────────────────
model NumericTypes {
  a  Int      // default → INTEGER (4 bytes)
  b  Int      @db.SmallInt   // SMALLINT (2 bytes, -32768 to 32767)
  c  Int      @db.Int        // INTEGER (explicit, same as default)
  d  Int      @db.Oid        // OID (PostgreSQL object ID)

  e  BigInt   // default → BIGINT (8 bytes)

  f  Float    // default → DOUBLE PRECISION (8 bytes, ~15 digits)
  g  Float    @db.Real       // REAL (4 bytes, ~6 digits) — less precise

  h  Decimal  // default → DECIMAL(65,30) — very wide
  i  Decimal  @db.Decimal(12, 2)   // DECIMAL(12,2)  — money
  j  Decimal  @db.Decimal(19, 4)   // DECIMAL(19,4)  — high-precision money
  k  Decimal  @db.Money            // MONEY — locale-aware (avoid, use Decimal)
}
```

```prisma
// ── DateTime native types ──────────────────────────────────────────────────
model DateTimeTypes {
  a  DateTime  // default → TIMESTAMP(3) — no timezone, millisecond precision
  b  DateTime  @db.Timestamp(0)   // TIMESTAMP(0) — second precision, no TZ
  c  DateTime  @db.Timestamp(6)   // TIMESTAMP(6) — microsecond precision, no TZ
  d  DateTime  @db.Timestamptz    // TIMESTAMPTZ — with timezone (stores UTC)
  e  DateTime  @db.Timestamptz(3) // TIMESTAMPTZ with millisecond precision
  f  DateTime  @db.Date           // DATE — date only, no time
  g  DateTime  @db.Time           // TIME — time only, no timezone
  h  DateTime  @db.Time(3)        // TIME with millisecond precision
  i  DateTime  @db.Timetz         // TIMETZ — time with timezone
}

// Recommendation for production apps:
//   createdAt  DateTime @default(now()) @db.Timestamptz
//   updatedAt  DateTime @updatedAt      @db.Timestamptz
//   scheduledAt DateTime?               @db.Timestamptz
//   birthDate  DateTime?               @db.Date
```

```prisma
// ── JSON native types ──────────────────────────────────────────────────────
model JsonTypes {
  a  Json   // default → JSONB (binary, indexed, faster — preferred)
  b  Json   @db.Json   // JSON (text, no GIN index support, slower)
  c  Json   @db.JsonB  // JSONB (explicit, same as default)
}

// Rule: always use JSONB (default). Only use JSON for audit/append logs
// where you need to preserve exact formatting (key order, whitespace).
```

```prisma
// ── Bytes native types ─────────────────────────────────────────────────────
model ByteTypes {
  a  Bytes   // default → BYTEA — binary data
}
```

```prisma
// ── Complete production model with native types ────────────────────────────
model Event {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      Int
  type        String   @db.VarChar(100)       // bounded type string
  payload     Json                            // JSONB (default)
  ipAddress   String?  @db.Inet              // PostgreSQL INET type for IPs
  occurredAt  DateTime @default(now()) @db.Timestamptz  // timezone-aware
  processedAt DateTime? @db.Timestamptz       // nullable TIMESTAMPTZ

  @@map("events")
  @@index([userId, occurredAt(sort: Desc)])
}
```

---

## W — Why It Matters

- `@db.Timestamptz` vs the default `TIMESTAMP(3)` is a production-critical distinction — `TIMESTAMP(3)` stores no timezone information. If your server moves to a different timezone or your users span the globe, timestamp values become ambiguous. `TIMESTAMPTZ` stores UTC internally and converts to the session timezone on display — always use `TIMESTAMPTZ` for event timestamps in production.
- `@db.Decimal(12,2)` vs the default `Decimal(65,30)` — Prisma's default decimal precision is absurdly wide (65 digits total, 30 decimal places) because it needs to be database-agnostic. For a price field this wastes storage and may confuse tools. Always specify precision for financial fields: `@db.Decimal(12,2)`.
- `@db.Uuid` is important for UUID primary keys — without it, `@default(uuid())` stores UUIDs as TEXT (26-27 bytes) instead of the native UUID type (16 bytes). The UUID type is also validated by PostgreSQL (format errors are caught at the DB level), and UUID-specific functions and operators work correctly.

---

## I — Interview Q&A

### Q: Why should you use `@db.Timestamptz` instead of Prisma's default `DateTime` mapping?

**A:** Prisma's default `DateTime` maps to PostgreSQL's `TIMESTAMP(3)` — a timezone-naive type. It stores the literal date and time with no timezone information. This causes problems in multi-timezone applications: if an event is stored as `2025-06-15 14:30:00` and the server moves to a different timezone, or a user in a different timezone reads it, the value is ambiguous — there's no way to know what UTC time it represents. `@db.Timestamptz` maps to `TIMESTAMPTZ` (timestamp with time zone), which stores the value as UTC internally and converts to the appropriate timezone when retrieved based on the session's `timezone` setting. For any event-related timestamp (created_at, scheduled_at, expires_at), `TIMESTAMPTZ` is the correct choice. `DATE` (via `@db.Date`) is correct for calendar dates where time is irrelevant (birth dates, due dates).

---

## C — Common Pitfalls + Fix

### ❌ Using default `DateTime` for event timestamps — timezone-naive

```prisma
// ❌ No timezone information stored
model Order {
  placedAt DateTime @default(now())   // TIMESTAMP(3) — timezone-naive
}
// In UTC+8, now() returns '2025-06-15 22:30:00' stored as-is
// In UTC, now() returns '2025-06-15 14:30:00' stored as-is
// These represent the SAME moment but are stored as DIFFERENT values
// No way to compare them correctly across timezones ❌
```

**Fix:** Use `@db.Timestamptz` for all event timestamps:

```prisma
// ✅ Timezone-aware — always stored as UTC
model Order {
  placedAt DateTime @default(now()) @db.Timestamptz
}
// Always stores as UTC: '2025-06-15 14:30:00+00'
// Displays in session timezone when queried ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `PaymentTransaction` model that uses precise native types for every field: UUID PK (DB-generated), a monetary `amount` with proper decimal precision, an `exchangeRate` (approximate ok), a `currency` code with CHAR(3), `status` as VARCHAR, `ipAddress` as INET, all timestamps as TIMESTAMPTZ, a `metadata` JSONB field, and a `receiptData` BYTES field. Use `@@map` and all appropriate `@db.` attributes.

### Solution

```prisma
model PaymentTransaction {
  // UUID primary key — generated by PostgreSQL
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // References
  orderId         Int
  customerId      Int

  // Money — exact decimal
  amount          Decimal  @db.Decimal(19, 4)   // up to 999,999,999,999,999.9999
  fee             Decimal  @default(0) @db.Decimal(19, 4)
  netAmount       Decimal  @db.Decimal(19, 4)

  // Approximate rate — float is fine (display only, not used in calculation)
  exchangeRate    Float?   @db.Real              // REAL — 4 bytes, good enough for FX display

  // Bounded strings
  currency        String   @db.Char(3)           // ISO currency code: USD, PHP, SGD
  provider        String   @db.VarChar(50)       // payment provider name
  externalId      String?  @unique @db.VarChar(255)  // provider's transaction ID
  status          String   @db.VarChar(20)       // 'pending', 'completed', 'failed'

  // Network info
  ipAddress       String?  @db.Inet              // PostgreSQL INET — validates IP format

  // Flexible metadata
  metadata        Json                           // JSONB — provider response, etc.

  // Binary receipt
  receiptData     Bytes?                         // BYTEA — raw receipt PDF or image

  // Timezone-aware timestamps
  initiatedAt     DateTime @default(now()) @db.Timestamptz
  completedAt     DateTime? @db.Timestamptz
  refundedAt      DateTime? @db.Timestamptz
  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @updatedAt @db.Timestamptz

  @@index([customerId, initiatedAt(sort: Desc)])
  @@index([orderId])
  @@map("payment_transactions")
}
```

---

---

# 9 — Model-to-Table Mapping — @@map, @map, @@schema, Naming Conventions

---

## T — TL;DR

Prisma uses camelCase for model and field names by convention, but PostgreSQL uses lowercase snake_case for table and column names. `@@map` maps a model to a specific table name. `@map` maps a field to a specific column name. `@@schema` places a model in a specific PostgreSQL schema (namespace). These attributes are the bridge between Prisma's TypeScript-idiomatic naming and PostgreSQL's SQL-idiomatic naming.

---

## K — Key Concepts

```prisma
// ── Default naming (no @@map) — Prisma preserves model name exactly ───────
model UserProfile {
  // Prisma model name: UserProfile
  // PostgreSQL table:  "UserProfile"   ← capital letters preserved in PG
  // Prisma Client:     prisma.userProfile  ← camelCase property
  id Int @id @default(autoincrement())
}

// ── Problem: PostgreSQL convention is lowercase snake_case ─────────────────
// Without @@map, table name "UserProfile" is case-sensitive in SQL:
// SELECT * FROM "UserProfile";   ← must quote it
// SELECT * FROM userprofile;     ← fails (lowercase lookup won't find "UserProfile")
```

```prisma
// ── @@map — map model to PostgreSQL table name ─────────────────────────────
model UserProfile {
  id Int @id @default(autoincrement())

  @@map("user_profiles")
  // PostgreSQL table: user_profiles  ← lowercase snake_case ✅
  // Prisma Client: prisma.userProfile  ← still camelCase in TypeScript ✅
}

// ── @map — map field to PostgreSQL column name ────────────────────────────
model UserProfile {
  id          Int      @id @default(autoincrement())
  firstName   String   @map("first_name")    // column: first_name
  lastName    String   @map("last_name")     // column: last_name
  dateOfBirth DateTime? @map("date_of_birth") // column: date_of_birth
  isActive    Boolean  @default(true) @map("is_active")  // column: is_active
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("user_profiles")
}
// TypeScript: profile.firstName, profile.lastName (camelCase)
// PostgreSQL: first_name, last_name (snake_case) ✅
```

```prisma
// ── The naming convention debate: to @map or not to @map ──────────────────

// Option A: use @map everywhere (maximum control)
model User {
  id        Int      @id @default(autoincrement()) @map("id")
  firstName String   @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")
  @@map("users")
}

// Option B: use snake_case field names in Prisma (less common, loses TypeScript idiom)
model User {
  id         Int      @id @default(autoincrement())
  first_name String
  created_at DateTime @default(now())
  @@map("users")
}
// TypeScript: user.first_name ← not idiomatic TypeScript ❌

// Option C: auto-mapping with Prisma's prismaClientExtensions or a code generator
// Some teams use prisma-case-format or similar tools to auto-add @map annotations

// Recommendation: use Option A — camelCase in Prisma, @map for snake_case in PostgreSQL
// This is what Prisma's official docs recommend and what prisma db pull generates
```

```prisma
// ── @@schema — PostgreSQL schema (namespace) placement ────────────────────
// Requires multiSchema preview feature

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "auth", "billing"]  // declare all schemas used
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique

  @@map("users")
  @@schema("auth")   // lives in the "auth" PostgreSQL schema
  // SQL: SELECT * FROM auth.users
}

model Invoice {
  id     Int @id @default(autoincrement())
  amount Decimal @db.Decimal(12,2)

  @@map("invoices")
  @@schema("billing")  // lives in the "billing" PostgreSQL schema
}

model Post {
  id    Int @id @default(autoincrement())
  title String

  @@map("posts")
  // No @@schema = defaults to "public" schema (or first schema in schemas array)
}
```

```prisma
// ── Practical naming convention reference ─────────────────────────────────
// Prisma model   → TypeScript class name     → PostgreSQL table
// User           → prisma.user               → users
// UserProfile    → prisma.userProfile        → user_profiles
// OrderItem      → prisma.orderItem          → order_items
// PostTag        → prisma.postTag            → post_tags

// Prisma field   → TypeScript property       → PostgreSQL column
// firstName      → user.firstName            → first_name
// createdAt      → user.createdAt            → created_at
// isActive       → user.isActive             → is_active
// userId         → orderItem.userId          → user_id

// The pattern:
// Prisma / TypeScript: camelCase for fields, PascalCase for models
// PostgreSQL:          snake_case for columns and tables
// Bridge:             @@map() and @map() connect the two worlds
```

```prisma
// ── @map on enum values — recap from Subtopic 7 ──────────────────────────
enum UserRole {
  ADMIN  @map("admin")    // TypeScript: UserRole.ADMIN → PostgreSQL: 'admin'
  USER   @map("user")

  @@map("user_role")      // PostgreSQL type name: user_role
}
```

---

## W — Why It Matters

- Without `@@map`, a model named `UserProfile` creates a PostgreSQL table named `"UserProfile"` (with capital letters) — which must be quoted in every raw SQL query and doesn't follow PostgreSQL's snake_case convention. Every team member and DBA who touches the database directly will struggle with quoted identifiers.
- The camelCase/snake_case bridge is not just cosmetic — many PostgreSQL tools (pgAdmin, psql `\d`, database monitoring tools) display and generate SQL using snake_case. If your Prisma schema uses camelCase field names without `@map`, every raw query written by a human will look inconsistent with the Prisma-generated schema.
- `@@schema` for multi-schema PostgreSQL databases is essential for separating concerns at the database level (auth tables in `auth` schema, billing tables in `billing` schema) — this pattern is used by Supabase (which puts auth tables in the `auth` schema) and is common in large enterprise PostgreSQL deployments.

---

## I — Interview Q&A

### Q: Why do you need both `@@map` and `@map` in Prisma, and what does each do?

**A:** `@@map` is a model-level attribute that maps the Prisma model name to the actual PostgreSQL table name. For example, `@@map("users")` on a model named `User` means the TypeScript API uses `prisma.user` (from the model name) but the SQL query targets the `users` table. `@map` is a field-level attribute that maps an individual field name to the corresponding PostgreSQL column name. For example, `firstName String @map("first_name")` means TypeScript code uses `user.firstName` (camelCase, idiomatic TypeScript) while the database column is `first_name` (snake_case, idiomatic SQL). Both are necessary because TypeScript and SQL have different naming conventions — Prisma's `@map`/`@@map` attributes let you follow both conventions simultaneously without compromising either.

---

## C — Common Pitfalls + Fix

### ❌ Using camelCase field names without `@map` — confusing raw SQL queries

```prisma
// ❌ camelCase field names create camelCase columns in PostgreSQL
model User {
  id        Int    @id @default(autoincrement())
  firstName String    // column: "firstName" (case-sensitive in PG)
  createdAt DateTime  // column: "createdAt"

  @@map("users")      // table is correct
}
// Raw SQL: SELECT "firstName" FROM users  ← must quote, confusing ❌
```

**Fix:** Add `@map` to every camelCase field:

```prisma
// ✅ TypeScript stays camelCase, PostgreSQL gets snake_case
model User {
  id        Int      @id @default(autoincrement())
  firstName String   @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
// TypeScript: user.firstName     → clean
// PostgreSQL: first_name         → conventional ✅
// Raw SQL:    SELECT first_name FROM users  ← no quoting needed ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a schema for a multi-tenant SaaS app using two PostgreSQL schemas: `public` (for shared data) and `tenant` (for tenant-specific data). Models: `Plan` (public), `Tenant` (public), `Member` (tenant schema), `Project` (tenant schema). All models must use `@@map` (snake_case table names) and all camelCase fields must use `@map` (snake_case columns). Include `@@schema` where appropriate and update the datasource and generator.

### Solution

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "tenant"]
}

// ── Public schema ──────────────────────────────────────────────────────────

model Plan {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  slug        String   @unique
  priceMonthly Decimal @db.Decimal(10, 2) @map("price_monthly")
  priceYearly  Decimal @db.Decimal(10, 2) @map("price_yearly")
  maxMembers   Int     @default(5) @map("max_members")
  isActive     Boolean @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @db.Timestamptz @map("created_at")

  @@map("plans")
  @@schema("public")
}

model Tenant {
  id           Int      @id @default(autoincrement())
  name         String
  slug         String   @unique
  planId       Int      @map("plan_id")
  isActive     Boolean  @default(true) @map("is_active")
  trialEndsAt  DateTime? @db.Timestamptz @map("trial_ends_at")
  createdAt    DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt    DateTime @updatedAt @db.Timestamptz @map("updated_at")

  @@map("tenants")
  @@schema("public")
}

// ── Tenant schema ──────────────────────────────────────────────────────────

model Member {
  id          Int      @id @default(autoincrement())
  tenantId    Int      @map("tenant_id")
  email       String
  displayName String?  @map("display_name")
  role        String   @default("member")
  isActive    Boolean  @default(true) @map("is_active")
  invitedAt   DateTime @default(now()) @db.Timestamptz @map("invited_at")
  joinedAt    DateTime? @db.Timestamptz @map("joined_at")
  createdAt   DateTime @default(now()) @db.Timestamptz @map("created_at")

  @@unique([tenantId, email])
  @@map("members")
  @@schema("tenant")
}

model Project {
  id           Int      @id @default(autoincrement())
  tenantId     Int      @map("tenant_id")
  name         String
  slug         String
  description  String?
  isArchived   Boolean  @default(false) @map("is_archived")
  createdById  Int      @map("created_by_id")
  createdAt    DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt    DateTime @updatedAt @db.Timestamptz @map("updated_at")

  @@unique([tenantId, slug])
  @@index([tenantId, isArchived])
  @@map("projects")
  @@schema("tenant")
}
```

---

---

# 10 — Prisma Client Generation — prisma generate, Output, and Usage

---

## T — TL;DR

`prisma generate` reads `schema.prisma` and produces the Prisma Client — a fully-typed database client specific to your schema. Each model gets CRUD methods (`findMany`, `create`, `update`, `delete`, etc.). The client is instantiated as `new PrismaClient()` and should be used as a singleton in Node.js. The generated types make every query type-safe: wrong fields, wrong types, and missing required fields all produce TypeScript errors at compile time.

---

## K — Key Concepts

```bash
# ── Running prisma generate ────────────────────────────────────────────────
npx prisma generate

# Output:
# ✔ Generated Prisma Client (v7.x.x) to ./node_modules/.prisma/client
# You can now start using Prisma Client in your code.

# With custom schema path:
npx prisma generate --schema=./prisma/schema.prisma

# Watch mode (re-generates on schema change):
npx prisma generate --watch
```

```typescript
// ── What gets generated ────────────────────────────────────────────────────

// For this schema:
// model User {
//   id    Int    @id @default(autoincrement())
//   email String @unique
//   name  String?
//   role  UserRole @default(USER)
// }

// Prisma generates:
// 1. PrismaClient class with prisma.user.findMany(), prisma.user.create(), etc.
// 2. TypeScript types:
//    - User (full model type)
//    - UserCreateInput (for create operations — required fields required, optional optional)
//    - UserUpdateInput (for update operations — all fields optional)
//    - UserWhereInput (for WHERE clauses — all fields optional, with operators)
//    - UserOrderByWithRelationInput (for ORDER BY)
//    - UserSelect (for field selection)
//    - UserInclude (for relation loading)
// 3. Enum type: UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST'
```

```typescript
// ── PrismaClient instantiation — singleton pattern ────────────────────────
// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client'

// The global variable trick prevents multiple instances in hot-reload environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Why singleton?
// - PrismaClient creates a connection pool internally
// - Next.js hot reload creates a new module scope on each change
// - Without singleton: hundreds of connection pools after many hot reloads
// - With singleton: one pool, reused across reloads
```

```typescript
// ── Basic CRUD operations — generated methods ──────────────────────────────
import { prisma } from '@/lib/prisma'

// findMany — fetch multiple rows
const users = await prisma.user.findMany()
// Return type: User[]  ← fully typed based on model

// findMany with filtering, sorting, pagination
const activeUsers = await prisma.user.findMany({
  where: { isActive: true },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
  select: {
    id: true,
    email: true,
    name: true,
    // isActive: false  ← omit fields from result (not in return type)
  }
})
// Return type: { id: number; email: string; name: string | null }[]

// findUnique — fetch by unique field (PK or @unique)
const user = await prisma.user.findUnique({
  where: { id: 1 }
})
// Return type: User | null

// findUniqueOrThrow — throws if not found
const user2 = await prisma.user.findUniqueOrThrow({
  where: { email: 'mark@example.com' }
})
// Return type: User (never null — throws PrismaClientKnownRequestError if not found)

// findFirst — first row matching filter
const firstAdmin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'asc' }
})
// Return type: User | null
```

```typescript
// ── Create operations ──────────────────────────────────────────────────────

// create — single row
const newUser = await prisma.user.create({
  data: {
    email: 'mark@example.com',
    name: 'Mark Austin',
    // role: omitted → uses @default(USER)
  }
})
// Return type: User — includes all fields, with generated id and defaults

// ❌ TypeScript error — missing required field 'email'
await prisma.user.create({
  data: { name: 'Mark' }  // Error: Property 'email' is missing
})

// createMany — multiple rows, no return (or return with skipDuplicates)
const result = await prisma.user.createMany({
  data: [
    { email: 'a@a.com', name: 'Alice' },
    { email: 'b@b.com', name: 'Bob' },
  ],
  skipDuplicates: true,  // ignore rows that violate unique constraints
})
// result.count: 2

// createManyAndReturn — bulk insert with return (Prisma 5.14+)
const created = await prisma.user.createManyAndReturn({
  data: [
    { email: 'c@c.com', name: 'Carol' },
  ],
  select: { id: true, email: true }
})
// created: { id: number; email: string }[]
```

```typescript
// ── Update and Delete operations ───────────────────────────────────────────

// update — by unique field, returns updated row
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Mark Updated' },
})
// Return type: User

// updateMany — by filter, returns count
const deactivated = await prisma.user.updateMany({
  where: { role: 'GUEST', isActive: true },
  data: { isActive: false },
})
// deactivated.count: number

// upsert — create or update
const upserted = await prisma.user.upsert({
  where: { email: 'mark@example.com' },
  create: { email: 'mark@example.com', name: 'Mark' },
  update: { name: 'Mark Updated' },
})
// Return type: User

// delete — by unique field
const deleted = await prisma.user.delete({
  where: { id: 99 },
})
// Return type: User (the deleted row)

// deleteMany — by filter, returns count
const purged = await prisma.user.deleteMany({
  where: { isActive: false, createdAt: { lt: new Date('2024-01-01') } }
})
// purged.count: number
```

```typescript
// ── Transactions in Prisma Client ─────────────────────────────────────────

// Interactive transaction — multiple operations, one commit
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: { customerId: 1, status: 'PENDING', total: 0 }
  })

  const items = await tx.orderItem.createMany({
    data: [
      { orderId: order.id, productId: 1, quantity: 2, unitPrice: 129.99 },
      { orderId: order.id, productId: 2, quantity: 1, unitPrice: 49.99 },
    ]
  })

  const updated = await tx.order.update({
    where: { id: order.id },
    data: { total: 309.97 }
  })

  return updated
  // All three operations commit together or all rollback ✅
})

// Batch transaction (faster — sent as a single network request)
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'x@x.com' } }),
  prisma.profile.create({ data: { userId: 1, bio: 'Hello' } }),
])
```

---

## W — Why It Matters

- The singleton pattern for `PrismaClient` is not optional in Next.js and other hot-reloading environments — without it, every file save in development creates a new connection pool. After 100 hot reloads, you have 100 connection pools exhausting your PostgreSQL `max_connections`. The `globalThis` trick is the official Prisma recommendation.
- `findUniqueOrThrow` vs `findUnique` is a meaningful choice — `findUnique` returns `User | null` forcing you to handle the null case. `findUniqueOrThrow` returns `User` and throws a typed `PrismaClientKnownRequestError` if not found. For routes where "not found" should be a 404, `findUniqueOrThrow` + a catch block is cleaner than null checking.
- Prisma's interactive transactions use a callback pattern — the `tx` parameter is a transaction-scoped Prisma Client. If the callback throws (including Prisma errors), the entire transaction is rolled back automatically. No manual `BEGIN`/`ROLLBACK` needed.

---

## I — Interview Q&A

### Q: What does `prisma generate` produce and why does it need to be re-run after schema changes?

**A:** `prisma generate` reads `schema.prisma` and produces the Prisma Client — a set of TypeScript types, query-builder code, and a compiled query engine binary in `node_modules/.prisma/client`. The generated code includes: a `PrismaClient` class with a property for each model (`prisma.user`, `prisma.order`), CRUD method overloads for each model (`findMany`, `create`, `update`, etc.), TypeScript types for every model (the full model type, create/update input types, where filter types, select/include types), and enum types. It must be re-run after schema changes because the generated code is specific to the schema — if you add a field `phoneNumber` to the `User` model, the existing generated types don't include it. TypeScript will not see `user.phoneNumber` until you regenerate. This is why the `postinstall` hook (`"postinstall": "prisma generate"`) is important — it ensures CI and deployment always have up-to-date generated code.

---

## C — Common Pitfalls + Fix

### ❌ Multiple PrismaClient instances in Next.js — connection pool exhaustion

```typescript
// ❌ New PrismaClient on every module import — hot reload creates N pools
// src/app/api/users/route.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()  // ← new pool every hot reload ❌

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}
```

**Fix:** Use the singleton pattern:

```typescript
// src/lib/prisma.ts — singleton
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma  // reuse across hot reloads in dev
}

// src/app/api/users/route.ts
import { prisma } from '@/lib/prisma'  // ✅ always the same instance

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Using the models from this day's subtopics (User, Post, Order, OrderItem), write a TypeScript module that: (1) creates a singleton PrismaClient with query logging in development, (2) a `createOrderWithItems` function that uses an interactive transaction to create an order + items + update the total atomically, (3) a `getUserDashboard` function that fetches a user with their order count and total spend using `select` to avoid over-fetching, (4) a `paginateOrders` function implementing cursor-based pagination. Show all TypeScript types.

### Solution

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

```typescript
// src/services/order.service.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── (2) createOrderWithItems — atomic transaction ──────────────────────────
interface OrderItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

async function createOrderWithItems(
  customerId: number,
  items: OrderItemInput[]
): Promise<{ orderId: number; total: number; itemCount: number }> {
  return prisma.$transaction(async (tx) => {
    // Step 1: create order with zero total
    const order = await tx.order.create({
      data: {
        customerId,
        status: 'PENDING',
        total: 0,
      },
      select: { id: true },
    })

    // Step 2: bulk insert order items
    await tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
      })),
    })

    // Step 3: compute and update total
    const aggregate = await tx.orderItem.aggregate({
      where: { orderId: order.id },
      _sum: { unitPrice: true },  // simplified: sum of unit prices
      _count: { _all: true },
    })

    const total = Number(aggregate._sum.unitPrice ?? 0)

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { total: new Prisma.Decimal(total) },
      select: { id: true, total: true },
    })

    return {
      orderId: updated.id,
      total: Number(updated.total),
      itemCount: aggregate._count._all,
    }
  })
}

// ── (3) getUserDashboard — select only needed fields ───────────────────────
interface UserDashboard {
  id: number
  email: string
  name: string | null
  orderCount: number
  totalSpend: number
}

async function getUserDashboard(userId: number): Promise<UserDashboard | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      // No `role`, `passwordHash`, `isActive` etc. — only what we need
      _count: {
        select: { orders: true }    // count related orders
      },
      orders: {
        select: { total: true }     // only fetch total for aggregation
      }
    }
  })

  if (!user) return null

  const totalSpend = user.orders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  )

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orderCount: user._count.orders,
    totalSpend,
  }
}

// ── (4) paginateOrders — cursor-based pagination ───────────────────────────
interface PaginatedOrders {
  data: Array<{
    id: number
    customerId: number
    status: string
    total: number
    createdAt: Date
  }>
  nextCursor: string | null
  hasNextPage: boolean
}

interface PaginateOrdersInput {
  cursor?: string | null   // base64 encoded { id, createdAt }
  pageSize?: number
  customerId?: number
}

async function paginateOrders({
  cursor,
  pageSize = 20,
  customerId,
}: PaginateOrdersInput): Promise<PaginatedOrders> {
  // Decode cursor
  let cursorData: { id: number; createdAt: string } | null = null
  if (cursor) {
    try {
      cursorData = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      )
    } catch {
      cursorData = null
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(cursorData ? {
        OR: [
          { createdAt: { lt: new Date(cursorData.createdAt) } },
          {
            createdAt: { equals: new Date(cursorData.createdAt) },
            id: { lt: cursorData.id }
          }
        ]
      } : {}),
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      total: true,
      createdAt: true,
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ],
    take: pageSize + 1,  // fetch one extra to determine hasNextPage
  })

  const hasNextPage = orders.length > pageSize
  const data = hasNextPage ? orders.slice(0, pageSize) : orders

  const lastItem = data[data.length - 1]
  const nextCursor = lastItem && hasNextPage
    ? Buffer.from(JSON.stringify({
        id: lastItem.id,
        createdAt: lastItem.createdAt.toISOString()
      })).toString('base64')
    : null

  return {
    data: data.map(o => ({ ...o, total: Number(o.total) })),
    nextCursor,
    hasNextPage,
  }
}

export { createOrderWithItems, getUserDashboard, paginateOrders }
```

---

## ✅ Day 5 Complete — Prisma Schema Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | schema.prisma — File Structure and the Three Blocks | ☐ |
| 2 | datasource — Connecting to PostgreSQL | ☐ |
| 3 | generator — Prisma Client Configuration | ☐ |
| 4 | Models — Declaring Tables and Fields | ☐ |
| 5 | Field Types — Scalar Types and the Type Mapping Rules | ☐ |
| 6 | Field Modifiers — Optional, List, Default, @id, @unique, @updatedAt | ☐ |
| 7 | Enums — Type-Safe Categorical Values | ☐ |
| 8 | Native Type Mapping — Precise PostgreSQL Type Control | ☐ |
| 9 | Model-to-Table Mapping — @@map, @map, @@schema | ☐ |
| 10 | Prisma Client Generation — prisma generate, Output, and Usage | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
SCHEMA.PRISMA STRUCTURE
  generator client { ... }   → what to generate (prisma-client-js)
  datasource db { ... }      → where is the database (postgresql + url)
  model ModelName { ... }    → each table
  enum EnumName { ... }      → categorical value sets
  Order: generator → datasource → enums → models (convention)

DATASOURCE
  provider  = "postgresql"
  url       = env("DATABASE_URL")     never hardcode credentials
  directUrl = env("DIRECT_URL")       for PgBouncer / Supabase pooler
  schemas   = ["public", "auth"]      multi-schema support

GENERATOR
  provider        = "prisma-client-js"
  output          = "../src/lib/db"   optional custom path
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]  ← set for Docker!
  previewFeatures = ["multiSchema", "relationJoins"]
  postinstall: "prisma generate"  in package.json scripts

MODELS
  model Name { fields; @@map; @@index; @@unique; @@id; @@schema }
  Every model needs an @id (single) or @@id (composite)
  Relation fields are virtual (no DB column) — only scalar fields = columns
  Model name → prisma.modelName (camelCase) → table (via @@map)

FIELD TYPES (Prisma → PostgreSQL → TypeScript)
  String        → TEXT              → string
  Int           → INTEGER           → number
  BigInt        → BIGINT            → bigint   (use n suffix: 42n)
  Float         → DOUBLE PRECISION  → number   (NOT for money!)
  Decimal       → DECIMAL(65,30)    → Prisma.Decimal  (for money!)
  Boolean       → BOOLEAN           → boolean
  DateTime      → TIMESTAMP(3)      → Date     (use @db.Timestamptz for TZ!)
  Json          → JSONB             → Prisma.JsonValue
  Bytes         → BYTEA             → Buffer

FIELD MODIFIERS
  String?       → nullable (NULL)              → string | null in TS
  String[]      → PostgreSQL array (TEXT[])    → string[] in TS
  @id           → PRIMARY KEY
  @unique       → UNIQUE constraint + index
  @@unique([a,b]) → multi-column UNIQUE + index
  @default(...)  → column DEFAULT (now(), autoincrement(), uuid(), constant)
  @updatedAt    → Prisma auto-sets to now() on update (NOT a PG trigger)
  @ignore       → exclude field from Prisma Client (still in DB)

ENUMS
  enum EnumName { VALUE1 VALUE2 @map("v2") ... @@map("pg_type_name") }
  TypeScript: EnumName.VALUE1 (type-safe union)
  Pros: type safety, storage efficiency (4 bytes)
  Cons: hard to remove values — requires PG type recreation
  Alternative: String + CHECK constraint (easier to modify)

NATIVE TYPES (@db.*)
  String → @db.VarChar(n), @db.Char(n), @db.Uuid, @db.Inet, @db.Citext
  Decimal → @db.Decimal(p,s)  ← always specify for money
  DateTime → @db.Timestamptz  ← ALWAYS for event timestamps in production
            → @db.Date        ← for calendar dates (no time)
  Json → @db.JsonB (default), @db.Json (text, avoid)

MAPPING (Prisma ↔ PostgreSQL)
  @@map("table_name")     → sets PostgreSQL table name
  @map("column_name")     → sets PostgreSQL column name
  @@schema("pg_schema")   → places model in PG schema (namespace)
  Convention: PascalCase model → @@map("snake_case_table")
              camelCase field  → @map("snake_case_column")

PRISMA CLIENT
  npx prisma generate                → generates types + client
  new PrismaClient()                 → creates connection pool
  SINGLETON: use globalThis trick    → prevents pool exhaustion in Next.js
  prisma.model.findMany(...)         → typed query
  prisma.model.findUnique(...)       → returns T | null
  prisma.model.findUniqueOrThrow()   → returns T or throws
  prisma.model.create(...)           → typed insert
  prisma.model.update(...)           → typed update
  prisma.model.upsert(...)           → create or update
  prisma.model.delete(...)           → delete + return deleted row
  prisma.$transaction(async (tx) => { ... })  → interactive transaction

KEY RULES
  NEVER hardcode DB credentials — always env()
  ALWAYS @@map() and @map() — snake_case in PG, camelCase in TypeScript
  ALWAYS @db.Timestamptz for event timestamps
  ALWAYS @db.Decimal(p,s) for money — NEVER Float
  ALWAYS set binaryTargets for Docker deployments
  ALWAYS postinstall: prisma generate in package.json
  ONE PrismaClient singleton per process — use globalThis pattern
```

> **Your next action:** Create a `prisma/schema.prisma` file in any
