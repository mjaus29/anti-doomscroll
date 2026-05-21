# 5 — Sign Up — Email & Password Registration Flow

---

## T — TL;DR

Sign-up with BetterAuth creates a `user` row and an `account` row (with bcrypt-hashed password) in one operation. On the client, call `authClient.signUp.email({ name, email, password })`. On success, BetterAuth automatically signs the user in and sets the session cookie. The server validates email uniqueness, hashes the password (bcrypt, cost 10 by default), and returns the user object.

---

## K — Key Concepts

```typescript
// ── Client-side sign-up ────────────────────────────────────────────────────
import { authClient } from '@/lib/auth-client'

async function handleSignUp(name: string, email: string, password: string) {
  const { data, error } = await authClient.signUp.email({
    name,
    email,
    password,
    // Custom additional fields defined in user.additionalFields:
    username: 'mark97',
    // role: 'admin'  ← blocked because input: false in config
    callbackURL: '/dashboard',  // redirect after sign-up (optional)
  })

  if (error) {
    // error.code: 'USER_ALREADY_EXISTS' | 'VALIDATION_ERROR' | ...
    console.error(error.message)
    return
  }

  // data.user: { id, name, email, role, ... }
  // Session cookie is automatically set by BetterAuth ✅
  // Redirect happens via callbackURL or manually:
  window.location.href = '/dashboard'
}
```

```typescript
// ── React sign-up form ─────────────────────────────────────────────────────
'use client'
import { useState }    from 'react'
import { authClient }  from '@/lib/auth-client'
import { useRouter }   from 'next/navigation'

export function SignUpForm() {
  const router = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd       = new FormData(e.currentTarget)
    const name     = fd.get('name')     as string
    const email    = fd.get('email')    as string
    const password = fd.get('password') as string

    const { error } = await authClient.signUp.email({ name, email, password })

    setLoading(false)

    if (error) {
      setError(
        error.code === 'USER_ALREADY_EXISTS'
          ? 'An account with this email already exists.'
          : error.message ?? 'Sign-up failed. Please try again.'
      )
      return
    }

    router.push('/dashboard')
    router.refresh()  // force server component re-render to pick up new session
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="name"     type="text"     required placeholder="Full name" />
      <input name="email"    type="email"    required placeholder="Email" />
      <input name="password" type="password" required minLength={8} placeholder="Password" />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Sign Up'}
      </button>
    </form>
  )
}
```

```
── What BetterAuth does on sign-up (server side) ────────────────────────────

  POST /api/auth/sign-up/email
  Body: { name, email, password, username? }

  1. Validate input (email format, password length from config)
  2. Check user uniqueness: SELECT * FROM user WHERE email = $1
     → If exists: return 422 { code: 'USER_ALREADY_EXISTS' }
  3. Hash password: bcrypt(password, costFactor=10)
  4. Create user row:
     INSERT INTO user (id, name, email, email_verified, role, username, ...) VALUES (...)
  5. Create account row (email/password provider):
     INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES (...)
     account.providerId = 'credential'
     account.password   = bcrypt hash
  6. Create session:
     INSERT INTO session (id, token, user_id, expires_at, ...) VALUES (...)
  7. Set session cookie in response
  8. Return: { user: { id, name, email, role, ... } }
```

```typescript
// ── Server-side sign-up validation — add Zod before reaching BetterAuth ───
// In a tRPC or API handler, validate before calling authClient:

import { z } from 'zod'

const signUpSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string()
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only')
    .min(3).max(30)
    .optional(),
})

// BetterAuth also validates, but Zod catches obvious errors earlier
// and provides better error messages for form fields
```

---

## W — Why It Matters

- BetterAuth creates both the `user` and `account` rows atomically — if one fails, neither is created. This prevents the scenario where a user row exists but has no linked credential, leaving the user unable to sign in.
- `router.refresh()` after sign-up/sign-in is required in Next.js App Router because Server Components read the session from the request. After a client-side sign-in, the Server Component state doesn't automatically update — `router.refresh()` forces a re-render from the server, which picks up the new session cookie.
- Never return password hashes to the client — BetterAuth's sign-up response excludes the `account.password` field automatically. If you query the `user` directly with Prisma in an API response, always `select` specific fields and exclude the `accounts` relation (which contains the password hash).

---

## I — Interview Q&A

### Q: What happens server-side when a user submits a sign-up form to BetterAuth?

**A:** BetterAuth receives a `POST /api/auth/sign-up/email` with `{ name, email, password }`. It first validates the input against the configured constraints (min/max password length, email format). Then it queries the database for an existing user with that email — returning a `USER_ALREADY_EXISTS` error if found. On success: it hashes the password using bcrypt with the configured cost factor (default 10), creates a `user` row, and creates an `account` row with `providerId: 'credential'` and the bcrypt hash stored in the `password` column. It then creates a `session` row with a new random token and sets the session cookie in the HTTP response. The response body contains the user object (without password hash). All database writes happen within the same operation — if any step fails, no partial data is committed.

---

## C — Common Pitfalls + Fix

### ❌ Not calling `router.refresh()` after sign-up — server components don't see the session

```typescript
// ❌ Server components still show "not logged in" after sign-up
const { error } = await authClient.signUp.email({ ... })
if (!error) router.push('/dashboard')
// Server component at /dashboard runs with old request — no session yet ❌
```

**Fix:** Call `router.refresh()` to force server re-render:

```typescript
// ✅
const { error } = await authClient.signUp.email({ ... })
if (!error) {
  router.push('/dashboard')
  router.refresh()  // forces server components to re-read session from cookie ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete sign-up API route (Next.js App Router) that: (1) validates input with Zod (name, email, password, optional username with regex), (2) calls `auth.api.signUpEmail` (server-side API), (3) returns typed success/error responses, (4) handles `USER_ALREADY_EXISTS` separately from other errors. Use the server-side BetterAuth API, not the client.

### Solution

```typescript
// src/app/api/register/route.ts
import { auth }    from '@/lib/auth'
import { z }       from 'zod'
import { NextRequest } from 'next/server'

const schema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string()
    .regex(/^[a-z0-9_]+$/)
    .min(3)
    .max(30)
    .optional(),
})

export async function POST(req: NextRequest) {
  // 1. Parse and validate
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: 'validation', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { name, email, password, username } = parsed.data

  try {
    // 2. Server-side BetterAuth sign-up
    const result = await auth.api.signUpEmail({
      body: { name, email, password, username },
    })

    return Response.json(
      { success: true, user: { id: result.user.id, email: result.user.email } },
      { status: 201 },
    )
  } catch (err: any) {
    // 3. Handle known BetterAuth errors
    if (err?.body?.code === 'USER_ALREADY_EXISTS') {
      return Response.json(
        { error: 'email_taken', message: 'An account with this email already exists.' },
        { status: 422 },
      )
    }

    console.error('[register]', err)
    return Response.json(
      { error: 'internal', message: 'Registration failed. Please try again.' },
      { status: 500 },
    )
  }
}
```

---

---
