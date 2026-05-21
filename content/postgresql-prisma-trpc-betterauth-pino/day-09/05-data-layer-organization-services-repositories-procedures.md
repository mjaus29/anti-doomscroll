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
