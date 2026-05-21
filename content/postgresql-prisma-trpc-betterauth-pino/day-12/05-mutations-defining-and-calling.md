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
