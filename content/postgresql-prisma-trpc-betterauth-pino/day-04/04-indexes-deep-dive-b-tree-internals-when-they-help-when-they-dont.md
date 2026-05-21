# 4 — Indexes Deep Dive — B-tree Internals, When They Help, When They Don't

---

## T — TL;DR

An index is a separate data structure that maps column values to physical row locations — like a book's index. PostgreSQL's default B-tree index maintains a sorted copy of the indexed values, enabling `O(log n)` lookups instead of `O(n)` sequential scans. Indexes speed up `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` but slow down `INSERT`, `UPDATE`, and `DELETE`. Add indexes where you measure a need, not preemptively everywhere.

---

## K — Key Concepts

```sql
-- ─── Creating indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
-- ↑ B-tree index (default) on a single column

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);

-- Named convention: idx_{table}_{column(s)}
-- PostgreSQL auto-names if you omit: orders_customer_id_idx

-- ─── Primary key and UNIQUE constraints create indexes automatically
-- PK → implicit B-tree unique index
-- UNIQUE → implicit B-tree unique index
-- These do NOT need explicit CREATE INDEX
```

```sql
-- ─── How B-tree works — mental model
-- The index stores (value, row_ctid) pairs in sorted order
-- Lookup: binary search through the sorted index → find row location → fetch row

-- Example: B-tree on orders.status
--  'cancelled' → [(row 4)]
--  'delivered' → [(row 1), (row 3)]
--  'pending'   → [(row 2)]

-- Query: SELECT * FROM orders WHERE status = 'delivered'
-- Without index: scan all rows (seq scan) — O(n)
-- With index:    binary search the index → jump to rows 1 and 3 — O(log n)

-- ─── Seq scan vs Index scan — how the planner chooses
-- Low selectivity (status = 'active', 90% of rows match)  → seq scan is faster
-- High selectivity (email = 'mark@example.com', 1 row)    → index scan is faster
-- Threshold: ~5-10% of rows → planner switches from index to seq scan
-- Rule: indexes help most when they are highly selective
```

```sql
-- ─── When indexes are NOT used

-- 1. Function applied to the indexed column
-- ❌ Index on email, but LOWER() is applied — index not used
SELECT * FROM users WHERE LOWER(email) = 'mark@example.com';
-- Fix: expression index (covered in Subtopic 5)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- 2. Leading wildcard in LIKE
-- ❌ B-tree cannot search for suffix patterns
SELECT * FROM products WHERE name LIKE '%keyboard%';
-- Fix: full-text search index (GIN) or pg_trgm (covered in Subtopic 5)

-- 3. Implicit type cast — column type ≠ literal type
-- ❌ orders.customer_id is BIGINT, comparing to TEXT '1'
SELECT * FROM orders WHERE customer_id = '1';  -- implicit cast → index not used
-- Fix: always match the literal type to the column type
SELECT * FROM orders WHERE customer_id = 1;    -- ✅ BIGINT literal

-- 4. OR conditions across different columns
-- ❌ Usually causes index scan on each column separately + bitmap OR (less efficient)
SELECT * FROM users WHERE email = 'a@a.com' OR username = 'mark';
-- Fix: use UNION ALL with separate indexed queries

-- 5. Very low selectivity — most rows match
-- ❌ index on is_active when 95% of rows are active
SELECT * FROM users WHERE is_active = true;   -- seq scan faster
```

```sql
-- ─── Index scan types PostgreSQL uses
-- Index Scan:        follows index → fetches each row from heap (good for small results)
-- Index Only Scan:   all needed columns are in the index → no heap fetch (fastest)
-- Bitmap Index Scan: builds a bitmap of matching pages → batch-fetches from heap
--                    used for medium-selectivity queries (5–20% of rows)
-- Sequential Scan:   reads every row — faster when most rows match

-- Index Only Scan requires: all SELECT columns are in the index
-- CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
-- SELECT customer_id, status FROM orders WHERE customer_id = 1;
-- → Index Only Scan ✅ (both columns in the index)
```

```sql
-- ─── Index maintenance costs
-- Each INSERT adds an entry to every index on the table
-- Each UPDATE on an indexed column removes old entry, adds new entry
-- Each DELETE marks the index entry as dead (vacuumed later)
-- Heavy write tables with many indexes → write amplification

-- Rule: don't index every column
-- Good index candidates:
--   FK columns (always)
--   Columns in frequent WHERE conditions
--   Columns in ORDER BY that affect query performance
--   Columns in JOIN conditions (if not already PKs)
-- Bad index candidates:
--   Columns with very few distinct values (boolean, low-cardinality enum)
--   Columns rarely queried
--   Columns on write-heavy tables with no read benefit

-- ─── Check index usage
SELECT
  schemaname, tablename, indexname,
  idx_scan    AS times_used,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;  -- unused indexes have idx_scan = 0 → candidates for removal
```

---

## W — Why It Matters

- Missing an index on a FK column is the most common PostgreSQL performance mistake — `DELETE FROM users WHERE id = 1` triggers a sequential scan of every table with a FK to users to check for references. On a 10M-row orders table, this takes seconds. An index makes it milliseconds.
- Understanding selectivity explains why indexes on boolean columns (`is_active`) often don't help — if 90% of users are active, the planner correctly chooses a seq scan over an index that would still fetch most of the table.
- Unused indexes (visible in `pg_stat_user_indexes`) are pure overhead — they consume disk space, slow writes, and are updated by VACUUM. Removing them is a free performance win.

---

## I — Interview Q&A

### Q: When does PostgreSQL choose a sequential scan over an index scan even when an index exists?

**A:** The PostgreSQL query planner estimates the cost of each scan type based on statistics. A sequential scan reads data pages sequentially — efficient due to OS read-ahead caching. An index scan jumps to specific pages — each jump may be a random I/O, which is slower than sequential I/O. When a query matches a large percentage of rows (roughly more than 5–10% of the table), fetching those rows via the index involves many random reads across many pages, making it slower than a full sequential scan. The planner also considers the `random_page_cost` vs `seq_page_cost` settings, and whether the data is on SSD (lower random_page_cost) or HDD.

---

## C — Common Pitfalls + Fix

### ❌ Applying a function to an indexed column — index bypassed

```sql
-- ❌ Index on email is not used — function changes the value being compared
SELECT * FROM users WHERE LOWER(email) = LOWER('Mark@Example.com');

-- EXPLAIN shows: Seq Scan on users (index ignored)
```

**Fix:** Create an expression index matching the function:

```sql
-- ✅ Expression index — stores LOWER(email), not email
CREATE INDEX idx_users_email_ci ON users(LOWER(email));

-- Now used:
SELECT * FROM users WHERE LOWER(email) = LOWER('Mark@Example.com');
-- EXPLAIN shows: Index Scan using idx_users_email_ci
```

---

## K — Coding Challenge + Solution

### Challenge

For the `orders` table: (1) identify which queries would benefit from an index using `EXPLAIN`; (2) create appropriate indexes for: filtering by `status`, filtering by `customer_id`, and sorting by `ordered_at DESC` with a `status` filter; (3) use `pg_stat_user_indexes` to check if indexes are being used after running some queries; (4) identify which index would support an index-only scan for `SELECT customer_id, status FROM orders WHERE customer_id = 1`.

### Solution

```sql
-- (1) Check the plan WITHOUT indexes
EXPLAIN SELECT * FROM orders WHERE status = 'delivered';
-- → Seq Scan on orders  (no index yet)

EXPLAIN SELECT * FROM orders WHERE customer_id = 1 ORDER BY ordered_at DESC;
-- → Seq Scan on orders

-- (2) Create targeted indexes
-- For status filter
CREATE INDEX idx_orders_status ON orders(status);

-- For customer_id filter (high selectivity — one customer among thousands)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- For customer + ordered_at sort (covers both filter and sort)
CREATE INDEX idx_orders_customer_ordered
  ON orders(customer_id, ordered_at DESC);

-- For order_at range queries
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);

-- (3) Run queries and check index usage
SELECT * FROM orders WHERE status = 'delivered';
SELECT * FROM orders WHERE customer_id = 1 ORDER BY ordered_at DESC;

SELECT indexname, idx_scan, idx_tup_read,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

-- (4) Index-only scan — index must contain ALL selected columns
CREATE INDEX idx_orders_customer_status
  ON orders(customer_id, status);
-- Now:
EXPLAIN SELECT customer_id, status FROM orders WHERE customer_id = 1;
-- → Index Only Scan using idx_orders_customer_status ✅
-- No heap fetch — all data comes from the index itself
```

---

---
