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
