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
