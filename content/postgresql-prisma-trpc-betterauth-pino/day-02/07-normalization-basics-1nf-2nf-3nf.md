# 7 — Normalization Basics — 1NF, 2NF, 3NF

---

## T — TL;DR

Normalization is the process of organizing a database schema to reduce redundancy and prevent update anomalies. The three normal forms (1NF, 2NF, 3NF) are progressive rules: each eliminates a different class of data problem. In practice, aim for 3NF for transactional systems and denormalize strategically for read-heavy queries.

---

## K — Key Concepts

```
── First Normal Form (1NF) ─────────────────────────────────────────────────

Rules:
  1. Each column stores one atomic value (no lists in a cell)
  2. Each row is unique (has a primary key)
  3. No repeating column groups

Violation example — multiple values in one cell:
┌──────┬──────────────┬────────────────────────────────┐
│  id  │    name      │            phones              │
├──────┼──────────────┼────────────────────────────────┤
│  1   │  Mark Austin │  "555-1234, 555-5678, 555-9999"│ ← list in one cell ❌
│  2   │  Sarah Chen  │  "555-4321"                    │
└──────┴──────────────┴────────────────────────────────┘
Problems: can't query "find users with phone 555-5678"
          can't index phone numbers
          updating a phone requires string parsing

Fix — move repeating data to a separate table:
┌──────┬──────────────┐    ┌──────────────┬─────────────┐
│  id  │    name      │    │   user_id    │    phone    │
├──────┼──────────────┤    ├──────────────┼─────────────┤
│  1   │  Mark Austin │    │      1       │  555-1234   │
│  2   │  Sarah Chen  │    │      1       │  555-5678   │
└──────┴──────────────┘    │      1       │  555-9999   │
                           │      2       │  555-4321   │
                           └──────────────┴─────────────┘
```

```
── Second Normal Form (2NF) ────────────────────────────────────────────────

Prerequisite: already in 1NF
Rules:
  All non-key columns must depend on the ENTIRE primary key
  (No partial dependency — only relevant for composite PKs)

Violation example — composite PK where a column depends on only part of it:
┌────────────┬────────────┬──────────────┬──────────────┬───────────┐
│  order_id  │ product_id │  quantity    │  unit_price  │ prod_name │
├────────────┼────────────┼──────────────┼──────────────┼───────────┤
│     1      │    101     │      2       │    29.99     │ "Widget"  │
│     1      │    202     │      1       │    49.99     │ "Gadget"  │
│     2      │    101     │      3       │    29.99     │ "Widget"  │
└────────────┴────────────┴──────────────┴──────────────┴───────────┘
PK = (order_id, product_id)
  quantity   → depends on BOTH order_id AND product_id ✅
  unit_price → depends on BOTH (price per order item)  ✅
  prod_name  → depends ONLY on product_id              ❌ partial dependency

Fix — move product_name to the products table:
order_items: order_id, product_id, quantity, unit_price
products:    product_id, name, ...
```

```
── Third Normal Form (3NF) ─────────────────────────────────────────────────

Prerequisite: already in 2NF
Rules:
  All non-key columns must depend DIRECTLY on the primary key
  No transitive dependencies (A → B → C where B is not a key)

Violation example:
┌──────┬────────────┬─────────────┬──────────────┐
│  id  │  zip_code  │  city       │    state     │
├──────┼────────────┼─────────────┼──────────────┤
│  1   │   10001    │  New York   │    NY        │
│  2   │   90210    │  Beverly Hills │  CA       │
└──────┴────────────┴─────────────┴──────────────┘
  id → zip_code  ✅
  zip_code → city → state  ← transitive dependency ❌
  city and state depend on zip_code, not on id directly
  If zip 10001 changes city (rezoning), must update every user row

Fix — extract the transitive dependency:
users:       id, zip_code (FK to zip_codes)
zip_codes:   zip_code, city, state
```

```sql
-- ─── Practical normalization example — denormalized to 3NF

-- ❌ Denormalized — customer and product details embedded in orders
CREATE TABLE orders_bad (
  order_id       INT,
  customer_name  TEXT,   -- changes if customer renames: must update all orders
  customer_email TEXT,   -- duplicated across all orders for same customer
  product_name   TEXT,   -- same product name duplicated across rows
  product_price  NUMERIC,-- if price changes: how do we handle history?
  quantity       INT
);

-- ✅ Normalized to 3NF
CREATE TABLE customers (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  TEXT           NOT NULL,
  price NUMERIC(10,2)  NOT NULL
);

CREATE TABLE orders (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  ordered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

CREATE TABLE order_items (
  order_id   BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT         NOT NULL REFERENCES products(id),
  quantity   INT            NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2)  NOT NULL,  -- snapshot price at time of order
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

```
── When to denormalize ──────────────────────────────────────────────────────

Normalization rules apply to write-optimized transactional schemas.
For read-heavy or reporting queries, strategic denormalization improves performance:

1. Computed / aggregated columns:
   orders.item_count INT  -- maintained by trigger or app code
   saves a COUNT(*) JOIN on every load

2. Materialized views (PostgreSQL feature):
   REFRESH MATERIALIZED VIEW monthly_revenue;
   Pre-computed aggregations refreshed on schedule

3. Duplicate non-volatile data:
   order_items.product_name TEXT  -- snapshot at purchase time
   Useful: product name may change; order history should show original name
   This is intentional denormalization, not a mistake

4. JSONB for flexible attributes:
   products.attributes JSONB  -- {"color": "red", "size": "L"}
   Avoids a wide EAV (Entity-Attribute-Value) table for optional attributes
```

---

## W — Why It Matters

- Update anomalies are the real cost of denormalization — if a customer's email is stored in every order row and they change their email, you must update hundreds of rows atomically or live with inconsistent data. With normalization, you update one row in `customers`.
- 2NF and 3NF feel abstract until you maintain production schemas — the "just add a column" instinct leads to schemas where a product's category is stored in every order item. When the category name changes, you're updating millions of rows.
- `unit_price` in `order_items` is intentional denormalization (a snapshot) — capturing the price at the time of purchase. Even though `products.price` exists, the order history must preserve what the customer actually paid. Knowing the difference between accidental and intentional denormalization is a senior-level skill.

---

## I — Interview Q&A

### Q: Explain the three normal forms with a concrete example.

**A:** Using an e-commerce schema. 1NF: eliminate lists in cells — instead of storing multiple product IDs as a comma-separated string in an orders column, create a separate `order_items` table with one row per product. Each cell holds one atomic value. 2NF: eliminate partial dependencies — in `order_items(order_id, product_id, quantity, product_name)`, `product_name` depends only on `product_id` (not the full composite PK). Move it to a `products` table. 3NF: eliminate transitive dependencies — if `orders` had `customer_zip`, `customer_city`, `customer_state`, then city and state depend on zip, not on order_id. Move zip/city/state to a `zip_codes` lookup table. Each normal form removes a different class of redundancy that causes update anomalies.

### Q: When is denormalization the right choice?

**A:** Denormalize when read performance is the bottleneck and the redundancy is manageable. Common justified cases: snapshot fields (order_items.unit_price records the price paid, which differs from products.current_price), computed aggregates on frequently-read dashboards (user.post_count to avoid a COUNT(*) join), and materialized views for complex reporting queries. The key question is: who owns the update? If there's a clear update path (a trigger, a migration, an async job) and the business cost of brief inconsistency is acceptable, denormalization is valid. In OLTP (transactional) systems, default to 3NF and denormalize with evidence from profiling.

---

## C — Common Pitfalls + Fix

### ❌ Storing comma-separated lists in a text column (1NF violation)

```sql
-- ❌ Tags stored as a comma-separated string
CREATE TABLE posts (
  id   SERIAL PRIMARY KEY,
  tags TEXT  -- 'postgresql,tutorial,sql'
);
-- Cannot index tags, cannot query efficiently, parsing is fragile
SELECT * FROM posts WHERE tags LIKE '%postgresql%';  -- full table scan, false matches ❌
```

**Fix:** Use a proper junction table or PostgreSQL array:

```sql
-- ✅ Option A: junction table (fully normalized)
CREATE TABLE post_tags (
  post_id INT NOT NULL REFERENCES posts(id),
  tag_id  INT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

-- ✅ Option B: PostgreSQL array (acceptable for small tag sets)
CREATE TABLE posts (
  id   SERIAL PRIMARY KEY,
  tags TEXT[] NOT NULL DEFAULT '{}'
);
-- Query: WHERE 'postgresql' = ANY(tags)
-- Index:  CREATE INDEX ON posts USING GIN(tags)
```

---

## K — Coding Challenge + Solution

### Challenge

Take this denormalized table and normalize it to 3NF:
```
orders_raw: order_id, customer_email, customer_name, customer_city,
            product_sku, product_name, product_category_name,
            quantity, unit_price, ordered_date
```
Identify each violation, create the normalized tables, and write an INSERT query that seeds the normalized tables from the concept.

### Solution

```sql
-- ─── Violations identified:
-- 1NF: all columns are atomic — OK for this example
-- 2NF: product_name, product_category_name depend only on product_sku (partial dep on order PK)
-- 3NF: customer_city depends on customer_email (transitive), not directly on order_id
--       product_category_name depends on a category_id (transitive through product)

-- ─── Normalized schema

CREATE TABLE customers (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  city  TEXT NOT NULL          -- kept here: city is customer attribute, not transitive FK
                               -- (true 3NF would extract city→country, but pragmatic here)
);

CREATE TABLE categories (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku         TEXT           NOT NULL UNIQUE,
  name        TEXT           NOT NULL,
  category_id BIGINT         NOT NULL REFERENCES categories(id)
);
CREATE INDEX idx_products_category_id ON products(category_id);

CREATE TABLE orders (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT      NOT NULL REFERENCES customers(id),
  ordered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

CREATE TABLE order_items (
  order_id   BIGINT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT        NOT NULL REFERENCES products(id),
  quantity   INT           NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,  -- intentional snapshot: price at order time
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ─── Seed the normalized tables
INSERT INTO customers (email, name, city)
VALUES ('mark@example.com', 'Mark Austin', 'Manila');

INSERT INTO categories (name) VALUES ('Electronics');
INSERT INTO products (sku, name, category_id) VALUES ('SKU-001', 'Mechanical Keyboard', 1);
INSERT INTO orders (customer_id) VALUES (1);
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (1, 1, 2, 129.99);

-- ─── Verify with a join (reconstructs the original flat view)
SELECT
  c.email          AS customer_email,
  c.name           AS customer_name,
  c.city           AS customer_city,
  p.sku            AS product_sku,
  p.name           AS product_name,
  cat.name         AS product_category_name,
  oi.quantity,
  oi.unit_price,
  o.ordered_at     AS ordered_date
FROM orders o
JOIN customers   c   ON c.id   = o.customer_id
JOIN order_items oi  ON oi.order_id   = o.id
JOIN products    p   ON p.id   = oi.product_id
JOIN categories  cat ON cat.id = p.category_id;
```

---

---
