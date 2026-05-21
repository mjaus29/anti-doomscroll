# 5 — Index Types — Partial, Composite, Expression, GIN, BRIN

---

## T — TL;DR

PostgreSQL has six built-in index types. B-tree handles equality and ranges (the default). **Partial indexes** cover a subset of rows. **Composite indexes** cover multiple columns with a specific column order rule. **Expression indexes** index computed values. **GIN** indexes arrays, JSONB, and full-text search. **BRIN** indexes physically sequential data (timestamps, serial IDs) with tiny storage.

---

## K — Key Concepts

```sql
-- ─── Partial Index — index only rows matching a condition
-- Smaller, faster, and only maintained for the relevant rows

-- Only index pending jobs (the ones workers actually query)
CREATE INDEX idx_jobs_pending ON job_queue(scheduled_at)
  WHERE status = 'pending';
-- Workers query: WHERE status = 'pending' AND scheduled_at <= now()
-- Index is tiny (only pending rows) — fast to scan and build ✅

-- Unique partial index: unique email only among active users
CREATE UNIQUE INDEX idx_users_email_active
  ON users(email)
  WHERE deleted_at IS NULL;
-- Deleted users' emails can be reused ✅

-- Partial index for non-null column (avoids indexing the common NULL case)
CREATE INDEX idx_orders_completed
  ON orders(processed_at DESC)
  WHERE processed_at IS NOT NULL;
-- Don't index the many rows where processed_at IS NULL
```

```sql
-- ─── Composite Index — index on multiple columns
-- Column ORDER matters: the index is usable left-to-right

CREATE INDEX idx_orders_cust_status ON orders(customer_id, status);

-- Uses the index:
WHERE customer_id = 1                            -- ✅ leading column
WHERE customer_id = 1 AND status = 'delivered'   -- ✅ both columns
WHERE customer_id = 1 ORDER BY status            -- ✅ leading column + sort

-- Does NOT use the index efficiently:
WHERE status = 'delivered'                       -- ❌ non-leading column alone
-- (PostgreSQL may still use it via bitmap scan, but it's not optimal)

-- ─── Covering index — add non-filter columns to support Index Only Scan
CREATE INDEX idx_orders_covering
  ON orders(customer_id, status)
  INCLUDE (total, ordered_at);
-- SELECT customer_id, status, total, ordered_at WHERE customer_id = 1
-- → Index Only Scan — total and ordered_at in index, no heap fetch ✅
-- INCLUDE: in the index but not part of the search key (B-tree v11+)
```

```sql
-- ─── Expression Index — index on a computed expression
-- The index stores the expression result — queries using the same expression hit the index

-- Case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'mark@example.com';  -- uses index ✅

-- Computed date truncation
CREATE INDEX idx_orders_month ON orders(DATE_TRUNC('month', ordered_at));
SELECT * FROM orders WHERE DATE_TRUNC('month', ordered_at) = '2025-06-01';  -- ✅

-- Extracted JSON field
CREATE INDEX idx_users_preferences_theme
  ON users((preferences->>'theme'));  -- double parens for expression
SELECT * FROM users WHERE preferences->>'theme' = 'dark';  -- ✅
```

```sql
-- ─── GIN Index — for multi-valued types (arrays, JSONB, full-text)
-- GIN = Generalized Inverted Index: maps each element to the rows containing it

-- JSONB queries
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);
SELECT * FROM products WHERE metadata @> '{"color": "red"}';   -- uses GIN ✅
SELECT * FROM products WHERE metadata ? 'warranty';            -- key exists ✅

-- Array queries
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql'];  -- uses GIN ✅
SELECT * FROM posts WHERE 'postgresql' = ANY(tags);     -- uses GIN ✅

-- Full-text search
ALTER TABLE products ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || COALESCE(description, ''))) STORED;
CREATE INDEX idx_products_fts ON products USING GIN(search_vector);
SELECT * FROM products WHERE search_vector @@ to_tsquery('english', 'keyboard & mechanical');

-- pg_trgm — fuzzy/LIKE search with GIN
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%keyboard%';   -- now uses GIN ✅
SELECT * FROM products WHERE name % 'keyborad';         -- fuzzy match ✅
```

```sql
-- ─── BRIN Index — Block Range Index for naturally ordered data
-- Stores min/max per range of data pages (not per row)
-- Tiny size (kilobytes vs megabytes for B-tree) but only useful for sequential data

-- Perfect for: append-only log tables, time-series, auto-increment IDs
CREATE INDEX idx_events_created_brin ON events USING BRIN(created_at);
-- Range query on sequential timestamps → tiny index, fast scan ✅
SELECT * FROM events WHERE created_at BETWEEN '2025-06-01' AND '2025-06-30';

-- BRIN index: pages_per_range parameter
CREATE INDEX idx_events_brin ON events USING BRIN(created_at) WITH (pages_per_range = 32);

-- When NOT to use BRIN:
-- Random data (UUIDs, random emails) — no physical ordering → BRIN is useless
-- Point lookups (WHERE id = 42) — B-tree is faster

-- Summary: index type selection
-- B-tree (default): equality, range, ORDER BY on any comparable type
-- Partial B-tree:   subset of rows (high-cardinality filter column)
-- Composite:        multiple filter/sort columns together
-- Expression:       computed values in WHERE (LOWER, DATE_TRUNC, JSON extract)
-- GIN:              arrays, JSONB containment, full-text, LIKE with pg_trgm
-- BRIN:             sequential/time-series data, huge tables, memory-efficient
-- Hash:             equality only (rarely beats B-tree, avoid in general)
```

---

## W — Why It Matters

- Partial indexes are often 10–100x smaller than full table indexes — a `WHERE status = 'pending'` index on a job queue covers 0.1% of rows if 99.9% are completed. Smaller index = faster scans, less memory, faster writes.
- GIN on JSONB is what makes schema-flexible JSON queries fast — without a GIN index, `WHERE metadata @> '{"color": "red"}'` is a full table scan. With GIN, it's a fast inverted index lookup.
- The composite index column order rule (left-to-right prefix) is one of the most frequently misunderstood index rules — `INDEX ON (a, b)` helps queries filtering on `a` or on `(a, b)` but not on `b` alone. Getting this order wrong means the index exists but isn't used.

---

## I — Interview Q&A

### Q: In a composite index `(a, b, c)`, which query patterns can use the index?

**A:** B-tree composite indexes follow the "leftmost prefix" rule — the index is usable by any query that filters on a leftmost contiguous prefix of the indexed columns. For `INDEX ON (a, b, c)`: filtering on `a` alone uses the index. Filtering on `a, b` uses the index. Filtering on `a, b, c` uses the index fully. Filtering on `b` alone or `c` alone does not efficiently use the index (PostgreSQL may use a bitmap scan but B-tree prefix is not leveraged). Filtering on `a, c` (skipping `b`) uses the index for the `a` predicate but not for `c`. The key principle: design composite indexes with your most selective or most frequently filtered column first, followed by sort columns.

---

## C — Common Pitfalls + Fix

### ❌ Creating a composite index with columns in the wrong order

```sql
-- ❌ Queries filter by status first (low selectivity) then customer_id
CREATE INDEX idx_wrong ON orders(status, customer_id);
-- WHERE customer_id = 1 → doesn't use index efficiently (non-leading column)
-- WHERE status = 'pending' → uses index, but low selectivity anyway
```

**Fix:** Put the higher-selectivity or leading-filter column first:

```sql
-- ✅ customer_id first (high selectivity — one customer among millions)
CREATE INDEX idx_correct ON orders(customer_id, status);
-- WHERE customer_id = 1 → uses index ✅
-- WHERE customer_id = 1 AND status = 'pending' → uses both columns ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design indexes for a `notifications` table: `id`, `user_id`, `type` (email/push/sms), `status` (pending/sent/failed), `payload JSONB`, `created_at`, `sent_at`. Create: (1) a partial index for unprocessed notifications, (2) a composite index for fetching a user's recent notifications, (3) a GIN index for querying JSONB payload, (4) an expression index for extracting `payload->>'template_id'`. Write a query that uses each.

### Solution

```sql
-- ─── Schema
CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('email', 'push', 'sms')),
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed')),
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ
);

-- (1) Partial index: only pending notifications (what workers process)
CREATE INDEX idx_notif_pending
  ON notifications(created_at ASC)
  WHERE status = 'pending';
-- Used by: SELECT ... WHERE status = 'pending' ORDER BY created_at LIMIT 10

-- (2) Composite: user's recent notifications for the inbox page
CREATE INDEX idx_notif_user_recent
  ON notifications(user_id, created_at DESC);
-- Used by: WHERE user_id = 1 ORDER BY created_at DESC LIMIT 20

-- (3) GIN: query inside JSONB payload
CREATE INDEX idx_notif_payload_gin ON notifications USING GIN(payload);
-- Used by: WHERE payload @> '{"campaign_id": "abc123"}'

-- (4) Expression index: extract specific JSON key for equality
CREATE INDEX idx_notif_template
  ON notifications((payload->>'template_id'));
-- Used by: WHERE payload->>'template_id' = 'welcome_email'

-- ─── Queries that use each index
-- (1) Worker claiming pending notifications
EXPLAIN SELECT id, user_id, type, payload
FROM notifications
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
-- → Index Scan using idx_notif_pending ✅

-- (2) User inbox
EXPLAIN SELECT id, type, status, created_at
FROM notifications
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;
-- → Index Scan using idx_notif_user_recent ✅

-- (3) JSONB containment
EXPLAIN SELECT * FROM notifications
WHERE payload @> '{"campaign_id": "summer2025"}';
-- → Bitmap Index Scan using idx_notif_payload_gin ✅

-- (4) JSON key extraction
EXPLAIN SELECT * FROM notifications
WHERE payload->>'template_id' = 'welcome_email';
-- → Index Scan using idx_notif_template ✅
```

---

---
