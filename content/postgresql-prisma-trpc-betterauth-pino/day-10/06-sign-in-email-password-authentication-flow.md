# 6 — Sign In — Email & Password Authentication Flow

---

## T — TL;DR

Sign-in verifies the password against the stored bcrypt hash and creates a new session row. On the client, call `authClient.signIn.email({ email, password })`. On failure, BetterAuth returns typed error codes (`INVALID_EMAIL_OR_PASSWORD`). Never reveal which of email or password was wrong — always use a generic error message.

---

## K — Key Concepts

```typescript
// ── Client-side sign-in ────────────────────────────────────────────────────
import { authClient } from '@/lib/auth-client'

const { data, error } = await authClient.signIn.email({
  email:       'mark@example.com',
  password:    'mysecurepassword',
  callbackURL: '/dashboard',   // optional redirect after sign-in
  rememberMe:  true,            // optional: extends session duration
})

if (error) {
  // error.code: 'INVALID_EMAIL_OR_PASSWORD' | 'EMAIL_NOT_VERIFIED' | ...
  // Show generic message — never reveal which field was wrong
  console.error('Sign in failed')
}
// On success: session cookie set, data.user available
```

```typescript
// ── React sign-in form ─────────────────────────────────────────────────────
'use client'
import { useState }   from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter }  from 'next/navigation'

export function SignInForm() {
  const router  = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd       = new FormData(e.currentTarget)
    const email    = fd.get('email')    as string
    const password = fd.get('password') as string

    const { error } = await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      // ✅ Generic message — never say "email not found" or "wrong password"
      setError('Invalid email or password.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email"    type="email"    required placeholder="Email" />
      <input name="password" type="password" required placeholder="Password" />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
```

```
── What BetterAuth does on sign-in (server side) ────────────────────────────

  POST /api/auth/sign-in/email
  Body: { email, password }

  1. Find user: SELECT * FROM user WHERE email = $1
     → Not found: return 401 { code: 'INVALID_EMAIL_OR_PASSWORD' }
                  (same error code as wrong password — prevents email enumeration)
  2. Find account: SELECT * FROM account WHERE user_id = $1 AND provider_id = 'credential'
  3. Verify password: bcrypt.compare(password, account.password)
     → Fails: return 401 { code: 'INVALID_EMAIL_OR_PASSWORD' }
  4. Check emailVerified if requireEmailVerification: true
     → Not verified: return 403 { code: 'EMAIL_NOT_VERIFIED' }
  5. Create session:
     INSERT INTO session (id, token, user_id, expires_at, ip_address, user_agent) VALUES (...)
  6. Set session cookie
  7. Return: { user: { id, name, email, role, ... }, session: { ... } }
```

```typescript
// ── rememberMe — extended session ─────────────────────────────────────────
// BetterAuth supports rememberMe to override the default session duration

const { data, error } = await authClient.signIn.email({
  email,
  password,
  rememberMe: true,   // extends cookie expiry to match session.expiresIn
  // Without rememberMe: session ends when browser closes (session cookie)
  // With rememberMe:    session persists until expiresAt (persistent cookie)
})

// To enable in auth.ts:
emailAndPassword: {
  enabled: true,
}
// rememberMe is handled automatically — no extra config needed
```

```typescript
// ── Rate limiting sign-in — protect against brute force ───────────────────
// BetterAuth has built-in rate limiting (check docs for your version)
// For additional protection, add at the route or middleware level:

import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis:     Redis.fromEnv(),
  limiter:   Ratelimit.slidingWindow(5, '1 m'),  // 5 attempts per minute per IP
  analytics: true,
})

// In src/app/api/auth/[...all]/route.ts wrapper:
export async function POST(req: NextRequest) {
  const ip       = req.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(`sign-in:${ip}`)

  if (!success) {
    return Response.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
  }

  return auth.handler(req)
}
```

---

## W — Why It Matters

- BetterAuth returns the same error code (`INVALID_EMAIL_OR_PASSWORD`) whether the email doesn't exist or the password is wrong — this prevents email enumeration attacks where an attacker could check whether an email is registered by testing different error responses.
- `router.refresh()` after sign-in is required for Next.js Server Components to pick up the new session — without it, protected server components may still render as unauthenticated immediately after sign-in because they read the session at render time from the initial request.
- Rate limiting sign-in attempts is not optional in production — without it, a brute force attack against a known email (harvested from a data breach) can cycle through thousands of common passwords. Even 5 attempts per minute per IP makes brute force impractical.

---

## I — Interview Q&A

### Q: Why should sign-in always return the same error message for both "email not found" and "wrong password"?

**A:** Returning different messages for each case enables email enumeration — an attacker can determine whether a specific email address is registered in your system by observing the error response. If "email not found" and "wrong password" produce different messages, an attacker can silently enumerate millions of email addresses and build a list of valid accounts, then target those accounts with credential stuffing (using leaked passwords from other breaches). BetterAuth uses the same error code `INVALID_EMAIL_OR_PASSWORD` for both cases by design. Your UI should always show a generic message: "Invalid email or password" — never "we couldn't find an account with that email" or "incorrect password".

---

## C — Common Pitfalls + Fix

### ❌ Revealing which field failed in the error message — email enumeration

```typescript
// ❌ Different messages expose whether the email exists
if (error?.code === 'USER_NOT_FOUND') {
  setError('No account found with this email.')    // ← reveals email doesn't exist ❌
} else if (error?.code === 'INVALID_PASSWORD') {
  setError('Incorrect password.')                  // ← reveals email exists ❌
}
```

**Fix:** Always use a single generic message:

```typescript
// ✅ Same message for all auth failures
if (error) {
  setError('Invalid email or password.')   // no information leakage ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete sign-in flow with: (1) client-side form with email, password, and rememberMe checkbox; (2) proper generic error message; (3) loading state; (4) redirect to `returnTo` query param after sign-in (or `/dashboard` as default); (5) `router.refresh()` call.

### Solution

```typescript
'use client'
import { useState }      from 'react'
import { authClient }    from '@/lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'

export function SignInForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const returnTo     = searchParams.get('returnTo') ?? '/dashboard'

  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd       = new FormData(e.currentTarget)
    const email    = fd.get('email')    as string
    const password = fd.get('password') as string

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    })

    setLoading(false)

    if (error) {
      setError('Invalid email or password.')   // generic — no enumeration ✅
      return
    }

    // Validate returnTo is a relative path (prevent open redirect)
    const safePath = returnTo.startsWith('/') ? returnTo : '/dashboard'
    router.push(safePath)
    router.refresh()   // server components pick up new session ✅
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>

      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>

      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
        />
        Remember me
      </label>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
```

---

---
