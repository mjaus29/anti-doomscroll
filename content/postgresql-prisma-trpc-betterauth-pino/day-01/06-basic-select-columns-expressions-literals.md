# 6 — Basic SELECT — Columns, Expressions, Literals

---

## T — TL;DR

`SELECT` retrieves data. You can select specific columns, compute expressions, concatenate strings, use math, cast types, and include literal values — all in the column list. `SELECT *` is convenient but fragile in production code.

---

## K — Key Concepts

```sql
-- ─── Sample data setup
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  salary     NUMERIC(10,2) NOT NULL,
  department TEXT NOT NULL,
  hire_date  DATE NOT NULL
);

INSERT INTO employees (first_name, last_name, salary, department, hire_date)
VALUES
  ('Mark',   'Austin',   75000, 'Engineering', '2022-03-15'),
  ('Sarah',  'Chen',     82000, 'Engineering', '2021-07-01'),
  ('James',  'Rivera',   65000, 'Marketing',   '2023-01-20'),
  ('Priya',  'Sharma',   91000, 'Engineering', '2020-11-10'),
  ('Carlos', 'Mendez',   70000, 'Marketing',   '2022-08-05');
```

```sql
-- ─── SELECT all columns
SELECT * FROM employees;
-- Returns every column — convenient but fragile
-- Avoid in production: schema changes break dependent code

-- ─── SELECT specific columns
SELECT first_name, last_name, salary
FROM employees;

-- ─── Column expressions — compute values in SELECT
SELECT
  first_name,
  last_name,
  salary,
  salary * 12             AS annual_salary,     -- arithmetic
  salary * 0.10           AS bonus_estimate,    -- percentage
  salary * 1.05           AS salary_with_raise  -- 5% raise
FROM employees;
```

```sql
-- ─── String operations
SELECT
  first_name || ' ' || last_name    AS full_name,       -- concatenation
  UPPER(first_name)                 AS name_upper,      -- uppercase
  LOWER(last_name)                  AS name_lower,      -- lowercase
  LENGTH(first_name)                AS name_length,     -- string length
  LEFT(department, 3)               AS dept_code        -- first 3 chars
FROM employees;

-- CONCAT function (handles NULLs differently from ||)
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM employees;
-- || returns NULL if any operand is NULL
-- CONCAT skips NULLs (treats as empty string)
```

```sql
-- ─── Numeric functions
SELECT
  salary,
  ROUND(salary / 12, 2)   AS monthly_salary,   -- round to 2 decimal places
  CEIL(salary / 1000)     AS salary_thousands,  -- ceiling
  FLOOR(salary / 1000)    AS salary_floor,      -- floor
  ABS(salary - 75000)     AS diff_from_75k      -- absolute value
FROM employees;
```

```sql
-- ─── Date expressions
SELECT
  first_name,
  hire_date,
  EXTRACT(YEAR FROM hire_date)    AS hire_year,
  EXTRACT(MONTH FROM hire_date)   AS hire_month,
  now()::DATE - hire_date         AS days_employed,
  now()::DATE                     AS today
FROM employees;
```

```sql
-- ─── Literal values and constants in SELECT
SELECT
  first_name,
  'Active'        AS status,         -- literal string
  42              AS magic_number,   -- literal integer
  true            AS flag,           -- literal boolean
  now()           AS query_time      -- function call
FROM employees;

-- ─── DISTINCT — deduplicate results
SELECT DISTINCT department FROM employees;
-- Engineering
-- Marketing
```

---

## W — Why It Matters

- `SELECT *` is dangerous in production — if a table gains a new column (e.g. a large JSONB blob or a binary column), `SELECT *` returns it in every query, bloating network traffic and breaking strongly-typed code that expects a fixed column count.
- Expressions in `SELECT` perform computation at the database layer, not the application layer — `salary * 12` in SQL means one arithmetic operation per row in the database, not N multiplications in JavaScript after fetching raw salary values.
- Understanding `||` vs `CONCAT` for string concatenation prevents silent NULL bugs — `'Hello' || NULL` returns `NULL`, while `CONCAT('Hello', NULL)` returns `'Hello'`.

---

## I — Interview Q&A

### Q: Why is `SELECT *` considered bad practice in production queries?

**A:** Three reasons. First, schema brittleness — if a column is added, renamed, or dropped, all `SELECT *` queries silently change what they return, potentially breaking downstream code. Second, performance — `SELECT *` returns every column including potentially large JSONB, TEXT, or BYTEA columns that your query doesn't need, wasting I/O and network bandwidth. Third, readability — explicit column names serve as documentation of what the query uses. The one exception where `SELECT *` is acceptable is exploratory queries in `psql` during development.

---

## C — Common Pitfalls + Fix

### ❌ String concatenation with `||` when values might be NULL

```sql
-- ❌ If middle_name is NULL, full_name is NULL
SELECT first_name || ' ' || middle_name || ' ' || last_name AS full_name
FROM employees;
-- Returns NULL for any employee without a middle_name ❌
```

**Fix:** Use `CONCAT` or `COALESCE`:

```sql
-- ✅ CONCAT skips NULLs
SELECT CONCAT(first_name, ' ', middle_name, ' ', last_name) AS full_name
FROM employees;

-- ✅ COALESCE provides a fallback
SELECT first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name AS full_name
FROM employees;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a single SELECT query that returns: full name (first + last concatenated), department in uppercase, annual salary (monthly × 12), a `salary_band` literal based on nothing (just practice literals — use `'standard'`), years since hire (rounded to 1 decimal), and the query run date.

### Solution

```sql
SELECT
  first_name || ' ' || last_name             AS full_name,
  UPPER(department)                          AS department,
  salary * 12                                AS annual_salary,
  ROUND(salary * 12 / 1000, 1)              AS annual_k,
  'standard'                                 AS salary_band,
  ROUND(
    EXTRACT(EPOCH FROM (now() - hire_date::TIMESTAMPTZ))
    / (365.25 * 86400), 1
  )                                          AS years_employed,
  now()::DATE                                AS query_date
FROM employees
ORDER BY annual_salary DESC;

--   full_name     | department  | annual_salary | annual_k | salary_band | years_employed | query_date
-- ----------------+-------------+---------------+----------+-------------+----------------+------------
--  Priya Sharma   | ENGINEERING |    1092000.00 |   1092.0 | standard    |            4.6 | 2025-06-15
--  Sarah Chen     | ENGINEERING |     984000.00 |    984.0 | standard    |            3.9 | 2025-06-15
--  ...
```

---

---
