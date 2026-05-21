# 3 — Child Loggers — Context Propagation

---

## T — TL;DR

`logger.child({ key: value })` creates a new logger that inherits the parent's settings but permanently attaches extra fields to every log line it produces. Use child loggers to propagate context — request ID, user ID, tenant ID — through a chain of function calls without threading the logger manually through every parameter.

---

## K — Key Concepts

```typescript
// ── Creating a child logger ────────────────────────────────────────────────
import { logger } from '@/lib/logger'

// Child inherits level, transport, serializers — adds permanent fields
const reqLogger = logger.child({ requestId: 'abc-123', method: 'POST', path: '/api/trpc/post.create' })

reqLogger.info('Request received')
// { "msg": "Request received", "requestId": "abc-123", "method": "POST", "path": "..." }

reqLogger.error({ err }, 'Handler failed')
// { "msg": "Handler failed", "requestId": "abc-123", "method": "POST", "err": {...} }

// The parent logger is unaffected:
logger.info('Unrelated log')
// { "msg": "Unrelated log" }   ← no requestId ✅
```

```typescript
// ── Layered child loggers — adding context progressively ─────────────────
const baseLogger = logger

// Request-scoped: add requestId
const reqLogger = baseLogger.child({ requestId: 'abc-123' })

// User-scoped: add userId
const userLogger = reqLogger.child({ userId: 'u-456' })

// Operation-scoped: add operation name
const opLogger = userLogger.child({ operation: 'createOrder' })

opLogger.info({ orderId: 99 }, 'Order created')
// { "msg": "Order created", "requestId": "abc-123", "userId": "u-456", "operation": "createOrder", "orderId": 99 }
// All parent fields cascade down ✅
```

```typescript
// ── Passing child logger through service layer ─────────────────────────────
// Option A: pass logger as a parameter (explicit, testable)
async function createOrder(
  input: CreateOrderInput,
  prisma: PrismaClient,
  log:   AppLogger   // ← pass child logger from request context
) {
  log.debug({ input }, 'createOrder called')
  const order = await prisma.order.create({ data: input })
  log.info({ orderId: order.id }, 'Order created')
  return order
}

// In tRPC handler:
create: protectedProcedure
  .input(createOrderSchema)
  .mutation(async ({ input, ctx }) => {
    const log = ctx.log.child({ operation: 'order.create' })
    return createOrder(input, ctx.prisma, log)
  }),

// Option B: AsyncLocalStorage — automatic propagation (no parameter threading)
// Covered in a more advanced context; Option A is sufficient for most apps
```

```typescript
// ── Child logger in context ────────────────────────────────────────────────
// src/server/context.ts — add request-scoped logger to context

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID()
  const session   = await auth.api.getSession({ headers })

  // Create request-scoped child logger
  const log = logger.child({
    requestId,
    ...(session?.user ? { userId: session.user.id } : {}),
  })

  return {
    prisma,
    session,
    user:      session?.user ?? null,
    requestId,
    log,       // ← attached to every request context
  }
}

// Usage in any handler:
someRouter: createTRPCRouter({
  create: protectedProcedure
    .mutation(({ ctx }) => {
      ctx.log.info({ action: 'create' }, 'Mutation called')
      // Automatically includes requestId and userId ✅
    }),
})
```

---

## W — Why It Matters

- Child loggers are the correct way to propagate context in Node.js — the alternative (adding `requestId` to every individual log call) is error-prone and verbose. One `logger.child({ requestId })` call at the request boundary ensures every subsequent log line in that request has the request ID automatically.
- Layered children model the call stack — `base → request → user → operation`. When you see an error in the logs, you can filter by `requestId` to see everything that happened in that request: auth check, DB queries, external API calls — all correlated.
- The `log` property on `ctx` makes request-scoped logging a first-class citizen in tRPC — just like `ctx.prisma` is the database client, `ctx.log` is the request logger. Any service function that accepts `log` as a parameter is instantly testable in isolation.

---

## I — Interview Q&A

### Q: What is a child logger in pino and how does it help with request tracing?

**A:** `logger.child(bindings)` creates a new logger instance that inherits all settings of the parent but permanently binds extra fields to every log line it produces. For request tracing, you call `logger.child({ requestId })` at the beginning of each HTTP request. Pass this child logger into every function that handles that request. Every log line — whether from the route handler, service layer, or database helper — automatically includes `requestId`. This allows you to filter logs by request ID in production and reconstruct the complete timeline of a single request: what it did, how long each step took, what errors occurred. Without child loggers, you'd need to pass `requestId` as a parameter to every log call and risk forgetting it on any line.

---

## C — Common Pitfalls + Fix

### ❌ Creating a new child logger inside a hot loop — allocation overhead

```typescript
// ❌ Creates a new logger object for every item in the array — unnecessary allocation
for (const item of items) {
  const itemLog = logger.child({ itemId: item.id })  // ← new object every iteration ❌
  itemLog.debug('Processing item')
}
```

**Fix:** Create one child outside the loop with the shared context, pass item-specific fields inline:

```typescript
// ✅ One child per logical scope, specific fields inline per log call
const batchLog = logger.child({ batchId, totalItems: items.length })
for (const item of items) {
  batchLog.debug({ itemId: item.id }, 'Processing item')  // no new object ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createRequestLogger` factory used in `createTRPCContext` that: builds a child logger with `requestId`, `method`, `path` extracted from headers; further creates a `createUserLogger` method that adds `userId` and `role`; both returned from context setup.

### Solution

```typescript
// src/lib/request-logger.ts
import { logger, type AppLogger } from '@/lib/logger'

interface RequestLoggerOptions {
  headers:   Headers
  requestId: string
}

export function createRequestLogger({ headers, requestId }: RequestLoggerOptions) {
  const method = headers.get('x-trpc-method') ?? 'unknown'
  const path   = headers.get('x-trpc-path')   ?? 'unknown'

  const reqLog = logger.child({ requestId, method, path })

  function createUserLogger(userId: string, role: string): AppLogger {
    return reqLog.child({ userId, role })
  }

  return { reqLog, createUserLogger }
}

// src/server/context.ts
import { createRequestLogger } from '@/lib/request-logger'
import { auth }                from '@/lib/auth'
import { prisma }              from '@/lib/prisma'

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID()
  const session   = await auth.api.getSession({ headers })
  const user      = session?.user ?? null

  const { reqLog, createUserLogger } = createRequestLogger({ headers, requestId })

  const log = user
    ? createUserLogger(user.id, user.role)
    : reqLog

  return { prisma, session, user, requestId, log }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
```

---

---
