
# 📅 Day 13 — tRPC Protected Backend Architecture

> **Goal:** Build a production-grade tRPC backend — layer middleware, stack inputs, enforce ownership and role-based access, integrate BetterAuth sessions into context, handle errors with precision, and connect Prisma transactionally.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** tRPC v11 · BetterAuth 1.5 · Prisma 7 · Zod 4 · PostgreSQL 18 · TypeScript 6

---

## 📋 Day 13 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Middleware — t.middleware, next(), Context Transformation | 12 min |
| 2 | Stacked .input() — Chaining and Middleware Input | 10 min |
| 3 | Authorization Patterns — Ownership and RBAC | 12 min |
| 4 | Protected Procedures — Typed Procedure Hierarchy | 12 min |
| 5 | Auth-Aware Context — BetterAuth Session, User Typing | 12 min |
| 6 | Error Formatting — Custom Shapes, Client Handling | 10 min |
| 7 | Prisma Integration — Transactions, Error Codes | 12 min |
| 8 | BetterAuth Session-Based Access Control — Full Patterns | 12 min |

---

---

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

# 2 — Stacked .input() — Chaining and Middleware Input

---

## T — TL;DR

`.input()` can only be called once per procedure chain — calling it again replaces the schema. To compose inputs, use Zod's `.merge()`, `.extend()`, or `.and()`. Middleware cannot access typed input (it runs before Zod parsing), but it can access `rawInput` for pre-validation checks like rate limiting. Use shared Zod schemas and merge them for reusable input patterns.

---

## K — Key Concepts

```typescript
// ── .input() is terminal on the schema — calling it twice replaces ─────────
publicProcedure
  .input(z.object({ id: z.number() }))       // sets schema
  .input(z.object({ name: z.string() }))     // REPLACES the first schema
  // ❌ id is gone — only name exists now
  .query(({ input }) => input.name)          // input.id would be TS error

// ── Compose with Zod instead ───────────────────────────────────────────────
const idSchema         = z.object({ id: z.number().int().positive() })
const paginationSchema = z.object({
  cursor: z.number().optional(),
  limit:  z.number().min(1).max(100).default(20),
})
const filterSchema = z.object({
  status: z.enum(['todo','in_progress','done']).optional(),
})

// Merge: combine into a new schema
publicProcedure
  .input(paginationSchema.merge(filterSchema))
  .query(({ input }) => {
    input.cursor  // number | undefined ✅
    input.limit   // number ✅
    input.status  // enum | undefined ✅
  })

// Extend: add fields to an existing schema
publicProcedure
  .input(idSchema.extend({ includeDeleted: z.boolean().default(false) }))
  .query(({ input }) => {
    input.id              // number ✅
    input.includeDeleted  // boolean ✅
  })
```

```typescript
// ── Shared base schemas — single source of truth ──────────────────────────
// src/lib/schemas/common.ts
import { z } from 'zod'

export const idSchema = z.object({
  id: z.number().int().positive(),
})

export const paginationSchema = z.object({
  cursor:    z.number().optional(),
  limit:     z.number().min(1).max(100).default(20),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  from: z.string().datetime().transform(s => new Date(s)).optional(),
  to:   z.string().datetime().transform(s => new Date(s)).optional(),
}).refine(
  d => !d.from || !d.to || d.from <= d.to,
  { message: 'from must be before to', path: ['from'] }
)

// src/lib/schemas/task.ts — extend base schemas
import { idSchema, paginationSchema } from './common'

export const createTaskSchema = z.object({
  title:     z.string().min(1).max(200),
  priority:  z.enum(['low','medium','high']).default('medium'),
  projectId: z.number().int().positive(),
})

export const updateTaskSchema = createTaskSchema
  .partial()                             // all fields optional
  .merge(idSchema)                       // add required id
  // { id: number; title?: string; priority?: enum; projectId?: number }

export const listTaskSchema = paginationSchema.merge(
  z.object({
    projectId: z.number().optional(),
    status:    z.enum(['todo','in_progress','done']).optional(),
  })
)
```

```typescript
// ── rawInput in middleware — pre-validation access ────────────────────────
// rawInput: unknown — the client payload before Zod runs
// Use case: rate limiting by a known field, request logging

const logInputMiddleware = t.middleware(({ rawInput, path, next }) => {
  // rawInput is the raw JSON — access it safely
  if (typeof rawInput === 'object' && rawInput !== null) {
    const id = (rawInput as Record<string, unknown>).id
    console.log(`[tRPC] ${path} called with id=${id ?? 'none'}`)
  }
  return next()
})

// ── Procedure with meta + input ────────────────────────────────────────────
// Meta is defined at procedure chain level — available in middleware
const metaSchema = z.object({ spanName: z.string() })

const t2 = initTRPC.context<Context>().meta<z.infer<typeof metaSchema>>().create({
  transformer: superjson,
})

const tracedProcedure = t2.procedure.use(({ meta, next, path }) => {
  console.log(`Span: ${meta?.spanName ?? path}`)
  return next()
})

tracedProcedure
  .meta({ spanName: 'create-post' })
  .input(z.object({ title: z.string() }))
  .mutation(({ input }) => input.title)
```

```typescript
// ── Pattern: tenant-scoped input ──────────────────────────────────────────
// In a multi-tenant app, many procedures need tenantId
// Add it from context (server-side) — never from client input

const tenantMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user?.tenantId) throw new TRPCError({ code: 'FORBIDDEN' })
  return next({
    ctx: { ...ctx, tenantId: ctx.user.tenantId },
  })
})

const tenantProcedure = t.procedure.use(isAuthed).use(tenantMiddleware)

const projectRouter = createTRPCRouter({
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(({ input, ctx }) =>
      ctx.prisma.project.findMany({
        where: {
          tenantId: ctx.tenantId,  // ← from middleware, not client input ✅
          status:   input.status,
        },
      })
    ),
})
// The client sends: { status: 'active' }
// The server adds:  tenantId from the session — client cannot forge it ✅
```

---

## W — Why It Matters

- `.input()` called twice silently replaces the first schema — no TypeScript error, no warning. This is a common mistake when trying to "add" a field. Always use `.merge()` or `.extend()` to compose schemas.
- The tenant-scoped input pattern is a critical security model — tenantId comes from `ctx.user.tenantId` (the verified session), never from client input. If you accepted `tenantId` from the client, any user could query another tenant's data by changing the value.
- Shared Zod schemas serve double duty — used in tRPC procedures for server validation AND in client forms for local validation. One definition, zero drift between what the server accepts and what the client validates.

---

## I — Interview Q&A

### Q: Can you call `.input()` multiple times on a tRPC procedure? How do you compose multiple input shapes?

**A:** No — calling `.input()` twice on the same procedure chain replaces the first schema entirely. The second call wins. To compose multiple input shapes into one, use Zod's composition methods: `.merge(schema)` to combine two objects into one, `.extend({ field: type })` to add fields to an existing schema, or `.and(schema)` for intersection types. The recommended pattern is to define small, focused base schemas (`idSchema`, `paginationSchema`, `dateRangeSchema`) and compose them with `.merge()` at the procedure level. This gives you reusable building blocks that stay in sync across all procedures that use them.

---

## C — Common Pitfalls + Fix

### ❌ Calling `.input()` twice to add a field — first schema silently dropped

```typescript
// ❌ Trying to add tenantId to an existing input
procedure
  .input(z.object({ status: z.string() }))
  .input(z.object({ tenantId: z.string() }))   // ← replaces first ❌
  // input.status is now a TypeScript error — it doesn't exist
```

**Fix:** Use `.merge()`:

```typescript
// ✅
procedure
  .input(
    z.object({ status: z.string() })
     .merge(z.object({ tenantId: z.string() }))
  )
  // input.status AND input.tenantId both exist ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create three shared schemas in `src/lib/schemas/common.ts`: `idSchema`, `paginationSchema` (cursor + limit), `workspaceSchema` (workspaceId). Then write a `taskRouter` with a `list` procedure that combines all three, and an `update` procedure that combines `idSchema` with a partial task update schema.

### Solution

```typescript
// src/lib/schemas/common.ts
import { z } from 'zod'

export const idSchema = z.object({
  id: z.number().int().positive(),
})

export const paginationSchema = z.object({
  cursor: z.number().int().positive().optional(),
  limit:  z.number().min(1).max(100).default(20),
})

export const workspaceSchema = z.object({
  workspaceId: z.number().int().positive(),
})

// src/lib/schemas/task.ts
import { z }                                   from 'zod'
import { idSchema, paginationSchema, workspaceSchema } from './common'

export const taskBaseSchema = z.object({
  title:    z.string().min(1).max(200),
  priority: z.enum(['low','medium','high','critical']).default('medium'),
  status:   z.enum(['todo','in_progress','done']).default('todo'),
})

export const createTaskSchema = taskBaseSchema.merge(workspaceSchema)
export const updateTaskSchema = taskBaseSchema.partial().merge(idSchema)
export const listTaskSchema   = paginationSchema
  .merge(workspaceSchema)
  .merge(z.object({
    status:   z.enum(['todo','in_progress','done']).optional(),
    priority: z.enum(['low','medium','high','critical']).optional(),
  }))

// src/server/routers/task.ts
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { updateTaskSchema, listTaskSchema }      from '@/lib/schemas/task'
import { TRPCError }                             from '@trpc/server'

export const taskRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listTaskSchema)
    .query(({ input, ctx }) =>
      ctx.prisma.task.findMany({
        where:   {
          workspaceId: input.workspaceId,
          status:      input.status,
          priority:    input.priority,
        },
        take:    input.limit,
        cursor:  input.cursor ? { id: input.cursor } : undefined,
        orderBy: { id: 'desc' },
      })
    ),

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      const task = await ctx.prisma.task.findUnique({ where: { id } })
      if (!task) throw new TRPCError({ code: 'NOT_FOUND' })
      // Ownership check in Subtopic 3
      return ctx.prisma.task.update({ where: { id }, data })
    }),
})
```

---

---

# 3 — Authorization Patterns — Ownership and RBAC

---

## T — TL;DR

Two authorization patterns: **ownership** (can this user modify THIS resource?) and **RBAC** (does this user have the right ROLE?). Ownership checks happen inside the handler after fetching the resource. RBAC checks happen in middleware before the handler runs. Both throw `FORBIDDEN` on failure.

---

## K — Key Concepts

```typescript
// ── Pattern 1: Ownership check — inside the handler ───────────────────────
update: protectedProcedure
  .input(z.object({
    id:    z.number().int().positive(),
    title: z.string().min(1).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Step 1: fetch the resource
    const post = await ctx.prisma.post.findUnique({ where: { id: input.id } })

    // Step 2: not found → 404
    if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })

    // Step 3: ownership check → 403
    if (post.authorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this post' })
    }

    // Step 4: safe to update
    return ctx.prisma.post.update({
      where: { id: input.id },
      data:  { title: input.title },
    })
  }),

// ── Ownership check helper — reusable ─────────────────────────────────────
async function assertOwnership(
  resourceUserId: string,
  requestUserId:  string,
  label = 'resource'
): Promise<void> {
  if (resourceUserId !== requestUserId) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: `You do not own this ${label}`,
    })
  }
}

// Usage:
await assertOwnership(post.authorId, ctx.user.id, 'post')
```

```typescript
// ── Pattern 2: RBAC in middleware ──────────────────────────────────────────
type AllowedRole = 'admin' | 'moderator' | 'user'

// Factory: creates a middleware for a required role
const requireRole = (...roles: AllowedRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    const userRole = ctx.session.user.role as AllowedRole
    if (!roles.includes(userRole)) {
      throw new TRPCError({
        code:    'FORBIDDEN',
        message: `Required role: ${roles.join(' or ')}. Your role: ${userRole}`,
      })
    }
    return next({ ctx: { ...ctx, user: ctx.session.user } })
  })

// Procedure builders for each role:
export const adminProcedure     = t.procedure.use(requireRole('admin'))
export const moderatorProcedure = t.procedure.use(requireRole('admin', 'moderator'))
export const userProcedure      = t.procedure.use(requireRole('admin', 'moderator', 'user'))
// adminProcedure:     only admin
// moderatorProcedure: admin OR moderator
// userProcedure:      any authenticated role
```

```typescript
// ── Pattern 3: Row-level security via scope constraint ────────────────────
// Instead of post-fetch ownership check: add userId to the WHERE clause
// If the row doesn't belong to the user, findUnique returns null → 404
// This avoids leaking that a resource EXISTS to unauthorized users

update: protectedProcedure
  .input(z.object({ id: z.number(), title: z.string().optional() }))
  .mutation(async ({ input, ctx }) => {
    const { id, ...data } = input

    // Scoped query: only matches if BOTH id AND authorId match
    const post = await ctx.prisma.post.findFirst({
      where: { id, authorId: ctx.user.id },  // ← scope by owner ✅
    })

    if (!post) {
      // Returns 404 whether post doesn't exist OR user doesn't own it
      // Attacker can't distinguish "not found" from "forbidden" ✅
      throw new TRPCError({ code: 'NOT_FOUND' })
    }

    return ctx.prisma.post.update({ where: { id }, data })
  }),
```

```typescript
// ── Pattern 4: Workspace/tenant scoping ───────────────────────────────────
// User must be a member of the workspace they're operating in
const requireWorkspaceMember = t.middleware(async ({ ctx, rawInput, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })

  // Read workspaceId from rawInput (pre-validation — handle carefully)
  const workspaceId =
    typeof rawInput === 'object' && rawInput !== null
      ? (rawInput as { workspaceId?: unknown }).workspaceId
      : undefined

  if (typeof workspaceId !== 'number') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'workspaceId required' })
  }

  const membership = await ctx.prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.user.id } },
  })

  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' })
  }

  return next({
    ctx: { ...ctx, workspaceId, memberRole: membership.role },
  })
})

export const workspaceProcedure = t.procedure
  .use(isAuthed)
  .use(requireWorkspaceMember)
// ctx.workspaceId and ctx.memberRole are typed in handlers ✅
```

---

## W — Why It Matters

- The scoped query pattern (adding `authorId: ctx.user.id` to the WHERE clause) is more secure than the two-step fetch-then-check pattern — it doesn't reveal whether a resource exists or not to unauthorized users. An attacker probing `getById(999)` gets 404 regardless of whether id 999 belongs to someone else or doesn't exist.
- Middleware RBAC runs once before the handler — role checks are centralized and can't be forgotten. Handler-level role checks scatter across files and are routinely forgotten in new procedures.
- The workspace middleware pattern is the correct architecture for multi-tenant apps — every workspace-scoped procedure automatically validates membership. Forgetting to add the workspace check to one endpoint is a data isolation bug; using a middleware makes it impossible to forget.

---

## I — Interview Q&A

### Q: What is the difference between checking authorization in middleware vs inside the procedure handler?

**A:** Middleware authorization runs before the handler and is procedural — it checks things you can determine without knowing the specific resource (is the user authenticated? do they have the right role? are they a workspace member?). These are structural access rules that apply to all procedures using that middleware. Handler authorization runs after fetching the specific resource — it checks things that require the resource itself (does `post.authorId === ctx.user.id`?). You can't check ownership in middleware because you haven't fetched the resource yet. Use middleware for: authentication, role checks, workspace/tenant membership. Use handler-level checks for: resource ownership, fine-grained field-level permissions, state-dependent checks (e.g., only update a task if its status is not 'completed').

---

## C — Common Pitfalls + Fix

### ❌ Returning 403 FORBIDDEN for non-existent resources — leaks existence

```typescript
// ❌ Reveals that resource 999 exists but belongs to someone else
const post = await ctx.prisma.post.findUnique({ where: { id: 999 } })
if (!post)                       throw new TRPCError({ code: 'NOT_FOUND' })
if (post.authorId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
// An attacker learns: "id 999 exists and belongs to another user" ❌
```

**Fix:** Use scoped query — return 404 for both cases:

```typescript
// ✅ Attacker can't distinguish not-found from unauthorized
const post = await ctx.prisma.post.findFirst({
  where: { id: 999, authorId: ctx.user.id },
})
if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
// Whether id 999 doesn't exist OR belongs to someone else → same 404 ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `deleteComment` protected mutation that: (1) fetches the comment scoped by owner, (2) also allows deletion if the user is an admin (bypass ownership), (3) uses `assertOwnerOrAdmin` helper, (4) deletes the comment and returns the deleted id.

### Solution

```typescript
// src/server/lib/auth-helpers.ts
import { TRPCError } from '@trpc/server'

export function assertOwnerOrAdmin(
  resourceUserId: string,
  currentUserId:  string,
  currentRole:    string,
  label = 'resource'
): void {
  const isOwner = resourceUserId === currentUserId
  const isAdmin = currentRole === 'admin'
  if (!isOwner && !isAdmin) {
    throw new TRPCError({
      code:    'FORBIDDEN',
      message: `You do not have permission to delete this ${label}`,
    })
  }
}

// src/server/routers/comment.ts
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { assertOwnerOrAdmin }                   from '@/server/lib/auth-helpers'
import { TRPCError }                            from '@trpc/server'
import { z }                                    from 'zod'

export const commentRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const comment = await ctx.prisma.comment.findUnique({
        where:  { id: input.id },
        select: { id: true, authorId: true },
      })

      if (!comment) throw new TRPCError({ code: 'NOT_FOUND' })

      // Owner can delete; admin can delete anyone's comment
      assertOwnerOrAdmin(comment.authorId, ctx.user.id, ctx.user.role, 'comment')

      await ctx.prisma.comment.delete({ where: { id: input.id } })

      return { success: true, id: input.id }
    }),
})
```

---

---

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

# 5 — Auth-Aware Context — BetterAuth Session, User Typing

---

## T — TL;DR

Context is where BetterAuth and tRPC connect. `auth.api.getSession({ headers })` reads the session from the cookie, queries the database, and returns the typed `Session | null`. The context carries this session, making the user available in every procedure without repeated lookups. Strong TypeScript typing through the context means `ctx.user.id` is a string, `ctx.user.role` is the exact role type from BetterAuth.

---

## K — Key Concepts

```typescript
// ── src/server/context.ts — full BetterAuth-aware context ─────────────────
import { auth }   from '@/lib/auth'    // BetterAuth instance
import { prisma } from '@/lib/prisma'  // Prisma singleton

// Types from BetterAuth — infer from the auth instance
type SessionData  = typeof auth.$Infer.Session
type UserData     = typeof auth.$Infer.Session.user

interface CreateContextOptions {
  headers: Headers
}

export async function createTRPCContext({ headers }: CreateContextOptions) {
  // BetterAuth reads session token from cookie, queries session table
  const session = await auth.api.getSession({ headers })

  return {
    prisma,
    session,                     // SessionData | null
    user:    session?.user ?? null, // UserData | null
    // Convenience booleans
    isAuthed: session !== null,
    isAdmin:  session?.user?.role === 'admin',
    // Request metadata
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1',
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
// Context.user: UserData | null
// After enforceAuth middleware: Context.user: UserData (non-null)
```

```typescript
// ── Typing the user from BetterAuth additionalFields ──────────────────────
// BetterAuth's $Infer includes additionalFields defined in auth.ts
// If auth.ts has: user: { additionalFields: { role: {...}, plan: {...} } }
// Then: typeof auth.$Infer.Session.user includes role: string, plan: string

// The context automatically carries these extra fields:
// ctx.user.role   → 'admin' | 'moderator' | 'user' | ...
// ctx.user.plan   → 'free' | 'pro' | 'enterprise' | ...
// ctx.user.email  → string
// ctx.user.id     → string
// ctx.user.name   → string
// All typed — no type assertions needed ✅
```

```typescript
// ── Route handler: wiring context to the HTTP adapter ─────────────────────
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
    onError: ({ path, error, type }) => {
      // Log errors in production (send to Sentry, etc.)
      if (process.env.NODE_ENV !== 'development') {
        console.error(`[tRPC/${type}] ${path ?? 'unknown'}:`, error.message)
      } else {
        console.error(`[tRPC] Error on ${path}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }
```

```typescript
// ── Accessing session user in procedures ──────────────────────────────────
const userRouter = createTRPCRouter({
  // Public — session may be null
  isLoggedIn: publicProcedure
    .query(({ ctx }) => ({ authenticated: ctx.isAuthed })),

  // Protected — user is User (non-null after middleware)
  profile: protectedProcedure
    .query(({ ctx }) => {
      // ctx.user is UserData — never null here ✅
      // Includes all additionalFields: role, plan, username, etc.
      return {
        id:       ctx.user.id,
        name:     ctx.user.name,
        email:    ctx.user.email,
        role:     ctx.user.role,    // from additionalFields
        plan:     ctx.user.plan,    // from additionalFields
      }
    }),

  // Admin — only admin can call this
  adminInfo: adminProcedure
    .query(({ ctx }) => ({
      userId: ctx.user.id,
      role:   ctx.user.role,   // guaranteed 'admin' after adminProcedure ✅
    })),
})
```

```typescript
// ── Server Component: passing headers to context ───────────────────────────
// src/app/dashboard/page.tsx
import { createCaller }      from '@/server/root'
import { createTRPCContext } from '@/server/context'
import { headers }           from 'next/headers'   // Next.js headers helper

export default async function DashboardPage() {
  // headers() reads the incoming request headers — includes cookie with session token
  const ctx    = await createTRPCContext({ headers: await headers() })
  const caller = createCaller(ctx)

  // ctx.session is populated — procedures run with full auth context ✅
  const profile = await caller.user.profile()
  return <div>Welcome, {profile.name}</div>
}
```

---

## W — Why It Matters

- `auth.api.getSession` validates the session token against the database on every request — this means revoked sessions are immediately rejected. Unlike JWT, there's no "token is valid until expiry" window after revoking.
- `typeof auth.$Infer.Session.user` picks up `additionalFields` defined in `auth.ts` — if you add `plan` to additionalFields, `ctx.user.plan` is automatically typed in all procedures without any manual type updates. BetterAuth's inference propagates through the context.
- The `headers()` call in Next.js Server Components reads the incoming request headers, including the session cookie. Passing this to `createTRPCContext` means Server Component callers get a fully authenticated context — same session as the corresponding Client Component requests.

---

## I — Interview Q&A

### Q: How does BetterAuth session validation work on each tRPC request, and what are the performance implications?

**A:** On each tRPC request, `createTRPCContext` calls `auth.api.getSession({ headers })`. BetterAuth reads the session token from the `better-auth.session-token` cookie, queries the `session` table (`SELECT * FROM session WHERE token = $1 AND expires_at > NOW()`), and returns the session with the joined user data. This is one database query per request. The performance implication: every tRPC call incurs a session lookup query, even for public procedures (where the result is null). Optimization options: (1) use a Redis cache for session data (BetterAuth supports secondary storage); (2) move session lookup into middleware so it only runs for protected procedures; (3) use connection pooling (PgBouncer) to minimize connection overhead. For most apps, one session query per request is acceptable — it's a primary key lookup and is fast.

---

## C — Common Pitfalls + Fix

### ❌ Calling `auth.api.getSession` inside individual procedure handlers — N session lookups per request

```typescript
// ❌ Session looked up inside each procedure — in a batched request with 3 procedures: 3 queries
list: publicProcedure.query(async ({ ctx }) => {
  const session = await auth.api.getSession({ headers: ??? })  // ← can't even access headers here ❌
  ...
})
```

**Fix:** Session lookup belongs in context — called once per request, shared by all procedures:

```typescript
// ✅ One session lookup in createTRPCContext — shared across all procedures in the request
export async function createTRPCContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers })  // ← once per request ✅
  return { prisma, session, user: session?.user ?? null }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `createTRPCContext` that: (1) reads the BetterAuth session; (2) checks if the user is banned (`bannedAt` field) and throws `FORBIDDEN` with "Account suspended"; (3) exposes `ctx.user`, `ctx.session`, `ctx.prisma`, `ctx.ip`, and `ctx.isBanned`. Export the full `Context` type.

### Solution

```typescript
// src/server/context.ts
import { auth }      from '@/lib/auth'
import { prisma }    from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

interface CreateContextOptions {
  headers: Headers
}

export async function createTRPCContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers })
  const user    = session?.user ?? null

  // Check banned status if user is authenticated
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { bannedAt: true },
    })
    if (dbUser?.bannedAt) {
      // Throw here — the session is valid but the account is suspended
      // This bubbles up as a tRPC error before any procedure runs
      throw new TRPCError({
        code:    'FORBIDDEN',
        message: 'Account suspended. Please contact support.',
      })
    }
  }

  return {
    prisma,
    session,
    user,
    isBanned: false,   // if we reach here, not banned
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? headers.get('x-real-ip')
        ?? '127.0.0.1',
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
// { prisma, session, user: User | null, isBanned: boolean, ip: string }
```

---

---

# 6 — Error Formatting — Custom Shapes, Client Handling

---

## T — TL;DR

`errorFormatter` in `initTRPC` controls the shape of every error response. Attach Zod field errors, request IDs, and safe error messages here. On the client, `TRPCClientError` carries the formatted shape — use `err.data?.zodError?.fieldErrors` for form errors and `err.data?.code` for conditional UI logic.

---

## K — Key Concepts

```typescript
// ── errorFormatter — full implementation ──────────────────────────────────
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError }             from 'zod'
import { randomUUID }           from 'crypto'

const t = initTRPC.context<Context>().create({
  transformer: superjson,

  errorFormatter({ shape, error, ctx, path, input, type }) {
    // shape: the default error shape
    // {
    //   message: string
    //   code:    number (HTTP status)
    //   data: {
    //     code:       string  ('NOT_FOUND', 'UNAUTHORIZED', etc.)
    //     httpStatus: number
    //     path:       string
    //     stack:      string | undefined (dev only)
    //   }
    // }

    return {
      ...shape,
      data: {
        ...shape.data,

        // Zod validation errors — field-level, always attached
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
        // zodError.fieldErrors: { title: ['Too long'], email: ['Invalid email'] }
        // zodError.formErrors:  ['global form error']

        // Request ID for correlating client errors with server logs
        requestId: randomUUID(),

        // Safe user-facing message (don't leak internal errors in production)
        userMessage: getUserMessage(error),

        // Only expose stack trace in development
        stack: process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

function getUserMessage(error: TRPCError | unknown): string {
  if (!(error instanceof TRPCError)) return 'An unexpected error occurred'

  switch (error.code) {
    case 'UNAUTHORIZED':        return 'Please sign in to continue'
    case 'FORBIDDEN':           return error.message || 'You do not have permission'
    case 'NOT_FOUND':           return error.message || 'Resource not found'
    case 'BAD_REQUEST':         return 'Invalid request — check your input'
    case 'TOO_MANY_REQUESTS':   return 'Too many requests — please wait a moment'
    case 'INTERNAL_SERVER_ERROR': return 'Something went wrong on our end'
    default:                    return error.message || 'An error occurred'
  }
}
```

```typescript
// ── Client: handling tRPC errors ───────────────────────────────────────────
'use client'
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'
import { trpc }            from '@/lib/trpc/client'
import { useState }        from 'react'

function CreatePostForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const createPost = trpc.post.create.useMutation({
    onError: (err) => {
      // Zod field errors — from errorFormatter
      const fe = err.data?.zodError?.fieldErrors
      if (fe) {
        setFieldErrors({
          title: fe.title?.[0] ?? '',
          body:  fe.body?.[0]  ?? '',
        })
        return
      }

      // Auth errors — redirect or show inline
      if (err.data?.code === 'UNAUTHORIZED') {
        window.location.href = '/sign-in'
        return
      }

      // Generic error — show user-facing message
      setGlobalError(err.data?.userMessage ?? err.message)
    },
  })

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget as HTMLFormElement)
      createPost.mutate({
        title: fd.get('title') as string,
        body:  fd.get('body')  as string,
      })
    }}>
      <input name="title" />
      {fieldErrors.title && <span style={{ color: 'red' }}>{fieldErrors.title}</span>}
      <textarea name="body" />
      {fieldErrors.body  && <span style={{ color: 'red' }}>{fieldErrors.body}</span>}
      {globalError       && <p style={{ color: 'red' }}>{globalError}</p>}
      <button type="submit" disabled={createPost.isPending}>Submit</button>
    </form>
  )
}
```

```typescript
// ── Global error handler — catch unhandled tRPC errors ────────────────────
// src/lib/trpc/provider.tsx — add onError to queryClient defaults
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        if (error instanceof TRPCClientError) {
          if (error.data?.code === 'UNAUTHORIZED') {
            // Session expired — redirect to sign-in
            window.location.href = '/sign-in'
          }
        }
      },
    },
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error instanceof TRPCClientError) {
          if (['UNAUTHORIZED','FORBIDDEN','NOT_FOUND'].includes(error.data?.code ?? '')) {
            return false
          }
        }
        return failureCount < 2
      },
    },
  },
})
```

```typescript
// ── Type-safe error checking ───────────────────────────────────────────────
import { TRPCClientError } from '@trpc/client'
import type { AppRouter }  from '@/server/root'

// Type guard for tRPC errors
function isTRPCError(err: unknown): err is TRPCClientError<AppRouter> {
  return err instanceof TRPCClientError
}

// In an async function (mutateAsync):
try {
  await createPost.mutateAsync({ title, body })
} catch (err) {
  if (isTRPCError(err)) {
    console.log(err.data?.code)        // 'NOT_FOUND' | 'FORBIDDEN' | ...
    console.log(err.data?.zodError)    // ZodFlattenedErrors | null
    console.log(err.data?.requestId)   // UUID for correlating with server logs
    console.log(err.data?.userMessage) // Safe user-facing string
  }
}
```

---

## W — Why It Matters

- `requestId` in the error shape creates a traceability bridge — when a user reports an error, they can provide the request ID, and you can find the exact server log entry. This is a production debugging superpower.
- The `userMessage` pattern separates safe UI copy from raw error messages — internal `TRPCError` messages may contain stack traces, database error details, or sensitive paths. A curated `userMessage` map ensures users always see something meaningful and safe.
- Disabling retries for `UNAUTHORIZED` and `NOT_FOUND` errors is a correctness issue, not just performance — retrying a 401 three times just means three consecutive auth failures. The TanStack Query retry logic should be aware of tRPC error codes.

---

## I — Interview Q&A

### Q: How do you expose Zod validation errors to the client in tRPC, and what does the data shape look like?

**A:** The `errorFormatter` in `initTRPC.create()` runs every time a procedure throws. When a Zod validation error occurs, `error.cause` is a `ZodError` instance. In the formatter, check `error.cause instanceof ZodError` and call `.flatten()` to get `{ fieldErrors: { fieldName: string[] }, formErrors: string[] }`. Attach this to `shape.data.zodError`. On the client, `useMutation`'s `onError` callback receives the `TRPCClientError` — access `err.data?.zodError?.fieldErrors` to get a record of field names to error message arrays. For example: `{ title: ['Title is required', 'Title too long'], email: ['Invalid email'] }`. This gives you everything needed to display inline form errors without any additional API calls.

---

## C — Common Pitfalls + Fix

### ❌ Throwing raw errors with internal details — leaking server internals

```typescript
// ❌ Leaks database error, table names, or stack trace to the client
.mutation(async ({ input, ctx }) => {
  const result = await ctx.prisma.post.create({ data: input })
  // If this throws PrismaClientKnownRequestError...
  // Without errorFormatter, the full Prisma error is sent to the client ❌
})
```

**Fix:** Catch and re-throw as TRPCError with a safe message:

```typescript
// ✅ Wrap Prisma calls — translate to safe tRPC errors
.mutation(async ({ input, ctx }) => {
  try {
    return await ctx.prisma.post.create({ data: { ...input, authorId: ctx.user.id } })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new TRPCError({
        code:    'CONFLICT',
        message: 'A post with this title already exists.',
      })
    }
    throw new TRPCError({
      code:    'INTERNAL_SERVER_ERROR',
      message: 'Failed to create post.',
      cause:   err,   // logged server-side, not sent to client
    })
  }
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `errorFormatter` that: (1) attaches `zodError`; (2) attaches a `requestId` (UUID); (3) maps error codes to `userMessage` strings; (4) only includes `stack` in development; (5) logs INTERNAL_SERVER_ERROR to console. Then show a React hook `useFormErrors` that extracts field errors from a mutation's error state.

### Solution

```typescript
// src/server/trpc.ts — errorFormatter
import { randomUUID } from 'crypto'
import { ZodError }   from 'zod'

errorFormatter({ shape, error }) {
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    console.error('[tRPC] Internal error:', error.cause ?? error.message)
  }

  const userMessages: Partial<Record<typeof error.code, string>> = {
    UNAUTHORIZED:         'Please sign in to continue.',
    FORBIDDEN:            error.message || 'You do not have permission to do this.',
    NOT_FOUND:            error.message || 'The requested resource was not found.',
    BAD_REQUEST:          'Your request contains invalid data.',
    TOO_MANY_REQUESTS:    'Slow down — too many requests.',
    INTERNAL_SERVER_ERROR:'Something went wrong. We\'ve been notified.',
    CONFLICT:             error.message || 'This resource already exists.',
  }

  return {
    ...shape,
    data: {
      ...shape.data,
      zodError:    error.cause instanceof ZodError ? error.cause.flatten() : null,
      requestId:   randomUUID(),
      userMessage: userMessages[error.code] ?? 'An unexpected error occurred.',
      stack:       process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
    },
  }
},

// src/hooks/useFormErrors.ts — client hook
import { TRPCClientError } from '@trpc/client'
import { useState }        from 'react'
import type { AppRouter }  from '@/server/root'

type FieldErrors = Record<string, string | undefined>

export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleError(err: TRPCClientError<AppRouter>) {
    const fe = err.data?.zodError?.fieldErrors
    if (fe && Object.keys(fe).length > 0) {
      const mapped: FieldErrors = {}
      for (const [key, msgs] of Object.entries(fe)) {
        mapped[key] = msgs?.[0]
      }
      setFieldErrors(mapped)
      setGlobalError(null)
    } else {
      setFieldErrors({})
      setGlobalError(err.data?.userMessage ?? err.message)
    }
  }

  function clearErrors() {
    setFieldErrors({})
    setGlobalError(null)
  }

  return { fieldErrors, globalError, handleError, clearErrors }
}

// Usage:
// const { fieldErrors, globalError, handleError } = useFormErrors()
// const create = trpc.post.create.useMutation({ onError: handleError })
// <input name="title" /> {fieldErrors.title && <span>{fieldErrors.title}</span>}
```

---

---

# 7 — Prisma Integration — Transactions, Error Codes

---

## T — TL;DR

Prisma integrates naturally in tRPC procedure handlers via `ctx.prisma`. Wrap multi-step writes in `ctx.prisma.$transaction()` for atomicity. Catch Prisma-specific error codes (`P2002` unique violation, `P2025` not found) and translate them to typed `TRPCError` responses — never let raw Prisma errors reach the client.

---

## K — Key Concepts

```typescript
// ── Basic Prisma in procedures ────────────────────────────────────────────
const postRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      // findUniqueOrThrow: throws PrismaClientKnownRequestError (P2025) if not found
      ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
      // Note: Prisma P2025 is NOT automatically a TRPCError — must handle it
    ),
})
```

```typescript
// ── Prisma error codes → TRPCError translation ────────────────────────────
import { Prisma }    from '@prisma/client'
import { TRPCError } from '@trpc/server'

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(', ') ?? 'field'
        throw new TRPCError({
          code:    'CONFLICT',
          message: `A record with this ${field} already exists.`,
        })
      }
      case 'P2025': {
        // Record not found (findUniqueOrThrow, update on non-existent row)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Record not found.' })
      }
      case 'P2003': {
        // Foreign key constraint — referenced record doesn't exist
        throw new TRPCError({
          code:    'BAD_REQUEST',
          message: 'Referenced resource does not exist.',
        })
      }
      case 'P2014': {
        // Relation violation
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Relation constraint violation.' })
      }
    }
  }
  // Unknown error — re-throw as internal
  throw new TRPCError({
    code:    'INTERNAL_SERVER_ERROR',
    message: 'Database error.',
    cause:   err,
  })
}

// Usage:
create: protectedProcedure
  .input(createPostSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      return await ctx.prisma.post.create({
        data: { ...input, authorId: ctx.user.id },
      })
    } catch (err) {
      handlePrismaError(err)   // translates and re-throws as TRPCError ✅
    }
  }),
```

```typescript
// ── Transactions in tRPC procedures ───────────────────────────────────────
const orderRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity:  z.number().min(1),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.$transaction(async (tx) => {
          // 1. Create order
          const order = await tx.order.create({
            data: { customerId: ctx.user.id, status: 'pending', total: 0 },
          })

          // 2. Verify stock and create items
          let total = 0
          for (const item of input.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            })
            if (!product) {
              throw new TRPCError({
                code:    'BAD_REQUEST',
                message: `Product ${item.productId} not found`,
              })
            }
            if (product.stockCount < item.quantity) {
              throw new TRPCError({
                code:    'BAD_REQUEST',
                message: `Insufficient stock for ${product.name}`,
              })
            }

            await tx.orderItem.create({
              data: {
                orderId:   order.id,
                productId: item.productId,
                quantity:  item.quantity,
                unitPrice: product.price,
              },
            })

            await tx.product.update({
              where: { id: item.productId },
              data:  { stockCount: { decrement: item.quantity } },
            })

            total += Number(product.price) * item.quantity
          }

          // 3. Update order total
          return tx.order.update({
            where: { id: order.id },
            data:  { total, status: 'confirmed' },
          })
          // All steps commit together or all rollback ✅
        })
      } catch (err) {
        if (err instanceof TRPCError) throw err   // re-throw our own errors
        handlePrismaError(err)                    // translate Prisma errors
      }
    }),
})
```

```typescript
// ── findUniqueOrThrow + automatic P2025 handling ──────────────────────────
// Option: wrap findUniqueOrThrow to auto-translate P2025
async function findOrThrow<T>(
  findFn: () => Promise<T>,
  message = 'Record not found'
): Promise<T> {
  try {
    return await findFn()
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw new TRPCError({ code: 'NOT_FOUND', message })
    }
    throw err
  }
}

// Usage:
const post = await findOrThrow(
  () => ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } }),
  'Post not found'
)
```

---

## W — Why It Matters

- `$transaction` in tRPC procedures is the correct pattern for multi-step writes — creating an order + order items + decrementing stock must be atomic. If any step fails (out of stock, FK violation), the whole operation rolls back. Never do multi-step writes without a transaction.
- `handlePrismaError` as a shared function standardizes Prisma → tRPC error translation across all routers. Without it, P2002 from a unique violation shows as a cryptic `INTERNAL_SERVER_ERROR` to the client instead of a meaningful `CONFLICT` with a field name.
- Catching your own `TRPCError` before the Prisma error handler (the `if (err instanceof TRPCError) throw err` pattern) ensures that validation errors thrown inside a transaction body are re-thrown as-is, not re-wrapped as database errors.

---

## I — Interview Q&A

### Q: How do you handle Prisma errors in tRPC procedures without leaking internal details?

**A:** Create a `handlePrismaError(err)` helper that catches `Prisma.PrismaClientKnownRequestError` and maps known codes to `TRPCError`. For P2002 (unique constraint), throw `CONFLICT` with the field name extracted from `err.meta.target`. For P2025 (record not found), throw `NOT_FOUND`. For P2003 (FK constraint), throw `BAD_REQUEST`. For unknown Prisma errors, throw `INTERNAL_SERVER_ERROR` with the original as `cause` (cause is logged server-side but not sent to the client). The `cause` field on `TRPCError` is never serialised into the HTTP response — it's only available for server-side logging. Call this helper in a try-catch around every Prisma operation that might fail with a constraint violation or not-found error.

---

## C — Common Pitfalls + Fix

### ❌ Throwing TRPCError inside `$transaction` without catching it — Prisma wraps it

```typescript
// ❌ TRPCError thrown inside $transaction is caught by Prisma and re-wrapped
await ctx.prisma.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: 1 } })
  if (!product) throw new TRPCError({ code: 'NOT_FOUND' })  // ← Prisma catches this
  // Prisma transaction catches the TRPCError and may re-throw as PrismaClientKnownRequestError
})
// Client receives INTERNAL_SERVER_ERROR ❌ instead of NOT_FOUND
```

**Fix:** Re-throw `TRPCError` after the transaction:

```typescript
// ✅ Catch TRPCError first, let Prisma handle the rest
try {
  await ctx.prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: 1 } })
    if (!product) throw new TRPCError({ code: 'NOT_FOUND' })
    // ...
  })
} catch (err) {
  if (err instanceof TRPCError) throw err   // ← re-throw our error as-is ✅
  handlePrismaError(err)                    // translate other errors
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `transferCredits` mutation that: atomically debits credits from one user and credits another; throws `BAD_REQUEST` if the source user has insufficient credits; throws `NOT_FOUND` if either user doesn't exist; wraps Prisma errors; returns `{ from: number, to: number, amount: number }`.

### Solution

```typescript
// src/server/routers/wallet.ts
import { createTRPCRouter, protectedProcedure } from '@/server/trpc'
import { TRPCError }   from '@trpc/server'
import { Prisma }      from '@prisma/client'
import { z }           from 'zod'

export const walletRouter = createTRPCRouter({
  transfer: protectedProcedure
    .input(z.object({
      toUserId: z.string().min(1),
      amount:   z.number().int().positive().max(100_000),
    }))
    .mutation(async ({ input, ctx }) => {
      const fromUserId = ctx.user.id

      if (fromUserId === input.toUserId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot transfer to yourself' })
      }

      try {
        return await ctx.prisma.$transaction(async (tx) => {
          // Fetch both users with locking (SELECT FOR UPDATE via Prisma raw or just update)
          const [fromUser, toUser] = await Promise.all([
            tx.user.findUnique({ where: { id: fromUserId }, select: { id: true, credits: true } }),
            tx.user.findUnique({ where: { id: input.toUserId }, select: { id: true, credits: true } }),
          ])

          if (!fromUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sender not found' })
          if (!toUser)   throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipient not found' })

          if (fromUser.credits < input.amount) {
            throw new TRPCError({
              code:    'BAD_REQUEST',
              message: `Insufficient credits. Have: ${fromUser.credits}, need: ${input.amount}`,
            })
          }

          const [updatedFrom, updatedTo] = await Promise.all([
            tx.user.update({
              where: { id: fromUserId },
              data:  { credits: { decrement: input.amount } },
              select: { credits: true },
            }),
            tx.user.update({
              where: { id: input.toUserId },
              data:  { credits: { increment: input.amount } },
              select: { credits: true },
            }),
          ])

          return {
            from:   updatedFrom.credits,
            to:     updatedTo.credits,
            amount: input.amount,
          }
        })
      } catch (err) {
        if (err instanceof TRPCError) throw err
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Transfer failed', cause: err })
      }
    }),
})
```

---

---

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