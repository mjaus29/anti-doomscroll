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
