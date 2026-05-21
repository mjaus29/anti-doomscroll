# 📅 Day 7 — Data Fetching and Cache Strategy (Next.js 16)

> **Goal:** Master every mechanism Next.js 16 provides for fetching data, controlling cache behavior, and revalidating stale content — and know exactly which tool to reach for in every scenario.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 6 complete — Server/Client architecture understood.

---

## 📋 Day 7 Subtopic Overview

| #   | Subtopic                                                                | Time   |
| --- | ----------------------------------------------------------------------- | ------ |
| 1   | `fetch` in Server Components — Basics and Cache Options                 | 12 min |
| 2   | Sequential vs Parallel Data Fetching                                    | 12 min |
| 3   | Static vs Dynamic Rendering — How Fetching Drives It                    | 12 min |
| 4   | The Next.js Cache Layers — Full Mental Model                            | 15 min |
| 5   | Time-Based Revalidation — `revalidate` and ISR                          | 12 min |
| 6   | `revalidatePath` — On-Demand Path Invalidation                          | 10 min |
| 7   | `revalidateTag` and `unstable_cache` — Tag-Based Invalidation           | 15 min |
| 8   | Opting Out of Cache — `cache: 'no-store'` and `connection`              | 10 min |
| 9   | Route Segment Config — `dynamic`, `revalidate`, `fetchCache`, `runtime` | 12 min |
| 10  | `generateStaticParams` — Static Path Generation                         | 15 min |

---

---

# 1 — `fetch` in Server Components — Basics and Cache Options

---

## T — TL;DR

In Server Components, `fetch` is enhanced by Next.js with a built-in caching layer — every `fetch` call is automatically memoized within the same request and can be cached across requests using `next.revalidate` or `next.tags`. It runs on the server, keeps secrets safe, and produces data that arrives in the initial HTML.

---

## K — Key Concepts

### The Enhanced `fetch` API

```tsx
// Next.js extends the native fetch API with a `next` option
// This is ONLY available in Server Components and Server Actions

// ─── The four cache behaviors:
fetch(url); // ← default: cached (static)
fetch(url, { cache: "no-store" }); // ← never cached (dynamic)
fetch(url, { next: { revalidate: 3600 } }); // ← ISR: cached for 1 hour
fetch(url, { next: { tags: ["products"] } }); // ← tagged: on-demand revalidation

// The enhanced next option:
fetch(url, {
  next: {
    revalidate: 60, // revalidate after N seconds (ISR)
    tags: ["products", "home"], // tag for on-demand revalidation
  },
});
```

### Cache Option 1 — Default (Static Caching)

```tsx
// src/app/products/page.tsx
// Default behavior: fetch is cached indefinitely (treated as static)
// Cached in the Data Cache — persists across deploys until revalidated

export default async function ProductsPage() {
  // ✅ Cached: same response returned for ALL requests
  // until revalidatePath() or revalidateTag() is called
  const products = await fetch("https://api.example.com/products").then((r) =>
    r.json()
  );

  return <ProductList products={products} />;
}

// When is this the right choice?
// → Data that changes only when you explicitly deploy or trigger revalidation
// → Marketing content, product catalog with manual CMS publishing
```

### Cache Option 2 — `cache: 'no-store'` (Always Fresh)

```tsx
// ✅ No caching — fresh data on every request
const livePrice = await fetch("https://api.example.com/prices/BTC", {
  cache: "no-store", // ← bypasses all Next.js caching
}).then((r) => r.json());

// When is this the right choice?
// → Live prices, real-time inventory, user-specific data
// → Any data where staleness is never acceptable
// → Note: forces the ENTIRE route to be dynamically rendered
```

### Cache Option 3 — `next.revalidate` (ISR — Time-Based)

```tsx
// ✅ ISR: cached AND automatically refreshed after N seconds
const posts = await fetch("https://cms.example.com/posts", {
  next: { revalidate: 3600 }, // ← re-fetch every 1 hour
}).then((r) => r.json());

// Behavior:
//   Request at t=0:      fetches, caches response
//   Requests t=1–3599:   return cached response (instant)
//   Request at t=3600:   serves STALE while re-fetching in background
//   Next request:        returns fresh response

// When is this the right choice?
// → Blog posts, product details, documentation
// → Data that changes predictably but not per-request
```

### Cache Option 4 — `next.tags` (On-Demand Revalidation)

```tsx
// ✅ Tagged: cached until you explicitly call revalidateTag('products')
const products = await fetch("https://api.example.com/products", {
  next: {
    revalidate: false, // ← never auto-expire (optional — this is the default)
    tags: ["products"], // ← tag this fetch for on-demand invalidation
  },
}).then((r) => r.json());

// Use case: CMS webhook triggers revalidation when content changes
// → Webhook calls revalidateTag('products') → only then is cache cleared
// → Combine with revalidate for both time AND on-demand:
fetch(url, { next: { revalidate: 86400, tags: ["products"] } });
// → Re-fetches after 24h OR immediately when revalidateTag('products') is called
```

### Request Memoization — Same-Request Deduplication

```tsx
// When the same URL+options is fetched multiple times in ONE request,
// Next.js deduplicates automatically — only ONE HTTP request is made

// layout.tsx
const user = await fetch("/api/me").then((r) => r.json()); // ← HTTP request

// page.tsx (same request)
const user = await fetch("/api/me").then((r) => r.json()); // ← cache hit (no HTTP)

// component.tsx (same request)
const user = await fetch("/api/me").then((r) => r.json()); // ← cache hit (no HTTP)

// Result: 1 HTTP request despite 3 fetch calls
// This is REQUEST memoization — different from DATA CACHE (cross-request)
// It's automatic — no configuration needed
// Memoization resets between requests — it's per-request, not persistent
```

### Fetch with Auth Headers — Stays on Server

```tsx
// Server Component — auth headers are SAFE here
// process.env secrets never exposed to browser

export default async function AdminPage() {
  const data = await fetch("https://internal-api.example.com/admin/data", {
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`, // ← server only
      "X-API-Version": "2026-05",
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 }, // cache for 5 minutes
  }).then((r) => r.json());

  return <AdminDashboard data={data} />;
}
```

### `fetch` vs Direct Database Access

```
Use fetch() when:
  ✅ Calling an external API (CMS, payment provider, third-party service)
  ✅ Calling your own API routes (rare — prefer direct DB in Server Components)
  ✅ You want Next.js cache semantics (revalidate, tags) on HTTP responses
  ✅ The data source is an HTTP endpoint

Use direct DB (db.product.findMany()) when:
  ✅ Your data is in your own database (Prisma, Drizzle, etc.)
  ✅ You want maximum performance (no HTTP overhead)
  ✅ You need transactions or complex queries
  ✅ You want type-safe queries
  Note: Direct DB queries are NOT cached by Next.js automatically
        Use React.cache() for per-request deduplication
        Use unstable_cache() for cross-request caching (covered in Subtopic 7)
```

---

## W — Why It Matters

- The enhanced `fetch` with `next.revalidate` and `next.tags` is how Next.js implements ISR (Incremental Static Regeneration) at the data level — individual fetches can have independent cache lifetimes on the same page.
- Request memoization means you can call `fetch('/api/me')` in every component that needs the user without worrying about N HTTP requests — Next.js collapses them into one automatically.
- Understanding that `cache: 'no-store'` forces the entire route to be dynamic is critical — adding it to one fetch in a previously static page makes the whole page server-rendered on every request, which can 100x your server load for high-traffic pages.

---

## I — Interview Q&A

### Q1: How does Next.js enhance the native `fetch` API?

**A:** Next.js extends `fetch` with a `next` option that controls caching behavior. By default, `fetch` in Server Components is cached indefinitely across requests (static behavior). You can opt into ISR with `next: { revalidate: N }` — the response is cached and automatically re-fetched in the background after N seconds. You can tag fetches with `next: { tags: ['tag'] }` to enable on-demand invalidation via `revalidateTag('tag')`. You can bypass caching entirely with `cache: 'no-store'` for always-fresh data. Additionally, Next.js automatically deduplicates identical `fetch` calls within the same request through request memoization.

### Q2: What is the difference between request memoization and the Data Cache?

**A:** Request memoization is per-request and temporary — if the same `fetch(url, options)` is called multiple times during a single server render, Next.js makes only one HTTP request and shares the result. It resets between requests. The Data Cache is persistent across requests — it stores fetch responses on the server and serves them to subsequent requests without hitting the origin, until the cache is invalidated by time (`revalidate`) or on-demand (`revalidateTag`). Request memoization prevents duplicate HTTP calls within one render. The Data Cache prevents duplicate origin calls across many renders over time.

### Q3: When should you use `cache: 'no-store'` vs `next: { revalidate: 0 }`?

**A:** Both opt out of caching, but `cache: 'no-store'` is the correct and explicit way to disable caching — it tells the browser and Next.js to never cache this response. `revalidate: 0` is effectively the same in practice (revalidate immediately), but `cache: 'no-store'` is the semantically correct HTTP cache directive and is more explicit in intent. Use `cache: 'no-store'` for live data. Note: both force dynamic rendering for the route.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `fetch` inside a Client Component

```tsx
"use client";
export function ProductList() {
  useEffect(() => {
    fetch("/api/products") // ← runs in browser, no Next.js cache benefits
      .then((r) => r.json())
      .then(setProducts);
  }, []);
}
// No caching, no deduplication, requires an API route,
// content missing from initial HTML
```

**Fix:** Move data fetching to a Server Component:

```tsx
// Server Component — full Next.js cache benefits
export async function ProductList() {
  const products = await fetch("https://api.example.com/products", {
    next: { revalidate: 300, tags: ["products"] },
  }).then((r) => r.json());
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### ❌ Pitfall: Not checking response status before parsing JSON

```tsx
// ❌ Throws a confusing error if API returns 404/500
const data = await fetch("https://api.example.com/product/999").then((r) =>
  r.json()
); // ← 404 response body parsed as JSON → error
```

**Fix:** Always check `response.ok`:

```tsx
const response = await fetch("https://api.example.com/product/999", {
  next: { revalidate: 300, tags: ["products"] },
});

if (!response.ok) {
  if (response.status === 404) notFound();
  throw new Error(`API error: ${response.status} ${response.statusText}`);
}

const product = await response.json();
```

### ❌ Pitfall: Adding `cache: 'no-store'` to a fetch in a layout — makes EVERYTHING dynamic

```tsx
// src/app/layout.tsx — root layout
export default async function RootLayout({ children }) {
  // ❌ This one fetch makes EVERY page in the entire app dynamic
  const nav = await fetch("/api/nav", { cache: "no-store" }).then((r) =>
    r.json()
  );
  return (
    <html>
      <body>
        <Nav items={nav} />
        {children}
      </body>
    </html>
  );
}
```

**Fix:** Use ISR with a short revalidate for navigation data, or fetch statically:

```tsx
// ✅ Nav items cached and refreshed every 10 minutes
const nav = await fetch("/api/nav", {
  next: { revalidate: 600, tags: ["navigation"] },
}).then((r) => r.json());
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/shop` page with four fetch calls demonstrating all four cache options:

1. A `store config` fetch — static (default caching)
2. A `product catalog` fetch — ISR every 30 minutes
3. A `featured products` fetch — tagged with `['featured', 'products']`
4. A `live inventory` fetch — no cache, always fresh
5. Show which strategy each section uses in a comment
6. Correct `response.ok` checking on every fetch

### Solution

```tsx
// src/app/shop/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Shop" };

// ─── Data fetching helpers ────────────────────────────────────────────────────

async function getStoreConfig() {
  // Strategy 1: DEFAULT — cached indefinitely (static)
  // Changes only when code is deployed or revalidatePath/Tag is called
  const res = await fetch("https://api.example.com/config/store");
  if (!res.ok) throw new Error("Failed to load store config");
  return res.json() as Promise<{
    name: string;
    currency: string;
    locale: string;
  }>;
}

async function getProductCatalog() {
  // Strategy 2: ISR — cached, refreshed every 30 minutes in background
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 1800 }, // ← 30 min ISR
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  return res.json() as Promise<{ id: string; name: string; price: number }[]>;
}

async function getFeaturedProducts() {
  // Strategy 3: TAGGED — cached until revalidateTag('featured') is called
  // Combine with revalidate for belt-and-suspenders freshness
  const res = await fetch("https://api.example.com/products/featured", {
    next: {
      revalidate: 86400, // max 24h stale
      tags: ["featured", "products"], // on-demand via revalidateTag
    },
  });
  if (!res.ok) return []; // graceful fallback
  return res.json() as Promise<{ id: string; name: string; badge: string }[]>;
}

async function getLiveInventory() {
  // Strategy 4: NO CACHE — always fresh (forces dynamic rendering)
  const res = await fetch("https://api.example.com/inventory/summary", {
    cache: "no-store", // ← live stock levels, never cached
  });
  if (!res.ok) return { inStock: 0, lowStock: 0, outOfStock: 0 };
  return res.json() as Promise<{
    inStock: number;
    lowStock: number;
    outOfStock: number;
  }>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShopPage() {
  // Parallel fetches — all start simultaneously
  const [config, catalog, featured, inventory] = await Promise.all([
    getStoreConfig(),
    getProductCatalog(),
    getFeaturedProducts(),
    getLiveInventory(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Strategy 1: Static — from config */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Currency: {config.currency} · Locale: {config.locale}{" "}
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
            static (default cache)
          </span>
        </p>
      </header>

      {/* Strategy 3: Tagged — featured products */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">Featured</h2>
            <span
              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5
                             rounded font-mono border border-blue-100"
            >
              tag: featured, products
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {featured.map((p) => (
              <div
                key={p.id}
                className="px-4 py-2 bg-blue-50 border border-blue-200
                              rounded-xl text-sm font-medium text-blue-800"
              >
                {p.badge} {p.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strategy 4: No-cache — live inventory */}
      <section className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Live Inventory</h2>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            live · no-store
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "In Stock",
              value: inventory.inStock,
              color: "text-green-600",
            },
            {
              label: "Low Stock",
              value: inventory.lowStock,
              color: "text-yellow-600",
            },
            {
              label: "Out of Stock",
              value: inventory.outOfStock,
              color: "text-red-600",
            },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Strategy 2: ISR — product catalog */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Catalog</h2>
          <span
            className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5
                           rounded font-mono border border-amber-100"
          >
            ISR: revalidate=1800
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {catalog.map((p) => (
            <div key={p.id} className="border rounded-xl p-4 bg-white">
              <p className="font-medium text-sm text-gray-900">{p.name}</p>
              <p className="text-blue-600 font-bold mt-1">${p.price}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/*
  Cache strategy summary for /shop:
  ─────────────────────────────────────────────────────────
  getStoreConfig()      → default cache (static, CDN)
  getProductCatalog()   → ISR, 30 min revalidate
  getFeaturedProducts() → tagged, on-demand + 24h max
  getLiveInventory()    → no-store (forces dynamic route)
  ─────────────────────────────────────────────────────────
  Because getLiveInventory() uses cache:'no-store',
  the entire /shop route becomes DYNAMIC (per-request).
  If live inventory is optional, wrap in Suspense + async component
  to isolate the dynamic section and keep the rest static.
*/
```

---

---

# 2 — Sequential vs Parallel Data Fetching

---

## T — TL;DR

**Sequential** fetches run one after another — each `await` blocks until the previous completes, creating a waterfall. **Parallel** fetches start simultaneously using `Promise.all` — total time equals the slowest, not the sum. Choosing correctly can reduce page load time by 60–80% on data-heavy pages.

---

## K — Key Concepts

### The Waterfall Problem — Sequential Fetching

```tsx
// ❌ Sequential — 100ms + 200ms + 300ms = 600ms total
export default async function DashboardPage() {
  const user = await getUser(); // starts at t=0,   done at t=100ms
  const orders = await getOrders(); // starts at t=100, done at t=300ms
  const products = await getProducts(); // starts at t=300, done at t=600ms
  // User waits 600ms for data that could load in 300ms
}

// Sequential is ONLY correct when data depends on the previous result:
export default async function OrderPage({ params }) {
  const user = await getUser(); // 100ms
  const orders = await getOrders({ userId: user.id }); // DEPENDS on user.id
  // This sequential pattern is CORRECT — order query needs user.id
}
```

### Parallel with `Promise.all`

```tsx
// ✅ Parallel — all start at t=0, done at max(100, 200, 300) = 300ms
export default async function DashboardPage() {
  const [user, orders, products] = await Promise.all([
    getUser(), // starts at t=0
    getOrders(), // starts at t=0
    getProducts(), // starts at t=0
  ]);
  // Total: 300ms (max) instead of 600ms (sum) — 50% faster
}
```

### `Promise.all` Error Behavior

```tsx
// ❌ Problem: if ANY promise rejects, Promise.all rejects entirely
const [user, orders, products] = await Promise.all([
  getUser(), // ✅ succeeds
  getOrders(), // ❌ throws — entire Promise.all fails
  getProducts(), // never used
]);

// Fix Option 1: use Promise.allSettled for independent optional data
const results = await Promise.allSettled([
  getUser(),
  getOrders(),
  getProducts(),
]);

const user = results[0].status === "fulfilled" ? results[0].value : null;
const orders = results[1].status === "fulfilled" ? results[1].value : [];
const products = results[2].status === "fulfilled" ? results[2].value : [];

// Fix Option 2: wrap individual fetches in try/catch
async function safeGetOrders() {
  try {
    return await getOrders();
  } catch {
    return [];
  } // graceful fallback
}

const [user, orders, products] = await Promise.all([
  getUser(),
  safeGetOrders(),
  getProducts(),
]);
```

### Parallel with Independent Suspense Boundaries

```tsx
// ✅ Best pattern: each component fetches its OWN data in parallel
// No need for Promise.all in the page — components are their own fetching units
// Each section streams in as soon as ITS data resolves

// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { StatsSection } from "./_components/stats-section"; // 100ms query
import { OrdersTable } from "./_components/orders-table"; // 300ms query
import { ActivityFeed } from "./_components/activity-feed"; // 500ms query

export default function DashboardPage() {
  // page.tsx is NOT async — no data fetching here
  // Each component handles its own data fetching independently
  return (
    <div className="space-y-6">
      {/* All three queries START simultaneously (parallel) */}
      {/* Each RENDERS as soon as its own data is ready (streaming) */}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection /> {/* renders at ~100ms */}
      </Suspense>

      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersTable /> {/* renders at ~300ms */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed /> {/* renders at ~500ms */}
      </Suspense>
    </div>
  );
}

// vs Promise.all in page:
// With Promise.all → page waits 500ms for ALL, then renders EVERYTHING at once
// With Suspense    → page renders progressively: 100ms, 300ms, 500ms
```

### Sequential When You Must — Minimize the Waterfall

```tsx
// When sequential is required, minimize the chain
export default async function UserOrdersPage({ params }) {
  const { userId } = await params;

  // Step 1: must be sequential — orders need userId
  const user = await getUser(userId); // 100ms
  if (!user) notFound();

  // Step 2: now parallelize everything that needs user
  const [orders, preferences, notifications] = await Promise.all([
    getOrders(user.id), // all start simultaneously
    getUserPreferences(user.id), // after the sequential getUser
    getNotifications(user.id), // after the sequential getUser
  ]);

  // Pattern: sequential chain → parallel fan-out
  // Total: 100ms (user) + max(orders, prefs, notifications)
  // vs: 100ms + orders + prefs + notifications (fully sequential)
}
```

### Initiating Fetches Early — "Waterfall Prevention" Pattern

```tsx
// Advanced: start fetches before awaiting them
export default async function ProductPage({ params }) {
  const { id } = await params;

  // Start ALL fetches immediately (don't await yet)
  const productPromise = getProduct(id); // starts at t=0
  const reviewsPromise = getReviews(id); // starts at t=0
  const relatedPromise = getRelatedProducts(); // starts at t=0

  // Now await only what you need for the initial render
  const product = await productPromise; // waits for product (100ms)
  if (!product) notFound();

  // reviews and related are already in-flight
  // pass promises to Suspense-wrapped components
  return (
    <div>
      <ProductDetail product={product} />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews reviewsPromise={reviewsPromise} /> {/* resolves ~200ms */}
      </Suspense>
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts relatedPromise={relatedPromise} />{" "}
        {/* resolves ~150ms */}
      </Suspense>
    </div>
  );
}
```

---

## W — Why It Matters

- Sequential fetching in a dashboard is the most common cause of unnecessarily slow pages — a page with three independent 200ms queries takes 600ms sequentially vs 200ms in parallel. The fix is one line: `Promise.all`.
- The independent Suspense pattern (each component fetches its own data) is even better than `Promise.all` because it combines parallelism with progressive rendering — fast sections appear early while slow ones continue loading.
- The "start fetches early before awaiting" pattern is important when you have a required sequential fetch followed by independent fetches — it prevents the sequential fetch from delaying the start of subsequent independent fetches.

---

## I — Interview Q&A

### Q1: When is sequential fetching correct vs a performance mistake?

**A:** Sequential fetching is correct when data truly depends on previous results — you need a user's `orgId` before fetching their org's data, so `getUser()` must complete before `getOrgData()` starts. It's a performance mistake when fetches are independent — user profile, recent orders, and notification count can all start at `t=0` since none depends on the others. The test: "does fetch B need any data from fetch A to construct its request?" If no, parallelize with `Promise.all`.

### Q2: What is the difference between `Promise.all` and independent Suspense boundaries for parallel data?

**A:** `Promise.all` in a page component parallelizes the fetches but blocks the entire page until all promises resolve — the page renders once, showing all sections simultaneously at the time of the slowest fetch. Independent Suspense boundaries also parallelize fetches (all components start fetching at the same time) but enable streaming — each section renders and streams to the browser as soon as its own data resolves. A 100ms section appears at 100ms instead of waiting for the 500ms section. Suspense gives both parallelism and progressive rendering; `Promise.all` gives only parallelism.

### Q3: How does `Promise.allSettled` differ from `Promise.all` and when should you use it?

**A:** `Promise.all` rejects as soon as any single promise rejects, discarding all other results. `Promise.allSettled` waits for all promises to settle (fulfill or reject) and returns an array of result objects with a `status` field (`'fulfilled'` or `'rejected'`). Use `Promise.allSettled` when fetches are independent and you want graceful degradation — if the notifications API fails, you still want to show the user's orders and profile. Use `Promise.all` when all data is required for the page to make sense, and a single failure should surface an error state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Sequential awaits for independent data in a loop

```tsx
// ❌ N sequential DB queries — O(N) time complexity
const orders = await db.order.findMany();
const enrichedOrders = [];
for (const order of orders) {
  const customer = await db.customer.findUnique({
    // ← N sequential queries!
    where: { id: order.customerId },
  });
  enrichedOrders.push({ ...order, customer });
}
// 10 orders = 10 sequential queries = 10 × query time
```

**Fix:** Use `Promise.all` or a JOIN:

```tsx
// ✅ Option A: Promise.all — all customer queries in parallel
const orders = await db.order.findMany();
const customers = await Promise.all(
  orders.map((o) => db.customer.findUnique({ where: { id: o.customerId } }))
);
const enriched = orders.map((o, i) => ({ ...o, customer: customers[i] }));

// ✅ Option B (best): JOIN query — one DB round trip
const enriched = await db.order.findMany({
  include: { customer: true }, // ← single JOIN, not N+1
});
```

### ❌ Pitfall: Awaiting a promise unnecessarily early

```tsx
// ❌ productPromise is awaited before relatedPromise even starts
const product = await getProduct(id); // ← blocks
const related = await getRelatedProducts(); // ← only starts after product finishes
```

**Fix:** Start both simultaneously:

```tsx
// ✅ Both start at t=0
const [product, related] = await Promise.all([
  getProduct(id),
  getRelatedProducts(),
]);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/dashboard/overview` page that:

1. Has ONE required sequential fetch: `getWorkspace(id)` (needs params)
2. Then fans out to THREE parallel fetches: `getStats(workspaceId)`, `getRecentOrders(workspaceId)`, `getTeamMembers(workspaceId)`
3. Uses `Promise.allSettled` so partial failures degrade gracefully
4. Each section shows a fallback if its fetch failed
5. Uses independent Suspense boundaries for progressive streaming

### Solution

```tsx
// src/lib/overview-queries.ts
export async function getWorkspace(id: string) {
  await new Promise((r) => setTimeout(r, 80));
  if (id === "invalid") throw new Error("Workspace not found");
  return { id, name: "Acme Corp", plan: "pro" };
}

export async function getStats(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 150));
  return { revenue: 48200, orders: 312, members: 8, growth: "+14%" };
}

export async function getRecentOrders(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 350));
  return [
    {
      id: "o1",
      number: 1044,
      customer: "Alice",
      total: 249,
      status: "delivered",
    },
    { id: "o2", number: 1045, customer: "Bob", total: 89, status: "pending" },
    {
      id: "o3",
      number: 1046,
      customer: "Carol",
      total: 420,
      status: "shipped",
    },
  ];
}

export async function getTeamMembers(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 200));
  return [
    { id: "u1", name: "Alice Chen", role: "Admin" },
    { id: "u2", name: "Bob Kim", role: "Developer" },
    { id: "u3", name: "Carol Davis", role: "Designer" },
  ];
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/stats-grid.tsx
interface Stats {
  revenue: number;
  orders: number;
  members: number;
  growth: string;
}

export function StatsGrid({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm
                      text-red-700"
      >
        Failed to load stats.{" "}
        <a href="." className="underline">
          Refresh
        </a>
      </div>
    );
  }
  const ITEMS = [
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}` },
    { label: "Orders", value: String(stats.orders) },
    { label: "Members", value: String(stats.members) },
    { label: "Growth", value: stats.growth },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/orders-list.tsx
interface Order {
  id: string;
  number: number;
  customer: string;
  total: number;
  status: string;
}

export function OrdersList({ orders }: { orders: Order[] | null }) {
  if (!orders) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Could not load recent orders.
      </div>
    );
  }
  const STATUS: Record<string, string> = {
    delivered: "text-green-600 bg-green-50",
    pending: "text-yellow-600 bg-yellow-50",
    shipped: "text-blue-600 bg-blue-50",
  };
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Recent Orders</h3>
      </div>
      <ul className="divide-y">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div>
              <p className="text-sm font-medium">#{o.number}</p>
              <p className="text-xs text-gray-500">{o.customer}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium
                                ${STATUS[o.status]}`}
              >
                {o.status}
              </span>
              <span className="text-sm font-bold">${o.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/team-list.tsx
interface Member {
  id: string;
  name: string;
  role: string;
}

export function TeamList({ members }: { members: Member[] | null }) {
  if (!members) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Could not load team members.
      </div>
    );
  }
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Team</h3>
      </div>
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <div
              className="w-8 h-8 rounded-full bg-blue-500 flex items-center
                            justify-center text-white text-xs font-bold shrink-0"
            >
              {m.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{m.name}</p>
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
// src/app/(dashboard)/dashboard/overview/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getWorkspace,
  getStats,
  getRecentOrders,
  getTeamMembers,
} from "@/lib/overview-queries";
import { StatsGrid } from "./_components/stats-grid";
import { OrdersList } from "./_components/orders-list";
import { TeamList } from "./_components/team-list";

export const metadata: Metadata = { title: "Overview" };

type Params = Promise<{ workspaceId: string }>;

export default async function OverviewPage({ params }: { params: Params }) {
  const { workspaceId } = await params;

  // Step 1 — SEQUENTIAL (required — everything depends on workspace)
  const workspace = await getWorkspace(workspaceId); // t=0 → t=80ms
  if (!workspace) notFound();

  // Step 2 — PARALLEL FAN-OUT (all independent, start simultaneously at t=80ms)
  // Promise.allSettled: graceful degradation if any fetch fails
  const [statsResult, ordersResult, teamResult] = await Promise.allSettled([
    getStats(workspaceId), // t=80ms → t=230ms
    getRecentOrders(workspaceId), // t=80ms → t=430ms
    getTeamMembers(workspaceId), // t=80ms → t=280ms
  ]);

  // Extract values with fallback to null on failure
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const orders =
    ordersResult.status === "fulfilled" ? ordersResult.value : null;
  const members = teamResult.status === "fulfilled" ? teamResult.value : null;

  // Total time: 80ms (workspace) + 350ms (slowest: orders) = ~430ms
  // Fully sequential would be: 80+150+350+200 = 780ms

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Plan: {workspace.plan} · Workspace: {workspaceId}
        </p>
      </div>

      {/* Stats — resolved at ~230ms after page load */}
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <StatsGrid stats={stats} />
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        {/* Orders — resolved at ~430ms */}
        <Suspense
          fallback={
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <OrdersList orders={orders} />
        </Suspense>

        {/* Team — resolved at ~280ms */}
        <Suspense
          fallback={
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <TeamList members={members} />
        </Suspense>
      </div>
    </div>
  );
}

/*
  Timing breakdown:
  ─────────────────────────────────────────────────────────
  t=0ms    getWorkspace() starts (SEQUENTIAL — required)
  t=80ms   workspace resolved → fan-out starts
  t=80ms   getStats(), getRecentOrders(), getTeamMembers() all start (PARALLEL)
  t=230ms  stats resolved → StatsGrid streams in ✅
  t=280ms  team resolved  → TeamList streams in ✅
  t=430ms  orders resolved → OrdersList streams in ✅
  Total:   430ms (vs 780ms fully sequential)
  Saving:  ~45% faster ✅

  Resilience: Promise.allSettled means stats/team/orders each
  degrade independently — one failure shows a red error card,
  others still show their data ✅
*/
```

---

---

# 3 — Static vs Dynamic Rendering — How Fetching Drives It

---

## T — TL;DR

A route is **static** by default — HTML built at `next build`. It becomes **dynamic** the moment you use any request-specific API: `cookies()`, `headers()`, `searchParams`, or `cache: 'no-store'`. Understanding exactly what triggers dynamic rendering — and how to isolate it — is the key to maximizing cache efficiency.

---

## K — Key Concepts

### What Is Static Rendering

```
Static rendering:
  → HTML generated at build time (next build)
  → Served from CDN — global, ~5ms response time
  → Never hits your server/database on user requests
  → Perfect for: marketing pages, blog posts, product listings
  → Output: .html files on disk (or CDN cache)

Build output indicator:
  ○ /blog/[slug]   ← static (pre-rendered)
  ● /blog/[slug]   ← ISR (pre-rendered with revalidate)
  ƒ /dashboard     ← dynamic (server-rendered per request)
```

### What Is Dynamic Rendering

```
Dynamic rendering:
  → HTML generated on the server for EACH incoming request
  → Hits your server and possibly database every time
  → Always fresh — reflects latest data and request context
  → Perfect for: dashboards, user profiles, search results

What TRIGGERS dynamic rendering:
  1. cookies()         from 'next/headers'
  2. headers()         from 'next/headers'
  3. searchParams      prop accessed in page.tsx
  4. cache: 'no-store' in any fetch on the route
  5. connection()      from 'next/server' (new in Next.js 15+)
  6. export const dynamic = 'force-dynamic'
  7. noStore()         from 'next/cache' (deprecated in favor of connection())
```

### Static by Default — The Auto-Detection

```tsx
// These routes are STATIC (no request-specific APIs used):

// ─── Blog post — no cookies, no searchParams
export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = await fetch(`${CMS_URL}/posts/${slug}`, {
    next: { revalidate: 3600 },
  }).then((r) => r.json());
  return <Article post={post} />;
}
// ○ /blog/[slug]  ← STATIC (ISR) ✅

// ─── Homepage — no dynamic APIs
export default async function HomePage() {
  const featured = await fetch(`${API_URL}/featured`, {
    next: { tags: ["featured"] },
  }).then((r) => r.json());
  return <HeroSection featured={featured} />;
}
// ○ /  ← STATIC ✅
```

### Dynamic by Access — Auto-Detection

```tsx
// These routes become DYNAMIC automatically:

// ─── Dashboard — reads cookies for auth
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies(); // ← TRIGGERS dynamic
  const session = cookieStore.get("session");
  const user = await getUserBySession(session?.value);
  return <Dashboard user={user} />;
}
// ƒ /dashboard  ← DYNAMIC (cookies() detected) ✅

// ─── Search — reads searchParams
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>; // ← TRIGGERS dynamic
}) {
  const { q } = await searchParams;
  const results = await search(q ?? "");
  return <SearchResults results={results} />;
}
// ƒ /search  ← DYNAMIC (searchParams detected) ✅
```

### Isolating Dynamic Data with Suspense

```tsx
// Problem: one dynamic fetch makes the entire page dynamic
// Solution: isolate dynamic data in a Suspense-wrapped async component

// ─── Before: entire page is dynamic because of live price
export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // cacheable
  const price = await fetch(priceUrl, { cache: "no-store" }).then((r) =>
    r.json()
  );
  // ← cache: 'no-store' forces whole page to be dynamic
  return (
    <div>
      <ProductInfo product={product} />
      <LivePrice price={price} />
    </div>
  );
}
// ƒ /products/[id]  ← DYNAMIC — entire page re-renders per request

// ─── After: static shell + dynamic section
// Page itself is static — only the price component is dynamic
export const revalidate = 1800; // page is now ISR

async function LivePrice({ productId }: { productId: string }) {
  // cache: 'no-store' is isolated to this component
  const price = await fetch(`${PRICE_URL}/${productId}`, {
    cache: "no-store",
  }).then((r) => r.json());
  return <span className="text-blue-600 font-bold">${price.current}</span>;
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id); // ← ISR: cached for 30 min
  return (
    <div>
      <ProductInfo product={product} />
      <Suspense
        fallback={<span className="text-gray-400">Loading price...</span>}
      >
        <LivePrice productId={id} /> {/* ← dynamic section, isolated */}
      </Suspense>
    </div>
  );
}
// ● /products/[id]  ← ISR shell + dynamic streaming section ✅
```

### Force Static / Force Dynamic — Explicit Config

```tsx
// src/app/dashboard/page.tsx

// ─── Force static (even if it reads cookies — they return empty)
export const dynamic = "force-static";
// Use when: you know the dynamic APIs aren't actually needed at runtime
//           (e.g., feature-flagged code that reads cookies only sometimes)

// ─── Force dynamic always
export const dynamic = "force-dynamic";
// Use when: you need to ensure fresh data even when Next.js would cache it
//           (e.g., A/B test pages, personalized content)

// ─── Auto (default): Next.js decides based on API usage
export const dynamic = "auto"; // default, don't need to specify
```

---

## W — Why It Matters

- Understanding what triggers dynamic rendering prevents accidental performance regressions — adding `import { cookies } from 'next/headers'` to a layout that was previously static can make your entire app dynamic, multiplying server load by 100x for high-traffic sites.
- The Partial Pre-rendering (PPR) pattern — static shell with isolated dynamic sections — is the production architecture for pages that are mostly static but have some live data. It keeps CDN delivery speed for the majority of content while allowing real-time sections.
- Running `next build` and checking the output symbols (○ vs ● vs ƒ) is the fastest way to verify your caching strategy — a route showing ƒ when you expected ○ tells you something is unintentionally triggering dynamic rendering.

---

## I — Interview Q&A

### Q1: What is the difference between static and dynamic rendering in Next.js 16?

**A:** Static rendering generates HTML at build time — the output is a file served directly from a CDN with no server computation on user requests, typically in ~5ms globally. Dynamic rendering generates HTML on the server for each incoming request, allowing the response to use request-specific data like cookies, headers, and URL parameters — but at the cost of server computation and database queries on every page load. Next.js automatically detects which rendering mode a route uses based on the APIs accessed in the code: `cookies()`, `headers()`, `searchParams`, and `cache: 'no-store'` trigger dynamic rendering.

### Q2: How can you have both static and dynamic content on the same page?

**A:** By using Suspense to isolate dynamic sections into their own async Server Components. The page itself exports a `revalidate` value for ISR (making the shell static), and the dynamic data section is wrapped in `<Suspense>`. The dynamic component uses `cache: 'no-store'` or reads request-specific data. Next.js serves the static shell from CDN instantly, then streams the dynamic section as it resolves per-request. This is called Partial Pre-rendering (PPR) — the HTML shell is pre-rendered at build time, and the dynamic "holes" are filled in on each request via streaming.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `cookies()` in a root layout — makes everything dynamic

```tsx
// src/app/layout.tsx
import { cookies } from "next/headers";
export default async function RootLayout({ children }) {
  const locale = (await cookies()).get("locale")?.value; // ← entire app becomes dynamic
  return <html lang={locale ?? "en"}>{/* ... */}</html>;
}
```

**Fix:** Handle locale/theme in middleware or a Client Component:

```tsx
// src/middleware.ts — read cookie, set html lang attribute via response headers
// OR: use a Client Component that reads document.cookie on mount
// Layout stays static — no cookies() in layout
```

### ❌ Pitfall: Not realizing `searchParams` in ANY page makes that page dynamic

```tsx
// page.tsx
export default function ProductsPage({
  searchParams, // ← accessing this prop forces dynamic rendering
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Even if you don't use searchParams in the render,
  // accessing it in the props signature is enough to trigger dynamic
}
```

**Fix:** For truly optional search filters, read `searchParams` only if needed, or use client-side filtering:

```tsx
// ✅ URL-based filtering: use static page + client-side filter state
// OR: keep dynamic — search pages SHOULD be dynamic (content changes per query)
// The fix is knowing it's dynamic intentionally, not by accident
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/products/[id]` product detail page where:

1. Product info is **ISR** (`revalidate = 3600`)
2. A `LiveStockBadge` component is **dynamic** (`cache: 'no-store'`) but isolated in Suspense
3. A `RelatedProducts` component is **static** (default cache)
4. Verify your strategy works by adding comments showing expected build output symbols

### Solution

```tsx
// src/app/products/[id]/_components/live-stock-badge.tsx
// Dynamic section — always fresh stock level

async function getStockLevel(productId: string) {
  // cache: 'no-store' — always fresh, but ONLY affects this component
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/stock/${productId}`,
    { cache: "no-store" }
  ).catch(() => null);

  if (!res?.ok) return null;
  return res.json() as Promise<{
    count: number;
    status: "in_stock" | "low" | "out";
  }>;
}

export async function LiveStockBadge({ productId }: { productId: string }) {
  const stock = await getStockLevel(productId);

  if (!stock) {
    return <span className="text-xs text-gray-400">Stock unavailable</span>;
  }

  const STYLE = {
    in_stock: "bg-green-100 text-green-700",
    low: "bg-yellow-100 text-yellow-700",
    out: "bg-red-100 text-red-700",
  };

  const LABEL = {
    in_stock: `${stock.count} in stock`,
    low: `Only ${stock.count} left`,
    out: "Out of stock",
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${STYLE[stock.status]}`}
      >
        {LABEL[stock.status]}
      </span>
      <span className="text-xs text-gray-400">(live)</span>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/_components/related-products.tsx
// Static section — default cache (cached indefinitely until revalidated)

async function getRelated(productId: string) {
  // Default fetch — static (no revalidate, no no-store)
  const res = await fetch(
    `https://api.example.com/products/${productId}/related`
  ).catch(() => null);

  if (!res?.ok) return [];
  return res.json() as Promise<{ id: string; name: string; price: number }[]>;
}

export async function RelatedProducts({ productId }: { productId: string }) {
  const related = await getRelated(productId);

  if (related.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">You may also like</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {related.map((p) => (
          <a
            key={p.id}
            href={`/products/${p.id}`}
            className="border rounded-xl p-3 min-w-[140px] hover:shadow-sm
                        transition-shadow bg-white shrink-0"
          >
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-blue-600 font-bold text-sm">${p.price}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LiveStockBadge } from "./_components/live-stock-badge";
import { RelatedProducts } from "./_components/related-products";

// ─── ISR: page shell cached for 1 hour ────────────────────────────────────────
// Expected build output: ● /products/[id]
export const revalidate = 3600;
export const dynamicParams = true;

type Params = Promise<{ id: string }>;

const PRODUCTS: Record<
  string,
  {
    name: string;
    price: number;
    category: string;
    desc: string;
  }
> = {
  "prod-001": {
    name: "Air Max 90",
    price: 120,
    category: "Shoes",
    desc: "Classic Nike running shoe with visible Air cushioning.",
  },
  "prod-002": {
    name: "Canvas Tote",
    price: 45,
    category: "Bags",
    desc: "Durable everyday canvas tote bag in natural cotton.",
  },
};

export async function generateStaticParams() {
  return Object.keys(PRODUCTS).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const p = PRODUCTS[id];
  return { title: p?.name ?? "Product" };
}

async function getProduct(id: string) {
  // ISR fetch — cached for 1 hour (matches page's revalidate)
  return PRODUCTS[id] ?? null;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 gap-10">
        {/* Product image — static */}
        <div
          className="aspect-square bg-gray-100 rounded-2xl flex items-center
                        justify-center text-6xl"
        >
          🛍️
        </div>

        {/* Product info — ISR (cached 1 hour) */}
        <div className="flex flex-col justify-center">
          <p className="text-xs text-blue-600 font-semibold uppercase mb-2">
            {product.category}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          <p className="text-gray-500 text-sm mb-4">{product.desc}</p>
          <p className="text-3xl font-bold text-gray-900 mb-4">
            ${product.price}
          </p>

          {/* Live stock badge — dynamic, isolated in Suspense */}
          {/* This section streams in per-request; shell above is ISR */}
          <Suspense
            fallback={
              <div className="h-7 w-28 bg-gray-200 rounded-full animate-pulse" />
            }
          >
            <LiveStockBadge productId={id} />
          </Suspense>

          <button
            className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold
                             rounded-xl hover:bg-blue-700 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>

      {/* Related products — static (default cache) */}
      <div className="mt-12">
        <Suspense
          fallback={
            <div className="flex gap-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-36 h-20 bg-gray-200 rounded-xl shrink-0"
                />
              ))}
            </div>
          }
        >
          <RelatedProducts productId={id} />
        </Suspense>
      </div>
    </div>
  );
}

/*
  Expected next build output:
  ─────────────────────────────────────────────────────────
  ● /products/[id]   ← ISR (revalidate: 3600) ✅

  Runtime rendering breakdown per request:
  → Product info:       Served from ISR cache (~5ms) ✅
  → LiveStockBadge:     Dynamic (cache:no-store) streams in ✅
  → RelatedProducts:    Served from Data Cache (static) ✅
  → Shell:              Pre-rendered HTML from CDN ✅
*/
```

---

---

# 4 — The Next.js Cache Layers — Full Mental Model

---

## T — TL;DR

Next.js 16 has **four distinct cache layers**, each with a different scope, lifetime, and invalidation mechanism. Knowing which layer stores what — and how they interact — is the mental model that makes every caching decision clear.

---

## K — Key Concepts

### The Four Cache Layers

```
Layer                   What it stores           Scope           Invalidated by
──────────────────────  ──────────────────────   ─────────────   ──────────────────────────
1. Request Memoization  fetch() results          Single request  Automatically (per request)
2. Data Cache           fetch() responses        Persistent       revalidatePath/Tag, deploy
3. Full Route Cache     HTML + RSC payload       Persistent       revalidatePath/Tag, deploy
4. Router Cache         RSC payload (prefetch)   Browser session  navigation, router.refresh()
```

### Layer 1 — Request Memoization (Per-Request)

```tsx
// Scope: ONE server render request
// What: deduplicates identical fetch() calls within the same render tree
// Duration: reset after each request completes
// Automatic: yes — no configuration

// Both calls in the same request → 1 HTTP request, not 2
// layout.tsx
const user = await fetch("/api/me").then((r) => r.json()); // HTTP request → cached

// page.tsx (same request)
const user = await fetch("/api/me").then((r) => r.json()); // cache hit → no HTTP

// Note: React.cache() provides the same for NON-fetch functions
import { cache } from "react";
export const getUser = cache(async (id) =>
  db.user.findUnique({ where: { id } })
);
// Multiple calls to getUser(id) in one request → 1 DB query
```

### Layer 2 — Data Cache (Persistent HTTP Cache)

```tsx
// Scope: Persistent across requests (survives server restarts in production)
// What: stores fetch() response bodies
// Duration: until revalidated or cache is explicitly cleared
// Location: server-side (Next.js data cache store)

// Stores the response for ALL future requests:
const data = await fetch("https://api.example.com/config", {
  next: { revalidate: 3600 }, // cached for 1 hour in the Data Cache
});

// How revalidation works:
// t=0:    first request → cache MISS → fetch from origin → store in Data Cache
// t=1-3599: requests → cache HIT → return cached response (no origin fetch)
// t=3600: first request after expiry → cache STALE → serve stale, re-fetch in BG
// t=3601: cache FRESH again with new data

// Data Cache is SEPARATE from the browser HTTP cache
// Even if the browser cache is cleared, Data Cache persists
```

### Layer 3 — Full Route Cache (HTML + RSC Payload)

```tsx
// Scope: Persistent (stored on server/CDN)
// What: complete HTML output + React Server Component payload for static routes
// Duration: until route is revalidated or redeployed
// Only applies to: STATIC routes (○ and ● in build output)

// Static routes are pre-rendered and stored:
// next build → /products/page.tsx → HTML → stored in Full Route Cache
// Every subsequent request → serve pre-built HTML (no server computation)

// Dynamic routes (ƒ) bypass the Full Route Cache:
// Every request → server renders fresh HTML → not stored in Full Route Cache

// Invalidated by:
// → revalidatePath('/products')          ← clears specific route
// → revalidatePath('/products', 'layout') ← clears route + children
// → next deploy                           ← all static routes regenerated
```

### Layer 4 — Router Cache (Client-Side)

```tsx
// Scope: Browser memory (per navigation session)
// What: RSC (React Server Component) payload for visited/prefetched routes
// Duration: 30 seconds for dynamic routes, 5 minutes for static routes
//           cleared on hard refresh, browser close, or router.refresh()
// Location: client-side (browser memory)

// How it works:
// 1. User visits /products → page fetched, stored in Router Cache
// 2. User navigates to /products/1 → /products/1 fetched
// 3. User clicks back to /products → served from Router Cache (no server request)
// 4. <Link> prefetches routes on hover → stored in Router Cache
// 5. router.refresh() → invalidates Router Cache for current route

// Invalidate from Client Component:
"use client";
import { useRouter } from "next/navigation";
export function RefreshButton() {
  const router = useRouter();
  return <button onClick={() => router.refresh()}>Refresh Data</button>;
}
```

### The Cache Interaction Flow

```
Incoming request to /products
         │
         ▼
  ┌─────────────────────┐
  │  Full Route Cache   │  ← Layer 3: is there pre-built HTML?
  │  (static routes)    │
  └──────┬──────────────┘
         │ MISS (dynamic route or expired static)
         ▼
  ┌─────────────────────┐
  │  Server Render      │  ← generate HTML from components
  │  (React)            │
  └──────┬──────────────┘
         │ each fetch() call goes through:
         ▼
  ┌─────────────────────┐
  │  Request Memoization│  ← Layer 1: same fetch in this request?
  │  (per request)      │
  └──────┬──────────────┘
         │ MISS
         ▼
  ┌─────────────────────┐
  │  Data Cache         │  ← Layer 2: is there a cached response?
  │  (persistent)       │
  └──────┬──────────────┘
         │ MISS
         ▼
  ┌─────────────────────┐
  │  Origin Fetch       │  ← actual HTTP request to the API/DB
  │  (network)          │
  └─────────────────────┘
         │
         ▼ response flows back up, stored in Data Cache
```

### Opting Out of Each Layer

```tsx
// Opt out of Request Memoization:
// Not directly configurable — use different URLs or add unique headers
// (rarely needed — usually you WANT deduplication)

// Opt out of Data Cache:
fetch(url, { cache: "no-store" }); // ← skip Data Cache entirely

// Opt out of Full Route Cache:
export const dynamic = "force-dynamic"; // ← route never pre-rendered
// or use any dynamic API (cookies, headers, searchParams)

// Opt out of Router Cache:
router.refresh(); // ← invalidate current route
// or: add cache-control headers to the route's response
```

---

## W — Why It Matters

- Confusing the four layers is the most common source of "why isn't my data updating?" bugs in Next.js — knowing that a Data Cache hit serves stale content even after a database update (until revalidation is called) prevents hours of debugging.
- The Router Cache is invisible to server-side code — calling `revalidatePath` on the server doesn't clear the Router Cache. Users who navigate back to a page may still see stale content from the Router Cache until they hard-refresh or `router.refresh()` is called. This is a frequent source of confusion.
- The Full Route Cache only applies to static routes — understanding this is why `next build` shows ○ (static) vs ƒ (dynamic) and why CDN delivery is only possible for static routes.

---

## I — Interview Q&A

### Q1: Explain all four Next.js cache layers and their differences.

**A:** Next.js 16 has four cache layers. First: **Request Memoization** — deduplicates identical `fetch()` calls within a single render request, automatic and temporary (resets per request). Second: **Data Cache** — persists `fetch()` responses on the server across requests, configurable with `next.revalidate` and `next.tags`, invalidated by `revalidatePath`/`revalidateTag`. Third: **Full Route Cache** — stores the complete rendered HTML and RSC payload for static routes, served from CDN, invalidated by revalidation or redeployment. Fourth: **Router Cache** — stores RSC payloads in the browser during a session for instant back/forward navigation and prefetching, invalidated by `router.refresh()` or page navigation.

### Q2: Why might `revalidatePath` not immediately show updated data to a user?

**A:** `revalidatePath` clears the Data Cache and Full Route Cache on the server — the next server request will fetch fresh data. However, if the user's browser has the page in the Router Cache (client-side), they may still see the stale cached version when navigating back to the page. The Router Cache survives server-side revalidation because it lives in browser memory. To force a refresh, you need to call `router.refresh()` on the client after the server action, which tells the browser to discard its Router Cache and re-fetch from the server.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting `revalidatePath` to immediately update what the user sees

```tsx
// Server Action
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  await db.product.update({ where: { id }, data });
  revalidatePath(`/products/${id}`); // ← clears server cache

  // User is still on /products/[id] — sees OLD data from Router Cache
  // They need to router.refresh() to see the update
}
```

**Fix:** Combine `revalidatePath` with client-side `router.refresh()`:

```tsx
// Client Component that calls the action
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateProduct } from "../actions";

export function UpdateButton({ id, data }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await updateProduct(id, data); // ← clears server cache
          router.refresh(); // ← clears browser Router Cache ✅
        })
      }
    >
      {isPending ? "Saving..." : "Save"}
    </button>
  );
}
```

### ❌ Pitfall: Confusing Data Cache miss with Request Memoization miss

```tsx
// Developer sees "fetch called twice" in logs and thinks memoization broke
// But the second call has different options → memoization won't deduplicate

// These are different — NOT memoized together:
fetch("/api/user"); // options: {}
fetch("/api/user", { cache: "no-store" }); // options: {cache: 'no-store'}
// Different options = different cache keys = two HTTP requests
```

**Fix:** Ensure identical options for deduplication. Use `React.cache()` for DB calls:

```tsx
import { cache } from "react";
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
// Guaranteed deduplication regardless of call site ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Trace the cache journey for a request to `/blog/nextjs-16`:

1. Show which layer handles each stage
2. Show what happens on first visit, subsequent visits, and after `revalidateTag('blog-posts')`
3. Show what `router.refresh()` does vs `revalidateTag`
4. Write a component that visualizes which cache layer data came from

### Solution

```tsx
// src/app/blog/[slug]/_components/cache-debug-banner.tsx
// Shows cache layer info in development — Server Component
// (In production, omit or hide this component)

export function CacheDebugBanner({
  slug,
  renderedAt,
}: {
  slug: string;
  renderedAt: string; // ISO timestamp from server render
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className="bg-gray-900 text-green-400 font-mono text-xs px-4 py-3
                    rounded-lg mb-6 space-y-1"
    >
      <p className="font-bold text-white">🔍 Cache Debug (dev only)</p>
      <p>
        Route: <span className="text-yellow-400">/blog/{slug}</span>
      </p>
      <p>
        Rendered at: <span className="text-cyan-400">{renderedAt}</span>
      </p>
      <p>
        Strategy: <span className="text-green-400">ISR (revalidate=3600)</span>
      </p>
      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
        <p className="text-gray-400">Cache layer hierarchy:</p>
        <p> Layer 3 (Full Route Cache): checked first for pre-built HTML</p>
        <p> Layer 2 (Data Cache): checked for fetch() responses</p>
        <p> Layer 1 (Req Memoization): deduplicates within this render</p>
        <p> Layer 4 (Router Cache): browser-side, lives 5min for static</p>
      </div>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/page.tsx — with cache layer documentation
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CacheDebugBanner } from "./_components/cache-debug-banner";

export const revalidate = 3600; // ISR: 1 hour
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

const POSTS: Record<
  string,
  { title: string; content: string; author: string }
> = {
  "nextjs-16": {
    title: "Next.js 16 Deep Dive",
    content: "In-depth look...",
    author: "Mark",
  },
  "react-server": {
    title: "React Server Components",
    content: "RSC explained...",
    author: "Mark",
  },
};

export async function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: POSTS[slug]?.title ?? "Post Not Found" };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) notFound();

  // Timestamp of when THIS render ran on the server
  // Same timestamp = served from Full Route Cache (pre-built HTML)
  // Different timestamp = new server render occurred
  const renderedAt = new Date().toISOString();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      {/* Debug banner — visible in development to trace cache behavior */}
      <CacheDebugBanner slug={slug} renderedAt={renderedAt} />

      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-8">By {post.author}</p>
      <p className="text-gray-700 leading-relaxed">{post.content}</p>
    </article>
  );
}

/*
  Cache journey trace for GET /blog/nextjs-16:

  ─── FIRST EVER REQUEST (after next build) ────────────────────────────────────
  1. Full Route Cache: HIT (pre-built at next build) ✅
     → Serve pre-built HTML from Full Route Cache
     → renderedAt = BUILD TIME (same for all visitors during revalidate period)
     → Layers 1, 2 NOT consulted (HTML already built)

  ─── SUBSEQUENT REQUESTS (within 1 hour) ─────────────────────────────────────
  1. Full Route Cache: HIT ✅
     → Same pre-built HTML served
     → Response time: ~5ms from CDN

  ─── REQUEST AFTER 1 HOUR (ISR expiry) ───────────────────────────────────────
  1. Full Route Cache: STALE → serve stale HTML to this visitor
  2. Background: Next.js starts re-render
     → Fetch calls → Layer 1 (Request Memoization): fresh request, no hits
     → Fetch calls → Layer 2 (Data Cache): MISS (also expired) → origin fetch
     → New HTML rendered
  3. Full Route Cache: REFRESHED with new HTML
  4. Next visitor: Full Route Cache HIT with fresh HTML ✅

  ─── AFTER revalidateTag('blog-posts') CALLED ────────────────────────────────
  1. Data Cache: PURGED for tagged fetches ✅
  2. Full Route Cache: PURGED for affected routes ✅
  3. Next request: Full Route Cache MISS → fresh server render → new HTML
  4. User still in browser: Layer 4 (Router Cache) may still have old RSC payload
     → router.refresh() needed to clear browser cache ✅

  ─── router.refresh() CALLED (client-side) ───────────────────────────────────
  1. Layer 4 (Router Cache): CLEARED for current route ✅
  2. Browser re-fetches RSC payload from server
  3. Server: checks Full Route Cache → HIT (if revalidation ran) → fresh HTML
  4. User sees updated content ✅

  ─── revalidateTag vs router.refresh() summary ───────────────────────────────
  revalidateTag → clears server-side Data Cache + Full Route Cache
  router.refresh() → clears client-side Router Cache
  Both needed for user to see immediate update ✅
*/
```

---

---

# 5 — Time-Based Revalidation — `revalidate` and ISR

---

## T — TL;DR

**ISR (Incremental Static Regeneration)** pre-builds pages at build time and automatically regenerates them in the background after a `revalidate` period expires. Users always get fast pre-built HTML; the content stays fresh without a full rebuild.

---

## K — Key Concepts

### `revalidate` at Route Segment Level

```tsx
// src/app/blog/page.tsx
// Sets the revalidation window for the ENTIRE route

export const revalidate = 3600; // regenerate after 1 hour

// All fetch() calls in this route inherit this revalidate value
// UNLESS they override it with their own next.revalidate

export default async function BlogPage() {
  const posts = await fetch("https://cms.example.com/posts").then((r) =>
    r.json()
  );
  // ← this fetch uses revalidate: 3600 (inherited from route)
  return <PostList posts={posts} />;
}
```

### `revalidate` at fetch() Level

```tsx
// Per-fetch revalidation — overrides the route-level revalidate
export default async function MixedPage() {
  // Fast-changing: revalidate every 60s
  const prices = await fetch("https://api.example.com/prices", {
    next: { revalidate: 60 },
  }).then((r) => r.json());

  // Slow-changing: revalidate every 24h
  const config = await fetch("https://api.example.com/config", {
    next: { revalidate: 86400 },
  }).then((r) => r.json());

  // Static: never revalidate automatically (on-demand only)
  const legal = await fetch("https://api.example.com/legal", {
    next: { revalidate: false },
  }).then((r) => r.json());

  return <div>{/* render */}</div>;
}

// Route-level revalidate = MINIMUM of all fetch revalidate values in the route
// If route has revalidate: 3600 but a fetch has revalidate: 60 → route = 60
```

### The Stale-While-Revalidate Behavior

```
How ISR actually works:

t=0s     First request → cache MISS → fetch origin → build HTML → store
         User A sees: fresh HTML (200ms wait for origin)

t=1-3599s Subsequent requests → cache HIT → serve stored HTML
         Users B-Z see: pre-built HTML (~5ms)

t=3600s  Cache expires (marked stale)
         User X requests → served STALE HTML immediately (still ~5ms)
         Background: Next.js re-renders, re-fetches, builds new HTML

t=3601s  Cache FRESH with new HTML
         Next users see: updated HTML (~5ms)

Key: User X sees stale content briefly, but never waits for re-render
     This is "stale-while-revalidate" — serve stale, update in background
```

### ISR with `generateStaticParams`

```tsx
// src/app/products/[id]/page.tsx
export const revalidate = 1800; // 30 min
export const dynamicParams = true; // allow new products (not in generateStaticParams)

// Pre-build known products at build time
export async function generateStaticParams() {
  const products = await db.product.findMany({
    select: { id: true },
  });
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) notFound();
  return <ProductView product={product} />;
}

// Known products: pre-built at build time, then ISR every 30 min
// New products:   built on first request (dynamicParams: true), then ISR
// Deleted products: notFound() renders 404, cached in Full Route Cache
```

### Special `revalidate` Values

```tsx
// src/app/page.tsx

export const revalidate = 0; // ← effectively no cache (same as force-dynamic)
//   re-renders on every request

export const revalidate = false; // ← (default) never auto-revalidate
//   only revalidates via revalidatePath/Tag
//   or on next deploy

export const revalidate = Infinity; // ← same as false — cache forever

export const revalidate = 60; // ← revalidate after 60 seconds

// Note: revalidate: 0 does NOT equal cache: 'no-store'
// revalidate: 0 → Full Route Cache is used but regenerated every request
// cache: 'no-store' → bypasses Data Cache entirely, forces dynamic rendering
```

### Combining `revalidate` with `tags` — Best of Both

```tsx
// Combined: auto-revalidate after 1 hour AND on-demand when content changes
const posts = await fetch("https://cms.example.com/posts", {
  next: {
    revalidate: 3600, // ← auto: max 1 hour stale
    tags: ["posts"], // ← on-demand: immediate via revalidateTag('posts')
  },
});

// Use case:
// CMS webhook: calls revalidateTag('posts') when editor publishes → immediate update
// Between publishes: ISR ensures max 1h staleness even without webhook
```

---

## W — Why It Matters

- ISR is the correct strategy for the vast majority of web content — blog posts, product pages, documentation, landing pages. It delivers CDN-speed performance with automated freshness, without requiring a full redeploy when content changes.
- The stale-while-revalidate behavior is a feature, not a bug — users always get an instant response, and content is refreshed in the background. The brief window of stale content (a few seconds) is acceptable for most use cases and vastly better than waiting for a full re-render.
- Understanding that `revalidate: 0` and `cache: 'no-store'` are conceptually different helps avoid confusion — `revalidate: 0` still goes through the cache mechanism (just expires immediately), while `cache: 'no-store'` bypasses the Data Cache entirely.

---

## I — Interview Q&A

### Q1: How does ISR work in Next.js and what problem does it solve?

**A:** ISR (Incremental Static Regeneration) solves the conflict between static performance and data freshness. Traditional static sites are fast but stale — you need a full rebuild to update any content. SSR is always fresh but slow — every user pays the server rendering cost. ISR combines both: pages are pre-built statically (fast CDN delivery) and then automatically regenerated in the background after a `revalidate` period expires. The first request after expiry gets the stale page (still fast) while the server regenerates in the background. All subsequent requests get the fresh page. Individual pages revalidate independently — no full rebuild needed.

### Q2: What happens if `revalidate` is set at both the route segment and individual `fetch` calls?

**A:** Next.js uses the **lowest** `revalidate` value. If the route segment has `revalidate = 3600` but one fetch has `next: { revalidate: 60 }`, the route revalidates every 60 seconds — as fast as the shortest-lived data. This is logical: if any data on the page changes every 60 seconds, the page itself can't be cached longer than that. Conversely, individual fetches can have longer revalidation than the route segment — a fetch with `revalidate: 86400` on a page with `revalidate: 3600` will still be refreshed every hour (driven by the route segment).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting `revalidate = 0` thinking it means "no cache"

```tsx
// Developer wants fresh data on every request
export const revalidate = 0;
// ❌ This does NOT mean the same as cache: 'no-store'
// It means "expire the cache immediately" — subtle difference
// For true no-cache behavior, use force-dynamic or cache: 'no-store'
```

**Fix:** Use `force-dynamic` for true per-request rendering:

```tsx
export const dynamic = "force-dynamic"; // ← explicit per-request rendering
// OR on specific fetches:
fetch(url, { cache: "no-store" });
```

### ❌ Pitfall: Not setting `dynamicParams` when using `generateStaticParams`

```tsx
// generateStaticParams pre-builds known product IDs
export async function generateStaticParams() {
  return [{ id: "prod-1" }, { id: "prod-2" }];
}

// Default: dynamicParams = true (unknown IDs render on first request, then ISR)
// If you want unknown IDs to return 404:
export const dynamicParams = false;
// → /products/new-product-id → 404 immediately ✅
// → Useful for: finite sets (categories, static pages) where unknown = invalid
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `/events/[id]` page that:

1. Pre-builds 3 known events with `generateStaticParams`
2. Uses `revalidate = 900` (15 minutes) for ISR
3. Allows unknown event IDs with `dynamicParams = true`
4. A specific event fetch also uses `tags: ['events', `event-${id}`]` for on-demand revalidation
5. Shows a "Last updated" timestamp using `Date.now()` at render time to verify ISR behavior

### Solution

```tsx
// src/app/events/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── ISR configuration ────────────────────────────────────────────────────────
export const revalidate = 900; // ← regenerate after 15 minutes
export const dynamicParams = true; // ← new event IDs render on first request

type Params = Promise<{ id: string }>;

// Simulated CMS event data
const EVENTS: Record<
  string,
  {
    title: string;
    date: string;
    location: string;
    capacity: number;
    desc: string;
  }
> = {
  "evt-001": {
    title: "Next.js 16 Workshop",
    date: "2026-06-10",
    location: "San Francisco, CA",
    capacity: 50,
    desc: "A hands-on workshop covering the latest Next.js 16 features.",
  },
  "evt-002": {
    title: "React Summit 2026",
    date: "2026-07-15",
    location: "Amsterdam, NL",
    capacity: 500,
    desc: "The largest React conference in Europe.",
  },
  "evt-003": {
    title: "TypeScript Conf",
    date: "2026-08-20",
    location: "Online",
    capacity: 2000,
    desc: "Annual TypeScript conference with talks from the TypeScript team.",
  },
};

async function getEvent(id: string) {
  // Tagged fetch — can be invalidated by revalidateTag('events') or
  // revalidateTag(`event-${id}`) for surgical per-event revalidation
  const res = await fetch(`https://api.example.com/events/${id}`, {
    next: {
      revalidate: 900, // ← matches route revalidate
      tags: ["events", `event-${id}`], // ← tag for on-demand invalidation
    },
  }).catch(() => null);

  // Fallback to mock data if API unavailable
  if (!res?.ok) return EVENTS[id] ?? null;
  return res.json();
}

// ─── Pre-build known events at next build ─────────────────────────────────────
export async function generateStaticParams() {
  // In production: const events = await db.event.findMany({ select: { id: true } })
  return Object.keys(EVENTS).map((id) => ({ id }));
  // Pre-builds: /events/evt-001, /events/evt-002, /events/evt-003
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  return {
    title: event?.title ?? "Event Not Found",
    description: event?.desc,
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  // Render timestamp — changes when a new ISR render occurs
  // Same timestamp across requests = served from Full Route Cache (static)
  // Different timestamp = ISR regeneration happened
  const renderedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* ISR debug info — helpful in development */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                        mb-8 text-xs font-mono text-amber-700"
        >
          <p className="font-bold">ISR Debug</p>
          <p>Route revalidate: 900s (15 min)</p>
          <p>Tags: events, event-{id}</p>
          <p>Rendered at: {renderedAt}</p>
          <p className="text-amber-500 mt-1">
            If this timestamp is static across refreshes → Full Route Cache HIT
            ✅
          </p>
        </div>
      )}

      {/* Event details */}
      <div className="mb-2">
        <span className="text-xs text-blue-600 font-semibold uppercase">
          Event
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

      <div className="bg-white border rounded-xl p-6 space-y-4 mb-8">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
            <p className="font-semibold">{eventDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">
              Location
            </p>
            <p className="font-semibold">{event.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">
              Capacity
            </p>
            <p className="font-semibold">{event.capacity} attendees</p>
          </div>
        </div>
      </div>

      <p className="text-gray-600 leading-relaxed mb-8">{event.desc}</p>

      <button
        className="w-full py-3 bg-blue-600 text-white font-semibold
                         rounded-xl hover:bg-blue-700 transition-colors"
      >
        Register for this Event
      </button>

      {/* Production-safe last updated note */}
      <p className="text-xs text-gray-400 text-center mt-6">
        Content refreshes every 15 minutes · Last render: {renderedAt}
      </p>
    </div>
  );
}

/*
  Build output expected:
  ─────────────────────────────────────────────────────────────
  ● /events/[id]                 ← ISR (revalidate: 900) ✅
    ├── /events/evt-001           pre-built at build time
    ├── /events/evt-002           pre-built at build time
    └── /events/evt-003           pre-built at build time

  New events (e.g. /events/evt-004):
    → First request: dynamic render → cached → ISR from then on ✅

  On-demand revalidation targets:
    revalidateTag('events')         → regenerates ALL event pages
    revalidateTag('event-evt-001')  → regenerates ONLY evt-001 ✅
*/
```

---

---

# 6 — `revalidatePath` — On-Demand Path Invalidation

---

## T — TL;DR

`revalidatePath` immediately invalidates the Full Route Cache and Data Cache for a specific URL path. Call it from a Server Action after a mutation to ensure the next page request gets fresh data instead of stale cached content.

---

## K — Key Concepts

### Basic Usage

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));

  await db.product.create({ data: { name, price } });

  revalidatePath("/products"); // ← invalidate the product list page
  redirect("/products"); // ← navigate to refreshed list
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  revalidatePath("/products"); // ← list page
  revalidatePath(`/products/${id}`); // ← specific product page
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });

  revalidatePath("/products"); // ← only list needs revalidation
  // No need to revalidate /products/[id] — it'll return 404 on next visit
}
```

### `revalidatePath` Overloads

```tsx
import { revalidatePath } from "next/cache";

// ─── 1. Revalidate a specific page
revalidatePath("/blog/nextjs-16"); // → /blog/nextjs-16 only

// ─── 2. Revalidate a dynamic route (ALL matching pages)
revalidatePath("/products/[id]", "page"); // → /products/1, /products/2, etc.

// ─── 3. Revalidate a layout (page + ALL children)
revalidatePath("/dashboard", "layout");
// → /dashboard AND /dashboard/orders AND /dashboard/settings AND all nested routes

// ─── 4. Revalidate everything (use with caution)
revalidatePath("/", "layout"); // → EVERY route in the app

// Default second argument is 'page':
revalidatePath("/products"); // same as revalidatePath('/products', 'page')
```

### When to Call Which Overload

```
Scenario                              Call
─────────────────────────────────     ────────────────────────────────────
Updated one blog post                 revalidatePath('/blog/my-post')
Updated product in catalog            revalidatePath('/products')
                                      revalidatePath(`/products/${id}`)
Changed global navigation             revalidatePath('/', 'layout')
Changed dashboard layout data         revalidatePath('/dashboard', 'layout')
Changed ALL products                  revalidatePath('/products/[id]', 'page')
Changed user in entire app            revalidatePath('/', 'layout')
Changed settings that affect 1 page   revalidatePath('/dashboard/settings')
```

### `revalidatePath` in Route Handlers

```tsx
// src/app/api/webhooks/cms/route.ts
// Called by CMS when content is published

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const sig = request.headers.get("x-webhook-signature");
  if (sig !== process.env.CMS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, slug } = (await request.json()) as {
    type: "post" | "page" | "product";
    slug: string;
  };

  // Revalidate based on content type
  switch (type) {
    case "post":
      revalidatePath(`/blog/${slug}`);
      revalidatePath("/blog"); // also revalidate the listing page
      break;
    case "page":
      revalidatePath(`/${slug}`);
      break;
    case "product":
      revalidatePath(`/products/${slug}`);
      revalidatePath("/products");
      break;
  }

  return NextResponse.json({ revalidated: true, type, slug });
}
```

### Multiple `revalidatePath` Calls

```tsx
// Multiple calls are fine — each clears a specific path
export async function publishBlogPost(slug: string) {
  "use server";

  await cms.publishPost(slug);

  // Clear all affected pages
  revalidatePath(`/blog/${slug}`); // the post page
  revalidatePath("/blog"); // the listing page
  revalidatePath("/"); // homepage (if it shows featured posts)
  revalidatePath("/sitemap.xml"); // if you generate a sitemap dynamically
}
```

---

## W — Why It Matters

- `revalidatePath` is the bridge between server mutations and cached pages — without it, a database update is invisible to users until the ISR timer expires or the server restarts.
- The `'layout'` type is critical for changes that affect multiple nested routes — updating a user's name in the navigation (which is in a layout) requires `revalidatePath('/dashboard', 'layout')` to clear all dashboard sub-pages, not just the dashboard root.
- Using `revalidatePath('/', 'layout')` for global changes is a nuclear option — it clears every cached page in the app. Use it sparingly (theme changes, global nav updates) and prefer targeted path revalidation wherever possible.

---

## I — Interview Q&A

### Q1: What is the difference between `revalidatePath('/products')` and `revalidatePath('/products/[id]', 'page')`?

**A:** `revalidatePath('/products')` revalidates the specific URL `/products` — the product listing page. `revalidatePath('/products/[id]', 'page')` revalidates all pages matching the dynamic segment `/products/[id]` — every pre-built product detail page (`/products/1`, `/products/2`, etc.). Use the specific path when only one page is affected. Use the dynamic pattern when all instances of a dynamic route need refreshing — for example, if product images change globally and every product page shows images.

### Q2: When should you use `'layout'` as the second argument to `revalidatePath`?

**A:** Use `'layout'` when a change affects a layout component that is shared across multiple nested routes. For example, if the dashboard navigation shows the user's plan tier and the user upgrades their plan, `revalidatePath('/dashboard', 'layout')` clears the cache for `/dashboard` and all its sub-routes (`/dashboard/orders`, `/dashboard/settings`, etc.) because they all share the dashboard layout. Without `'layout'`, only `/dashboard` itself would be cleared — sub-routes would still show the old plan tier in the navigation.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling `revalidatePath` before the database write completes

```tsx
// ❌ Revalidates before data is actually saved
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  revalidatePath(`/products/${id}`); // ← happens BEFORE the update
  await db.product.update({ where: { id }, data });
  // Next request serves the old data (the update hasn't run yet)
}
```

**Fix:** Always revalidate AFTER successful writes:

```tsx
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  await db.product.update({ where: { id }, data }); // ← write first ✅
  revalidatePath(`/products/${id}`); // ← then revalidate ✅
}
```

### ❌ Pitfall: Forgetting to revalidate the list page after item mutation

```tsx
// ❌ Only revalidates the item detail page
export async function deleteProduct(id: string) {
  "use server";
  await db.product.delete({ where: { id } });
  revalidatePath(`/products/${id}`); // ← detail page cleared
  // /products list still shows the deleted item! ❌
}
```

**Fix:** Revalidate ALL affected pages:

```tsx
export async function deleteProduct(id: string) {
  "use server";
  await db.product.delete({ where: { id } });
  revalidatePath("/products"); // ← list page ✅
  revalidatePath(`/products/${id}`); // ← detail page (will 404 on next visit) ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a blog admin with three Server Actions demonstrating correct `revalidatePath` usage:

1. `publishPost(slug)` — revalidates post page + blog listing + homepage
2. `updatePostTitle(slug, title)` — revalidates post page + blog listing
3. `deletePost(slug)` — revalidates blog listing + homepage (NOT the post page)
4. A `BlogAdminPanel` Client Component calling all three with loading states

### Solution

```tsx
// src/app/admin/blog/actions.ts
"use server";

import { revalidatePath } from "next/cache";

// In production: actual DB/CMS operations
// Here: logging for demonstration

export async function publishPost(slug: string): Promise<{ success: boolean }> {
  try {
    // await db.post.update({ where: { slug }, data: { status: 'published' } })
    await new Promise((r) => setTimeout(r, 300)); // simulate DB

    revalidatePath(`/blog/${slug}`); // post page
    revalidatePath("/blog"); // listing
    revalidatePath("/"); // homepage (featured posts)

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updatePostTitle(
  slug: string,
  title: string
): Promise<{ success: boolean }> {
  try {
    // await db.post.update({ where: { slug }, data: { title } })
    await new Promise((r) => setTimeout(r, 200));

    revalidatePath(`/blog/${slug}`); // post page (title shown in <h1>)
    revalidatePath("/blog"); // listing (title shown in card)
    // No homepage revalidation — title change doesn't affect featured posts section

    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deletePost(slug: string): Promise<{ success: boolean }> {
  try {
    // await db.post.delete({ where: { slug } })
    await new Promise((r) => setTimeout(r, 250));

    revalidatePath("/blog"); // listing (remove deleted post) ✅
    revalidatePath("/"); // homepage (remove if featured) ✅
    // NOT revalidating /blog/${slug} — it will return 404 naturally on next visit
    // Revalidating it would just cache a 404 — unnecessary

    return { success: true };
  } catch {
    return { success: false };
  }
}
```

```tsx
// src/app/admin/blog/_components/blog-admin-panel.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishPost, updatePostTitle, deletePost } from "../actions";

const DEMO_POSTS = [
  { slug: "nextjs-16-guide", title: "Next.js 16 Guide", status: "draft" },
  {
    slug: "react-19-features",
    title: "React 19 Features",
    status: "published",
  },
  { slug: "server-components", title: "Server Components", status: "draft" },
];

type Action = "publish" | "title" | "delete" | null;

export function BlogAdminPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<{
    slug: string;
    type: Action;
  }>({
    slug: "",
    type: null,
  });
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  function isLoading(slug: string, type: Action) {
    return (
      isPending && activeAction.slug === slug && activeAction.type === type
    );
  }

  async function handle(
    slug: string,
    type: Action,
    action: () => Promise<{ success: boolean }>
  ) {
    setActiveAction({ slug, type });
    setMessage(null);

    startTransition(async () => {
      const result = await action();
      router.refresh(); // ← clear Router Cache to reflect server revalidation
      setMessage({
        text: result.success
          ? `✅ ${type} on "${slug}" succeeded`
          : `❌ Action failed`,
        success: result.success,
      });
      setActiveAction({ slug: "", type: null });
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Blog Admin</h1>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {DEMO_POSTS.map((post) => (
          <div
            key={post.slug}
            className="bg-white border rounded-xl px-5 py-4 flex items-center
                          justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{post.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs text-gray-400">/blog/{post.slug}</code>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    post.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {post.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Publish */}
              <button
                onClick={() =>
                  handle(post.slug, "publish", () => publishPost(post.slug))
                }
                disabled={isPending}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium
                           rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {isLoading(post.slug, "publish") ? "..." : "Publish"}
              </button>

              {/* Update title */}
              <button
                onClick={() =>
                  handle(post.slug, "title", () =>
                    updatePostTitle(post.slug, post.title + " (Updated)")
                  )
                }
                disabled={isPending}
                className="px-3 py-1.5 border text-gray-600 text-xs font-medium
                           rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                {isLoading(post.slug, "title") ? "..." : "Edit Title"}
              </button>

              {/* Delete */}
              <button
                onClick={() =>
                  handle(post.slug, "delete", () => deletePost(post.slug))
                }
                disabled={isPending}
                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200
                           text-xs font-medium rounded-lg hover:bg-red-100
                           disabled:opacity-40"
              >
                {isLoading(post.slug, "delete") ? "..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* revalidatePath strategy reference */}
      <div
        className="mt-8 bg-gray-50 border rounded-xl p-4 text-xs font-mono
                      text-gray-600 space-y-1"
      >
        <p className="font-bold text-gray-800">revalidatePath strategy:</p>
        <p>publishPost → /blog/[slug], /blog, /</p>
        <p>updateTitle → /blog/[slug], /blog</p>
        <p>deletePost → /blog, / (NOT /blog/[slug] — 404 naturally)</p>
      </div>
    </div>
  );
}
```

---

---

# 7 — `revalidateTag` and `unstable_cache` — Tag-Based Invalidation

---

## T — TL;DR

`revalidateTag` purges all cached data tagged with a specific string — in one call, you can refresh multiple pages and multiple fetch responses that share the same tag. `unstable_cache` (now `cacheTag` / `cacheLife` APIs in Next.js 15+) applies Next.js cache semantics to **any async function** — not just `fetch()` — enabling direct DB calls to participate in the cache system.

---

## K — Key Concepts

### `revalidateTag` — Tag-Based Cache Purge

```tsx
// src/app/products/actions.ts
"use server";

import { revalidateTag } from "next/cache";

// When ANY product changes → revalidate everything tagged 'products'
export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  revalidateTag("products"); // ← clears ALL fetches tagged 'products'
  revalidateTag(`product-${id}`); // ← clears fetches tagged with this specific ID
}

// When user data changes → revalidate their specific data
export async function updateUserProfile(userId: string, data: ProfileData) {
  await db.user.update({ where: { id: userId }, data });

  revalidateTag(`user-${userId}`); // ← only this user's cached data
}
```

### Tagging `fetch()` Calls

```tsx
// Tag fetches so revalidateTag knows what to clear

// Products list — tagged 'products'
const products = await fetch(`${API_URL}/products`, {
  next: {
    revalidate: 3600,
    tags: ["products"], // ← tagged
  },
}).then((r) => r.json());

// Specific product — tagged with both 'products' AND the specific ID
const product = await fetch(`${API_URL}/products/${id}`, {
  next: {
    revalidate: 3600,
    tags: ["products", `product-${id}`], // ← multiple tags
  },
}).then((r) => r.json());

// Now:
// revalidateTag('products')      → clears products list AND all product detail pages
// revalidateTag('product-abc')   → clears ONLY /products/abc (surgical)
```

### `unstable_cache` — Cache Any Async Function

```tsx
// unstable_cache extends Next.js cache semantics to ANY async function
// This is the way to cache direct database calls (non-fetch)

import { unstable_cache } from "next/cache";

// ─── Basic usage
const getCachedProducts = unstable_cache(
  async () => {
    // Direct DB call — no fetch() involved
    return db.product.findMany({ where: { status: "active" } });
  },
  ["products-list"], // cache key segments
  {
    revalidate: 3600, // ISR: revalidate after 1 hour
    tags: ["products"], // on-demand: revalidateTag('products')
  }
);

// Usage in Server Component:
export default async function ProductsPage() {
  const products = await getCachedProducts(); // ← cached DB call
  return <ProductList products={products} />;
}
```

```tsx
// ─── With dynamic cache key (per-user or per-resource)
const getCachedProduct = unstable_cache(
  async (id: string) => {
    return db.product.findUnique({ where: { id } });
  },
  ["product"], // ← prefix
  {
    revalidate: 1800,
    // tags added dynamically in the function body (see cacheTag below)
  }
);

// ─── With dynamic tags using cacheTag (Next.js 15+)
import { unstable_cache, cacheTag, cacheLife } from "next/cache";

const getCachedProductV2 = unstable_cache(
  async (id: string) => {
    "use cache"; // ← Next.js 15+ directive (if using the new cache API)
    cacheTag(`product-${id}`, "products"); // ← dynamic per-item tags
    cacheLife("hours"); // ← semantic revalidation interval
    return db.product.findUnique({ where: { id } });
  },
  ["product-v2"]
);
```

### `revalidateTag` in Webhook Handlers

```tsx
// src/app/api/webhooks/products/route.ts
// Called by your CMS or PIM (Product Information Management) system

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.PRODUCTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    event: "product.created" | "product.updated" | "product.deleted";
    productId: string;
  };

  switch (body.event) {
    case "product.created":
      // New product: revalidate list only (detail page doesn't exist yet)
      revalidateTag("products");
      break;

    case "product.updated":
      // Updated: revalidate both list AND the specific product page
      revalidateTag("products");
      revalidateTag(`product-${body.productId}`);
      break;

    case "product.deleted":
      // Deleted: revalidate list (product detail will 404 naturally)
      revalidateTag("products");
      break;
  }

  return NextResponse.json({ revalidated: true, event: body.event });
}
```

### `revalidatePath` vs `revalidateTag` — When to Use Each

```
revalidatePath:
  ✅ You know the exact URL that changed
  ✅ You need to clear a specific page and its children (layout type)
  ✅ After mutations in Server Actions where the URL is predictable
  ❌ Doesn't help when same data appears at many unknown URLs

revalidateTag:
  ✅ Same data appears on MULTIPLE pages (product list + detail + homepage)
  ✅ You want to clear ALL pages using a data source at once
  ✅ CMS/webhook integration — clear by content type, not URL
  ✅ Fine-grained: revalidateTag('product-123') for surgical updates
  ✅ Combined with unstable_cache for DB-backed caching

Rule: use revalidatePath for page-level mutations
      use revalidateTag for data-level mutations spanning many pages
```

---

## W — Why It Matters

- `revalidateTag` is the production-grade cache invalidation tool — when a product changes, you want to clear the product list, the product detail page, and any homepage section showing featured products — all in one `revalidateTag('products')` call instead of three `revalidatePath` calls.
- `unstable_cache` is essential for direct database queries — `fetch()` is enhanced by Next.js, but `db.product.findMany()` is not a `fetch()` call. Without `unstable_cache`, direct DB queries in Server Components are never cached across requests (only within a request via `React.cache()`).
- The tag hierarchy (`'products'` + `'product-${id}'`) enables both surgical (one product) and broad (all products) invalidation from the same cache system — you choose the granularity of invalidation at the call site.

---

## I — Interview Q&A

### Q1: When should you use `revalidateTag` instead of `revalidatePath`?

**A:** Use `revalidateTag` when the same data appears on multiple pages and you want to invalidate all of them at once with a single call. For example, product data appears on the product list page, each product detail page, and possibly the homepage featured section — `revalidateTag('products')` clears all of them simultaneously. Use `revalidatePath` when you know the exact URL that was affected and only that URL needs clearing. In practice: use tags for data-centric invalidation (what changed), paths for page-centric invalidation (which URL changed).

### Q2: What is `unstable_cache` and why is it needed?

**A:** `unstable_cache` is a Next.js utility that applies the Data Cache layer to any async function — not just `fetch()` calls. The built-in `fetch()` enhancement only works with HTTP requests. But most production Next.js apps use direct database clients (Prisma, Drizzle) for data access — these are plain JavaScript function calls that Next.js doesn't intercept for caching. `unstable_cache` wraps them, allowing `revalidate` intervals and `tags` for on-demand invalidation, giving direct DB queries the same ISR and tag-based revalidation capabilities as `fetch()`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `revalidateTag` without tagging the fetch in the first place

```tsx
// ❌ Calling revalidateTag('products') but the fetch has no tag
const products = await fetch(`${API_URL}/products`, {
  next: { revalidate: 3600 }, // ← no tags! revalidateTag does nothing
}).then((r) => r.json());

// Server Action:
revalidateTag("products"); // ← has no effect — nothing is tagged 'products'
```

**Fix:** Always add tags to fetches you want to revalidate on-demand:

```tsx
const products = await fetch(`${API_URL}/products`, {
  next: {
    revalidate: 3600,
    tags: ["products"], // ← tagged ✅
  },
}).then((r) => r.json());
```

### ❌ Pitfall: Not keying `unstable_cache` correctly for dynamic data

```tsx
// ❌ Same cache key for all products — every product overwrites the same cache entry
const getCachedProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ["product"], // ← same key for ALL ids → cache collision
  { revalidate: 3600 }
);

// getCachedProduct('prod-1')  → stores under key ['product']
// getCachedProduct('prod-2')  → OVERWRITES prod-1 in cache
// getCachedProduct('prod-1')  → returns prod-2's data ❌
```

**Fix:** Include dynamic parameters in the cache key array:

```tsx
// ✅ Each product gets its own cache entry
const getCachedProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ["product", id], // ← id included in key → unique entry per product ✅
  {
    revalidate: 3600,
    tags: ["products", `product-${id}`],
  }
);
```

But wait — `id` isn't in scope when defining the wrapped function. The correct pattern:

```tsx
// ✅ Correct: create a factory that includes the id in the key
function getCachedProduct(id: string) {
  return unstable_cache(
    () => db.product.findUnique({ where: { id } }),
    ["product", id], // ← unique key per id ✅
    {
      revalidate: 3600,
      tags: ["products", `product-${id}`],
    }
  )();
}

// Usage:
const product = await getCachedProduct("prod-1"); // key: ['product', 'prod-1']
const product = await getCachedProduct("prod-2"); // key: ['product', 'prod-2']
```

### ❌ Pitfall: Calling `revalidateTag` with a tag that contains special characters

```tsx
// ❌ Tags with spaces, slashes, or special chars can cause issues
revalidateTag("user data"); // ← space in tag name
revalidateTag("products/shoes"); // ← slash in tag name
revalidateTag("category:footwear"); // ← colon in tag name
```

**Fix:** Use simple, consistent tag naming conventions — kebab-case or hyphen-separated:

```tsx
// ✅ Consistent tag naming
revalidateTag("user-data");
revalidateTag("products-shoes");
revalidateTag("category-footwear");
revalidateTag(`product-${id}`); // ← dynamic but safe format

// Convention: [resource]-[optional-modifier]-[optional-id]
// 'products'
// 'product-featured'
// `product-${id}`
// `user-${userId}-orders`
```

### ❌ Pitfall: Forgetting `unstable_cache` is a server-only utility

```tsx
"use client";
import { unstable_cache } from "next/cache"; // ❌ runtime error in browser

export function ClientComponent() {
  const getData = unstable_cache(/* ... */); // ← not available client-side
}
```

**Fix:** `unstable_cache` belongs exclusively in Server Components, Server Actions, and Route Handlers:

```tsx
// ✅ Server Component only
// src/lib/cached-queries.ts  (no 'use client' — server-only file)
import "server-only";
import { unstable_cache } from "next/cache";

export const getCachedProducts = unstable_cache(
  async () => db.product.findMany(),
  ["products-list"],
  { revalidate: 3600, tags: ["products"] }
);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a product catalog system with:

1. `getCachedProducts()` — `unstable_cache` wrapping a direct DB call, tagged `'products'`
2. `getCachedProduct(id)` — factory pattern, tagged `['products', 'product-${id}']`
3. `getCachedFeatured()` — separate unstable_cache, tagged `['products', 'featured']`
4. A `ProductsWebhookHandler` route that calls the right `revalidateTag` based on event type
5. Server Actions: `updateProduct`, `featureProduct` each calling the right tags
6. Demonstrate: one `revalidateTag('products')` clears ALL three caches simultaneously

### Solution

```tsx
// src/lib/cached-product-queries.ts
import "server-only";
import { unstable_cache } from "next/cache";

// Simulated DB
const DB = {
  products: [
    {
      id: "p1",
      name: "Air Max 90",
      price: 120,
      featured: true,
      status: "active",
    },
    {
      id: "p2",
      name: "Canvas Tote",
      price: 45,
      featured: false,
      status: "active",
    },
    { id: "p3", name: "Wool Cap", price: 35, featured: true, status: "active" },
    {
      id: "p4",
      name: "Leather Bag",
      price: 220,
      featured: false,
      status: "active",
    },
  ],
};

// ─── 1. All products — tagged 'products' ──────────────────────────────────────
export const getCachedProducts = unstable_cache(
  async () => {
    console.log("[DB] getProducts query executed");
    return DB.products.filter((p) => p.status === "active");
  },
  ["products-list"], // ← cache key
  {
    revalidate: 3600,
    tags: ["products"], // ← revalidateTag('products') clears this ✅
  }
);

// ─── 2. Single product — factory pattern with unique key per id ───────────────
export function getCachedProduct(id: string) {
  return unstable_cache(
    async () => {
      console.log(`[DB] getProduct(${id}) query executed`);
      return DB.products.find((p) => p.id === id) ?? null;
    },
    ["product", id], // ← unique cache key per product
    {
      revalidate: 3600,
      tags: ["products", `product-${id}`],
      // revalidateTag('products')      → clears ALL products ✅
      // revalidateTag('product-p1')   → clears ONLY product p1 ✅
    }
  )();
}

// ─── 3. Featured products — separate cache, tagged 'featured' too ─────────────
export const getCachedFeatured = unstable_cache(
  async () => {
    console.log("[DB] getFeatured query executed");
    return DB.products.filter((p) => p.featured && p.status === "active");
  },
  ["products-featured"], // ← separate cache key
  {
    revalidate: 1800, // ← shorter revalidation (featured changes more often)
    tags: ["products", "featured"],
    // revalidateTag('products') → clears this too ✅
    // revalidateTag('featured') → clears ONLY featured ✅
  }
);
```

```tsx
// src/app/products/actions.ts
"use server";

import { revalidateTag } from "next/cache";

// Update product — surgical: only this product + the list
export async function updateProduct(
  id: string,
  data: { name?: string; price?: number }
): Promise<{ success: boolean; message: string }> {
  try {
    // await db.product.update({ where: { id }, data })
    await new Promise((r) => setTimeout(r, 200)); // simulate DB
    console.log(`Updated product ${id}:`, data);

    revalidateTag(`product-${id}`); // ← surgical: only this product's detail page
    revalidateTag("products"); // ← list pages (name/price shown in listings)

    return { success: true, message: `Product ${id} updated` };
  } catch {
    return { success: false, message: "Update failed" };
  }
}

// Feature product — clears featured + product-specific + general list
export async function featureProduct(
  id: string,
  featured: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // await db.product.update({ where: { id }, data: { featured } })
    await new Promise((r) => setTimeout(r, 150));
    console.log(`${featured ? "Featured" : "Unfeatured"} product ${id}`);

    revalidateTag("featured"); // ← featured list changed ✅
    revalidateTag(`product-${id}`); // ← this product's detail page ✅
    // NOT revalidateTag('products') — non-featured list unchanged

    return {
      success: true,
      message: `Product ${id} ${featured ? "featured" : "unfeatured"}`,
    };
  } catch {
    return { success: false, message: "Action failed" };
  }
}

// Bulk sync — clears everything product-related at once
export async function syncAllProducts(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // await productSyncService.syncAll()
    await new Promise((r) => setTimeout(r, 800));
    console.log("Full product sync complete");

    // ONE tag to clear ALL three caches simultaneously:
    // getCachedProducts    (tagged 'products') ← cleared ✅
    // getCachedProduct(id) (tagged 'products') ← ALL cleared ✅
    // getCachedFeatured    (tagged 'products') ← cleared ✅
    revalidateTag("products");

    return { success: true, message: "All product caches cleared" };
  } catch {
    return { success: false, message: "Sync failed" };
  }
}
```

```tsx
// src/app/api/webhooks/products/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type ProductEvent =
  | { event: "product.created"; productId: string }
  | { event: "product.updated"; fields: string[]; productId: string }
  | { event: "product.deleted"; productId: string }
  | { event: "product.featured"; featured: boolean; productId: string }
  | { event: "products.synced" };

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-products-webhook-secret");
  if (secret !== process.env.PRODUCTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProductEvent;
  const revalidated: string[] = [];

  switch (body.event) {
    case "product.created":
      // New product: only list changes
      revalidateTag("products");
      revalidated.push("products");
      break;

    case "product.updated":
      // Check if featured status changed — if so, also clear featured
      if ("fields" in body && body.fields.includes("featured")) {
        revalidateTag("featured");
        revalidated.push("featured");
      }
      revalidateTag(`product-${body.productId}`);
      revalidateTag("products");
      revalidated.push(`product-${body.productId}`, "products");
      break;

    case "product.deleted":
      // Removed: clear list (detail page 404s naturally)
      revalidateTag("products");
      revalidated.push("products");
      break;

    case "product.featured":
      // Only featured status changed — surgical
      revalidateTag("featured");
      revalidateTag(`product-${body.productId}`);
      revalidated.push("featured", `product-${body.productId}`);
      break;

    case "products.synced":
      // Full sync: one tag clears all three caches
      revalidateTag("products"); // ← clears getCachedProducts ✅
      //   clears getCachedProduct(ANY id) ✅
      //   clears getCachedFeatured ✅
      revalidated.push("products (clears products + per-product + featured)");
      break;
  }

  return NextResponse.json({
    revalidated: true,
    event: body.event,
    tags: revalidated,
  });
}
```

```tsx
// src/app/products/page.tsx — demonstrates all three caches
import { Suspense } from "react";
import { getCachedProducts } from "@/lib/cached-product-queries";
import { getCachedFeatured } from "@/lib/cached-product-queries";

function FeaturedBanner({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
        Featured
      </p>
      <div className="flex gap-2 flex-wrap">
        {products.map((p) => (
          <span
            key={p.id}
            className="px-3 py-1 bg-blue-600 text-white text-sm
                           font-medium rounded-full"
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function ProductsPage() {
  // Both use unstable_cache — both tagged 'products'
  // revalidateTag('products') clears BOTH simultaneously ✅
  const [products, featured] = await Promise.all([
    getCachedProducts(),
    getCachedFeatured(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      {/* Featured — from getCachedFeatured (tags: products, featured) */}
      <FeaturedBanner products={featured} />

      {/* All products — from getCachedProducts (tag: products) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border rounded-xl p-4 bg-white">
            <p className="font-semibold text-sm">{p.name}</p>
            <p className="text-blue-600 font-bold">${p.price}</p>
            {p.featured && (
              <span className="text-xs text-amber-600 font-medium">
                ★ Featured
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  Tag invalidation map for /products page:
  ─────────────────────────────────────────────────────────────────────
  revalidateTag('products')
    → clears getCachedProducts  (all products list)     ✅
    → clears getCachedFeatured  (featured list)          ✅
    → clears getCachedProduct() (every product detail)   ✅

  revalidateTag('featured')
    → clears getCachedFeatured ONLY                      ✅

  revalidateTag('product-p1')
    → clears getCachedProduct('p1') ONLY                 ✅
  ─────────────────────────────────────────────────────────────────────
*/
```

---

---

# 8 — Opting Out of Cache — `cache: 'no-store'` and `connection()`

---

## T — TL;DR

`cache: 'no-store'` bypasses the Data Cache for a specific `fetch()` call. `connection()` (Next.js 15+) opts an entire route into dynamic rendering by signaling it depends on the incoming request. These are the two correct ways to guarantee always-fresh, per-request data.

---

## K — Key Concepts

### `cache: 'no-store'` — Skip the Data Cache

```tsx
// Bypasses the Next.js Data Cache entirely
// Every request triggers a fresh fetch to the origin

// ─── On a specific fetch call
const livePrice = await fetch("https://api.example.com/prices/BTC", {
  cache: "no-store", // ← no caching at all
});

// ─── What 'no-store' does:
// 1. Bypasses Data Cache (no read, no write)
// 2. Forces the route to be dynamically rendered per-request
// 3. Response is NOT stored in the Data Cache for future requests
// 4. Every request → origin fetch → fresh data

// ─── Compare to 'no-cache' (HTTP semantics):
fetch(url, { cache: "no-cache" });
// → Checks Data Cache but always revalidates with origin before using
// → Usually equivalent to no-store in practice in Next.js
// → 'no-store' is the recommended choice for truly fresh data
```

### When `cache: 'no-store'` Forces Dynamic Rendering

```tsx
// A route becomes DYNAMIC when ANY fetch in it uses cache: 'no-store'

// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const staticConfig = await fetch("/api/config"); // ← cached
  const liveData = await fetch("/api/live", {
    cache: "no-store", // ← forces dynamic
  });
  // Entire /dashboard route is now DYNAMIC
  // staticConfig is re-fetched on every request despite being cacheable
}

// Fix: isolate no-store fetches in Suspense-wrapped async components
// to avoid making the entire route dynamic (see Subtopic 3)
```

### `connection()` — Opt Into Dynamic Without `fetch`

```tsx
// Next.js 15+ introduces connection() from 'next/server'
// It explicitly opts a route into dynamic rendering even without
// using cookies(), headers(), or cache: 'no-store'

import { connection } from "next/server";

export default async function LiveDashboardPage() {
  // Signal: this page REQUIRES a live connection per request
  // This is semantically clearer than cache: 'no-store' on a dummy fetch
  await connection();

  // From this point on, page is guaranteed fresh per-request
  const data = await db.analytics.getLive(); // direct DB — not cached

  return <LiveDashboard data={data} />;
}

// When to use connection() vs cache: 'no-store':
// connection()        → when using direct DB (not fetch), need dynamic rendering
// cache: 'no-store'  → on specific fetch() calls where you want no caching
```

### `noStore()` — The Previous Approach (Deprecated in 15+)

```tsx
// Next.js 14 approach — still works but connection() is preferred in 15+
import { unstable_noStore as noStore } from "next/cache";

export default async function Page() {
  noStore(); // ← opt into dynamic rendering (equivalent to connection())
  const data = await db.getLiveData();
  return <div>{/* ... */}</div>;
}

// In Next.js 15+, prefer:
import { connection } from "next/server";
await connection();
```

### Combining `cache: 'no-store'` with Sensitive Data

```tsx
// Server Component — 100% safe because it runs server-side only
export default async function PrivateReportsPage() {
  // These fetches:
  // 1. Never cached (no-store)
  // 2. Run on server only (headers/tokens never exposed to browser)
  // 3. Response never stored (sensitive financial data)

  const report = await fetch(`${process.env.INTERNAL_API}/reports/monthly`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`, // ← server only
      "X-Internal-Request": "true",
    },
  });

  if (!report.ok) {
    throw new Error("Failed to fetch private report");
  }

  const data = await report.json();
  return <PrivateReport data={data} />;
}
```

### `cache: 'force-cache'` — Opt Back Into Caching

```tsx
// Explicitly force caching even if the route would be dynamic otherwise
// Useful inside dynamic routes where you still want some data cached

export default async function DynamicPageWithCachedData() {
  // This route is dynamic (cookies() elsewhere)
  // But this fetch can still be cached across requests:
  const staticCategories = await fetch("https://api.example.com/categories", {
    cache: "force-cache", // ← always cached, even in a dynamic route context
  }).then((r) => r.json());

  const liveUserData = await fetch("https://api.example.com/me", {
    cache: "no-store", // ← always fresh
  }).then((r) => r.json());

  return (
    <div>
      <CategoryFilter categories={staticCategories} />
      <UserDashboard user={liveUserData} />
    </div>
  );
}
```

### Request-Level Opt-Out Summary

```
Method                          Effect                       When to use
──────────────────────────────  ──────────────────────────   ─────────────────────────
cache: 'no-store'               Skip Data Cache for fetch    Live prices, inventory
cache: 'force-cache'            Force Data Cache for fetch   Static data in dynamic route
connection()                    Force dynamic rendering      Direct DB in dynamic route
cookies() / headers()           Auto-force dynamic           Auth, personalization
export const dynamic='force-dynamic'  Force entire route dynamic  A/B tests, personalized pages
export const revalidate = 0     Expire immediately           Near-real-time (ISR at t=0)
```

---

## W — Why It Matters

- `cache: 'no-store'` forces the entire route to be dynamic — this is the most common unintentional performance regression in Next.js apps. A single `cache: 'no-store'` fetch buried in a deeply nested component can silently convert a CDN-served static page into a per-request server render.
- `connection()` is the clean way to declare "this route is intentionally dynamic" when you're using direct database calls — it makes the intent explicit in code review, vs relying on the implicit side effect of `cache: 'no-store'`.
- Using `cache: 'force-cache'` inside a dynamic route is a practical optimization — it lets you cache static reference data (categories, config, navigation) even on pages that are dynamically rendered for user-specific content.

---

## I — Interview Q&A

### Q1: What is the difference between `cache: 'no-store'` and `cache: 'no-cache'`?

**A:** In HTTP semantics, `no-store` means "never store this response anywhere — always go to the origin." `no-cache` means "you may store the response, but always revalidate with the origin before serving it." In Next.js's Data Cache context, both effectively bypass caching for fresh data. However, `no-store` is the semantically correct and recommended choice when you want guaranteed fresh data — it clearly communicates that the response should never be cached. `no-cache` with a next.js Data Cache may behave like `no-store` in practice but carries different HTTP semantics that could affect CDN behavior.

### Q2: What does `connection()` do and when should you prefer it over `cache: 'no-store'`?

**A:** `connection()` is a Next.js 15+ API from `'next/server'` that explicitly opts a route into dynamic per-request rendering. Use it when your route uses direct database calls (not `fetch()`) and you need dynamic rendering — there's no fetch to attach `cache: 'no-store'` to, but you still need to signal to Next.js that this route must not be statically cached. It's semantically cleaner than adding a dummy `fetch` with `cache: 'no-store'` just to trigger dynamic rendering. Prefer `cache: 'no-store'` on individual `fetch()` calls; prefer `connection()` for routes using direct DB access or other non-fetch data sources.

### Q3: How can you prevent `cache: 'no-store'` from accidentally making an entire page dynamic?

**A:** Isolate the `no-store` fetch in a separate async Server Component wrapped in `<Suspense>`. The parent page exports a `revalidate` value for ISR, making its shell static. The dynamic-fetching component streams in per-request via Suspense. This is the Partial Pre-rendering pattern — the static shell loads from CDN in ~5ms, and the live section streams in independently. The key insight: `cache: 'no-store'` in a Suspense-wrapped child component doesn't force the parent page to be dynamic — it's isolated to that component's data fetch.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `cache: 'no-store'` on data that doesn't actually change per-request

```tsx
// ❌ Product categories never change per-user — no reason for no-store
const categories = await fetch("/api/categories", {
  cache: "no-store", // ← forces dynamic, fetches origin every request
  // Makes entire page dynamic — 1000 visitors = 1000 origin fetches
});
```

**Fix:** Use `revalidate` for data that changes occasionally:

```tsx
// ✅ Categories cached for 1 hour — still fresh, not dynamic
const categories = await fetch("/api/categories", {
  next: { revalidate: 3600, tags: ["categories"] },
});
```

### ❌ Pitfall: Forgetting that `cache: 'no-store'` in a layout affects all children

```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  // ❌ no-store in the layout makes EVERY dashboard route dynamic
  const user = await fetch("/api/me", { cache: "no-store" }).then((r) =>
    r.json()
  );
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}
// /dashboard, /dashboard/orders, /dashboard/settings — ALL dynamic now
```

**Fix:** Use `cookies()` + session-based lookup, which is naturally dynamic but purposeful:

```tsx
import { cookies } from "next/headers";
export default async function DashboardLayout({ children }) {
  const sessionId = (await cookies()).get("session")?.value;
  // cookies() already makes routes dynamic — no need for no-store
  const user = await getUserBySession(sessionId);
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}
```

### ❌ Pitfall: Combining `cache: 'no-store'` with `next: { revalidate }`

```tsx
// ❌ Contradictory — no-store means never cache, revalidate means cache for N seconds
const data = await fetch(url, {
  cache: "no-store",
  next: { revalidate: 60 }, // ← ignored when cache: 'no-store' is set
});
// Result: no-store wins, data is never cached, revalidate has no effect
```

**Fix:** Choose one or the other:

```tsx
// ✅ Never cache:
fetch(url, { cache: "no-store" });

// ✅ Cache for 60s:
fetch(url, { next: { revalidate: 60 } });
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/live-dashboard` page that:

1. Uses `connection()` to explicitly declare dynamic rendering
2. Has a `CurrentUserBanner` with `cache: 'no-store'` for always-fresh user data
3. Has a `CachedConfig` component with `cache: 'force-cache'` for static site config (even though the route is dynamic)
4. Has a `LiveMetrics` component with direct DB and `connection()` pattern
5. Each section is in its own Suspense with matching skeleton

### Solution

```tsx
// src/app/live-dashboard/_components/current-user-banner.tsx
// Always-fresh user data — no-store
async function getCurrentUserData() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/me`,
    { cache: "no-store" } // ← always fresh
  ).catch(() => null);

  if (!res?.ok) return null;
  return res.json() as Promise<{
    name: string;
    plan: string;
    lastLogin: string;
  }>;
}

export async function CurrentUserBanner() {
  const user = await getCurrentUserData();

  if (!user) {
    return (
      <div className="bg-gray-50 border rounded-xl px-5 py-4 text-sm text-gray-500">
        Could not load user data.
      </div>
    );
  }

  return (
    <div
      className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4
                    flex items-center justify-between"
    >
      <div>
        <p className="font-semibold text-gray-900">{user.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Plan: <span className="text-blue-600 font-medium">{user.plan}</span>
          {" · "}Last login: {user.lastLogin}
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Live
      </span>
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/_components/cached-config.tsx
// Static config — force-cache even though parent route is dynamic
async function getSiteConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/config`,
    {
      cache: "force-cache", // ← cached even in dynamic route
      next: { tags: ["site-config"] }, // ← on-demand revalidation
    }
  ).catch(() => null);

  if (!res?.ok)
    return { appName: "Dashboard", version: "1.0.0", features: [] as string[] };
  return res.json() as Promise<{
    appName: string;
    version: string;
    features: string[];
  }>;
}

export async function CachedConfig() {
  const config = await getSiteConfig();

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          App Config
        </p>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
          force-cache
        </span>
      </div>
      <p className="text-sm font-medium">
        {config.appName} v{config.version}
      </p>
      {config.features.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {config.features.map((f) => (
            <span
              key={f}
              className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/_components/live-metrics.tsx
// Direct DB — dynamic rendering via parent's connection()
async function getLiveMetrics() {
  // Direct DB call — no fetch(), no caching
  // Dynamic rendering guaranteed by connection() in the page
  await new Promise((r) => setTimeout(r, 180)); // simulate DB query
  return {
    activeUsers: 47,
    requestsPerMin: 312,
    errorRate: 0.2,
    p95Latency: 142,
  };
}

export async function LiveMetrics() {
  const metrics = await getLiveMetrics();

  const ITEMS = [
    {
      label: "Active Users",
      value: String(metrics.activeUsers),
      unit: "online",
    },
    {
      label: "Requests/min",
      value: String(metrics.requestsPerMin),
      unit: "req/min",
    },
    { label: "Error Rate", value: `${metrics.errorRate}%`, unit: "" },
    { label: "P95 Latency", value: `${metrics.p95Latency}ms`, unit: "" },
  ];

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Live Metrics</h3>
        <span
          className="text-xs bg-red-50 text-red-600 border border-red-200
                         px-2 py-0.5 rounded font-mono"
        >
          no-cache · direct DB
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {ITEMS.map((item) => (
          <div key={item.label} className="bg-white p-4">
            <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            {item.unit && <p className="text-xs text-gray-400">{item.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CurrentUserBanner } from "./_components/current-user-banner";
import { CachedConfig } from "./_components/cached-config";
import { LiveMetrics } from "./_components/live-metrics";

export const metadata: Metadata = { title: "Live Dashboard" };

export default async function LiveDashboardPage() {
  // ─── Explicitly opt into dynamic rendering ────────────────────────────────
  // Makes intent clear: this page is INTENTIONALLY per-request
  // Necessary because LiveMetrics uses direct DB (no fetch to attach no-store to)
  await connection();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Dashboard</h1>
        <div
          className="flex items-center gap-1.5 text-xs text-red-600 font-medium
                        bg-red-50 border border-red-200 px-3 py-1.5 rounded-full"
        >
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Dynamic · Per-request
        </div>
      </div>

      {/* Always-fresh user data — cache: 'no-store' */}
      <Suspense
        fallback={<div className="h-16 bg-gray-200 rounded-xl animate-pulse" />}
      >
        <CurrentUserBanner />
      </Suspense>

      <div className="grid grid-cols-3 gap-4">
        {/* Static config — force-cache even in dynamic route */}
        <Suspense
          fallback={
            <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <CachedConfig />
        </Suspense>

        {/* Live metrics — direct DB, dynamic via connection() */}
        <div className="col-span-2">
          <Suspense
            fallback={
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="h-12 bg-gray-200 animate-pulse" />
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-4 h-20 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                      <div className="h-7 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <LiveMetrics />
          </Suspense>
        </div>
      </div>

      {/* Cache strategy legend */}
      <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs space-y-1.5">
        <p className="text-gray-400 font-bold text-white mb-2">
          Cache Strategy
        </p>
        <p>
          <span className="text-red-400">connection()</span>
          <span className="text-gray-400">
            {" "}
            → page forced dynamic, renders per-request
          </span>
        </p>
        <p>
          <span className="text-yellow-400">CurrentUserBanner</span>
          <span className="text-gray-400">
            {" "}
            → cache:no-store → always fresh from origin
          </span>
        </p>
        <p>
          <span className="text-green-400">CachedConfig</span>
          <span className="text-gray-400">
            {" "}
            → cache:force-cache → cached despite dynamic route
          </span>
        </p>
        <p>
          <span className="text-cyan-400">LiveMetrics</span>
          <span className="text-gray-400">
            {" "}
            → direct DB → dynamic via connection() above
          </span>
        </p>
      </div>
    </div>
  );
}

/*
  Build output: ƒ /live-dashboard  ← Dynamic ✅ (connection() detected)

  Per-request behavior:
  → CurrentUserBanner: origin fetch every request (cache: no-store)
  → CachedConfig:      served from Data Cache (force-cache)
  → LiveMetrics:       fresh DB query every request (connection())
*/
```

---

---

# 9 — Route Segment Config — `dynamic`, `revalidate`, `fetchCache`, `runtime`

---

## T — TL;DR

Route segment config exports are special constants in `page.tsx`, `layout.tsx`, and `route.ts` files that control rendering strategy, caching behavior, runtime environment, and request timeouts for that entire route segment — overriding any per-fetch settings.

---

## K — Key Concepts

### All Route Segment Config Options

```tsx
// These are exported constants that Next.js reads at build time
// Place them at the top of page.tsx, layout.tsx, or route.ts

// ─── 1. dynamic — rendering strategy
export const dynamic = "auto"; // default: auto-detect
export const dynamic = "force-dynamic"; // always dynamic (per-request)
export const dynamic = "force-static"; // always static (ignore dynamic APIs)
export const dynamic = "error"; // throw error if dynamic APIs used

// ─── 2. revalidate — ISR interval
export const revalidate = false; // default: never auto-revalidate
export const revalidate = 0; // revalidate immediately (near-dynamic)
export const revalidate = 60; // revalidate after 60 seconds
export const revalidate = 3600; // revalidate after 1 hour
export const revalidate = Infinity; // never auto-revalidate (same as false)

// ─── 3. fetchCache — default cache behavior for ALL fetch() calls in route
export const fetchCache = "auto"; // default
export const fetchCache = "default-cache"; // cache unless fetch specifies otherwise
export const fetchCache = "only-cache"; // error if any fetch opts out of cache
export const fetchCache = "force-cache"; // force ALL fetches to use cache
export const fetchCache = "default-no-store"; // no-store unless fetch specifies otherwise
export const fetchCache = "only-no-store"; // error if any fetch uses cache
export const fetchCache = "force-no-store"; // force ALL fetches to bypass cache

// ─── 4. runtime — compute environment
export const runtime = "nodejs"; // default: Node.js runtime (full Node APIs)
export const runtime = "edge"; // Edge runtime (lighter, faster, limited APIs)

// ─── 5. preferredRegion — deployment region (Vercel-specific)
export const preferredRegion = "auto";
export const preferredRegion = "global";
export const preferredRegion = "home";
export const preferredRegion = ["iad1", "sfo1"]; // specific regions

// ─── 6. maxDuration — request timeout in seconds
export const maxDuration = 30; // default varies by plan/runtime
export const maxDuration = 300; // 5 minutes (for long-running server actions)

// ─── 7. dynamicParams — for routes with generateStaticParams
export const dynamicParams = true; // default: render unknown params on demand
export const dynamicParams = false; // 404 for params not in generateStaticParams
```

### `dynamic` — The Most Important Config

```tsx
// ─── force-dynamic: always fresh, always per-request
// src/app/admin/dashboard/page.tsx
export const dynamic = "force-dynamic";

// Use when:
// → A/B testing (different content per user)
// → Admin pages that must show latest data always
// → Pages where caching is dangerous (security)
// → You want SSR behavior equivalent to Pages Router getServerSideProps

// ─── force-static: always pre-rendered, even if dynamic APIs are present
// src/app/marketing/[locale]/page.tsx
export const dynamic = "force-static";

// Use when:
// → Locale-based pages that are identical for each locale
// → pages that technically access cookies but don't NEED to for rendering
// → Warning: cookies(), headers() return empty/undefined when force-static

// ─── error: safeguard — fail the build if dynamic APIs are accidentally used
// src/app/blog/[slug]/page.tsx
export const dynamic = "error";

// Use when:
// → You want to GUARANTEE a page is static
// → Accidental use of cookies() or headers() should be a build error
// → Good for critical marketing/landing pages
```

### `fetchCache` — Route-Level Fetch Default

```tsx
// ─── force-no-store: make ALL fetches in this route bypass cache
// src/app/admin/reports/page.tsx
export const fetchCache = "force-no-store";

// Now every fetch in this route behaves as if { cache: 'no-store' } was set
// Even if individual fetches have next: { revalidate } — all are bypassed
// Useful: admin pages where stale data is never acceptable

export default async function AdminReportsPage() {
  const report = await fetch("/api/reports/summary").then((r) => r.json());
  // ↑ behaves as cache: 'no-store' because of fetchCache: 'force-no-store'

  const audit = await fetch("/api/audit/recent").then((r) => r.json());
  // ↑ also behaves as cache: 'no-store'

  return <AdminReports report={report} audit={audit} />;
}
```

```tsx
// ─── only-cache: enforce that ALL fetches use cache (fail if any opt out)
// src/app/blog/[slug]/page.tsx
export const fetchCache = "only-cache";

// If any fetch uses cache: 'no-store' → build error
// Good for: ensuring no accidental dynamic fetches in a static page
```

### `runtime` — Node.js vs Edge

```tsx
// Node.js runtime (default):
// ✅ Full Node.js API (fs, crypto, Buffer, etc.)
// ✅ All npm packages work
// ✅ Prisma, bcrypt, etc.
// ❌ Slightly slower cold starts

// Edge runtime:
// ✅ Faster cold starts (~0ms vs ~100ms)
// ✅ Closer to users (runs at CDN edge)
// ✅ Web APIs only (fetch, Request, Response, URL, etc.)
// ❌ No Node.js APIs (no fs, no Buffer, no crypto)
// ❌ Many npm packages don't work (anything using Node built-ins)
// ❌ No Prisma, no bcrypt, no heavy libraries

// ─── Edge runtime for lightweight pages
// src/app/api/health/route.ts
export const runtime = "edge"; // fast health check endpoint

export async function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

```tsx
// ─── Edge runtime for middleware-like pages
// src/app/auth/verify/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  // JWT verification using Web Crypto API (available in Edge)
  const isValid = await verifyJWT(token);

  return NextResponse.json({ valid: isValid });
}
```

### `maxDuration` — Request Timeouts

```tsx
// src/app/api/ai/generate/route.ts
// AI generation can take minutes — increase timeout
export const maxDuration = 300; // 5 minutes (max on Vercel Pro)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const result = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return NextResponse.json({ content: result.choices[0].message.content });
}
```

```tsx
// src/app/api/pdf/export/route.ts
// PDF generation — needs more than default timeout
export const maxDuration = 60; // 1 minute
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { data } = await request.json();
  const pdf = await generatePDF(data); // can take 30-50s for large reports
  return new NextResponse(pdf, {
    headers: { "Content-Type": "application/pdf" },
  });
}
```

### Config Priority — Who Wins

```
Lowest specificity → Highest specificity
─────────────────────────────────────────────────────────────────────
fetchCache (route default)
  ↓ overridden by
individual fetch() cache option { cache: 'no-store' }
  ↓ overridden by
dynamic = 'force-dynamic' (entire route)

revalidate hierarchy (lowest value wins):
  route segment revalidate: 3600
    ↓ a fetch with revalidate: 60
      → route uses 60 (fastest wins)
```

---

## W — Why It Matters

- `dynamic = 'error'` is the underused guardian for critical static pages — if someone accidentally adds `cookies()` to a marketing landing page or blog post, the build fails immediately instead of silently degrading performance in production.
- `fetchCache = 'force-no-store'` is cleaner than adding `cache: 'no-store'` to every fetch in an admin page — a single export at the top of the file ensures every data fetch in the route is always fresh without having to audit each fetch call.
- The `runtime = 'edge'` choice is a performance optimization for appropriate routes — lightweight API endpoints and auth-related routes see significant cold start improvements on edge runtimes, but it requires careful attention to which npm packages and Node APIs are being used.

---

## I — Interview Q&A

### Q1: What is the difference between `dynamic = 'force-dynamic'` and `cache: 'no-store'` on a fetch?

**A:** `dynamic = 'force-dynamic'` is a route-level declaration that forces the entire route to render dynamically on every request — it affects the Full Route Cache, the rendering pipeline, and signals to Next.js that this route should never be pre-rendered. `cache: 'no-store'` on a fetch is a data-level directive that bypasses the Data Cache for that specific HTTP request — as a side effect, it also forces the route to be dynamic. The difference: `force-dynamic` is an explicit, intentional architectural decision visible at a glance; `cache: 'no-store'` is a per-fetch optimization that has a route-level side effect. Use `force-dynamic` when the whole page should be dynamic; use `cache: 'no-store'` when specific data needs to bypass the cache.

### Q2: When should you choose `runtime = 'edge'` over the default Node.js runtime?

**A:** Use Edge runtime for lightweight, latency-sensitive routes that don't need Node.js APIs — simple API endpoints, authentication token verification, geolocation-based redirects, and feature flag lookups. The benefits are faster cold starts (~0ms vs ~100ms for Node.js) and closer proximity to users. Avoid Edge runtime when your code uses Node.js built-ins (`fs`, `Buffer`, `crypto`), Prisma, bcrypt, or any npm package that depends on Node.js internals — these will fail silently or throw at runtime in Edge. When in doubt, use Node.js; only switch to Edge after profiling confirms cold starts are a meaningful bottleneck.

### Q3: What does `dynamic = 'error'` do and when is it useful?

**A:** `dynamic = 'error'` tells Next.js to throw a build-time error if the route uses any dynamic APIs — `cookies()`, `headers()`, `searchParams`, or `cache: 'no-store'`. It's a static correctness guarantee — if someone modifies a route that must be static and accidentally introduces dynamic behavior, the build fails immediately with a clear error rather than silently converting a CDN-served page into a per-request server render. Use it for critical static pages like landing pages, blog posts, and documentation where static rendering is a performance requirement that must not be accidentally broken.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting `runtime = 'edge'` and using Prisma or Node.js APIs

```tsx
// ❌ Prisma uses Node.js internals — not available in Edge runtime
export const runtime = "edge";

export default async function Page() {
  const users = await db.user.findMany(); // ← Prisma fails in Edge
  // Error: "PrismaClient is not available in Edge runtime"
}
```

**Fix:** Only use Edge runtime for routes that are truly edge-compatible:

```tsx
// ✅ Keep Node.js for DB access
export const runtime = "nodejs"; // default — Prisma works fine

// ✅ OR: move DB query to a separate Node.js API route, fetch from Edge
export const runtime = "edge";
const users = await fetch("/api/users").then((r) => r.json()); // calls Node.js API
```

### ❌ Pitfall: Setting `revalidate = false` thinking it means "dynamic"

```tsx
// ❌ false means "never auto-revalidate" — not "always dynamic"
export const revalidate = false;

// This means the page is STATIC and only revalidated manually
// It does NOT mean "render per-request"
// For dynamic: use dynamic = 'force-dynamic'
```

**Fix:**

```tsx
export const dynamic = "force-dynamic"; // ← truly dynamic ✅
// OR
export const revalidate = 0; // ← expire immediately (near-dynamic) ✅
```

### ❌ Pitfall: Using `fetchCache = 'force-no-store'` on pages that should be static

```tsx
// ❌ Entire blog post route becomes dynamic — defeats ISR
// src/app/blog/[slug]/page.tsx
export const fetchCache = "force-no-store"; // ← ALL fetches bypass cache
// Blog post re-renders on every request — no CDN benefit
```

**Fix:** Only use `force-no-store` for intentionally dynamic routes like admin pages:

```tsx
// ✅ Blog post uses ISR
// src/app/blog/[slug]/page.tsx
export const revalidate = 3600; // ← ISR ✅

// ✅ Admin page uses force-no-store
// src/app/admin/reports/page.tsx
export const fetchCache = "force-no-store"; // ← always fresh ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create three routes that each demonstrate a different segment config combination:

1. `/blog/[slug]` — `dynamic: 'error'` + `revalidate: 3600` (must be static, fail on dynamic APIs)
2. `/admin/reports` — `dynamic: 'force-dynamic'` + `fetchCache: 'force-no-store'` (always fresh)
3. `/api/health` — `runtime: 'edge'` + `dynamic: 'force-static'` (fastest possible health check)

### Solution

```tsx
// src/app/blog/[slug]/page.tsx
// ─── Config: static correctness guarantee ─────────────────────────────────────
export const dynamic = "error"; // ← BUILD FAILS if dynamic APIs used accidentally
export const revalidate = 3600; // ← ISR: 1 hour

// If a developer adds cookies() here → build error:
// "Route /blog/[slug] with `dynamic = "error"` cannot use dynamic APIs"

import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

const POSTS: Record<string, { title: string; body: string }> = {
  "nextjs-16": { title: "Next.js 16 Guide", body: "Content..." },
  "typescript-6": { title: "TypeScript 6 Guide", body: "Content..." },
};

export async function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: POSTS[slug]?.title ?? "Post Not Found" };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-2">
        <span className="text-xs text-green-600 font-mono bg-green-50 px-2 py-0.5 rounded">
          dynamic=error · revalidate=3600
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-600">{post.body}</p>
    </article>
  );
}
```

```tsx
// src/app/admin/reports/page.tsx
// ─── Config: always fresh, no caching at all ──────────────────────────────────
export const dynamic = "force-dynamic"; // ← per-request rendering
export const fetchCache = "force-no-store"; // ← all fetches bypass cache

// No need to add cache: 'no-store' to individual fetches —
// fetchCache: 'force-no-store' handles them all

async function getReportSummary() {
  // In production: await db.reports.getSummary()
  return {
    totalRevenue: 78400,
    totalOrders: 531,
    avgOrderValue: 147,
    generatedAt: new Date().toISOString(), // ← changes every render → proves dynamic
  };
}

async function getRecentAuditLog() {
  return [
    { id: 1, action: "Product updated", user: "admin@co.com", at: "2m ago" },
    { id: 2, action: "User role changed", user: "admin@co.com", at: "14m ago" },
    { id: 3, action: "Order refunded", user: "support@co.com", at: "1h ago" },
  ];
}

export default async function AdminReportsPage() {
  const [summary, auditLog] = await Promise.all([
    getReportSummary(),
    getRecentAuditLog(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Reports</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">
            force-dynamic · fetchCache=force-no-store
          </span>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Report Summary</h2>
          <p className="text-xs text-gray-400 font-mono">
            Generated: {new Date(summary.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Revenue",
              value: `$${summary.totalRevenue.toLocaleString()}`,
            },
            { label: "Orders", value: String(summary.totalOrders) },
            { label: "Avg Order", value: `$${summary.avgOrderValue}` },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Audit Log</h2>
        </div>
        <ul className="divide-y">
          {auditLog.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{entry.action}</p>
                <p className="text-xs text-gray-400">{entry.user}</p>
              </div>
              <span className="text-xs text-gray-400">{entry.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

```tsx
// src/app/api/health/route.ts
// ─── Config: fastest possible response ────────────────────────────────────────
export const runtime = "edge"; // ← ~0ms cold start
export const dynamic = "force-static"; // ← cached at CDN edge, instant

import { NextResponse } from "next/server";

// Health check — built at deploy time, served from edge cache
// Response time: ~1ms from CDN edge worldwide
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "acme-api",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Runtime": "edge",
      },
    }
  );
}

/*
  Expected behavior:
  ─────────────────────────────────────────────────────────
  /api/health GET
    → runtime: edge     → cold start ~0ms ✅
    → force-static      → cached at edge CDN ✅
    → Response: ~1ms from nearest edge location ✅
    → Cache-Control: serves cached response for 60s,
      stale-while-revalidate for 5 minutes ✅
*/
```

---

---

# 10 — `generateStaticParams` — Static Path Generation

---

## T — TL;DR

`generateStaticParams` tells Next.js which dynamic route segments to pre-build at `next build`. Instead of rendering `/products/[id]` on first request, you pre-generate known product pages as static HTML — instant CDN delivery from the first visitor. Unknown params can still render on-demand via `dynamicParams`.

---

## K — Key Concepts

### Basic `generateStaticParams`

```tsx
// src/app/products/[id]/page.tsx
// Without generateStaticParams: every /products/:id renders on first request
// With generateStaticParams: known products pre-built at next build

export async function generateStaticParams() {
  // This runs at BUILD TIME only — never at request time
  // Returns an array of param objects matching the dynamic segment
  return [{ id: "product-1" }, { id: "product-2" }, { id: "product-3" }];
}

// At next build: generates /products/product-1, /products/product-2, /products/product-3
// Build output:
// ● /products/[id]
//    ├── /products/product-1
//    ├── /products/product-2
//    └── /products/product-3
```

### Fetching Params from a Database or API

```tsx
// src/app/products/[id]/page.tsx
// In production: always fetch from your real data source at build time

export async function generateStaticParams() {
  // ─── Option A: direct DB query at build time
  const products = await db.product.findMany({
    where: { status: "active" },
    select: { id: true }, // ← only fetch IDs — minimize build-time data
  });
  return products.map((p) => ({ id: p.id }));

  // ─── Option B: fetch from CMS/API at build time
  const res = await fetch("https://cms.example.com/products?fields=id");
  const products = await res.json();
  return products.map((p: { id: string }) => ({ id: p.id }));
}
```

### `dynamicParams` — Handle Unknown Params

```tsx
// src/app/products/[id]/page.tsx

// ─── dynamicParams = true (DEFAULT)
// Unknown params: render on first request → cache → ISR from then on
export const dynamicParams = true;

// ─── dynamicParams = false
// Unknown params: return 404 immediately
export const dynamicParams = false;

// When to use false:
// → Finite sets of known pages (country codes, language codes, category slugs)
// → Any unknown param is genuinely invalid (shouldn't return content)
// → Security: prevent arbitrary param exploration
export const dynamicParams = false; // ← unknown country code = 404, not a render

export async function generateStaticParams() {
  return ["us", "gb", "de", "fr", "au"].map((code) => ({ country: code }));
}
```

### Nested Dynamic Routes — Multiple Segments

```tsx
// src/app/blog/[category]/[slug]/page.tsx
// Two dynamic segments: category AND slug

export async function generateStaticParams() {
  // Return all category+slug combinations
  const posts = await db.post.findMany({
    select: { category: { select: { slug: true } }, slug: true },
  });

  return posts.map((post) => ({
    category: post.category.slug, // ← matches [category]
    slug: post.slug, // ← matches [slug]
  }));
}

// Generates:
// /blog/nextjs/server-components
// /blog/react/hooks-guide
// /blog/typescript/generics
```

### Combining with `generateMetadata`

```tsx
// src/app/products/[id]/page.tsx
// Both generateStaticParams and generateMetadata can share the same data fetch
// Use React.cache() to deduplicate the DB call

import { cache } from "react";

// Deduplicates: generateMetadata AND page component both call this
// At build time: each param set calls this once
const getProduct = cache(async (id: string) => {
  return db.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      image: true,
    },
  });
});

type Params = Promise<{ id: string }>;

export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { status: "active" },
    select: { id: true },
  });
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProduct(id); // ← cache() hit if page called first
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProduct(id); // ← cache() hit if metadata called first
  if (!product) notFound();
  return <ProductView product={product} />;
}
```

### `generateStaticParams` with `revalidate` — ISR at Scale

```tsx
// src/app/products/[id]/page.tsx
// Pre-build + ISR: best of static performance with freshness

export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { status: "active" },
    select: { id: true },
  });
  return products.map((p) => ({ id: p.id }));
}

export const revalidate = 1800; // ← pre-built pages refresh every 30 min
export const dynamicParams = true; // ← new products render on first request, then ISR

// Build output:
// ● /products/[id]
//   ├── /products/prod-001  (pre-built, ISR 30min)
//   ├── /products/prod-002  (pre-built, ISR 30min)
//   └── ...

// New product added after build:
// GET /products/prod-999 → renders dynamically (first visit)
// GET /products/prod-999 → cached → ISR from then on ✅
```

### Limiting Pre-builds for Large Catalogs

```tsx
// src/app/products/[id]/page.tsx
// Don't pre-build ALL 50,000 products — only the top-viewed ones

export async function generateStaticParams() {
  // ─── Strategy A: only top N products
  const topProducts = await db.product.findMany({
    where: { status: "active" },
    orderBy: { viewCount: "desc" },
    take: 500, // ← pre-build top 500 only
    select: { id: true },
  });
  return topProducts.map((p) => ({ id: p.id }));

  // ─── Strategy B: only recently updated products
  const recent = await db.product.findMany({
    where: {
      status: "active",
      updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  return recent.map((p) => ({ id: p.id }));
}

export const dynamicParams = true; // ← ALL other products render on first request
// Long tail products: first visitor pays 100-200ms render cost, everyone after: CDN
```

### Parent `generateStaticParams` — Inheriting to Children

```tsx
// If a PARENT segment has generateStaticParams,
// CHILD segments can access parent params and generate their own

// src/app/countries/[country]/page.tsx
export async function generateStaticParams() {
  return ["us", "gb", "de"].map((country) => ({ country }));
}

// src/app/countries/[country]/cities/[city]/page.tsx
// Child can reference parent params!
export async function generateStaticParams({
  params,
}: {
  params: { country: string };
}) {
  // params.country is available from the parent's generateStaticParams
  const cities = await db.city.findMany({
    where: { countryCode: params.country },
    select: { slug: true },
  });
  return cities.map((c) => ({ city: c.slug }));
}

// Generates:
// /countries/us/cities/new-york
// /countries/us/cities/los-angeles
// /countries/gb/cities/london
// /countries/gb/cities/manchester
// /countries/de/cities/berlin
// /countries/de/cities/munich
```

---

## W — Why It Matters

- `generateStaticParams` is what makes a product catalog or blog site scale to millions of pages without server costs — each pre-built page is a static HTML file served from a CDN, not a server that hits your database on every request.
- The `dynamicParams = false` safety net is important for finite sets — country codes, language codes, and category slugs have a known fixed set. Returning 404 for unknown params prevents crawlers, attackers, and typos from triggering unnecessary server renders.
- The `take: N` pattern for large catalogs is a production best practice — pre-building top 500 products gets CDN-speed for 80% of traffic (long-tail Pareto distribution), while `dynamicParams = true` handles the remaining 20% on first access.

---

## I — Interview Q&A

### Q1: What does `generateStaticParams` do and when should you use it?

**A:** `generateStaticParams` runs at build time and returns an array of parameter objects for dynamic route segments. Next.js uses these to pre-render those specific pages as static HTML during `next build`. Use it for any dynamic route that has a known, finite (or reasonably-sized) set of values: product pages, blog posts, documentation articles, user profiles, category pages. The result: pages load from CDN in ~5ms instead of waiting for a server render. Combine with `revalidate` for ISR — pages are pre-built and automatically refreshed. Use `dynamicParams = true` to allow new pages to render on first visit.

### Q2: What is the difference between `dynamicParams = true` and `dynamicParams = false`?

**A:** When a route has `generateStaticParams`, only the returned param combinations are pre-built. `dynamicParams = true` (the default) means: if a user visits a URL with params NOT in `generateStaticParams`, Next.js renders the page dynamically on first request, then caches it for subsequent requests (ISR if `revalidate` is set). `dynamicParams = false` means: any URL with params not in `generateStaticParams` returns 404 immediately. Use `false` for truly finite sets where unknown values are invalid — country codes, language locales. Use `true` for growing catalogs where new items should work automatically.

### Q3: How does `generateStaticParams` interact with `revalidate`?

**A:** They work together to create "ISR at scale." `generateStaticParams` pre-builds pages at build time — the initial static HTML is generated once. `revalidate` adds automatic freshness — after the specified seconds elapse, the next request to a stale page triggers a background re-render, and all subsequent requests get the fresh version. The combination means: fast CDN delivery from the first request (generateStaticParams), plus automatic content updates without rebuilding (revalidate). New pages added after the build are handled by `dynamicParams = true` — they're rendered on first request and then ISR-cached.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Fetching ALL records in `generateStaticParams` for a large catalog

```tsx
// ❌ 100,000 products → 100,000 pages built → build takes 2+ hours
export async function generateStaticParams() {
  const products = await db.product.findMany({
    select: { id: true }, // fetches ALL 100k products
  });
  return products.map((p) => ({ id: p.id }));
}
```

**Fix:** Limit to top-traffic pages — let the rest render on demand:

```tsx
// ✅ Pre-build top 500, let the rest use dynamicParams = true
export const dynamicParams = true; // ← long tail renders on first request

export async function generateStaticParams() {
  return db.product
    .findMany({
      orderBy: { viewCount: "desc" },
      take: 500,
      select: { id: true },
    })
    .then((products) => products.map((p) => ({ id: p.id })));
}
```

### ❌ Pitfall: Not returning ALL required segments in `generateStaticParams`

```tsx
// ─── Route: /blog/[category]/[slug]/page.tsx
// ❌ Missing 'category' in the return — only returns slug
export async function generateStaticParams() {
  const posts = await db.post.findMany();
  return posts.map((p) => ({ slug: p.slug })); // ← missing category!
}
// Error: "generateStaticParams return value missing key 'category'"
```

**Fix:** Return ALL dynamic segment keys:

```tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({
    include: { category: true },
  });
  return posts.map((p) => ({
    category: p.category.slug, // ← required ✅
    slug: p.slug, // ← required ✅
  }));
}
```

### ❌ Pitfall: Using request-specific data in `generateStaticParams`

```tsx
// ❌ generateStaticParams runs at BUILD TIME — no request context
import { cookies } from "next/headers";

export async function generateStaticParams() {
  const userId = (await cookies()).get("userId"); // ← no cookies at build time!
  const userProducts = await db.product.findMany({
    where: { ownerId: userId?.value },
  });
  return userProducts.map((p) => ({ id: p.id }));
  // cookies() throws at build time — no incoming request
}
```

**Fix:** `generateStaticParams` must use only build-time data:

```tsx
// ✅ No request context — fetch all public pages
export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { status: "public" }, // ← public data only
    select: { id: true },
  });
  return products.map((p) => ({ id: p.id }));
}
// User-specific filtering happens in the page component at request time
```

### ❌ Pitfall: Forgetting `notFound()` when `dynamicParams = false`

```tsx
export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: "prod-1" }, { id: "prod-2" }];
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  // ❌ product is null for params not in generateStaticParams
  // But with dynamicParams = false, this code never runs for unknown IDs
  // Still good practice to guard:
  if (!product) notFound(); // ← always guard ✅

  return <ProductView product={product} />;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `/docs/[category]/[article]` documentation site that:

1. `generateStaticParams` in the `[category]` segment pre-builds 3 categories
2. `generateStaticParams` in the `[article]` segment uses parent `params.category` to fetch articles
3. `dynamicParams = false` on articles (unknown articles = 404)
4. `revalidate = 86400` (24h ISR) on both segments
5. `notFound()` for missing categories and articles
6. `generateMetadata` using `React.cache()` for deduplication
7. A complete article page with breadcrumb navigation

### Solution

```tsx
// src/app/docs/[category]/page.tsx
// Category overview page — lists articles in the category

export const revalidate = 86400; // 24h ISR
export const dynamicParams = false; // unknown categories = 404

const CATEGORIES: Record<string, { title: string; description: string }> = {
  "getting-started": {
    title: "Getting Started",
    description: "Installation, setup, and your first project.",
  },
  "core-concepts": {
    title: "Core Concepts",
    description: "Fundamental concepts for building with Next.js 16.",
  },
  "api-reference": {
    title: "API Reference",
    description: "Complete reference for all Next.js APIs.",
  },
};

export async function generateStaticParams() {
  // Pre-builds: /docs/getting-started, /docs/core-concepts, /docs/api-reference
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

type CategoryParams = Promise<{ category: string }>;

export async function generateMetadata({ params }: { params: CategoryParams }) {
  const { category } = await params;
  const cat = CATEGORIES[category];
  return { title: cat?.title ?? "Category Not Found" };
}

export default async function CategoryPage({
  params,
}: {
  params: CategoryParams;
}) {
  const { category } = await params;
  const cat = CATEGORIES[category];
  if (!cat) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="text-xs text-blue-600 font-medium mb-2">Documentation</p>
      <h1 className="text-3xl font-bold mb-2">{cat.title}</h1>
      <p className="text-gray-500 mb-8">{cat.description}</p>
      <a
        href={`/docs/${category}/introduction`}
        className="text-blue-600 hover:underline text-sm"
      >
        → Start with Introduction
      </a>
    </div>
  );
}
```

```tsx
// src/app/docs/[category]/[article]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export const revalidate = 86400; // 24h ISR
export const dynamicParams = false; // ← unknown articles = 404 immediately

// ─── Mock article database ────────────────────────────────────────────────────
const ARTICLES: Record<
  string,
  Record<
    string,
    {
      title: string;
      content: string;
      prev?: { slug: string; title: string };
      next?: { slug: string; title: string };
    }
  >
> = {
  "getting-started": {
    introduction: {
      title: "Introduction",
      content:
        "Next.js 16 is a React framework that enables server-side rendering, static generation, and more.",
      next: { slug: "installation", title: "Installation" },
    },
    installation: {
      title: "Installation",
      content:
        "Install Next.js 16 with: npx create-next-app@latest --typescript",
      prev: { slug: "introduction", title: "Introduction" },
      next: { slug: "project-structure", title: "Project Structure" },
    },
    "project-structure": {
      title: "Project Structure",
      content:
        "Understanding the app/ directory, components/, and lib/ folders.",
      prev: { slug: "installation", title: "Installation" },
    },
  },
  "core-concepts": {
    "server-components": {
      title: "Server Components",
      content:
        "Server Components run on the server and send zero JavaScript to the client.",
      next: { slug: "client-components", title: "Client Components" },
    },
    "client-components": {
      title: "Client Components",
      content:
        "Mark a component with 'use client' to enable React hooks and browser APIs.",
      prev: { slug: "server-components", title: "Server Components" },
    },
  },
  "api-reference": {
    fetch: {
      title: "fetch()",
      content:
        "The enhanced fetch() API with next.revalidate and next.tags options.",
      next: { slug: "revalidatepath", title: "revalidatePath" },
    },
    revalidatepath: {
      title: "revalidatePath()",
      content: "Purges the Full Route Cache for a specific path on demand.",
      prev: { slug: "fetch", title: "fetch()" },
      next: { slug: "revalidatetag", title: "revalidateTag()" },
    },
    revalidatetag: {
      title: "revalidateTag()",
      content: "Purges all Data Cache entries with a specific tag.",
      prev: { slug: "revalidatepath", title: "revalidatePath()" },
    },
  },
};

// ─── Cached data fetcher — deduplicates across generateMetadata + page ─────────
const getArticle = cache(async (category: string, article: string) => {
  return ARTICLES[category]?.[article] ?? null;
});

// ─── Pre-build ALL known category+article combinations ────────────────────────
type ParentParams = { category: string };

export async function generateStaticParams({
  params,
}: {
  params: ParentParams;
}) {
  const { category } = params;

  // Uses parent params.category to fetch only THIS category's articles
  const articles = ARTICLES[category];
  if (!articles) return [];

  return Object.keys(articles).map((article) => ({ article }));
}

// Generated paths:
// /docs/getting-started/introduction       ✅
// /docs/getting-started/installation       ✅
// /docs/getting-started/project-structure  ✅
// /docs/core-concepts/server-components    ✅
// /docs/core-concepts/client-components    ✅
// /docs/api-reference/fetch                ✅
// /docs/api-reference/revalidatepath       ✅
// /docs/api-reference/revalidatetag        ✅

type ArticleParams = Promise<{ category: string; article: string }>;

// ─── Dynamic metadata — cache() deduplicates with page component ──────────────
export async function generateMetadata({
  params,
}: {
  params: ArticleParams;
}): Promise<Metadata> {
  const { category, article } = await params;
  const doc = await getArticle(category, article); // ← cache hit if page runs first
  if (!doc) return { title: "Article Not Found" };
  return {
    title: `${doc.title} — Docs`,
    description: doc.content.slice(0, 120),
  };
}

// ─── Article page ─────────────────────────────────────────────────────────────
export default async function ArticlePage({
  params,
}: {
  params: ArticleParams;
}) {
  const { category, article } = await params;
  const doc = await getArticle(category, article); // ← cache hit from metadata

  if (!doc) notFound();

  // Category display name
  const CATEGORY_NAMES: Record<string, string> = {
    "getting-started": "Getting Started",
    "core-concepts": "Core Concepts",
    "api-reference": "API Reference",
  };
  const categoryName = CATEGORY_NAMES[category] ?? category;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-8">
        <a href="/docs" className="hover:text-gray-800">
          Docs
        </a>
        <span>/</span>
        <a href={`/docs/${category}`} className="hover:text-gray-800">
          {categoryName}
        </a>
        <span>/</span>
        <span className="text-gray-900 font-medium">{doc.title}</span>
      </nav>

      {/* Article content */}
      <article>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{doc.title}</h1>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 leading-relaxed text-lg">{doc.content}</p>
        </div>
      </article>

      {/* ISR + static config badge — dev only */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="mt-6 text-xs font-mono bg-gray-900 text-green-400
                        rounded-lg px-4 py-3 space-y-1"
        >
          <p className="text-white font-bold">Static Config</p>
          <p>revalidate: 86400 (24h ISR)</p>
          <p>dynamicParams: false (unknown articles → 404)</p>
          <p>cache: React.cache() deduplicates generateMetadata + page</p>
        </div>
      )}

      {/* Prev/Next navigation */}
      <nav className="flex items-center justify-between mt-12 pt-6 border-t">
        {doc.prev ? (
          <a
            href={`/docs/${category}/${doc.prev.slug}`}
            className="flex items-center gap-2 text-sm text-blue-600
                        hover:text-blue-800 transition-colors"
          >
            <span>←</span>
            <span>{doc.prev.title}</span>
          </a>
        ) : (
          <div />
        )}

        {doc.next ? (
          <a
            href={`/docs/${category}/${doc.next.slug}`}
            className="flex items-center gap-2 text-sm text-blue-600
                        hover:text-blue-800 transition-colors"
          >
            <span>{doc.next.title}</span>
            <span>→</span>
          </a>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
}

/*
  Build output expected:
  ──────────────────────────────────────────────────────────────────────────
  ● /docs/[category]                       ISR revalidate=86400
    ├── /docs/getting-started
    ├── /docs/core-concepts
    └── /docs/api-reference

  ● /docs/[category]/[article]             ISR revalidate=86400
    ├── /docs/getting-started/introduction
    ├── /docs/getting-started/installation
    ├── /docs/getting-started/project-structure
    ├── /docs/core-concepts/server-components
    ├── /docs/core-concepts/client-components
    ├── /docs/api-reference/fetch
    ├── /docs/api-reference/revalidatepath
    └── /docs/api-reference/revalidatetag

  dynamicParams = false on both segments:
    → /docs/unknown-category          → 404 ✅
    → /docs/getting-started/unknown   → 404 ✅
    → No server renders for invalid paths ✅

  React.cache() deduplication:
    → generateMetadata(category, article) calls getArticle() → DB/ARTICLES lookup
    → ArticlePage(category, article)     calls getArticle() → cache HIT
    → Total: 1 lookup per article page render ✅
*/
```

---

## ✅ Day 7 Complete — Data Fetching and Cache Strategy

| #   | Subtopic                                                                | Status |
| --- | ----------------------------------------------------------------------- | ------ |
| 1   | `fetch` in Server Components — Basics and Cache Options                 | ☐      |
| 2   | Sequential vs Parallel Data Fetching                                    | ☐      |
| 3   | Static vs Dynamic Rendering — How Fetching Drives It                    | ☐      |
| 4   | The Next.js Cache Layers — Full Mental Model                            | ☐      |
| 5   | Time-Based Revalidation — `revalidate` and ISR                          | ☐      |
| 6   | `revalidatePath` — On-Demand Path Invalidation                          | ☐      |
| 7   | `revalidateTag` and `unstable_cache` — Tag-Based Invalidation           | ☐      |
| 8   | Opting Out of Cache — `cache: 'no-store'` and `connection()`            | ☐      |
| 9   | Route Segment Config — `dynamic`, `revalidate`, `fetchCache`, `runtime` | ☐      |
| 10  | `generateStaticParams` — Static Path Generation                         | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 7

```
FETCH CACHE OPTIONS (in Server Components)
  fetch(url)                              → default: cached indefinitely
  fetch(url, {cache:'no-store'})          → never cached, forces dynamic
  fetch(url, {cache:'force-cache'})       → always cached (even in dynamic routes)
  fetch(url, {next:{revalidate:N}})       → ISR: cached, refreshed after N seconds
  fetch(url, {next:{tags:['tag']}})       → tagged: on-demand via revalidateTag
  fetch(url, {next:{revalidate:N,tags}})  → ISR + on-demand (belt-and-suspenders)
  Combine with response.ok check — always validate before .json()

SEQUENTIAL vs PARALLEL
  Sequential: each await blocks next → use ONLY when B needs A's result
  Parallel:   Promise.all([A,B,C])  → total = max(A,B,C), not sum
  Best:       independent Suspense boundaries → parallel + streaming
  allSettled: graceful degradation — one failure doesn't block others
  Pattern:    sequential chain → parallel fan-out

WHAT TRIGGERS DYNAMIC RENDERING
  cookies()           from 'next/headers'
  headers()           from 'next/headers'
  searchParams        as page prop
  cache: 'no-store'   on any fetch
  connection()        from 'next/server' (explicit opt-in)
  force-dynamic       export const dynamic = 'force-dynamic'

THE FOUR CACHE LAYERS
  1. Request Memoization  → per-request dedup of identical fetch() calls
                             automatic, resets each request
  2. Data Cache           → persistent fetch() response store
                             cleared by revalidatePath/Tag or deploy
  3. Full Route Cache     → pre-built HTML for static routes
                             cleared by revalidation or deploy
  4. Router Cache         → browser-side RSC payload
                             cleared by router.refresh() or navigation

INVALIDATION TOOLS
  revalidatePath('/path')           → clear specific URL
  revalidatePath('/path','layout')  → clear URL + all child routes
  revalidatePath('/[seg]','page')   → clear all matching dynamic pages
  revalidateTag('tag')              → clear ALL data tagged with 'tag'
  router.refresh()                  → clear browser Router Cache (client-side)
  For full update: revalidatePath/Tag on server + router.refresh() on client

unstable_cache
  Applies Next.js cache semantics to NON-fetch async functions (direct DB)
  unstable_cache(fn, keyArray, { revalidate, tags })
  ALWAYS include dynamic params in keyArray to avoid cache collisions
  Server-only — cannot use in Client Components

REVALIDATE VALUES
  false      → never auto-revalidate (manual/on-demand only)
  0          → expire immediately (near-real-time)
  N          → expire after N seconds (ISR)
  Infinity   → same as false
  Lowest value in a route wins (fetch-level overrides route-level)

ROUTE SEGMENT CONFIG
  dynamic:    'auto'|'force-dynamic'|'force-static'|'error'
  revalidate: false|0|N|Infinity
  fetchCache: 'auto'|'force-cache'|'force-no-store'|'only-cache'|...
  runtime:    'nodejs'|'edge'
  maxDuration: N (seconds, for long-running route handlers)
  dynamicParams: true|false (default:true — false → 404 for unknown params)

generateStaticParams
  Runs at BUILD TIME only — pre-renders known dynamic segments
  Returns: array of { [segment]: value } objects
  MUST include ALL dynamic segment keys
  Combine with revalidate for ISR on pre-built pages
  dynamicParams=true  → unknown params render on demand then cache
  dynamicParams=false → unknown params return 404
  Limit pre-builds for large catalogs: top-N strategy + dynamicParams=true
  Use React.cache() in page + generateMetadata to deduplicate fetches

STRATEGY DECISION CHEAT SHEET
  Marketing page        → static (default)
  Blog post             → ISR (revalidate=3600)
  Product detail        → ISR + dynamic stock badge (Suspense isolation)
  Dashboard             → dynamic (cookies/session)
  Search results        → dynamic (searchParams)
  Admin page            → force-dynamic + fetchCache=force-no-store
  Live metrics          → connection() + direct DB
  Docs/reference        → generateStaticParams + dynamicParams=false
  Large catalog         → generateStaticParams(top-N) + dynamicParams=true
  Health check API      → runtime=edge + force-static
  AI/long-running API   → runtime=nodejs + maxDuration=300
```

---

> **Your next action:** Open your Next.js project. Run `next build` and look at the output symbols — find one route showing `ƒ` (dynamic) that you expected to be `●` (ISR). Check if it's using `cookies()`, `headers()`, `searchParams`, or `cache: 'no-store'`. If it's unintentional, remove the trigger and add `export const revalidate = 3600`. Run `next build` again and confirm it shows `●`.
>
> _Doing one small thing beats opening a feed._

```tsx
// ❌ Same cache key for all products — they overwrite each other
const getCachedProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ['product'],         // ← same
```
