
# 📅 Day 12 — tRPC Fundamentals

> **Goal:** Build end-to-end type-safe APIs with tRPC — define routers, queries, mutations, context, and validators, wire up the client, and understand how TypeScript types flow from server to client with zero codegen.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** tRPC v11 · Zod 4 · Next.js 16 App Router · TypeScript 6 · Prisma 7

---

## 📋 Day 12 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | What Is tRPC and How It Fits | 8 min |
| 2 | Routers — createTRPCRouter, Sub-Routers, appRouter | 12 min |
| 3 | Procedures — publicProcedure and the Procedure Builder | 10 min |
| 4 | Queries — Defining and Calling | 12 min |
| 5 | Mutations — Defining and Calling | 12 min |
| 6 | Context — createTRPCContext, Request Data | 12 min |
| 7 | Input Validators — Zod Integration | 12 min |
| 8 | Output Validators — Return Type Safety | 10 min |
| 9 | Type Inference — Types Across Client and Server | 10 min |
| 10 | Client Setup — createTRPCClient, Next.js App Router | 12 min |

---

---

# 1 — What Is tRPC and How It Fits

---

## T — TL;DR

tRPC lets you call server functions from the client as if they were local functions — with full TypeScript autocomplete and type safety, no REST endpoints, no OpenAPI spec, no codegen. The server exports a router type; the client imports that type. Types flow end-to-end at compile time.

---

## K — Key Concepts

```
── The core problem tRPC solves ─────────────────────────────────────────────

  REST / GraphQL:
    Server defines an API → you write types manually (or generate from schema)
    Type drift: API changes but client types are stale → runtime errors
    Overhead: OpenAPI spec, codegen, schema files, resolvers, HTTP verbs

  tRPC:
    Server function return type IS the client type — same TypeScript program
    Change a server function → TypeScript immediately errors on the client
    No codegen step, no schema files, no REST conventions to follow
    Calls look like: trpc.user.getById.query({ id: 1 })  ← just a function call
```

```typescript
// ── How tRPC works — the 4 moving parts ──────────────────────────────────

// 1. SERVER: define procedures (functions) in a router
//    src/server/routers/user.ts
const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => prisma.user.findUniqueOrThrow({ where: { id: input.id } }))
})

// 2. SERVER: export the AppRouter type (not the implementation — just the type)
export type AppRouter = typeof appRouter

// 3. CLIENT: import the type and create a typed client
const trpc = createTRPCClient<AppRouter>({ ... })

// 4. CLIENT: call procedures like async functions — fully typed
const user = await trpc.user.getById.query({ id: 1 })
//    ^^^^ TypeScript knows: user is the return type of getById ✅
//    trpc.user.getById.query({ id: 'oops' }) → TS error: expected number ✅
```

```
── Where tRPC sits in the stack ─────────────────────────────────────────────

  Browser (React)
    ↕  trpc.user.getById.query({ id: 1 })
  Next.js Route Handler  (/api/trpc/[trpc]/route.ts)
    ↕
  tRPC HTTP Adapter
    ↕
  appRouter (your procedures)
    ↕
  Context (auth session, prisma)
    ↕
  Prisma → PostgreSQL

── tRPC vs REST vs GraphQL ──────────────────────────────────────────────────

  REST:        URL-based, manual types, good for public APIs
  GraphQL:     schema-based, codegen needed, good for flexible queries
  tRPC:        type-safe RPC, zero codegen, best for full-stack TS monorepos

── When NOT to use tRPC ─────────────────────────────────────────────────────
  ❌ Public API consumed by non-TS clients (mobile apps, third parties)
  ❌ Projects with separate frontend and backend repos (type sharing is harder)
  ✅ Full-stack TypeScript monorepo (Next.js app + Prisma backend in one repo)
```

```bash
# ── Installation ──────────────────────────────────────────────────────────
npm install @trpc/server@^11 @trpc/client@^11 @trpc/react-query@^11
npm install @tanstack/react-query@^5
npm install zod@^4
# @trpc/next is not needed for App Router — use @trpc/server directly
```

---

## W — Why It Matters

- Type safety across the network boundary is the killer feature — every time you change a server function's return type or input shape, TypeScript immediately shows errors in every client call site. This eliminates an entire class of bugs that normally only surface at runtime.
- No codegen means no sync step — there's no `npm run generate:types` to forget before a PR. The types are always up to date because they come directly from the TypeScript compiler.
- tRPC works over HTTP — it's not a WebSocket or custom protocol. Procedures are called via `POST` (mutations) or `GET`/`POST` (queries). You can inspect calls in DevTools like any HTTP request.

---

## I — Interview Q&A

### Q: How does tRPC achieve end-to-end type safety without code generation?

**A:** tRPC uses TypeScript's type inference system directly. The server defines procedures that return typed values — the return type is inferred by TypeScript from the function body. The `AppRouter` type (exported as `typeof appRouter`) is a TypeScript type that encodes the shape of every router, procedure, input, and output. The client imports only this type — not the implementation. `createTRPCClient<AppRouter>` creates a client whose method signatures exactly match the server's procedures, inferred through TypeScript's type system at compile time. No codegen runs — TypeScript resolves the types during compilation. If you change a procedure's input or output, TypeScript propagates the type change to all call sites immediately.

---

## C — Common Pitfalls + Fix

### ❌ Importing server implementation into the client bundle

```typescript
// ❌ Importing the actual router (not just the type) into a client component
import { appRouter } from '@/server/root'   // ← imports Prisma, bcrypt, server secrets!
// This bundles server code into the browser ❌
```

**Fix:** Import only the `type`:

```typescript
// ✅ Type-only import — zero runtime cost, no server code in browser
import type { AppRouter } from '@/server/root'
const trpc = createTRPCClient<AppRouter>({ ... })
```

---

## K — Coding Challenge + Solution

### Challenge

Draw (in comments) the complete request flow for `trpc.post.getById.query({ id: 5 })` called from a React component: from the client call, through HTTP, to the route handler, through the tRPC adapter, to the procedure, to Prisma, and back with types.

### Solution

```typescript
/*
  tRPC request flow: trpc.post.getById.query({ id: 5 })

  1. React component
     const { data } = trpc.post.getById.useQuery({ id: 5 })
     TypeScript knows: data is Post | undefined  (inferred from procedure return type)

  2. @trpc/react-query
     Serializes to: GET /api/trpc/post.getById?input={"id":5}
     (or POST depending on config — GET for queries with superjson)

  3. Next.js Route Handler
     src/app/api/trpc/[trpc]/route.ts
     Receives the request → passes to fetchRequestHandler

  4. tRPC HTTP Adapter (fetchRequestHandler)
     Parses "post.getById" → finds the procedure in appRouter.post.getById
     Deserializes input: { id: 5 }
     Calls createTRPCContext(req) to build context: { session, prisma, ... }

  5. Procedure execution
     Input validated by Zod: z.object({ id: z.number() }) → { id: 5 } ✅
     Handler called: ({ input, ctx }) => ctx.prisma.post.findUniqueOrThrow({ where: { id: 5 } })

  6. Prisma → PostgreSQL
     SELECT * FROM posts WHERE id = 5

  7. Response
     Serialized via superjson (handles Date, BigInt etc.)
     HTTP 200: { result: { data: { id: 5, title: '...', createdAt: Date } } }

  8. React component
     data is typed as Post — session.user.role, data.title are autocompleted ✅
     Loading: data === undefined, isPending: true
     Error: error is TRPCClientError with typed message
*/
```

---

---

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

# 4 — Queries — Defining and Calling

---

## T — TL;DR

Queries are read operations — they use `.query(handler)` on the server and `.useQuery()` (React) or `.query()` (vanilla) on the client. Queries are called with HTTP GET (or POST with superjson). They are cacheable, refetchable, and automatically integrated with TanStack Query for loading/error/data states.

---

## K — Key Concepts

```typescript
// ── Defining a query on the server ───────────────────────────────────────
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/trpc'
import { z } from 'zod'

export const postRouter = createTRPCRouter({
  // Query with no input
  list: publicProcedure
    .query(({ ctx }) =>
      ctx.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take:    20,
        select:  { id: true, title: true, createdAt: true },
      })
    ),
  // Return type inferred: Promise<{ id: number; title: string; createdAt: Date }[]>

  // Query with validated input
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findUnique({ where: { id: input.id } })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      return post
    }),
  // Return type: Promise<Post>

  // Protected query — user sees only their own posts
  myPosts: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.post.findMany({
        where: { authorId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
      })
    ),
})
```

```typescript
// ── Calling queries from a React component — useQuery ─────────────────────
'use client'
import { trpc } from '@/lib/trpc/client'

function PostList() {
  // useQuery — subscribes to the query, returns { data, isPending, error, refetch }
  const { data: posts, isPending, error } = trpc.post.list.useQuery()
  // data: { id: number; title: string; createdAt: Date }[] | undefined
  // TypeScript infers the type from the server procedure ✅

  if (isPending) return <div>Loading…</div>
  if (error)     return <div>Error: {error.message}</div>

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

// useQuery with input — input is part of the cache key
function PostDetail({ id }: { id: number }) {
  const { data: post } = trpc.post.getById.useQuery({ id })
  // TS error if input doesn't match: z.object({ id: z.number().int().positive() }) ✅
  return post ? <h1>{post.title}</h1> : null
}
```

```typescript
// ── useQuery options — TanStack Query options ─────────────────────────────
const { data } = trpc.post.list.useQuery(
  undefined,     // input (undefined for no-input queries)
  {
    enabled:         !!userId,         // only fetch if userId is truthy
    staleTime:       1000 * 60 * 5,   // consider fresh for 5 minutes
    gcTime:          1000 * 60 * 10,  // keep in cache for 10 minutes
    refetchInterval: 1000 * 30,        // refetch every 30 seconds
    retry:           2,                // retry failed queries 2 times
    select:          posts => posts.filter(p => p.published),  // transform data
  }
)
```

```typescript
// ── Calling queries imperatively — vanilla client or server component ──────
// In a Server Component (no hooks):
import { createCaller } from '@/server/root'
import { createTRPCContext } from '@/server/context'
import { headers } from 'next/headers'

async function ServerPostList() {
  const ctx    = await createTRPCContext({ headers: await headers() })
  const caller = createCaller(ctx)
  const posts  = await caller.post.list()
  // posts is typed as the return type of post.list ✅

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

```typescript
// ── Prefetching — for Server Component + Client Component hybrid ──────────
// src/app/posts/page.tsx (Server Component)
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createCaller }                  from '@/server/root'
import { createTRPCContext }             from '@/server/context'
import { headers }                       from 'next/headers'

export default async function PostsPage() {
  const ctx       = await createTRPCContext({ headers: await headers() })
  const caller    = createCaller(ctx)
  await caller.post.list()   // prefetch — data goes into query cache on server

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostListClient />  {/* client component reads from pre-populated cache */}
    </HydrationBoundary>
  )
}
```

---

## W — Why It Matters

- `useQuery` integrates with TanStack Query — you get automatic caching, background refetching, loading states, and error boundaries for free. The cache key is derived from the procedure path + input, so `trpc.post.getById.useQuery({ id: 1 })` and `trpc.post.getById.useQuery({ id: 2 })` are separate cache entries.
- Server Component + `createCaller` lets you call tRPC procedures directly in Server Components without HTTP — the procedure runs in-process, with full context (session, Prisma). No network round trip for server-rendered pages.
- The `enabled` option gates the query on a condition — `enabled: !!userId` prevents a query from firing when `userId` is undefined (e.g. before auth loads). Without it, you'd get an error from the server because the input doesn't match.

---

## I — Interview Q&A

### Q: What is the difference between calling a tRPC query from a Server Component vs a Client Component?

**A:** In a Client Component, you use `trpc.post.list.useQuery()` — this makes an HTTP request to the tRPC route handler, uses TanStack Query for caching and state management, and returns reactive `{ data, isPending, error }`. The client communicates over the network even though the server is in the same Next.js app. In a Server Component, you use `createCaller(ctx)` to get a direct function caller — the procedure executes in-process with no HTTP overhead, no network latency, and no TanStack Query involvement. The result is just a typed Promise. Use Server Components for initial page data (faster, no loading flash), and Client Components for interactive queries (refetching, polling, user-triggered fetches).

---

## C — Common Pitfalls + Fix

### ❌ Calling `useQuery` with a potentially undefined input — query fires with invalid input

```typescript
// ❌ id might be undefined on first render — query fires with undefined
const { data } = trpc.post.getById.useQuery({ id: router.query.id as number })
// Sends { id: undefined } → Zod validation fails → error state ❌
```

**Fix:** Use the `enabled` option to gate the query:

```typescript
// ✅ Only fires when id is a valid number
const id = typeof router.query.id === 'string' ? Number(router.query.id) : undefined

const { data } = trpc.post.getById.useQuery(
  { id: id! },
  { enabled: id !== undefined && !isNaN(id) }
)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `taskRouter` with: (1) a `list` query that takes optional `projectId` and `status` filters; (2) a `getById` query with error handling for not found; (3) a `myTasks` protected query that returns tasks for the current user. Show the React component calling all three queries.

### Solution

```typescript
// src/server/routers/task.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z }         from 'zod'

export const taskRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status:    z.enum(['todo', 'in_progress', 'done']).optional(),
    }).optional())
    .query(({ input, ctx }) =>
      ctx.prisma.task.findMany({
        where: {
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          ...(input?.status    ? { status:    input.status    } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take:    50,
      })
    ),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const task = await ctx.prisma.task.findUnique({ where: { id: input.id } })
      if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: `Task ${input.id} not found` })
      return task
    }),

  myTasks: protectedProcedure
    .input(z.object({ status: z.enum(['todo','in_progress','done']).optional() }).optional())
    .query(({ input, ctx }) =>
      ctx.prisma.task.findMany({
        where: {
          assigneeId: ctx.user.id,
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { dueDate: 'asc' },
      })
    ),
})

// ── React component ────────────────────────────────────────────────────────
'use client'
import { trpc } from '@/lib/trpc/client'

export function TaskDashboard({ projectId, userId }: { projectId?: number; userId?: string }) {
  const { data: allTasks }   = trpc.task.list.useQuery({ projectId, status: 'todo' })
  const { data: task }       = trpc.task.getById.useQuery(
    { id: 1 },
    { enabled: true }
  )
  const { data: myTasks }    = trpc.task.myTasks.useQuery({ status: 'in_progress' })

  return (
    <div>
      <h2>Todo ({allTasks?.length ?? 0})</h2>
      <h2>Task #1: {task?.title}</h2>
      <h2>My in-progress ({myTasks?.length ?? 0})</h2>
    </div>
  )
}
```

---

---

# 5 — Mutations — Defining and Calling

---

## T — TL;DR

Mutations are write operations — create, update, delete. They use `.mutation(handler)` on the server and `useMutation()` on the client. Unlike queries, mutations don't run automatically — the client calls `mutate()` or `mutateAsync()` imperatively. After a mutation, you typically invalidate related queries so the UI reflects the change.

---

## K — Key Concepts

```typescript
// ── Defining mutations on the server ──────────────────────────────────────
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z }         from 'zod'

export const postRouter = createTRPCRouter({
  // Create
  create: protectedProcedure
    .input(z.object({
      title:   z.string().min(1).max(200),
      body:    z.string().min(1),
      published: z.boolean().default(false),
    }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.post.create({
        data: { ...input, authorId: ctx.user.id },
      })
    ),
  // Return type: Promise<Post>

  // Update — only owner can update
  update: protectedProcedure
    .input(z.object({
      id:        z.number().int().positive(),
      title:     z.string().min(1).max(200).optional(),
      body:      z.string().optional(),
      published: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input

      // Ownership check
      const post = await ctx.prisma.post.findUnique({ where: { id } })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      if (post.authorId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      return ctx.prisma.post.update({ where: { id }, data })
    }),

  // Delete
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findUnique({ where: { id: input.id } })
      if (!post)                       throw new TRPCError({ code: 'NOT_FOUND' })
      if (post.authorId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.post.delete({ where: { id: input.id } })
      return { success: true, id: input.id }
    }),
})
```

```typescript
// ── Calling mutations from React — useMutation ─────────────────────────────
'use client'
import { trpc }     from '@/lib/trpc/client'
import { useState } from 'react'

function CreatePostForm() {
  const utils = trpc.useUtils()   // access to query cache utilities

  const createPost = trpc.post.create.useMutation({
    onSuccess: (newPost) => {
      // Invalidate the post list so it refetches with the new post
      void utils.post.list.invalidate()
      console.log('Created:', newPost.id)
    },
    onError: (err) => {
      console.error('Failed:', err.message)
      // err.data?.zodError?.fieldErrors → Zod validation errors per field
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createPost.mutate({
      title:   fd.get('title') as string,
      body:    fd.get('body') as string,
      published: false,
    })
    // TypeScript error if input doesn't match the schema ✅
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="body" required />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating…' : 'Create Post'}
      </button>
      {createPost.error && <p>{createPost.error.message}</p>}
    </form>
  )
}
```

```typescript
// ── mutate vs mutateAsync ──────────────────────────────────────────────────
// mutate: fire-and-forget, errors handled via onError callback
createPost.mutate({ title: 'Hello', body: 'World' })

// mutateAsync: returns a Promise, use with try/catch or async/await
try {
  const newPost = await createPost.mutateAsync({ title: 'Hello', body: 'World' })
  console.log(newPost.id)   // typed as Post ✅
} catch (err) {
  // err is TRPCClientError
}

// ── Optimistic updates ─────────────────────────────────────────────────────
const deletePost = trpc.post.delete.useMutation({
  onMutate: async ({ id }) => {
    // Cancel any outgoing refetches
    await utils.post.list.cancel()
    // Snapshot the current value
    const previousPosts = utils.post.list.getData()
    // Optimistically remove the post
    utils.post.list.setData(undefined, old => old?.filter(p => p.id !== id))
    return { previousPosts }
  },
  onError: (_err, _input, context) => {
    // Rollback on error
    utils.post.list.setData(undefined, context?.previousPosts)
  },
  onSettled: () => {
    // Refetch regardless of success/error
    void utils.post.list.invalidate()
  },
})
```

```typescript
// ── useMutation state ──────────────────────────────────────────────────────
const mutation = trpc.post.create.useMutation()

mutation.isPending   // true while the request is in flight
mutation.isSuccess   // true after successful response
mutation.isError     // true after error response
mutation.isIdle      // true before first call and after reset
mutation.data        // the returned data (if successful)
mutation.error       // the error (if failed) — TRPCClientError
mutation.reset()     // reset to idle state
```

---

## W — Why It Matters

- `utils.post.list.invalidate()` after a mutation is the correct cache management pattern — it marks the query as stale and triggers a background refetch. Without invalidation, the UI shows stale data after a mutation.
- Optimistic updates make the UI feel instant — you update the local cache immediately, then confirm with the server. On error, you roll back. This pattern is built into TanStack Query and works seamlessly with tRPC's `useUtils()`.
- Ownership checks (verifying `post.authorId === ctx.user.id` before update/delete) must be server-side — never trust the client to enforce who owns a resource. The `protectedProcedure` ensures the user is authenticated; the ownership check ensures they can only modify their own data.

---

## I — Interview Q&A

### Q: How do you keep the UI in sync after a tRPC mutation?

**A:** There are three strategies. The simplest is `invalidate`: after a mutation succeeds, call `utils.post.list.invalidate()` which marks the cached query as stale and triggers a background refetch. The UI updates when the fresh data arrives. The second is `setData`: manually update the cache with the returned mutation data without a network round trip — good when the API returns the updated entity. The third is optimistic updates: immediately update the local cache before the server responds, providing instant feedback, and roll back on error. Most mutations use `invalidate` for simplicity. Optimistic updates are worth the complexity for latency-sensitive interactions like toggling a checkbox or deleting a list item.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to invalidate after mutation — stale UI

```typescript
// ❌ Post created on server but list still shows old data
const createPost = trpc.post.create.useMutation({
  onSuccess: () => {
    router.push('/posts')   // navigates but cache is stale ❌
  },
})
```

**Fix:** Invalidate related queries:

```typescript
// ✅ Invalidate after success — triggers refetch
const utils = trpc.useUtils()

const createPost = trpc.post.create.useMutation({
  onSuccess: async () => {
    await utils.post.list.invalidate()   // wait for invalidation ✅
    router.push('/posts')
  },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `toggleTaskComplete` mutation: (1) takes `{ id, completed }` input; (2) verifies ownership (`task.assigneeId === ctx.user.id`); (3) updates `completedAt` to `now()` if `completed: true`, `null` if `false`; (4) returns the updated task. Show the React component with optimistic UI (checkbox that updates instantly).

### Solution

```typescript
// Server: taskRouter addition
toggleComplete: protectedProcedure
  .input(z.object({
    id:        z.number().int().positive(),
    completed: z.boolean(),
  }))
  .mutation(async ({ input, ctx }) => {
    const task = await ctx.prisma.task.findUnique({ where: { id: input.id } })
    if (!task)                           throw new TRPCError({ code: 'NOT_FOUND' })
    if (task.assigneeId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })

    return ctx.prisma.task.update({
      where: { id: input.id },
      data:  { completedAt: input.completed ? new Date() : null },
    })
  }),

// Client: optimistic checkbox component
'use client'
import { trpc } from '@/lib/trpc/client'

export function TaskCheckbox({ task }: { task: { id: number; title: string; completedAt: Date | null } }) {
  const utils  = trpc.useUtils()

  const toggle = trpc.task.toggleComplete.useMutation({
    onMutate: async ({ id, completed }) => {
      await utils.task.myTasks.cancel()
      const previous = utils.task.myTasks.getData()
      utils.task.myTasks.setData(undefined, old =>
        old?.map(t => t.id === id ? { ...t, completedAt: completed ? new Date() : null } : t)
      )
      return { previous }
    },
    onError: (_err, _input, context) => {
      utils.task.myTasks.setData(undefined, context?.previous)
    },
    onSettled: () => { void utils.task.myTasks.invalidate() },
  })

  const isCompleted = task.completedAt !== null

  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={e => toggle.mutate({ id: task.id, completed: e.target.checked })}
        disabled={toggle.isPending}
      />
      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
        {task.title}
      </span>
    </label>
  )
}
```

---

---

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

# 7 — Input Validators — Zod Integration

---

## T — TL;DR

`.input(zodSchema)` validates and types the input for a procedure. Zod parses the raw client input before the handler runs — invalid input throws a `BAD_REQUEST` error with field-level details automatically. The parsed, typed input is available as `input` in the handler. No manual validation code needed.

---

## K — Key Concepts

```typescript
// ── Basic input validation ────────────────────────────────────────────────
import { z } from 'zod'

const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title:     z.string().min(1, 'Title required').max(200, 'Title too long'),
      body:      z.string().min(1, 'Body required'),
      published: z.boolean().default(false),
      tags:      z.array(z.string()).max(10).optional(),
    }))
    .mutation(({ input, ctx }) => {
      // input is typed:
      // { title: string; body: string; published: boolean; tags?: string[] | undefined }
      return ctx.prisma.post.create({ data: { ...input, authorId: ctx.user.id } })
    }),
})
```

```typescript
// ── Zod schema patterns for tRPC input ────────────────────────────────────

// Pagination input — reusable
const paginationInput = z.object({
  cursor:   z.number().optional(),          // cursor ID for pagination
  limit:    z.number().min(1).max(100).default(20),
})

// ID input — reusable
const idInput = z.object({
  id: z.number().int().positive(),
})

// Date range input
const dateRangeInput = z.object({
  from: z.date().optional(),
  to:   z.date().optional(),
}).refine(
  d => !d.from || !d.to || d.from <= d.to,
  { message: 'from must be before to', path: ['from'] }
)

// Enum input
const statusInput = z.object({
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
})

// Usage in router:
const taskRouter = createTRPCRouter({
  list: publicProcedure
    .input(paginationInput.merge(z.object({ projectId: z.number().optional() })))
    .query(({ input, ctx }) =>
      ctx.prisma.task.findMany({
        take:    input.limit,
        cursor:  input.cursor ? { id: input.cursor } : undefined,
        where:   { projectId: input.projectId },
        orderBy: { id: 'asc' },
      })
    ),
})
```

```typescript
// ── Accessing Zod errors on the client ────────────────────────────────────
'use client'
import { trpc } from '@/lib/trpc/client'

const createPost = trpc.post.create.useMutation({
  onError: (err) => {
    // Flat field errors from Zod (configured in errorFormatter)
    const fieldErrors = err.data?.zodError?.fieldErrors
    // fieldErrors: { title?: string[], body?: string[], ... }

    if (fieldErrors?.title) {
      setTitleError(fieldErrors.title[0])   // "Title too long"
    }
    if (fieldErrors?.body) {
      setBodyError(fieldErrors.body[0])
    }
  },
})

// ── Type narrowing — check if error is a Zod error ───────────────────────
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'

function isZodError(err: unknown): err is TRPCClientError<AppRouter> {
  return err instanceof TRPCClientError && err.data?.zodError !== null
}
```

```typescript
// ── Input transformations — transform before validation ───────────────────
const router = createTRPCRouter({
  search: publicProcedure
    .input(z.object({
      q:     z.string().trim().toLowerCase().min(1),  // trim + lowercase
      page:  z.coerce.number().int().min(1).default(1),  // coerce string to number
      tags:  z.string().transform(s => s.split(',')).optional(),  // "a,b" → ["a","b"]
    }))
    .query(({ input }) => {
      // input.q is trimmed and lowercased ✅
      // input.page is a number (coerced) ✅
      // input.tags is string[] | undefined ✅
    }),
})
```

```typescript
// ── Sharing schemas between client and server ─────────────────────────────
// src/lib/schemas/post.ts — shared Zod schemas
import { z } from 'zod'

export const createPostSchema = z.object({
  title:     z.string().min(1).max(200),
  body:      z.string().min(1),
  published: z.boolean().default(false),
})

export type CreatePostInput = z.infer<typeof createPostSchema>

// Server: use in procedure
// .input(createPostSchema)

// Client: use in form validation
// const parsed = createPostSchema.safeParse(formData)
// Same schema, same validation, one source of truth ✅
```

---

## W — Why It Matters

- Zod validation runs before the handler — if input is invalid, the handler never executes and the client gets a typed `BAD_REQUEST` error with field-level details. No `if (!input.title)` guards needed inside handlers.
- Sharing Zod schemas between client and server is the key pattern — define the schema once in `src/lib/schemas/`, import it in the tRPC procedure AND in the client-side form validation. The user gets the same validation message whether checking on submit or on the server.
- `.input()` types the handler's `input` parameter — you get autocomplete on `input.title`, `input.body`, etc. TypeScript errors if you access a field that isn't in the schema. This is the type-safe half; Zod is the runtime-safe half.

---

## I — Interview Q&A

### Q: What happens when a tRPC procedure receives invalid input, and how does the error reach the client?

**A:** When a client calls a procedure with invalid input, tRPC calls Zod's `.parse()` on the raw input before invoking the handler. If Zod throws a `ZodError`, tRPC catches it and converts it into a `TRPCError` with code `BAD_REQUEST`. The `errorFormatter` function (configured in `initTRPC`) can attach the Zod error's flattened field errors to the response — `error.data.zodError.fieldErrors` — giving the client field-level validation messages. On the client, `useMutation`'s `onError` callback receives the `TRPCClientError` with `err.data?.zodError?.fieldErrors` containing an object mapping field names to error message arrays. The handler never executes when input validation fails.

---

## C — Common Pitfalls + Fix

### ❌ Using `.optional()` for required fields "to be flexible" — breaks runtime safety

```typescript
// ❌ title is optional — but the DB requires it (NOT NULL)
.input(z.object({
  title: z.string().optional(),   // undefined passes Zod but fails DB insert ❌
}))
.mutation(({ input }) =>
  ctx.prisma.post.create({ data: { title: input.title! } })  // runtime crash if undefined
)
```

**Fix:** Match Zod schema to actual constraints:

```typescript
// ✅ Required at schema level — matches NOT NULL in DB
.input(z.object({
  title: z.string().min(1, 'Title is required'),  // required ✅
}))
// Now TypeScript knows input.title is string (not string | undefined)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a shared `createTaskSchema` in `src/lib/schemas/task.ts` with: `title` (required, 1–200 chars), `description` (optional, max 2000), `priority` (enum: low/medium/high/critical, default medium), `dueDate` (optional ISO date string coerced to Date, must be in the future), `projectId` (positive int). Use it in a `createTask` protected mutation AND show it being used for client-side form validation.

### Solution

```typescript
// src/lib/schemas/task.ts
import { z } from 'zod'

export const createTaskSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate:     z.string()
    .datetime({ message: 'Invalid date format' })
    .transform(s => new Date(s))
    .refine(d => d > new Date(), { message: 'Due date must be in the future' })
    .optional(),
  projectId:   z.number().int().positive(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

// src/server/routers/task.ts
import { createTaskSchema } from '@/lib/schemas/task'

const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(({ input, ctx }) =>
      ctx.prisma.task.create({
        data: { ...input, createdById: ctx.user.id },
      })
    ),
})

// src/app/tasks/new/page.tsx — client-side validation with same schema
'use client'
import { createTaskSchema, type CreateTaskInput } from '@/lib/schemas/task'
import { trpc }   from '@/lib/trpc/client'
import { useState } from 'react'

export default function NewTaskPage() {
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTaskInput, string>>>({})
  const utils = trpc.useUtils()

  const create = trpc.task.create.useMutation({
    onSuccess: () => { void utils.task.list.invalidate() },
    onError:   (err) => {
      const fe = err.data?.zodError?.fieldErrors
      setErrors({
        title:    fe?.title?.[0],
        priority: fe?.priority?.[0],
        dueDate:  fe?.dueDate?.[0],
      })
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    const fd = new FormData(e.currentTarget)

    // Client-side Zod validation with same schema — same error messages
    const parsed = createTaskSchema.safeParse({
      title:     fd.get('title'),
      priority:  fd.get('priority'),
      dueDate:   fd.get('dueDate') || undefined,
      projectId: Number(fd.get('projectId')),
    })

    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setErrors({ title: fe.title?.[0], priority: fe.priority?.[0] })
      return
    }

    create.mutate(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title"     placeholder="Task title" />
      {errors.title && <span>{errors.title}</span>}
      <select name="priority">
        {['low','medium','high','critical'].map(p => <option key={p}>{p}</option>)}
      </select>
      <input name="dueDate"   type="datetime-local" />
      <input name="projectId" type="number" />
      <button type="submit" disabled={create.isPending}>Create Task</button>
    </form>
  )
}
```

---

---

# 8 — Output Validators — Return Type Safety

---

## T — TL;DR

`.output(zodSchema)` validates what the procedure returns. It's optional — without it, the return type is inferred from TypeScript. Use `.output()` to strip sensitive fields from responses, enforce a contract when the handler could return different shapes, or document the API surface explicitly.

---

## K — Key Concepts

```typescript
// ── Output validation — strip sensitive fields ─────────────────────────────
import { z } from 'zod'

const publicUserSchema = z.object({
  id:       z.number(),
  name:     z.string(),
  username: z.string().nullable(),
  image:    z.string().nullable(),
  // NO: email, role, plan, createdAt — not exposed publicly
})

const postRouter = createTRPCRouter({
  getAuthor: publicProcedure
    .input(z.object({ id: z.number() }))
    .output(publicUserSchema)   // ← strip: email, role, plan not returned ✅
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: input.id } })
      return user  // Zod strips fields not in publicUserSchema
      // Even if prisma returns email/role, .output() removes them before sending
    }),
})
// Client type: { id: number; name: string; username: string | null; image: string | null }
// email, role NOT in the client type ✅
```

```typescript
// ── Output inference vs explicit output ───────────────────────────────────

// Without .output() — TypeScript infers from the handler
const getPost = publicProcedure
  .input(z.object({ id: z.number() }))
  .query(({ input, ctx }) =>
    ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
  )
// Return type: Promise<Post>  (full Prisma Post type — all fields)
// ↑ This is fine if you want all fields returned

// With .output() — explicit contract + runtime stripping
const getPost = publicProcedure
  .input(z.object({ id: z.number() }))
  .output(z.object({
    id:        z.number(),
    title:     z.string(),
    createdAt: z.date(),
    // authorId: omitted — not exposed
  }))
  .query(({ input, ctx }) =>
    ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
  )
// Client type: { id: number; title: string; createdAt: Date }
// authorId NOT in client type — Zod stripped it ✅
```

```typescript
// ── When to use .output() ─────────────────────────────────────────────────

// ✅ USE .output() when:
// - Returning user data that contains sensitive fields (email, role, passwordHash)
// - The return type is ambiguous (multiple code paths, complex conditionals)
// - You want to enforce a stable API contract (even if Prisma model changes)
// - Public-facing API where you want to document the exact response shape

// ❌ SKIP .output() when:
// - The handler has a clear, single return type (most CRUD operations)
// - You want the full Prisma type on the client (all fields needed)
// - Performance is critical (output validation adds runtime overhead per record)

// ── Output validation overhead ────────────────────────────────────────────
// Zod validates EVERY row in an array output
// For large lists (100+ items), this adds measurable cost
// Alternative: select only the fields you need in the Prisma query
ctx.prisma.post.findMany({
  select: { id: true, title: true, createdAt: true }  // don't fetch authorId at all
})
// Then .output() is less necessary — Prisma already limits the fields
```

```typescript
// ── Combining input and output schemas ────────────────────────────────────
const createPost = protectedProcedure
  .input(z.object({
    title:     z.string().min(1).max(200),
    body:      z.string().min(1),
    published: z.boolean().default(false),
  }))
  .output(z.object({
    id:        z.number(),
    title:     z.string(),
    published: z.boolean(),
    createdAt: z.date(),
    // No body in response — client doesn't need to re-receive what it sent
  }))
  .mutation(({ input, ctx }) =>
    ctx.prisma.post.create({
      data:   { ...input, authorId: ctx.user.id },
      select: { id: true, title: true, published: true, createdAt: true },
    })
  )
```

---

## W — Why It Matters

- `.output()` is a security layer — Prisma returns everything in a row by default. Without output validation, a `findUnique` on `User` returns `email`, `role`, `plan` to the client. `.output()` strips unlisted fields before serialisation, preventing accidental data leakage.
- Explicit output schemas create a stable API contract — if you add a column to the Prisma model, it won't automatically appear in the API response (because `.output()` only returns declared fields). This prevents unintentional data exposure when schema evolves.
- The performance trade-off is real — Zod validates every item in an array. For a `findMany` returning 50 posts, that's 50 Zod parse operations. The alternative (Prisma `select`) is more efficient and achieves the same result (only returning declared fields).

---

## I — Interview Q&A

### Q: Why might you choose Prisma `select` over tRPC `.output()` to limit returned fields?

**A:** Both approaches limit which fields the client receives, but they operate at different layers. Prisma `select` limits at the database query level — only the selected columns are fetched from PostgreSQL, reducing data transfer between DB and server. tRPC `.output()` limits at the serialisation level — all columns are fetched from the database, but Zod strips unlisted fields before sending to the client. From a performance perspective, `select` is more efficient — you're not fetching data you don't need. From a security perspective, both work, but `select` has a slight advantage because the data never enters memory. Use `select` as the primary mechanism for field limiting, and reserve `.output()` for cases where you want TypeScript to enforce the response contract or strip fields from a query that must return all columns for other reasons.

---

## C — Common Pitfalls + Fix

### ❌ Returning sensitive user data without `.output()` or `select`

```typescript
// ❌ Returns ALL user fields including email, role, plan to the client
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
    // Returns: { id, email, name, role, plan, emailVerified, ... } — too much ❌
  ),
```

**Fix:** Use `select` or `.output()`:

```typescript
// ✅ Option A: Prisma select (preferred for performance)
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({
      where:  { id: input.userId },
      select: { id: true, name: true, username: true, image: true },
    })
  ),

// ✅ Option B: .output() for explicit contract
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .output(z.object({ id: z.string(), name: z.string(), username: z.string().nullable() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
  ),
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `getMe` protected procedure that returns the current user's full profile for a settings page — including `plan` and `role` (the user should see their own role/plan). Write a `getPublicProfile` public procedure that returns only public fields. Use `.output()` on `getPublicProfile` and Prisma `select` on `getMe`.

### Solution

```typescript
// src/server/routers/user.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z }         from 'zod'

const publicProfileSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  username: z.string().nullable(),
  image:    z.string().nullable(),
  // No: email, role, plan, emailVerified
})

export const userRouter = createTRPCRouter({
  // User sees their own full profile — use Prisma select
  getMe: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where:  { id: ctx.user.id },
        select: {
          id:            true,
          name:          true,
          email:         true,
          username:      true,
          image:         true,
          role:          true,
          plan:          true,
          emailVerified: true,
          createdAt:     true,
          // No: accounts (contains password hash) — never expose
        },
      })
    ),
  // Return type: { id, name, email, username, image, role, plan, emailVerified, createdAt }

  // Public profile — explicit output schema strips everything private
  getPublicProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .output(publicProfileSchema)
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      return user   // Zod strips email, role, plan before sending ✅
    }),
})
```

---

---

# 9 — Type Inference — Types Across Client and Server

---

## T — TL;DR

tRPC's type inference flows automatically from server to client via the `AppRouter` type. You never write a type twice — return types, input types, and error types are all inferred. Use `RouterInputs` and `RouterOutputs` helpers to extract types for use in non-tRPC code (forms, utilities, components).

---

## K — Key Concepts

```typescript
// ── RouterInputs and RouterOutputs — extract procedure types ──────────────
import type { AppRouter } from '@/server/root'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

export type RouterInputs  = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Extract specific types:
type CreatePostInput  = RouterInputs['post']['create']
// { title: string; body: string; published: boolean; tags?: string[] }

type PostListOutput   = RouterOutputs['post']['list']
// { id: number; title: string; createdAt: Date }[]

type GetByIdOutput    = RouterOutputs['post']['getById']
// { id: number; title: string; body: string; createdAt: Date; authorId: number }

// Use in component props:
interface PostCardProps {
  post: RouterOutputs['post']['list'][number]
  //                                 ^^^^^^^^ one item from the array
}

function PostCard({ post }: PostCardProps) {
  return <div>{post.title}</div>  // post.title typed ✅
}
```

```typescript
// ── The type-safe error type ───────────────────────────────────────────────
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'

type AppError = TRPCClientError<AppRouter>

// In component:
function handleError(err: AppError) {
  err.message           // string
  err.data?.code        // 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | ...
  err.data?.zodError    // ZodFlattenedErrors | null
  err.data?.httpStatus  // number
}
```

```typescript
// ── Infer types from Zod schemas ──────────────────────────────────────────
import { z }         from 'zod'
import { createTaskSchema } from '@/lib/schemas/task'

type CreateTaskInput = z.infer<typeof createTaskSchema>
// Same as RouterInputs['task']['create'] if the procedure uses this schema
// Useful for typing form state, function parameters, API payload types

// Narrowing: infer a subset
const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.number().int().positive(),
})
type UpdateTaskInput = z.infer<typeof updateTaskSchema>
```

```typescript
// ── Generic component typed with RouterOutputs ────────────────────────────
type TaskItem = RouterOutputs['task']['list'][number]

interface TaskListProps {
  tasks:    TaskItem[]
  onDelete: (id: TaskItem['id']) => void  // id is number — inferred ✅
}

function TaskList({ tasks, onDelete }: TaskListProps) {
  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>
          {task.title}
          <button onClick={() => onDelete(task.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

```typescript
// ── Inference across the full stack ───────────────────────────────────────
// 1. Prisma schema: model Post { id Int @id; title String; ... }
// 2. Prisma Client generates: type Post = { id: number; title: string; ... }
// 3. tRPC procedure returns Post from Prisma
// 4. tRPC infers RouterOutputs['post']['getById'] = Post
// 5. React component props typed as RouterOutputs['post']['getById']
// 6. template: post.title — typed ✅
//    post.nonExistent — TS error ✅
//    One schema change in Prisma → TypeScript errors propagate everywhere ✅
```

---

## W — Why It Matters

- `RouterInputs` and `RouterOutputs` let you use tRPC types in code that doesn't import tRPC directly — component prop types, utility functions, test fixtures. This keeps components decoupled from tRPC while still being fully typed.
- The type chain (Prisma → tRPC procedure → client type) means one Prisma model change ripples through the entire stack. If you rename `title` to `headline` in the Prisma model, TypeScript immediately errors in every component that accesses `.title`. Find all call sites at compile time, not at runtime.
- `RouterOutputs['post']['list'][number]` is the idiomatic way to type "one item from the list query" — you don't need a separate `Post` type defined anywhere; it's derived from what the server actually returns.

---

## I — Interview Q&A

### Q: How do you type a React component prop to match a tRPC procedure's return type without importing from the server?

**A:** Use `RouterOutputs` to extract the return type at the type level. In a shared types file or the component file, import `type RouterOutputs` from the client setup: `import type { RouterOutputs } from '@/lib/trpc/client'`. Then use indexed access: `type Post = RouterOutputs['post']['getById']`. For arrays, use `type PostItem = RouterOutputs['post']['list'][number]`. This imports only the TypeScript type — not the server implementation — so it's safe to use in client components. The type is always in sync with the server because it's derived from `AppRouter` at compile time.

---

## C — Common Pitfalls + Fix

### ❌ Manually duplicating server types on the client — drift over time

```typescript
// ❌ Manually defined type — will drift when the server changes
interface Post {
  id:    number
  title: string
  body:  string  // ← removed from server response? TS won't catch it ❌
}
```

**Fix:** Derive from the router type:

```typescript
// ✅ Derived — always in sync with server
import type { RouterOutputs } from '@/lib/trpc/client'
type Post = RouterOutputs['post']['getById']
// If the server stops returning `body`, TypeScript errors here immediately ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `src/lib/trpc/types.ts` file that exports: `RouterInputs`, `RouterOutputs`, a `Task` type (single task from list), a `CreateTaskInput` type, an `UpdateTaskInput` type (partial create + required id), and a `TaskStatus` type extracted from the status enum. Show usage in two components.

### Solution

```typescript
// src/lib/trpc/types.ts
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter }    from '@/server/root'
import { createTaskSchema }  from '@/lib/schemas/task'
import { z }                 from 'zod'

export type RouterInputs  = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Single task from the list query
export type Task = RouterOutputs['task']['list'][number]

// Create input — from the Zod schema (same as RouterInputs['task']['create'])
export type CreateTaskInput = RouterInputs['task']['create']

// Update input — partial create + required id
export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.number().int().positive(),
})
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

// Status enum extracted from Task type
export type TaskStatus = Task['status']
// 'todo' | 'in_progress' | 'done' | 'cancelled'

// ── Component 1: TaskCard ──────────────────────────────────────────────────
// src/components/task-card.tsx
import type { Task, TaskStatus } from '@/lib/trpc/types'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
  cancelled:   'Cancelled',
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <div>
      <h3>{task.title}</h3>
      <span>{STATUS_LABEL[task.status]}</span>
      <span>{task.priority}</span>
    </div>
  )
}

// ── Component 2: CreateTaskForm ────────────────────────────────────────────
// src/components/create-task-form.tsx
import type { CreateTaskInput } from '@/lib/trpc/types'
import { trpc }                 from '@/lib/trpc/client'

export function CreateTaskForm({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils()
  const create = trpc.task.create.useMutation({
    onSuccess: () => void utils.task.list.invalidate(),
  })

  function handleSubmit(data: Omit<CreateTaskInput, 'projectId'>) {
    create.mutate({ ...data, projectId })
  }

  return <form>{/* ... */}</form>
}
```

---

---

# 10 — Client Setup — createTRPCClient, Next.js App Router

---

## T — TL;DR

The tRPC client for Next.js App Router has two parts: a server-side caller (for Server Components) and a client-side React provider (for Client Components with `useQuery`/`useMutation`). Configure the client once in `src/lib/trpc/`, wrap the app in the provider, and import `trpc` wherever you need it.

---

## K — Key Concepts

```typescript
// ── src/lib/trpc/client.ts — client-side tRPC with React Query ────────────
'use client'
import { createTRPCReact }         from '@trpc/react-query'
import type { AppRouter }          from '@/server/root'

// The typed tRPC React client — use in Client Components
export const trpc = createTRPCReact<AppRouter>()

// Also export types for use in non-hook code
export type { RouterInputs, RouterOutputs } from './types'
```

```typescript
// ── src/lib/trpc/provider.tsx — wrap app with QueryClient and tRPC ─────────
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchStreamLink }              from '@trpc/client'
import { useState }                         from 'react'
import superjson                            from 'superjson'
import { trpc }                             from './client'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:     1000 * 60,    // 1 minute
        gcTime:        1000 * 60 * 5, // 5 minutes
        retry:         1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()  // Server: always fresh
  }
  // Browser: reuse the same client across renders
  return (browserQueryClient ??= makeQueryClient())
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchStreamLink({
          url:         `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
          transformer: superjson,   // must match server transformer
          headers() {
            return {
              'x-trpc-source': 'react',  // optional: identify request source
            }
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

```typescript
// ── src/app/layout.tsx — add provider to root layout ─────────────────────
import { TRPCReactProvider } from '@/lib/trpc/provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  )
}
```

```typescript
// ── src/server/root.ts — createCaller for Server Components ───────────────
import { createCallerFactory } from '@/server/trpc'
import { appRouter }           from './appRouter'

export { appRouter }
export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)

// ── Using createCaller in a Server Component ──────────────────────────────
// src/app/dashboard/page.tsx
import { createCaller }      from '@/server/root'
import { createTRPCContext } from '@/server/context'
import { headers }           from 'next/headers'

export default async function DashboardPage() {
  const ctx    = await createTRPCContext({ headers: await headers() })
  const caller = createCaller(ctx)

  // Direct function call — no HTTP, fully typed
  const [posts, user] = await Promise.all([
    caller.post.list(),
    caller.user.getMe(),
  ])

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
    </main>
  )
}
```

```typescript
// ── httpBatchStreamLink — understand batching ─────────────────────────────
// httpBatchStreamLink batches multiple concurrent requests into one HTTP call
// Three trpc.useQuery() hooks in one component:
//   GET /api/trpc/post.list,post.getById,user.getMe?batch=1&input={...}
// Instead of 3 separate HTTP requests → 1 batched request ✅
// Streaming: results stream back as they complete, not all at once

// Alternative links:
// httpLink            → one HTTP request per procedure call (no batching)
// httpBatchLink       → batches but waits for all (no streaming)
// httpBatchStreamLink → batches + streams (recommended for Next.js App Router)

// For Server Components (no batching needed — in-process):
// Use createCaller — no HTTP link involved
```

```bash
# ── Complete file structure ────────────────────────────────────────────────
src/
├── server/
│   ├── trpc.ts              ← initTRPC, procedure builders, middleware
│   ├── context.ts           ← createTRPCContext, Context type
│   ├── root.ts              ← appRouter, AppRouter type, createCaller
│   └── routers/
│       ├── user.ts
│       ├── post.ts
│       └── task.ts
├── lib/
│   └── trpc/
│       ├── client.ts        ← createTRPCReact, trpc export
│       ├── provider.tsx     ← TRPCReactProvider
│       └── types.ts         ← RouterInputs, RouterOutputs, derived types
└── app/
    ├── layout.tsx           ← wraps with TRPCReactProvider
    └── api/
        └── trpc/
            └── [trpc]/
                └── route.ts ← fetchRequestHandler
```

---

## W — Why It Matters

- `httpBatchStreamLink` is the correct link for Next.js App Router — it batches concurrent `useQuery` calls in the same render cycle into a single HTTP request, reducing network overhead. Streaming means the page can display data as it arrives rather than waiting for all queries to complete.
- The `getQueryClient` singleton pattern for the browser client is required — React's `useState` initialises the client once per component mount, but if the component remounts, a new client would be created. The singleton ensures TanStack Query's cache persists across navigations.
- `createCaller` in Server Components is the performance-correct approach — no HTTP overhead, no serialisation, direct in-memory Prisma calls. The alternative (calling your own API endpoint from a Server Component) adds unnecessary network latency even when both are on the same server.

---

## I — Interview Q&A

### Q: What is the difference between `trpc.post.list.useQuery()` in a Client Component and `caller.post.list()` in a Server Component?

**A:** `useQuery()` in a Client Component goes through the full HTTP stack — it makes an HTTP GET/POST to `/api/trpc/post.list`, which is handled by the Next.js route handler, which calls `fetchRequestHandler`, which creates context, validates input, and executes the procedure. The result is managed by TanStack Query with caching, loading states, and refetching. `caller.post.list()` in a Server Component calls the procedure directly in-process — no HTTP, no serialisation, no network latency. Context is created manually and passed to `createCaller`. The result is a plain TypeScript Promise with the same return type. Server Components use callers for initial data loading (faster, no loading flash). Client Components use `useQuery` for interactive data (refetching, polling, user-triggered updates).

---

## C — Common Pitfalls + Fix

### ❌ Mismatched transformer — superjson on server, none on client

```typescript
// ❌ Server uses superjson, client link does not — Dates become strings
// trpc.ts: transformer: superjson
// client.ts link: httpBatchStreamLink({ url: '...' })  ← no transformer
// Result: post.createdAt arrives as "2025-06-15T..." (string), not Date ❌
```

**Fix:** Use the same transformer on both sides:

```typescript
// ✅ Server:
const t = initTRPC.context<Context>().create({ transformer: superjson })

// ✅ Client link:
httpBatchStreamLink({
  url:         '/api/trpc',
  transformer: superjson,   // ← must match server ✅
})
// Now post.createdAt is a Date object on the client ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Wire up the complete tRPC setup for a Next.js App Router project: write `client.ts`, `provider.tsx`, `route.ts` (the handler), and show a Server Component and a Client Component that both use the `task.list` procedure.

### Solution

```typescript
// src/lib/trpc/client.ts
'use client'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter }  from '@/server/root'

export const trpc = createTRPCReact<AppRouter>()

// src/lib/trpc/provider.tsx
'use client'
import { useState }                         from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchStreamLink }              from '@trpc/client'
import superjson                            from 'superjson'
import { trpc }                             from './client'

let client: QueryClient | undefined

function getQC() {
  return (client ??= new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }))
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const qc = getQC()
  const [tc] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchStreamLink({
          url:         `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  )
  return (
    <trpc.Provider client={tc} queryClient={qc}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

// src/app/api/trpc/[trpc]/route.ts
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
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => console.error(`[tRPC] ${path}:`, error)
        : undefined,
  })

export { handler as GET, handler as POST }

// src/app/tasks/page.tsx — Server Component
import { createCaller }      from '@/server/root'
import { createTRPCContext } from '@/server/context'
import { headers }           from 'next/headers'
import { TaskListClient }    from './task-list-client'

export default async function TasksPage() {
  const ctx    = await createTRPCContext({ headers: await headers() })
  const caller = createCaller(ctx)
  const tasks  = await caller.task.list()   // in-process call, no HTTP

  return (
    <main>
      <h1>Tasks</h1>
      <TaskListClient initialTasks={tasks} />
    </main>
  )
}

// src/app/tasks/task-list-client.tsx — Client Component
'use client'
import { trpc }              from '@/lib/trpc/client'
import type { RouterOutputs } from '@/lib/trpc/types'

type Task = RouterOutputs['task']['list'][number]

export function TaskListClient({ initialTasks }: { initialTasks: Task[] }) {
  // useQuery starts with server-fetched data, refetches in background
  const { data: tasks = initialTasks } = trpc.task.list.useQuery(undefined, {
    initialData: initialTasks,
    staleTime:   30_000,
  })

  const utils  = trpc.useUtils()
  const del    = trpc.task.delete.useMutation({
    onSuccess: () => void utils.task.list.invalidate(),
  })

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>
          {task.title}
          <button onClick={() => del.mutate({ id: task.id })} disabled={del.isPending}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
```

---

## ✅ Day 12 Complete — tRPC Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | What Is tRPC and How It Fits | ☐ |
| 2 | Routers — createTRPCRouter, Sub-Routers, appRouter | ☐ |
| 3 | Procedures — publicProcedure and the Procedure Builder | ☐ |
| 4 | Queries — Defining and Calling | ☐ |
| 5 | Mutations — Defining and Calling | ☐ |
| 6 | Context — createTRPCContext, Request Data | ☐ |
| 7 | Input Validators — Zod Integration | ☐ |
| 8 | Output Validators — Return Type Safety | ☐ |
| 9 | Type Inference — Types Across Client and Server | ☐ |
| 10 | Client Setup — createTRPCClient, Next.js App Router | ☐ |

---

## 🗺️ One-Page Mental Model — Day 12

```
WHAT IS tRPC
  Server function return type = client TypeScript type — no codegen
  Change server → TypeScript errors on client immediately
  Works over HTTP (POST for mutations, GET/POST for queries)
  Best for: full-stack TS monorepos (Next.js + Prisma)
  Not for: public APIs, non-TS clients, separate repos

ROUTERS
  createTRPCRouter({ name: procedure, ... })  → one router per domain
  appRouter = createTRPCRouter({ user, post, task })  → root composition
  export type AppRouter = typeof appRouter    → only this crosses to client
  Sub-routers nest: trpc.admin.stats.getOverview
  One initTRPC call in trpc.ts — export createTRPCRouter + procedure builders

PROCEDURES
  publicProcedure                      → no auth, anyone can call
  protectedProcedure = t.procedure.use(isAuthed)  → ctx.user guaranteed non-null
  adminProcedure = t.procedure.use(isAdmin)       → ctx.user.role === 'admin'
  Chain: .use(middleware).input(schema).output(schema).query/mutation(handler)
  TRPCError({ code: 'NOT_FOUND' })     → maps to HTTP 404
  Error codes: UNAUTHORIZED(401), FORBIDDEN(403), NOT_FOUND(404), BAD_REQUEST(400)

QUERIES
  .query(({ input, ctx }) => ...)     → read operation
  trpc.post.list.useQuery()           → React hook, auto-loading/error/data
  trpc.post.getById.useQuery({ id })  → input is part of cache key
  enabled: condition                  → gate query on condition
  staleTime, gcTime, refetchInterval  → cache control via TanStack Query
  Server Component: caller.post.list() → in-process, no HTTP

MUTATIONS
  .mutation(({ input, ctx }) => ...)  → write operation
  trpc.post.create.useMutation()      → returns { mutate, mutateAsync, isPending, error }
  mutate(input)                       → fire and forget, errors via onError
  mutateAsync(input)                  → returns Promise, use try/catch
  onSuccess: () => utils.post.list.invalidate()  → refresh cache after write
  Optimistic: onMutate → setData optimistically → onError rollback → onSettled invalidate

CONTEXT
  createTRPCContext({ headers }) → { prisma, session, user, ip, ... }
  Called once per HTTP request (not per procedure)
  Prisma: import singleton — never new PrismaClient() in context
  session: auth.api.getSession({ headers }) → Session | null
  isAuthed middleware: if !ctx.session → throw UNAUTHORIZED → ctx.user typed non-null
  createCaller(ctx) → direct in-process calls (Server Components, tests)

INPUT VALIDATION
  .input(z.object({ ... }))           → validates before handler runs
  Invalid input → BAD_REQUEST + zodError.fieldErrors on client
  .coerce.number()                    → string → number coercion
  .refine(fn, msg)                    → custom cross-field validation
  Share schemas: src/lib/schemas/ → use in procedure AND form validation ✅
  errorFormatter: attach zodError to response shape

OUTPUT VALIDATION
  .output(zodSchema)                  → strips unlisted fields (security)
  Alternative: Prisma select: { id: true, title: true } — preferred (performance)
  .output() overhead: validates every row in array — use sparingly
  Use .output() for public profiles, any query exposing user data

TYPE INFERENCE
  RouterInputs  = inferRouterInputs<AppRouter>   → input types
  RouterOutputs = inferRouterOutputs<AppRouter>  → return types
  type Task = RouterOutputs['task']['list'][number]  → single item type
  type AppError = TRPCClientError<AppRouter>         → error type
  Never manually duplicate server types — always derive from AppRouter

CLIENT SETUP
  createTRPCReact<AppRouter>()        → trpc object with useQuery/useMutation
  httpBatchStreamLink({ url, transformer: superjson })  → batches + streams
  TRPCReactProvider wraps app         → in layout.tsx
  transformer: superjson on BOTH server and client — Date/BigInt support
  route.ts: fetchRequestHandler → handles all /api/trpc/* calls

FILE STRUCTURE
  src/server/trpc.ts         → initTRPC, procedure builders, middleware
  src/server/context.ts      → createTRPCContext, Context type
  src/server/root.ts         → appRouter, AppRouter type, createCaller
  src/server/routers/*.ts    → domain routers (user, post, task)
  src/lib/trpc/client.ts     → createTRPCReact, trpc export
  src/lib/trpc/provider.tsx  → TRPCReactProvider
  src/lib/trpc/types.ts      → RouterInputs, RouterOutputs, derived types
  src/app/api/trpc/[trpc]/route.ts  → fetchRequestHandler entry point
```

> **Your next action:** Create `src/server/trpc.ts` with `initTRPC`, a `publicProcedure`, and a `protectedProcedure`. Add one procedure — `ping: publicProcedure.query(() => 'pong')`. Wire up the route handler. Call `trpc.ping.useQuery()` in a component and confirm the type flows through. That's the entire foundation, done in 10 minutes.

> "Doing one small thing beats opening a feed."