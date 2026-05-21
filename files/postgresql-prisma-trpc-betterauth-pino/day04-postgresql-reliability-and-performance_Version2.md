
# 📅 Day 4 — PostgreSQL Reliability and Performance

> **Goal:** Write SQL that is both correct under concurrent load and fast at production scale — master transactions, isolation, locking, indexing, query planning, and the key patterns that separate hobby code from production-grade backend SQL.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** PostgreSQL 18 · psql CLI · standard SQL

---

## 📋 Day 4 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Transactions — BEGIN, COMMIT, ROLLBACK, SAVEPOINT | 12 min |
| 2 | Isolation Levels — Concurrency Anomalies and How to Prevent Them | 12 min |
| 3 | Row-Level Locking — SELECT FOR UPDATE and SKIP LOCKED | 12 min |
| 4 | Indexes Deep Dive — B-tree Internals, When They Help, When They Don't | 12 min |
| 5 | Index Types — Partial, Composite, Expression, GIN, BRIN | 12 min |
| 6 | EXPLAIN and EXPLAIN ANALYZE — Reading Query Plans | 12 min |
| 7 | Query Optimization Patterns — Anti-Patterns and Rewrites | 12 min |
| 8 | Pagination Patterns — OFFSET vs Cursor-Based | 10 min |
| 9 | Bulk Write Patterns — COPY, Batch Inserts, Upserts at Scale | 12 min |

---

---

# 1 — Transactions — BEGIN, COMMIT, ROLLBACK, SAVEPOINT

---

## T — TL;DR

A transaction groups multiple SQL statements into a single atomic unit — all succeed or all fail together. `BEGIN` starts a transaction block. `COMMIT` makes changes permanent. `ROLLBACK` undoes all changes since `BEGIN`. `SAVEPOINT` creates a partial rollback point inside a transaction. Every statement in PostgreSQL runs in a transaction — even without an explicit `BEGIN`.

---

## K — Key Concepts

```sql
-- ─── Autocommit mode — the default (no explicit BEGIN)
-- Every single statement is automatically wrapped in its own transaction
INSERT INTO orders (customer_id, total) VALUES (1, 99.99);
-- This INSERT is immediately committed — no rollback possible

-- ─── Explicit transaction block
BEGIN;

  UPDATE accounts SET balance = balance - 500 WHERE id = 1;  -- debit
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;  -- credit

COMMIT;   -- both updates become permanent atomically

-- If COMMIT is never reached — e.g. application crashes — PostgreSQL
-- automatically rolls back the incomplete transaction ✅
```

```sql
-- ─── ROLLBACK — undo everything since BEGIN
BEGIN;

UPDATE products SET price = 0 WHERE id = 42;  -- accidental update

-- Oops — realized the mistake before committing
ROLLBACK;
-- price is unchanged ✅

-- ─── Safe update workflow with explicit transaction
BEGIN;

-- Step 1: preview
SELECT id, name, price FROM products WHERE category = 'Electronics';

-- Step 2: update
UPDATE products SET price = price * 1.10 WHERE category = 'Electronics';

-- Step 3: verify RETURNING output, then decide
-- If good:
COMMIT;
-- If wrong:
-- ROLLBACK;
```

```sql
-- ─── SAVEPOINT — partial rollback within a transaction
BEGIN;

INSERT INTO orders (customer_id, total) VALUES (1, 100);

SAVEPOINT before_items;  -- mark a rollback point

  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (currval('orders_id_seq'), 99, 1, 100);   -- product 99 doesn't exist → FK error

-- On error, roll back only to the savepoint (not the whole transaction)
ROLLBACK TO SAVEPOINT before_items;

  -- Try again with correct product_id
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (currval('orders_id_seq'), 1, 1, 100);   -- product 1 exists ✅

RELEASE SAVEPOINT before_items;  -- optional: discard the savepoint

COMMIT;  -- order + valid item committed
```

```sql
-- ─── Transaction status in psql
-- postgres=# — normal prompt, autocommit
-- postgres=*# — inside an open transaction
-- postgres=!# — inside a FAILED transaction (must ROLLBACK before any new statements)

-- ─── Error handling in a transaction
BEGIN;

UPDATE accounts SET balance = balance - 500 WHERE id = 1;
-- Assume next statement fails (e.g. CHECK violation)
UPDATE accounts SET balance = balance - 9999999 WHERE id = 1;
-- ERROR: new row violates check constraint "balance_non_negative"

-- The transaction is now in a failed state
-- psql prompt shows postgres=!#
-- Every subsequent statement will fail:
COMMIT;  -- ERROR: current transaction is aborted, commands ignored until ROLLBACK

-- Must ROLLBACK before proceeding
ROLLBACK;
```

```sql
-- ─── DDL in transactions — PostgreSQL supports transactional DDL
BEGIN;
  CREATE TABLE temp_feature_flag (id SERIAL, name TEXT);
  INSERT INTO temp_feature_flag (name) VALUES ('new-checkout');
  -- Test queries here
ROLLBACK;
-- Table never committed — clean slate ✅

-- This is powerful for migrations:
BEGIN;
  ALTER TABLE users ADD COLUMN loyalty_tier TEXT DEFAULT 'standard';
  UPDATE users SET loyalty_tier = 'gold' WHERE order_count > 10;
  -- verify data
  SELECT loyalty_tier, COUNT(*) FROM users GROUP BY loyalty_tier;
COMMIT;  -- or ROLLBACK if data looks wrong

-- Note: some DDL in other databases is non-transactional (MySQL).
-- PostgreSQL DDL is fully transactional — a rollback reverts schema changes too.
```

```sql
-- ─── Transaction isolation — default READ COMMITTED
-- Multiple transactions run concurrently — each sees a consistent snapshot
-- Full isolation levels covered in subtopic 2

-- ─── Long-running transactions — hold locks and bloat
-- Symptoms: VACUUM cannot reclaim dead rows, queries queue behind lock holders
-- Rule: keep transactions as short as possible
-- Rule: never wait for user input inside an open transaction
-- Rule: never do I/O (network calls) inside an open transaction
```

---

## W — Why It Matters

- Without transactions, a bank transfer that debits account A but crashes before crediting account B leaves the database in a permanently inconsistent state — money vanished. Transactions guarantee the "all or nothing" property (atomicity).
- PostgreSQL's transactional DDL is a superpower compared to MySQL — you can `BEGIN; ALTER TABLE ...; ROLLBACK;` and the schema change is reversed. This makes migration testing safe.
- Long-running transactions are one of the most common causes of PostgreSQL performance degradation — they hold row locks that block other queries, and they prevent `VACUUM` from cleaning dead rows, causing table bloat.

---

## I — Interview Q&A

### Q: What are the ACID properties and how does PostgreSQL implement them?

**A:** ACID stands for four guarantees. **Atomicity** — a transaction either commits fully or is fully rolled back; PostgreSQL uses a write-ahead log (WAL) to undo partial work on failure. **Consistency** — constraints (NOT NULL, UNIQUE, CHECK, FK) are enforced at commit time, keeping the database in a valid state. **Isolation** — concurrent transactions don't interfere with each other; PostgreSQL uses MVCC (Multi-Version Concurrency Control) to give each transaction a consistent snapshot. **Durability** — once committed, data survives crashes; the WAL is written to disk before `COMMIT` returns. PostgreSQL provides full ACID compliance for all four properties.

### Q: What is the difference between ROLLBACK and ROLLBACK TO SAVEPOINT?

**A:** `ROLLBACK` undoes all changes made since the `BEGIN` and ends the transaction — the transaction is closed. `ROLLBACK TO SAVEPOINT name` undoes all changes made since the savepoint was set, but the transaction remains open — you can continue making changes and either commit or roll back further. Savepoints are useful in loops where individual operations may fail but the overall transaction should continue. For example, inserting 1,000 rows one by one — if one fails, roll back to the savepoint and skip that row, then continue with the next.

---

## C — Common Pitfalls + Fix

### ❌ Opening a transaction then waiting for user input or an external API call

```ts
// ❌ Transaction open for seconds while waiting for external service
await db.query('BEGIN')
await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['processing', orderId])
const result = await stripeApi.chargeCard(cardToken, amount)  // ← network call, may hang
await db.query('UPDATE orders SET payment_id = $1 WHERE id = $2', [result.id, orderId])
await db.query('COMMIT')
// Transaction holds a row lock on the order for the entire Stripe API call duration ❌
```

**Fix:** Do all external calls outside the transaction, open it only for the database writes:

```ts
// ✅ External call outside the transaction
const result = await stripeApi.chargeCard(cardToken, amount)  // no lock held

await db.query('BEGIN')
await db.query('UPDATE orders SET status = $1, payment_id = $2 WHERE id = $3',
  ['processing', result.id, orderId])
await db.query('COMMIT')
// Transaction is open for milliseconds, not seconds ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a SQL transaction that: (1) creates a new order for customer `id=1` with `status='pending'` and `total=0`; (2) inserts two order items (product 1 qty 2, product 2 qty 1); (3) updates the order total to the sum of `quantity * unit_price` from the items; (4) uses `RETURNING` at each step. Wrap in `BEGIN`/`COMMIT`. Demonstrate a `SAVEPOINT` for the second item insert that can be rolled back independently.

### Solution

```sql
BEGIN;

-- Step 1: create the order
INSERT INTO orders (customer_id, status, total)
VALUES (1, 'pending', 0)
RETURNING id, customer_id, status, total;
-- Assume returns id = 10

-- Step 2a: insert first item
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (10, 1, 2, 129.99)
RETURNING *;

SAVEPOINT after_first_item;

-- Step 2b: attempt second item
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (10, 999, 1, 49.99);   -- product 999 does not exist
-- If this fails: ROLLBACK TO SAVEPOINT after_first_item;
-- Then retry:
ROLLBACK TO SAVEPOINT after_first_item;

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (10, 2, 1, 49.99)      -- product 2 exists ✅
RETURNING *;

RELEASE SAVEPOINT after_first_item;

-- Step 3: update order total
UPDATE orders
SET total = (
  SELECT SUM(quantity * unit_price)
  FROM order_items
  WHERE order_id = 10
)
WHERE id = 10
RETURNING id, total;
-- total = (2 * 129.99) + (1 * 49.99) = 309.97

COMMIT;

-- Verify
SELECT o.id, o.total, COUNT(oi.product_id) AS items
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.id = 10
GROUP BY o.id, o.total;
-- id=10 | total=309.97 | items=2
```

---

---

# 2 — Isolation Levels — Concurrency Anomalies and How to Prevent Them

---

## T — TL;DR

Isolation levels define what concurrent transactions can see of each other's in-progress work. PostgreSQL has four levels: `READ UNCOMMITTED` (treated as READ COMMITTED), `READ COMMITTED` (default), `REPEATABLE READ`, and `SERIALIZABLE`. Higher isolation prevents more anomalies but reduces concurrency. PostgreSQL uses **MVCC** (Multi-Version Concurrency Control) — readers never block writers and writers never block readers.

---

## K — Key Concepts

```sql
-- ─── MVCC — how PostgreSQL handles concurrency
-- Each row has hidden columns: xmin (created by transaction) and xmax (deleted by transaction)
-- Each transaction gets a snapshot: sees rows where xmin <= snapshot_xid and xmax is NULL or > snapshot_xid
-- Result: each transaction sees a consistent snapshot of the database as of its start
-- Readers don't block writers; writers don't block readers ✅

-- ─── The four anomalies MVCC / isolation levels prevent
-- 1. Dirty read:        reading uncommitted data from another transaction
-- 2. Non-repeatable read: same row read twice gives different values (someone committed between reads)
-- 3. Phantom read:      same WHERE clause returns different rows (someone inserted/deleted between reads)
-- 4. Serialization anomaly: result differs from any serial execution order

-- Isolation level matrix:
-- Level              | Dirty read | Non-repeatable read | Phantom read | Serialization anomaly
-- -------------------+------------+---------------------+--------------+----------------------
-- READ UNCOMMITTED   | Possible*  | Possible            | Possible     | Possible
-- READ COMMITTED     | Prevented  | Possible            | Possible     | Possible
-- REPEATABLE READ    | Prevented  | Prevented           | Prevented*   | Possible
-- SERIALIZABLE       | Prevented  | Prevented           | Prevented    | Prevented
-- *PostgreSQL READ UNCOMMITTED behaves as READ COMMITTED (no dirty reads ever)
-- *PostgreSQL REPEATABLE READ also prevents phantom reads via snapshot isolation
```

```sql
-- ─── READ COMMITTED (default) — new snapshot per statement
-- Transaction sees committed data at the START OF EACH STATEMENT

-- Session A:
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- sees 1000

-- Session B (concurrent, commits between A's two selects):
BEGIN;
UPDATE accounts SET balance = balance + 200 WHERE id = 1;
COMMIT;  -- balance is now 1200

-- Session A (same transaction, new statement):
SELECT balance FROM accounts WHERE id = 1;  -- now sees 1200 ← non-repeatable read
COMMIT;

-- This is the default and is fine for most OLTP operations
-- Problem: if you SELECT, compute something, then UPDATE based on that value,
-- another transaction may have changed the row between your SELECT and UPDATE
```

```sql
-- ─── REPEATABLE READ — snapshot fixed at transaction start
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Session A:
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- sees 1000 (snapshot fixed)

-- Session B commits: balance becomes 1200

-- Session A (same transaction):
SELECT balance FROM accounts WHERE id = 1;  -- still sees 1000 ← repeatable ✅
COMMIT;

-- Use case: generating a consistent report over multiple queries
-- Balance sheet: assets query + liabilities query must see same snapshot
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT SUM(balance) FROM asset_accounts;      -- snapshot T
SELECT SUM(balance) FROM liability_accounts;  -- same snapshot T ✅
COMMIT;
```

```sql
-- ─── SERIALIZABLE — strongest guarantee
-- All concurrent serializable transactions produce results equivalent to
-- some serial execution order (as if run one at a time)
-- Uses Serializable Snapshot Isolation (SSI) — not two-phase locking

BEGIN ISOLATION LEVEL SERIALIZABLE;
-- Your queries here
COMMIT;
-- If a serialization anomaly would occur, PostgreSQL aborts with:
-- ERROR: could not serialize access due to read/write dependencies

-- Application must be prepared to RETRY on serialization failure:
-- SQLSTATE 40001 = serialization_failure
```

```sql
-- ─── Setting isolation level
-- For a single transaction:
BEGIN ISOLATION LEVEL READ COMMITTED;
BEGIN ISOLATION LEVEL REPEATABLE READ;
BEGIN ISOLATION LEVEL SERIALIZABLE;

-- Shorthand:
START TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- For session default:
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- For database default:
ALTER DATABASE myapp SET default_transaction_isolation = 'repeatable read';
```

```sql
-- ─── Lost update — a real concurrency bug with READ COMMITTED
-- Two transactions read the same value, both compute a new value, both write

-- Session A reads balance = 1000, plans to add 100 → will write 1100
-- Session B reads balance = 1000, plans to add 200 → will write 1200

-- Both run at READ COMMITTED:
-- A: UPDATE accounts SET balance = 1100 WHERE id = 1;   -- commits
-- B: UPDATE accounts SET balance = 1200 WHERE id = 1;   -- commits (overwrites A!)
-- Final balance: 1200  ← A's +100 is LOST ❌

-- Fix 1: use atomic update (no SELECT needed)
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
-- PostgreSQL re-reads the row with a row lock when processing UPDATE ✅

-- Fix 2: SELECT FOR UPDATE (covers Subtopic 3)
-- Fix 3: REPEATABLE READ or SERIALIZABLE (second writer gets error — retry)
```

---

## W — Why It Matters

- `READ COMMITTED` is the right default for most OLTP — high concurrency, no blocking reads. Problems only arise when your logic reads a value and uses it to compute a write (read-modify-write cycles), where you need `SELECT FOR UPDATE` or an atomic update.
- Financial and inventory systems often need `REPEATABLE READ` or `SERIALIZABLE` — a balance sheet must see consistent data across all its queries, and inventory reservation must not double-sell the last unit.
- Knowing that PostgreSQL's `REPEATABLE READ` uses snapshot isolation (no phantom reads, unlike the SQL standard definition) is a PostgreSQL-specific strength that simplifies many concurrency scenarios.

---

## I — Interview Q&A

### Q: What is MVCC and why does it matter for performance?

**A:** MVCC (Multi-Version Concurrency Control) is PostgreSQL's concurrency model. Instead of using exclusive locks for reads, PostgreSQL keeps multiple versions of each row — each transaction gets a consistent snapshot of the database as it existed at a point in time. Readers never wait for writers to release locks, and writers never wait for readers. This is why PostgreSQL can serve many concurrent connections efficiently: a long-running `SELECT` doesn't block `INSERT`/`UPDATE`/`DELETE` operations. The trade-off: old row versions accumulate and must be cleaned up by `VACUUM`. Long-running transactions prevent `VACUUM` from removing old versions, causing table bloat.

### Q: What is a "lost update" and how do you prevent it in PostgreSQL?

**A:** A lost update occurs when two transactions read the same value, each computes a new value independently, and both write back — one write overwrites the other. Example: two requests both read `stock = 1`, both see stock available, both decrement to `0` and commit — but they both decrement the same original value, so one decrement is lost. Prevention approaches in order of preference: (1) atomic SQL updates (`SET stock = stock - 1 WHERE stock > 0`) — PostgreSQL re-reads the row with a lock at update time; (2) `SELECT FOR UPDATE` to lock the row at read time; (3) `REPEATABLE READ` or `SERIALIZABLE` isolation — the second writer's transaction will fail with a conflict error and must retry.

---

## C — Common Pitfalls + Fix

### ❌ Read-modify-write pattern without row lock — lost update risk

```ts
// ❌ Classic lost update scenario
const { rows } = await db.query('SELECT stock FROM products WHERE id = $1', [42])
const newStock = rows[0].stock - 1
if (newStock < 0) throw new Error('Out of stock')
await db.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, 42])
// Two concurrent requests read stock=1, both compute newStock=0, both commit
// Stock = 0 but TWO items were sold ❌
```

**Fix:** Use atomic update with a condition:

```sql
-- ✅ Atomic: PostgreSQL evaluates stock at UPDATE time with implicit row lock
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock > 0
RETURNING stock;
-- If 0 rows returned: out of stock
-- If 1 row returned: stock decremented safely ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate the non-repeatable read problem at `READ COMMITTED` and then fix it with `REPEATABLE READ`. Write two versions of a "generate monthly report" transaction that sums orders and sums order_items — show how READ COMMITTED allows a race condition between the two selects, and how REPEATABLE READ fixes it.

### Solution

```sql
-- ─── Setup: illustrate the isolation difference

-- Version 1: READ COMMITTED — non-repeatable (default)
-- If another transaction commits an order between these two selects,
-- the two totals will be inconsistent (order count ≠ item total)
BEGIN;  -- implicitly READ COMMITTED

SELECT COUNT(*), SUM(total) AS order_revenue
FROM orders
WHERE ordered_at >= DATE_TRUNC('month', now());
-- Returns: 10 orders, $5,000 revenue
-- [Another transaction inserts order + items and commits HERE]

SELECT SUM(oi.quantity * oi.unit_price) AS item_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.ordered_at >= DATE_TRUNC('month', now());
-- Returns: $5,250 ← includes the new order ← INCONSISTENT with first query ❌

COMMIT;

-- ─────────────────────────────────────────────────────

-- Version 2: REPEATABLE READ — consistent snapshot across queries
BEGIN ISOLATION LEVEL REPEATABLE READ;

SELECT COUNT(*), SUM(total) AS order_revenue
FROM orders
WHERE ordered_at >= DATE_TRUNC('month', now());
-- Returns: 10 orders, $5,000 revenue (snapshot frozen)
-- [Another transaction commits between these queries — ignored]

SELECT SUM(oi.quantity * oi.unit_price) AS item_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.ordered_at >= DATE_TRUNC('month', now());
-- Returns: $5,000 ← same snapshot — CONSISTENT ✅

COMMIT;
```

---

---

# 3 — Row-Level Locking — SELECT FOR UPDATE and SKIP LOCKED

---

## T — TL;DR

`SELECT FOR UPDATE` locks selected rows so no other transaction can modify or also lock them — essential for read-modify-write cycles. `SELECT FOR UPDATE SKIP LOCKED` skips already-locked rows — the foundation of job queues. `NOWAIT` fails immediately instead of waiting. These patterns replace application-level locking with database-guaranteed coordination.

---

## K — Key Concepts

```sql
-- ─── SELECT FOR UPDATE — acquire a row-level exclusive lock
-- Row is locked for UPDATE/DELETE until the transaction commits or rolls back

-- Classic inventory reservation (the correct way)
BEGIN;

SELECT id, stock
FROM products
WHERE id = 42
FOR UPDATE;   -- ← locks the row immediately
-- No other transaction can UPDATE this row until we COMMIT or ROLLBACK

-- Now safe to read-modify-write — no concurrent modification possible
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock > 0;

COMMIT;  -- lock released

-- ─── What FOR UPDATE prevents
-- Another transaction trying:
SELECT * FROM products WHERE id = 42 FOR UPDATE;
-- This BLOCKS until the first transaction commits
-- Two transactions cannot both hold FOR UPDATE on the same row
```

```sql
-- ─── FOR UPDATE vs FOR SHARE
FOR UPDATE   -- exclusive: blocks other writers AND other FOR UPDATE readers
FOR SHARE    -- shared: blocks writers but allows other FOR SHARE readers
FOR NO KEY UPDATE  -- like FOR UPDATE but allows FK-only updates (less restrictive)
FOR KEY SHARE      -- like FOR SHARE but only blocks key-changing updates

-- When to use which:
-- FOR UPDATE:     you plan to UPDATE or DELETE the locked row
-- FOR SHARE:      you need consistent read but won't modify (e.g. FK check)
-- FOR NO KEY UPDATE: most common FOR UPDATE variant in ORM-generated SQL
```

```sql
-- ─── NOWAIT — fail immediately if lock cannot be acquired
BEGIN;

SELECT id, stock
FROM products
WHERE id = 42
FOR UPDATE NOWAIT;  -- if already locked, throws immediately instead of blocking
-- ERROR: could not obtain lock on row in relation "products"

-- Use in web APIs where waiting is unacceptable (return 409 Conflict instead)
-- Catch SQLSTATE 55P03 (lock_not_available) in application code
ROLLBACK;
```

```sql
-- ─── SKIP LOCKED — the job queue pattern
-- Skip rows that are currently locked — take only what's available right now

-- Producer: inserts jobs
INSERT INTO job_queue (task, status, payload)
VALUES ('send_email', 'pending', '{"to": "mark@example.com"}');

-- Consumer worker process (runs in a loop):
BEGIN;

SELECT id, task, payload
FROM job_queue
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;  -- skip rows locked by other workers
-- Each concurrent worker picks a DIFFERENT job — no double-processing ✅

-- Process the job here...
UPDATE job_queue
SET status = 'completed', processed_at = now()
WHERE id = <returned_id>;

COMMIT;
```

```sql
-- ─── Full job queue schema
CREATE TABLE job_queue (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload      JSONB       NOT NULL DEFAULT '{}',
  attempts     INT         NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_job_queue_pending ON job_queue(scheduled_at)
  WHERE status = 'pending';  -- partial index — only pending jobs

-- Worker: claim and process one job
WITH claimed AS (
  SELECT id
  FROM job_queue
  WHERE status = 'pending'
    AND scheduled_at <= now()
  ORDER BY scheduled_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE job_queue
SET status = 'processing', attempts = attempts + 1
WHERE id = (SELECT id FROM claimed)
RETURNING id, task, payload;
```

```sql
-- ─── Deadlock — two transactions locking rows in opposite order
-- Session A locks row 1, then tries to lock row 2
-- Session B locks row 2, then tries to lock row 1
-- → Both wait forever → PostgreSQL detects and kills one with:
-- ERROR: deadlock detected

-- Prevention: always lock rows in a consistent order
-- If locking multiple accounts: always lock the lower id first

BEGIN;
SELECT * FROM accounts WHERE id IN (1, 5) ORDER BY id FOR UPDATE;
-- Both rows locked in id order (1, then 5) — consistent with all transactions ✅
COMMIT;
```

---

## W — Why It Matters

- Without `SELECT FOR UPDATE`, any read-modify-write cycle has a race condition under concurrent load — two workers reading the same pending job both process it, two requests both see `stock=1` and both decrement it. The row lock closes this window.
- `SKIP LOCKED` eliminates the most common job queue anti-pattern: `UPDATE ... WHERE id = (SELECT id ... ORDER BY created_at LIMIT 1)` causes lock contention when many workers compete. `SKIP LOCKED` lets N workers each pick a different job without any of them blocking.
- Deadlocks are not a bug — they're an expected consequence of row-level locking in concurrent systems. PostgreSQL detects and resolves them automatically by killing one transaction. The application must catch the error and retry. Consistent lock ordering prevents most deadlocks.

---

## I — Interview Q&A

### Q: What is `SELECT FOR UPDATE SKIP LOCKED` and why is it the right pattern for a job queue?

**A:** `SELECT FOR UPDATE` locks the selected rows so other transactions must wait before modifying them. `SKIP LOCKED` modifies this behaviour — instead of waiting, the query skips any rows that are currently locked by another transaction. In a job queue, multiple worker processes run concurrently. Each worker runs `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` — it picks one pending job that isn't already being processed by another worker. Without `SKIP LOCKED`, all workers would queue up waiting for the same row. With `SKIP LOCKED`, each worker instantly gets a different job with no contention. The lock is held until the worker commits (marking the job complete), guaranteeing exactly-once processing.

---

## C — Common Pitfalls + Fix

### ❌ Using SELECT FOR UPDATE outside a transaction — lock released immediately

```sql
-- ❌ No BEGIN — autocommit mode, lock released after the SELECT
SELECT * FROM products WHERE id = 42 FOR UPDATE;
-- Lock acquired then immediately released — provides zero protection ❌
UPDATE products SET stock = stock - 1 WHERE id = 42;
-- No longer protected ← race condition
```

**Fix:** Always use `FOR UPDATE` inside an explicit transaction:

```sql
-- ✅
BEGIN;
SELECT id, stock FROM products WHERE id = 42 FOR UPDATE;
UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock > 0;
COMMIT;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `claim_next_job` SQL function (as a plain SQL block, not PL/pgSQL) that: uses `FOR UPDATE SKIP LOCKED` to claim one pending job, updates its status to `'processing'` and increments `attempts`, and returns the job's `id`, `task`, and `payload`. Also write a `complete_job` and `fail_job` query.

### Solution

```sql
-- ─── Schema
CREATE TABLE job_queue (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',
  payload      JSONB       NOT NULL DEFAULT '{}',
  attempts     INT         NOT NULL DEFAULT 0,
  max_attempts INT         NOT NULL DEFAULT 3,
  error_msg    TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_jq_claimable
  ON job_queue (scheduled_at ASC)
  WHERE status = 'pending';

-- ─── Claim next job (run inside BEGIN...COMMIT in application)
WITH claimed AS (
  SELECT id
  FROM job_queue
  WHERE status      = 'pending'
    AND scheduled_at <= now()
    AND attempts     < max_attempts
  ORDER BY scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE job_queue
SET
  status   = 'processing',
  attempts = attempts + 1
WHERE id = (SELECT id FROM claimed)
RETURNING id, task, payload, attempts;

-- ─── Complete a job
UPDATE job_queue
SET
  status       = 'completed',
  processed_at = now()
WHERE id = $1
  AND status = 'processing'
RETURNING id;

-- ─── Fail a job (retry or mark failed)
UPDATE job_queue
SET
  status    = CASE
                WHEN attempts >= max_attempts THEN 'failed'
                ELSE 'pending'
              END,
  error_msg = $2,
  scheduled_at = CASE
                   WHEN attempts < max_attempts
                   THEN now() + (attempts * INTERVAL '1 minute')  -- exponential-ish backoff
                   ELSE scheduled_at
                 END
WHERE id = $1
  AND status = 'processing'
RETURNING id, status, attempts, scheduled_at;

-- ─── Seed test jobs
INSERT INTO job_queue (task, payload)
VALUES
  ('send_email',   '{"to": "mark@example.com"}'),
  ('resize_image', '{"url": "https://cdn.example.com/img.jpg"}'),
  ('sync_crm',     '{"user_id": 42}');
```

---

---

# 4 — Indexes Deep Dive — B-tree Internals, When They Help, When They Don't

---

## T — TL;DR

An index is a separate data structure that maps column values to physical row locations — like a book's index. PostgreSQL's default B-tree index maintains a sorted copy of the indexed values, enabling `O(log n)` lookups instead of `O(n)` sequential scans. Indexes speed up `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` but slow down `INSERT`, `UPDATE`, and `DELETE`. Add indexes where you measure a need, not preemptively everywhere.

---

## K — Key Concepts

```sql
-- ─── Creating indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
-- ↑ B-tree index (default) on a single column

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);

-- Named convention: idx_{table}_{column(s)}
-- PostgreSQL auto-names if you omit: orders_customer_id_idx

-- ─── Primary key and UNIQUE constraints create indexes automatically
-- PK → implicit B-tree unique index
-- UNIQUE → implicit B-tree unique index
-- These do NOT need explicit CREATE INDEX
```

```sql
-- ─── How B-tree works — mental model
-- The index stores (value, row_ctid) pairs in sorted order
-- Lookup: binary search through the sorted index → find row location → fetch row

-- Example: B-tree on orders.status
--  'cancelled' → [(row 4)]
--  'delivered' → [(row 1), (row 3)]
--  'pending'   → [(row 2)]

-- Query: SELECT * FROM orders WHERE status = 'delivered'
-- Without index: scan all rows (seq scan) — O(n)
-- With index:    binary search the index → jump to rows 1 and 3 — O(log n)

-- ─── Seq scan vs Index scan — how the planner chooses
-- Low selectivity (status = 'active', 90% of rows match)  → seq scan is faster
-- High selectivity (email = 'mark@example.com', 1 row)    → index scan is faster
-- Threshold: ~5-10% of rows → planner switches from index to seq scan
-- Rule: indexes help most when they are highly selective
```

```sql
-- ─── When indexes are NOT used

-- 1. Function applied to the indexed column
-- ❌ Index on email, but LOWER() is applied — index not used
SELECT * FROM users WHERE LOWER(email) = 'mark@example.com';
-- Fix: expression index (covered in Subtopic 5)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- 2. Leading wildcard in LIKE
-- ❌ B-tree cannot search for suffix patterns
SELECT * FROM products WHERE name LIKE '%keyboard%';
-- Fix: full-text search index (GIN) or pg_trgm (covered in Subtopic 5)

-- 3. Implicit type cast — column type ≠ literal type
-- ❌ orders.customer_id is BIGINT, comparing to TEXT '1'
SELECT * FROM orders WHERE customer_id = '1';  -- implicit cast → index not used
-- Fix: always match the literal type to the column type
SELECT * FROM orders WHERE customer_id = 1;    -- ✅ BIGINT literal

-- 4. OR conditions across different columns
-- ❌ Usually causes index scan on each column separately + bitmap OR (less efficient)
SELECT * FROM users WHERE email = 'a@a.com' OR username = 'mark';
-- Fix: use UNION ALL with separate indexed queries

-- 5. Very low selectivity — most rows match
-- ❌ index on is_active when 95% of rows are active
SELECT * FROM users WHERE is_active = true;   -- seq scan faster
```

```sql
-- ─── Index scan types PostgreSQL uses
-- Index Scan:        follows index → fetches each row from heap (good for small results)
-- Index Only Scan:   all needed columns are in the index → no heap fetch (fastest)
-- Bitmap Index Scan: builds a bitmap of matching pages → batch-fetches from heap
--                    used for medium-selectivity queries (5–20% of rows)
-- Sequential Scan:   reads every row — faster when most rows match

-- Index Only Scan requires: all SELECT columns are in the index
-- CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
-- SELECT customer_id, status FROM orders WHERE customer_id = 1;
-- → Index Only Scan ✅ (both columns in the index)
```

```sql
-- ─── Index maintenance costs
-- Each INSERT adds an entry to every index on the table
-- Each UPDATE on an indexed column removes old entry, adds new entry
-- Each DELETE marks the index entry as dead (vacuumed later)
-- Heavy write tables with many indexes → write amplification

-- Rule: don't index every column
-- Good index candidates:
--   FK columns (always)
--   Columns in frequent WHERE conditions
--   Columns in ORDER BY that affect query performance
--   Columns in JOIN conditions (if not already PKs)
-- Bad index candidates:
--   Columns with very few distinct values (boolean, low-cardinality enum)
--   Columns rarely queried
--   Columns on write-heavy tables with no read benefit

-- ─── Check index usage
SELECT
  schemaname, tablename, indexname,
  idx_scan    AS times_used,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;  -- unused indexes have idx_scan = 0 → candidates for removal
```

---

## W — Why It Matters

- Missing an index on a FK column is the most common PostgreSQL performance mistake — `DELETE FROM users WHERE id = 1` triggers a sequential scan of every table with a FK to users to check for references. On a 10M-row orders table, this takes seconds. An index makes it milliseconds.
- Understanding selectivity explains why indexes on boolean columns (`is_active`) often don't help — if 90% of users are active, the planner correctly chooses a seq scan over an index that would still fetch most of the table.
- Unused indexes (visible in `pg_stat_user_indexes`) are pure overhead — they consume disk space, slow writes, and are updated by VACUUM. Removing them is a free performance win.

---

## I — Interview Q&A

### Q: When does PostgreSQL choose a sequential scan over an index scan even when an index exists?

**A:** The PostgreSQL query planner estimates the cost of each scan type based on statistics. A sequential scan reads data pages sequentially — efficient due to OS read-ahead caching. An index scan jumps to specific pages — each jump may be a random I/O, which is slower than sequential I/O. When a query matches a large percentage of rows (roughly more than 5–10% of the table), fetching those rows via the index involves many random reads across many pages, making it slower than a full sequential scan. The planner also considers the `random_page_cost` vs `seq_page_cost` settings, and whether the data is on SSD (lower random_page_cost) or HDD.

---

## C — Common Pitfalls + Fix

### ❌ Applying a function to an indexed column — index bypassed

```sql
-- ❌ Index on email is not used — function changes the value being compared
SELECT * FROM users WHERE LOWER(email) = LOWER('Mark@Example.com');

-- EXPLAIN shows: Seq Scan on users (index ignored)
```

**Fix:** Create an expression index matching the function:

```sql
-- ✅ Expression index — stores LOWER(email), not email
CREATE INDEX idx_users_email_ci ON users(LOWER(email));

-- Now used:
SELECT * FROM users WHERE LOWER(email) = LOWER('Mark@Example.com');
-- EXPLAIN shows: Index Scan using idx_users_email_ci
```

---

## K — Coding Challenge + Solution

### Challenge

For the `orders` table: (1) identify which queries would benefit from an index using `EXPLAIN`; (2) create appropriate indexes for: filtering by `status`, filtering by `customer_id`, and sorting by `ordered_at DESC` with a `status` filter; (3) use `pg_stat_user_indexes` to check if indexes are being used after running some queries; (4) identify which index would support an index-only scan for `SELECT customer_id, status FROM orders WHERE customer_id = 1`.

### Solution

```sql
-- (1) Check the plan WITHOUT indexes
EXPLAIN SELECT * FROM orders WHERE status = 'delivered';
-- → Seq Scan on orders  (no index yet)

EXPLAIN SELECT * FROM orders WHERE customer_id = 1 ORDER BY ordered_at DESC;
-- → Seq Scan on orders

-- (2) Create targeted indexes
-- For status filter
CREATE INDEX idx_orders_status ON orders(status);

-- For customer_id filter (high selectivity — one customer among thousands)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- For customer + ordered_at sort (covers both filter and sort)
CREATE INDEX idx_orders_customer_ordered
  ON orders(customer_id, ordered_at DESC);

-- For order_at range queries
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);

-- (3) Run queries and check index usage
SELECT * FROM orders WHERE status = 'delivered';
SELECT * FROM orders WHERE customer_id = 1 ORDER BY ordered_at DESC;

SELECT indexname, idx_scan, idx_tup_read,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

-- (4) Index-only scan — index must contain ALL selected columns
CREATE INDEX idx_orders_customer_status
  ON orders(customer_id, status);
-- Now:
EXPLAIN SELECT customer_id, status FROM orders WHERE customer_id = 1;
-- → Index Only Scan using idx_orders_customer_status ✅
-- No heap fetch — all data comes from the index itself
```

---

---

# 5 — Index Types — Partial, Composite, Expression, GIN, BRIN

---

## T — TL;DR

PostgreSQL has six built-in index types. B-tree handles equality and ranges (the default). **Partial indexes** cover a subset of rows. **Composite indexes** cover multiple columns with a specific column order rule. **Expression indexes** index computed values. **GIN** indexes arrays, JSONB, and full-text search. **BRIN** indexes physically sequential data (timestamps, serial IDs) with tiny storage.

---

## K — Key Concepts

```sql
-- ─── Partial Index — index only rows matching a condition
-- Smaller, faster, and only maintained for the relevant rows

-- Only index pending jobs (the ones workers actually query)
CREATE INDEX idx_jobs_pending ON job_queue(scheduled_at)
  WHERE status = 'pending';
-- Workers query: WHERE status = 'pending' AND scheduled_at <= now()
-- Index is tiny (only pending rows) — fast to scan and build ✅

-- Unique partial index: unique email only among active users
CREATE UNIQUE INDEX idx_users_email_active
  ON users(email)
  WHERE deleted_at IS NULL;
-- Deleted users' emails can be reused ✅

-- Partial index for non-null column (avoids indexing the common NULL case)
CREATE INDEX idx_orders_completed
  ON orders(processed_at DESC)
  WHERE processed_at IS NOT NULL;
-- Don't index the many rows where processed_at IS NULL
```

```sql
-- ─── Composite Index — index on multiple columns
-- Column ORDER matters: the index is usable left-to-right

CREATE INDEX idx_orders_cust_status ON orders(customer_id, status);

-- Uses the index:
WHERE customer_id = 1                            -- ✅ leading column
WHERE customer_id = 1 AND status = 'delivered'   -- ✅ both columns
WHERE customer_id = 1 ORDER BY status            -- ✅ leading column + sort

-- Does NOT use the index efficiently:
WHERE status = 'delivered'                       -- ❌ non-leading column alone
-- (PostgreSQL may still use it via bitmap scan, but it's not optimal)

-- ─── Covering index — add non-filter columns to support Index Only Scan
CREATE INDEX idx_orders_covering
  ON orders(customer_id, status)
  INCLUDE (total, ordered_at);
-- SELECT customer_id, status, total, ordered_at WHERE customer_id = 1
-- → Index Only Scan — total and ordered_at in index, no heap fetch ✅
-- INCLUDE: in the index but not part of the search key (B-tree v11+)
```

```sql
-- ─── Expression Index — index on a computed expression
-- The index stores the expression result — queries using the same expression hit the index

-- Case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'mark@example.com';  -- uses index ✅

-- Computed date truncation
CREATE INDEX idx_orders_month ON orders(DATE_TRUNC('month', ordered_at));
SELECT * FROM orders WHERE DATE_TRUNC('month', ordered_at) = '2025-06-01';  -- ✅

-- Extracted JSON field
CREATE INDEX idx_users_preferences_theme
  ON users((preferences->>'theme'));  -- double parens for expression
SELECT * FROM users WHERE preferences->>'theme' = 'dark';  -- ✅
```

```sql
-- ─── GIN Index — for multi-valued types (arrays, JSONB, full-text)
-- GIN = Generalized Inverted Index: maps each element to the rows containing it

-- JSONB queries
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);
SELECT * FROM products WHERE metadata @> '{"color": "red"}';   -- uses GIN ✅
SELECT * FROM products WHERE metadata ? 'warranty';            -- key exists ✅

-- Array queries
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql'];  -- uses GIN ✅
SELECT * FROM posts WHERE 'postgresql' = ANY(tags);     -- uses GIN ✅

-- Full-text search
ALTER TABLE products ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || COALESCE(description, ''))) STORED;
CREATE INDEX idx_products_fts ON products USING GIN(search_vector);
SELECT * FROM products WHERE search_vector @@ to_tsquery('english', 'keyboard & mechanical');

-- pg_trgm — fuzzy/LIKE search with GIN
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%keyboard%';   -- now uses GIN ✅
SELECT * FROM products WHERE name % 'keyborad';         -- fuzzy match ✅
```

```sql
-- ─── BRIN Index — Block Range Index for naturally ordered data
-- Stores min/max per range of data pages (not per row)
-- Tiny size (kilobytes vs megabytes for B-tree) but only useful for sequential data

-- Perfect for: append-only log tables, time-series, auto-increment IDs
CREATE INDEX idx_events_created_brin ON events USING BRIN(created_at);
-- Range query on sequential timestamps → tiny index, fast scan ✅
SELECT * FROM events WHERE created_at BETWEEN '2025-06-01' AND '2025-06-30';

-- BRIN index: pages_per_range parameter
CREATE INDEX idx_events_brin ON events USING BRIN(created_at) WITH (pages_per_range = 32);

-- When NOT to use BRIN:
-- Random data (UUIDs, random emails) — no physical ordering → BRIN is useless
-- Point lookups (WHERE id = 42) — B-tree is faster

-- Summary: index type selection
-- B-tree (default): equality, range, ORDER BY on any comparable type
-- Partial B-tree:   subset of rows (high-cardinality filter column)
-- Composite:        multiple filter/sort columns together
-- Expression:       computed values in WHERE (LOWER, DATE_TRUNC, JSON extract)
-- GIN:              arrays, JSONB containment, full-text, LIKE with pg_trgm
-- BRIN:             sequential/time-series data, huge tables, memory-efficient
-- Hash:             equality only (rarely beats B-tree, avoid in general)
```

---

## W — Why It Matters

- Partial indexes are often 10–100x smaller than full table indexes — a `WHERE status = 'pending'` index on a job queue covers 0.1% of rows if 99.9% are completed. Smaller index = faster scans, less memory, faster writes.
- GIN on JSONB is what makes schema-flexible JSON queries fast — without a GIN index, `WHERE metadata @> '{"color": "red"}'` is a full table scan. With GIN, it's a fast inverted index lookup.
- The composite index column order rule (left-to-right prefix) is one of the most frequently misunderstood index rules — `INDEX ON (a, b)` helps queries filtering on `a` or on `(a, b)` but not on `b` alone. Getting this order wrong means the index exists but isn't used.

---

## I — Interview Q&A

### Q: In a composite index `(a, b, c)`, which query patterns can use the index?

**A:** B-tree composite indexes follow the "leftmost prefix" rule — the index is usable by any query that filters on a leftmost contiguous prefix of the indexed columns. For `INDEX ON (a, b, c)`: filtering on `a` alone uses the index. Filtering on `a, b` uses the index. Filtering on `a, b, c` uses the index fully. Filtering on `b` alone or `c` alone does not efficiently use the index (PostgreSQL may use a bitmap scan but B-tree prefix is not leveraged). Filtering on `a, c` (skipping `b`) uses the index for the `a` predicate but not for `c`. The key principle: design composite indexes with your most selective or most frequently filtered column first, followed by sort columns.

---

## C — Common Pitfalls + Fix

### ❌ Creating a composite index with columns in the wrong order

```sql
-- ❌ Queries filter by status first (low selectivity) then customer_id
CREATE INDEX idx_wrong ON orders(status, customer_id);
-- WHERE customer_id = 1 → doesn't use index efficiently (non-leading column)
-- WHERE status = 'pending' → uses index, but low selectivity anyway
```

**Fix:** Put the higher-selectivity or leading-filter column first:

```sql
-- ✅ customer_id first (high selectivity — one customer among millions)
CREATE INDEX idx_correct ON orders(customer_id, status);
-- WHERE customer_id = 1 → uses index ✅
-- WHERE customer_id = 1 AND status = 'pending' → uses both columns ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design indexes for a `notifications` table: `id`, `user_id`, `type` (email/push/sms), `status` (pending/sent/failed), `payload JSONB`, `created_at`, `sent_at`. Create: (1) a partial index for unprocessed notifications, (2) a composite index for fetching a user's recent notifications, (3) a GIN index for querying JSONB payload, (4) an expression index for extracting `payload->>'template_id'`. Write a query that uses each.

### Solution

```sql
-- ─── Schema
CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('email', 'push', 'sms')),
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed')),
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ
);

-- (1) Partial index: only pending notifications (what workers process)
CREATE INDEX idx_notif_pending
  ON notifications(created_at ASC)
  WHERE status = 'pending';
-- Used by: SELECT ... WHERE status = 'pending' ORDER BY created_at LIMIT 10

-- (2) Composite: user's recent notifications for the inbox page
CREATE INDEX idx_notif_user_recent
  ON notifications(user_id, created_at DESC);
-- Used by: WHERE user_id = 1 ORDER BY created_at DESC LIMIT 20

-- (3) GIN: query inside JSONB payload
CREATE INDEX idx_notif_payload_gin ON notifications USING GIN(payload);
-- Used by: WHERE payload @> '{"campaign_id": "abc123"}'

-- (4) Expression index: extract specific JSON key for equality
CREATE INDEX idx_notif_template
  ON notifications((payload->>'template_id'));
-- Used by: WHERE payload->>'template_id' = 'welcome_email'

-- ─── Queries that use each index
-- (1) Worker claiming pending notifications
EXPLAIN SELECT id, user_id, type, payload
FROM notifications
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
-- → Index Scan using idx_notif_pending ✅

-- (2) User inbox
EXPLAIN SELECT id, type, status, created_at
FROM notifications
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;
-- → Index Scan using idx_notif_user_recent ✅

-- (3) JSONB containment
EXPLAIN SELECT * FROM notifications
WHERE payload @> '{"campaign_id": "summer2025"}';
-- → Bitmap Index Scan using idx_notif_payload_gin ✅

-- (4) JSON key extraction
EXPLAIN SELECT * FROM notifications
WHERE payload->>'template_id' = 'welcome_email';
-- → Index Scan using idx_notif_template ✅
```

---

---

# 6 — EXPLAIN and EXPLAIN ANALYZE — Reading Query Plans

---

## T — TL;DR

`EXPLAIN` shows the query plan PostgreSQL will use — without running the query. `EXPLAIN ANALYZE` runs the query and shows actual timing and row counts alongside estimates. Learning to read query plans is the single most important skill for diagnosing slow queries. Look for: sequential scans on large tables, high estimated vs actual row count mismatches, nested loop joins on large sets, and large sort operations.

---

## K — Key Concepts

```sql
-- ─── EXPLAIN — show plan without executing
EXPLAIN SELECT * FROM orders WHERE customer_id = 1;
--                         QUERY PLAN
-- ----------------------------------------------------------
-- Index Scan using idx_orders_customer_id on orders
--   (cost=0.29..8.31 rows=2 width=64)
--   Index Cond: (customer_id = 1)

-- Reading EXPLAIN output:
-- Node type:    Index Scan, Seq Scan, Hash Join, Nested Loop, Sort, ...
-- cost=0.29..8.31
--   0.29 = startup cost (time before first row returned)
--   8.31 = total cost (time to return all rows)
--   Cost is in arbitrary units, proportional to page reads
-- rows=2:       estimated number of rows this node returns
-- width=64:     estimated average row size in bytes
```

```sql
-- ─── EXPLAIN ANALYZE — run the query, show actual vs estimated
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 1;
-- Index Scan using idx_orders_customer_id on orders
--   (cost=0.29..8.31 rows=2 width=64)
--   (actual time=0.052..0.056 rows=2 loops=1)
--   Index Cond: (customer_id = 1)
-- Planning Time: 0.2 ms
-- Execution Time: 0.1 ms

-- New fields with ANALYZE:
-- actual time=0.052..0.056:  actual startup..total time in ms
-- rows=2:                    actual rows returned
-- loops=1:                   how many times this node was executed

-- ⚠️ EXPLAIN ANALYZE actually runs the query — use ROLLBACK for write queries:
BEGIN;
EXPLAIN ANALYZE UPDATE orders SET total = total * 1.1 WHERE status = 'pending';
ROLLBACK;
```

```sql
-- ─── EXPLAIN options — more detail
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM orders WHERE status = 'delivered';
-- BUFFERS: shows shared_hit (pages from cache) vs shared_read (pages from disk)
--          high shared_read = I/O bound (consider more shared_buffers or index)
--          high shared_hit  = data in cache (good)

EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM orders;
-- JSON format: machine-readable, useful for pg_badger, explain.depesz.com

-- ─── Online plan visualizers
-- https://explain.depesz.com — paste EXPLAIN ANALYZE output
-- https://explain.dalibo.com — visual tree with color-coded slow nodes
```

```sql
-- ─── Common plan nodes and what they mean
-- Seq Scan:          reads every row — fine for small tables or high-selectivity filters
-- Index Scan:        uses B-tree index, fetches rows one by one from heap
-- Index Only Scan:   all data from index (no heap fetch) — fastest
-- Bitmap Index Scan: collects page locations from index, batch-fetches from heap
-- Nested Loop:       for each row in outer, scan inner — good for small inner sets
-- Hash Join:         builds hash table from smaller set, probes with larger — good for large sets
-- Merge Join:        both sides sorted, merge — good when both sides already sorted
-- Sort:              explicit sort (appears when ORDER BY has no index)
-- Hash Aggregate:    GROUP BY using a hash table
-- Limit:             stops after N rows
```

```sql
-- ─── Red flags to look for in EXPLAIN output

-- 1. Seq Scan on a large table (rows > 10,000)
-- Seq Scan on orders (cost=0.00..85000.00 rows=5000000 width=64)
-- Fix: add an index on the WHERE column

-- 2. Estimated rows vs actual rows wildly off
-- (cost=... rows=1 ...) (actual ... rows=50000 ...)
-- Fix: run ANALYZE to update statistics
ANALYZE orders;

-- 3. Nested Loop over large sets
-- Nested Loop (cost=... rows=1000000)
--   → Seq Scan on orders (rows=1000)
--   → Seq Scan on order_items (rows=1000 per outer row)  ← 1M total reads
-- Fix: add indexes, or hint the planner with SET enable_nestloop = off

-- 4. Hash Join with large work_mem usage
-- Hash Batches: 8 (original 1)  ← spilled to disk
-- Fix: increase work_mem for the session
SET work_mem = '64MB';

-- 5. Sort without index
-- Sort (cost=10000.. rows=100000)
--   Sort Key: ordered_at DESC
-- Fix: CREATE INDEX ON orders(ordered_at DESC)
```

```sql
-- ─── ANALYZE — update planner statistics
ANALYZE orders;       -- update stats for one table
ANALYZE;              -- update stats for entire database (runs autovacuum-like)

-- Planner uses statistics to estimate rows:
-- pg_stats view: per-column null fraction, n_distinct, histogram bounds
SELECT tablename, attname, n_distinct, null_frac, correlation
FROM pg_stats
WHERE tablename = 'orders';

-- correlation: 1.0 = physically sorted (BRIN works great), 0.0 = random
-- For index scan: correlation matters — random data has more random I/O
```

---

## W — Why It Matters

- `EXPLAIN ANALYZE` is the ground truth for query performance — every optimization decision should be based on the actual plan, not assumptions. Developers who don't use `EXPLAIN` are guessing; developers who use it are engineering.
- Estimated vs actual rows mismatch is the root cause of most bad query plans — the planner chooses joins, scan methods, and join order based on row estimates. If estimates are wrong (stale statistics), the plan is wrong. `ANALYZE` fixes this.
- Reading buffer statistics (`BUFFERS` option) distinguishes I/O-bound queries (data not in cache) from CPU-bound ones — the fix is different. I/O-bound: add indexes or more RAM. CPU-bound: simplify the query.

---

## I — Interview Q&A

### Q: What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE`?

**A:** `EXPLAIN` shows the query plan the planner chose — the estimated costs, rows, and operations — without executing the query. It's safe to run on any query including writes. `EXPLAIN ANALYZE` actually executes the query and shows both the estimated values and the actual timing and row counts. The key value of `ANALYZE` is comparing estimates to actuals — when `rows=1` (estimate) but `actual rows=50000`, the planner was wrong about selectivity and likely chose a suboptimal plan. Wrap write queries in `BEGIN; EXPLAIN ANALYZE UPDATE...; ROLLBACK;` to see the plan without committing the change.

---

## C — Common Pitfalls + Fix

### ❌ Trusting EXPLAIN without running ANALYZE on tables — stale statistics

```sql
-- ❌ After bulk importing 1 million rows, statistics are stale
-- EXPLAIN shows rows=100 (old estimate) but actual rows=1,000,000
-- Planner chooses Nested Loop (good for small sets) → catastrophically slow
EXPLAIN ANALYZE SELECT * FROM events e JOIN users u ON u.id = e.user_id;
-- Nested Loop (cost=... rows=100) (actual rows=1000000)  ← off by 10,000x ❌
```

**Fix:** Run `ANALYZE` after bulk operations:

```sql
-- ✅
ANALYZE events;   -- update statistics for the table
EXPLAIN ANALYZE SELECT * FROM events e JOIN users u ON u.id = e.user_id;
-- Now: Hash Join (cost=... rows=1000000) (actual rows=1000000) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Run four `EXPLAIN ANALYZE` queries and interpret the output: (1) a query with no index (seq scan), (2) the same query after adding an index (index scan), (3) a three-table join (identify the join strategy), (4) a query with `ORDER BY` on a non-indexed column (identify the sort node). For each, state what you see and what you would do to improve it.

### Solution

```sql
-- (1) No index — seq scan
DROP INDEX IF EXISTS idx_orders_status;
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'delivered';
-- Seq Scan on orders (cost=0.00..1.05 rows=2 width=...) (actual time=... rows=2 ...)
-- Observation: Seq Scan — fine for 4 rows, problem at 1M rows
-- Fix: CREATE INDEX idx_orders_status ON orders(status);

-- (2) After adding index — index scan
CREATE INDEX idx_orders_status ON orders(status);
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'delivered';
-- Index Scan using idx_orders_status on orders
-- Observation: Index Scan — fast even at scale
-- (For small tables, planner may still choose seq scan — correct for tiny tables)

-- (3) Three-table join — identify join strategy
EXPLAIN ANALYZE
SELECT c.name, o.id, p.name AS product
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE c.id = 1;
-- Likely: Nested Loop (outer=customers 1 row, inner=orders small)
--   Hash Join or Nested Loop for order_items
-- Observation: nested loops fine for single customer
-- Fix if slow at scale: ensure indexes on all FK columns

-- (4) ORDER BY without index — Sort node
EXPLAIN ANALYZE
SELECT id, total, ordered_at FROM orders ORDER BY total DESC;
-- Sort (cost=...) Sort Key: total DESC
--   Seq Scan on orders ...
-- Observation: Sort node = in-memory or disk sort
-- Fix: CREATE INDEX idx_orders_total ON orders(total DESC);
-- After index: Index Scan using idx_orders_total (no Sort node)

EXPLAIN ANALYZE
SELECT id, total, ordered_at FROM orders ORDER BY total DESC;
-- Index Scan using idx_orders_total on orders ✅ (no Sort node)
```

---

---

# 7 — Query Optimization Patterns — Anti-Patterns and Rewrites

---

## T — TL;DR

Most slow queries follow recognisable anti-patterns: the N+1 query problem, unbounded queries on large tables, implicit type coercion breaking indexes, `SELECT *` over-fetching, repeated subqueries, and correlated subqueries instead of joins. Learn the pattern, know the rewrite.

---

## K — Key Concepts

```sql
-- ─── Anti-pattern 1: N+1 Queries — fetch parent, then query child per row
-- ❌ Application fetches 100 orders, then queries items for each → 101 queries
-- JavaScript pseudo-code:
-- const orders = await db.query('SELECT * FROM orders WHERE customer_id = 1')
-- for (const order of orders) {
--   order.items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id])
-- }

-- Fix: one JOIN query
SELECT
  o.id     AS order_id,
  o.total,
  oi.product_id,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 1;

-- Or if you want the items as a nested structure:
SELECT
  o.id,
  o.total,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'product_id', oi.product_id,
      'quantity',   oi.quantity,
      'unit_price', oi.unit_price
    ) ORDER BY oi.product_id
  ) AS items
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 1
GROUP BY o.id, o.total;
```

```sql
-- ─── Anti-pattern 2: SELECT * — fetch all columns when you need two
-- ❌ Fetches every column, including large JSONB and TEXT blobs
SELECT * FROM products WHERE category = 'Electronics';

-- ✅ Select only what you use
SELECT id, name, price FROM products WHERE category = 'Electronics';
-- Also enables Index Only Scan if index covers those columns
```

```sql
-- ─── Anti-pattern 3: Implicit type coercion — index not used
-- ❌ Column is BIGINT, literal is TEXT — implicit cast prevents index use
SELECT * FROM orders WHERE customer_id = '1';   -- '1' is TEXT
-- EXPLAIN: Seq Scan (filter: customer_id::text = '1')

-- ✅ Match the literal type to the column type
SELECT * FROM orders WHERE customer_id = 1;     -- BIGINT literal

-- ❌ Casting the column — always prevents index use
SELECT * FROM orders WHERE customer_id::TEXT = '1';

-- ✅ Cast the literal (constant), never the column
SELECT * FROM orders WHERE customer_id = '1'::BIGINT;
```

```sql
-- ─── Anti-pattern 4: Correlated subquery in SELECT for large tables
-- ❌ Runs the subquery once per outer row — O(n²)
SELECT
  c.name,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
FROM customers c;
-- For 100,000 customers: 100,000 COUNT(*) queries ❌

-- ✅ Rewrite as LEFT JOIN + GROUP BY — single pass
SELECT
  c.name,
  COUNT(o.id) AS order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

```sql
-- ─── Anti-pattern 5: NOT IN with potentially NULL subquery
-- ❌ NULL in subquery → NOT IN returns 0 rows (silent bug)
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
-- If any order has NULL customer_id → returns NOTHING ❌

-- ✅ Use NOT EXISTS (always NULL-safe)
SELECT c.*
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- ✅ Or LEFT JOIN anti-join (same result, planner may prefer either)
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

```sql
-- ─── Anti-pattern 6: LIKE with a leading wildcard — no index
-- ❌ Leading % prevents B-tree index from being used
SELECT * FROM products WHERE name LIKE '%keyboard%';
-- EXPLAIN: Seq Scan (every row scanned)

-- ✅ Full-text search (for natural language)
SELECT * FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'keyboard');

-- ✅ pg_trgm for arbitrary LIKE/ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
SELECT * FROM products WHERE name ILIKE '%keyboard%';  -- now uses GIN index ✅
```

```sql
-- ─── Anti-pattern 7: Repeated CTE / subquery that could be materialised
-- ❌ Same expensive subquery referenced twice — may run twice (PG12+ inlining)
WITH stats AS (
  SELECT AVG(total) avg, STDDEV(total) std FROM orders
)
SELECT *, (total - stats.avg) / stats.std AS z_score
FROM orders, stats
WHERE (total - stats.avg) / stats.std > 2;

-- ✅ Force materialisation with MATERIALIZED keyword
WITH MATERIALIZED stats AS (
  SELECT AVG(total) avg, STDDEV(total) std FROM orders
)
SELECT *, (total - stats.avg) / stats.std AS z_score
FROM orders, stats
WHERE (total - stats.avg) / stats.std > 2;
```

```sql
-- ─── Anti-pattern 8: Unbounded query — no LIMIT on potentially large result
-- ❌ In a web API returning all orders for an admin — could be millions
SELECT * FROM orders ORDER BY ordered_at DESC;

-- ✅ Always paginate with LIMIT (cursor-based in Subtopic 8)
SELECT id, customer_id, total, ordered_at
FROM orders
ORDER BY ordered_at DESC
LIMIT 50;
```

---

## W — Why It Matters

- The N+1 query problem is the most impactful performance issue in backend applications — it's invisible during development (small dataset) and catastrophic in production (thousands of users with hundreds of orders each = hundreds of thousands of queries per page load).
- Implicit type coercion is a silent index killer — the query looks correct and returns the right results, but `EXPLAIN` reveals a full table scan because the planner can't use the index on a casted column. Always match literal types to column types.
- Most "slow query" tickets in production trace back to one of these eight patterns. Knowing them means you can diagnose and fix most performance issues in under 10 minutes.

---

## I — Interview Q&A

### Q: What is the N+1 query problem and how do you fix it in SQL?

**A:** The N+1 problem occurs when you execute 1 query to fetch N parent records, then execute 1 additional query per parent to fetch its children — resulting in N+1 total queries. Example: fetch 100 orders (1 query), then fetch items for each order (100 queries) = 101 total. The fix in SQL is to use a JOIN with the parent query to fetch all children in a single query, then group the results in application code or use `JSONB_AGG` to produce nested JSON directly from PostgreSQL. ORMs solve N+1 with eager loading (`include`/`with` clauses), which generates a JOIN or an `IN (list_of_ids)` query.

---

## C — Common Pitfalls + Fix

### ❌ Applying COALESCE to an indexed column in WHERE — breaks index

```sql
-- ❌ Wrapping the column in a function breaks index usage
SELECT * FROM users WHERE COALESCE(display_name, username) = 'mark';
-- EXPLAIN: Seq Scan — function on column prevents index use

-- ✅ Restructure the condition — don't touch the column
SELECT * FROM users WHERE display_name = 'mark'
UNION ALL
SELECT * FROM users WHERE display_name IS NULL AND username = 'mark';
-- Both branches can use their respective column indexes ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Identify and rewrite the following three slow queries: (1) a correlated subquery in SELECT that counts items per order for all orders; (2) a `NOT IN` query that finds products never ordered (with potential NULL risk); (3) an `ORDER BY` on a computed expression with no index.

### Solution

```sql
-- (1) ❌ Correlated subquery — runs once per order row
SELECT
  o.id,
  o.total,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
FROM orders o;

-- ✅ Rewrite: LEFT JOIN + GROUP BY — single pass
SELECT
  o.id,
  o.total,
  COUNT(oi.product_id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.total
ORDER BY o.id;

-- (2) ❌ NOT IN — NULL-unsafe (if any order_item has NULL product_id → 0 rows returned)
SELECT id, name FROM products
WHERE id NOT IN (SELECT product_id FROM order_items);

-- ✅ NOT EXISTS — always NULL-safe
SELECT p.id, p.name
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);

-- (3) ❌ ORDER BY on computed expression — forces a Sort node
SELECT id, quantity * unit_price AS line_total
FROM order_items
ORDER BY quantity * unit_price DESC;
-- EXPLAIN: Sort → Seq Scan (expensive for large tables)

-- ✅ Option A: add a computed column + index
ALTER TABLE order_items ADD COLUMN line_total
  NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;
CREATE INDEX idx_order_items_line_total ON order_items(line_total DESC);
SELECT id, line_total FROM order_items ORDER BY line_total DESC;
-- EXPLAIN: Index Scan using idx_order_items_line_total ✅

-- ✅ Option B: expression index (no schema change)
CREATE INDEX idx_order_items_expr ON order_items((quantity * unit_price) DESC);
SELECT id, quantity * unit_price AS line_total
FROM order_items
ORDER BY quantity * unit_price DESC;
-- EXPLAIN: Index Scan using idx_order_items_expr ✅
```

---

---

# 8 — Pagination Patterns — OFFSET vs Cursor-Based

---

## T — TL;DR

`LIMIT / OFFSET` pagination is simple but gets exponentially slower as the page number grows — `OFFSET 100000` scans and discards 100,000 rows before returning the next 20. **Cursor-based pagination** (keyset pagination) uses `WHERE id > last_seen_id LIMIT n` — it's `O(log n)` regardless of page depth and is the correct pattern for production APIs.

---

## K — Key Concepts

```sql
-- ─── OFFSET pagination — simple, but degrades at depth
-- Page 1
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 0;
-- Page 2
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20;
-- Page 100
SELECT id, name, created_at FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 1980;
-- PostgreSQL scans 2000 rows and discards the first 1980 to return 20 ❌

-- At OFFSET 100,000:
-- Scans 100,020 rows, returns 20 — O(offset) cost ← unusable at scale
```

```sql
-- ─── Cursor-based pagination — O(log n) regardless of depth
-- Uses WHERE to skip to the right position via an indexed column

-- First page (no cursor)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC, id DESC   -- secondary sort on id for stability
LIMIT 20;
-- Returns rows, capture the last row's (created_at, id):
-- last_created_at = '2025-06-10 14:30:00+08'
-- last_id = 42

-- Next page (pass cursor values from last row)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < ('2025-06-10 14:30:00+08', 42)  -- row tuple comparison
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- PostgreSQL uses the index on (created_at DESC, id DESC) and starts EXACTLY
-- after the cursor position — no rows scanned and discarded ✅
```

```sql
-- ─── Index supporting cursor pagination
-- The index must match the ORDER BY columns exactly
CREATE INDEX idx_posts_pagination
  ON posts(is_published, created_at DESC, id DESC)
  WHERE is_published = true;  -- partial: only published posts

-- Or without partial (when is_published is not in ORDER BY):
CREATE INDEX idx_posts_created_id
  ON posts(created_at DESC, id DESC);
-- Works for: ORDER BY created_at DESC, id DESC
-- EXPLAIN shows: Index Scan using idx_posts_created_id ✅
```

```sql
-- ─── Cursor with simple integer ID — easiest form
-- For tables where id is naturally ordered by creation time:
-- (BIGINT GENERATED ALWAYS AS IDENTITY is sequential)

-- First page
SELECT id, title FROM posts ORDER BY id DESC LIMIT 20;
-- Returns last_id = 980 (the 20th row)

-- Next page
SELECT id, title FROM posts WHERE id < 980 ORDER BY id DESC LIMIT 20;
-- Uses the PK index — O(log n), instant at any depth ✅

-- This pattern is returned as { data: [...], nextCursor: 980 } in the API response
```

```sql
-- ─── Bidirectional cursor (forward + backward)
-- Forward: WHERE (created_at, id) < (cursor_created_at, cursor_id)
-- Backward: WHERE (created_at, id) > (cursor_created_at, cursor_id) ORDER BY ... ASC → REVERSE

-- Stable sort: always include a tie-breaker (id) when the primary sort column
-- (created_at) is not unique — otherwise cursor position is ambiguous

-- ─── Returning total count separately (for pagination UI)
-- Cursor pagination doesn't give "page 5 of 200" — it gives "next" only
-- For a count display: run a separate COUNT(*) query with only the filter (no LIMIT/ORDER)
SELECT COUNT(*) FROM posts WHERE is_published = true;
-- Cache this count; it doesn't need to be exact for UX purposes
```

```sql
-- ─── OFFSET pagination trade-offs
-- Pros: simple, supports "go to page N", easy to implement
-- Cons: O(offset) — slow at depth, inconsistent (inserted rows shift pages)

-- OFFSET is acceptable when:
-- Total rows < ~10,000 (offset cost is negligible)
-- You need "go to page N" navigation
-- Data rarely changes (no shifting pages)

-- Cursor is required when:
-- Table is large (millions of rows)
-- Users scroll infinitely (social feed, search results)
-- Data changes frequently (offset-based shows duplicates/gaps on refresh)

-- ─── API response shape for cursor pagination
-- {
--   "data": [...20 items...],
--   "pagination": {
--     "hasNextPage": true,
--     "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNS0wNi0xMCJ9"  ← base64 encoded JSON
--   }
-- }
-- Opaque cursor: encode (created_at, id) as base64 JSON so clients can't manipulate it
```

---

## W — Why It Matters

- `OFFSET 10000 LIMIT 20` on a 5M-row table takes seconds — it's a full scan of 10,020 rows on every request. At page 500 of a mobile infinite-scroll feed, every scroll triggers a second+ query. This kills both performance and user experience.
- Cursor pagination is stable under concurrent inserts — `OFFSET`-based pagination shows the same post twice (or skips a post) when a new post is inserted between page fetches. Cursor pagination always continues exactly from where it left off.
- The "encode cursor as opaque base64" pattern is an API design best practice — clients should not be able to construct cursors manually, and the cursor format can change (add more fields) without breaking the client interface.

---

## I — Interview Q&A

### Q: What is the performance problem with OFFSET pagination and how does cursor-based pagination solve it?

**A:** `OFFSET n` instructs PostgreSQL to find and discard the first `n` rows before returning the next page. Even with an index, this is `O(n)` work — at page 1000 with 20 items per page, PostgreSQL processes 20,000 rows and returns 20. Performance degrades linearly with page depth. Cursor-based pagination replaces `OFFSET` with a `WHERE` condition using the last seen row's value: `WHERE (created_at, id) < (last_created_at, last_id) ORDER BY created_at DESC, id DESC LIMIT 20`. PostgreSQL uses the B-tree index to jump directly to the cursor position — it's `O(log n)` regardless of how many pages deep the user is. The trade-off: cursor pagination doesn't support random page access ("jump to page 50") — it's sequential navigation only.

---

## C — Common Pitfalls + Fix

### ❌ Cursor pagination without a tie-breaking secondary sort — unstable cursor

```sql
-- ❌ created_at is not unique — multiple posts at same timestamp
SELECT id, title FROM posts WHERE created_at < '2025-06-10 14:30:00' ORDER BY created_at DESC LIMIT 20;
-- If 5 posts share that exact timestamp, cursor position is ambiguous → skip/duplicate posts ❌
```

**Fix:** Always add a secondary unique sort key (id):

```sql
-- ✅ (created_at, id) together is unique — stable cursor
SELECT id, title
FROM posts
WHERE (created_at, id) < ('2025-06-10 14:30:00+08', 42)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

---

## K — Coding Challenge + Solution

### Challenge

Implement both pagination styles for a `posts` table (`id`, `title`, `author_id`, `is_published`, `created_at`). (1) OFFSET pagination function for page N with a configurable page size, (2) cursor-based pagination using `(created_at, id)` as the cursor, returning the next cursor value. Include the supporting index. Show an example of three "page" fetches.

### Solution

```sql
-- ─── Schema
CREATE TABLE posts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT        NOT NULL,
  author_id    BIGINT      NOT NULL,
  is_published BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed
INSERT INTO posts (title, author_id, is_published, created_at) VALUES
  ('Post 1', 1, true,  now() - INTERVAL '10 days'),
  ('Post 2', 1, true,  now() - INTERVAL '9 days'),
  ('Post 3', 2, true,  now() - INTERVAL '8 days'),
  ('Post 4', 1, false, now() - INTERVAL '7 days'),
  ('Post 5', 2, true,  now() - INTERVAL '6 days'),
  ('Post 6', 1, true,  now() - INTERVAL '5 days'),
  ('Post 7', 2, true,  now() - INTERVAL '4 days');

-- Supporting index for cursor pagination
CREATE INDEX idx_posts_cursor ON posts(is_published, created_at DESC, id DESC)
  WHERE is_published = true;

-- ─── (1) OFFSET pagination
-- Page 1 (page=1, size=3)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 3 OFFSET 0;

-- Page 2 (page=2, size=3)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 3 OFFSET 3;

-- ─── (2) Cursor-based pagination
-- Page 1: no cursor
SELECT id, title, created_at
FROM posts
WHERE is_published = true
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: Post 7 (id=7), Post 6 (id=6), Post 5 (id=5)
-- Cursor = last row: created_at of Post 5, id = 5

-- Page 2: cursor = (Post 5's created_at, id=5)
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < (now() - INTERVAL '6 days', 5)
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: Post 3 (id=3), Post 2 (id=2), Post 1 (id=1)
-- Cursor = last row: created_at of Post 1, id = 1

-- Page 3: cursor = (Post 1's created_at, id=1) → no more rows
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (created_at, id) < (now() - INTERVAL '10 days', 1)
ORDER BY created_at DESC, id DESC
LIMIT 3;
-- Returns: 0 rows → hasNextPage = false ✅

-- ─── Reusable cursor pagination query (parameterised)
-- $1 = cursor_created_at (NULL for first page)
-- $2 = cursor_id (NULL for first page)
-- $3 = page_size
SELECT id, title, created_at
FROM posts
WHERE is_published = true
  AND (
    $1::TIMESTAMPTZ IS NULL          -- first page: no cursor
    OR (created_at, id) < ($1::TIMESTAMPTZ, $2::BIGINT)
  )
ORDER BY created_at DESC, id DESC
LIMIT $3;
```

---

---

# 9 — Bulk Write Patterns — COPY, Batch Inserts, Upserts at Scale

---

## T — TL;DR

Inserting or updating millions of rows one at a time is orders of magnitude slower than bulk operations. `COPY` is the fastest data loading mechanism in PostgreSQL. Multi-row `INSERT` with `VALUES` batches reduces round trips. `ON CONFLICT` enables idempotent upserts at scale. Staging table patterns (`INSERT → COPY → MERGE`) handle complex bulk operations safely.

---

## K — Key Concepts

```sql
-- ─── Multi-row INSERT — always better than one-at-a-time
-- ❌ 1,000 individual inserts = 1,000 round trips, 1,000 parse+plan cycles
INSERT INTO products (sku, name, price) VALUES ('A001', 'Item 1', 9.99);
INSERT INTO products (sku, name, price) VALUES ('A002', 'Item 2', 19.99);
-- ...

-- ✅ One INSERT with multiple VALUES tuples = 1 round trip
INSERT INTO products (sku, name, price)
VALUES
  ('A001', 'Item 1',  9.99),
  ('A002', 'Item 2', 19.99),
  ('A003', 'Item 3', 29.99)
  -- ... up to ~1,000 rows per statement (diminishing returns beyond that)
ON CONFLICT (sku) DO NOTHING;  -- safe to re-run ✅
```

```sql
-- ─── COPY — fastest bulk load (bypasses row-level checks partially)
-- COPY FROM: load data from a file or stdin
-- COPY TO:   export data to a file or stdout

-- Load from CSV file (server-side file path — server must have access)
COPY products (sku, name, price, stock_count)
FROM '/tmp/products.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- Load from stdin (client-side — works with psql)
COPY products (sku, name, price)
FROM STDIN WITH (FORMAT csv);
A001,Item 1,9.99
A002,Item 2,19.99
\.   -- end of data marker

-- Export to CSV
COPY (SELECT id, sku, name, price FROM products WHERE is_available = true)
TO '/tmp/available_products.csv'
WITH (FORMAT csv, HEADER true);

-- ─── \copy — client-side COPY (works without superuser, uses local file)
\copy products (sku, name, price) FROM '/local/path/products.csv' CSV HEADER
\copy (SELECT * FROM products) TO '/local/export.csv' CSV HEADER
```

```sql
-- ─── COPY vs INSERT performance
-- COPY:   ~100,000–500,000 rows/second (bypasses some overhead)
-- INSERT (multi-row, batch of 1000): ~10,000–50,000 rows/second
-- INSERT (individual): ~1,000–5,000 rows/second
-- Rule: COPY for initial loads and large imports; INSERT for application writes

-- ─── COPY performance tips
-- 1. Disable indexes during load, rebuild after
ALTER INDEX idx_products_sku RENAME TO idx_products_sku_disabled;
-- (or use pg_index to mark invalid)
COPY products FROM '/tmp/big_file.csv' CSV HEADER;
ALTER INDEX idx_products_sku_disabled RENAME TO idx_products_sku;

-- 2. Wrap in a transaction
BEGIN;
COPY products FROM '/tmp/products.csv' CSV HEADER;
COMMIT;

-- 3. Set work_mem for sorting during index rebuild
SET maintenance_work_mem = '512MB';
REINDEX TABLE products;
```

```sql
-- ─── Staging table pattern — for complex bulk upserts
-- Step 1: load raw data into a staging table (no indexes, no FKs)
CREATE TEMP TABLE products_staging (
  LIKE products INCLUDING DEFAULTS   -- same structure, no constraints
) ON COMMIT DROP;   -- auto-dropped after transaction

-- Step 2: bulk load into staging (fast — no constraint checks)
COPY products_staging (sku, name, price, stock_count)
FROM '/tmp/products_update.csv' CSV HEADER;

-- Step 3: validate staging data
SELECT COUNT(*) FROM products_staging WHERE price < 0;  -- sanity check
SELECT COUNT(*) FROM products_staging;

-- Step 4: upsert from staging to production
INSERT INTO products (sku, name, price, stock_count)
SELECT sku, name, price, stock_count FROM products_staging
ON CONFLICT (sku)
  DO UPDATE SET
    name        = EXCLUDED.name,
    price       = EXCLUDED.price,
    stock_count = EXCLUDED.stock_count
;

-- Step 5: COMMIT — temp table dropped automatically
```

```sql
-- ─── Bulk UPDATE from staging table
-- Update prices from a data feed

CREATE TEMP TABLE price_feed (sku TEXT, new_price NUMERIC(10,2)) ON COMMIT DROP;

COPY price_feed FROM STDIN CSV;
A001,89.99
A002,34.99
A003,64.99
\.

BEGIN;

UPDATE products AS p
SET
  price      = f.new_price,
  updated_at = now()
FROM price_feed AS f
WHERE p.sku = f.sku
RETURNING p.sku, p.price;

-- Verify row count before committing
-- If count looks right:
COMMIT;
```

```sql
-- ─── Bulk upsert performance tuning
-- 1. Wrap in a single transaction (amortises WAL overhead)
-- 2. Disable autovacuum during bulk write (re-enable after)
ALTER TABLE products DISABLE TRIGGER ALL;  -- also disables triggers (careful with FKs)
-- ... bulk write ...
ALTER TABLE products ENABLE TRIGGER ALL;

-- 3. Increase wal_buffers and synchronous_commit for bulk loads
SET synchronous_commit = OFF;   -- async commit — faster, tiny risk of last-transaction loss
-- Only for non-critical imports; always ON for financial/transactional data

-- 4. Use UNLOGGED tables for staging (no WAL = much faster writes, but lost on crash)
CREATE UNLOGGED TABLE products_staging (...);
-- Fine for staging tables that are rebuilt from source data

-- ─── Batch size tuning
-- INSERT with 100–1000 rows per statement is typically optimal
-- Beyond ~5000 rows per statement: diminishing returns, memory pressure
-- Profile your specific schema: a wide row (many columns) benefits from smaller batches
```

```sql
-- ─── Measuring bulk write throughput
-- Use EXPLAIN ANALYZE on a sample INSERT:
EXPLAIN ANALYZE
INSERT INTO products (sku, name, price)
SELECT 'SKU-' || g, 'Product ' || g, (random() * 100)::NUMERIC(10,2)
FROM generate_series(1, 10000) AS g
ON CONFLICT (sku) DO NOTHING;

-- generate_series: built-in set-returning function — great for test data
SELECT * FROM generate_series(1, 5) AS n;
-- 1, 2, 3, 4, 5

-- Generate test orders:
INSERT INTO orders (customer_id, status, total)
SELECT
  (random() * 4 + 1)::INT,
  (ARRAY['pending','delivered','cancelled'])[ceil(random() * 3)],
  (random() * 500 + 5)::NUMERIC(10,2)
FROM generate_series(1, 10000);
```

---

## W — Why It Matters

- `COPY` is 10–100x faster than individual `INSERT` statements for loading data — it's the reason ETL jobs that take an hour with INSERTs take minutes with COPY. Knowing `COPY` vs `\copy` (server-side vs client-side) is an operational skill every backend developer needs.
- The staging table pattern is the production-safe way to do bulk upserts — load into an unvalidated temp table, verify the data, then atomically merge into the production table. If the verification fails, you drop the staging table; production is untouched.
- `synchronous_commit = OFF` is a targeted performance lever for bulk imports where losing the last transaction on a crash is acceptable — e.g. a product catalog sync that can simply re-run. Never use it for financial transactions.

---

## I — Interview Q&A

### Q: What is the difference between `COPY` and `INSERT` and when would you use each?

**A:** Both load data into a table, but they differ in mechanism and performance. `INSERT` is a standard SQL statement — it parses the query, plans it, acquires locks, checks all constraints, fires triggers, and writes to WAL for each batch. `COPY` is a PostgreSQL-specific bulk load command — it uses a more efficient binary protocol, skips the SQL parser, and processes data in large streaming batches. `COPY` is 10–100x faster for loading large files. Use `COPY` for initial data loads, migrations, importing CSV/TSV data, and ETL jobs. Use `INSERT` for application writes, small batches, and when you need `ON CONFLICT` logic (though `COPY` can be combined with a staging table + `INSERT ... ON CONFLICT`).

### Q: How does the staging table pattern work for bulk upserts?

**A:** Load raw data into an `UNLOGGED` or `TEMP` table first — it has no indexes, no FK constraints, and no triggers, so loading is very fast. Run validation queries on the staging table to catch bad data before it touches production. Then use `INSERT INTO production SELECT FROM staging ON CONFLICT DO UPDATE` to atomically merge the staging data into production. The whole merge can be wrapped in `BEGIN ... COMMIT` for atomicity. If validation fails, `ROLLBACK` or simply drop the temp table — production is never touched. This pattern is safer and faster than trying to upsert directly from a file into a constrained production table.

---

## C — Common Pitfalls + Fix

### ❌ COPY without a transaction — partial load on failure

```sql
-- ❌ COPY fails halfway through a 1M-row file
COPY products FROM '/tmp/products.csv' CSV HEADER;
-- 500,000 rows inserted before error — half the data in, half missing ❌
```

**Fix:** Always wrap `COPY` in an explicit transaction:

```sql
-- ✅ All or nothing
BEGIN;
COPY products FROM '/tmp/products.csv' CSV HEADER;
-- validate:
SELECT COUNT(*) FROM products;
COMMIT;  -- or ROLLBACK if count is wrong
```

### ❌ Disabling `synchronous_commit` globally — data loss on crash for all transactions

```sql
-- ❌ Disabling globally affects all connections including financial writes
ALTER SYSTEM SET synchronous_commit = OFF;
-- A crash could lose the last few transactions of any type ❌
```

**Fix:** Set it only for the current session or specific bulk operations:

```sql
-- ✅ Only for this session, this bulk job
BEGIN;
SET LOCAL synchronous_commit = OFF;  -- affects only this transaction
COPY products_import FROM '/tmp/catalog.csv' CSV HEADER;
COMMIT;
-- After COMMIT, synchronous_commit reverts to default ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete bulk product catalog sync: (1) create an `UNLOGGED` staging table with the same structure as `products`; (2) use `generate_series` to simulate loading 1,000 rows into staging; (3) run a validation check (no negative prices); (4) upsert from staging to products using `ON CONFLICT`; (5) log a summary of rows inserted vs updated; (6) clean up staging. Wrap everything in a single transaction.

### Solution

```sql
BEGIN;

-- (1) Unlogged staging table
CREATE UNLOGGED TABLE products_sync_staging (
  sku         TEXT           NOT NULL,
  name        TEXT           NOT NULL,
  price       NUMERIC(10,2)  NOT NULL,
  stock_count INT            NOT NULL DEFAULT 0,
  category    TEXT           NOT NULL DEFAULT 'General'
);

-- (2) Simulate bulk load with generate_series
INSERT INTO products_sync_staging (sku, name, price, stock_count, category)
SELECT
  'SYNC-' || LPAD(g::TEXT, 4, '0'),
  'Product ' || g,
  ROUND((random() * 200 + 1)::NUMERIC, 2),
  (random() * 100)::INT,
  (ARRAY['Electronics', 'Stationery', 'Accessories'])[ceil(random() * 3)]
FROM generate_series(1, 1000) AS g;

-- (3) Validation — abort if any invalid rows
DO $$
DECLARE invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM products_sync_staging
  WHERE price <= 0 OR sku IS NULL OR name IS NULL;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Staging validation failed: % invalid rows', invalid_count;
  END IF;
END $$;

-- (4) Upsert from staging to products
-- First, ensure products table has the category and stock_count columns:
-- (Assume they exist from Day 2 schema or add them:)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count INT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';

WITH upsert_result AS (
  INSERT INTO products (sku, name, price, stock_count, category)
  SELECT sku, name, price, stock_count, category
  FROM products_sync_staging
  ON CONFLICT (sku)
    DO UPDATE SET
      name        = EXCLUDED.name,
      price       = EXCLUDED.price,
      stock_count = EXCLUDED.stock_count,
      category    = EXCLUDED.category
  RETURNING
    xmax = 0 AS is_insert   -- xmax = 0 means it was an INSERT (not UPDATE)
)
-- (5) Log summary
SELECT
  COUNT(*) FILTER (WHERE is_insert)      AS rows_inserted,
  COUNT(*) FILTER (WHERE NOT is_insert)  AS rows_updated,
  COUNT(*)                               AS rows_total
FROM upsert_result;

-- rows_inserted | rows_updated | rows_total
-- -------------+--------------+------------
-- (depends on how many SKUs already existed in products)

-- (6) Clean up staging
DROP TABLE products_sync_staging;

COMMIT;

-- Verify
SELECT COUNT(*), MIN(price), MAX(price) FROM products WHERE sku LIKE 'SYNC-%';
```

---

## ✅ Day 4 Complete — PostgreSQL Reliability and Performance

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Transactions — BEGIN, COMMIT, ROLLBACK, SAVEPOINT | ☐ |
| 2 | Isolation Levels and Concurrency Anomalies | ☐ |
| 3 | Row-Level Locking — FOR UPDATE, SKIP LOCKED | ☐ |
| 4 | Indexes Deep Dive — B-tree, Selectivity, When Not Used | ☐ |
| 5 | Index Types — Partial, Composite, Expression, GIN, BRIN | ☐ |
| 6 | EXPLAIN and EXPLAIN ANALYZE | ☐ |
| 7 | Query Optimization Anti-Patterns | ☐ |
| 8 | Pagination — OFFSET vs Cursor-Based | ☐ |
| 9 | Bulk Write Patterns — COPY, Staging, Upserts | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
TRANSACTIONS
  BEGIN → COMMIT      atomic: all succeed or all rollback
  BEGIN → ROLLBACK    undo everything since BEGIN
  SAVEPOINT name      partial rollback point inside a transaction
  ROLLBACK TO name    undo since savepoint (transaction stays open)
  DDL is transactional in PostgreSQL (ALTER TABLE, CREATE TABLE)
  Keep transactions SHORT: no external I/O, no user input inside
  Long tx = locks held + VACUUM blocked + table bloat

ISOLATION LEVELS
  READ COMMITTED (default): snapshot per statement — non-repeatable reads possible
  REPEATABLE READ:           snapshot per transaction — consistent across queries
  SERIALIZABLE:              full serializability — may abort (retry on 40001)
  MVCC: readers never block writers, writers never block readers
  Lost update fix: atomic UPDATE (SET col = col - 1), FOR UPDATE, or SERIALIZABLE

LOCKING
  SELECT FOR UPDATE          exclusive row lock — blocks other writers and FOR UPDATE
  SELECT FOR SHARE           shared row lock — blocks writers, allows other FOR SHARE
  SELECT FOR UPDATE NOWAIT   fail immediately if locked (catch SQLSTATE 55P03)
  SELECT FOR UPDATE SKIP LOCKED  skip locked rows — job queue pattern ✅
  Deadlock: always lock rows in consistent order (ORDER BY id)
  PostgreSQL auto-detects deadlocks and kills one transaction (must retry)

INDEXES
  B-tree (default): equality, range, ORDER BY on comparable values
  Created automatically for: PRIMARY KEY, UNIQUE constraints
  Index used when: high selectivity (< ~10% rows match)
  Index skipped when: function on column, type mismatch, leading LIKE wildcard, low selectivity
  Always index: FK columns, frequent WHERE/JOIN/ORDER BY columns
  Check usage: pg_stat_user_indexes (idx_scan = 0 → unused → remove)

INDEX TYPES
  Partial:    WHERE status = 'pending' — smaller, faster, less write overhead
  Composite:  (a, b, c) — leftmost prefix rule (a only, a+b, a+b+c — not b alone)
  Expression: LOWER(email), DATE_TRUNC('month', ts) — index the expression, not the column
  INCLUDE:    covering index — extra columns in index leaf (Index Only Scan)
  GIN:        arrays, JSONB @>, ?, full-text @@, ILIKE with pg_trgm
  BRIN:       sequential data (timestamps, serial IDs) — tiny index, range scan only
  Hash:       equality only — rarely beats B-tree (avoid in general)

EXPLAIN
  EXPLAIN:         show plan, estimates only, no execution
  EXPLAIN ANALYZE: execute + show actual timing and rows
  EXPLAIN (ANALYZE, BUFFERS): add cache hit/miss stats
  Nodes: Seq Scan, Index Scan, Index Only Scan, Bitmap Index Scan
         Nested Loop, Hash Join, Merge Join, Sort, Hash Aggregate, Limit
  Red flags:
    Seq Scan on large table         → add index
    rows estimate vs actual mismatch → ANALYZE table
    Sort node on large result        → add ORDER BY index
    Hash Batches > 1                 → increase work_mem
    Nested Loop over large outer set → force Hash Join

QUERY ANTI-PATTERNS
  N+1:        loop fetch parent then child per row → JOIN once
  SELECT *:   over-fetching, breaks Index Only Scan
  Type mismatch: WHERE bigint_col = '1' → cast literal, not column
  Correlated SELECT subquery: O(n²) → LEFT JOIN + GROUP BY
  NOT IN with nullable subquery → use NOT EXISTS
  LIKE '%x%': leading % breaks B-tree → GIN + pg_trgm
  COALESCE(column, val) in WHERE → restructure condition
  Unbounded query: no LIMIT on large table → always paginate

PAGINATION
  OFFSET:        simple, O(offset) — slow at depth, unstable on insert
  Cursor-based:  WHERE (sort_col, id) < (cursor) — O(log n), stable
  Always add secondary sort (id) for stable cursor when primary sort is non-unique
  Index must match ORDER BY columns exactly
  API pattern: return nextCursor as opaque base64 JSON

BULK WRITES
  Multi-row INSERT:  VALUES (...),(...),(...) — 1 round trip per 1000 rows
  COPY FROM:         fastest load — server-side file or stdin
  \copy:             client-side COPY (no superuser needed)
  Staging table:     TEMP/UNLOGGED → validate → INSERT ... ON CONFLICT
  Transaction wrap:  always wrap COPY in BEGIN/COMMIT
  synchronous_commit OFF: bulk-load performance, set LOCAL only
  UNLOGGED tables:   no WAL = fast writes, lost on crash (staging only)
  generate_series:   generate test data without external files
  Batch size:        100–1000 rows per INSERT statement (sweet spot)
```

> **Your next action:** Find any query in your project (or write a test query on your Day 3 schema). Run `EXPLAIN ANALYZE` on it. Look at one thing: is it a `Seq Scan` on
