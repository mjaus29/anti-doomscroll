# 7 — Sign Out — Session Invalidation and Cleanup

---

## T — TL;DR

Sign-out deletes the session row from the database and clears the session cookie. Call `authClient.signOut()` from the client. The session token becomes invalid immediately — subsequent requests with that cookie return no session. Always redirect after sign-out and call `router.refresh()` to clear server component state.

---

## K — Key Concepts

```typescript
// ── Client-side sign-out ───────────────────────────────────────────────────
import { authClient } from '@/lib/auth-client'

// Simple sign-out
await authClient.signOut()
// Sends POST /api/auth/sign-out
// BetterAuth deletes the session row, clears the cookie
// Returns: { success: true }

// With redirect
const { error } = await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push('/sign-in')
      router.refresh()   // clear server component session state ✅
    }
  }
})
```

```typescript
// ── Sign-out button component ──────────────────────────────────────────────
'use client'
import { authClient } from '@/lib/auth-client'
import { useRouter }  from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/sign-in')
          router.refresh()
        },
      },
    })
  }

  return (
    <button onClick={handleSignOut} type="button">
      Sign Out
    </button>
  )
}
```

```typescript
// ── Server-side sign-out (API route) ──────────────────────────────────────
// For sign-out via a form action or server-side redirect:

// src/app/api/auth/sign-out/route.ts  (or use the catch-all — this is for illustration)
import { auth }        from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  await auth.api.signOut({ headers: req.headers })
  // auth.api.signOut reads the session cookie, deletes the session row,
  // and returns headers with cookie-clearing Set-Cookie

  return Response.redirect(new URL('/sign-in', req.url))
}
```

```
── What BetterAuth does on sign-out ─────────────────────────────────────────

  POST /api/auth/sign-out
  Cookie: better-auth.session-token=<token>

  1. Read session token from cookie
  2. DELETE FROM session WHERE token = $1
  3. Set cookie: better-auth.session-token=; Max-Age=0; HttpOnly
     (expired cookie tells browser to delete it)
  4. Return: { success: true }

  After sign-out:
  - The token in the browser cookie is deleted
  - The session row is gone from PostgreSQL
  - Even if someone had the old token, it returns no session ✅
```

```typescript
// ── Sign out all sessions for a user — "log out everywhere" ───────────────
import { prisma } from '@/lib/prisma'

async function signOutAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  })
  // All session tokens for this user are now invalid ✅
  // The user will be signed out on their next request on all devices
}

// Use case: password change, suspected account compromise, admin action
```

---

## W — Why It Matters

- Sign-out immediately deletes the session row — unlike JWTs which remain valid until expiry, database sessions are revoked the instant you delete the row. This is critical for "I think my account was compromised — log out all sessions" features.
- `router.refresh()` is required after sign-out in Next.js App Router — without it, the user sees the dashboard but the session cookie is gone. The server components still show cached authenticated content until the page is fully refreshed.
- "Log out everywhere" (deleting all sessions by `userId`) is a safety feature you should build for any app handling sensitive data. Combined with a password reset, it's the standard response to a suspected account compromise.

---

## I — Interview Q&A

### Q: How does sign-out work in BetterAuth and why is it more secure than JWT-based auth?

**A:** In BetterAuth, sign-out sends a `POST /api/auth/sign-out` request. BetterAuth reads the session token from the `httpOnly` cookie, executes `DELETE FROM session WHERE token = $1` to remove the session row, and sends back a `Set-Cookie` header with `Max-Age=0` to instruct the browser to delete the cookie. From that point, the token is invalid — any subsequent request carrying the old cookie finds no matching session row and returns unauthenticated. In JWT-based auth, sign-out typically only clears the client-side cookie or localStorage. The JWT itself remains cryptographically valid until its `exp` claim is reached — if an attacker had copied the JWT before sign-out, they can still make authenticated requests until expiry. Database sessions eliminate this window completely because the server-side source of truth (the session row) is deleted.

---

## C — Common Pitfalls + Fix

### ❌ Not calling `router.refresh()` after sign-out — stale authenticated UI persists

```typescript
// ❌ Sign out without refresh — server components still show authenticated content
await authClient.signOut()
router.push('/sign-in')
// User is on /sign-in but back button shows authenticated dashboard ❌
// Server components rendered with old session data until full page reload
```

**Fix:**

```typescript
// ✅ refresh forces server components to re-render without session
await authClient.signOut()
router.push('/sign-in')
router.refresh()   // ← clears server component cache, picks up empty session ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SecuritySettings` component that: (1) shows a list of active sessions (from the `listUserSessions` function built in subtopic 4); (2) has a "Revoke" button per session that is disabled for the current session; (3) has a "Sign out all other sessions" button; (4) calls the appropriate Prisma functions and refreshes the list after each action.

### Solution

```typescript
'use client'
import { useState, useEffect, useTransition } from 'react'
import { authClient }                          from '@/lib/auth-client'

interface SessionInfo {
  id:         string
  ipAddress:  string | null
  userAgent:  string | null
  createdAt:  string
  isCurrent:  boolean
}

export function SecuritySettings() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isPending, startTransition] = useTransition()

  async function loadSessions() {
    const { data } = await authClient.listSessions()   // BetterAuth client method
    if (data) setSessions(data as unknown as SessionInfo[])
  }

  useEffect(() => { loadSessions() }, [])

  async function handleRevoke(sessionId: string) {
    await authClient.revokeSession({ token: sessionId })
    await loadSessions()
  }

  async function handleRevokeAll() {
    await authClient.revokeOtherSessions()   // BetterAuth built-in: revoke all except current
    await loadSessions()
  }

  return (
    <section>
      <h2>Active Sessions</h2>

      <ul>
        {sessions.map(s => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <span>{s.userAgent ?? 'Unknown device'}</span>
            {' — '}
            <span>{s.ipAddress ?? 'Unknown IP'}</span>
            {' — '}
            <span>{new Date(s.createdAt).toLocaleDateString()}</span>
            {s.isCurrent
              ? <strong> (current)</strong>
              : (
                <button
                  onClick={() => handleRevoke(s.id)}
                  disabled={isPending}
                  style={{ marginLeft: 8 }}
                >
                  Revoke
                </button>
              )
            }
          </li>
        ))}
      </ul>

      {sessions.length > 1 && (
        <button onClick={handleRevokeAll} disabled={isPending}>
          Sign out all other sessions
        </button>
      )}
    </section>
  )
}
```

---

---
