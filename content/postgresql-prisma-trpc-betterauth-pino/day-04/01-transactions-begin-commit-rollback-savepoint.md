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
