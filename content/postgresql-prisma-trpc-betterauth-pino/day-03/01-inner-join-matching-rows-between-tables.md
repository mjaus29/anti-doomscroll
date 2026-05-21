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
