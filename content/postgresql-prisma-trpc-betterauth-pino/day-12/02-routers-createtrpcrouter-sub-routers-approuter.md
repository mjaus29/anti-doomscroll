# 2 — Routers — createTRPCRouter, Sub-Routers, appRouter

---

## T — TL;DR

A tRPC router is a named collection of procedures. `createTRPCRouter({ ... })` creates one. Routers nest — you compose sub-routers (one per domain) into a root `appRouter`. The `appRouter` is the single export that connects to the HTTP adapter. Its type is the `AppRouter` type the client imports.

---

## K — Key Concepts

```typescript
// ── src/server/trpc.ts — tRPC initialisation (shared utilities) ───────────
import { initTRPC } from '@trpc/server'
import { type Context } from './context'   // your context type (see Subtopic 6)
import superjson from 'superjson'
import { ZodError } from 'zod'

const t = initTRPC.context<Context>().create({
  transformer: superjson,   // handles Date, BigInt, Map, Set over JSON
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Attach Zod validation errors to the response for client use
        zodError: error.cause instanceof ZodError
          ? error.cause.flatten()
          : null,
      },
    }
  },
})

// Export the router factory and procedure builders
export const createTRPCRouter  = t.router
export const publicProcedure   = t.procedure
export const createCallerFactory = t.createCallerFactory
```

```typescript
// ── Sub-routers — one file per domain ────────────────────────────────────

// src/server/routers/user.ts
import { createTRPCRouter, publicProcedure } from '@/server/trpc'
import { z } from 'zod'

export const userRouter = createTRPCRouter({
  getById:  publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      ctx.prisma.user.findUniqueOrThrow({ where: { id: input.id } })
    ),

  list: publicProcedure
    .query(({ ctx }) => ctx.prisma.user.findMany({ take: 50 })),

  create: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.user.create({ data: input })
    ),
})

// src/server/routers/post.ts
import { createTRPCRouter, publicProcedure } from '@/server/trpc'
import { z } from 'zod'

export const postRouter = createTRPCRouter({
  list:   publicProcedure.query(({ ctx }) =>
    ctx.prisma.post.findMany({ orderBy: { createdAt: 'desc' } })
  ),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
    ),
})
```

```typescript
// ── src/server/root.ts — root router (appRouter) ─────────────────────────
import { createTRPCRouter } from '@/server/trpc'
import { userRouter }       from '@/server/routers/user'
import { postRouter }       from '@/server/routers/post'

export const appRouter = createTRPCRouter({
  user: userRouter,   // accessible as trpc.user.getById
  post: postRouter,   // accessible as trpc.post.list
})

// Export the type — this is ALL the client needs (no implementation)
export type AppRouter = typeof appRouter

// The router type encodes:
// appRouter.user.getById.input  → z.object({ id: z.number() })
// appRouter.user.getById.output → Promise<User>
// appRouter.post.list.output    → Promise<Post[]>
```

```typescript
// ── Nested sub-routers — deeper nesting ───────────────────────────────────
export const appRouter = createTRPCRouter({
  user:    userRouter,
  post:    postRouter,
  admin:   createTRPCRouter({
    stats:   adminStatsRouter,
    billing: adminBillingRouter,
  }),
})
// Access: trpc.admin.stats.getOverview.query()
// Access: trpc.admin.billing.listInvoices.query()
```

```typescript
// ── Router merging — alternative to nesting ───────────────────────────────
// Use mergeRouters when combining routers that are at the same level
import { mergeRouters } from '@trpc/server'

const combinedRouter = mergeRouters(userRouter, postRouter)
// Both routers' procedures are at the top level:
// trpc.getById, trpc.list, trpc.create (from userRouter + postRouter merged)
// Note: procedure name conflicts will error — use nesting to avoid
```

---

## W — Why It Matters

- One router per domain (user, post, order) keeps files focused and maintainable. The `appRouter` becomes the composition root — adding a new domain means adding one import and one line to `appRouter`.
- `export type AppRouter = typeof appRouter` is the only cross-boundary export — the client imports this type only. The actual Prisma client, auth logic, and database credentials never leave the server bundle.
- `superjson` as the transformer is critical for a Prisma backend — Prisma returns `Date` objects, `BigInt` values, and `Decimal` types. Plain `JSON.stringify` turns `Date` into a string and `BigInt` throws. `superjson` serializes them faithfully and deserializes them back on the client.

---

## I — Interview Q&A

### Q: What is the purpose of `initTRPC` and why is it called only once?

**A:** `initTRPC` initializes the tRPC instance with your context type and configuration (transformer, error formatter). It returns the `t` object containing `t.router`, `t.procedure`, `t.middleware`, and other builders. It must be called once per application because all procedures created from `t.procedure` share the same context type and configuration — mixing procedures from different `initTRPC` calls in the same router would cause type conflicts. The convention is to call `initTRPC.context<Context>().create({ ... })` in a single `src/server/trpc.ts` file and export `createTRPCRouter` and `publicProcedure` from that file. All router files import these shared builders.

---

## C — Common Pitfalls + Fix

### ❌ Calling `initTRPC` in multiple files — context type mismatch

```typescript
// ❌ initTRPC called in user.ts AND post.ts — different instances
// user.ts
const t1 = initTRPC.context<Context>().create()
const userProcedure = t1.procedure

// post.ts
const t2 = initTRPC.context<Context>().create()
const postProcedure = t2.procedure
// Mixing t1.procedure and t2.procedure in the same router → type errors ❌
```

**Fix:** Single `trpc.ts` — export shared builders:

```typescript
// ✅ src/server/trpc.ts — one initTRPC call
const t = initTRPC.context<Context>().create({ transformer: superjson })
export const createTRPCRouter = t.router
export const publicProcedure  = t.procedure
// All router files import from here — one source of truth ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create the full router file structure for a task management app: a `taskRouter` with `list`, `getById`, `create`, `update`, `delete` procedure stubs (no logic yet — just the names); a `workspaceRouter` with `list` and `getById`; and a root `appRouter` that composes both. Export `AppRouter`.

### Solution

```typescript
// src/server/trpc.ts
import { initTRPC }  from '@trpc/server'
import { type Context } from './context'
import superjson from 'superjson'

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const createTRPCRouter   = t.router
export const publicProcedure    = t.procedure
export const createCallerFactory = t.createCallerFactory

// src/server/routers/task.ts
import { createTRPCRouter, publicProcedure } from '@/server/trpc'
import { z } from 'zod'

export const taskRouter = createTRPCRouter({
  list:    publicProcedure.query(() => 'list tasks stub'),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(() => 'getById stub'),
  create:  publicProcedure
    .input(z.object({ title: z.string(), projectId: z.number() }))
    .mutation(() => 'create stub'),
  update:  publicProcedure
    .input(z.object({ id: z.number(), title: z.string().optional() }))
    .mutation(() => 'update stub'),
  delete:  publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(() => 'delete stub'),
})

// src/server/routers/workspace.ts
import { createTRPCRouter, publicProcedure } from '@/server/trpc'
import { z } from 'zod'

export const workspaceRouter = createTRPCRouter({
  list:    publicProcedure.query(() => 'list workspaces stub'),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(() => 'getById workspace stub'),
})

// src/server/root.ts
import { createTRPCRouter } from '@/server/trpc'
import { taskRouter }       from '@/server/routers/task'
import { workspaceRouter }  from '@/server/routers/workspace'

export const appRouter = createTRPCRouter({
  task:      taskRouter,
  workspace: workspaceRouter,
})

export type AppRouter = typeof appRouter
```

---

---
