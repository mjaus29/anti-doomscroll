# 1 — `page.tsx` — The Route File

---

## T — TL;DR

`page.tsx` is the **only file that makes a folder a publicly accessible URL**. Without it, the folder exists but has no route. Every route in your app traces back to exactly one `page.tsx` file.

---

## K — Key Concepts

### The Rule

```
Folder with page.tsx    → publicly accessible URL
Folder without page.tsx → NOT a URL (can hold components, hooks, utils)

src/app/
├── about/
│   └── page.tsx        → /about ✅ accessible
├── components/
│   └── Button.tsx      → NOT a route ✅ private by nature
└── utils/
    └── format.ts       → NOT a route ✅ private by nature
```

### The Minimal `page.tsx`

```tsx
// src/app/page.tsx — home route (/)
// A page is just a React component — default export required

export default function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
    </main>
  );
}
```

### Server Component by Default

```tsx
// page.tsx is a Server Component by default — no 'use client' needed
// This means you can:
//   ✅ use async/await directly
//   ✅ access databases, filesystem, environment variables
//   ✅ ship zero client-side JavaScript for this component

// src/app/products/page.tsx
import { db } from "@/lib/db";

export default async function ProductsPage() {
  // Direct database access — runs on server only
  const products = await db.product.findMany({ take: 20 });

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} — ${p.price}
        </li>
      ))}
    </ul>
  );
}
```

### The Two Props — `params` and `searchParams`

```tsx
// page.tsx receives two special props from Next.js:
// params       — dynamic route segments (e.g., /products/[id])
// searchParams — URL query parameters (?q=shoes&page=2)

// In Next.js 15+ both are Promises — must be awaited

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params; // route param: /products/[id]
  const { q } = await searchParams; // query param: ?q=shoes

  return (
    <div>
      <h1>Product ID: {id}</h1>
      <p>Search: {q ?? "none"}</p>
    </div>
  );
}
```

### Static vs Dynamic Rendering

```tsx
// Static page (default) — rendered at build time
// No dynamic data dependencies → Next.js pre-renders to static HTML
export default function AboutPage() {
  return <h1>About Us</h1>; // ← static, no data fetching
}

// Dynamic page — rendered at request time
// Accessing searchParams, cookies, headers → opts into dynamic rendering
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme"); // ← accessing request data = dynamic
  return <div data-theme={theme?.value}>Dashboard</div>;
}
```

### `generateStaticParams` — Pre-render Dynamic Routes

```tsx
// src/app/products/[id]/page.tsx
// Tell Next.js which [id] values to pre-render at build time

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } });

  return products.map((p) => ({ id: p.id }));
  // → Next.js pre-renders /products/1, /products/2, /products/3 etc.
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

### Metadata Export — Per-Page SEO

```tsx
// src/app/about/page.tsx
import type { Metadata } from "next";

// Static metadata
export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about our company",
};

// Dynamic metadata (function form)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product.name };
}

export default function AboutPage() {
  return <h1>About Us</h1>;
}
```

---

## W — Why It Matters

- The "only `page.tsx` creates routes" rule means you can safely co-locate components, hooks, and utilities inside route folders without accidentally exposing them as URLs — critical for App Router architecture.
- `params` being a `Promise` in Next.js 15+ is a breaking change from v14 — understanding this prevents the most common migration bug where `params.id` returns `undefined`.
- `generateStaticParams` is how you get the performance of static generation (`next build` pre-renders pages) for dynamic routes — essential for SEO-sensitive pages like product listings and blog posts.
- The `searchParams` prop in `page.tsx` is the App Router equivalent of reading URL query params — but accessing it opts the entire page into dynamic rendering. Cache carefully.

---

## I — Interview Q&A

### Q1: What is the minimum requirement for a folder in `app/` to become a public URL?

**A:** The folder must contain a `page.tsx` (or `page.js`) file that exports a default React component. Without `page.tsx`, the folder is treated as a non-route segment — it can hold components, utilities, and configuration but produces no URL. Other files like `layout.tsx` or `loading.tsx` exist without `page.tsx` only when they serve nested routes deeper in the tree.

### Q2: What is the difference between `params` and `searchParams` in a `page.tsx`?

**A:** `params` contains the dynamic route segments from the URL path — for a route `products/[id]`, accessing `/products/42` gives `params = { id: '42' }`. `searchParams` contains the query string parameters — for `/products/42?color=red&size=lg`, `searchParams = { color: 'red', size: 'lg' }`. In Next.js 15+, both are `Promise<>` and must be awaited before accessing their values.

### Q3: What does accessing `searchParams` in a `page.tsx` do to rendering?

**A:** It forces the page into dynamic rendering — the page is rendered on every request instead of being pre-rendered at build time. This is because query parameters are request-specific and can't be known at build time. If you need query params for client-side filtering without sacrificing static rendering, read them in a Client Component using `useSearchParams()` from `next/navigation` instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Named export instead of default export

```tsx
// ❌ Named export — Next.js won't recognize this as a page
export function HomePage() {
  return <h1>Home</h1>;
}
// Result: Route is defined but Next.js throws a build error
// "The default export is not a React Component in page: /"
```

**Fix:** Always use `default export` for the page component:

```tsx
export default function HomePage() {
  // ✅
  return <h1>Home</h1>;
}
```

### ❌ Pitfall: Not awaiting `params` in Next.js 15+

```tsx
// ❌ Synchronous params access — Next.js 15+ breaking change
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>;
  // params.id is undefined — params is a Promise, not an object
}
```

**Fix:**

```tsx
// ✅ Async page + awaited params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

### ❌ Pitfall: Putting interactive components directly in `page.tsx` without `'use client'`

```tsx
// ❌ useState in a Server Component
export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false); // Error: hooks in Server Component
  return <button onClick={() => setSubmitted(true)}>Submit</button>;
}
```

**Fix:** Move interactive parts to a Client Component, keep `page.tsx` as a Server Component:

```tsx
// src/app/contact/_components/contact-form.tsx
"use client";
import { useState } from "react";
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  return <button onClick={() => setSubmitted(true)}>Submit</button>;
}

// src/app/contact/page.tsx — stays Server Component
import { ContactForm } from "./_components/contact-form";
export default function ContactPage() {
  return <ContactForm />;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `/blog/[slug]` page that:

1. Uses typed, awaited `params`
2. Exports `generateStaticParams` with 3 hardcoded slugs
3. Exports dynamic `generateMetadata` using the slug
4. Renders the slug and a hardcoded "coming soon" message
5. Returns `notFound()` if slug is not in the allowed list

### Solution

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── Allowed slugs (in production, this comes from DB/CMS)
const ALLOWED_SLUGS = ["hello-world", "nextjs-tips", "typescript-guide"];

// ─── Types
type Params = Promise<{ slug: string }>;

// ─── Static params (pre-render at build time)
export function generateStaticParams() {
  return ALLOWED_SLUGS.map((slug) => ({ slug }));
}

// ─── Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title,
    description: `Read our article: ${title}`,
  };
}

// ─── Page component
export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  if (!ALLOWED_SLUGS.includes(slug)) notFound();

  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <article className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-gray-500">
        This post is coming soon. Check back later!
      </p>
    </article>
  );
}
```

---

---
