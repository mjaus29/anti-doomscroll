# 2 — `error.tsx` — Error Boundaries and Recovery

---

## T — TL;DR

`error.tsx` is a **React error boundary** that catches runtime errors thrown by `page.tsx` or its child components, replacing the broken UI with a friendly error screen. It must be a Client Component and receives an `error` object and a `reset` function to retry rendering.

---

## K — Key Concepts

### How It Works

```
Without error.tsx:
  Server throws during render → entire page crashes → React error overlay (dev)
  or blank white page (production) → terrible UX

With error.tsx:
  Server throws → error.tsx catches it → renders error UI with retry button
  Layout STAYS mounted (user can still navigate away)
  Only the page content is replaced, not the shell
```

### Required: `'use client'`

```tsx
// src/app/dashboard/error.tsx
// ⚠️ MUST be a Client Component — React error boundaries require client rendering

"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string }; // digest = server-side error hash
  reset: () => void; // call this to retry rendering the page
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (Sentry, Datadog, etc.)
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px]
                    text-center px-4"
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>

      {/* digest: server-side error ID for support reference */}
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 border text-gray-600 text-sm font-medium
                     rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
```

### File Placement — Scope and Inheritance

```
src/app/
├── error.tsx                    ← catches errors in app root (never catches layout.tsx errors)
├── dashboard/
│   ├── error.tsx                ← catches dashboard page.tsx errors
│   ├── layout.tsx               ← NOT caught by dashboard/error.tsx
│   ├── page.tsx                 ← caught by dashboard/error.tsx ✅
│   └── orders/
│       ├── error.tsx            ← catches orders page.tsx (overrides parent error.tsx)
│       └── page.tsx             ← caught by orders/error.tsx ✅

Key rule: error.tsx catches errors in the SAME segment's page.tsx
          but does NOT catch errors in the layout.tsx at the same level
          To catch layout errors: put error.tsx in the PARENT segment
```

### `error.tsx` Does NOT Catch Layout Errors

```tsx
// src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  throw new Error("Layout crashed!"); // ← NOT caught by dashboard/error.tsx
  return <>{children}</>;
}

// src/app/dashboard/error.tsx
// This CANNOT catch layout.tsx errors at the same level

// FIX: To catch dashboard layout errors, put error.tsx in the PARENT:
// src/app/error.tsx  ← catches errors from app/dashboard/layout.tsx
```

### `reset` — How It Works

```tsx
// reset() tells React to re-render the error boundary's children
// This effectively retries the failing server component

// What reset() does:
// 1. Clears the error state
// 2. Re-renders page.tsx inside the error boundary
// 3. Re-runs all async data fetching in page.tsx
// 4. If successful → normal page renders
// 5. If still failing → error.tsx shows again

// Pattern: combine reset with router.refresh() for stale data errors
"use client";
import { useRouter } from "next/navigation";

export default function ErrorPage({ error, reset }: ErrorProps) {
  const router = useRouter();

  function handleRetry() {
    router.refresh(); // ← invalidate server cache FIRST
    reset(); // ← then re-render
  }

  return <button onClick={handleRetry}>Try Again</button>;
}
```

### Granular Error Handling — Per-Component

```tsx
// src/app/dashboard/page.tsx
// Use error boundaries at component level for independent error handling

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary"; // npm package

export default function DashboardPage() {
  return (
    <div>
      {/* Stats: if this fails, only stats section shows error */}
      <ErrorBoundary
        fallback={
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Failed to load stats. <button className="underline">Retry</button>
          </div>
        }
      >
        <Suspense fallback={<StatsSkeleton />}>
          <StatsCards />
        </Suspense>
      </ErrorBoundary>

      {/* Orders: independent error state */}
      <ErrorBoundary fallback={<OrdersError />}>
        <Suspense fallback={<OrdersSkeleton />}>
          <RecentOrders />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

### `global-error.tsx` — Root Layout Error Handling

```tsx
// src/app/global-error.tsx
// ONLY catches errors in the root layout.tsx
// Must include <html> and <body> — it REPLACES the root layout when shown

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          className="min-h-screen flex items-center justify-center
                        bg-gray-50 text-center px-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Error
            </h1>
            <p className="text-gray-500 mb-6">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- Without `error.tsx`, a single database error or API failure crashes the entire page — users see a blank screen with no recovery path. With it, they see a friendly message and a retry button.
- The `digest` property on the error object is a server-generated error hash that maps to the full error in your server logs — you can display it as a support reference ID without exposing sensitive error details to the user.
- `reset()` combined with `router.refresh()` is the correct retry pattern — `reset()` alone re-renders with potentially stale cached data; `router.refresh()` first clears the cache, so the retry actually re-fetches.
- The scope rule (error.tsx doesn't catch its own layout.tsx) is a React error boundary constraint — a boundary cannot catch errors in the component that renders it. This is why `global-error.tsx` exists for root layout errors.

---

## I — Interview Q&A

### Q1: Why must `error.tsx` be a Client Component?

**A:** React error boundaries are a client-side React feature — they use class component lifecycle methods (or hooks like `useEffect`) that only run in the browser. Specifically, error boundaries intercept JavaScript exceptions during rendering, and this error-catching mechanism is only available in the client React runtime. Server Components don't have an equivalent — when a Server Component throws, the error propagates up to the nearest client-side error boundary.

### Q2: What is the `reset` function in `error.tsx` and how should it be used?

**A:** `reset` is a function provided by Next.js that clears the error state and retries rendering the failed `page.tsx`. Calling it triggers a re-render of the page component inside the error boundary. For best results, combine it with `router.refresh()` — call `router.refresh()` first to invalidate the server-side route cache (ensuring the retry fetches fresh data), then call `reset()` to re-render. Without `router.refresh()`, the retry might get the same cached result that caused the error.

### Q3: What errors does `error.tsx` NOT catch?

**A:** Three cases. First: errors thrown in `layout.tsx` at the same level — a boundary can't catch errors in the component that renders it, so `dashboard/error.tsx` can't catch `dashboard/layout.tsx` errors (use the parent's `error.tsx` instead). Second: errors in Server Actions that aren't thrown but returned as error states. Third: errors in the root `layout.tsx` — use `global-error.tsx` for those, which replaces the entire page including `<html>` and `<body>`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `'use client'` on `error.tsx`

```tsx
// ❌ No 'use client' directive — React error boundaries require client rendering
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]); // hook = error
  return <button onClick={reset}>Retry</button>;
}
// Build error: error.tsx must be a Client Component
```

**Fix:**

```tsx
'use client'   // ← first line, always
export default function Error({ error, reset }) { ... }
```

### ❌ Pitfall: Calling `reset()` without `router.refresh()` first

```tsx
// ❌ reset() retries with stale cached data → same error happens again
<button onClick={reset}>Try Again</button>
```

**Fix:**

```tsx
"use client";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        router.refresh();
        reset();
      }}
    >
      Try Again
    </button>
  );
}
```

### ❌ Pitfall: Exposing raw error messages to users in production

```tsx
// ❌ Leaks internal error messages, stack traces, DB errors
<p>{error.message}</p>
// Could show: "PrismaClientKnownRequestError: Connection refused at postgres://..."
```

**Fix:** Show generic messages in production, use `digest` for reference:

```tsx
const isDev = process.env.NODE_ENV === 'development'

<p className="text-gray-500">
  {isDev ? error.message : 'An unexpected error occurred.'}
</p>
{error.digest && (
  <p className="text-xs text-gray-400 font-mono">Ref: {error.digest}</p>
)}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `error.tsx` for `/dashboard/orders` that:

1. Logs the error to console with the digest
2. Shows different UI for network errors vs other errors (check `error.message`)
3. Has a "Try Again" button (with `router.refresh()` + `reset()`)
4. Has a "Go Back" button using `router.back()`
5. Shows the digest as a support reference
6. Fades in with a CSS animation to avoid a jarring flash

### Solution

```tsx
// src/app/dashboard/orders/error.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isNetworkError(error: Error): boolean {
  return (
    error.message.toLowerCase().includes("network") ||
    error.message.toLowerCase().includes("fetch") ||
    error.message.toLowerCase().includes("connection")
  );
}

export default function OrdersError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[OrdersError]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
    // In production: errorMonitoring.capture(error)
  }, [error]);

  const networkError = isNetworkError(error);

  function handleRetry() {
    router.refresh();
    reset();
  }

  return (
    <div
      className="flex flex-col items-center justify-center
                 min-h-[420px] text-center px-4"
      style={{ animation: "fadeIn 0.3s ease both" }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Icon */}
      <div className="text-5xl mb-5">{networkError ? "🌐" : "⚠️"}</div>

      {/* Title */}
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {networkError ? "Connection Problem" : "Failed to Load Orders"}
      </h2>

      {/* Message */}
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        {networkError
          ? "Unable to reach the server. Check your connection and try again."
          : "Something went wrong while loading your orders. This has been reported."}
      </p>

      {/* Support reference */}
      {error.digest && (
        <div className="bg-gray-100 rounded-lg px-4 py-2 mb-6">
          <p className="text-xs text-gray-400">
            Support reference:{" "}
            <span className="font-mono text-gray-600">{error.digest}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleRetry}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          {networkError ? "Retry Connection" : "Try Again"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-5 py-2 border border-gray-200 text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
```

---

---
