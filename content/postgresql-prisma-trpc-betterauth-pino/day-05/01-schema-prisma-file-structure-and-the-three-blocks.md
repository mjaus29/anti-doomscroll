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
