# 4 — Session Control — Listing, Revoking, Rotating, Force Sign-Out

---

## T — TL;DR

BetterAuth exposes session management APIs for listing a user's active sessions, revoking specific sessions, revoking all other sessions, and forcing a sign-out from the server side. These power "Security" settings pages and admin account management features. All operations go through the `session` table — delete the row, and the session is dead.

---

## K — Key Concepts

```typescript
// ── List all active sessions for the current user ─────────────────────────
import { authClient } from '@/lib/auth-client'

const { data: sessions } = await authClient.listSessions()
// Returns: Session[] — all active (non-expired) sessions for the current user
// Each session: { id, token, ipAddress, userAgent, createdAt, expiresAt, isCurrent }

// ── Revoke a specific session by token ────────────────────────────────────
await authClient.revokeSession({ token: sessionId })
// Deletes that session row — that device is immediately signed out

// ── Revoke all OTHER sessions (keep current) ──────────────────────────────
await authClient.revokeOtherSessions()
// Use case: "Sign out of all other devices"
// Deletes all session rows for the user EXCEPT the current one
// User stays logged in on the current device ✅

// ── Change password + revoke all other sessions ───────────────────────────
await authClient.changePassword({
  currentPassword:       'OldPassword123!',
  newPassword:           'NewPassword456!',
  revokeOtherSessions:   true,   // sign out all other devices after password change
})
```

```typescript
// ── Server-side: force sign out a user (admin action) ─────────────────────
import { prisma } from '@/lib/prisma'

async function forceSignOutUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
  // All sessions for this user are now invalid
  // On next request, any device will get 401 and be redirected to sign-in
}

// ── Server-side: revoke a specific session by ID ─────────────────────────
async function adminRevokeSession(sessionId: string, userId: string): Promise<void> {
  // Always scope by userId — prevent one user revoking another's sessions
  await prisma.session.deleteMany({
    where: { id: sessionId, userId }
  })
}
```

```typescript
// ── Session rotation — refresh token on every request ─────────────────────
// BetterAuth auto-rotates session expiry (updateAge config) but doesn't
// change the token itself on every request (that would break multi-tab)

// For maximum security (e.g. banking app), rotate token on each request:
// This is NOT built into BetterAuth by default — implement via middleware:
import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/lib/auth'
import { prisma }                    from '@/lib/prisma'
import { randomBytes }               from 'crypto'

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) return NextResponse.next()

  // Only rotate sessions older than 5 minutes (avoid rotating on every request)
  const sessionAge = Date.now() - session.session.createdAt.getTime()
  if (sessionAge < 5 * 60 * 1000) return NextResponse.next()

  // Issue new token, invalidate old
  const newToken = randomBytes(32).toString('hex')
  await prisma.session.update({
    where: { id: session.session.id },
    data:  { token: newToken, updatedAt: new Date() },
  })

  const response = NextResponse.next()
  response.cookies.set('better-auth.session-token', newToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  })
  return response
}
// Use this pattern only if your threat model requires it — adds DB write per request
```

```typescript
// ── useSession + session list UI ──────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { authClient }          from '@/lib/auth-client'

type SessionItem = {
  id:        string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  isCurrent: boolean
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([])

  async function load() {
    const { data } = await authClient.listSessions()
    if (data) setSessions(data as unknown as SessionItem[])
  }

  useEffect(() => { load() }, [])

  return (
    <ul>
      {sessions.map(s => (
        <li key={s.id}>
          <span>{s.userAgent ?? 'Unknown device'} — {s.ipAddress ?? 'Unknown IP'}</span>
          {s.isCurrent
            ? <strong> (this device)</strong>
            : <button onClick={async () => {
                await authClient.revokeSession({ token: s.id })
                load()
              }}>Sign out</button>
          }
        </li>
      ))}
      {sessions.length > 1 && (
        <button onClick={async () => {
          await authClient.revokeOtherSessions()
          load()
        }}>Sign out all other devices</button>
      )}
    </ul>
  )
}
```

---

## W — Why It Matters

- `revokeOtherSessions` is a critical security feature users expect — "I think someone else has access to my account, sign out all other devices" is a standard response to a suspected compromise. Build it into your settings page from day one.
- `changePassword` with `revokeOtherSessions: true` is the correct password change behavior — any device that had access with the old password is immediately invalidated. Without this, an attacker who obtained access retains it even after the user changes their password.
- Server-side `forceSignOutUser` is necessary for admin workflows — banning a user, disabling an account, or detecting fraud should immediately revoke all sessions, not wait for them to expire naturally.

---

## I — Interview Q&A

### Q: How do you immediately invalidate all sessions for a user in BetterAuth?

**A:** Since BetterAuth uses database-backed sessions, invalidating all sessions is a single Prisma query: `prisma.session.deleteMany({ where: { userId } })`. This deletes every session row for that user. On the user's next request (from any device), BetterAuth queries the sessions table, finds no valid session for that token, and returns an unauthenticated response — the user is redirected to sign-in. This is the correct implementation for: account banning, suspected compromise response, admin-forced sign-out, and after a password reset initiated by security team. The operation is instant — there's no waiting for tokens to expire as there would be with JWT-based auth.

---

## C — Common Pitfalls + Fix

### ❌ Not scoping session revocation by `userId` — security vulnerability

```typescript
// ❌ Any authenticated user could revoke any session by guessing IDs
async function revokeSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } })  // ← no userId check ❌
}
```

**Fix:** Always scope by the authenticated user's ID:

```typescript
// ✅ User can only revoke their own sessions
async function revokeSession(sessionId: string, currentUserId: string) {
  const result = await prisma.session.deleteMany({
    where: { id: sessionId, userId: currentUserId }  // ← scoped ✅
  })
  if (result.count === 0) throw new Error('Session not found')
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a server-side `POST /api/me/sessions/revoke-all` route that: (1) reads the current session, (2) deletes all OTHER sessions for the user (keeps current), (3) returns a count of revoked sessions.

### Solution

```typescript
// src/app/api/me/sessions/revoke-all/route.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete all sessions EXCEPT the current one
  const result = await prisma.session.deleteMany({
    where: {
      userId: session.user.id,
      id:     { not: session.session.id },   // keep current session ✅
    },
  })

  return Response.json({
    success:       true,
    revokedCount:  result.count,
    message:       `Signed out of ${result.count} other device(s).`,
  })
}
```

---

---
