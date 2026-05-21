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
