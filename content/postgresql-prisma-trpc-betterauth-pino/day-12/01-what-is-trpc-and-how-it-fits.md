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
