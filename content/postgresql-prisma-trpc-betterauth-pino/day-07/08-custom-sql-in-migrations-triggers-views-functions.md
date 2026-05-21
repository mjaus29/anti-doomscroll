# 8 — Custom SQL in Migrations — Triggers, Views, Functions

---

## T — TL;DR

Prisma migration files are plain SQL files — you can write any valid PostgreSQL SQL in them. When Prisma's auto-generated SQL doesn't cover a feature (triggers, views, functions, RLS, partial indexes), you use `--create-only` to get an empty migration file, then write the SQL yourself. These custom SQL objects persist in the database across deployments because they're tracked in the migration history.

---

## K — Key Concepts

```bash
# ── The custom SQL migration workflow ─────────────────────────────────────

# Step 1: create a migration file without applying it
npx prisma migrate dev --name add_updated_at_trigger --create-only

# Step 2: open the generated (empty or partial) migration.sql
# Add your custom SQL after any Prisma-generated content
vim prisma/migrations/20250615_add_updated_at_trigger/migration.sql

# Step 3: apply the migration
npx prisma migrate dev

# Step 4: commit
git add prisma/migrations/
git commit -m "feat: add updated_at trigger for raw SQL compatibility"
```

```sql
-- ── Pattern 1: Auto-update timestamp trigger ──────────────────────────────
-- prisma/migrations/20250615_add_updated_at_triggers/migration.sql

-- Generic reusable trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to users table
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply to posts table
CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Now updated_at is DB-managed for all updates, including raw SQL ✅
-- Prisma's @updatedAt still works — it sets the value AND the trigger sets it
-- The trigger wins (BEFORE UPDATE) if both try to set it
```

```sql
-- ── Pattern 2: Audit log trigger ─────────────────────────────────────────
-- prisma/migrations/20250615_add_audit_trigger/migration.sql

-- Create audit log table (if not already a Prisma model)
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  operation   TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id      BIGINT      NOT NULL,
  changed_by  TEXT,
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_table_row_idx ON audit_log(table_name, row_id);

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_table_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(table_name, operation, row_id, changed_by, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    current_setting('app.current_user_id', true),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE row_to_json(OLD)::JSONB END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE row_to_json(NEW)::JSONB END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach to orders table
CREATE TRIGGER orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();
```

```sql
-- ── Pattern 3: Read-optimized view ────────────────────────────────────────
-- prisma/migrations/20250615_add_order_summary_view/migration.sql

CREATE OR REPLACE VIEW order_summary AS
SELECT
  o.id,
  o.status,
  o.total,
  o.created_at,
  c.id        AS customer_id,
  c.name      AS customer_name,
  c.email     AS customer_email,
  COUNT(oi.id)::INT               AS item_count,
  SUM(oi.quantity)::INT           AS total_quantity
FROM orders o
JOIN customers c  ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.id, c.name, c.email;
```

```prisma
// Map the view in schema.prisma (with preview feature):
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["views"]
}

view OrderSummary {
  id            Int      @unique
  status        String
  total         Decimal  @db.Decimal(12, 2)
  createdAt     DateTime @map("created_at") @db.Timestamptz
  customerId    Int      @map("customer_id")
  customerName  String   @map("customer_name")
  customerEmail String   @map("customer_email")
  itemCount     Int      @map("item_count")
  totalQuantity Int      @map("total_quantity")

  @@map("order_summary")
}
```

```sql
-- ── Pattern 4: Row-level security ─────────────────────────────────────────
-- prisma/migrations/20250615_add_rls/migration.sql

-- Enable RLS on the table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own posts
CREATE POLICY posts_user_isolation ON posts
  USING (author_id = current_setting('app.current_user_id')::INT);

-- Policy: admins can see all posts
CREATE POLICY posts_admin_access ON posts
  USING (current_setting('app.current_role', true) = 'admin');
```

```typescript
// Set the session variable before Prisma queries for RLS to work:
await prisma.$executeRaw`SET app.current_user_id = ${userId.toString()}`;
await prisma.$executeRaw`SET app.current_role = ${"user"}`;

// Now all Prisma queries respect the RLS policy ✅
const myPosts = await prisma.post.findMany();
// PostgreSQL automatically filters by author_id = current_setting('app.current_user_id')
```

```sql
-- ── Pattern 5: Partial and expression indexes via migration SQL ───────────
-- prisma/migrations/20250615_add_advanced_indexes/migration.sql

-- Partial index: only active users
CREATE INDEX users_email_active_idx ON users(email)
  WHERE deleted_at IS NULL;

-- Unique partial index: unique email among active users
CREATE UNIQUE INDEX users_email_active_unique ON users(email)
  WHERE deleted_at IS NULL;

-- Expression index: case-insensitive email search
CREATE INDEX users_email_ci_idx ON users(LOWER(email));

-- GIN index for full-text search
CREATE INDEX products_fts_idx ON products
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- BRIN index for time-series data
CREATE INDEX events_created_at_brin ON events
  USING BRIN (created_at) WITH (pages_per_range = 32);
```

---

## W — Why It Matters

- Custom SQL in migrations is tracked in the migration history just like Prisma-generated SQL — it runs on every new environment (`migrate deploy`) in the correct order. This means triggers, views, and functions are consistently reproduced across development, staging, and production without manual steps.
- The `CREATE OR REPLACE` pattern for functions and triggers is important for idempotency — if the migration is accidentally applied twice (or if you need to re-run it for testing), `CREATE OR REPLACE` doesn't fail. Plain `CREATE` would fail with "already exists."
- RLS + session variables via `$executeRaw` is a production security pattern — instead of filtering every query with `WHERE user_id = currentUserId`, you set a session variable once at the start of a request and PostgreSQL enforces the policy at the database level for every query in that session, including raw SQL.

---

## I — Interview Q&A

### Q: How do you add a PostgreSQL trigger to a Prisma-managed database, and how do you ensure it persists across deployments?

**A:** You write the trigger SQL in a Prisma migration file. The process is: (1) run `prisma migrate dev --name add_trigger_name --create-only` to create an empty migration file without applying it; (2) open `prisma/migrations/{timestamp}_add_trigger_name/migration.sql` and write the `CREATE OR REPLACE FUNCTION` and `CREATE TRIGGER` SQL; (3) run `prisma migrate dev` to apply it to the development database; (4) commit both the `schema.prisma` and the migration file to git. From that point, every new environment (staging, production, new developer machines) gets the trigger applied automatically when `prisma migrate deploy` runs, because Prisma applies all unapplied migrations in chronological order. The trigger is tracked in `_prisma_migrations` just like any Prisma-generated migration.

---

## C — Common Pitfalls + Fix

### ❌ Adding a trigger manually in psql — not tracked in migration history

```bash
# ❌ DBA runs this directly in psql on staging:
psql -d staging_db -c "
  CREATE TRIGGER audit_users
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_table_change();
"
# Trigger exists in staging but NOT in:
# - migration files (not tracked)
# - development DB
# - production
# Next prisma migrate deploy on production = trigger missing ❌
```

**Fix:** Always add custom SQL through migration files:

```bash
# ✅ Create a migration file for the trigger
npx prisma migrate dev --name add_audit_trigger_to_users --create-only

# Edit the migration.sql to contain the CREATE TRIGGER SQL
# Apply and commit
npx prisma migrate dev
git add prisma/migrations/
git commit -m "feat: add audit trigger to users table"

# Now: every environment gets the trigger via migrate deploy ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a complete custom SQL migration that implements a soft-delete system for a `Post` model: (1) add a `deleted_at TIMESTAMPTZ` column; (2) create a `soft_delete_post` PostgreSQL function that sets `deleted_at` instead of deleting; (3) create a `restore_post` function that clears `deleted_at`; (4) create a `active_posts` view showing only non-deleted posts; (5) add a partial unique index ensuring slugs are unique among active posts; (6) map the view in Prisma schema; (7) show TypeScript usage for soft-deleting, restoring, and querying through the view.

### Solution

```bash
npx prisma migrate dev --name add_soft_delete_system --create-only
```

```sql
-- prisma/migrations/20250615_add_soft_delete_system/migration.sql

-- (1) Add deleted_at column (Prisma may generate this if added to schema first)
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ DEFAULT NULL;

-- Partial index: slugs unique among active (non-deleted) posts only
CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_active_unique"
  ON "posts" ("slug")
  WHERE "deleted_at" IS NULL;

-- (2) Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_post(post_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET deleted_at = NOW()
  WHERE id = post_id
    AND deleted_at IS NULL;  -- only delete once

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post % not found or already deleted', post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- (3) Restore function
CREATE OR REPLACE FUNCTION restore_post(post_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET deleted_at = NULL
  WHERE id = post_id
    AND deleted_at IS NOT NULL;  -- only restore if deleted

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post % not found or is not deleted', post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- (4) Active posts view
CREATE OR REPLACE VIEW active_posts AS
SELECT
  p.id,
  p.title,
  p.slug,
  p.body,
  p.is_published,
  p.author_id,
  p.category_id,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.deleted_at IS NULL;
```

```prisma
// schema.prisma additions:

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["views"]
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @map("slug")  // unique enforced by partial index in DB
  body        String?
  isPublished Boolean   @default(false) @map("is_published")
  authorId    Int       @map("author_id")
  categoryId  Int?      @map("category_id")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz  // null = active

  author      User     @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@map("posts")
}

// View — read-only, non-deleted posts only
view ActivePost {
  id          Int      @unique
  title       String
  slug        String
  body        String?
  isPublished Boolean  @map("is_published")
  authorId    Int      @map("author_id")
  categoryId  Int?     @map("category_id")
  createdAt   DateTime @map("created_at") @db.Timestamptz
  updatedAt   DateTime @map("updated_at") @db.Timestamptz

  @@map("active_posts")
}
```

```typescript
// TypeScript usage:

// Soft delete a post (via PostgreSQL function)
await prisma.$executeRaw`SELECT soft_delete_post(${postId})`;

// Restore a post
await prisma.$executeRaw`SELECT restore_post(${postId})`;

// Query only active posts (through the view — automatically excludes deleted)
const activePosts = await prisma.activePost.findMany({
  where: { isPublished: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});
// Returns only non-deleted posts ✅ — no WHERE deletedAt: null needed

// Query all posts including deleted (through the model — for admin)
const allPosts = await prisma.post.findMany({
  where: { deletedAt: null }, // explicitly filter if needed
});

const deletedPosts = await prisma.post.findMany({
  where: { deletedAt: { not: null } }, // only deleted
  select: { id: true, title: true, deletedAt: true },
});
```

---

---
