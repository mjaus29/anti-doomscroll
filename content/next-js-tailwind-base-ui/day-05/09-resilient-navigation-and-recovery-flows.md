# 9 — Resilient Navigation and Recovery Flows

---

## T — TL;DR

Resilient navigation means users can always **find their way forward** — whether they hit an error, a 404, a permission wall, or a lost connection. It combines all special files with deliberate UX flows: retry mechanisms, fallback navigation, contextual recovery, and graceful degradation.

---

## K — Key Concepts

### The Complete Recovery Flow Map

```
User action → Route renders
                    │
          ┌─────────┴──────────┐
          │                    │
     Success ✅           Failure ❌
          │                    │
     Page renders        What failed?
                              │
              ┌───────────────┼──────────────┐
              │               │              │
         Not found      Auth error      Runtime error
              │               │              │
        not-found.tsx   unauthorized()   error.tsx
        or notFound()   forbidden()      reset() + refresh()
              │               │              │
         Back link       Sign-in UI     Retry button
         Related items  Upgrade CTA     Support ref
         Search box     Contact admin   Error ID
```

### Pattern 1 — Retry with Exponential Backoff

```tsx
// src/app/dashboard/orders/error.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrdersError({ error, reset }: Props) {
  const router = useRouter();
  const [retries, setRetries] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-retry on network errors with countdown
  useEffect(() => {
    const isNetworkError = error.message.toLowerCase().includes("fetch");
    if (isNetworkError && retries < 3) {
      const delay = Math.pow(2, retries) * 2; // 2s, 4s, 8s
      setCountdown(delay);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      const timer = setTimeout(() => {
        setRetries((r) => r + 1);
        router.refresh();
        reset();
      }, delay * 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [retries]);

  function handleManualRetry() {
    setRetries((r) => r + 1);
    router.refresh();
    reset();
  }

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Failed to Load Orders</h2>
      <p className="text-gray-500 text-sm mb-2">
        {error.message || "An unexpected error occurred."}
      </p>

      {countdown !== null && (
        <p className="text-blue-600 text-sm mb-4">
          Auto-retrying in {countdown}s...
        </p>
      )}

      {retries >= 3 && (
        <p className="text-red-500 text-sm mb-4">
          Multiple retries failed. Please contact support.
        </p>
      )}

      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-4">
          Error ref: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleManualRetry}
          disabled={retries >= 3}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg
                     hover:bg-blue-700 disabled:opacity-50"
        >
          Retry Now
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 border text-gray-600 text-sm rounded-lg
                     hover:bg-gray-50"
        >
          Dashboard Home
        </a>
      </div>
    </div>
  );
}
```

### Pattern 2 — Contextual Not-Found with Search

```tsx
// src/app/not-found.tsx — with search
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RootNotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim())
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const SUGGESTIONS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Products", href: "/products" },
    { label: "Blog", href: "/blog" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-md w-full">
        <p className="text-9xl font-black text-gray-100 select-none">404</p>
        <h1 className="text-2xl font-bold text-gray-900 -mt-4 mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 mb-6">
          Can't find what you're looking for? Try searching.
        </p>

        {/* Search box */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the site..."
            className="flex-1 border rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="px-3 py-2.5 border rounded-lg text-sm text-gray-600
                         hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 3 — Staged Error Recovery (Boundary Hierarchy)

```tsx
// Component-level error boundary → section-level → page-level → layout-level

// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

function SectionError({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      className="bg-red-50 border border-red-100 rounded-xl p-4
                    flex items-center justify-between"
    >
      <div>
        <p className="text-sm font-medium text-red-800">
          Section failed to load
        </p>
        <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
      </div>
      <button
        onClick={resetErrorBoundary}
        className="text-xs text-red-700 underline hover:no-underline"
      >
        Retry
      </button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Each section isolated — one failure doesn't break others */}
      {["Stats", "Orders", "Activity"].map((section) => (
        <ErrorBoundary key={section} FallbackComponent={SectionError}>
          <Suspense
            fallback={
              <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            }
          >
            {/* DynamicSection fetches its own data */}
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold mb-4">{section}</h2>
              <p className="text-gray-500 text-sm">Content loads here...</p>
            </div>
          </Suspense>
        </ErrorBoundary>
      ))}
    </div>
  );
}
```

### Pattern 4 — Offline Detection and Recovery

```tsx
// src/app/dashboard/error.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      router.refresh();
      reset(); // auto-recover when connection restored
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router, reset]);

  if (!online) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-[400px] text-center px-4"
      >
        <div className="text-5xl mb-4">📡</div>
        <h2 className="text-xl font-bold mb-2">No Internet Connection</h2>
        <p className="text-gray-500 text-sm mb-4">
          We'll automatically reload when you're back online.
        </p>
        <div className="flex gap-2 justify-center">
          <span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">
            Waiting for connection...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Something Went Wrong</h2>
      <p className="text-gray-500 text-sm mb-6">{error.message}</p>
      <button
        onClick={() => {
          router.refresh();
          reset();
        }}
        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium
                   rounded-lg hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  );
}
```

---

## W — Why It Matters

- Resilient navigation is a production differentiator — apps that handle errors gracefully retain users; apps that show blank screens lose them permanently.
- Auto-retry with countdown UX is specifically useful for transient errors (database hiccup, cold start) — most errors in production resolve themselves within a few seconds.
- Offline detection + auto-recovery is expected by mobile users — detecting `navigator.onLine` and auto-recovering on the `online` event is a small addition with outsized UX impact.
- Staged error boundaries (component → section → page → layout) is the defensive programming pattern for dashboards — a broken analytics widget should never prevent the user from seeing their orders.

---

## I — Interview Q&A

### Q1: How do you implement auto-retry for transient errors in an error boundary?

**A:** In the `error.tsx` Client Component, use `useEffect` with a `setTimeout` to call `router.refresh()` then `reset()` after a delay. Track retry count with `useState` to limit attempts. For exponential backoff, use `Math.pow(2, retries) * baseDelay` — 2s, 4s, 8s. Show a countdown so users know recovery is in progress. Stop auto-retrying after 3 attempts and show a manual retry button with a support reference.

### Q2: How do you handle offline scenarios gracefully in Next.js?

**A:** In `error.tsx`, use `navigator.onLine` to detect the initial online state and listen for the `online`/`offline` browser events. When the connection drops, swap the error UI to an "offline" message. When connection restores, automatically call `router.refresh()` and `reset()` — this clears the route cache and re-renders the page component without any user action. The `online` event fires reliably across all modern browsers the moment connectivity is restored, making this a zero-friction recovery experience.

### Q3: What is the correct boundary hierarchy for a resilient dashboard?

**A:** Think in four tiers from smallest to largest. First: component-level `<ErrorBoundary>` from `react-error-boundary` wrapping individual async sections — a chart failing doesn't affect the table. Second: `error.tsx` at the route segment level covering the full page — if the whole page fails, users get a retry button. Third: parent layout `error.tsx` catching layout-level failures. Fourth: `global-error.tsx` at the root as a last resort for critical failures. The same hierarchy applies to loading — granular `<Suspense>` inside the page, `loading.tsx` for route-level feedback.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Dead-end error screens with no navigation path

```tsx
// ❌ Error screen with only "Try Again" — user is trapped if the error persists
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div>
      <p>Something went wrong</p>
      <button onClick={reset}>Try Again</button>
      {/* No back link, no home link, no dashboard link */}
      {/* If error is permanent, user is completely stuck */}
    </div>
  );
}
```

**Fix:** Always provide at least two escape routes:

```tsx
export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  return (
    <div className="text-center py-16">
      <p className="text-gray-500 mb-6">{error.message}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => {
            router.refresh();
            reset();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Try Again {/* ← primary: retry */}
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600"
        >
          Go Back {/* ← secondary: escape route 1 */}
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 border rounded-lg text-sm text-gray-600"
        >
          Dashboard {/* ← tertiary: escape route 2 */}
        </a>
      </div>
    </div>
  );
}
```

### ❌ Pitfall: Infinite retry loop — reset() without router.refresh()

```tsx
// ❌ Error is caused by stale cached data
// reset() re-renders with the SAME cached data → same error → same reset → infinite loop
<button onClick={reset}>Try Again</button>
```

**Fix:** Always invalidate the cache before resetting:

```tsx
function handleRetry() {
  router.refresh(); // ← clears route cache FIRST
  reset(); // ← then re-renders with fresh data
}
<button onClick={handleRetry}>Try Again</button>;
```

### ❌ Pitfall: `not-found.tsx` with no layout context for dashboard routes

```tsx
// src/app/not-found.tsx handles /dashboard/orders/999 notFound()
// User sees a full-screen 404 page — dashboard sidebar GONE
// Browser back button is the only escape
```

**Fix:** Add section-level `not-found.tsx` files that render inside existing layouts:

```
src/app/
├── not-found.tsx                         ← root 404 (for /random-url)
└── (dashboard)/
    └── dashboard/
        └── orders/
            └── not-found.tsx             ← renders inside dashboard layout ✅
                                          ← sidebar stays, user stays oriented
```

### ❌ Pitfall: Showing raw error stacks to users in production

```tsx
// ❌ Exposes internals — security risk + terrible UX
<pre className="text-xs">{error.stack}</pre>
// Shows: "PrismaClientKnownRequestError at /node_modules/prisma/..."
```

**Fix:**

```tsx
const isDev = process.env.NODE_ENV === "development";

{
  isDev && (
    <pre className="text-xs bg-gray-100 p-3 rounded text-left overflow-auto mt-4">
      {error.stack}
    </pre>
  );
}
{
  !isDev && error.digest && (
    <p className="text-xs text-gray-400 font-mono">
      Error ID: {error.digest} {/* ← safe to show: just a hash */}
    </p>
  );
}
```

### ❌ Pitfall: Missing recovery path on `forbidden.tsx` — user has no next action

```tsx
// ❌ Just shows "Access Denied" with no guidance
export default function Forbidden() {
  return <h1>Access Denied</h1>;
}
// User doesn't know: who to contact, how to get access, where to go instead
```

**Fix:**

```tsx
export default function Forbidden() {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6">
        You need the <strong>Admin</strong> role to access this page.
      </p>
      <div className="flex gap-3 justify-center">
        <a href="/dashboard" className="...">
          Go to Dashboard
        </a>
        <a href="mailto:admin@co.com" className="...">
          Request Access
        </a>
      </div>
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete resilient `/dashboard/reports` page that demonstrates all recovery patterns:

1. A `loading.tsx` with a shimmer skeleton matching the page layout
2. An `error.tsx` with:
   - Offline detection and auto-recovery on reconnect
   - Manual retry with `router.refresh()` + `reset()`
   - Auto-retry countdown (2s) for the first failure
   - Error digest display
   - Two escape routes: Go Back + Dashboard Home
3. A `not-found.tsx` that renders inside the dashboard layout with a link back to reports list
4. The `page.tsx` itself — calls `notFound()` for a specific condition, has granular Suspense for two independent sections

### Solution

```tsx
// src/app/(dashboard)/dashboard/reports/loading.tsx
export default function ReportsLoading() {
  return (
    <div className="p-8 max-w-5xl animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Two-column section skeletons */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Left: chart skeleton */}
        <div className="bg-white border rounded-xl p-5">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
        {/* Right: table skeleton */}
        <div className="bg-white border rounded-xl p-5">
          <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom summary skeleton */}
      <div className="bg-white border rounded-xl p-5">
        <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/reports/error.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ReportsError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(2);
  const [autoRetried, setAutoRetried] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Log to monitoring
  useEffect(() => {
    console.error("[ReportsError]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  // Detect online/offline state
  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      router.refresh();
      reset();
    };
    const handleOffline = () => {
      setOnline(false);
      // Cancel any pending auto-retry
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router, reset]);

  // Auto-retry once after 2s countdown (only on first error, only when online)
  useEffect(() => {
    if (autoRetried || !online) return;

    setCountdown(2);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setAutoRetried(true);
      router.refresh();
      reset();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // ← run once on mount

  function handleManualRetry() {
    setCountdown(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    router.refresh();
    reset();
  }

  // Offline UI
  if (!online) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-[450px] text-center px-4"
      >
        <div className="text-5xl mb-4">📡</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          No Internet Connection
        </h2>
        <p className="text-gray-500 text-sm max-w-xs mb-6">
          Reports require an internet connection. We'll automatically reload
          when you're back online.
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm text-gray-400">
            Waiting for connection...
          </span>
        </div>
      </div>
    );
  }

  // Error UI
  return (
    <div
      className="flex flex-col items-center justify-center
                 min-h-[450px] text-center px-4"
      style={{ animation: "fadeIn 0.25s ease both" }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div className="text-5xl mb-4">⚠️</div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Failed to Load Reports
      </h2>

      <p className="text-gray-500 text-sm max-w-xs mb-4">
        {error.message ||
          "An unexpected error occurred while loading your reports."}
      </p>

      {/* Countdown badge */}
      {countdown !== null && (
        <div
          className="flex items-center gap-2 text-blue-600 text-sm mb-4
                        bg-blue-50 px-4 py-2 rounded-full"
        >
          <span
            className="w-3 h-3 border-2 border-blue-500 border-t-transparent
                           rounded-full animate-spin"
          />
          <span>Auto-retrying in {countdown}s...</span>
        </div>
      )}

      {/* Error ID for support */}
      {error.digest && (
        <div className="bg-gray-100 rounded-lg px-4 py-2 mb-6">
          <p className="text-xs text-gray-400">
            Error ref:{" "}
            <span className="font-mono text-gray-600 select-all">
              {error.digest}
            </span>
          </p>
        </div>
      )}

      {/* Action buttons — always two escape routes */}
      <div className="flex gap-3">
        <button
          onClick={handleManualRetry}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Now
        </button>
        <button
          onClick={() => router.back()}
          className="px-5 py-2 border border-gray-200 text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
        <a
          href="/dashboard"
          className="px-5 py-2 border border-gray-200 text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/reports/not-found.tsx
// Renders INSIDE the dashboard layout — sidebar stays visible
import Link from "next/link";

const AVAILABLE_REPORTS = [
  { label: "Revenue Overview", href: "/dashboard/reports?type=revenue" },
  { label: "Order Analytics", href: "/dashboard/reports?type=orders" },
  { label: "Customer Growth", href: "/dashboard/reports?type=customers" },
];

export default function ReportNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[450px] text-center px-4"
    >
      <div className="text-5xl mb-4">📊</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8">
        This report doesn't exist or has been removed. Try one of the available
        reports below.
      </p>

      {/* Available reports */}
      <div className="w-full max-w-xs space-y-2 mb-8">
        {AVAILABLE_REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex items-center gap-2 px-4 py-3 border rounded-xl
                       text-sm text-gray-700 hover:border-blue-400
                       hover:text-blue-600 transition-colors"
          >
            <span className="text-blue-500">→</span>
            {r.label}
          </Link>
        ))}
      </div>

      <Link
        href="/dashboard"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/reports/_components/revenue-chart.tsx
// Independent async Server Component — streams in on its own
async function getRevenueData() {
  await new Promise((r) => setTimeout(r, 400)); // simulate DB query
  return [
    { month: "Jan", revenue: 12400 },
    { month: "Feb", revenue: 18200 },
    { month: "Mar", revenue: 15800 },
    { month: "Apr", revenue: 22100 },
    { month: "May", revenue: 19600 },
  ];
}

export async function RevenueChart() {
  const data = await getRevenueData();
  const maxRev = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
      <div className="flex items-end gap-3 h-48">
        {data.map((d) => (
          <div
            key={d.month}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <span className="text-xs text-gray-500 font-medium">
              ${(d.revenue / 1000).toFixed(0)}k
            </span>
            <div
              className="w-full bg-blue-500 rounded-t-md transition-all"
              style={{ height: `${(d.revenue / maxRev) * 140}px` }}
            />
            <span className="text-xs text-gray-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/reports/_components/top-products-table.tsx
// Independent async Server Component — streams separately
async function getTopProducts() {
  await new Promise((r) => setTimeout(r, 800)); // simulate slower query
  return [
    { name: "Air Max 90", revenue: 8400, units: 70 },
    { name: "Ultraboost 22", revenue: 7200, units: 40 },
    { name: "Leather Bag", revenue: 6600, units: 30 },
    { name: "Canvas Tote", revenue: 3150, units: 70 },
    { name: "Wool Cap", revenue: 2450, units: 70 },
  ];
}

export async function TopProductsTable() {
  const products = await getTopProducts();

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium text-right">Units</th>
            <th className="pb-2 font-medium text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map((p) => (
            <tr key={p.name}>
              <td className="py-2 font-medium text-gray-800">{p.name}</td>
              <td className="py-2 text-right text-gray-500">{p.units}</td>
              <td className="py-2 text-right font-semibold text-gray-900">
                ${p.revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/reports/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RevenueChart } from "./_components/revenue-chart";
import { TopProductsTable } from "./_components/top-products-table";

export const metadata: Metadata = { title: "Reports" };

type SearchParams = Promise<{ type?: string }>;

const VALID_TYPES = ["revenue", "orders", "customers", undefined];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type } = await searchParams;

  // Specific report type requested but invalid → 404
  if (type !== undefined && !VALID_TYPES.includes(type)) {
    notFound();
  }

  const SUMMARY = [
    { label: "Total Revenue", value: "$78,100" },
    { label: "Total Orders", value: "531" },
    { label: "Avg Order Value", value: "$147" },
    { label: "New Customers", value: "89" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {type ? `Showing: ${type} report` : "All reports — May 2026"}
          </p>
        </div>
        <button
          className="px-4 py-2 border rounded-lg text-sm text-gray-600
                           hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Two independent sections — stream in separately */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue chart — resolves at ~400ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl p-5 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-48 bg-gray-100 rounded-lg" />
            </div>
          }
        >
          <RevenueChart />
        </Suspense>

        {/* Top products table — resolves at ~800ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl p-5 animate-pulse">
              <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <TopProductsTable />
        </Suspense>
      </div>

      {/* Summary bar — static, renders immediately (no await) */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">
          Month Summary
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {SUMMARY.map((s) => (
            <div key={s.label}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

```
Streaming order for /dashboard/reports:
  t=0ms    → loading.tsx skeleton renders (route-level feedback)
  t=0ms    → page shell + summary bar renders (no await, static data)
  t=0ms    → both Suspense fallback skeletons render inside the page
  t=400ms  → RevenueChart resolves, replaces its skeleton
  t=800ms  → TopProductsTable resolves, replaces its skeleton

Recovery flows active:
  Unknown ?type=xyz  → notFound() → reports/not-found.tsx (inside dashboard layout)
  Runtime crash      → error.tsx  → auto-retry at 2s, manual retry, offline detection
  No connection      → error.tsx  → offline UI, auto-recover on reconnect
  Infinite loop risk → router.refresh() before reset() prevents stale cache retry
```

---

---
