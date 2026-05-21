# 9 — UPDATE Patterns — Safe Updates and Computed Values

---

## T — TL;DR

`UPDATE` modifies existing rows. The golden rule: always use `WHERE`. `RETURNING` confirms what changed. Update expressions can be computed (relative updates), reference other columns in the same row, or even join to other tables using `FROM`. Always `SELECT` first to verify the target rows.

---

## K — Key Concepts

```sql
-- ─── Basic UPDATE — always with WHERE
UPDATE products
SET price = 89.99
WHERE sku = 'P001'
RETURNING id, sku, price;

-- ─── Update multiple columns at once
UPDATE users
SET
  username   = 'mark_updated',
  updated_at = now()
WHERE id = 1
RETURNING id, username, updated_at;
```

```sql
-- ─── Computed / relative updates — reference the current column value
-- Increase all prices by 10%
UPDATE products
SET price = price * 1.10
WHERE category_id = 2
RETURNING sku, price;

-- Decrement stock on purchase
UPDATE products
SET stock_count = stock_count - 1
WHERE id = 42 AND stock_count > 0  -- guard: prevent negative stock
RETURNING id, stock_count;

-- Append to a JSONB column
UPDATE users
SET preferences = preferences || '{"notifications": true}'::jsonb
WHERE id = 1;

-- Set a specific JSONB key
UPDATE users
SET preferences = jsonb_set(preferences, '{theme}', '"dark"')
WHERE id = 1;
```

```sql
-- ─── UPDATE with FROM — join to another table for update values
-- Update order totals from computed order_items sum
UPDATE orders o
SET total = item_totals.sum_total
FROM (
  SELECT order_id, SUM(quantity * unit_price) AS sum_total
  FROM order_items
  GROUP BY order_id
) AS item_totals
WHERE o.id = item_totals.order_id
RETURNING o.id, o.total;

-- Batch update using a VALUES list
UPDATE products AS p
SET price = v.new_price
FROM (VALUES
  ('P001', 89.99),
  ('P002', 34.99),
  ('P003', 64.99)
) AS v(sku, new_price)
WHERE p.sku = v.sku
RETURNING p.sku, p.price;
```

```sql
-- ─── Safe update workflow

-- Step 1: SELECT to verify which rows will be affected
SELECT id, sku, price FROM products WHERE category_id = 2;

-- Step 2: Wrap in a transaction for safety
BEGIN;

UPDATE products
SET is_available = false
WHERE stock_count = 0
RETURNING id, sku, is_available;

-- Step 3: Review the RETURNING output
-- If correct:
COMMIT;
-- If wrong:
ROLLBACK;  -- reverts all changes
```

```sql
-- ─── UPDATE with subquery condition
-- Deactivate users who have no orders in the last year
UPDATE users
SET is_active = false
WHERE id NOT IN (
  SELECT DISTINCT customer_id
  FROM orders
  WHERE ordered_at > now() - INTERVAL '1 year'
)
AND is_active = true
RETURNING id, email;

-- ─── Conditional UPDATE with CASE
UPDATE products
SET
  status = CASE
    WHEN stock_count = 0    THEN 'out_of_stock'
    WHEN stock_count < 10   THEN 'low_stock'
    ELSE                         'in_stock'
  END
RETURNING sku, stock_count, status;
```

---

## W — Why It Matters

- `UPDATE ... FROM` (joining another table) is more efficient than updating rows with a subquery per row — it computes the join once and applies all updates in one pass. Critical for batch updates in migrations.
- The `BEGIN / UPDATE / RETURNING / COMMIT` pattern is the production-safe workflow — you see exactly which rows changed before committing. In a rollback, nothing is written. This discipline prevents "I accidentally updated the wrong 50,000 rows" incidents.
- Relative updates (`stock_count = stock_count - 1`) combined with a guard condition (`AND stock_count > 0`) are the standard pattern for inventory and counter fields — but they're not safe under concurrent load without row-level locking. For high-concurrency counters, use `SELECT ... FOR UPDATE` or consider `SKIP LOCKED` patterns.

---

## I — Interview Q&A

### Q: How does `UPDATE ... FROM` differ from `UPDATE` with a subquery?

**A:** `UPDATE ... FROM` is a PostgreSQL extension that performs a join between the table being updated and another table (or derived table) to compute the new values. It's typically faster than correlated subqueries because the join is computed once for all rows. Example: updating order totals from a subquery that sums order items — with `FROM`, the subquery runs once and produces a result set, then rows are matched and updated in one pass. With a correlated subquery in `SET`, the subquery runs once per row being updated. For large tables, the difference in performance can be significant.

---

## C — Common Pitfalls + Fix

### ❌ UPDATE without WHERE — modifies every row in the table

```sql
-- ❌ Catastrophic — no WHERE clause
UPDATE users SET is_active = false;
-- All users deactivated. No undo (unless in a transaction). ❌
```

**Fix:** Always WHERE. Always SELECT first. Use transactions:

```sql
-- ✅
BEGIN;
-- First, verify:
SELECT id, email FROM users WHERE last_login < now() - INTERVAL '6 months';
-- Then update only after verifying:
UPDATE users
SET is_active = false
WHERE last_login < now() - INTERVAL '6 months';
COMMIT;
```

---

## K — Coding Challenge + Solution

### Challenge

Write three UPDATE scenarios: (1) apply a 15% discount to all products in `category_id = 1` using a relative update, return the new prices; (2) batch-update three specific products' stock counts from a VALUES list using `UPDATE ... FROM`; (3) use a CASE expression to assign a `badge` column on users based on their `order_count` (0 = 'new', 1–5 = 'regular', 6+ = 'loyal').

### Solution

```sql
-- Setup
ALTER TABLE products ADD COLUMN category_id INT NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'in_stock';
ALTER TABLE users    ADD COLUMN order_count INT NOT NULL DEFAULT 0;
ALTER TABLE users    ADD COLUMN badge TEXT NOT NULL DEFAULT 'new';

UPDATE users SET order_count = CASE id WHEN 1 THEN 7 ELSE 3 END;

-- (1) 15% discount to category 1 products
UPDATE products
SET price = ROUND(price * 0.85, 2)
WHERE category_id = 1
RETURNING sku, price AS discounted_price;

-- (2) Batch update stock from VALUES list
UPDATE products AS p
SET stock_count = v.new_stock
FROM (VALUES
  ('P001', 25),
  ('P002', 80),
  ('P003', 15)
) AS v(sku, new_stock)
WHERE p.sku = v.sku
RETURNING p.sku, p.stock_count;

-- (3) Badge assignment with CASE
UPDATE users
SET badge = CASE
  WHEN order_count = 0         THEN 'new'
  WHEN order_count BETWEEN 1 AND 5 THEN 'regular'
  ELSE                              'loyal'
END
RETURNING id, username, order_count, badge;

-- id=1 markdev   7  loyal
-- id=2 (others)  3  regular
```

---

---
