# 8 — Output Validators — Return Type Safety

---

## T — TL;DR

`.output(zodSchema)` validates what the procedure returns. It's optional — without it, the return type is inferred from TypeScript. Use `.output()` to strip sensitive fields from responses, enforce a contract when the handler could return different shapes, or document the API surface explicitly.

---

## K — Key Concepts

```typescript
// ── Output validation — strip sensitive fields ─────────────────────────────
import { z } from 'zod'

const publicUserSchema = z.object({
  id:       z.number(),
  name:     z.string(),
  username: z.string().nullable(),
  image:    z.string().nullable(),
  // NO: email, role, plan, createdAt — not exposed publicly
})

const postRouter = createTRPCRouter({
  getAuthor: publicProcedure
    .input(z.object({ id: z.number() }))
    .output(publicUserSchema)   // ← strip: email, role, plan not returned ✅
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: input.id } })
      return user  // Zod strips fields not in publicUserSchema
      // Even if prisma returns email/role, .output() removes them before sending
    }),
})
// Client type: { id: number; name: string; username: string | null; image: string | null }
// email, role NOT in the client type ✅
```

```typescript
// ── Output inference vs explicit output ───────────────────────────────────

// Without .output() — TypeScript infers from the handler
const getPost = publicProcedure
  .input(z.object({ id: z.number() }))
  .query(({ input, ctx }) =>
    ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
  )
// Return type: Promise<Post>  (full Prisma Post type — all fields)
// ↑ This is fine if you want all fields returned

// With .output() — explicit contract + runtime stripping
const getPost = publicProcedure
  .input(z.object({ id: z.number() }))
  .output(z.object({
    id:        z.number(),
    title:     z.string(),
    createdAt: z.date(),
    // authorId: omitted — not exposed
  }))
  .query(({ input, ctx }) =>
    ctx.prisma.post.findUniqueOrThrow({ where: { id: input.id } })
  )
// Client type: { id: number; title: string; createdAt: Date }
// authorId NOT in client type — Zod stripped it ✅
```

```typescript
// ── When to use .output() ─────────────────────────────────────────────────

// ✅ USE .output() when:
// - Returning user data that contains sensitive fields (email, role, passwordHash)
// - The return type is ambiguous (multiple code paths, complex conditionals)
// - You want to enforce a stable API contract (even if Prisma model changes)
// - Public-facing API where you want to document the exact response shape

// ❌ SKIP .output() when:
// - The handler has a clear, single return type (most CRUD operations)
// - You want the full Prisma type on the client (all fields needed)
// - Performance is critical (output validation adds runtime overhead per record)

// ── Output validation overhead ────────────────────────────────────────────
// Zod validates EVERY row in an array output
// For large lists (100+ items), this adds measurable cost
// Alternative: select only the fields you need in the Prisma query
ctx.prisma.post.findMany({
  select: { id: true, title: true, createdAt: true }  // don't fetch authorId at all
})
// Then .output() is less necessary — Prisma already limits the fields
```

```typescript
// ── Combining input and output schemas ────────────────────────────────────
const createPost = protectedProcedure
  .input(z.object({
    title:     z.string().min(1).max(200),
    body:      z.string().min(1),
    published: z.boolean().default(false),
  }))
  .output(z.object({
    id:        z.number(),
    title:     z.string(),
    published: z.boolean(),
    createdAt: z.date(),
    // No body in response — client doesn't need to re-receive what it sent
  }))
  .mutation(({ input, ctx }) =>
    ctx.prisma.post.create({
      data:   { ...input, authorId: ctx.user.id },
      select: { id: true, title: true, published: true, createdAt: true },
    })
  )
```

---

## W — Why It Matters

- `.output()` is a security layer — Prisma returns everything in a row by default. Without output validation, a `findUnique` on `User` returns `email`, `role`, `plan` to the client. `.output()` strips unlisted fields before serialisation, preventing accidental data leakage.
- Explicit output schemas create a stable API contract — if you add a column to the Prisma model, it won't automatically appear in the API response (because `.output()` only returns declared fields). This prevents unintentional data exposure when schema evolves.
- The performance trade-off is real — Zod validates every item in an array. For a `findMany` returning 50 posts, that's 50 Zod parse operations. The alternative (Prisma `select`) is more efficient and achieves the same result (only returning declared fields).

---

## I — Interview Q&A

### Q: Why might you choose Prisma `select` over tRPC `.output()` to limit returned fields?

**A:** Both approaches limit which fields the client receives, but they operate at different layers. Prisma `select` limits at the database query level — only the selected columns are fetched from PostgreSQL, reducing data transfer between DB and server. tRPC `.output()` limits at the serialisation level — all columns are fetched from the database, but Zod strips unlisted fields before sending to the client. From a performance perspective, `select` is more efficient — you're not fetching data you don't need. From a security perspective, both work, but `select` has a slight advantage because the data never enters memory. Use `select` as the primary mechanism for field limiting, and reserve `.output()` for cases where you want TypeScript to enforce the response contract or strip fields from a query that must return all columns for other reasons.

---

## C — Common Pitfalls + Fix

### ❌ Returning sensitive user data without `.output()` or `select`

```typescript
// ❌ Returns ALL user fields including email, role, plan to the client
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
    // Returns: { id, email, name, role, plan, emailVerified, ... } — too much ❌
  ),
```

**Fix:** Use `select` or `.output()`:

```typescript
// ✅ Option A: Prisma select (preferred for performance)
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({
      where:  { id: input.userId },
      select: { id: true, name: true, username: true, image: true },
    })
  ),

// ✅ Option B: .output() for explicit contract
getProfile: publicProcedure
  .input(z.object({ userId: z.string() }))
  .output(z.object({ id: z.string(), name: z.string(), username: z.string().nullable() }))
  .query(({ input, ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: input.userId } })
  ),
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `getMe` protected procedure that returns the current user's full profile for a settings page — including `plan` and `role` (the user should see their own role/plan). Write a `getPublicProfile` public procedure that returns only public fields. Use `.output()` on `getPublicProfile` and Prisma `select` on `getMe`.

### Solution

```typescript
// src/server/routers/user.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z }         from 'zod'

const publicProfileSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  username: z.string().nullable(),
  image:    z.string().nullable(),
  // No: email, role, plan, emailVerified
})

export const userRouter = createTRPCRouter({
  // User sees their own full profile — use Prisma select
  getMe: protectedProcedure
    .query(({ ctx }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where:  { id: ctx.user.id },
        select: {
          id:            true,
          name:          true,
          email:         true,
          username:      true,
          image:         true,
          role:          true,
          plan:          true,
          emailVerified: true,
          createdAt:     true,
          // No: accounts (contains password hash) — never expose
        },
      })
    ),
  // Return type: { id, name, email, username, image, role, plan, emailVerified, createdAt }

  // Public profile — explicit output schema strips everything private
  getPublicProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .output(publicProfileSchema)
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      return user   // Zod strips email, role, plan before sending ✅
    }),
})
```

---

---
