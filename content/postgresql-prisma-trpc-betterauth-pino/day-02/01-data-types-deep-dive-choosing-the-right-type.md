# 1 — Data Types Deep Dive — Choosing the Right Type

---

## T — TL;DR

Choosing the right data type is the most important schema decision — it determines storage size, what queries are possible, what constraints are available, and how the database indexes and compares values. PostgreSQL has over 40 built-in types. Know the 15 you'll use 95% of the time and the rules for choosing between them.

---

## K — Key Concepts

```sql
-- ─── Integer types — choose by range, not by "bigger is safer"
SMALLINT             -- -32,768 to 32,767           (2 bytes)  age, rating (1-5)
INTEGER              -- -2,147,483,648 to 2,147,483  (4 bytes)  most IDs, counts
BIGINT               -- ±9.2 × 10^18                (8 bytes)  user IDs at scale

-- Identity columns (SQL standard, preferred over SERIAL)
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
-- vs legacy SERIAL (shorthand, still common):
id SERIAL PRIMARY KEY  -- creates INT + sequence + default

-- Rule: use BIGINT for PKs of high-volume tables (users, events, orders)
--       use INTEGER for lookup/reference tables (countries, categories)
```

```sql
-- ─── Text types — the choice is simpler than it looks
TEXT                 -- unlimited variable-length string (preferred)
VARCHAR(n)           -- max n chars — use ONLY when you want a constraint
CHAR(n)              -- fixed width, pads with spaces — avoid almost always
CITEXT               -- case-insensitive text (extension: CREATE EXTENSION citext)

-- Rule: default to TEXT. Use VARCHAR(n) only when length IS the constraint
-- (e.g., country_code CHAR(2) for ISO codes)
-- TEXT and VARCHAR have identical storage and performance in PostgreSQL

-- String functions you'll use daily
LENGTH('hello')          -- 5
UPPER('hello')           -- 'HELLO'
LOWER('HELLO')           -- 'hello'
TRIM('  hello  ')        -- 'hello'
LTRIM / RTRIM
LEFT('hello', 3)         -- 'hel'
RIGHT('hello', 3)        -- 'llo'
SUBSTRING('hello', 2, 3) -- 'ell'  (1-indexed)
REPLACE('hi there', 'there', 'world') -- 'hi world'
SPLIT_PART('a,b,c', ',', 2)           -- 'b'
```

```sql
-- ─── Numeric types — precision matters
NUMERIC(precision, scale)  -- exact decimal  e.g. NUMERIC(12,2) = 99999999999.99
DECIMAL                    -- alias for NUMERIC
INTEGER / BIGINT           -- whole numbers, no decimal point
REAL                       -- 4-byte float, ~6 decimal digits of precision (AVOID for money)
DOUBLE PRECISION           -- 8-byte float, ~15 digits (AVOID for money)

-- Rule: money → NUMERIC(12,2) or NUMERIC(19,4) for international
--       percentages → NUMERIC(5,4) for 0.0000 to 1.0000 or NUMERIC(5,2) for 0.00 to 100.00
--       scientific computation → DOUBLE PRECISION
--       NEVER store money as FLOAT or REAL

-- Money type (PostgreSQL-specific) — avoid it
-- MONEY type has locale-dependent formatting issues; use NUMERIC instead
```

```sql
-- ─── Boolean
BOOLEAN  -- true / false / NULL
-- Accepts on insert:
--   true, 'true', 't', '1', 'yes', 'on', 'TRUE'
--   false, 'false', 'f', '0', 'no', 'off', 'FALSE'

is_active BOOLEAN NOT NULL DEFAULT true
is_deleted BOOLEAN NOT NULL DEFAULT false
```

```sql
-- ─── Date and time — the most misunderstood category
DATE          -- 2025-06-15  (date only, no time, no timezone)
TIME          -- 14:30:00    (time only, no date, no timezone — rare)
TIMESTAMP     -- 2025-06-15 14:30:00  (no timezone — avoid for events)
TIMESTAMPTZ   -- 2025-06-15 14:30:00+08 (stores UTC, displays in session TZ)
INTERVAL      -- '3 days', '2 hours 30 minutes', '1 year 6 months'

-- Rule: use TIMESTAMPTZ for all event timestamps (created_at, updated_at, etc.)
--       use DATE for calendar dates where time is irrelevant (birth_date, due_date)
--       TIMESTAMP without TZ only for cases where timezone is truly irrelevant

-- Generating current time
now()          -- TIMESTAMPTZ of current transaction start
CURRENT_TIMESTAMP  -- same as now()
clock_timestamp()  -- wall clock time (changes within transaction)
CURRENT_DATE   -- today's DATE

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

```sql
-- ─── UUID
UUID  -- 550e8400-e29b-41d4-a716-446655440000 (128-bit unique ID)

-- Generate UUIDs
SELECT gen_random_uuid();  -- built-in v4 UUID (no extension needed in PG14+)

-- When to use UUID vs BIGINT for primary key:
-- BIGINT: simpler, faster, smaller index, easy pagination (WHERE id > last_seen)
-- UUID:  distributed systems, no sequential ID exposure, merge-safe across DBs
-- Rule: start with BIGINT GENERATED ALWAYS AS IDENTITY; switch to UUID when needed
```

```sql
-- ─── JSON types
JSON   -- stored as text, validates JSON structure, slower queries
JSONB  -- stored as binary, decomposed, indexable, faster — use this

-- When to use JSONB
-- Store schema-flexible attributes (product metadata, user preferences, event payloads)
-- Can query inside: data->>'key', data->'nested'->>'field'
-- Can index: CREATE INDEX ON products USING GIN(metadata)
-- Avoid JSONB for data you'll frequently query by column — normalise instead

metadata JSONB DEFAULT '{}'
settings JSONB NOT NULL DEFAULT '{}'
```

```sql
-- ─── Arrays — PostgreSQL native
INTEGER[]   TEXT[]   TIMESTAMPTZ[]

-- When to use arrays:
-- Small, fixed-concept sets: tags TEXT[], permissions TEXT[]
-- Avoid for large/relational data — use a junction table instead

tags TEXT[] DEFAULT '{}'
-- Query: WHERE 'postgresql' = ANY(tags)
-- Modify: array_append(tags, 'new-tag')
```

```sql
-- ─── Enumerated types
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TABLE orders (
  id     SERIAL PRIMARY KEY,
  status order_status NOT NULL DEFAULT 'pending'
);

-- Pros: storage efficient, enforces valid values, readable in queries
-- Cons: adding values requires ALTER TYPE (cannot remove values without recreation)
-- Rule: use ENUM for stable, small value sets; use a lookup table for frequently changing lists

-- Add a value to existing enum (append only)
ALTER TYPE order_status ADD VALUE 'refunded' AFTER 'delivered';
```

---

## W — Why It Matters

- `TEXT` vs `VARCHAR(255)` — there is no performance difference in PostgreSQL. `VARCHAR(255)` is a Mysql/Oracle habit. Use `TEXT` unless the length itself is a business constraint.
- `TIMESTAMPTZ` vs `TIMESTAMP` — using bare `TIMESTAMP` causes real bugs in multi-timezone production systems. A meeting scheduled at "9 AM" stored as `TIMESTAMP` has no timezone context — it's ambiguous when DST changes or users are in different timezones. `TIMESTAMPTZ` stores UTC internally and always converts correctly.
- `NUMERIC` vs `FLOAT` for money — `0.1 + 0.2 = 0.30000000000000004` in float arithmetic. For financial data this is unacceptable. `NUMERIC` is stored as exact decimal digits. Always use `NUMERIC(12,2)` for currency.

---

## I — Interview Q&A

### Q: What is the difference between `TEXT`, `VARCHAR(n)`, and `CHAR(n)` in PostgreSQL?

**A:** All three store character strings, but with different constraints and storage behaviour. `TEXT` is unlimited length — it's the most flexible and has no overhead compared to `VARCHAR`. `VARCHAR(n)` enforces a maximum character length — use it when the length limit is a business rule (e.g. a username capped at 50 characters). `CHAR(n)` always stores exactly `n` characters, padding with spaces if shorter — it wastes space and causes subtle comparison bugs because `'hello   ' = 'hello'` is true in CHAR but not in TEXT. In PostgreSQL, `TEXT` and `VARCHAR` have identical performance and storage. `CHAR` is almost never the right choice.

### Q: When would you choose `UUID` over `BIGINT` as a primary key?

**A:** Use `BIGINT GENERATED ALWAYS AS IDENTITY` by default — it's smaller (8 bytes vs 16), faster for joins and index lookups, and easier to use in pagination (cursor-based: `WHERE id > last_id`). Choose `UUID` when: distributing data across multiple servers where sequential IDs would collide, exposing IDs in URLs where sequential integers reveal business metrics (number of orders), or merging data from multiple database instances. The trade-off: UUID indexes are larger, insert order is random (hurts B-tree locality), and they're harder to read in debugging.

---

## C — Common Pitfalls + Fix

### ❌ Using `FLOAT` or `DOUBLE PRECISION` for monetary values

```sql
-- ❌ Floating point arithmetic is approximate
CREATE TABLE payments (amount DOUBLE PRECISION);
INSERT INTO payments VALUES (19.99);
SELECT amount * 3 FROM payments;
-- Result: 59.97000000000000170...  ← money rounding error ❌
```

**Fix:**

```sql
-- ✅ NUMERIC is exact
CREATE TABLE payments (amount NUMERIC(12, 2));
INSERT INTO payments VALUES (19.99);
SELECT amount * 3 FROM payments;
-- Result: 59.97  ✅
```

### ❌ Using `TIMESTAMP` instead of `TIMESTAMPTZ` for event times

```sql
-- ❌ Timezone-naïve — ambiguous across DST and locations
created_at TIMESTAMP DEFAULT now()
-- now() returns TIMESTAMPTZ, but it's cast to TIMESTAMP (losing offset)
-- stored as '2025-06-15 14:30:00' — which timezone?
```

**Fix:**

```sql
-- ✅ Store UTC, display in session timezone
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## K — Coding Challenge + Solution

### Challenge

Design a `users` table and an `orders` table choosing the most appropriate types for each column. Users have: id, email, display name (max 50 chars enforced), birth date (no time needed), preferences (flexible JSON), account balance, is active flag, created and updated timestamps. Orders have: id, a reference to user, total amount, status (use an ENUM), placed at timestamp, expected delivery date (date only).

### Solution

```sql
-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
);

-- Users table — deliberate type choices
CREATE TABLE users (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        TEXT           NOT NULL,   -- unlimited text, constraint added via UNIQUE
  display_name VARCHAR(50)    NOT NULL,   -- VARCHAR here: length IS the constraint
  birth_date   DATE,                      -- no time needed for birthdays
  preferences  JSONB          NOT NULL DEFAULT '{}',   -- flexible, indexable
  balance      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,   -- exact decimal for money
  is_active    BOOLEAN        NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Orders table — deliberate type choices
CREATE TABLE orders (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT         NOT NULL,              -- matches users.id type
  total_amount    NUMERIC(12, 2) NOT NULL,
  status          order_status   NOT NULL DEFAULT 'pending',
  placed_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  expected_by     DATE                                   -- date only, no time
);

-- Verify
\d users
\d orders
```

---

---
