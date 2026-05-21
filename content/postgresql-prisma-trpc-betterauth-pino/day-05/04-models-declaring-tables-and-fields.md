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
