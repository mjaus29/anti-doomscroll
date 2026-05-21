# 5 — GROUP BY — Grouping Rows for Aggregation

---

## T — TL;DR

`GROUP BY` splits rows into groups based on the values of specified columns, then aggregates each group independently. Every column in `SELECT` must be either in `GROUP BY` or wrapped in an aggregate function. `GROUP BY` runs after `WHERE` (which filters individual rows) and before `HAVING` (which filters groups).

---

## K — Key Concepts

```sql
-- ─── Basic GROUP BY — aggregate per group
SELECT
  status,
  COUNT(*)       AS order_count,
  SUM(total)     AS total_revenue,
  ROUND(AVG(total), 2) AS avg_order
FROM orders
GROUP BY status
ORDER BY total_revenue DESC;

-- status    | order_count | total_revenue | avg_order
-- ----------+-------------+---------------+----------
-- delivered |           2 |        188.97 |     94.49
-- pending   |           1 |         49.99 |     49.99
-- cancelled |           1 |         39.99 |     39.99
```

```sql
-- ─── GROUP BY rule: non-aggregate SELECT columns MUST be in GROUP BY
-- ❌ Error: 'name' must appear in GROUP BY
SELECT status, name, COUNT(*) FROM orders GROUP BY status;
-- ERROR: column "orders.name" must appear in GROUP BY or be used in an aggregate

-- ✅ Add name to GROUP BY, or aggregate it
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

```sql
-- ─── GROUP BY with JOIN — aggregate joined data
SELECT
  c.id,
  c.name,
  COUNT(o.id)              AS order_count,
  COALESCE(SUM(o.total), 0) AS total_spent
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name          -- group by PK and any other selected non-aggregate columns
ORDER BY total_spent DESC;

-- id | name          | order_count | total_spent
-- ---+---------------+-------------+------------
--  1 | Mark Austin   |           2 |      229.97
--  3 | James Rivera  |           1 |       39.99
--  2 | Sarah Chen    |           1 |        8.99
--  4 | Priya Sharma  |           0 |        0.00
```

```sql
-- ─── GROUP BY on expressions
-- Group by year
SELECT
  EXTRACT(YEAR FROM ordered_at)  AS order_year,
  EXTRACT(MONTH FROM ordered_at) AS order_month,
  COUNT(*)                       AS orders,
  SUM(total)                     AS revenue
FROM orders
GROUP BY
  EXTRACT(YEAR FROM ordered_at),
  EXTRACT(MONTH FROM ordered_at)
ORDER BY order_year, order_month;

-- ─── GROUP BY with CASE expression
SELECT
  CASE
    WHEN total < 50   THEN 'small'
    WHEN total < 150  THEN 'medium'
    ELSE                   'large'
  END AS order_size,
  COUNT(*) AS count
FROM orders
GROUP BY
  CASE
    WHEN total < 50   THEN 'small'
    WHEN total < 150  THEN 'medium'
    ELSE                   'large'
  END
ORDER BY count DESC;
```

```sql
-- ─── GROUP BY multiple columns — one group per unique combination
SELECT
  c.city,
  o.status,
  COUNT(o.id)    AS count,
  SUM(o.total)   AS revenue
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.city, o.status
ORDER BY c.city, o.status;

-- city      | status    | count | revenue
-- ----------+-----------+-------+---------
-- Manila    | cancelled |     1 |   39.99
-- Manila    | delivered |     1 |  179.98
-- Manila    | pending   |     1 |   49.99
-- Singapore | delivered |     1 |    8.99
```

```sql
-- ─── GROUPING SETS, ROLLUP, CUBE — multi-level aggregation
-- ROLLUP: hierarchical totals
SELECT
  c.city,
  o.status,
  COUNT(*)  AS orders,
  SUM(o.total) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY ROLLUP (c.city, o.status)
ORDER BY c.city NULLS LAST, o.status NULLS LAST;
-- Produces: per-city-per-status rows + per-city subtotals + grand total
-- NULL in city = grand total row; NULL in status = city subtotal
```

---

## W — Why It Matters

- `GROUP BY c.id, c.name` instead of just `GROUP BY c.id` — when grouping by a PK, all other columns of that table are functionally determined by the PK and PostgreSQL v9.1+ allows omitting them. But being explicit (`GROUP BY c.id, c.name`) makes intent clear and is portable to other databases.
- `COALESCE(SUM(o.total), 0)` in a `LEFT JOIN GROUP BY` query is essential — `SUM` of zero matching rows returns `NULL`, not `0`. Without `COALESCE`, customers with no orders show `NULL` total spend instead of `0`, breaking downstream arithmetic.
- `ROLLUP` and `CUBE` produce summary rows (subtotals and grand totals) in a single pass — much faster than `UNION ALL`-ing multiple queries. Use them for financial reports and pivot-style summaries.

---

## I — Interview Q&A

### Q: Why must every non-aggregate column in `SELECT` appear in `GROUP BY`?

**A:** `GROUP BY` collapses multiple rows into one group. If a column is not part of the grouping key and not aggregated, PostgreSQL doesn't know which value from the group to display — there could be multiple different values for that column within the group. The SQL standard requires either grouping by the column (meaning all rows in the group have the same value for it) or applying an aggregate (which reduces multiple values to one). PostgreSQL enforces this strictly. The exception: if you group by a table's primary key, other columns of that table are functionally determined and PostgreSQL v9.1+ allows them in `SELECT` without repeating them in `GROUP BY`.

---

## C — Common Pitfalls + Fix

### ❌ Grouping by alias — PostgreSQL allows it but is non-standard

```sql
-- ❌ Works in PostgreSQL but not portable to other databases
SELECT
  DATE_TRUNC('month', ordered_at) AS order_month,
  COUNT(*) AS orders
FROM orders
GROUP BY order_month;  -- PostgreSQL allows alias in GROUP BY, others don't
```

**Fix (portable):** Repeat the expression:

```sql
-- ✅ Standard SQL — expression repeated in GROUP BY
SELECT
  DATE_TRUNC('month', ordered_at) AS order_month,
  COUNT(*) AS orders
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at)
ORDER BY order_month;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query joining `customers`, `orders`, and `order_items` that groups by `customer city` and `product category`, showing: total items ordered, total revenue, and average items per order. Sort by revenue descending.

### Solution

```sql
SELECT
  c.city                             AS customer_city,
  p.category                         AS product_category,
  COUNT(DISTINCT o.id)               AS order_count,
  SUM(oi.quantity)                   AS total_items,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue,
  ROUND(AVG(oi.quantity), 2)         AS avg_qty_per_line
FROM customers   AS c
JOIN orders      AS o  ON o.customer_id   = c.id
JOIN order_items AS oi ON oi.order_id     = o.id
JOIN products    AS p  ON p.id            = oi.product_id
WHERE o.status != 'cancelled'
GROUP BY c.city, p.category
ORDER BY total_revenue DESC;

-- customer_city | product_category | order_count | total_items | total_revenue | avg_qty_per_line
-- -------------+------------------+-------------+-------------+---------------+-----------------
-- Manila       | Electronics      |           2 |           3 |        229.97 |             1.00
-- Singapore    | Stationery       |           1 |           1 |          8.99 |             1.00
```

---

---
