# 8 — Sorting with ORDER BY

---

## T — TL;DR

`ORDER BY` sorts the result set. Specify one or more columns, each with `ASC` (default) or `DESC`. Sorting happens after `SELECT`, so you can use column aliases. NULL sorting is configurable with `NULLS FIRST` / `NULLS LAST`.

---

## K — Key Concepts

```sql
-- ─── Basic ORDER BY
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary;          -- ASC by default (lowest first)

SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC;     -- highest first

-- ─── Sort by multiple columns
-- Primary sort: department A→Z
-- Secondary sort: within each department, salary highest first
SELECT first_name, last_name, department, salary
FROM employees
ORDER BY department ASC, salary DESC;

-- ─── Sort by column position (positional — use with caution)
SELECT first_name, last_name, salary
FROM employees
ORDER BY 3 DESC;  -- column 3 = salary  (fragile — avoid in production)
```

```sql
-- ─── Sort using SELECT alias (works because ORDER BY runs after SELECT)
SELECT
  first_name || ' ' || last_name AS full_name,
  salary * 12                     AS annual_salary
FROM employees
ORDER BY annual_salary DESC;  -- ✅ alias works in ORDER BY

-- ─── Sort by expression (without alias)
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary * 12 DESC;    -- sort by computed value
```

```sql
-- ─── NULL handling in ORDER BY
-- By default: NULLs appear LAST for ASC, FIRST for DESC
-- Override explicitly:

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id ASC NULLS LAST;   -- NULLs at end when sorting ascending

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id ASC NULLS FIRST;  -- NULLs at beginning when sorting ascending

SELECT first_name, manager_id
FROM employees
ORDER BY manager_id DESC NULLS LAST;  -- NULLs at end when sorting descending
```

```sql
-- ─── LIMIT and OFFSET with ORDER BY
-- Top 3 highest earners
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 3;

-- Pagination: page 2 (rows 4-6), 3 per page
SELECT first_name, last_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 3 OFFSET 3;

-- ⚠️ OFFSET pagination gets slow on large tables (scans and discards rows)
-- Better: cursor-based pagination (WHERE id > last_seen_id LIMIT n)
```

---

## W — Why It Matters

- Database result order is **not guaranteed** unless you explicitly specify `ORDER BY`. Different queries, different server load, different execution plans — the same table can return rows in different order. Never rely on implicit ordering.
- `NULLS FIRST` / `NULLS LAST` matters for UIs that show sorted lists — without explicit NULL handling, NULL values appear at the top of `DESC` sorted lists (e.g. "date modified" columns), which is usually wrong for user-facing apps.
- `LIMIT` without `ORDER BY` is meaningless — you get an arbitrary subset of rows. Always combine `LIMIT` with `ORDER BY` for deterministic pagination.

---

## I — Interview Q&A

### Q: Why should you always use ORDER BY when using LIMIT?

**A:** Without `ORDER BY`, the database returns rows in any order — the order depends on physical storage, index scans, parallel execution, and other non-deterministic factors. Using `LIMIT` without `ORDER BY` gives you an arbitrary subset with no guarantee about which rows you get. On the next query execution, you might get different rows. For pagination, leaderboards, "most recent", or "top N" queries, `ORDER BY` is required to make the `LIMIT` result meaningful and reproducible.

---

## C — Common Pitfalls + Fix

### ❌ Using positional ORDER BY that breaks on column changes

```sql
-- ❌ Fragile — if columns are reordered in SELECT, sort changes silently
SELECT first_name, salary, department FROM employees ORDER BY 2 DESC;
-- If someone changes SELECT to: first_name, department, salary
-- ORDER BY 2 now sorts by department, not salary — silent bug ❌
```

**Fix:** Use column names or aliases:

```sql
-- ✅
SELECT first_name, salary, department FROM employees ORDER BY salary DESC;
```

---

## K — Coding Challenge + Solution

### Challenge

Write three ORDER BY queries: (1) all employees sorted by department A→Z, then by hire_date newest first within each department; (2) top 2 earners with full name and salary; (3) all employees sorted by annual salary descending using a SELECT alias.

### Solution

```sql
-- 1. By department ASC, then hire_date newest first
SELECT first_name, last_name, department, hire_date
FROM employees
ORDER BY department ASC, hire_date DESC;

-- 2. Top 2 earners
SELECT first_name || ' ' || last_name AS full_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 2;
-- Priya Sharma  91000
-- Sarah Chen    82000

-- 3. Sort by annual_salary alias
SELECT
  first_name,
  last_name,
  salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;
-- Priya Sharma    1092000
-- Sarah Chen       984000
-- Mark Austin      900000
-- Carlos Mendez    840000
-- James Rivera     780000
```

---

---
