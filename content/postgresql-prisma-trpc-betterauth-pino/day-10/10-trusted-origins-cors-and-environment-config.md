# 10 — Trusted Origins, CORS, and Environment Config

---

## T — TL;DR

BetterAuth uses `trustedOrigins` to validate the `Origin` header on incoming requests — only requests from listed origins can interact with auth endpoints. This is CSRF protection. In development, add `http://localhost:3000`. In production, add your deployed domain. Never add `*`. Misconfigured origins are the most common cause of silent auth failures in deployment.

---

## K — Key Concepts

```typescript
// ── trustedOrigins — what it does and why ────────────────────────────────
export const auth = betterAuth({
  // ...
  trustedOrigins: [
    'http://localhost:3000',            // local dev
    'https://myapp.com',               // production
    'https://www.myapp.com',           // www variant
    'https://staging.myapp.com',       // staging
  ],
})

// BetterAuth checks: request.headers.origin ∈ trustedOrigins
// If not in the list: 403 Forbidden — the auth request is rejected
// This prevents CSRF: an attacker's site cannot submit auth forms on behalf of users
```

```typescript
// ── Environment-based config — the complete .env setup ────────────────────

// .env.local (development)
// BETTER_AUTH_SECRET="dev-secret-change-in-production-min-32-chars-xxx"
// BETTER_AUTH_URL="http://localhost:3000"
// NEXT_PUBLIC_APP_URL="http://localhost:3000"
// DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp_dev"

// .env.production (or platform env vars — Vercel, Railway, etc.)
// BETTER_AUTH_SECRET="<32+ char random hex — generate once, never change unless rotating>"
// BETTER_AUTH_URL="https://myapp.com"
// NEXT_PUBLIC_APP_URL="https://myapp.com"
// DATABASE_URL="postgresql://..."
// DIRECT_DATABASE_URL="postgresql://..."   # if using connection pooler

// .env.example (commit this)
// BETTER_AUTH_SECRET=""
// BETTER_AUTH_URL=""
// NEXT_PUBLIC_APP_URL=""
// DATABASE_URL=""
// DIRECT_DATABASE_URL=""
```

```typescript
// ── Dynamic trusted origins — reading from env ────────────────────────────
// auth.ts — handle multiple environments cleanly

const trustedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',   // if running on a different port sometimes
]

if (process.env.NEXT_PUBLIC_APP_URL) {
  trustedOrigins.push(process.env.NEXT_PUBLIC_APP_URL)
}

// Add preview deployment URLs (Vercel generates unique URLs per PR):
if (process.env.VERCEL_URL) {
  trustedOrigins.push(`https://${process.env.VERCEL_URL}`)
}

export const auth = betterAuth({
  // ...
  trustedOrigins,
})
```

```typescript
// ── CORS — for separate frontend/backend deployments ──────────────────────
// If your Next.js frontend and BetterAuth backend are on DIFFERENT origins
// (e.g. frontend: app.myapp.com, backend: api.myapp.com), configure CORS:

export const auth = betterAuth({
  // ...
  trustedOrigins: ['https://app.myapp.com'],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain:  '.myapp.com',   // cookie shared across *.myapp.com
    },
    defaultCookieAttributes: {
      sameSite: 'none',    // required for cross-origin cookies
      secure:   true,      // required when sameSite: 'none'
    },
  },
})

// In auth-client.ts — point to the API subdomain:
export const authClient = createAuthClient({
  baseURL: 'https://api.myapp.com',
})
```

```typescript
// ── Configuration validation — fail fast on startup ───────────────────────
// src/lib/auth.ts — validate required env before creating the instance

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

const secret  = requireEnv('BETTER_AUTH_SECRET')
const baseURL = requireEnv('BETTER_AUTH_URL')

if (secret.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
}

export const auth = betterAuth({
  baseURL,
  secret,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // ...
})
// If any required env is missing: server fails to start with a clear error ✅
// Beats a cryptic runtime error deep in a request handler ✅
```

```
── Deployment checklist ─────────────────────────────────────────────────────

  □ BETTER_AUTH_SECRET set to 32+ char random string
  □ BETTER_AUTH_URL set to production domain (https://)
  □ NEXT_PUBLIC_APP_URL set (same as BETTER_AUTH_URL for same-origin)
  □ trustedOrigins includes production domain
  □ DATABASE_URL points to production DB
  □ DIRECT_DATABASE_URL set if using connection pooler
  □ postinstall: "prisma generate" in package.json
  □ prisma migrate deploy run before app starts
  □ HTTPS enforced in production (required for secure cookies)
  □ SESSION_COOKIE sameSite=Lax (same-origin) or None (cross-origin)
```

---

## W — Why It Matters

- A missing or misconfigured `trustedOrigins` is the #1 cause of "auth works locally but not in production" — the deployed domain isn't in the list, so every auth request returns 403. The error is silent from the user's perspective (sign-in fails with no helpful message) and confusing to debug.
- `BETTER_AUTH_SECRET` rotation invalidates all sessions — rotate it only during planned maintenance. Users across all devices will be signed out. Document this in your runbook. Accidentally rotating the secret in a rolling deployment (where some pods have the old secret, some the new) causes intermittent auth failures.
- `NEXT_PUBLIC_APP_URL` (the public env var) must be the exact origin the browser uses. If your app is accessed at `https://www.myapp.com` but you set `https://myapp.com`, the `Origin` header won't match `trustedOrigins` and auth requests will fail.

---

## I — Interview Q&A

### Q: What is the purpose of `trustedOrigins` in BetterAuth and what attack does it prevent?

**A:** `trustedOrigins` is BetterAuth's CSRF (Cross-Site Request Forgery) protection mechanism. It validates the `Origin` header of incoming auth requests — only requests originating from listed domains are processed. CSRF attacks work by tricking a user's browser into making requests to your API from an attacker's website — the browser automatically includes cookies, so the request arrives with a valid session. Without origin validation, an attacker's site at `evil.com` could post a form to your `/api/auth/sign-out` endpoint and sign out any user who visits `evil.com`. By checking `Origin`, BetterAuth rejects requests from `evil.com` because it's not in the trusted list. Only your own frontend domain(s) are trusted. This is why you must never add `*` to `trustedOrigins` — that would disable CSRF protection entirely.

---

## C — Common Pitfalls + Fix

### ❌ Production domain not in trustedOrigins — all auth requests return 403

```typescript
// ❌ Only localhost — works in dev, fails in production
export const auth = betterAuth({
  trustedOrigins: ['http://localhost:3000'],
  // Missing: 'https://myapp.com' ← every auth request in production returns 403 ❌
})
```

**Fix:** Include all environments:

```typescript
// ✅ All origins from environment — no hardcoding
export const auth = betterAuth({
  trustedOrigins: [
    'http://localhost:3000',
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
  ],
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete production-ready `src/lib/auth.ts` incorporating everything from Day 10: env validation, prisma adapter, email/password with custom fields (`role`, `plan`), 30-day sessions with 24h refresh, `cookieCache`, trusted origins from env, Vercel preview URL support, and exported types. Also write the complete `.env.example` and `src/app/api/auth/[...all]/route.ts`.

### Solution

```typescript
// src/lib/auth.ts
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'

// ── Env validation — fail fast ────────────────────────────────────────────
function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

const secret  = requireEnv('BETTER_AUTH_SECRET')
const baseURL = requireEnv('BETTER_AUTH_URL')

if (secret.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
}

// ── Trusted origins ────────────────────────────────────────────────────────
const trustedOrigins: string[] = ['http://localhost:3000']

if (process.env.NEXT_PUBLIC_APP_URL) {
  trustedOrigins.push(process.env.NEXT_PUBLIC_APP_URL)
}
// Vercel preview deployments (unique URL per PR)
if (process.env.VERCEL_URL) {
  trustedOrigins.push(`https://${process.env.VERCEL_URL}`)
}

// ── Auth instance ──────────────────────────────────────────────────────────
export const auth = betterAuth({
  baseURL,
  secret,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled:           true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      role: {
        type:         'string',
        defaultValue: 'user',
        input:        false,
      },
      plan: {
        type:         'string',
        defaultValue: 'free',
        input:        false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,   // 30 days
    updateAge:  60 * 60 * 24,         // refresh if older than 24h
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,                // 5-min client cache
    },
  },

  trustedOrigins,
})

// ── Exported types ─────────────────────────────────────────────────────────
export type Auth    = typeof auth
export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session['user']
```

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth }            from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth.handler)
```

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signUp, signOut, useSession } = authClient
```

```bash
# .env.example
# ─── BetterAuth ───────────────────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET=""

# The base URL of your application (no trailing slash)
BETTER_AUTH_URL=""

# Must match BETTER_AUTH_URL (NEXT_PUBLIC_ prefix = accessible in browser)
NEXT_PUBLIC_APP_URL=""

# ─── Database ─────────────────────────────────────────────────────────────────
# Pooled connection (runtime queries)
DATABASE_URL=""

# Direct connection (prisma migrate only) — required if using Supabase/PgBouncer
DIRECT_DATABASE_URL=""
```

---

## ✅ Day 10 Complete — BetterAuth Setup and Core Flows

| # | Subtopic | Status |
|---|----------|--------|
| 1 | BetterAuth Overview — What It Is and How It Fits | ☐ |
| 2 | Auth Instance Setup — `auth.ts` and Core Config | ☐ |
| 3 | Prisma Adapter — Schema, Migration, DB Persistence | ☐ |
| 4 | Session Basics — Storage, Cookies, the Session Object | ☐ |
| 5 | Sign Up — Email & Password Registration Flow | ☐ |
| 6 | Sign In — Email & Password Authentication Flow | ☐ |
| 7 | Sign Out — Session Invalidation and Cleanup | ☐ |
| 8 | Client-Side Usage — `createAuthClient`, React Hooks | ☐ |
| 9 | Server-Side Usage — `auth.api`, `getSession`, Route Protection | ☐ |
| 10 | Trusted Origins, CORS, and Environment Config | ☐ |

---

## 🗺️ One-Page Mental Model — Day 10

```
BETTERAUTH ARCHITECTURE
  auth.ts (server)         → betterAuth({ database, emailAndPassword, session, trustedOrigins })
  auth-client.ts (client)  → createAuthClient({ baseURL })
  [...]all/route.ts        → toNextJsHandler(auth.handler)  ← single entry point for all auth HTTP
  schema.prisma            → User, Session, Account, Verification tables

PRISMA ADAPTER
  prismaAdapter(prisma, { provider: 'postgresql' })
  npx better-auth generate  → outputs required Prisma models
  npx prisma migrate dev    → creates tables in PostgreSQL
  Four tables: user, session, account, verification
  Cascade delete: session/account deleted when user is deleted
  Query auth data directly with prisma.user, prisma.session etc.

SESSION MODEL
  Cookie:    better-auth.session-token (httpOnly, secure, sameSite=Lax)
  DB row:    session table (token, userId, expiresAt, ipAddress, userAgent)
  Lookup:    SELECT WHERE token = $1 AND expires_at > NOW()
  Refresh:   if session.age > updateAge → extend expiresAt by expiresIn
  cookieCache: encrypted session in second cookie → avoids DB hit for N minutes
  Revoke:    DELETE FROM session WHERE token = $1  → instantly invalid

SIGN UP FLOW
  authClient.signUp.email({ name, email, password, ...customFields })
  → POST /api/auth/sign-up/email
  → validate → check uniqueness → bcrypt(password) → INSERT user → INSERT account → INSERT session → set cookie
  → USER_ALREADY_EXISTS if email taken
  → router.refresh() required after sign-up in Next.js App Router

SIGN IN FLOW
  authClient.signIn.email({ email, password, rememberMe? })
  → POST /api/auth/sign-in/email
  → find user → find account → bcrypt.compare → INSERT session → set cookie
  → INVALID_EMAIL_OR_PASSWORD (same code for both "not found" and "wrong password")
  → Never reveal which field failed (prevents email enumeration)
  → router.refresh() required after sign-in

SIGN OUT FLOW
  authClient.signOut()
  → POST /api/auth/sign-out
  → DELETE FROM session WHERE token = $1 → Max-Age=0 cookie → immediate revocation
  → router.push('/sign-in') + router.refresh() after sign-out
  → "Log out everywhere": prisma.session.deleteMany({ where: { userId } })

CLIENT USAGE (React)
  useSession()    → { data: Session | null, isPending, error, refetch }  reactive
  getSession()    → one-time async fetch  non-reactive
  Always handle isPending: true to avoid flash of unauthenticated state
  authClient.signIn/signUp/signOut/updateUser/changePassword/listSessions/revokeSession

SERVER USAGE (Next.js)
  auth.api.getSession({ headers: req.headers })  → Session | null
  Works in: Server Components, Route Handlers, Server Actions, Middleware
  middleware.ts: protect routes at the edge before rendering
  requireSession() helper: redirect('/sign-in') if no session — eliminates boilerplate
  ALWAYS check session server-side — client checks are UX only, not security

TRUSTED ORIGINS + ENV
  trustedOrigins: ['http://localhost:3000', process.env.NEXT_PUBLIC_APP_URL]
  → CSRF protection: rejects requests from unlisted origins
  → #1 cause of "works locally, 403 in production"
  BETTER_AUTH_SECRET:   32+ char random string, never rotate without planned downtime
  BETTER_AUTH_URL:      your app's base URL (server-side)
  NEXT_PUBLIC_APP_URL:  same URL (browser-accessible)
  Validate envs on startup: requireEnv() → fail fast with clear error

SECURITY RULES
  ✅ httpOnly cookies → XSS cannot steal session token
  ✅ Database sessions → immediately revocable on sign-out
  ✅ trustedOrigins → CSRF protection
  ✅ Generic error messages → no email enumeration
  ✅ Server-side session checks → real security boundary
  ✅ bcrypt for passwords → secure storage
  ❌ Never: return password hash in API response
  ❌ Never: add * to trustedOrigins
  ❌ Never: commit BETTER_AUTH_SECRET to git
  ❌ Never: I/O inside transactions
  ❌ Never: rely on client-side auth checks alone
```

> **Your next action:** Open your project, create `src/lib/auth.ts` with `betterAuth({ ... })` and `src/app/api/auth/[...all]/route.ts`. Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to `.env`. That's the entire server setup — done in under 10 minutes.

> "Doing one small thing beats opening a feed."
