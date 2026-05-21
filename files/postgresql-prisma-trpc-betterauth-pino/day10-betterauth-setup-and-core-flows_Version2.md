
# 📅 Day 10 — BetterAuth Setup and Core Flows

> **Goal:** Install and fully configure BetterAuth with a Prisma + PostgreSQL backend — wire up the auth instance, database adapter, session persistence, and all core flows (sign up, sign in, sign out) for both server and client usage in a Next.js App Router project.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** BetterAuth 1.5 · Prisma 7 · PostgreSQL 18 · Next.js 16 · TypeScript 6

---

## 📋 Day 10 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | BetterAuth Overview — What It Is and How It Fits | 8 min |
| 2 | Auth Instance Setup — `auth.ts` and Core Config | 12 min |
| 3 | Prisma Adapter — Schema, Migration, DB Persistence | 12 min |
| 4 | Session Basics — Storage, Cookies, the Session Object | 10 min |
| 5 | Sign Up — Email & Password Registration Flow | 12 min |
| 6 | Sign In — Email & Password Authentication Flow | 12 min |
| 7 | Sign Out — Session Invalidation and Cleanup | 10 min |
| 8 | Client-Side Usage — `createAuthClient`, React Hooks | 12 min |
| 9 | Server-Side Usage — `auth.api`, `getSession`, Route Protection | 12 min |
| 10 | Trusted Origins, CORS, and Environment Config | 10 min |

---

---

# 1 — BetterAuth Overview — What It Is and How It Fits

---

## T — TL;DR

BetterAuth is a TypeScript-first, framework-agnostic authentication library that runs on your own server and stores sessions in your own database. You own the code, the schema, and the data. It ships with email/password, OAuth, magic link, and 2FA out of the box, and integrates with Prisma via an official adapter. No vendor lock-in, no JWT gymnastics required.

---

## K — Key Concepts

```
── Where BetterAuth sits in your stack ─────────────────────────────────────

  Browser (React)
      ↕  fetch / hooks
  Next.js Route Handler  (/api/auth/[...all]/route.ts)
      ↕  calls
  BetterAuth instance   (src/lib/auth.ts)
      ↕  adapter
  Prisma Client
      ↕  SQL
  PostgreSQL  (users, sessions, accounts tables)

── What BetterAuth manages ──────────────────────────────────────────────────

  ✅ User creation (hashed password storage)
  ✅ Session creation & rotation
  ✅ Session cookie (httpOnly, secure, sameSite)
  ✅ Sign in / sign out flows
  ✅ OAuth providers (Google, GitHub, etc.)
  ✅ Email verification, password reset (via plugins)
  ✅ 2FA (via plugins)
  ✅ All persisted to YOUR database via adapter

── What BetterAuth does NOT manage ──────────────────────────────────────────

  ❌ Authorization (who can do what) — your responsibility
  ❌ UI components — you build them
  ❌ Email sending — you bring your own provider (Resend, Nodemailer)
```

```
── BetterAuth vs alternatives ───────────────────────────────────────────────

  NextAuth (Auth.js)   → similar philosophy, more opinionated, v5 in flux
  Clerk                → hosted service, fast setup, vendor lock-in, costs $
  Auth0                → hosted, enterprise-grade, costs $
  Lucia                → minimal, you build more yourself
  BetterAuth           → batteries-included, self-hosted, TypeScript-native

── Installation ─────────────────────────────────────────────────────────────

  npm install better-auth@^1.5.0
  npm install @better-auth/prisma-adapter   # if not bundled in 1.5
  # OR — BetterAuth 1.5 bundles the Prisma adapter:
  # import { prismaAdapter } from 'better-auth/adapters/prisma'
```

```
── File structure for a Next.js App Router project ──────────────────────────

  src/
  ├── lib/
  │   ├── auth.ts           ← server: BetterAuth instance
  │   └── auth-client.ts    ← client: createAuthClient()
  ├── app/
  │   └── api/
  │       └── auth/
  │           └── [...all]/
  │               └── route.ts  ← Next.js handler that proxies to BetterAuth
  └── middleware.ts              ← optional: route protection
```

---

## W — Why It Matters

- BetterAuth is self-hosted — your user data never leaves your infrastructure. This matters for GDPR compliance, data residency requirements, and avoiding vendor price changes.
- The Prisma adapter means auth tables live in the same PostgreSQL database as your application data — you can `JOIN users` with `orders` in a single query without cross-service data fetching.
- TypeScript-first design means `auth.api.getSession(request)` returns a fully typed session object — `session.user.id`, `session.user.email` are typed, not `any`. No type assertions required.

---

## I — Interview Q&A

### Q: Why would you choose BetterAuth over a hosted solution like Clerk or Auth0?

**A:** The core trade-off is control vs convenience. Hosted solutions (Clerk, Auth0) are faster to set up but come with vendor lock-in, monthly costs that scale with users, and your user data living on a third-party server. BetterAuth is self-hosted — you own the schema, the session storage, and the user data. This matters for compliance (GDPR, HIPAA data residency), cost predictability at scale, and the ability to query auth data directly with your application's Prisma client — joining users with application data in a single SQL query. The trade-off is operational responsibility: you manage the database, backup the sessions table, and handle security updates.

---

## C — Common Pitfalls + Fix

### ❌ Trying to use BetterAuth like a hosted service — calling external API endpoints

```typescript
// ❌ BetterAuth is not a hosted service — there's no external auth.betterauth.com
// It runs on YOUR server — the API endpoints are YOUR Next.js routes
fetch('https://auth.betterauth.com/api/sign-in')  // ← does not exist ❌
```

**Fix:** BetterAuth runs inside your app — the endpoints are at `/api/auth/*` on your own domain:

```typescript
// ✅ Your own server handles auth
fetch('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify(credentials) })
// This hits your Next.js route: src/app/api/auth/[...all]/route.ts
```

---

## K — Coding Challenge + Solution

### Challenge

Map out (in a comment block) the complete request flow for a sign-in attempt: from the browser button click, through the BetterAuth client, to the Next.js route handler, to the BetterAuth instance, to Prisma, to PostgreSQL, and back. Include the session cookie step.

### Solution

```typescript
/*
  Sign-in request flow — complete end-to-end

  1. Browser
     User clicks "Sign In" → React calls authClient.signIn.email({ email, password })

  2. BetterAuth Client (src/lib/auth-client.ts)
     createAuthClient() → sends POST /api/auth/sign-in/email
     Body: { email: 'mark@example.com', password: 'secret' }

  3. Next.js Route Handler (src/app/api/auth/[...all]/route.ts)
     export { GET, POST } = auth.handler
     Receives the POST request → delegates to BetterAuth

  4. BetterAuth instance (src/lib/auth.ts)
     - Looks up user by email via Prisma → prisma.user.findUnique({ where: { email } })
     - Verifies password hash (bcrypt compare)
     - On success: creates a new session row → prisma.session.create({ data: { userId, token, expiresAt } })
     - Returns session token

  5. PostgreSQL
     INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (...)
     SELECT * FROM users WHERE email = $1

  6. HTTP Response
     BetterAuth sets a cookie: Set-Cookie: better-auth.session-token=<token>; HttpOnly; Secure; SameSite=Lax
     Returns 200 with user object (no password hash)

  7. Browser
     Cookie stored automatically by the browser
     Subsequent requests include: Cookie: better-auth.session-token=<token>
     BetterAuth reads the cookie → looks up session → attaches user to request context
*/
```

---

---

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

# 3 — Prisma Adapter — Schema, Migration, DB Persistence

---

## T — TL;DR

The BetterAuth Prisma adapter syncs BetterAuth's required tables (`user`, `session`, `account`, `verification`) into your `schema.prisma`. Run `npx better-auth generate` to auto-generate the Prisma models, then `npx prisma migrate dev` to apply them. All auth data lives in your PostgreSQL database alongside your application tables — fully queryable with your existing Prisma client.

---

## K — Key Concepts

```bash
# ── Generate BetterAuth Prisma models ─────────────────────────────────────
npx better-auth generate

# This command reads your auth.ts config and outputs the required
# Prisma model definitions. Copy them into your schema.prisma.

# Or use --output to write directly:
npx better-auth generate --output prisma/auth.prisma
```

```prisma
// ── BetterAuth required models — add to prisma/schema.prisma ──────────────
// (Output of `better-auth generate` — exact fields may vary by version)

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt      @map("updated_at")

  // Custom additional fields (from user.additionalFields config):
  role          String    @default("user")
  username      String?   @unique

  // Relations (virtual — no column)
  sessions      Session[]
  accounts      Account[]

  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  userId                String    @map("user_id")
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?   @map("access_token")
  refreshToken          String?   @map("refresh_token")
  idToken               String?   @map("id_token")
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt      @map("updated_at")

  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime? @default(now()) @map("created_at")
  updatedAt  DateTime? @updatedAt      @map("updated_at")

  @@map("verification")
}
```

```bash
# ── Apply the schema to PostgreSQL ─────────────────────────────────────────
npx prisma migrate dev --name add-betterauth-tables

# This creates:
# prisma/migrations/20250615_add_betterauth_tables/migration.sql
# And applies the SQL to your dev database

# What gets created in PostgreSQL:
# CREATE TABLE "user" (id, name, email, email_verified, image, role, username, ...)
# CREATE TABLE "session" (id, expires_at, token, user_id, ...)
# CREATE TABLE "account" (id, account_id, provider_id, user_id, password, ...)
# CREATE TABLE "verification" (id, identifier, value, expires_at)
```

```typescript
// ── The adapter — how BetterAuth talks to Prisma ──────────────────────────
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'

// In auth.ts:
database: prismaAdapter(prisma, {
  provider: 'postgresql',
})

// The adapter translates BetterAuth's internal data operations into
// Prisma Client calls:
// - Find user by email → prisma.user.findUnique({ where: { email } })
// - Create session     → prisma.session.create({ data: { ... } })
// - Delete session     → prisma.session.delete({ where: { token } })
// - Clean expired      → prisma.session.deleteMany({ where: { expiresAt: { lt: now } } })
```

```typescript
// ── Querying auth tables with YOUR Prisma client ───────────────────────────
// Since auth tables live in your DB, you can query them directly:

// Join users with application data
const usersWithOrderCount = await prisma.user.findMany({
  where:   { role: 'user', emailVerified: true },
  select:  {
    id:       true,
    email:    true,
    username: true,
    _count:   { select: { orders: true } }  // if User has orders relation
  },
  orderBy: { createdAt: 'desc' },
})

// Count active sessions
const activeSessions = await prisma.session.count({
  where: { expiresAt: { gt: new Date() } }
})

// Find all sessions for a user
const sessions = await prisma.session.findMany({
  where:   { userId: userId, expiresAt: { gt: new Date() } },
  orderBy: { createdAt: 'desc' },
})
```

---

## W — Why It Matters

- Auto-generating auth models with `better-auth generate` prevents schema drift — if you upgrade BetterAuth and a new field is required, re-running `generate` shows you the diff. Manually maintaining auth models means missed fields and broken auth in production.
- The `onDelete: Cascade` on `Session.userId` and `Account.userId` means deleting a user automatically deletes all their sessions and accounts — no orphaned rows, no security risk of a deleted user's session token still being valid.
- Having auth tables in your own database means you can add application-specific indexes. For example, adding `@@index([userId, expiresAt])` on `Session` makes "list all active sessions for a user" queries fast — something impossible with a hosted auth service.

---

## I — Interview Q&A

### Q: What are the four tables BetterAuth requires and what does each store?

**A:** BetterAuth requires four tables. **`user`** stores the user's profile — id, email, name, email verification status, and any custom additional fields you define (like `role` or `username`). **`session`** stores active sessions — each row is one login session with a unique token, expiry timestamp, user agent, IP, and a foreign key to the user. **`account`** stores authentication methods — for email/password auth it stores the bcrypt-hashed password; for OAuth it stores the access token, refresh token, and provider ID. One user can have multiple accounts (e.g. email/password + Google OAuth). **`verification`** stores temporary tokens for email verification and password reset flows — each row has an identifier (e.g. the email), a value (the token), and an expiry time.

---

## C — Common Pitfalls + Fix

### ❌ Editing `better-auth generate` output by hand — schema drifts from BetterAuth's expectations

```prisma
// ❌ Manually removing a field BetterAuth needs
model Session {
  id        String @id
  // expiresAt removed because "we don't need it" ❌
  token     String @unique
  userId    String
}
// BetterAuth queries expiresAt for session cleanup → crashes at runtime
```

**Fix:** Keep BetterAuth models exactly as generated, add application fields only to `User`:

```prisma
// ✅ Add your own fields to User, leave Session/Account/Verification untouched
model User {
  // ... all BetterAuth-required fields unchanged ...

  // ← Only extend User with your app fields:
  role        String   @default("user")
  username    String?  @unique
  plan        String   @default("free")

  // Your app relations:
  orders      Order[]
  @@map("user")
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete Prisma schema section for BetterAuth with: all four required tables, a custom `role` (String, default `'user'`) and `plan` (String, default `'free'`) on `User`, a `@@index` on `Session` for efficient user session lookup, and a `@@index` on `Verification` for efficient token lookup. Include `@@map` on all models.

### Solution

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  role          String    @default("user")
  plan          String    @default("free")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt      @map("updated_at")

  sessions  Session[]
  accounts  Account[]

  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])   // fast: list active sessions for a user
  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  userId                String    @map("user_id")
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?   @map("access_token")
  refreshToken          String?   @map("refresh_token")
  idToken               String?   @map("id_token")
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt      @map("updated_at")

  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime? @default(now()) @map("created_at")
  updatedAt  DateTime? @updatedAt      @map("updated_at")

  @@index([identifier])   // fast: lookup verification token by email
  @@map("verification")
}
```

---

---

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

# 8 — Client-Side Usage — `createAuthClient`, React Hooks

---

## T — TL;DR

`createAuthClient()` creates the browser-side BetterAuth client. It provides methods for sign-up, sign-in, sign-out, and session access, plus React hooks (`useSession`) that reactively update components when auth state changes. The client communicates with your own `/api/auth/*` endpoints — no external service.

---

## K — Key Concepts

```typescript
// ── src/lib/auth-client.ts ────────────────────────────────────────────────
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,   // your app's URL
  // Must match BETTER_AUTH_URL on the server
})

// Named exports for convenience:
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
```

```typescript
// ── useSession hook — reactive session access ─────────────────────────────
'use client'
import { useSession } from '@/lib/auth-client'

export function UserAvatar() {
  const { data: session, isPending, error } = useSession()

  if (isPending) return <div>Loading…</div>
  if (!session)  return <a href="/sign-in">Sign In</a>

  return (
    <div>
      <img src={session.user.image ?? '/default-avatar.png'} alt={session.user.name} />
      <span>{session.user.name}</span>
      <span>{session.user.role}</span>  {/* custom field — typed ✅ */}
    </div>
  )
}

// useSession return shape:
// {
//   data:      Session | null   (null = not logged in)
//   isPending: boolean          (true while fetching)
//   error:     Error | null
//   refetch:   () => Promise<void>
// }
```

```typescript
// ── authClient methods reference ──────────────────────────────────────────

// Sign up
authClient.signUp.email({ name, email, password, ...customFields })
// → { data: { user, session } | null, error: AuthClientError | null }

// Sign in
authClient.signIn.email({ email, password, rememberMe? })
// → { data: { user, session } | null, error: AuthClientError | null }

// Sign out
authClient.signOut()
// → { data: { success: boolean } | null, error: ... }

// Get session (one-time fetch, not reactive)
authClient.getSession()
// → { data: Session | null, error: ... }

// Update user profile
authClient.updateUser({ name, image })
// → { data: { user } | null, error: ... }

// Change password
authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions? })

// List sessions
authClient.listSessions()

// Revoke a specific session
authClient.revokeSession({ token: sessionId })

// Revoke all other sessions (keep current)
authClient.revokeOtherSessions()
```

```typescript
// ── Session-gated component — redirect if not logged in ───────────────────
'use client'
import { useSession }  from '@/lib/auth-client'
import { useRouter }   from 'next/navigation'
import { useEffect }   from 'react'

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in?returnTo=' + encodeURIComponent(window.location.pathname))
    }
  }, [isPending, session, router])

  if (isPending) return <div>Loading…</div>
  if (!session)  return null  // avoid flash of content

  return <>{children}</>
}

// Note: prefer server-side protection (middleware / server component) for security.
// Client-side protection is a UX improvement, not a security boundary.
```

```typescript
// ── Role-based access in components ──────────────────────────────────────
'use client'
import { useSession } from '@/lib/auth-client'

export function AdminPanel() {
  const { data: session } = useSession()

  if (!session || session.user.role !== 'admin') {
    return <p>Access denied.</p>
  }

  return <div>Admin-only content here</div>
}
// Note: always enforce role checks SERVER-SIDE as well — client checks are UI only
```

---

## W — Why It Matters

- `useSession()` is reactive — when the user signs in or out in another tab, or when the session expires, `useSession` automatically updates the component. This is better than manually checking `getSession()` on every mount.
- The `baseURL` in `createAuthClient` must match `BETTER_AUTH_URL` on the server — if they differ (e.g. one uses `https://` and the other `http://`), cookies will be set for one origin and ignored by the other, causing persistent "not authenticated" bugs that are hard to diagnose.
- `isPending` must be handled — on first render, `useSession` hasn't fetched yet. If you render auth-dependent content without checking `isPending`, you'll see a flash of unauthenticated state even for logged-in users. Always show a loading state or skeleton while `isPending` is true.

---

## I — Interview Q&A

### Q: What is the difference between `useSession()` and `getSession()` in BetterAuth's client?

**A:** `useSession()` is a React hook that subscribes to session state — it fetches the current session on mount, caches it, and automatically re-fetches when auth state changes (sign-in, sign-out, session expiry). Components using `useSession` are reactively updated when auth state changes. It returns `{ data, isPending, error, refetch }`. `getSession()` is an imperative async function — it makes one fetch call to `/api/auth/get-session` and returns the current session. It does not subscribe to changes. Use `useSession()` in components that should respond to auth state changes (nav bar, user avatar, protected content). Use `getSession()` for one-off checks in event handlers, utility functions, or server-action-like scenarios where you need the session value at a specific moment but don't need reactivity.

---

## C — Common Pitfalls + Fix

### ❌ Using `useSession` without handling `isPending` — flash of unauthenticated state

```typescript
// ❌ Flashes "Sign In" before session loads
export function Nav() {
  const { data: session } = useSession()
  return session
    ? <button>Sign Out</button>
    : <a href="/sign-in">Sign In</a>   // ← shows briefly even when logged in ❌
}
```

**Fix:** Handle `isPending`:

```typescript
// ✅ No flash — skeleton while loading
export function Nav() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div style={{ width: 80, height: 36 }} />  // skeleton

  return session
    ? <button>Sign Out</button>
    : <a href="/sign-in">Sign In</a>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useAuth` custom hook that: (1) wraps `useSession`, (2) exposes `user`, `isLoading`, `isAuthenticated`, and `isAdmin` derived values, (3) exposes a `signOut` function that redirects to `/sign-in` after signing out. Show usage in a component.

### Solution

```typescript
// src/hooks/use-auth.ts
import { useSession, authClient } from '@/lib/auth-client'
import { useRouter }              from 'next/navigation'
import { useCallback }            from 'react'

export function useAuth() {
  const { data: session, isPending, refetch } = useSession()
  const router = useRouter()

  const signOut = useCallback(async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }, [router])

  return {
    user:            session?.user ?? null,
    session:         session?.session ?? null,
    isLoading:       isPending,
    isAuthenticated: !isPending && !!session,
    isAdmin:         session?.user?.role === 'admin',
    signOut,
    refetch,
  }
}

// ── Usage ──────────────────────────────────────────────────────────────────
'use client'
import { useAuth } from '@/hooks/use-auth'

export function DashboardHeader() {
  const { user, isLoading, isAuthenticated, isAdmin, signOut } = useAuth()

  if (isLoading) return <header>Loading…</header>

  if (!isAuthenticated) return null   // middleware handles redirect

  return (
    <header>
      <span>Hello, {user!.name}</span>
      {isAdmin && <a href="/admin">Admin Panel</a>}
      <button onClick={signOut}>Sign Out</button>
    </header>
  )
}
```

---

---

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