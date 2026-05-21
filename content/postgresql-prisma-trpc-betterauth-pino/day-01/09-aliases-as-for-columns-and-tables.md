# 9 — Aliases — AS for Columns and Tables

---

## T — TL;DR

`AS` gives a temporary name to a column expression or table. Column aliases make output readable and allow `ORDER BY` to reference computed expressions by name. Table aliases shorten long table names and are **required** for self-joins and subqueries. The `AS` keyword is optional — but always use it for clarity.

---

## K — Key Concepts

```sql
-- ─── Column aliases
-- Rename a column in the output
SELECT
  first_name      AS given_name,
  last_name       AS family_name,
  salary          AS base_salary
FROM employees;

-- Alias a computed expression
SELECT
  first_name || ' ' || last_name AS full_name,
  salary * 12                    AS annual_salary,
  salary / 1000                  AS salary_k,
  UPPER(department)              AS dept_label
FROM employees;

-- AS is optional (but use it for readability)
SELECT salary * 12 annual_salary FROM employees;  -- works, but harder to read
SELECT salary * 12 AS annual_salary FROM employees;  -- clearer ✅
```

```sql
-- ─── Quoting aliases — when to use double quotes
-- Unquoted aliases: lowercase, no spaces, no special chars
SELECT salary AS annual_salary    -- ✅ stored as lowercase

-- Quoted aliases: preserve case and allow spaces/special chars
SELECT salary AS "Annual Salary"   -- column header: "Annual Salary"
SELECT salary AS "Annual_Salary_$" -- special chars allowed with quotes

-- Convention: use lowercase_with_underscores (no quotes needed)
SELECT salary AS annual_salary     -- ✅ preferred
```

```sql
-- ─── Table aliases
-- Long table name
SELECT e.first_name, e.last_name, e.salary
FROM employees AS e;

-- Table alias without AS (common convention)
SELECT e.first_name, e.salary
FROM employees e;  -- AS is optional

-- Qualify column names with table alias (prevents ambiguity)
SELECT
  e.first_name,
  e.salary
FROM employees AS e
WHERE e.salary > 70000;

-- Without table aliases — works for single table, required for joins
SELECT first_name, salary FROM employees WHERE salary > 70000;
```

```sql
-- ─── When table aliases are REQUIRED

-- 1. Subqueries — the subquery must have an alias
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary
  FROM employees
) AS e_annual          -- ← REQUIRED for subquery
WHERE e_annual.annual_salary > 900000;

-- 2. Self-joins — distinguishing the two references to the same table
SELECT
  e1.first_name AS employee,
  e2.first_name AS manager
FROM employees AS e1
JOIN employees AS e2 ON e1.manager_id = e2.id;
-- Without aliases, e1 and e2 are indistinguishable ❌
```

```sql
-- ─── Alias scope reminder — only in ORDER BY, not WHERE
SELECT salary * 12 AS annual_salary
FROM employees
WHERE annual_salary > 900000;   -- ❌ alias not in scope for WHERE
-- Fix: WHERE salary * 12 > 900000

SELECT salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;    -- ✅ alias in scope for ORDER BY
```

---

## W — Why It Matters

- Table aliases are mandatory in joins — when two tables have a column with the same name (`id`, `created_at`), PostgreSQL needs the alias prefix to know which table's column you mean. Qualifying with table aliases in all joins is a professional habit.
- Subquery aliases are syntactically required — every subquery in `FROM` must have a name so the outer query can reference its columns. This is a hard SQL rule, not a preference.
- Column aliases in `ORDER BY` allow referencing computed columns by meaningful names — cleaner than repeating the expression, and the computation runs only once.

---

## I — Interview Q&A

### Q: When is a table alias required (not just convenient) in PostgreSQL?

**A:** Two cases where aliases are required. First, in `FROM` subqueries — `SELECT * FROM (SELECT ... FROM table) AS alias WHERE ...`. The `AS alias` is syntactically required; PostgreSQL cannot reference a subquery without a name. Second, in self-joins — when the same table appears twice in a query, two different aliases are required to distinguish the two references: `FROM employees AS e1 JOIN employees AS e2 ON e1.manager_id = e2.id`. Without separate aliases, there's no way to specify which copy of the table a column belongs to.

---

## C — Common Pitfalls + Fix

### ❌ Subquery without alias — syntax error

```sql
-- ❌ Subquery in FROM has no alias — syntax error
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary FROM employees
)
WHERE annual_salary > 900000;
-- ERROR: subquery in FROM must have an alias
```

**Fix:** Always alias subqueries in FROM:

```sql
-- ✅
SELECT * FROM (
  SELECT first_name, salary * 12 AS annual_salary FROM employees
) AS emp_annual
WHERE annual_salary > 900000;
```

### ❌ Using SELECT alias in WHERE clause

```sql
-- ❌ Alias not yet defined when WHERE evaluates
SELECT salary * 12 AS annual_salary FROM employees
WHERE annual_salary > 900000;  -- ERROR or no results ❌
```

**Fix:**

```sql
-- ✅ Repeat the expression in WHERE
SELECT salary * 12 AS annual_salary FROM employees
WHERE salary * 12 > 900000;

-- ✅ Or use a subquery
SELECT * FROM (
  SELECT salary * 12 AS annual_salary FROM employees
) AS s
WHERE s.annual_salary > 900000;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query using both column aliases and table aliases: use `e` as the table alias for employees, compute `full_name`, `monthly_salary`, `annual_salary`, and `seniority_years` (whole years since hire). Filter to employees with annual salary > 800,000. Sort by `seniority_years` descending. Use the aliases in ORDER BY.

### Solution

```sql
SELECT
  e.first_name || ' ' || e.last_name               AS full_name,
  e.department,
  ROUND(e.salary, 2)                                AS monthly_salary,
  ROUND(e.salary * 12, 2)                           AS annual_salary,
  DATE_PART('year', AGE(e.hire_date))::INT          AS seniority_years
FROM employees AS e
WHERE e.salary * 12 > 800000          -- use expression, not alias (WHERE runs before SELECT)
ORDER BY seniority_years DESC;        -- alias works in ORDER BY ✅

--   full_name      | department  | monthly_salary | annual_salary | seniority_years
-- -----------------+-------------+----------------+---------------+-----------------
--  Priya Sharma    | Engineering |       91000.00 |   1092000.00  |               4
--  Sarah Chen      | Engineering |       82000.00 |    984000.00  |               3
--  Mark Austin     | Engineering |       75000.00 |    900000.00  |               3
--  Carlos Mendez   | Marketing   |       70000.00 |    840000.00  |               2
```

---

## ✅ Day 1 Complete — PostgreSQL Foundation

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Install and Connect | ☐ |
| 2 | Databases and Schemas | ☐ |
| 3 | Tables — Structure and Data Types | ☐ |
| 4 | Rows — INSERT, UPDATE, DELETE | ☐ |
| 5 | SQL Workflow — Execution Order | ☐ |
| 6 | Basic SELECT | ☐ |
| 7 | Filtering with WHERE | ☐ |
| 8 | Sorting with ORDER BY | ☐ |
| 9 | Aliases — AS for Columns and Tables | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
HIERARCHY
  Server → Database → Schema → Table → Row → Column
  Databases: isolated (can't join across)
  Schemas:   namespaces (can join across in same DB)
  public:    default schema — tables go here unless specified

PSQL ESSENTIALS
  psql -h host -p 5432 -U user -d database
  \l     list databases     \c dbname  connect
  \dt    list tables        \d table   describe table
  \dn    list schemas       \q         quit
  \i file.sql               execute SQL file

DATA TYPES (choose precisely)
  Integers:   INT, BIGINT, SERIAL, BIGSERIAL
  Text:       TEXT (preferred), VARCHAR(n) (length constraint only)
  Decimal:    NUMERIC(p,s) for money — never FLOAT
  Boolean:    BOOLEAN
  Datetime:   TIMESTAMPTZ (always) — never bare TIMESTAMP
  JSON:       JSONB (indexable) > JSON
  PK pattern: id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY

CONSTRAINTS
  PRIMARY KEY    NOT NULL + UNIQUE (one per table)
  NOT NULL       column must have a value
  UNIQUE         all values distinct
  CHECK(expr)    custom validation
  REFERENCES     foreign key (value must exist elsewhere)
  DEFAULT val    value when INSERT omits column

DML
  INSERT INTO t (cols) VALUES (...) RETURNING id;
  UPDATE t SET col = val WHERE condition RETURNING *;
  DELETE FROM t WHERE condition RETURNING *;
  ALWAYS use WHERE with UPDATE/DELETE
  SELECT before UPDATE/DELETE to verify affected rows

SQL EVALUATION ORDER (not writing order)
  1 FROM      2 WHERE     3 GROUP BY
  4 HAVING    5 SELECT    6 DISTINCT
  7 ORDER BY  8 LIMIT

  Alias defined in SELECT (5) → usable in ORDER BY (7)
  Alias NOT usable in WHERE (2) — runs before SELECT
  Aggregate NOT usable in WHERE — use HAVING

SELECT PATTERNS
  SELECT col1, col2                  specific columns
  SELECT t.col1, t.col2             table-qualified
  SELECT expr AS alias              computed column
  SELECT DISTINCT col               deduplicate
  || for concat  COALESCE for null  UPPER/LOWER/LENGTH

WHERE OPERATORS
  =  !=  <  >  <=  >=               comparison
  AND  OR  NOT                       logic
  IN ('a','b')   NOT IN (...)        list match
  BETWEEN a AND b                    inclusive range
  LIKE 'A%'   ILIKE (case-insensitive)  pattern
  IS NULL   IS NOT NULL              null checks
  = NULL → never works (returns NULL, not true)

ORDER BY
  ORDER BY col ASC              ascending (default)
  ORDER BY col DESC             descending
  ORDER BY col1 ASC, col2 DESC  multi-column
  NULLS FIRST / NULLS LAST      explicit null position
  Always use ORDER BY with LIMIT

ALIASES
  SELECT expr AS alias          column alias
  FROM table AS t               table alias (AS optional)
  Subquery MUST have alias:     (SELECT ...) AS sub
  Self-join MUST use aliases:   t1 JOIN t1 AS t2 ...
```

> **Your next action:** Open `psql`, connect to any database, and run this one query:
>
> ```sql
> SELECT current_database(), current_user, now()::DATE AS today;
> ```
>
> If you see a result row, you have a working PostgreSQL setup. That's all you need to start Day 1.
>
> *Doing one small thing beats opening a feed.*
