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
