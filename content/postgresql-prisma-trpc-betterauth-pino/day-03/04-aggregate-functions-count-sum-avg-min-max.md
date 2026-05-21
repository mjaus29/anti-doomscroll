# 4 — Aggregate Functions — COUNT, SUM, AVG, MIN, MAX

---

## T — TL;DR

Aggregate functions collapse multiple rows into a single value per group. `COUNT` counts rows or non-null values. `SUM` / `AVG` / `MIN` / `MAX` operate on numeric or comparable values. Aggregates always ignore `NULL` (except `COUNT(*)`). Combine with `GROUP BY` to aggregate per group — without `GROUP BY`, aggregates collapse the entire table.

---

## K — Key Concepts

```sql
-- ─── Whole-table aggregation — no GROUP BY, returns one row
SELECT
  COUNT(*)              AS total_orders,
  COUNT(DISTINCT customer_id) AS unique_customers,
  SUM(total)            AS revenue,
  AVG(total)            AS avg_order_value,
  MIN(total)            AS smallest_order,
  MAX(total)            AS largest_order,
  ROUND(AVG(total), 2)  AS avg_rounded
FROM orders;

-- total_orders | unique_customers | revenue | avg_order_value | smallest | largest
-- -------------+-----------------+---------+-----------------+----------+--------
--            4 |               3 |  278.95 |           69.74 |     8.99 | 179.98
```

```sql
-- ─── COUNT variations — the most nuanced aggregate

-- COUNT(*) — counts ALL rows including NULLs
SELECT COUNT(*) FROM orders;   -- 4 (counts every row)

-- COUNT(column) — counts non-NULL values in that column
SELECT COUNT(customer_id) FROM orders;   -- 4 (no NULLs here)

-- With nullable column:
SELECT COUNT(manager_id) FROM employees;  -- 4 (Alice CEO has NULL manager_id, excluded)
SELECT COUNT(*) FROM employees;           -- 5 (all rows)

-- COUNT(DISTINCT column) — counts unique non-NULL values
SELECT COUNT(DISTINCT customer_id) FROM orders;  -- 3 (customers 1,2,3 — not 4)
SELECT COUNT(DISTINCT status)      FROM orders;  -- 3 (pending, delivered, cancelled)
```

```sql
-- ─── SUM, AVG, MIN, MAX with NULLs
SELECT
  SUM(total)   FROM orders;  -- sums only non-NULL totals (all are non-null here)
  AVG(total)   FROM orders;  -- average of non-NULL values
  MIN(ordered_at) FROM orders;  -- earliest order date
  MAX(ordered_at) FROM orders;  -- latest order date

-- NULL-safe aggregation — use COALESCE when NULLs should count as 0
SELECT AVG(COALESCE(score, 0)) FROM exam_results;  -- treat NULL score as 0 in average
-- vs
SELECT AVG(score) FROM exam_results;  -- NULLs excluded — may produce higher average
```

```sql
-- ─── String aggregation — aggregate text values
SELECT
  customer_id,
  STRING_AGG(status, ', ' ORDER BY ordered_at) AS status_history
FROM orders
GROUP BY customer_id;

-- customer_id | status_history
-- -----------+----------------------
--           1 | delivered, pending
--           2 | delivered
--           3 | cancelled

-- ARRAY_AGG — aggregate into an array
SELECT
  customer_id,
  ARRAY_AGG(id ORDER BY ordered_at) AS order_ids
FROM orders
GROUP BY customer_id;
-- customer_id | order_ids
-- -----------+-----------
--           1 | {1,2}
--           2 | {3}
--           3 | {4}
```

```sql
-- ─── Statistical aggregates
SELECT
  STDDEV(total)        AS std_deviation,
  VARIANCE(total)      AS variance,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) AS median,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total) AS p90
FROM orders;

-- ─── FILTER — conditional aggregation (aggregate only matching rows)
SELECT
  COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered_count,
  COUNT(*) FILTER (WHERE status = 'pending')    AS pending_count,
  COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled_count,
  SUM(total) FILTER (WHERE status = 'delivered') AS delivered_revenue
FROM orders;

-- delivered_count | pending_count | cancelled_count | delivered_revenue
-- ----------------+---------------+-----------------+------------------
--               2 |             1 |               1 |            188.97
-- One query, four conditional aggregations — no CASE needed ✅
```

---

## W — Why It Matters

- `COUNT(column)` vs `COUNT(*)` is a source of real bugs — `COUNT(manager_id)` excludes the CEO row because her `manager_id` is `NULL`. When you want "how many rows", use `COUNT(*)`. When you want "how many rows where this column has a value", use `COUNT(column_name)`.
- `FILTER (WHERE condition)` is the modern, clean way to do conditional aggregation — computing "delivered vs pending vs cancelled orders in one query" without pivoting or using `CASE WHEN ... THEN 1 END` inside `SUM`.
- `PERCENTILE_CONT(0.5)` for median is the correct approach — `AVG` is heavily skewed by outliers in order values, support ticket response times, etc. Interviewers ask why you chose `AVG` vs median for business metrics.

---

## I — Interview Q&A

### Q: What is the difference between `COUNT(*)`, `COUNT(column)`, and `COUNT(DISTINCT column)`?

**A:** `COUNT(*)` counts every row in the group, including rows with `NULL` values in any column. `COUNT(column)` counts only the rows where that specific column is not `NULL` — rows where the column is `NULL` are excluded from the count. `COUNT(DISTINCT column)` counts the number of unique non-`NULL` values in the column — if three rows have `status = 'delivered'` and two have `status = 'pending'`, `COUNT(DISTINCT status)` returns `2`, not `5`. Use `COUNT(*)` to count rows, `COUNT(column)` to count populated values, and `COUNT(DISTINCT column)` to count unique values.

---

## C — Common Pitfalls + Fix

### ❌ Using `AVG` for a metric where median is more appropriate

```sql
-- ❌ AVG heavily skewed by outlier orders of $10,000
SELECT AVG(total) AS avg_order FROM orders;
-- Result: $2,034 — but 90% of orders are under $100. Misleading ❌
```

**Fix:** Report both, or use percentile:

```sql
-- ✅ More informative
SELECT
  ROUND(AVG(total), 2)                                       AS mean_order,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total)         AS median_order,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total)         AS p90_order
FROM orders;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a single query (no GROUP BY yet) against the `orders` table that returns: total order count, count of distinct customers, total revenue, average order value (rounded to 2dp), min and max order totals, count of delivered orders (using `FILTER`), and revenue from delivered orders only (using `FILTER`).

### Solution

```sql
SELECT
  COUNT(*)                                                    AS total_orders,
  COUNT(DISTINCT customer_id)                                 AS unique_customers,
  ROUND(SUM(total), 2)                                        AS total_revenue,
  ROUND(AVG(total), 2)                                        AS avg_order_value,
  MIN(total)                                                  AS min_order,
  MAX(total)                                                  AS max_order,
  COUNT(*)   FILTER (WHERE status = 'delivered')              AS delivered_orders,
  ROUND(SUM(total) FILTER (WHERE status = 'delivered'), 2)    AS delivered_revenue
FROM orders;

-- total_orders | unique_customers | total_revenue | avg_order_value | min_order | max_order | delivered_orders | delivered_revenue
-- -------------+-----------------+---------------+-----------------+-----------+-----------+------------------+------------------
--            4 |               3 |        278.95 |           69.74 |      8.99 |    179.98 |                2 |            188.97
```

---

---
