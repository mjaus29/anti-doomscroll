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
