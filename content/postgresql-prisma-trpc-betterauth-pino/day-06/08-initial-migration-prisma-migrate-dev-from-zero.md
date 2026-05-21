# 8 — Initial Migration — prisma migrate dev from Zero

---

## T — TL;DR

`prisma migrate dev` is the primary development migration command. On first run, it reads the schema, generates SQL DDL, creates the `prisma/migrations/` directory, and applies the migration to the development database. The migration is recorded in a `_prisma_migrations` table. This command creates a named migration file, applies it, and regenerates the Prisma Client — all in one step.

---

## K — Key Concepts

```
── The prisma migration directory structure ──────────────────────────────────

prisma/
├── schema.prisma
└── migrations/
    ├── migration_lock.toml          ← records which database provider is used
    └── 20250615143022_init/
        └── migration.sql            ← the actual SQL DDL for this migration

Each migration folder name: {timestamp}_{name}
  timestamp:  YYYYMMDDHHMMSS (UTC)
  name:       the name you provide (or auto-generated)

migration_lock.toml — prevents accidentally switching database providers:
  provider = "postgresql"
```

```bash
# ── First migration: from zero ─────────────────────────────────────────────
npx prisma migrate dev --name init

# What it does:
# 1. Checks if the database is reachable (uses DATABASE_URL)
# 2. Reads schema.prisma
# 3. Creates a "shadow database" to compute the SQL diff
# 4. Generates: prisma/migrations/20250615143022_init/migration.sql
# 5. Applies the migration SQL to the development database
# 6. Records the migration in the _prisma_migrations table
# 7. Runs npx prisma generate (regenerates the Prisma Client)

# Output:
# ✔ Created and applied migration `20250615143022_init`
# ✔ Generated Prisma Client (v7.x.x)
```

```sql
-- ── Example: generated migration.sql for init ────────────────────────────
-- Prisma generates this SQL from your schema.prisma
-- prisma/migrations/20250615143022_init/migration.sql

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'user', 'moderator');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_author_id"
    FOREIGN KEY ("author_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

```bash
# ── Key flags for prisma migrate dev ─────────────────────────────────────
npx prisma migrate dev --name init          # named migration
npx prisma migrate dev                      # Prisma prompts for name interactively
npx prisma migrate dev --create-only        # generate SQL but DON'T apply it yet
npx prisma migrate dev --skip-generate      # apply migration but skip prisma generate
npx prisma migrate dev --reset              # ⚠️ DROP ALL TABLES, reapply all migrations
```

```bash
# ── prisma migrate dev --create-only workflow ────────────────────────────
# Use when: you want to review or edit the SQL before applying

# Step 1: generate SQL file only
npx prisma migrate dev --name add_users --create-only
# Creates: prisma/migrations/20250615143022_add_users/migration.sql
# Does NOT apply it yet

# Step 2: review/edit the migration.sql
# (e.g. add a custom index, backfill data, add a partial index)
vim prisma/migrations/20250615143022_add_users/migration.sql

# Step 3: apply the edited migration
npx prisma migrate dev
# Prisma detects unapplied migration and applies it
```

```bash
# ── What _prisma_migrations table tracks ─────────────────────────────────
# Prisma creates this table in your database on first migrate dev
# SELECT * FROM _prisma_migrations;
# id | checksum | finished_at | migration_name | logs | rolled_back_at | started_at | applied_steps_count
# 1  | abc123   | 2025-06-15  | 20250615_init  | null | null           | 2025-06-15 | 1
```

```bash
# ── prisma db push vs prisma migrate dev ─────────────────────────────────
# These are TWO DIFFERENT commands with different purposes:

# prisma db push:
# - Directly syncs schema to DB without creating migration files
# - Good for: prototyping, development, Prisma Studio demos
# - BAD for: production (no migration history, no rollback trail)
# - Does NOT create files in prisma/migrations/

# prisma migrate dev:
# - Creates SQL migration files + applies them
# - Required for: any shared team environment, staging, production
# - Creates an auditable history of all schema changes
# - ALWAYS use this for real projects
```

---

## W — Why It Matters

- `--create-only` is critical for production safety — it lets you review the generated SQL before it touches the database. Prisma's generated SQL is almost always correct, but complex migrations (renaming columns, changing types) need human review. Never blindly apply auto-generated migrations to production data.
- The `migration_lock.toml` file prevents a common mistake: accidentally switching the database provider (`postgresql` → `sqlite`) between team members or environments, which would make migrations incompatible. If the lock file doesn't match, Prisma throws an error.
- `prisma db push` vs `prisma migrate dev` — `db push` is a shortcut for personal prototyping. The moment you're working with a team, staging environments, or production data, you must use `migrate dev` to build a migration history. `db push` has no rollback, no audit trail, and can silently drop columns if you remove them from the schema.

---

## I — Interview Q&A

### Q: What is the difference between `prisma migrate dev` and `prisma db push`?

**A:** Both commands sync your `schema.prisma` to the database, but they serve different purposes. `prisma db push` directly applies the schema to the database without creating migration files — it's fast for prototyping and personal development but has no audit trail and cannot be used for production deployments. If you remove a field from the schema and run `db push`, it drops the column immediately with no migration file as evidence. `prisma migrate dev` generates a SQL migration file in `prisma/migrations/`, applies it, and records it in `_prisma_migrations`. This creates an auditable history — every schema change is a versioned SQL file that can be reviewed, committed to git, deployed to staging, and promoted to production using `prisma migrate deploy`. For any real project with a team or production environment, `migrate dev` is mandatory.

---

## C — Common Pitfalls + Fix

### ❌ Running `prisma db push` in a production environment

```bash
# ❌ db push directly syncs schema — drops columns, no migration file, no rollback
npx prisma db push
# "The following changes will be applied to your production database:"
# "- The column `legacy_field` will be dropped."  ← data loss, no recovery ❌
```

**Fix:** Always use `migrate dev` for development and `migrate deploy` for production:

```bash
# ✅ Development: creates migration file + applies
npx prisma migrate dev --name remove_legacy_field

# ✅ Production: applies existing migration files (never auto-generates)
npx prisma migrate deploy
```

---

## K — Coding Challenge + Solution

### Challenge

Starting from scratch, set up a complete initial migration for a simple blog: (1) write the full `schema.prisma` with `User`, `Post`, and `Tag` models (implicit M:N) with `@@map`, `@map`, enums, native types, and proper FK indexing; (2) show the exact CLI commands to initialize the project, run the first migration, and verify it; (3) show what the generated `migration.sql` would look like; (4) show how to verify the migration was applied with `prisma migrate status`.

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

model Post {
  id          Int      @id @default(autoincrement())
  title       String
  body        String?
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  authorId    Int      @map("author_id")
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  tags        Tag[]    // implicit M:N

  @@index([authorId])
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]

  @@map("tags")
}
```

```bash
# ── CLI commands ─────────────────────────────────────────────────────────────

# 1. Install Prisma (if not already installed)
npm install prisma @prisma/client
npm install -D prisma

# 2. Initialize Prisma (creates prisma/ directory with schema.prisma)
npx prisma init --datasource-provider postgresql

# 3. Set DATABASE_URL in .env
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/blog_dev"' >> .env

# 4. Run the first migration
npx prisma migrate dev --name init

# Output:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# ✔ Created and applied migration `20250615143022_init` in 342ms
# ✔ Generated Prisma Client (v7.x.x) to ./node_modules/.prisma/client

# 5. Verify migration status
npx prisma migrate status
# Output:
# 1 migration found in prisma/migrations
# ✔ Database schema is up to date!

# 6. Inspect the generated SQL
cat prisma/migrations/20250615143022_init/migration.sql

# 7. Open Prisma Studio to verify tables
npx prisma studio
```

```sql
-- prisma/migrations/20250615143022_init/migration.sql
-- (Approximate — Prisma generates this)

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable (implicit M:N join table)
CREATE TABLE "_PostToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_PostToTag_AB_unique" ON "_PostToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey"
    FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey"
    FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

---
