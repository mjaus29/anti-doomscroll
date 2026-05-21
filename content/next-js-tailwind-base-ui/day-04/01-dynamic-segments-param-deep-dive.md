# 1 — Dynamic Segments — `[param]` Deep Dive

---

## T — TL;DR

A folder wrapped in square brackets — `[id]`, `[slug]`, `[username]` — creates a **dynamic route segment** that matches any single URL value. The matched value is available as a typed param. This is how you build product pages, user profiles, order details — any route with a variable part.

---

## K — Key Concepts

### The Syntax and What It Generates

```
Folder name          URL pattern            Params object
─────────────────    ────────────────────   ──────────────────
[id]                 /products/:id          { id: string }
[slug]               /blog/:slug            { slug: string }
[username]           /users/:username       { username: string }
[orderId]            /orders/:orderId       { orderId: string }
```

```
src/app/
├── products/
│   └── [id]/
│       └── page.tsx        → /products/1
│                           → /products/abc-123
│                           → /products/anything
│
├── blog/
│   └── [slug]/
│       └── page.tsx        → /blog/hello-world
│                           → /blog/my-post-title
│
└── users/
    └── [username]/
        └── page.tsx        → /users/mark
                            → /users/john-doe
```

### Accessing Params — Server Component

```tsx
// src/app/products/[id]/page.tsx
// Next.js 15+: params is a Promise — MUST await it

type Params = Promise<{ id: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
  });

  if (!product) notFound();

  return (
    <article>
      <h1>{product.name}</h1>
      <p>${product.price}</p>
    </article>
  );
}
```

### Multiple Dynamic Segments in One Route

```
src/app/
└── shop/
    └── [category]/
        └── [subcategory]/
            └── [id]/
                └── page.tsx   → /shop/:category/:subcategory/:id

// URL: /shop/mens/shoes/air-max-90
// params: { category: 'mens', subcategory: 'shoes', id: 'air-max-90' }
```

```tsx
// src/app/shop/[category]/[subcategory]/[id]/page.tsx
type Params = Promise<{
  category: string;
  subcategory: string;
  id: string;
}>;

export default async function ProductPage({ params }: { params: Params }) {
  const { category, subcategory, id } = await params;

  return (
    <div>
      <nav className="text-sm text-gray-500">
        {category} → {subcategory}
      </nav>
      <h1>Product: {id}</h1>
    </div>
  );
}
```

### Dynamic Segment in the Middle of a Path

```
src/app/
└── orgs/
    └── [orgId]/
        ├── layout.tsx          ← org-level layout (fetch org data)
        ├── page.tsx            → /orgs/:orgId
        ├── members/
        │   └── page.tsx        → /orgs/:orgId/members
        └── settings/
            └── page.tsx        → /orgs/:orgId/settings

// All child routes inherit [orgId] from their parent
// The layout can fetch org data once for all children
```

```tsx
// src/app/orgs/[orgId]/layout.tsx
type Params = Promise<{ orgId: string }>;

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { orgId } = await params;
  const org = await getOrg(orgId);

  if (!org) notFound();

  return (
    <div>
      <header className="bg-white border-b px-6 py-4">
        <h1 className="font-semibold">{org.name}</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### Dynamic Segments + Static Segments Together

```
src/app/
└── products/
    ├── new/
    │   └── page.tsx           → /products/new      (STATIC — renders first)
    ├── featured/
    │   └── page.tsx           → /products/featured (STATIC — renders first)
    └── [id]/
        └── page.tsx           → /products/:id      (DYNAMIC — fallback)

// Priority: static wins over dynamic
// /products/new      → products/new/page.tsx      ✅ (not treated as id='new')
// /products/featured → products/featured/page.tsx ✅
// /products/42       → products/[id]/page.tsx     ✅
// /products/xyz-abc  → products/[id]/page.tsx     ✅
```

### Typed Params — Full Pattern

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── Type definitions
type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ preview?: string; ref?: string }>;

// ─── Metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.coverImage],
    },
  };
}

// ─── Page
export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const post = await getPost(slug, { preview: preview === "true" });
  if (!post) notFound();

  return (
    <article className="prose mx-auto py-12 px-4">
      {preview === "true" && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded mb-6 text-sm">
          Preview Mode
        </div>
      )}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

---

## W — Why It Matters

- Every content-driven page (products, blog posts, users, orders) requires dynamic segments — they're not optional knowledge, they're the foundation of every real-world Next.js app.
- The multiple-segment pattern (`[category]/[subcategory]/[id]`) enables rich URL structures that improve SEO and make pages shareable with full context in the URL.
- Placing a `layout.tsx` at the dynamic segment level (`[orgId]/layout.tsx`) allows fetching the entity once for all child routes — the layout data never re-fetches as the user navigates within the org section.
- Static segments in the same directory as dynamic segments give you escape hatches — `/products/new` can be a special creation form, separate from the generic `/products/[id]` product view.

---

## I — Interview Q&A

### Q1: How do you create a route that matches `/products/42` but NOT `/products/new`?

**A:** Create both `src/app/products/new/page.tsx` (static) and `src/app/products/[id]/page.tsx` (dynamic). Static routes always win over dynamic routes in Next.js — `/products/new` routes to the static file, while `/products/42` and any other non-static value routes to `[id]/page.tsx`. No additional configuration is needed.

### Q2: How do you access dynamic params in Next.js 15+?

**A:** In Server Components, params arrive as a `Promise<{ key: string }>` prop — you must `await params` before accessing properties: `const { id } = await params`. In Client Components, use the `useParams<{ id: string }>()` hook from `next/navigation`. The Promise wrapper is a Next.js 15+ change — in Next.js 14, params were synchronous objects.

### Q3: Can you have multiple dynamic segments in a single route? What does the params object look like?

**A:** Yes. Each `[param]` folder adds a property to the params object. For `src/app/orgs/[orgId]/projects/[projectId]/page.tsx`, the params are `{ orgId: string, projectId: string }`. All segments accumulate — the deeper the route, the more params are available. Each one is always a string regardless of what value is in the URL.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not awaiting params in Next.js 15+

```tsx
// ❌ params is a Promise in Next.js 15+ — accessing directly gives undefined
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>; // undefined at runtime
}
```

**Fix:**

```tsx
// ✅ async function + await params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

### ❌ Pitfall: Naming the param folder without thinking — `[id]` for a slug-based route

```
src/app/blog/[id]/page.tsx
// URL: /blog/hello-world → params.id = 'hello-world'
// Works, but id implies a numeric/UUID identifier
// Misleads readers — slugs are strings, not IDs
```

**Fix:** Name params semantically:

```
src/app/blog/[slug]/page.tsx    ← clearly a slug
src/app/products/[id]/page.tsx  ← clearly an ID
src/app/users/[username]/page.tsx ← clearly a username
```

### ❌ Pitfall: Forgetting to call `notFound()` for missing entities

```tsx
// ❌ No 404 handling — renders blank/broken page
const product = await db.product.findUnique({ where: { id } });
return <div>{product?.name}</div>; // renders nothing if product is null
```

**Fix:**

```tsx
import { notFound } from "next/navigation";

const product = await db.product.findUnique({ where: { id } });
if (!product) notFound(); // ← triggers not-found.tsx
return <div>{product.name}</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/store/[category]/products/[productId]` route that:

1. Has a `layout.tsx` at `[category]` level that fetches and displays the category name
2. Has a `page.tsx` at `[productId]` level with full typed params (both segments)
3. Calls `notFound()` if category or product doesn't exist
4. Exports `generateMetadata` using the product name
5. Shows the category and product in a breadcrumb

### Solution

```tsx
// src/app/store/[category]/layout.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ category: string }>;

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { category } = await params;

  // Mock — in production: fetch from DB
  const validCategories = ["shoes", "bags", "accessories"];
  if (!validCategories.includes(category)) notFound();

  const label = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div>
      <div className="bg-gray-50 border-b px-6 py-3">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/store" className="hover:text-gray-700">
            Store
          </Link>
          <span>/</span>
          <Link href={`/store/${category}`} className="hover:text-gray-700">
            {label}
          </Link>
        </nav>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/store/[category]/products/[productId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ category: string; productId: string }>;

// ─── Fake data helper
async function getProduct(category: string, productId: string) {
  const products: Record<
    string,
    Record<string, { name: string; price: number }>
  > = {
    shoes: {
      "air-max-90": { name: "Air Max 90", price: 120 },
      "ultra-boost": { name: "Ultra Boost", price: 180 },
    },
    bags: {
      "tote-001": { name: "Canvas Tote", price: 45 },
    },
  };
  return products[category]?.[productId] ?? null;
}

// ─── Metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category, productId } = await params;
  const product = await getProduct(category, productId);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: `Buy ${product.name} in our ${category} collection`,
  };
}

// ─── Page
export default async function ProductDetailPage({
  params,
}: {
  params: Params;
}) {
  const { category, productId } = await params;
  const product = await getProduct(category, productId);

  if (!product) notFound();

  const categoryLabel = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="max-w-xl">
      {/* Breadcrumb */}
      <p className="text-sm text-gray-500 mb-6">
        {categoryLabel} / {product.name}
      </p>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
      <p className="text-2xl font-semibold text-blue-600 mb-8">
        ${product.price}
      </p>

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
