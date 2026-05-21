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
