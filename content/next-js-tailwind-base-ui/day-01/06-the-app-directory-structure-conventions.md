# 6 — The `app/` Directory — Structure & Conventions

---

## T — TL;DR

The `app/` directory is the heart of Next.js 16. Every file inside it either **creates a route** (via `page.tsx`, `layout.tsx`, `route.ts`) or **is private** (any other file). Knowing exactly which files do what — and which files are just co-located components — is the core of App Router development.

---

## K — Key Concepts

### The Two Categories of Files in `app/`

```
ROUTE files (recognized by Next.js — create routing behavior):
  page.tsx          → renders the UI for a route
  layout.tsx        → wraps child routes, persists between navigations
  loading.tsx       → automatic Suspense + loading UI
  error.tsx         → error boundary for the segment
  not-found.tsx     → shown when notFound() is called
  template.tsx      → like layout but remounts on each navigation
  route.ts / route.js  → API endpoint (no UI)
  middleware.ts     → edge middleware (must be at root of app or src)

NON-ROUTE files (ignored by router — co-location):
  components/
  hooks/
  utils/
  types.ts
  constants.ts
  _private-folder/   ← underscore prefix opts entire folder out of routing
  (group-name)/      ← parentheses = route group (no URL impact)
```

### Full Anatomy of a Segment

```
src/app/products/[id]/
├── page.tsx          ← REQUIRED for route to exist: GET /products/:id
├── layout.tsx        ← optional: wraps all /products/:id/* routes
├── loading.tsx       ← optional: shown during page async operations
├── error.tsx         ← optional: boundary for errors in this segment
├── not-found.tsx     ← optional: UI when notFound() is called here
├── route.ts          ← API endpoint: GET/POST /products/:id (OR page.tsx, not both)
│
└── _components/      ← co-located private components (underscore = not routed)
    ├── ProductGallery.tsx
    ├── PriceTag.tsx
    └── ReviewList.tsx
```

### `layout.tsx` — In Depth

```tsx
// src/app/layout.tsx — ROOT layout (required)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Static metadata
export const metadata: Metadata = {
  title: {
    template: "%s | MyShop", // ← page title | site name
    default: "MyShop", // ← fallback if no title from page
  },
  description: "The best online shop",
  metadataBase: new URL("https://myshop.com"), // ← needed for OG image URLs
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Providers, global nav, etc. */}
        {children}
      </body>
    </html>
  );
}
```

### `loading.tsx` — Automatic Streaming

```tsx
// src/app/products/loading.tsx
// Shown while page.tsx is fetching data (Server Component)

export default function ProductsLoading() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-64" />
      ))}
    </div>
  );
}
```

### `error.tsx` — Error Boundaries

```tsx
// src/app/products/error.tsx
// Must be a Client Component (error boundaries require class components or hooks)
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }; // digest = server-side error ID (for logging)
  reset: () => void; // retry the failed route
}) {
  useEffect(() => {
    console.error("Products route error:", error);
    // logToSentry(error)
  }, [error]);

  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold text-red-600">
        Something went wrong
      </h2>
      <p className="text-gray-500 mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try Again
      </button>
    </div>
  );
}
```

### `route.ts` — API Endpoints

```ts
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

// GET /api/products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
  });

  return NextResponse.json({ data: products });
}

// POST /api/products
export async function POST(request: NextRequest) {
  const body = await request.json();

  const product = await db.product.create({ data: body });
  return NextResponse.json({ data: product }, { status: 201 });
}
```

### Dynamic Segments

```
[id]          → single dynamic segment   /products/123
[...slug]     → catch-all segment        /docs/a/b/c  → slug = ['a','b','c']
[[...slug]]   → optional catch-all       /docs        → slug = undefined
                                          /docs/a/b    → slug = ['a','b']
(group)       → route group — no URL impact
_folder       → private folder — never a route
```

---

## W — Why It Matters

- The `loading.tsx` file automatically wraps `page.tsx` in a `<Suspense>` boundary — you don't need to add `<Suspense>` manually for page-level loading. This enables streaming HTML progressively from the server.
- `error.tsx` MUST be a Client Component (`'use client'`) — error boundaries in React require component-level error handling which only works in client components. This is a common "why doesn't my error.tsx work?" question.
- Co-locating `_components/` next to route files is a Next.js-recommended pattern — components live close to where they're used, making the codebase navigable without jumping between `components/` and `app/` directories.
- `route.ts` in the `app/` directory replaces `pages/api/` from the Pages Router — same file-system convention, new location.

---

## I — Interview Q&A

### Q1: What is the difference between `layout.tsx` and `template.tsx`?

**A:** `layout.tsx` persists between navigations — it renders once and wraps child routes without unmounting. State inside a layout is preserved when navigating between routes in the same segment. `template.tsx` creates a new instance on every navigation — state is reset. Use `layout.tsx` for persistent UI (sidebars, nav bars) and `template.tsx` for per-page side effects like analytics page views or enter/exit animations.

### Q2: How does `loading.tsx` work under the hood?

**A:** Next.js automatically wraps the `page.tsx` (and any layouts below the `loading.tsx`) in a React `<Suspense>` boundary. The `loading.tsx` component is the fallback. When `page.tsx` is a Server Component that fetches data, React streams the loading fallback immediately, then streams the page content when the data resolves. No manual `<Suspense>` needed.

### Q3: Can you have both `page.tsx` and `route.ts` in the same directory?

**A:** No. A directory can define a UI route (`page.tsx`) or an API route (`route.ts`), but not both. They would conflict — both respond to the same URL. If you need an API endpoint at `/products` alongside the page, use `app/api/products/route.ts` for the API endpoint and `app/products/page.tsx` for the UI page.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `'use client'` on `error.tsx`

```tsx
// error.tsx — missing 'use client'
export default function Error({ error, reset }) {
  // Error: error.tsx must be a Client Component
}
```

**Fix:** Always add `'use client'` to `error.tsx` — React error boundaries require it.

### ❌ Pitfall: Calling `notFound()` without a `not-found.tsx`

```tsx
// page.tsx
import { notFound } from "next/navigation";
if (!product) notFound(); // ← Next.js returns the nearest not-found.tsx
// If no not-found.tsx exists in the tree → global 404 page (plain and unstyled)
```

**Fix:** Create `not-found.tsx` next to your `page.tsx` for resource-specific 404 UIs.

### ❌ Pitfall: Creating a folder with only a component file and expecting it to be a route

```
src/app/about/
  └── AboutPage.tsx   ← This file is IGNORED by the router

# /about returns 404 — there's no page.tsx
```

**Fix:**

```
src/app/about/
  ├── page.tsx        ← creates the /about route
  └── _components/
      └── AboutPage.tsx  ← co-located component (underscore = private)
```

---

## K — Coding Challenge + Solution

### Challenge

Build the complete file structure for a `/dashboard/orders` route that:

1. Has a dashboard layout with a sidebar that persists across dashboard pages
2. Shows a skeleton loading state while orders load
3. Has an error boundary with a retry button
4. Shows a custom "No orders yet" not-found page
5. The orders page itself fetches from a server and renders a list

### Solution

```
src/app/(dashboard)/
├── layout.tsx           ← dashboard layout with sidebar
└── dashboard/
    └── orders/
        ├── page.tsx     ← orders list (Server Component)
        ├── loading.tsx  ← skeleton rows
        ├── error.tsx    ← error boundary (must be 'use client')
        └── not-found.tsx ← "no orders yet" UI
```

```tsx
// src/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-6">
        <nav className="space-y-2">
          <a
            href="/dashboard"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Overview
          </a>
          <a
            href="/dashboard/orders"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Orders
          </a>
          <a
            href="/dashboard/profile"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Profile
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/page.tsx
import { notFound } from "next/navigation";
import { getOrders } from "@/lib/db";

export default async function OrdersPage() {
  const orders = await getOrders();
  if (!orders || orders.length === 0) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="border rounded-lg p-4">
            <span className="font-medium">#{order.id}</span>
            <span className="ml-4 text-gray-500">{order.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/loading.tsx
export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/error.tsx
"use client";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 font-medium">Failed to load orders</p>
      <p className="text-gray-500 text-sm mt-1">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Retry
      </button>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/not-found.tsx
import Link from "next/link";

export default function NoOrdersFound() {
  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold text-gray-700">No orders yet</h2>
      <p className="text-gray-500 mt-2">
        Start shopping to see your orders here.
      </p>
      <Link
        href="/store"
        className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        Browse Store
      </Link>
    </div>
  );
}
```

---

---
