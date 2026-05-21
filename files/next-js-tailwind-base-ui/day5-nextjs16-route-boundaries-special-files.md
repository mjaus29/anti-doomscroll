# 📅 Day 5 — Route Boundaries and Special Files (Next.js 16)

> **Goal:** Master every special file Next.js provides for controlling what users see when routes load, fail, are missing, or are restricted — and combine them into resilient, production-grade navigation flows.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 4 complete — dynamic routing and route groups understood.

---

## 📋 Day 5 Subtopic Overview

| #   | Subtopic                                                           | Time   |
| --- | ------------------------------------------------------------------ | ------ |
| 1   | `loading.tsx` — Streaming and Suspense Boundaries                  | 12 min |
| 2   | `error.tsx` — Error Boundaries and Recovery                        | 12 min |
| 3   | `not-found.tsx` — 404 Handling and `notFound()`                    | 10 min |
| 4   | `default.tsx` — Parallel Route Fallbacks                           | 8 min  |
| 5   | `forbidden.tsx` — 403 Authorization Errors                         | 8 min  |
| 6   | `unauthorized.tsx` — 401 Authentication Errors                     | 8 min  |
| 7   | Parallel Routes — `@slot` Architecture                             | 15 min |
| 8   | Intercepting Routes — Modal Patterns                               | 15 min |
| 9   | Resilient Navigation and Recovery Flows                            | 12 min |
| 10  | Combining All Special Files — Complete Route Boundary Architecture | 15 min |

---

---

# 1 — `loading.tsx` — Streaming and Suspense Boundaries

---

## T — TL;DR

`loading.tsx` is an automatic **Suspense boundary** — Next.js wraps your `page.tsx` in it and shows the loading file instantly while the page fetches data. It enables streaming HTML: the shell renders immediately, the content streams in when ready. Users see UI in milliseconds, not seconds.

---

## K — Key Concepts

### How It Works — The Streaming Model

```
Without loading.tsx:
  User navigates → blank screen → server fetches ALL data → full HTML → browser renders
  Time to first byte: 200–800ms (database dependent)
  User experience: stares at blank/old page

With loading.tsx:
  User navigates → loading.tsx renders INSTANTLY → server streams content when ready
  Time to first byte: ~5ms (shell renders immediately)
  User experience: skeleton → content

Timeline:
  t=0ms    loading.tsx renders (Suspense fallback)
  t=0ms    Server starts fetching data in background
  t=200ms  Data ready → React streams new content
  t=201ms  Page renders with real data (loading.tsx disappears)
```

### File Placement — Scope

```
src/app/
├── loading.tsx                     ← covers the entire app (root level)
├── dashboard/
│   ├── loading.tsx                 ← covers /dashboard AND all children
│   ├── page.tsx
│   └── orders/
│       ├── loading.tsx             ← covers /dashboard/orders only
│       └── page.tsx

Rule: loading.tsx covers the page.tsx at the SAME level AND all sub-routes
      unless a child has its own loading.tsx (child overrides parent)
```

### Basic Loading File

```tsx
// src/app/dashboard/loading.tsx
// Shown while dashboard/page.tsx is fetching data

export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 animate-pulse">
      {/* Page title skeleton */}
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="h-12 bg-gray-50 border-b" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### What `loading.tsx` Wraps — The Equivalent Code

```tsx
// loading.tsx is shorthand for this Suspense pattern:

// Without loading.tsx — you write this manually
import { Suspense } from "react";
import ProductsPage from "./page";
import ProductsLoading from "./loading";

export default function Layout({ children }) {
  return (
    <Suspense fallback={<ProductsLoading />}>
      {children} {/* ← page.tsx renders here */}
    </Suspense>
  );
}

// With loading.tsx — Next.js does this automatically
// Just create loading.tsx at the same level as page.tsx
```

### Per-Section Loading States — Granular Control

```tsx
// src/app/dashboard/page.tsx
// Instead of one full-page skeleton, use granular Suspense inside the page

import { Suspense } from "react";
import { StatsCards } from "./_components/stats-cards";
import { RecentOrders } from "./_components/recent-orders";
import { ActivityFeed } from "./_components/activity-feed";
import { StatsSkeleton } from "./_components/skeletons";
import { OrdersSkeleton } from "./_components/skeletons";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Overview</h1>

      {/* Stats: fast query → loads first */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Orders: slower query → loads independently */}
        <Suspense fallback={<OrdersSkeleton />}>
          <RecentOrders />
        </Suspense>

        {/* Activity: slowest query → loads last */}
        <Suspense
          fallback={
            <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
          }
        >
          <ActivityFeed />
        </Suspense>
      </div>
    </div>
  );
}

// Each component fetches its own data:
// src/app/dashboard/_components/stats-cards.tsx
async function StatsCards() {
  const stats = await getStats(); // ← async Server Component
  return <div>...</div>;
}
```

### `loading.tsx` vs Manual `<Suspense>`

```
loading.tsx:
  ✅ Zero config — just create the file
  ✅ Covers the entire page including layout transitions
  ✅ Works with the router transition — shows on navigation
  ❌ All-or-nothing — entire page shows skeleton until ALL data is ready

Manual Suspense:
  ✅ Granular — different skeletons for different sections
  ✅ Sections stream in independently as each resolves
  ✅ Faster perceived performance (content appears progressively)
  ❌ More code — Suspense wrapper per section

Best practice: Use BOTH
  → loading.tsx for the overall page skeleton (immediate feedback on navigation)
  → Manual Suspense for independent data sections within the page
```

### `loading.tsx` Does NOT Show For

```
loading.tsx is NOT shown for:
  ❌ Client-side state changes (useState updates)
  ❌ Form submissions (use isPending from useTransition)
  ❌ Data re-fetching within the current route (router.refresh())
  ❌ Layout data (layout.tsx fetches don't trigger loading.tsx)

loading.tsx IS shown for:
  ✅ New navigation to the route (from another route)
  ✅ Initial page load if data is slow
  ✅ Hard refresh if page has slow server data
```

---

## W — Why It Matters

- `loading.tsx` transforms perceived performance — a page that takes 800ms to load feels instant because users see a skeleton immediately. This is measurably better for conversion and retention.
- Streaming is the core performance architecture of the App Router — without `loading.tsx`, you get waterfall rendering: nothing appears until everything is ready.
- The granular Suspense pattern (multiple `<Suspense>` inside a page) is how production dashboards achieve sub-100ms first contentful paint — fast sections appear first, slow sections fill in later.
- The file placement scope rule (loading.tsx covers the same level AND children) means you can define one skeleton at the section level that covers an entire section of the app.

---

## I — Interview Q&A

### Q1: What is `loading.tsx` and how does it work technically?

**A:** `loading.tsx` is a special Next.js file that creates an automatic Suspense boundary around a `page.tsx`. When a user navigates to the route, Next.js immediately renders the `loading.tsx` content as a fallback while the page's async data fetching completes. Technically, it wraps `page.tsx` in `<Suspense fallback={<LoadingComponent />}>`. This enables streaming HTML — the browser receives and renders the loading skeleton almost instantly, then React streams the real content as server data resolves.

### Q2: What is the difference between `loading.tsx` and a manual `<Suspense>` inside the page?

**A:** `loading.tsx` is a route-level Suspense that covers the entire page — it shows one skeleton until all the page's data is ready. Manual `<Suspense>` inside the page wraps individual components, allowing them to stream in independently. A page with three Suspense-wrapped sections can show each section as it resolves — stats first, then orders, then activity. This progressive rendering feels faster even if total load time is the same. Best practice: use both — `loading.tsx` for instant navigation feedback, manual Suspense for progressive content streaming.

### Q3: Does `loading.tsx` show during client-side state updates?

**A:** No — `loading.tsx` only shows during navigation to the route (when the page component suspends while fetching async data). Client-side state changes (`useState` updates), form submissions, and data re-fetches triggered by `router.refresh()` don't trigger `loading.tsx`. For loading states during mutations or programmatic navigation, use `useTransition`'s `isPending` flag.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: A single full-page skeleton that blocks all sections

```tsx
// loading.tsx shows until ALL data on the page resolves
// If one section is slow (e.g., activity feed takes 2s),
// the user sees the full skeleton for 2 full seconds
// even though stats loaded in 100ms

export default function DashboardLoading() {
  return <FullPageSkeleton />; // ← blocks everything
}
```

**Fix:** Use granular Suspense inside the page for independent sections:

```tsx
// page.tsx
<Suspense fallback={<StatsSkeleton />}><StatsCards /></Suspense>
<Suspense fallback={<OrdersSkeleton />}><RecentOrders /></Suspense>
// Stats appear at 100ms, orders at 400ms, activity at 2000ms
```

### ❌ Pitfall: Not matching skeleton dimensions to real content

```tsx
// ❌ Skeleton is 200px tall, real content is 800px tall
// → Layout shift on content load (bad CLS score)
export default function Loading() {
  return <div className="h-48 bg-gray-100 animate-pulse" />;
}
```

**Fix:** Match skeleton structure to real content dimensions:

```tsx
// ✅ Skeleton mirrors the actual page structure
export default function Loading() {
  return (
    <div className="p-8">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" /> {/* title */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {" "}
        {/* stats */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" /> {/* table */}
    </div>
  );
}
```

### ❌ Pitfall: Loading state flicker on fast connections

```tsx
// On fast connections, data loads in 50ms
// But loading.tsx still flickers for 50ms → jarring UX
```

**Fix:** Use CSS `animation-delay` to only show skeleton after a threshold:

```tsx
export default function Loading() {
  return (
    <div
      className="animate-pulse"
      style={{
        animationDelay: "150ms",
        opacity: 0,
        animation: "fadeIn 0.2s ease 150ms forwards",
      }}
    >
      {/* skeleton content */}
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/products` page with:

1. A `loading.tsx` that shows a 3-column grid of 6 product card skeletons
2. The `page.tsx` uses TWO manual `<Suspense>` boundaries — one for a hero banner (fast), one for the product grid (slow — simulate 1s delay)
3. Each section streams in independently
4. Skeletons match the approximate dimensions of real content

### Solution

```tsx
// src/app/products/loading.tsx
// Route-level skeleton — shown immediately on navigation
export default function ProductsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero banner skeleton */}
      <div className="h-48 bg-gray-200 animate-pulse rounded-2xl mb-10" />

      {/* Product grid skeleton */}
      <div className="h-7 w-36 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-9 bg-gray-200 rounded-lg mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/_components/hero-banner.tsx
// Fast — resolves in ~50ms
async function getHeroBanner() {
  return {
    headline: "Summer Collection 2026",
    sub: "Up to 40% off selected items",
  };
}

export async function HeroBanner() {
  const banner = await getHeroBanner();
  return (
    <div
      className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600
                    rounded-2xl flex flex-col items-center justify-center text-white mb-10"
    >
      <h2 className="text-3xl font-bold mb-2">{banner.headline}</h2>
      <p className="text-blue-100">{banner.sub}</p>
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-grid.tsx
// Slow — simulates 1s database query
async function getProducts() {
  await new Promise((r) => setTimeout(r, 1000)); // simulate slow DB
  return [
    { id: "1", name: "Air Max 90", price: 120, category: "Shoes" },
    { id: "2", name: "Canvas Tote", price: 45, category: "Bags" },
    { id: "3", name: "Wool Cap", price: 35, category: "Accessories" },
    { id: "4", name: "Ultraboost 22", price: 180, category: "Shoes" },
    { id: "5", name: "Leather Belt", price: 55, category: "Accessories" },
    { id: "6", name: "Leather Bag", price: 220, category: "Bags" },
  ];
}

export async function ProductGrid() {
  const products = await getProducts();
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">All Products</h2>
      <div className="grid grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="border rounded-xl overflow-hidden hover:shadow-md
                          transition-shadow"
          >
            <div
              className="aspect-square bg-gray-100 flex items-center
                            justify-center text-4xl"
            >
              🛍️
            </div>
            <div className="p-4">
              <span className="text-xs text-blue-600 font-medium">
                {p.category}
              </span>
              <h3 className="font-semibold mt-0.5">{p.name}</h3>
              <p className="text-lg font-bold text-gray-900 mt-1">${p.price}</p>
              <button
                className="mt-3 w-full py-2 bg-blue-600 text-white
                                 text-sm rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx
// Two independent Suspense boundaries — stream in at different times
import { Suspense } from "react";
import { HeroBanner } from "./_components/hero-banner";
import { ProductGrid } from "./_components/product-grid";

export default function ProductsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero: streams in at ~50ms */}
      <Suspense
        fallback={
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl mb-10" />
        }
      >
        <HeroBanner />
      </Suspense>

      {/* Products: streams in at ~1000ms */}
      <Suspense
        fallback={
          <div>
            <div className="h-7 w-36 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-xl mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-9 bg-gray-200 rounded-lg mt-3" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <ProductGrid />
      </Suspense>
    </div>
  );
}

// Streaming order:
// t=0ms    → loading.tsx renders (route-level skeleton)
// t=50ms   → HeroBanner resolves, replaces its skeleton
// t=1000ms → ProductGrid resolves, replaces its skeleton
// Each section is independent — no blocking
```

---

---

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

# 3 — `not-found.tsx` — 404 Handling and `notFound()`

---

## T — TL;DR

`not-found.tsx` defines the UI shown when a resource doesn't exist. Call `notFound()` from anywhere in a Server Component to trigger it. Without a custom file, Next.js shows a generic 404. With one, you control exactly what users see — and keep them in your app's navigation shell.

---

## K — Key Concepts

### `notFound()` — How to Trigger

```tsx
// src/app/products/[id]/page.tsx
import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  // Trigger not-found if product doesn't exist
  if (!product) notFound();

  // Also trigger for access control
  if (product.status === "deleted") notFound();

  return <ProductView product={product} />;
}
```

### Where to Place `not-found.tsx` — Scope

```
src/app/
├── not-found.tsx                   ← ROOT — shown for ANY unmatched route in the app
│                                     Also shown when notFound() has no closer handler
├── dashboard/
│   ├── not-found.tsx               ← shown when notFound() is called inside /dashboard/*
│   │                                  Renders INSIDE the dashboard layout
│   └── orders/
│       ├── not-found.tsx           ← shown for /dashboard/orders/:id not found
│       └── [orderId]/page.tsx      ← calls notFound() → triggers orders/not-found.tsx

Scope rule:
  notFound() → finds the NEAREST not-found.tsx up the tree
  No file found → falls back to root not-found.tsx
  Root not-found.tsx → shown for completely unknown routes (e.g., /abc/xyz)
```

### Root `not-found.tsx` — Handles Unknown Routes

```tsx
// src/app/not-found.tsx
// Shown for: completely unknown URLs (/abc/xyz) + any notFound() with no closer handler
// Does NOT have access to the current URL (no params/searchParams)
// DOES render inside the root layout (html, body, fonts all work)

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "404 — Page Not Found" };

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-gray-100 mb-2 select-none">
          404
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                       rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/blog"
            className="px-5 py-2.5 border text-gray-600 text-sm font-medium
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Read the Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Section `not-found.tsx` — Context-Aware 404

```tsx
// src/app/dashboard/orders/not-found.tsx
// Rendered INSIDE the dashboard layout — sidebar stays visible
// User can still navigate to other dashboard sections

import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">📦</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        This order doesn't exist, was deleted, or you don't have permission to
        view it.
      </p>
      <Link
        href="/dashboard/orders"
        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium
                   rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← All Orders
      </Link>
    </div>
  );
}
```

### `generateStaticParams` + `dynamicParams = false`

```tsx
// src/app/products/[id]/page.tsx
export const dynamicParams = false; // unknown params → 404 (triggers not-found.tsx)

export function generateStaticParams() {
  return [{ id: "prod-1" }, { id: "prod-2" }, { id: "prod-3" }];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  // With dynamicParams = false, this might be redundant
  // but defensive notFound() is still good practice
  if (!product) notFound();

  return <ProductView product={product} />;
}
```

### `notFound()` in Layout

```tsx
// src/app/orgs/[orgId]/layout.tsx
// Calling notFound() in layout DOES work — but bubbles up to PARENT's not-found.tsx
// (not the current segment's not-found.tsx)

import { notFound } from "next/navigation";

export default async function OrgLayout({ params, children }) {
  const { orgId } = await params;
  const org = await getOrg(orgId);

  if (!org) notFound(); // ← triggers src/app/not-found.tsx (parent level)
  // Because layout.tsx is NOT caught by same-level not-found.tsx

  return (
    <div>
      {/* org layout */}
      {children}
    </div>
  );
}
```

---

## W — Why It Matters

- A well-designed `not-found.tsx` keeps users in the app with navigation context instead of stranding them on a dead-end page. Section-level `not-found.tsx` files render inside the layout — the sidebar stays, the user stays oriented.
- The root `not-found.tsx` is the safety net for all unknown URLs — it sets the HTTP status to 404 automatically, which matters for SEO (prevents soft 404s where Google sees 200 OK on empty pages).
- Calling `notFound()` is more correct than returning `null` or redirecting to a 404 page — it properly signals the absence of a resource to both the user and search engine crawlers.
- Understanding that `notFound()` in a layout bubbles to the parent's handler (not the same level's) is a subtle rule that causes confusing behavior if unknown — your not-found UI doesn't appear where you expect.

---

## I — Interview Q&A

### Q1: What is the difference between the root `not-found.tsx` and a route-level `not-found.tsx`?

**A:** Root `not-found.tsx` (`src/app/not-found.tsx`) handles two cases: completely unknown URLs that don't match any route, and any `notFound()` call that has no closer handler. It renders inside the root layout. A route-level `not-found.tsx` (e.g., `src/app/dashboard/orders/not-found.tsx`) handles `notFound()` calls from within that route segment — and crucially, it renders inside all parent layouts, so the dashboard sidebar stays visible when an order isn't found.

### Q2: How does `notFound()` find which `not-found.tsx` to render?

**A:** Next.js walks up the directory tree from where `notFound()` is called, finding the nearest `not-found.tsx`. If called from `dashboard/orders/[orderId]/page.tsx`, it looks for `not-found.tsx` in `orders/`, then `dashboard/`, then `app/`. It uses the first one it finds. If called from a layout, it skips the same-level `not-found.tsx` and finds the parent's handler.

### Q3: What HTTP status code does `notFound()` trigger?

**A:** `notFound()` causes the response to have a `404 Not Found` HTTP status code. This is important for SEO — without it, a page that shows "product not found" might return 200 OK, which search engines treat as a valid page (soft 404). Using `notFound()` sends the correct 404 signal to crawlers, preventing them from indexing non-existent resource pages.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Returning `null` instead of calling `notFound()`

```tsx
// ❌ Returns 200 OK with empty content — soft 404, bad for SEO
if (!product) return null;
```

**Fix:**

```tsx
import { notFound } from "next/navigation";
if (!product) notFound(); // ← returns 404 + renders not-found.tsx ✅
```

### ❌ Pitfall: Using root `not-found.tsx` for section errors — loses layout context

```tsx
// ❌ User is on /dashboard/orders/999
// notFound() triggers root not-found.tsx
// User sees full-screen 404 — dashboard sidebar GONE
// User has to use browser back button to return
```

**Fix:** Add a `not-found.tsx` at the section level:

```
src/app/dashboard/orders/not-found.tsx  ← renders inside dashboard layout
// User sees 404 message WITH sidebar still visible → can navigate naturally
```

### ❌ Pitfall: Not handling `notFound()` timing — async operations after it

```tsx
// ❌ notFound() doesn't stop execution in a try/catch
try {
  if (!product) notFound();
  await sendAnalytics(product.id); // ← still runs if notFound() is in try block!
} catch (e) {}
```

**Fix:** `notFound()` throws internally — don't wrap it in try/catch:

```tsx
if (!product) notFound(); // ← throws — execution stops here ✅
await sendAnalytics(product.id); // only runs if product exists
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/blog/[slug]` route that:

1. Calls `notFound()` for unknown slugs
2. Has a route-level `not-found.tsx` that shows related posts and links back to the blog
3. Has a root `not-found.tsx` that handles all other 404s with a search-style UI
4. Exports correct metadata for both cases

### Solution

```tsx
// src/app/(marketing)/blog/[slug]/not-found.tsx
import Link from "next/link";

const RELATED = [
  { slug: "nextjs-16-guide", title: "Next.js 16 Complete Guide" },
  { slug: "design-systems-101", title: "Design Systems 101" },
  { slug: "startup-lessons", title: "10 Startup Lessons Learned" },
];

export default function BlogPostNotFound() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="text-5xl mb-4">📝</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Not Found</h1>
      <p className="text-gray-500 mb-8">
        This article doesn't exist or may have been moved.
      </p>
      <Link
        href="/blog"
        className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700 mb-12"
      >
        ← All Posts
      </Link>

      {/* Related posts */}
      <div className="text-left">
        <h2
          className="text-sm font-semibold text-gray-500 uppercase
                       tracking-wide mb-4"
        >
          You might like
        </h2>
        <ul className="space-y-3">
          {RELATED.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="flex items-center gap-2 text-gray-700
                           hover:text-blue-600 transition-colors"
              >
                <span className="text-gray-400">→</span>
                <span className="text-sm font-medium">{post.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx — Root 404
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "404 — Not Found" };

const HELPFUL_LINKS = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function RootNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg w-full">
        {/* Giant 404 */}
        <p
          className="text-[120px] font-black leading-none text-gray-100
                      select-none mb-2"
        >
          404
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 mb-8">
          We couldn't find what you were looking for. Here are some helpful
          links:
        </p>

        {/* Helpful links grid */}
        <div className="grid grid-cols-2 gap-3 mb-8 max-w-xs mx-auto">
          {HELPFUL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2.5 border rounded-lg text-sm font-medium
                         text-gray-600 hover:text-gray-900 hover:border-gray-400
                         transition-colors text-center"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
```

---

---

# 4 — `default.tsx` — Parallel Route Fallbacks

---

## T — TL;DR

`default.tsx` is the **fallback rendered for a parallel route slot** when there is no active page match for that slot. Without it, hard refreshes and direct URL visits in apps with parallel routes crash with a 404. It's the safety net that keeps slots silent when they have nothing to show.

---

## K — Key Concepts

### Why `default.tsx` Exists

```
Parallel routes use @slots — each slot renders independently.

Problem:
  Layout has @modal and @sidebar slots.
  User navigates from /dashboard to /dashboard/orders via <Link>.
  → @modal: no matching page → renders nothing (stays empty)
  → On client navigation: React keeps previous @modal state

  User refreshes at /dashboard/orders:
  → Next.js must determine what to render for EACH slot from URL alone
  → @modal: no page match for /dashboard/orders URL
  → Without default.tsx: 404 error
  → WITH default.tsx: renders default.tsx (null or fallback content)
```

### Basic `default.tsx`

```tsx
// src/app/dashboard/@modal/default.tsx
// Renders when no modal is active — return null for "nothing"
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@sidebar/default.tsx
// Renders when no specific sidebar content is provided for the current route
export default function SidebarDefault() {
  return (
    <div className="w-64 bg-gray-50 border-r p-4">
      <p className="text-sm text-gray-400">Select an item to see details</p>
    </div>
  );
}
```

### When `default.tsx` Is Needed

```
Scenario 1 — Modal slot with no active modal (most common):
  @modal/default.tsx → return null
  → No modal visible when there's no ?modal=... in URL

Scenario 2 — Sidebar slot with generic content:
  @sidebar/default.tsx → return <DefaultSidebar />
  → Shows generic sidebar on pages that don't have specific sidebar content

Scenario 3 — Multi-column layout:
  @left/default.tsx   → return <EmptyState label="left" />
  @right/default.tsx  → return <EmptyState label="right" />
  → Prevents 404 when navigating between pages that don't all use both slots

Scenario 4 — Navigation between pages:
  Page A: /dashboard — has @analytics/analytics/page.tsx
  Page B: /dashboard/orders — has NO @analytics match
  → Without default: navigating to orders with analytics slot active → crash
  → With default: @analytics/default.tsx renders (empty or fallback)
```

### Full Parallel Route Structure with Defaults

```
src/app/dashboard/
├── layout.tsx                    ← receives children, @modal, @panel
├── page.tsx                      → /dashboard
│
├── @modal/
│   ├── default.tsx               ← null (no modal by default) ✅ REQUIRED
│   └── (.)orders/
│       └── [orderId]/
│           └── page.tsx          ← modal content for /orders/:id
│
└── @panel/
    ├── default.tsx               ← generic empty panel ✅ REQUIRED
    └── analytics/
        └── page.tsx              ← panel content for /dashboard/analytics
```

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  modal,
  panel,
}: {
  children: React.ReactNode;
  modal: React.ReactNode; // null when @modal/default.tsx renders
  panel: React.ReactNode; // generic when @panel/default.tsx renders
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">{panel}</aside>
      <main className="flex-1">{children}</main>
      {modal} {/* null = renders nothing */}
    </div>
  );
}
```

---

## W — Why It Matters

- `default.tsx` is the most commonly forgotten parallel routes file — developers build their modal/slot system, test it with client navigation, and everything works. Then they hard-refresh or share a URL, and the app crashes with a 404. `default.tsx` is the fix.
- Returning `null` from `default.tsx` is the correct pattern for optional slots (modals) — it signals "nothing to render here" without any visual impact.
- Understanding `default.tsx` unlocks the full parallel routes pattern, which is used for Instagram-style modals, split-pane layouts, and independent loading sections.

---

## I — Interview Q&A

### Q1: When is `default.tsx` required in parallel routes?

**A:** Whenever a parallel route slot doesn't have a matching page for every possible URL the app might be at. On client navigation, React keeps previous slot state. But on hard refresh or direct URL visit, Next.js must independently resolve what each slot should render from the URL alone. If no matching page is found for a slot, Next.js looks for `default.tsx`. Without it, the app returns a 404 for the slot. In practice: every `@slot/` folder needs a `default.tsx` to handle the "no match" case.

### Q2: What should `default.tsx` return for a modal slot?

**A:** `null` — it should render nothing. The modal slot is empty when no modal is active. Returning `null` from `default.tsx` ensures no modal UI appears when the URL doesn't have modal params. The layout renders the slot with `{modal}` and since that evaluates to `null`, nothing appears.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `default.tsx` and getting 404 on refresh

```
src/app/dashboard/@modal/
└── (.)orders/[orderId]/page.tsx   ← only file in @modal
// User clicks an order → modal appears ✅
// User refreshes → 404: no match for @modal slot ❌
```

**Fix:**

```
src/app/dashboard/@modal/
├── default.tsx                   ← return null ✅
└── (.)orders/[orderId]/page.tsx
```

---

## K — Coding Challenge + Solution

### Challenge

Create a dashboard with a `@notifications` parallel slot that:

1. Has a `default.tsx` returning a "No notifications" empty state
2. Has a `notifications/page.tsx` with 3 hardcoded notification items
3. Layout shows both `children` and `notifications` side by side

### Solution

```tsx
// src/app/dashboard/@notifications/default.tsx
export default function NotificationsDefault() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full
                    text-center p-6"
    >
      <div className="text-3xl mb-2">🔔</div>
      <p className="text-sm text-gray-400">No notifications</p>
    </div>
  );
}
```

```tsx
// src/app/dashboard/@notifications/notifications/page.tsx
const NOTIFS = [
  { id: 1, text: "New order #1044 received", time: "2m ago", unread: true },
  { id: 2, text: 'Product "Air Max 90" updated', time: "1h ago", unread: true },
  { id: 3, text: "Monthly report ready", time: "3h ago", unread: false },
];

export default function NotificationsPanel() {
  return (
    <div className="p-4">
      <h3 className="font-semibold text-sm text-gray-900 mb-3">
        Notifications
      </h3>
      <ul className="space-y-2">
        {NOTIFS.map((n) => (
          <li
            key={n.id}
            className={`p-3 rounded-lg text-sm ${
              n.unread ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
            }`}
          >
            <p
              className={
                n.unread ? "font-medium text-gray-900" : "text-gray-600"
              }
            >
              {n.text}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  notifications,
}: {
  children: React.ReactNode;
  notifications: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 overflow-auto p-6">{children}</main>
      <aside className="w-72 border-l bg-white overflow-auto">
        {notifications}
      </aside>
    </div>
  );
}
```

---

---

# 5 — `forbidden.tsx` — 403 Authorization Errors

---

## T — TL;DR

`forbidden.tsx` is a special file that renders when you call `forbidden()` from a Server Component. It signals **"you are authenticated but not authorized"** — the user is logged in but lacks permission for this resource. It returns HTTP 403 and renders your custom UI.

---

## K — Key Concepts

### `forbidden()` vs `notFound()` vs `redirect()`

```
forbidden()  → HTTP 403 — user is authenticated, lacks permission
              "You don't have access to this resource"
              Shows forbidden.tsx

notFound()   → HTTP 404 — resource doesn't exist (or intentionally hidden)
              "This resource doesn't exist"
              Shows not-found.tsx

redirect()   → HTTP 307/308 — move user to another page
              Used for: unauthenticated users (→ /login)
              NOT for: authenticated users lacking permission (use forbidden())

unauthorized() → HTTP 401 — user is NOT authenticated
                "Please sign in to access this"
                Shows unauthorized.tsx
```

### Import and Usage

```tsx
// src/app/admin/page.tsx
import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Not authenticated → redirect to login
  if (!user) redirect("/login?redirect=/admin");

  // Authenticated but not admin → 403 Forbidden
  if (user.role !== "admin") {
    forbidden(); // ← throws internally, stops execution
  }

  return <AdminDashboard />;
}
```

### `forbidden.tsx` File

```tsx
// src/app/forbidden.tsx — root level, catches all forbidden() calls
// without a closer handler
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "403 — Forbidden" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don't have permission to view this page. Contact your
          administrator if you believe this is a mistake.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm
                           font-medium rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="mailto:support@example.com"
            className="px-5 py-2.5 border text-gray-600 text-sm
                           font-medium rounded-lg hover:bg-gray-50"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Section-Level `forbidden.tsx`

```tsx
// src/app/admin/forbidden.tsx
// Shows when forbidden() is called within /admin/* routes
// Renders inside parent layout (if any)

export default function AdminForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">🔐</div>
      <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        This area is restricted to administrators. Request access from your
        organization owner.
      </p>
    </div>
  );
}
```

---

## W — Why It Matters

- `forbidden()` vs `notFound()` is a security design decision — returning 404 for an unauthorized resource prevents enumeration attacks (user can't tell if the resource exists or they just lack access). Use `notFound()` for sensitive resources you want to hide entirely, `forbidden()` for resources users know about but can't access.
- HTTP 403 semantics are important for API consumers and monitoring systems — a proper 403 response is distinguishable from 404 in logs, alerting, and automated tools.
- The separation of `forbidden()` (authenticated, no permission) and `unauthorized()` (not authenticated) enables different UX flows: forbidden shows an "ask your admin" message, unauthorized shows a login prompt.

---

## I — Interview Q&A

### Q1: When should you use `forbidden()` vs `notFound()` for protected resources?

**A:** Use `forbidden()` when the resource exists and the user is authenticated but lacks permission — this is semantically correct (403) and tells the user they need elevated access. Use `notFound()` when you want to hide the existence of a resource entirely for security — a 404 response doesn't reveal whether the resource exists, preventing enumeration attacks. For example, admin settings: use `forbidden()` — the user knows admin settings exist. For private user data: use `notFound()` — don't reveal other users' data exists.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `redirect('/login')` for authenticated users with wrong permissions

```tsx
// ❌ User is logged in but not admin — sending them to login is wrong
if (user.role !== "admin") redirect("/login");
// User logs in again (already logged in!) → back to /admin → same redirect → infinite loop
```

**Fix:**

```tsx
if (!user) redirect("/login?redirect=/admin"); // not authenticated
if (user.role !== "admin") forbidden(); // authenticated, wrong role
```

---

## K — Coding Challenge + Solution

### Challenge

Build `/dashboard/billing` that requires `plan === 'pro'`. Free users see `forbidden()`. The section-level `forbidden.tsx` shows an upgrade CTA.

### Solution

```tsx
// src/app/(dashboard)/dashboard/billing/page.tsx
import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.plan !== "pro" && user.plan !== "enterprise") forbidden();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Billing</h1>
      <p className="text-gray-600">Pro plan — active ✅</p>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/billing/forbidden.tsx
import Link from "next/link";

export default function BillingForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">⭐</div>
      <h2 className="text-xl font-bold mb-2">Pro Feature</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Billing management is available on the Pro plan. Upgrade to unlock
        invoices, payment methods, and usage reports.
      </p>
      <Link
        href="/pricing"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg hover:bg-blue-700"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
```

---

---

# 6 — `unauthorized.tsx` — 401 Authentication Errors

---

## T — TL;DR

`unauthorized.tsx` renders when you call `unauthorized()` — it signals **"you are not authenticated at all"**. It returns HTTP 401 and shows a sign-in prompt. It's the programmatic equivalent of redirecting to `/login`, but keeps users on the current URL with an inline auth prompt instead of navigating away.

---

## K — Key Concepts

### `unauthorized()` vs `redirect('/login')`

```
redirect('/login'):
  → Changes URL to /login
  → User must log in, then is returned to original URL (if redirect param set)
  → Always navigates away from the current page
  → Simple and common — correct for most cases

unauthorized():
  → Keeps URL as-is (e.g., /dashboard)
  → Renders unauthorized.tsx inline (sign-in form/prompt on the page)
  → HTTP 401 status code
  → Better when: the page itself should prompt auth inline
  → Use for: API-like flows, partial page auth, embeddable content
```

### Usage

```tsx
// src/app/dashboard/page.tsx
import { unauthorized } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    unauthorized(); // ← renders unauthorized.tsx, keeps URL as /dashboard
  }

  return <Dashboard user={user} />;
}
```

### `unauthorized.tsx` File

```tsx
// src/app/unauthorized.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "401 — Sign In Required" };

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center
                    bg-gray-50 px-4"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Sign In Required
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          You need to be signed in to access this page.
        </p>
        <Link
          href="/login"
          className="block w-full py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700 transition-colors
                     text-center"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="block mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Don't have an account? Sign up
        </Link>
      </div>
    </div>
  );
}
```

### When to Use `unauthorized()` vs `redirect('/login')`

```
Use redirect('/login?redirect=<current-url>'):
  ✅ Standard protected pages (dashboard, settings, account)
  ✅ You want users to clearly land on the login page
  ✅ Simple, widely understood UX pattern

Use unauthorized():
  ✅ Embeddable widgets or sections that inline-prompt for auth
  ✅ API routes that return 401 semantically
  ✅ When the URL should stay the same (share the locked-page URL)
  ✅ Progressive disclosure — show what the page IS, but require login to use it
```

---

## W — Why It Matters

- The 401 vs 403 distinction is semantically important for any app with an API layer — 401 means "who are you?", 403 means "I know who you are, you can't do this." Correct HTTP semantics improve debuggability and API consumer experience.
- Keeping the URL unchanged while showing `unauthorized.tsx` is a UX pattern for shareable locked content — a user can share `/dashboard/reports` and the recipient sees a sign-in prompt in context rather than being immediately redirected to a generic login page.

---

## I — Interview Q&A

### Q1: What is the difference between `unauthorized()` and `redirect('/login')`?

**A:** Both handle unauthenticated users, but differently. `redirect('/login')` navigates the user to the login page — the URL changes, the user logs in and returns. `unauthorized()` keeps the current URL and renders `unauthorized.tsx` inline — the user sees an authentication prompt on the same page. Use `redirect('/login')` for standard protected pages where login is the primary action. Use `unauthorized()` when the URL itself is meaningful to preserve, when building inline auth experiences, or when correct HTTP 401 semantics matter (API consumers, monitoring).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Confusing `unauthorized()` with `forbidden()`

```tsx
// ❌ User is logged in but not admin — calling unauthorized() is semantically wrong
if (!user.isAdmin) unauthorized(); // wrong HTTP code (401 vs 403)
```

**Fix:**

```tsx
if (!user) unauthorized(); // 401 — not authenticated
if (!user.isAdmin) forbidden(); // 403 — authenticated, no permission
```

---

## K — Coding Challenge + Solution

### Challenge

Build `unauthorized.tsx` that renders an inline login form (email + password), shows the page title in the prompt ("Sign in to access Reports"), and has a link to `/register`.

### Solution

```tsx
// src/app/(dashboard)/dashboard/reports/unauthorized.tsx
import Link from "next/link";

export default function ReportsUnauthorized() {
  return (
    <div className="flex items-center justify-center min-h-[500px] px-4">
      <div className="bg-white border rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-bold text-gray-900">
            Sign in to access Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Reports are only available to signed-in users.
          </p>
        </div>
        <form action="/api/auth/login" method="POST" className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          No account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

---

# 7 — Parallel Routes — `@slot` Architecture

---

## T — TL;DR

Parallel routes render **multiple pages simultaneously inside one layout** using `@slot` folders. Each slot is a named prop in the layout, renders independently, and has its own loading/error states. Used for split-pane views, dashboards with independent sections, and the modal pattern.

---

## K — Key Concepts

### The Mental Model

```
Traditional layout:          Parallel routes layout:
  Layout                       Layout
  └── Page (one page)          ├── @children (default slot)
                               ├── @sidebar (independent)
                               └── @modal   (independent)

Each slot:
  → Has its own URL matching
  → Has its own loading.tsx and error.tsx
  → Loads independently (no waterfall)
  → Can be null (via default.tsx)
```

### File Structure

```
src/app/dashboard/
├── layout.tsx                    ← receives children, @sidebar, @modal
├── page.tsx                      → /dashboard (children slot)
│
├── @sidebar/
│   ├── default.tsx               ← shown when no sidebar content matches
│   └── page.tsx                  → renders in sidebar slot on /dashboard
│       (OR named sub-routes)
│
└── @modal/
    ├── default.tsx               ← null (no modal by default)
    └── (.)orders/
        └── [orderId]/
            └── page.tsx          ← modal content when navigating to an order
```

### Layout — Receiving All Slots

```tsx
// src/app/dashboard/layout.tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  sidebar,
  modal,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar slot */}
      <aside className="w-72 border-r bg-white overflow-auto shrink-0">
        {sidebar}
      </aside>

      {/* Main content — children slot */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Modal slot — null when default.tsx renders */}
      {modal}
    </div>
  );
}
```

### Each Slot Has Independent Loading and Error

```
src/app/dashboard/
├── @sidebar/
│   ├── default.tsx
│   ├── loading.tsx      ← sidebar-specific skeleton
│   ├── error.tsx        ← sidebar-specific error (won't affect main content)
│   └── page.tsx
│
├── @modal/
│   └── default.tsx
│
├── loading.tsx          ← children slot loading
└── error.tsx            ← children slot error
```

```tsx
// src/app/dashboard/@sidebar/loading.tsx
export default function SidebarLoading() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded-lg" />
      ))}
    </div>
  );
}
```

### Real Pattern — Analytics Dashboard with Independent Slots

```tsx
// src/app/dashboard/@kpis/page.tsx
async function getKpis() {
  await new Promise((r) => setTimeout(r, 300));
  return { revenue: 48200, orders: 312, customers: 89 };
}

export default async function KpisSlot() {
  const kpis = await getKpis();
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        KPIs
      </h3>
      <div className="space-y-3">
        {Object.entries(kpis).map(([key, val]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 capitalize">{key}</p>
            <p className="text-xl font-bold">{val.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/@activity/page.tsx
async function getActivity() {
  await new Promise((r) => setTimeout(r, 800)); // slower query
  return [
    { id: 1, event: "New order #1044", time: "2m ago" },
    { id: 2, event: "Product updated", time: "15m ago" },
    { id: 3, event: "Customer signup", time: "1h ago" },
  ];
}

export default async function ActivitySlot() {
  const activity = await getActivity();
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Activity
      </h3>
      <ul className="space-y-2">
        {activity.map((item) => (
          <li
            key={item.id}
            className="flex justify-between text-sm py-2 border-b"
          >
            <span className="text-gray-700">{item.event}</span>
            <span className="text-gray-400 text-xs">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/dashboard/layout.tsx — four-slot dashboard
export default function DashboardLayout({
  children,
  kpis,
  activity,
  modal,
}: {
  children: React.ReactNode;
  kpis: React.ReactNode;
  activity: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* KPIs sidebar — loads in 300ms */}
      <aside className="w-56 border-r bg-white overflow-auto shrink-0">
        {kpis}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Activity feed — loads in 800ms */}
      <aside className="w-64 border-l bg-white overflow-auto shrink-0">
        {activity}
      </aside>

      {/* Modal overlay */}
      {modal}
    </div>
  );
}
```

---

## W — Why It Matters

- Parallel routes solve the "independent loading sections" problem — without them, a slow activity feed blocks everything on the page from rendering. With them, fast sections appear immediately and slow ones stream in later.
- Each slot having its own `error.tsx` means a failure in the activity feed doesn't crash the rest of the dashboard — isolated failures with individual recovery.
- The modal slot pattern (with intercepting routes) is how production apps like Vercel's dashboard implement "click a deployment → see details in a modal while list stays visible."

---

## I — Interview Q&A

### Q1: What is the main advantage of parallel routes over putting everything in a single page?

**A:** Independent rendering and loading. Each slot in a parallel route fetches data, loads, and handles errors independently. A slow section (like an activity feed making a complex DB query) doesn't block fast sections (like KPI cards making simple queries). Each slot also has its own `loading.tsx` and `error.tsx` — a failure in one section doesn't crash others. In a single page, one slow `await` blocks all content, and one error crashes the entire page.

### Q2: How many slots can a layout have?

**A:** There's no hard limit — layouts can receive as many named slots as needed. Each `@slotName` folder becomes a prop in the layout. In practice, most apps use 1–3 slots (children + modal + one sidebar). More slots add complexity and require more `default.tsx` files — every slot needs a fallback for the cases where no specific page matches.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `default.tsx` causes 404 on hard refresh

```
@modal/ has no default.tsx
User refreshes → Next.js can't resolve @modal slot → 404
```

**Fix:** Every `@slot/` folder needs `default.tsx`.

### ❌ Pitfall: Slot names clash with param names

```tsx
// ❌ Naming a slot @id conflicts with dynamic [id] segments
export default function Layout({ children, id }) { ... }
// TypeScript error + routing confusion
```

**Fix:** Use descriptive slot names that don't clash: `@modal`, `@sidebar`, `@panel`, `@preview`.

---

## K — Coding Challenge + Solution

### Challenge

Build a `/app/inbox` page with two parallel slots:

1. `@list` — shows 4 message previews, each is a link
2. `@detail` — shows a default "Select a message" empty state, or message detail when a message is selected (via intercepting route pattern at `/app/inbox/[messageId]`)
3. Both slots have `loading.tsx` and `default.tsx`

### Solution

```tsx
// src/app/(app)/app/inbox/layout.tsx
export default function InboxLayout({
  children,
  list,
  detail,
}: {
  children: React.ReactNode;
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Message list */}
      <div className="w-80 border-r bg-white overflow-auto shrink-0">
        {list}
      </div>
      {/* Message detail */}
      <div className="flex-1 overflow-auto">{detail}</div>
      {children}
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@list/default.tsx
// The list always shows — this is its base state
export { default } from "./page";
```

```tsx
// src/app/(app)/app/inbox/@list/page.tsx
import Link from "next/link";

const MESSAGES = [
  {
    id: "m1",
    from: "Alice",
    subject: "Q2 Review",
    preview: "Can we schedule...",
    time: "10:32am",
    unread: true,
  },
  {
    id: "m2",
    from: "Bob",
    subject: "Design Feedback",
    preview: "Great work on...",
    time: "9:15am",
    unread: true,
  },
  {
    id: "m3",
    from: "Carol",
    subject: "Re: Project Update",
    preview: "Sounds good, I...",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "m4",
    from: "David",
    subject: "Invoice #1042",
    preview: "Please find...",
    time: "Mon",
    unread: false,
  },
];

export default function MessageList() {
  return (
    <ul className="divide-y">
      {MESSAGES.map((msg) => (
        <li key={msg.id}>
          <Link
            href={`/app/inbox/${msg.id}`}
            scroll={false}
            className="flex flex-col px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <span
                className={`text-sm ${msg.unread ? "font-semibold" : "font-medium text-gray-600"}`}
              >
                {msg.from}
              </span>
              <span className="text-xs text-gray-400">{msg.time}</span>
            </div>
            <span
              className={`text-sm mt-0.5 ${msg.unread ? "text-gray-900 font-medium" : "text-gray-600"}`}
            >
              {msg.subject}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 truncate">
              {msg.preview}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/default.tsx
export default function DetailDefault() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-5xl mb-3">📬</div>
      <h3 className="font-semibold text-gray-900 mb-1">No message selected</h3>
      <p className="text-sm text-gray-400">Click a message to read it here.</p>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/loading.tsx
export default function DetailLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded"
            style={{ width: `${85 - i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/(.)inbox/[messageId]/page.tsx
// Intercepting route — shows message in detail slot when navigated from list

const MESSAGES: Record<
  string,
  { from: string; subject: string; body: string; time: string }
> = {
  m1: {
    from: "Alice",
    subject: "Q2 Review",
    body: "Can we schedule a review session this Friday? I want to go over the Q2 numbers before the board meeting.",
    time: "10:32am",
  },
  m2: {
    from: "Bob",
    subject: "Design Feedback",
    body: "Great work on the new dashboard design! I have a few small suggestions for the color palette.",
    time: "9:15am",
  },
  m3: {
    from: "Carol",
    subject: "Re: Project Update",
    body: "Sounds good, I'll prepare the presentation for Monday.",
    time: "Yesterday",
  },
  m4: {
    from: "David",
    subject: "Invoice #1042",
    body: "Please find attached the invoice for services rendered in April 2026.",
    time: "Monday",
  },
};

export default function MessageDetail({
  params,
}: {
  params: { messageId: string };
}) {
  const msg = MESSAGES[params.messageId];
  if (!msg) return <div className="p-6 text-gray-400">Message not found.</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{msg.subject}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{msg.from}</span>
          <span>·</span>
          <span>{msg.time}</span>
        </div>
      </div>
      <div className="prose prose-gray text-sm">
        <p>{msg.body}</p>
      </div>
      <div className="flex gap-2 mt-8">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Reply
        </button>
        <button className="px-4 py-2 border text-gray-600 text-sm rounded-lg hover:bg-gray-50">
          Forward
        </button>
      </div>
    </div>
  );
}
```

---

---

# 8 — Intercepting Routes — Modal Patterns

---

## T — TL;DR

Intercepting routes let you **render a route inside the current layout as a modal** when navigated via `<Link>`, while showing the full standalone page on direct URL visit or refresh. The `(.)`, `(..)`, `(...)` prefix syntax controls which level of the route tree is intercepted.

---

## K — Key Concepts

### The Three Interception Depths

```
(.)   → intercept at the SAME level
        Use when: the intercepted route is a sibling
        Example: /photos/[id] intercepted from /photos

(..)  → intercept ONE level UP
        Use when: the intercepted route is in the parent
        Example: /dashboard/photos/[id] intercepted from /dashboard/orders

(...) → intercept at the ROOT (app/) level
        Use when: the intercepted route is far up the tree
        Example: /products/[id] intercepted from deep within /dashboard

(..)(.. ) → intercept TWO levels up (double dots per level)
```

### Visual: How Interception Works

```
URL: /photos/42

Scenario A — client navigation from /photos gallery:
  React intercepts the navigation
  Renders @modal/(.)photos/[id]/page.tsx (modal)
  /photos gallery stays mounted in background
  URL = /photos/42

Scenario B — direct URL visit to /photos/42:
  No interception (no prior client navigation)
  Renders photos/[id]/page.tsx (full standalone page)
  URL = /photos/42

Scenario C — page refresh at /photos/42 (modal was open):
  Modal state is lost (client state gone)
  Renders photos/[id]/page.tsx (full page — correct behavior)
  URL = /photos/42

Same URL, different renders depending on HOW you got there.
```

### Complete Photo Gallery with Intercepting Modal

```
src/app/
├── layout.tsx                              ← root layout (receives @modal)
├── @modal/
│   ├── default.tsx                         ← null
│   └── (.)photos/
│       └── [id]/
│           └── page.tsx                    ← modal render
└── photos/
    ├── page.tsx                            → /photos (gallery grid)
    └── [id]/
        └── page.tsx                        → /photos/:id (full standalone)
```

```tsx
// src/app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal} {/* modal overlays everything */}
      </body>
    </html>
  );
}
```

```tsx
// src/app/@modal/default.tsx
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@modal/(.)photos/[id]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PHOTOS: Record<string, { title: string; author: string }> = {
  "photo-1": { title: "Mountain Sunset", author: "Alice" },
  "photo-2": { title: "Ocean Waves", author: "Bob" },
  "photo-3": { title: "Forest Trail", author: "Carol" },
};

export default function PhotoModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const photo = PHOTOS[params.id];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  if (!photo) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        onClick={() => router.back()}
        aria-label="Close modal"
      >
        {/* Modal panel */}
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-2xl
                     max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={photo.title}
        >
          {/* Photo area */}
          <div
            className="aspect-[4/3] bg-gray-200 flex items-center
                          justify-center text-gray-400 text-lg"
          >
            {photo.title}
          </div>

          {/* Info */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{photo.title}</h2>
              <p className="text-sm text-gray-500">by {photo.author}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/photos/${params.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View full page
              </a>
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-gray-600 ml-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

```tsx
// src/app/photos/page.tsx — gallery grid
import Link from "next/link";

const PHOTOS = [
  { id: "photo-1", title: "Mountain Sunset" },
  { id: "photo-2", title: "Ocean Waves" },
  { id: "photo-3", title: "Forest Trail" },
];

export default function PhotosPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Gallery</h1>
      <div className="grid grid-cols-3 gap-4">
        {PHOTOS.map((photo) => (
          <Link
            key={photo.id}
            href={`/photos/${photo.id}`}
            scroll={false} // ← keep scroll position when modal opens
            className="block"
          >
            <div
              className="aspect-square bg-gray-200 rounded-xl flex items-center
                            justify-center hover:opacity-80 transition-opacity
                            cursor-zoom-in text-sm text-gray-500"
            >
              {photo.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/photos/[id]/page.tsx — full standalone page (direct visit / refresh)
import { notFound } from "next/navigation";
import Link from "next/link";

const PHOTOS: Record<string, { title: string; author: string }> = {
  "photo-1": { title: "Mountain Sunset", author: "Alice" },
  "photo-2": { title: "Ocean Waves", author: "Bob" },
  "photo-3": { title: "Forest Trail", author: "Carol" },
};

export default function PhotoPage({ params }: { params: { id: string } }) {
  const photo = PHOTOS[params.id];
  if (!photo) notFound();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-4">
        <Link href="/photos" className="text-gray-400 hover:text-white text-sm">
          ← Back to Gallery
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl w-full">
          <div
            className="aspect-[4/3] bg-gray-800 rounded-xl flex items-center
                          justify-center text-white text-xl"
          >
            {photo.title}
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <h1 className="text-white font-semibold">{photo.title}</h1>
              <p className="text-gray-400 text-sm">by {photo.author}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- Intercepting routes + parallel routes is the pattern used by Vercel dashboard, Figma, Notion, and Linear for "click item → see detail in modal while list stays" UX.
- The fact that the same URL shows a modal on navigation but a full page on refresh is intentional and correct — users who open the photo URL directly (from a share link) should see the full photo page, not a modal with no context behind it.
- The `scroll={false}` on gallery links is essential — without it, the page scrolls to top when the modal opens, disorienting the user.

---

## I — Interview Q&A

### Q1: What is an intercepting route and how is it different from a parallel route?

**A:** A parallel route (`@slot`) renders multiple pages simultaneously in one layout. An intercepting route changes WHICH page renders for a given URL based on how the user arrived. When navigating via `<Link>` from the same app, an intercepting route "catches" the navigation and renders a different component (typically a modal) than what a direct URL visit would show. Direct visits and refreshes bypass interception and render the real route. The two patterns work together: the intercepting route renders INTO a parallel route slot (the `@modal` slot).

### Q2: What do `(.)`, `(..)`, and `(...)` mean in intercepting routes?

**A:** They specify how far up the directory tree to look for the route being intercepted, analogous to `./`, `../`, and `/` in file paths. `(.)` intercepts a sibling route at the same folder level. `(..)` intercepts a route one level up in the tree. `(...)` intercepts a route at the app root level. Most modal patterns use `(.)` — the gallery and the photo detail route are siblings within the same parent folder.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Wrong depth prefix — modal doesn't appear

```
src/app/photos/
├── @modal/
│   └── (..)photos/[id]/page.tsx   ← (..) goes UP one level = wrong
└── [id]/page.tsx
// Navigation from /photos → /photos/42 doesn't intercept
```

**Fix:** Use `(.)` for sibling routes:

```
src/app/
└── @modal/
    └── (.)photos/[id]/page.tsx   ← @ is at root, so (.) = photos sibling ✅
```

### ❌ Pitfall: Not including `scroll={false}` on gallery links

```tsx
// ❌ Modal opens, page scrolls to top — user loses place in gallery
<Link href={`/photos/${photo.id}`}>...</Link>
```

**Fix:**

```tsx
<Link href={`/photos/${photo.id}`} scroll={false}>
  ...
</Link>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/products` gallery with an intercepting modal at `(.)products/[id]` that:

1. Shows modal on client nav, full page on direct visit
2. Modal has backdrop click to close
3. Full page has a back link
4. Both use the same product data source
5. Modal has a "View full page →" link

### Solution

```tsx
// src/lib/products-data.ts — shared data
export const PRODUCTS: Record<
  string,
  { name: string; price: number; category: string; desc: string }
> = {
  "air-max-90": {
    name: "Air Max 90",
    price: 120,
    category: "Shoes",
    desc: "Classic Nike running shoe with visible Air cushioning.",
  },
  "canvas-tote": {
    name: "Canvas Tote",
    price: 45,
    category: "Bags",
    desc: "Durable everyday canvas tote bag.",
  },
  "wool-cap": {
    name: "Wool Cap",
    price: 35,
    category: "Accessories",
    desc: "Warm merino wool cap for any season.",
  },
};
```

```tsx
// src/app/@modal/default.tsx
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@modal/(.)products/[id]/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PRODUCTS } from "@/lib/products-data";
import Link from "next/link";

export default function ProductModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const product = PRODUCTS[params.id];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center
                 justify-center p-4"
      onClick={() => router.back()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="aspect-square bg-gray-100 flex items-center justify-center
                        text-5xl"
        >
          🛍️
        </div>
        <div className="p-5">
          <span className="text-xs text-blue-600 font-semibold uppercase">
            {product.category}
          </span>
          <h2 className="text-xl font-bold mt-1 mb-1">{product.name}</h2>
          <p className="text-gray-500 text-sm mb-4">{product.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              ${product.price}
            </span>
            <div className="flex gap-2">
              <Link
                href={`/products/${params.id}`}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                View full page →
              </Link>
              <button
                className="px-4 py-2 bg-blue-600 text-white text-sm
                           rounded-lg hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/page.tsx — full page
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/products-data";
import Link from "next/link";

export default function ProductFullPage({
  params,
}: {
  params: { id: string };
}) {
  const product = PRODUCTS[params.id];
  if (!product) notFound();

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Link
        href="/products"
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 block"
      >
        ← All Products
      </Link>
      <div
        className="aspect-square bg-gray-100 rounded-2xl flex items-center
                      justify-center text-7xl mb-6"
      >
        🛍️
      </div>
      <span className="text-xs text-blue-600 font-semibold uppercase">
        {product.category}
      </span>
      <h1 className="text-3xl font-bold mt-1 mb-2">{product.name}</h1>
      <p className="text-gray-600 mb-6">{product.desc}</p>
      <p className="text-3xl font-bold text-blue-600 mb-8">${product.price}</p>
      <button
        className="w-full py-3 bg-blue-600 text-white font-medium
                         rounded-xl hover:bg-blue-700"
      >
        Add to Cart
      </button>
    </div>
  );
}
```

---

---

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

# 10 — Combining All Special Files — Complete Route Boundary Architecture

---

## T — TL;DR

Every special file has a precise responsibility and scope. Combining them into a coherent architecture means every failure mode — loading, error, missing, forbidden, unauthorized, modal, parallel — has a deliberate, user-tested response. This subtopic assembles the complete picture.

---

## K — Key Concepts

### The Complete Special Files Reference

```
File                  Trigger                        HTTP   Scope
─────────────────     ─────────────────────────      ────   ──────────────────────────
loading.tsx           page.tsx suspends (data fetch)  200   same segment + children
error.tsx             page.tsx throws at runtime       500   same segment (not layout)
not-found.tsx         notFound() called                404   nearest ancestor
global-error.tsx      root layout.tsx throws           500   root only (replaces html/body)
default.tsx           parallel slot has no match       —     specific @slot folder
forbidden.tsx         forbidden() called               403   nearest ancestor
unauthorized.tsx      unauthorized() called            401   nearest ancestor
template.tsx          remounts on every navigation     —     same segment + children
```

### The Scope Diagram — All Files Together

```
src/app/
├── layout.tsx            ← root layout (html + body)
├── template.tsx          ← remounts per navigation (progress bar, analytics)
├── global-error.tsx      ← catches root layout.tsx crashes (replaces html/body)
├── not-found.tsx         ← root 404 fallback (unknown URLs + notFound() fallback)
├── loading.tsx           ← root loading fallback (rarely used at root level)
│
└── (dashboard)/
    ├── layout.tsx        ← group layout (auth guard, sidebar)
    │
    └── dashboard/
        ├── layout.tsx    ← section layout (section-specific chrome)
        ├── loading.tsx   ← covers dashboard/ page AND all children below
        ├── error.tsx     ← covers dashboard/ page errors (NOT layout errors)
        ├── not-found.tsx ← covers notFound() from dashboard/* pages
        ├── forbidden.tsx ← covers forbidden() from dashboard/* pages
        ├── unauthorized.tsx ← covers unauthorized() from dashboard/* pages
        ├── page.tsx      ← /dashboard
        │
        ├── @modal/
        │   ├── default.tsx    ← null (no modal active)
        │   └── (.)orders/
        │       └── [orderId]/
        │           └── page.tsx  ← modal render
        │
        └── orders/
            ├── loading.tsx   ← overrides parent loading.tsx for /dashboard/orders
            ├── error.tsx     ← overrides parent error.tsx for /dashboard/orders
            ├── not-found.tsx ← overrides parent not-found for orders
            ├── page.tsx      → /dashboard/orders
            └── [orderId]/
                ├── page.tsx  → /dashboard/orders/:id
                └── not-found.tsx  ← most specific not-found for order detail
```

### Decision Tree — Which File to Create

```
User sees something unexpected while navigating?
│
├─ "The page is loading slowly"
│   └── Create: loading.tsx
│       → Use granular <Suspense> inside page for progressive streaming
│
├─ "Something crashed"
│   ├─ Did layout.tsx crash?
│   │   ├─ Root layout → global-error.tsx (includes html + body)
│   │   └─ Section layout → parent's error.tsx
│   └─ Did page.tsx crash?
│       └── Create: error.tsx in same segment
│           → 'use client', has reset() + router.refresh()
│
├─ "The resource doesn't exist"
│   └── Call: notFound()
│       └── Create: not-found.tsx (section-level for layout context)
│
├─ "User is not logged in"
│   ├─ Option A: redirect('/login?redirect=<url>') — most common
│   └── Option B: unauthorized() + unauthorized.tsx — inline auth prompt
│
├─ "User is logged in but lacks permission"
│   └── Call: forbidden()
│       └── Create: forbidden.tsx with upgrade CTA or contact admin link
│
└─ "Modal / split view needed"
    ├─ Create: @slot/ folder + layout prop
    ├─ Create: @slot/default.tsx (always required)
    └─ For modal: @slot/(.)target/[param]/page.tsx (intercepting route)
```

### Complete Architecture — SaaS Dashboard Section

```
src/app/
│
├── layout.tsx                          ← ROOT: html, body, providers
├── template.tsx                        ← global nav progress bar
├── global-error.tsx                    ← last resort error (root layout crash)
├── not-found.tsx                       ← root 404 with search + quick links
│
└── (dashboard)/
    ├── layout.tsx                      ← auth guard + global sidebar
    │
    └── dashboard/
        ├── layout.tsx                  ← dashboard section layout
        ├── loading.tsx                 ← dashboard section skeleton
        ├── error.tsx                   ← dashboard section error + retry
        ├── forbidden.tsx               ← feature gating (upgrade CTA)
        ├── unauthorized.tsx            ← session expired prompt
        ├── page.tsx                    → /dashboard
        │
        ├── @modal/
        │   ├── default.tsx             ← null
        │   └── (.)orders/
        │       └── [orderId]/
        │           ├── page.tsx        ← order modal
        │           └── loading.tsx     ← modal loading state
        │
        ├── orders/
        │   ├── loading.tsx             ← orders-specific skeleton
        │   ├── error.tsx               ← orders error + offline detection
        │   ├── not-found.tsx           ← order not found (inside layout)
        │   ├── page.tsx                → /dashboard/orders
        │   └── [orderId]/
        │       ├── page.tsx            → /dashboard/orders/:id
        │       └── not-found.tsx       ← individual order not found
        │
        └── settings/
            ├── layout.tsx              ← settings tabs nav
            ├── forbidden.tsx           ← plan-gated settings (upgrade)
            ├── page.tsx                → /dashboard/settings
            ├── billing/
            │   ├── forbidden.tsx       ← billing needs pro plan
            │   └── page.tsx
            └── team/
                ├── forbidden.tsx       ← team needs enterprise plan
                └── page.tsx
```

### How Special Files Interact — A Walkthrough

```
Scenario: User on free plan visits /dashboard/settings/billing

1. (dashboard)/layout.tsx runs
   → getCurrentUser() → user found (authenticated) ✅
   → dashboard sidebar renders

2. dashboard/layout.tsx runs
   → settings tabs layout renders

3. dashboard/settings/billing/page.tsx runs
   → const user = await getCurrentUser()  [cached — no extra DB query]
   → user.plan === 'free'
   → forbidden()  ← throws

4. Next.js walks up the tree looking for forbidden.tsx:
   → dashboard/settings/billing/forbidden.tsx ✅ found
   → renders inside BOTH layouts (sidebar + settings tabs stay visible)
   → shows "Upgrade to Pro" CTA

5. HTTP response: 403 Forbidden
   → Search engines won't index this page ✅
   → User sees upgrade CTA with full navigation context ✅

Scenario: User visits /dashboard/orders/nonexistent-id

1. Layouts render (auth passes) ✅
2. dashboard/orders/[orderId]/page.tsx runs
   → getOrder('nonexistent-id') → null
   → notFound()  ← throws

3. Next.js walks up:
   → dashboard/orders/[orderId]/not-found.tsx ✅ (most specific)
   → renders inside layouts (sidebar + orders context visible)

4. HTTP response: 404 Not Found ✅

Scenario: /dashboard/orders/[orderId]/page.tsx throws unexpected error

1. Layouts render ✅
2. page.tsx throws Error('Database connection timeout')
3. Next.js finds error.tsx:
   → dashboard/orders/error.tsx ✅
   → renders inside layouts (sidebar stays)
   → shows retry button + error digest

4. User clicks "Try Again":
   → router.refresh() clears cache
   → reset() re-renders page.tsx
   → If DB recovered: page renders ✅
   → If still failing: error.tsx shows again (with retry count)
```

### Full Special Files Implementation — Dashboard Section

```tsx
// src/app/layout.tsx — ROOT
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { template: "%s | AppName", default: "AppName" },
  description: "Your SaaS dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/global-error.tsx — ROOT LAYOUT CRASH
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
          className="min-h-screen bg-gray-50 flex items-center
                        justify-center text-center px-4"
        >
          <div>
            <p className="text-6xl mb-4">💥</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Critical Application Error
            </h1>
            <p className="text-gray-500 mb-6 max-w-xs">
              A critical error occurred. Please refresh the page or try again.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 font-mono mb-4">
                Ref: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm
                           font-medium rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-5 py-2.5 border text-gray-600 text-sm
                           font-medium rounded-lg hover:bg-gray-50"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

```tsx
// src/app/(dashboard)/layout.tsx — AUTH GUARD
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/loading.tsx
export default function DashboardSectionLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-lg mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white border rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white border rounded-xl" />
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/error.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Something Went Wrong
      </h2>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => {
            router.refresh();
            reset();
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border text-gray-600 text-sm
                     rounded-lg hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/forbidden.tsx
import Link from "next/link";

export default function DashboardForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⭐</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This feature is not available on your current plan. Upgrade to unlock
        full access.
      </p>
      <div className="flex gap-3">
        <Link
          href="/pricing"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          View Plans
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/unauthorized.tsx
import Link from "next/link";

export default function DashboardUnauthorized() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Your session has expired. Sign in again to continue.
      </p>
      <Link
        href="/login?redirect=/dashboard"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        Sign In Again
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/not-found.tsx
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This dashboard page doesn't exist.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        ← Dashboard Home
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/@modal/default.tsx
export default function DashboardModalDefault() {
  return null;
}
```

```tsx
// src/app/(dashboard)/dashboard/@modal/(.)orders/[orderId]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const ORDERS: Record<
  string,
  { number: number; customer: string; total: number; status: string }
> = {
  "ord-001": {
    number: 1042,
    customer: "Alice Johnson",
    total: 249.0,
    status: "delivered",
  },
  "ord-002": {
    number: 1043,
    customer: "Bob Smith",
    total: 89.99,
    status: "pending",
  },
  "ord-003": {
    number: 1044,
    customer: "Carol White",
    total: 420.5,
    status: "shipped",
  },
};

export default function OrderModal({
  params,
}: {
  params: { orderId: string };
}) {
  const router = useRouter();
  const order = ORDERS[params.orderId];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (!order) return null;

  const STATUS_STYLE: Record<string, string> = {
    delivered: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center
                 justify-center p-4"
      onClick={() => router.back()}
      role="dialog"
      aria-modal="true"
      aria-label={`Order #${order.number}`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-900">Order #{order.number}</h2>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium">{order.customer}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-blue-600">
              ${order.total.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500">Status</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${STATUS_STYLE[order.status]}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Link
            href={`/dashboard/orders/${params.orderId}`}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium
                       rounded-lg hover:bg-blue-700 text-center"
          >
            View Full Details
          </Link>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border text-gray-600 text-sm rounded-lg
                       hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- The complete boundary architecture is what makes a Next.js app production-ready — every failure mode has a deliberate, user-oriented response that keeps users in context and gives them a clear path forward.
- Understanding how all special files compose together (scope, inheritance, which catches what) prevents the silent failures and confusing 404s that show up after deployment.
- The decision tree (loading? error? not-found? forbidden? unauthorized?) is the mental model you apply to every new route — it becomes second nature and prevents "what do users see if X fails?" from being an afterthought.
- Parallel routes + intercepting routes + `default.tsx` is the trio that enables the modal patterns used by every major SaaS product — without understanding all three, the pattern breaks at the edges (hard refresh, direct URL, back button).

---

## I — Interview Q&A

### Q1: Walk me through every special file and what it handles.

**A:**

- `loading.tsx` — automatic Suspense boundary, shows while `page.tsx` is fetching async data. Scoped to the same segment and children. Enables streaming HTML.
- `error.tsx` — Client Component error boundary for `page.tsx` runtime errors. Has `reset()` to retry. Does NOT catch `layout.tsx` errors at the same level. Returns 500.
- `global-error.tsx` — catches root `layout.tsx` errors only. Must include `<html>` and `<body>`. Last resort.
- `not-found.tsx` — renders when `notFound()` is called. Returns 404. Scoped to nearest ancestor. Root version handles unknown URLs.
- `default.tsx` — fallback for parallel route `@slots` when no page matches. Required to prevent 404 on hard refresh.
- `forbidden.tsx` — renders when `forbidden()` is called. Returns 403. For authenticated users lacking permission.
- `unauthorized.tsx` — renders when `unauthorized()` is called. Returns 401. For unauthenticated users.
- `template.tsx` — like `layout.tsx` but remounts on every navigation. Used for progress bars and analytics.

### Q2: What happens if you don't have a `default.tsx` for a parallel route slot?

**A:** Client navigation works fine — React preserves the previous slot state when navigating between pages. But on hard refresh or direct URL visit, Next.js must independently determine what each slot should render from the URL alone. If no matching page exists for a slot and there's no `default.tsx`, Next.js can't render the page — it returns a 404. `default.tsx` is the fallback that says "render this (or nothing) when no specific page matches this slot." Every `@slot/` folder must have one.

### Q3: In what order does Next.js look for special files when `notFound()` is called deep in a nested route?

**A:** Next.js walks up the directory tree from the call site, looking for the nearest `not-found.tsx`. For a call in `app/(dashboard)/dashboard/orders/[orderId]/page.tsx`, it checks: `orders/[orderId]/not-found.tsx` (doesn't exist) → `orders/not-found.tsx` (found, use this). If that didn't exist either: `dashboard/not-found.tsx` → `(dashboard)/not-found.tsx` → `app/not-found.tsx`. The key benefit: whichever `not-found.tsx` is found renders inside ALL parent layouts above it, so the dashboard sidebar and section navigation stay visible when a specific order isn't found.

### Q4: Can you use `loading.tsx` and manual `<Suspense>` in the same page?

**A:** Yes — and this is the recommended best practice. `loading.tsx` provides instant route-level feedback the moment a user navigates to the page. Manual `<Suspense>` boundaries inside `page.tsx` enable individual sections to stream in independently as each resolves. The result: the skeleton appears at t=0ms (loading.tsx), then fast sections appear at t=100ms (Suspense), then slow sections at t=800ms (Suspense). This is the full streaming experience — route-level skeleton + progressive section rendering.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Relying on only root `not-found.tsx` for all 404s

```tsx
// Only src/app/not-found.tsx exists
// User is in /dashboard, clicks an order link, order is deleted
// notFound() triggers root not-found.tsx
// Entire page replaces with full-screen 404 — dashboard sidebar GONE
// User has to use browser back button to return to their work
```

**Fix:** Place `not-found.tsx` at every meaningful section:

```
dashboard/orders/not-found.tsx       ← renders inside dashboard layout ✅
dashboard/orders/[orderId]/not-found.tsx ← most specific ✅
```

### ❌ Pitfall: Using `error.tsx` to handle 404s

```tsx
// ❌ Developer throws a custom error for missing resources
if (!product) throw new Error("Product not found");
// error.tsx catches it — shows "Something went wrong" + retry button
// Retry will always fail (product still doesn't exist)
// HTTP status is 500, not 404 — bad for SEO and monitoring
```

**Fix:** Use `notFound()` for missing resources, `error.tsx` only for unexpected failures:

```tsx
if (!product) notFound(); // ← 404, renders not-found.tsx, no retry needed
```

### ❌ Pitfall: Putting auth logic in `page.tsx` when it should be in layout

```tsx
// ❌ Auth check in every single page
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // repeated 20+ times
  // ...
}
```

**Fix:** One auth check in the group layout:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function Layout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← ONE check, ALL dashboard routes protected
  return <>{children}</>;
}
```

### ❌ Pitfall: No `global-error.tsx` — root layout crash = blank page in production

```tsx
// Root layout.tsx throws (provider crash, font loading error, etc.)
// No global-error.tsx → users see blank white page in production
// No retry, no navigation, no context
```

**Fix:**

```tsx
// src/app/global-error.tsx
"use client";
export default function GlobalError({ reset }) {
  return (
    <html>
      <body>
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <h1>Application Error</h1>
          <button onClick={reset}>Try Again</button>
          <br />
          <a href="/">Reload</a>
        </div>
      </body>
    </html>
  );
}
```

### ❌ Pitfall: `error.tsx` catching `notFound()` calls

```tsx
// notFound() throws a special Next.js error internally
// If you wrap notFound() in try/catch, you swallow it
try {
  if (!product) notFound(); // ← notFound() throws
} catch (e) {
  // ❌ You just caught the notFound() throw — 404 never happens
  // Page renders as if no error occurred, with null product
}
```

**Fix:** Never wrap `notFound()`, `forbidden()`, `unauthorized()`, or `redirect()` in try/catch:

```tsx
// These all throw internally — always let them propagate
if (!product) notFound();
if (!user) redirect("/login");
if (!user.isAdmin) forbidden();
if (!user.session) unauthorized();

// If you need try/catch for OTHER errors:
try {
  await riskyOperation();
} catch (e) {
  // handle specific error types here
  // but don't call notFound/forbidden/redirect inside this block
}
if (!product) notFound(); // ← after the try/catch ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build the complete route boundary architecture for a `/dashboard/projects/[projectId]` route section. It must include:

1. `loading.tsx` — 2-column skeleton matching the real layout
2. `error.tsx` — with retry, go-back, and offline detection
3. `not-found.tsx` — project-specific 404 with link to projects list
4. `forbidden.tsx` — for projects on pro plan only (shows upgrade CTA)
5. `page.tsx` — calls `notFound()` for invalid IDs, `forbidden()` for free plan, has one `<Suspense>` for a slow team members section
6. A `_components/team-members.tsx` async Server Component
7. Document the full render tree for each failure scenario

### Solution

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/loading.tsx
export default function ProjectLoading() {
  return (
    <div className="p-8 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main content — 2/3 width */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5">
            <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              {[90, 80, 70, 60].map((w) => (
                <div
                  key={w}
                  className="h-4 bg-gray-100 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-xl p-5 h-40">
            <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-24 bg-gray-100 rounded-lg" />
          </div>
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <div className="w-7 h-7 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-100 rounded flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/error.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    console.error("[ProjectError]", error);
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      router.refresh();
      reset();
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
        <p className="text-5xl mb-4">📡</p>
        <h2 className="text-xl font-bold mb-2">No Connection</h2>
        <p className="text-gray-500 text-sm mb-4">
          Will automatically reload when you're back online.
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Waiting for connection...
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Failed to Load Project
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-4">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => {
            router.refresh();
            reset();
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border text-gray-600 text-sm
                     rounded-lg hover:bg-gray-50"
        >
          Go Back
        </button>
        <a
          href="/dashboard/projects"
          className="px-4 py-2 border text-gray-600 text-sm
                      rounded-lg hover:bg-gray-50"
        >
          All Projects
        </a>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/not-found.tsx
import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">📋</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Project Not Found
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This project doesn't exist, was deleted, or you don't have access.
      </p>
      <Link
        href="/dashboard/projects"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        ← All Projects
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/forbidden.tsx
import Link from "next/link";

export default function ProjectForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⭐</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Advanced project management is available on the Pro plan. Upgrade to
        create and manage unlimited projects.
      </p>
      <div className="flex gap-3">
        <Link
          href="/pricing"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Upgrade to Pro
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/_components/team-members.tsx
// Slow async Server Component — streams in independently
async function getTeamMembers(projectId: string) {
  await new Promise((r) => setTimeout(r, 700)); // simulate DB join query
  return [
    { id: "u1", name: "Alice Chen", role: "Lead", initial: "A" },
    { id: "u2", name: "Bob Kim", role: "Developer", initial: "B" },
    { id: "u3", name: "Carol Davis", role: "Designer", initial: "C" },
  ];
}

export async function TeamMembers({ projectId }: { projectId: string }) {
  const members = await getTeamMembers(projectId);

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3
        className="text-sm font-semibold text-gray-700 uppercase
                     tracking-wide mb-3"
      >
        Team ({members.length})
      </h3>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center
                            justify-center text-white text-xs font-bold shrink-0"
            >
              {m.initial}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-400">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/page.tsx
import type { Metadata } from "next";
import { notFound, forbidden } from "next/navigation";
import { Suspense } from "react";
import { TeamMembers } from "./_components/team-members";
import { getCurrentUser } from "@/lib/auth";

type Params = Promise<{ projectId: string }>;

// Mock project data
async function getProject(id: string, userId: string) {
  const projects: Record<
    string,
    {
      name: string;
      plan: string;
      status: string;
      ownerId: string;
      desc: string;
    }
  > = {
    "proj-free": {
      name: "Free Project",
      plan: "free",
      status: "active",
      ownerId: "u1",
      desc: "A basic project on the free plan.",
    },
    "proj-pro": {
      name: "Pro Project",
      plan: "pro",
      status: "active",
      ownerId: "u1",
      desc: "An advanced project on the Pro plan.",
    },
  };
  return projects[id] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Project" };
  const project = await getProject(projectId, user.id);
  return { title: project?.name ?? "Project Not Found" };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) forbidden(); // session expired

  const project = await getProject(projectId, user!.id);

  // ─── Not found
  if (!project) notFound();

  // ─── Plan gate — pro projects require pro plan
  if (project!.plan === "pro" && user!.plan === "free") {
    forbidden();
  }

  const STATUS_COLOR: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    done: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project!.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium
                              ${STATUS_COLOR[project!.status]}`}
            >
              {project!.status}
            </span>
            <span className="text-xs text-gray-400">ID: {projectId}</span>
          </div>
        </div>
        <button
          className="px-4 py-2 border rounded-lg text-sm text-gray-600
                           hover:bg-gray-50"
        >
          Edit Project
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main — 2/3 */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 text-sm">{project!.desc}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Tasks</h2>
            <p className="text-gray-400 text-sm italic">No tasks yet.</p>
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div>
          {/* Team members — streams in at ~700ms */}
          <Suspense
            fallback={
              <div className="bg-white border rounded-xl p-4 animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <div className="w-7 h-7 bg-gray-200 rounded-full shrink-0" />
                    <div className="h-4 bg-gray-100 rounded flex-1" />
                  </div>
                ))}
              </div>
            }
          >
            <TeamMembers projectId={projectId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

```
Render tree for each failure scenario:

1. /dashboard/projects/proj-pro (free plan user)
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectForbidden />   ← forbidden() triggers forbidden.tsx
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 403 — sidebar stays ✅, upgrade CTA shown ✅

2. /dashboard/projects/nonexistent-id
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectNotFound />    ← notFound() triggers not-found.tsx
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 404 — sidebar stays ✅, link to projects list ✅

3. /dashboard/projects/proj-pro (page.tsx throws at runtime)
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectError />       ← error.tsx catches throw
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 500 — retry button ✅, offline detection ✅, escape routes ✅

4. /dashboard/projects/proj-pro (loading)
   <RootLayout>
     <DashboardGroupLayout>
       <ProjectLoading />     ← loading.tsx shows while page fetches
     </DashboardGroupLayout>
   </RootLayout>
   t=0ms:   2-column skeleton ✅
   t=?ms:   page renders, team members slot still showing skeleton
   t=700ms: TeamMembers streams in, replaces sidebar skeleton ✅

5. /dashboard/projects/proj-pro (session expired)
   <RootLayout>
     <DashboardGroupLayout>
       <ProjectForbidden />   ← forbidden() (no user = forbidden)
     </DashboardGroupLayout>
   </RootLayout>
   OR: getCurrentUser() fails → DashboardGroupLayout redirects to /login first
```

---

## ✅ Day 5 Complete — Route Boundaries and Special Files

| #   | Subtopic                                                           | Status |
| --- | ------------------------------------------------------------------ | ------ |
| 1   | `loading.tsx` — Streaming and Suspense Boundaries                  | ☐      |
| 2   | `error.tsx` — Error Boundaries and Recovery                        | ☐      |
| 3   | `not-found.tsx` — 404 Handling and `notFound()`                    | ☐      |
| 4   | `default.tsx` — Parallel Route Fallbacks                           | ☐      |
| 5   | `forbidden.tsx` — 403 Authorization Errors                         | ☐      |
| 6   | `unauthorized.tsx` — 401 Authentication Errors                     | ☐      |
| 7   | Parallel Routes — `@slot` Architecture                             | ☐      |
| 8   | Intercepting Routes — Modal Patterns                               | ☐      |
| 9   | Resilient Navigation and Recovery Flows                            | ☐      |
| 10  | Combining All Special Files — Complete Route Boundary Architecture | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 5

```
SPECIAL FILE REFERENCE
  loading.tsx      → Suspense boundary around page.tsx; shows on navigation
  error.tsx        → Error boundary for page.tsx throws; 'use client' required
  global-error.tsx → Error boundary for root layout.tsx; includes html+body
  not-found.tsx    → Renders on notFound(); HTTP 404
  default.tsx      → Fallback for @slot when no page matches; prevents 404 on refresh
  forbidden.tsx    → Renders on forbidden(); HTTP 403; authenticated, no permission
  unauthorized.tsx → Renders on unauthorized(); HTTP 401; not authenticated
  template.tsx     → Remounts every navigation; progress bar, analytics

SCOPE RULES
  loading.tsx      → same segment + all children (unless child overrides)
  error.tsx        → same segment's page.tsx ONLY — NOT same-level layout.tsx
  not-found.tsx    → nearest ancestor walking UP from call site
  default.tsx      → specific @slot folder only
  forbidden.tsx    → nearest ancestor walking UP from call site
  unauthorized.tsx → nearest ancestor walking UP from call site
  global-error.tsx → root layout.tsx errors ONLY

WHAT EACH DOES NOT CATCH
  error.tsx        → does NOT catch same-level layout.tsx errors
                     use parent's error.tsx for that
  not-found.tsx    → does NOT affect HTTP status on its own
                     must call notFound() to get HTTP 404
  loading.tsx      → does NOT show for client state updates, mutations
                     use isPending from useTransition for those

TRIGGER FUNCTIONS (import from 'next/navigation')
  notFound()       → HTTP 404 → nearest not-found.tsx
  forbidden()      → HTTP 403 → nearest forbidden.tsx
  unauthorized()   → HTTP 401 → nearest unauthorized.tsx
  redirect(url)    → HTTP 307/308 → navigates to url
  ⚠️ All four THROW internally — never wrap in try/catch

RESET PATTERN (error.tsx)
  ❌ reset()                     ← retries with stale cache
  ✅ router.refresh(); reset()   ← clears cache THEN retries

PARALLEL ROUTES
  @slot/           → named slot folder (no URL impact)
  layout receives: { children, slotName } as props
  @slot/default.tsx → REQUIRED — prevents 404 on hard refresh
  @slot/loading.tsx → slot-specific loading (independent)
  @slot/error.tsx   → slot-specific error (doesn't affect other slots)

INTERCEPTING ROUTES
  (.)path    → intercept sibling route (same directory level)
  (..)path   → intercept one level up
  (...)path  → intercept at app root
  On client nav: renders intercepted version (modal)
  On direct URL: renders normal version (full page)
  On refresh:    renders normal version (modal state lost — correct)
  ⚠️ ALWAYS needs scroll={false} on the <Link> that triggers it

RECOVERY FLOW DECISION
  "Slow load"          → loading.tsx + granular <Suspense>
  "Page crashed"       → error.tsx with reset() + router.refresh()
  "Layout crashed"     → parent's error.tsx
  "Root crashed"       → global-error.tsx
  "Resource missing"   → notFound() → not-found.tsx (section-level)
  "Not authenticated"  → redirect('/login') OR unauthorized()
  "No permission"      → forbidden() → forbidden.tsx with upgrade CTA

BEST PRACTICES
  ✅ Section-level not-found.tsx — keeps layout context visible
  ✅ error.tsx always has 2+ escape routes (retry + back + home)
  ✅ Show error.digest as support reference, never raw error.stack in prod
  ✅ Use forbidden() for plan gating (never just hide the route)
  ✅ Every @slot/ needs default.tsx (no exceptions)
  ✅ loading.tsx + manual <Suspense> together for best perceived performance
  ✅ global-error.tsx — the safety net you always need, rarely notice
  ✅ Auto-retry + countdown for transient errors (network, cold start)
  ✅ Offline detection + auto-recover in error.tsx for mobile users
```

---

> **Your next action:** Open your Next.js project. Create `src/app/error.tsx` with `'use client'`, a friendly message, and a retry button that calls `router.refresh()` then `reset()`. You now have a safety net for every unhandled page error in your app. 5 minutes of work that prevents blank screens forever.
>
> _Doing one small thing beats opening a feed._
