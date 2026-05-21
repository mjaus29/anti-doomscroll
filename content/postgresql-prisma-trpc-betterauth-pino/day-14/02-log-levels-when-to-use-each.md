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
