# 7 — Subqueries — Scalar, List, EXISTS, Correlated

---

## T — TL;DR

A subquery is a `SELECT` nested inside another SQL statement. **Scalar** subqueries return one value. **List** subqueries return one column used with `IN` / `NOT IN`. **EXISTS** subqueries check whether any row matches. **Correlated** subqueries reference the outer query's row. Each has different performance characteristics and use cases.

---

## K — Key Concepts

```sql
-- ─── Scalar subquery — returns exactly one row, one column
-- Used anywhere a single value is expected: SELECT, WHERE, HAVING

-- In WHERE
SELECT name, total
FROM orders
WHERE total > (SELECT AVG(total) FROM orders);  -- orders above average
-- Subquery runs once, returns 69.74, outer query uses that value

-- In SELECT — computed column per row
SELECT
  o.id,
  o.total,
  (SELECT AVG(total) FROM orders) AS overall_avg,
  o.total - (SELECT AVG(total) FROM orders) AS diff_from_avg
FROM orders o;
```

```sql
-- ─── List subquery — returns one column of values, used with IN
-- "Which customers have placed at least one order?"
SELECT id, name
FROM customers
WHERE id IN (SELECT DISTINCT customer_id FROM orders);

-- NOT IN — customers who have NEVER ordered
SELECT id, name
FROM customers
WHERE id NOT IN (SELECT DISTINCT customer_id FROM orders);

-- ⚠️ NOT IN + NULL trap: if the subquery returns any NULL,
-- NOT IN returns NO rows because NULL poisons the IN check
-- Safe version: use NOT EXISTS or LEFT JOIN anti-join instead
```

```sql
-- ─── EXISTS subquery — checks for the existence of any matching row
-- More efficient than IN for large subquery results — stops at first match

-- "Customers who have placed at least one delivered order"
SELECT c.id, c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1   -- SELECT 1 (or SELECT *) — the value doesn't matter, only existence
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.status = 'delivered'
);

-- NOT EXISTS — customers with NO delivered orders (NULL-safe)
SELECT c.id, c.name
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.status = 'delivered'
);
-- Safer than NOT IN — NULL in subquery doesn't affect NOT EXISTS
```

```sql
-- ─── Correlated subquery — references the outer query's current row
-- Re-executed once per outer row (can be slow on large tables)

-- "For each order, show the customer's total order count"
SELECT
  o.id,
  o.total,
  (
    SELECT COUNT(*)
    FROM orders o2
    WHERE o2.customer_id = o.customer_id  -- ← references outer query's row
  ) AS customer_order_count
FROM orders o;

-- "Each product with the number of orders it appears in"
SELECT
  p.name,
  p.price,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) AS times_ordered
FROM products p;
-- This is a correlated subquery in SELECT — runs once per product row
-- For small tables: fine. For large tables: use LEFT JOIN + GROUP BY instead
```

```sql
-- ─── Subquery in FROM — derived table (must be aliased)
-- Computes a result set first, then queries it like a table
SELECT
  city,
  customer_count,
  total_revenue
FROM (
  SELECT
    c.city,
    COUNT(DISTINCT c.id)        AS customer_count,
    ROUND(SUM(o.total), 2)      AS total_revenue
  FROM customers c
  JOIN orders o ON o.customer_id = c.id
  GROUP BY c.city
) AS city_summary
WHERE total_revenue > 50
ORDER BY total_revenue DESC;

-- The inner query runs first, produces a named result set 'city_summary'
-- The outer query filters and sorts that result set
```

```sql
-- ─── When to choose what

-- Scalar subquery in SELECT:
--   Simple but runs once per row → correlated = slow for big tables
--   Better: JOIN or window function (Day 4)

-- IN (subquery) — use for small subquery results
-- NOT IN (subquery) — AVOID if subquery can return NULLs → use NOT EXISTS

-- EXISTS / NOT EXISTS:
--   NULL-safe, efficient (stops at first match)
--   Best for existence checks

-- Derived table (subquery in FROM):
--   When you need to filter or alias aggregated results
--   CTEs are more readable for the same purpose
```

---

## W — Why It Matters

- `NOT IN` with a subquery that can return `NULL` is one of SQL's most dangerous silent bugs — a single `NULL` in the list makes `NOT IN` return zero rows always. `NOT EXISTS` is always the safe alternative.
- `EXISTS` is semantically clearer for "does a matching row exist" checks than `IN (SELECT ...)` — the query planner often generates the same plan, but `EXISTS` explicitly communicates the intent and is NULL-safe.
- Correlated subqueries in `SELECT` are a readability convenience but can be slow — they run once per outer row. For reporting queries on large tables, replace them with `LEFT JOIN + GROUP BY` or window functions.

---

## I — Interview Q&A

### Q: What is the difference between `IN (subquery)` and `EXISTS (subquery)`, and when should you use each?

**A:** `IN (subquery)` materialises the full list of values from the subquery and then checks each outer row against that list — it's a set membership check. `EXISTS (subquery)` evaluates the subquery for each outer row and stops as soon as one matching row is found — it never materialises the full result. `EXISTS` is generally faster for large subquery results because it short-circuits. More importantly, `NOT IN` is dangerous when the subquery can return `NULL` — a `NULL` in the list causes `NOT IN` to return no rows at all. `NOT EXISTS` is always NULL-safe and is the preferred form for negative existence checks.

### Q: What is a correlated subquery?

**A:** A correlated subquery references a column from the outer query — it re-executes for each row processed by the outer query. Example: `SELECT name, (SELECT COUNT(*) FROM orders WHERE orders.customer_id = customers.id) FROM customers`. The inner `COUNT(*)` runs once per customer row, using that customer's `id` from the outer query. This is intuitive and readable for small tables but becomes a performance problem on large tables because the subquery is executed N times (once per outer row). Replace with `LEFT JOIN + GROUP BY` or a window function for production queries on large datasets.

---

## C — Common Pitfalls + Fix

### ❌ `NOT IN` with a subquery that can return NULL

```sql
-- ❌ If any order has customer_id = NULL, NOT IN returns 0 rows silently
SELECT name FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
-- If orders has even one NULL customer_id → no customers returned ❌
```

**Fix:** Use `NOT EXISTS`:

```sql
-- ✅ NULL-safe
SELECT name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

---

## K — Coding Challenge + Solution

### Challenge

Write three separate queries: (1) scalar — orders where total is above the average total (use scalar subquery in `WHERE`); (2) list — products that have been ordered at least once (use `IN`); (3) exists — customers who have at least one pending OR cancelled order (use `EXISTS` with `OR` inside).

### Solution

```sql
-- (1) Scalar: orders above average
SELECT
  o.id,
  o.status,
  o.total,
  ROUND((SELECT AVG(total) FROM orders), 2) AS avg_total
FROM orders o
WHERE o.total > (SELECT AVG(total) FROM orders)
ORDER BY o.total DESC;

-- id | status    | total  | avg_total
-- ---+-----------+--------+-----------
--  1 | delivered | 179.98 |     69.74

-- (2) List: products that have been ordered
SELECT id, name, price
FROM products
WHERE id IN (SELECT DISTINCT product_id FROM order_items)
ORDER BY name;

-- id | name                 | price
-- ---+----------------------+-------
--  1 | Mechanical Keyboard  | 129.99
--  2 | Gaming Mouse         |  49.99
--  3 | Notebook A5          |   8.99
--  4 | USB-C Hub            |  39.99

-- (3) EXISTS: customers with pending or cancelled orders
SELECT c.id, c.name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.status IN ('pending', 'cancelled')
)
ORDER BY c.name;

-- id | name
-- ---+--------------
--  1 | Mark Austin    ← has a pending order
--  3 | James Rivera   ← has a cancelled order
```

---

---
