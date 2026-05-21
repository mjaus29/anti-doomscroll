# 8 — BetterAuth Session-Based Access Control — Full Patterns

---

## T — TL;DR

Full access control in a tRPC + BetterAuth app combines: session in context, procedure hierarchy (public/protected/admin), ownership checks in handlers, role-based middleware, and resource-scoped queries. Together these form a defence-in-depth security model where each layer independently enforces its part of the access rules.

---

## K — Key Concepts

```typescript
// ── Complete access control architecture in one view ──────────────────────
//
// Layer 1: Context — session loaded once per request
//   createTRPCContext: reads BetterAuth session, provides ctx.user
//
// Layer 2: Procedure level — structural access rules
//   publicProcedure:    no restrictions
//   protectedProcedure: must be authenticated (ctx.user non-null)
//   adminProcedure:     must be authenticated + role === 'admin'
//
// Layer 3: Handler level — resource-specific rules
//   Ownership: verify resource.userId === ctx.user.id
//   Scoped queries: WHERE userId = ctx.user.id (more secure — no 403 leakage)
//   State checks: only update tasks with status !== 'completed'
//
// All three layers are independent and additive.
// Bypassing Layer 2 does not bypass Layer 3 — defence in depth ✅
```

```typescript
// ── Real-world example: multi-role post system ────────────────────────────
export const postRouter = createTRPCRouter({
  // PUBLIC: anyone can read published posts
  listPublished: publicProcedure
    .query(({ ctx }) =>
      ctx.prisma.post.findMany({
        where:   { published: true },
        select:  { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take:    20,
      })
    ),

  // PUBLIC: anyone can read a published post
  getPublished: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findFirst({
        where:  { id: input.id, published: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return post
    }),

  // PROTECTED: authenticated users can read their own drafts
  myDrafts: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.post.findMany({
        where:   { authorId: ctx.user.id, published: false },
        orderBy: { updatedAt: 'desc' },
      })
    ),

  // PROTECTED: authenticated users can create posts
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), body: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.post.create({
          data: { ...input, authorId: ctx.user.id },
        })
      } catch (err: any) {
        if (err?.code === 'P2002') throw new TRPCError({ code: 'CONFLICT', message: 'Title taken' })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err })
      }
    }),

  // PROTECTED + OWNERSHIP: only author can update their post
  update: protectedProcedure
    .input(z.object({
      id:        z.number(),
      title:     z.string().optional(),
      published: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      const post = await ctx.prisma.post.findFirst({
        where:  { id, authorId: ctx.user.id },   // scoped: 404 if not owner ✅
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.prisma.post.update({ where: { id }, data })
    }),

  // ADMIN OR OWNER: admin can delete any post, owner can delete their own
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const post = await ctx.prisma.post.findUnique({
        where:  { id: input.id },
        select: { id: true, authorId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })

      const isOwner = post.authorId === ctx.user.id
      const isAdmin = ctx.user.role  === 'admin'
      if (!isOwner && !isAdmin) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.post.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ADMIN ONLY: hard delete all posts from a banned user
  adminDeleteUserPosts: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.prisma.post.deleteMany({
        where: { authorId: input.userId },
      })
      return { deletedCount: result.count }
    }),
})
```

```typescript
// ── Session-aware data queries — filter by role ────────────────────────────
const taskRouter = createTRPCRouter({
  // Regular user sees only their tasks; admin sees all tasks
  list: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(({ input, ctx }) => {
      const isAdmin = ctx.user.role === 'admin'
      return ctx.prisma.task.findMany({
        where: {
          ...(input.projectId ? { projectId: input.projectId } : {}),
          ...(isAdmin ? {} : { assigneeId: ctx.user.id }),  // admin sees all, user sees own ✅
        },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
```

```typescript
// ── Combining BetterAuth with tRPC: checking session in server actions ────
// For Next.js Server Actions (outside tRPC), use the same auth pattern
'use server'
import { auth }      from '@/lib/auth'
import { prisma }    from '@/lib/prisma'
import { headers }   from 'next/headers'
import { redirect }  from 'next/navigation'

export async function deletePostAction(postId: number) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: session.user.id },  // ownership check ✅
  })
  if (!post) throw new Error('Not found')

  await prisma.post.delete({ where: { id: postId } })
}
```

```typescript
// ── Complete src/server/trpc.ts — production-ready ────────────────────────
import { initTRPC, TRPCError }  from '@trpc/server'
import { ZodError }              from 'zod'
import { randomUUID }            from 'crypto'
import superjson                 from 'superjson'
import { type Context }          from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      console.error('[tRPC] Internal error:', error.cause ?? error)
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:    error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId:   randomUUID(),
        stack:       process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory

const mw = {
  log: t.middleware(async ({ path, type, next }) => {
    const start = Date.now()
    const r     = await next()
    console.log(`[tRPC] ${type} ${path} ${Date.now() - start}ms ${r.ok ? 'ok' : 'err'}`)
    return r
  }),
  auth: t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return next({ ctx: { ...ctx, user: ctx.session.user, session: ctx.session } })
  }),
  admin: t.middleware(({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
    return next()
  }),
}

export const publicProcedure    = t.procedure.use(mw.log)
export const protectedProcedure = t.procedure.use(mw.log).use(mw.auth)
export const adminProcedure     = t.procedure.use(mw.log).use(mw.auth).use(mw.admin)
```

---

## W — Why It Matters

- Defence in depth means each layer independently enforces its rules — if a developer accidentally uses `publicProcedure` instead of `protectedProcedure`, the ownership check in the handler (scoped query) still prevents cross-user data access. The inner layer is always the last line of defence.
- The role-aware `list` pattern (`isAdmin ? {} : { assigneeId: ctx.user.id }`) implements data-layer multi-tenancy — admins see everything, regular users see only their own. This is a single query, enforced at the database layer, not in application code filtering.
- Consistent session-based access control across tRPC procedures AND Next.js Server Actions ensures no unprotected side door — using the same `auth.api.getSession({ headers })` pattern in both means the same security model applies everywhere.

---

## I — Interview Q&A

### Q: Describe a complete defence-in-depth access control model for a tRPC API with BetterAuth.

**A:** There are three independent layers. Layer one is the procedure level — `publicProcedure`, `protectedProcedure`, `adminProcedure` set structural access rules via middleware before the handler runs. Unauthenticated requests to `protectedProcedure` get `UNAUTHORIZED` immediately; wrong-role requests to `adminProcedure` get `FORBIDDEN`. Layer two is the handler level with scoped queries — instead of fetching a resource then checking ownership, the query includes `WHERE id = $1 AND userId = $2`. If the resource doesn't belong to the user, it's 404 (not 403), preventing existence leakage. Layer three is the database level — row-level security or schema constraints ensure that even if application code has a bug, the database won't allow cross-user data writes. In practice with PostgreSQL + Prisma, layers one and two are implemented in tRPC; layer three adds Prisma-level constraints like unique indexes and foreign keys. These layers work together: a bug in layer one doesn't compromise layer two, and vice versa.

---

## C — Common Pitfalls + Fix

### ❌ Skipping the procedure level and relying only on handler checks

```typescript
// ❌ publicProcedure used everywhere — "I'll check in the handler"
updateProfile: publicProcedure
  .input(z.object({ id: z.string(), name: z.string() }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })  // inline check ❌
    if (ctx.session.user.id !== input.id) throw new TRPCError({ code: 'FORBIDDEN' })
    return ctx.prisma.user.update({ where: { id: input.id }, data: { name: input.name } })
  }),
// This works but: easy to forget, not auditable, no consistent error codes/messages
```

**Fix:** Use `protectedProcedure` for the structural check, scoped query for ownership:

```typescript
// ✅ Structural check at procedure level; ownership via scoped query
updateProfile: protectedProcedure
  .input(z.object({ name: z.string().min(1) }))   // no id in input — use ctx.user.id ✅
  .mutation(({ input, ctx }) =>
    ctx.prisma.user.update({
      where: { id: ctx.user.id },   // always update the logged-in user ✅
      data:  { name: input.name },
    })
  ),
// Pattern: for "current user" operations, don't accept userId from input
// Just use ctx.user.id from the verified session ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `projectRouter` with all four access levels: (1) `list` — public, only published projects; (2) `myProjects` — protected, current user's projects with pagination; (3) `update` — protected + ownership via scoped query; (4) `adminArchive` — admin only, archive any project. Handle Prisma P2025 in update.

### Solution

```typescript
// src/server/routers/project.ts
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '@/server/trpc'
import { TRPCError }  from '@trpc/server'
import { Prisma }     from '@prisma/client'
import { z }          from 'zod'

const paginationSchema = z.object({
  cursor: z.number().int().positive().optional(),
  limit:  z.number().min(1).max(50).default(20),
})

export const projectRouter = createTRPCRouter({

  // (1) PUBLIC — published projects only
  list: publicProcedure
    .input(paginationSchema.optional())
    .query(({ input, ctx }) =>
      ctx.prisma.project.findMany({
        where:   { isPublished: true, isArchived: false },
        select:  { id: true, name: true, slug: true, description: true },
        take:    input?.limit ?? 20,
        cursor:  input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      })
    ),

  // (2) PROTECTED — user's own projects
  myProjects: protectedProcedure
    .input(paginationSchema.optional())
    .query(({ input, ctx }) =>
      ctx.prisma.project.findMany({
        where:   { ownerId: ctx.user.id },   // scoped by owner ✅
        take:    input?.limit ?? 20,
        cursor:  input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: 'desc' },
      })
    ),

  // (3) PROTECTED + OWNERSHIP — only owner can update
  update: protectedProcedure
    .input(z.object({
      id:          z.number().int().positive(),
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(1000).optional(),
      isPublished: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      try {
        // Scoped update: only succeeds if BOTH id AND ownerId match
        return await ctx.prisma.project.update({
          where: { id, ownerId: ctx.user.id },  // Prisma compound where ✅
          data,
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          // Either project doesn't exist OR user doesn't own it — both → 404
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err })
      }
    }),

  // (4) ADMIN ONLY — archive any project
  adminArchive: adminProcedure
    .input(z.object({
      id:     z.number().int().positive(),
      reason: z.string().min(1).max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findUnique({
        where:  { id: input.id },
        select: { id: true, name: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.prisma.project.update({
        where: { id: input.id },
        data:  { isArchived: true, archivedAt: new Date(), archivedById: ctx.user.id },
      })

      // Log admin action
      await ctx.prisma.adminLog.create({
        data: {
          action:   'archive_project',
          targetId: String(input.id),
          adminId:  ctx.user.id,
          reason:   input.reason ?? null,
        },
      })

      return { success: true, projectId: input.id, projectName: project.name }
    }),
})
```

---

## ✅ Day 13 Complete — tRPC Protected Backend Architecture

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Middleware — t.middleware, next(), Context Transformation | ☐ |
| 2 | Stacked .input() — Chaining and Middleware Input | ☐ |
| 3 | Authorization Patterns — Ownership and RBAC | ☐ |
| 4 | Protected Procedures — Typed Procedure Hierarchy | ☐ |
| 5 | Auth-Aware Context — BetterAuth Session, User Typing | ☐ |
| 6 | Error Formatting — Custom Shapes, Client Handling | ☐ |
| 7 | Prisma Integration — Transactions, Error Codes | ☐ |
| 8 | BetterAuth Session-Based Access Control — Full Patterns | ☐ |

---

## 🗺️ One-Page Mental Model — Day 13

```
MIDDLEWARE
  t.middleware(({ ctx, next, path, type, rawInput }) => { ... })
  Must return: return next()  or  return await next()
  Modify context: return next({ ctx: { ...ctx, user: session.user } })
  TypeScript re-types ctx downstream after next({ ctx: newCtx }) ✅
  Throw TRPCError to abort — handler never runs
  Chain: t.procedure.use(mw1).use(mw2).use(mw3)  — runs in order

STACKED .INPUT()
  .input() called twice = REPLACES first schema (not additive)
  Compose with: schema.merge(other) / schema.extend({ field }) / schema.and(other)
  Shared schemas: src/lib/schemas/ — use in procedure AND client form validation
  Tenant/workspace ID: inject from ctx (session) — never from client input
  rawInput: unknown — pre-validation, for middleware logging/rate-limiting

AUTHORIZATION PATTERNS
  Ownership — in handler: fetch resource, check resource.userId === ctx.user.id
  RBAC — in middleware: check ctx.user.role before handler runs
  Scoped query: WHERE id = $1 AND userId = $2 → 404 for both not-found and unauthorized
    (better than 403 — doesn't leak resource existence to attacker)
  assertOwnerOrAdmin(resource.userId, ctx.user.id, ctx.user.role) — helper
  Workspace/tenant: middleware reads workspaceId from rawInput, checks membership

PROCEDURE HIERARCHY
  publicProcedure    → no restrictions
  protectedProcedure → enforceAuth middleware: UNAUTHORIZED if no session
  verifiedProcedure  → enforceAuth + emailVerified check: FORBIDDEN if unverified
  proProcedure       → enforceAuth + plan check: FORBIDDEN if not pro/enterprise
  adminProcedure     → enforceAuth + role check: FORBIDDEN if not admin
  Each level extends previous with .use() — ctx.user narrows at each level
  Test: createCallerFactory(appRouter)(mockCtx) — pass mock context directly

AUTH-AWARE CONTEXT (BETTERAUTH)
  createTRPCContext: auth.api.getSession({ headers }) → one query per request
  ctx.user: typeof auth.$Infer.Session.user — includes additionalFields ✅
  ctx.session: Session | null
  ctx.prisma: PrismaClient singleton (never new PrismaClient() in context)
  Server Components: createCaller(ctx) — pass headers() directly, no HTTP
  Banned check: query db in context, throw FORBIDDEN before procedures run

ERROR FORMATTING
  errorFormatter({ shape, error }) → return { ...shape, data: { ...shape.data, custom } }
  Attach: zodError (flatten()), requestId (UUID), userMessage, stack (dev only)
  Log: INTERNAL_SERVER_ERROR → console.error / Sentry in formatter
  Client: err.data?.zodError?.fieldErrors → field-level messages
  Client: err.data?.code → conditional UI (redirect UNAUTHORIZED, show FORBIDDEN)
  Client retry: don't retry UNAUTHORIZED/FORBIDDEN/NOT_FOUND errors
  TRPCError cause: logged server-side, never serialised to client

PRISMA INTEGRATION
  handlePrismaError(err): P2002 → CONFLICT, P2025 → NOT_FOUND, P2003 → BAD_REQUEST
  $transaction: wrap multi-step writes — all commit or all rollback
  Inside $transaction: throw TRPCError for business rule violations
  Outside $transaction: if (err instanceof TRPCError) throw err — then handlePrismaError
  findUniqueOrThrow: wrap in try/catch for P2025 → NOT_FOUND translation
  Never let raw Prisma errors reach the client — always translate

ACCESS CONTROL FULL PATTERN
  Layer 1 (procedure): structural — publicProcedure / protectedProcedure / adminProcedure
  Layer 2 (handler):   resource — scoped WHERE query or assertOwnerOrAdmin
  Layer 3 (database):  constraints — unique indexes, FKs, check constraints
  "Current user" operations: use ctx.user.id, never accept userId from client
  Role-aware queries: isAdmin ? {} : { assigneeId: ctx.user.id }
  Multi-role operations (owner OR admin): fetch first → check ownership OR role → delete
  Server Actions outside tRPC: same auth.api.getSession({ headers: await headers() })

KEY RULES
  Always return next() in middleware — forgetting silently returns undefined
  .use(mw.auth) before .use(mw.admin) — wrong order gives FORBIDDEN not UNAUTHORIZED
  Ownership → scoped query (404) not explicit fetch+check (403) — no existence leakage
  Tenant ID → ctx not client input — prevents cross-tenant data access
  Shared Zod schemas → single source of truth for client + server validation
  Transactions → wrap multi-step writes, catch TRPCError before Prisma errors
```

> **Your next action:** Open `src/server/trpc.ts` and verify your `protectedProcedure` re-types `ctx.user` as non-null. Write one new procedure using it and confirm TypeScript doesn't require a null check on `ctx.user.id`. That's the whole middleware system in practice.

> "Doing one small thing beats opening a feed."
