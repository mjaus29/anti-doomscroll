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
