
# 📅 Day 9 — Prisma Advanced Querying

> **Goal:** Go beyond basic CRUD — master transactions, batch operations, raw SQL escape hatches, concurrency safety patterns, and how to organize your data layer cleanly for a production TypeScript backend.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** Prisma ORM 7.x · PostgreSQL 18 · TypeScript 6 · Node.js

---

## 📋 Day 9 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Transactions — Interactive and Batch | 12 min |
| 2 | Batching Mindset — Promise.all, Avoiding N+1, Query Counting | 12 min |
| 3 | Raw SQL — $queryRaw, $executeRaw, Safety Rules | 12 min |
| 4 | Consistency Patterns — Optimistic Locking, Idempotency, Retry | 12 min |
| 5 | Data-Layer Organization — Services, Repositories, Procedures | 12 min |

---

---

# 1 — Transactions — Interactive and Batch

---

## T — TL;DR

Prisma Client has two transaction modes. **Batch transactions** send multiple independent operations in one network round-trip — all succeed or all fail. **Interactive transactions** give you a transaction-scoped client (`tx`) inside a callback — use it for read-modify-write cycles, conditional logic, and any multi-step operation that must be atomic. Both wrap all operations in a single PostgreSQL `BEGIN … COMMIT`.

---

## K — Key Concepts

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── Batch transaction — array of independent operations ───────────────────
// All run in one round trip. No shared state between them.
const [user, settings] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'a@a.com', name: 'Alice' } }),
  prisma.settings.create({ data: { userId: 0, theme: 'dark' } }),
  // Note: userId: 0 here won't use the user.id from above —
  // batch transactions cannot share results between operations.
])
// Both committed atomically, but you can't pipe output of op1 into op2 ✅

// ── Interactive transaction — callback with tx client ─────────────────────
// Use when: you need the result of one query to inform the next
const order = await prisma.$transaction(async (tx) => {
  // tx is a full Prisma Client scoped to this transaction
  const user = await tx.user.findUniqueOrThrow({ where: { id: 1 } })

  const newOrder = await tx.order.create({
    data: {
      customerId: user.id,
      status:     'pending',
      total:      0,
    }
  })

  await tx.orderItem.createMany({
    data: [
      { orderId: newOrder.id, productId: 1, quantity: 2, unitPrice: 50 },
      { orderId: newOrder.id, productId: 2, quantity: 1, unitPrice: 30 },
    ]
  })

  await tx.order.update({
    where: { id: newOrder.id },
    data:  { total: 130 },
  })

  return newOrder
  // All 4 ops committed atomically — or all rolled back on any throw ✅
})
```

```typescript
// ── Automatic rollback — just throw inside the callback ───────────────────
await prisma.$transaction(async (tx) => {
  await tx.account.update({
    where: { id: 1 },
    data:  { balance: { decrement: 500 } },
  })

  const account = await tx.account.findUniqueOrThrow({ where: { id: 1 } })

  if (account.balance < 0) {
    throw new Error('Insufficient funds')  // ← triggers automatic ROLLBACK
  }

  await tx.account.update({
    where: { id: 2 },
    data:  { balance: { increment: 500 } },
  })
})
// If balance goes negative: both updates are rolled back cleanly ✅
```

```typescript
// ── Transaction options — timeout and isolation level ─────────────────────
await prisma.$transaction(
  async (tx) => {
    await tx.product.update({
      where: { id: 1 },
      data:  { stockQty: { decrement: 1 } },
    })
  },
  {
    maxWait:           5000,   // ms to wait for a connection (default 2000)
    timeout:           10000,  // ms before the transaction is aborted (default 5000)
    isolationLevel:    Prisma.TransactionIsolationLevel.Serializable,
    // Options: ReadUncommitted, ReadCommitted, RepeatableRead, Serializable
  }
)
```

```typescript
// ── What NOT to do inside a transaction ───────────────────────────────────

// ❌ External network call inside tx — holds lock while waiting for HTTP
await prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id: 1 }, data: { status: 'processing' } })
  const result = await stripeApi.charge(cardToken, amount)  // ← lock held during network I/O ❌
  await tx.order.update({ where: { id: 1 }, data: { paymentId: result.id } })
})

// ✅ Do external calls BEFORE opening the transaction
const result = await stripeApi.charge(cardToken, amount)   // no lock held

await prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id: 1 }, data: { status: 'processing', paymentId: result.id } })
})
// Transaction open for milliseconds, not seconds ✅
```

```typescript
// ── Savepoint equivalent — nested try/catch inside interactive tx ──────────
// Prisma doesn't expose SAVEPOINT directly — use try/catch for partial recovery
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: { customerId: 1, status: 'pending', total: 0 }
  })

  const results = await Promise.allSettled(
    itemsToInsert.map(item =>
      tx.orderItem.create({ data: { orderId: order.id, ...item } })
    )
  )

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    throw new Error(`${failed.length} items failed — rolling back`)
  }
  // If all succeed, transaction commits ✅
})
```

---

## W — Why It Matters

- Interactive transactions with `tx` are the correct answer to any "I need to read then write atomically" problem — without a transaction, a concurrent request can modify the row between your read and write (lost update, double-spend, oversell). The `tx` client holds the PostgreSQL transaction open across every await inside the callback.
- The `timeout` option (default 5 seconds) exists because long-running transactions hold row locks and block VACUUM — if your transaction does heavy computation inside the callback, increase the timeout or move computation outside.
- Never do I/O (HTTP calls, file reads, message queue publishes) inside an interactive transaction. The transaction holds a database connection and potentially row locks for the entire duration. A 2-second Stripe API call with a transaction open = 2 seconds of lock contention.

---

## I — Interview Q&A

### Q: What is the difference between a batch transaction and an interactive transaction in Prisma?

**A:** A batch transaction takes an array of Prisma operations and sends them all to the database in a single network round-trip wrapped in `BEGIN … COMMIT`. The operations are independent — you cannot use the result of operation 1 as input to operation 2. It's efficient for simple "create these three things atomically" use cases. An interactive transaction passes a `tx` client into a callback — you write sequential async code that can use the result of one query as input to the next, add conditional logic, validate intermediate state, and throw to trigger rollback. All awaited `tx.*` calls share the same PostgreSQL transaction. Use batch for parallel independent operations, interactive for anything with data dependencies or conditional branching.

### Q: How do you trigger a rollback in a Prisma interactive transaction?

**A:** Simply throw an error inside the callback. Prisma wraps the callback in a try-catch — if anything throws (including Prisma errors like constraint violations or your own thrown errors), Prisma automatically executes `ROLLBACK` before re-throwing the error to the caller. You don't write `ROLLBACK` explicitly. This means PostgreSQL constraint violations (NOT NULL, UNIQUE, FK) inside the callback are also handled correctly — they throw a `PrismaClientKnownRequestError`, which propagates up, and Prisma rolls back. Catch the error from `prisma.$transaction()` at the call site to handle the rollback scenario.

---

## C — Common Pitfalls + Fix

### ❌ Using the outer `prisma` client inside a transaction callback instead of `tx`

```typescript
// ❌ prisma.user.update runs OUTSIDE the transaction — not atomic
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: { ... } })
  await prisma.user.update({ ... })   // ← outer client, different connection, no transaction ❌
})
```

**Fix:** Use only `tx` inside the callback:

```typescript
// ✅ Every operation uses tx — all inside the same transaction
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: { ... } })
  await tx.user.update({ ... })       // ← tx client ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `transferCredits` function that: (1) debits credits from a sender account, (2) credits a receiver account, (3) creates a `CreditTransfer` record, (4) throws and rolls back if the sender has insufficient credits. Use an interactive transaction with proper isolation level. Show the error handling at the call site.

### Solution

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

class InsufficientCreditsError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient credits: has ${available}, needs ${requested}`)
    this.name = 'InsufficientCreditsError'
  }
}

async function transferCredits(
  senderId:   number,
  receiverId: number,
  amount:     number,
): Promise<{ transferId: number }> {
  if (amount <= 0) throw new Error('Transfer amount must be positive')

  return prisma.$transaction(
    async (tx) => {
      // Read sender — lock the row with a raw FOR UPDATE via $queryRaw
      // or rely on RepeatableRead to detect conflicts
      const sender = await tx.account.findUniqueOrThrow({
        where:  { userId: senderId },
        select: { id: true, credits: true },
      })

      if (sender.credits < amount) {
        throw new InsufficientCreditsError(sender.credits, amount)
        // ← this throw triggers automatic ROLLBACK ✅
      }

      // Debit sender
      await tx.account.update({
        where: { userId: senderId },
        data:  { credits: { decrement: amount } },
      })

      // Credit receiver
      await tx.account.update({
        where: { userId: receiverId },
        data:  { credits: { increment: amount } },
      })

      // Audit record
      const transfer = await tx.creditTransfer.create({
        data: { senderId, receiverId, amount, createdAt: new Date() },
        select: { id: true },
      })

      return { transferId: transfer.id }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 8000,
    }
  )
}

// ── Call site error handling ───────────────────────────────────────────────
async function handleTransferRequest(
  senderId: number, receiverId: number, amount: number
) {
  try {
    const result = await transferCredits(senderId, receiverId, amount)
    return { success: true, transferId: result.transferId }
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { success: false, error: 'insufficient_credits', message: err.message }
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return { success: false, error: 'account_not_found' }
    }
    throw err  // unexpected errors bubble up
  }
}
```

---

---

# 2 — Batching Mindset — Promise.all, Avoiding N+1, Query Counting

---

## T — TL;DR

The batching mindset is about minimizing database round trips. Three rules: (1) independent queries run in parallel with `Promise.all`, not sequentially with `await`; (2) N+1 queries are replaced with `include`, `createMany`, or `in` lookups; (3) you actively count how many queries a code path issues and reduce that number. Prisma's query logging makes round trip counting visible.

---

## K — Key Concepts

```typescript
// ── Sequential vs parallel — the most common performance mistake ───────────

// ❌ Sequential: 3 round trips, one after another
const user     = await prisma.user.findUnique({ where: { id: 1 } })
const products = await prisma.product.findMany({ where: { isActive: true } })
const stats    = await prisma.order.count()
// Total: 3 × RTT (round-trip time)

// ✅ Parallel: 3 queries sent at the same time, resolves in max(RTT)
const [user, products, stats] = await Promise.all([
  prisma.user.findUnique({ where: { id: 1 } }),
  prisma.product.findMany({ where: { isActive: true } }),
  prisma.order.count(),
])
// Total: 1 × RTT  ← 3× faster ✅
```

```typescript
// ── N+1 pattern — the most common Prisma anti-pattern ─────────────────────

// ❌ N+1: 1 query for orders + 1 query per order for its customer
const orders = await prisma.order.findMany({ take: 50 })
for (const order of orders) {
  const customer = await prisma.customer.findUnique({  // ← 50 queries ❌
    where: { id: order.customerId }
  })
  console.log(customer.name)
}
// Total: 51 queries

// ✅ Fix A: use include (1-2 queries total)
const ordersWithCustomers = await prisma.order.findMany({
  take:    50,
  include: { customer: { select: { id: true, name: true } } }
})
ordersWithCustomers.forEach(o => console.log(o.customer.name))
// Total: 1-2 queries ✅

// ✅ Fix B: batch lookup with in (when include isn't available)
const orders = await prisma.order.findMany({ take: 50 })
const customerIds = [...new Set(orders.map(o => o.customerId))]
const customers   = await prisma.customer.findMany({
  where:  { id: { in: customerIds } },
  select: { id: true, name: true },
})
const customerMap = new Map(customers.map(c => [c.id, c]))
orders.forEach(o => console.log(customerMap.get(o.customerId)?.name))
// Total: 2 queries ✅
```

```typescript
// ── createMany instead of looping create ──────────────────────────────────

// ❌ Loop: N round trips
for (const item of items) {
  await prisma.tag.create({ data: { name: item.name } })  // N queries ❌
}

// ✅ createMany: 1 round trip
await prisma.tag.createMany({
  data:            items.map(i => ({ name: i.name })),
  skipDuplicates:  true,
})
// 1 query ✅
```

```typescript
// ── Query logging — count your queries ────────────────────────────────────
// Enable query logging to see every SQL statement Prisma sends

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
})

// Count queries in a code path
let queryCount = 0
prisma.$on('query', () => { queryCount++ })

queryCount = 0
await someServiceFunction()
console.log(`Queries issued: ${queryCount}`)  // measure, then reduce

// Or log every query with its SQL and duration:
prisma.$on('query', (e) => {
  console.log(`[SQL] ${e.query}  — ${e.duration}ms`)
})
```

```typescript
// ── Promise.all inside a transaction ──────────────────────────────────────
// Independent operations inside a transaction can also be parallelised
await prisma.$transaction(async (tx) => {
  // ✅ These two don't depend on each other — run in parallel
  const [order, inventory] = await Promise.all([
    tx.order.findUniqueOrThrow({ where: { id: orderId } }),
    tx.inventory.findUnique({ where: { productId } }),
  ])

  // Now use both results
  if ((inventory?.qty ?? 0) < order.quantity) {
    throw new Error('Out of stock')
  }

  await tx.inventory.update({
    where: { productId },
    data:  { qty: { decrement: order.quantity } },
  })
})
```

```typescript
// ── Batching aggregations — avoid per-row count subqueries ────────────────

// ❌ Slow: one count query per category
const categories = await prisma.category.findMany()
for (const cat of categories) {
  cat.postCount = await prisma.post.count({  // N queries ❌
    where: { categoryId: cat.id }
  })
}

// ✅ One groupBy query to get all counts at once
const [categories, countsByCategory] = await Promise.all([
  prisma.category.findMany({ select: { id: true, name: true } }),
  prisma.post.groupBy({
    by:     ['categoryId'],
    _count: { _all: true },
  }),
])

const countMap = new Map(countsByCategory.map(r => [r.categoryId, r._count._all]))
const result   = categories.map(c => ({
  ...c,
  postCount: countMap.get(c.id) ?? 0,
}))
// Total: 2 queries ✅
```

---

## W — Why It Matters

- Sequential `await` chains on independent queries are the single easiest performance win in any Prisma codebase — changing three `await` statements to `Promise.all([...])` can cut a route handler's DB time by 60% with no logic changes and no schema changes.
- The N+1 problem is invisible during development (small datasets) and catastrophic in production — 50 orders × 1 customer query = 51 queries. 500 orders = 501 queries. Query logging in development (`log: ['query']`) makes N+1 visible immediately — you see 51 identical `SELECT` statements and fix them before they reach production.
- `createMany` vs looping `create` is a 10–100× throughput difference — `createMany` sends one `INSERT ... VALUES (...),(...)` statement; a loop sends one `INSERT` per row, each with its own parse-plan-execute cycle and network round-trip.

---

## I — Interview Q&A

### Q: How do you detect and fix an N+1 query problem in a Prisma application?

**A:** Detection: enable Prisma's query logging (`log: [{ emit: 'event', level: 'query' }]`) and count the queries issued by a single route or function. If you see the same query template executing many times with different IDs (e.g. `SELECT * FROM customers WHERE id = $1` running 50 times), that's N+1. Fix strategies in order of preference: (1) Use `include` — add the relation to the original query so Prisma fetches parents and children together. (2) Batch lookup — collect all the needed IDs from the first query, then do one `findMany` with `where: { id: { in: ids } }` and build a map. (3) Use `groupBy` instead of per-row count queries. The root cause is always a loop containing a database query — eliminate the loop by moving the query outside and fetching all needed data at once.

---

## C — Common Pitfalls + Fix

### ❌ Awaiting independent queries sequentially — unnecessary latency

```typescript
// ❌ 3 sequential round trips — each waits for the previous
async function getDashboard(userId: number) {
  const user    = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const orders  = await prisma.order.findMany({ where: { customerId: userId } })
  const balance = await prisma.wallet.findUnique({ where: { userId } })
  return { user, orders, balance }
}
```

**Fix:** Run them in parallel:

```typescript
// ✅ All three fire simultaneously — resolves in max(individual RTT)
async function getDashboard(userId: number) {
  const [user, orders, balance] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.order.findMany({ where: { customerId: userId } }),
    prisma.wallet.findUnique({ where: { userId } }),
  ])
  return { user, orders, balance }
}
```

---

## K — Coding Challenge + Solution

### Challenge

You're given this slow route handler — identify every performance problem and rewrite it using the batching mindset. The original: (1) fetches a workspace, then its projects one by one in a loop, (2) for each project fetches the member count separately, (3) creates audit log entries in a loop. Rewrite to use the minimum number of queries.

### Solution

```typescript
// ❌ Original — many queries
async function getWorkspaceSummary_SLOW(workspaceId: number) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId }
  })

  const projectIds = await prisma.project.findMany({
    where:  { workspaceId },
    select: { id: true, name: true }
  })

  const projects = []
  for (const p of projectIds) {                                // N+1
    const memberCount = await prisma.projectMember.count({    // N queries ❌
      where: { projectId: p.id }
    })
    projects.push({ ...p, memberCount })
  }

  for (const p of projects) {                                  // N queries ❌
    await prisma.auditLog.create({
      data: { action: 'viewed', entityId: p.id, entityType: 'project' }
    })
  }

  return { workspace, projects }
}

// ✅ Rewritten — 4 queries total
async function getWorkspaceSummary(workspaceId: number) {
  // Query 1 + 2: parallel — workspace and projects with member count
  const [workspace, projects] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where:  { id: workspaceId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.project.findMany({
      where:  { workspaceId },
      select: {
        id:    true,
        name:  true,
        _count: { select: { members: true } },  // member count in one query ✅
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Query 3: createMany for all audit logs — 1 query instead of N ✅
  await prisma.auditLog.createMany({
    data: projects.map(p => ({
      action:     'viewed',
      entityId:   p.id,
      entityType: 'project',
      createdAt:  new Date(),
    })),
    skipDuplicates: true,
  })

  return {
    workspace,
    projects: projects.map(p => ({
      id:          p.id,
      name:        p.name,
      memberCount: p._count.members,
    }))
  }
  // Total: 3 queries (was N*2 + 2) ✅
}
```

---

---

# 3 — Raw SQL — $queryRaw, $executeRaw, Safety Rules

---

## T — TL;DR

Prisma's `$queryRaw` runs a raw `SELECT` and returns typed results. `$executeRaw` runs `INSERT`/`UPDATE`/`DELETE` and returns the affected row count. Both use **tagged template literals** with automatic parameterization — the only safe way to include variables. Never use `$queryRawUnsafe` or string interpolation with user input. Raw SQL is the escape hatch for window functions, CTEs, full-text search, and anything `groupBy` can't express.

---

## K — Key Concepts

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── $queryRaw — SELECT, returns typed rows ────────────────────────────────
interface OrderSummaryRow {
  customer_name: string
  order_count:   number
  total_spent:   string   // NUMERIC comes back as string from raw query
}

const summaries = await prisma.$queryRaw<OrderSummaryRow[]>`
  SELECT
    u.name           AS customer_name,
    COUNT(o.id)::INT AS order_count,
    SUM(o.total)     AS total_spent
  FROM users u
  JOIN orders o ON o.customer_id = u.id
  WHERE o.status = 'delivered'
  GROUP BY u.id, u.name
  ORDER BY SUM(o.total) DESC
  LIMIT 10
`
// summaries: OrderSummaryRow[]  — fully typed ✅
```

```typescript
// ── Parameterization — the ONLY safe way to include variables ─────────────
// Prisma uses tagged template literals — variables are automatically bound
// as PostgreSQL $1, $2, $3 parameters (prepared statement style)

const minTotal = 100
const status   = 'delivered'

// ✅ Safe — variables are parameterized automatically
const orders = await prisma.$queryRaw<{ id: number; total: string }[]>`
  SELECT id, total
  FROM orders
  WHERE total >= ${minTotal}
    AND status  = ${status}
  ORDER BY total DESC
`
// Generated SQL: SELECT id, total FROM orders WHERE total >= $1 AND status = $2
// Parameters:   [100, 'delivered']  — never interpolated as strings ✅
```

```typescript
// ── ❌ NEVER use string interpolation with user input ─────────────────────
const userInput = "'; DROP TABLE orders; --"

// ❌ SQL injection — never do this
const bad = await prisma.$queryRawUnsafe(
  `SELECT * FROM orders WHERE status = '${userInput}'`
)
// Generated: SELECT * FROM orders WHERE status = ''; DROP TABLE orders; --'
// ← destroys your database ❌

// ✅ Always use tagged template literals
const good = await prisma.$queryRaw`
  SELECT * FROM orders WHERE status = ${userInput}
`
// Generated: SELECT * FROM orders WHERE status = $1  ← safe ✅
```

```typescript
// ── Dynamic column/table names — Prisma.sql helper ────────────────────────
// You CANNOT parameterize column or table names (they're identifiers, not values)
// Use Prisma.sql to compose safe query fragments

const column = 'created_at'  // from a validated allowlist — NEVER from raw user input

// ✅ Prisma.sql — compose fragments safely
const direction = 'DESC'
const query = Prisma.sql`
  SELECT id, total, ${Prisma.raw(column)}
  FROM orders
  ORDER BY ${Prisma.raw(column)} ${Prisma.raw(direction)}
  LIMIT ${10}
`
const results = await prisma.$queryRaw<{ id: number; total: string }[]>(query)

// Rule: Prisma.raw() is for identifiers from a VALIDATED allowlist only
// Never pass raw user input to Prisma.raw() — it's not parameterized
const ALLOWED_SORT_COLUMNS = ['created_at', 'total', 'status'] as const
type SortColumn = typeof ALLOWED_SORT_COLUMNS[number]

function safeSortColumn(col: string): SortColumn {
  if (!ALLOWED_SORT_COLUMNS.includes(col as SortColumn)) {
    throw new Error(`Invalid sort column: ${col}`)
  }
  return col as SortColumn
}
```

```typescript
// ── $executeRaw — INSERT, UPDATE, DELETE ───────────────────────────────────
// Returns number of affected rows

const count = await prisma.$executeRaw`
  UPDATE products
  SET stock_qty = stock_qty - ${1}
  WHERE id = ${productId}
    AND stock_qty > 0
`
// count: number (rows affected — 0 means product not found or out of stock)

// Bulk update via raw SQL — useful for complex expressions
const updated = await prisma.$executeRaw`
  UPDATE order_items
  SET unit_price = unit_price * ${1.1}
  WHERE order_id = ${orderId}
`

// With RETURNING — use $queryRaw if you need the rows back
const returned = await prisma.$queryRaw<{ id: number; stock_qty: number }[]>`
  UPDATE products
  SET stock_qty = stock_qty - ${quantity}
  WHERE id = ${productId} AND stock_qty >= ${quantity}
  RETURNING id, stock_qty
`
// returned.length === 0 → out of stock or not found
```

```typescript
// ── Common use cases for raw SQL ──────────────────────────────────────────

// 1. Window functions — Prisma has no window function API
const ranked = await prisma.$queryRaw<{
  id:         number
  customerId: number
  total:      string
  rank:       number
}[]>`
  SELECT
    id,
    customer_id,
    total,
    RANK() OVER (
      PARTITION BY customer_id
      ORDER BY total DESC
    ) AS rank
  FROM orders
  WHERE status = 'delivered'
`

// 2. Full-text search
const posts = await prisma.$queryRaw<{ id: number; title: string; rank: number }[]>`
  SELECT id, title,
    ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) AS rank
  FROM posts
  WHERE search_vector @@ plainto_tsquery('english', ${searchTerm})
  ORDER BY rank DESC
  LIMIT ${limit}
`

// 3. Upsert with complex conflict resolution
await prisma.$executeRaw`
  INSERT INTO product_views (product_id, user_id, view_count, last_viewed_at)
  VALUES (${productId}, ${userId}, 1, NOW())
  ON CONFLICT (product_id, user_id)
  DO UPDATE SET
    view_count     = product_views.view_count + 1,
    last_viewed_at = NOW()
`
```

---

## W — Why It Matters

- Tagged template literal parameterization is not a style choice — it is the only safe API in Prisma for raw SQL. Variables in the template (`${value}`) are always bound as PostgreSQL parameters (`$1`, `$2`), making SQL injection structurally impossible. `$queryRawUnsafe` with string interpolation is the equivalent of `eval()` with user input.
- `Prisma.raw()` for dynamic identifiers (column/table names) is the sharp edge — it does NOT parameterize. It inserts the string directly into the SQL. Only use it with values from a hardcoded allowlist that you validate in code, never with values that come from a request.
- NUMERIC/DECIMAL columns from raw queries return as JavaScript strings, not numbers or `Prisma.Decimal`. Always parse them: `parseFloat(row.total)` or `new Prisma.Decimal(row.total)`. This is a PostgreSQL driver behavior — `pg` returns NUMERIC as string to avoid precision loss.

---

## I — Interview Q&A

### Q: Why are Prisma's `$queryRaw` tagged template literals safe against SQL injection, and what should you never do?

**A:** When you write `` prisma.$queryRaw`SELECT * FROM orders WHERE id = ${userId}` ``, Prisma does not interpolate `userId` into the SQL string. Instead, it uses PostgreSQL's prepared statement protocol — it sends the query as `SELECT * FROM orders WHERE id = $1` and separately sends the parameter value `[userId]`. The database driver and PostgreSQL handle the binding, and PostgreSQL ensures the parameter value is treated as data, never as SQL syntax. This makes injection impossible regardless of what `userId` contains. What you must never do: use `$queryRawUnsafe` with string template literals or string concatenation containing any value derived from user input. Never write `` $queryRawUnsafe(`SELECT * FROM orders WHERE id = ${req.params.id}`) `` — this is direct SQL injection.

---

## C — Common Pitfalls + Fix

### ❌ Using `Prisma.raw()` with a value that could come from user input

```typescript
// ❌ User controls the sort direction — SQL injection via Prisma.raw()
async function getOrders(req: Request) {
  const sort = req.query.sort  // user sends: "DESC; DROP TABLE orders;--"

  return prisma.$queryRaw`
    SELECT * FROM orders ORDER BY total ${Prisma.raw(sort)}
  `
  // Prisma.raw() is NOT parameterized — this is injectable ❌
}
```

**Fix:** Validate against an allowlist before using `Prisma.raw()`:

```typescript
// ✅ Validate first, then use Prisma.raw()
type SortDir = 'ASC' | 'DESC'

function validateSortDir(input: unknown): SortDir {
  if (input === 'ASC' || input === 'DESC') return input
  return 'DESC'  // safe default
}

async function getOrders(req: Request) {
  const sort = validateSortDir(req.query.sort)  // guaranteed 'ASC' or 'DESC' ✅
  return prisma.$queryRaw`
    SELECT * FROM orders ORDER BY total ${Prisma.raw(sort)}
  `
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write three raw SQL functions: (1) `getTopSpendersByMonth` using a window function (`RANK() OVER`) to rank customers by spend within each month; (2) `searchProducts` using PostgreSQL full-text search with `ts_rank` and a `tsvector` column; (3) `bulkUpdatePrices` using `$executeRaw` with a CTE to update prices from a list of `(sku, newPrice)` pairs. All must be injection-safe and return typed results.

### Solution

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── (1) Top spenders by month — window function ────────────────────────────
interface TopSpenderRow {
  month:          string
  customer_id:    number
  customer_name:  string
  total_spend:    string
  rank_in_month:  number
}

async function getTopSpendersByMonth(topN: number = 3) {
  return prisma.$queryRaw<TopSpenderRow[]>`
    WITH monthly_spend AS (
      SELECT
        DATE_TRUNC('month', o.created_at)        AS month,
        o.customer_id,
        u.name                                   AS customer_name,
        SUM(o.total)                             AS total_spend,
        RANK() OVER (
          PARTITION BY DATE_TRUNC('month', o.created_at)
          ORDER BY SUM(o.total) DESC
        )                                        AS rank_in_month
      FROM orders o
      JOIN users u ON u.id = o.customer_id
      WHERE o.status = 'delivered'
        AND o.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', o.created_at), o.customer_id, u.name
    )
    SELECT
      TO_CHAR(month, 'YYYY-MM') AS month,
      customer_id,
      customer_name,
      total_spend::TEXT,
      rank_in_month::INT
    FROM monthly_spend
    WHERE rank_in_month <= ${topN}
    ORDER BY month DESC, rank_in_month ASC
  `
}

// ── (2) Full-text product search ───────────────────────────────────────────
interface ProductSearchRow {
  id:    number
  name:  string
  sku:   string
  price: string
  rank:  number
}

async function searchProducts(
  searchTerm: string,
  limit: number = 20,
): Promise<ProductSearchRow[]> {
  if (!searchTerm.trim()) return []

  return prisma.$queryRaw<ProductSearchRow[]>`
    SELECT
      id,
      name,
      sku,
      price::TEXT,
      ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) AS rank
    FROM products
    WHERE search_vector @@ plainto_tsquery('english', ${searchTerm})
      AND is_active = true
    ORDER BY rank DESC, name ASC
    LIMIT ${limit}
  `
  // searchTerm is fully parameterized — SQL injection impossible ✅
}

// ── (3) Bulk price update via CTE ─────────────────────────────────────────
interface PriceUpdate { sku: string; newPrice: number }

async function bulkUpdatePrices(updates: PriceUpdate[]): Promise<number> {
  if (updates.length === 0) return 0

  // Build a VALUES list as a single Prisma.sql fragment
  const valuesList = updates.map(
    u => Prisma.sql`(${u.sku}, ${u.newPrice}::NUMERIC(12,2))`
  )
  const valuesClause = Prisma.join(valuesList, ', ')

  const affected = await prisma.$executeRaw`
    WITH price_updates (sku, new_price) AS (
      VALUES ${valuesClause}
    )
    UPDATE products
    SET
      price      = pu.new_price,
      updated_at = NOW()
    FROM price_updates pu
    WHERE products.sku = pu.sku
  `

  return affected  // number of rows updated
}

export { getTopSpendersByMonth, searchProducts, bulkUpdatePrices }
```

---

---

# 4 — Consistency Patterns — Optimistic Locking, Idempotency, Retry

---

## T — TL;DR

Three patterns keep data consistent under concurrent load: **optimistic locking** adds a `version` field and checks it on update (fail fast if stale, no lock held during read); **idempotency** ensures an operation can be called multiple times without side effects (use a client-generated `idempotencyKey`); **retry with backoff** handles transient failures — serialization errors, deadlocks, and connection timeouts — by re-running the operation with a delay.

---

## K — Key Concepts

```typescript
// ── Optimistic locking — version field pattern ─────────────────────────────
// Schema: model has a `version Int @default(1)` field
// Rule: read the version, include it in the WHERE on update, increment it

interface UpdateUserBioInput {
  userId:  number
  bio:     string
  version: number   // client must send back the version it read
}

async function updateUserBio(input: UpdateUserBioInput) {
  const result = await prisma.user.updateMany({
    where: {
      id:      input.userId,
      version: input.version,   // only update if version hasn't changed
    },
    data: {
      bio:     input.bio,
      version: { increment: 1 }, // bump version on every write
    },
  })

  if (result.count === 0) {
    // 0 rows updated = version mismatch = concurrent modification
    throw new OptimisticLockError(
      'Record was modified by another request. Please reload and try again.'
    )
  }

  return result
}

class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptimisticLockError'
  }
}

// Pattern in practice:
// 1. Client GETs user → receives { bio: 'old', version: 3 }
// 2. User edits bio
// 3. Client PATCHes with { bio: 'new', version: 3 }
// 4. If another request already updated (version is now 4), updateMany returns count=0
// 5. Server returns 409 Conflict — client reloads and retries
```

```typescript
// ── Idempotency key pattern — safe retries for mutations ──────────────────
// Problem: client sends a payment request, network times out, retries —
//          did the payment go through or not? Without idempotency: double charge.
// Solution: client generates a UUID for each unique operation attempt;
//           server stores it and refuses to repeat the operation.

async function processPayment(
  orderId:        number,
  amount:         number,
  idempotencyKey: string,   // UUID generated by the client, same on retry
) {
  return prisma.$transaction(async (tx) => {
    // Check if this operation was already completed
    const existing = await tx.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    })

    if (existing) {
      // Already processed — return cached result (idempotent ✅)
      return JSON.parse(existing.responsePayload) as { paymentId: string }
    }

    // Process the payment (first time)
    const payment = await tx.payment.create({
      data: { orderId, amount, status: 'completed' },
    })

    await tx.order.update({
      where: { id: orderId },
      data:  { status: 'paid', paymentId: payment.id },
    })

    // Store the idempotency record with the result
    await tx.idempotencyRecord.create({
      data: {
        key:             idempotencyKey,
        responsePayload: JSON.stringify({ paymentId: payment.id }),
        expiresAt:       new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
      },
    })

    return { paymentId: payment.id }
  })
}
// Client retries with same idempotencyKey → gets same response, no double charge ✅
```

```typescript
// ── Retry with exponential backoff — serialization errors and deadlocks ────
// PostgreSQL serialization failures (code 40001) and deadlocks (code 40P01)
// are expected under concurrent load — retry is the correct response

async function withRetry<T>(
  operation:   () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 50,
): Promise<T> {
  let attempt = 0

  while (true) {
    attempt++
    try {
      return await operation()
    } catch (err) {
      const isRetryable = isRetryableError(err)

      if (!isRetryable || attempt >= maxAttempts) {
        throw err  // non-retryable or exhausted attempts — propagate
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
        + Math.random() * baseDelayMs
      console.warn(
        `Attempt ${attempt} failed (${getErrorCode(err)}), retrying in ${Math.round(delay)}ms`
      )
      await sleep(delay)
    }
  }
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034: serialization failure or deadlock
    return err.code === 'P2034'
  }
  // Raw PG error codes:
  if (err instanceof Error && 'code' in err) {
    return (err as any).code === '40001'   // serialization_failure
        || (err as any).code === '40P01'   // deadlock_detected
  }
  return false
}

function getErrorCode(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code
  if (err instanceof Error && 'code' in err) return String((err as any).code)
  return 'unknown'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Usage:
const result = await withRetry(
  () => prisma.$transaction(
    async (tx) => { /* ... */ },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
)
```

```typescript
// ── Soft delete — never truly delete, mark deleted_at ─────────────────────
// Common consistency pattern: preserve data history, allow recovery

// Query helper: only return non-deleted records
async function findActiveUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null }  // soft-delete filter
  })
}

async function softDeleteUser(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data:  { deletedAt: new Date(), isActive: false },
  })
}

// Prisma middleware to auto-filter soft-deleted records:
prisma.$use(async (params, next) => {
  // Intercept findMany and findFirst to auto-exclude soft-deleted
  if (
    params.model === 'User' &&
    ['findMany', 'findFirst', 'count'].includes(params.action)
  ) {
    params.args.where = {
      ...params.args.where,
      deletedAt: null,
    }
  }
  return next(params)
})
// With middleware: prisma.user.findMany() auto-excludes deleted users ✅
```

---

## W — Why It Matters

- Optimistic locking is the right default for web APIs where conflicts are rare — it holds no database lock between the read and the write (unlike `SELECT FOR UPDATE`), so it scales well. The trade-off is that the client must handle 409 Conflict responses. Use `SELECT FOR UPDATE` (via raw SQL in Prisma) only when conflicts are frequent and the wait is acceptable.
- Idempotency keys are required for any payment or state-changing operation over a network — network failures, client retries, and load balancer timeouts all cause duplicate requests. Without idempotency keys, retry logic causes double charges, double bookings, and duplicate records. Stripe, PayPal, and every major payment API require idempotency keys for exactly this reason.
- Prisma error code `P2034` is the Prisma-specific code for PostgreSQL serialization failure and deadlock — catching it specifically and retrying is the correct pattern documented by Prisma for `SERIALIZABLE` transactions. Random retry with jitter prevents thundering herd (all retries firing simultaneously).

---

## I — Interview Q&A

### Q: What is optimistic locking, and when would you use it instead of SELECT FOR UPDATE?

**A:** Optimistic locking avoids database locks entirely — it reads the current `version` of a record, performs computation in application code, and on write adds `WHERE version = readVersion` to the `UPDATE`. If another transaction updated the row between the read and write, `version` will have changed and `updateMany` returns `count: 0` — the application detects the conflict and returns a 409 Conflict to the client, who must reload and retry. `SELECT FOR UPDATE` is pessimistic — it acquires a row-level exclusive lock at read time, blocking any concurrent writes until the transaction commits. Use optimistic locking when conflicts are rare and user-facing retry is acceptable (form submissions, profile updates) — it's lock-free and scales well. Use `SELECT FOR UPDATE` when conflicts are frequent and waiting is preferable to failing (inventory reservation, job queue, high-contention counters).

---

## C — Common Pitfalls + Fix

### ❌ No retry logic on Serializable transactions — operation fails permanently on first conflict

```typescript
// ❌ Serializable transaction with no retry — any conflict = permanent failure
async function reserveInventory(productId: number, qty: number) {
  await prisma.$transaction(
    async (tx) => { /* ... check stock and decrement ... */ },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
  // Under concurrent load: throws P2034 serialization_failure — no retry ❌
}
```

**Fix:** Wrap Serializable transactions with `withRetry`:

```typescript
// ✅ Retry on serialization failure — correct pattern for SERIALIZABLE
async function reserveInventory(productId: number, qty: number) {
  return withRetry(
    () => prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findUniqueOrThrow({
          where:  { id: productId },
          select: { id: true, stockQty: true },
        })
        if (product.stockQty < qty) throw new Error('Insufficient stock')
        return tx.product.update({
          where: { id: productId },
          data:  { stockQty: { decrement: qty } },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    ),
    3,    // up to 3 attempts
    100,  // 100ms base delay
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `submitForm` function that demonstrates all three patterns together: (1) idempotency key check to prevent double submissions; (2) optimistic locking on the `FormTemplate` to ensure the form definition hasn't changed since the user loaded it; (3) retry wrapper for the outer transaction. Show the full error-handling hierarchy: idempotency hit, version mismatch, and serialization failure each produce a different response.

### Solution

```typescript
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── Error types ────────────────────────────────────────────────────────────
class DuplicateSubmissionError extends Error { constructor() { super('Already submitted') } }
class StaleFormError          extends Error { constructor() { super('Form was updated — please reload') } }

// ── submitForm ─────────────────────────────────────────────────────────────
async function submitForm(input: {
  formTemplateId:  number
  templateVersion: number   // optimistic lock: version user read
  respondentId:    number
  answers:         Record<string, string>
  idempotencyKey:  string   // client UUID — same on retry
}) {
  return withRetry(async () => {
    return prisma.$transaction(async (tx) => {

      // ── Step 1: idempotency check ─────────────────────────────────────
      const existing = await tx.idempotencyRecord.findUnique({
        where: { key: input.idempotencyKey },
      })
      if (existing) {
        throw new DuplicateSubmissionError()
        // Not a retryable error — propagates immediately
      }

      // ── Step 2: optimistic lock on FormTemplate ───────────────────────
      const updated = await tx.formTemplate.updateMany({
        where: {
          id:      input.formTemplateId,
          version: input.templateVersion,   // only succeeds if version matches
          isActive: true,
        },
        data: { submissionCount: { increment: 1 } },
      })

      if (updated.count === 0) {
        throw new StaleFormError()
        // Not retryable — user needs to reload
      }

      // ── Step 3: create the submission ────────────────────────────────
      const submission = await tx.formSubmission.create({
        data: {
          formTemplateId: input.formTemplateId,
          respondentId:   input.respondentId,
          answers:        input.answers,
        },
        select: { id: true, createdAt: true },
      })

      // ── Step 4: store idempotency record ─────────────────────────────
      await tx.idempotencyRecord.create({
        data: {
          key:             input.idempotencyKey,
          responsePayload: JSON.stringify({ submissionId: submission.id }),
          expiresAt:       new Date(Date.now() + 48 * 3600 * 1000),
        },
      })

      return { submissionId: submission.id, createdAt: submission.createdAt }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout:        8000,
    })
  }, 3, 80)  // retry up to 3×, 80ms base delay
}

// ── Call site ──────────────────────────────────────────────────────────────
async function handleSubmitForm(req: Request): Promise<Response> {
  try {
    const result = await submitForm(req.body)
    return Response.json({ success: true, ...result }, { status: 201 })
  } catch (err) {
    if (err instanceof DuplicateSubmissionError)
      return Response.json({ error: 'already_submitted' },   { status: 200 })
    if (err instanceof StaleFormError)
      return Response.json({ error: 'stale_form' },          { status: 409 })
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034')
      return Response.json({ error: 'conflict_retry' },      { status: 503 })
    throw err
  }
}
```

---

---

# 5 — Data-Layer Organization — Services, Repositories, Procedures

---

## T — TL;DR

The data layer should be organized in three layers: **repositories** encapsulate Prisma queries behind a typed interface (one repository per model or domain); **services** implement business logic using one or more repositories and handle transactions; **procedures** (tRPC or API route handlers) call services and handle HTTP/transport concerns. This separation makes queries reusable, business logic testable, and transport code thin.

---

## K — Key Concepts

```
── Three-layer architecture ───────────────────────────────────────────────────

  Transport layer    → Next.js API routes, tRPC procedures, Express handlers
  ↓ calls
  Service layer      → business logic, transactions, cross-domain coordination
  ↓ calls
  Repository layer   → Prisma queries, typed interfaces, no business logic

  src/
  ├── lib/
  │   └── prisma.ts            ← singleton PrismaClient
  ├── repositories/
  │   ├── user.repository.ts   ← all User queries
  │   ├── order.repository.ts  ← all Order queries
  │   └── product.repository.ts
  ├── services/
  │   ├── order.service.ts     ← placeOrder, cancelOrder (uses tx)
  │   └── user.service.ts      ← createAccount, deactivate
  └── app/api/
      └── orders/route.ts      ← thin handler, calls service
```

```typescript
// ── Repository layer — pure Prisma queries, no business logic ─────────────
// src/repositories/order.repository.ts

import { prisma }      from '@/lib/prisma'
import { Prisma, Order } from '@prisma/client'

// Repository accepts the Prisma client (or tx) as a parameter
// This makes it usable both standalone AND inside transactions
type PrismaContext = Prisma.TransactionClient | typeof prisma

export const orderRepository = {
  findById: (id: number, ctx: PrismaContext = prisma) =>
    ctx.order.findUnique({
      where:   { id },
      include: { customer: { select: { id: true, name: true } } }
    }),

  findByCustomer: (
    customerId: number,
    opts: { take?: number; cursor?: number } = {},
    ctx: PrismaContext = prisma,
  ) =>
    ctx.order.findMany({
      where:   { customerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take:    (opts.take ?? 20) + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select:  { id: true, status: true, total: true, createdAt: true },
    }),

  create: (
    data: Prisma.OrderCreateInput,
    ctx: PrismaContext = prisma,
  ) =>
    ctx.order.create({ data }),

  updateStatus: (
    id:     number,
    status: string,
    ctx:    PrismaContext = prisma,
  ) =>
    ctx.order.update({
      where: { id },
      data:  { status },
    }),
}
```

```typescript
// ── Service layer — business logic + transactions ─────────────────────────
// src/services/order.service.ts

import { prisma }            from '@/lib/prisma'
import { orderRepository }   from '@/repositories/order.repository'
import { productRepository } from '@/repositories/product.repository'
import { Prisma }            from '@prisma/client'

interface PlaceOrderInput {
  customerId: number
  items: Array<{ productId: number; quantity: number }>
}

export const orderService = {
  async placeOrder(input: PlaceOrderInput) {
    return prisma.$transaction(async (tx) => {
      // Validate and reserve stock for all items in parallel
      const products = await Promise.all(
        input.items.map(item =>
          productRepository.decrementStock(item.productId, item.quantity, tx)
        )
      )

      const total = products.reduce(
        (sum, p, i) => sum + Number(p.price) * input.items[i].quantity,
        0
      )

      // Create order — pass tx so it's inside the same transaction
      const order = await orderRepository.create(
        {
          customer: { connect: { id: input.customerId } },
          status:   'pending',
          total,
          items: {
            createMany: {
              data: input.items.map((item, i) => ({
                productId: item.productId,
                quantity:  item.quantity,
                unitPrice: products[i].price,
              }))
            }
          }
        },
        tx,  // ← pass tx for atomicity
      )

      return order
    })
  },

  async cancelOrder(orderId: number, reason: string) {
    const order = await orderRepository.findById(orderId)
    if (!order) throw new Error('Order not found')

    const cancellableStatuses = ['pending', 'confirmed']
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in status: ${order.status}`)
    }

    return orderRepository.updateStatus(orderId, 'cancelled')
  },
}
```

```typescript
// ── Transport layer — thin handlers, calls service ────────────────────────
// src/app/api/orders/route.ts  (Next.js App Router)

import { orderService } from '@/services/order.service'
import { z }            from 'zod'

const placeOrderSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity:  z.number().int().min(1).max(100),
  })).min(1),
})

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = placeOrderSchema.parse(body)  // validate input
    const order  = await orderService.placeOrder(parsed)
    return Response.json({ success: true, order }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError)
      return Response.json({ error: 'validation', issues: err.issues }, { status: 400 })
    if (err instanceof Error && err.message === 'Insufficient stock')
      return Response.json({ error: 'out_of_stock' }, { status: 422 })
    console.error(err)
    return Response.json({ error: 'internal' }, { status: 500 })
  }
}
```

```typescript
// ── tRPC procedure pattern (alternative transport) ────────────────────────
// src/server/routers/order.router.ts

import { router, protectedProcedure } from '@/server/trpc'
import { orderService }               from '@/services/order.service'
import { z }                          from 'zod'

export const orderRouter = router({
  place: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity:  z.number().int().min(1),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // ctx.session.user.id injected by tRPC middleware
      return orderService.placeOrder({
        customerId: ctx.session.user.id,
        items:      input.items,
      })
    }),

  cancel: protectedProcedure
    .input(z.object({ orderId: z.number(), reason: z.string() }))
    .mutation(async ({ input }) =>
      orderService.cancelOrder(input.orderId, input.reason)
    ),

  list: protectedProcedure
    .input(z.object({ cursor: z.number().optional(), take: z.number().default(20) }))
    .query(async ({ ctx, input }) =>
      orderRepository.findByCustomer(ctx.session.user.id, input)
    ),
})
```

```typescript
// ── Testing the service layer — mock the repository ───────────────────────
// With repository pattern: inject mock, no real DB needed for unit tests

import { orderService }   from '@/services/order.service'
import { orderRepository } from '@/repositories/order.repository'

jest.mock('@/repositories/order.repository')
jest.mock('@/repositories/product.repository')

test('placeOrder throws if product out of stock', async () => {
  // Arrange
  (productRepository.decrementStock as jest.Mock).mockRejectedValue(
    new Error('Insufficient stock')
  )

  // Act + Assert
  await expect(
    orderService.placeOrder({ customerId: 1, items: [{ productId: 1, quantity: 99 }] })
  ).rejects.toThrow('Insufficient stock')
})
// No database needed — unit test is fast and deterministic ✅
```

```typescript
// ── Prisma extension — reusable query logic as model methods ───────────────
// Prisma 4.7+ Client Extensions: add custom methods to the Prisma Client

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient().$extends({
  model: {
    user: {
      // Add a custom findActive method to prisma.user
      async findActive() {
        return prisma.user.findMany({ where: { isActive: true, deletedAt: null } })
      },
      async softDelete(id: number) {
        return prisma.user.update({
          where: { id },
          data:  { deletedAt: new Date(), isActive: false },
        })
      },
    },
  },
})

// Usage:
const activeUsers = await prisma.user.findActive()    // ✅ custom method
await prisma.user.softDelete(42)                      // ✅ custom method
```

---

## W — Why It Matters

- Passing `ctx: PrismaContext = prisma` (or `tx`) to repository methods is the key that makes the repository pattern work with transactions — the service passes `tx` down to the repository, so the repository queries run inside the transaction without the repository knowing anything about transaction management. This separation of concerns is what makes services testable and repositories reusable.
- The transport layer (API route, tRPC procedure) should do exactly three things: parse and validate input, call a service, and map the result or error to a response. Any business logic in the transport layer is a violation — it can't be tested, it can't be reused by other transports, and it mixes concerns.
- Prisma Client Extensions (the `.$extends()` pattern) are the alternative to a full repository class — they add methods directly to the Prisma model namespace. Use extensions for simple, reusable query helpers. Use the repository pattern when you need complex interfaces, multiple implementations (real DB + mock), or dependency injection for testing.

---

## I — Interview Q&A

### Q: How do you organize a Prisma-based data layer for a production TypeScript backend, and why?

**A:** The recommended structure has three layers. The **repository layer** contains all Prisma queries — one file per model or domain. Each repository function accepts an optional `ctx` parameter that defaults to the singleton `prisma` but can accept a transaction client `tx` — this is the key that allows repositories to participate in transactions without coupling them to transaction management. The **service layer** contains business logic — it calls repositories, coordinates multi-step operations, and manages transactions using `prisma.$transaction`. Services have no HTTP or transport concerns. The **transport layer** (API routes, tRPC procedures) is thin — it validates input (Zod), calls a service, and maps results to responses. This structure enables unit testing services by mocking repositories (no real DB needed), reusing query logic across multiple transports, and keeping business rules in one maintainable place.

### Q: How do you pass a transaction client to a repository function in Prisma?

**A:** Define the repository function to accept an optional `ctx` parameter typed as `Prisma.TransactionClient | typeof prisma`, defaulting to the singleton `prisma`. Inside the function, use `ctx` instead of `prisma`. The service, which manages the transaction, passes `tx` when calling the repository inside `prisma.$transaction(async (tx) => { await repo.create(data, tx) })`. When called outside a transaction (e.g. in a simple read query), the default `prisma` is used automatically. This pattern keeps repositories unaware of transaction management while allowing them to participate in transactions seamlessly.

---

## C — Common Pitfalls + Fix

### ❌ Business logic in the transport layer — untestable, unreusable

```typescript
// ❌ Business logic in the API route — can't unit test, can't reuse
export async function POST(req: Request) {
  const body = await req.json()

  // ❌ Business logic here
  const existing = await prisma.order.findFirst({
    where: { customerId: body.customerId, status: 'pending' }
  })
  if (existing) return Response.json({ error: 'pending order exists' }, { status: 422 })

  const order = await prisma.order.create({ data: { ... } })
  return Response.json(order)
}
```

**Fix:** Move business logic to the service layer:

```typescript
// ✅ Service holds the logic — testable, reusable across routes and tRPC
// src/services/order.service.ts
export const orderService = {
  async create(input: CreateOrderInput) {
    const existing = await prisma.order.findFirst({
      where: { customerId: input.customerId, status: 'pending' }
    })
    if (existing) throw new PendingOrderError()
    return prisma.order.create({ data: { ... } })
  }
}

// src/app/api/orders/route.ts
export async function POST(req: Request) {
  try {
    const order = await orderService.create(await req.json())
    return Response.json(order, { status: 201 })
  } catch (err) {
    if (err instanceof PendingOrderError)
      return Response.json({ error: 'pending_order_exists' }, { status: 422 })
    throw err
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete three-layer data access structure for a `Post` domain: (1) a `postRepository` with `findById`, `findPublished` (cursor-paginated), `create`, and `publish` (sets `publishedAt` and `isPublished`); (2) a `postService` with `createDraft` (creates post + auto-creates a `DraftRevision` record atomically) and `publishPost` (validates ownership, uses optimistic lock on version); (3) a thin tRPC `postRouter` with `create` and `publish` mutations. All layers correctly typed with Prisma types.

### Solution

```typescript
// ── src/repositories/post.repository.ts ───────────────────────────────────
import { prisma }            from '@/lib/prisma'
import { Prisma }            from '@prisma/client'

type Ctx = Prisma.TransactionClient | typeof prisma

export const postRepository = {
  findById: (id: number, ctx: Ctx = prisma) =>
    ctx.post.findUnique({
      where:   { id },
      include: { author: { select: { id: true, name: true } } },
    }),

  findPublished: (
    opts: { cursor?: number; take?: number } = {},
    ctx: Ctx = prisma,
  ) => {
    const take = (opts.take ?? 20) + 1
    return ctx.post.findMany({
      where:   { isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: { id: true, title: true, slug: true, publishedAt: true,
                author: { select: { name: true } } },
    })
  },

  create: (data: Prisma.PostCreateInput, ctx: Ctx = prisma) =>
    ctx.post.create({ data }),

  publish: (id: number, version: number, ctx: Ctx = prisma) =>
    ctx.post.updateMany({
      where: { id, version, isPublished: false },   // optimistic lock
      data:  {
        isPublished: true,
        publishedAt: new Date(),
        version:     { increment: 1 },
      },
    }),
}

// ── src/services/post.service.ts ───────────────────────────────────────────
import { prisma }          from '@/lib/prisma'
import { postRepository }  from '@/repositories/post.repository'
import { Prisma }          from '@prisma/client'

class PostNotFoundError    extends Error { constructor() { super('Post not found') } }
class NotAuthorError       extends Error { constructor() { super('Not the author') } }
class StaleVersionError    extends Error { constructor() { super('Post was modified — reload') } }
class AlreadyPublishedError extends Error { constructor() { super('Post already published') } }

export const postService = {
  // Creates draft + first revision atomically
  async createDraft(input: {
    authorId: number
    title:    string
    slug:     string
    body:     string
  }) {
    return prisma.$transaction(async (tx) => {
      const post = await postRepository.create(
        {
          author:      { connect: { id: input.authorId } },
          title:       input.title,
          slug:        input.slug,
          body:        input.body,
          isPublished: false,
          version:     1,
        },
        tx,
      )

      // Create initial revision record atomically
      await tx.draftRevision.create({
        data: {
          postId:    post.id,
          body:      input.body,
          createdAt: new Date(),
        },
      })

      return post
    })
  },

  // Validate ownership + optimistic lock + publish
  async publishPost(input: {
    postId:    number
    authorId:  number
    version:   number
  }) {
    const post = await postRepository.findById(input.postId)
    if (!post)                        throw new PostNotFoundError()
    if (post.author.id !== input.authorId) throw new NotAuthorError()
    if (post.isPublished)             throw new AlreadyPublishedError()

    const result = await postRepository.publish(input.postId, input.version)
    if (result.count === 0)           throw new StaleVersionError()

    return postRepository.findById(input.postId)
  },
}

// ── src/server/routers/post.router.ts ─────────────────────────────────────
import { router, protectedProcedure } from '@/server/trpc'
import { postService }                from '@/services/post.service'
import { postRepository }             from '@/repositories/post.repository'
import { z }                          from 'zod'
import { TRPCError }                  from '@trpc/server'

export const postRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      slug:  z.string().regex(/^[a-z0-9-]+$/),
      body:  z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) =>
      postService.createDraft({ authorId: ctx.session.user.id, ...input })
    ),

  publish: protectedProcedure
    .input(z.object({
      postId:  z.number(),
      version: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await postService.publishPost({
          postId:   input.postId,
          authorId: ctx.session.user.id,
          version:  input.version,
        })
      } catch (err) {
        if (err instanceof NotAuthorError)
          throw new TRPCError({ code: 'FORBIDDEN',   message: err.message })
        if (err instanceof StaleVersionError)
          throw new TRPCError({ code: 'CONFLICT',    message: err.message })
        if (err instanceof AlreadyPublishedError)
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
        throw err
      }
    }),
})
```

---

## ✅ Day 9 Complete — Prisma Advanced Querying

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Transactions — Interactive and Batch | ☐ |
| 2 | Batching Mindset — Promise.all, Avoiding N+1 | ☐ |
| 3 | Raw SQL — $queryRaw, $executeRaw, Safety Rules | ☐ |
| 4 | Consistency Patterns — Optimistic Lock, Idempotency, Retry | ☐ |
| 5 | Data-Layer Organization — Services, Repositories, Procedures | ☐ |

---

## 🗺️ One-Page Mental Model — Day 9

```
TRANSACTIONS
  Batch:       prisma.$transaction([op1, op2])   → parallel ops, no shared state
  Interactive: prisma.$transaction(async (tx) => { ... })  → sequential, data deps
  Rollback:    throw inside callback → automatic ROLLBACK
  Options:     { isolationLevel, timeout, maxWait }
  ⚠️ Use tx, not prisma, inside callback
  ⚠️ No I/O (HTTP, file, queue) inside transaction — do it BEFORE

BATCHING MINDSET
  Parallel queries:   Promise.all([q1, q2, q3])  vs  await q1; await q2 (3× RTT)
  N+1 fix:           include or { id: { in: ids } } + Map lookup
  Bulk insert:       createMany → 1 query, NOT loop of create → N queries
  Aggregation:       groupBy once → Map → join in JS (2 queries, not N)
  Measure:           log: [{ emit: 'event', level: 'query' }] → count queries

RAW SQL
  $queryRaw<T[]>`SELECT ... ${param}`    → typed SELECT, parameterized
  $executeRaw`UPDATE ... ${param}`       → returns affected row count
  Prisma.sql`...`                        → compose safe fragments
  Prisma.raw('identifier')               → unparameterized — VALIDATED ALLOWLIST ONLY
  Prisma.join([...], ', ')               → join SQL fragments (for VALUES lists)
  ⚠️ NEVER: $queryRawUnsafe(`... ${userInput}`)  → SQL injection
  ⚠️ NUMERIC/DECIMAL from raw → string in JS → parseFloat() or new Prisma.Decimal()
  Use for: window functions, ts_rank, CTEs, HAVING expressions, ON CONFLICT DO UPDATE

CONSISTENCY PATTERNS
  Optimistic lock:   add `version Int`, WHERE id=? AND version=?, increment on write
                     count === 0 → conflict → throw 409 → client reloads
  Idempotency key:   client UUID per intent, store in DB, return cached on duplicate
                     prevents double charge, double booking on retry
  Retry + backoff:   catch P2034 (serialization / deadlock) → re-run with delay + jitter
                     3 attempts, exponential backoff, random jitter (prevent thundering herd)
  Soft delete:       deletedAt DateTime? + isActive false → never hard DELETE
                     Prisma middleware to auto-filter deleted records

DATA-LAYER STRUCTURE
  Repository:  pure Prisma queries, accepts ctx: Tx | prisma (default: prisma)
               no business logic, no transactions management
  Service:     business logic + prisma.$transaction, calls repositories with tx
               no HTTP concerns, throwable domain errors
  Transport:   thin handler — parse input (Zod), call service, map to response
               catches domain errors → HTTP codes or tRPC error codes

  Repository ctx pattern:
    fn(input, ctx: Prisma.TransactionClient | typeof prisma = prisma)
    → service passes tx → repository participates in transaction ✅
    → called standalone → uses default prisma ✅

  Prisma Client Extensions:
    prisma.$extends({ model: { user: { async findActive() { ... } } } })
    → adds custom methods to the Prisma model namespace
    → alternative to full repository class for simple helpers

  Error hierarchy:
    Domain errors  (PostNotFoundError, InsufficientFundsError) → service throws
    Transport maps errors → HTTP 404/422/409 or tRPC FORBIDDEN/CONFLICT
    Unexpected errors bubble up → 500
```

> **Your next action:** Open any route handler in your project. Count how many `await prisma.*` calls are sequential but independent. Wrap them in `Promise.all([...])`. That's one concrete improvement, done in under 5 minutes.

> "Doing one small thing beats opening a feed."