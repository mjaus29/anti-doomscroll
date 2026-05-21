# 8 — INSERT Patterns — Single, Bulk, Upsert, RETURNING

---

## T — TL;DR

`INSERT` has four production patterns: single-row inserts for interactive operations, multi-row bulk inserts for seeding and batch processing, `ON CONFLICT` upserts for idempotent operations, and `RETURNING` to get generated values back without a second query. Master all four — they appear constantly in migrations, seeds, and application code.

---

## K — Key Concepts

```sql
-- ─── Pattern 1: Single-row INSERT — with explicit column list
INSERT INTO users (email, username)
VALUES ('mark@example.com', 'markdev')
RETURNING id, created_at;
-- id=1, created_at='2025-06-15 10:00:00+08'
-- One round-trip: insert + get generated values ✅

-- ─── Pattern 2: Multi-row INSERT — one statement, one round trip
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('P001', 'Keyboard', 79.99, 150),
  ('P002', 'Mouse',    29.99, 300),
  ('P003', 'Monitor', 299.99,  50),
  ('P004', 'Webcam',   49.99, 200)
RETURNING id, sku;
-- Returns all 4 inserted rows with their generated IDs
-- Much faster than 4 separate INSERTs — one transaction, one network round trip
```

```sql
-- ─── Pattern 3: INSERT ... ON CONFLICT — Upsert

-- ON CONFLICT DO NOTHING — silently skip if duplicate
INSERT INTO tags (name)
VALUES ('postgresql'), ('sql'), ('tutorial')
ON CONFLICT (name) DO NOTHING;
-- Idempotent: re-running this seed data is safe ✅

-- ON CONFLICT DO UPDATE — update on duplicate (true upsert)
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (1, 'theme', 'dark')
ON CONFLICT (user_id, setting_key)
  DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at    = now();
-- EXCLUDED refers to the row that would have been inserted
-- If the row exists: update setting_value and updated_at
-- If not: insert normally

-- On conflict with partial conditions
INSERT INTO products (sku, name, price)
VALUES ('P001', 'New Keyboard Name', 89.99)
ON CONFLICT (sku)
  DO UPDATE SET
    name  = EXCLUDED.name,
    price = EXCLUDED.price
  WHERE products.price < EXCLUDED.price;  -- only update if new price is higher
```

```sql
-- ─── Pattern 4: INSERT ... SELECT — insert from query results
-- Copy active users to an archive table
INSERT INTO users_archive (id, email, username, archived_at)
SELECT id, email, username, now()
FROM users
WHERE is_active = false AND created_at < now() - INTERVAL '1 year';

-- Seed a permission table from a query
INSERT INTO user_permissions (user_id, permission)
SELECT id, 'read'
FROM users
WHERE role = 'viewer'
ON CONFLICT (user_id, permission) DO NOTHING;

-- ─── INSERT with DEFAULT VALUES — for tables with all defaults
CREATE TABLE events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO events DEFAULT VALUES;  -- inserts one row with all defaults
INSERT INTO events DEFAULT VALUES RETURNING id, created_at;
```

```sql
-- ─── RETURNING clause — get inserted/affected data back
-- Get generated id after single insert
INSERT INTO orders (customer_id, total)
VALUES (1, 149.99)
RETURNING id;

-- Get multiple columns
INSERT INTO posts (author_id, title)
VALUES (1, 'My Post')
RETURNING id, title, created_at;

-- Use RETURNING in a CTE to chain operations
WITH new_order AS (
  INSERT INTO orders (customer_id, total)
  VALUES (1, 99.99)
  RETURNING id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT new_order.id, 5, 2, 49.99
FROM new_order;
-- Insert order AND order_item in one statement ✅
```

---

## W — Why It Matters

- Multi-row `INSERT` with multiple `VALUES` tuples is dramatically faster than N individual `INSERT` statements — a single statement is one transaction, one parse, one network round trip. For seeding 10,000 rows, batch inserts are 10–100x faster than individual inserts.
- `ON CONFLICT DO NOTHING` makes seed scripts and data sync operations idempotent — running them multiple times produces the same result without errors. This is essential for migrations and CI/CD pipelines.
- `RETURNING` with a CTE to chain `INSERT` → `INSERT` in one statement eliminates a common N+1 anti-pattern: "insert parent, get id, insert child". With CTE + RETURNING, it's one atomic statement.

---

## I — Interview Q&A

### Q: What does `EXCLUDED` refer to in `ON CONFLICT DO UPDATE`?

**A:** `EXCLUDED` is a special table reference that contains the row that was proposed for insertion but conflicted. It gives you access to the values you tried to insert. `EXCLUDED.column_name` returns the value from the conflicting `VALUES` clause — not the existing row in the table. This lets you update specific columns with the new values: `SET price = EXCLUDED.price` means "use the price from the attempted insert, not the current row's price". The current row is referenced by the table name itself: `SET price = GREATEST(products.price, EXCLUDED.price)`.

---

## C — Common Pitfalls + Fix

### ❌ Inserting rows one at a time in a loop — N round trips

```ts
// ❌ N separate INSERT statements — N network round trips
for (const product of products) {
  await db.query('INSERT INTO products (sku, name, price) VALUES ($1, $2, $3)',
    [product.sku, product.name, product.price])
}
```

**Fix:** Use multi-row INSERT or bulk copy:

```ts
// ✅ Single INSERT with multiple VALUES — 1 round trip
const values = products.map((_, i) =>
  `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(', ')
const params = products.flatMap(p => [p.sku, p.name, p.price])
await db.query(`INSERT INTO products (sku, name, price) VALUES ${values}`, params)
```

---

## K — Coding Challenge + Solution

### Challenge

Write all four INSERT patterns: (1) insert one user and return the generated `id` and `created_at`, (2) bulk insert 4 products in one statement returning all `id`s, (3) upsert a user setting — insert if new, update `setting_value` and `updated_at` if the `(user_id, key)` pair already exists, (4) use INSERT ... SELECT to copy all products with `stock_count = 0` into a `low_stock_alerts` table.

### Solution

```sql
-- Setup
CREATE TABLE users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  username   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku         TEXT           NOT NULL UNIQUE,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL,
  stock_count INT            NOT NULL DEFAULT 0
);
CREATE TABLE user_settings (
  user_id     BIGINT NOT NULL REFERENCES users(id),
  key         TEXT   NOT NULL,
  value       TEXT   NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE TABLE low_stock_alerts (
  product_id  BIGINT NOT NULL REFERENCES products(id),
  sku         TEXT   NOT NULL,
  name        TEXT   NOT NULL,
  alerted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (1) Single insert with RETURNING
INSERT INTO users (email, username)
VALUES ('mark@example.com', 'markdev')
RETURNING id, created_at;

-- (2) Bulk insert 4 products
INSERT INTO products (sku, name, price, stock_count)
VALUES
  ('P001', 'Keyboard', 79.99,   0),
  ('P002', 'Mouse',    29.99, 150),
  ('P003', 'Headset',  59.99,   0),
  ('P004', 'Monitor', 299.99,  30)
RETURNING id, sku;

-- (3) Upsert user setting
INSERT INTO user_settings (user_id, key, value)
VALUES (1, 'theme', 'dark')
ON CONFLICT (user_id, key)
  DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = now();

-- Run again with a new value to see the update fire
INSERT INTO user_settings (user_id, key, value)
VALUES (1, 'theme', 'light')
ON CONFLICT (user_id, key)
  DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = now();

SELECT * FROM user_settings;  -- value should be 'light'

-- (4) INSERT ... SELECT for zero-stock products
INSERT INTO low_stock_alerts (product_id, sku, name)
SELECT id, sku, name
FROM products
WHERE stock_count = 0;

SELECT * FROM low_stock_alerts;
-- product_id=1 P001 Keyboard
-- product_id=3 P003 Headset
```

---

---
