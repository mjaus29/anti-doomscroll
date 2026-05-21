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
