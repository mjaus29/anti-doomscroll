# 2 — Auth Instance Setup — `auth.ts` and Core Config

---

## T — TL;DR

The BetterAuth instance is created once in `src/lib/auth.ts` by calling `betterAuth({ ... })`. It receives the database adapter, email/password config, trusted origins, and any plugins. This instance is the server-side heart of your auth system — it exposes `auth.handler` (the Next.js route handler), `auth.api` (for server-side session reads), and typed helper utilities.

---

## K — Key Concepts

```typescript
// src/lib/auth.ts
import { betterAuth }   from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }       from '@/lib/prisma'

export const auth = betterAuth({
  // ── Database ────────────────────────────────────────────────────────────
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // ── Email & Password ────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
  },

  // ── Session ─────────────────────────────────────────────────────────────
  session: {
    expiresIn:          60 * 60 * 24 * 7,  // 7 days in seconds
    updateAge:          60 * 60 * 24,       // refresh session if older than 1 day
    cookieCache: {
      enabled:  true,
      maxAge:   60 * 5,  // 5-minute client-side session cache
    },
  },

  // ── Trusted origins (CORS) ─────────────────────────────────────────────
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
  ],
})

// Export types for use in other files
export type Auth    = typeof auth
export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session['user']
```

```typescript
// ── Full config with all common options ────────────────────────────────────
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Base URL — where BetterAuth serves its endpoints
  // Defaults to: process.env.BETTER_AUTH_URL or NEXTAUTH_URL
  baseURL: process.env.BETTER_AUTH_URL,

  // Secret — used to sign session tokens
  // Must be a long random string, never exposed to client
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled:             true,
    requireEmailVerification: false,   // set true to enforce email verify before login
    minPasswordLength:   8,
    maxPasswordLength:   128,
    // Custom password hashing (default: bcrypt, cost 10)
    // password: { hash: customHash, verify: customVerify }
  },

  user: {
    // Additional fields on the user (beyond email, name, image)
    additionalFields: {
      role: {
        type:         'string',
        defaultValue: 'user',
        input:        false,   // false = not settable by the client on sign-up
      },
      username: {
        type:     'string',
        required: false,
        input:    true,   // true = client can provide it on sign-up
      },
    },
  },

  session: {
    expiresIn:  60 * 60 * 24 * 30,  // 30 days
    updateAge:  60 * 60 * 24,        // 24 hours
  },

  trustedOrigins: [
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL!,
  ],
})
```

```typescript
// ── Next.js Route Handler — the single entry point for all auth HTTP calls ──
// src/app/api/auth/[...all]/route.ts

import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth.handler)

// This one file handles ALL BetterAuth endpoints:
// POST /api/auth/sign-up/email
// POST /api/auth/sign-in/email
// POST /api/auth/sign-out
// GET  /api/auth/get-session
// GET  /api/auth/callback/:provider   (OAuth callbacks)
// POST /api/auth/verify-email
// POST /api/auth/reset-password
// ... and all plugin endpoints
```

```typescript
// ── Environment variables ─────────────────────────────────────────────────
// .env
// BETTER_AUTH_SECRET="a-very-long-random-secret-at-least-32-chars"
// BETTER_AUTH_URL="http://localhost:3000"
// NEXT_PUBLIC_APP_URL="http://localhost:3000"

// Generate a secure secret:
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

// .env.example
// BETTER_AUTH_SECRET=""          # 32+ char random string — never expose
// BETTER_AUTH_URL=""             # e.g. https://myapp.com
// NEXT_PUBLIC_APP_URL=""         # same as BETTER_AUTH_URL (public = accessible in browser)
```

---

## W — Why It Matters

- `auth.ts` is the single source of truth for all authentication configuration — session lifetime, password rules, allowed origins, plugins. Changing it once propagates everywhere. There is no authentication config scattered across middleware, route files, or `.env` alone.
- `export type Session = typeof auth.$Infer.Session` gives you a TypeScript type derived directly from the BetterAuth config — if you add a custom `role` field to the user, `session.user.role` is automatically typed. No manual interface maintenance.
- `BETTER_AUTH_SECRET` is critical — it signs session tokens. If it's missing, BetterAuth falls back to an insecure default in some versions. Always set it explicitly, rotate it only during planned maintenance (all sessions invalidated on rotation), and never commit it.

---

## I — Interview Q&A

### Q: What does the BetterAuth route handler `[...all]/route.ts` do, and why is it a catch-all?

**A:** BetterAuth exposes multiple HTTP endpoints — sign-up, sign-in, sign-out, session fetch, OAuth callbacks, email verification, password reset, and plugin-specific endpoints. Rather than requiring you to create a separate Next.js route file for each endpoint, BetterAuth uses a single catch-all handler at `/api/auth/[...all]`. The `[...all]` segment in Next.js App Router captures any path after `/api/auth/` — so `/api/auth/sign-in/email`, `/api/auth/callback/google`, and `/api/auth/verify-email` all hit the same file. The `toNextJsHandler(auth.handler)` call adapts BetterAuth's internal HTTP handler to Next.js's `GET`/`POST` export format. You export both `GET` and `POST` because different auth operations use different HTTP methods.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to set `BETTER_AUTH_SECRET` — insecure or broken in production

```bash
# ❌ .env — secret not set
DATABASE_URL="postgresql://..."
# BETTER_AUTH_SECRET not set → BetterAuth may use an insecure fallback
```

**Fix:** Always set a strong secret explicitly:

```bash
# ✅ Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET="c3f1a2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
BETTER_AUTH_URL="https://myapp.com"
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete `src/lib/auth.ts` file for a SaaS app with: email/password auth enabled, a custom `role` field (default `'user'`, not user-settable), a custom `username` field (user-settable on sign-up), 30-day sessions refreshed every 24 hours, trusted origins from env, and exported `Session` and `User` types.

### Solution

```typescript
// src/lib/auth.ts
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'

export const auth = betterAuth({
  baseURL:  process.env.BETTER_AUTH_URL!,
  secret:   process.env.BETTER_AUTH_SECRET!,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

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
        input:        false,   // client cannot set role on sign-up ✅
      },
      username: {
        type:     'string',
        required: false,
        input:    true,        // client can provide username on sign-up ✅
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,   // 30 days
    updateAge: 60 * 60 * 24,          // refresh if older than 24h
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,                // 5-min client cache
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
  ],
})

export type Auth    = typeof auth
export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session['user']
```

---

---
