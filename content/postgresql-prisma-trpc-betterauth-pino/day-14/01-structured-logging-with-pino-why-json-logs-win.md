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
