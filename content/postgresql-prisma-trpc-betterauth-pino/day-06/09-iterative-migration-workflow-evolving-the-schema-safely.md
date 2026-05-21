# 9 — Iterative Migration Workflow — Evolving the Schema Safely

---

## T — TL;DR

Every schema change after the initial migration follows the same loop: modify `schema.prisma` → run `prisma migrate dev --name description` → review the generated SQL → commit both the schema and migration file to git. Complex migrations (column renames, type changes, data backfills) require editing the generated SQL before applying. Prisma detects pending unapplied migrations and applies them in order.

---

## K — Key Concepts

```bash
# ── The iterative migration loop ─────────────────────────────────────────────

# Step 1: Edit schema.prisma (add field, change type, add model, etc.)
# Step 2: Generate + apply migration
npx prisma migrate dev --name add_published_at_to_posts

# Step 3: Review the generated SQL:
cat prisma/migrations/20250616_add_published_at_to_posts/migration.sql

# Step 4: Commit to git
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add published_at to posts"

# Repeat for every schema change
```

```
── Migration scenarios and generated SQL ─────────────────────────────────────

SCENARIO               │ Prisma action               │ SQL generated
───────────────────────┼─────────────────────────────┼─────────────────────────
Add nullable column     │ ADD COLUMN ... NULL          │ safe (existing rows get NULL)
Add required column     │ ADD COLUMN ... DEFAULT ...   │ needs default or data migration
Add unique constraint   │ CREATE UNIQUE INDEX          │ fails if duplicates exist
Add index               │ CREATE INDEX                 │ safe
Add new model (table)   │ CREATE TABLE                 │ safe
Add enum value          │ ALTER TYPE ... ADD VALUE     │ safe
Remove column           │ DROP COLUMN                  │ ⚠️ data loss — review!
Remove model            │ DROP TABLE                   │ ⚠️ data loss — review!
Rename column           │ DROP + ADD (not RENAME)      │ ⚠️ data loss — must edit SQL
Change column type      │ ALTER COLUMN + CAST          │ may fail if cast fails — review
```

```bash
# ── Adding a nullable column — safe ───────────────────────────────────────
# In schema.prisma: add publishedAt DateTime? to Post
npx prisma migrate dev --name add_published_at

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMPTZ;
# Safe: existing rows get NULL, no data loss ✅
```

```bash
# ── Adding a required column — needs a default or two-step migration ────────
# In schema.prisma: add slug String (required, non-nullable) to Post

# ❌ Prisma cannot add a NOT NULL column with no default if rows already exist
# Generated SQL would fail: ALTER TABLE "posts" ADD COLUMN "slug" TEXT NOT NULL
# → fails because existing rows have no value for slug

# ✅ Solution: two-step migration
# Step 1: add as nullable
npx prisma migrate dev --name add_slug_nullable --create-only
# Edit SQL to: ADD COLUMN "slug" TEXT;  (nullable first)
npx prisma migrate dev  # apply

# Step 2: backfill values
npx prisma migrate dev --name backfill_slug --create-only
# Edit SQL to:
# UPDATE posts SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;
# ALTER TABLE posts ALTER COLUMN slug SET NOT NULL;
npx prisma migrate dev  # apply
```

```bash
# ── Renaming a column — MUST edit the generated SQL ───────────────────────
# In schema.prisma: rename body → content on Post (and update @map)

# Prisma sees: body was removed, content was added
# Generated SQL (incorrect):
# ALTER TABLE "posts" DROP COLUMN "body";
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
# → This DROPS the column and creates a new empty one — DATA LOSS ❌

# Fix: use --create-only and edit the SQL
npx prisma migrate dev --name rename_body_to_content --create-only

# Edit migration.sql:
# BEFORE (generated):
# ALTER TABLE "posts" DROP COLUMN "body";
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
#
# AFTER (edited):
# ALTER TABLE "posts" RENAME COLUMN "body" TO "content";  ← no data loss ✅

npx prisma migrate dev  # apply the edited migration
```

```bash
# ── Adding a new relation (FK) — standard flow ───────────────────────────
# Add category_id to posts: Post now belongs to Category

# In schema.prisma: add CategoryId Int?, category Category? @relation(...)
npx prisma migrate dev --name add_category_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "category_id" INTEGER;
# ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey"
#   FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
# CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");
```

```bash
# ── Data migrations — seeding data as part of a schema migration ──────────
# When you need to both change schema AND migrate existing data

npx prisma migrate dev --name split_name_into_first_last --create-only

# Edit migration.sql to add data transformation:
# -- Add new columns
# ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
# ALTER TABLE "users" ADD COLUMN "last_name" TEXT;
#
# -- Backfill from existing name column
# UPDATE users
# SET first_name = split_part(name, ' ', 1),
#     last_name  = split_part(name, ' ', 2)
# WHERE name IS NOT NULL;
#
# -- Optional: drop old column (can be a separate later migration)
# ALTER TABLE "users" DROP COLUMN "name";

npx prisma migrate dev  # apply
```

```bash
# ── Multiple unapplied migrations ─────────────────────────────────────────
# If a team member's branch has 2 pending migrations and you pull their code:
npx prisma migrate status
# Output:
# 2 migrations found in prisma/migrations that have not yet been applied:
#   - 20250616_add_slug
#   - 20250617_add_category

npx prisma migrate dev
# Applies all pending migrations in order ✅
```

---

## W — Why It Matters

- Column renames are the most dangerous common migration — Prisma generates `DROP COLUMN` + `ADD COLUMN` (data loss) instead of `RENAME COLUMN`. Always use `--create-only` and edit the SQL for any rename operation. This is not a Prisma bug — Prisma cannot distinguish "this column was renamed" from "this column was removed and a new one was added" just from comparing schemas.
- Data migrations embedded in schema migrations are powerful but risky — if the `UPDATE` statement fails halfway through, the migration is partially applied and the `_prisma_migrations` table records it as failed. Test data migrations on a copy of production data before applying.
- Git-committing migration files alongside `schema.prisma` is the non-negotiable practice that makes team collaboration work — if two developers run `migrate dev` on the same schema change independently, they get two migration files with different timestamps. Only one should be kept. Always coordinate migration file creation.

---

## I — Interview Q&A

### Q: How do you safely rename a column in Prisma without losing data?

**A:** Prisma's `migrate dev` treats a field rename as "remove old field + add new field" because it compares the before/after schema and sees one column disappearing and a new one appearing — it cannot infer rename intent. The generated SQL would be `DROP COLUMN old_name; ADD COLUMN new_name;` which destroys the data. The safe process is: (1) run `prisma migrate dev --name rename_field --create-only` to generate the SQL file without applying it; (2) open the generated `migration.sql` and replace the `DROP + ADD` with `ALTER TABLE t RENAME COLUMN old_name TO new_name;`; (3) also update `schema.prisma` to change the field name and add `@map("old_name")` so Prisma knows the column mapping; (4) run `prisma migrate dev` to apply the edited migration. The `RENAME COLUMN` statement preserves all existing data.

---

## C — Common Pitfalls + Fix

### ❌ Not using `--create-only` for a column rename — data loss

```bash
# ❌ Directly running migrate dev on a field rename
# Schema change: body → content on Post model

npx prisma migrate dev --name rename_body_to_content
# Prisma generates and IMMEDIATELY APPLIES:
# ALTER TABLE "posts" DROP COLUMN "body";    ← data gone ❌
# ALTER TABLE "posts" ADD COLUMN "content" TEXT;
```

**Fix:**

```bash
# ✅ Step 1: generate only, don't apply
npx prisma migrate dev --name rename_body_to_content --create-only

# Step 2: edit the generated SQL
# Change from:
#   ALTER TABLE "posts" DROP COLUMN "body";
#   ALTER TABLE "posts" ADD COLUMN "content" TEXT;
# To:
#   ALTER TABLE "posts" RENAME COLUMN "body" TO "content";

# Step 3: apply the edited migration
npx prisma migrate dev

# Step 4: update schema.prisma to add @map if needed
# model Post {
#   content String @map("content")  ← field name matches SQL now
# }
```

---

## K — Coding Challenge + Solution

### Challenge

Starting from the blog schema (User, Post, Tag), perform four iterative migrations: (1) add a nullable `publishedAt DateTime?` to Post; (2) add a required `slug String @unique` to Post using a two-step approach; (3) add a new `Category` model and add a nullable FK from Post to Category; (4) add a `viewCount BigInt @default(0)` to Post. Show the CLI commands, the expected SQL for each, and the schema state after all four migrations.

### Solution

```bash
# ── Migration 1: add nullable publishedAt ─────────────────────────────────
# Edit schema.prisma: add publishedAt DateTime? @map("published_at") @db.Timestamptz

npx prisma migrate dev --name add_published_at_to_posts

# Generated SQL (auto-applied safely):
# ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMPTZ;
```

```bash
# ── Migration 2a: add slug as nullable first ──────────────────────────────
# Edit schema.prisma: add slug String? @unique

npx prisma migrate dev --name add_slug_nullable_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "slug" TEXT;
# CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
```

```bash
# ── Migration 2b: backfill slug + make NOT NULL ────────────────────────────
npx prisma migrate dev --name backfill_and_set_slug_not_null --create-only

# Edit migration.sql:
# UPDATE "posts"
# SET "slug" = LOWER(REGEXP_REPLACE(REPLACE(title, ' ', '-'), '[^a-z0-9\-]', '', 'g'))
# WHERE "slug" IS NULL;
# ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;

# Update schema.prisma: change slug String? → slug String

npx prisma migrate dev  # applies the edited migration
```

```bash
# ── Migration 3: add Category model + nullable FK on Post ─────────────────
# Edit schema.prisma: add Category model and categoryId Int? to Post

npx prisma migrate dev --name add_category_model_and_post_fk

# Generated SQL:
# CREATE TABLE "categories" (
#     "id" SERIAL NOT NULL,
#     "name" TEXT NOT NULL,
#     "slug" TEXT NOT NULL,
#     CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
# );
# CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
# ALTER TABLE "posts" ADD COLUMN "category_id" INTEGER;
# CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");
# ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey"
#   FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

```bash
# ── Migration 4: add viewCount to Post ────────────────────────────────────
# Edit schema.prisma: add viewCount BigInt @default(0) @map("view_count")

npx prisma migrate dev --name add_view_count_to_posts

# Generated SQL:
# ALTER TABLE "posts" ADD COLUMN "view_count" BIGINT NOT NULL DEFAULT 0;
```

```prisma
// ── Final schema.prisma after all 4 migrations ────────────────────────────

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN @map("admin")
  USER  @map("user")
  @@map("user_role")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
  posts     Post[]
  @@map("users")
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  slug  String @unique
  posts Post[]
  @@map("categories")
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique                     // Added in migration 2
  body        String?
  isPublished Boolean   @default(false) @map("is_published")
  publishedAt DateTime? @map("published_at") @db.Timestamptz  // Added in migration 1
  viewCount   BigInt    @default(0) @map("view_count")         // Added in migration 4
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  authorId    Int       @map("author_id")
  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  categoryId  Int?      @map("category_id")         // Added in migration 3
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  tags        Tag[]

  @@index([authorId])
  @@index([categoryId])                              // Added in migration 3
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
  @@map("tags")
}
```

---

---
