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
