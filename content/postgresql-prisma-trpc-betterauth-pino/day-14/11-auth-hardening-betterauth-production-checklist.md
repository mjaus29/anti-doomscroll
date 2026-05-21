# 11 — Auth Hardening — BetterAuth Production Checklist

---

## T — TL;DR

BetterAuth out of the box is functional but needs production hardening: enforce HTTPS-only cookies, set session expiry, rate-limit auth endpoints, validate redirect URLs, configure CORS correctly, add CSP headers, and audit additionalFields. These aren't optional — they're the difference between "auth works" and "auth is production-safe".

---

## K — Key Concepts

```typescript
// ── src/lib/auth.ts — production-hardened BetterAuth config ──────────────
import { betterAuth }  from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }      from '@/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // ── Base URL — must match production domain ───────────────────────────
  baseURL: process.env.BETTER_AUTH_URL!,   // https://app.example.com
  secret:  process.env.BETTER_AUTH_SECRET!, // 32+ random bytes, never commit

  // ── Session configuration ──────────────────────────────────────────────
  session: {
    expiresIn:         60 * 60 * 24 * 7,   // 7 days
    updateAge:         60 * 60 * 24,        // refresh if older than 1 day
    cookieCache: {
      enabled:   true,
      maxAge:    5 * 60,    // cache session in cookie for 5 min — reduces DB reads
    },
  },

  // ── Email/password hardening ───────────────────────────────────────────
  emailAndPassword: {
    enabled:           true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // autoSignIn: false  ← don't auto-sign in after registration (require email verify)
  },

  // ── Cookie security ────────────────────────────────────────────────────
  advanced: {
    cookiePrefix: 'app',   // app.session-token (avoids default 'better-auth')
    useSecureCookies: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    // defaultCookieAttributes applied to all auth cookies:
    defaultCookieAttributes: {
      httpOnly: true,     // not accessible via JS — XSS protection
      sameSite: 'lax',    // CSRF protection (use 'strict' for highest security)
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
    },
  },

  // ── Trusted origins — prevent CSRF ────────────────────────────────────
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,    // https://app.example.com
    // Add other trusted origins if using multiple frontends
    // process.env.MOBILE_APP_URL!,
  ],

  // ── Additional user fields ─────────────────────────────────────────────
  user: {
    additionalFields: {
      role: {
        type:         'string',
        defaultValue: 'user',
        required:     false,
        input:        false,  // ← users cannot set their own role via API ✅
      },
      plan: {
        type:         'string',
        defaultValue: 'free',
        required:     false,
        input:        false,  // ← users cannot set their own plan via API ✅
      },
    },
  },
})
```

```typescript
// ── Rate limiting auth endpoints ──────────────────────────────────────────
// BetterAuth supports rate limiting via plugins
// Or implement at the middleware level

// middleware.ts — rate limit /api/auth paths
import { NextResponse, type NextRequest } from 'next/server'

const authAttempts = new Map<string, { count: number; resetAt: number }>()

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/auth/sign-in')) {
    const ip    = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const now   = Date.now()
    const entry = authAttempts.get(ip)

    if (entry && now < entry.resetAt) {
      if (entry.count >= 10) {
        return NextResponse.json(
          { error: 'Too many login attempts. Try again in 15 minutes.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } }
        )
      }
      entry.count++
    } else {
      authAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    }
  }
  return NextResponse.next()
}
// Production: use Redis for distributed rate limiting (this is in-memory only)
```

```typescript
// ── Environment variable checklist ────────────────────────────────────────
// .env (never commit)
// BETTER_AUTH_URL=https://app.example.com
// BETTER_AUTH_SECRET=<32+ random bytes: openssl rand -base64 32>
// DATABASE_URL=postgresql://...
// NEXT_PUBLIC_APP_URL=https://app.example.com

// Validate on startup:
const requiredEnvVars = [
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
] as const

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    logger.fatal({ key }, 'Required environment variable missing')
    process.exit(1)
  }
}

if (process.env.BETTER_AUTH_SECRET!.length < 32) {
  logger.fatal('BETTER_AUTH_SECRET must be at least 32 characters')
  process.exit(1)
}
```

```typescript
// ── Security headers for Next.js ───────────────────────────────────────────
// next.config.ts
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',  // HSTS 2 years
  },
  {
    key:   'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // tighten in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const config: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
export default config
```

```typescript
// ── Production auth hardening checklist ──────────────────────────────────
//
// ✅ BETTER_AUTH_SECRET is 32+ random bytes (not a dictionary word)
// ✅ useSecureCookies: true (HTTPS only)
// ✅ httpOnly: true on session cookie (no JS access)
// ✅ sameSite: 'lax' or 'strict' (CSRF protection)
// ✅ trustedOrigins: explicit list (no wildcard *)
// ✅ requireEmailVerification: true in production
// ✅ role/plan additionalFields have input: false (server-only)
// ✅ Rate limiting on /api/auth/sign-in (10 attempts / 15 min)
// ✅ Session expiry configured (7 days default)
// ✅ HSTS header set (strict-transport-security)
// ✅ X-Frame-Options: DENY (clickjacking protection)
// ✅ Startup validation of required env vars
// ✅ Auth errors logged at info level (login failed = expected, not error)
// ✅ Successful logins logged with userId + ip (security audit)
// ✅ Never log session tokens, passwords, or cookies
```

---

## W — Why It Matters

- `input: false` on `role` and `plan` additionalFields is a critical security requirement — without it, a crafty client could send `{ role: 'admin' }` in the registration payload and grant themselves admin access. Marking fields as `input: false` means BetterAuth ignores those fields from client payloads.
- `useSecureCookies: true` ensures the session cookie is only sent over HTTPS — without it, a network attacker on HTTP can steal the session cookie and impersonate the user. This is a non-negotiable production requirement.
- Startup validation of environment variables (the `for` loop + `process.exit(1)`) prevents silent misconfiguration — a missing `BETTER_AUTH_SECRET` would cause BetterAuth to use an insecure default or fail at runtime with a cryptic error. Failing fast at startup with a clear message is always better.

---

## I — Interview Q&A

### Q: What does `input: false` on a BetterAuth additionalField mean and why is it critical for role-based systems?

**A:** BetterAuth's `additionalFields` lets you extend the user model with custom columns. Each field has an `input` property — when `true`, clients can set this field during registration or profile update via the BetterAuth API. When `false`, BetterAuth ignores any client-provided value for this field and only allows server-side updates (e.g., via Prisma or BetterAuth's admin API). For `role` and `plan` fields, `input: false` is critical — if `input` were `true`, a user could send `{ "role": "admin" }` in the registration request body and grant themselves admin access. With `input: false`, the role is always set by server-side logic (default value, or explicit admin assignment). Never allow clients to directly set privilege-escalating fields.

---

## C — Common Pitfalls + Fix

### ❌ No startup validation of BETTER_AUTH_SECRET — silent misconfiguration

```typescript
// ❌ Missing BETTER_AUTH_SECRET means BetterAuth uses a weak or no secret
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,  // could be undefined in misconfigured deploy
})
// Sessions may be signed with an empty or default secret — forgeable ❌
```

**Fix:** Validate and fail fast:

```typescript
// ✅ Fail at startup, not at runtime
const secret = process.env.BETTER_AUTH_SECRET
if (!secret || secret.length < 32) {
  console.error('[FATAL] BETTER_AUTH_SECRET must be set and at least 32 characters')
  process.exit(1)
}

export const auth = betterAuth({
  secret,  // ← guaranteed non-null, validated length ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete production-hardened `src/lib/auth.ts` with: secure cookies, email verification required, session expiry, `role` and `plan` as server-only fields, trusted origins from env, secret validation, and startup logger. Log auth events (login success, login failure) using the base logger.

### Solution

```typescript
// src/lib/auth.ts
import { betterAuth }    from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma }        from '@/lib/prisma'
import { logger }        from '@/lib/logger'

// ── Startup validation ─────────────────────────────────────────────────────
const secret  = process.env.BETTER_AUTH_SECRET
const baseURL = process.env.BETTER_AUTH_URL
const appURL  = process.env.NEXT_PUBLIC_APP_URL

if (!secret || secret.length < 32) {
  logger.fatal('BETTER_AUTH_SECRET missing or too short (need 32+ chars)')
  process.exit(1)
}
if (!baseURL) {
  logger.fatal('BETTER_AUTH_URL is required')
  process.exit(1)
}

logger.info({ baseURL, env: process.env.NODE_ENV }, 'Auth module initialised')

// ── Auth instance ──────────────────────────────────────────────────────────
export const auth = betterAuth({
  database:  prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL:   baseURL,
  secret:    secret,

  session: {
    expiresIn:  60 * 60 * 24 * 7,   // 7 days
    updateAge:  60 * 60 * 24,        // slide if used within 24h
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  emailAndPassword: {
    enabled:                  true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
    minPasswordLength:        8,
    maxPasswordLength:        128,
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
    },
  },

  trustedOrigins: [
    appURL ?? 'http://localhost:3000',
  ].filter(Boolean),

  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user',  required: false, input: false },
      plan: { type: 'string', defaultValue: 'free',  required: false, input: false },
    },
  },

  // Auth event hooks for security logging
  hooks: {
    after: [
      {
        matcher: (ctx) => ctx.path === '/sign-in/email',
        handler: async (ctx) => {
          const body = ctx.body as { email?: string } | undefined
          if (ctx.context.returned?.user) {
            logger.info({ userId: ctx.context.returned.user.id }, 'User signed in')
          } else {
            logger.info({ email: '[REDACTED]' }, 'Sign-in failed')
          }
        },
      },
    ],
  },
})
```

---

## ✅ Day 14 Complete — Pino and Production Composition

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Structured Logging with Pino — Why JSON Logs Win | ☐ |
| 2 | Log Levels — When to Use Each | ☐ |
| 3 | Child Loggers — Context Propagation | ☐ |
| 4 | pino-http — Request Logging Middleware | ☐ |
| 5 | Request IDs — Correlation Across Layers | ☐ |
| 6 | Serializers — Shaping Log Output | ☐ |
| 7 | Redaction — Scrubbing Secrets from Logs | ☐ |
| 8 | Secure Log Hygiene — What Never Goes in Logs | ☐ |
| 9 | End-to-End Backend Flow — Composition | ☐ |
| 10 | Migration Discipline — Safe Schema Evolution | ☐ |
| 11 | Auth Hardening — BetterAuth Production Checklist | ☐ |

---

## 🗺️ One-Page Mental Model — Day 14

```
PINO BASICS
  JSON logs — one line per event, machine-parseable, searchable by field
  pino({ level, timestamp, base, serializers, redact, transport })
  base: { service, env, version, pid }  — appears on every line
  pino-pretty in dev (transport), plain JSON in prod
  Use structured fields: logger.info({ userId, action }, 'msg')
  NEVER string interpolation: logger.info(`User ${id}`) ← not searchable

LOG LEVELS
  trace  (10): algorithm internals — never in prod
  debug  (20): dev diagnostics — off in prod, set temporarily via LOG_LEVEL
  info   (30): normal business events — prod baseline (server start, user action)
  warn   (40): recovered issues — slow query, retry succeeded, config fallback
  error  (50): system failures affecting users — DB down, payment failed
  fatal  (60): unrecoverable — follow with process.exit(1)
  Rule: 404 = info, validation fail = debug, DB down = error
  Guard: if (logger.isLevelEnabled('debug')) { expensiveDebugCall() }

CHILD LOGGERS
  logger.child({ requestId, userId }) → inherits parent, adds permanent fields
  Every log from the child carries those fields automatically
  Create at request boundary in createTRPCContext → ctx.log
  Pass ctx.log into service functions as parameter
  Don't create child inside loops — create once, log fields inline

PINO-HTTP
  pinoHttp({ logger, genReqId, customLogLevel, serializers, autoLogging, redact })
  One line per COMPLETED request (not on arrival)
  customLogLevel: 5xx → error, 4xx → warn, 2xx → info
  autoLogging.ignore: skip /health, /metrics, /ping
  req.log available in handlers for correlated logging

REQUEST IDs
  Generate at edge (middleware.ts) or read from upstream proxy (x-request-id)
  Inject into createTRPCContext headers → ctx.requestId + ctx.log
  Pass to external API calls as X-Request-Id / Idempotency-Key header
  Return in response headers → client shows in error messages, user reports to support
  Filter logs by requestId → full request trace in 1 query

SERIALIZERS
  serializers: { err, user, req, res, order } — registered per key name
  Run on values logged under that key — automatically applied everywhere
  err: type, message, code, cause (no stack in prod)
  user: id, role only (strip passwordHash, email, other PII)
  order: id, total, itemCount (not full items array)
  Test serializers: { write: (s) => lines.push(s) } pattern

REDACTION
  redact: { paths: ['**.password', 'req.headers.authorization'], censor: '[REDACTED]' }
  Runs before serialisation — value never exists as string in output
  '**.key' = any depth wildcard
  Define centrally — developers can log freely, sensitive fields auto-stripped
  Test: verify redacted fields contain '[REDACTED]', non-sensitive fields intact

LOG HYGIENE
  NEVER LOG: password, passwordHash, token, apiKey, sessionToken, cookie, card, ssn
  NEVER LOG: email, phoneNumber, fullName, address (PII — use userId instead)
  NEVER LOG: req.body wholesale — may contain any of the above
  LOG: userId, orderId, requestId, duration, statusCode, action
  LOG: events (login, payment) not data (what password they tried)
  Audit logs → database (durable, access-controlled) not log stream

END-TO-END FLOW
  middleware.ts → x-request-id → createTRPCContext (session, log, prisma)
  → timingMw (log start/end) → authMw (UNAUTHORIZED check) → adminMw (FORBIDDEN check)
  → .input() Zod validation → handler (business logic, Prisma, ownership check)
  → errorFormatter (attach zodError + requestId, log INTERNAL errors)
  → response (x-request-id header echoed)
  onError in fetchRequestHandler → Sentry/external alerting (not client response)

MIGRATION DISCIPLINE
  prisma migrate dev --name descriptive_name  ← dev (generates + applies)
  prisma migrate deploy                        ← prod CI/CD (applies pending only)
  prisma migrate status                        ← check state
  Migration files: IMMUTABLE after applied — create new to fix, never edit
  Safe: ADD COLUMN with DEFAULT or nullable
  Unsafe: ADD NOT NULL without DEFAULT (backfill first → then add constraint)
  Rename: use @map (Prisma rename, no SQL) or expand-contract (3-deploy process)
  Never: prisma migrate reset in production (destroys all data)

AUTH HARDENING (BETTERAUTH)
  secret: 32+ random bytes, validated on startup, from env only
  useSecureCookies: true in production (HTTPS-only cookie)
  httpOnly: true (no JS access — XSS protection)
  sameSite: 'lax' (CSRF protection)
  trustedOrigins: explicit list (no wildcards)
  requireEmailVerification: true in production
  role/plan additionalFields: input: false (server-only — client can't self-assign)
  Rate limit: /api/auth/sign-in (10 attempts / 15 min IP-based)
  Startup: fail fast if required env vars missing or short
  Log: sign-in success with userId (info), sign-in failure (info — expected)
  Never log: session tokens, passwords, cookies, raw auth headers
```

> **Your next action:** Open `src/lib/logger.ts`. Add the `redact` config with `'**.password'` and `'req.headers.authorization'`. Log one thing with `ctx.log.info({ userId: 'test' }, 'test')` and confirm it includes your `requestId`. That's the whole logging system working end-to-end.

> "Doing one small thing beats opening a feed."
