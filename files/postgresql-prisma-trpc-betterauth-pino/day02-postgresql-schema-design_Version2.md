
# 📅 Day 2 — PostgreSQL Schema Design

> **Goal:** Design tables correctly from the start — choose precise data types, enforce integrity with constraints, understand the relationships between tables, apply normalization principles, and write safe, production-grade DML statements.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** PostgreSQL 18 · psql CLI · standard SQL

---

## 📋 Day 2 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Data Types Deep Dive — Choosing the Right Type | 12 min |
| 2 | PRIMARY KEY — Identity, Serial, and Composite Keys | 10 min |
| 3 | NOT NULL — Preventing Missing Data | 8 min |
| 4 | UNIQUE Constraints — Column and Multi-Column | 8 min |
| 5 | CHECK Constraints — Custom Validation Rules | 10 min |
| 6 | FOREIGN KEY — Referential Integrity and Cascade Behaviour | 12 min |
| 7 | Normalization Basics — 1NF, 2NF, 3NF | 12 min |
| 8 | INSERT Patterns — Single, Bulk, Upsert, RETURNING | 10 min |
| 9 | UPDATE Patterns — Safe Updates and Computed Values | 10 min |
| 10 | DELETE Patterns — Safe Deletes, Cascade, Soft Delete | 10 min |

---

---

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

# 2 — PRIMARY KEY — Identity, Serial, and Composite Keys

---

## T — TL;DR

A `PRIMARY KEY` uniquely identifies every row in a table — it enforces `NOT NULL + UNIQUE` and creates an index automatically. Every table should have one. Use `GENERATED ALWAYS AS IDENTITY` (modern SQL standard) over `SERIAL` (legacy). Composite primary keys combine multiple columns and suit junction tables.

---

## K — Key Concepts

```sql
-- ─── Primary key options

-- Option 1: BIGINT GENERATED ALWAYS AS IDENTITY (recommended — SQL standard)
CREATE TABLE users (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT   NOT NULL
);
-- GENERATED ALWAYS: PostgreSQL controls the value — manual insert requires OVERRIDING
-- GENERATED BY DEFAULT: allows manual override (safer for data migrations)

-- Option 2: SERIAL (legacy shorthand — still very common, acceptable)
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,  -- creates INT + sequence + default
  email TEXT   NOT NULL
);
-- BIGSERIAL for larger tables (same as BIGINT GENERATED BY DEFAULT AS IDENTITY)

-- Option 3: UUID primary key
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for older PG versions
CREATE TABLE users (
  id    UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT  NOT NULL
);
```

```sql
-- ─── PRIMARY KEY constraint — inline vs table-level

-- Inline (single column) — most common
CREATE TABLE products (
  id   SERIAL PRIMARY KEY,
  name TEXT   NOT NULL
);

-- Table-level — required for composite PKs
CREATE TABLE order_items (
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id)  -- composite primary key
);

-- What PRIMARY KEY gives you:
-- 1. NOT NULL enforced on all PK columns
-- 2. UNIQUE enforced (no duplicate rows)
-- 3. B-tree index created automatically
-- 4. Can be referenced by FOREIGN KEY constraints in other tables
```

```sql
-- ─── Composite primary key use cases

-- Junction table (many-to-many relationship)
CREATE TABLE user_roles (
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)  -- together they must be unique
);

-- Natural composite key (when combination is the identity)
CREATE TABLE calendar_slots (
  resource_id INT  NOT NULL,
  slot_date   DATE NOT NULL,
  slot_hour   SMALLINT NOT NULL CHECK (slot_hour BETWEEN 0 AND 23),
  is_booked   BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (resource_id, slot_date, slot_hour)
);
```

```sql
-- ─── Inserting with identity columns

-- GENERATED ALWAYS — PostgreSQL generates the value, you cannot specify it
INSERT INTO users (email) VALUES ('mark@example.com');
-- id is auto-generated: 1

-- If you try to specify id:
INSERT INTO users (id, email) VALUES (99, 'mark@example.com');
-- ERROR: cannot insert into column "id" — it's GENERATED ALWAYS ❌

-- Override for data migrations (use sparingly)
INSERT INTO users (id, email)
OVERRIDING SYSTEM VALUE
VALUES (99, 'mark@example.com');

-- GENERATED BY DEFAULT — you CAN specify the id (useful for migrations/seeding)
CREATE TABLE tags (
  id   INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO tags (id, name) VALUES (1, 'postgresql');  -- ✅ allowed
INSERT INTO tags (name) VALUES ('sql');                 -- ✅ auto-generated too
```

```sql
-- ─── Sequences — what SERIAL and IDENTITY use under the hood
-- View sequence info
SELECT * FROM information_schema.sequences;

-- Manual sequence control (rarely needed)
SELECT nextval('users_id_seq');   -- advance and get next value
SELECT currval('users_id_seq');   -- get current value (same session)
SELECT setval('users_id_seq', 1000);  -- reset to 1000

-- RESTART IDENTITY in TRUNCATE
TRUNCATE TABLE users RESTART IDENTITY;  -- resets the sequence to 1
```

---

## W — Why It Matters

- Every table needs a primary key — without one, PostgreSQL cannot uniquely identify rows for updates, deletes, replication, or ORM operations. A table without a PK is a footgun.
- `GENERATED ALWAYS AS IDENTITY` is the SQL standard and prevents accidental manual ID insertion that breaks sequences. `SERIAL` is PostgreSQL-specific shorthand that allows manual overrides, which is both a feature and a risk.
- Composite PKs on junction tables (`user_id + role_id`) enforce the relationship constraint at the schema level — no duplicate role assignments without needing application-level checks.

---

## I — Interview Q&A

### Q: What is the difference between `SERIAL` and `GENERATED ALWAYS AS IDENTITY`?

**A:** Both create auto-incrementing integer columns, but they differ in SQL compliance and safety. `SERIAL` is PostgreSQL-specific syntax that creates a sequence and sets the column default to `nextval(sequence)`. It allows you to manually insert any value, including values that conflict with or skip the sequence. `GENERATED ALWAYS AS IDENTITY` is the SQL standard (ISO SQL:2003). With `ALWAYS`, PostgreSQL prevents manual inserts unless you explicitly use `OVERRIDING SYSTEM VALUE`. With `BY DEFAULT`, it allows manual inserts but falls back to the sequence when no value is provided. For new code, prefer `GENERATED ALWAYS AS IDENTITY` for the standard compliance and the protection against accidental sequence disruption.

### Q: When should you use a composite primary key instead of a surrogate key?

**A:** Use composite primary keys on pure junction tables in many-to-many relationships (e.g. `user_roles(user_id, role_id)`) — the combination of both foreign keys is the natural unique identity. Use them on time-series partitioned tables where `(entity_id, timestamp)` is the natural key. Use a surrogate (auto-generated) key when: the table might be referenced by other tables (a surrogate int/uuid is simpler to reference than a composite FK), when the natural key might change (natural keys that mutate cause FK cascade updates), or when the table has many non-key columns that need efficient single-column lookup.

---

## C — Common Pitfalls + Fix

### ❌ Creating a table without a primary key

```sql
-- ❌ No primary key — rows are not uniquely identifiable
CREATE TABLE log_entries (
  message TEXT,
  logged_at TIMESTAMPTZ
);
-- Cannot efficiently UPDATE or DELETE specific rows
-- ORMs behave incorrectly, replication may fail
```

**Fix:** Always add a PK:

```sql
-- ✅
CREATE TABLE log_entries (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message   TEXT        NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### ❌ Using `SERIAL` for a junction table that needs composite PK

```sql
-- ❌ Surrogate id allows duplicate user_id + role_id combinations
CREATE TABLE user_roles (
  id      SERIAL PRIMARY KEY,  -- meaningless surrogate
  user_id INT,
  role_id INT
);
INSERT INTO user_roles (user_id, role_id) VALUES (1, 2);
INSERT INTO user_roles (user_id, role_id) VALUES (1, 2);  -- duplicate! no error ❌
```

**Fix:**

```sql
-- ✅ Composite PK prevents duplicate assignments
CREATE TABLE user_roles (
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

---

## K — Coding Challenge + Solution

### Challenge

Create three tables demonstrating all three PK patterns: (1) `articles` with `GENERATED ALWAYS AS IDENTITY`, (2) `categories` using `SERIAL`, (3) `article_categories` (junction table) with composite PK referencing both. Insert sample rows and attempt a duplicate junction insert to verify the constraint fires.

### Solution

```sql
-- 1. articles — GENERATED ALWAYS AS IDENTITY
CREATE TABLE articles (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. categories — SERIAL (legacy, still valid)
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- 3. article_categories — composite PK junction table
CREATE TABLE article_categories (
  article_id  BIGINT NOT NULL REFERENCES articles(id),
  category_id INT    NOT NULL REFERENCES categories(id),
  PRIMARY KEY (article_id, category_id)
);

-- Insert data
INSERT INTO articles (title) VALUES ('PostgreSQL Deep Dive'), ('SQL Patterns');
INSERT INTO categories (name) VALUES ('Database'), ('Tutorial'), ('Backend');

-- Assign categories
INSERT INTO article_categories (article_id, category_id) VALUES (1, 1), (1, 2), (2, 1);

-- Attempt duplicate — should fail
INSERT INTO article_categories (article_id, category_id) VALUES (1, 1);
-- ERROR: duplicate key value violates unique constraint "article_categories_pkey" ✅
```

---

---

# 3 — NOT NULL — Preventing Missing Data

---

## T — TL;DR

`NOT NULL` is the simplest and most important constraint — it ensures a column always has a value. PostgreSQL columns are `NULL`able by default. Add `NOT NULL` to every column that must always have data. Combine with `DEFAULT` for columns that have a sensible fallback. `NULL` means "unknown", which propagates through comparisons and calculations silently.

---

## K — Key Concepts

```sql
-- ─── NULL is the default — columns accept NULL unless stated
CREATE TABLE demo (
  a TEXT,          -- nullable (accepts NULL)
  b TEXT NOT NULL  -- rejects NULL
);

INSERT INTO demo (a) VALUES (NULL);   -- ✅ a is nullable
INSERT INTO demo (b) VALUES (NULL);   -- ❌ ERROR: null value violates not-null constraint
```

```sql
-- ─── NULL propagation — NULL is contagious
SELECT NULL + 1;          -- NULL
SELECT NULL || 'hello';   -- NULL  (use CONCAT instead of ||)
SELECT NULL = NULL;        -- NULL  (not TRUE!)
SELECT NULL IS NULL;       -- TRUE  (use IS NULL for comparison)

-- NULL in WHERE silently removes rows
SELECT * FROM users WHERE email = NULL;     -- ❌ returns 0 rows always
SELECT * FROM users WHERE email IS NULL;    -- ✅ correct

-- NULL in COUNT
SELECT COUNT(*)    FROM users;  -- counts ALL rows including NULLs
SELECT COUNT(email) FROM users; -- counts only non-NULL email values

-- NULL in aggregates
SELECT AVG(score) FROM scores;  -- NULLs are excluded from AVG calculation
```

```sql
-- ─── NOT NULL + DEFAULT pattern
-- When a column must exist but has a sensible starting value
CREATE TABLE posts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  view_count  INTEGER     NOT NULL DEFAULT 0,       -- numeric default
  is_published BOOLEAN    NOT NULL DEFAULT false,   -- boolean default
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),   -- timestamp default
  tags        TEXT[]      NOT NULL DEFAULT '{}'     -- empty array default
);
-- No default = required at INSERT time
-- With default = optional at INSERT time (uses default if omitted)
```

```sql
-- ─── COALESCE — handle NULL in queries
SELECT COALESCE(display_name, email, 'Anonymous') AS name
FROM users;
-- Returns first non-NULL value: display_name → email → 'Anonymous'

-- NULLIF — return NULL when two values are equal
SELECT NULLIF(score, 0) AS score FROM results;
-- Returns NULL when score = 0 (useful to avoid division by zero)

-- IS DISTINCT FROM — NULL-safe comparison
SELECT * FROM users WHERE email IS DISTINCT FROM 'old@example.com';
-- Like <> but also returns rows where email IS NULL
-- (regular <> treats NULL as unknown, excluding those rows)
```

```sql
-- ─── Adding NOT NULL to existing columns
-- Step 1: set a DEFAULT (or backfill NULLs)
UPDATE users SET phone = '' WHERE phone IS NULL;

-- Step 2: add NOT NULL constraint
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- Or in one step (if DEFAULT covers all cases)
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

---

## W — Why It Matters

- `NULL` is not an empty string, not zero, not false — it's "unknown". `NULL + 1 = NULL`, `NULL || 'text' = NULL`, `NULL = NULL = NULL`. Silent propagation of `NULL` through calculations produces wrong results with no error.
- Application code written in TypeScript (or any typed language) expects a string or number and crashes on `null`. Enforcing `NOT NULL` at the schema level means the database catches the problem before your application does — defense in depth.
- `COUNT(column)` vs `COUNT(*)` behaves differently because of `NULL` — `COUNT(email)` counts only rows where email is not null. Developers who don't understand this write subtle counting bugs.

---

## I — Interview Q&A

### Q: Why is `NULL` not the same as an empty string or zero, and why does it matter?

**A:** `NULL` means "unknown" or "not applicable" — it has no value, not even a blank one. Arithmetic and string operations involving `NULL` propagate `NULL`: `5 + NULL = NULL`, `'hello' || NULL = NULL`. Comparisons involving `NULL` return `NULL` (unknown): `NULL = NULL` is `NULL`, not `TRUE`. This means `WHERE column = NULL` never returns rows — you must use `WHERE column IS NULL`. In aggregates, `AVG` and `SUM` silently exclude NULLs, which can produce misleading averages over partial data. Empty string `''` and zero `0` are real values that participate normally in all operations.

---

## C — Common Pitfalls + Fix

### ❌ Skipping NOT NULL on columns that must always have a value

```sql
-- ❌ email is nullable — allows rows with no email address
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT              -- accepts NULL ← silent bug
);
INSERT INTO users DEFAULT VALUES;  -- inserts row with NULL email
-- Later: application crashes trying to send email to NULL ❌
```

**Fix:**

```sql
-- ✅ email is required
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL
);
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `tasks` table where: `title` and `owner_id` are required (NOT NULL, no default), `priority` is required with a default of `'medium'`, `due_date` is optional (nullable — intentional), `completed` has a default of `false` but is NOT NULL, `notes` is fully optional. Then write a SELECT that uses `COALESCE` to show `notes` as `'No notes'` when null.

### Solution

```sql
CREATE TABLE tasks (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title     TEXT        NOT NULL,
  owner_id  INT         NOT NULL,
  priority  TEXT        NOT NULL DEFAULT 'medium',
  due_date  DATE,                              -- intentionally nullable
  completed BOOLEAN     NOT NULL DEFAULT false,
  notes     TEXT,                              -- intentionally nullable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert with and without optional columns
INSERT INTO tasks (title, owner_id)
VALUES ('Write unit tests', 1);

INSERT INTO tasks (title, owner_id, priority, due_date, notes)
VALUES ('Deploy to production', 1, 'high', '2025-07-01', 'Check all env vars');

-- COALESCE to handle nullable notes
SELECT
  title,
  priority,
  due_date,
  COALESCE(notes, 'No notes') AS notes_display,
  completed
FROM tasks
ORDER BY created_at DESC;

-- title                | priority | due_date   | notes_display        | completed
-- ---------------------+----------+------------+----------------------+-----------
-- Deploy to production | high     | 2025-07-01 | Check all env vars   | f
-- Write unit tests     | medium   |            | No notes             | f
```

---

---

# 4 — UNIQUE Constraints — Column and Multi-Column

---

## T — TL;DR

`UNIQUE` ensures no two rows in a table have the same value in the constrained column(s). PostgreSQL automatically creates an index for every `UNIQUE` constraint — making those columns fast to query. Multi-column `UNIQUE` constraints enforce uniqueness across a combination of columns. `NULL` values are treated as distinct from each other (multiple NULLs allowed).

---

## K — Key Concepts

```sql
-- ─── Column-level UNIQUE
CREATE TABLE users (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email    TEXT   NOT NULL UNIQUE,    -- inline unique constraint
  username TEXT   NOT NULL UNIQUE     -- each separately unique
);

-- Table-level UNIQUE (same result, but can be named)
CREATE TABLE users (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email    TEXT   NOT NULL,
  username TEXT   NOT NULL,
  UNIQUE (email),              -- table-level, unnamed
  CONSTRAINT users_username_unique UNIQUE (username)  -- named constraint
);
```

```sql
-- ─── Multi-column UNIQUE — combination must be unique
-- Example: a user can only have one active subscription per plan
CREATE TABLE subscriptions (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id  INT    NOT NULL REFERENCES users(id),
  plan_id  INT    NOT NULL REFERENCES plans(id),
  status   TEXT   NOT NULL DEFAULT 'active',
  UNIQUE (user_id, plan_id)  -- one subscription per user per plan
);

-- user_id=1 + plan_id=2 → allowed once
-- user_id=1 + plan_id=2 → second insert → ERROR: duplicate key ✅

-- Another example: unique team membership
CREATE TABLE team_members (
  team_id    INT  NOT NULL REFERENCES teams(id),
  user_id    INT  NOT NULL REFERENCES users(id),
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)  -- one membership per user per team
);
```

```sql
-- ─── NULL and UNIQUE — important caveat
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT UNIQUE  -- NOT NULL omitted intentionally here
);

INSERT INTO users (email) VALUES (NULL);  -- ✅ first NULL
INSERT INTO users (email) VALUES (NULL);  -- ✅ second NULL — allowed!
INSERT INTO users (email) VALUES (NULL);  -- ✅ third NULL  — also allowed!
-- PostgreSQL treats NULLs as distinct from each other for UNIQUE
-- But if email should be unique, it should ALSO be NOT NULL
-- NOT NULL + UNIQUE together = one definitive unique non-null value

-- Rule: almost always pair UNIQUE with NOT NULL for business-key columns
email TEXT NOT NULL UNIQUE
```

```sql
-- ─── UNIQUE indexes — the underlying mechanism
-- UNIQUE constraints create a unique index automatically
-- You can also create a unique index directly:

CREATE UNIQUE INDEX users_email_unique ON users (email);
-- Functionally equivalent to CONSTRAINT users_email_unique UNIQUE (email)

-- Partial unique index — unique within a subset of rows
CREATE UNIQUE INDEX one_active_per_user
ON subscriptions (user_id)
WHERE status = 'active';
-- Only one 'active' subscription per user
-- Multiple 'cancelled' or 'expired' subscriptions allowed for same user
```

```sql
-- ─── Viewing and managing constraints
-- List constraints on a table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass;

-- Drop a named unique constraint
ALTER TABLE users DROP CONSTRAINT users_username_unique;

-- Add unique constraint to existing table
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

---

## W — Why It Matters

- `UNIQUE` is a business rule enforced by the database — not by your application. Application-level uniqueness checks (`SELECT WHERE email = ...` then `INSERT`) have a race condition: two concurrent requests can both pass the check and both succeed with duplicate rows. Only a database constraint is truly race-condition-safe.
- Every `UNIQUE` constraint automatically creates an index — so `email TEXT NOT NULL UNIQUE` gives you both integrity AND fast `WHERE email = 'x@x.com'` lookups for free.
- Partial unique indexes (`WHERE status = 'active'`) are a powerful PostgreSQL feature for business rules like "only one active subscription per user" while allowing multiple historical (inactive) records.

---

## I — Interview Q&A

### Q: Why does PostgreSQL allow multiple NULL values in a UNIQUE column?

**A:** The SQL standard defines `NULL` as "unknown" — and since two unknowns aren't proven to be equal (unknown equals unknown is unknown, not true), they don't violate uniqueness. PostgreSQL follows this standard behaviour: a `UNIQUE` constraint allows multiple `NULL` values in the column. In practice, if you want a column to be both unique and always present (most business-key scenarios), you need both `UNIQUE` and `NOT NULL`. If you genuinely want uniqueness to apply only to non-null values (optional unique field), `UNIQUE` alone is correct.

### Q: What is a partial unique index and when would you use it?

**A:** A partial unique index adds a `WHERE` clause to a unique index — it enforces uniqueness only among the rows matching the filter. Classic use case: `CREATE UNIQUE INDEX one_active_subscription ON subscriptions (user_id) WHERE status = 'active'` — a user can have only one active subscription, but unlimited cancelled ones. Other uses: unique usernames among non-deleted users (`WHERE is_deleted = false`), unique email per confirmed users (`WHERE is_confirmed = true`). Regular unique constraints can't express these rules; a partial unique index can.

---

## C — Common Pitfalls + Fix

### ❌ Relying on application-level uniqueness check — race condition

```ts
// ❌ Race condition: two requests check simultaneously, both see no duplicate, both insert
const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
if (existing.rows.length === 0) {
  await db.query('INSERT INTO users (email) VALUES ($1)', [email])
}
// Two concurrent requests can pass the check and both insert → duplicate emails ❌
```

**Fix:** Enforce at the database level with UNIQUE constraint:

```sql
-- ✅ Database constraint is atomic and race-condition-safe
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
-- The second INSERT will fail with a constraint violation → catch in application
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `venues` table and a `bookings` table. Enforce: (1) venues have a unique `slug` (url-friendly name), (2) a venue cannot be double-booked — use a multi-column UNIQUE on `(venue_id, booking_date)`, (3) create a partial unique index allowing only one `confirmed` booking per venue per date (multiple pending/cancelled allowed). Test all three constraints with inserts.

### Solution

```sql
CREATE TABLE venues (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,                 -- (1) unique slug
  capacity   INT  NOT NULL CHECK (capacity > 0)
);

CREATE TABLE bookings (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venue_id     BIGINT NOT NULL REFERENCES venues(id),
  booking_date DATE   NOT NULL,
  status       TEXT   NOT NULL DEFAULT 'pending',
  booked_by    TEXT   NOT NULL,
  UNIQUE (venue_id, booking_date)                  -- (2) no double-booking at all
);

-- (3) Partial unique: only one 'confirmed' per venue per date
-- (Remove the UNIQUE above and use this instead for real flexibility)
DROP TABLE bookings;
CREATE TABLE bookings (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venue_id     BIGINT NOT NULL REFERENCES venues(id),
  booking_date DATE   NOT NULL,
  status       TEXT   NOT NULL DEFAULT 'pending',
  booked_by    TEXT   NOT NULL
);
CREATE UNIQUE INDEX one_confirmed_per_venue_date
  ON bookings (venue_id, booking_date)
  WHERE status = 'confirmed';

-- Test data
INSERT INTO venues (name, slug, capacity) VALUES ('Grand Hall', 'grand-hall', 500);

-- First pending: OK
INSERT INTO bookings (venue_id, booking_date, status, booked_by)
VALUES (1, '2025-09-01', 'pending', 'Alice');

-- Second pending same date: OK (partial index only covers 'confirmed')
INSERT INTO bookings (venue_id, booking_date, status, booked_by)
VALUES (1, '2025-09-01', 'pending', 'Bob');

-- First confirmed: OK
UPDATE bookings SET status = 'confirmed' WHERE id = 1;

-- Second confirmed same date: ERROR ✅
UPDATE bookings SET status = 'confirmed' WHERE id = 2;
-- ERROR: duplicate key value violates unique constraint "one_confirmed_per_venue_date"

-- Test duplicate slug
INSERT INTO venues (name, slug, capacity) VALUES ('Second Hall', 'grand-hall', 300);
-- ERROR: duplicate key value violates unique constraint "venues_slug_key" ✅
```

---

---

# 5 — CHECK Constraints — Custom Validation Rules

---

## T — TL;DR

`CHECK` constraints enforce custom business rules at the column or table level — a boolean expression that must evaluate to `TRUE` for the row to be accepted. They run on every `INSERT` and `UPDATE`. Use them for value ranges, allowed values, cross-column rules, and format validation.

---

## K — Key Concepts

```sql
-- ─── Column-level CHECK
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL CHECK (price >= 0),               -- non-negative
  discount    NUMERIC(5,4)   NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 1), -- 0–100%
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),     -- no negative stock
  rating      SMALLINT       CHECK (rating BETWEEN 1 AND 5),            -- 1–5 stars or NULL
  weight_kg   NUMERIC(8,3)   CHECK (weight_kg > 0)                      -- positive
);
```

```sql
-- ─── Named CHECK constraints — required for ALTER TABLE operations
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  first_name TEXT           NOT NULL,
  last_name  TEXT           NOT NULL,
  salary     NUMERIC(10,2)  NOT NULL,
  start_date DATE           NOT NULL,
  end_date   DATE,
  CONSTRAINT salary_positive       CHECK (salary > 0),
  CONSTRAINT end_after_start       CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_salary_range    CHECK (salary BETWEEN 1000 AND 1000000)
);
-- Naming constraints makes error messages readable and allows DROP CONSTRAINT
```

```sql
-- ─── Table-level CHECK — cross-column validation
CREATE TABLE flight_legs (
  id             SERIAL PRIMARY KEY,
  origin         CHAR(3) NOT NULL,   -- IATA airport code
  destination    CHAR(3) NOT NULL,
  departure_at   TIMESTAMPTZ NOT NULL,
  arrival_at     TIMESTAMPTZ NOT NULL,
  CONSTRAINT different_airports     CHECK (origin <> destination),
  CONSTRAINT arrival_after_departure CHECK (arrival_at > departure_at)
);
```

```sql
-- ─── CHECK with string patterns (basic format validation)
CREATE TABLE contacts (
  id      SERIAL PRIMARY KEY,
  email   TEXT NOT NULL UNIQUE
            CHECK (email LIKE '%@%.%'),  -- basic email format
  phone   TEXT CHECK (phone ~ '^\+?[\d\s\-()]{7,20}$'),  -- regex
  website TEXT CHECK (website IS NULL OR website LIKE 'http%')
);

-- NOTE: CHECK is not a substitute for proper validation
-- LIKE '%@%.%' accepts 'a@b.c' but rejects many valid emails
-- Use it for coarse format gates, not exhaustive validation

-- ─── CHECK on enum-like values (alternative to CREATE TYPE ENUM)
CREATE TABLE tickets (
  id       SERIAL PRIMARY KEY,
  priority TEXT NOT NULL DEFAULT 'medium'
             CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status   TEXT NOT NULL DEFAULT 'open'
             CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);
-- Easier to add values than ALTER TYPE ENUM
-- Less type safety than a real ENUM
```

```sql
-- ─── Managing CHECK constraints
-- Drop a named check constraint
ALTER TABLE products DROP CONSTRAINT salary_positive;

-- Add a check constraint to existing table
ALTER TABLE products
ADD CONSTRAINT price_non_negative CHECK (price >= 0);

-- Check constraint not validated on existing data by default
ALTER TABLE products
ADD CONSTRAINT price_non_negative CHECK (price >= 0) NOT VALID;
-- NOT VALID: skips scan of existing rows (safe for large tables)
-- Later validate existing rows:
ALTER TABLE products VALIDATE CONSTRAINT price_non_negative;
```

---

## W — Why It Matters

- `CHECK` is the database's equivalent of Zod schema validation — it enforces business rules at the storage layer, not just at the API layer. If a row makes it into the database, it passed all CHECK constraints, regardless of which application or script inserted it.
- Cross-column CHECKs (like `arrival_at > departure_at`) are impossible to enforce with column-level constraints alone — they require table-level CHECK or triggers. Skipping these checks leads to logically invalid data (flights that arrive before departure).
- `NOT VALID` + `VALIDATE CONSTRAINT` is the production-safe pattern for adding CHECK to large existing tables — adding a regular CHECK on a 100M-row table scans every row, locking the table. `NOT VALID` adds the constraint without the scan.

---

## I — Interview Q&A

### Q: What is the difference between a column-level and table-level CHECK constraint?

**A:** A column-level CHECK is written inline with the column definition and can only reference that single column — `price NUMERIC CHECK (price >= 0)`. A table-level CHECK is written as a separate clause and can reference any column in the table — useful for cross-column rules like `CHECK (end_date IS NULL OR end_date > start_date)` which needs both `end_date` and `start_date`. Functionally they're identical for single-column checks — the difference is purely syntactic for single-column cases, but table-level is required for multi-column rules.

### Q: Can a CHECK constraint reference another table?

**A:** No — CHECK constraints cannot contain subqueries or reference other tables. They can only reference columns of the current row in the same table, plus immutable functions and literals. For cross-table constraints (e.g. "total_items in order <= warehouse stock"), use a trigger or enforce at the application layer with appropriate transaction isolation. This limitation is why `FOREIGN KEY` exists as a separate constraint type for referential integrity.

---

## C — Common Pitfalls + Fix

### ❌ CHECK constraint with mutable function — non-deterministic

```sql
-- ❌ now() changes — this check will fail for old records on re-validation
CREATE TABLE events (
  event_date DATE NOT NULL CHECK (event_date >= CURRENT_DATE)
);
-- Works on insert, but will reject past events on re-reads/backups ❌
-- Actually PostgreSQL evaluates CHECK only on INSERT/UPDATE, not on SELECT
-- But the intent is flawed — past event dates should be allowed after the fact
```

**Fix:** Validate future dates at application/API level, not in CHECK:

```sql
-- ✅ CHECK only for immutable invariants (ranges, formats, cross-column)
CREATE TABLE events (
  event_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  CONSTRAINT end_after_start CHECK (end_date >= event_date)  -- ✅ immutable
);
```

---

## K — Coding Challenge + Solution

### Challenge

Create an `inventory_items` table with CHECK constraints for: price >= 0, quantity >= 0, reorder_level >= 0 and <= quantity (when quantity > 0), condition must be one of `'new'`, `'refurbished'`, `'damaged'`, expiry_date must be in the future if provided (use a named constraint), weight_grams must be positive if provided. Test that each constraint rejects invalid data.

### Solution

```sql
CREATE TABLE inventory_items (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           TEXT           NOT NULL,
  price          NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
  quantity       INTEGER        NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level  INTEGER        NOT NULL DEFAULT 0
                   CHECK (reorder_level >= 0),
  condition      TEXT           NOT NULL DEFAULT 'new'
                   CHECK (condition IN ('new', 'refurbished', 'damaged')),
  weight_grams   INTEGER        CHECK (weight_grams IS NULL OR weight_grams > 0),
  expiry_date    DATE,
  CONSTRAINT reorder_lte_quantity
    CHECK (quantity = 0 OR reorder_level <= quantity),
  CONSTRAINT expiry_future
    CHECK (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
);

-- Test: valid insert
INSERT INTO inventory_items (name, price, quantity, reorder_level, condition)
VALUES ('Widget A', 9.99, 100, 20, 'new');  -- ✅

-- Test: negative price
INSERT INTO inventory_items (name, price) VALUES ('Bad', -1);
-- ERROR: new row violates check constraint "inventory_items_price_check" ✅

-- Test: invalid condition
INSERT INTO inventory_items (name, price, condition) VALUES ('Bad', 5.00, 'broken');
-- ERROR: violates check constraint "inventory_items_condition_check" ✅

-- Test: reorder > quantity
INSERT INTO inventory_items (name, price, quantity, reorder_level) VALUES ('Bad', 5.00, 10, 50);
-- ERROR: violates check constraint "reorder_lte_quantity" ✅

-- Test: past expiry
INSERT INTO inventory_items (name, price, expiry_date) VALUES ('Expired', 1.00, '2020-01-01');
-- ERROR: violates check constraint "expiry_future" ✅
```

---

---

# 6 — FOREIGN KEY — Referential Integrity and Cascade Behaviour

---

## T — TL;DR

A `FOREIGN KEY` constraint ensures that a value in one table's column matches a value in another table's primary (or unique) key — it enforces the relationship between tables. It prevents orphaned rows (orders with no user, comments with no post). Cascade rules (`ON DELETE`, `ON UPDATE`) define what happens to child rows when a parent row is modified or deleted.

---

## K — Key Concepts

```sql
-- ─── Basic FOREIGN KEY
CREATE TABLE users (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT   NOT NULL UNIQUE
);

CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),  -- inline FK
  title      TEXT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempt to insert a post with non-existent user_id
INSERT INTO posts (user_id, title) VALUES (999, 'My Post');
-- ERROR: insert or update on table "posts" violates foreign key constraint
-- Key (user_id)=(999) is not present in table "users"  ✅

-- Cannot delete a user who has posts
DELETE FROM users WHERE id = 1;
-- ERROR: update or delete on table "users" violates foreign key constraint
-- Key (id)=(1) is still referenced from table "posts"  ✅
```

```sql
-- ─── FK with named constraint and explicit column reference
CREATE TABLE comments (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  body    TEXT   NOT NULL,
  CONSTRAINT comments_post_fk  FOREIGN KEY (post_id)  REFERENCES posts(id),
  CONSTRAINT comments_user_fk  FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

```sql
-- ─── ON DELETE and ON UPDATE cascade rules

-- ON DELETE RESTRICT (default) — block deletion if child rows exist
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- ON DELETE CASCADE — delete child rows when parent is deleted
CREATE TABLE order_items (
  id       SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Deleting an order deletes all its items automatically
  sku      TEXT NOT NULL
);

-- ON DELETE SET NULL — set FK column to NULL when parent deleted
CREATE TABLE posts (
  id        SERIAL PRIMARY KEY,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  -- If the author account is deleted, post remains with author_id = NULL
  title     TEXT NOT NULL
);
-- Requires the FK column to be nullable (no NOT NULL)

-- ON DELETE SET DEFAULT — set FK column to its DEFAULT value
CREATE TABLE posts (
  id        SERIAL PRIMARY KEY,
  author_id INT NOT NULL DEFAULT 0 REFERENCES users(id) ON DELETE SET DEFAULT,
  -- If author deleted, posts assigned to a system/anonymous user (id=0)
  title     TEXT NOT NULL
);

-- ON DELETE NO ACTION — like RESTRICT but deferred (checked at end of transaction)
-- Allows deleting parent and child in the same transaction if both deleted
```

```sql
-- ─── Cascade decision guide
-- ON DELETE CASCADE    → child has no meaning without parent
--                        (order_items without order, comments without post)
-- ON DELETE SET NULL   → child can exist without the parent
--                        (posts can exist without the author account)
-- ON DELETE RESTRICT   → deletion should be prevented (audit records, invoices)
-- ON DELETE SET DEFAULT → reassign to a default/fallback owner

-- ON UPDATE CASCADE    → when parent PK changes, update FK automatically
--                        (rarely needed with IDENTITY/SERIAL PKs that never change)
```

```sql
-- ─── Self-referencing FK — hierarchical data
CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT   NOT NULL,
  parent_id INT    REFERENCES categories(id) ON DELETE SET NULL
  -- parent_id is NULL for top-level categories
);

INSERT INTO categories (name) VALUES ('Electronics');             -- id=1, parent=NULL
INSERT INTO categories (name, parent_id) VALUES ('Phones', 1);  -- id=2, parent=1
INSERT INTO categories (name, parent_id) VALUES ('Laptops', 1); -- id=3, parent=1

-- ─── Deferred FK constraints — for circular references
CREATE TABLE a (
  id  SERIAL PRIMARY KEY,
  b_id INT  -- will reference b
);
CREATE TABLE b (
  id  SERIAL PRIMARY KEY,
  a_id INT REFERENCES a(id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE a ADD CONSTRAINT a_b_fk FOREIGN KEY (b_id) REFERENCES b(id)
  DEFERRABLE INITIALLY DEFERRED;
-- Checked at COMMIT, not at each statement — allows circular insertion
```

```sql
-- ─── FK indexes — not automatic!
-- PostgreSQL automatically creates an index on the REFERENCED column (usually the PK)
-- but does NOT create an index on the REFERENCING FK column

-- ❌ Without this index, DELETE on users scans the entire orders table
-- to find matching user_id values — very slow on large tables

-- ✅ Always add an index on FK columns
CREATE INDEX idx_orders_user_id    ON orders(user_id);
CREATE INDEX idx_posts_author_id   ON posts(author_id);
CREATE INDEX idx_comments_post_id  ON comments(post_id);
-- Rule: every FK column should have an index
```

---

## W — Why It Matters

- Foreign keys are the primary mechanism for maintaining data consistency across tables — without them, you can have `orders` for `user_id = 9999` when no such user exists. Application-level checks have race conditions and can be bypassed by direct SQL access.
- Missing indexes on FK columns is one of the most common PostgreSQL performance mistakes. When you delete a user, PostgreSQL must check all tables with a FK to users to enforce referential integrity — without an index, this is a full table scan. On a table with millions of rows, this can take minutes.
- `ON DELETE CASCADE` is powerful but dangerous — understand its full depth. Cascading through three levels (`users → orders → order_items → invoice_lines`) means deleting one user deletes everything in the chain. Always trace cascade chains before applying.

---

## I — Interview Q&A

### Q: What is the difference between ON DELETE CASCADE and ON DELETE SET NULL?

**A:** `ON DELETE CASCADE` deletes the child rows when the parent is deleted — use it when child rows have no meaning independent of the parent (order items without an order, comments without a post). `ON DELETE SET NULL` sets the FK column to `NULL` when the parent is deleted — use it when the child can exist independently but the relationship becomes empty (a post whose author account was deleted still exists but has no author). The FK column must be nullable for `SET NULL`. Choose based on whether the child records have value after the parent is gone.

### Q: Why do you need to manually create an index on foreign key columns?

**A:** PostgreSQL automatically creates an index on the target of a FK (usually the PK of the referenced table), but does NOT create an index on the source FK column. When enforcing referential integrity (e.g. checking no orders reference a deleted user), PostgreSQL scans the child table's FK column — without an index, this is a sequential scan. On large tables, this makes `DELETE` and `UPDATE` on parent tables extremely slow. As a rule of thumb: every column that is a foreign key should have an index. Most ORMs and migration tools (Prisma, Flyway, Liquibase) create FK indexes automatically; in raw SQL you must do it manually.

---

## C — Common Pitfalls + Fix

### ❌ Not indexing FK columns — slow parent deletes

```sql
-- ❌ No index on user_id — DELETE FROM users scans entire orders table
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total   NUMERIC(10,2)
);
-- Deleting a user triggers full scan of orders table ❌
```

**Fix:**

```sql
-- ✅ Index the FK column
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total   NUMERIC(10,2)
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### ❌ Accidentally triggering deep cascades

```sql
-- ❌ CASCADE chains may delete more than intended
-- users → orders (CASCADE) → order_items (CASCADE) → shipment_lines (CASCADE)
DELETE FROM users WHERE id = 1;
-- Deletes the user AND all their orders AND all order items AND all shipment lines ← may be unintended
```

**Fix:** Understand and document cascade chains. Use `RESTRICT` for sensitive data:

```sql
-- ✅ For financial data — RESTRICT prevents accidental deletion
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
-- Must explicitly delete dependent records before deleting the user
```

---

## K — Coding Challenge + Solution

### Challenge

Design a blog schema with proper FKs and cascade rules: `users`, `posts` (each post has one author, on user delete set null), `comments` (each comment has a post and user, on post delete cascade, on user delete set null), `post_tags` junction table (on post delete cascade, on tag delete cascade). Add all FK indexes. Insert test data and delete a post to verify cascade.

### Solution

```sql
CREATE TABLE users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  username   TEXT NOT NULL UNIQUE
);

CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- nullable for orphan posts
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_author_id ON posts(author_id);

CREATE TABLE tags (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    BIGINT REFERENCES posts(id) ON DELETE CASCADE,   -- delete with post
  author_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- orphan if user deleted
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post_id   ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- Seed data
INSERT INTO users (email, username) VALUES ('mark@example.com', 'mark');
INSERT INTO posts (author_id, title, body) VALUES (1, 'First Post', 'Hello world');
INSERT INTO tags  (name) VALUES ('postgresql'), ('tutorial');
INSERT INTO comments (post_id, author_id, body) VALUES (1, 1, 'Great post!'), (1, 1, 'Very helpful');
INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 2);

-- Verify data
SELECT COUNT(*) FROM comments;  -- 2
SELECT COUNT(*) FROM post_tags; -- 2

-- Delete the post — cascade should remove comments and post_tags
DELETE FROM posts WHERE id = 1;

SELECT COUNT(*) FROM comments;  -- 0 ← cascaded ✅
SELECT COUNT(*) FROM post_tags; -- 0 ← cascaded ✅
SELECT COUNT(*) FROM tags;      -- 2 ← tags remain ✅
```

---

---

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

# 10 — DELETE Patterns — Safe Deletes, Cascade, Soft Delete

---

## T — TL;DR

`DELETE` permanently removes rows. Always use `WHERE`. Use `RETURNING` to log what was deleted. Understand cascade behaviour before deleting parent rows. In many production systems, **soft delete** (setting `is_deleted = true`) is preferred over hard delete — it preserves history, enables recovery, and avoids FK cascade complexity.

---

## K — Key Concepts

```sql
-- ─── Basic DELETE — always with WHERE
DELETE FROM products
WHERE sku = 'P001'
RETURNING id, name, sku;

-- ─── DELETE with multiple conditions
DELETE FROM sessions
WHERE user_id = 1 AND expires_at < now()
RETURNING id;

-- ─── Delete from joined data — using a subquery
-- Delete orders for inactive users
DELETE FROM orders
WHERE customer_id IN (
  SELECT id FROM users WHERE is_active = false
)
RETURNING id, customer_id;

-- ─── DELETE ... USING — PostgreSQL extension (join syntax for DELETE)
DELETE FROM orders o
USING users u
WHERE o.customer_id = u.id
  AND u.is_active = false
RETURNING o.id, u.email;
```

```sql
-- ─── TRUNCATE — fastest way to delete all rows
TRUNCATE TABLE sessions;                       -- delete all rows
TRUNCATE TABLE sessions RESTART IDENTITY;      -- also reset sequence
TRUNCATE TABLE users, orders, order_items;     -- multiple tables at once
TRUNCATE TABLE orders CASCADE;                 -- also truncate dependent tables

-- TRUNCATE vs DELETE
-- TRUNCATE: cannot be rolled back easily in some contexts, doesn't fire row-level triggers,
--           not safe with FKs unless CASCADE, much faster for full table clears
-- DELETE:   respects FKs, fires row triggers, can be filtered with WHERE, RETURNING works
-- Rule: TRUNCATE for full table clear in dev/test; DELETE in production
```

```sql
-- ─── Safe delete workflow
BEGIN;

-- Step 1: Preview what will be deleted
SELECT id, email, username
FROM users
WHERE created_at < '2023-01-01' AND is_active = false;

-- Step 2: Delete with RETURNING for audit
DELETE FROM users
WHERE created_at < '2023-01-01' AND is_active = false
RETURNING id, email, created_at;

-- Step 3: Verify expected row count
-- Step 4:
COMMIT;  -- or ROLLBACK if something looks wrong
```

```sql
-- ─── Soft delete pattern — preferred in production
-- Instead of deleting rows, mark them as deleted

-- Schema change: add deleted_at column
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;
-- NULL = not deleted, non-NULL = deleted at that timestamp

-- Soft delete
UPDATE posts
SET deleted_at = now()
WHERE id = 42
RETURNING id, title, deleted_at;

-- All queries filter deleted rows
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Restore a soft-deleted record
UPDATE posts
SET deleted_at = NULL
WHERE id = 42;

-- View deleted records (admin)
SELECT * FROM posts WHERE deleted_at IS NOT NULL;
```

```sql
-- ─── Soft delete with a view — make filtering transparent
CREATE VIEW active_posts AS
SELECT * FROM posts WHERE deleted_at IS NULL;

-- Application queries active_posts — no need to remember the WHERE clause
SELECT * FROM active_posts WHERE author_id = 1;

-- ─── Row-level security (RLS) alternative
-- Can also enforce soft-delete visibility via RLS policies
-- (advanced — covered in security day)
```

```sql
-- ─── Permanent purge with archiving — best of both worlds
-- Step 1: archive to a cold storage table
INSERT INTO posts_deleted (id, author_id, title, body, created_at, deleted_at)
SELECT id, author_id, title, body, created_at, now()
FROM posts
WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '90 days';

-- Step 2: hard delete the archived rows
DELETE FROM posts
WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '90 days';

-- Runs as a scheduled job (pg_cron or application cron)
-- Keeps main table clean, preserves history in archive
```

---

## W — Why It Matters

- Hard deletes with `ON DELETE CASCADE` can propagate through multiple levels — deleting a user can delete orders, order items, invoice lines, shipment records. In financial systems, this is a compliance violation. Soft delete prevents this completely.
- `DELETE ... USING` (PostgreSQL's join-based delete) is cleaner and often faster than `DELETE WHERE id IN (SELECT ...)` for large correlated deletions — the join is computed once, not as a per-row subquery.
- The archive pattern (soft delete for 90 days → move to archive table → hard delete) is standard in GDPR-compliant systems — "right to be forgotten" requests can be processed by purging soft-deleted records while the 90-day grace period preserves recovery capability.

---

## I — Interview Q&A

### Q: What is soft delete and what are its trade-offs?

**A:** Soft delete marks rows as deleted (typically `deleted_at TIMESTAMPTZ`) instead of physically removing them. Benefits: recovery is trivial (set `deleted_at = NULL`), full audit history preserved, avoids FK cascade complications, enables GDPR grace periods. Trade-offs: every query must filter `WHERE deleted_at IS NULL` — easily forgotten, leading to showing "deleted" data. Table grows indefinitely without a purge strategy. Unique constraints behave unexpectedly — a deleted email should be reusable, but the UNIQUE constraint still applies (fix with a partial unique index: `CREATE UNIQUE INDEX ON users(email) WHERE deleted_at IS NULL`). Use soft delete for user-visible records with business history; use hard delete for transient/technical data like sessions and logs.

### Q: What is the difference between DELETE and TRUNCATE?

**A:** `DELETE` removes rows one at a time using the normal MVCC mechanism — it fires row-level triggers, respects FK constraints, writes to WAL log per row, and supports `WHERE`, `RETURNING`, and full transaction rollback. It's slower for full table clears. `TRUNCATE` removes all rows by deallocating data pages — it's much faster, doesn't fire row-level triggers (only truncation triggers), and can cascade to FK-dependent tables with `CASCADE`. Both are transactional and can be rolled back in an explicit `BEGIN...ROLLBACK` block. Use `TRUNCATE` for test database reset and full table clear in ETL; use `DELETE` for any production conditional removal.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to filter soft-deleted rows in queries

```sql
-- ❌ Soft delete implemented but queries don't filter
SELECT * FROM users WHERE email = 'mark@example.com';
-- Returns soft-deleted users too — showing "deleted" account as active ❌
```

**Fix:** Create a view and always query through it:

```sql
-- ✅ All queries use the view
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

SELECT * FROM active_users WHERE email = 'mark@example.com';
-- Only returns non-deleted users ✅
```

### ❌ Soft delete breaks UNIQUE constraints — deleted user's email can't be reused

```sql
-- ❌ User deletes their account. New user tries to register with same email.
UPDATE users SET deleted_at = now() WHERE id = 1;
INSERT INTO users (email, username) VALUES ('mark@example.com', 'mark2');
-- ERROR: duplicate key value violates unique constraint "users_email_key" ❌
-- The deleted user's email is still blocking registration
```

**Fix:** Partial unique index that only covers active (non-deleted) rows:

```sql
-- ✅ Drop the full unique constraint
ALTER TABLE users DROP CONSTRAINT users_email_key;

-- ✅ Partial unique index — only among non-deleted users
CREATE UNIQUE INDEX users_email_active_unique
  ON users (email)
  WHERE deleted_at IS NULL;

-- Now soft-deleted users' emails are reusable ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a soft-delete system for a `posts` table: (1) add `deleted_at TIMESTAMPTZ` column, (2) create an `active_posts` view, (3) soft-delete a post, (4) try to create a new post with the same title (add a partial unique index on title for active posts), (5) implement a purge function that archives posts deleted > 30 days ago and hard-deletes them.

### Solution

```sql
-- (1) Add deleted_at to posts table
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;

-- (2) Create active_posts view
CREATE VIEW active_posts AS
SELECT id, author_id, title, body, created_at
FROM posts
WHERE deleted_at IS NULL;

-- (3) Soft delete a post
UPDATE posts
SET deleted_at = now()
WHERE id = 1
RETURNING id, title, deleted_at;

-- Verify: soft-deleted post not in view
SELECT COUNT(*) FROM active_posts;    -- 0 (if only 1 post)
SELECT COUNT(*) FROM posts;           -- 1 (still physically present)

-- (4) Partial unique index on title for active posts
CREATE UNIQUE INDEX posts_title_active_unique
  ON posts (title)
  WHERE deleted_at IS NULL;

-- Re-insert same title — should succeed (post 1 is soft-deleted)
INSERT INTO posts (author_id, title, body) VALUES (1, 'My Post', 'New content');
-- ✅ Works because the original is soft-deleted

-- (5) Purge: archive then hard delete
CREATE TABLE posts_archive (
  LIKE posts INCLUDING ALL  -- copy structure and constraints
);

-- Nightly job logic
WITH archived AS (
  INSERT INTO posts_archive
  SELECT *
  FROM posts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - INTERVAL '30 days'
  RETURNING id
)
DELETE FROM posts
WHERE id IN (SELECT id FROM archived)
RETURNING id;

-- Verify
SELECT COUNT(*) FROM posts;          -- cleaned up
SELECT COUNT(*) FROM posts_archive;  -- archived records preserved
```

---

## ✅ Day 2 Complete — PostgreSQL Schema Design

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Data Types Deep Dive | ☐ |
| 2 | PRIMARY KEY | ☐ |
| 3 | NOT NULL | ☐ |
| 4 | UNIQUE Constraints | ☐ |
| 5 | CHECK Constraints | ☐ |
| 6 | FOREIGN KEY | ☐ |
| 7 | Normalization Basics | ☐ |
| 8 | INSERT Patterns | ☐ |
| 9 | UPDATE Patterns | ☐ |
| 10 | DELETE Patterns | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
DATA TYPE SELECTION RULES
  Text:      TEXT (default)  VARCHAR(n) only if length IS the rule  CHAR: avoid
  Integer:   INT for most  BIGINT for high-volume PKs  SMALLINT for tiny ranges
  Money:     NUMERIC(12,2) — NEVER float/real (0.1+0.2 ≠ 0.3 in float)
  Datetime:  TIMESTAMPTZ always — stores UTC, converts on read  DATE for date-only
  Boolean:   BOOLEAN NOT NULL DEFAULT false/true
  JSON:      JSONB (indexable, binary) > JSON (text only)
  PK:        BIGINT GENERATED ALWAYS AS IDENTITY (standard)  SERIAL (legacy, ok)
  UUID:      distributed systems, non-sequential IDs, cross-DB merges

CONSTRAINTS
  PRIMARY KEY  = NOT NULL + UNIQUE + auto B-tree index (one per table)
  NOT NULL     = column must always have a value (default is nullable)
  UNIQUE       = no duplicates (NULL is distinct — multiple NULLs allowed)
  CHECK(expr)  = custom boolean validation (no subqueries, no other tables)
  FOREIGN KEY  = value must exist in referenced table (+ index the FK column!)

FOREIGN KEY CASCADE RULES
  ON DELETE RESTRICT   → block parent delete if children exist (default)
  ON DELETE CASCADE    → delete children when parent deleted (order_items)
  ON DELETE SET NULL   → orphan children (author posts survive user delete)
  ON DELETE SET DEFAULT → reassign to fallback owner
  ⚠️ Index every FK column — PostgreSQL does NOT do this automatically

NORMALIZATION
  1NF: atomic values (no lists in cells), rows have a PK
  2NF: non-key cols depend on ENTIRE composite PK (no partial deps)
  3NF: non-key cols depend DIRECTLY on PK (no transitive deps A→B→C)

  Intentional denormalization (OK):
  - Snapshot fields: order_items.unit_price (price at purchase time)
  - Computed caches: user.order_count (avoid JOIN for every read)

INSERT PATTERNS
  Single:  INSERT INTO t (cols) VALUES (...) RETURNING id
  Bulk:    INSERT INTO t (cols) VALUES (...), (...), (...) RETURNING id
  Upsert:  ON CONFLICT (col) DO UPDATE SET col = EXCLUDED.col
  Skip:    ON CONFLICT DO NOTHING
  Select:  INSERT INTO t SELECT ... FROM source WHERE ...
  EXCLUDED = the row that was tried but conflicted

UPDATE PATTERNS
  Always WHERE. Always SELECT first.
  Relative: SET col = col * 1.1
  Batch:    UPDATE t SET col = v.val FROM (VALUES ...) AS v WHERE t.key = v.key
  Safe:     BEGIN → SELECT → UPDATE RETURNING → review → COMMIT/ROLLBACK

DELETE PATTERNS
  Always WHERE. Never bare DELETE FROM table;
  Hard delete:  DELETE FROM t WHERE condition RETURNING *
  Join-delete:  DELETE FROM t USING other WHERE t.fk = other.id AND ...
  Soft delete:  UPDATE t SET deleted_at = now() WHERE id = x
  View:         CREATE VIEW active_t AS SELECT * FROM t WHERE deleted_at IS NULL
  Partial UNIQUE for soft-deleted: CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL
  Purge cycle:  archive after grace period → hard delete archived rows

CONSTRAINT MANAGEMENT
  Named constraints: CONSTRAINT name CHECK(...)  → needed for DROP
  Add to existing:   ALTER TABLE t ADD CONSTRAINT name CHECK(...)
  Large tables:      ADD CONSTRAINT ... NOT VALID  then  VALIDATE CONSTRAINT
  Drop:              ALTER TABLE t DROP CONSTRAINT name
  FK index:          CREATE INDEX idx_t_fk ON t(fk_column)  ← ALWAYS

NULL RULES
  NULL = unknown — propagates through all operations
  NULL + 1 = NULL   NULL || 'text' = NULL   NULL = NULL = NULL (not TRUE)
  WHERE col = NULL → returns 0 rows (always) — use IS NULL
  COALESCE(a, b, c) → first non-NULL value
  NOT IN (..., NULL) → returns 0 rows (NULL poisons IN list) — use NOT EXISTS
```

> **Your next action:** Pick any existing table in your project (or create a fresh one). Run `\d tablename` in psql and audit it: are all columns `NOT NULL` that should be? Do all foreign keys have indexes? Is the data type for any
