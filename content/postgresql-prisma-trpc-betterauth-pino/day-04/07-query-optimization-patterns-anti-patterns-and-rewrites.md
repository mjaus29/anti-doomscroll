# 7 — Query Optimization Patterns — Anti-Patterns and Rewrites

---

## T — TL;DR

Most slow queries follow recognisable anti-patterns: the N+1 query problem, unbounded queries on large tables, implicit type coercion breaking indexes, `SELECT *` over-fetching, repeated subqueries, and correlated subqueries instead of joins. Learn the pattern, know the rewrite.

---

## K — Key Concepts

```sql
-- ─── Anti-pattern 1: N+1 Queries — fetch parent, then query child per row
-- ❌ Application fetches 100 orders, then queries items for each → 101 queries
-- JavaScript pseudo-code:
-- const orders = await db.query('SELECT * FROM orders WHERE customer_id = 1')
-- for (const order of orders) {
--   order.items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id])
-- }

-- Fix: one JOIN query
SELECT
  o.id     AS order_id,
  o.total,
  oi.product_id,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 1;

-- Or if you want the items as a nested structure:
SELECT
  o.id,
  o.total,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'product_id', oi.product_id,
      'quantity',   oi.quantity,
      'unit_price', oi.unit_price
    ) ORDER BY oi.product_id
  ) AS items
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 1
GROUP BY o.id, o.total;
```

```sql
-- ─── Anti-pattern 2: SELECT * — fetch all columns when you need two
-- ❌ Fetches every column, including large JSONB and TEXT blobs
SELECT * FROM products WHERE category = 'Electronics';

-- ✅ Select only what you use
SELECT id, name, price FROM products WHERE category = 'Electronics';
-- Also enables Index Only Scan if index covers those columns
```

```sql
-- ─── Anti-pattern 3: Implicit type coercion — index not used
-- ❌ Column is BIGINT, literal is TEXT — implicit cast prevents index use
SELECT * FROM orders WHERE customer_id = '1';   -- '1' is TEXT
-- EXPLAIN: Seq Scan (filter: customer_id::text = '1')

-- ✅ Match the literal type to the column type
SELECT * FROM orders WHERE customer_id = 1;     -- BIGINT literal

-- ❌ Casting the column — always prevents index use
SELECT * FROM orders WHERE customer_id::TEXT = '1';

-- ✅ Cast the literal (constant), never the column
SELECT * FROM orders WHERE customer_id = '1'::BIGINT;
```

```sql
-- ─── Anti-pattern 4: Correlated subquery in SELECT for large tables
-- ❌ Runs the subquery once per outer row — O(n²)
SELECT
  c.name,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
FROM customers c;
-- For 100,000 customers: 100,000 COUNT(*) queries ❌

-- ✅ Rewrite as LEFT JOIN + GROUP BY — single pass
SELECT
  c.name,
  COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

```sql
-- ─── Anti-pattern 5: NOT IN with potentially NULL subquery
-- ❌ NULL in subquery → NOT IN returns 0 rows (silent bug)
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
-- If any order has NULL customer_id → returns NOTHING ❌

-- ✅ Use NOT EXISTS (always NULL-safe)
SELECT c.*
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- ✅ Or LEFT JOIN anti-join (same result, planner may prefer either)
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

```sql
-- ─── Anti-pattern 6: LIKE with a leading wildcard — no index
-- ❌ Leading % prevents B-tree index from being used
SELECT * FROM products WHERE name LIKE '%keyboard%';
-- EXPLAIN: Seq Scan (every row scanned)

-- ✅ Full-text search (for natural language)
SELECT * FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'keyboard');

-- ✅ pg_trgm for arbitrary LIKE/ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%keyboard%';  -- now uses GIN index ✅
```

```sql
-- ─── Anti-pattern 7: Repeated CTE / subquery that could be materialised
-- ❌ Same expensive subquery referenced twice — may run twice (PG12+ inlining)
WITH stats AS (
  SELECT AVG(total) avg, STDDEV(total) std FROM orders
)
SELECT *, (total - stats.avg) / stats.std AS z_score
FROM orders, stats
WHERE (total - stats.avg) / stats.std > 2;

-- ✅ Force materialisation with MATERIALIZED keyword
WITH MATERIALIZED stats AS (
  SELECT AVG(total) avg, STDDEV(total) std FROM orders
)
SELECT *, (total - stats.avg) / stats.std AS z_score
FROM orders, stats
WHERE (total - stats.avg) / stats.std > 2;
```

```sql
-- ─── Anti-pattern 8: Unbounded query — no LIMIT on potentially large result
-- ❌ In a web API returning all orders for an admin — could be millions
SELECT * FROM orders ORDER BY ordered_at DESC;

-- ✅ Always paginate with LIMIT (cursor-based in Subtopic 8)
SELECT id, customer_id, total, ordered_at
FROM orders
ORDER BY ordered_at DESC
LIMIT 50;
```

---

## W — Why It Matters

- The N+1 query problem is the most impactful performance issue in backend applications — it's invisible during development (small dataset) and catastrophic in production (thousands of users with hundreds of orders each = hundreds of thousands of queries per page load).
- Implicit type coercion is a silent index killer — the query looks correct and returns the right results, but `EXPLAIN` reveals a full table scan because the planner can't use the index on a casted column. Always match literal types to column types.
- Most "slow query" tickets in production trace back to one of these eight patterns. Knowing them means you can diagnose and fix most performance issues in under 10 minutes.

---

## I — Interview Q&A

### Q: What is the N+1 query problem and how do you fix it in SQL?

**A:** The N+1 problem occurs when you execute 1 query to fetch N parent records, then execute 1 additional query per parent to fetch its children — resulting in N+1 total queries. Example: fetch 100 orders (1 query), then fetch items for each order (100 queries) = 101 total. The fix in SQL is to use a JOIN with the parent query to fetch all children in a single query, then group the results in application code or use `JSONB_AGG` to produce nested JSON directly from PostgreSQL. ORMs solve N+1 with eager loading (`include`/`with` clauses), which generates a JOIN or an `IN (list_of_ids)` query.

---

## C — Common Pitfalls + Fix

### ❌ Applying COALESCE to an indexed column in WHERE — breaks index

```sql
-- ❌ Wrapping the column in a function breaks index usage
SELECT * FROM users WHERE COALESCE(display_name, username) = 'mark';
-- EXPLAIN: Seq Scan — function on column prevents index use

-- ✅ Restructure the condition — don't touch the column
SELECT * FROM users WHERE display_name = 'mark'
UNION ALL
SELECT * FROM users WHERE display_name IS NULL AND username = 'mark';
-- Both branches can use their respective column indexes ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Identify and rewrite the following three slow queries: (1) a correlated subquery in SELECT that counts items per order for all orders; (2) a `NOT IN` query that finds products never ordered (with potential NULL risk); (3) an `ORDER BY` on a computed expression with no index.

### Solution

```sql
-- (1) ❌ Correlated subquery — runs once per order row
SELECT
  o.id,
  o.total,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o;

-- ✅ Rewrite: LEFT JOIN + GROUP BY — single pass
SELECT
  o.id,
  o.total,
  COUNT(oi.product_id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.total
ORDER BY o.id;

-- (2) ❌ NOT IN — NULL-unsafe (if any order_item has NULL product_id → 0 rows returned)
SELECT id, name FROM products
WHERE id NOT IN (SELECT product_id FROM order_items);

-- ✅ NOT EXISTS — always NULL-safe
SELECT p.id, p.name
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);

-- (3) ❌ ORDER BY on computed expression — forces a Sort node
SELECT id, quantity * unit_price AS line_total
FROM order_items
ORDER BY quantity * unit_price DESC;
-- EXPLAIN: Sort → Seq Scan (expensive for large tables)

-- ✅ Option A: add a computed column + index
ALTER TABLE order_items ADD COLUMN line_total
  NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;
CREATE INDEX idx_order_items_line_total ON order_items(line_total DESC);
SELECT id, line_total FROM order_items ORDER BY line_total DESC;
-- EXPLAIN: Index Scan using idx_order_items_line_total ✅

-- ✅ Option B: expression index (no schema change)
CREATE INDEX idx_order_items_expr ON order_items((quantity * unit_price) DESC);
SELECT id, quantity * unit_price AS line_total
FROM order_items
ORDER BY quantity * unit_price DESC;
-- EXPLAIN: Index Scan using idx_order_items_expr ✅
```

---

---
