# 7 — Filtering with WHERE — Conditions and Operators

---

## T — TL;DR

`WHERE` filters rows before they reach `SELECT`. It uses conditions — comparisons, logic operators, range checks, pattern matching, and NULL checks. Combine conditions with `AND` / `OR`. Each operator has precise semantics — especially `NULL` comparisons which require `IS NULL`, not `= NULL`.

---

## K — Key Concepts

```sql
-- ─── Comparison operators
SELECT * FROM employees WHERE salary > 75000;
SELECT * FROM employees WHERE salary >= 80000;
SELECT * FROM employees WHERE salary < 70000;
SELECT * FROM employees WHERE salary = 75000;
SELECT * FROM employees WHERE salary != 75000;   -- not equal
SELECT * FROM employees WHERE salary <> 75000;   -- same as !=

-- ─── Logical operators: AND, OR, NOT
-- AND: both conditions must be true
SELECT * FROM employees
WHERE department = 'Engineering' AND salary > 80000;

-- OR: at least one condition must be true
SELECT * FROM employees
WHERE department = 'Marketing' OR salary > 90000;

-- NOT: inverts condition
SELECT * FROM employees
WHERE NOT department = 'Marketing';

-- Combine with parentheses — control precedence
SELECT * FROM employees
WHERE (department = 'Engineering' OR department = 'Marketing')
  AND salary > 70000;
```

```sql
-- ─── IN — match against a list of values
SELECT * FROM employees
WHERE department IN ('Engineering', 'Marketing', 'Finance');

-- NOT IN
SELECT * FROM employees
WHERE department NOT IN ('HR', 'Legal');

-- ─── BETWEEN — inclusive range
SELECT * FROM employees
WHERE salary BETWEEN 70000 AND 85000;
-- Same as: salary >= 70000 AND salary <= 85000

SELECT * FROM employees
WHERE hire_date BETWEEN '2022-01-01' AND '2022-12-31';
```

```sql
-- ─── LIKE and ILIKE — pattern matching
-- % → any sequence of characters (including empty)
-- _ → exactly one character

SELECT * FROM employees WHERE last_name LIKE 'A%';      -- starts with A
SELECT * FROM employees WHERE last_name LIKE '%en';     -- ends with en
SELECT * FROM employees WHERE last_name LIKE '%i%';     -- contains i
SELECT * FROM employees WHERE first_name LIKE '_a%';    -- second char is a
SELECT * FROM employees WHERE first_name LIKE '__r%';   -- third char is r

-- ILIKE — case-insensitive LIKE (PostgreSQL extension)
SELECT * FROM employees WHERE department ILIKE 'engineering';
SELECT * FROM employees WHERE last_name ILIKE '%chen%';
```

```sql
-- ─── NULL handling — IS NULL / IS NOT NULL
-- ⚠️ NULL = NULL → NULL (not true!) — never use = NULL
SELECT * FROM employees WHERE manager_id = NULL;       -- ❌ returns nothing
SELECT * FROM employees WHERE manager_id IS NULL;      -- ✅ correct
SELECT * FROM employees WHERE manager_id IS NOT NULL;  -- ✅ correct

-- NULL in comparisons: NULL propagates
-- NULL = NULL    → NULL (unknown)
-- NULL != 'foo'  → NULL (unknown)
-- WHERE filters out NULL results — only true rows pass
```

```sql
-- ─── Complex WHERE examples
-- Employees hired in 2022 or 2023 with salary above median
SELECT first_name, last_name, hire_date, salary
FROM employees
WHERE hire_date >= '2022-01-01'
  AND hire_date < '2024-01-01'
  AND salary > 70000
ORDER BY hire_date;

-- Engineers or high earners, hired before 2023
SELECT first_name, last_name, department, salary
FROM employees
WHERE (department = 'Engineering' OR salary > 85000)
  AND hire_date < '2023-01-01';
```

---

## W — Why It Matters

- `IS NULL` vs `= NULL` is one of the most common SQL mistakes — `NULL` represents "unknown", so any comparison with `NULL` using `=`, `!=`, `>`, etc. returns `NULL` (not `true` or `false`). `WHERE` discards rows where the condition is `NULL`, so `WHERE col = NULL` returns zero rows even if the column contains NULLs.
- `ILIKE` is PostgreSQL-specific — it's `LIKE` without case sensitivity. For internationalized apps, use `LOWER(column) LIKE '%pattern%'` for portability.
- `IN (subquery)` is one of the most powerful forms of `IN` — covered in joins/subqueries day, but knowing basic `IN (value1, value2)` now makes complex queries approachable later.

---

## I — Interview Q&A

### Q: Why does `WHERE column = NULL` return no rows even when NULL values exist?

**A:** `NULL` in SQL means "unknown" — it's not a value, it's the absence of a value. Any comparison involving `NULL` using standard operators (`=`, `!=`, `<`, `>`) returns `NULL` (unknown), not `true` or `false`. The `WHERE` clause only passes rows where the condition evaluates to `true` — rows where the condition is `NULL` (unknown) are excluded. To check for NULL, use `IS NULL` or `IS NOT NULL`, which are special predicates designed specifically for NULL comparisons.

### Q: What is the difference between `IN` and multiple `OR` conditions?

**A:** They are semantically equivalent — `WHERE col IN ('a', 'b', 'c')` is the same as `WHERE col = 'a' OR col = 'b' OR col = 'c'`. `IN` is more readable for lists longer than two values. The query planner typically generates the same execution plan. The practical difference: `IN` with a subquery (`WHERE col IN (SELECT ...)`) is a fundamentally different operation — a semi-join — which is more powerful than any equivalent `OR` chain.

---

## C — Common Pitfalls + Fix

### ❌ Using `= NULL` instead of `IS NULL`

```sql
-- ❌ Returns zero rows — NULL = NULL is NULL, not TRUE
SELECT * FROM employees WHERE manager_id = NULL;
```

**Fix:**

```sql
-- ✅
SELECT * FROM employees WHERE manager_id IS NULL;
```

### ❌ `NOT IN` with a list containing NULL — silently returns no rows

```sql
-- ❌ If the list contains NULL, NOT IN never matches anything
SELECT * FROM employees
WHERE department NOT IN ('HR', NULL, 'Legal');
-- NOT IN with NULL → returns 0 rows (NULL poisons the entire IN check) ❌
```

**Fix:** Use `NOT IN` only with NULL-free lists, or use `NOT EXISTS`:

```sql
-- ✅ Remove NULLs from the list
SELECT * FROM employees
WHERE department NOT IN ('HR', 'Legal');
```

---

## K — Coding Challenge + Solution

### Challenge

Write 4 separate WHERE queries on the employees table: (1) employees in Engineering with salary over 80,000; (2) employees hired between 2021 and 2022 inclusive; (3) employees whose last name starts with any letter A-M (hint: use BETWEEN with letters); (4) employees NOT in Engineering or Marketing.

### Solution

```sql
-- 1. Engineering with salary > 80,000
SELECT first_name, last_name, department, salary
FROM employees
WHERE department = 'Engineering' AND salary > 80000;
-- Priya Sharma  Engineering  91000
-- Sarah Chen    Engineering  82000

-- 2. Hired between 2021 and 2022
SELECT first_name, last_name, hire_date
FROM employees
WHERE hire_date BETWEEN '2021-01-01' AND '2022-12-31';
-- Sarah Chen   2021-07-01
-- Mark Austin  2022-03-15
-- Carlos Mendez 2022-08-05

-- 3. Last name starts A–M (alphabetically)
SELECT first_name, last_name
FROM employees
WHERE last_name BETWEEN 'A' AND 'N';
-- (BETWEEN on text is alphabetical comparison)
-- Mark Austin, Sarah Chen, Carlos Mendez

-- 4. NOT in Engineering or Marketing
SELECT first_name, last_name, department
FROM employees
WHERE department NOT IN ('Engineering', 'Marketing');
-- (empty result with current data — no other departments)
```

---

---
