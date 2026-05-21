# 4 — Protected Procedures — Typed Procedure Hierarchy

---

## T — TL;DR

Build a procedure hierarchy where each level adds more restriction. `publicProcedure` → `protectedProcedure` → `adminProcedure` → domain-specific procedures. Each level extends the previous via `.use()`, and each level narrows the context type further. The hierarchy is the security model made explicit in TypeScript.

---

## K — Key Concepts

```typescript
// ── src/server/trpc.ts — complete procedure hierarchy ─────────────────────
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

// ── Level 1: Public — no restrictions ────────────────────────────────────
export const publicProcedure = t.procedure

// ── Level 2: Authenticated ────────────────────────────────────────────────
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user:    ctx.session.user,
      // ctx.user is now User — never null below this point
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

// ── Level 3: Verified email ────────────────────────────────────────────────
const enforceEmailVerified = t.middleware(({ ctx, next }) => {
  // Must run after enforceAuth — ctx.user is User here
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: 'Please verify your email address before continuing.',
    })
  }
  return next()
})

export const verifiedProcedure = t.procedure
  .use(enforceAuth)
  .use(enforceEmailVerified)

// ── Level 4: Admin only ────────────────────────────────────────────────────
const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})

export const adminProcedure = t.procedure
  .use(enforceAuth)
  .use(enforceAdmin)

// ── Level 4 (alt): Moderator or Admin ────────────────────────────────────
const enforceModOrAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (!['admin', 'moderator'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next()
})

export const modProcedure = t.procedure
  .use(enforceAuth)
  .use(enforceModOrAdmin)
```

```typescript
// ── Context type at each procedure level ──────────────────────────────────
// publicProcedure handler ctx:
// { prisma: PrismaClient; session: Session | null; user: User | null }

// protectedProcedure handler ctx (after enforceAuth):
// { prisma: PrismaClient; session: Session; user: User }
//                                                 ^^^^ non-null ✅

// TypeScript enforces this — accessing ctx.user.id in publicProcedure → TS error
// Accessing ctx.user.id in protectedProcedure → valid ✅
```

```typescript
// ── Procedure hierarchy in use — all four levels ──────────────────────────
const appRouter = createTRPCRouter({
  // Anyone
  health:  publicProcedure.query(() => ({ ok: true })),
  posts:   publicProcedure.query(({ ctx }) =>
    ctx.prisma.post.findMany({ where: { published: true } })
  ),

  // Authenticated
  me:      protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
  ),

  // Authenticated + verified email
  createPost: verifiedProcedure
    .input(z.object({ title: z.string(), body: z.string() }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.post.create({ data: { ...input, authorId: ctx.user.id } })
    ),

  // Admin only
  admin: createTRPCRouter({
    listUsers: adminProcedure.query(({ ctx }) =>
      ctx.prisma.user.findMany({ take: 100 })
    ),
    banUser:   adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(({ input, ctx }) =>
        ctx.prisma.user.update({ where: { id: input.userId }, data: { bannedAt: new Date() } })
      ),
  }),
})
```

```typescript
// ── Testing procedure protection — createCaller ───────────────────────────
// src/server/__tests__/procedures.test.ts
import { createCaller }      from '@/server/root'
import { createCallerFactory } from '@/server/trpc'

const callerFactory = createCallerFactory(appRouter)

// Test: protected procedure without auth → UNAUTHORIZED
const unauthCaller = callerFactory({
  prisma,
  session: null,
  user:    null,
})

await expect(unauthCaller.me()).rejects.toMatchObject({
  code: 'UNAUTHORIZED',
})

// Test: protected procedure with auth → success
const authCaller = callerFactory({
  prisma,
  session: { user: { id: 'user-1', role: 'user', emailVerified: true } },
  user:    { id: 'user-1', role: 'user', emailVerified: true },
})

const result = await authCaller.me()
expect(result.id).toBe('user-1')
```

---

## W — Why It Matters

- The procedure hierarchy makes security requirements explicit and auditable — looking at `createPost: verifiedProcedure` instantly tells you "requires auth + verified email". Looking at `listUsers: adminProcedure` tells you "admin only". No need to read the handler to understand access requirements.
- Each level is composable — if you need a new access level (e.g., `premiumProcedure` for paid users), you add it once to `trpc.ts` and use it in procedures. All existing procedures remain unchanged.
- Testing with `createCallerFactory` is the recommended way to test tRPC procedures — pass a mock context, call the procedure directly (no HTTP), assert on the result or error. Tests are fast, predictable, and don't require a running server.

---

## I — Interview Q&A

### Q: How would you add a new "premium user" access level to the tRPC procedure hierarchy?

**A:** Create a new middleware that checks the user's plan, then create a procedure builder that chains the existing `enforceAuth` with the new middleware. In `trpc.ts`: `const enforcePremium = t.middleware(({ ctx, next }) => { if (!ctx.user) throw UNAUTHORIZED; if (ctx.user.plan !== 'pro') throw FORBIDDEN('Upgrade to Pro'); return next() })`. Then: `export const premiumProcedure = t.procedure.use(enforceAuth).use(enforcePremium)`. All procedures that should require a premium account use `premiumProcedure`. The context type after both middleware passes has `ctx.user` as `User` (non-null). No existing procedures are touched, and the new level is available immediately.

---

## C — Common Pitfalls + Fix

### ❌ Building adminProcedure without first checking auth — order matters

```typescript
// ❌ enforceAdmin runs before enforceAuth — ctx.user might be null
const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})
export const adminProcedure = t.procedure.use(enforceAdmin)
// An unauthenticated user gets FORBIDDEN instead of UNAUTHORIZED ❌
// Also: ctx.user?.role is undefined → evaluates as !== 'admin' → FORBIDDEN (wrong code)
```

**Fix:** Always chain auth before role check:

```typescript
// ✅ enforceAuth runs first → ctx.user is User before enforceAdmin runs
export const adminProcedure = t.procedure
  .use(enforceAuth)    // 1st: UNAUTHORIZED if not logged in
  .use(enforceAdmin)   // 2nd: FORBIDDEN if wrong role (user IS logged in) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a five-level procedure hierarchy: `publicProcedure`, `protectedProcedure`, `verifiedProcedure`, `proProcedure` (plan = 'pro' or 'enterprise'), `adminProcedure`. Write one query per level in a `demoRouter`. Show the full `trpc.ts` exports.

### Solution

```typescript
// src/server/trpc.ts — five-level hierarchy
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
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory

const mw = {
  auth: t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return next({ ctx: { ...ctx, user: ctx.session.user } })
  }),
  verified: t.middleware(({ ctx, next }) => {
    if (!ctx.user?.emailVerified)
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Email not verified' })
    return next()
  }),
  pro: t.middleware(({ ctx, next }) => {
    if (!['pro','enterprise'].includes(ctx.user?.plan ?? ''))
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Pro plan required' })
    return next()
  }),
  admin: t.middleware(({ ctx, next }) => {
    if (ctx.user?.role !== 'admin')
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' })
    return next()
  }),
}

export const publicProcedure    = t.procedure
export const protectedProcedure = t.procedure.use(mw.auth)
export const verifiedProcedure  = t.procedure.use(mw.auth).use(mw.verified)
export const proProcedure       = t.procedure.use(mw.auth).use(mw.verified).use(mw.pro)
export const adminProcedure     = t.procedure.use(mw.auth).use(mw.admin)

// Demo router
export const demoRouter = createTRPCRouter({
  publicHello:    publicProcedure.query(() => 'Hello, world'),
  protectedHello: protectedProcedure.query(({ ctx }) => `Hello, ${ctx.user.name}`),
  verifiedHello:  verifiedProcedure.query(({ ctx }) => `Verified: ${ctx.user.email}`),
  proFeature:     proProcedure.query(({ ctx }) => `Pro feature for ${ctx.user.plan}`),
  adminDashboard: adminProcedure.query(() => 'Admin only data'),
})
```

---

---
