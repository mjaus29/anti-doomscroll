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
