# 4 — pino-http — Request Logging Middleware

---

## T — TL;DR

`pino-http` is the official HTTP request logging middleware for pino. It logs every incoming request and its response — method, URL, status code, response time — as a single structured JSON line when the response completes. It integrates with Express, Fastify, and can be adapted for Next.js. It automatically attaches the request logger to `req.log` for use throughout the request lifecycle.

---

## K — Key Concepts

```bash
npm install pino-http
```

```typescript
// ── pino-http configuration ────────────────────────────────────────────────
import pinoHttp from 'pino-http'
import { logger } from '@/lib/logger'

export const httpLogger = pinoHttp({
  logger,   // use our configured pino instance

  // ── Request ID ────────────────────────────────────────────────────────────
  genReqId: (req) => {
    // Prefer header from upstream proxy/load balancer
    return (
      req.headers['x-request-id'] as string ??
      req.headers['x-correlation-id'] as string ??
      crypto.randomUUID()
    )
  },

  // ── Custom log level per response ─────────────────────────────────────────
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400)        return 'warn'
    if (res.statusCode >= 300)        return 'info'
    return 'info'
  },

  // ── Custom success message ─────────────────────────────────────────────────
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  // ── Custom error message ───────────────────────────────────────────────────
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode}: ${err?.message}`,

  // ── Serializers: shape what gets logged ───────────────────────────────────
  serializers: {
    req: (req) => ({
      method:    req.method,
      url:       req.url,
      userAgent: req.headers['user-agent'],
      ip:        req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  // ── Auto-logging: log the response when complete ──────────────────────────
  autoLogging: {
    // Skip health check endpoints — very noisy
    ignore: (req) =>
      ['/health', '/ping', '/_next'].some(p =>
        req.url?.startsWith(p)
      ),
  },

  // ── Redaction — never log these fields ────────────────────────────────────
  redact: {
    paths:  ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
})

// ── Output line on each completed request:
// {
//   "level": 30,
//   "time": "...",
//   "requestId": "abc-123",
//   "req": { "method": "POST", "url": "/api/trpc/post.create", ... },
//   "res": { "statusCode": 200 },
//   "responseTime": 42,
//   "msg": "POST /api/trpc/post.create → 200"
// }
```

```typescript
// ── Next.js: wrapping the API route handler ────────────────────────────────
// pino-http is designed for Express/Connect middleware
// For Next.js App Router, adapt it as a wrapper

import { httpLogger } from '@/lib/http-logger'
import type { NextRequest, NextResponse } from 'next/server'
import { IncomingMessage, ServerResponse } from 'http'

// For Next.js, the simplest approach is to log manually in the route handler
// using the request logger from context — pino-http works best with Fastify/Express

// Minimal Next.js request logging wrapper:
export function withRequestLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
    const start     = Date.now()
    const reqLog    = logger.child({
      requestId,
      method: req.method,
      path:   new URL(req.url).pathname,
    })

    reqLog.info('Request received')

    try {
      const response = await handler(req)
      reqLog.info(
        { statusCode: response.status, duration: Date.now() - start },
        'Request completed'
      )
      return response
    } catch (err) {
      reqLog.error(
        { err, duration: Date.now() - start },
        'Request failed'
      )
      throw err
    }
  }
}
```

```typescript
// ── Using req.log in pino-http (Express/Fastify) ───────────────────────────
// pino-http attaches a child logger to req.log automatically
// Every log in a route handler via req.log includes the request's fields

// Express example:
app.use(httpLogger)

app.get('/users', async (req, res) => {
  req.log.info('Fetching users')          // includes requestId, method, url ✅
  const users = await prisma.user.findMany()
  req.log.info({ count: users.length }, 'Users fetched')
  res.json(users)
})
```

---

## W — Why It Matters

- `pino-http` logs one line per completed request — not on arrival and not for every internal operation. This is the right granularity for HTTP access logs in production: you see every request's outcome, status, and duration without duplication.
- `customLogLevel` maps HTTP status codes to pino levels — 5xx responses are `error`, 4xx are `warn`, success is `info`. This means your error dashboard lights up for server errors but not for client 404s. The level follows the severity of the HTTP response.
- The `ignore` filter for health check endpoints prevents noise — a Kubernetes liveness probe hitting `/health` every 10 seconds would generate 8,640 log lines per day from a single pod. Ignoring it keeps the logs signal-rich.

---

## I — Interview Q&A

### Q: What does `pino-http` log and when does it log it?

**A:** `pino-http` logs one structured JSON line per completed HTTP request — it waits until the response is fully sent, then logs the request method, URL, response status code, response time, and any custom fields. Logging on completion (not on arrival) gives you the full picture in one line: what the client asked for, what the server responded with, and how long it took. The request logger (`req.log`) is a child logger available throughout the request lifecycle — you can add context to it and it all appears in the final log line. This contrasts with logging on arrival (you don't know the status yet) or logging twice (arrival + completion) which doubles log volume.

---

## C — Common Pitfalls + Fix

### ❌ Logging health check endpoints — massive noise from liveness probes

```typescript
// ❌ No ignore filter — Kubernetes probe hits /health every 10s = 8640 logs/pod/day
export const httpLogger = pinoHttp({ logger })
// /health appears in every log aggregation query, pollutes metrics ❌
```

**Fix:** Filter known noisy endpoints:

```typescript
// ✅
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => ['/health', '/ping', '/ready', '/_next/static'].some(
      p => req.url?.startsWith(p)
    ),
  },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Configure `pinoHttp` for a production Express app: (1) use the base logger; (2) generate request IDs from `x-request-id` header or UUID; (3) set log level based on status code; (4) log only `method`, `url`, `ip` for requests; (5) skip `/health` and `/metrics`; (6) redact `authorization` header.

### Solution

```typescript
// src/lib/http-logger.ts
import pinoHttp from 'pino-http'
import { logger } from '@/lib/logger'
import { randomUUID } from 'crypto'

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) =>
    (req.headers['x-request-id'] as string) ?? randomUUID(),

  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400)        return 'warn'
    return 'info'
  },

  serializers: {
    req: (req) => ({
      method: req.method,
      url:    req.url,
      ip:     req.headers['x-forwarded-for']?.split(',')[0] ?? req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },

  autoLogging: {
    ignore: (req) => ['/health', '/metrics', '/ping'].some(p => req.url?.startsWith(p)),
  },

  redact: {
    paths:  ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
    censor: '[REDACTED]',
  },
})
```

---

---
