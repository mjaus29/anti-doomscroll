
# 📅 Day 3 — PostgreSQL Multi-Table Querying

> **Goal:** Combine data from multiple tables with JOINs, summarise data with aggregates and GROUP BY, filter groups with HAVING, power sub-queries, and package reusable logic into views and CTEs — the complete toolkit for real-world SQL queries.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** PostgreSQL 18 · psql CLI · standard SQL

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | INNER JOIN — Matching Rows Between Tables | 12 min |
| 2 | LEFT, RIGHT, and FULL JOIN — Including Non-Matching Rows | 12 min |
| 3 | Join Conditions — ON, USING, Multiple Tables, Self-Join | 12 min |
| 4 | Aggregate Functions — COUNT, SUM, AVG, MIN, MAX | 10 min |
| 5 | GROUP BY — Grouping Rows for Aggregation | 10 min |
| 6 | HAVING — Filtering Aggregated Groups | 8 min |
| 7 | Subqueries — Scalar, List, EXISTS, Correlated | 12 min |
| 8 | CTEs — WITH Clauses for Readable Multi-Step Queries | 12 min |
| 9 | Views — Reusable Query Logic as Named Objects | 10 min |

---

---

# 1 — INNER JOIN — Matching Rows Between Tables

---

## T — TL;DR

`INNER JOIN` returns only rows where the join condition is satisfied in **both** tables. If a row in the left table has no matching row in the right table (or vice versa), it is excluded from the result. It is the most common join and the default when you write `JOIN` without a qualifier.

---

## K — Key Concepts

```sql
-- ─── Sample schema used throughout Day 3
CREATE TABLE customers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT   NOT NULL,
  email      TEXT   NOT NULL UNIQUE,
  city       TEXT   NOT NULL
);

CREATE TABLE orders (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT         NOT NULL REFERENCES customers(id),
  status      TEXT           NOT NULL DEFAULT 'pending',
  total       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ordered_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

CREATE TABLE order_items (
  order_id   BIGINT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT        NOT NULL,
  quantity   INT           NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     TEXT          NOT NULL,
  category TEXT          NOT NULL,
  price    NUMERIC(10,2) NOT NULL
);

-- Seed data
INSERT INTO customers (name, email, city) VALUES
  ('Mark Austin',  'mark@example.com',  'Manila'),
  ('Sarah Chen',   'sarah@example.com', 'Singapore'),
  ('James Rivera', 'james@example.com', 'Manila'),
  ('Priya Sharma', 'priya@example.com', 'Mumbai');

INSERT INTO products (name, category, price) VALUES
  ('Mechanical Keyboard', 'Electronics', 129.99),
  ('Gaming Mouse',        'Electronics',  49.99),
  ('Notebook A5',         'Stationery',    8.99),
  ('USB-C Hub',           'Electronics',  39.99);

INSERT INTO orders (customer_id, status, total, ordered_at) VALUES
  (1, 'delivered', 179.98, now() - INTERVAL '10 days'),
  (1, 'pending',    49.99, now() - INTERVAL '2 days'),
  (2, 'delivered',   8.99, now() - INTERVAL '5 days'),
  (3, 'cancelled',  39.99, now() - INTERVAL '1 day');
-- Note: customer 4 (Priya) has NO orders

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 129.99),
  (1, 2, 1,  49.99),
  (2, 2, 1,  49.99),
  (3, 3, 1,   8.99),
  (4, 4, 1,  39.99);
```

```sql
-- ─── INNER JOIN syntax
SELECT
  c.name        AS customer_name,
  o.id          AS order_id,
  o.status,
  o.total
FROM customers AS c
INNER JOIN orders AS o ON o.customer_id = c.id;
-- or just: JOIN orders AS o ON ...  (INNER is the default)

-- Result: only customers who have at least one order
-- Priya (id=4) is excluded — no orders ← key INNER JOIN behaviour
-- customer_name  | order_id | status    | total
-- ---------------+----------+-----------+-------
-- Mark Austin    |        1 | delivered | 179.98
-- Mark Austin    |        2 | pending   |  49.99
-- Sarah Chen     |        3 | delivered |   8.99
-- James Rivera   |        4 | cancelled |  39.99
```

```sql
-- ─── INNER JOIN — reading the ON clause
-- ON o.customer_id = c.id
-- "keep only rows where the order's customer_id matches a customer's id"
-- One row per match — Mark appears twice (2 orders)

-- ─── Three-table INNER JOIN
SELECT
  c.name         AS customer,
  o.id           AS order_id,
  p.name         AS product,
  oi.quantity,
  oi.unit_price
FROM customers    AS c
JOIN orders       AS o  ON o.customer_id   = c.id
JOIN order_items  AS oi ON oi.order_id     = o.id
JOIN products     AS p  ON p.id            = oi.product_id
ORDER BY c.name, o.id;

-- Each JOIN adds a table. Order matters for readability but not for result
-- PostgreSQL's query planner chooses the actual join order for performance
```

```sql
-- ─── Column ambiguity — always qualify with table alias in joins
-- ❌ Ambiguous: both tables have 'id' and 'created_at'
SELECT id, name FROM customers JOIN orders ON customer_id = id;
-- ERROR: column reference "id" is ambiguous

-- ✅ Qualify every column with its table alias
SELECT
  c.id    AS customer_id,
  c.name,
  o.id    AS order_id,
  o.total
FROM customers AS c
JOIN orders    AS o ON o.customer_id = c.id;
```

```sql
-- ─── INNER JOIN on non-PK columns
-- Join on any matching column, not just PKs
SELECT
  c.name,
  c.city,
  c2.name AS neighbour
FROM customers c
JOIN customers c2 ON c2.city = c.city AND c2.id <> c.id
ORDER BY c.city, c.name;
-- Customers who share the same city
-- Mark and James are both in Manila → they appear as each other's neighbours
```

---

## W — Why It Matters

- `INNER JOIN` is the foundation of relational data retrieval — data is split across tables for normalization, and `JOIN` reassembles it at query time. Every dashboard, report, and feature in a relational app relies on this.
- Understanding that `INNER JOIN` silently **excludes** non-matching rows is critical — if Priya has no orders, she doesn't appear. This is correct behaviour for "show orders with customer names" but wrong for "show all customers and their order count" (which needs `LEFT JOIN`).
- Always use table aliases in joins — unqualified column names in multi-table queries cause ambiguity errors or silently pick the wrong column. Alias every table, qualify every column.

---

## I — Interview Q&A

### Q: What does `INNER JOIN` return, and when would a row be excluded?

**A:** `INNER JOIN` returns only rows where the `ON` condition is satisfied in both tables simultaneously. A row is excluded when there is no matching row on the other side — a customer with no orders is excluded from `customers JOIN orders`, and an order with a deleted customer (if not FK-enforced) would also be excluded. The result set contains exactly one output row per matching pair. If one customer has three orders, they appear three times in the result. If a customer has zero orders, they appear zero times.

### Q: Why does `JOIN` without a qualifier default to `INNER JOIN`?

**A:** The SQL standard specifies `INNER JOIN` as the default join type because it is the most common and most restrictive. Writing `JOIN` is shorthand for `INNER JOIN`. The other types (`LEFT`, `RIGHT`, `FULL`) must be explicitly specified because they change the semantics by including non-matching rows. In practice, most developers write `JOIN` for inner and `LEFT JOIN` explicitly when outer behaviour is needed — the distinction is visually clear.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to qualify column names — ambiguity error or silent wrong result

```sql
-- ❌ Which table does 'id' come from? PostgreSQL errors
SELECT id, name, total
FROM customers
JOIN orders ON customer_id = id;
-- ERROR: column reference "id" is ambiguous
```

**Fix:** Use table aliases and qualify every column in multi-table queries:

```sql
-- ✅ Unambiguous
SELECT
  c.id    AS customer_id,
  c.name,
  o.total
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

---

## K — Coding Challenge + Solution

### Challenge

Write a query using three `INNER JOIN`s to return: customer name, order id, product name, quantity, unit price, and line total (`quantity * unit_price`) for all delivered orders. Sort by customer name then order id.

### Solution

```sql
SELECT
  c.name                          AS customer_name,
  o.id                            AS order_id,
  p.name                          AS product_name,
  oi.quantity,
  oi.unit_price,
  oi.quantity * oi.unit_price     AS line_total
FROM customers   AS c
JOIN orders      AS o  ON o.customer_id   = c.id
JOIN order_items AS oi ON oi.order_id     = o.id
JOIN products    AS p  ON p.id            = oi.product_id
WHERE o.status = 'delivered'
ORDER BY c.name, o.id;

-- customer_name | order_id | product_name         | quantity | unit_price | line_total
-- --------------+----------+----------------------+----------+------------+-----------
-- Mark Austin   |        1 | Mechanical Keyboard  |        1 |     129.99 |     129.99
-- Mark Austin   |        1 | Gaming Mouse         |        1 |      49.99 |      49.99
-- Sarah Chen    |        3 | Notebook A5          |        1 |       8.99 |       8.99
```

---

---

# 2 — LEFT, RIGHT, and FULL JOIN — Including Non-Matching Rows

---

## T — TL;DR

`LEFT JOIN` returns **all rows from the left table** plus matching rows from the right — non-matching right-side columns are `NULL`. `RIGHT JOIN` is the mirror. `FULL JOIN` returns all rows from both tables. Use `LEFT JOIN` to find missing relationships ("customers with no orders") and to preserve all parent records in reporting.

---

## K — Key Concepts

```sql
-- ─── LEFT JOIN — all left rows, NULLs for unmatched right
SELECT
  c.name        AS customer_name,
  o.id          AS order_id,
  o.status,
  o.total
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.name;

-- Result: ALL 4 customers appear
-- Priya has no orders → order_id, status, total are NULL
-- customer_name  | order_id | status    | total
-- ---------------+----------+-----------+-------
-- James Rivera   |        4 | cancelled |  39.99
-- Mark Austin    |        1 | delivered | 179.98
-- Mark Austin    |        2 | pending   |  49.99
-- Priya Sharma   |     NULL | NULL      |   NULL  ← included with NULLs
-- Sarah Chen     |        3 | delivered |   8.99
```

```sql
-- ─── Classic LEFT JOIN pattern: find rows with NO match
-- "Which customers have never placed an order?"
SELECT
  c.id,
  c.name,
  c.email
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.id IS NULL;    -- ← filter to only unmatched rows

-- customer_name = 'Priya Sharma' — she has no orders
-- This pattern: LEFT JOIN + WHERE right.id IS NULL = "anti-join"
```

```sql
-- ─── LEFT JOIN vs INNER JOIN — side-by-side mental model

-- INNER JOIN: intersection only
-- LEFT JOIN:  all left + intersection (right NULLed when no match)
-- RIGHT JOIN: all right + intersection (left NULLed when no match)
-- FULL JOIN:  all left + all right (NULLed on the unmatched side)

-- Venn diagram:
-- INNER: [left ∩ right]
-- LEFT:  [left] ∪ [left ∩ right]
-- RIGHT: [left ∩ right] ∪ [right]
-- FULL:  [left] ∪ [left ∩ right] ∪ [right]
```

```sql
-- ─── RIGHT JOIN — all rows from the right table
-- Rarely used; swap table order and use LEFT JOIN instead (same result)
-- This:
SELECT c.name, o.id
FROM orders AS o
RIGHT JOIN customers AS c ON c.id = o.customer_id;
-- Is equivalent to:
SELECT c.name, o.id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
-- Convention: always rewrite RIGHT JOIN as LEFT JOIN for consistency
```

```sql
-- ─── FULL OUTER JOIN — all rows from both sides
-- Use case: find mismatches in both directions (data sync auditing)
CREATE TABLE orders_legacy  (order_ref TEXT, customer TEXT, total NUMERIC);
CREATE TABLE orders_new     (order_ref TEXT, customer TEXT, total NUMERIC);

INSERT INTO orders_legacy VALUES ('ORD-001','Mark',100),('ORD-002','Sarah',200);
INSERT INTO orders_new    VALUES ('ORD-001','Mark',100),('ORD-003','Priya',300);

SELECT
  COALESCE(l.order_ref, n.order_ref) AS order_ref,
  l.total   AS legacy_total,
  n.total   AS new_total,
  CASE
    WHEN l.order_ref IS NULL THEN 'Only in new'
    WHEN n.order_ref IS NULL THEN 'Only in legacy'
    ELSE                          'In both'
  END AS sync_status
FROM orders_legacy AS l
FULL OUTER JOIN orders_new AS n ON n.order_ref = l.order_ref;

-- order_ref | legacy_total | new_total | sync_status
-- ----------+--------------+-----------+--------------
-- ORD-001   |          100 |       100 | In both
-- ORD-002   |          200 |      NULL | Only in legacy
-- ORD-003   |         NULL |       300 | Only in new
```

```sql
-- ─── LEFT JOIN with multiple tables — keep the "spine" on the left
-- Show all customers with their order count and total spend
-- (customers with no orders should show 0, not be excluded)
SELECT
  c.id,
  c.name,
  COUNT(o.id)       AS order_count,    -- NULLs not counted ✅
  COALESCE(SUM(o.total), 0) AS total_spent
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY total_spent DESC;

-- id | name          | order_count | total_spent
-- ---+---------------+-------------+------------
--  1 | Mark Austin   |           2 |      229.97
--  2 | Sarah Chen    |           1 |        8.99
--  3 | James Rivera  |           1 |       39.99
--  4 | Priya Sharma  |           0 |        0.00  ← included ✅
```

---

## W — Why It Matters

- `LEFT JOIN` is the correct join for any "show all X with optional Y" query — show all products even if no one has ordered them, all users even if they have no profile, all categories even if empty. Using `INNER JOIN` silently drops these rows.
- The "anti-join" pattern (`LEFT JOIN ... WHERE right.id IS NULL`) is the standard SQL idiom for finding missing relationships — far more performant than `NOT IN (SELECT ...)` on large tables because the planner can use a hash anti-join.
- `FULL JOIN` is rare in OLTP but essential in data engineering for reconciliation — comparing two data sources and identifying records that exist in one but not the other.

---

## I — Interview Q&A

### Q: What is the difference between `INNER JOIN` and `LEFT JOIN`, and when do you choose each?

**A:** `INNER JOIN` returns only rows where both sides match — excludes rows with no match on either side. `LEFT JOIN` returns all rows from the left table plus matched rows from the right, filling unmatched right columns with `NULL`. Choose `INNER JOIN` when you only want complete relationships (orders WITH customer data). Choose `LEFT JOIN` when you want all records from one side regardless of whether a matching record exists on the other side — all customers with or without orders, all products regardless of purchase history. The wrong choice silently drops data: using `INNER JOIN` when you need `LEFT JOIN` produces reports that undercount.

### Q: How does the anti-join pattern work with `LEFT JOIN`?

**A:** `LEFT JOIN` includes all left-side rows, setting right-side columns to `NULL` when there's no match. Adding `WHERE right_table.id IS NULL` in the `WHERE` clause filters to only the left rows with no match — the anti-join. This is equivalent to "left minus intersection". It's used for "find all A where no B exists". Example: `FROM customers LEFT JOIN orders ON orders.customer_id = customers.id WHERE orders.id IS NULL` returns customers who have never placed an order. This is typically faster than `WHERE customer.id NOT IN (SELECT customer_id FROM orders)` because the `NOT IN` version handles `NULL` in the subquery differently and often can't use an index.

---

## C — Common Pitfalls + Fix

### ❌ Using WHERE on the right table in LEFT JOIN — converts it to INNER JOIN

```sql
-- ❌ The WHERE clause filters out NULLs, effectively making this an INNER JOIN
SELECT c.name, o.id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
WHERE o.status = 'delivered';   -- ← excludes rows where o.status IS NULL
-- Priya (no orders) is excluded because NULL = 'delivered' is NULL ❌
```

**Fix:** Move the filter to the `ON` clause (keeps non-matching rows):

```sql
-- ✅ Filter in ON — non-matching rows still included with NULLs
SELECT c.name, o.id, o.status
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status = 'delivered'
ORDER BY c.name;
-- Priya still appears: order_id = NULL, status = NULL ✅
-- Mark appears once for his delivered order; his pending order is excluded
```

---

## K — Coding Challenge + Solution

### Challenge

Write two queries using the Day 3 schema: (1) list all **products** with the number of times they have been ordered (`times_ordered`) — products that have never been ordered must appear with `times_ordered = 0`; (2) find customers who have **no delivered** orders using the anti-join pattern.

### Solution

```sql
-- (1) All products with order count — products with 0 orders must appear
SELECT
  p.id,
  p.name,
  p.category,
  COUNT(oi.order_id) AS times_ordered
FROM products    AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
GROUP BY p.id, p.name, p.category
ORDER BY times_ordered DESC, p.name;

-- name                  | category    | times_ordered
-- ----------------------+-------------+--------------
-- Gaming Mouse          | Electronics |             2
-- Mechanical Keyboard   | Electronics |             1
-- Notebook A5           | Stationery  |             1
-- USB-C Hub             | Electronics |             1

-- (2) Customers with no delivered orders — anti-join
SELECT
  c.id,
  c.name,
  c.email
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id AND o.status = 'delivered'
WHERE o.id IS NULL
ORDER BY c.name;

-- name          | email
-- --------------+---------------------
-- James Rivera  | james@example.com   ← only has cancelled order
-- Priya Sharma  | priya@example.com   ← no orders at all
```

---

---

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

# 8 — CTEs — WITH Clauses for Readable Multi-Step Queries

---

## T — TL;DR

A **CTE** (Common Table Expression) is a named, temporary result set defined at the top of a query with `WITH name AS (SELECT ...)`. CTEs make complex multi-step queries readable by breaking them into named logical steps. Multiple CTEs can be chained. **Recursive CTEs** traverse hierarchical data (trees, graphs) in a single query.

---

## K — Key Concepts

```sql
-- ─── Basic CTE — one named step
WITH order_totals AS (
  SELECT
    customer_id,
    COUNT(*)   AS order_count,
    SUM(total) AS total_spent
  FROM orders
  WHERE status != 'cancelled'
  GROUP BY customer_id
)
SELECT
  c.name,
  ot.order_count,
  ot.total_spent
FROM customers AS c
JOIN order_totals AS ot ON ot.customer_id = c.id
ORDER BY ot.total_spent DESC;

-- CTE runs first, produces 'order_totals' result set
-- Main query JOINs customers to order_totals
```

```sql
-- ─── Multiple CTEs — chained with commas
WITH
active_customers AS (
  -- Step 1: customers with at least one non-cancelled order
  SELECT DISTINCT customer_id
  FROM orders
  WHERE status != 'cancelled'
),
customer_spend AS (
  -- Step 2: total spend per active customer
  SELECT
    o.customer_id,
    SUM(o.total) AS total_spent
  FROM orders AS o
  JOIN active_customers AS ac ON ac.customer_id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY o.customer_id
),
ranked_customers AS (
  -- Step 3: join customer names and add a rank
  SELECT
    c.name,
    cs.total_spent,
    RANK() OVER (ORDER BY cs.total_spent DESC) AS spend_rank
  FROM customers AS c
  JOIN customer_spend AS cs ON cs.customer_id = c.id
)
-- Final query: top 3 spenders
SELECT name, total_spent, spend_rank
FROM ranked_customers
WHERE spend_rank <= 3
ORDER BY spend_rank;
```

```sql
-- ─── CTE vs Subquery — same result, different readability
-- Subquery version (harder to read for 3+ levels)
SELECT name FROM customers
WHERE id IN (
  SELECT customer_id FROM (
    SELECT customer_id, SUM(total) AS total
    FROM orders GROUP BY customer_id
  ) t WHERE total > 100
);

-- CTE version (readable steps)
WITH order_totals AS (
  SELECT customer_id, SUM(total) AS total
  FROM orders
  GROUP BY customer_id
),
high_spenders AS (
  SELECT customer_id FROM order_totals WHERE total > 100
)
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM high_spenders);
```

```sql
-- ─── Recursive CTE — traverse hierarchies
-- Standard form:
WITH RECURSIVE cte_name AS (
  -- 1. Anchor: starting point (non-recursive part)
  SELECT ...

  UNION ALL

  -- 2. Recursive step: references cte_name
  SELECT ...
  FROM cte_name
  JOIN base_table ON ...
)
SELECT * FROM cte_name;

-- Example: org chart — all reports under a manager
WITH RECURSIVE org_tree AS (
  -- Anchor: start at the CEO
  SELECT id, name, manager_id, 0 AS depth, name::TEXT AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: add direct reports of each node
  SELECT e.id, e.name, e.manager_id,
         ot.depth + 1,
         ot.path || ' → ' || e.name
  FROM employees AS e
  JOIN org_tree AS ot ON ot.id = e.manager_id
)
SELECT
  REPEAT('  ', depth) || name AS org_chart,
  depth,
  path
FROM org_tree
ORDER BY path;

-- org_chart              | depth | path
-- -----------------------+-------+-------------------------------
-- Alice CEO              |     0 | Alice CEO
--   Bob VP               |     1 | Alice CEO → Bob VP
--     Carol Manager      |     2 | Alice CEO → Bob VP → Carol Manager
--       Dave Dev         |     3 | Alice CEO → Bob VP → Carol Manager → Dave Dev
--       Eve Dev          |     3 | Alice CEO → Bob VP → Carol Manager → Eve Dev
```

```sql
-- ─── CTE with INSERT/UPDATE/DELETE — data modification CTEs
-- Insert an order and return its id to immediately insert order items
WITH new_order AS (
  INSERT INTO orders (customer_id, status, total)
  VALUES (1, 'pending', 89.98)
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT new_order.id, 2, 2, 44.99
FROM new_order;
-- Atomic: order + item inserted in one statement ✅
```

---

## W — Why It Matters

- CTEs transform unreadable nested subquery pyramids into sequential, named steps — each CTE is a "paragraph" of logic. Code reviewers can understand the intent of each step independently. This is not just style — it's maintainability.
- Recursive CTEs are the only standard SQL way to traverse trees and graphs without application-side recursion — organization charts, threaded comments, category trees, bill of materials. Without recursive CTEs you'd need multiple queries and application-level recursion.
- Data-modification CTEs (`WITH new_order AS (INSERT ... RETURNING ...)`) are the clean pattern for "insert parent, get id, insert child" in one atomic statement — eliminating race conditions that exist when doing it in two round trips.

---

## I — Interview Q&A

### Q: What is the difference between a CTE and a subquery, and when would you prefer a CTE?

**A:** Both define a temporary result set used by the main query. The difference is syntax, readability, and reusability. A CTE is defined at the top with `WITH name AS (...)` and can be referenced multiple times by name in the main query. A subquery is inline — nested inside the main query and can only be used once in that position. Prefer CTEs when: the logic has multiple steps (each CTE is a logical unit), the intermediate result needs to be referenced more than once (subquery would need duplication), or when writing recursive queries (only CTEs support `WITH RECURSIVE`). Subqueries are fine for simple, single-use inline logic.

---

## C — Common Pitfalls + Fix

### ❌ Assuming CTEs are always materialised (cached) — PostgreSQL 12+ changed this

```sql
-- In PostgreSQL 12+, the planner may inline CTEs (treat them as subqueries)
-- for optimisation. They are NOT automatically cached/materialised.
-- If you need to force materialisation (e.g. to prevent re-evaluation):
WITH MATERIALIZED expensive_cte AS (
  SELECT ... expensive query ...
)
SELECT * FROM expensive_cte
JOIN expensive_cte e2 ON e2.id = expensive_cte.parent_id;
-- MATERIALIZED forces the CTE to run once and cache the result
```

**Fix for re-use:**

```sql
-- ✅ Force materialisation when the CTE is referenced multiple times
WITH MATERIALIZED order_summary AS (
  SELECT customer_id, COUNT(*) AS cnt, SUM(total) AS total
  FROM orders GROUP BY customer_id
)
SELECT * FROM order_summary WHERE cnt > 1
UNION ALL
SELECT * FROM order_summary WHERE total > 200;
```

---

## K — Coding Challenge + Solution

### Challenge

Using CTEs, write a three-step query: (1) `monthly_revenue` CTE — sum revenue by month for delivered orders; (2) `avg_monthly` CTE — compute the average monthly revenue from the first CTE; (3) final query — show each month, its revenue, and whether it was `above_avg`, `average`, or `below_avg`.

### Solution

```sql
WITH
monthly_revenue AS (
  -- Step 1: revenue per calendar month
  SELECT
    DATE_TRUNC('month', ordered_at)  AS month,
    ROUND(SUM(total), 2)             AS revenue
  FROM orders
  WHERE status = 'delivered'
  GROUP BY DATE_TRUNC('month', ordered_at)
),
avg_monthly AS (
  -- Step 2: average monthly revenue
  SELECT ROUND(AVG(revenue), 2) AS avg_rev
  FROM monthly_revenue
)
-- Step 3: classify each month
SELECT
  TO_CHAR(mr.month, 'YYYY-MM')       AS month,
  mr.revenue,
  am.avg_rev                          AS avg_monthly_revenue,
  CASE
    WHEN mr.revenue > am.avg_rev * 1.05  THEN 'above_avg'
    WHEN mr.revenue < am.avg_rev * 0.95  THEN 'below_avg'
    ELSE                                      'average'
  END                                 AS classification
FROM monthly_revenue AS mr
CROSS JOIN avg_monthly AS am       -- one avg row × all month rows
ORDER BY mr.month;
```

---

---

# 9 — Views — Reusable Query Logic as Named Objects

---

## T — TL;DR

A **view** is a named, stored query that behaves like a table — you can `SELECT` from it, join it, and filter it. Views encapsulate complex logic (joins, aggregates, filters) behind a simple name. **Materialized views** store the result physically for fast reads — useful for expensive reporting queries. Views don't store data (except materialized views); they execute the underlying query on every access.

---

## K — Key Concepts

```sql
-- ─── CREATE VIEW — regular (non-materialized)
CREATE VIEW customer_order_summary AS
SELECT
  c.id              AS customer_id,
  c.name,
  c.email,
  c.city,
  COUNT(o.id)                   AS order_count,
  COALESCE(SUM(o.total), 0)     AS total_spent,
  MAX(o.ordered_at)             AS last_order_at
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.city;

-- Use the view like a table
SELECT * FROM customer_order_summary;
SELECT * FROM customer_order_summary WHERE city = 'Manila';
SELECT * FROM customer_order_summary WHERE order_count > 1 ORDER BY total_spent DESC;

-- View with JOIN to another view or table
SELECT
  cos.name,
  cos.total_spent,
  p.name AS last_product
FROM customer_order_summary AS cos
JOIN orders AS o ON o.customer_id = cos.customer_id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id
WHERE o.ordered_at = cos.last_order_at;
```

```sql
-- ─── Managing views
-- List views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';

-- Inspect view definition
SELECT pg_get_viewdef('customer_order_summary', true);
-- or in psql:
\d+ customer_order_summary

-- Modify (replace) a view — column list must match or be a superset
CREATE OR REPLACE VIEW customer_order_summary AS
SELECT
  c.id, c.name, c.email, c.city,
  COUNT(o.id)               AS order_count,
  COALESCE(SUM(o.total), 0) AS total_spent,
  MAX(o.ordered_at)         AS last_order_at,
  COUNT(DISTINCT o.status)  AS status_count  -- new column added
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.city;

-- Drop view
DROP VIEW customer_order_summary;
DROP VIEW IF EXISTS customer_order_summary;
DROP VIEW customer_order_summary CASCADE;  -- also drops dependent views
```

```sql
-- ─── Materialized view — stores the result physically
CREATE MATERIALIZED VIEW monthly_revenue_summary AS
SELECT
  DATE_TRUNC('month', ordered_at) AS month,
  status,
  COUNT(*)                        AS order_count,
  ROUND(SUM(total), 2)            AS revenue
FROM orders
GROUP BY DATE_TRUNC('month', ordered_at), status
ORDER BY month DESC, status;

-- Index the materialized view for fast lookups
CREATE INDEX ON monthly_revenue_summary (month);

-- Query it like a table (reads cached result — very fast)
SELECT * FROM monthly_revenue_summary WHERE status = 'delivered';

-- Refresh when underlying data changes
REFRESH MATERIALIZED VIEW monthly_revenue_summary;

-- Refresh without locking reads (allow queries while refreshing)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary;
-- Requires a unique index on the materialized view for CONCURRENTLY

-- Drop
DROP MATERIALIZED VIEW monthly_revenue_summary;
```

```sql
-- ─── View use cases

-- 1. Hide complexity — join-heavy queries behind a simple name
CREATE VIEW active_orders AS
SELECT o.*, c.name AS customer_name, c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status NOT IN ('cancelled', 'delivered');

-- 2. Soft delete filter — always query through the view
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- 3. Row-level security shorthand — scope data per application role
CREATE VIEW my_orders AS
SELECT * FROM orders
WHERE customer_id = current_setting('app.current_user_id')::INT;

-- 4. Denormalized read model — pre-joined data for API responses
CREATE VIEW product_catalogue AS
SELECT
  p.id, p.name, p.price, p.category,
  COALESCE(SUM(oi.quantity), 0) AS total_sold,
  ROUND(AVG(r.rating), 2)       AS avg_rating
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN reviews     r  ON r.product_id  = p.id
GROUP BY p.id, p.name, p.price, p.category;
```

```sql
-- ─── Regular view vs Materialized view — when to use each

-- Regular view:
-- ✅ Always reflects latest data (queries underlying tables each time)
-- ✅ No storage cost — just a stored query
-- ❌ Slow for expensive aggregations run on every access
-- Use when: data freshness is critical, query is fast, or view is rarely queried

-- Materialized view:
-- ✅ Very fast reads — pre-computed result
-- ✅ Can be indexed
-- ❌ Stale until refreshed — data can be out of date
-- ❌ Requires REFRESH to update (manual or scheduled)
-- Use when: expensive aggregation, dashboard/reporting, data changes infrequently
-- Refresh strategy: on schedule (pg_cron), after major writes (trigger), or on-demand
```

---

## W — Why It Matters

- Views are the SQL equivalent of a function — they encapsulate reusable logic, give it a name, and allow consumers to use it without knowing the implementation. When the underlying schema changes, update the view in one place, not in every query that uses that logic.
- Materialized views are the simplest query performance optimisation for expensive reporting — instead of running a 10-second aggregate query on every dashboard load, refresh it once per hour and serve from a pre-computed table in milliseconds.
- The soft-delete view pattern (`CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL`) is the cleanest enforcement of application-level row filtering — application code queries `active_users`, and the filter is applied centrally without trusting every query to remember the `WHERE`.

---

## I — Interview Q&A

### Q: What is the difference between a regular view and a materialized view?

**A:** A regular view stores only the query definition — every time you query a view, PostgreSQL re-executes the underlying SQL. The data is always current but the query cost is incurred every time. A materialized view stores the actual result set on disk — queries read the cached data and are very fast, but the data is only as fresh as the last `REFRESH MATERIALIZED VIEW`. Use regular views for frequently-changing data where freshness matters. Use materialized views for expensive aggregate queries where slight staleness is acceptable — dashboards, reporting, analytics summaries. Materialized views can have indexes, further accelerating specific lookup patterns.

### Q: Can you `INSERT` or `UPDATE` through a view?

**A:** Simple views — those that map directly to a single table without aggregates, `DISTINCT`, `GROUP BY`, subqueries, or window functions — are updatable in PostgreSQL. You can `INSERT`, `UPDATE`, and `DELETE` through them. Complex views (with joins, aggregates, etc.) are not directly updatable, but you can add `INSTEAD OF` triggers to implement custom write behaviour. In practice, views are primarily used for reads; writes go directly to the underlying tables in most application architectures.

---

## C — Common Pitfalls + Fix

### ❌ Querying a complex view in a tight loop — unintended N×1 cost

```ts
// ❌ The view re-executes its expensive JOIN + aggregate query once per user
for (const userId of userIds) {
  const row = await db.query('SELECT * FROM customer_order_summary WHERE customer_id = $1', [userId])
}
// For 1000 users: 1000 full aggregate queries ❌
```

**Fix:** Query the view once for all users with `IN`:

```ts
// ✅ One query, all users
const rows = await db.query(
  'SELECT * FROM customer_order_summary WHERE customer_id = ANY($1)',
  [userIds]
)
```

### ❌ Forgetting to refresh a materialized view — stale dashboard data

```sql
-- ❌ Orders added after last REFRESH are missing from materialized view
SELECT * FROM monthly_revenue_summary;
-- Shows data from last week — orders from today not included ❌
```

**Fix:** Set up a scheduled refresh or refresh after major writes:

```sql
-- ✅ Refresh after batch import
INSERT INTO orders ... ;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary;

-- ✅ Or schedule with pg_cron (PostgreSQL extension)
SELECT cron.schedule('refresh-revenue', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_summary');
```

---

## K — Coding Challenge + Solution

### Challenge

Create two views: (1) `product_sales_summary` — a regular view joining products → order_items → orders that shows each product's name, category, total units sold, total revenue, and number of distinct orders; (2) `top_categories` — a view built on top of `product_sales_summary` that groups by category showing total revenue and average revenue per product. Query `top_categories` filtering to categories with more than one product.

### Solution

```sql
-- (1) Regular view: product sales summary
CREATE VIEW product_sales_summary AS
SELECT
  p.id                                    AS product_id,
  p.name                                  AS product_name,
  p.category,
  p.price                                 AS list_price,
  COALESCE(SUM(oi.quantity), 0)           AS total_units_sold,
  COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS total_revenue,
  COUNT(DISTINCT oi.order_id)             AS distinct_orders
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.id
LEFT JOIN orders      AS o  ON o.id          = oi.order_id
                            AND o.status     != 'cancelled'
GROUP BY p.id, p.name, p.category, p.price;

-- Verify
SELECT * FROM product_sales_summary ORDER BY total_revenue DESC;

-- (2) View on top of a view: top categories
CREATE VIEW top_categories AS
SELECT
  category,
  COUNT(*)                              AS product_count,
  SUM(total_units_sold)                 AS total_units_sold,
  ROUND(SUM(total_revenue), 2)          AS category_revenue,
  ROUND(AVG(total_revenue), 2)          AS avg_revenue_per_product
FROM product_sales_summary
GROUP BY category;

-- Query with HAVING equivalent via WHERE (view is already aggregated)
SELECT *
FROM top_categories
WHERE product_count > 1
ORDER BY category_revenue DESC;

-- category    | product_count | total_units_sold | category_revenue | avg_revenue_per_product
-- ------------+---------------+------------------+------------------+------------------------
-- Electronics |             3 |                4 |           279.96 |                   93.32
```

---

## ✅ Day 3 Complete — PostgreSQL Multi-Table Querying

| # | Subtopic | Status |
|---|----------|--------|
| 1 | INNER JOIN | ☐ |
| 2 | LEFT, RIGHT, and FULL JOIN | ☐ |
| 3 | Join Conditions — ON, USING, Self-Join | ☐ |
| 4 | Aggregate Functions | ☐ |
| 5 | GROUP BY | ☐ |
| 6 | HAVING | ☐ |
| 7 | Subqueries | ☐ |
| 8 | CTEs — WITH Clauses | ☐ |
| 9 | Views | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
JOIN TYPES
  INNER JOIN          → intersection only (rows that match on BOTH sides)
  LEFT  JOIN          → all left + matched right (NULL when no right match)
  RIGHT JOIN          → all right + matched left (rewrite as LEFT JOIN)
  FULL  JOIN          → all left + all right (NULL on unmatched side)
  CROSS JOIN          → cartesian product (every row × every row)

  Anti-join:          LEFT JOIN ... WHERE right.id IS NULL
  On-clause filter:   ON a.id = b.a_id AND b.status = 'x'  ← filter inside join
  Where-clause:       moves filter AFTER join (can break LEFT JOIN behaviour)

JOIN CONDITIONS
  ON a.fk = b.pk              standard equi-join
  USING (column)              shorthand when column names match
  ON condition WITH AND       multi-condition (can include ranges)
  Self-join:  FROM t AS a JOIN t AS b ON a.id < b.id  (same table, different aliases)
  Always qualify columns: t.column — never bare column names in joins
  Always index FK columns — PostgreSQL does NOT do this automatically

AGGREGATES
  COUNT(*)                    all rows (including NULLs)
  COUNT(col)                  non-NULL values only
  COUNT(DISTINCT col)         unique non-NULL values
  SUM / AVG / MIN / MAX       ignore NULLs
  COALESCE(SUM(col), 0)       treat NULL aggregate as 0
  FILTER (WHERE cond)         conditional aggregate — no CASE needed
  STRING_AGG(col, ', ')       concatenate values within group
  ARRAY_AGG(col)              aggregate into array
  PERCENTILE_CONT(0.5)        median (not AVG for skewed data)

SQL EXECUTION ORDER (review)
  1 FROM + JOINs    → build the row set
  2 WHERE           → filter individual rows (no aggregates here)
  3 GROUP BY        → form groups
  4 HAVING          → filter groups (aggregates allowed here)
  5 SELECT          → compute output columns + aliases
  7 ORDER BY        → sort (alias usable here)
  8 LIMIT/OFFSET    → paginate

GROUP BY RULES
  Every SELECT column must be in GROUP BY or aggregated
  Exception: PostgreSQL allows non-key columns if PK is in GROUP BY
  GROUP BY expression = repeat expression (not alias) for portability
  ROLLUP(a, b) = per-combination + per-a subtotal + grand total
  COALESCE(SUM(col), 0) after LEFT JOIN to get 0 not NULL

HAVING vs WHERE
  WHERE:   filter rows (pre-GROUP BY) — no aggregates
  HAVING:  filter groups (post-GROUP BY) — aggregates allowed
  Use both: WHERE pre-filters (faster), HAVING post-filters groups

SUBQUERIES
  Scalar:     (SELECT single_value)  — in SELECT or WHERE
  List:       WHERE col IN (SELECT col FROM ...)
  NOT IN:     ⚠️ NULL-unsafe — prefer NOT EXISTS
  EXISTS:     WHERE EXISTS (SELECT 1 FROM ... WHERE correlated_cond)
  NOT EXISTS: NULL-safe alternative to NOT IN
  Correlated: references outer row — runs once per outer row (slow on big tables)
  Derived:    FROM (SELECT ...) AS alias — must always be aliased

CTEs (WITH)
  WITH name AS (SELECT ...)          single CTE
  WITH a AS (...), b AS (...)        chained CTEs (b can reference a)
  WITH RECURSIVE cte AS (
    anchor_select UNION ALL recursive_select
  )                                  tree / graph traversal
  WITH MATERIALIZED name AS (...)    force caching (PG12+: CTEs may be inlined)
  WITH new AS (INSERT ... RETURNING id)  data modification CTE → chain writes

VIEWS
  Regular view:       stored query, always fresh, no storage cost
  Materialized view:  stored result, fast reads, requires REFRESH
  CREATE VIEW v AS SELECT ...
  CREATE OR REPLACE VIEW v AS SELECT ...
  CREATE MATERIALIZED VIEW mv AS SELECT ...
  REFRESH MATERIALIZED VIEW mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv;  -- needs unique index, no read lock

  Use for:
  - Hide JOIN complexity behind a simple name
  - Soft-delete filter (WHERE deleted_at IS NULL)
  - Pre-joined API response shape
  - Expensive aggregate reports (materialized)
  - Row-level data scoping

COMMON ANTI-PATTERNS
  SELECT * in joins                → column ambiguity, fragile
  NOT IN with nullable subquery    → use NOT EXISTS
  WHERE on right table in LEFT JOIN → use ON instead (or converts to INNER)
  p1.id != p2.id in self-join      → use p1.id < p2.id (avoid duplicate pairs)
  Correlated subquery in SELECT over large table → rewrite as LEFT JOIN + GROUP BY
  Forgetting COALESCE(SUM(...), 0) after LEFT JOIN → NULL total for no-match rows
```

> **Your next action:** Open psql and run this query against any database with at least two related tables:
>
> ```sql
> SELECT left_table.*, COUNT(right_table.id) AS related_count
> FROM left_table
> LEFT JOIN right_table ON right_table.fk = left_table.id
> GROUP BY left_table.id
> ORDER BY related_count DESC
> LIMIT 10;
> ```
>
> Replace `left_table`, `right_table`, and `fk` with real names from your schema
