# 7 — Prisma Integration — Transactions, Error Codes

---

## T — TL;DR

Prisma integrates naturally in tRPC procedure handlers via `ctx.prisma`. Wrap multi-step writes in `ctx.prisma.$transaction()` for atomicity. Catch Prisma-specific error codes (`P2002` unique violation, `P2025` not found) and translate them to typed `TRPCError` responses — never let raw Prisma errors reach the client.

---

## K — Key Concepts

```typescript
// ── Basic Prisma in procedures ────────────────────────────────────────────
const postRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      // findUniqueOrThrow: throws PrismaClientKnownRequestError (P2025) if not found
      ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
      // Note: Prisma P2025 is NOT automatically a TRPCError — must handle it
    ),
})
```

```typescript
// ── Prisma error codes → TRPCError translation ────────────────────────────
import { Prisma }    from '@prisma/client'
import { TRPCError } from '@trpc/server'

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(', ') ?? 'field'
        throw new TRPCError({
          code:    'CONFLICT',
          message: `A record with this ${field} already exists.`,
        })
      }
      case 'P2025': {
        // Record not found (findUniqueOrThrow, update on non-existent row)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Record not found.' })
      }
      case 'P2003': {
        // Foreign key constraint — referenced record doesn't exist
        throw new TRPCError({
          code:    'BAD_REQUEST',
          message: 'Referenced resource does not exist.',
        })
      }
      case 'P2014': {
        // Relation violation
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Relation constraint violation.' })
      }
    }
  }
  // Unknown error — re-throw as internal
  throw new TRPCError({
    code:    'INTERNAL_SERVER_ERROR',
    message: 'Database error.',
    cause:   err,
  })
}

// Usage:
create: protectedProcedure
  .input(createPostSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      return await ctx.prisma.post.create({
        data: { ...input, authorId: ctx.user.id },
      })
    } catch (err) {
      handlePrismaError(err)   // translates and re-throws as TRPCError ✅
    }
  }),
```

```typescript
// ── Transactions in tRPC procedures ───────────────────────────────────────
const orderRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity:  z.number().min(1),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.$transaction(async (tx) => {
          // 1. Create order
          const order = await tx.order.create({
            data: { customerId: ctx.user.id, status: 'pending', total: 0 },
          })

          // 2. Verify stock and create items
          let total = 0
          for (const item of input.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            })
            if (!product) {
              throw new TRPCError({
                code:    'BAD_REQUEST',
                message: `Product ${item.productId} not found`,
              })
            }
            if (product.stockCount < item.quantity) {
              throw new TRPCError({
                code:    'BAD_REQUEST',
                message: `Insufficient stock for ${product.name}`,
              })
            }

            await tx.orderItem.create({
              data: {
                orderId:   order.id,
                productId: item.productId,
                quantity:  item.quantity,
                unitPrice: product.price,
              },
            })

            await tx.product.update({
              where: { id: item.productId },
              data:  { stockCount: { decrement: item.quantity } },
            })

            total += Number(product.price) * item.quantity
          }

          // 3. Update order total
          return tx.order.update({
            where: { id: order.id },
            data:  { total, status: 'confirmed' },
          })
          // All steps commit together or all rollback ✅
        })
      } catch (err) {
        if (err instanceof TRPCError) throw err   // re-throw our own errors
        handlePrismaError(err)                    // translate Prisma errors
      }
    }),
})
```

```typescript
// ── findUniqueOrThrow + automatic P2025 handling ──────────────────────────
// Option: wrap findUniqueOrThrow to auto-translate P2025
async function findOrThrow<T>(
  findFn: () => Promise<T>,
  message = 'Record not found'
): Promise<T> {
  try {
    return await findFn()
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw new TRPCError({ code: 'NOT_FOUND', message })
    }
    throw err
  }
}

// Usage:
const post = await findOrThrow(
  () => ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } }),
  'Post not found'
)
```

---

## W — Why It Matters

- `$transaction` in tRPC procedures is the correct pattern for multi-step writes — creating an order + order items + decrementing stock must be atomic. If any step fails (out of stock, FK violation), the whole operation rolls back. Never do multi-step writes without a transaction.
- `handlePrismaError` as a shared function standardizes Prisma → tRPC error translation across all routers. Without it, P2002 from a unique violation shows as a cryptic `INTERNAL_SERVER_ERROR` to the client instead of a meaningful `CONFLICT` with a field name.
- Catching your own `TRPCError` before the Prisma error handler (the `if (err instanceof TRPCError) throw err` pattern) ensures that validation errors thrown inside a transaction body are re-thrown as-is, not re-wrapped as database errors.

---

## I — Interview Q&A

### Q: How do you handle Prisma errors in tRPC procedures without leaking internal details?

**A:** Create a `handlePrismaError(err)` helper that catches `Prisma.PrismaClientKnownRequestError` and maps known codes to `TRPCError`. For P2002 (unique constraint), throw `CONFLICT` with the field name extracted from `err.meta.target`. For P2025 (record not found), throw `NOT_FOUND`. For P2003 (FK constraint), throw `BAD_REQUEST`. For unknown Prisma errors, throw `INTERNAL_SERVER_ERROR` with the original as `cause` (cause is logged server-side but not sent to the client). The `cause` field on `TRPCError` is never serialised into the HTTP response — it's only available for server-side logging. Call this helper in a try-catch around every Prisma operation that might fail with a constraint violation or not-found error.

---

## C — Common Pitfalls + Fix

### ❌ Throwing TRPCError inside `$transaction` without catching it — Prisma wraps it

```typescript
// ❌ TRPCError thrown inside $transaction is caught by Prisma and re-wrapped
await ctx.prisma.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: 1 } })
  if (!product) throw new TRPCError({ code: 'NOT_FOUND' })  // ← Prisma catches this
  // Prisma transaction catches the TRPCError and may re-throw as PrismaClientKnownRequestError
})
// Client receives INTERNAL_SERVER_ERROR ❌ instead of NOT_FOUND
```

**Fix:** Re-throw `TRPCError` after the transaction:

```typescript
// ✅ Catch TRPCError first, let Prisma handle the rest
try {
  await ctx.prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: 1 } })
    if (!product) throw new TRPCError({ code: 'NOT_FOUND' })
    // ...
  })
} catch (err) {
  if (err instanceof TRPCError) throw err   // ← re-throw our error as-is ✅
  handlePrismaError(err)                    // translate other errors
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `transferCredits` mutation that: atomically debits credits from one user and credits another; throws `BAD_REQUEST` if the source user has insufficient credits; throws `NOT_FOUND` if either user doesn't exist; wraps Prisma errors; returns `{ from: number, to: number, amount: number }`.

### Solution

```typescript
// src/server/routers/wallet.ts
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { TRPCError }   from '@trpc/server'
import { Prisma }      from '@prisma/client'
import { z }           from 'zod'

export const walletRouter = createTRPCRouter({
  transfer: protectedProcedure
    .input(z.object({
      toUserId: z.string().min(1),
      amount:   z.number().int().positive().max(100_000),
    }))
    .mutation(async ({ input, ctx }) => {
      const fromUserId = ctx.user.id

      if (fromUserId === input.toUserId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot transfer to yourself' })
      }

      try {
        return await ctx.prisma.$transaction(async (tx) => {
          // Fetch both users with locking (SELECT FOR UPDATE via Prisma raw or just update)
          const [fromUser, toUser] = await Promise.all([
            tx.user.findUnique({ where: { id: fromUserId }, select: { id: true, credits: true } }),
            tx.user.findUnique({ where: { id: input.toUserId }, select: { id: true, credits: true } }),
          ])

          if (!fromUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sender not found' })
          if (!toUser)   throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipient not found' })

          if (fromUser.credits < input.amount) {
            throw new TRPCError({
              code:    'BAD_REQUEST',
              message: `Insufficient credits. Have: ${fromUser.credits}, need: ${input.amount}`,
            })
          }

          const [updatedFrom, updatedTo] = await Promise.all([
            tx.user.update({
              where: { id: fromUserId },
              data:  { credits: { decrement: input.amount } },
              select: { credits: true },
            }),
            tx.user.update({
              where: { id: input.toUserId },
              data:  { credits: { increment: input.amount } },
              select: { credits: true },
            }),
          ])

          return {
            from:   updatedFrom.credits,
            to:     updatedTo.credits,
            amount: input.amount,
          }
        })
      } catch (err) {
        if (err instanceof TRPCError) throw err
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Transfer failed', cause: err })
      }
    }),
})
```

---

---
