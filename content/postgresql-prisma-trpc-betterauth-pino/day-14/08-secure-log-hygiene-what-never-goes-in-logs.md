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
