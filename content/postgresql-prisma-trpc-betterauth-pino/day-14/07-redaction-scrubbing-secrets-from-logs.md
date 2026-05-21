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
