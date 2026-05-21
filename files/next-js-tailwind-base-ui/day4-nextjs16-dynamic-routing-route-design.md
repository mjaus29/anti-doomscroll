# 📅 Day 4 — Dynamic Routing and Route Design (Next.js 16)

> **Goal:** Master every dynamic routing primitive Next.js provides — `[param]`, `[...slug]`, `[[...slug]]`, route groups — and apply them to real-world architectures: blogs, dashboards, multi-tenant apps, and multi-section platforms.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 3 complete — navigation hooks and URL state understood.

---

## 📋 Day 4 Subtopic Overview

| #   | Subtopic                                                      | Time   |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Dynamic Segments — `[param]` Deep Dive                        | 12 min |
| 2   | Catch-All Routes — `[...slug]`                                | 12 min |
| 3   | Optional Catch-All Routes — `[[...slug]]`                     | 10 min |
| 4   | Route Groups — `(group)` Organization and Layout Isolation    | 15 min |
| 5   | Nested Segments — Depth, Inheritance, and Composition         | 15 min |
| 6   | `generateStaticParams` — Static Generation for Dynamic Routes | 15 min |
| 7   | Designing Blog Routes — Complete Route Architecture           | 15 min |
| 8   | Designing Dashboard Routes — Multi-Level Navigation           | 15 min |
| 9   | Multi-Section App Structures — Combining All Patterns         | 15 min |
| 10  | Route Conflicts, Priority, and Edge Cases                     | 12 min |

---

---

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

# 2 — Catch-All Routes — `[...slug]`

---

## T — TL;DR

`[...slug]` creates a **required catch-all route** — one `page.tsx` that matches any URL with one or more segments after a given path. The matched segments arrive as a `string[]`. Perfect for documentation sites, CMS-driven pages, and file system browsers.

---

## K — Key Concepts

### The Syntax

```
Folder name          URL pattern              params.slug
─────────────────    ─────────────────────    ────────────────────
[...slug]            /docs/:a/:b/:c/...       string[] (1+ segments)
[...path]            /files/:a/:b/:c/...      string[] (1+ segments)
[...segments]        /:a/:b/:c/...            string[] (1+ segments)

❌ Does NOT match the base path:
  /docs (no segments after base) → 404
  Must use [[...slug]] for optional (see Subtopic 3)
```

### File Placement and URL Mapping

```
src/app/docs/
└── [...slug]/
    └── page.tsx

Matches:
  /docs/getting-started           → slug = ['getting-started']
  /docs/api/auth                  → slug = ['api', 'auth']
  /docs/api/v2/endpoints/create   → slug = ['api', 'v2', 'endpoints', 'create']

Does NOT match:
  /docs                           → 404 (use [[...slug]] for this)
```

### Accessing the Slug Array

```tsx
// src/app/docs/[...slug]/page.tsx
type Params = Promise<{ slug: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  // /docs/api/authentication → slug = ['api', 'authentication']

  const section = slug[0]; // 'api'
  const subsection = slug[1]; // 'authentication'
  const fullPath = slug.join("/"); // 'api/authentication'
  const depth = slug.length; // 2
  const filename = slug[slug.length - 1]; // 'authentication' (last segment)

  return (
    <div>
      <p>Path: {fullPath}</p>
      <p>Depth: {depth} levels</p>
    </div>
  );
}
```

### Real-World: Documentation Site

```tsx
// src/app/docs/[...slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string[] }>;

// Mock content fetcher — in production: MDX/CMS lookup
async function getDocContent(slugPath: string[]) {
  const path = slugPath.join("/");

  const docs: Record<string, { title: string; content: string }> = {
    "getting-started": { title: "Getting Started", content: "..." },
    "getting-started/installation": { title: "Installation", content: "..." },
    "api/overview": { title: "API Overview", content: "..." },
    "api/authentication": { title: "Authentication", content: "..." },
    "api/endpoints/products": { title: "Products Endpoint", content: "..." },
  };

  return docs[path] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocContent(slug);
  return { title: doc?.title ?? "Not Found" };
}

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const doc = await getDocContent(slug);

  if (!doc) notFound();

  // Build breadcrumbs from slug
  const breadcrumbs = slug.map((segment, i) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    href: "/docs/" + slug.slice(0, i + 1).join("/"),
  }));

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <a href="/docs" className="hover:text-gray-700">
          Docs
        </a>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <span>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <a href={crumb.href} className="hover:text-gray-700">
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>

      <h1 className="text-3xl font-bold mb-6">{doc.title}</h1>
      <div className="prose">{doc.content}</div>
    </article>
  );
}
```

### `generateStaticParams` with Catch-All

```tsx
// src/app/docs/[...slug]/page.tsx
export async function generateStaticParams() {
  // Return all known doc paths to pre-render at build time
  return [
    { slug: ["getting-started"] },
    { slug: ["getting-started", "installation"] },
    { slug: ["getting-started", "configuration"] },
    { slug: ["api", "overview"] },
    { slug: ["api", "authentication"] },
    { slug: ["api", "endpoints", "products"] },
  ];
}
// Next.js pre-renders all these paths at build time
// Any unrecognized path → notFound() at request time (or 404 if fallback: false)
```

### Catch-All + Static Segments Together

```
src/app/docs/
├── page.tsx              → /docs (explicit home — wins over catch-all)
├── changelog/
│   └── page.tsx          → /docs/changelog (explicit — wins)
└── [...slug]/
    └── page.tsx          → /docs/* (everything else)

Priority:
  /docs              → docs/page.tsx (static wins)
  /docs/changelog    → docs/changelog/page.tsx (static wins)
  /docs/api/auth     → docs/[...slug]/page.tsx (catch-all fallback)
```

---

## W — Why It Matters

- Documentation sites, wikis, CMSes, and file browsers all need routes of arbitrary depth — `[...slug]` is the only way to handle this cleanly without creating hundreds of nested route files.
- The slug array lets you reconstruct context at any depth: `slug[0]` is the section, `slug.join('/')` is the full path, `slug.length` tells you how deep the content is — all without any regex.
- Combining `[...slug]` with an explicit `page.tsx` at the base path (e.g., `/docs`) is the correct pattern to handle both the root and all sub-paths without using optional catch-all.
- `generateStaticParams` with catch-all routes is how documentation sites achieve static generation — all known paths pre-rendered at build time, unknown paths resolved on demand.

---

## I — Interview Q&A

### Q1: What is a catch-all route and what URL shapes does `[...slug]` match?

**A:** A catch-all route (`[...slug]`) is a folder that matches any URL with one or more path segments at that position. For `src/app/docs/[...slug]`, it matches `/docs/a`, `/docs/a/b`, `/docs/a/b/c`, and any deeper path. The matched segments arrive as a `string[]`. Critically, it does NOT match the base path `/docs` — that requires either a separate `page.tsx` at `/docs` or an optional catch-all `[[...slug]]`.

### Q2: How is the `slug` param structured for a URL like `/docs/api/v2/auth`?

**A:** `slug` is `['api', 'v2', 'auth']` — an array where each element is one path segment in order. You can access individual segments by index (`slug[0] === 'api'`), reconstruct the full path with `slug.join('/')`, get the last segment with `slug.at(-1)`, or get the depth with `slug.length`.

### Q3: How do you pre-render all paths for a documentation site using catch-all routes?

**A:** Export `generateStaticParams()` from the `[...slug]/page.tsx` — return an array of objects, each with a `slug` key containing a `string[]` of path segments. For example: `[{ slug: ['getting-started'] }, { slug: ['api', 'auth'] }]`. Next.js pre-renders each path at build time. Unknown paths can be handled with `notFound()` at runtime or by configuring `dynamicParams`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `[...slug]` when the base path also needs to render

```
src/app/docs/[...slug]/page.tsx
// /docs → 404 (catch-all requires at least one segment)
// Developer expects /docs to show a docs home page
```

**Fix:** Either add a separate `page.tsx` at the base, or use optional catch-all:

```
src/app/docs/
├── page.tsx        → /docs (explicit home) ✅
└── [...slug]/
    └── page.tsx    → /docs/* (everything else) ✅
```

### ❌ Pitfall: Treating `slug` as a string instead of array

```tsx
const { slug } = await params;
const path = slug.replace(/-/g, "/"); // TypeError: slug.replace is not a function
// slug is string[] not string
```

**Fix:**

```tsx
const path = slug.join("/"); // ✅ ['api', 'auth'] → 'api/auth'
```

### ❌ Pitfall: Not validating slug depth or content

```tsx
// ❌ Assumes at least 2 segments — crashes on /docs/single
const [section, page] = slug; // page = undefined if only 1 segment
await getDoc(section, page); // unexpected undefined arg
```

**Fix:**

```tsx
const section = slug[0]; // always exists (catch-all requires 1+)
const subsection = slug[1] ?? null; // safely undefined for single-segment paths
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/wiki/[...path]` catch-all route for a company wiki that:

1. Parses the path into `section` (first segment) and `subpath` (rest)
2. Shows a "section not found" if section is invalid (valid: `engineering`, `product`, `design`)
3. Generates metadata with the last path segment as title
4. Builds a breadcrumb from the full path array
5. Pre-generates 4 hardcoded paths with `generateStaticParams`

### Solution

```tsx
// src/app/wiki/[...path]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ path: string[] }>;

const VALID_SECTIONS = ["engineering", "product", "design"];

function labelFromSegment(seg: string): string {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Static params
export function generateStaticParams() {
  return [
    { path: ["engineering"] },
    { path: ["engineering", "onboarding"] },
    { path: ["product", "roadmap"] },
    { path: ["design", "brand-guidelines"] },
  ];
}

// ─── Metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { path } = await params;
  const lastSeg = path[path.length - 1];
  return {
    title: labelFromSegment(lastSeg),
    description: `Wiki page: ${path.join(" / ")}`,
  };
}

// ─── Page
export default async function WikiPage({ params }: { params: Params }) {
  const { path } = await params;
  const section = path[0];
  const subpath = path.slice(1); // everything after section
  const fullPath = path.join("/");

  // Validate section
  if (!VALID_SECTIONS.includes(section)) {
    notFound();
  }

  const sectionLabel = labelFromSegment(section);
  const pageTitle = labelFromSegment(path[path.length - 1]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm text-gray-500 mb-6"
        aria-label="Wiki breadcrumb"
      >
        <Link href="/wiki" className="hover:text-gray-700">
          Wiki
        </Link>
        {path.map((seg, i) => {
          const href = "/wiki/" + path.slice(0, i + 1).join("/");
          const isLast = i === path.length - 1;
          return (
            <span key={href} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span className="text-gray-900 font-medium">
                  {labelFromSegment(seg)}
                </span>
              ) : (
                <Link href={href} className="hover:text-gray-700">
                  {labelFromSegment(seg)}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Section badge */}
      <span
        className="inline-block text-xs font-semibold text-blue-700
                       bg-blue-50 px-2 py-0.5 rounded-full mb-4"
      >
        {sectionLabel}
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{pageTitle}</h1>

      <div className="text-gray-500 text-sm mb-8">
        Path:{" "}
        <code className="bg-gray-100 px-2 py-0.5 rounded">
          /wiki/{fullPath}
        </code>
        {subpath.length > 0 && (
          <span className="ml-3">Subpath depth: {subpath.length}</span>
        )}
      </div>

      {/* Placeholder content */}
      <div className="prose prose-gray">
        <p>
          Content for <strong>{pageTitle}</strong> in the {sectionLabel}{" "}
          section.
        </p>
        <p>
          This page lives at <code>/wiki/{fullPath}</code>.
        </p>
      </div>
    </div>
  );
}
```

---

---

# 3 — Optional Catch-All Routes — `[[...slug]]`

---

## T — TL;DR

`[[...slug]]` is a catch-all that **also matches the base path** — double brackets make the segments optional. Where `[...slug]` gives a 404 on `/docs`, `[[...slug]]` renders the same `page.tsx` with `slug = undefined`. One file handles both the root and all sub-paths.

---

## K — Key Concepts

### Syntax Difference

```
[...slug]       Required catch-all → needs 1+ segments
                /docs/a ✅   /docs → 404 ❌

[[...slug]]     Optional catch-all → 0 or more segments
                /docs ✅    /docs/a ✅    /docs/a/b/c ✅
```

### What `params.slug` Looks Like

```tsx
// Route: src/app/docs/[[...slug]]/page.tsx

// URL: /docs
// params: { slug: undefined }

// URL: /docs/getting-started
// params: { slug: ['getting-started'] }

// URL: /docs/api/v2/auth
// params: { slug: ['api', 'v2', 'auth'] }
```

### Typed Params — Handle the undefined Case

```tsx
// src/app/docs/[[...slug]]/page.tsx
type Params = Promise<{ slug?: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;

  // ─── Explicit routing by slug presence
  if (!slug || slug.length === 0) {
    // Render: /docs home page
    return <DocsHomePage />;
  }

  if (slug.length === 1) {
    // Render: /docs/section-name
    return <DocsSectionPage section={slug[0]} />;
  }

  // Render: /docs/section/page-name (or deeper)
  return <DocsContentPage path={slug} />;
}

function DocsHomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Documentation</h1>
      <p className="text-gray-600">
        Welcome to the docs. Choose a section to get started.
      </p>
    </div>
  );
}

function DocsSectionPage({ section }: { section: string }) {
  const title = section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return <h1 className="text-2xl font-bold">{title} Overview</h1>;
}

function DocsContentPage({ path }: { path: string[] }) {
  const title = path[path.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return <h1 className="text-2xl font-bold">{title}</h1>;
}
```

### When to Choose `[[...slug]]` vs `[...slug]` + Separate `page.tsx`

```
Option A — [[...slug]] only (one file handles everything):
  ✅ Single file to maintain
  ✅ Base path handled automatically
  ✅ Simple for uniform layouts (docs, wikis)
  ❌ One big component handling multiple cases (can get complex)

Option B — page.tsx + [...slug] (two files, clear separation):
  ✅ Docs home has its own rich layout/data
  ✅ Dynamic docs have their own layout
  ✅ Each file is focused and clean
  ❌ Two files to maintain
  ✅ Better when the home page is significantly different from sub-pages

Choose [[...slug]] when:
  → The home page and sub-pages have the same layout/shell
  → The home page just renders a different content section
  → You want the fewest files possible

Choose page.tsx + [...slug] when:
  → The home page is significantly different (e.g., landing with cards)
  → The home page needs different data fetching
  → You want clean separation of concerns
```

### `generateStaticParams` — Include the Root

```tsx
export function generateStaticParams() {
  return [
    // ─── Include root (empty array = /docs)
    { slug: [] }, // → /docs

    // ─── Include sub-paths
    { slug: ["getting-started"] },
    { slug: ["api", "overview"] },
    { slug: ["api", "auth"] },
  ];
}
```

### Real-World Use Case — i18n Locale Routing

```
src/app/
└── [[...locale]]/        ← optional: matches / AND /en AND /fr AND /en/about
    └── page.tsx

// /            → locale = undefined  → use default language
// /en          → locale = ['en']     → English
// /fr          → locale = ['fr']     → French
// /en/about    → locale = ['en', 'about'] → English about page
```

```tsx
// src/app/[[...locale]]/page.tsx
type Params = Promise<{ locale?: string[] }>;

export default async function LocalizedPage({ params }: { params: Params }) {
  const { locale } = await params;
  const lang = locale?.[0] ?? "en"; // default to English
  const pathParts = locale?.slice(1) ?? []; // everything after locale

  return (
    <div>
      Language: {lang} | Path: {pathParts.join("/")}
    </div>
  );
}
```

---

## W — Why It Matters

- The base-path coverage of `[[...slug]]` solves the most common documentation site architecture mistake — using `[...slug]` and wondering why `/docs` returns 404.
- One file handling all routes reduces maintenance overhead for uniform content sites — the logic branches on `slug.length`, not on separate files.
- The undefined slug case (`slug?: string[]`) forces you to explicitly handle the base path in TypeScript — you can't accidentally forget it.
- i18n routing, multi-tenancy, and A/B testing are advanced cases that all leverage optional catch-all — understanding the primitive opens up these patterns.

---

## I — Interview Q&A

### Q1: What is the difference between `[...slug]` and `[[...slug]]`?

**A:** Both match URLs with one or more path segments. The difference is the base path. `[...slug]` is required — it only matches URLs with at least one segment; the base path (e.g., `/docs`) returns 404. `[[...slug]]` is optional — it matches both the base path (where `slug` is `undefined`) and any number of segments below it. Use `[[...slug]]` when you want the same page component to handle both the root of a section and all its sub-pages.

### Q2: What does `params.slug` equal when the user visits the base path `/docs` with `[[...slug]]`?

**A:** `slug` is `undefined` (the property may be absent from the params object). The TypeScript type is `{ slug?: string[] }` — the `?` indicates it's optional. Always guard against this: `if (!slug || slug.length === 0) { /* render home page */ }`.

### Q3: When would you use optional catch-all vs a separate `page.tsx` at the base path?

**A:** Use `[[...slug]]` (one file) when the home page and sub-pages share the same layout and the home page is just a special case of the content view — like a docs site where the home is just a "welcome to docs" version of the content page. Use `page.tsx + [...slug]` (two files) when the home page has a significantly different structure — like a docs landing page with feature cards, a search box, and category grid, while sub-pages are simple MDX renders.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `[...slug]` and getting 404 on the base path

```
src/app/docs/[...slug]/page.tsx
// User visits /docs → 404
// Developer confused — "I have a docs route!"
```

**Fix:** Change to optional catch-all:

```
src/app/docs/[[...slug]]/page.tsx
// /docs → renders with slug = undefined ✅
// /docs/anything → renders with slug = ['anything'] ✅
```

### ❌ Pitfall: Not guarding against undefined slug

```tsx
// ❌ Crashes when slug is undefined (/docs base path)
const { slug } = await params;
const path = slug.join("/"); // TypeError: Cannot read properties of undefined
```

**Fix:**

```tsx
const { slug } = await params;
const path = slug?.join("/") ?? ""; // ← safe: '' for base path
const isHome = !slug || slug.length === 0;
```

### ❌ Pitfall: Forgetting the empty array in `generateStaticParams`

```tsx
export function generateStaticParams() {
  return [
    // ❌ Missing root path
    { slug: ["getting-started"] },
    { slug: ["api", "auth"] },
  ];
  // /docs → not pre-rendered → falls through to SSR on each request
}
```

**Fix:**

```tsx
return [
  { slug: [] }, // ← pre-render /docs ✅
  { slug: ["getting-started"] },
  { slug: ["api", "auth"] },
];
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `/help/[[...topic]]` route that:

1. Shows a "Help Center Home" with 3 topic cards when visited at `/help`
2. Shows a topic page when visited at `/help/billing`, `/help/shipping`, etc.
3. Shows a subtopic page when visited at `/help/billing/refunds`
4. Returns `notFound()` for unknown topics
5. `slug` is fully typed with the optional `?`

### Solution

```tsx
// src/app/help/[[...topic]]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ topic?: string[] }>;

const VALID_TOPICS = ["billing", "shipping", "account", "returns"];

function toTitle(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { topic } = await params;
  if (!topic || topic.length === 0) return { title: "Help Center" };
  return { title: `${toTitle(topic[topic.length - 1])} — Help` };
}

export default async function HelpPage({ params }: { params: Params }) {
  const { topic } = await params;

  // ─── Home: /help
  if (!topic || topic.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-gray-600 mb-8">How can we help you today?</p>
        <div className="grid grid-cols-2 gap-4">
          {VALID_TOPICS.map((t) => (
            <Link
              key={t}
              href={`/help/${t}`}
              className="p-5 border rounded-xl hover:border-blue-400
                         hover:shadow-sm transition-all"
            >
              <h2 className="font-semibold text-gray-900">{toTitle(t)}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Get help with {t} questions
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ─── Validate topic
  const [mainTopic, ...rest] = topic;
  if (!VALID_TOPICS.includes(mainTopic)) notFound();

  const topicLabel = toTitle(mainTopic);

  // ─── Subtopic: /help/billing/refunds
  if (rest.length > 0) {
    const subtopicLabel = toTitle(rest[rest.length - 1]);
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <nav className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
          <Link href="/help" className="hover:text-gray-700">
            Help
          </Link>
          <span>/</span>
          <Link href={`/help/${mainTopic}`} className="hover:text-gray-700">
            {topicLabel}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{subtopicLabel}</span>
        </nav>
        <h1 className="text-2xl font-bold mb-4">{subtopicLabel}</h1>
        <p className="text-gray-600">
          Detailed help for {subtopicLabel} under {topicLabel}.
        </p>
      </div>
    );
  }

  // ─── Topic: /help/billing
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <nav className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
        <Link href="/help" className="hover:text-gray-700">
          Help
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{topicLabel}</span>
      </nav>
      <h1 className="text-2xl font-bold mb-4">{topicLabel}</h1>
      <p className="text-gray-600 mb-6">
        Browse {topicLabel.toLowerCase()} help articles below.
      </p>
      <ul className="space-y-2">
        {["getting-started", "common-issues", "contact-support"].map((sub) => (
          <li key={sub}>
            <Link
              href={`/help/${mainTopic}/${sub}`}
              className="flex items-center gap-2 px-4 py-3 border rounded-lg
                         hover:border-blue-400 transition-colors text-sm"
            >
              <span className="text-blue-500">→</span>
              <span>{toTitle(sub)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

---

# 4 — Route Groups — `(group)` Organization and Layout Isolation

---

## T — TL;DR

Route groups are folders wrapped in parentheses — `(marketing)`, `(auth)`, `(dashboard)` — that **organize routes without affecting the URL**. Their killer feature: each group gets its own `layout.tsx`, enabling multiple distinct layouts in one app with no URL nesting.

---

## K — Key Concepts

### The Rule

```
(group-name)/     → completely invisible to the URL router
                     acts only as an organizational container
                     can have its own layout.tsx

Normal folder:    creates a URL segment
(Group folder):   creates NO URL segment — organization only
```

### URL Proof

```
src/app/
├── (marketing)/
│   ├── page.tsx          → /          (NOT /marketing/)
│   └── about/page.tsx    → /about     (NOT /marketing/about)
│
├── (dashboard)/
│   └── dashboard/
│       └── page.tsx      → /dashboard (NOT /dashboard-group/dashboard)
│
└── (auth)/
    └── login/page.tsx    → /login     (NOT /auth/login)

The parentheses vanish from the URL completely.
```

### Multiple Layouts via Route Groups

```tsx
// ─── 1. Root layout (required — shared by ALL routes)
// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// ─── 2. Marketing layout — top nav + footer
// src/app/(marketing)/layout.tsx
import { TopNav } from "./_components/top-nav";
import { Footer } from "./_components/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
```

```tsx
// ─── 3. Auth layout — centered card, no nav/footer
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {children}
      </div>
    </div>
  );
}
```

```tsx
// ─── 4. Dashboard layout — sidebar + auth guard
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
```

### Complete App Structure with Route Groups

```
src/app/
│
├── layout.tsx                        ← ROOT layout (html + body)
│
├── (marketing)/                      ← top nav + footer
│   ├── layout.tsx
│   ├── page.tsx                      → /
│   ├── about/page.tsx                → /about
│   ├── pricing/page.tsx              → /pricing
│   └── blog/
│       ├── page.tsx                  → /blog
│       └── [slug]/page.tsx           → /blog/:slug
│
├── (auth)/                           ← centered card, no chrome
│   ├── layout.tsx
│   ├── login/page.tsx                → /login
│   ├── register/page.tsx             → /register
│   └── forgot-password/page.tsx      → /forgot-password
│
├── (dashboard)/                      ← sidebar, auth required
│   ├── layout.tsx
│   ├── dashboard/page.tsx            → /dashboard
│   ├── dashboard/orders/page.tsx     → /dashboard/orders
│   ├── dashboard/products/page.tsx   → /dashboard/products
│   └── dashboard/settings/page.tsx   → /dashboard/settings
│
└── api/                              ← no layout (API routes)
    └── products/route.ts             → /api/products
```

### Same URL from Different Groups — Conflict

```
// ❌ Conflict: two files claim the same URL
src/app/
├── (groupA)/
│   └── about/page.tsx    → /about
└── (groupB)/
    └── about/page.tsx    → /about
// Build error: duplicate route /about
```

**Rule:** Route groups eliminate URL segments — but the remaining URL must still be unique across all groups.

### Route Groups for Shared Layout Subsets

```
// Authenticated routes that need a different sub-layout
src/app/
└── (dashboard)/
    ├── layout.tsx                     ← main dashboard layout
    ├── dashboard/
    │   └── page.tsx                   → /dashboard
    │
    ├── (settings)/                    ← nested group for settings sections
    │   ├── layout.tsx                 ← settings-specific sub-layout
    │   ├── settings/page.tsx          → /settings
    │   ├── settings/profile/page.tsx  → /settings/profile
    │   └── settings/billing/page.tsx  → /settings/billing
    │
    └── (fullscreen)/                  ← group for full-screen views (no sidebar)
        ├── layout.tsx                 ← different layout (no sidebar)
        └── reports/page.tsx           → /reports
```

---

## W — Why It Matters

- Route groups solve the "I need three different layouts for different sections of my app without fake URL nesting" problem — the most architecturally important Next.js feature after the App Router itself.
- Placing auth guards in `(dashboard)/layout.tsx` means every route inside the group is protected by a single server-side check — no per-page `if (!user) redirect()` needed.
- The `(auth)` group pattern is responsible for the clean centered login form you see in every modern SaaS product — one layout file, all auth pages benefit.
- Nested route groups (a group inside another group) let you apply different sub-layouts within an already-grouped section — enabling granular layout control without URL pollution.

---

## I — Interview Q&A

### Q1: What do route groups do and what don't they do?

**A:** Route groups organize files into named folders whose names are excluded from the URL. They allow you to: apply different layouts to groups of routes, co-locate related route files, and isolate layout inheritance. What they don't do: create URL segments, affect routing behavior, or change how params work. The parentheses are purely organizational — the URL router ignores them completely.

### Q2: How do you implement a site where marketing pages have a top nav, auth pages have a centered layout, and dashboard pages have a sidebar — all at the root URL level?

**A:** Use three route groups: `(marketing)`, `(auth)`, and `(dashboard)`. Each has its own `layout.tsx` that defines the section's chrome. The root `app/layout.tsx` provides `<html>` and `<body>`. Marketing routes (`/`, `/about`, `/pricing`) live in `(marketing)`, auth routes (`/login`, `/register`) in `(auth)`, and dashboard routes in `(dashboard)`. All URLs are at the root level — `/login` not `/auth/login`.

### Q3: Can you have a conflict between route groups?

**A:** Yes — if two route groups each contain a folder with the same name, they both resolve to the same URL. For example, `(groupA)/about/page.tsx` and `(groupB)/about/page.tsx` both claim `/about` — Next.js throws a build error. Route groups remove the group name from the URL but the remaining path must still be unique across the entire `app/` directory.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting the group name to appear in the URL

```
src/app/(auth)/login/page.tsx
// Developer expects: /auth/login
// Actual URL:        /login
```

**Fix:** Route groups are invisible in URLs — they're for organization only. The URL is determined by the folder structure inside the group, not the group itself.

### ❌ Pitfall: Adding `<html>` and `<body>` to a group layout

```tsx
// src/app/(dashboard)/layout.tsx ← NOT the root layout
export default function DashboardLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — only root layout
      <body>
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
```

**Fix:** Group layouts return only their section's wrapper:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      {" "}
      // ← just the section wrapper
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### ❌ Pitfall: Conflicting routes across groups

```
src/app/
├── (marketing)/about/page.tsx   → /about
└── (info)/about/page.tsx        → /about
// Build error: duplicate route
```

**Fix:** Each URL must be unique. Move one to a different path, or consolidate into one group.

---

## K — Coding Challenge + Solution

### Challenge

Design a route group structure for a SaaS app with:

1. `(public)` group — `/`, `/pricing`, `/changelog` — minimal nav layout
2. `(onboarding)` group — `/onboarding/welcome`, `/onboarding/setup`, `/onboarding/done` — full-screen stepper layout with no nav
3. `(app)` group — `/app/dashboard`, `/app/projects`, `/app/settings` — sidebar layout, auth required
4. `(admin)` group — `/admin`, `/admin/users`, `/admin/billing` — separate admin sidebar, admin role required

Show: full directory structure, all layout files (content), and the rendered tree for `/app/projects`.

### Solution

```
Directory structure:
src/app/
│
├── layout.tsx                           ← ROOT (html + body + providers)
│
├── (public)/
│   ├── layout.tsx                       ← minimal top nav
│   ├── page.tsx                         → /
│   ├── pricing/page.tsx                 → /pricing
│   └── changelog/page.tsx              → /changelog
│
├── (onboarding)/
│   ├── layout.tsx                       ← full-screen stepper, no nav
│   └── onboarding/
│       ├── welcome/page.tsx             → /onboarding/welcome
│       ├── setup/page.tsx               → /onboarding/setup
│       └── done/page.tsx                → /onboarding/done
│
├── (app)/
│   ├── layout.tsx                       ← sidebar + auth guard
│   └── app/
│       ├── dashboard/page.tsx           → /app/dashboard
│       ├── projects/page.tsx            → /app/projects
│       └── settings/page.tsx           → /app/settings
│
└── (admin)/
    ├── layout.tsx                       ← admin sidebar + role guard
    ├── admin/page.tsx                   → /admin
    ├── admin/users/page.tsx             → /admin/users
    └── admin/billing/page.tsx          → /admin/billing
```

```tsx
// src/app/layout.tsx — ROOT
import { Providers } from "./_providers";
import "./globals.css";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/(public)/layout.tsx
import Link from "next/link";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="h-16 border-b flex items-center justify-between px-6">
        <Link href="/" className="font-bold text-xl">
          SaaSApp
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/changelog" className="text-gray-600 hover:text-gray-900">
            Changelog
          </Link>
          <Link
            href="/app/dashboard"
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg"
          >
            Dashboard
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
```

```tsx
// src/app/(onboarding)/layout.tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50
                    flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <span className="font-bold text-xl text-blue-600">SaaSApp Setup</span>
        </div>
        {children}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/app/dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <span className="font-semibold">SaaSApp</span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {[
            { label: "Dashboard", href: "/app/dashboard" },
            { label: "Projects", href: "/app/projects" },
            { label: "Settings", href: "/app/settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm
                             text-gray-400 hover:text-white hover:bg-gray-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/app/dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-red-950 text-red-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-red-800">
          <span className="font-semibold text-red-200">Admin Panel</span>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { label: "Overview", href: "/admin" },
            { label: "Users", href: "/admin/users" },
            { label: "Billing", href: "/admin/billing" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm
                             text-red-300 hover:text-white hover:bg-red-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

```
Rendered tree for /app/projects:

<RootLayout>                    ← html, body, Providers (app/layout.tsx)
  <AppLayout>                   ← sidebar + auth guard ((app)/layout.tsx)
    <ProjectsPage />            ← (app)/app/projects/page.tsx
  </AppLayout>
</RootLayout>

What does NOT render:
  ❌ PublicLayout   (wrong group)
  ❌ OnboardingLayout (wrong group)
  ❌ AdminLayout    (wrong group)
```

---

---

# 5 — Nested Segments — Depth, Inheritance, and Composition

---

## T — TL;DR

Nested route segments create a **hierarchy where each level adds its own layout, data, and URL segment**. Understanding how layouts stack, how data flows, and how to avoid deep nesting traps is the key to scalable Next.js architecture.

---

## K — Key Concepts

### The Nesting Model — Visual

```
URL: /orgs/acme/projects/api-v2/tasks/42

Route tree:
  app/
    orgs/
      [orgId]/           ← layout: fetch org, show org header
        projects/
          [projectId]/   ← layout: fetch project, show project header
            tasks/
              [taskId]/  ← page: fetch + render task detail
                page.tsx

Rendered:
  <RootLayout>
    <OrgLayout orgId="acme">        ← persists while in /orgs/acme/*
      <ProjectLayout projectId="api-v2">  ← persists while in .../projects/api-v2/*
        <TaskPage taskId="42" />
      </ProjectLayout>
    </OrgLayout>
  </RootLayout>
```

### Layout at Each Level — Fetches Its Own Data

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
      <header className="bg-white border-b px-6 py-3 flex items-center gap-3">
        <img src={org.logoUrl} alt={org.name} className="w-6 h-6 rounded" />
        <span className="font-semibold">{org.name}</span>
      </header>
      <div className="flex">
        <OrgSidebar org={org} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/orgs/[orgId]/projects/[projectId]/layout.tsx
type Params = Promise<{ orgId: string; projectId: string }>;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { orgId, projectId } = await params;
  const project = await getProject(orgId, projectId);
  if (!project) notFound();

  return (
    <div>
      <div className="bg-gray-50 border-b px-6 py-2">
        <h2 className="font-medium text-gray-700">{project.name}</h2>
        <ProjectTabsNav orgId={orgId} projectId={projectId} />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
```

### Parallel Data Fetching Across Levels

```
Next.js fetches ALL layout + page data CONCURRENTLY:

/orgs/acme/projects/api-v2/tasks/42

Fetches start simultaneously:
  → getOrg('acme')           [OrgLayout]      t=0ms
  → getProject('acme','api-v2') [ProjectLayout]  t=0ms
  → getTask('42')            [TaskPage]       t=0ms

All resolve in parallel — total time = max(individual times)
NOT: org wait → project wait → task wait (sequential)
```

### When NOT to Nest Deeply — The Depth Trade-off

```
Rule of thumb: 3-4 levels of nesting is usually the max before
it becomes hard to reason about.

Signs you're over-nesting:
  ❌ 6+ levels of layout.tsx files
  ❌ Params object has 5+ keys
  ❌ Breadcrumb is 8 levels deep
  ❌ Moving a section requires restructuring 10 files

Better approach for very deep hierarchies:
  - Flatten the URL: /tasks/42 instead of /orgs/acme/projects/api-v2/tasks/42
  - Use query params for context: /tasks/42?orgId=acme&projectId=api-v2
  - Pass org/project as data, not as URL segments
```

### Segment-Specific Layouts vs Shared Layouts

```
SEGMENT LAYOUT (layout.tsx in route folder):
  → Applies to all routes in that folder and sub-folders
  → Fetches data specific to the segment
  → Persists while navigating within the segment

SHARED LAYOUT (via route group):
  → Applies to a curated set of routes via (group)
  → No URL impact
  → Clean separation of concerns across sections

Choose segment layout when:
  → The layout is specific to an entity (OrgLayout, ProjectLayout)
  → The layout needs dynamic data from the URL params

Choose route group layout when:
  → Multiple sections share chrome (nav, footer)
  → No dynamic data needed in the layout itself
```

### Breadcrumb Data — The Nesting Challenge

```tsx
// Problem: deeply nested pages need breadcrumb data from multiple levels
// /orgs/acme/projects/api-v2/tasks/42
// Breadcrumb: Orgs / Acme / Projects / API v2 / Tasks / Task #42

// Solution: each layout passes its entity data to a breadcrumb context
// OR: each layout renders its portion of the breadcrumb

// Approach: BreadcrumbProvider (Client Component context)
// src/components/breadcrumbs/breadcrumb-context.tsx
"use client";
import { createContext, useContext, useState } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const BreadcrumbCtx = createContext<{
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}>({ items: [], setItems: () => {} });

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  return (
    <BreadcrumbCtx.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbCtx.Provider>
  );
}

export const useBreadcrumb = () => useContext(BreadcrumbCtx);
```

---

## W — Why It Matters

- Deep nesting enables entity-scoped layouts — every page inside `/orgs/[orgId]/` automatically has the org name, logo, and sidebar without repeating data fetching logic.
- The parallel fetching across levels is a significant performance benefit — in a traditional SSR framework, nested layouts would fetch data sequentially. Next.js App Router fetches them all at once.
- Understanding when NOT to nest (flattening deep hierarchies) is what distinguishes a senior from a junior architect — over-nesting creates rigid structures that are expensive to refactor.
- The breadcrumb challenge in deep nesting is a design problem every real production app faces — React Context, passed props, or a URL-parsing approach are all valid solutions depending on complexity.

---

## I — Interview Q&A

### Q1: How does data fetching work across multiple nested layouts in Next.js?

**A:** Next.js fetches data for all layouts and the page in a single request concurrently — not sequentially. For a route with three layout levels, all three data fetches start at the same time. The page renders when all fetches resolve. Identical fetch calls are deduplicated via `fetch` caching or React's `cache()` function — so `getCurrentUser()` called in two layouts only hits the database once.

### Q2: What is the practical advantage of putting a `layout.tsx` at the `[orgId]` level?

**A:** It allows fetching the organization's data once — the layout runs once when the user enters the `/orgs/[orgId]/` segment and persists while they navigate between sub-routes (members, projects, settings). Every child page gets the org data without re-fetching it. It also provides a natural location for the org-specific navigation chrome that persists across all org pages.

### Q3: When would you flatten a deeply nested route structure?

**A:** When the URL depth creates more problems than it solves: when params have 5+ keys making types complex, when breadcrumbs are 8+ levels deep (confusing UX), when moving one section requires restructuring many files, or when users rarely navigate the hierarchy top-down. Alternative: use a flat URL (`/tasks/42`) with query params for context (`?org=acme&project=api-v2`), or store context in a cookie/session instead of URL params.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Fetching data sequentially because of unnecessary nesting

```tsx
// layout.tsx (level 1): fetches org
// layout.tsx (level 2): fetches project AFTER waiting for org render
// page.tsx:             fetches task AFTER waiting for project render
// TOTAL TIME = org + project + task (sequential — WRONG)
```

**Reality:** Next.js fetches all three in parallel — the sequential appearance in code doesn't mean sequential execution. BUT if you `await` one layout's result and pass it to the next via props (wrong pattern), you force sequencing.

**Fix:** Never pass server data across layout boundaries via props. Each layout fetches its own data independently.

### ❌ Pitfall: Repeating auth checks in every nested layout

```tsx
// (dashboard)/layout.tsx → checks auth
// (dashboard)/layout.tsx → ALSO checks auth in every child layout
// Redundant and slow
```

**Fix:** Put auth check in the outermost group layout only. Child layouts trust that the parent already authenticated.

---

## K — Coding Challenge + Solution

### Challenge

Design a 3-level nested route for `/teams/[teamId]/channels/[channelId]/messages/[messageId]`:

1. Team layout: shows team name and member count
2. Channel layout: shows channel name and a message input bar at the bottom
3. Message page: shows the full message thread
4. Each level fetches its own typed data
5. Show the complete rendered tree

### Solution

```tsx
// src/app/teams/[teamId]/layout.tsx
type Params = Promise<{ teamId: string }>;

async function getTeam(id: string) {
  return { id, name: "Engineering Team", memberCount: 12 };
}

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Team sidebar */}
      <aside className="w-60 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold">{team.name}</h1>
          <p className="text-xs text-gray-400">{team.memberCount} members</p>
        </div>
        <nav className="p-2 flex-1 overflow-auto">
          {/* Channel list would go here */}
          <p className="text-xs text-gray-500 px-2 mb-1">CHANNELS</p>
          <a
            href={`/teams/${teamId}/channels/general`}
            className="block px-3 py-1.5 rounded text-sm text-gray-300
                        hover:bg-gray-700 hover:text-white"
          >
            #general
          </a>
        </nav>
      </aside>

      {/* Channel area */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/teams/[teamId]/channels/[channelId]/layout.tsx
type Params = Promise<{ teamId: string; channelId: string }>;

async function getChannel(teamId: string, channelId: string) {
  return { id: channelId, name: channelId, description: "General discussion" };
}

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { teamId, channelId } = await params;
  const channel = await getChannel(teamId, channelId);
  if (!channel) notFound();

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <header className="h-14 border-b flex items-center px-6 bg-white shrink-0">
        <span className="text-gray-400 mr-1">#</span>
        <h2 className="font-semibold">{channel.name}</h2>
        {channel.description && (
          <span className="ml-3 text-sm text-gray-500 border-l pl-3">
            {channel.description}
          </span>
        )}
      </header>

      {/* Messages area — children renders here */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* Message input — persists across messages */}
      <div className="p-4 border-t bg-white shrink-0">
        <input
          type="text"
          placeholder={`Message #${channel.name}`}
          className="w-full border rounded-lg px-4 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
```

```tsx
// src/app/teams/[teamId]/channels/[channelId]/messages/[messageId]/page.tsx
import { notFound } from "next/navigation";

type Params = Promise<{
  teamId: string;
  channelId: string;
  messageId: string;
}>;

async function getMessage(
  teamId: string,
  channelId: string,
  messageId: string
) {
  return {
    id: messageId,
    author: "Alice",
    content: "Has anyone reviewed the PR yet?",
    timestamp: "2026-05-19T10:30:00Z",
    replies: [
      {
        id: "r1",
        author: "Bob",
        content: "Looking at it now!",
        timestamp: "2026-05-19T10:32:00Z",
      },
      {
        id: "r2",
        author: "Carol",
        content: "Approved! Great work.",
        timestamp: "2026-05-19T10:45:00Z",
      },
    ],
  };
}

export default async function MessageThreadPage({
  params,
}: {
  params: Params;
}) {
  const { teamId, channelId, messageId } = await params;
  const message = await getMessage(teamId, channelId, messageId);
  if (!message) notFound();

  return (
    <div className="p-6 max-w-2xl">
      {/* Original message */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-gray-900">{message.author}</span>
          <span className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-800">{message.content}</p>
      </div>

      {/* Thread replies */}
      <div className="border-l-2 border-gray-200 pl-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {message.replies.length} Replies
        </p>
        {message.replies.map((reply) => (
          <div key={reply.id}>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-medium text-sm text-gray-900">
                {reply.author}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(reply.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-700">{reply.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```
Rendered tree for /teams/acme/channels/general/messages/msg-42:

<RootLayout>
  <TeamLayout teamId="acme">           ← team sidebar, fetches team data
    <ChannelLayout channelId="general"> ← channel header + input bar, fetches channel data
      <MessageThreadPage messageId="msg-42" />  ← thread view, fetches message data
    </ChannelLayout>
  </TeamLayout>
</RootLayout>

All 3 data fetches (getTeam, getChannel, getMessage) run in PARALLEL ✅
```

---

---

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

# 7 — Designing Blog Routes — Complete Route Architecture

---

## T — TL;DR

A blog is the canonical exercise for dynamic routing — it needs a listing page, category pages, post pages (dynamic by slug), author pages, and tag pages. Designing it well reveals every App Router pattern in context.

---

## K — Key Concepts

### The Complete Blog Route Map

```
/blog                               → Blog home (recent posts, featured)
/blog/[slug]                        → Individual post
/blog/category/[category]           → Posts by category
/blog/tag/[tag]                     → Posts by tag
/blog/author/[username]             → Posts by author
/blog/archive/[year]/[month]        → Posts by date (nested dynamic)
/blog/search                        → Search results (query via searchParams)
/blog/feed.xml                      → RSS feed (route.ts)
```

### Full Directory Structure

```
src/app/
└── (marketing)/
    └── blog/
        ├── layout.tsx                          ← blog shell layout
        ├── page.tsx                            → /blog
        ├── [slug]/
        │   ├── page.tsx                        → /blog/:slug
        │   ├── loading.tsx
        │   ├── not-found.tsx
        │   └── opengraph-image.tsx             ← dynamic OG image
        ├── category/
        │   └── [category]/
        │       ├── page.tsx                    → /blog/category/:category
        │       └── loading.tsx
        ├── tag/
        │   └── [tag]/
        │       └── page.tsx                    → /blog/tag/:tag
        ├── author/
        │   └── [username]/
        │       └── page.tsx                    → /blog/author/:username
        ├── archive/
        │   └── [year]/
        │       └── [month]/
        │           └── page.tsx                → /blog/archive/:year/:month
        ├── search/
        │   └── page.tsx                        → /blog/search
        └── feed.xml/
            └── route.ts                        → /blog/feed.xml (RSS)
```

### Blog Layout — Shared Shell

```tsx
// src/app/(marketing)/blog/layout.tsx
import Link from "next/link";

const CATEGORIES = ["Tech", "Business", "Design", "Engineering"];

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Blog header */}
      <header className="mb-8">
        <Link href="/blog" className="text-2xl font-bold hover:text-blue-600">
          The Blog
        </Link>
        <nav className="flex gap-4 mt-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/blog/category/${cat.toLowerCase()}`}
              className="text-sm text-gray-500 hover:text-gray-900 capitalize"
            >
              {cat}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
```

### Blog Home — `/blog`

```tsx
// src/app/(marketing)/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest articles and insights",
};

// Mock posts — in production: CMS/DB query
const POSTS = [
  {
    slug: "nextjs-16-guide",
    title: "Next.js 16 Complete Guide",
    category: "tech",
    date: "2026-05-01",
    excerpt: "Everything you need to know.",
  },
  {
    slug: "design-systems-101",
    title: "Design Systems 101",
    category: "design",
    date: "2026-04-20",
    excerpt: "Build consistent UIs.",
  },
  {
    slug: "startup-lessons",
    title: "10 Startup Lessons Learned",
    category: "business",
    date: "2026-04-10",
    excerpt: "Hard-won wisdom.",
  },
];

export default function BlogHomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Latest Articles</h1>
      <p className="text-gray-500 mb-10">
        Insights on tech, design, and business.
      </p>
      <div className="space-y-8">
        {POSTS.map((post) => (
          <article key={post.slug} className="border-b pb-8">
            <Link
              href={`/blog/category/${post.category}`}
              className="text-xs font-semibold text-blue-600 uppercase tracking-wide"
            >
              {post.category}
            </Link>
            <h2 className="text-xl font-bold mt-1 mb-2">
              <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 text-sm mb-3">{post.excerpt}</p>
            <time className="text-xs text-gray-400">{post.date}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
```

### Blog Post — `/blog/[slug]`

```tsx
// src/app/(marketing)/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

// Fake post data
async function getPost(slug: string) {
  const posts: Record<
    string,
    {
      title: string;
      content: string;
      author: string;
      category: string;
      date: string;
      readTime: number;
    }
  > = {
    "nextjs-16-guide": {
      title: "Next.js 16 Complete Guide",
      content: "<p>This is the full guide content...</p>",
      author: "mark",
      category: "tech",
      date: "2026-05-01",
      readTime: 12,
    },
  };
  return posts[slug] ?? null;
}

export async function generateStaticParams() {
  return [
    { slug: "nextjs-16-guide" },
    { slug: "design-systems-101" },
    { slug: "startup-lessons" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };
  return { title: post.title, description: `Read: ${post.title}` };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="max-w-2xl">
      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
        <a
          href={`/blog/category/${post.category}`}
          className="text-blue-600 font-medium capitalize"
        >
          {post.category}
        </a>
        <span>·</span>
        <time>{post.date}</time>
        <span>·</span>
        <span>{post.readTime} min read</span>
      </div>

      <h1 className="text-4xl font-bold leading-tight mb-6">{post.title}</h1>

      <div className="flex items-center gap-3 mb-8 pb-8 border-b">
        <div
          className="w-9 h-9 rounded-full bg-blue-100 flex items-center
                        justify-center font-semibold text-blue-600 text-sm"
        >
          {post.author[0].toUpperCase()}
        </div>
        <div>
          <a
            href={`/blog/author/${post.author}`}
            className="font-medium text-gray-900 hover:text-blue-600 text-sm"
          >
            {post.author}
          </a>
        </div>
      </div>

      <div
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
```

### RSS Feed — `/blog/feed.xml`

```ts
// src/app/(marketing)/blog/feed.xml/route.ts
export async function GET() {
  const posts = [
    {
      title: "Next.js 16 Guide",
      slug: "nextjs-16-guide",
      date: "2026-05-01",
      excerpt: "Guide content",
    },
  ];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mysite.com";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Latest articles</description>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${post.title}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <description>${post.excerpt}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

---

## W — Why It Matters

- The blog architecture is used in technical interviews as a system design question — "design the URL structure for a blog" — knowing this pattern answers it authoritatively.
- The combination of static segments (`category/`, `author/`, `tag/`) before dynamic segments (`[category]`, `[username]`) is what prevents conflicts and creates readable URLs.
- The RSS feed as a `route.ts` response (returning raw XML) demonstrates that API routes aren't just JSON — they can serve any content type, enabling sitemaps, feeds, and webhooks.
- Per-post OG images via `opengraph-image.tsx` at the `[slug]` level are what make blog sharing compelling on social media — each post gets a generated image with its title and author.

---

## I — Interview Q&A

### Q1: How would you design the URL structure for a blog with categories and tags?

**A:** Use static prefixes before dynamic segments to create semantic, conflict-free URLs. Categories: `/blog/category/[category]`. Tags: `/blog/tag/[tag]`. Authors: `/blog/author/[username]`. Posts: `/blog/[slug]`. The static prefix (`category/`, `tag/`, `author/`) disambiguates between `/blog/nextjs-tips` (a post slug) and `/blog/category/tech` (a category page) — without the prefix, `tech` would be ambiguous with a post slug.

### Q2: How do you serve an RSS feed from a Next.js App Router application?

**A:** Create `src/app/blog/feed.xml/route.ts` with an exported `GET` function that returns a `Response` with `Content-Type: application/xml`. Build the XML string with post data and return it. This creates a `/blog/feed.xml` endpoint that serves raw XML. Add `Cache-Control` headers for CDN caching — RSS feeds don't need to be fresh on every request.

### Q3: Where should per-post OG images be placed?

**A:** Place `opengraph-image.tsx` inside the `[slug]/` folder — `src/app/blog/[slug]/opengraph-image.tsx`. This file exports an `ImageResponse` component that receives the post's params, fetches the post title and cover image, and generates a customized social share image. Next.js automatically links it in the `<head>` for each post URL. The `size` and `contentType` exports control the image dimensions and format.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `/blog/[slug]` for both posts AND categories

```
/blog/tech      → Is this a post with slug 'tech' or the tech category?
/blog/nextjs    → Post or category?
```

**Fix:** Prefix category pages with `/blog/category/`:

```
/blog/nextjs-guide             → post (slug)
/blog/category/tech            → category page
/blog/tag/typescript           → tag page
```

### ❌ Pitfall: No `not-found.tsx` for invalid post slugs

```
User visits /blog/typo-in-slug → blank page or confusing error
```

**Fix:**

```tsx
// src/app/(marketing)/blog/[slug]/not-found.tsx
import Link from "next/link";
export default function PostNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
      <p className="text-gray-500 mb-6">
        This article doesn't exist or was removed.
      </p>
      <Link href="/blog" className="text-blue-600 hover:underline">
        ← Back to Blog
      </Link>
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design and implement `/blog/archive/[year]/[month]` that:

1. Shows all posts for that year/month
2. Validates that year is 2020–2026 and month is 1–12
3. Returns `notFound()` for invalid ranges
4. Displays previous/next month navigation links
5. Exports typed params and metadata

### Solution

```tsx
// src/app/(marketing)/blog/archive/[year]/[month]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ year: string; month: string }>;

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function validateArchiveParams(year: string, month: string) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2020 || y > 2026) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function adjacentMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const valid = y >= 2020 && y <= 2026;
  return valid ? { year: y, month: m, href: `/blog/archive/${y}/${m}` } : null;
}

// Fake posts
async function getPostsByMonth(year: number, month: number) {
  return [
    {
      slug: "sample-post-1",
      title: "Sample Post One",
      date: `${year}-${String(month).padStart(2, "0")}-05`,
    },
    {
      slug: "sample-post-2",
      title: "Sample Post Two",
      date: `${year}-${String(month).padStart(2, "0")}-18`,
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year, month } = await params;
  const v = validateArchiveParams(year, month);
  if (!v) return { title: "Archive Not Found" };
  return {
    title: `Archive: ${MONTH_NAMES[v.month]} ${v.year}`,
    description: `All posts from ${MONTH_NAMES[v.month]} ${v.year}`,
  };
}

export default async function ArchivePage({ params }: { params: Params }) {
  const { year, month } = await params;
  const v = validateArchiveParams(year, month);

  if (!v) notFound();

  const posts = await getPostsByMonth(v.year, v.month);
  const prev = adjacentMonth(v.year, v.month, -1);
  const next = adjacentMonth(v.year, v.month, +1);
  const title = `${MONTH_NAMES[v.month]} ${v.year}`;

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <Link href="/blog" className="hover:text-gray-700">
          Blog
        </Link>
        <span>/</span>
        <Link href={`/blog/archive/${v.year}`} className="hover:text-gray-700">
          {v.year}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {MONTH_NAMES[v.month]}
        </span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">Archive: {title}</h1>
      <p className="text-gray-500 mb-8">{posts.length} posts</p>

      {/* Post list */}
      {posts.length === 0 ? (
        <p className="text-gray-400 italic">No posts published this month.</p>
      ) : (
        <ul className="space-y-4 mb-10">
          {posts.map((post) => (
            <li key={post.slug} className="border rounded-lg p-4">
              <time className="text-xs text-gray-400">{post.date}</time>
              <h2 className="font-semibold mt-1">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-blue-600"
                >
                  {post.title}
                </Link>
              </h2>
            </li>
          ))}
        </ul>
      )}

      {/* Prev / Next navigation */}
      <div className="flex justify-between pt-6 border-t">
        {prev ? (
          <Link
            href={prev.href}
            className="text-sm text-blue-600 hover:underline"
          >
            ← {MONTH_NAMES[prev.month]} {prev.year}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={next.href}
            className="text-sm text-blue-600 hover:underline"
          >
            {MONTH_NAMES[next.month]} {next.year} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
```

---

---

# 8 — Designing Dashboard Routes — Multi-Level Navigation

---

## T — TL;DR

A dashboard route architecture combines auth-protected route groups, entity-scoped dynamic layouts, nested sub-navigation, and parallel data fetching. Done right, it gives users persistent, fast navigation across a deeply functional app.

---

## K — Key Concepts

### The Complete Dashboard Route Map

```
/dashboard                          → Overview/home
/dashboard/analytics                → Analytics
/dashboard/orders                   → Order list
/dashboard/orders/[orderId]         → Order detail
/dashboard/products                 → Product list
/dashboard/products/new             → Create product
/dashboard/products/[productId]     → Product detail
/dashboard/products/[productId]/edit → Edit product
/dashboard/customers                → Customer list
/dashboard/customers/[customerId]   → Customer profile
/dashboard/settings                 → Settings home
/dashboard/settings/profile         → Profile settings
/dashboard/settings/billing         → Billing settings
/dashboard/settings/team            → Team settings
```

### Full Directory Structure

```
src/app/
└── (dashboard)/
    ├── layout.tsx                             ← auth guard + sidebar
    └── dashboard/
        ├── page.tsx                           → /dashboard
        ├── analytics/
        │   └── page.tsx                       → /dashboard/analytics
        ├── orders/
        │   ├── page.tsx                       → /dashboard/orders
        │   ├── loading.tsx
        │   └── [orderId]/
        │       ├── page.tsx                   → /dashboard/orders/:orderId
        │       └── not-found.tsx
        ├── products/
        │   ├── page.tsx                       → /dashboard/products
        │   ├── new/
        │   │   └── page.tsx                   → /dashboard/products/new (STATIC first)
        │   └── [productId]/
        │       ├── layout.tsx                 ← fetch product for all product sub-routes
        │       ├── page.tsx                   → /dashboard/products/:productId
        │       ├── edit/
        │       │   └── page.tsx               → /dashboard/products/:productId/edit
        │       └── not-found.tsx
        ├── customers/
        │   ├── page.tsx                       → /dashboard/customers
        │   └── [customerId]/
        │       └── page.tsx                   → /dashboard/customers/:customerId
        └── settings/
            ├── layout.tsx                     ← settings sub-nav (tabs)
            ├── page.tsx                       → /dashboard/settings
            ├── profile/
            │   └── page.tsx                   → /dashboard/settings/profile
            ├── billing/
            │   └── page.tsx                   → /dashboard/settings/billing
            └── team/
                └── page.tsx                   → /dashboard/settings/team
```

### Dashboard Group Layout — Auth Guard + Sidebar

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

### Product Layout — Entity-Scoped Sub-Navigation

```tsx
// src/app/(dashboard)/dashboard/products/[productId]/layout.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ productId: string }>;

async function getProduct(id: string) {
  const products: Record<string, { name: string; status: string }> = {
    "prod-1": { name: "Air Max 90", status: "active" },
    "prod-2": { name: "Canvas Tote", status: "draft" },
  };
  return products[id] ?? null;
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  const tabs = [
    { label: "Overview", href: `/dashboard/products/${productId}` },
    { label: "Edit", href: `/dashboard/products/${productId}/edit` },
  ];

  return (
    <div>
      {/* Product header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                product.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {product.status}
            </span>
          </div>
          {/* Sub-navigation tabs */}
          <nav className="flex gap-4 mt-3">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="text-sm text-gray-500 hover:text-gray-900 pb-1
                           border-b-2 border-transparent hover:border-gray-300"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← All Products
        </Link>
      </div>
      {children}
    </div>
  );
}
```

### Settings Layout — Tabs Sub-Navigation

```tsx
// src/app/(dashboard)/dashboard/settings/layout.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s — Settings", default: "Settings" },
};

const SETTINGS_TABS = [
  { label: "General", href: "/dashboard/settings" },
  { label: "Profile", href: "/dashboard/settings/profile" },
  { label: "Billing", href: "/dashboard/settings/billing" },
  { label: "Team", href: "/dashboard/settings/team" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-600
                             hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- The `new/` static segment before `[productId]` is a critical routing decision — without it, `/dashboard/products/new` would match `[productId]` and attempt to load a product with id="new".
- The product-level `layout.tsx` at `[productId]` level enables tab navigation (Overview / Edit) while only fetching the product once — the layout persists as the user switches tabs.
- Settings using a nested layout with side-nav tabs is the industry-standard SaaS pattern — one layout file enables consistent navigation across all settings sub-pages.
- Auth guard in the outermost `(dashboard)/layout.tsx` is the correct architecture — a single server-side check protects all dashboard routes without per-page guards.

---

## I — Interview Q&A

### Q1: Why put `new/` before `[productId]` in the products directory?

**A:** Static segments take priority over dynamic segments in Next.js. If `[productId]` existed without `new/`, visiting `/dashboard/products/new` would try to render a product with id="new", query the database for it, find nothing, and show a 404 or error. By creating `products/new/page.tsx` as a static segment, Next.js routes `/dashboard/products/new` to the creation form — which is the intended behavior. The dynamic `[productId]` only matches non-"new" values.

### Q2: How do you share product data across both the product overview and edit pages?

**A:** Place a `layout.tsx` at the `[productId]` level — it fetches the product once and provides the entity header/sub-navigation. Both the overview page (`page.tsx`) and edit page (`edit/page.tsx`) are rendered as `children` inside this layout. The layout persists while the user switches between the two tabs — no redundant data fetching. For data sharing between layout and page, use React's `cache()` to deduplicate the fetch call.

### Q3: Where is the best place to put the authentication check for a dashboard?

**A:** In the outermost group layout — `src/app/(dashboard)/layout.tsx`. This is a Server Component that runs before any page renders. One auth check protects every route in the group. Middleware (`middleware.ts`) is the other valid location and runs even earlier (before the layout), making it ideal for redirecting unauthenticated users before any server work happens. The defense-in-depth pattern uses both: middleware for the fast redirect, layout for fetching the user object needed by the UI.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `new/` static segment — `/products/new` matches `[productId]`

```
src/app/(dashboard)/dashboard/products/
└── [productId]/
    └── page.tsx       → /dashboard/products/new → tries to load product id="new" → 404
```

**Fix:** Add the static segment first:

```
src/app/(dashboard)/dashboard/products/
├── new/
│   └── page.tsx       → /dashboard/products/new ✅ (static wins)
└── [productId]/
    └── page.tsx       → /dashboard/products/:id ✅ (dynamic fallback)
```

### ❌ Pitfall: Auth guard inside every page instead of the group layout

```tsx
// ❌ Repeated in every dashboard page
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← duplicated 20 times across pages
  // ...
}
```

**Fix:** One auth check in `(dashboard)/layout.tsx` covers all pages:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← runs once, protects all dashboard routes
  return <>{children}</>;
}
```

### ❌ Pitfall: Fetching product in both `[productId]/layout.tsx` AND `[productId]/page.tsx`

```tsx
// layout.tsx
const product = await getProduct(productId);

// page.tsx (same segment)
const product = await getProduct(productId); // ← duplicate DB call
```

**Fix:** Wrap the DB call in React's `cache()` so it deduplicates within a request:

```ts
// src/lib/queries.ts
import { cache } from "react";
import { db } from "@/lib/db";

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } });
});
// Called in layout + page → ONE database query total ✅
```

### ❌ Pitfall: Settings layout adding `<html>` and `<body>` tags

```tsx
// src/app/(dashboard)/dashboard/settings/layout.tsx
export default function SettingsLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — only root layout has these
      <body>{children}</body>
    </html>
  );
}
```

**Fix:** Nested layouts return only their wrapper elements:

```tsx
export default function SettingsLayout({ children }) {
  return (
    <div className="max-w-3xl">
      {" "}
      // ← just the section wrapper
      <h1>Settings</h1>
      {children}
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build the `/dashboard/orders/[orderId]` route with:

1. A group layout (`(dashboard)/layout.tsx`) that checks auth and shows a sidebar
2. An orders list page (`/dashboard/orders`) showing 3 hardcoded orders
3. An order detail page (`/dashboard/orders/[orderId]`) with full typed params
4. A `not-found.tsx` specific to the orders section
5. `generateMetadata` using the order number
6. A back link that returns to the orders list

### Solution

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

// Mock auth
async function getCurrentUser() {
  return { id: "user-1", name: "Mark", role: "admin" };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const NAV = [
    { label: "Overview", href: "/dashboard" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Products", href: "/dashboard/products" },
    { label: "Customers", href: "/dashboard/customers" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <span className="font-bold text-lg">Dashboard</span>
          <p className="text-xs text-gray-400 mt-0.5">{user.name}</p>
        </div>
        <nav className="p-3 flex-1 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-400
                         hover:text-white hover:bg-gray-800 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Orders" };

const ORDERS = [
  {
    id: "ord-001",
    number: 1042,
    customer: "Alice Johnson",
    total: 249.0,
    status: "delivered",
    date: "2026-05-10",
  },
  {
    id: "ord-002",
    number: 1043,
    customer: "Bob Smith",
    total: 89.99,
    status: "pending",
    date: "2026-05-15",
  },
  {
    id: "ord-003",
    number: 1044,
    customer: "Carol White",
    total: 420.5,
    status: "shipped",
    date: "2026-05-18",
  },
];

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  shipped: "bg-blue-100 text-blue-700",
};

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Order", "Customer", "Total", "Status", "Date", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ORDERS.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{order.number}</td>
                <td className="px-4 py-3 text-gray-600">{order.customer}</td>
                <td className="px-4 py-3 font-medium">
                  ${order.total.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{order.date}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/[orderId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ orderId: string }>;

const ORDERS: Record<
  string,
  {
    number: number;
    customer: string;
    email: string;
    total: number;
    status: string;
    date: string;
    items: { name: string; qty: number; price: number }[];
  }
> = {
  "ord-001": {
    number: 1042,
    customer: "Alice Johnson",
    email: "alice@example.com",
    total: 249.0,
    status: "delivered",
    date: "2026-05-10",
    items: [
      { name: "Air Max 90", qty: 1, price: 120.0 },
      { name: "Canvas Tote", qty: 1, price: 45.0 },
      { name: "Wool Cap", qty: 2, price: 35.0 },
    ],
  },
  "ord-002": {
    number: 1043,
    customer: "Bob Smith",
    email: "bob@example.com",
    total: 89.99,
    status: "pending",
    date: "2026-05-15",
    items: [
      { name: "Leather Belt", qty: 1, price: 55.0 },
      { name: "Wool Cap", qty: 1, price: 35.0 },
    ],
  },
  "ord-003": {
    number: 1044,
    customer: "Carol White",
    email: "carol@example.com",
    total: 420.5,
    status: "shipped",
    date: "2026-05-18",
    items: [
      { name: "Ultraboost 22", qty: 1, price: 180.0 },
      { name: "Leather Bag", qty: 1, price: 220.0 },
      { name: "Wool Cap", qty: 1, price: 35.0 },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { orderId } = await params;
  const order = ORDERS[orderId];
  if (!order) return { title: "Order Not Found" };
  return {
    title: `Order #${order.number}`,
    description: `Order by ${order.customer} — $${order.total}`,
  };
}

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { orderId } = await params;
  const order = ORDERS[orderId];

  if (!order) notFound();

  const STATUS_STYLES: Record<string, string> = {
    delivered: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/orders"
        className="flex items-center gap-1 text-sm text-gray-500
                   hover:text-gray-900 mb-6 transition-colors"
      >
        ← Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[order.status]}`}
        >
          {order.status}
        </span>
      </div>

      {/* Customer info */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wide">
          Customer
        </h2>
        <p className="font-medium">{order.customer}</p>
        <p className="text-sm text-gray-500">{order.email}</p>
      </div>

      {/* Order items */}
      <div className="bg-white border rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
            Items
          </h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.qty}</p>
              </div>
              <span className="font-medium text-sm">
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between px-5 py-3 border-t bg-gray-50">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-blue-600">
            ${order.total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/[orderId]/not-found.tsx
import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📦</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        This order doesn't exist or you don't have permission to view it.
      </p>
      <Link
        href="/dashboard/orders"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← Back to Orders
      </Link>
    </div>
  );
}
```

---

---

# 9 — Multi-Section App Structures — Combining All Patterns

---

## T — TL;DR

Real production apps combine every routing pattern at once: route groups for layout isolation, dynamic segments for entities, catch-all routes for content, nested layouts for context, and `generateStaticParams` for performance. This subtopic assembles them all into a complete, real-world app structure.

---

## K — Key Concepts

### The Reference App — "SaaSHub" Route Map

```
SaaSHub: a SaaS product with a public site, auth, app, admin, and docs

PUBLIC SECTION:
  /                         → Landing page
  /pricing                  → Pricing page
  /blog                     → Blog home
  /blog/[slug]              → Blog post
  /changelog                → Changelog

AUTH SECTION:
  /login                    → Login
  /register                 → Register
  /forgot-password          → Forgot password
  /verify-email             → Email verification

ONBOARDING SECTION:
  /onboarding               → Welcome step
  /onboarding/workspace     → Create workspace step
  /onboarding/invite        → Invite team step
  /onboarding/done          → Completion step

APP SECTION (authenticated):
  /app                      → App home / redirect
  /app/[workspaceId]                → Workspace overview
  /app/[workspaceId]/projects       → Project list
  /app/[workspaceId]/projects/[id]  → Project detail
  /app/[workspaceId]/members        → Member management
  /app/[workspaceId]/settings       → Workspace settings

ACCOUNT SECTION:
  /account                  → Account overview
  /account/profile          → Profile settings
  /account/security         → Security settings
  /account/billing          → Billing / subscription

DOCS SECTION:
  /docs                     → Docs home
  /docs/[[...path]]         → All doc pages

ADMIN SECTION (admin role required):
  /admin                    → Admin overview
  /admin/users              → User management
  /admin/workspaces         → Workspace management
  /admin/billing            → Billing overview
  /admin/logs               → Audit logs

API ROUTES:
  /api/auth/[...nextauth]   → Auth callbacks
  /api/workspaces           → Workspace CRUD
  /api/projects             → Project CRUD
  /api/webhooks/stripe      → Stripe webhooks
```

### Complete Directory Structure

```
src/app/
│
├── layout.tsx                              ← ROOT (html, body, providers, fonts)
├── globals.css
├── _providers.tsx                          ← 'use client' — QueryClient, ThemeProvider
│
├── (public)/                               ← top nav + footer
│   ├── layout.tsx
│   ├── page.tsx                            → /
│   ├── pricing/page.tsx                    → /pricing
│   ├── changelog/page.tsx                  → /changelog
│   └── blog/
│       ├── layout.tsx                      ← blog shell layout
│       ├── page.tsx                        → /blog
│       ├── [slug]/
│       │   ├── page.tsx                    → /blog/:slug
│       │   ├── loading.tsx
│       │   ├── not-found.tsx
│       │   └── opengraph-image.tsx
│       └── feed.xml/route.ts              → /blog/feed.xml
│
├── (auth)/                                 ← centered card, no nav
│   ├── layout.tsx
│   ├── login/page.tsx                      → /login
│   ├── register/page.tsx                   → /register
│   ├── forgot-password/page.tsx            → /forgot-password
│   └── verify-email/page.tsx              → /verify-email
│
├── (onboarding)/                           ← full-screen stepper
│   ├── layout.tsx
│   └── onboarding/
│       ├── page.tsx                        → /onboarding
│       ├── workspace/page.tsx              → /onboarding/workspace
│       ├── invite/page.tsx                 → /onboarding/invite
│       └── done/page.tsx                   → /onboarding/done
│
├── (app)/                                  ← sidebar, auth required
│   ├── layout.tsx                          ← auth guard + shell
│   └── app/
│       ├── page.tsx                        → /app (redirect to last workspace)
│       └── [workspaceId]/
│           ├── layout.tsx                  ← fetch workspace, workspace nav
│           ├── page.tsx                    → /app/:workspaceId
│           ├── projects/
│           │   ├── page.tsx                → /app/:workspaceId/projects
│           │   ├── new/page.tsx            → /app/:workspaceId/projects/new (STATIC)
│           │   └── [projectId]/
│           │       ├── layout.tsx          ← fetch project, project tabs
│           │       ├── page.tsx            → /app/:workspaceId/projects/:projectId
│           │       └── settings/page.tsx   → /app/:workspaceId/projects/:projectId/settings
│           ├── members/page.tsx            → /app/:workspaceId/members
│           └── settings/
│               ├── layout.tsx              ← settings tabs nav
│               ├── page.tsx                → /app/:workspaceId/settings
│               └── billing/page.tsx        → /app/:workspaceId/settings/billing
│
├── (account)/                              ← account settings, auth required
│   ├── layout.tsx
│   └── account/
│       ├── layout.tsx                      ← account tabs nav
│       ├── page.tsx                        → /account
│       ├── profile/page.tsx                → /account/profile
│       ├── security/page.tsx               → /account/security
│       └── billing/page.tsx                → /account/billing
│
├── (docs)/                                 ← docs sidebar
│   ├── layout.tsx
│   └── docs/
│       └── [[...path]]/
│           └── page.tsx                    → /docs AND /docs/*
│
├── (admin)/                                ← admin sidebar, admin role required
│   ├── layout.tsx
│   └── admin/
│       ├── page.tsx                        → /admin
│       ├── users/page.tsx                  → /admin/users
│       ├── workspaces/page.tsx             → /admin/workspaces
│       ├── billing/page.tsx                → /admin/billing
│       └── logs/page.tsx                   → /admin/logs
│
├── sitemap.ts                              → /sitemap.xml
├── robots.ts                               → /robots.txt
├── favicon.ico
├── opengraph-image.png
│
└── api/
    ├── auth/
    │   └── [...nextauth]/route.ts          → /api/auth/*
    ├── workspaces/
    │   └── route.ts                        → /api/workspaces
    ├── projects/
    │   └── route.ts                        → /api/projects
    └── webhooks/
        └── stripe/route.ts                 → /api/webhooks/stripe
```

### The Root Layout — Ties It All Together

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://saashub.com"
  ),
  title: {
    template: "%s | SaaSHub",
    default: "SaaSHub — Build Better Products",
  },
  description: "The all-in-one workspace for modern teams.",
  openGraph: {
    type: "website",
    siteName: "SaaSHub",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", creator: "@saashub" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Layout Decision Matrix — Which Pattern for Each Section

```
Section         Route Group    Layout Type          Auth Required   Dynamic?
─────────────   ───────────    ─────────────────    ─────────────   ────────
Public          (public)       top nav + footer      No             blog [slug]
Auth            (auth)         centered card          No             No
Onboarding      (onboarding)   full-screen stepper    Yes (user)     No
App             (app)          sidebar                Yes (user)     [workspaceId]
Account         (account)      settings tabs          Yes (user)     No
Docs            (docs)         sidebar + TOC          No             [[...path]]
Admin           (admin)        admin sidebar          Yes (admin)    No
```

### Workspace Layout — Entity-Scoped with Sub-Nav

```tsx
// src/app/(app)/app/[workspaceId]/layout.tsx
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

async function getWorkspace(userId: string, workspaceId: string) {
  // In production: verify user has access to this workspace
  return { id: workspaceId, name: "Acme Corp", plan: "pro" };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace(user.id, workspaceId);
  if (!workspace) notFound();

  const NAV = [
    { label: "Overview", href: `/app/${workspaceId}` },
    { label: "Projects", href: `/app/${workspaceId}/projects` },
    { label: "Members", href: `/app/${workspaceId}/members` },
    { label: "Settings", href: `/app/${workspaceId}/settings` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <div className="h-12 bg-white border-b flex items-center px-6 gap-4 shrink-0">
        <span className="font-semibold text-gray-900">{workspace.name}</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
          {workspace.plan}
        </span>
        <nav className="flex gap-1 ml-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-md text-sm text-gray-500
                         hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {/* Page content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
```

### Render Trees for Key Routes

```
Route: / (landing page)
  <RootLayout>
    <PublicLayout>           ← top nav + footer
      <LandingPage />
    </PublicLayout>
  </RootLayout>

Route: /login
  <RootLayout>
    <AuthLayout>             ← centered card, no nav
      <LoginPage />
    </AuthLayout>
  </RootLayout>

Route: /app/acme/projects/proj-1
  <RootLayout>
    <AppLayout>              ← auth guard + sidebar (user fetched)
      <WorkspaceLayout>      ← workspace top bar (workspace fetched)
        <ProjectLayout>      ← project tabs (project fetched)
          <ProjectPage />    ← project content
        </ProjectLayout>
      </WorkspaceLayout>
    </AppLayout>
  </RootLayout>

Route: /docs/api/authentication
  <RootLayout>
    <DocsLayout>             ← docs sidebar + TOC
      <DocsPage />           ← [[...path]] catches /api/authentication
    </DocsLayout>
  </RootLayout>

Route: /admin/users
  <RootLayout>
    <AdminLayout>            ← admin sidebar (admin role check)
      <AdminUsersPage />
    </AdminLayout>
  </RootLayout>
```

---

## W — Why It Matters

- Real apps are never a single section — they combine public marketing, auth flows, onboarding, app shell, settings, and admin. Understanding how route groups isolate each section cleanly is what separates a messy monolith from a well-architected app.
- The workspace-scoped URL pattern (`/app/[workspaceId]/projects`) is the industry standard for multi-tenant SaaS — the workspaceId in the URL makes deep linking work, allows multiple workspaces in separate tabs, and enables permission checks at the layout level.
- The layout decision matrix (which auth, which layout type, which group) is the architectural thinking you need before starting any Next.js project — getting this wrong at the start means painful refactoring later.
- Knowing which data to fetch at which layout level (user in `(app)/layout.tsx`, workspace in `[workspaceId]/layout.tsx`, project in `[projectId]/layout.tsx`) ensures data is fetched at the highest point it's needed, never re-fetched unnecessarily, and scoped correctly.

---

## I — Interview Q&A

### Q1: How do you handle multiple workspaces for a user in the URL structure?

**A:** Use a dynamic segment `[workspaceId]` as the top-level segment of the app section — `/app/[workspaceId]/...`. Each workspace has its own URL namespace. Users can have multiple workspace tabs open simultaneously (`/app/acme/projects` and `/app/beta-corp/projects`). The workspace layout fetches and validates workspace membership — if the user doesn't have access to a workspace, they get a 404 or redirect. The workspaceId makes deep links work: share `/app/acme/projects/proj-1` and the recipient goes directly to that project in that workspace.

### Q2: How do you prevent someone from accessing `/app/other-company/projects`?

**A:** At the workspace layout level (`[workspaceId]/layout.tsx`), after confirming the user is authenticated, fetch the workspace AND verify the user has access to it. If `getWorkspace(user.id, workspaceId)` returns null (no access), call `notFound()`. This is a server-side check that runs before any page content renders. Middleware can add a first layer of auth, but the workspace-level authorization must happen in the layout where you know both the user and the workspace.

### Q3: How do you share the user object across all authenticated sections without re-fetching?

**A:** Use React's `cache()` to wrap the `getCurrentUser()` function. The first call to `getCurrentUser()` in `(app)/layout.tsx` hits the database. Any subsequent call within the same request — in a deeper layout, a page, or a Server Component — returns the cached result. This means the user is fetched exactly once per request regardless of how many layouts call it. For the app-wide provider pattern (making user available to Client Components), pass the user as a prop to a client-side context provider inside the root layout.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting everything in one giant layout with conditional rendering

```tsx
// ❌ One layout trying to be all things
export default function RootLayout({ children }) {
  const pathname = usePathname(); // ← hooks in Server Component = error
  const showSidebar = pathname.startsWith("/app");
  const showNav = pathname.startsWith("/blog");
  // Grows to hundreds of lines, impossible to maintain
}
```

**Fix:** Use route groups — each section has its own focused layout:

```
(public)/layout.tsx   → 20 lines (nav + footer)
(auth)/layout.tsx     → 10 lines (centered card)
(app)/layout.tsx      → 30 lines (sidebar + auth)
(admin)/layout.tsx    → 25 lines (admin sidebar + role check)
```

### ❌ Pitfall: Forgetting workspace authorization — only checking authentication

```tsx
// ❌ Only checks if user is logged in — not if they have workspace access
export default async function WorkspaceLayout({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ← Missing: does this user have access to this workspaceId?
  return <>{children}</>;
}
```

**Fix:**

```tsx
export default async function WorkspaceLayout({ children, params }) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getUserWorkspace(user.id, workspaceId); // ← authorization check
  if (!workspace) notFound(); // ← user doesn't have access

  return <>{children}</>;
}
```

### ❌ Pitfall: Duplicating the docs catch-all across multiple files

```
src/app/(docs)/docs/
├── page.tsx                    ← home
├── getting-started/page.tsx    ← manually created
├── api/page.tsx                ← manually created
├── api/auth/page.tsx           ← manually created
// 50 more manual files...
```

**Fix:** Use `[[...path]]` with one file and dynamic content loading:

```
src/app/(docs)/docs/
└── [[...path]]/
    └── page.tsx    ← handles ALL docs routes including home
```

---

## K — Coding Challenge + Solution

### Challenge

Build the core of the `(app)` section with:

1. `(app)/layout.tsx` — auth guard, sidebar with workspace switcher, user menu
2. `app/[workspaceId]/layout.tsx` — workspace nav bar with 4 tabs
3. `app/[workspaceId]/page.tsx` — workspace overview with 3 stat cards
4. Rendered tree documented in comments
5. All params typed and awaited

### Solution

```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

async function getCurrentUser() {
  // Mock — replace with real auth
  return {
    id: "u1",
    name: "Mark Austin",
    email: "mark@example.com",
    avatarInitial: "M",
  };
}

async function getUserWorkspaces(userId: string) {
  return [
    { id: "acme", name: "Acme Corp" },
    { id: "beta-co", name: "Beta Co" },
  ];
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Rendered tree: <RootLayout> → <AppLayout> → [WorkspaceLayout] → [Page]
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/app");

  const workspaces = await getUserWorkspaces(user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* ─── Global sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        {/* App logo */}
        <div className="p-4 border-b border-slate-700">
          <Link href="/app" className="font-bold text-lg text-white">
            SaaSHub
          </Link>
        </div>

        {/* Workspace list */}
        <div className="p-3 flex-1 overflow-auto">
          <p className="text-xs text-slate-500 font-semibold uppercase px-2 mb-2">
            Workspaces
          </p>
          <ul className="space-y-0.5">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/app/${ws.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                             text-slate-400 hover:text-white hover:bg-slate-800
                             transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded bg-blue-600 flex items-center
                                   justify-center text-xs font-bold shrink-0"
                  >
                    {ws.name[0]}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-700 pt-3">
            <Link
              href="/account"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                         text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Account
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                         text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Docs
            </Link>
          </div>
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center
                            justify-center text-xs font-bold shrink-0"
            >
              {user.avatarInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main content area — workspace layout renders here */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/layout.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

async function getWorkspace(workspaceId: string) {
  const workspaces: Record<
    string,
    { name: string; plan: "free" | "pro" | "enterprise" }
  > = {
    acme: { name: "Acme Corp", plan: "pro" },
    "beta-co": { name: "Beta Co", plan: "enterprise" },
  };
  return workspaces[workspaceId] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);
  return {
    title: {
      template: `%s — ${workspace?.name ?? "Workspace"}`,
      default: workspace?.name ?? "Workspace",
    },
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  // Rendered tree: <AppLayout> → <WorkspaceLayout> → [Page]
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) notFound();

  const PLAN_STYLE: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    pro: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  };

  const TABS = [
    { label: "Overview", href: `/app/${workspaceId}` },
    { label: "Projects", href: `/app/${workspaceId}/projects` },
    { label: "Members", href: `/app/${workspaceId}/members` },
    { label: "Settings", href: `/app/${workspaceId}/settings` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <header className="h-14 bg-white border-b flex items-center px-6 gap-3 shrink-0">
        <h1 className="font-semibold text-gray-900">{workspace.name}</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PLAN_STYLE[workspace.plan]}`}
        >
          {workspace.plan}
        </span>

        {/* Tab navigation */}
        <nav className="flex gap-0.5 ml-4" aria-label="Workspace navigation">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-1.5 rounded-md text-sm text-gray-500
                         hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/page.tsx
// Rendered tree: <RootLayout> → <AppLayout> → <WorkspaceLayout> → <WorkspaceOverviewPage>
import type { Metadata } from "next";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

export const metadata: Metadata = { title: "Overview" };

const STATS = [
  {
    label: "Active Projects",
    value: "12",
    change: "+2 this month",
    positive: true,
  },
  { label: "Team Members", value: "8", change: "+1 this week", positive: true },
  { label: "Open Tasks", value: "47", change: "-5 this week", positive: true },
];

const RECENT_PROJECTS = [
  { id: "proj-1", name: "Website Redesign", status: "active", progress: 72 },
  { id: "proj-2", name: "Mobile App v2", status: "active", progress: 38 },
  { id: "proj-3", name: "API Integration", status: "paused", progress: 55 },
];

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceId } = await params;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Overview</h2>
        <Link
          href={`/app/${workspaceId}/projects/new`}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* ─── Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p
              className={`text-xs mt-1 font-medium ${
                stat.positive ? "text-green-600" : "text-red-500"
              }`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Recent projects */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Recent Projects</h3>
          <Link
            href={`/app/${workspaceId}/projects`}
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {RECENT_PROJECTS.map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/${workspaceId}/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4
                           hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      project.status === "active"
                        ? "bg-green-500"
                        : "bg-yellow-400"
                    }`}
                  />
                  <span className="font-medium text-sm text-gray-900">
                    {project.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Progress bar */}
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {project.progress}%
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

---

# 10 — Route Conflicts, Priority, and Edge Cases

---

## T — TL;DR

Next.js follows **deterministic routing priority rules** — when multiple files could match a URL, one always wins. Knowing these rules lets you design routes confidently and debug mysterious 404s and wrong-page renders quickly.

---

## K — Key Concepts

### Priority Rule 1 — Static Beats Dynamic

```
Given:
  src/app/products/new/page.tsx      ← static
  src/app/products/[id]/page.tsx     ← dynamic

URL: /products/new
→ Renders: products/new/page.tsx     ← static WINS

URL: /products/42
→ Renders: products/[id]/page.tsx    ← dynamic (no static match)

URL: /products/featured
→ Renders: products/[id]/page.tsx    ← dynamic (no static match)
```

### Priority Rule 2 — Dynamic Beats Catch-All

```
Given:
  src/app/docs/[slug]/page.tsx       ← dynamic (single segment)
  src/app/docs/[...path]/page.tsx    ← catch-all (multiple segments)

URL: /docs/introduction
→ Renders: docs/[slug]/page.tsx      ← dynamic (one segment = exact match)

URL: /docs/api/auth/overview
→ Renders: docs/[...path]/page.tsx   ← catch-all (3 segments, dynamic can't match)
```

### Priority Rule 3 — Required Catch-All Beats Optional When Segments Exist

```
Given:
  src/app/docs/[...required]/page.tsx    ← required catch-all
  src/app/docs/[[...optional]]/page.tsx  ← optional catch-all

⚠️ You cannot have BOTH in the same folder — it's a build error
These are mutually exclusive.

Rule: Choose ONE:
  [[...slug]] if you also want /docs (base path)
  [...slug]   if /docs should be a separate page.tsx
```

### Priority Rule 4 — Specificity Wins at Every Level

```
URL: /blog/2026/05/hello-world

Possible matches (most specific → least specific):
  1. blog/2026/05/[slug]/page.tsx      ← exact depth match with dynamic last
  2. blog/2026/[month]/[slug]/page.tsx ← dynamic month
  3. blog/[year]/[month]/[slug]/page.tsx ← all dynamic
  4. blog/[...path]/page.tsx            ← catch-all (least specific)

Next.js picks #1 (deepest specific match)
```

### Complete Priority Hierarchy

```
Priority order (highest → lowest) for a single URL:
  1. Static segment           → /blog/new/page.tsx
  2. Dynamic segment          → /blog/[slug]/page.tsx
  3. Catch-all segment        → /blog/[...slug]/page.tsx
  4. Optional catch-all       → /blog/[[...slug]]/page.tsx

Within the same type:
  → More specific path wins (more static segments = more specific)
  → /blog/featured/page.tsx  beats  /blog/[slug]/page.tsx

Across nested levels:
  → Static at any level beats dynamic at that level
  → /a/b/c/page.tsx beats /a/b/[x]/page.tsx for /a/b/c
```

### Route Conflicts — What Causes Build Errors

```
❌ Conflict 1: Two files resolve to the same URL
  (groupA)/about/page.tsx  → /about
  (groupB)/about/page.tsx  → /about
  Error: "Conflicting routes: /about"

❌ Conflict 2: page.tsx AND route.ts in same folder
  products/page.tsx         → /products (UI)
  products/route.ts         → /products (API)
  Error: "You cannot define a route and a page at the same level"

❌ Conflict 3: [...slug] AND [[...slug]] in same folder
  docs/[...slug]/page.tsx
  docs/[[...slug]]/page.tsx
  Error: "Conflicting catch-all routes"

❌ Conflict 4: Same dynamic name at same level
  [id]/page.tsx
  [slug]/page.tsx
  (in same parent folder)
  Error: "Two different param names at the same level"
```

### Edge Case — Parallel Routes and Slots

```tsx
// Parallel routes use @ prefix — not a URL segment
// src/app/dashboard/
//   ├── layout.tsx        ← receives @analytics and @revenue
//   ├── page.tsx          → /dashboard (default slot)
//   ├── @analytics/
//   │   └── page.tsx      ← slot content (no URL)
//   └── @revenue/
//       └── page.tsx      ← slot content (no URL)

// layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  revenue,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode; // ← @analytics/page.tsx
  revenue: React.ReactNode; // ← @revenue/page.tsx
}) {
  return (
    <div>
      <div>{children}</div>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>{analytics}</div>
        <div>{revenue}</div>
      </div>
    </div>
  );
}
```

### Edge Case — Intercepting Routes

```
// Intercepting routes catch a navigation and render it differently
// (.) = same level  (..) = one level up  (...) = root level

src/app/
├── photos/
│   ├── page.tsx              → /photos (gallery)
│   └── [id]/
│       └── page.tsx          → /photos/42 (full photo page — on direct visit or refresh)
│
└── @modal/
    ├── default.tsx           ← null (no active modal)
    └── (.)photos/
        └── [id]/
            └── page.tsx      ← /photos/42 (modal — when navigated from gallery)
```

```
Behavior:
  Direct URL visit: /photos/42
  → Renders: photos/[id]/page.tsx (full page, no modal)

  Click from /photos gallery:
  → URL changes to /photos/42
  → Renders: @modal/(.)photos/[id]/page.tsx (modal overlay)
  → Gallery remains in background

  Page refresh at /photos/42 when modal is open:
  → Renders: photos/[id]/page.tsx (full page — modal state lost, correct)
```

### `dynamicParams` Behavior Summary

```tsx
// src/app/products/[id]/page.tsx

export const dynamicParams = true; // DEFAULT
// → Unknown params: rendered on-demand (SSR), then cached
// → /products/999 (not in generateStaticParams) → renders ✅

export const dynamicParams = false;
// → Unknown params: 404
// → /products/999 (not in generateStaticParams) → 404 ✅
// Use for: docs sites, blogs — all content known at build time
```

### Debugging Route Issues — Checklist

```
❓ Getting 404 on a route I created?
  ✅ Check: does the folder have a page.tsx (not just layout.tsx)?
  ✅ Check: is the folder inside app/ directory?
  ✅ Check: using [...slug] for base path? Switch to [[...slug]]
  ✅ Check: dynamic segment name matches what you're testing?
  ✅ Check: no typo in folder name (capital letters matter on Linux)

❓ Wrong page rendering for a URL?
  ✅ Check: static vs dynamic priority — does a static route exist?
  ✅ Check: is a route group consuming the segment unexpectedly?
  ✅ Check: are you looking at a cached dev build? Run next build

❓ Build error "conflicting routes"?
  ✅ Check: same URL from two route groups
  ✅ Check: page.tsx + route.ts in same folder
  ✅ Check: two dynamic segments with different names at same level

❓ Params are undefined?
  ✅ Check: awaiting params? (Next.js 15+ requires await)
  ✅ Check: using useParams in Client Component (not props)?
  ✅ Check: the segment name matches the folder name exactly?
```

---

## W — Why It Matters

- Understanding priority rules lets you design routes with confidence — you know exactly which file handles `/products/new` without guessing, and can plan your static/dynamic routing deliberately.
- Route conflict errors are build-time failures — they prevent deployment. Knowing the conflict rules means you catch them in code review, not in CI.
- The intercepting route pattern (`(.)photos/[id]`) is what powers Instagram-style modals — clicking a photo opens a modal with the photo URL, refreshing shows the full photo page. This is a UX pattern used in every major social platform.
- `dynamicParams = false` is a security and correctness tool for content sites — it prevents route enumeration (users guessing IDs) and ensures your app only serves pre-approved content at known URLs.

---

## I — Interview Q&A

### Q1: If you have `/products/new/page.tsx` and `/products/[id]/page.tsx`, which handles `/products/new`?

**A:** `products/new/page.tsx` handles it — static routes always take priority over dynamic routes at the same level. Next.js evaluates routes from most specific to least specific. A literal folder name (`new`) is more specific than a parameterized folder name (`[id]`). This is intentional — it lets you add special pages like `new`, `featured`, or `popular` alongside dynamic product pages without any configuration.

### Q2: What causes a "conflicting routes" build error?

**A:** There are three main causes. First: two route groups have the same folder structure inside them — `(groupA)/about/page.tsx` and `(groupB)/about/page.tsx` both claim `/about`. Second: `page.tsx` and `route.ts` exist in the same directory — they both claim the same URL for UI and API respectively. Third: two different dynamic segment names at the same level — `[id]/page.tsx` and `[slug]/page.tsx` in the same parent folder. All are caught at build time.

### Q3: What is an intercepting route and when would you use one?

**A:** An intercepting route catches a navigation to a URL and renders it differently without changing the URL — typically as a modal overlay. The syntax uses parentheses with dots: `(.)` for same level, `(..)` for one level up. The classic use case is an image gallery: clicking a photo navigates to `/photos/42` and shows a modal while the gallery stays in the background. Refreshing at `/photos/42` shows the full standalone photo page. It's how Instagram, Pinterest, and Vercel's dashboard implement their modal-with-deep-link pattern.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Two dynamic segments with different names at the same level

```
src/app/
└── products/
    ├── [id]/page.tsx      ← dynamic
    └── [slug]/page.tsx    ← ALSO dynamic at same level
// Build error: cannot have two different param names at the same segment
```

**Fix:** Use only one dynamic segment at each level — pick the most semantically correct name:

```
src/app/products/[id]/page.tsx    ← one dynamic segment ✅
```

### ❌ Pitfall: Relying on dynamic segment for a URL that should be static

```
// Developer wants /products/new to show a creation form
// But only has [id]/page.tsx
// User visits /products/new → renders "product with id='new'" → DB query for 'new' → 404
```

**Fix:** Add the static segment BEFORE the dynamic one:

```
src/app/products/
├── new/page.tsx           → /products/new ✅ (static, wins)
└── [id]/page.tsx          → /products/:id ✅ (dynamic fallback)
```

### ❌ Pitfall: Forgetting `default.tsx` in parallel routes

```tsx
// @modal/ slot exists — no default.tsx
// User navigates directly to /dashboard (no modal active)
// → Error: "No route matches for @modal slot"
```

**Fix:** Always add `default.tsx` to parallel route slots:

```tsx
// src/app/dashboard/@modal/default.tsx
export default function ModalDefault() {
  return null; // ← renders nothing when no modal is active
}
```

### ❌ Pitfall: Using `dynamicParams = false` on a blog with new posts

```tsx
// dynamicParams = false on blog posts
// Editor publishes new post after build
// Users visit the new post URL → 404 (not in pre-built params)
```

**Fix:** Use `dynamicParams = true` (default) with ISR for content that updates:

```tsx
export const dynamicParams = true; // unknown slugs render on-demand
export const revalidate = 3600; // re-validate every hour
// New posts are accessible immediately (SSR on first visit, cached after)
```

---

## K — Coding Challenge + Solution

### Challenge

Design and implement a routing solution for a photo portfolio with these requirements:

1. `/gallery` — shows all photos (grid layout)
2. `/gallery/[id]` — full photo page (on direct visit or refresh)
3. Clicking a photo from the gallery opens a modal at `/gallery/[id]` (intercepting route)
4. `/gallery/new` — upload form (static segment, NOT matched by `[id]`)
5. `dynamicParams = false` — only pre-built photo IDs are valid
6. Show the complete file structure and all key files

### Solution

```
File structure:
src/app/
└── (gallery)/
    ├── layout.tsx                         ← gallery shell (handles @modal slot)
    ├── gallery/
    │   ├── page.tsx                       → /gallery (photo grid)
    │   ├── new/
    │   │   └── page.tsx                   → /gallery/new (upload form — static)
    │   └── [id]/
    │       ├── page.tsx                   → /gallery/:id (full page on direct visit)
    │       └── loading.tsx
    └── @modal/
        ├── default.tsx                    ← null (no modal active)
        └── (.)gallery/
            └── [id]/
                └── page.tsx              ← /gallery/:id (modal when clicked from gallery)
```

```tsx
// src/app/(gallery)/layout.tsx
// Receives @modal as a slot — renders it as an overlay when active
export default function GalleryLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode; // ← @modal slot
}) {
  return (
    <>
      {children}
      {modal} {/* ← modal renders here as overlay when intercepted */}
    </>
  );
}
```

```tsx
// src/app/(gallery)/@modal/default.tsx
export default function ModalDefault() {
  return null; // ← nothing rendered when no modal is active
}
```

```tsx
// src/app/(gallery)/gallery/page.tsx
import Link from "next/link";

// Pre-built photo IDs
const PHOTOS = [
  {
    id: "photo-1",
    src: "/photos/1.jpg",
    alt: "Mountain sunset",
    width: 800,
    height: 600,
  },
  {
    id: "photo-2",
    src: "/photos/2.jpg",
    alt: "Ocean waves",
    width: 800,
    height: 533,
  },
  {
    id: "photo-3",
    src: "/photos/3.jpg",
    alt: "Forest trail",
    width: 800,
    height: 1067,
  },
  {
    id: "photo-4",
    src: "/photos/4.jpg",
    alt: "City at night",
    width: 800,
    height: 600,
  },
];

export default function GalleryPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <Link
          href="/gallery/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Upload Photo
        </Link>
      </div>

      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {PHOTOS.map((photo) => (
          // Link to /gallery/:id — intercepted as modal on client navigation
          <Link key={photo.id} href={`/gallery/${photo.id}`} scroll={false}>
            <div
              className="overflow-hidden rounded-xl bg-gray-100 cursor-zoom-in
                            hover:opacity-90 transition-opacity"
            >
              {/* In production: use next/image */}
              <div
                className="w-full bg-gray-200"
                style={{ aspectRatio: `${photo.width}/${photo.height}` }}
                title={photo.alt}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(gallery)/gallery/[id]/page.tsx
// Renders on: direct URL visit, page refresh, or if intercepting route doesn't exist
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ id: string }>;

// Only pre-built IDs are valid
export const dynamicParams = false;

const PHOTOS: Record<
  string,
  { alt: string; photographer: string; date: string }
> = {
  "photo-1": {
    alt: "Mountain sunset",
    photographer: "Alice",
    date: "2026-03-15",
  },
  "photo-2": { alt: "Ocean waves", photographer: "Bob", date: "2026-04-02" },
  "photo-3": { alt: "Forest trail", photographer: "Carol", date: "2026-04-20" },
  "photo-4": {
    alt: "City at night",
    photographer: "David",
    date: "2026-05-01",
  },
};

export function generateStaticParams() {
  return Object.keys(PHOTOS).map((id) => ({ id }));
}

export default async function PhotoFullPage({ params }: { params: Params }) {
  const { id } = await params;
  const photo = PHOTOS[id];
  if (!photo) notFound();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Back link */}
      <div className="p-4">
        <Link
          href="/gallery"
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back to Gallery
        </Link>
      </div>

      {/* Full photo */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <div
            className="bg-gray-800 rounded-xl aspect-[4/3] flex items-center
                          justify-center text-gray-500"
          >
            {photo.alt} {/* In production: <Image> */}
          </div>
          <div className="mt-4 flex items-start justify-between">
            <div>
              <h1 className="text-white font-semibold">{photo.alt}</h1>
              <p className="text-gray-400 text-sm">by {photo.photographer}</p>
            </div>
            <time className="text-gray-500 text-sm">{photo.date}</time>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(gallery)/@modal/(.)gallery/[id]/page.tsx
// Renders as MODAL when navigated from the gallery via <Link>
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reuse the same photo data
const PHOTOS: Record<string, { alt: string; photographer: string }> = {
  "photo-1": { alt: "Mountain sunset", photographer: "Alice" },
  "photo-2": { alt: "Ocean waves", photographer: "Bob" },
  "photo-3": { alt: "Forest trail", photographer: "Carol" },
  "photo-4": { alt: "City at night", photographer: "David" },
};

export default function PhotoModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const photo = PHOTOS[params.id];

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  if (!photo) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={() => router.back()} // ← click backdrop = close modal
    >
      {/* Modal content — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-gray-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo placeholder */}
        <div
          className="bg-gray-800 aspect-[4/3] flex items-center
                        justify-center text-gray-500"
        >
          {photo.alt} {/* In production: <Image> */}
        </div>

        {/* Photo info */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">{photo.alt}</h2>
            <p className="text-gray-400 text-sm">by {photo.photographer}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

```
Final behavior summary:

User visits /gallery directly:
  → GalleryPage renders (photo grid)
  → @modal renders default.tsx (null — no modal)

User clicks a photo in the gallery:
  → URL changes to /gallery/photo-2
  → GalleryPage stays mounted (layout persists)
  → @modal/(.)gallery/[id]/page.tsx renders as overlay (modal)
  → User sees gallery + modal combined

User refreshes at /gallery/photo-2:
  → gallery/[id]/page.tsx renders (full-page standalone view)
  → No modal (intercepting route only applies to client navigation)

User visits /gallery/new:
  → gallery/new/page.tsx renders (upload form)
  → Static segment wins over [id] ✅

User visits /gallery/invalid-id:
  → dynamicParams = false → 404 ✅
```

---

## ✅ Day 4 Complete — Dynamic Routing and Route Design

| #   | Subtopic                                                      | Status |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Dynamic Segments — `[param]` Deep Dive                        | ☐      |
| 2   | Catch-All Routes — `[...slug]`                                | ☐      |
| 3   | Optional Catch-All Routes — `[[...slug]]`                     | ☐      |
| 4   | Route Groups — `(group)` Organization and Layout Isolation    | ☐      |
| 5   | Nested Segments — Depth, Inheritance, and Composition         | ☐      |
| 6   | `generateStaticParams` — Static Generation for Dynamic Routes | ☐      |
| 7   | Designing Blog Routes — Complete Route Architecture           | ☐      |
| 8   | Designing Dashboard Routes — Multi-Level Navigation           | ☐      |
| 9   | Multi-Section App Structures — Combining All Patterns         | ☐      |
| 10  | Route Conflicts, Priority, and Edge Cases                     | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 4

```
DYNAMIC SEGMENT TYPES
  [param]         → one variable value  (/products/:id)
  [...slug]       → 1+ values as array  (/docs/a/b/c) — base path = 404
  [[...slug]]     → 0+ values as array  (/docs AND /docs/a/b) — base path ✅
  (group)         → no URL segment, own layout.tsx
  @slot           → parallel route (no URL)
  (.)path         → intercepting route (modal pattern)

PRIORITY RULES (highest → lowest)
  1. Static segment       /blog/new
  2. Dynamic segment      /blog/[slug]
  3. Catch-all            /blog/[...slug]
  4. Optional catch-all   /blog/[[...slug]]
  Winner = most specific match at each URL level

ROUTE CONFLICTS (build errors)
  ❌ Same URL from two route groups
  ❌ page.tsx + route.ts in same folder
  ❌ [...slug] + [[...slug]] in same folder
  ❌ Two different [param] names at same level

ACCESSING PARAMS
  Server Component: type Params = Promise<{id:string}>; const {id} = await params
  Client Component: useParams<{id:string}>() from 'next/navigation'
  Catch-all server: type Params = Promise<{slug:string[]}>
  Catch-all client: normalize: [params.slug].flat().filter(Boolean)

generateStaticParams
  Returns array of param objects → pre-renders at next build
  dynamicParams = true (default) → unknown params render on-demand
  dynamicParams = false          → unknown params = 404
  Partial pre-render = generateStaticParams top N + ISR for rest
  Catch-all: { slug: ['a','b'] } not { slug: 'a/b' }

ROUTE GROUP LAYOUT PATTERNS
  (public)      → top nav + footer      → no auth
  (auth)        → centered card         → no auth
  (onboarding)  → full-screen stepper   → user auth
  (app)         → sidebar               → user auth + entity layouts
  (admin)       → admin sidebar         → admin role
  (docs)        → sidebar + TOC         → no auth, [[...path]]

NESTING RULES
  layout.tsx at [entity] level → fetch entity ONCE, applies to all sub-routes
  All layout + page data fetches: PARALLEL (not sequential)
  Dedup identical fetches: import { cache } from 'react'; export const getFoo = cache(...)
  Max practical nesting: 3-4 levels before it becomes unwieldy

BLOG ROUTE DECISIONS
  /blog/[slug]              → posts by slug
  /blog/category/[cat]      → ALWAYS prefix with static segment
  /blog/tag/[tag]           → avoids conflicts with post slugs
  /blog/author/[username]   → same pattern
  /blog/feed.xml/route.ts   → RSS = route.ts returning raw XML

DASHBOARD ROUTE DECISIONS
  products/new/page.tsx     → BEFORE [productId] — static wins
  [productId]/layout.tsx    → fetch product once, sub-nav tabs
  settings/layout.tsx       → tab nav, persists across settings sub-routes
  (dashboard)/layout.tsx    → auth guard (ONE check protects ALL routes)

DEBUGGING CHECKLIST
  404 → does folder have page.tsx? Is it inside app/?
  Wrong page → check static/dynamic priority, check for route groups
  Params undefined → did you await params? Using correct hook?
  Build error → conflicting routes? page.tsx + route.ts conflict?
```

---

> **Your next action:** Open your Next.js project. Create `src/app/(dashboard)/layout.tsx` with a simple auth check that redirects to `/login` if no user. Then add `src/app/(dashboard)/dashboard/page.tsx`. You now have a protected route group in under 5 minutes.
>
> _Doing one small thing beats opening a feed._

**A:** In
