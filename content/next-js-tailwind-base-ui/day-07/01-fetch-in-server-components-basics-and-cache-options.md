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
