# 6 — HAVING — Filtering Aggregated Groups

---

## T — TL;DR

`HAVING` filters groups **after** aggregation — it is the `WHERE` for aggregate results. Use `HAVING` when your filter condition involves an aggregate function (`COUNT`, `SUM`, `AVG`). Use `WHERE` when filtering individual rows before grouping. Both can appear in the same query.

---

## K — Key Concepts

```sql
-- ─── HAVING — filter groups by aggregate condition
SELECT
  customer_id,
  COUNT(*)   AS order_count,
  SUM(total) AS total_spent
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 1          -- keep only customers with more than 1 order
ORDER BY total_spent DESC;

-- customer_id | order_count | total_spent
-- -----------+-------------+------------
--           1 |           2 |      229.97
-- Only Mark Austin — the only customer with more than 1 order
```

```sql
-- ─── WHERE + HAVING together — filter rows then filter groups
SELECT
  c.name,
  COUNT(o.id)       AS order_count,
  SUM(o.total)      AS revenue
FROM customers AS c
JOIN orders    AS o ON o.customer_id = c.id
WHERE o.status = 'delivered'           -- WHERE: filter individual rows first
GROUP BY c.name
HAVING SUM(o.total) > 50              -- HAVING: filter groups after aggregation
ORDER BY revenue DESC;

-- WHERE filters to only delivered orders (row-level)
-- GROUP BY groups by customer name
-- HAVING keeps only customers whose delivered revenue > 50
-- Result: Mark Austin (179.98) only — Sarah's 8.99 is filtered out
```

```sql
-- ─── Common HAVING use cases

-- Groups with more than N members
HAVING COUNT(*) >= 3

-- Groups where aggregate exceeds a threshold
HAVING SUM(amount) > 1000

-- Groups where average is within a range
HAVING AVG(score) BETWEEN 60 AND 90

-- Groups with no members matching a condition (conditional COUNT)
HAVING COUNT(*) FILTER (WHERE status = 'active') = 0

-- ─── HAVING with multiple conditions
SELECT
  category,
  COUNT(*)            AS product_count,
  ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category
HAVING COUNT(*) > 1
   AND AVG(price) > 30
ORDER BY avg_price DESC;
```

```sql
-- ─── HAVING vs WHERE — decision rule
-- Filter pre-aggregation (individual rows):     WHERE
-- Filter post-aggregation (group results):      HAVING
-- Can aggregate functions be in WHERE?          NO  → error
-- Can aggregate functions be in HAVING?         YES → required

-- ❌ Cannot use aggregate in WHERE
SELECT customer_id FROM orders
WHERE COUNT(*) > 1;   -- ERROR: aggregate functions not allowed in WHERE

-- ✅ Aggregate filter belongs in HAVING
SELECT customer_id FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

---

## W — Why It Matters

- `HAVING` is the only way to filter by aggregate results in a single query — there is no alternative without using a subquery or CTE. "Show me categories with more than 10 products priced over $50" is impossible with just `WHERE`.
- `WHERE` + `HAVING` in the same query is a performance optimization — `WHERE` reduces the row count before grouping (less data to aggregate), and `HAVING` filters groups afterward. Running only `HAVING` without `WHERE` aggregates all rows first, then discards groups.
- `HAVING COUNT(*) FILTER (WHERE condition) = 0` is an elegant way to find groups with no members matching a condition — e.g., orders with no delivered items.

---

## I — Interview Q&A

### Q: What is the difference between `WHERE` and `HAVING`, and can they appear in the same query?

**A:** `WHERE` filters individual rows before grouping — it runs at step 2 of SQL's logical execution order. It cannot reference aggregate functions because aggregation hasn't happened yet. `HAVING` filters groups after aggregation — it runs at step 4, after `GROUP BY`. It can reference aggregate functions because the aggregation has already been computed. Yes, both can appear in the same query: `WHERE` pre-filters rows (reducing the data fed into GROUP BY), and `HAVING` post-filters the resulting groups. This combination is often more efficient than using `HAVING` alone.

---

## C — Common Pitfalls + Fix

### ❌ Using HAVING instead of WHERE for non-aggregate filters

```sql
-- ❌ Technically works but forces aggregation of all rows first
SELECT status, COUNT(*)
FROM orders
GROUP BY status
HAVING status = 'delivered';  -- should be WHERE — runs after full aggregation ❌
```

**Fix:** Use `WHERE` for non-aggregate conditions (processed before grouping):

```sql
-- ✅ WHERE filters rows before grouping — more efficient
SELECT status, COUNT(*)
FROM orders
WHERE status = 'delivered'
GROUP BY status;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query on the full join (`customers → orders → order_items → products`) that returns customers who have spent more than $100 **total** on `Electronics` products. Show customer name, category, items bought, and total spent. Use both `WHERE` (to filter to Electronics) and `HAVING` (to filter on the total).

### Solution

```sql
SELECT
  c.name                                     AS customer_name,
  p.category,
  SUM(oi.quantity)                           AS items_bought,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_spent
FROM customers   AS c
JOIN orders      AS o  ON o.customer_id   = c.id
JOIN order_items AS oi ON oi.order_id     = o.id
JOIN products    AS p  ON p.id            = oi.product_id
WHERE p.category = 'Electronics'                          -- row-level filter first
  AND o.status != 'cancelled'
GROUP BY c.name, p.category
HAVING SUM(oi.quantity * oi.unit_price) > 100             -- group-level filter
ORDER BY total_spent DESC;

-- customer_name | category    | items_bought | total_spent
-- --------------+-------------+--------------+------------
-- Mark Austin   | Electronics |            3 |      229.97
```

---

---
