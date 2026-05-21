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
