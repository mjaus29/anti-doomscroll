# 6 — Retry Defaults

---

## T — TL;DR

When a query function throws, TanStack Query **automatically retries** it up to 3 times with exponential backoff before marking the query as errored. This masks transient network failures from the user. Configure retry count and delay per query or globally.

---

## K — Key Concepts

```tsx
// ── Default retry behavior ────────────────────────────────────────────────
// retry: 3 — retries 3 times before marking as error
// retryDelay: exponential backoff — 1s, 2s, 4s (capped at 30s)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:      3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      // attempt 0 → 1s, attempt 1 → 2s, attempt 2 → 4s, attempt 3 → 8s...capped at 30s
    }
  }
})
```

```tsx
// ── Per-query retry configuration ────────────────────────────────────────
// No retry: fail immediately (user-facing writes, validation errors)
useQuery({
  queryKey: ['critical-payment-status'],
  queryFn:  getPaymentStatus,
  retry:    0,   // fail fast — no retry for payment state
})

// Custom retry count
useQuery({
  queryKey: ['flaky-service'],
  queryFn:  getFlakyService,
  retry:    5,   // more patient for a known unstable service
})

// Custom retry delay (linear instead of exponential)
useQuery({
  queryKey: ['data'],
  queryFn:  getData,
  retryDelay: 2000,   // flat 2s between retries
})

// Conditional retry: only retry on specific errors
useQuery({
  queryKey: ['resource'],
  queryFn:  getResource,
  retry: (failureCount, error) => {
    // Don't retry 4xx errors — they won't resolve themselves
    if ((error as any)?.status >= 400 && (error as any)?.status < 500) return false
    return failureCount < 3   // retry up to 3x for 5xx / network errors
  },
})
```

```tsx
// ── Retry behavior timeline ───────────────────────────────────────────────
// Request fails (attempt 0)
//   → wait 1s → retry (attempt 1)
//   → wait 2s → retry (attempt 2)
//   → wait 4s → retry (attempt 3)
//   → all retries exhausted → status = 'error' → isError = true

// During retries: status stays 'pending', isLoading stays true
// User sees loading state — not error — for transient failures ✅
// Only after all retries fail: error state shown

// ── failureCount in retry function ────────────────────────────────────────
useQuery({
  queryKey: ['posts'],
  queryFn:  getPosts,
  retry: (failureCount, error) => {
    console.log(`Attempt ${failureCount + 1} failed:`, error)
    // failureCount: 0 on first failure, 1 on second, etc.
    return failureCount < 2   // retry at most 2 more times (3 total attempts)
  },
  retryDelay: (attempt) => {
    console.log(`Retrying in ${Math.min(1000 * 2 ** attempt, 10_000)}ms`)
    return Math.min(1000 * 2 ** attempt, 10_000)
  },
})
```

---

## W — Why It Matters

- 3 retries with exponential backoff handles the most common real-world failure: a brief network hiccup or a server restarting. The user never sees an error for a 1-second outage.
- Conditional retry (`retry: (count, error) => error.status !== 404`) is important for correctness — retrying a 404 (Not Found) or 403 (Forbidden) will never succeed and wastes time before showing the error.
- Mutations should typically have `retry: 0` — retrying a POST/PATCH/DELETE without knowing if the first attempt succeeded can cause duplicate operations (duplicate orders, double payments).

---

## I — Interview Q&A

### Q: What is the default retry behavior in TanStack Query and when should you change it?

**A:** By default, failed queries retry 3 times with exponential backoff — 1 second, 2 seconds, 4 seconds between attempts — before the query enters error state. During retries, the query stays in `pending` / `isLoading` state; the user sees a loading indicator, not an error. Change it when: (1) The error is deterministic and won't resolve with retries (4xx errors) — use a conditional retry function that returns `false` for client errors. (2) The query is time-sensitive (real-time data) — reduce retries or delay to fail faster and show a recovery UI sooner. (3) The service is known-flaky — increase retries. (4) Mutations — set `retry: 0` to prevent duplicate writes when the network recovers between retry attempts.

---

## C — Common Pitfalls + Fix

### ❌ Retrying 4xx errors — wastes time before showing actionable error

```tsx
// ❌ Default retry retries ALL errors — including 404, 401, 403
// User must wait 1+2+4 = 7 seconds before seeing "Not Found" ❌
function PostDetail({ postId }: { postId: number }) {
  const { data, error, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPost(postId, signal),
    // retry: 3 (default) — retries a 404 three times before error state ❌
  })
}

// ✅ Smart retry: only for recoverable errors (5xx, network)
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function getPostSafe(id: number, signal: AbortSignal): Promise<Post> {
  const res = await fetch(`/api/posts/${id}`, { signal })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return res.json()
}

function PostDetailFixed({ postId }: { postId: number }) {
  const { data, error, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn:  ({ signal }) => getPostSafe(postId, signal),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false   // ❌ don't retry 4xx
      return failureCount < 3  // retry up to 3× for 5xx / network errors ✅
    },
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useResilientQuery` hook that wraps `useQuery` with smart retry: no retry for 4xx, 3 retries with backoff for 5xx/network, and a custom `onRetry` callback for logging.

### Solution

```tsx
import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query'

class HttpError extends Error {
  constructor(public status: number, public statusText: string) {
    super(`HTTP ${status}: ${statusText}`)
    this.name = 'HttpError'
  }
}

export async function safeFetch<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new HttpError(res.status, res.statusText)
  return res.json()
}

interface ResilientOptions<T> extends Omit<UseQueryOptions<T>, 'retry' | 'retryDelay'> {
  onRetry?: (attempt: number, error: Error) => void
  maxRetries?: number
}

function useResilientQuery<T>(options: ResilientOptions<T>) {
  const { onRetry, maxRetries = 3, ...queryOptions } = options

  return useQuery<T>({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Never retry client errors — they won't resolve
      if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
        return false
      }
      return failureCount < maxRetries
    },
    retryDelay: (attempt, error) => {
      const delay = Math.min(1000 * 2 ** attempt, 30_000)
      onRetry?.(attempt + 1, error as Error)   // log retry attempt ✅
      return delay
    },
  })
}

// Usage
function OrderDetails({ orderId }: { orderId: number }) {
  const { data, isError, error } = useResilientQuery<Order>({
    queryKey: ['order', orderId],
    queryFn:  ({ signal }) => safeFetch(`/api/orders/${orderId}`, signal),
    onRetry: (attempt, err) => {
      console.warn(`[Query retry ${attempt}] order ${orderId}:`, err.message)
      // Could also send to error monitoring service
    },
    maxRetries: 2,
  })

  if (isError) return <ErrorCard error={error as Error} />
  return <div>{data?.status}</div>
}
```

---

---
