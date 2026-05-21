# 4 — Session Basics — Storage, Cookies, the Session Object

---

## T — TL;DR

BetterAuth uses **database-backed sessions** — a session token (opaque random string) is stored in an `httpOnly` cookie and the session record lives in the `session` table. On every authenticated request, BetterAuth reads the cookie, looks up the session in the database, and returns the user object. Sessions expire based on `expiresIn` config and are silently refreshed (new expiry set) if the session is older than `updateAge`.

---

## K — Key Concepts

```
── Session storage model ────────────────────────────────────────────────────

  Browser Cookie:
    Name:     better-auth.session-token   (or custom name)
    Value:    <opaque random token>        e.g. "abc123xyz..."
    HttpOnly: true  → JS cannot read it (XSS protection)
    Secure:   true  → HTTPS only (in production)
    SameSite: Lax   → sent on same-site navigation, not cross-site
    Path:     /
    Expires:  aligned with session.expiresIn config

  PostgreSQL session table:
    id:         cuid (PK)
    token:      the same random token stored in cookie (UNIQUE)
    userId:     FK to user
    expiresAt:  UTC timestamp when the session expires
    ipAddress:  request IP (for audit)
    userAgent:  request User-Agent (for audit)

  Session lookup (every authenticated request):
    1. Read cookie value (token)
    2. SELECT * FROM session WHERE token = $1 AND expires_at > NOW()
    3. If found: return session + user data
    4. If expired or not found: clear cookie, return null
```

```typescript
// ── Session object shape ───────────────────────────────────────────────────
// What auth.api.getSession() returns when a valid session exists:

interface SessionResult {
  session: {
    id:        string
    token:     string
    expiresAt: Date
    ipAddress: string | null
    userAgent: string | null
    userId:    string
    createdAt: Date
    updatedAt: Date
  }
  user: {
    id:            string
    name:          string
    email:         string
    emailVerified: boolean
    image:         string | null
    role:          string        // ← custom field from additionalFields
    plan:          string        // ← custom field
    createdAt:     Date
    updatedAt:     Date
  }
}
// TypeScript: import { Session } from '@/lib/auth' → fully typed
```

```typescript
// ── Session refresh logic ─────────────────────────────────────────────────
// Configured in auth.ts:
session: {
  expiresIn: 60 * 60 * 24 * 30,  // absolute expiry: 30 days from creation
  updateAge:  60 * 60 * 24,        // refresh threshold: 24 hours
}

// Behavior:
// - Session created at T=0, expires at T+30days
// - User visits at T+2days → session age (2d) > updateAge (1d)
//   → BetterAuth extends expiresAt to NOW() + 30days (sliding expiry)
//   → New cookie with updated expiry sent in response
// - User visits at T+12hrs → session age (12h) < updateAge (24h)
//   → No update (avoids unnecessary DB write on every request)

// ── Cookie cache — avoid DB hit on every request ──────────────────────────
session: {
  cookieCache: {
    enabled: true,
    maxAge:  60 * 5,   // cache session data in cookie for 5 minutes
  }
}
// With cookieCache: BetterAuth stores encrypted session data in a second cookie
// For 5 minutes, it reads from the cookie instead of hitting the DB
// After 5 minutes, re-validates with the database
// Trade-off: 5-minute window where revoked sessions still appear valid
```

```typescript
// ── Session cookie name — override default ────────────────────────────────
export const auth = betterAuth({
  // ...
  advanced: {
    cookiePrefix: 'myapp',
    // Cookie name becomes: myapp.session-token
  },
})
```

---

## W — Why It Matters

- Database-backed sessions (vs JWTs) are immediately revocable — call sign-out, the session row is deleted, and the token is invalid instantly. With JWTs, the token remains valid until expiry even after sign-out. For security-sensitive apps, database sessions are the safer default.
- `HttpOnly` cookies prevent JavaScript from reading the session token — an XSS attack that injects script into your page cannot steal the session cookie. This is a fundamental security property that BetterAuth enables by default.
- `updateAge` prevents a constant stream of `UPDATE session SET expires_at = ...` queries on every request — without it, every page load would write to the sessions table. The threshold (e.g. 24 hours) means the session is refreshed at most once per day, dramatically reducing DB write load.

---

## I — Interview Q&A

### Q: Why does BetterAuth use database sessions instead of JWTs, and what is the trade-off?

**A:** Database sessions store an opaque random token in the cookie and the session data in PostgreSQL. The critical advantage is immediate revocability — when a user signs out, their session row is deleted and the token is instantly invalid for all future requests. JWTs are self-contained — the token encodes claims and is verified cryptographically, meaning once issued, the token is valid until expiry even if the user signs out or is banned. The trade-off for database sessions is the database lookup on every authenticated request — a `SELECT` on the sessions table per request. BetterAuth mitigates this with the `cookieCache` option (caches session data in a signed cookie for N minutes) and database indexing. For most applications, the security benefit of immediate revocability outweighs the cost of one additional index lookup per request.

---

## C — Common Pitfalls + Fix

### ❌ Using `cookieCache` without understanding the revocation delay

```typescript
// ❌ cookieCache enabled with a long maxAge — security implications
session: {
  cookieCache: {
    enabled: true,
    maxAge:  60 * 60,   // 1 hour cache — banned users can still act for up to 1 hour ❌
  }
}
```

**Fix:** Keep `cookieCache.maxAge` short, or disable for high-security apps:

```typescript
// ✅ Short cache — minimal revocation delay
session: {
  cookieCache: {
    enabled: true,
    maxAge:  60 * 5,   // 5 minutes — acceptable for most apps
  }
}

// ✅ No cache — instant revocation (DB hit on every request)
session: {
  cookieCache: {
    enabled: false,
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `listUserSessions` function that: (1) fetches all active sessions for a given `userId` using Prisma directly (not BetterAuth API), (2) marks the current session (matching a `currentToken`), (3) returns session info including `ipAddress`, `userAgent`, `createdAt`, and an `isCurrent` boolean. This is the "Manage active sessions" feature.

### Solution

```typescript
import { prisma } from '@/lib/prisma'

interface SessionInfo {
  id:          string
  ipAddress:   string | null
  userAgent:   string | null
  createdAt:   Date
  expiresAt:   Date
  isCurrent:   boolean
}

async function listUserSessions(
  userId:       string,
  currentToken: string,
): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },   // only active sessions
    },
    select: {
      id:        true,
      token:     true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return sessions.map(s => ({
    id:        s.id,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: s.token === currentToken,  // compare tokens to identify current session
  }))
  // Note: we map away the raw token — never expose session tokens in API responses
}

// Revoke a specific session (not the current one)
async function revokeSession(sessionId: string, userId: string): Promise<void> {
  // Verify the session belongs to this user before deleting
  await prisma.session.deleteMany({
    where: { id: sessionId, userId },
  })
}

export { listUserSessions, revokeSession }
```

---

---
