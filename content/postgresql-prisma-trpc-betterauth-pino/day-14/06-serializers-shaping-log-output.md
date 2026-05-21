# 6 — Serializers — Shaping Log Output

---

## T — TL;DR

Serializers transform values before they're written to the log. Pino has built-in serializers for `err`, `req`, and `res`. Custom serializers let you: strip noisy fields, safely render domain objects (User, Order), and prevent accidental logging of sensitive data. Define them once in the logger config — they apply everywhere.

---

## K — Key Concepts

```typescript
// ── Built-in serializers ──────────────────────────────────────────────────
import pino from 'pino'

// pino.stdSerializers.err — serializes Error objects
// { type, message, stack }

// pino.stdSerializers.req — serializes http.IncomingMessage
// { method, url, headers, remoteAddress, remotePort }

// pino.stdSerializers.res — serializes http.ServerResponse
// { statusCode }

// Use them (they're not applied by default):
const logger = pino({
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  }
})
```

```typescript
// ── Custom serializers — shaping domain objects ────────────────────────────
import pino from 'pino'

interface SerializableUser {
  id:           string
  email:        string
  passwordHash: string
  role:         string
}

interface SerializableOrder {
  id:         number
  customerId: string
  items:      unknown[]
  total:      number
}

const logger = pino({
  serializers: {
    // ── Error: include cause chain ────────────────────────────────────────
    err: (err: Error & { cause?: unknown; code?: string }) => ({
      type:    err.constructor?.name,
      message: err.message,
      code:    err.code,
      stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
      cause:   err.cause ? String(err.cause) : undefined,
    }),

    // ── User: strip sensitive fields ──────────────────────────────────────
    user: (user: SerializableUser) => ({
      id:   user.id,
      role: user.role,
      // email: omitted — PII, searchable from userId
      // passwordHash: omitted — never log credentials
    }),

    // ── Order: summary only — full items array would be massive ───────────
    order: (order: SerializableOrder) => ({
      id:         order.id,
      customerId: order.customerId,
      itemCount:  order.items.length,
      total:      order.total,
      // items: omitted — could be 100+ rows, log orderId instead
    }),

    // ── Request: minimal fields ────────────────────────────────────────────
    req: (req: { method: string; url: string; remoteAddress?: string }) => ({
      method: req.method,
      url:    req.url,
      ip:     req.remoteAddress,
    }),
  },
})

// Usage:
logger.info({ user }, 'User authenticated')
// { "msg": "User authenticated", "user": { "id": "u123", "role": "admin" } }
// passwordHash never appears ✅
```

```typescript
// ── Serializer for Prisma Decimal ──────────────────────────────────────────
// Prisma.Decimal is not JSON-serializable by default
import { Prisma } from '@prisma/client'

const logger = pino({
  serializers: {
    // Auto-convert Decimal to string in any log object
    // Note: pino serializers run on named keys, not deeply nested values
    // For Decimal fields, pass .toString() in the log call:
  }
})

// Best practice: convert Decimal explicitly before logging
logger.info({ total: order.total.toString() }, 'Order total logged')

// Or use a helper:
function serializeForLog(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      v instanceof Prisma.Decimal ? v.toString() : v
    ])
  )
}
logger.info(serializeForLog({ total: order.total }), 'Order')
```

---

## W — Why It Matters

- Serializers are the last line of defence against accidental PII or credential logging — even if a developer writes `logger.info({ user }, 'msg')` with a full user object, the `user` serializer strips `passwordHash`, `email`, and any other sensitive field before the log is written.
- Custom `err` serializers that include `cause` chains are critical for debugging wrapped errors — `TRPCError` wraps Prisma errors which wrap PostgreSQL errors. Without a `cause` serializer, you see only the outermost message. With it, you see the full chain.
- Omitting large arrays (like order items) from serializers prevents accidental mega-log lines — a single order with 100 items serialized in full could be a 10KB log line. At 1000 orders/minute, that's 600MB/minute of logs. Logging `itemCount` instead costs 20 bytes.

---

## I — Interview Q&A

### Q: What are pino serializers and why are they preferable to manually stripping fields in every log call?

**A:** Pino serializers are transform functions registered under a key name — whenever you log `{ user: userObject }`, pino runs the `user` serializer before writing. You define the serializer once in the logger configuration and it applies to every log call in the entire application that uses the `user` key. This is preferable to manually stripping fields because: (1) it's impossible to forget — developers can log `{ user }` freely, knowing sensitive fields are always stripped; (2) it's a single definition — changing what gets logged from the user object is one change, not a grep-and-replace across dozens of log calls; (3) it's enforced at the logging layer — even third-party code that logs `{ user }` through your logger gets the serializer applied.

---

## C — Common Pitfalls + Fix

### ❌ Logging full objects without serializers — sensitive fields exposed

```typescript
// ❌ Logs passwordHash, tokens, full address — PII in logs
logger.info({ user: dbUser }, 'User fetched')
// { "user": { "id": "u1", "email": "...", "passwordHash": "$2b$10$...", ... } } ❌
```

**Fix:** Use a serializer or explicit projection:

```typescript
// ✅ Option A: serializer (best — applies everywhere)
// In logger config: serializers: { user: (u) => ({ id: u.id, role: u.role }) }
logger.info({ user: dbUser }, 'User fetched')
// { "user": { "id": "u1", "role": "admin" } } ✅

// ✅ Option B: explicit — when no serializer defined
logger.info({ userId: dbUser.id, role: dbUser.role }, 'User fetched')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `src/lib/logger.ts` with complete serializers for: `err` (type, message, code, cause — no stack in prod), `user` (id, role only), `req` (method, url, ip), `res` (statusCode). Export the logger.

### Solution

```typescript
// src/lib/logger.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level:     process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid:     process.pid,
    service: process.env.SERVICE_NAME ?? 'api',
    env:     process.env.NODE_ENV     ?? 'development',
    version: process.env.APP_VERSION  ?? 'dev',
  },
  serializers: {
    err: (err: Error & { cause?: unknown; code?: string }) => ({
      type:    err?.constructor?.name ?? 'Error',
      message: err?.message,
      code:    (err as any)?.code,
      cause:   err?.cause != null ? String(err.cause) : undefined,
      stack:   isDev ? err?.stack : undefined,
    }),
    user: (u: { id?: string; role?: string }) => ({
      id:   u?.id,
      role: u?.role,
    }),
    req: (req: { method?: string; url?: string; remoteAddress?: string; headers?: Record<string, string> }) => ({
      method: req?.method,
      url:    req?.url,
      ip:     req?.headers?.['x-forwarded-for']?.split(',')[0] ?? req?.remoteAddress,
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res?.statusCode,
    }),
  },
  ...(isDev && {
    transport: {
      target:  'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
    },
  }),
})

export type AppLogger = typeof logger
```

---

---
