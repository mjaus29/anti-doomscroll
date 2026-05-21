# 9 — End-to-End Backend Flow — Composition

---

## T — TL;DR

The production backend is a composed stack: `Next.js middleware` (request ID) → `createTRPCContext` (session, logger, prisma) → `tRPC middleware chain` (logging, auth, role) → `procedure handler` (validation, business logic, Prisma) → `errorFormatter` (safe error shape) → `response` (request ID header). Every layer has one responsibility. Understanding the flow lets you place logging, error handling, and auth at exactly the right layer.

---

## K — Key Concepts

```typescript
// ── Complete request flow — annotated ─────────────────────────────────────
//
// 1. Next.js middleware (middleware.ts)
//    - Read or generate x-request-id
//    - Forward to handler via request headers
//    - Add x-request-id to response headers
//    - Log: "Incoming request" with method + path
//
// 2. Route handler (app/api/trpc/[trpc]/route.ts)
//    - Call fetchRequestHandler
//    - Pass createContext factory (receives request)
//
// 3. createTRPCContext (server/context.ts)
//    - Read requestId from headers
//    - auth.api.getSession(headers) → session | null
//    - Create child logger: logger.child({ requestId, userId? })
//    - Return: { prisma, session, user, requestId, log }
//
// 4. tRPC middleware chain
//    - timingMiddleware: log procedure start
//    - enforceAuth: check session → throw UNAUTHORIZED if missing
//                  → narrow ctx.user type to User (non-null)
//    - enforceRole: check ctx.user.role → throw FORBIDDEN if wrong
//
// 5. .input() Zod validation
//    - Parse and validate client input
//    - On failure → ZodError → errorFormatter → PARSE_ERROR with zodError fields
//
// 6. Procedure handler
//    - Business logic + Prisma queries
//    - ctx.log.info(fields, 'msg') for business events
//    - Catch Prisma errors → translate to TRPCError
//    - Ownership check (scoped query or assertOwner)
//    - Return result
//
// 7. errorFormatter (if error thrown)
//    - Attach: zodError, requestId, userMessage, stack (dev only)
//    - Log INTERNAL_SERVER_ERROR
//    - Return safe error shape to client
//
// 8. Response
//    - x-request-id header echoed to client
//    - Client receives typed result or formatted error
```

```typescript
// ── src/server/trpc.ts — complete production file ─────────────────────────
import { initTRPC, TRPCError }  from '@trpc/server'
import { ZodError }              from 'zod'
import superjson                 from 'superjson'
import { type Context }          from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      ctx?.log?.error({ err: error.cause ?? error }, 'Internal server error')
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:    error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId:   ctx?.requestId,
        stack:       process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

const timingMw = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now()
  ctx.log.debug({ path, type }, 'Procedure called')
  const result = await next()
  const ms     = Date.now() - start
  if (ms > 1000) ctx.log.warn({ path, type, ms }, 'Slow procedure')
  else ctx.log.debug({ path, type, ms }, 'Procedure completed')
  return result
})

const authMw = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user, session: ctx.session } })
})

const adminMw = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure     = t.procedure.use(timingMw)
export const protectedProcedure  = t.procedure.use(timingMw).use(authMw)
export const adminProcedure      = t.procedure.use(timingMw).use(authMw).use(adminMw)
```

```typescript
// ── src/server/root.ts — app router composition ────────────────────────────
import { createTRPCRouter, createCallerFactory } from './trpc'
import { postRouter }    from './routers/post'
import { userRouter }    from './routers/user'
import { orderRouter }   from './routers/order'
import { adminRouter }   from './routers/admin'

export const appRouter = createTRPCRouter({
  post:  postRouter,
  user:  userRouter,
  order: orderRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
```

```typescript
// ── src/app/api/trpc/[trpc]/route.ts — HTTP adapter ───────────────────────
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'
import type { NextRequest }    from 'next/server'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:      '/api/trpc',
    req,
    router:        appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      // onError fires for ALL errors — but internal logging happens in errorFormatter
      // Use onError for external error reporting (Sentry, etc.)
      if (process.env.NODE_ENV === 'production' && error.code === 'INTERNAL_SERVER_ERROR') {
        // Sentry.captureException(error)
      }
    },
  })

export { handler as GET, handler as POST }
```

---

## W — Why It Matters

- Understanding the full stack flow is what separates "it works" from "it's maintainable" — when something breaks in production, knowing exactly which layer handles logging (context), auth (middleware), validation (Zod), business errors (handler), and formatting (errorFormatter) means you go directly to the right file.
- The `ctx` in `errorFormatter` contains the request-scoped logger — logging `INTERNAL_SERVER_ERROR` from the formatter means the error log always carries the `requestId` and `userId` that were in context when the error occurred. This is the correlation chain.
- `onError` in `fetchRequestHandler` is for external error reporters (Sentry), while `errorFormatter` is for shaping the client response. They're complementary: `errorFormatter` controls what the client sees, `onError` controls what monitoring sees.

---

## I — Interview Q&A

### Q: Walk through what happens when an authenticated user calls a protected tRPC mutation that fails with a Prisma unique constraint error.

**A:** (1) `middleware.ts` adds `x-request-id` to headers. (2) The route handler calls `fetchRequestHandler` which calls `createTRPCContext` — reads session via BetterAuth, creates child logger with `requestId` and `userId`. (3) The `timingMw` middleware starts the timer and logs the procedure call. (4) The `authMw` middleware checks `ctx.session` — it exists, so it narrows `ctx.user` to `User` and calls `next`. (5) Zod validates the input — passes. (6) The handler runs — calls `prisma.post.create()`. (7) Prisma throws `PrismaClientKnownRequestError` with code `P2002` (unique constraint). (8) The handler's catch block calls `handlePrismaError` which throws `TRPCError({ code: 'CONFLICT', message: 'Title taken' })`. (9) `errorFormatter` runs — `error.code` is `CONFLICT` (not `INTERNAL_SERVER_ERROR`), so nothing is logged here. It attaches `requestId` and null `zodError` to the shape. (10) The client receives `{ code: 'CONFLICT', data: { requestId: 'abc-123', userMessage: '...' } }`.

---

## C — Common Pitfalls + Fix

### ❌ No `onError` handler — internal errors silently discarded

```typescript
// ❌ Errors are formatted and returned to client but never externally reported
fetchRequestHandler({ router: appRouter, createContext })
// In production, a crash in a procedure is invisible to monitoring ❌
```

**Fix:** Add `onError` for external reporting:

```typescript
// ✅
fetchRequestHandler({
  router:        appRouter,
  createContext: () => createTRPCContext({ headers: req.headers }),
  onError: ({ error, path }) => {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      // captureException(error)  ← Sentry / BugSnag / etc.
      logger.error({ err: error, path }, 'Unhandled procedure error')
    }
  },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete `src/server/context.ts`, `src/server/trpc.ts`, and `src/app/api/trpc/[trpc]/route.ts` as a cohesive unit — showing how requestId, logger, session, and error formatting all connect. Keep each file under 50 lines.

### Solution

```typescript
// src/server/context.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { logger }      from '@/lib/logger'
import { randomUUID }  from 'crypto'

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? randomUUID()
  const session   = await auth.api.getSession({ headers })
  const user      = session?.user ?? null
  const log       = logger.child({ requestId, ...(user ? { userId: user.id } : {}) })
  return { prisma, session, user, requestId, log, ip: headers.get('x-forwarded-for')?.split(',')[0] ?? '::1' }
}
export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError }             from 'zod'
import superjson                from 'superjson'
import { type Context }         from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR')
      ctx?.log?.error({ err: error.cause ?? error }, 'Unhandled error')
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:  error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId: ctx?.requestId,
        stack:     process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

const authMw = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure     = t.procedure
export const protectedProcedure  = t.procedure.use(authMw)
export const adminProcedure      = t.procedure.use(authMw).use(
  t.middleware(({ ctx, next }) => {
    if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
    return next()
  })
)

// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'
import type { NextRequest }    from 'next/server'

const handler = async (req: NextRequest) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
  const headers   = new Headers(req.headers)
  headers.set('x-request-id', requestId)
  const res = await fetchRequestHandler({
    endpoint:      '/api/trpc',
    req:           new Request(req.url, { method: req.method, headers, body: req.body }),
    router:        appRouter,
    createContext: () => createTRPCContext({ headers }),
  })
  res.headers.set('x-request-id', requestId)
  return res
}
export { handler as GET, handler as POST }
```

---

---
