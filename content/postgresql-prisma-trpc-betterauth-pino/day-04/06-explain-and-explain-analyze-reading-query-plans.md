# 6 — EXPLAIN and EXPLAIN ANALYZE — Reading Query Plans

---

## T — TL;DR

`EXPLAIN` shows the query plan PostgreSQL will use — without running the query. `EXPLAIN ANALYZE` runs the query and shows actual timing and row counts alongside estimates. Learning to read query plans is the single most important skill for diagnosing slow queries. Look for: sequential scans on large tables, high estimated vs actual row count mismatches, nested loop joins on large sets, and large sort operations.

---

## K — Key Concepts

```sql
-- ─── EXPLAIN — show plan without executing
EXPLAIN SELECT * FROM orders WHERE customer_id = 1;
--                         QUERY PLAN
-- ----------------------------------------------------------
-- Index Scan using idx_orders_customer_id on orders
--   (cost=0.29..8.31 rows=2 width=64)
--   Index Cond: (customer_id = 1)

-- Reading EXPLAIN output:
-- Node type:    Index Scan, Seq Scan, Hash Join, Nested Loop, Sort, ...
-- cost=0.29..8.31
--   0.29 = startup cost (time before first row returned)
--   8.31 = total cost (time to return all rows)
--   Cost is in arbitrary units, proportional to page reads
-- rows=2:       estimated number of rows this node returns
-- width=64:     estimated average row size in bytes
```

```sql
-- ─── EXPLAIN ANALYZE — run the query, show actual vs estimated
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 1;
-- Index Scan using idx_orders_customer_id on orders
--   (cost=0.29..8.31 rows=2 width=64)
--   (actual time=0.052..0.056 rows=2 loops=1)
--   Index Cond: (customer_id = 1)
-- Planning Time: 0.2 ms
-- Execution Time: 0.1 ms

-- New fields with ANALYZE:
-- actual time=0.052..0.056:  actual startup..total time in ms
-- rows=2:                    actual rows returned
-- loops=1:                   how many times this node was executed

-- ⚠️ EXPLAIN ANALYZE actually runs the query — use ROLLBACK for write queries:
BEGIN;
EXPLAIN ANALYZE UPDATE orders SET total = total * 1.1 WHERE status = 'pending';
ROLLBACK;
```

```sql
-- ─── EXPLAIN options — more detail
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM orders WHERE status = 'delivered';
-- BUFFERS: shows shared_hit (pages from cache) vs shared_read (pages from disk)
--          high shared_read = I/O bound (consider more shared_buffers or index)
--          high shared_hit  = data in cache (good)

EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM orders;
-- JSON format: machine-readable, useful for pg_badger, explain.depesz.com

-- ─── Online plan visualizers
-- https://explain.depesz.com — paste EXPLAIN ANALYZE output
-- https://explain.dalibo.com — visual tree with color-coded slow nodes
```

```sql
-- ─── Common plan nodes and what they mean
-- Seq Scan:          reads every row — fine for small tables or high-selectivity filters
-- Index Scan:        uses B-tree index, fetches rows one by one from heap
-- Index Only Scan:   all data from index (no heap fetch) — fastest
-- Bitmap Index Scan: collects page locations from index, batch-fetches from heap
-- Nested Loop:       for each row in outer, scan inner — good for small inner sets
-- Hash Join:         builds hash table from smaller set, probes with larger — good for large sets
-- Merge Join:        both sides sorted, merge — good when both sides already sorted
-- Sort:              explicit sort (appears when ORDER BY has no index)
-- Hash Aggregate:    GROUP BY using a hash table
-- Limit:             stops after N rows
```

```sql
-- ─── Red flags to look for in EXPLAIN output

-- 1. Seq Scan on a large table (rows > 10,000)
-- Seq Scan on orders (cost=0.00..85000.00 rows=5000000 width=64)
-- Fix: add an index on the WHERE column

-- 2. Estimated rows vs actual rows wildly off
-- (cost=... rows=1 ...) (actual ... rows=50000 ...)
-- Fix: run ANALYZE to update statistics
ANALYZE orders;

-- 3. Nested Loop over large sets
-- Nested Loop (cost=... rows=1000000)
--   → Seq Scan on orders (rows=1000)
--   → Seq Scan on order_items (rows=1000 per outer row)  ← 1M total reads
-- Fix: add indexes, or hint the planner with SET enable_nestloop = off

-- 4. Hash Join with large work_mem usage
-- Hash Batches: 8 (original 1)  ← spilled to disk
-- Fix: increase work_mem for the session
SET work_mem = '64MB';

-- 5. Sort without index
-- Sort (cost=10000.. rows=100000)
--   Sort Key: ordered_at DESC
-- Fix: CREATE INDEX ON orders(ordered_at DESC)
```

```sql
-- ─── ANALYZE — update planner statistics
ANALYZE orders;       -- update stats for one table
ANALYZE;              -- update stats for entire database (runs autovacuum-like)

-- Planner uses statistics to estimate rows:
-- pg_stats view: per-column null fraction, n_distinct, histogram bounds
SELECT tablename, attname, n_distinct, null_frac, correlation
FROM pg_stats
WHERE tablename = 'orders';

-- correlation: 1.0 = physically sorted (BRIN works great), 0.0 = random
-- For index scan: correlation matters — random data has more random I/O
```

---

## W — Why It Matters

- `EXPLAIN ANALYZE` is the ground truth for query performance — every optimization decision should be based on the actual plan, not assumptions. Developers who don't use `EXPLAIN` are guessing; developers who use it are engineering.
- Estimated vs actual rows mismatch is the root cause of most bad query plans — the planner chooses joins, scan methods, and join order based on row estimates. If estimates are wrong (stale statistics), the plan is wrong. `ANALYZE` fixes this.
- Reading buffer statistics (`BUFFERS` option) distinguishes I/O-bound queries (data not in cache) from CPU-bound ones — the fix is different. I/O-bound: add indexes or more RAM. CPU-bound: simplify the query.

---

## I — Interview Q&A

### Q: What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?

**A:** `EXPLAIN` shows the query plan the planner chose — the estimated costs, rows, and operations — without executing the query. It's safe to run on any query including writes. `EXPLAIN ANALYZE` actually executes the query and shows both the estimated values and the actual timing and row counts. The key value of `ANALYZE` is comparing estimates to actuals — when `rows=1` (estimate) but `actual rows=50000`, the planner was wrong about selectivity and likely chose a suboptimal plan. Wrap write queries in `BEGIN; EXPLAIN ANALYZE UPDATE...; ROLLBACK;` to see the plan without committing the change.

---

## C — Common Pitfalls + Fix

### ❌ Trusting EXPLAIN without running ANALYZE on tables — stale statistics

```sql
-- ❌ After bulk importing 1 million rows, statistics are stale
-- EXPLAIN shows rows=100 (old estimate) but actual rows=1,000,000
-- Planner chooses Nested Loop (good for small sets) → catastrophically slow
EXPLAIN ANALYZE SELECT * FROM events e JOIN users u ON u.id = e.user_id;
-- Nested Loop (cost=... rows=100) (actual rows=1000000)  ← off by 10,000x ❌
```

**Fix:** Run `ANALYZE` after bulk operations:

```sql
-- ✅
ANALYZE events;   -- update statistics for the table
EXPLAIN ANALYZE SELECT * FROM events e JOIN users u ON u.id = e.user_id;
-- Now: Hash Join (cost=... rows=1000000) (actual rows=1000000) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Run four `EXPLAIN ANALYZE` queries and interpret the output: (1) a query with no index (seq scan), (2) the same query after adding an index (index scan), (3) a three-table join (identify the join strategy), (4) a query with `ORDER BY` on a non-indexed column (identify the sort node). For each, state what you see and what you would do to improve it.

### Solution

```sql
-- (1) No index — seq scan
DROP INDEX IF EXISTS idx_orders_status;
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'delivered';
-- Seq Scan on orders (cost=0.00..1.05 rows=2 width=...) (actual time=... rows=2 ...)
-- Observation: Seq Scan — fine for 4 rows, problem at 1M rows
-- Fix: CREATE INDEX idx_orders_status ON orders(status);

-- (2) After adding index — index scan
CREATE INDEX idx_orders_status ON orders(status);
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'delivered';
-- Index Scan using idx_orders_status on orders
-- Observation: Index Scan — fast even at scale
-- (For small tables, planner may still choose seq scan — correct for tiny tables)

-- (3) Three-table join — identify join strategy
EXPLAIN ANALYZE
SELECT c.name, o.id, p.name AS product
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE c.id = 1;
-- Likely: Nested Loop (outer=customers 1 row, inner=orders small)
--   Hash Join or Nested Loop for order_items
-- Observation: nested loops fine for single customer
-- Fix if slow at scale: ensure indexes on all FK columns

-- (4) ORDER BY without index — Sort node
EXPLAIN ANALYZE
SELECT id, total, ordered_at FROM orders ORDER BY total DESC;
-- Sort (cost=...) Sort Key: total DESC
--   Seq Scan on orders ...
-- Observation: Sort node = in-memory or disk sort
-- Fix: CREATE INDEX idx_orders_total ON orders(total DESC);
-- After index: Index Scan using idx_orders_total (no Sort node)

EXPLAIN ANALYZE
SELECT id, total, ordered_at FROM orders ORDER BY total DESC;
-- Index Scan using idx_orders_total on orders ✅ (no Sort node)
```

---

---
