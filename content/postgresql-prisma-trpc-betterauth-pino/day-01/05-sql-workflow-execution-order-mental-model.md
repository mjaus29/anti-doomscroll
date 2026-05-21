# 5 — SQL Workflow — Execution Order Mental Model

---

## T — TL;DR

SQL is **declarative** — you describe what you want, not how to get it. The database engine decides execution order. But clauses are always **evaluated** in a fixed logical order: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. Writing order in SQL differs from evaluation order — this explains many "column alias not found" errors.

---

## K — Key Concepts

```sql
-- ─── Writing order (how you write SQL)
SELECT   columns
FROM     table
WHERE    condition
GROUP BY columns
HAVING   condition
ORDER BY columns
LIMIT    n;

-- ─── Evaluation order (how PostgreSQL executes it)
-- 1. FROM      — load the data source (table, join, subquery)
-- 2. WHERE     — filter rows before grouping
-- 3. GROUP BY  — group remaining rows
-- 4. HAVING    — filter groups (post-aggregation)
-- 5. SELECT    — compute output columns (aliases defined here)
-- 6. DISTINCT  — remove duplicate rows
-- 7. ORDER BY  — sort the result (can use SELECT aliases)
-- 8. LIMIT / OFFSET — truncate the result
```

```sql
-- ─── Why evaluation order matters

-- ❌ Using a SELECT alias in WHERE — fails because WHERE runs before SELECT
SELECT price * 0.9 AS discounted_price
FROM products
WHERE discounted_price < 50;  -- ERROR: column "discounted_price" does not exist
-- WHERE evaluates before SELECT, so alias doesn't exist yet

-- ✅ Fix: repeat the expression in WHERE
SELECT price * 0.9 AS discounted_price
FROM products
WHERE price * 0.9 < 50;

-- ✅ Fix: use a subquery or CTE
SELECT * FROM (
  SELECT *, price * 0.9 AS discounted_price FROM products
) AS p
WHERE discounted_price < 50;
```

```sql
-- ─── ORDER BY can use SELECT aliases (runs after SELECT)
SELECT price * 0.9 AS discounted_price
FROM products
ORDER BY discounted_price ASC;  -- ✅ works — ORDER BY runs after SELECT
```

```sql
-- ─── Full query execution walkthrough
SELECT
  category_id,
  COUNT(*)          AS product_count,
  AVG(price)        AS avg_price
FROM products          -- 1. FROM:    load products table
WHERE is_available     -- 2. WHERE:   keep only available products
GROUP BY category_id   -- 3. GROUP BY: group by category
HAVING COUNT(*) > 2    -- 4. HAVING:  keep groups with > 2 products
ORDER BY avg_price DESC -- 7. ORDER BY: sort by computed alias (runs after SELECT)
LIMIT 5;               -- 8. LIMIT:   take top 5

-- SELECT columns computed in step 5, after grouping
```

---

## W — Why It Matters

- The most common beginner SQL error is "column X does not exist" when referencing a `SELECT` alias in `WHERE` — it happens because evaluation order means the alias isn't defined yet when `WHERE` runs. Knowing the order explains the error and the fix.
- `HAVING` vs `WHERE` distinction: `WHERE` filters individual rows (before grouping), `HAVING` filters aggregated groups (after grouping). Putting aggregate conditions in `WHERE` causes an error; they must go in `HAVING`.
- Understanding that `FROM` runs first explains JOINs — you build the combined row set in `FROM`, then filter it in `WHERE`. The entire join result exists before any filtering happens.

---

## I — Interview Q&A

### Q: Why can't you use a SELECT alias in a WHERE clause?

**A:** Because `WHERE` is evaluated before `SELECT` in PostgreSQL's logical execution order. When the `WHERE` clause runs, only the raw table columns exist — no computed expressions, no aliases. The alias defined in `SELECT` doesn't become available until step 5, after filtering and grouping are complete. Solutions: repeat the expression in `WHERE`, use a subquery where the outer `WHERE` can reference the inner `SELECT` alias, or use a CTE.

### Q: What is the difference between WHERE and HAVING?

**A:** `WHERE` filters individual rows before grouping — it runs before `GROUP BY`. `HAVING` filters groups after aggregation — it runs after `GROUP BY` and can reference aggregate functions like `COUNT()`, `SUM()`, `AVG()`. You cannot use `COUNT(*)` in a `WHERE` clause. Use `WHERE` to pre-filter rows (e.g. `WHERE is_active = true`), and `HAVING` to post-filter aggregated groups (e.g. `HAVING COUNT(*) > 10`).

---

## C — Common Pitfalls + Fix

### ❌ Aggregate function in WHERE clause

```sql
-- ❌ Aggregate (COUNT) cannot be in WHERE
SELECT category_id, COUNT(*)
FROM products
WHERE COUNT(*) > 5   -- ERROR: aggregate functions not allowed in WHERE
GROUP BY category_id;
```

**Fix:** Move aggregate condition to HAVING:

```sql
-- ✅
SELECT category_id, COUNT(*)
FROM products
GROUP BY category_id
HAVING COUNT(*) > 5;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query that demonstrates all 8 evaluation steps: from a products table, keep only available products (WHERE), group by `is_available` (GROUP BY), keep groups with more than 1 product (HAVING), select group count and average price with aliases (SELECT), sort by average price descending (ORDER BY), limit to 3 results (LIMIT). Explain each clause's role in a comment.

### Solution

```sql
SELECT
  is_available,                     -- 5. SELECT: compute output columns
  COUNT(*)       AS product_count,  -- 5. aggregate, alias defined here
  AVG(price)     AS avg_price       -- 5. aggregate, alias defined here
FROM products                       -- 1. FROM:    load data source
WHERE price > 0                     -- 2. WHERE:   filter rows (pre-group)
GROUP BY is_available               -- 3. GROUP BY: form groups
HAVING COUNT(*) > 1                 -- 4. HAVING:  filter groups (post-aggregate)
ORDER BY avg_price DESC             -- 7. ORDER BY: sort — can use SELECT aliases
LIMIT 3;                            -- 8. LIMIT:   restrict result size

-- Note: avg_price alias works in ORDER BY (step 7) but NOT in WHERE (step 2)
```

---

---
