# 7 — Relation Modes — foreignKeys vs prisma

---

## T — TL;DR

The `relationMode` setting in the datasource block controls how Prisma enforces referential integrity. `foreignKeys` (the default) delegates FK constraint enforcement to the database — PostgreSQL validates relations on every write. `prisma` mode handles referential actions in Prisma Client code instead of the database — no FK constraints are created in the schema. Use `foreignKeys` (default) for PostgreSQL. Use `prisma` mode only for databases that don't support FK constraints natively (PlanetScale).

---

## K — Key Concepts

```prisma
// ── foreignKeys mode (default for PostgreSQL) ──────────────────────────────
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "foreignKeys"   // explicit (this is the default — can omit)
}

// With foreignKeys mode:
// ✅ PostgreSQL enforces FK constraints at the database level
// ✅ INSERT with invalid FK fails at the DB layer (not just Prisma)
// ✅ ON DELETE CASCADE / RESTRICT enforced by PostgreSQL
// ✅ FK indexes recommended (but not auto-created — add @@index manually)
// ✅ Full referential integrity even for raw SQL queries
```

```prisma
// ── prisma mode (for databases without native FK support) ─────────────────
datasource db {
  provider     = "mysql"   // e.g. PlanetScale (MySQL without FK constraints)
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

// With prisma mode:
// ❌ NO FK constraints in the database
// ✅ Prisma Client emulates referential actions in application code
// ⚠️ Raw SQL bypasses referential integrity (no DB-level enforcement)
// ⚠️ Requires manual @@index on ALL relation scalar fields (FK columns)
//    because PostgreSQL/MySQL can't create FK constraint indexes automatically
//    when no FK constraint exists
```

```prisma
// ── Required @@index in prisma mode ───────────────────────────────────────
// In foreignKeys mode: FK constraints implicitly help with some queries
// In prisma mode: you MUST add @@index on every FK field or face full table scans

// ❌ In prisma mode — no FK constraint, no automatic index, full scan on join
model Post {
  userId Int
  user   User @relation(fields: [userId], references: [id])
  // No @@index([userId]) → every "WHERE user_id = ?" is a full scan
}

// ✅ In prisma mode — always add @@index on relation scalar fields
model Post {
  userId Int
  user   User @relation(fields: [userId], references: [id])
  @@index([userId])  // ← required in prisma mode
}
```

```
── foreignKeys vs prisma — comparison ───────────────────────────────────────

Feature                     │ foreignKeys           │ prisma
────────────────────────────┼───────────────────────┼─────────────────────────
FK constraint in DB         │ ✅ Yes                │ ❌ No
DB-level referential safety │ ✅ Yes                │ ❌ Only via Prisma Client
Raw SQL respects FK rules   │ ✅ Yes                │ ❌ No
onDelete/onUpdate           │ DB enforces           │ Prisma emulates
Supported databases         │ PostgreSQL, MySQL,    │ PlanetScale (MySQL),
                            │ SQL Server, SQLite    │ MongoDB (different rules)
Implicit M:N join table     │ ✅ Works              │ ✅ Works (with @@index)
Required @@index on FKs     │ Recommended (perf)    │ Required (correctness)
```

```prisma
// ── Referential actions emulated in prisma mode ────────────────────────────
// When using prisma mode, Prisma Client intercepts delete/update calls
// and emulates the FK action in application code

// onDelete: Cascade  → Prisma issues DELETE on child rows before deleting parent
// onDelete: SetNull  → Prisma issues UPDATE to set FK to NULL on child rows
// onDelete: Restrict → Prisma checks for child rows and throws if any exist

// ⚠️ Emulation runs in a transaction but NOT an atomic database transaction
// ⚠️ If Prisma emulation crashes mid-way, database may be in inconsistent state
// This is why foreignKeys mode (DB-enforced) is always preferred for PostgreSQL
```

---

## W — Why It Matters

- `relationMode = "foreignKeys"` is the default and correct setting for PostgreSQL — it means PostgreSQL validates all FK references at the database level. Data integrity is guaranteed even when rows are inserted via raw SQL, database tools (pgAdmin, psql), or other ORMs. This is a fundamental database design principle.
- `prisma` mode should never be used with PostgreSQL unless you have a very specific reason — it removes database-level referential integrity and puts the entire burden on Prisma Client. Raw SQL `INSERT` statements can create orphaned rows silently.
- The `@@index` requirement in `prisma` mode is a gotcha that catches many developers — without database FK constraints, there are no implicit index hints, and without explicit `@@index` declarations on FK fields, many queries become full table scans. Prisma v4+ added a warning for this.

---

## I — Interview Q&A

### Q: What is `relationMode = "prisma"` and when would you use it?

**A:** `relationMode = "prisma"` tells Prisma to handle referential integrity actions (cascade deletes, set null, restrict) in application code rather than relying on database-level foreign key constraints. The database schema is generated WITHOUT FK constraints. This mode exists specifically for databases that don't support FK constraints natively — the primary use case is PlanetScale (a MySQL-compatible serverless database that uses Vitess, which doesn't support FK constraints due to its distributed sharding model). You would never choose `prisma` mode for PostgreSQL unless you have a specific requirement to bypass FK constraints. For PostgreSQL, always use the default `foreignKeys` mode — it gives you database-level enforcement, works correctly with raw SQL, and is part of PostgreSQL's core reliability guarantee.

---

## C — Common Pitfalls + Fix

### ❌ Setting `relationMode = "prisma"` on a PostgreSQL database — loses FK enforcement

```prisma
// ❌ Unnecessary and harmful for PostgreSQL — removes FK constraints from DB
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"   // ← NEVER for PostgreSQL ❌
}
// Result: no FOREIGN KEY constraints in PostgreSQL
// Raw SQL INSERT with invalid user_id succeeds — orphaned data ❌
```

**Fix:** Use the default `foreignKeys` mode (or omit `relationMode` entirely):

```prisma
// ✅ For PostgreSQL: use foreignKeys mode (or just omit it — it's the default)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // relationMode = "foreignKeys"  ← this is the default, can be omitted
}
```

---

## K — Coding Challenge + Solution

### Challenge

Show side-by-side schemas for a `Blog → Post → Comment` chain: (1) Version A: `foreignKeys` mode (PostgreSQL production) with proper `onDelete` rules and optional `@@index`; (2) Version B: `prisma` mode (PlanetScale) with required `@@index` on all FK fields and same `onDelete` rules. Explain in comments why each choice differs. Show how a cascade delete of a Blog is handled differently in each mode.

### Solution

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// VERSION A: foreignKeys mode — PostgreSQL (production standard)
// ═══════════════════════════════════════════════════════════════════════════

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // relationMode defaults to "foreignKeys" — FK constraints created in PostgreSQL
}

model Blog {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[] // back-relation
  @@map("blogs")
}

model Post {
  id     Int    @id @default(autoincrement())
  title  String

  blogId Int    @map("blog_id")
  blog   Blog   @relation(
    fields:   [blogId],
    references: [id],
    onDelete: Cascade   // DB enforces: DELETE blogs → DELETE posts via FK constraint
  )
  comments Comment[]

  // @@index([blogId]) — recommended for performance, not strictly required
  // PostgreSQL FK constraint means the FK is respected at DB level regardless
  @@index([blogId])   // still add for query performance
  @@map("posts")
}

model Comment {
  id     Int    @id @default(autoincrement())
  body   String

  postId Int    @map("post_id")
  post   Post   @relation(
    fields:   [postId],
    references: [id],
    onDelete: Cascade   // DB enforces: DELETE posts → DELETE comments
  )

  @@index([postId])
  @@map("comments")
}

// Cascade delete behavior in foreignKeys mode:
// await prisma.blog.delete({ where: { id: 1 } })
// → PostgreSQL executes:
//   DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE blog_id = 1)
//   DELETE FROM posts WHERE blog_id = 1
//   DELETE FROM blogs WHERE id = 1
// → All via ON DELETE CASCADE FK constraints — ATOMIC, enforced at DB level ✅
// → Even raw SQL: DELETE FROM blogs WHERE id = 1  ← ALSO cascades ✅
```

```prisma
// ═══════════════════════════════════════════════════════════════════════════
// VERSION B: prisma mode — PlanetScale (MySQL without FK constraints)
// ═══════════════════════════════════════════════════════════════════════════

datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // ← required for PlanetScale (no DB FK constraints)
}

model Blog {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}

model Post {
  id     Int    @id @default(autoincrement())
  title  String

  blogId Int
  blog   Blog @relation(
    fields:   [blogId],
    references: [id],
    onDelete: Cascade   // Prisma CLIENT emulates cascade in application code
  )
  comments Comment[]

  // !! REQUIRED in prisma mode !!
  // No FK constraint = no implicit index = full table scan without this
  @@index([blogId])   // ← REQUIRED (not just recommended) in prisma mode
}

model Comment {
  id     Int    @id @default(autoincrement())
  body   String

  postId Int
  post   Post @relation(
    fields:   [postId],
    references: [id],
    onDelete: Cascade   // Prisma CLIENT emulates cascade
  )

  // !! REQUIRED in prisma mode !!
  @@index([postId])   // ← REQUIRED
}

// Cascade delete behavior in prisma mode:
// await prisma.blog.delete({ where: { id: 1 } })
// → Prisma Client executes:
//   1. prisma.comment.deleteMany({ where: { post: { blogId: 1 } } })
//   2. prisma.post.deleteMany({ where: { blogId: 1 } })
//   3. prisma.blog.delete({ where: { id: 1 } })
// → Three separate queries — NOT a single DB-level cascade
// → If step 2 fails: comments deleted but posts still exist → INCONSISTENT ❌
// → Raw SQL: DELETE FROM blogs WHERE id = 1  ← does NOT cascade (no FK) ❌
```

---

---
