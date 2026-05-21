
# 📅 Day 14 — Pino and Production Composition

> **Goal:** Add structured, secure, production-grade logging to the backend — wire pino through every layer, attach request IDs, redact secrets, compose the full backend flow end-to-end, harden auth, and enforce migration discipline.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** pino · pino-http · tRPC v11 · BetterAuth 1.5 · Prisma 7 · Next.js 16 · TypeScript 6

---

## 📋 Day 14 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Structured Logging with Pino — Why JSON Logs Win | 10 min |
| 2 | Log Levels — When to Use Each | 10 min |
| 3 | Child Loggers — Context Propagation | 12 min |
| 4 | pino-http — Request Logging Middleware | 12 min |
| 5 | Request IDs — Correlation Across Layers | 12 min |
| 6 | Serializers — Shaping Log Output | 10 min |
| 7 | Redaction — Scrubbing Secrets from Logs | 10 min |
| 8 | Secure Log Hygiene — What Never Goes in Logs | 10 min |
| 9 | End-to-End Backend Flow — Composition | 15 min |
| 10 | Migration Discipline — Safe Schema Evolution | 12 min |
| 11 | Auth Hardening — BetterAuth Production Checklist | 12 min |

---

---

# 1 — Structured Logging with Pino — Why JSON Logs Win

---

## T — TL;DR

Pino writes logs as newline-delimited JSON. Every log line is a parseable object — timestamp, level, message, and any fields you attach. JSON logs can be ingested by Datadog, Loki, CloudWatch, and every major log platform without custom parsers. Pino is the fastest Node.js logger — 5–10× faster than Winston or Bunyan — because it does minimal work in the hot path and delegates formatting to a separate process.

---

## K — Key Concepts

```bash
# Install
npm install pino pino-pretty
npm install --save-dev @types/pino
```

```typescript
// ── src/lib/logger.ts — base logger ───────────────────────────────────────
import pino from 'pino'

const isDev  = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

export const logger = pino({
  // ── Level ────────────────────────────────────────────────────────────────
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

  // ── Timestamp ─────────────────────────────────────────────────────────────
  timestamp: pino.stdTimeFunctions.isoTime,
  // Produces: "time":"2025-06-15T08:30:00.123Z"

  // ── Base fields — appear on every log line ────────────────────────────────
  base: {
    pid:     process.pid,
    service: process.env.SERVICE_NAME ?? 'api',
    env:     process.env.NODE_ENV     ?? 'development',
    version: process.env.APP_VERSION  ?? 'local',
  },

  // ── Development: pretty-print to stdout ───────────────────────────────────
  ...(isDev && {
    transport: {
      target:  'pino-pretty',
      options: {
        colorize:        true,
        translateTime:   'SYS:HH:MM:ss.l',
        ignore:          'pid,hostname',
        levelFirst:      true,
        messageKey:      'msg',
        errorLikeObjectKeys: ['err', 'error'],
      },
    },
  }),
})

// Dev output (human-readable):
// 08:30:00.123 INFO  [api] Server started  port=3000
//
// Prod output (JSON, one line):
// {"level":30,"time":"2025-06-15T08:30:00.123Z","pid":42,"service":"api","msg":"Server started","port":3000}
```

```typescript
// ── Basic logging API ──────────────────────────────────────────────────────
import { logger } from '@/lib/logger'

// Log a message
logger.info('Server started')

// Log with structured fields — ALWAYS use this pattern, not string interpolation
logger.info({ port: 3000, host: '0.0.0.0' }, 'Server started')
// ✅ Produces: { "msg": "Server started", "port": 3000, "host": "0.0.0.0" }

// ❌ Never use string interpolation — it's slower and fields aren't searchable
logger.info(`Server started on port ${3000}`)
// ❌ Produces: { "msg": "Server started on port 3000" } — port is buried in the message string

// Log an error with the full error object
try {
  throw new Error('Connection refused')
} catch (err) {
  logger.error({ err }, 'Database connection failed')
  // err is serialised as: { "err": { "type": "Error", "message": "...", "stack": "..." } }
}

// Log with multiple fields
logger.info({ userId: 'u123', action: 'login', ip: '1.2.3.4' }, 'User logged in')
```

```typescript
// ── Pino's newline-delimited JSON (NDJSON) ─────────────────────────────────
// Each log line is a complete, parseable JSON object:
// {"level":30,"time":"...","pid":42,"service":"api","msg":"Server started","port":3000}
// {"level":40,"time":"...","pid":42,"service":"api","msg":"Slow query","duration":1234}
// {"level":50,"time":"...","pid":42,"service":"api","err":{"message":"..."},"msg":"DB error"}

// Level numbers:
// 10 = trace, 20 = debug, 30 = info, 40 = warn, 50 = error, 60 = fatal

// Ingest with jq in terminal:
// cat app.log | jq '.msg, .level'
// cat app.log | jq 'select(.level >= 40)'   // warnings and above
// cat app.log | jq 'select(.requestId == "abc-123")'   // by request ID
```

---

## W — Why It Matters

- JSON logs are queryable in production — `SELECT * FROM logs WHERE level = 'error' AND userId = 'u123'` is how log platforms work. String logs require regex parsing and are 10× slower to search at scale.
- Pino's architecture (minimal hot path, offload formatting to a worker) matters at scale — a high-traffic Node.js app may log 10,000+ lines per second. Winston at that rate adds 20–50ms of CPU per request. Pino adds under 1ms.
- `base` fields appear on every log line — service name, version, environment. This is what lets you query `service="api" AND version="1.2.3"` to find logs from a specific deployment in a mixed multi-service log stream.

---

## I — Interview Q&A

### Q: Why use structured JSON logging instead of plain string logs in production?

**A:** Structured logs are machine-parseable first. Every log line is a JSON object with named fields — `userId`, `duration`, `statusCode`, `requestId`. This means log aggregation platforms (Datadog, Grafana Loki, AWS CloudWatch Insights) can filter, group, and alert on specific fields without regex. For example: "show me all errors where `userId = 'u123'` in the last hour" is a 50ms query on structured logs and a multi-second full-text scan on string logs. Structured logs also prevent context loss — if `duration` is a number field, you can plot it as a metric. If it's embedded in a string like `"Query took 234ms"`, extracting it requires a regex that breaks if the message wording changes.

---

## C — Common Pitfalls + Fix

### ❌ String interpolation — fields lost in message string

```typescript
// ❌ userId is not a searchable field
logger.info(`User ${userId} logged in from ${ip}`)
// Produces: { "msg": "User u123 logged in from 1.2.3.4" }
// Can't filter by userId in Datadog — it's in the string ❌
```

**Fix:** Use object as first argument:

```typescript
// ✅ userId and ip are searchable fields
logger.info({ userId, ip }, 'User logged in')
// Produces: { "msg": "User logged in", "userId": "u123", "ip": "1.2.3.4" }
```

---

## K — Coding Challenge + Solution

### Challenge

Create `src/lib/logger.ts` with: (1) `pino-pretty` in dev, plain JSON in prod; (2) `base` fields including `service`, `env`, `version` from env vars; (3) ISO timestamps; (4) `LOG_LEVEL` env var override; (5) export a typed `AppLogger` type alias.

### Solution

```typescript
// src/lib/logger.ts
import pino, { type Logger } from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid:     process.pid,
    service: process.env.SERVICE_NAME  ?? 'api',
    env:     process.env.NODE_ENV      ?? 'development',
    version: process.env.APP_VERSION   ?? 'dev',
  },
  ...(isDev && {
    transport: {
      target:  'pino-pretty',
      options: {
        colorize:      true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore:        'pid,hostname,service,env,version',
      },
    },
  }),
})

export type AppLogger = typeof logger
```

---

---

# 2 — Log Levels — When to Use Each

---

## T — TL;DR

Pino has six levels: `trace` → `debug` → `info` → `warn` → `error` → `fatal`. Set `level: 'info'` in production — `debug` and `trace` are too noisy. Use `warn` for recoverable issues that need attention. Use `error` for failures that affected a user. Use `fatal` + process exit for unrecoverable crashes. Never log `error` for expected conditions (e.g., 404, validation failure).

---

## K — Key Concepts

```typescript
// ── The six levels and when to use them ───────────────────────────────────

// TRACE (10) — extremely verbose, internal algorithm steps
// Use: loop iterations, internal state transitions, low-level DB query details
// Production: NEVER — massive volume, no production signal
logger.trace({ queryParams: input }, 'Entering findUsers')

// DEBUG (20) — developer-facing diagnostic information
// Use: function entry/exit, input/output, branch decisions, config loaded
// Production: off (set LOG_LEVEL=debug temporarily for targeted debugging)
logger.debug({ userId, filters }, 'Fetching user tasks')
logger.debug({ config: appConfig }, 'App config loaded')

// INFO (30) — normal business events worth recording ← production baseline
// Use: server started, user signed in, order created, job completed, cron ran
// Ask: "would an oncall engineer want to know this happened?" → yes = info
logger.info({ userId, orderId }, 'Order created')
logger.info({ port: 3000 }, 'HTTP server listening')
logger.info({ jobId, duration: 234 }, 'Background job completed')

// WARN (40) — unexpected but recovered; degraded state; needs attention
// Use: deprecated API used, retry succeeded after failure, rate limit approaching,
//      config missing (using default), slow query above threshold
// NOT for user errors (wrong password, validation fail) — those are expected
logger.warn({ duration: 3400, query: 'findOrders' }, 'Slow database query')
logger.warn({ retries: 2, service: 'stripe' }, 'External API retry succeeded')
logger.warn({ key: 'SMTP_HOST', default: 'localhost' }, 'Config missing, using default')

// ERROR (50) — failure that affected a user or system; investigate required
// Use: unhandled exception, DB operation failed, external API permanently failed,
//      data integrity issue, payment failed
// NOT for validation errors or 404s — those are expected, not errors
logger.error({ err, userId, orderId }, 'Payment processing failed')
logger.error({ err }, 'Database connection lost')

// FATAL (60) — process cannot continue; must exit
// Use: startup failure (can't connect to DB), corrupted config, unrecoverable state
// Always follow with: process.exit(1)
logger.fatal({ err }, 'Cannot connect to database on startup')
process.exit(1)
```

```typescript
// ── Level decision flowchart ───────────────────────────────────────────────
// Is it expected / by design?           → Don't log as error (use info or skip)
// Did it affect a user?                 → error
// Did it recover automatically?         → warn
// Is it a normal business event?        → info
// Is it only useful when debugging?     → debug
// Is it implementation internals?       → trace

// Common mistakes:
// ❌ logger.error for 404 — 404 is expected, not an error condition
// ❌ logger.error for failed login — expected (wrong password)
// ❌ logger.error for Zod validation failure — expected, user input
// ❌ logger.info for every DB query — use debug, too noisy for production
// ✅ logger.error for: DB down, payment failed, unhandled exception
// ✅ logger.warn for: retry needed, slow query, config fallback
// ✅ logger.info for: user logged in, order placed, job completed
```

```typescript
// ── Production level configuration ────────────────────────────────────────
// .env.production:
// LOG_LEVEL=info         ← standard: info and above
// LOG_LEVEL=warn         ← quieter: only issues needing attention
// LOG_LEVEL=debug        ← temporary: for targeted debugging in staging

// Dynamically change log level without restart (Pino supports this):
logger.level = 'debug'    // change at runtime
logger.level = 'info'     // change back

// Check if a level is enabled before expensive serialisation:
if (logger.isLevelEnabled('debug')) {
  const heavyObject = buildHeavyDebugPayload()
  logger.debug({ heavyObject }, 'Debug data')
}
// Avoids building the object if debug is disabled ✅
```

---

## W — Why It Matters

- Wrong log levels create alert fatigue — if every 404 is `error`, the error dashboard is noise, and real errors are missed. Reserving `error` for genuinely unexpected failures means every error alert is worth investigating.
- `logger.isLevelEnabled('debug')` before expensive operations prevents silent performance degradation — if debug is disabled (prod), you skip building the debug object entirely. Without this guard, you'd pay the serialisation cost even though the log is discarded.
- Setting `LOG_LEVEL=warn` in production is valid for high-traffic apps — `info` may produce millions of log lines per hour (one per user action). Warn-only cuts that to thousands, dramatically reducing log storage costs.

---

## I — Interview Q&A

### Q: Why should you not log a 404 response or a failed login attempt as `error` level?

**A:** Log levels communicate expectedness and severity. A `404` response means a client requested a resource that doesn't exist — this is expected, by-design behaviour of HTTP. Every web scraper, broken link, and typo-URL generates 404s. Logging these as `error` creates thousands of error-level entries from completely normal traffic, burying real errors. Similarly, a failed login is expected — users mistype passwords. These should be `info` (login attempt failed, used for security auditing) or not logged at all from a level-severity perspective. Reserve `error` for conditions that indicate something is broken in the system and requires investigation — database connections dropping, external API calls failing permanently, unhandled exceptions in business logic. The rule: `error` = "an oncall engineer should wake up for this."

---

## C — Common Pitfalls + Fix

### ❌ Logging every error as `error` — including expected ones

```typescript
// ❌ Validation failure logged as error — noisy, misleading
try {
  const parsed = schema.parse(input)
} catch (err) {
  logger.error({ err }, 'Validation failed')  // ❌ this is expected, not a system error
}
```

**Fix:** Match level to severity:

```typescript
// ✅ Validation failures are info or debug — they're expected
try {
  const parsed = schema.parse(input)
} catch (err) {
  logger.debug({ err, input }, 'Input validation failed')  // expected: debug or skip
  throw new TRPCError({ code: 'BAD_REQUEST' })
}

// ✅ Reserve error for system failures
try {
  await db.query(...)
} catch (err) {
  logger.error({ err }, 'Database query failed')  // unexpected: this IS an error
  throw err
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `logLevelGuard` utility that wraps a function and logs: `debug` on entry (function name + args), `info` on success (function name + duration), `warn` if duration exceeds a threshold, `error` if it throws. Use `logger.isLevelEnabled` guard for debug.

### Solution

```typescript
// src/lib/log-guard.ts
import { logger, type AppLogger } from '@/lib/logger'

interface LogGuardOptions {
  name:            string
  warnThresholdMs: number
  log?:            AppLogger
}

export async function withLogging<T>(
  fn:      () => Promise<T>,
  opts:    LogGuardOptions,
): Promise<T> {
  const log   = opts.log ?? logger
  const start = Date.now()

  if (log.isLevelEnabled('debug')) {
    log.debug({ fn: opts.name }, 'Function called')
  }

  try {
    const result   = await fn()
    const duration = Date.now() - start

    if (duration > opts.warnThresholdMs) {
      log.warn({ fn: opts.name, duration }, 'Slow function execution')
    } else {
      log.info({ fn: opts.name, duration }, 'Function completed')
    }

    return result
  } catch (err) {
    const duration = Date.now() - start
    log.error({ fn: opts.name, duration, err }, 'Function threw an error')
    throw err
  }
}

// Usage:
const result = await withLogging(
  () => prisma.user.findMany(),
  { name: 'findUsers', warnThresholdMs: 500 }
)
```

---

---

# 3 — Child Loggers — Context Propagation

---

## T — TL;DR

`logger.child({ key: value })` creates a new logger that inherits the parent's settings but permanently attaches extra fields to every log line it produces. Use child loggers to propagate context — request ID, user ID, tenant ID — through a chain of function calls without threading the logger manually through every parameter.

---

## K — Key Concepts

```typescript
// ── Creating a child logger ────────────────────────────────────────────────
import { logger } from '@/lib/logger'

// Child inherits level, transport, serializers — adds permanent fields
const reqLogger = logger.child({ requestId: 'abc-123', method: 'POST', path: '/api/trpc/post.create' })

reqLogger.info('Request received')
// { "msg": "Request received", "requestId": "abc-123", "method": "POST", "path": "..." }

reqLogger.error({ err }, 'Handler failed')
// { "msg": "Handler failed", "requestId": "abc-123", "method": "POST", "err": {...} }

// The parent logger is unaffected:
logger.info('Unrelated log')
// { "msg": "Unrelated log" }   ← no requestId ✅
```

```typescript
// ── Layered child loggers — adding context progressively ─────────────────
const baseLogger = logger

// Request-scoped: add requestId
const reqLogger = baseLogger.child({ requestId: 'abc-123' })

// User-scoped: add userId
const userLogger = reqLogger.child({ userId: 'u-456' })

// Operation-scoped: add operation name
const opLogger = userLogger.child({ operation: 'createOrder' })

opLogger.info({ orderId: 99 }, 'Order created')
// { "msg": "Order created", "requestId": "abc-123", "userId": "u-456", "operation": "createOrder", "orderId": 99 }
// All parent fields cascade down ✅
```

```typescript
// ── Passing child logger through service layer ─────────────────────────────
// Option A: pass logger as a parameter (explicit, testable)
async function createOrder(
  input: CreateOrderInput,
  prisma: PrismaClient,
  log:   AppLogger   // ← pass child logger from request context
) {
  log.debug({ input }, 'createOrder called')
  const order = await prisma.order.create({ data: input })
  log.info({ orderId: order.id }, 'Order created')
  return order
}

// In tRPC handler:
create: protectedProcedure
  .input(createOrderSchema)
  .mutation(async ({ input, ctx }) => {
    const log = ctx.log.child({ operation: 'order.create' })
    return createOrder(input, ctx.prisma, log)
  }),

// Option B: AsyncLocalStorage — automatic propagation (no parameter threading)
// Covered in a more advanced context; Option A is sufficient for most apps
```

```typescript
// ── Child logger in context ────────────────────────────────────────────────
// src/server/context.ts — add request-scoped logger to context

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID()
  const session   = await auth.api.getSession({ headers })

  // Create request-scoped child logger
  const log = logger.child({
    requestId,
    ...(session?.user ? { userId: session.user.id } : {}),
  })

  return {
    prisma,
    session,
    user:      session?.user ?? null,
    requestId,
    log,       // ← attached to every request context
  }
}

// Usage in any handler:
someRouter: createTRPCRouter({
  create: protectedProcedure
    .mutation(({ ctx }) => {
      ctx.log.info({ action: 'create' }, 'Mutation called')
      // Automatically includes requestId and userId ✅
    }),
})
```

---

## W — Why It Matters

- Child loggers are the correct way to propagate context in Node.js — the alternative (adding `requestId` to every individual log call) is error-prone and verbose. One `logger.child({ requestId })` call at the request boundary ensures every subsequent log line in that request has the request ID automatically.
- Layered children model the call stack — `base → request → user → operation`. When you see an error in the logs, you can filter by `requestId` to see everything that happened in that request: auth check, DB queries, external API calls — all correlated.
- The `log` property on `ctx` makes request-scoped logging a first-class citizen in tRPC — just like `ctx.prisma` is the database client, `ctx.log` is the request logger. Any service function that accepts `log` as a parameter is instantly testable in isolation.

---

## I — Interview Q&A

### Q: What is a child logger in pino and how does it help with request tracing?

**A:** `logger.child(bindings)` creates a new logger instance that inherits all settings of the parent but permanently binds extra fields to every log line it produces. For request tracing, you call `logger.child({ requestId })` at the beginning of each HTTP request. Pass this child logger into every function that handles that request. Every log line — whether from the route handler, service layer, or database helper — automatically includes `requestId`. This allows you to filter logs by request ID in production and reconstruct the complete timeline of a single request: what it did, how long each step took, what errors occurred. Without child loggers, you'd need to pass `requestId` as a parameter to every log call and risk forgetting it on any line.

---

## C — Common Pitfalls + Fix

### ❌ Creating a new child logger inside a hot loop — allocation overhead

```typescript
// ❌ Creates a new logger object for every item in the array — unnecessary allocation
for (const item of items) {
  const itemLog = logger.child({ itemId: item.id })  // ← new object every iteration ❌
  itemLog.debug('Processing item')
}
```

**Fix:** Create one child outside the loop with the shared context, pass item-specific fields inline:

```typescript
// ✅ One child per logical scope, specific fields inline per log call
const batchLog = logger.child({ batchId, totalItems: items.length })
for (const item of items) {
  batchLog.debug({ itemId: item.id }, 'Processing item')  // no new object ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createRequestLogger` factory used in `createTRPCContext` that: builds a child logger with `requestId`, `method`, `path` extracted from headers; further creates a `createUserLogger` method that adds `userId` and `role`; both returned from context setup.

### Solution

```typescript
// src/lib/request-logger.ts
import { logger, type AppLogger } from '@/lib/logger'

interface RequestLoggerOptions {
  headers:   Headers
  requestId: string
}

export function createRequestLogger({ headers, requestId }: RequestLoggerOptions) {
  const method = headers.get('x-trpc-method') ?? 'unknown'
  const path   = headers.get('x-trpc-path')   ?? 'unknown'

  const reqLog = logger.child({ requestId, method, path })

  function createUserLogger(userId: string, role: string): AppLogger {
    return reqLog.child({ userId, role })
  }

  return { reqLog, createUserLogger }
}

// src/server/context.ts
import { createRequestLogger } from '@/lib/request-logger'
import { auth }                from '@/lib/auth'
import { prisma }              from '@/lib/prisma'

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? crypto.randomUUID()
  const session   = await auth.api.getSession({ headers })
  const user      = session?.user ?? null

  const { reqLog, createUserLogger } = createRequestLogger({ headers, requestId })

  const log = user
    ? createUserLogger(user.id, user.role)
    : reqLog

  return { prisma, session, user, requestId, log }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
```

---

---

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

# 5 — Request IDs — Correlation Across Layers

---

## T — TL;DR

A request ID is a UUID generated at the edge (or passed from upstream) that follows the request through every layer — HTTP handler, tRPC context, service functions, database queries, outgoing HTTP calls. Every log line in the same request shares the same request ID. In production, this is the string you search for to reconstruct exactly what happened during a user's failed action.

---

## K — Key Concepts

```typescript
// ── Request ID flow ────────────────────────────────────────────────────────
//
// Client → Load Balancer (adds X-Request-Id: uuid) → Next.js
//        → createTRPCContext (reads or generates requestId)
//        → ctx.requestId + ctx.log (child with requestId)
//        → tRPC middleware (timing, auth — all log with ctx.log)
//        → procedure handler (ctx.log has requestId)
//        → service function (receives log param)
//        → external API call (passes requestId as header)
//        → Response (returns X-Request-Id: uuid header to client)
//
// Every log line has requestId. Filter by it → full request trace ✅
```

```typescript
// ── src/server/context.ts — canonical request ID setup ───────────────────
import { randomUUID } from 'crypto'
import { logger }     from '@/lib/logger'
import { auth }       from '@/lib/auth'
import { prisma }     from '@/lib/prisma'

export async function createTRPCContext({ headers }: { headers: Headers }) {
  // Prefer upstream request ID (load balancer, API gateway)
  // Fall back to generating one if not present
  const requestId =
    headers.get('x-request-id')      ??
    headers.get('x-correlation-id')  ??
    randomUUID()

  const session = await auth.api.getSession({ headers })
  const user    = session?.user ?? null

  // Create request-scoped child logger — all downstream logs include requestId
  const log = logger.child({
    requestId,
    ...(user ? { userId: user.id, userRole: user.role } : {}),
  })

  log.debug('Context created')

  return { prisma, session, user, requestId, log }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
```

```typescript
// ── Return request ID in response headers ──────────────────────────────────
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'

const handler = async (req: Request) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()

  const response = await fetchRequestHandler({
    endpoint:      '/api/trpc',
    req,
    router:        appRouter,
    createContext: () =>
      createTRPCContext({
        headers: new Headers({ ...Object.fromEntries(req.headers), 'x-request-id': requestId }),
      }),
  })

  // Echo request ID in response — client can log it, user can report it
  response.headers.set('x-request-id', requestId)
  return response
}

export { handler as GET, handler as POST }
```

```typescript
// ── Pass request ID to outgoing HTTP calls ────────────────────────────────
// When calling external APIs (Stripe, SendGrid), pass requestId as a header
// This allows correlating your logs with the external service's logs

import axios from 'axios'

async function chargeCard(
  amount:    number,
  token:     string,
  requestId: string   // ← passed from ctx.requestId
) {
  const response = await axios.post(
    'https://api.stripe.com/v1/charges',
    { amount, source: token },
    {
      headers: {
        Authorization:   `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'X-Request-Id':  requestId,   // ← Stripe logs this as idempotency hint ✅
        'Idempotency-Key': requestId, // ← prevents duplicate charges on retry ✅
      },
    }
  )
  return response.data
}
```

```typescript
// ── Client-side: attach request ID to API calls ───────────────────────────
// src/lib/trpc/client.ts
import { httpBatchLink } from '@trpc/client'
import superjson         from 'superjson'

let requestId = ''

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url:         '/api/trpc',
      transformer: superjson,
      headers: () => {
        // Generate a new requestId per batch of requests
        requestId = crypto.randomUUID()
        return { 'x-request-id': requestId }
      },
    }),
  ],
})

// When an error occurs:
// 1. Client has requestId (from the header it sent)
// 2. Server logs every action with the same requestId
// 3. User reports requestId to support → support can pull full trace ✅
```

---

## W — Why It Matters

- Request IDs turn a symptom ("it failed") into a reproducible trace — when a user reports "my payment failed at 2:30pm", you search logs by their user ID for that timeframe, find the requestId, then filter all logs by that requestId to see every step: auth check, product validation, Stripe call, database write. Without request IDs, you have a collection of unrelated log lines.
- Returning `X-Request-Id` in the response is a user experience feature — the client can display the request ID in error messages ("Error ref: abc-123"). The user copies this ID, sends it to support, and support can find the exact trace immediately.
- Using `requestId` as the Stripe idempotency key prevents duplicate charges on network retries — if the request is retried (client timeout, load balancer retry), Stripe recognises the same idempotency key and returns the original charge result instead of charging twice.

---

## I — Interview Q&A

### Q: How do you correlate logs across the request lifecycle in a tRPC + Next.js application?

**A:** The request ID is the correlation key. At the entry point (`createTRPCContext`), read `x-request-id` from the incoming headers or generate a new UUID. Create a pino child logger bound to this `requestId`. Store both in `ctx`. Every middleware and procedure handler logs through `ctx.log` — all those lines share the same `requestId`. For service functions, pass `ctx.log` as a parameter so they log with the same child. For outgoing HTTP calls, pass `requestId` as a header. Return the `requestId` in the response headers. Now: filter your log aggregator by `requestId = "abc-123"` and you see every line from that single request, in chronological order, across all layers.

---

## C — Common Pitfalls + Fix

### ❌ Generating a new requestId in each service function — breaks correlation

```typescript
// ❌ Each layer generates its own ID — logs are unrelated
async function sendEmail(to: string) {
  const log = logger.child({ requestId: randomUUID() })  // ← new ID, not correlated ❌
  log.info({ to }, 'Sending email')
}
```

**Fix:** Pass the request-scoped logger (or requestId) down the call chain:

```typescript
// ✅ Use the same child logger from the request context
async function sendEmail(to: string, log: AppLogger) {
  log.info({ to }, 'Sending email')  // same requestId as the caller ✅
}

// In tRPC handler:
.mutation(async ({ ctx }) => {
  await sendEmail('user@example.com', ctx.log)  // pass ctx.log ✅
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `withRequestId` Next.js middleware (in `middleware.ts`) that: (1) reads or generates `x-request-id`; (2) adds it to the request headers forwarded to the app; (3) adds it to the response headers; (4) logs the request start and end using pino.

### Solution

```typescript
// middleware.ts (Next.js project root)
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export function middleware(req: NextRequest) {
  const requestId =
    req.headers.get('x-request-id') ??
    crypto.randomUUID()

  const log   = logger.child({ requestId, method: req.method, path: req.nextUrl.pathname })
  const start = Date.now()

  log.info('Incoming request')

  // Clone headers and inject requestId for downstream handlers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Add requestId to response headers
  response.headers.set('x-request-id', requestId)

  // Log completion (duration approximated — real duration logged in handler)
  log.info({ duration: Date.now() - start }, 'Request forwarded to handler')

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

---

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

# 7 — Redaction — Scrubbing Secrets from Logs

---

## T — TL;DR

Redaction removes sensitive values from log output before writing, replacing them with a censor string like `"[REDACTED]"`. Pino's built-in `redact` option uses fast-json-redact with path patterns. Redact passwords, tokens, API keys, cookies, and credit card numbers at the logger level — not ad-hoc per log call.

---

## K — Key Concepts

```typescript
// ── Pino redact configuration ──────────────────────────────────────────────
import pino from 'pino'

export const logger = pino({
  level: 'info',
  redact: {
    paths: [
      // HTTP request/response headers
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["x-auth-token"]',

      // User/auth objects
      'user.passwordHash',
      'user.password',
      'user.twoFactorSecret',
      'user.refreshToken',
      'session.token',

      // Payment data
      'card.number',
      'card.cvv',
      'card.cvc',

      // Wildcards — match any depth
      '*.password',
      '*.passwordHash',
      '*.secret',
      '*.token',
      '*.apiKey',
      '*.api_key',
    ],
    censor: '[REDACTED]',   // replacement value (default: '[Redacted]')
    // remove: true,        // alternative: remove the key entirely (not just censor)
  },
})

// Usage — sensitive fields automatically censored:
logger.info({
  user: { id: 'u1', role: 'admin', passwordHash: '$2b$10$abc...' },
  req:  { headers: { authorization: 'Bearer eyJ...' } },
})
// Output:
// { "user": { "id": "u1", "role": "admin", "passwordHash": "[REDACTED]" },
//   "req":  { "headers": { "authorization": "[REDACTED]" } } }
```

```typescript
// ── Wildcard paths — catch nested occurrences ─────────────────────────────
// '*.password' matches one level deep: { user: { password: '...' } }
// '**.password' matches any depth:     { a: { b: { c: { password: '...' } } } }

const logger = pino({
  redact: {
    paths: [
      '**.password',          // any depth
      '**.passwordHash',
      '**.secret',
      '**.token',
      '**.apiKey',
      '**.creditCard',
      '**.ssn',
      'req.headers.cookie',   // specific path
    ],
    censor: '[REDACTED]',
  },
})
```

```typescript
// ── Runtime redaction — for dynamic paths ────────────────────────────────
// pino's redact is static (configured at init)
// For dynamic redaction, use a helper before logging

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'secret', 'token',
  'apiKey', 'api_key', 'authorization', 'cookie',
  'creditCard', 'cvv', 'ssn', 'refreshToken',
])

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(v => sanitize(v, depth + 1))

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? '[REDACTED]'
      : sanitize(value, depth + 1)
  }
  return result
}

// Use when logging arbitrary payloads:
logger.info({ payload: sanitize(webhookPayload) }, 'Webhook received')
```

```typescript
// ── Testing that redaction works ───────────────────────────────────────────
// Quick test in Node REPL or test file:
const dest     = pino.destination({ sync: true })  // capture output
const testLog  = pino({ redact: ['user.password'] }, dest)

testLog.info({ user: { id: 1, password: 'secret123' } }, 'test')
// Verify output does NOT contain 'secret123'

// In Vitest:
test('redacts password field', () => {
  const logs: string[] = []
  const testLogger = pino(
    { redact: { paths: ['user.password'], censor: '[REDACTED]' } },
    { write: (s: string) => logs.push(s) }
  )
  testLogger.info({ user: { id: '1', password: 'secret' } }, 'msg')
  const parsed = JSON.parse(logs[0])
  expect(parsed.user.password).toBe('[REDACTED]')
  expect(parsed.user.id).toBe('1')
})
```

---

## W — Why It Matters

- Redaction is not optional — GDPR, PCI-DSS, SOC 2, and HIPAA all require that credentials, payment data, and PII are not stored in logs. A single `logger.info({ user })` call without redaction can write password hashes to your log aggregator where they sit for 30+ days, accessible to everyone with log access.
- `pino`'s redaction is done before serialisation — it's not a post-process filter. The sensitive value never exists as a string in the log output. This is faster than filtering after serialisation and cannot be bypassed by log format quirks.
- Static path-based redaction is defense-in-depth — even if a developer makes a mistake (logs a full user object), the redaction config catches it. It's the logger-level safety net below serializers.

---

## I — Interview Q&A

### Q: What is the difference between using a pino serializer to hide fields vs using pino's `redact` option?

**A:** Serializers transform a value when it's logged under a specific key — they give you full control over the shape of the output. A `user` serializer replaces the entire user object with a curated projection. Redaction targets specific paths and replaces their values with a censor string — it doesn't change the object structure, it only blanks specific values. They serve different purposes: serializers are for shaping output (what fields to include, how to format them), redaction is for security compliance (ensure specific values never appear in logs regardless of where they're nested). The best practice is to use both: serializers for domain objects (curated shape), redaction as a safety net for specific sensitive keys that might appear anywhere in the log output (`**.password`, `**.token`).

---

## C — Common Pitfalls + Fix

### ❌ Redacting at call site — misses future log calls

```typescript
// ❌ Manual redaction per log call — developer must remember every time
logger.info({ user: { id: user.id, role: user.role } }, 'User action')
// 3 months later, a new developer adds:
logger.debug({ user }, 'Debug user state')  // ← logs passwordHash ❌
```

**Fix:** Centralize redaction in logger config — automatic for all future calls:

```typescript
// ✅ In logger config — applies to every log call everywhere
redact: { paths: ['**.passwordHash', '**.password'], censor: '[REDACTED]' }
// New developer writes: logger.debug({ user }, 'Debug') → passwordHash is [REDACTED] ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Add redaction to the `src/lib/logger.ts` that covers: auth headers, cookies, passwords/hashes, tokens/secrets, API keys, credit card fields, and email (PII — redact from all nested locations). Write a Vitest test that verifies `user.email` is redacted and `user.id` is not.

### Solution

```typescript
// src/lib/logger.ts — add redact config
redact: {
  paths: [
    // Auth
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    // Credentials
    '**.password',
    '**.passwordHash',
    '**.secret',
    '**.token',
    '**.refreshToken',
    '**.apiKey',
    '**.api_key',
    // Payment
    '**.cardNumber',
    '**.card_number',
    '**.cvv',
    '**.cvc',
    // PII
    '**.email',
    '**.ssn',
    '**.phoneNumber',
    '**.phone_number',
  ],
  censor: '[REDACTED]',
},

// src/lib/__tests__/logger.test.ts
import { describe, it, expect } from 'vitest'
import pino from 'pino'

describe('logger redaction', () => {
  it('redacts email but preserves id', () => {
    const lines: string[] = []
    const testLogger = pino(
      {
        level: 'debug',
        redact: {
          paths: ['**.email', '**.password'],
          censor: '[REDACTED]',
        },
      },
      { write: (s: string) => lines.push(s) }
    )

    testLogger.info(
      { user: { id: 'u-123', email: 'mark@example.com', password: 'secret' } },
      'User info'
    )

    const parsed = JSON.parse(lines[0])
    expect(parsed.user.id).toBe('u-123')
    expect(parsed.user.email).toBe('[REDACTED]')
    expect(parsed.user.password).toBe('[REDACTED]')
  })
})
```

---

---

# 8 — Secure Log Hygiene — What Never Goes in Logs

---

## T — TL;DR

Logs are often the least-secure data store in a production system — they're shared across teams, retained for 30–90 days, and sent to third-party aggregators. The rule: log **identifiers** (userId, orderId), not **data** (email, address, card number). Log **events** (login, payment), not **secrets** (password, token, session cookie).

---

## K — Key Concepts

```typescript
// ── What to NEVER log ──────────────────────────────────────────────────────

// ❌ Credentials and secrets
logger.info({ password })                      // never
logger.info({ passwordHash })                  // never
logger.info({ apiKey })                        // never
logger.info({ secret })                        // never
logger.info({ privateKey })                    // never
logger.info({ req.headers.authorization })     // never (Bearer tokens)
logger.info({ sessionToken })                  // never
logger.info({ refreshToken })                  // never

// ❌ Payment data (PCI-DSS scope)
logger.info({ cardNumber })                    // never — even partial unless last4
logger.info({ cvv })                           // never
logger.info({ fullBankAccount })               // never

// ❌ PII (GDPR/CCPA scope)
logger.info({ email })                         // avoid (use userId instead)
logger.info({ phoneNumber })                   // avoid
logger.info({ dateOfBirth })                   // avoid
logger.info({ address })                       // avoid
logger.info({ fullName })                      // caution (use userId)
logger.info({ ssn })                           // never
logger.info({ nationalId })                    // never

// ❌ Large payloads (operational, not security)
logger.info({ req.body })                      // could contain any of the above
logger.info({ webhookPayload })                // same risk
logger.info({ allUserRecords })                // 10MB log line

// ── What to LOG instead ────────────────────────────────────────────────────
// ✅ Identifiers — safe, useful for investigation
logger.info({ userId })                        // identify who, look up details in DB
logger.info({ orderId })                       // correlate, not the order contents
logger.info({ sessionId })                     // session exists, not the session data
logger.info({ requestId })                     // correlation key
logger.info({ productId })                     // reference, not price/stock details

// ✅ Events — what happened
logger.info({ userId, action: 'login' }, 'User authenticated')
logger.info({ userId, orderId, amount: '99.99' }, 'Payment completed')
logger.info({ userId, endpoint: 'createPost' }, 'API call')

// ✅ Metrics — counts, durations, status codes
logger.info({ duration: 234, queryName: 'findOrders' }, 'DB query')
logger.info({ statusCode: 200, path: '/api/trpc' }, 'Request')
logger.info({ queueDepth: 42, worker: 'email' }, 'Queue status')
```

```typescript
// ── Log sanitisation helper for webhook/external payloads ─────────────────
const NEVER_LOG = new Set([
  'password', 'passwordHash', 'secret', 'token', 'apiKey', 'api_key',
  'authorization', 'cookie', 'refreshToken', 'cardNumber', 'card_number',
  'cvv', 'cvc', 'ssn', 'email', 'phone', 'phoneNumber', 'dateOfBirth',
  'address', 'firstName', 'lastName', 'fullName',
])

export function sanitizeForLog(obj: unknown, maxDepth = 4, depth = 0): unknown {
  if (depth > maxDepth) return '[truncated]'
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.length > 10
      ? [...obj.slice(0, 3).map(v => sanitizeForLog(v, maxDepth, depth + 1)), `...(${obj.length - 3} more)`]
      : obj.map(v => sanitizeForLog(v, maxDepth, depth + 1))
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = NEVER_LOG.has(k.toLowerCase()) ? '[REDACTED]' : sanitizeForLog(v, maxDepth, depth + 1)
  }
  return result
}

// Usage:
logger.info({ event: sanitizeForLog(stripeWebhookBody) }, 'Stripe webhook received')
```

```typescript
// ── Audit logging vs application logging ──────────────────────────────────
// Application logs: operational — who did what, how long, did it succeed
// Audit logs: compliance — who accessed sensitive data, what changed, who authorised it

// Application log (pino, to log aggregator):
logger.info({ userId, action: 'viewed_dashboard' }, 'Page view')

// Audit log (database, with retention):
await prisma.auditLog.create({
  data: {
    userId:    ctx.user.id,
    action:    'EXPORT_USER_DATA',
    targetId:  targetUserId,
    ip:        ctx.ip,
    userAgent: ctx.userAgent,
    createdAt: new Date(),
  }
})
// Audit logs go to the database (durable, queryable, access-controlled)
// NOT to the same log stream as application logs
```

---

## W — Why It Matters

- Log aggregators (Datadog, Splunk, Loki) are often shared across engineering teams with broad access — the security review for "who can read logs" is rarely as strict as "who can access the users table". PII in logs violates GDPR's data minimisation principle.
- The `userId` vs `email` distinction is practical: userId is a meaningless number to a log reader who doesn't have database access. Email is immediately readable PII. Use userId in logs — investigators with legitimate need can look up the email in the database with access controls applied.
- Audit logs belong in the database, not the log stream — they need to be durable (survive log rotation), queryable by compliance teams (show me all data exports by admin X), and access-controlled. Log streams are append-only, ephemeral, and broadly accessible.

---

## I — Interview Q&A

### Q: What is the difference between application logs and audit logs, and where should each be stored?

**A:** Application logs capture operational events — what the system did, how long it took, whether it succeeded. They're used for debugging, alerting, and performance monitoring. Store them in a log aggregator (Datadog, Loki, CloudWatch) with a 30–90 day retention. Access is broad — any engineer may need to debug. Audit logs capture compliance-relevant events — who accessed what sensitive data, what changed, who authorised it. They're used for security investigations, compliance reporting, and regulatory audits. Store them in the database (a dedicated `audit_logs` table) with long retention (1–7 years depending on regulation) and strict access control. The key distinction: application logs are for engineers debugging production issues; audit logs are for compliance and legal purposes. PII never goes in application logs; audit logs may contain it with appropriate access controls.

---

## C — Common Pitfalls + Fix

### ❌ Logging `req.body` for debugging — captures passwords and tokens

```typescript
// ❌ req.body may contain password, card details, tokens
logger.debug({ body: req.body }, 'Request body')
// If user is logging in: { "body": { "email": "...", "password": "secret123" } } ❌
```

**Fix:** Never log full request bodies; log specific safe fields:

```typescript
// ✅ Log only the operation name and non-sensitive identifiers
logger.debug({ path: req.url, method: req.method }, 'Request received')
// And in the handler, log only what's safe:
logger.info({ userId, action: 'login' }, 'Login attempt')
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `createAuditLog` function that records sensitive operations (data export, admin action, password change) to the database. It should store: `userId`, `action`, `targetId`, `ip`, `userAgent`, `metadata` (safe fields only), `createdAt`. Write the Prisma schema for it too.

### Solution

```prisma
// In schema.prisma
model AuditLog {
  id        BigInt   @id @default(autoincrement())
  userId    String   @map("user_id")
  action    String   @db.VarChar(100)
  targetId  String?  @map("target_id")
  ip        String?  @db.Inet
  userAgent String?  @map("user_agent") @db.VarChar(500)
  metadata  Json     @default("{}")
  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@index([action, createdAt(sort: Desc)])
  @@map("audit_logs")
}
```

```typescript
// src/lib/audit.ts
import { prisma }          from '@/lib/prisma'
import { sanitizeForLog }  from '@/lib/logger'

interface AuditLogInput {
  userId:    string
  action:    string
  targetId?: string
  ip?:       string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId:    input.userId,
      action:    input.action,
      targetId:  input.targetId ?? null,
      ip:        input.ip        ?? null,
      userAgent: input.userAgent ?? null,
      // Sanitize metadata — never store sensitive fields
      metadata:  sanitizeForLog(input.metadata ?? {}) as object,
    },
  })
}

// Usage in tRPC handler:
adminDeleteUser: adminProcedure
  .input(z.object({ targetUserId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await ctx.prisma.user.update({
      where: { id: input.targetUserId },
      data:  { deletedAt: new Date() },
    })
    await createAuditLog({
      userId:   ctx.user.id,
      action:   'ADMIN_DELETE_USER',
      targetId: input.targetUserId,
      ip:       ctx.ip,
      metadata: { adminRole: ctx.user.role },
    })
    ctx.log.info({ targetUserId: input.targetUserId }, 'Admin deleted user')
  }),
```

---

---

# 9 — End-to-End Backend Flow — Composition

---

## T — TL;DR

The production backend is a composed stack: `Next.js middleware` (request ID) → `createTRPCContext` (session, logger, prisma) → `tRPC middleware chain` (logging, auth, role) → `procedure handler` (validation, business logic, Prisma) → `errorFormatter` (safe error shape) → `response` (request ID header). Every layer has one responsibility. Understanding the flow lets you place logging, error handling, and auth at exactly the right layer.

---

## K — Key Concepts

```typescript
// ── Complete request flow — annotated ─────────────────────────────────────
//
// 1. Next.js middleware (middleware.ts)
//    - Read or generate x-request-id
//    - Forward to handler via request headers
//    - Add x-request-id to response headers
//    - Log: "Incoming request" with method + path
//
// 2. Route handler (app/api/trpc/[trpc]/route.ts)
//    - Call fetchRequestHandler
//    - Pass createContext factory (receives request)
//
// 3. createTRPCContext (server/context.ts)
//    - Read requestId from headers
//    - auth.api.getSession(headers) → session | null
//    - Create child logger: logger.child({ requestId, userId? })
//    - Return: { prisma, session, user, requestId, log }
//
// 4. tRPC middleware chain
//    - timingMiddleware: log procedure start
//    - enforceAuth: check session → throw UNAUTHORIZED if missing
//                  → narrow ctx.user type to User (non-null)
//    - enforceRole: check ctx.user.role → throw FORBIDDEN if wrong
//
// 5. .input() Zod validation
//    - Parse and validate client input
//    - On failure → ZodError → errorFormatter → PARSE_ERROR with zodError fields
//
// 6. Procedure handler
//    - Business logic + Prisma queries
//    - ctx.log.info(fields, 'msg') for business events
//    - Catch Prisma errors → translate to TRPCError
//    - Ownership check (scoped query or assertOwner)
//    - Return result
//
// 7. errorFormatter (if error thrown)
//    - Attach: zodError, requestId, userMessage, stack (dev only)
//    - Log INTERNAL_SERVER_ERROR
//    - Return safe error shape to client
//
// 8. Response
//    - x-request-id header echoed to client
//    - Client receives typed result or formatted error
```

```typescript
// ── src/server/trpc.ts — complete production file ─────────────────────────
import { initTRPC, TRPCError }  from '@trpc/server'
import { ZodError }              from 'zod'
import superjson                 from 'superjson'
import { type Context }          from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      ctx?.log?.error({ err: error.cause ?? error }, 'Internal server error')
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:    error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId:   ctx?.requestId,
        stack:       process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

const timingMw = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now()
  ctx.log.debug({ path, type }, 'Procedure called')
  const result = await next()
  const ms     = Date.now() - start
  if (ms > 1000) ctx.log.warn({ path, type, ms }, 'Slow procedure')
  else ctx.log.debug({ path, type, ms }, 'Procedure completed')
  return result
})

const authMw = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user, session: ctx.session } })
})

const adminMw = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure     = t.procedure.use(timingMw)
export const protectedProcedure  = t.procedure.use(timingMw).use(authMw)
export const adminProcedure      = t.procedure.use(timingMw).use(authMw).use(adminMw)
```

```typescript
// ── src/server/root.ts — app router composition ────────────────────────────
import { createTRPCRouter, createCallerFactory } from './trpc'
import { postRouter }    from './routers/post'
import { userRouter }    from './routers/user'
import { orderRouter }   from './routers/order'
import { adminRouter }   from './routers/admin'

export const appRouter = createTRPCRouter({
  post:  postRouter,
  user:  userRouter,
  order: orderRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
```

```typescript
// ── src/app/api/trpc/[trpc]/route.ts — HTTP adapter ───────────────────────
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'
import type { NextRequest }    from 'next/server'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:      '/api/trpc',
    req,
    router:        appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      // onError fires for ALL errors — but internal logging happens in errorFormatter
      // Use onError for external error reporting (Sentry, etc.)
      if (process.env.NODE_ENV === 'production' && error.code === 'INTERNAL_SERVER_ERROR') {
        // Sentry.captureException(error)
      }
    },
  })

export { handler as GET, handler as POST }
```

---

## W — Why It Matters

- Understanding the full stack flow is what separates "it works" from "it's maintainable" — when something breaks in production, knowing exactly which layer handles logging (context), auth (middleware), validation (Zod), business errors (handler), and formatting (errorFormatter) means you go directly to the right file.
- The `ctx` in `errorFormatter` contains the request-scoped logger — logging `INTERNAL_SERVER_ERROR` from the formatter means the error log always carries the `requestId` and `userId` that were in context when the error occurred. This is the correlation chain.
- `onError` in `fetchRequestHandler` is for external error reporters (Sentry), while `errorFormatter` is for shaping the client response. They're complementary: `errorFormatter` controls what the client sees, `onError` controls what monitoring sees.

---

## I — Interview Q&A

### Q: Walk through what happens when an authenticated user calls a protected tRPC mutation that fails with a Prisma unique constraint error.

**A:** (1) `middleware.ts` adds `x-request-id` to headers. (2) The route handler calls `fetchRequestHandler` which calls `createTRPCContext` — reads session via BetterAuth, creates child logger with `requestId` and `userId`. (3) The `timingMw` middleware starts the timer and logs the procedure call. (4) The `authMw` middleware checks `ctx.session` — it exists, so it narrows `ctx.user` to `User` and calls `next`. (5) Zod validates the input — passes. (6) The handler runs — calls `prisma.post.create()`. (7) Prisma throws `PrismaClientKnownRequestError` with code `P2002` (unique constraint). (8) The handler's catch block calls `handlePrismaError` which throws `TRPCError({ code: 'CONFLICT', message: 'Title taken' })`. (9) `errorFormatter` runs — `error.code` is `CONFLICT` (not `INTERNAL_SERVER_ERROR`), so nothing is logged here. It attaches `requestId` and null `zodError` to the shape. (10) The client receives `{ code: 'CONFLICT', data: { requestId: 'abc-123', userMessage: '...' } }`.

---

## C — Common Pitfalls + Fix

### ❌ No `onError` handler — internal errors silently discarded

```typescript
// ❌ Errors are formatted and returned to client but never externally reported
fetchRequestHandler({ router: appRouter, createContext })
// In production, a crash in a procedure is invisible to monitoring ❌
```

**Fix:** Add `onError` for external reporting:

```typescript
// ✅
fetchRequestHandler({
  router:        appRouter,
  createContext: () => createTRPCContext({ headers: req.headers }),
  onError: ({ error, path }) => {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      // captureException(error)  ← Sentry / BugSnag / etc.
      logger.error({ err: error, path }, 'Unhandled procedure error')
    }
  },
})
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete `src/server/context.ts`, `src/server/trpc.ts`, and `src/app/api/trpc/[trpc]/route.ts` as a cohesive unit — showing how requestId, logger, session, and error formatting all connect. Keep each file under 50 lines.

### Solution

```typescript
// src/server/context.ts
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { logger }      from '@/lib/logger'
import { randomUUID }  from 'crypto'

export async function createTRPCContext({ headers }: { headers: Headers }) {
  const requestId = headers.get('x-request-id') ?? randomUUID()
  const session   = await auth.api.getSession({ headers })
  const user      = session?.user ?? null
  const log       = logger.child({ requestId, ...(user ? { userId: user.id } : {}) })
  return { prisma, session, user, requestId, log, ip: headers.get('x-forwarded-for')?.split(',')[0] ?? '::1' }
}
export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError }             from 'zod'
import superjson                from 'superjson'
import { type Context }         from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR')
      ctx?.log?.error({ err: error.cause ?? error }, 'Unhandled error')
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:  error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId: ctx?.requestId,
        stack:     process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
      },
    }
  },
})

const authMw = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user } })
})

export const createTRPCRouter    = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure     = t.procedure
export const protectedProcedure  = t.procedure.use(authMw)
export const adminProcedure      = t.procedure.use(authMw).use(
  t.middleware(({ ctx, next }) => {
    if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
    return next()
  })
)

// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter }           from '@/server/root'
import { createTRPCContext }   from '@/server/context'
import type { NextRequest }    from 'next/server'

const handler = async (req: NextRequest) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
  const headers   = new Headers(req.headers)
  headers.set('x-request-id', requestId)
  const res = await fetchRequestHandler({
    endpoint:      '/api/trpc',
    req:           new Request(req.url, { method: req.method, headers, body: req.body }),
    router:        appRouter,
    createContext: () => createTRPCContext({ headers }),
  })
  res.headers.set('x-request-id', requestId)
  return res
}
export { handler as GET, handler as POST }
```

---

---

# 10 — Migration Discipline — Safe Schema Evolution

---

## T — TL;DR

Every schema change must go through Prisma migrations — `prisma migrate dev` in development, `prisma migrate deploy` in production. Migrations are SQL files in `prisma/migrations/`, checked into git. They are immutable once deployed. Safe migration patterns: add columns with defaults, never rename (add + deprecate + remove across releases), never delete prematurely. Backward-compatible migrations allow zero-downtime deploys.

---

## K — Key Concepts

```bash
# ── Development workflow ───────────────────────────────────────────────────
# After changing schema.prisma:
npx prisma migrate dev --name add_user_plan_column
# 1. Detects diff between schema.prisma and current DB
# 2. Generates SQL migration file in prisma/migrations/
# 3. Applies migration to dev database
# 4. Regenerates Prisma Client

# Always name migrations descriptively:
# add_user_role_field
# create_orders_table
# rename_status_to_order_status  (though renaming is risky — see below)
# add_index_orders_customer_id

# ── Production deployment ──────────────────────────────────────────────────
npx prisma migrate deploy
# Applies all pending migrations in order
# Does NOT prompt — safe for CI/CD
# Reports which migrations were applied

# ── Check migration status ────────────────────────────────────────────────
npx prisma migrate status
# Shows: applied, pending, failed migrations
```

```typescript
// ── Safe pattern 1: Adding a nullable column ──────────────────────────────
// ✅ Safe: existing rows get NULL — no default required
// schema.prisma:
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  phoneNumber String?  // ADD COLUMN phone_number TEXT  ← zero downtime
}

// ── Safe pattern 2: Adding a column WITH a default ────────────────────────
// ✅ Safe: existing rows get the default value
model User {
  plan String @default("free")
  // ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
}

// ── Risky pattern: Adding NOT NULL without default ────────────────────────
// ❌ Fails if table has existing rows
model User {
  requiredField String  // NOT NULL, no default → ALTER TABLE fails if rows exist
}
// Fix: add as nullable first, backfill, then add NOT NULL constraint:
// Migration 1: ADD COLUMN required_field TEXT
// Data script:  UPDATE users SET required_field = 'default_value' WHERE required_field IS NULL
// Migration 2:  ALTER TABLE users ALTER COLUMN required_field SET NOT NULL
```

```sql
-- ── prisma/migrations/20250615_add_plan_column/migration.sql ──────────────
-- Prisma generates this — review before applying in production

-- AddColumn
ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';

-- Migration file is IMMUTABLE — never edit after applying to any environment
-- To fix: create a new migration that corrects the issue
```

```bash
# ── Handling migration conflicts (team workflow) ───────────────────────────

# Team member A creates migration: 20250615_add_phone
# Team member B creates migration: 20250615_add_plan
# Both branch from same DB state — conflict when merging

# Resolution:
npx prisma migrate dev  # re-generates from current schema + existing migrations
# OR:
# Squash: if conflicts are in dev only, reset and regenerate

# ── Reset dev database (DESTRUCTIVE — dev only) ──────────────────────────
npx prisma migrate reset
# Drops all tables, re-runs all migrations, re-seeds ← dev/test only ❌ never prod

# ── Squash migrations (dev only) ─────────────────────────────────────────
# If dev has 30 draft migrations and they haven't been deployed to staging:
# 1. npx prisma migrate reset (destroy dev db)
# 2. Edit/delete old migration files
# 3. npx prisma migrate dev --name initial_schema
# Produces one clean migration ← only safe before first staging deploy
```

```typescript
// ── Expand-contract pattern for zero-downtime renames ─────────────────────
// Goal: rename column `status` to `order_status`
//
// Step 1 (Expand): Add new column, keep old — deploy app writes to BOTH
// ALTER TABLE orders ADD COLUMN order_status TEXT;
// UPDATE orders SET order_status = status;

// Step 2: Change app code to read from new column, write to both
// (Deploy — old code still works, new code works too)

// Step 3 (Contract): Remove old column — deploy app only uses new column
// ALTER TABLE orders DROP COLUMN status;

// With Prisma + @map:
model Order {
  orderStatus String @map("status")   // @map lets you rename the Prisma field
  // without renaming the PG column — no migration needed for the Prisma field name
}
// Use @map to rename the Prisma field without changing the DB column ✅
```

```bash
# ── Production migration checklist ───────────────────────────────────────

# Before running prisma migrate deploy in production:
# ✅ 1. Migration tested on staging with production-scale data
# ✅ 2. Estimated migration duration < 1 second per table (or uses online DDL)
# ✅ 3. No LOCK TABLE statements (ALTER TABLE in PG 18 is mostly lock-free)
# ✅ 4. New NOT NULL columns have DEFAULT values
# ✅ 5. Dropped columns/tables are no longer referenced in application code
# ✅ 6. Migration rolled back successfully in staging (test ROLLBACK manually)
# ✅ 7. Database backup taken before applying
# ✅ 8. Migration status checked: prisma migrate status → no pending before deploy
```

---

## W — Why It Matters

- Migration files in git are the database changelog — reviewing a PR diff includes both code changes and the exact SQL that will run against production. This is the single most important practice for database safety in a team environment.
- The expand-contract pattern is necessary for zero-downtime deploys — if you rename a column in one deployment, the old application code (still running on some pods during rolling deploy) uses the old column name and fails. Expanding first (both columns exist) means both old and new code work simultaneously during the deployment window.
- `prisma migrate deploy` (not `dev`) in production is a safety guarantee — `dev` can prompt, generate new migrations interactively, or reset the database. `deploy` only applies pending migrations, never drops anything, and exits with a non-zero code if anything fails — safe for CI/CD pipelines.

---

## I — Interview Q&A

### Q: What is the expand-contract pattern for database migrations and why is it necessary for zero-downtime deployments?

**A:** When you need to rename a column, you can't do it in a single migration and deploy — during a rolling deploy, some pods run old code (using the old column name) and some run new code (using the new name). If the column is renamed mid-deploy, old pods crash. The expand-contract pattern solves this over three deployments: (1) Expand — add the new column, copy data from old to new, deploy app that writes to both columns; (2) Migrate — deploy app that reads from the new column but still writes to both; (3) Contract — drop the old column, deploy final app that only uses the new column. This ensures at every point in the deploy, all running pods have a working schema. In Prisma, you can often avoid a DB rename entirely by using `@map("old_column_name")` to map a new Prisma field name to the existing column without any schema migration.

---

## C — Common Pitfalls + Fix

### ❌ Editing a migration file after it's been applied to any environment

```bash
# ❌ Editing prisma/migrations/20250610_add_user/migration.sql after it ran on staging
# Prisma stores the checksum of applied migrations
# If you edit the file, the next prisma migrate status shows it as "changed" ← mismatch ❌
# Can cause migrate deploy to fail in production
```

**Fix:** Never edit applied migrations — create a new one:

```bash
# ✅ Created a new corrective migration instead
npx prisma migrate dev --name fix_user_column_type
# New SQL file: ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(20)
# Old migration unchanged — history preserved ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Your `User` model needs three changes: (1) add `planTier` (String, default 'free', NOT NULL); (2) add `trialEndsAt` (DateTime?, timestamptz); (3) rename Prisma field `name` to `displayName` while keeping the PostgreSQL column as `name`. Write the updated model fields with proper `@map` and `@db` attributes. State which changes are zero-downtime safe.

### Solution

```prisma
// Updated User model fields (partial)
model User {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String   @unique

  // Rename in Prisma only — @map keeps DB column as "name"
  // Zero-downtime: no SQL migration needed, Prisma field name changes only ✅
  displayName String?  @map("name")

  // New column with DEFAULT — safe for existing rows ✅
  planTier    String   @default("free") @map("plan_tier")

  // New nullable column — safe for existing rows ✅
  trialEndsAt DateTime? @db.Timestamptz @map("trial_ends_at")

  createdAt   DateTime  @default(now()) @db.Timestamptz @map("created_at")
  updatedAt   DateTime  @updatedAt      @db.Timestamptz @map("updated_at")

  @@map("users")
}

// Zero-downtime analysis:
// displayName @map("name"): ✅ No SQL migration — only Prisma type change
// planTier @default("free"): ✅ ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'free'
//   Existing rows get 'free' — no lock held beyond metadata update
// trialEndsAt DateTime?: ✅ ADD COLUMN trial_ends_at TIMESTAMPTZ
//   Nullable — existing rows get NULL — instant in PG 18
```

---

---

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