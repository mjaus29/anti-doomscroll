# 9 — Server-Side Usage — `auth.api`, `getSession`, Route Protection

---

## T — TL;DR

On the server, use `auth.api.getSession({ headers: request.headers })` to read the current session from the incoming request's cookies. This works in Next.js Server Components, Route Handlers, and Server Actions. Use Next.js `middleware.ts` to protect routes at the edge before rendering. The session returned is fully typed from your auth config.

---

## K — Key Concepts

```typescript
// ── Reading session in a Server Component ─────────────────────────────────
// src/app/dashboard/page.tsx
import { auth }   from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),   // Next.js 15+: headers() is async
  })

  if (!session) {
    redirect('/sign-in?returnTo=/dashboard')
  }

  // session.user is fully typed ✅
  return (
    <main>
      <h1>Welcome, {session.user.name}</h1>
      <p>Role: {session.user.role}</p>
    </main>
  )
}
```

```typescript
// ── Reading session in a Route Handler ────────────────────────────────────
// src/app/api/profile/route.ts
import { auth }        from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({
    user: {
      id:       session.user.id,
      email:    session.user.email,
      name:     session.user.name,
      role:     session.user.role,
    }
  })
}
```

```typescript
// ── Reading session in a Server Action ────────────────────────────────────
// src/actions/update-profile.ts
'use server'
import { auth }    from '@/lib/auth'
import { headers } from 'next/headers'

export async function updateProfileAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  // ... update user in DB using session.user.id
}
```

```typescript
// ── Middleware — protect routes at the edge ───────────────────────────────
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/lib/auth'

// Routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/settings', '/admin']
// Routes that require admin role
const ADMIN_PATHS     = ['/admin']

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  const pathname = req.nextUrl.pathname
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  const isAdmin     = ADMIN_PATHS.some(p => pathname.startsWith(p))

  // Redirect unauthenticated users to sign-in
  if (isProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname  = '/sign-in'
    url.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect non-admins away from admin paths
  if (isAdmin && session?.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}
```

```typescript
// ── Utility: requireSession helper ────────────────────────────────────────
// src/lib/require-session.ts
import { auth }    from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Session, User } from '@/lib/auth'

export async function requireSession(): Promise<{
  session: Session['session']
  user:    User
}> {
  const result = await auth.api.getSession({ headers: await headers() })

  if (!result) {
    redirect('/sign-in')
  }

  return result
}

export async function requireAdmin(): Promise<{
  session: Session['session']
  user:    User
}> {
  const result = await requireSession()

  if (result.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return result
}

// Usage in Server Components:
export default async function AdminPage() {
  const { user } = await requireAdmin()
  return <h1>Admin: {user.name}</h1>
}
```

---

## W — Why It Matters

- Server-side session checks are the real security boundary — client-side `useSession` checks are UX-only. An attacker can bypass client-side checks by calling your API directly. Always check the session in Route Handlers, Server Actions, and Server Components before returning sensitive data or performing mutations.
- Next.js middleware runs at the edge (before the page renders) — this means the redirect for unauthenticated users happens before any data fetching or rendering, making protected pages feel instant rather than rendering a flash of content before redirecting.
- The `requireSession()` helper pattern eliminates repetitive `if (!session) redirect(...)` boilerplate across Server Components — define it once, use it everywhere, and TypeScript infers the non-null session type after the call.

---

## I — Interview Q&A

### Q: How do you protect a Next.js App Router page from unauthenticated access, and what are the two levels of protection?

**A:** There are two levels. The first is **middleware protection** in `src/middleware.ts` — it runs at the edge before any page renders, reads the session cookie, and redirects unauthenticated users to the sign-in page. This is efficient and prevents even the page's Server Components from executing. Configure the `matcher` to cover protected path patterns. The second is **component-level protection** in the Server Component itself — calling `auth.api.getSession({ headers: await headers() })` and redirecting if the session is null. This is the security backstop — it catches cases where middleware config doesn't cover a path, or where you need fine-grained checks (e.g. "user can only view their own profile"). Both layers are defense-in-depth: middleware is fast and broad, component-level is thorough and specific.

---

## C — Common Pitfalls + Fix

### ❌ Relying only on client-side `useSession` for data protection — no server-side check

```typescript
// ❌ API route with no auth check — anyone can call it
export async function GET() {
  const users = await prisma.user.findMany()   // returns all users to anyone ❌
  return Response.json(users)
}
```

**Fix:** Always check session server-side in API routes:

```typescript
// ✅ Auth check before any data access
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany()
  return Response.json(users)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete protected API route for a user's own profile: `GET /api/me` returns the authenticated user's profile + order count; `PATCH /api/me` updates the user's `name` and `username` (with Zod validation). Both endpoints must: verify the session, operate only on the authenticated user's own data, return proper error codes.

### Solution

```typescript
// src/app/api/me/route.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { z }           from 'zod'
import { NextRequest } from 'next/server'

// ── GET /api/me ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [user, orderCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where:  { id: session.user.id },
      select: { id: true, name: true, email: true, username: true,
                role: true, plan: true, createdAt: true },
    }),
    prisma.order.count({ where: { customerId: session.user.id } }),
  ])

  return Response.json({ user, orderCount })
}

// ── PATCH /api/me ──────────────────────────────────────────────────────────
const updateSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  username: z.string().regex(/^[a-z0-9_]+$/).min(3).max(30).optional(),
}).refine(data => data.name || data.username, {
  message: 'At least one field must be provided'
})

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'validation', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  try {
    const updated = await prisma.user.update({
      where:  { id: session.user.id },   // always scope to authenticated user ✅
      data:   parsed.data,
      select: { id: true, name: true, username: true, updatedAt: true },
    })
    return Response.json({ user: updated })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return Response.json({ error: 'username_taken' }, { status: 422 })
    }
    throw err
  }
}
```

---

---
