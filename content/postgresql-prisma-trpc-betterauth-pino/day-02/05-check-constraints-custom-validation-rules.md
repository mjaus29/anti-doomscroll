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
