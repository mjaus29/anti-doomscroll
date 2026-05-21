# 4 — Rows — INSERT, UPDATE, DELETE

---

## T — TL;DR

Rows are the data in a table. `INSERT` adds rows. `UPDATE` modifies existing rows. `DELETE` removes rows. Always use a `WHERE` clause with `UPDATE` and `DELETE` — without it, every row is affected. Use `RETURNING` to get back the modified rows without a second query.

---

## K — Key Concepts

```sql
-- ─── INSERT — add rows
-- Single row
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Mechanical Keyboard', 129.99);

-- Multiple rows in one statement (efficient)
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('SKU-002', 'Gaming Mouse',    49.99,  200),
  ('SKU-003', 'USB-C Hub',       39.99,  150),
  ('SKU-004', 'Monitor Stand',   89.99,   75);

-- Omit column list if providing ALL columns in order (fragile — avoid)
INSERT INTO products VALUES (DEFAULT, 'SKU-005', 'Desk Mat', NULL, 24.99, 100, true, now());

-- RETURNING — get back the inserted row(s)
INSERT INTO products (sku, name, price)
VALUES ('SKU-006', 'Webcam', 79.99)
RETURNING id, sku, created_at;
-- Returns: id=5, sku='SKU-006', created_at='2025-06-15 10:00:00+08'

-- INSERT ... ON CONFLICT — upsert
INSERT INTO products (sku, name, price)
VALUES ('SKU-001', 'Updated Keyboard', 149.99)
ON CONFLICT (sku)
  DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
-- If SKU-001 exists: updates name and price
-- If not: inserts normally
```

```sql
-- ─── UPDATE — modify existing rows
-- ⚠️ Without WHERE — updates EVERY row
UPDATE products SET is_available = false;  -- ← updates ALL products ❌

-- ✅ Always use WHERE
UPDATE products
SET price = 149.99
WHERE sku = 'SKU-001';

-- Update multiple columns
UPDATE products
SET
  price        = 44.99,
  stock_count  = stock_count + 50,  -- relative update
  is_available = true
WHERE sku = 'SKU-002';

-- UPDATE with RETURNING
UPDATE products
SET price = price * 0.90  -- 10% discount
WHERE category_id = 3
RETURNING id, name, price;
```

```sql
-- ─── DELETE — remove rows
-- ⚠️ Without WHERE — deletes EVERY row
DELETE FROM products;  -- ← deletes ALL products ❌

-- ✅ Always use WHERE
DELETE FROM products WHERE sku = 'SKU-006';

-- Delete with condition
DELETE FROM products
WHERE is_available = false AND stock_count = 0;

-- DELETE with RETURNING
DELETE FROM products
WHERE created_at < now() - INTERVAL '1 year'
RETURNING id, name;
```

```sql
-- ─── Verify before destructive operations
-- BEST PRACTICE: run the SELECT first, then convert to UPDATE/DELETE

-- Step 1: confirm which rows will be affected
SELECT id, name, price
FROM products
WHERE category_id = 3;

-- Step 2: once confirmed, run the UPDATE/DELETE
UPDATE products
SET price = price * 0.90
WHERE category_id = 3;
```

---

## W — Why It Matters

- `RETURNING` eliminates the N+1 pattern of "insert, then immediately SELECT to get the generated id" — one round trip instead of two. Every ORM feature like "return the created record" maps to `RETURNING` under the hood.
- `ON CONFLICT DO UPDATE` (upsert) is essential for idempotent data pipelines — syncing from an external API, reprocessing event streams, or seeding data that might already exist.
- The "SELECT first" pattern before `UPDATE`/`DELETE` is the safest habit in SQL — verify the WHERE clause returns exactly the rows you intend to modify before the irreversible operation.

---

## I — Interview Q&A

### Q: What does `RETURNING` do and when would you use it?

**A:** `RETURNING` appends a `SELECT`-like clause to `INSERT`, `UPDATE`, or `DELETE` that returns the affected rows as a result set. Use it when you need the server-generated values after writing — the auto-generated `id` after an `INSERT`, the `updated_at` timestamp after an `UPDATE`, or the deleted row data for audit logging after a `DELETE`. Without `RETURNING`, you'd need a second `SELECT` query. With `RETURNING`, the write and read are atomic in a single statement.

### Q: What is `ON CONFLICT` and when would you use it?

**A:** `ON CONFLICT` specifies what to do when an `INSERT` would violate a unique constraint. `ON CONFLICT DO NOTHING` silently skips the insert. `ON CONFLICT (column) DO UPDATE SET ...` performs an update instead — this is called an "upsert". Use it for idempotent operations: syncing external data where you don't know if a record already exists, seeding reference data in migrations, or processing event streams that may contain duplicates.

---

## C — Common Pitfalls + Fix

### ❌ UPDATE or DELETE without WHERE — modifies all rows

```sql
-- ❌ Missing WHERE — every product's price becomes 0
UPDATE products SET price = 0;
```

**Fix:** Always use WHERE. Verify with SELECT first:

```sql
-- ✅ Step 1: verify
SELECT id, name FROM products WHERE id = 42;
-- Step 2: modify
UPDATE products SET price = 0 WHERE id = 42;
```

### ❌ Inserting without column names — breaks on table changes

```sql
-- ❌ If someone adds a column or changes column order, this breaks silently
INSERT INTO users VALUES (DEFAULT, 'mark@example.com', 'Mark', true);
```

**Fix:** Always name the columns:

```sql
-- ✅ Explicit column names — safe against table changes
INSERT INTO users (email, name, is_active)
VALUES ('mark@example.com', 'Mark', true);
```

---

## K — Coding Challenge + Solution

### Challenge

Insert 3 products into your products table. Then: (1) update the price of one product and use `RETURNING` to confirm the new value, (2) update all products where stock_count = 0 to set is_available = false, (3) delete one product by sku and return its name.

### Solution

```sql
-- Insert 3 products
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('A001', 'Notebook',    12.99, 100),
  ('A002', 'Pen Set',      8.99,   0),
  ('A003', 'Stapler',     14.99,   0)
RETURNING id, sku, name;

-- 1. Update price with RETURNING
UPDATE products
SET price = 15.99
WHERE sku = 'A001'
RETURNING id, sku, name, price;
-- id=1, sku='A001', name='Notebook', price=15.99

-- 2. Set is_available = false for zero-stock items
UPDATE products
SET is_available = false
WHERE stock_count = 0
RETURNING sku, name, is_available;
-- A002 Pen Set    false
-- A003 Stapler    false

-- 3. Delete one product and return its name
DELETE FROM products
WHERE sku = 'A003'
RETURNING name;
-- name = 'Stapler'
```

---

---
