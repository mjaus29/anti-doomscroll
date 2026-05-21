# 6 — Context — createTRPCContext, Request Data

---

## T — TL;DR

Context is the object passed to every procedure handler as `ctx`. It carries per-request data: the database client, the current session, the request object. `createTRPCContext` is called once per request by the HTTP adapter. It's where you read the session cookie, inject Prisma, and build the typed context object that all procedures share.

---

## K — Key Concepts

```typescript
// ── src/server/context.ts — context factory ───────────────────────────────
import { auth }   from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Session, User } from '@/lib/auth'

interface CreateContextOptions {
  headers: Headers
}

export async function createTRPCContext({ headers }: CreateContextOptions) {
  // Read session from cookie (BetterAuth reads from headers)
  const session = await auth.api.getSession({ headers })

  return {
    prisma,
    session,   // null if not authenticated
    // Convenience: user from session (null if not authenticated)
    user: session?.user ?? null,
  }
}

// Export the context type — used in initTRPC.context<Context>()
export type Context = Awaited<ReturnType<typeof createTRPCContext>>
// Context = {
//   prisma:  PrismaClient
//   session: Session | null
//   user:    User | null
// }
```

```typescript
// ── src/app/api/trpc/[trpc]/route.ts — wire context into handler ──────────
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'
import { NextRequest }         from 'next/server'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router:       appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: process.env.NODE_ENV === 'development'
      ? ({ path, error }) => console.error(`[tRPC] Error on ${path ?? '?'}:`, error)
      : undefined,
  })

export { handler as GET, handler as POST }
```

```typescript
// ── Context in procedures — accessing ctx ─────────────────────────────────
const userRouter = createTRPCRouter({
  // Public procedure — ctx.session may be null
  list: publicProcedure
    .query(({ ctx }) => ctx.prisma.user.findMany()),
    //          ^^^
    //   ctx.prisma:  PrismaClient  ✅
    //   ctx.session: Session | null

  // Protected procedure — ctx.user is guaranteed non-null (by middleware)
  me: protectedProcedure
    .query(({ ctx }) => {
      return ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        //              ^^^^ User (not null) — middleware enforced it ✅
      })
    }),
})
```

```typescript
// ── Extending context with request metadata ───────────────────────────────
export async function createTRPCContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers })

  return {
    prisma,
    session,
    user:      session?.user ?? null,
    // Additional request metadata useful for rate limiting, logging, audit
    requestIp: headers.get('x-forwarded-for') ?? headers.get('x-real-ip') ?? 'unknown',
    userAgent: headers.get('user-agent') ?? 'unknown',
  }
}
```

```typescript
// ── createCallerFactory — for Server Components and tests ──────────────────
// src/server/root.ts
import { createCallerFactory } from '@/server/trpc'
import { appRouter }           from './root'

export const createCaller = createCallerFactory(appRouter)

// Usage in Server Component:
import { createCaller }       from '@/server/root'
import { createTRPCContext }  from '@/server/context'
import { headers }            from 'next/headers'

async function DashboardPage() {
  const ctx    = await createTRPCContext({ headers: await headers() })
  const caller = createCaller(ctx)

  // Calls procedures directly — no HTTP, no serialisation
  const [posts, me] = await Promise.all([
    caller.post.list(),
    caller.user.me(),
  ])

  return <div>...</div>
}
```

---

## W — Why It Matters

- Context is the injection point for cross-cutting concerns — every procedure gets Prisma and the session without explicitly importing them. This keeps procedure handlers thin and testable.
- `createTRPCContext` runs once per HTTP request — not once per procedure. If a request calls a batch of 3 procedures (tRPC supports batching), context is created once and shared across all three. This means one session lookup per request, not three.
- The `createCaller` pattern for Server Components is more efficient than making HTTP requests to your own API — the procedure executes in the same Node.js process, with direct Prisma access, no network overhead, and no serialisation cost.

---

## I — Interview Q&A

### Q: Why is `createTRPCContext` async and what work happens there?

**A:** Context creation is async because it involves I/O — specifically, reading the session from the database. BetterAuth's `auth.api.getSession({ headers })` reads the session token from the cookie header, then queries the `session` table in PostgreSQL to validate it and retrieve the user. This is inherently async. The context factory is called once per request before any procedure executes. All procedures in that request share the same context object — if you call 3 procedures in one batch request, there is one `createTRPCContext` call and one session lookup, not three. This is why you put shared, per-request setup (session, request IP, feature flags) in context, not inside individual procedure handlers.

---

## C — Common Pitfalls + Fix

### ❌ Creating a new PrismaClient in context — connection pool exhaustion

```typescript
// ❌ New PrismaClient per request — hundreds of connections
export async function createTRPCContext() {
  const prisma = new PrismaClient()   // ← new pool every request ❌
  return { prisma }
}
```

**Fix:** Import the singleton:

```typescript
// ✅ Import the singleton — one pool for the entire process
import { prisma } from '@/lib/prisma'   // singleton from lib/prisma.ts

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const session = await auth.api.getSession({ headers })
  return { prisma, session, user: session?.user ?? null }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `createTRPCContext` that: (1) reads session via BetterAuth; (2) reads request IP for rate limiting; (3) adds a `db` shorthand for `prisma`; (4) adds a `isAdmin` boolean derived from session role. Export the `Context` type and show it being used in a procedure.

### Solution

```typescript
// src/server/context.ts
import { auth }   from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CreateContextOptions {
  headers: Headers
}

export async function createTRPCContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers })
  const user    = session?.user ?? null

  return {
    // Database
    db:      prisma,
    prisma,  // alias for compatibility

    // Auth
    session,
    user,
    isAdmin: user?.role === 'admin',

    // Request metadata
    ip:        headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               ?? headers.get('x-real-ip')
               ?? '127.0.0.1',
    userAgent: headers.get('user-agent') ?? 'unknown',
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// ── Usage in a procedure ──────────────────────────────────────────────────
// src/server/routers/admin.ts
const adminStatsRouter = createTRPCRouter({
  overview: adminProcedure.query(async ({ ctx }) => {
    // ctx.isAdmin is true (middleware enforced it)
    // ctx.db is PrismaClient
    // ctx.ip is the request IP
    console.log(`[admin] overview accessed from ${ctx.ip}`)

    const [userCount, postCount] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.post.count(),
    ])
    return { userCount, postCount }
  }),
})
```

---

---
