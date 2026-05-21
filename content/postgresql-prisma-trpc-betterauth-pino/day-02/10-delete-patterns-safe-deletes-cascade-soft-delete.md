# 10 — DELETE Patterns — Safe Deletes, Cascade, Soft Delete

---

## T — TL;DR

`DELETE` permanently removes rows. Always use `WHERE`. Use `RETURNING` to log what was deleted. Understand cascade behaviour before deleting parent rows. In many production systems, **soft delete** (setting `is_deleted = true`) is preferred over hard delete — it preserves history, enables recovery, and avoids FK cascade complexity.

---

## K — Key Concepts

```sql
-- ─── Basic DELETE — always with WHERE
DELETE FROM products
WHERE sku = 'P001'
RETURNING id, name, sku;

-- ─── DELETE with multiple conditions
DELETE FROM sessions
WHERE user_id = 1 AND expires_at < now()
RETURNING id;

-- ─── Delete from joined data — using a subquery
-- Delete orders for inactive users
DELETE FROM orders
WHERE customer_id IN (
  SELECT id FROM users WHERE is_active = false
)
RETURNING id, customer_id;

-- ─── DELETE ... USING — PostgreSQL extension (join syntax for DELETE)
DELETE FROM orders o
USING users u
WHERE o.customer_id = u.id
  AND u.is_active = false
RETURNING o.id, u.email;
```

```sql
-- ─── TRUNCATE — fastest way to delete all rows
TRUNCATE TABLE sessions;                       -- delete all rows
TRUNCATE TABLE sessions RESTART IDENTITY;      -- also reset sequence
TRUNCATE TABLE users, orders, order_items;     -- multiple tables at once
TRUNCATE TABLE orders CASCADE;                 -- also truncate dependent tables

-- TRUNCATE vs DELETE
-- TRUNCATE: cannot be rolled back easily in some contexts, doesn't fire row-level triggers,
--           not safe with FKs unless CASCADE, much faster for full table clears
-- DELETE:   respects FKs, fires row triggers, can be filtered with WHERE, RETURNING works
-- Rule: TRUNCATE for full table clear in dev/test; DELETE in production
```

```sql
-- ─── Safe delete workflow
BEGIN;

-- Step 1: Preview what will be deleted
SELECT id, email, username
FROM users
WHERE created_at < '2023-01-01' AND is_active = false;

-- Step 2: Delete with RETURNING for audit
DELETE FROM users
WHERE created_at < '2023-01-01' AND is_active = false
RETURNING id, email, created_at;

-- Step 3: Verify expected row count
-- Step 4:
COMMIT;  -- or ROLLBACK if something looks wrong
```

```sql
-- ─── Soft delete pattern — preferred in production
-- Instead of deleting rows, mark them as deleted

-- Schema change: add deleted_at column
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
-- NULL = not deleted, non-NULL = deleted at that timestamp

-- Soft delete
UPDATE posts
SET deleted_at = now()
WHERE id = 42
RETURNING id, title, deleted_at;

-- All queries filter deleted rows
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Restore a soft-deleted record
UPDATE posts
SET deleted_at = NULL
WHERE id = 42;

-- View deleted records (admin)
SELECT * FROM posts WHERE deleted_at IS NOT NULL;
```

```sql
-- ─── Soft delete with a view — make filtering transparent
CREATE VIEW active_posts AS
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Application queries active_posts — no need to remember the WHERE clause
SELECT * FROM active_posts WHERE author_id = 1;

-- ─── Row-level security (RLS) alternative
-- Can also enforce soft-delete visibility via RLS policies
-- (advanced — covered in security day)
```

```sql
-- ─── Permanent purge with archiving — best of both worlds
-- Step 1: archive to a cold storage table
INSERT INTO posts_deleted (id, author_id, title, body, created_at, deleted_at)
SELECT id, author_id, title, body, created_at, now()
FROM posts
WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '90 days';

-- Step 2: hard delete the archived rows
DELETE FROM posts
WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '90 days';

-- Runs as a scheduled job (pg_cron or application cron)
-- Keeps main table clean, preserves history in archive
```

---

## W — Why It Matters

- Hard deletes with `ON DELETE CASCADE` can propagate through multiple levels — deleting a user can delete orders, order items, invoice lines, shipment records. In financial systems, this is a compliance violation. Soft delete prevents this completely.
- `DELETE ... USING` (PostgreSQL's join-based delete) is cleaner and often faster than `DELETE WHERE id IN (SELECT ...)` for large correlated deletions — the join is computed once, not as a per-row subquery.
- The archive pattern (soft delete for 90 days → move to archive table → hard delete) is standard in GDPR-compliant systems — "right to be forgotten" requests can be processed by purging soft-deleted records while the 90-day grace period preserves recovery capability.

---

## I — Interview Q&A

### Q: What is soft delete and what are its trade-offs?

**A:** Soft delete marks rows as deleted (typically `deleted_at TIMESTAMPTZ`) instead of physically removing them. Benefits: recovery is trivial (set `deleted_at = NULL`), full audit history preserved, avoids FK cascade complications, enables GDPR grace periods. Trade-offs: every query must filter `WHERE deleted_at IS NULL` — easily forgotten, leading to showing "deleted" data. Table grows indefinitely without a purge strategy. Unique constraints behave unexpectedly — a deleted email should be reusable, but the UNIQUE constraint still applies (fix with a partial unique index: `CREATE UNIQUE INDEX ON users(email) WHERE deleted_at IS NULL`). Use soft delete for user-visible records with business history; use hard delete for transient/technical data like sessions and logs.

### Q: What is the difference between DELETE and TRUNCATE?

**A:** `DELETE` removes rows one at a time using the normal MVCC mechanism — it fires row-level triggers, respects FK constraints, writes to WAL log per row, and supports `WHERE`, `RETURNING`, and full transaction rollback. It's slower for full table clears. `TRUNCATE` removes all rows by deallocating data pages — it's much faster, doesn't fire row-level triggers (only truncation triggers), and can cascade to FK-dependent tables with `CASCADE`. Both are transactional and can be rolled back in an explicit `BEGIN...ROLLBACK` block. Use `TRUNCATE` for test database reset and full table clear in ETL; use `DELETE` for any production conditional removal.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to filter soft-deleted rows in queries

```sql
-- ❌ Soft delete implemented but queries don't filter
SELECT * FROM users WHERE email = 'mark@example.com';
-- Returns soft-deleted users too — showing "deleted" account as active ❌
```

**Fix:** Create a view and always query through it:

```sql
-- ✅ All queries use the view
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

SELECT * FROM active_users WHERE email = 'mark@example.com';
-- Only returns non-deleted users ✅
```

### ❌ Soft delete breaks UNIQUE constraints — deleted user's email can't be reused

```sql
-- ❌ User deletes their account. New user tries to register with same email.
UPDATE users SET deleted_at = now() WHERE id = 1;
INSERT INTO users (email, username) VALUES ('mark@example.com', 'mark2');
-- ERROR: duplicate key value violates unique constraint "users_email_key" ❌
-- The deleted user's email is still blocking registration
```

**Fix:** Partial unique index that only covers active (non-deleted) rows:

```sql
-- ✅ Drop the full unique constraint
ALTER TABLE users DROP CONSTRAINT users_email_key;

-- ✅ Partial unique index — only among non-deleted users
CREATE UNIQUE INDEX users_email_active_unique
  ON users (email)
  WHERE deleted_at IS NULL;

-- Now soft-deleted users' emails are reusable ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a soft-delete system for a `posts` table: (1) add `deleted_at TIMESTAMPTZ` column, (2) create an `active_posts` view, (3) soft-delete a post, (4) try to create a new post with the same title (add a partial unique index on title for active posts), (5) implement a purge function that archives posts deleted > 30 days ago and hard-deletes them.

### Solution

```sql
-- (1) Add deleted_at to posts table
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;

-- (2) Create active_posts view
CREATE VIEW active_posts AS
SELECT id, author_id, title, body, created_at
FROM posts
WHERE deleted_at IS NULL;

-- (3) Soft delete a post
UPDATE posts
SET deleted_at = now()
WHERE id = 1
RETURNING id, title, deleted_at;

-- Verify: soft-deleted post not in view
SELECT COUNT(*) FROM active_posts;    -- 0 (if only 1 post)
SELECT COUNT(*) FROM posts;           -- 1 (still physically present)

-- (4) Partial unique index on title for active posts
CREATE UNIQUE INDEX posts_title_active_unique
  ON posts (title)
  WHERE deleted_at IS NULL;

-- Re-insert same title — should succeed (post 1 is soft-deleted)
INSERT INTO posts (author_id, title, body) VALUES (1, 'My Post', 'New content');
-- ✅ Works because the original is soft-deleted

-- (5) Purge: archive then hard delete
CREATE TABLE posts_archive (
  LIKE posts INCLUDING ALL  -- copy structure and constraints
);

-- Nightly job logic
WITH archived AS (
  INSERT INTO posts_archive
  SELECT *
  FROM posts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - INTERVAL '30 days'
  RETURNING id
)
DELETE FROM posts
WHERE id IN (SELECT id FROM archived)
RETURNING id;

-- Verify
SELECT COUNT(*) FROM posts;          -- cleaned up
SELECT COUNT(*) FROM posts_archive;  -- archived records preserved
```

---

## ✅ Day 2 Complete — PostgreSQL Schema Design

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Data Types Deep Dive | ☐ |
| 2 | PRIMARY KEY | ☐ |
| 3 | NOT NULL | ☐ |
| 4 | UNIQUE Constraints | ☐ |
| 5 | CHECK Constraints | ☐ |
| 6 | FOREIGN KEY | ☐ |
| 7 | Normalization Basics | ☐ |
| 8 | INSERT Patterns | ☐ |
| 9 | UPDATE Patterns | ☐ |
| 10 | DELETE Patterns | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
DATA TYPE SELECTION RULES
  Text:      TEXT (default)  VARCHAR(n) only if length IS the rule  CHAR: avoid
  Integer:   INT for most  BIGINT for high-volume PKs  SMALLINT for tiny ranges
  Money:     NUMERIC(12,2) — NEVER float/real (0.1+0.2 ≠ 0.3 in float)
  Datetime:  TIMESTAMPTZ always — stores UTC, converts on read  DATE for date-only
  Boolean:   BOOLEAN NOT NULL DEFAULT false/true
  JSON:      JSONB (indexable, binary) > JSON (text only)
  PK:        BIGINT GENERATED ALWAYS AS IDENTITY (standard)  SERIAL (legacy, ok)
  UUID:      distributed systems, non-sequential IDs, cross-DB merges

CONSTRAINTS
  PRIMARY KEY  = NOT NULL + UNIQUE + auto B-tree index (one per table)
  NOT NULL     = column must always have a value (default is nullable)
  UNIQUE       = no duplicates (NULL is distinct — multiple NULLs allowed)
  CHECK(expr)  = custom boolean validation (no subqueries, no other tables)
  FOREIGN KEY  = value must exist in referenced table (+ index the FK column!)

FOREIGN KEY CASCADE RULES
  ON DELETE RESTRICT   → block parent delete if children exist (default)
  ON DELETE CASCADE    → delete children when parent deleted (order_items)
  ON DELETE SET NULL   → orphan children (author posts survive user delete)
  ON DELETE SET DEFAULT → reassign to fallback owner
  ⚠️ Index every FK column — PostgreSQL does NOT do this automatically

NORMALIZATION
  1NF: atomic values (no lists in cells), rows have a PK
  2NF: non-key cols depend on ENTIRE composite PK (no partial deps)
  3NF: non-key cols depend DIRECTLY on PK (no transitive deps A→B→C)

  Intentional denormalization (OK):
  - Snapshot fields: order_items.unit_price (price at purchase time)
  - Computed caches: user.order_count (avoid JOIN for every read)

INSERT PATTERNS
  Single:  INSERT INTO t (cols) VALUES (...) RETURNING id
  Bulk:    INSERT INTO t (cols) VALUES (...), (...), (...) RETURNING id
  Upsert:  ON CONFLICT (col) DO UPDATE SET col = EXCLUDED.col
  Skip:    ON CONFLICT DO NOTHING
  Select:  INSERT INTO t SELECT ... FROM source WHERE ...
  EXCLUDED = the row that was tried but conflicted

UPDATE PATTERNS
  Always WHERE. Always SELECT first.
  Relative: SET col = col * 1.1
  Batch:    UPDATE t SET col = v.val FROM (VALUES ...) AS v WHERE t.key = v.key
  Safe:     BEGIN → SELECT → UPDATE RETURNING → review → COMMIT/ROLLBACK

DELETE PATTERNS
  Always WHERE. Never bare DELETE FROM table;
  Hard delete:  DELETE FROM t WHERE condition RETURNING *
  Join-delete:  DELETE FROM t USING other WHERE t.fk = other.id AND ...
  Soft delete:  UPDATE t SET deleted_at = now() WHERE id = x
  View:         CREATE VIEW active_t AS SELECT * FROM t WHERE deleted_at IS NULL
  Partial UNIQUE for soft-deleted: CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL
  Purge cycle:  archive after grace period → hard delete archived rows

CONSTRAINT MANAGEMENT
  Named constraints: CONSTRAINT name CHECK(...)  → needed for DROP
  Add to existing:   ALTER TABLE t ADD CONSTRAINT name CHECK(...)
  Large tables:      ADD CONSTRAINT ... NOT VALID  then  VALIDATE CONSTRAINT
  Drop:              ALTER TABLE t DROP CONSTRAINT name
  FK index:          CREATE INDEX idx_t_fk ON t(fk_column)  ← ALWAYS

NULL RULES
  NULL = unknown — propagates through all operations
  NULL + 1 = NULL   NULL || 'text' = NULL   NULL = NULL = NULL (not TRUE)
  WHERE col = NULL → returns 0 rows (always) — use IS NULL
  COALESCE(a, b, c) → first non-NULL value
  NOT IN (..., NULL) → returns 0 rows (NULL poisons IN list) — use NOT EXISTS
```

> **Your next action:** Pick any existing table in your project (or create a fresh one). Run `\d tablename` in psql and audit it: are all columns `NOT NULL` that should be? Do all foreign keys have indexes? Is the data type for any
