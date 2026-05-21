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
