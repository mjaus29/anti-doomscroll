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
