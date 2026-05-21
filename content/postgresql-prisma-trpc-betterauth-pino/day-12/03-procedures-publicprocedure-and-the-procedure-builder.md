# 3 — Procedures — publicProcedure and the Procedure Builder

---

## T — TL;DR

A procedure is a single callable operation on the server. It's built with a fluent chain: `procedure.input(schema).query(handler)` or `.mutation(handler)`. `publicProcedure` is the base — no auth required. You extend it to create `protectedProcedure` (auth required) and `adminProcedure` (role required) by adding middleware. The handler receives `{ input, ctx }`.

---

## K — Key Concepts

```typescript
// ── Procedure chain anatomy ────────────────────────────────────────────────
publicProcedure          // base: no middleware
  .use(middleware)       // optional: add middleware (auth, logging, rate limit)
  .input(zodSchema)      // optional: validate + type input
  .output(zodSchema)     // optional: validate + type output
  .query(handler)        // terminal: GET-like operation (read)
  // OR
  .mutation(handler)     // terminal: POST-like operation (write)

// handler receives: { input, ctx, rawInput, path, type, signal }
// input: validated, typed input (after Zod parsing)
// ctx:   the context object (session, prisma, etc.)
```

```typescript
// ── publicProcedure — base with no auth ───────────────────────────────────
export const publicProcedure = t.procedure

// Any unauthenticated user can call these
const publicRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
  health: publicProcedure.query(() => ({ status: 'ok', time: new Date() })),
})
```

```typescript
// ── protectedProcedure — requires authentication ──────────────────────────
import { TRPCError } from '@trpc/server'

// Middleware: check session exists
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      // Re-type ctx.session as non-null after the check
      session: ctx.session,
      user:    ctx.session.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)
// In a protected procedure:
// ctx.user is typed as User (non-null) ✅
// Unauthenticated calls → UNAUTHORIZED error automatically ✅
```

```typescript
// ── adminProcedure — requires admin role ─────────────────────────────────
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

export const adminProcedure = t.procedure.use(isAdmin)
```

```typescript
// ── TRPCError — throwing typed errors ─────────────────────────────────────
import { TRPCError } from '@trpc/server'

// Available error codes (map to HTTP status):
// PARSE_ERROR         → 400
// BAD_REQUEST         → 400
// UNAUTHORIZED        → 401
// FORBIDDEN           → 403
// NOT_FOUND           → 404
// METHOD_NOT_SUPPORTED→ 405
// TIMEOUT             → 408
// CONFLICT            → 409
// PRECONDITION_FAILED → 412
// PAYLOAD_TOO_LARGE   → 413
// UNPROCESSABLE_CONTENT→422
// TOO_MANY_REQUESTS   → 429
// CLIENT_CLOSED_REQUEST→499
// INTERNAL_SERVER_ERROR→500
// NOT_IMPLEMENTED     → 501
// BAD_GATEWAY         → 502

throw new TRPCError({
  code:    'NOT_FOUND',
  message: 'Post not found',
  cause:   originalError,  // optional: original error for logging
})
```

```typescript
// ── Complete src/server/trpc.ts with all procedure types ─────────────────
import { initTRPC, TRPCError } from '@trpc/server'
import { type Context }         from './context'
import superjson                from 'superjson'
import { ZodError }             from 'zod'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError
          ? error.cause.flatten()
          : null,
      },
    }
  },
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory

// Middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (ctx.session.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

// Procedure builders
export const publicProcedure    = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure     = t.procedure.use(isAdmin)
```

---

## W — Why It Matters

- `protectedProcedure` centralises auth — you define the auth check once as middleware, then every procedure that uses `protectedProcedure` is automatically protected. No per-handler `if (!session) throw` boilerplate.
- Middleware re-types the context — after `isAuthed` middleware runs, `ctx.user` is typed as `User` (non-null). Handlers using `protectedProcedure` can access `ctx.user.id` without null checks, because TypeScript knows the middleware enforced it.
- `TRPCError` with typed codes maps to HTTP status codes automatically — throwing `UNAUTHORIZED` returns a 401, `NOT_FOUND` returns 404. The client receives the error code as a typed value — you can write `if (err.data?.code === 'NOT_FOUND')` with full autocomplete.

---

## I — Interview Q&A

### Q: How does `protectedProcedure` middleware work in tRPC and how does it affect the TypeScript context type?

**A:** `protectedProcedure` is built by calling `t.procedure.use(isAuthed)` where `isAuthed` is a middleware function. Middleware receives `{ ctx, next, input, path }` and must call `next()` to continue or throw to abort. The key TypeScript feature: `next({ ctx: modifiedCtx })` replaces the context type for all downstream procedures. In `isAuthed`, after confirming `ctx.session.user` is non-null, we call `next({ ctx: { ...ctx, user: ctx.session.user } })` where `user` is typed as `User` (non-null). Any procedure using `protectedProcedure` receives a context where `ctx.user` is `User`, not `User | null` — TypeScript enforces this without type assertions. The middleware is the type-level proof that authentication passed.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to use `protectedProcedure` for sensitive operations

```typescript
// ❌ Using publicProcedure for a user-specific operation
create: publicProcedure
  .input(z.object({ title: z.string() }))
  .mutation(({ input, ctx }) => {
    // ctx.session might be null — no guarantee ❌
    return ctx.prisma.post.create({ data: { ...input, authorId: ctx.session!.user.id } })
  }),
```

**Fix:** Use `protectedProcedure` — guaranteed non-null session:

```typescript
// ✅ Protected — ctx.user is typed as User (non-null)
create: protectedProcedure
  .input(z.object({ title: z.string() }))
  .mutation(({ input, ctx }) => {
    return ctx.prisma.post.create({ data: { ...input, authorId: ctx.user.id } })
    //                                                         ^^^ non-null ✅
  }),
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `loggingMiddleware` that logs the procedure path, type (query/mutation), and duration to the console. Apply it to a `loggedProcedure`. Show how to chain middlewares: `loggedProcedure` = `publicProcedure + logging`; `loggedProtectedProcedure` = `loggedProcedure + auth`.

### Solution

```typescript
// src/server/trpc.ts additions

const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start  = Date.now()
  const result = await next()
  const ms     = Date.now() - start
  const status = result.ok ? 'OK' : 'ERR'
  console.log(`[tRPC] ${type.toUpperCase()} ${path} — ${ms}ms ${status}`)
  return result
})

// Chained: public + logging
export const loggedProcedure = t.procedure.use(loggingMiddleware)

// Chained: logging + auth (order matters — log all attempts, even unauthed)
export const loggedProtectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(isAuthed)

// Usage:
const postRouter = createTRPCRouter({
  list: loggedProcedure.query(({ ctx }) =>
    ctx.prisma.post.findMany()
  ),
  create: loggedProtectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.post.create({ data: { title: input.title, authorId: ctx.user.id } })
    ),
})
```

---

---
