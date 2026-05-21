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
