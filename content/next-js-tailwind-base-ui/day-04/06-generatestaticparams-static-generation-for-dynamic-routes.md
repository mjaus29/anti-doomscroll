# 6 — `generateStaticParams` — Static Generation for Dynamic Routes

---

## T — TL;DR

`generateStaticParams` tells Next.js which dynamic route values to **pre-render at build time** (`next build`). Without it, dynamic routes are rendered on every request (SSR). With it, they're built once as static HTML — instant loads, no server needed at runtime.

---

## K — Key Concepts

### The Problem It Solves

```
Without generateStaticParams:
  /products/[id] → renders on EVERY request
  User visits /products/42 → server executes, DB query, generates HTML → 200ms

With generateStaticParams:
  /products/[id] → pre-built at `next build` for known IDs
  User visits /products/42 → serves pre-built static HTML → <10ms
  /products/999 (unknown at build time) → renders on-demand OR 404
```

### Basic Syntax

```tsx
// src/app/products/[id]/page.tsx

export async function generateStaticParams() {
  // Runs at BUILD time — fetch all product IDs
  const products = await db.product.findMany({
    select: { id: true },
  });

  // Return array of params objects
  return products.map((product) => ({
    id: product.id, // ← must match the dynamic segment name [id]
  }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  return <div>{product?.name}</div>;
}
```

### Multiple Dynamic Segments

```tsx
// src/app/blog/[category]/[slug]/page.tsx

export async function generateStaticParams() {
  const posts = await db.post.findMany({
    select: { category: true, slug: true },
  });

  return posts.map((post) => ({
    category: post.category, // ← must match [category]
    slug: post.slug, // ← must match [slug]
  }));
}

// Returns:
// [
//   { category: 'tech',      slug: 'nextjs-16-guide' },
//   { category: 'business',  slug: 'startup-lessons' },
//   { category: 'tech',      slug: 'react-patterns'  }
// ]
```

### Catch-All Routes

```tsx
// src/app/docs/[...slug]/page.tsx

export function generateStaticParams() {
  return [
    { slug: ["getting-started"] },
    { slug: ["getting-started", "installation"] },
    { slug: ["api", "overview"] },
    { slug: ["api", "endpoints", "products"] },
  ];
  // Note: each slug value is string[] — matches [...slug] type
}
```

### `dynamicParams` — What Happens to Unknown Params

```tsx
// src/app/products/[id]/page.tsx

// ─── Option 1: allow unknown params (default)
export const dynamicParams = true; // default
// Unknown IDs → rendered on-demand (SSR)
// /products/999 (not in generateStaticParams) → still works, just not pre-built

// ─── Option 2: block unknown params
export const dynamicParams = false;
// Unknown IDs → 404
// /products/999 (not pre-built) → 404 Not Found
// Use for: sites where ALL content is known at build time (static docs sites)
```

### Incremental Static Regeneration (ISR) + `generateStaticParams`

```tsx
// src/app/products/[id]/page.tsx

export async function generateStaticParams() {
  const topProducts = await db.product.findMany({
    orderBy: { views: "desc" },
    take: 100, // ← only pre-build top 100 products
    select: { id: true },
  });
  return topProducts.map((p) => ({ id: p.id }));
}

// Revalidate the page every 60 seconds
export const revalidate = 60;
// → Top 100 products: pre-built, re-generated every 60s
// → Other products: rendered on demand, also cached for 60s
```

### Parent `generateStaticParams` Optimization

```tsx
// When you have nested dynamic routes, Next.js runs generateStaticParams
// at each level. The parent's result is passed to the child.

// src/app/orgs/[orgId]/projects/[projectId]/page.tsx

export async function generateStaticParams() {
  // ─── Option A: fetch all combinations directly
  const projects = await db.project.findMany({
    select: { orgId: true, id: true },
  });
  return projects.map((p) => ({ orgId: p.orgId, projectId: p.id }));
}

// ─── OR use parent segment params (passed in as argument)
export async function generateStaticParams({
  params,
}: {
  params: { orgId: string }; // ← parent's generateStaticParams result
}) {
  // Called once per orgId value from parent's generateStaticParams
  const projects = await db.project.findMany({
    where: { orgId: params.orgId },
    select: { id: true },
  });
  return projects.map((p) => ({ projectId: p.id }));
}
```

### Performance Impact — Real Numbers

```
E-commerce site: 10,000 products
  Without generateStaticParams:
    → Every product page = 1 DB query + HTML generation per request
    → 10,000 simultaneous users = 10,000 DB queries

  With generateStaticParams:
    → All 10,000 pages pre-built at deploy time
    → Served from CDN edge cache
    → 0 DB queries per request
    → Page load: ~50ms (CDN) vs ~200ms (SSR)

  With partial generateStaticParams (top 100 + ISR for rest):
    → Top 100: served from CDN instantly
    → Other 9,900: generated on first request, cached
    → Best balance of build time and performance
```

---

## W — Why It Matters

- `generateStaticParams` is the difference between a fast product and a slow one for content-heavy sites — blog posts, product pages, and documentation should be static HTML served from a CDN, not server-rendered on every request.
- The `dynamicParams` toggle gives you explicit control over whether unknown params result in on-demand rendering or 404 — critical for security (preventing enumeration attacks) and for pure static sites.
- The partial pre-build pattern (top N products, all others on demand) is how large e-commerce sites balance build time with performance — pre-build the popular pages, lazily generate the rest.
- Understanding `generateStaticParams` vs ISR (`revalidate`) is a system design interview question for senior roles — knowing when to use each demonstrates production experience.

---

## I — Interview Q&A

### Q1: What is `generateStaticParams` and why would you use it?

**A:** `generateStaticParams` is a function exported from a dynamic route's `page.tsx` that tells Next.js which param values to pre-render at build time. Instead of server-rendering `/products/42` on every request, Next.js pre-builds the page at deploy time and serves it as static HTML from a CDN. This eliminates database queries per request for known routes, reduces server costs, and dramatically improves performance — static pages load in ~50ms from CDN vs ~200ms from an SSR server.

### Q2: What happens to dynamic routes that are NOT in `generateStaticParams` results?

**A:** By default (`dynamicParams = true`), unknown params are rendered on-demand when first requested — like a regular SSR page. The result is then cached. Setting `dynamicParams = false` makes unknown params return a 404. Use `true` for sites with frequently added content (blogs, product catalogs) and `false` for sites where all content is definitively known at build time (static documentation).

### Q3: How do you handle a site with 100,000 products — do you pre-render all of them?

**A:** Pre-rendering all 100,000 would make the build take hours. The practical approach: use `generateStaticParams` to pre-render the top N products (by traffic, revenue, or recency) — say the top 500. Add `revalidate = 3600` (ISR) to regenerate these pages hourly. For the remaining 99,500 products, `dynamicParams = true` means they render on first request and get cached. This gives instant loads for popular products and acceptable latency for the long tail.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Making `generateStaticParams` async but not awaiting DB calls

```tsx
export async function generateStaticParams() {
  const products = db.product.findMany(); // ← missing await
  return products.map((p) => ({ id: p.id }));
  // products is a Promise, not an array → TypeError
}
```

**Fix:**

```tsx
export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } });
  return products.map((p) => ({ id: p.id }));
}
```

### ❌ Pitfall: Wrong param key in returned objects

```tsx
// Route: [productId]/page.tsx
export async function generateStaticParams() {
  return products.map((p) => ({ id: p.id })); // ← 'id' but segment is [productId]
  // Next.js can't match — all params render on demand
}
```

**Fix:** The key must exactly match the segment name:

```tsx
return products.map((p) => ({ productId: p.id })); // ✅ matches [productId]
```

### ❌ Pitfall: Pre-rendering everything and exploding build time

```tsx
// 500,000 blog posts in the database
export async function generateStaticParams() {
  const posts = await db.post.findMany(); // fetches ALL 500k
  return posts.map((p) => ({ slug: p.slug })); // pre-render all 500k → build takes hours
}
```

**Fix:** Pre-render only the important subset:

```tsx
export async function generateStaticParams() {
  const recentPosts = await db.post.findMany({
    orderBy: { publishedAt: "desc" },
    take: 500, // ← top 500 most recent
    select: { slug: true },
  });
  return recentPosts.map((p) => ({ slug: p.slug }));
}
// All other posts: rendered on demand (dynamicParams = true by default)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/products/[category]/[id]` route with `generateStaticParams` that:

1. Pre-renders 3 hardcoded categories × 2 products each (6 total)
2. Unknown products return 404 (`dynamicParams = false`)
3. Revalidates every 5 minutes
4. Exports metadata using the product name
5. Shows breadcrumb from category + product name

### Solution

```tsx
// src/app/products/[category]/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ category: string; id: string }>;

// ─── No on-demand rendering for unknown params
export const dynamicParams = false;

// ─── Revalidate every 5 minutes
export const revalidate = 300;

// ─── Data
const CATALOG: Record<
  string,
  Record<string, { name: string; price: number; desc: string }>
> = {
  shoes: {
    "air-max-90": {
      name: "Air Max 90",
      price: 120,
      desc: "Classic running shoe.",
    },
    ultraboost: {
      name: "Ultraboost 22",
      price: 180,
      desc: "Energy-return foam.",
    },
  },
  bags: {
    "canvas-tote": {
      name: "Canvas Tote",
      price: 45,
      desc: "Durable everyday bag.",
    },
    "leather-bag": {
      name: "Leather Bag",
      price: 220,
      desc: "Premium leather.",
    },
  },
  accessories: {
    "wool-cap": { name: "Wool Cap", price: 35, desc: "Warm merino wool." },
    "belt-001": {
      name: "Leather Belt",
      price: 55,
      desc: "Classic leather belt.",
    },
  },
};

// ─── Static params
export function generateStaticParams() {
  const params: { category: string; id: string }[] = [];
  for (const [category, products] of Object.entries(CATALOG)) {
    for (const id of Object.keys(products)) {
      params.push({ category, id });
    }
  }
  return params;
  // Returns 6 combinations → 6 pages pre-built at next build
}

// ─── Metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category, id } = await params;
  const product = CATALOG[category]?.[id];
  if (!product) return { title: "Not Found" };
  return {
    title: product.name,
    description: product.desc,
  };
}

// ─── Page
export default async function ProductPage({ params }: { params: Params }) {
  const { category, id } = await params;
  const product = CATALOG[category]?.[id];

  if (!product) notFound();

  const categoryLabel = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm text-gray-500 mb-8"
        aria-label="Product breadcrumb"
      >
        <Link href="/products" className="hover:text-gray-700">
          Products
        </Link>
        <span>/</span>
        <Link href={`/products/${category}`} className="hover:text-gray-700">
          {categoryLabel}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      {/* Product */}
      <span
        className="inline-block text-xs font-semibold text-blue-700
                       bg-blue-50 px-2 py-0.5 rounded-full mb-4"
      >
        {categoryLabel}
      </span>
      <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
      <p className="text-gray-600 mb-6">{product.desc}</p>
      <p className="text-2xl font-bold text-blue-600 mb-8">${product.price}</p>
      <button
        className="w-full py-3 bg-blue-600 text-white font-medium
                         rounded-xl hover:bg-blue-700 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
}
```

---

---
