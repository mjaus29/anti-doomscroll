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
