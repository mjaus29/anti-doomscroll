# 1 — Server Components — Default Rendering Model

---

## T — TL;DR

Every component in the App Router is a **Server Component by default** — it runs only on the server, never ships JavaScript to the browser, can directly access databases and secrets, and produces pure HTML. This is the foundation of the entire architecture.

---

## K — Key Concepts

### What Makes a Server Component

```
Default in App Router — no directive needed

Characteristics:
  ✅ Runs only on the server (Node.js runtime or Edge)
  ✅ Can be async — await data directly inside the component
  ✅ Can access: databases, file system, env secrets, server-only APIs
  ✅ Produces HTML — zero JavaScript sent to the browser
  ✅ Cannot use: useState, useEffect, event handlers, browser APIs
  ✅ Cannot be interactive — no onClick, onChange, etc.

The mental model:
  Server Component = a function that runs on the server and returns HTML
  Like a PHP template or Rails view — but with React's composability
```

### The Simplest Server Component

```tsx
// src/app/dashboard/page.tsx
// No 'use client' directive → Server Component by default

// ✅ Can be async
// ✅ Can use process.env directly (never exposed to browser)
// ✅ Can query the database directly
// ✅ Zero JS sent to client for this component

import { db } from "@/lib/db";

export default async function DashboardPage() {
  // Direct database query — runs on server, never in browser
  const stats = await db.stats.findFirst();

  // Access env secrets safely
  const apiKey = process.env.INTERNAL_API_KEY; // never exposed to client

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-600 mt-2">
        Total revenue: ${stats?.revenue.toLocaleString()}
      </p>
    </div>
  );
}
```

### What Server Components Can and Cannot Do

```
CAN DO:                               CANNOT DO:
─────────────────────────────         ─────────────────────────────
✅ async/await                        ❌ useState
✅ Direct DB queries                  ❌ useEffect
✅ Read process.env secrets           ❌ useContext (consuming)
✅ File system access (fs)            ❌ onClick, onChange, onSubmit
✅ Import server-only packages        ❌ Browser APIs (window, document)
✅ Fetch from internal APIs           ❌ React hooks (any)
✅ Access request headers/cookies     ❌ Custom hooks that use hooks
✅ Return HTML/JSX                    ❌ Class components
✅ Import and render Client Components ❌ Dynamic imports with ssr:false
✅ Use React cache()                  ❌ forwardRef (partially limited)
```

### Server Components vs Traditional React

```
Traditional React (SPA):
  → All components run in the browser
  → Data fetching: useEffect + fetch
  → Secrets: must use a proxy API (never in component)
  → Bundle size: EVERYTHING ships to browser
  → Initial load: blank screen → JS loads → renders

Server Components (App Router):
  → Components run on server unless marked 'use client'
  → Data fetching: async/await directly in component
  → Secrets: access process.env safely — server only
  → Bundle size: Server Components = ZERO JS to browser
  → Initial load: HTML arrives with data already rendered
```

### Server Components Across the Tree

```tsx
// Every component in this tree is a Server Component
// They all run on the server, produce HTML, ship zero JS

// src/app/products/page.tsx
import { ProductList } from "./_components/product-list";
import { ProductFilters } from "./_components/product-filters";
import { ProductHeader } from "./_components/product-header";

export default async function ProductsPage() {
  // All three components also run on server
  return (
    <div className="max-w-6xl mx-auto p-8">
      <ProductHeader /> {/* Server Component */}
      <ProductFilters /> {/* Server Component */}
      <ProductList /> {/* Server Component — fetches own data */}
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-list.tsx
// Also a Server Component — fetches its own data

import { db } from "@/lib/db";

export async function ProductList() {
  // Runs on server — direct DB access
  const products = await db.product.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <ul className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <li key={product.id} className="border rounded-xl p-4">
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-blue-600 font-bold mt-1">${product.price}</p>
        </li>
      ))}
    </ul>
  );
}
```

### Server Component Data Fetching — No useEffect

```tsx
// src/app/blog/[slug]/page.tsx
// Before (SPA mental model — WRONG in App Router):
// useEffect(() => {
//   fetch('/api/posts/' + slug).then(...)
// }, [slug])

// After (Server Component — CORRECT):
export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Direct fetch — runs on server, has access to internal APIs
  const post = await fetch(`${process.env.CMS_API_URL}/posts/${slug}`, {
    headers: { Authorization: `Bearer ${process.env.CMS_SECRET}` },
    next: { revalidate: 3600 }, // cache for 1 hour
  }).then((r) => r.json());

  return <article>{post.content}</article>;
}
```

### Requesting Context Inside Server Components

```tsx
// src/app/dashboard/page.tsx
// Access request headers and cookies in Server Components

import { cookies, headers } from "next/headers";

export default async function DashboardPage() {
  // Read cookies (e.g., session, preferences)
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value ?? "light";

  // Read request headers
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const isMobile = userAgent?.includes("Mobile") ?? false;

  return (
    <div data-theme={theme}>
      {isMobile && <MobileBanner />}
      {/* page content */}
    </div>
  );
}
```

### `server-only` Package — Enforce Server Boundaries

```tsx
// src/lib/db.ts
// Prevent accidental import in Client Components

import "server-only"; // ← throws build error if imported in a Client Component

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

---

## W — Why It Matters

- Server Components eliminate the pattern of `useEffect(() => fetch('/api/...'), [])` for initial data loading — data arrives with the HTML, not after a loading spinner.
- Zero JavaScript for Server Components means your app's JS bundle only contains code for interactive features — a dashboard with server-rendered tables and charts can ship 60–80% less JavaScript than an equivalent SPA.
- Direct database access in components removes the need for an API layer for internal reads — `await db.product.findMany()` in a page is not only correct, it's the intended pattern.
- The `server-only` package is a safety net that prevents secrets like database URLs and API keys from accidentally being bundled with client-side JavaScript.

---

## I — Interview Q&A

### Q1: What is a Server Component and how is it different from a traditional React component?

**A:** A Server Component is a React component that runs exclusively on the server — it never runs in the browser and ships zero JavaScript to the client. Unlike traditional React components (which run in the browser and need `useEffect` for data fetching), Server Components can be `async`, query databases directly, read secrets from `process.env`, and access server APIs. They return HTML rendered on the server. They cannot use hooks, event handlers, or browser APIs. In the App Router, all components are Server Components by default — you opt into client-side rendering with `'use client'`.

### Q2: What are the bundle size implications of Server Components?

**A:** Server Components contribute zero bytes to the JavaScript bundle sent to the browser. Only components marked `'use client'` are included in the bundle. For content-heavy apps — blogs, product pages, dashboards with read-only tables — this means the majority of UI code never ships to the browser. A page that's 80% Server Components and 20% Client Components (for interactive parts) might ship 70%+ less JavaScript than the equivalent SPA, resulting in faster initial load, better Core Web Vitals, and improved performance on low-end devices.

### Q3: Why can't Server Components use hooks?

**A:** React hooks are a client-side runtime feature — they rely on React's state management and reconciliation engine, which runs in the browser. Server Components execute once on the server to produce HTML output — there's no persistent component instance, no re-rendering lifecycle, and no browser runtime. `useState` has no meaning when a component runs once and produces static HTML. `useEffect` has no meaning when there's no browser to run side effects in. Server Components have a completely different execution model — they're essentially async functions that return JSX, rendered to HTML once per request.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `useEffect` for initial data in Server Components

```tsx
// ❌ SPA mental model applied to App Router
"use client";
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);
  return <ProductGrid products={products} />;
}
// Problems: requires API route, loading state needed, ships JS to client,
//           SEO: content not in initial HTML
```

**Fix:** Use async Server Component with direct data access:

```tsx
// ✅ Server Component — no 'use client'
export default async function ProductsPage() {
  const products = await db.product.findMany();
  return <ProductGrid products={products} />;
  // ProductGrid can also be a Server Component — zero JS
}
```

### ❌ Pitfall: Accessing `process.env` in Client Components

```tsx
"use client";
export default function ApiWidget() {
  // ❌ This gets BUNDLED into client JavaScript — secret exposed
  const key = process.env.SECRET_API_KEY;
  // Anyone can open DevTools → Sources → find this key
}
```

**Fix:** Only access secrets in Server Components. For client-side env vars, use `NEXT_PUBLIC_` prefix (these are intentionally public):

```tsx
// Server Component — safe
const secret = process.env.SECRET_API_KEY; // stays on server ✅

// Client Component — only public vars
const publicUrl = process.env.NEXT_PUBLIC_API_URL; // explicitly public ✅
```

### ❌ Pitfall: Adding `'use client'` to every component "to be safe"

```tsx
// ❌ Developer adds 'use client' everywhere to avoid errors
"use client";
export function ProductCard({ product }) {
  // no hooks, no events
  return <div>{product.name}</div>; // could be a Server Component
}
// Now ships unnecessary JS to the browser
```

**Fix:** Only add `'use client'` when you actually need hooks or event handlers.

---

## K — Coding Challenge + Solution

### Challenge

Build a `/dashboard/analytics` page as a pure Server Component tree (no `'use client'`) that:

1. Has a page that fetches overview stats directly (no API route)
2. Has a `StatCard` Server Component that receives a stat object as props
3. Has a `RecentActivity` Server Component that fetches its own data independently
4. Shows `process.env.APP_VERSION` in the footer (safely — server only)
5. Total client JavaScript shipped: 0 bytes for these components

### Solution

```tsx
// src/app/(dashboard)/dashboard/analytics/_components/stat-card.tsx
// Pure Server Component — zero JS to client

interface Stat {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="bg-white border rounded-xl p-5">
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
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/analytics/_components/recent-activity.tsx
// Async Server Component — fetches its own data

async function getActivity() {
  // In production: await db.activityLog.findMany(...)
  await new Promise((r) => setTimeout(r, 200)); // simulate DB
  return [
    { id: 1, event: "New order #1044", time: "2 min ago", type: "order" },
    { id: 2, event: "User Alice signed up", time: "14 min ago", type: "user" },
    {
      id: 3,
      event: 'Product "Tote" updated',
      time: "1 hr ago",
      type: "product",
    },
    {
      id: 4,
      event: "Payment received $249",
      time: "2 hr ago",
      type: "payment",
    },
  ];
}

const TYPE_ICON: Record<string, string> = {
  order: "🛍️",
  user: "👤",
  product: "📦",
  payment: "💳",
};

export async function RecentActivity() {
  const activity = await getActivity();

  return (
    <div className="bg-white border rounded-xl">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <ul className="divide-y divide-gray-50">
        {activity.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
            <span className="text-xl shrink-0" aria-hidden="true">
              {TYPE_ICON[item.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {item.event}
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/analytics/page.tsx
// Async Server Component — zero client JS for this entire tree

import type { Metadata } from "next";
import { StatCard } from "./_components/stat-card";
import { RecentActivity } from "./_components/recent-activity";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Analytics" };

async function getOverviewStats() {
  // Direct DB call — process.env secrets are safe here
  await new Promise((r) => setTimeout(r, 150));
  return [
    {
      label: "Total Revenue",
      value: "$78,400",
      change: "+12% vs last month",
      positive: true,
    },
    {
      label: "Orders",
      value: "531",
      change: "+8% vs last month",
      positive: true,
    },
    {
      label: "Avg Order Value",
      value: "$147",
      change: "-2% vs last month",
      positive: false,
    },
    {
      label: "Active Users",
      value: "1,204",
      change: "+23% vs last month",
      positive: true,
    },
  ];
}

export default async function AnalyticsPage() {
  const stats = await getOverviewStats();

  // Safe to access — only runs on server, never in browser bundle
  const appVersion = process.env.APP_VERSION ?? "dev";

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Stats grid — Server Component renders inline */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Activity — independent async Server Component */}
      <Suspense
        fallback={
          <div className="bg-white border rounded-xl h-48 animate-pulse" />
        }
      >
        <RecentActivity />
      </Suspense>

      {/* Footer — server-only env var, safe */}
      <footer className="mt-8 text-xs text-gray-400">
        App version: {appVersion}
      </footer>
    </div>
  );
}

// JS shipped to browser for this route: 0 bytes from these components ✅
// Entire page is HTML — static, fast, SEO-friendly
```

---

---
