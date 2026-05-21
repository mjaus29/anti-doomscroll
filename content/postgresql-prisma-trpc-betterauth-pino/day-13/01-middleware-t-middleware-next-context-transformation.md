# 1 — Middleware — t.middleware, next(), Context Transformation

---

## T — TL;DR

Middleware is a function that runs before a procedure handler. It receives `{ ctx, next, input, path, type }`, can modify context, and must call `next()` to continue or throw to abort. The key superpower: `next({ ctx: newCtx })` replaces the context type downstream — TypeScript reflects the change in the handler.

---

## K — Key Concepts

```typescript
// ── src/server/trpc.ts — middleware anatomy ───────────────────────────────
import { initTRPC, TRPCError } from '@trpc/server'
import { type Context }         from './context'
import superjson                from 'superjson'

const t = initTRPC.context<Context>().create({ transformer: superjson })

// ── Basic middleware — logging ─────────────────────────────────────────────
const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start  = Date.now()
  const result = await next()          // call next — runs the remaining chain
  const ms     = Date.now() - start
  console.log(`[tRPC] ${type} ${path} — ${ms}ms ${result.ok ? 'OK' : 'ERR'}`)
  return result                        // must return the result
})

// ── Middleware that modifies context ──────────────────────────────────────
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  // next({ ctx }) returns the result with a NEW ctx type
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,      // narrowed: Session (not null)
      user:    ctx.session.user, // narrowed: User (not null)
    },
  })
  // After this middleware, downstream ctx.user is User — never null ✅
})

// ── What next() returns ────────────────────────────────────────────────────
// result.ok:   boolean — did the handler succeed?
// result.data: the return value of the handler (if ok)
// result.error: TRPCError (if !ok)
// You MUST return result — not returning it breaks the middleware chain
```

```typescript
// ── Middleware can be async — for database checks ─────────────────────────
const hasActiveSubscription = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })

  const user = await ctx.prisma.user.findUnique({
    where:  { id: ctx.session.user.id },
    select: { plan: true, trialEndsAt: true },
  })

  const isActive =
    user?.plan === 'pro' ||
    (user?.trialEndsAt && user.trialEndsAt > new Date())

  if (!isActive) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: 'Active subscription required',
    })
  }

  return next({ ctx: { ...ctx, user: ctx.session.user } })
})
```

```typescript
// ── Chaining middleware on a procedure ────────────────────────────────────
// Each .use() adds middleware to the chain — runs in order
const billingProcedure = t.procedure
  .use(timingMiddleware)          // 1st: log timing
  .use(isAuthed)                  // 2nd: check auth
  .use(hasActiveSubscription)     // 3rd: check subscription

// Handler only runs if all three middleware pass ✅
// ctx type after all three: { ...Context; user: User; session: Session }
```

```typescript
// ── Middleware receiving input ─────────────────────────────────────────────
// rawInput: the input BEFORE Zod validation — use carefully
// input:    only available after .input() is declared on the procedure
//           middleware declared BEFORE .input() sees rawInput: unknown
//           middleware declared AFTER .input() (not possible — .input is terminal)
// Pattern: access input in the handler, not middleware, unless you need pre-validation logic

const rateLimitMiddleware = t.middleware(async ({ ctx, rawInput, next, path }) => {
  // rawInput is the unvalidated client payload — unknown type
  const key = `rate:${ctx.ip}:${path}`
  // check redis rate limit here...
  return next()
})
```

```typescript
// ── Reusable middleware export pattern ────────────────────────────────────
export const createTRPCRouter    = t.router
export const publicProcedure     = t.procedure
export const protectedProcedure  = t.procedure.use(isAuthed)
export const timedProcedure      = t.procedure.use(timingMiddleware)
export const timedProtected      = t.procedure.use(timingMiddleware).use(isAuthed)
export const billingProcedure    = t.procedure
  .use(timingMiddleware)
  .use(isAuthed)
  .use(hasActiveSubscription)
```

---

## W — Why It Matters

- Middleware re-types the context — this is what makes `protectedProcedure` safe. After `isAuthed` runs, `ctx.user` is `User` not `User | null`. TypeScript enforces this; you can't accidentally access `ctx.user.id` without going through the middleware first.
- Returning `result` from middleware is not optional — if you `await next()` but don't `return result`, the middleware chain breaks silently. Always `return next()` or `return await next()`.
- Async middleware for database checks (subscription status, feature flags) keeps authorization logic centralised. One middleware definition protects every procedure that uses it — no per-handler boilerplate.

---

## I — Interview Q&A

### Q: How does tRPC middleware transform the TypeScript context type, and why is this useful?

**A:** When middleware calls `next({ ctx: modifiedCtx })`, tRPC uses TypeScript's type inference to replace the context type for all downstream procedures. The `next` function is generic — its argument narrows the context type. If `isAuthed` middleware checks `ctx.session` is non-null and calls `next({ ctx: { ...ctx, user: ctx.session.user } })`, TypeScript infers that after the middleware, `ctx.user` is `User` not `User | null`. Any procedure built with `.use(isAuthed)` has a handler where `ctx.user` is typed as non-null — no `!` assertions needed, and accessing `ctx.user.id` is valid TypeScript. This type transformation is the compile-time proof that authorization logic ran.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to return the result from middleware

```typescript
// ❌ result not returned — every call returns undefined
const badMiddleware = t.middleware(async ({ next }) => {
  await next()   // ← result discarded ❌
})
// All procedures using this middleware return undefined to the client
```

**Fix:** Always return the result:

```typescript
// ✅
const goodMiddleware = t.middleware(async ({ next }) => {
  const result = await next()
  return result   // ✅
  // Or inline: return next()
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `featureFlagMiddleware` that reads a `featureFlag` query param or header (`x-feature-flag`), checks a `featureFlags` table in the database for whether the flag is enabled for the current user, and throws `FORBIDDEN` if disabled. Chain it after `isAuthed` to create a `flaggedProcedure`.

### Solution

```typescript
// src/server/middleware/featureFlag.ts
import { t }         from '@/server/trpc'
import { TRPCError } from '@trpc/server'

export const featureFlagMiddleware = (flagName: string) =>
  t.middleware(async ({ ctx, next }) => {
    // Must run after isAuthed — ctx.user is User here
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const flag = await ctx.prisma.featureFlag.findFirst({
      where: {
        name:      flagName,
        isEnabled: true,
        OR: [
          { userId: null },            // global flag
          { userId: ctx.user.id },     // per-user override
        ],
      },
    })

    if (!flag) {
      throw new TRPCError({
        code:    'FORBIDDEN',
        message: `Feature '${flagName}' is not available for your account.`,
      })
    }

    return next()
  })

// Usage: create a procedure builder factory
export const createFlaggedProcedure = (flagName: string) =>
  t.procedure.use(isAuthed).use(featureFlagMiddleware(flagName))

// In a router:
const betaRouter = createTRPCRouter({
  newDashboard: createFlaggedProcedure('beta-dashboard')
    .query(({ ctx }) => ({ message: `Beta dashboard for ${ctx.user.id}` })),
})
```

---

---
