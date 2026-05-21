# 9 — Bulk Write Patterns — COPY, Batch Inserts, Upserts at Scale

---

## T — TL;DR

Inserting or updating millions of rows one at a time is orders of magnitude slower than bulk operations. `COPY` is the fastest data loading mechanism in PostgreSQL. Multi-row `INSERT` with `VALUES` batches reduces round trips. `ON CONFLICT` enables idempotent upserts at scale. Staging table patterns (`INSERT → COPY → MERGE`) handle complex bulk operations safely.

---

## K — Key Concepts

```sql
-- ─── Multi-row INSERT — always better than one-at-a-time
-- ❌ 1,000 individual inserts = 1,000 round trips, 1,000 parse+plan cycles
INSERT INTO products (sku, name, price) VALUES ('A001', 'Item 1', 9.99);
INSERT INTO products (sku, name, price) VALUES ('A002', 'Item 2', 19.99);
-- ...

-- ✅ One INSERT with multiple VALUES tuples = 1 round trip
INSERT INTO products (sku, name, price)
VALUES
  ('A001', 'Item 1',  9.99),
  ('A002', 'Item 2', 19.99),
  ('A003', 'Item 3', 29.99)
  -- ... up to ~1,000 rows per statement (diminishing returns beyond that)
ON CONFLICT (sku) DO NOTHING;  -- safe to re-run ✅
```

```sql
-- ─── COPY — fastest bulk load (bypasses row-level checks partially)
-- COPY FROM: load data from a file or stdin
-- COPY TO:   export data to a file or stdout

-- Load from CSV file (server-side file path — server must have access)
COPY products (sku, name, price, stock_count)
FROM '/tmp/products.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- Load from stdin (client-side — works with psql)
COPY products (sku, name, price)
FROM STDIN WITH (FORMAT csv);
A001,Item 1,9.99
A002,Item 2,19.99
\.   -- end of data marker

-- Export to CSV
COPY (SELECT id, sku, name, price FROM products WHERE is_available = true)
TO '/tmp/available_products.csv'
WITH (FORMAT csv, HEADER true);

-- ─── \copy — client-side COPY (works without superuser, uses local file)
\copy products (sku, name, price) FROM '/local/path/products.csv' CSV HEADER
\copy (SELECT * FROM products) TO '/local/export.csv' CSV HEADER
```

```sql
-- ─── COPY vs INSERT performance
-- COPY:   ~100,000–500,000 rows/second (bypasses some overhead)
-- INSERT (multi-row, batch of 1000): ~10,000–50,000 rows/second
-- INSERT (individual): ~1,000–5,000 rows/second
-- Rule: COPY for initial loads and large imports; INSERT for application writes

-- ─── COPY performance tips
-- 1. Disable indexes during load, rebuild after
ALTER INDEX idx_products_sku RENAME TO idx_products_sku_disabled;
-- (or use pg_index to mark invalid)
COPY products FROM '/tmp/big_file.csv' CSV HEADER;
ALTER INDEX idx_products_sku_disabled RENAME TO idx_products_sku;

-- 2. Wrap in a transaction
BEGIN;
COPY products FROM '/tmp/products.csv' CSV HEADER;
COMMIT;

-- 3. Set work_mem for sorting during index rebuild
SET maintenance_work_mem = '512MB';
REINDEX TABLE products;
```

```sql
-- ─── Staging table pattern — for complex bulk upserts
-- Step 1: load raw data into a staging table (no indexes, no FKs)
CREATE TEMP TABLE products_staging (
  LIKE products INCLUDING DEFAULTS   -- same structure, no constraints
) ON COMMIT DROP;   -- auto-dropped after transaction

-- Step 2: bulk load into staging (fast — no constraint checks)
COPY products_staging (sku, name, price, stock_count)
FROM '/tmp/products_update.csv' CSV HEADER;

-- Step 3: validate staging data
SELECT COUNT(*) FROM products_staging WHERE price < 0;  -- sanity check
SELECT COUNT(*) FROM products_staging;

-- Step 4: upsert from staging to production
INSERT INTO products (sku, name, price, stock_count)
SELECT sku, name, price, stock_count FROM products_staging
ON CONFLICT (sku)
  DO UPDATE SET
    name        = EXCLUDED.name,
    price       = EXCLUDED.price,
    stock_count = EXCLUDED.stock_count
;

-- Step 5: COMMIT — temp table dropped automatically
```

```sql
-- ─── Bulk UPDATE from staging table
-- Update prices from a data feed

CREATE TEMP TABLE price_feed (sku TEXT, new_price NUMERIC(10,2)) ON COMMIT DROP;

COPY price_feed FROM STDIN CSV;
A001,89.99
A002,34.99
A003,64.99
\.

BEGIN;

UPDATE products AS p
SET
  price      = f.new_price,
  updated_at = now()
FROM price_feed AS f
WHERE p.sku = f.sku
RETURNING p.sku, p.price;

-- Verify row count before committing
-- If count looks right:
COMMIT;
```

```sql
-- ─── Bulk upsert performance tuning
-- 1. Wrap in a single transaction (amortises WAL overhead)
-- 2. Disable autovacuum during bulk write (re-enable after)
ALTER TABLE products DISABLE TRIGGER ALL;  -- also disables triggers (careful with FKs)
-- ... bulk write ...
ALTER TABLE products ENABLE TRIGGER ALL;

-- 3. Increase wal_buffers and synchronous_commit for bulk loads
SET synchronous_commit = OFF;   -- async commit — faster, tiny risk of last-transaction loss
-- Only for non-critical imports; always ON for financial/transactional data

-- 4. Use UNLOGGED tables for staging (no WAL = much faster writes, but lost on crash)
CREATE UNLOGGED TABLE products_staging (...);
-- Fine for staging tables that are rebuilt from source data

-- ─── Batch size tuning
-- INSERT with 100–1000 rows per statement is typically optimal
-- Beyond ~5000 rows per statement: diminishing returns, memory pressure
-- Profile your specific schema: a wide row (many columns) benefits from smaller batches
```

```sql
-- ─── Measuring bulk write throughput
-- Use EXPLAIN ANALYZE on a sample INSERT:
EXPLAIN ANALYZE
INSERT INTO products (sku, name, price)
SELECT 'SKU-' || g, 'Product ' || g, (random() * 100)::NUMERIC(10,2)
FROM generate_series(1, 10000) AS g
ON CONFLICT (sku) DO NOTHING;

-- generate_series: built-in set-returning function — great for test data
SELECT * FROM generate_series(1, 5) AS n;
-- 1, 2, 3, 4, 5

-- Generate test orders:
INSERT INTO orders (customer_id, status, total)
SELECT
  (random() * 4 + 1)::INT,
  (ARRAY['pending','delivered','cancelled'])[ceil(random() * 3)],
  (random() * 500 + 5)::NUMERIC(10,2)
FROM generate_series(1, 10000);
```

---

## W — Why It Matters

- `COPY` is 10–100x faster than individual `INSERT` statements for loading data — it's the reason ETL jobs that take an hour with INSERTs take minutes with COPY. Knowing `COPY` vs `\copy` (server-side vs client-side) is an operational skill every backend developer needs.
- The staging table pattern is the production-safe way to do bulk upserts — load into an unvalidated temp table, verify the data, then atomically merge into the production table. If the verification fails, you drop the staging table; production is untouched.
- `synchronous_commit = OFF` is a targeted performance lever for bulk imports where losing the last transaction on a crash is acceptable — e.g. a product catalog sync that can simply re-run. Never use it for financial transactions.

---

## I — Interview Q&A

### Q: What is the difference between `COPY` and `INSERT` and when would you use each?

**A:** Both load data into a table, but they differ in mechanism and performance. `INSERT` is a standard SQL statement — it parses the query, plans it, acquires locks, checks all constraints, fires triggers, and writes to WAL for each batch. `COPY` is a PostgreSQL-specific bulk load command — it uses a more efficient binary protocol, skips the SQL parser, and processes data in large streaming batches. `COPY` is 10–100x faster for loading large files. Use `COPY` for initial data loads, migrations, importing CSV/TSV data, and ETL jobs. Use `INSERT` for application writes, small batches, and when you need `ON CONFLICT` logic (though `COPY` can be combined with a staging table + `INSERT ... ON CONFLICT`).

### Q: How does the staging table pattern work for bulk upserts?

**A:** Load raw data into an `UNLOGGED` or `TEMP` table first — it has no indexes, no FK constraints, and no triggers, so loading is very fast. Run validation queries on the staging table to catch bad data before it touches production. Then use `INSERT INTO production SELECT FROM staging ON CONFLICT DO UPDATE` to atomically merge the staging data into production. The whole merge can be wrapped in `BEGIN ... COMMIT` for atomicity. If validation fails, `ROLLBACK` or simply drop the temp table — production is never touched. This pattern is safer and faster than trying to upsert directly from a file into a constrained production table.

---

## C — Common Pitfalls + Fix

### ❌ COPY without a transaction — partial load on failure

```sql
-- ❌ COPY fails halfway through a 1M-row file
COPY products FROM '/tmp/products.csv' CSV HEADER;
-- 500,000 rows inserted before error — half the data in, half missing ❌
```

**Fix:** Always wrap `COPY` in an explicit transaction:

```sql
-- ✅ All or nothing
BEGIN;
COPY products FROM '/tmp/products.csv' CSV HEADER;
-- validate:
SELECT COUNT(*) FROM products;
COMMIT;  -- or ROLLBACK if count is wrong
```

### ❌ Disabling `synchronous_commit` globally — data loss on crash for all transactions

```sql
-- ❌ Disabling globally affects all connections including financial writes
ALTER SYSTEM SET synchronous_commit = OFF;
-- A crash could lose the last few transactions of any type ❌
```

**Fix:** Set it only for the current session or specific bulk operations:

```sql
-- ✅ Only for this session, this bulk job
BEGIN;
SET LOCAL synchronous_commit = OFF;  -- affects only this transaction
COPY products_import FROM '/tmp/catalog.csv' CSV HEADER;
COMMIT;
-- After COMMIT, synchronous_commit reverts to default ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete bulk product catalog sync: (1) create an `UNLOGGED` staging table with the same structure as `products`; (2) use `generate_series` to simulate loading 1,000 rows into staging; (3) run a validation check (no negative prices); (4) upsert from staging to products using `ON CONFLICT`; (5) log a summary of rows inserted vs updated; (6) clean up staging. Wrap everything in a single transaction.

### Solution

```sql
BEGIN;

-- (1) Unlogged staging table
CREATE UNLOGGED TABLE products_sync_staging (
  sku         TEXT           NOT NULL,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL,
  stock_count INT            NOT NULL DEFAULT 0,
  category    TEXT           NOT NULL DEFAULT 'General'
);

-- (2) Simulate bulk load with generate_series
INSERT INTO products_sync_staging (sku, name, price, stock_count, category)
SELECT
  'SYNC-' || LPAD(g::TEXT, 4, '0'),
  'Product ' || g,
  ROUND((random() * 200 + 1)::NUMERIC, 2),
  (random() * 100)::INT,
  (ARRAY['Electronics', 'Stationery', 'Accessories'])[ceil(random() * 3)]
FROM generate_series(1, 1000) AS g;

-- (3) Validation — abort if any invalid rows
DO $$
DECLARE invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM products_sync_staging
  WHERE price <= 0 OR sku IS NULL OR name IS NULL;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Staging validation failed: % invalid rows', invalid_count;
  END IF;
END $$;

-- (4) Upsert from staging to products
-- First, ensure products table has the category and stock_count columns:
-- (Assume they exist from Day 2 schema or add them:)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count INT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';

WITH upsert_result AS (
  INSERT INTO products (sku, name, price, stock_count, category)
  SELECT sku, name, price, stock_count, category
  FROM products_sync_staging
  ON CONFLICT (sku)
    DO UPDATE SET
      name        = EXCLUDED.name,
      price       = EXCLUDED.price,
      stock_count = EXCLUDED.stock_count,
      category    = EXCLUDED.category
  RETURNING
    xmax = 0 AS is_insert   -- xmax = 0 means it was an INSERT (not UPDATE)
)
-- (5) Log summary
SELECT
  COUNT(*) FILTER (WHERE is_insert)      AS rows_inserted,
  COUNT(*) FILTER (WHERE NOT is_insert)  AS rows_updated,
  COUNT(*)                               AS rows_total
FROM upsert_result;

-- rows_inserted | rows_updated | rows_total
-- -------------+--------------+------------
-- (depends on how many SKUs already existed in products)

-- (6) Clean up staging
DROP TABLE products_sync_staging;

COMMIT;

-- Verify
SELECT COUNT(*), MIN(price), MAX(price) FROM products WHERE sku LIKE 'SYNC-%';
```

---

## ✅ Day 4 Complete — PostgreSQL Reliability and Performance

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Transactions — BEGIN, COMMIT, ROLLBACK, SAVEPOINT | ☐ |
| 2 | Isolation Levels and Concurrency Anomalies | ☐ |
| 3 | Row-Level Locking — FOR UPDATE, SKIP LOCKED | ☐ |
| 4 | Indexes Deep Dive — B-tree, Selectivity, When Not Used | ☐ |
| 5 | Index Types — Partial, Composite, Expression, GIN, BRIN | ☐ |
| 6 | EXPLAIN and EXPLAIN ANALYZE | ☐ |
| 7 | Query Optimization Anti-Patterns | ☐ |
| 8 | Pagination — OFFSET vs Cursor-Based | ☐ |
| 9 | Bulk Write Patterns — COPY, Staging, Upserts | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
TRANSACTIONS
  BEGIN → COMMIT      atomic: all succeed or all rollback
  BEGIN → ROLLBACK    undo everything since BEGIN
  SAVEPOINT name      partial rollback point inside a transaction
  ROLLBACK TO name    undo since savepoint (transaction stays open)
  DDL is transactional in PostgreSQL (ALTER TABLE, CREATE TABLE)
  Keep transactions SHORT: no external I/O, no user input inside
  Long tx = locks held + VACUUM blocked + table bloat

ISOLATION LEVELS
  READ COMMITTED (default): snapshot per statement — non-repeatable reads possible
  REPEATABLE READ:           snapshot per transaction — consistent across queries
  SERIALIZABLE:              full serializability — may abort (retry on 40001)
  MVCC: readers never block writers, writers never block readers
  Lost update fix: atomic UPDATE (SET col = col - 1), FOR UPDATE, or SERIALIZABLE

LOCKING
  SELECT FOR UPDATE          exclusive row lock — blocks other writers and FOR UPDATE
  SELECT FOR SHARE           shared row lock — blocks writers, allows other FOR SHARE
  SELECT FOR UPDATE NOWAIT   fail immediately if locked (catch SQLSTATE 55P03)
  SELECT FOR UPDATE SKIP LOCKED  skip locked rows — job queue pattern ✅
  Deadlock: always lock rows in consistent order (ORDER BY id)
  PostgreSQL auto-detects deadlocks and kills one transaction (must retry)

INDEXES
  B-tree (default): equality, range, ORDER BY on comparable values
  Created automatically for: PRIMARY KEY, UNIQUE constraints
  Index used when: high selectivity (< ~10% rows match)
  Index skipped when: function on column, type mismatch, leading LIKE wildcard, low selectivity
  Always index: FK columns, frequent WHERE/JOIN/ORDER BY columns
  Check usage: pg_stat_user_indexes (idx_scan = 0 → unused → remove)

INDEX TYPES
  Partial:    WHERE status = 'pending' — smaller, faster, less write overhead
  Composite:  (a, b, c) — leftmost prefix rule (a only, a+b, a+b+c — not b alone)
  Expression: LOWER(email), DATE_TRUNC('month', ts) — index the expression, not the column
  INCLUDE:    covering index — extra columns in index leaf (Index Only Scan)
  GIN:        arrays, JSONB @>, ?, full-text @@, ILIKE with pg_trgm
  BRIN:       sequential data (timestamps, serial IDs) — tiny index, range scan only
  Hash:       equality only — rarely beats B-tree (avoid in general)

EXPLAIN
  EXPLAIN:         show plan, estimates only, no execution
  EXPLAIN ANALYZE: execute + show actual timing and rows
  EXPLAIN (ANALYZE, BUFFERS): add cache hit/miss stats
  Nodes: Seq Scan, Index Scan, Index Only Scan, Bitmap Index Scan
         Nested Loop, Hash Join, Merge Join, Sort, Hash Aggregate, Limit
  Red flags:
    Seq Scan on large table         → add index
    rows estimate vs actual mismatch → ANALYZE table
    Sort node on large result        → add ORDER BY index
    Hash Batches > 1                 → increase work_mem
    Nested Loop over large outer set → force Hash Join

QUERY ANTI-PATTERNS
  N+1:        loop fetch parent then child per row → JOIN once
  SELECT *:   over-fetching, breaks Index Only Scan
  Type mismatch: WHERE bigint_col = '1' → cast literal, not column
  Correlated SELECT subquery: O(n²) → LEFT JOIN + GROUP BY
  NOT IN with nullable subquery → use NOT EXISTS
  LIKE '%x%': leading % breaks B-tree → GIN + pg_trgm
  COALESCE(column, val) in WHERE → restructure condition
  Unbounded query: no LIMIT on large table → always paginate

PAGINATION
  OFFSET:        simple, O(offset) — slow at depth, unstable on insert
  Cursor-based:  WHERE (sort_col, id) < (cursor) — O(log n), stable
  Always add secondary sort (id) for stable cursor when primary sort is non-unique
  Index must match ORDER BY columns exactly
  API pattern: return nextCursor as opaque base64 JSON

BULK WRITES
  Multi-row INSERT:  VALUES (...),(...),(...) — 1 round trip per 1000 rows
  COPY FROM:         fastest load — server-side file or stdin
  \copy:             client-side COPY (no superuser needed)
  Staging table:     TEMP/UNLOGGED → validate → INSERT ... ON CONFLICT
  Transaction wrap:  always wrap COPY in BEGIN/COMMIT
  synchronous_commit OFF: bulk-load performance, set LOCAL only
  UNLOGGED tables:   no WAL = fast writes, lost on crash (staging only)
  generate_series:   generate test data without external files
  Batch size:        100–1000 rows per INSERT statement (sweet spot)
```

> **Your next action:** Find any query in your project (or write a test query on your Day 3 schema). Run `EXPLAIN ANALYZE` on it. Look at one thing: is it a `Seq Scan` on
