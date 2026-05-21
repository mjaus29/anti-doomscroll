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
