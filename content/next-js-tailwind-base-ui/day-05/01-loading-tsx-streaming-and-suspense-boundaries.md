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
