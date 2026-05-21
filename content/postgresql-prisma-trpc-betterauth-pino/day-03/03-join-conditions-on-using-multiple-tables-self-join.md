# 3 — Join Conditions — ON, USING, Multiple Tables, Self-Join

---

## T — TL;DR

`ON` is the standard join condition — it accepts any boolean expression. `USING(column)` is shorthand when both tables share the same column name. Joining three or more tables chains `JOIN` clauses sequentially. A **self-join** joins a table to itself using different aliases — used for hierarchical data (manager/employee) and finding related rows in the same table.

---

## K — Key Concepts

```sql
-- ─── ON clause — any boolean expression
JOIN orders AS o ON o.customer_id = c.id

-- Multiple conditions in ON
JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'

-- Non-equi join (range or inequality condition)
JOIN discounts AS d ON o.total BETWEEN d.min_amount AND d.max_amount

-- ─── USING(column) — shorthand for same-column-name equi-joins
-- Requires: both tables have a column with the exact same name

-- Instead of:
JOIN orders AS o ON o.customer_id = customers.id
-- Use USING when FK is named identically to the PK:
-- (only works when orders.customer_id doesn't exist — needs matching names)

-- More commonly: USING works cleanly on junction tables
SELECT * FROM orders JOIN order_items USING (order_id);
-- Both tables have order_id: USING(order_id) = ON orders.id = order_items.order_id
-- USING produces only ONE output column (not two copies)
```

```sql
-- ─── Multi-table joins — chaining
-- Each JOIN extends the "virtual table" built so far
SELECT
  c.name                              AS customer,
  o.id                                AS order_id,
  STRING_AGG(p.name, ', ')           AS products_ordered,
  SUM(oi.quantity * oi.unit_price)   AS order_total
FROM customers   AS c
JOIN orders      AS o  ON o.customer_id   = c.id
JOIN order_items AS oi ON oi.order_id     = o.id
JOIN products    AS p  ON p.id            = oi.product_id
WHERE o.status != 'cancelled'
GROUP BY c.name, o.id
ORDER BY c.name;

-- customer    | order_id | products_ordered                          | order_total
-- ------------+----------+-------------------------------------------+------------
-- Mark Austin |        1 | Mechanical Keyboard, Gaming Mouse         |      179.98
-- Mark Austin |        2 | Gaming Mouse                              |       49.99
-- Sarah Chen  |        3 | Notebook A5                               |        8.99
```

```sql
-- ─── Self-join — joining a table to itself
-- Use case 1: employee / manager hierarchy
CREATE TABLE employees (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT   NOT NULL,
  manager_id BIGINT REFERENCES employees(id)  -- self-referencing FK
);

INSERT INTO employees (name, manager_id) VALUES
  ('Alice CEO',    NULL),   -- id=1, no manager
  ('Bob VP',          1),   -- id=2, reports to Alice
  ('Carol Manager',   2),   -- id=3, reports to Bob
  ('Dave Dev',        3),   -- id=4, reports to Carol
  ('Eve Dev',         3);   -- id=5, reports to Carol

-- List employee + their direct manager
SELECT
  e.name        AS employee,
  m.name        AS manager
FROM employees AS e
LEFT JOIN employees AS m ON m.id = e.manager_id  -- LEFT: CEO (manager_id=NULL) still appears
ORDER BY m.name NULLS LAST, e.name;

-- employee       | manager
-- ---------------+----------------
-- Alice CEO      | NULL            ← CEO has no manager (LEFT JOIN keeps her)
-- Bob VP         | Alice CEO
-- Carol Manager  | Bob VP
-- Dave Dev       | Carol Manager
-- Eve Dev        | Carol Manager
```

```sql
-- ─── Self-join use case 2: find pairs with a shared attribute
-- "Which products are in the same category as another product?"
SELECT
  p1.name    AS product_a,
  p2.name    AS product_b,
  p1.category
FROM products AS p1
JOIN products AS p2
  ON p1.category = p2.category
  AND p1.id < p2.id   -- avoid (A,B) + (B,A) duplicates and (A,A) self-match
ORDER BY p1.category, p1.name;

-- product_a            | product_b  | category
-- ---------------------+------------+-------------
-- Gaming Mouse         | USB-C Hub  | Electronics
-- Gaming Mouse         | Mechanical Keyboard | Electronics
-- Mechanical Keyboard  | USB-C Hub  | Electronics
```

```sql
-- ─── CROSS JOIN — cartesian product (every row × every row)
-- Rarely needed; useful for generating combinations
SELECT a.val, b.val
FROM (VALUES (1),(2),(3)) AS a(val)
CROSS JOIN (VALUES ('x'),('y')) AS b(val);
-- 3 × 2 = 6 rows: (1,x),(1,y),(2,x),(2,y),(3,x),(3,y)

-- Practical use: generate a date series × a list of categories for a report
-- (LEFT JOIN data onto the cartesian product to fill gaps with 0s)
```

---

## W — Why It Matters

- `USING(column)` produces a single output column for the joined field (unlike `ON` which keeps both), which avoids duplicate column names in `SELECT *` results — useful in ORMs that generate column maps from result metadata.
- Self-joins are the only way to query hierarchical data (org charts, category trees, threaded comments) in plain SQL without recursive CTEs. Understanding the alias pattern (`AS e LEFT JOIN employees AS m`) is fundamental.
- `AND` conditions in `ON` (not `WHERE`) for `LEFT JOIN` filtering is a critical distinction — conditions in `ON` filter which rows from the right table to join, while conditions in `WHERE` filter the final result and break the outer join behaviour.

---

## I — Interview Q&A

### Q: What is the difference between putting a filter condition in `ON` versus `WHERE` in a `LEFT JOIN`?

**A:** In a `LEFT JOIN`, a condition in `ON` is evaluated during the join — it determines which right-table rows match. Rows that don't match the `ON` condition still appear in the result with `NULL` right-side columns. A condition in `WHERE` is evaluated after the join — it filters the final result set, including `NULL` rows produced by the left join. Adding `WHERE right_table.column = 'value'` after a `LEFT JOIN` eliminates all `NULL` rows (converting the outer join back to an inner join effectively). To keep all left rows while filtering which right rows to include, put the filter in `ON`, not `WHERE`.

---

## C — Common Pitfalls + Fix

### ❌ Using `p1.id != p2.id` in self-join — returns duplicate pairs

```sql
-- ❌ Returns both (A,B) and (B,A) — duplicated pairs
SELECT p1.name, p2.name
FROM products p1
JOIN products p2 ON p1.category = p2.category AND p1.id != p2.id;
```

**Fix:** Use `p1.id < p2.id` — only keeps the pair once:

```sql
-- ✅ Each unordered pair appears exactly once
SELECT p1.name, p2.name
FROM products p1
JOIN products p2 ON p1.category = p2.category AND p1.id < p2.id;
```

---

## K — Coding Challenge + Solution

### Challenge

Using the employees self-referencing table, write a query that shows each employee, their direct manager, and their manager's manager (grandmanager). Employees with no manager or no grandmanager should still appear (use LEFT JOINs). Include a computed `depth` column: 0 = CEO, 1 = direct reports, 2 = two levels down.

### Solution

```sql
SELECT
  e.name                              AS employee,
  m.name                              AS manager,
  gm.name                             AS grandmanager,
  CASE
    WHEN e.manager_id IS NULL THEN 0
    WHEN m.manager_id IS NULL THEN 1
    ELSE 2
  END                                 AS depth
FROM employees AS e
LEFT JOIN employees AS m  ON m.id  = e.manager_id
LEFT JOIN employees AS gm ON gm.id = m.manager_id
ORDER BY depth, e.name;

-- employee       | manager       | grandmanager | depth
-- ---------------+---------------+--------------+-------
-- Alice CEO      | NULL          | NULL         |     0
-- Bob VP         | Alice CEO     | NULL         |     1
-- Carol Manager  | Bob VP        | Alice CEO    |     2
-- Dave Dev       | Carol Manager | Bob VP       |     2
-- Eve Dev        | Carol Manager | Bob VP       |     2
```

---

---
