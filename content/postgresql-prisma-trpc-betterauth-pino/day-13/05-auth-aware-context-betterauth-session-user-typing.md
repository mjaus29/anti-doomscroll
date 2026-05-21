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
