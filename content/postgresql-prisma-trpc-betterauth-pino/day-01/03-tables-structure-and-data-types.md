# 3 — Tables — Structure and Data Types

---

## T — TL;DR

A table is a named grid of rows and columns. Each column has a data type that constrains what it can store. PostgreSQL has rich built-in types — choose the most precise type for each column. Constraints (NOT NULL, UNIQUE, PRIMARY KEY) enforce integrity at the database level.

---

## K — Key Concepts

```sql
-- ─── CREATE TABLE syntax
CREATE TABLE users (
  id         SERIAL        PRIMARY KEY,    -- auto-incrementing integer PK
  email      TEXT          NOT NULL UNIQUE,
  username   VARCHAR(50)   NOT NULL,
  age        INTEGER,                       -- nullable by default
  score      NUMERIC(10,2) DEFAULT 0.00,
  is_active  BOOLEAN       NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

```sql
-- ─── Core data types

-- Integers
SMALLINT             -- -32,768 to 32,767         (2 bytes)
INTEGER  / INT       -- -2.1B to 2.1B             (4 bytes)
BIGINT               -- very large whole numbers   (8 bytes)
SERIAL               -- auto-increment INTEGER     (shorthand)
BIGSERIAL            -- auto-increment BIGINT

-- Text
TEXT                 -- unlimited length string    (preferred in PostgreSQL)
VARCHAR(n)           -- max n characters
CHAR(n)              -- fixed n characters (pads with spaces)

-- Exact numbers
NUMERIC(precision, scale)  -- e.g. NUMERIC(10,2) = 99999999.99
DECIMAL                    -- alias for NUMERIC

-- Floating point (approximate — avoid for money)
REAL                 -- 4-byte float
DOUBLE PRECISION     -- 8-byte float

-- Boolean
BOOLEAN              -- true / false / null
-- accepts: true, 'true', 't', '1', 'yes', 'on'
--          false, 'false', 'f', '0', 'no', 'off'

-- Date and time
DATE                 -- 2025-06-15  (no time)
TIME                 -- 14:30:00    (no date, no timezone)
TIMESTAMP            -- 2025-06-15 14:30:00 (no timezone)
TIMESTAMPTZ          -- 2025-06-15 14:30:00+08 (WITH timezone) ← prefer this
INTERVAL             -- '3 days 2 hours'

-- JSON
JSON                 -- stores JSON as text (validates structure)
JSONB                -- stores JSON as binary (indexable, faster queries) ← prefer this

-- Arrays
INTEGER[]            -- array of integers
TEXT[]               -- array of strings

-- UUID
UUID                 -- universally unique identifier
                     -- use gen_random_uuid() to generate

-- Special
BYTEA                -- binary data
INET                 -- IP address
```

```sql
-- ─── Constraints — enforce data integrity
CREATE TABLE products (
  id          SERIAL      PRIMARY KEY,                        -- unique + not null
  sku         TEXT        NOT NULL UNIQUE,                    -- no nulls, no duplicates
  name        TEXT        NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),      -- value rule
  category_id INT         REFERENCES categories(id),         -- foreign key
  stock       INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint types:
-- PRIMARY KEY    → unique + not null (one per table)
-- NOT NULL       → column cannot be NULL
-- UNIQUE         → all values in column must be distinct
-- CHECK (expr)   → custom boolean condition
-- REFERENCES     → foreign key — value must exist in referenced table
-- DEFAULT val    → value used when INSERT omits this column
```

```sql
-- ─── ALTER TABLE — modify existing tables
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users DROP COLUMN bio;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(100);
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false;
ALTER TABLE users RENAME COLUMN username TO handle;
ALTER TABLE users RENAME TO app_users;

-- ─── DROP TABLE
DROP TABLE users;                 -- fails if other tables reference it
DROP TABLE users CASCADE;         -- also drops dependent objects
DROP TABLE IF EXISTS users;       -- no error if table doesn't exist

-- ─── TRUNCATE — delete all rows (faster than DELETE)
TRUNCATE TABLE users;
TRUNCATE TABLE users RESTART IDENTITY;  -- also resets SERIAL counter
```

---

## W — Why It Matters

- Using `TIMESTAMPTZ` over `TIMESTAMP` prevents timezone bugs — the server stores all values in UTC and converts to the session timezone on retrieval. `TIMESTAMP` stores no timezone info and is ambiguous across DST changes.
- `TEXT` vs `VARCHAR(n)` — in PostgreSQL, `TEXT` and `VARCHAR` have identical performance. There is no reason to choose `VARCHAR(50)` over `TEXT` unless you genuinely want a length constraint. Use `TEXT` for most strings.
- `NUMERIC(10,2)` for money — `FLOAT` and `REAL` are approximate (binary floating point) and produce `0.1 + 0.2 = 0.30000000000000004`. `NUMERIC` is exact. Never store currency as a float.

---

## I — Interview Q&A

### Q: What is the difference between `TIMESTAMP` and `TIMESTAMPTZ` in PostgreSQL?

**A:** `TIMESTAMP` stores a date and time with no timezone information — it's a "naive" datetime. `TIMESTAMPTZ` (timestamp with time zone) stores the UTC equivalent of the input and tags it with timezone awareness. When you insert `2025-06-15 14:30:00+08:00` into a `TIMESTAMPTZ` column, PostgreSQL stores `2025-06-15 06:30:00 UTC` internally. When you read it back, PostgreSQL converts to the current session timezone. `TIMESTAMP` has no such conversion — it stores exactly what you insert. For any field that represents a real moment in time (created_at, updated_at, event timestamps), always use `TIMESTAMPTZ`.

### Q: Why is `SERIAL` not the same as a sequence?

**A:** `SERIAL` is syntax sugar that creates an integer column, creates a sequence object, and sets the column default to `nextval('sequence_name')`. It's not a type — it's shorthand for three DDL statements. Modern PostgreSQL (v10+) prefers `GENERATED ALWAYS AS IDENTITY` which is SQL-standard, safer, and doesn't allow manual inserts unless explicitly requested. For new code: `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.

---

## C — Common Pitfalls + Fix

### ❌ Using `FLOAT` or `REAL` for monetary amounts

```sql
-- ❌ Floating point is approximate
CREATE TABLE invoices (amount FLOAT);
INSERT INTO invoices VALUES (0.1 + 0.2);
SELECT amount FROM invoices;
-- 0.30000000000000004  ← money stored incorrectly ❌
```

**Fix:**

```sql
-- ✅ NUMERIC is exact decimal
CREATE TABLE invoices (amount NUMERIC(12, 2));
INSERT INTO invoices VALUES (0.10 + 0.20);
SELECT amount FROM invoices;
-- 0.30  ✅
```

### ❌ Omitting `NOT NULL` — silent null bugs

```sql
-- ❌ All columns nullable by default
CREATE TABLE users (id SERIAL, email TEXT, name TEXT);
INSERT INTO users (id, email) VALUES (1, 'a@a.com');
-- name is NULL — downstream code crashes when expecting a string
```

**Fix:** Add `NOT NULL` to every column that must have a value:

```sql
-- ✅
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT   NOT NULL UNIQUE,
  name  TEXT   NOT NULL
);
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `products` table with: `id` (auto-increment PK), `sku` (text, unique, not null), `name` (text, not null), `description` (text, nullable), `price` (exact decimal, not null, must be >= 0), `stock_count` (int, not null, default 0, must be >= 0), `is_available` (boolean, not null, default true), `created_at` (timestamp with timezone, default now). Then describe the table with `\d`.

### Solution

```sql
CREATE TABLE products (
  id           SERIAL          PRIMARY KEY,
  sku          TEXT            NOT NULL UNIQUE,
  name         TEXT            NOT NULL,
  description  TEXT,                                          -- nullable intentionally
  price        NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
  stock_count  INTEGER         NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  is_available BOOLEAN         NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

\d products
--    Column     |            Type             | Nullable |      Default
-- --------------+-----------------------------+----------+--------------------
--  id           | integer                     | not null | nextval('products_id_seq')
--  sku          | text                        | not null |
--  name         | text                        | not null |
--  description  | text                        |          |
--  price        | numeric(10,2)               | not null |
--  stock_count  | integer                     | not null | 0
--  is_available | boolean                     | not null | true
--  created_at   | timestamp with time zone    | not null | now()
```

---

---
