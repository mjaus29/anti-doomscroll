# 5 — App Router Mental Model

---

## T — TL;DR

The App Router is a **file-system based router where the file structure IS the route tree**. Every folder is a URL segment. Special file names (`page.tsx`, `layout.tsx`, `loading.tsx`) have specific roles. Server Components are the default. This is the core mental model of all Next.js 16 development.

---

## K — Key Concepts

### File System = Routes

```
src/app/
├── page.tsx              → /
├── about/
│   └── page.tsx          → /about
├── products/
│   ├── page.tsx          → /products
│   └── [id]/
│       └── page.tsx      → /products/:id
├── blog/
│   ├── page.tsx          → /blog
│   └── [slug]/
│       └── page.tsx      → /blog/:slug
└── dashboard/
    ├── layout.tsx        → shared layout for /dashboard/*
    ├── page.tsx          → /dashboard
    ├── settings/
    │   └── page.tsx      → /dashboard/settings
    └── analytics/
        └── page.tsx      → /dashboard/analytics
```

### The Special File Names

```
page.tsx        ← defines a ROUTE — makes the segment publicly accessible
layout.tsx      ← wraps all routes in the segment and persists between navigations
loading.tsx     ← automatic Suspense wrapper — shown while page is streaming
error.tsx       ← error boundary — shown when an error is thrown in the segment
not-found.tsx   ← shown when notFound() is called or no route matches
template.tsx    ← like layout but re-mounts on every navigation (rare)
route.ts        ← API endpoint (replaces pages/api/) — no UI rendered
middleware.ts   ← runs before every request (authentication, redirects)
```

### Server Components vs Client Components

```
App Router default: EVERY component is a SERVER COMPONENT
  → Runs on the server
  → Can use async/await directly (fetch, database, fs)
  → Cannot use: useState, useEffect, event handlers, browser APIs
  → Result: HTML sent to the browser (zero JS for the component itself)

To opt into CLIENT COMPONENT: add "use client" at the top of the file
  → Runs in the browser (also pre-rendered on server for initial HTML)
  → Can use: useState, useEffect, useRef, event handlers, browser APIs
  → Ships JavaScript to the browser
```

```tsx
// ─── Server Component (default — no directive needed)
// src/app/products/[id]/page.tsx
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } }); // direct DB access ✅
  return <div>{product?.name}</div>;
}

// ─── Client Component
// src/components/add-to-cart-button.tsx
("use client"); // ← directive must be first line

import { useState } from "react";

function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? "Added!" : "Add to Cart"}
    </button>
  );
}
```

### The Component Tree Model

```
Server Component tree:
  layout.tsx        (server)
    └── page.tsx    (server)
          ├── ProductDetails     (server — can fetch DB directly)
          └── AddToCartButton    (client — has 'use client')

Rules:
  ✅ Server Component can render Client Component
  ❌ Client Component CANNOT render Server Component directly
  ✅ Client Component CAN render Server Component via children prop (composition)
```

```tsx
// ✅ Server wraps Client (correct)
// Server Component
export default function ProductPage() {
  return (
    <div>
      <ProductDetails /> {/* server component */}
      <AddToCartButton /> {/* client component */}
    </div>
  );
}

// ✅ Passing Server Component as children to Client (composition pattern)
// Server Component
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>; // ClientShell has 'use client'
  // children (server components) are passed as pre-rendered HTML — not re-rendered client-side
}
```

### Data Fetching in the App Router

```tsx
// Server Component — fetch directly in the component
async function ProductList() {
  // fetch() in Server Components is extended by Next.js with caching
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 60 }, // revalidate every 60 seconds (ISR)
  });
  const data = await res.json();

  return (
    <ul>
      {data.products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Route Groups — Organize Without Affecting URL

```
src/app/
├── (marketing)/          ← route group — ignored in URL
│   ├── layout.tsx        ← layout for marketing pages only
│   ├── page.tsx          → /
│   ├── about/
│   │   └── page.tsx      → /about
│   └── pricing/
│       └── page.tsx      → /pricing
│
└── (dashboard)/          ← different layout for dashboard
    ├── layout.tsx        ← dashboard sidebar layout
    ├── dashboard/
    │   └── page.tsx      → /dashboard
    └── settings/
        └── page.tsx      → /settings
```

### Parallel Routes and Intercepting Routes (Advanced)

```
@modal/          ← parallel slot (@-prefixed folders)
@notifications/  ← rendered alongside the main content

(.)path         ← intercept same level
(..)path        ← intercept one level up
(...)path       ← intercept from root
```

---

## W — Why It Matters

- The file-system router means no router configuration file — the structure of your `app/` folder IS your route manifest. Understanding this is understanding Next.js.
- Server Components by default is a paradigm shift from the entire React/Webpack era — data fetching lives in the component that needs it, not in a global store. This is the new mental model.
- `layout.tsx` persists between route navigations — the server doesn't re-render it. This enables persistent sidebars, navigation, and context without state lifting.
- Route groups `(groupName)` let you apply different layouts to groups of routes without creating URL nesting — essential for apps with distinct sections (marketing, dashboard, auth).

---

## I — Interview Q&A

### Q1: What is the difference between a Server Component and a Client Component in Next.js App Router?

**A:** Server Components run only on the server — they can directly access databases, filesystem, and environment variables, and ship zero client-side JavaScript. Client Components (marked with `'use client'`) run in the browser and support React hooks, event handlers, and browser APIs. Server Components are the default — you opt into Client Components when you need interactivity.

### Q2: What does `layout.tsx` do and how is it different from `template.tsx`?

**A:** `layout.tsx` wraps its segment's routes and **persists between navigations** — it doesn't re-render when you navigate between routes within the segment. State inside a layout (scroll position, form input) is preserved. `template.tsx` is like layout but **re-mounts on every navigation** — all state is reset. Use `layout.tsx` for persistent navigation/sidebars and `template.tsx` for per-page animations or analytics events.

### Q3: Can a Client Component render a Server Component?

**A:** Not directly — you can't `import` a Server Component inside a Client Component because the Client Component runs in the browser where Server Component code can't execute. However, you can pass Server Components as `children` props to Client Components. The Server Component renders to HTML on the server first, then passes the result as `children` to the Client Component — this is the composition pattern.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `'use client'` on every component by default

```tsx
// ❌ Treating 'use client' as the default
'use client'
async function ProductList() { ... }  // ← now a Client Component unnecessarily
// Sends the component's JS to the browser + can't fetch server-side data
```

**Fix:** Only add `'use client'` when the component actually needs browser APIs, hooks, or event handlers. Default to Server Component — add `'use client'` at the "leaf" components that need interactivity.

### ❌ Pitfall: Not creating `page.tsx` and wondering why the route doesn't work

```
src/app/products/
  └── ProductList.tsx    ← this is a component, NOT a route
```

**Fix:** Routes require `page.tsx` — the component inside can be named anything but the file must be `page.tsx`:

```
src/app/products/
  └── page.tsx           ← this creates the /products route
```

### ❌ Pitfall: Using `useState`/`useEffect` in a Server Component

```tsx
// ❌ No 'use client' directive — Server Component can't use hooks
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0); // ← Error at build time
}
```

**Fix:** Add `'use client'` at the top of the file.

---

## K — Coding Challenge + Solution

### Challenge

Design the `app/` directory structure for a Next.js 16 e-commerce app with:

1. Marketing site (`/`, `/about`, `/pricing`) — uses a minimal layout with just a nav
2. Store section (`/store`, `/store/[category]`, `/store/product/[id]`) — uses a store layout with category sidebar
3. Dashboard (`/dashboard`, `/dashboard/orders`, `/dashboard/profile`) — uses an authenticated layout with sidebar nav
4. Auth pages (`/login`, `/register`) — uses a centered card layout, no nav
5. API route for `POST /api/checkout`

Write out the folder structure with file names only (no content).

### Solution

```
src/app/
│
├── (marketing)/                    ← route group: marketing layout
│   ├── layout.tsx                  ← minimal nav (links: About, Pricing, Login)
│   ├── page.tsx                    → /
│   ├── about/
│   │   └── page.tsx                → /about
│   └── pricing/
│       └── page.tsx                → /pricing
│
├── (store)/                        ← route group: store layout
│   ├── layout.tsx                  ← store nav + category sidebar
│   ├── store/
│   │   ├── page.tsx                → /store
│   │   └── [category]/
│   │       ├── page.tsx            → /store/:category
│   │       └── product/
│   │           └── [id]/
│   │               ├── page.tsx    → /store/:category/product/:id
│   │               ├── loading.tsx ← loading skeleton for product page
│   │               └── error.tsx   ← product not found error boundary
│
├── (dashboard)/                    ← route group: dashboard layout
│   ├── layout.tsx                  ← sidebar nav, auth guard
│   ├── dashboard/
│   │   ├── page.tsx                → /dashboard
│   │   ├── orders/
│   │   │   └── page.tsx            → /dashboard/orders
│   │   └── profile/
│   │       └── page.tsx            → /dashboard/profile
│
├── (auth)/                         ← route group: centered card layout
│   ├── layout.tsx                  ← centered layout, no nav
│   ├── login/
│   │   └── page.tsx                → /login
│   └── register/
│       └── page.tsx                → /register
│
├── api/
│   └── checkout/
│       └── route.ts                ← POST /api/checkout
│
├── layout.tsx                      ← ROOT layout (html + body + providers)
├── not-found.tsx                   ← global 404 page
├── error.tsx                       ← global error boundary
└── globals.css                     ← Tailwind import
```

---

---
