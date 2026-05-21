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
