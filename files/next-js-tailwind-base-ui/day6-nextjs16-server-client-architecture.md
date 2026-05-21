# 📅 Day 6 — Server and Client Architecture (Next.js 16)

> **Goal:** Master the mental model of where code runs — server vs client — and make deliberate, confident decisions about every component, every data fetch, and every rendering strategy in your app.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 5 complete — route boundaries and special files understood.

---

## 📋 Day 6 Subtopic Overview

| #   | Subtopic                                                          | Time   |
| --- | ----------------------------------------------------------------- | ------ |
| 1   | Server Components — Default Rendering Model                       | 15 min |
| 2   | Client Components — `'use client'` and the Client Boundary        | 12 min |
| 3   | `'use server'` — Server Actions                                   | 15 min |
| 4   | Suspense and Streaming — Progressive Rendering                    | 12 min |
| 5   | Lazy Loading — `next/dynamic` and Code Splitting                  | 10 min |
| 6   | Composition Patterns — Server Inside Client, Client Inside Server | 15 min |
| 7   | Choosing Server-Client Boundaries — Decision Framework            | 12 min |
| 8   | Data Fetching Patterns — Where Data Lives                         | 15 min |
| 9   | Rendering Strategies — Static, Dynamic, Streaming                 | 15 min |
| 10  | Performance Patterns — Bundle Size, Hydration, and Optimization   | 12 min |

---

---

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

# 2 — Client Components — `'use client'` and the Client Boundary

---

## T — TL;DR

`'use client'` marks a component as a **Client Component** — it runs in the browser, can use React hooks and event handlers, and its JavaScript is bundled and sent to the client. It creates a boundary: this component and everything it imports below it is a Client Component.

---

## K — Key Concepts

### The `'use client'` Directive

```tsx
// The directive MUST be the first line of the file
"use client";

import { useState } from "react";

// Now this is a Client Component:
// ✅ Can use useState, useEffect, useContext
// ✅ Can attach event handlers (onClick, onChange)
// ✅ Can use browser APIs (window, document, localStorage)
// ✅ Runs in the browser
// ❌ Cannot be async (top-level async function)
// ❌ Cannot directly query the database
// ❌ Cannot access server-only secrets
```

### The Client Boundary — What It Means

```
'use client' creates a BOUNDARY in the component tree.

The component with 'use client' AND everything it IMPORTS
below it becomes client-side code.

src/app/
└── page.tsx (Server Component)
    └── Dashboard.tsx (Server Component)
        └── StatsChart.tsx  ← 'use client'
            ├── ChartLib.tsx          ← NOW Client Component (imported by StatsChart)
            └── ChartControls.tsx     ← NOW Client Component (imported by StatsChart)

StatsChart.tsx and EVERYTHING IT IMPORTS = Client Component
But: Dashboard.tsx above it remains a Server Component
```

### When You NEED `'use client'`

```
Rule: Add 'use client' ONLY when the component needs:
  1. React state        → useState, useReducer
  2. React effects      → useEffect, useLayoutEffect
  3. React context      → useContext (as consumer)
  4. Event handlers     → onClick, onChange, onSubmit
  5. Browser APIs       → window, document, navigator, localStorage
  6. Custom hooks       → any hook that uses the above
  7. Third-party libs   → libraries that use the above internally

Does NOT need 'use client':
  ❌ Components that just render JSX from props
  ❌ Components that fetch data (use async Server Component instead)
  ❌ Static layouts and templates
  ❌ Typography, icon, badge, avatar components
```

### Minimal Client Component Examples

```tsx
// src/components/ui/counter.tsx
"use client";

import { useState } from "react";

export function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setCount((c) => c - 1)}
        className="w-8 h-8 rounded-full border flex items-center justify-center
                   hover:bg-gray-100"
      >
        −
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">
        {count}
      </span>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="w-8 h-8 rounded-full border flex items-center justify-center
                   hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
```

```tsx
// src/components/ui/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Browser API — only available client-side
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

### Client Components CAN Receive Server Data as Props

```tsx
// src/app/products/page.tsx — Server Component
import { ProductSearch } from "./_components/product-search";
import { db } from "@/lib/db";

export default async function ProductsPage() {
  // Fetch on server
  const categories = await db.category.findMany();

  // Pass server data to Client Component as props
  // categories is serialized (JSON) and sent to client
  return (
    <div>
      <ProductSearch categories={categories} /> {/* Client Component */}
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-search.tsx
"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
}

export function ProductSearch({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="border rounded-lg px-3 py-2"
      />
      <div className="flex gap-2 mt-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="px-3 py-1 border rounded-full text-sm"
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Props Must Be Serializable

```tsx
// Props passed from Server Component to Client Component
// MUST be serializable (JSON-compatible)

// ✅ Serializable — safe to pass
<ClientComponent
  string="hello"
  number={42}
  boolean={true}
  array={[1, 2, 3]}
  object={{ id: '1', name: 'Mark' }}
  null={null}
  date="2026-05-19"   {/* ← strings, not Date objects */}
/>

// ❌ Not serializable — will error
<ClientComponent
  fn={() => {}}        {/* ← functions (unless 'use server' Server Action) */}
  date={new Date()}    {/* ← Date objects */}
  set={new Set()}      {/* ← Set, Map */}
  classInstance={new User()} {/* ← class instances */}
  symbol={Symbol()}    {/* ← Symbols */}
/>
```

---

## W — Why It Matters

- The `'use client'` boundary being a "door" rather than a tag on individual components is the key insight — once you open the door with `'use client'`, everything inside is client-side. This is why you place `'use client'` as deep as possible — it minimizes the client boundary.
- Props serialization constraint is a practical gotcha — you can't pass a `Date` object or a function (unless it's a Server Action) from a Server Component to a Client Component. This shapes how you design component APIs.
- Client Components still render on the server for the initial HTML (SSR) — `'use client'` doesn't mean "skip SSR." It means "this component needs the React client runtime for interactivity." The component runs server-side for initial HTML AND client-side for hydration.

---

## I — Interview Q&A

### Q1: What does `'use client'` actually do?

**A:** `'use client'` marks a module as a client boundary — the component in that file and everything it imports below it is treated as client-side code, bundled and sent to the browser. It doesn't prevent the component from running on the server during SSR — Client Components still render server-side for the initial HTML. What it enables is the React client runtime: hooks, state, effects, event handlers, and browser APIs. Think of it as "this component needs to be interactive and shipped to the browser."

### Q2: Where should you place `'use client'` in the component tree?

**A:** As deep (as far down the tree) as possible. The goal is to isolate interactivity to small leaf components — a `<LikeButton>` or a `<SearchInput>` — while keeping parent components as Server Components. A page with a server-rendered product list and a client-side search box should have `'use client'` only on the search box component, not on the page or the product list. This keeps the JS bundle small and maximizes the server-rendered HTML.

### Q3: Can Client Components receive data from Server Components?

**A:** Yes — through props. Server Components can fetch data and pass it as props to Client Components. The props are serialized to JSON and sent as part of the HTML payload. The constraint is that props must be serializable (strings, numbers, booleans, plain objects and arrays). Non-serializable values like `Date` objects, functions (except Server Actions), class instances, Sets, and Maps cannot be passed as props from Server to Client Components.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: `'use client'` not at the top of the file

```tsx
// Some comment
// Another comment
"use client"; // ← not the first line — Next.js may not recognize it
```

**Fix:** `'use client'` MUST be the absolute first line (before imports):

```tsx
"use client"; // ← first line, before any imports ✅

import { useState } from "react";
```

### ❌ Pitfall: Making a parent a Client Component when only a child needs it

```tsx
// ❌ Entire page becomes client-side because one button needs onClick
"use client";
export default function ProductsPage() {
  // This page fetches data, renders a list, AND has one button
  // Making the whole page 'use client' is wasteful
}
```

**Fix:** Extract the interactive part to its own file:

```tsx
// page.tsx — stays Server Component
import { AddToCartButton } from "./_components/add-to-cart-button";

export default async function ProductsPage() {
  const products = await db.product.findMany();
  return products.map((p) => (
    <div key={p.id}>
      <h3>{p.name}</h3>
      <AddToCartButton productId={p.id} /> {/* Only this is Client */}
    </div>
  ));
}
```

```tsx
// _components/add-to-cart-button.tsx
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  return <button onClick={() => addToCart(productId)}>Add to Cart</button>;
}
```

### ❌ Pitfall: Passing non-serializable props to Client Components

```tsx
// ❌ Date object — not serializable
<DatePicker defaultDate={new Date()} />

// ❌ Function — not serializable (unless Server Action)
<FilterList onFilter={(items) => items.filter(i => i.active)} />
```

**Fix:**

```tsx
// ✅ Pass ISO string instead of Date
<DatePicker defaultDate={new Date().toISOString()} />

// ✅ Define the function inside the Client Component
// OR pass a Server Action (marked with 'use server')
```

---

## K — Coding Challenge + Solution

### Challenge

Build a product page where:

1. `page.tsx` is a Server Component that fetches 4 products
2. A `ProductCard` Server Component renders each product's static info
3. An `AddToCartButton` Client Component handles the cart interaction
4. A `CartCount` Client Component shows a count (uses context or state)
5. `'use client'` appears in exactly 2 files — `AddToCartButton` and `CartCount`

### Solution

```tsx
// src/app/products/_components/add-to-cart-button.tsx
"use client"; // ← File 1 with 'use client'

import { useState } from "react";

export function AddToCartButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    setAdded(true);
    // In production: dispatch to cart context or call server action
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full py-2 text-sm font-medium rounded-lg transition-all ${
        added
          ? "bg-green-500 text-white"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {added ? "✓ Added!" : "Add to Cart"}
    </button>
  );
}
```

```tsx
// src/app/products/_components/cart-count.tsx
"use client"; // ← File 2 with 'use client'

import { useState, useEffect } from "react";

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("cart-count") ?? "0", 10);
    setCount(stored);
  }, []);

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5
                     bg-blue-600 text-white text-xs font-bold rounded-full"
    >
      {count}
    </span>
  );
}
```

```tsx
// src/app/products/_components/product-card.tsx
// ✅ Server Component — no 'use client' needed (no hooks/events)

import { AddToCartButton } from "./add-to-cart-button";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function ProductCard({ product }: { product: Product }) {
  // This is a Server Component that imports a Client Component — that's fine ✅
  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="aspect-square bg-gray-100 flex items-center
                      justify-center text-4xl"
      >
        🛍️
      </div>
      <div className="p-4">
        <p className="text-xs text-blue-600 font-medium mb-0.5">
          {product.category}
        </p>
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        <p className="text-lg font-bold text-gray-900 mb-3">${product.price}</p>
        {/* Client Component nested inside Server Component ✅ */}
        <AddToCartButton productId={product.id} productName={product.name} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx
// ✅ Server Component — fetches data directly, no 'use client'

import { ProductCard } from "./_components/product-card";
import { CartCount } from "./_components/cart-count";

// Simulated DB fetch
async function getProducts() {
  return [
    { id: "1", name: "Air Max 90", price: 120, category: "Shoes" },
    { id: "2", name: "Canvas Tote", price: 45, category: "Bags" },
    { id: "3", name: "Wool Cap", price: 35, category: "Accessories" },
    { id: "4", name: "Ultraboost 22", price: 180, category: "Shoes" },
  ];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Cart</span>
          <CartCount /> {/* Client Component — only this interactive piece */}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// 'use client' appears in exactly 2 files:
// → AddToCartButton (state + onClick)
// → CartCount (state + useEffect + localStorage)
// Everything else: Server Components ✅
```

---

---

# 3 — `'use server'` — Server Actions

---

## T — TL;DR

`'use server'` marks a function as a **Server Action** — an async function that runs on the server but can be called directly from a Client Component. It replaces the need for separate API routes for form submissions and mutations. Server Actions are the bridge between client interactions and server-side data changes.

---

## K — Key Concepts

### Two Ways to Use `'use server'`

```tsx
// ─── Option 1: Inline in a Server Component
// src/app/products/new/page.tsx (Server Component)

export default function NewProductPage() {
  async function createProduct(formData: FormData) {
    "use server"; // ← makes this function a Server Action

    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));

    await db.product.create({ data: { name, price } });
    redirect("/products");
  }

  return (
    <form action={createProduct}>
      {" "}
      {/* ← Server Action as form action */}
      <input name="name" type="text" placeholder="Product name" />
      <input name="price" type="number" placeholder="Price" />
      <button type="submit">Create</button>
    </form>
  );
}
```

```tsx
// ─── Option 2: Dedicated actions file
// src/app/products/actions.ts
"use server"; // ← entire file is server actions

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));

  await db.product.create({ data: { name, price } });
  revalidatePath("/products"); // ← revalidate the products list
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath("/products");
}

export async function updateProduct(
  id: string,
  data: { name?: string; price?: number }
) {
  await db.product.update({ where: { id }, data });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}
```

### Calling Server Actions from Client Components

```tsx
// src/app/products/_components/delete-product-button.tsx
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions"; // ← import Server Action

export function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId); // ← calling server action from client
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg
                 hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Server Actions with `useActionState`

```tsx
// src/app/products/new/_components/create-product-form.tsx
"use client";

import { useActionState } from "react";
import { createProductWithValidation } from "../actions";

// Initial state type
interface FormState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

const INITIAL_STATE: FormState = {
  errors: {},
  success: false,
  message: "",
};

export function CreateProductForm() {
  // useActionState: manages form state across server action calls
  const [state, formAction, isPending] = useActionState(
    createProductWithValidation,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          className="w-full border rounded-lg px-3 py-2"
          disabled={isPending}
        />
        {state.errors.name && (
          <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Price</label>
        <input
          name="price"
          type="number"
          className="w-full border rounded-lg px-3 py-2"
          disabled={isPending}
        />
        {state.errors.price && (
          <p className="text-red-500 text-xs mt-1">{state.errors.price[0]}</p>
        )}
      </div>

      {state.message && (
        <p
          className={`text-sm ${state.success ? "text-green-600" : "text-red-500"}`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
```

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const ProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
});

interface FormState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

export async function createProductWithValidation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const parsed = ProductSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      success: false,
      message: "Please fix the errors above.",
    };
  }

  try {
    await db.product.create({ data: parsed.data });
    revalidatePath("/products");
    return { errors: {}, success: true, message: "Product created!" };
  } catch {
    return { errors: {}, success: false, message: "Failed to create product." };
  }
}
```

### `revalidatePath` and `revalidateTag` — Cache Invalidation

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  // ─── Option 1: revalidate by path
  revalidatePath("/products"); // revalidate the list
  revalidatePath(`/products/${id}`); // revalidate the specific product

  // ─── Option 2: revalidate by tag (more flexible)
  revalidateTag("products"); // revalidates all fetches tagged 'products'
}
```

```tsx
// src/app/products/page.tsx
// Tag the fetch so revalidateTag('products') refreshes this
async function getProducts() {
  return fetch("/api/products", {
    next: { tags: ["products"] }, // ← tag this fetch
  }).then((r) => r.json());
}
```

### Server Actions vs API Routes

```
Server Actions:
  ✅ No separate route file needed
  ✅ Type-safe — directly import and call the function
  ✅ Co-located with the form/page that uses it
  ✅ Progressive enhancement — work without JS (native form action)
  ✅ Automatic CSRF protection
  ✅ Integrated with Next.js cache (revalidatePath, revalidateTag)
  ❌ Can't be called from external services (use API routes for webhooks)
  ❌ Can't set custom HTTP headers/status codes

API Routes (route.ts):
  ✅ Public endpoints — callable by external services, webhooks
  ✅ Custom response headers, status codes
  ✅ Standard REST semantics for external consumers
  ❌ More boilerplate (separate file, manual validation, manual response)
  ❌ No type safety without extra tooling (tRPC solves this)

Rule: Forms/mutations within your app → Server Actions
       Webhooks, external APIs, public endpoints → API Routes
```

---

## W — Why It Matters

- Server Actions eliminate the need for API routes for internal form submissions and mutations — no more `fetch('/api/products', { method: 'POST', body: ... })` pattern for things that only your own app calls.
- The `useActionState` hook replaces the complex `isLoading + isError + error` state pattern for forms — the form state is managed by the server action response, making forms dramatically simpler.
- Progressive enhancement is a built-in benefit — a `<form action={serverAction}>` works even before JavaScript loads, because HTML forms can call server actions natively. This is a major accessibility and resilience win.
- `revalidatePath` and `revalidateTag` are the correct way to update cached data after a mutation — they invalidate specific parts of the Next.js cache without requiring a full page reload.

---

## I — Interview Q&A

### Q1: What is a Server Action and how does it differ from an API route?

**A:** A Server Action is an async function marked with `'use server'` that runs on the server but can be called directly from Client Components or used as a `<form action>`. Unlike API routes, Server Actions don't require a separate file or URL — they're imported and called like regular TypeScript functions, providing end-to-end type safety. API routes are better for public endpoints, webhooks, and external service integrations. Server Actions are better for internal form submissions and mutations that only your own UI triggers — they have automatic CSRF protection, built-in cache invalidation via `revalidatePath`, and work progressively without JavaScript.

### Q2: How do you handle form validation with Server Actions?

**A:** Use `useActionState` on the client and Zod validation in the Server Action. The action receives `(prevState, formData)` and returns a typed state object containing validation errors and success/message fields. On the client, `useActionState` provides `[state, formAction, isPending]` — `state` has the returned errors for field-level display, `formAction` replaces the native form action, and `isPending` handles the loading state. This replaces the entire pattern of separate loading/error/success state management.

### Q3: When should you use `revalidatePath` vs `revalidateTag`?

**A:** `revalidatePath('/products')` invalidates the cache for a specific URL — use it when you know exactly which pages need to update after a mutation. `revalidateTag('products')` invalidates all cached fetches that were tagged with that tag — use it when the same data is used on multiple pages and you want a single invalidation call to refresh all of them. Tags are more flexible for data that appears on many pages; paths are more explicit and easier to reason about.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Calling a Server Action from a Server Component that renders in a loop

```tsx
// ❌ Server Action imported and used in onClick inside a Server Component
// Server Components cannot have onClick handlers
export default function ProductList({ products }) {
  async function deleteProduct(id) {
    "use server";
    await db.product.delete({ where: { id } });
  }

  return products.map((p) => (
    <button onClick={() => deleteProduct(p.id)}>Delete</button> // ❌
  ));
}
```

**Fix:** Move interactive handlers to a Client Component:

```tsx
// ✅ Client Component handles the click
"use client";
import { deleteProduct } from "../actions";
export function DeleteButton({ id }: { id: string }) {
  return <button onClick={() => deleteProduct(id)}>Delete</button>;
}
```

### ❌ Pitfall: Not calling `revalidatePath` after mutations

```tsx
// ❌ Data changes in DB but the cached page doesn't update
export async function createProduct(formData: FormData) {
  'use server'
  await db.product.create({ data: ... })
  redirect('/products')   // page loads but shows OLD cached data!
}
```

**Fix:**

```tsx
export async function createProduct(formData: FormData) {
  'use server'
  await db.product.create({ data: ... })
  revalidatePath('/products')   // ← clear cache first ✅
  redirect('/products')
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete create-and-delete product flow using Server Actions:

1. `actions.ts` — `createProduct` (with Zod validation) and `deleteProduct`
2. `CreateProductForm` Client Component using `useActionState`
3. `DeleteProductButton` Client Component using `useTransition`
4. `page.tsx` Server Component that fetches products and renders both

### Solution

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

// In-memory store for demo (replace with db.product in production)
let PRODUCTS = [
  { id: "1", name: "Air Max 90", price: 120 },
  { id: "2", name: "Canvas Tote", price: 45 },
];

const Schema = z.object({
  name: z.string().min(2, "At least 2 chars"),
  price: z.coerce.number().positive("Must be > 0"),
});

interface ActionState {
  errors: Record<string, string[]>;
  success: boolean;
  message: string;
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = Schema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      success: false,
      message: "Fix the errors below.",
    };
  }

  const newProduct = { id: Date.now().toString(), ...result.data };
  PRODUCTS = [...PRODUCTS, newProduct];
  revalidatePath("/products");

  return {
    errors: {},
    success: true,
    message: `"${result.data.name}" created!`,
  };
}

export async function deleteProduct(id: string): Promise<void> {
  PRODUCTS = PRODUCTS.filter((p) => p.id !== id);
  revalidatePath("/products");
}

export async function getProducts() {
  return PRODUCTS;
}
```

```tsx
// src/app/products/_components/create-product-form.tsx
"use client";

import { useActionState } from "react";
import { createProduct } from "../actions";

const INIT = { errors: {}, success: false, message: "" };

export function CreateProductForm() {
  const [state, action, isPending] = useActionState(createProduct, INIT);

  return (
    <form action={action} className="bg-white border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Add Product</h2>

      <div>
        <input
          name="name"
          placeholder="Product name"
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {state.errors.name && (
          <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <input
          name="price"
          type="number"
          step="0.01"
          placeholder="Price"
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {state.errors.price && (
          <p className="text-red-500 text-xs mt-1">{state.errors.price[0]}</p>
        )}
      </div>

      {state.message && (
        <p
          className={`text-sm font-medium ${
            state.success ? "text-green-600" : "text-red-500"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 bg-blue-600 text-white text-sm font-medium
                         rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add Product"}
      </button>
    </form>
  );
}
```

```tsx
// src/app/products/_components/delete-product-button.tsx
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions";

export function DeleteProductButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteProduct(id))}
      disabled={isPending}
      className="px-3 py-1 bg-red-50 text-red-600 border border-red-200
                 text-xs font-medium rounded-lg hover:bg-red-100
                 disabled:opacity-40 transition-colors"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
```

```tsx
// src/app/products/page.tsx
import { getProducts } from "./actions";
import { CreateProductForm } from "./_components/create-product-form";
import { DeleteProductButton } from "./_components/delete-product-button";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Products</h1>

      <CreateProductForm />

      <div className="bg-white border rounded-xl overflow-hidden">
        {products.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            No products yet.
          </p>
        ) : (
          <ul className="divide-y">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">${p.price}</p>
                </div>
                <DeleteProductButton id={p.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

---

---

# 4 — Suspense and Streaming — Progressive Rendering

---

## T — TL;DR

`<Suspense>` wraps async Server Components and shows a fallback while they fetch data. **Streaming** sends HTML in chunks as each Suspense boundary resolves — fast sections appear immediately, slow sections fill in progressively. Together they eliminate the "wait for everything" waterfall.

---

## K — Key Concepts

### The Streaming Model

```
Without Suspense (waterfall):
  Server waits for ALL data → sends complete HTML → browser renders

  t=0ms    → user sees nothing
  t=800ms  → slowest query resolves → full HTML sent → page renders
  t=800ms  → user sees complete page

With Suspense + Streaming (progressive):
  Server sends HTML shell immediately → streams content as each section resolves

  t=0ms    → user sees page shell + skeletons (loading.tsx + Suspense fallbacks)
  t=100ms  → fast section streams in (header, stats)
  t=400ms  → medium section streams in (orders table)
  t=800ms  → slow section streams in (activity feed)
  User sees SOMETHING at t=0ms and content progressively appears
```

### Suspense Inside a Page — Granular Streaming

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { StatsCards } from "./_components/stats-cards"; // fast: ~100ms
import { OrdersTable } from "./_components/orders-table"; // medium: ~400ms
import { ActivityFeed } from "./_components/activity-feed"; // slow: ~800ms

export default function DashboardPage() {
  // Note: page itself is NOT async — individual components are
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats: fast — shows in ~100ms */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Orders: medium — shows in ~400ms */}
      <Suspense fallback={<TableSkeleton rows={5} />}>
        <OrdersTable />
      </Suspense>

      {/* Activity: slow — shows in ~800ms */}
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-10 bg-gray-200 rounded" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />;
}
```

### Each Async Component Fetches Its Own Data

```tsx
// src/app/dashboard/_components/stats-cards.tsx
async function getStats() {
  await new Promise((r) => setTimeout(r, 100)); // fast query
  return { revenue: 78400, orders: 531, customers: 89 };
}

export async function StatsCards() {
  const stats = await getStats();
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Revenue</p>
        <p className="text-2xl font-bold">${stats.revenue.toLocaleString()}</p>
      </div>
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Orders</p>
        <p className="text-2xl font-bold">{stats.orders}</p>
      </div>
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Customers</p>
        <p className="text-2xl font-bold">{stats.customers}</p>
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/activity-feed.tsx
async function getActivity() {
  await new Promise((r) => setTimeout(r, 800)); // slow query
  return [
    { id: 1, text: "New order #1044", time: "2m ago" },
    { id: 2, text: "User signup", time: "5m ago" },
  ];
}

export async function ActivityFeed() {
  const activity = await getActivity();
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold mb-3">Activity</h3>
      <ul className="space-y-2">
        {activity.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>{item.text}</span>
            <span className="text-gray-400">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Parallel vs Sequential Data Fetching

```tsx
// ❌ Sequential — each await blocks the next
export async function SlowPage() {
  const user = await getUser(); // 100ms
  const orders = await getOrders(); // 200ms  (waits for user)
  const products = await getProducts(); // 300ms  (waits for orders)
  // Total: 600ms (sequential waterfall)
}

// ✅ Parallel — all start simultaneously
export async function FastPage() {
  const [user, orders, products] = await Promise.all([
    getUser(), // starts at t=0
    getOrders(), // starts at t=0
    getProducts(), // starts at t=0
  ]);
  // Total: 300ms (max of all three)
}

// ✅ Even Better — independent Suspense boundaries
// Each section renders as soon as ITS data is ready
// No need to await all data in the parent
export function BestPage() {
  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserSection /> {/* fetches user independently */}
      </Suspense>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersSection /> {/* fetches orders independently */}
      </Suspense>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsSection /> {/* fetches products independently */}
      </Suspense>
    </>
  );
}
```

### `React.cache()` — Deduplicate Fetches Across Components

```tsx
// src/lib/queries.ts
import { cache } from "react";
import { db } from "@/lib/db";

// cache() deduplicates: if multiple components call getUser()
// in the same request, DB is only queried ONCE
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } });
});
```

```tsx
// Now layout.tsx and page.tsx can both call getUser(userId)
// and it only hits the database once per request

// src/app/dashboard/layout.tsx
const user = await getUser(userId); // → DB query

// src/app/dashboard/page.tsx
const user = await getUser(userId); // → cache hit, no DB query
```

---

## W — Why It Matters

- Suspense + streaming transforms the user experience from "white screen until fully loaded" to "shell instantly, content progressively" — measurably better Time to First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
- Independent `<Suspense>` boundaries mean each section has its own loading state — a slow analytics section doesn't prevent the fast order count from appearing.
- `Promise.all` for parallel fetching inside a single component is a critical optimization — forgetting it is the most common cause of slow Server Component pages.
- `React.cache()` is essential for deduplication — without it, the same data might be fetched multiple times in one request (once in the layout, once in the page, once in a component).

---

## I — Interview Q&A

### Q1: How does Suspense enable streaming in Next.js?

**A:** Suspense marks sections of the page that can be deferred. When the server encounters a Suspense boundary wrapping an async component, it immediately renders the fallback (skeleton) and flushes that HTML to the browser. The server continues processing other parts of the page. When the async component's data resolves, React generates the HTML for that section and streams it to the browser as a separate chunk. The browser replaces the skeleton with the real content using a small inline script. The user sees the page shell immediately and content fills in progressively.

### Q2: What is the difference between using `Promise.all` and using multiple `<Suspense>` boundaries?

**A:** `Promise.all` parallelizes fetches within a single component — all requests start at the same time, and the component renders when ALL are complete. The component shows its loading state (from `loading.tsx` or a parent Suspense) until all fetches resolve. Multiple Suspense boundaries allow each section to render as soon as its OWN data is ready — fast sections appear early, slow sections later. Suspense gives progressive rendering; `Promise.all` gives parallel (but still blocking-until-all) loading. Best practice: use both — `Promise.all` for data that a single component truly needs together, Suspense for sections that can render independently.

### Q3: What is `React.cache()` and why is it needed?

**A:** `React.cache()` memoizes an async function's result per React render tree. Within a single server request, if multiple components call `getUser(userId)`, `React.cache()` ensures the database is only queried once — subsequent calls return the cached result. This is essential because Server Components have no global request context — each component that needs user data would otherwise independently query the database. `cache()` solves the N+1 problem for cross-component data sharing without prop drilling.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Sequential awaits in a Server Component

```tsx
// ❌ 600ms total (100 + 200 + 300) — each await blocks the next
export default async function Page() {
  const user = await getUser();
  const orders = await getOrders();
  const products = await getProducts();
}
```

**Fix:**

```tsx
// ✅ 300ms total — all start simultaneously
export default async function Page() {
  const [user, orders, products] = await Promise.all([
    getUser(),
    getOrders(),
    getProducts(),
  ]);
}
```

### ❌ Pitfall: Wrapping everything in one giant Suspense

```tsx
// ❌ One Suspense for the whole page
// User waits for the SLOWEST section before seeing ANYTHING
<Suspense fallback={<FullPageSkeleton />}>
  <FastSection /> {/* 100ms */}
  <SlowSection /> {/* 800ms */} {/* blocks FastSection from showing */}
</Suspense>
```

**Fix:** Independent boundaries per section:

```tsx
<Suspense fallback={<FastSkeleton />}>
  <FastSection />    {/* shows at 100ms */}
</Suspense>
<Suspense fallback={<SlowSkeleton />}>
  <SlowSection />    {/* shows at 800ms — doesn't block FastSection */}
</Suspense>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/app/[workspaceId]` overview page with:

1. Three independent async Server Components: `WorkspaceStats`, `RecentProjects`, `TeamActivity`
2. Each wrapped in its own `<Suspense>` with a matching skeleton
3. Stats fetches in 100ms, Projects in 400ms, Activity in 900ms
4. `getWorkspaceStats` and `getTeamActivity` both call `getWorkspace(id)` — use `React.cache()` to deduplicate

### Solution

```tsx
// src/lib/workspace-queries.ts
import { cache } from "react";

// Deduplicates getWorkspace calls within the same request
export const getWorkspace = cache(async (id: string) => {
  await new Promise((r) => setTimeout(r, 50));
  return { id, name: "Acme Corp", plan: "pro", memberCount: 12 };
});

export async function getWorkspaceStats(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId); // → cache hit if called elsewhere
  await new Promise((r) => setTimeout(r, 100));
  return {
    workspaceName: workspace.name,
    revenue: 48200,
    projects: 7,
    tasks: 43,
  };
}

export async function getRecentProjects(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 400));
  return [
    { id: "p1", name: "Website Redesign", progress: 72, status: "active" },
    { id: "p2", name: "Mobile App v2", progress: 38, status: "active" },
    { id: "p3", name: "API Integration", progress: 55, status: "paused" },
  ];
}

export async function getTeamActivity(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId); // → cache hit (same request)
  await new Promise((r) => setTimeout(r, 900));
  return [
    {
      id: 1,
      user: "Alice",
      action: `Updated project in ${workspace.name}`,
      time: "3m ago",
    },
    { id: 2, user: "Bob", action: "Completed task #42", time: "18m ago" },
    { id: 3, user: "Carol", action: "Added comment on PR #7", time: "1h ago" },
  ];
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/workspace-stats.tsx
import { getWorkspaceStats } from "@/lib/workspace-queries";

export async function WorkspaceStats({ workspaceId }: { workspaceId: string }) {
  const stats = await getWorkspaceStats(workspaceId);
  const ITEMS = [
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}` },
    { label: "Projects", value: String(stats.projects) },
    { label: "Tasks", value: String(stats.tasks) },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">{item.label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/recent-projects.tsx
import { getRecentProjects } from "@/lib/workspace-queries";

export async function RecentProjects({ workspaceId }: { workspaceId: string }) {
  const projects = await getRecentProjects(workspaceId);
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold">Recent Projects</h3>
      </div>
      <ul className="divide-y">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="text-sm font-medium">{p.name}</span>
            <div className="flex items-center gap-3">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-7">{p.progress}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/team-activity.tsx
import { getTeamActivity } from "@/lib/workspace-queries";

export async function TeamActivity({ workspaceId }: { workspaceId: string }) {
  const activity = await getTeamActivity(workspaceId);
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold">Team Activity</h3>
      </div>
      <ul className="divide-y">
        {activity.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3">
            <div
              className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                            justify-center text-xs font-bold text-blue-700 shrink-0"
            >
              {item.user[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">
                <strong>{item.user}</strong> {item.action}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/page.tsx
import { Suspense } from "react";
import { WorkspaceStats } from "./_components/workspace-stats";
import { RecentProjects } from "./_components/recent-projects";
import { TeamActivity } from "./_components/team-activity";

type Params = Promise<{ workspaceId: string }>;

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceId } = await params;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* Stats — streams in at ~150ms */}
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <WorkspaceStats workspaceId={workspaceId} />
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        {/* Projects — streams in at ~450ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl h-48 animate-pulse" />
          }
        >
          <RecentProjects workspaceId={workspaceId} />
        </Suspense>

        {/* Activity — streams in at ~950ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl h-48 animate-pulse" />
          }
        >
          <TeamActivity workspaceId={workspaceId} />
        </Suspense>
      </div>
    </div>
  );
}

// getWorkspace() called in BOTH WorkspaceStats and TeamActivity
// React.cache() ensures it hits the DB only ONCE ✅
```

---

---

# 5 — Lazy Loading — `next/dynamic` and Code Splitting

---

## T — TL;DR

`next/dynamic` lazily loads a component — its JavaScript is only downloaded when the component is about to render. It reduces the initial bundle size by splitting rarely-used or large components into separate chunks, loaded on demand.

---

## K — Key Concepts

### Basic `next/dynamic`

```tsx
import dynamic from "next/dynamic";

// ─── 1. Basic lazy load
const HeavyChart = dynamic(() => import("./heavy-chart"));
// HeavyChart.js is NOT in the initial bundle
// It's downloaded only when <HeavyChart /> is rendered

// ─── 2. With a loading fallback
const HeavyChart = dynamic(() => import("./heavy-chart"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />,
});

// ─── 3. Disable SSR (browser-only components)
const MapComponent = dynamic(
  () => import("./map-component"),
  { ssr: false } // ← component only renders in browser, never on server
);
// Use for: components that use window, document, or browser-only libraries
// (e.g., Leaflet, Three.js, rich text editors)

// ─── 4. Named exports
const { Editor } = dynamic(() =>
  import("./rich-text-editor").then((mod) => mod.Editor)
);
```

### When to Use `next/dynamic`

```
Use dynamic() for:
  ✅ Large third-party libraries (chart libraries, map libraries, editors)
  ✅ Components only used on user interaction (modals, drawers, tooltips)
  ✅ Browser-only components (uses window/document)
  ✅ Admin-only features loaded conditionally
  ✅ Code-split heavy features behind feature flags

Don't use dynamic() for:
  ❌ Small components (adds more overhead than it saves)
  ❌ Components needed for initial render above the fold
  ❌ Components that are always visible on page load
  ❌ Simple UI components (buttons, inputs, text)
```

### Real-World Patterns

```tsx
// src/app/dashboard/analytics/page.tsx
import dynamic from "next/dynamic";

// Chart library is large (~200kb) — only load when needed
const RevenueChart = dynamic(() => import("./_components/revenue-chart"), {
  loading: () => (
    <div
      className="h-64 bg-gray-100 rounded-xl animate-pulse
                      flex items-center justify-center text-gray-400 text-sm"
    >
      Loading chart...
    </div>
  ),
  ssr: false, // chart library uses browser canvas APIs
});

// Map only loads when user clicks "View on Map"
const LocationMap = dynamic(() => import("./_components/location-map"), {
  ssr: false,
});

export default function AnalyticsPage() {
  return (
    <div>
      {/* Chart loads immediately but browser-only */}
      <RevenueChart />

      {/* Map loads on demand — conditionally rendered */}
      <LocationMapSection MapComponent={LocationMap} />
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/location-map-section.tsx
"use client";

import { useState } from "react";
import type { ComponentType } from "react";

export function LocationMapSection({
  MapComponent,
}: {
  MapComponent: ComponentType;
}) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div>
      {!showMap ? (
        <button
          onClick={() => setShowMap(true)}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Show on Map
        </button>
      ) : (
        <div className="h-64 rounded-xl overflow-hidden border">
          <MapComponent />
          {/* MapComponent JS only downloaded when showMap becomes true */}
        </div>
      )}
    </div>
  );
}
```

### `next/dynamic` vs `React.lazy`

```
next/dynamic:
  ✅ Works with SSR (can control ssr: true/false)
  ✅ Integrated loading state (loading option)
  ✅ Works in Server Components context
  ✅ Handles named exports cleanly
  Use in: Next.js App Router

React.lazy:
  ✅ Standard React API
  ✅ Works with <Suspense> fallback
  ❌ Client-only (no SSR support)
  ❌ No built-in loading option (need Suspense)
  Use in: Client-only React apps, CRA

In Next.js App Router: prefer next/dynamic for Client Component lazy loading
```

---

## W — Why It Matters

- Large chart libraries (Chart.js, Recharts, D3) can add 200–500kb to the initial JS bundle — lazily loading them with `ssr: false` means the first page load is instant and the chart library loads in the background.
- The `ssr: false` option is essential for browser-only libraries — attempting to run Leaflet maps or rich text editors on the server causes hydration errors because `window` doesn't exist on the server.
- Conditional lazy loading (only download the modal JS when the user clicks "open") is a significant optimization for dashboards with many features — users who never open a specific modal never download its code.

---

## I — Interview Q&A

### Q1: What is the difference between `next/dynamic` and a regular import?

**A:** A regular `import` is static — the module is included in the initial JavaScript bundle and downloaded with the page. `next/dynamic` creates a dynamic import that is code-split into a separate chunk — that chunk is only downloaded when the component is actually about to render. For large components or libraries, this reduces the initial bundle size and speeds up the first page load. The tradeoff: the component has a loading state while its chunk downloads.

### Q2: When should you use `ssr: false`?

**A:** Use `ssr: false` for components that rely on browser-only APIs: `window`, `document`, `navigator`, `localStorage`, or libraries that use these internally — like Leaflet maps, Three.js, rich text editors (TipTap, Quill), or canvas-based chart libraries. On the server, these APIs don't exist — importing them causes errors. `ssr: false` tells Next.js to skip server rendering for that component entirely; it only renders in the browser after hydration.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `dynamic` with `ssr: false` in a Server Component

```tsx
// src/app/page.tsx — Server Component
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
// ❌ ssr: false in a Server Component is contradictory and may cause issues
```

**Fix:** Use `dynamic` with `ssr: false` inside Client Components only:

```tsx
"use client";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
```

### ❌ Pitfall: Lazy loading tiny components

```tsx
// ❌ Button is 2kb — dynamic import overhead > savings
const Button = dynamic(() => import("./button"));
```

**Fix:** Only use `dynamic` for genuinely large components (>30kb min):

```tsx
import { Button } from "./button"; // ← regular import for small components
const RichEditor = dynamic(() => import("./rich-editor")); // ← heavy (150kb)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a dashboard page that:

1. Lazily loads a `RevenueChart` with `ssr: false` and a skeleton loading state
2. Lazily loads an `ExportModal` that only loads its JS when the user clicks "Export"
3. Shows both components with proper loading states

### Solution

```tsx
// src/app/dashboard/_components/revenue-chart.tsx
"use client";
// Simulate a heavy chart library
export default function RevenueChart() {
  const data = [42, 58, 47, 73, 65, 89, 76];
  const max = Math.max(...data);
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold mb-4">Revenue (Last 7 days)</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${(val / max) * 100}px` }}
            />
            <span className="text-xs text-gray-400">D{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/export-modal.tsx
"use client";
interface Props {
  onClose: () => void;
}
export default function ExportModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
        <h2 className="font-bold text-lg mb-4">Export Data</h2>
        <div className="space-y-2 mb-6">
          {["CSV", "Excel", "PDF"].map((fmt) => (
            <button
              key={fmt}
              className="w-full py-2.5 border rounded-lg text-sm
                               hover:bg-gray-50 text-left px-4"
            >
              Export as {fmt}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Lazy: loads only in browser, shows skeleton while loading
const RevenueChart = dynamic(() => import("./_components/revenue-chart"), {
  ssr: false,
  loading: () => (
    <div className="bg-white border rounded-xl p-5 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
      <div className="flex items-end gap-2 h-32">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${40 + i * 10}px` }}
          />
        ))}
      </div>
    </div>
  ),
});

// Lazy: only downloads ExportModal JS when showExport becomes true
const ExportModal = dynamic(() => import("./_components/export-modal"), {
  ssr: false,
});

export default function DashboardPage() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600
                     hover:bg-gray-50"
        >
          Export
        </button>
      </div>

      {/* Chart: downloads its JS bundle immediately (but only in browser) */}
      <RevenueChart />

      {/* Modal: JS only downloads when showExport = true */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
```

---

---

# 6 — Composition Patterns — Server Inside Client, Client Inside Server

---

## T — TL;DR

Server and Client Components can be **composed together** — but only in specific ways. The key constraint: you can't import a Server Component inside a Client Component. Instead, pass Server Components as `children` or props. Understanding this pattern is what makes complex hybrid UIs possible.

---

## K — Key Concepts

### The Composition Rules

```
ALLOWED:
  Server Component → imports → Server Component    ✅
  Server Component → imports → Client Component    ✅
  Client Component → renders → children (Server)   ✅ (via props)
  Client Component → renders → slot props (Server)  ✅ (via props)

NOT ALLOWED:
  Client Component → imports → Server Component    ❌
  (The import crosses the client boundary — Server Component
   becomes a Client Component, losing server benefits)
```

### Why Client Can't Import Server

```tsx
// ❌ This doesn't work — importing a Server Component into a Client Component
"use client";
import { ServerDataTable } from "./server-data-table"; // ← Server Component

export function ClientWrapper() {
  const [filter, setFilter] = useState("");
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ServerDataTable filter={filter} />{" "}
      {/* ← ERROR: can't import Server into Client */}
    </div>
  );
}

// Why? When Client Component boundary is established, everything
// imported INTO it must be client-compatible.
// Server Components can have async code, DB access — these don't work in the browser.
```

### The Fix — Pass as Props (children pattern)

```tsx
// ✅ Solution: parent Server Component passes Server Component as children

// src/app/products/page.tsx — Server Component (parent)
import { FilterWrapper } from "./_components/filter-wrapper"; // Client
import { ProductTable } from "./_components/product-table"; // Server

export default async function ProductsPage() {
  return (
    // FilterWrapper is a Client Component
    // ProductTable is a Server Component passed as children
    <FilterWrapper>
      <ProductTable /> {/* ← Server Component passed as children prop */}
    </FilterWrapper>
  );
}
```

```tsx
// src/app/products/_components/filter-wrapper.tsx
"use client";

import { useState } from "react";

export function FilterWrapper({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState("");

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter..."
        className="border rounded-lg px-3 py-2 mb-4 w-full"
      />
      {/* children (ProductTable) renders here — Server Component */}
      {children}
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-table.tsx
// Server Component — fetches its own data
import { db } from "@/lib/db";

export async function ProductTable() {
  const products = await db.product.findMany();
  return (
    <table>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>${p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### The Slot Pattern — Passing Multiple Server Components

```tsx
// Server Component — parent
import { Modal }       from './_components/modal'       // Client
import { ModalHeader } from './_components/modal-header' // Server
import { ModalBody }   from './_components/modal-body'   // Server

export default function ProductDetailPage({ product }) {
  return (
    <Modal
      header={<ModalHeader title={product.name} />}   {/* Server via prop */}
      body={<ModalBody product={product} />}           {/* Server via prop */}
    />
  )
}
```

```tsx
// _components/modal.tsx — Client Component
"use client";

import { useState } from "react";

interface ModalProps {
  header: React.ReactNode; // receives Server Component output
  body: React.ReactNode; // receives Server Component output
}

export function Modal({ header, body }: ModalProps) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          {header} {/* Server Component renders here */}
          <button onClick={() => setOpen(false)}>×</button>
        </div>
        {body} {/* Server Component renders here */}
      </div>
    </div>
  );
}
```

### Context Provider Pattern — Server → Client → Server

```tsx
// ThemeContext.tsx — Client Component (context must be client-side)
"use client";

import { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

```tsx
// src/app/layout.tsx — Server Component wraps Client Provider
import { ThemeProvider } from "@/components/theme-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* ThemeProvider is Client, but children (Server Components) pass through */}
        <ThemeProvider>
          {children}{" "}
          {/* ← Server Components can be children of Client Provider */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- The children-as-server-component pattern is the critical insight for mixing interactivity with server data — a client-side modal can contain server-rendered content by receiving it as `children`, not by importing the server component directly.
- Context providers MUST be Client Components (they use `createContext` and `useState`), but they can wrap Server Components via `children`. This is how global state (theme, auth, cart) is provided to the entire app while still allowing Server Components throughout the tree.
- The composition pattern is the key to building complex UIs like interactive data tables with server-fetched data, sidebars with filter state and server content, and modal dialogs with dynamic server-rendered body content.

---

## I — Interview Q&A

### Q1: Why can't a Client Component import a Server Component?

**A:** When a Client Component boundary is established with `'use client'`, everything imported into it must be bundleable as client-side JavaScript. Server Components may contain `async` functions with direct database access, server-only imports, and environment secrets — none of which can exist in the browser bundle. Importing a Server Component into a Client Component would either cause a build error or silently convert the Server Component to a Client Component (losing its server benefits). The solution is to pass Server Components as `children` or props from a Server Component parent.

### Q2: How do you pass Server Component output to a Client Component?

**A:** Through `children` or named slot props. A Server Component parent renders both the Client Component and the Server Component, passing the Server Component as `children` or a prop (like `header={<ServerHeader />}`). The Client Component receives and renders `React.ReactNode` — it doesn't need to know whether the content is from a Server or Client Component. The key is that the Server Component is rendered by the Server Component parent, not imported by the Client Component.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trying to import Server Component into Client Component

```tsx
"use client";
import { ServerDataTable } from "./server-data-table"; // ❌ Server Component
// Build error or ServerDataTable silently becomes client-side
```

**Fix:** Lift the composition to a Server Component parent:

```tsx
// Server Component parent — composes both
export default function Page() {
  return (
    <ClientWrapper>
      <ServerDataTable />{" "}
      {/* ← passed as children, not imported by ClientWrapper */}
    </ClientWrapper>
  );
}
```

### ❌ Pitfall: Putting context providers in Server Components

```tsx
// ❌ createContext requires client runtime
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
// Error: createContext is not available in Server Components
```

**Fix:** Wrap providers in a `'use client'` file:

```tsx
// src/app/_providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

```tsx
// src/app/layout.tsx — Server Component
import { Providers } from "./_providers";
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SearchableProductList>` where:

1. `page.tsx` (Server) fetches products and passes them to `SearchableProductList`
2. `SearchableProductList` (Client) manages a search input with state
3. `ProductCard` (Server Component) is passed as `children` to avoid importing it in the Client Component
4. The search filtering happens client-side using JavaScript

### Solution

```tsx
// src/app/products/_components/product-card-static.tsx
// Server Component — pure display, no interactivity
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function ProductCardStatic({ product }: { product: Product }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <p className="text-xs text-blue-600 font-medium mb-1">
        {product.category}
      </p>
      <h3 className="font-semibold text-gray-900">{product.name}</h3>
      <p className="text-lg font-bold text-gray-900 mt-1">${product.price}</p>
    </div>
  );
}
```

```tsx
// src/app/products/_components/searchable-list.tsx
"use client";

import { useState, useMemo } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Props {
  products: Product[];
  renderCard: (product: Product) => React.ReactNode; // ← receives render function from server
}

export function SearchableList({ products, renderCard }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      ),
    [products, query]
  );

  return (
    <div>
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full border rounded-xl px-4 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {filtered.length} of {products.length} products
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No products match "{query}"
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((product) => renderCard(product))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx — Server Component
import { SearchableList } from "./_components/searchable-list";
import { ProductCardStatic } from "./_components/product-card-static";

async function getProducts() {
  return [
    { id: "1", name: "Air Max 90", price: 120, category: "Shoes" },
    { id: "2", name: "Canvas Tote", price: 45, category: "Bags" },
    { id: "3", name: "Wool Cap", price: 35, category: "Accessories" },
    { id: "4", name: "Ultraboost 22", price: 180, category: "Shoes" },
    { id: "5", name: "Leather Belt", price: 55, category: "Accessories" },
    { id: "6", name: "Leather Bag", price: 220, category: "Bags" },
  ];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <SearchableList
        products={products}
        renderCard={(product) => (
          <ProductCardStatic key={product.id} product={product} />
        )}
      />
    </div>
  );
}
// SearchableList is Client (manages search state)
// ProductCardStatic is Server Component output passed via renderCard prop
// Client-side filtering uses the products array passed as prop ✅
```

---

---

# 7 — Choosing Server-Client Boundaries — Decision Framework

---

## T — TL;DR

Every component decision comes down to one question: **"Does this component need to run in the browser?"** If the answer is no, keep it a Server Component. If yes — for state, events, or browser APIs — make it a Client Component, but place the boundary as deep as possible.

---

## K — Key Concepts

### The Decision Flowchart

```
Does the component need:
  → useState / useReducer?          → Client Component
  → useEffect / useLayoutEffect?    → Client Component
  → useContext (consuming)?         → Client Component
  → onClick / onChange / onSubmit?  → Client Component
  → window / document / navigator?  → Client Component
  → browser-only library?           → Client Component
  → Custom hook with any of above?  → Client Component

None of the above?
  → Does it fetch data?             → Server Component (async)
  → Does it render from props?      → Server Component (sync)
  → Does it access process.env secrets? → Server Component
  → Does it need the DB directly?   → Server Component

Rule of thumb: Default to Server. Opt into Client only when necessary.
```

### Boundary Placement — Go Leaf-Deep

```
❌ Bad — boundary too high (entire page is client-side):
  page.tsx ('use client')
  └── ProductList ('use client' via inheritance)
      └── ProductCard ('use client' via inheritance)
          └── AddToCartButton  ← only THIS needs 'use client'

✅ Good — boundary at the leaf:
  page.tsx (Server Component)
  └── ProductList (Server Component)
      └── ProductCard (Server Component)
          └── AddToCartButton ('use client') ← only this one
```

### Component Classification Examples

```
Server Component — these almost always stay server:
  ✅ Page layouts (page.tsx, layout.tsx)
  ✅ Data-fetching wrapper components
  ✅ Static navigation menus (no active state)
  ✅ Content components (blog post body, product description)
  ✅ Server-side error boundaries (not-found.tsx)
  ✅ SEO-related components (metadata, schema.org)
  ✅ Email template components

Client Component — these almost always need client:
  ✅ Form inputs (useState for controlled inputs)
  ✅ Modal/drawer open/close state
  ✅ Toggle switches, tabs, accordions
  ✅ Real-time data displays (WebSocket consumers)
  ✅ Drag and drop
  ✅ Video/audio players
  ✅ Third-party widgets (Stripe, Intercom, analytics)
  ✅ Global navigation with active-state detection

Could be either — look at the specific usage:
  ❓ Navigation bar — no active state = Server, active state = Client
  ❓ Product card — no interaction = Server, has favorite button = extract button as Client
  ❓ User avatar — static = Server, has dropdown menu = Client (or extract dropdown)
```

### The Extract Pattern — Minimize Client Surface

```tsx
// ❌ Don't make the whole card Client just for one button
"use client";
export function ProductCard({ product }) {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <img src={product.image} /> {/* doesn't need client */}
      <h3>{product.name}</h3> {/* doesn't need client */}
      <p>${product.price}</p> {/* doesn't need client */}
      <button onClick={() => setSaved((s) => !s)}>
        {" "}
        {/* ONLY this needs client */}
        {saved ? "♥ Saved" : "♡ Save"}
      </button>
    </div>
  );
}
```

```tsx
// ✅ Extract ONLY the interactive part
// product-card.tsx — Server Component
export function ProductCard({ product }) {
  return (
    <div>
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <SaveButton productId={product.id} /> {/* ← tiny Client Component */}
    </div>
  );
}

// save-button.tsx — Client Component (just the button)
("use client");
import { useState } from "react";
export function SaveButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button onClick={() => setSaved((s) => !s)}>
      {saved ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
```

### Decision Matrix — At a Glance

```
Component type              Server  Client  Notes
────────────────────────    ──────  ──────  ─────────────────────────
page.tsx                      ✅             Usually Server
layout.tsx                    ✅             Usually Server
Data fetching                 ✅             Always Server
Static content                ✅             Always Server
Form with validation          ✅     ✅      Action = Server, UI = Client
Table with sorting                   ✅     Sort state = Client
Table with server data        ✅             Data fetch = Server, table = Server
Active nav link                      ✅     usePathname needs client
Theme toggle                         ✅     localStorage = Client
Modal open/close state               ✅     useState = Client
Modal content                 ✅             Can be Server via children
Dropdown menu                        ✅     open/close state
Search input                         ✅     controlled input
Search results                ✅             data fetch from URL params
Auth state consumer                  ✅     useSession/useAuth = Client
Auth guard                    ✅             Server-side redirect
Error boundary                       ✅     error.tsx = Client
Loading skeleton              ✅             loading.tsx = Server (or either)
```

---

## W — Why It Matters

- The boundary placement decision directly controls your JavaScript bundle size — a poorly placed `'use client'` on a layout can make 20+ child components client-side unnecessarily, shipping hundreds of KB of extra JavaScript.
- The extract pattern (pull the interactive element into its own tiny file) is the most impactful refactoring you can do for performance — turning a client-side card component into a server-side card with a tiny client-side button.
- Knowing the matrix by heart means you make the right decision instantly during code reviews and architecture discussions, instead of defaulting to "add 'use client' everywhere."

---

## I — Interview Q&A

### Q1: How do you decide whether a component should be Server or Client?

**A:** Start with Server by default — every component is a Server Component unless it needs the React client runtime. Ask one question: "Does this component need to run in the browser?" If it needs `useState`, `useEffect`, event handlers, browser APIs, or client-only libraries — it needs `'use client'`. If it just renders JSX from props or fetches data — it stays a Server Component. The key optimization: if only a small part of a larger component needs interactivity, extract that part into a separate file with `'use client'`, keeping the parent as a Server Component.

### Q2: What happens to bundle size when you place `'use client'` too high in the tree?

**A:** Everything below a `'use client'` boundary — the component itself and everything it imports — gets bundled and sent to the browser. If you add `'use client'` to a layout component that contains 15 child components, all 15 become client-side code in the bundle, even if 12 of them never use any client features. The JavaScript bundle grows unnecessarily, increasing initial load time and worsening Core Web Vitals scores. The fix is to push the boundary as far down the tree as possible.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Defaulting to `'use client'` for all components

```tsx
// Developer adds 'use client' to avoid errors without thinking
"use client";
export function ProductDescription({ description }: { description: string }) {
  return <p className="text-gray-600">{description}</p>;
  // Zero hooks, zero events, zero browser APIs — completely unnecessary
}
```

**Fix:** Remove `'use client'` — this is a perfectly fine Server Component:

```tsx
// ✅ No directive needed
export function ProductDescription({ description }: { description: string }) {
  return <p className="text-gray-600">{description}</p>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Classify each component as Server or Client and write the minimal implementation:

1. `PageHeader` — shows page title from props, has no interaction
2. `NotificationBell` — shows a count badge, has a dropdown on click
3. `UserAvatar` — shows user initials from props, no interaction
4. `FilterBar` — manages active filter state with buttons
5. `ProductGrid` — fetches products from DB, renders a grid

### Solution

```tsx
// 1. PageHeader — Server Component (no interaction)
// ✅ No 'use client'
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
```

```tsx
// 2. NotificationBell — Client Component (dropdown open/close state)
"use client";
import { useState } from "react";

export function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative p-2">
        🔔
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500
                           text-white text-xs rounded-full flex items-center justify-center"
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-10 w-64 bg-white border rounded-xl
                        shadow-lg p-3 z-10"
        >
          <p className="text-sm text-gray-500">
            {count} notification{count !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
```

```tsx
// 3. UserAvatar — Server Component (no interaction)
// ✅ No 'use client'
export function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-500 flex items-center
                    justify-center text-white font-bold shrink-0`}
    >
      {name[0].toUpperCase()}
    </div>
  );
}
```

```tsx
// 4. FilterBar — Client Component (active filter state)
"use client";
import { useState } from "react";

const FILTERS = ["All", "Shoes", "Bags", "Accessories"];

export function FilterBar({ onFilter }: { onFilter?: (f: string) => void }) {
  const [active, setActive] = useState("All");

  function handleSelect(filter: string) {
    setActive(filter);
    onFilter?.(filter);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => handleSelect(f)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border
                      transition-colors ${
                        active === f
                          ? "bg-blue-600 text-white border-blue-600"
                          : "text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// 5. ProductGrid — Server Component (fetches data, no interactivity)
// ✅ No 'use client' — async Server Component
import { db } from "@/lib/db";

export async function ProductGrid() {
  const products = await db.product.findMany({ take: 8 });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <div key={p.id} className="border rounded-xl p-4">
          <h3 className="font-semibold text-sm">{p.name}</h3>
          <p className="text-blue-600 font-bold">${p.price}</p>
        </div>
      ))}
    </div>
  );
}
```

---

---

# 8 — Data Fetching Patterns — Where Data Lives

---

## T — TL;DR

In the App Router, data fetching has a clear home: **fetch in the Server Component closest to where the data is needed**. This eliminates prop-drilling, avoids waterfalls, and keeps sensitive data on the server. The patterns — per-component fetch, parallel fetch, deduplication, mutations via Server Actions — cover every real-world case.

---

## K — Key Concepts

### Pattern 1 — Fetch Close to Usage (Colocated Fetching)

```tsx
// Instead of fetching everything in the root and drilling props down...

// ✅ Each component fetches what it needs
// src/app/dashboard/_components/order-summary.tsx
async function getOrderSummary() {
  return db.order.aggregate({
    _count: true,
    _sum: { total: true },
    where: { status: "pending" },
  });
}

export async function OrderSummary() {
  const summary = await getOrderSummary();
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-sm text-gray-500">Pending Orders</p>
      <p className="text-2xl font-bold">{summary._count}</p>
      <p className="text-sm text-gray-600">
        Total: ${summary._sum.total?.toFixed(2)}
      </p>
    </div>
  );
}
```

### Pattern 2 — Parallel Fetch with `Promise.all`

```tsx
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  // All three queries start simultaneously
  const [user, orders, notifications] = await Promise.all([
    getCurrentUser(),
    getRecentOrders(),
    getUnreadNotifications(),
  ]);

  return (
    <div>
      <WelcomeBanner user={user} />
      <OrderList orders={orders} />
      <NotificationList notifications={notifications} />
    </div>
  );
}
```

### Pattern 3 — Sequential Fetch (when needed)

```tsx
// Some data depends on previous data — sequential is correct here
export default async function UserOrdersPage({ params }) {
  const { userId } = await params;

  const user = await getUser(userId);
  if (!user) notFound();

  // Order query needs user.orgId — sequential dependency is valid
  const orders = await getOrders({ orgId: user.orgId });

  return <OrderList orders={orders} user={user} />;
}
```

### Pattern 4 — Server Action Mutations + Revalidation

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

export async function archiveProduct(id: string) {
  await db.product.update({
    where: { id },
    data: { status: "archived" },
  });

  // Invalidate all pages that show product data
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidateTag("products"); // clears all fetches tagged 'products'
}
```

### Pattern 5 — Fetch with Next.js Cache Control

```tsx
// src/app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const { slug } = await params;

  // ─── Revalidate on access every hour
  const post = await fetch(`${process.env.CMS_URL}/posts/${slug}`, {
    next: { revalidate: 3600 }, // ISR: re-fetch after 1 hour
  }).then((r) => r.json());

  // ─── Tag for on-demand revalidation
  const categories = await fetch(`${process.env.CMS_URL}/categories`, {
    next: { tags: ["categories"] }, // revalidate with revalidateTag('categories')
  }).then((r) => r.json());

  // ─── Always fresh (no cache)
  const liveInventory = await fetch(
    `${process.env.INVENTORY_URL}/stock/${slug}`,
    {
      cache: "no-store", // fresh on every request
    }
  ).then((r) => r.json());

  return <PostView post={post} categories={categories} stock={liveInventory} />;
}
```

### Pattern 6 — Client-Side Fetch (TanStack Query)

```tsx
// For data that needs to be:
// - frequently updated (real-time feel)
// - user-specific and re-fetched on demand
// - controlled with refetch, mutations, optimistic updates

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function LiveOrderStatus({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetch(`/api/orders/${orderId}`).then((r) => r.json()),
    refetchInterval: 5000, // poll every 5 seconds
  });

  const { mutate: cancelOrder, isPending } = useMutation({
    mutationFn: () =>
      fetch(`/api/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
  });

  if (isLoading)
    return <div className="animate-pulse h-12 bg-gray-100 rounded" />;

  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="font-semibold">Status: {order.status}</p>
      {order.status === "pending" && (
        <button
          onClick={() => cancelOrder()}
          disabled={isPending}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg"
        >
          {isPending ? "Cancelling..." : "Cancel Order"}
        </button>
      )}
    </div>
  );
}
```

### Where Data Lives — Summary Decision

```
Data type                           → Fetch where?
─────────────────────────────────   ────────────────────────────
Initial page content                → Server Component (async)
Secrets / DB access required        → Server Component (async)
Static or slow-changing data        → Server Component + ISR
User-specific on first load         → Server Component (from cookies/session)
Real-time / polled data             → Client Component (TanStack Query)
Optimistic update needed            → Client Component (TanStack Query)
After user action (mutation)        → Server Action + revalidatePath
Form submission                     → Server Action
External API with auth              → Server Component (headers stay server)
```

---

## W — Why It Matters

- Colocated data fetching eliminates prop drilling — a deeply nested component can fetch exactly what it needs without the parent having to fetch and pass it down through multiple levels.
- The choice between Server fetch (with `cache`) and Client fetch (with TanStack Query) is the most important data architecture decision — getting it wrong means either stale data or unnecessary JavaScript on the client.
- `revalidateTag` is the key to clean cache invalidation across multiple pages — tagging fetches and invalidating by tag is more maintainable than manually calling `revalidatePath` for every affected URL.

---

## I — Interview Q&A

### Q1: What is the difference between `cache: 'no-store'`, `next: { revalidate }`, and `next: { tags }`?

**A:** `cache: 'no-store'` bypasses all caching — every request fetches fresh data from the origin. Use for live inventory, real-time prices, or any data that must be current on every page load. `next: { revalidate: N }` enables ISR (Incremental Static Regeneration) — the response is cached and served for N seconds, then re-fetched in the background. Use for blog posts, product details, and data that changes infrequently. `next: { tags: ['tag'] }` tags the cached response — calling `revalidateTag('tag')` from a Server Action purges that cache on demand. Use when you want to invalidate data immediately after a mutation, regardless of the revalidation interval.

### Q2: When should you use TanStack Query instead of Server Component data fetching?

**A:** Use TanStack Query (client-side fetching) for data that needs to be: refreshed automatically (polling with `refetchInterval`), updated optimistically (show the change before the server confirms), mutated with complex state (loading, error, retries), or shared across many client components via the query cache. Use Server Component fetching for: initial page data, data that doesn't need to be interactive, content that should be in the initial HTML for SEO, and anything involving secrets or direct DB access. Most apps use both: Server Components for initial load, TanStack Query for interactive updates.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Fetching in `useEffect` for data that should be server-fetched

```tsx
// ❌ Entire component is Client just to fetch initial data
"use client";
export default function ProductPage({ params }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading)
    return <div className="animate-pulse h-48 bg-gray-100 rounded" />;
  return <ProductView product={product} />;
}
// Problems:
//   → Requires a separate /api/products/[id] route
//   → Ships JS to browser for what is pure data display
//   → Content missing from initial HTML (bad SEO)
//   → Two round-trips: page load → JS → fetch → render
//   → Loading state needed for every visit (even cached pages)
```

**Fix:** Use an async Server Component — zero client JS, content in initial HTML:

```tsx
// ✅ Server Component — no 'use client', no useEffect, no API route needed
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) notFound();

  return <ProductView product={product} />;
  // ✅ Data in initial HTML (SEO-ready)
  // ✅ Zero client JS for this component
  // ✅ No API route needed
  // ✅ No loading state flash
}
```

### ❌ Pitfall: Prop-drilling server data through multiple levels

```tsx
// ❌ Root fetches everything and drills it down 4 levels
export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <DashboardLayout user={user} />;
}

function DashboardLayout({ user }) {
  return <DashboardContent user={user} />;
}

function DashboardContent({ user }) {
  return <UserGreeting user={user} />;
}

function UserGreeting({ user }) {
  return <h2>Hello, {user.name}</h2>;
  // user.name is the ONLY thing needed — but it was fetched 4 levels up
}
```

**Fix:** Use `React.cache()` and fetch at the component that needs it:

```tsx
// src/lib/queries.ts
import { cache } from "react";
export const getCurrentUser = cache(async () => {
  return db.user.findFirst({ where: { session: await getSession() } });
});

// UserGreeting fetches its own data — no prop needed
export async function UserGreeting() {
  const user = await getCurrentUser(); // ← cache hit if called elsewhere
  return <h2>Hello, {user?.name}</h2>;
}

// DashboardPage doesn't need to pass user down at all
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <UserGreeting /> {/* fetches its own user data */}
    </DashboardLayout>
  );
}
```

### ❌ Pitfall: Not tagging fetches that need on-demand revalidation

```tsx
// ❌ Blog post cached with revalidate: 3600 (1 hour)
// Editor publishes an update → visitors see stale post for up to 1 hour
const post = await fetch(`${CMS_URL}/posts/${slug}`, {
  next: { revalidate: 3600 }, // no tag — can't invalidate on demand
});
```

**Fix:** Add a tag so you can invalidate immediately from a Server Action:

```tsx
// ✅ Tagged fetch
const post = await fetch(`${CMS_URL}/posts/${slug}`, {
  next: {
    revalidate: 3600,
    tags: [`post-${slug}`, "posts"], // ← add tags
  },
});

// ✅ Server Action called when editor publishes
export async function publishPost(slug: string) {
  "use server";
  await cms.publishPost(slug);
  revalidateTag(`post-${slug}`); // ← instant cache purge
}
```

### ❌ Pitfall: Using TanStack Query for data that never changes on the client

```tsx
// ❌ Fetching static product categories with TanStack Query
// Categories don't change — no need for client-side fetching
"use client";
export function CategoryList() {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });
  return (
    <ul>
      {data?.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
  // Ships TanStack Query JS + requires API route for data that never changes
}
```

**Fix:** Static/rarely-changing data belongs in a Server Component:

```tsx
// ✅ Server Component — no TanStack Query needed
export async function CategoryList() {
  const categories = await db.category.findMany();
  return (
    <ul>
      {categories.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/dashboard/customers` page demonstrating all four data patterns:

1. **Server fetch with `Promise.all`** — fetch customer list and summary stats in parallel
2. **`React.cache()` deduplication** — `getCustomerCount()` called in two places, hits DB once
3. **Server Action with `revalidateTag`** — archive a customer
4. **Client-side TanStack Query** — live activity ticker that polls every 10 seconds

### Solution

```tsx
// src/lib/customer-queries.ts
import { cache } from "react";

// Deduplicated — called in both CustomerSummary and CustomersPage
// Only hits the DB once per request
export const getCustomerCount = cache(async () => {
  // In production: await db.customer.count()
  return 248;
});

export async function getCustomers() {
  // In production: await db.customer.findMany(...)
  return [
    {
      id: "c1",
      name: "Alice Johnson",
      email: "alice@acme.com",
      plan: "pro",
      status: "active",
    },
    {
      id: "c2",
      name: "Bob Kim",
      email: "bob@beta.co",
      plan: "free",
      status: "active",
    },
    {
      id: "c3",
      name: "Carol Davis",
      email: "carol@cd.io",
      plan: "pro",
      status: "active",
    },
    {
      id: "c4",
      name: "David Park",
      email: "david@dp.dev",
      plan: "free",
      status: "inactive",
    },
  ];
}

export async function getCustomerStats() {
  const count = await getCustomerCount(); // ← cache() call #1
  return {
    total: count,
    pro: count > 0 ? Math.floor(count * 0.6) : 0,
    free: count > 0 ? Math.ceil(count * 0.4) : 0,
    newMonth: 12,
  };
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/actions.ts
"use server";

import { revalidateTag } from "next/cache";

export async function archiveCustomer(customerId: string): Promise<void> {
  // In production: await db.customer.update({ where: { id: customerId }, data: { status: 'archived' } })
  console.log("Archived customer:", customerId);

  // Invalidate all customer-related caches instantly
  revalidateTag("customers");
  revalidateTag(`customer-${customerId}`);
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/customer-summary.tsx
// Server Component — uses getCustomerCount (will be a cache hit)
import { getCustomerStats } from "@/lib/customer-queries";

export async function CustomerSummary() {
  const stats = await getCustomerStats(); // calls getCustomerCount() → cache hit #1

  const ITEMS = [
    { label: "Total", value: stats.total, color: "text-gray-900" },
    { label: "Pro", value: stats.pro, color: "text-blue-600" },
    { label: "Free", value: stats.free, color: "text-gray-600" },
    { label: "New (mo.)", value: stats.newMonth, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/customer-table.tsx
// Server Component — static table, archive button is Client Component
import { ArchiveButton } from "./archive-button";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
}

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const PLAN_STYLE: Record<string, string> = {
    pro: "bg-blue-100 text-blue-700",
    free: "bg-gray-100 text-gray-600",
  };
  const STATUS_STYLE: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {["Name", "Email", "Plan", "Status", ""].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold
                                     text-gray-500 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
              <td className="px-4 py-3 text-gray-500">{c.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium
                                  ${PLAN_STYLE[c.plan]}`}
                >
                  {c.plan}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium
                                  ${STATUS_STYLE[c.status]}`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {/* Tiny Client Component — only the button is interactive */}
                <ArchiveButton customerId={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/archive-button.tsx
"use client";

import { useTransition } from "react";
import { archiveCustomer } from "../actions";

export function ArchiveButton({ customerId }: { customerId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => archiveCustomer(customerId))}
      disabled={isPending}
      className="px-3 py-1 text-xs font-medium text-gray-500 border
                 rounded-lg hover:bg-gray-100 disabled:opacity-40
                 transition-colors"
    >
      {isPending ? "..." : "Archive"}
    </button>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/live-activity.tsx
// Client Component — polls for live activity every 10 seconds
"use client";

import { useQuery } from "@tanstack/react-query";

interface ActivityItem {
  id: number;
  event: string;
  time: string;
  type: "signup" | "upgrade" | "cancel" | "login";
}

async function fetchActivity(): Promise<ActivityItem[]> {
  // In production: fetch('/api/customers/activity')
  // Simulated response
  return [
    {
      id: Date.now(),
      event: "Alice viewed pricing page",
      time: "just now",
      type: "login",
    },
    {
      id: Date.now() - 1,
      event: "Bob upgraded to Pro",
      time: "1m ago",
      type: "upgrade",
    },
    {
      id: Date.now() - 2,
      event: "Carol signed up",
      time: "3m ago",
      type: "signup",
    },
    {
      id: Date.now() - 3,
      event: "David cancelled subscription",
      time: "7m ago",
      type: "cancel",
    },
  ];
}

const TYPE_ICON: Record<ActivityItem["type"], string> = {
  signup: "👤",
  upgrade: "⭐",
  cancel: "❌",
  login: "🔑",
};

export function LiveActivity() {
  const { data, isLoading, dataUpdatedAt } = useQuery<ActivityItem[]>({
    queryKey: ["customer-activity"],
    queryFn: fetchActivity,
    refetchInterval: 10_000, // ← poll every 10 seconds
    staleTime: 5_000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900 text-sm">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">
            {lastUpdated ? `Updated ${lastUpdated}` : "Live"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-3 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {data?.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-base shrink-0" aria-hidden="true">
                {TYPE_ICON[item.type]}
              </span>
              <p className="text-sm text-gray-700 flex-1 truncate">
                {item.event}
              </p>
              <span className="text-xs text-gray-400 shrink-0">
                {item.time}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/page.tsx
// Server Component — orchestrates all patterns
import type { Metadata } from "next";
import { Suspense } from "next";
import { getCustomers, getCustomerCount } from "@/lib/customer-queries";
import { CustomerSummary } from "./_components/customer-summary";
import { CustomerTable } from "./_components/customer-table";
import { LiveActivity } from "./_components/live-activity";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  // Pattern 2: Promise.all — customers + count in parallel
  const [customers, count] = await Promise.all([
    getCustomers(),
    getCustomerCount(), // ← cache() call #2 — same request as CustomerSummary's call
    //   React.cache() deduplicates → only ONE DB query total
  ]);

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count} total</p>
        </div>
      </div>

      {/* Pattern 1: Parallel fetch via Promise.all (stats + customers fetched together) */}
      {/* CustomerSummary also calls getCustomerCount() → React.cache() deduplicates */}
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <CustomerSummary />
      </Suspense>

      <div className="grid grid-cols-3 gap-6">
        {/* Pattern 1 result: server-fetched table (2/3 width) */}
        <div className="col-span-2">
          <CustomerTable customers={customers} />
        </div>

        {/* Pattern 4: Client-side TanStack Query for live activity (1/3 width) */}
        <LiveActivity />
      </div>
    </div>
  );
}

/*
  Data fetching breakdown for this page:
  ─────────────────────────────────────────────────────
  getCustomers()        → Server, parallel via Promise.all (~200ms)
  getCustomerCount()    → Server, parallel via Promise.all → React.cache()
  CustomerSummary       → calls getCustomerStats() → calls getCustomerCount()
                          getCustomerCount() = cache HIT → 0 extra DB queries
  LiveActivity          → Client, TanStack Query, polls every 10s
  archiveCustomer()     → Server Action → revalidateTag('customers')
  ─────────────────────────────────────────────────────
  Total DB queries for initial page render: 2 (customers + count — NOT 3)
  React.cache() saved 1 duplicate query ✅
*/
```

---

---

# 9 — Rendering Strategies — Static, Dynamic, Streaming

---

## T — TL;DR

Next.js 16 has three rendering strategies: **Static** (HTML generated at build time — fastest), **Dynamic** (HTML generated per request — always fresh), and **Streaming** (HTML sent progressively as data resolves — best of both). Every route falls into one or a combination of these, and you control which with specific APIs.

---

## K — Key Concepts

### The Three Strategies

```
Strategy        When HTML is generated       Use for
────────────    ──────────────────────────   ────────────────────────────────
Static (SSG)    At build time (next build)   Blog posts, marketing pages, docs
Dynamic (SSR)   Per request                  Dashboards, user-specific pages
Streaming       Per request, progressively   Mixed: fast shell + slow data
                (as Suspense resolves)

Next.js 16 default:
  → A route is Static unless it opts into Dynamic (by using dynamic APIs)
  → Adding Suspense to an async component enables Streaming automatically
```

### What Makes a Route Dynamic

```tsx
// A route becomes DYNAMIC when it uses any of these:

// 1. cookies()
import { cookies } from "next/headers";
const theme = (await cookies()).get("theme"); // ← forces dynamic

// 2. headers()
import { headers } from "next/headers";
const ua = (await headers()).get("user-agent"); // ← forces dynamic

// 3. searchParams prop
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>; // ← forces dynamic
}) {}

// 4. Dynamic route segment with no generateStaticParams
// /products/[id]/page.tsx with no generateStaticParams ← dynamic by default

// 5. cache: 'no-store' fetch
fetch(url, { cache: "no-store" }); // ← forces dynamic

// 6. export const dynamic = 'force-dynamic'
export const dynamic = "force-dynamic"; // ← explicit opt-in
```

### Route Segment Config — Explicit Control

```tsx
// src/app/products/page.tsx

// ─── Option 1: Force static (build-time generation)
export const dynamic = "force-static";
// Ignores dynamic APIs — page is always static
// searchParams, cookies() return empty/undefined values

// ─── Option 2: Force dynamic (per-request rendering)
export const dynamic = "force-dynamic";
// Never cached — fresh HTML on every request
// Equivalent to getServerSideProps in Pages Router

// ─── Option 3: ISR — static with time-based revalidation
export const revalidate = 3600; // regenerate every 1 hour
// First request after expiry: serves stale HTML, regenerates in background

// ─── Option 4: ISR with no expiry — only on-demand revalidation
export const revalidate = false; // (default) never auto-revalidate
// Only revalidates when revalidatePath() or revalidateTag() is called
```

### Strategy Decision Tree

```
Is the page the SAME for every user?
├── YES
│   └── Does it need to be 100% fresh on every request?
│       ├── YES → Dynamic (export const dynamic = 'force-dynamic')
│       │         Example: real-time dashboard, live pricing
│       └── NO  → Does it change occasionally?
│                 ├── YES → ISR (export const revalidate = N)
│                 │         Example: blog posts, product pages
│                 └── NO  → Static (default, or generateStaticParams)
│                           Example: marketing pages, docs
└── NO (user-specific content)
    └── Is some content slow to load?
        ├── YES → Dynamic + Streaming (Suspense boundaries)
        │         Example: dashboard with slow analytics
        └── NO  → Dynamic (cookies/session based)
                  Example: user profile, settings page
```

### Static Generation with `generateStaticParams`

```tsx
// src/app/blog/[slug]/page.tsx
// Pre-build ALL blog post pages at build time

export async function generateStaticParams() {
  const posts = await cms.getPosts(); // fetch all post slugs at build time
  return posts.map((post) => ({ slug: post.slug }));
}

export const revalidate = 3600; // regenerate stale after 1 hour

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await cms.getPost(slug); // this runs at BUILD TIME for known slugs
  if (!post) notFound();
  return <Article post={post} />;
}

// Result:
// /blog/hello-world    → pre-built at next build ✅
// /blog/new-post       → if dynamicParams=true (default): builds on first visit
// /blog/new-post       → if dynamicParams=false: 404
```

### The Partial Pre-rendering Mental Model (PPR)

```tsx
// PPR: Static shell + Dynamic/Streaming holes
// The page's static parts are pre-rendered at build time
// Dynamic sections (wrapped in Suspense) are filled in per-request

// Enable PPR (experimental in Next.js 16)
// next.config.ts:
// experimental: { ppr: true }

// src/app/products/[id]/page.tsx
import { Suspense } from "react";

// Static shell — built at build time
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      {/* Static header — pre-rendered */}
      <ProductHeader productId={id} />

      {/* Dynamic inventory — per-request stream */}
      <Suspense fallback={<InventorySkeleton />}>
        <LiveInventory productId={id} /> {/* cache: 'no-store' inside */}
      </Suspense>

      {/* Static related products — pre-rendered */}
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts productId={id} /> {/* cached */}
      </Suspense>
    </div>
  );
}
```

### Rendering Per-Route Strategy Summary

```
Route type              Recommended strategy      Config
─────────────────────   ──────────────────────    ─────────────────────────────
Marketing homepage      Static                    default (no config needed)
Blog post               ISR                       revalidate = 3600
Product detail          ISR + streaming           revalidate = 1800 + Suspense
User dashboard          Dynamic + streaming       cookies() makes it dynamic
User profile            Dynamic                   cookies() + no Suspense needed
Live prices             Dynamic (no cache)        cache: 'no-store'
Docs page               Static                    generateStaticParams
Admin panel             Dynamic                   force-dynamic or cookies()
Search results          Dynamic                   searchParams makes it dynamic
404 page                Static                    not-found.tsx is always static
```

### Verifying Your Rendering Strategy

```bash
# next build output shows which routes are static (○) vs dynamic (ƒ):

Route (app)                              Size     First Load JS
┌ ○ /                                    1.2 kB         87.4 kB
├ ○ /about                               890 B          87.1 kB
├ ○ /blog                                2.1 kB         88.3 kB
├ ● /blog/[slug]                         1.8 kB         88.0 kB   ← ISR
├ ƒ /dashboard                           3.4 kB         89.6 kB   ← Dynamic
├ ƒ /dashboard/orders/[id]               2.2 kB         88.4 kB   ← Dynamic
└ ○ /pricing                             1.5 kB         87.7 kB

○  (Static)   — prerendered as static HTML
●  (ISR)      — prerendered with revalidate config
ƒ  (Dynamic)  — rendered on demand (server-side)
```

---

## W — Why It Matters

- Choosing the right strategy for each route is a performance multiplier — a static blog post page serves in 5ms from a CDN edge; the same page rendered dynamically on every request takes 200–400ms.
- The default-to-static behavior in Next.js 16 is a safety net — you get CDN-speed performance unless you opt into dynamic rendering, usually by using `cookies()` or `searchParams`.
- ISR (Incremental Static Regeneration) with `revalidate` is the "best of both" for most content: pre-built performance with automatic freshness. Content-heavy sites (e-commerce, blogs) see 90%+ cache hit rates.
- Understanding the build output (○ vs ƒ) lets you verify your rendering strategy — a route you expected to be static appearing as dynamic (ƒ) tells you something in the route is triggering dynamic rendering unexpectedly.

---

## I — Interview Q&A

### Q1: What is the difference between Static, ISR, and Dynamic rendering in Next.js?

**A:** Static means the HTML is generated once at build time and served from a CDN — the fastest possible delivery but requires a new build to reflect content changes. ISR (Incremental Static Regeneration) pre-builds pages but automatically regenerates them in the background after a `revalidate` period — stale content is served instantly while a fresh version is generated. Dynamic renders the page on the server for each incoming request — always fresh but slower (database query on every page load). The App Router defaults to static and opts into dynamic when you use request-specific APIs like `cookies()`, `headers()`, or `searchParams`.

### Q2: How do `cookies()` and `searchParams` affect the rendering strategy?

**A:** Both force a route into dynamic rendering. `cookies()` and `headers()` are per-request — they read the incoming HTTP request, which means the page cannot be pre-rendered because it depends on data that doesn't exist at build time. `searchParams` (accessed as a prop) contains the URL query string which varies per request. When Next.js detects these in a route, it automatically opts the page out of static generation and into server-side rendering per request. This is why auth-protected pages are automatically dynamic — they read the session cookie.

### Q3: What is Streaming and how does it differ from static and dynamic rendering?

**A:** Static and dynamic rendering produce a complete HTML response — the user waits until the entire page is ready. Streaming sends HTML in chunks as each part resolves. When a page uses `<Suspense>` to wrap async components, Next.js immediately sends the page shell and any statically-available content, then streams the deferred sections as their data resolves. This means users see the page structure almost instantly (same as static) while dynamic content fills in progressively. Streaming is dynamic rendering with progressive delivery — it combines the UX of static (instant shell) with the freshness of dynamic (per-request data).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Accidentally making a static route dynamic with `cookies()` in a layout

```tsx
// src/app/layout.tsx — root layout
import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const theme = (await cookies()).get("theme")?.value ?? "light";
  // ❌ This forces EVERY route in the app to be dynamic
  // A blog post page is now server-rendered per request instead of static
  return <html data-theme={theme}>{/* ... */}</html>;
}
```

**Fix:** Read the cookie client-side for UI preferences, or use a client provider:

```tsx
// ✅ Option A: Read theme client-side in a Client Component
// ThemeProvider.tsx ('use client') reads localStorage/cookies on mount

// ✅ Option B: Keep layout static, apply theme via CSS class on <html>
// Use middleware to set a cookie and a class on the response
// Or use CSS custom properties that JavaScript sets on load
export default function RootLayout({ children }) {
  // No cookies() here — layout stays static
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {" "}
          {/* Client Component handles theme */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### ❌ Pitfall: Using `force-dynamic` on routes that could use ISR

```tsx
// ❌ Blog post with force-dynamic — re-renders on every request
// 10,000 visitors/hour = 10,000 database queries
export const dynamic = "force-dynamic";

export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  // Post content changes once a day at most — dynamic is overkill
}
```

**Fix:** Use ISR — pre-built + automatically refreshed:

```tsx
// ✅ ISR — pre-built at build, regenerated every hour
export const revalidate = 3600;

export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  // Serves pre-built HTML at CDN speed
  // Regenerates in background when stale — database queries only on refresh
}
```

### ❌ Pitfall: Not using Suspense in dynamic routes with mixed-speed data

```tsx
// ❌ Dynamic route — page waits for ALL data (slowest wins)
export default async function DashboardPage() {
  const [fast, slow] = await Promise.all([
    getFastStats(), // 100ms
    getSlowAnalytics(), // 1800ms  ← entire page blocked until 1800ms
  ]);
  return (
    <div>
      <FastStats data={fast} />
      <SlowAnalytics data={slow} />
    </div>
  );
}
```

**Fix:** Use Suspense for the slow section — fast content streams immediately:

```tsx
// ✅ Fast section streams at ~100ms, slow at ~1800ms
export default async function DashboardPage() {
  const fast = await getFastStats(); // awaited in page (fast — 100ms)

  return (
    <div>
      <FastStats data={fast} /> {/* visible at ~100ms */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <SlowAnalytics /> {/* streams at ~1800ms independently */}
      </Suspense>
    </div>
  );
}

// SlowAnalytics fetches its own data
async function SlowAnalytics() {
  const data = await getSlowAnalytics(); // 1800ms — runs independently
  return <AnalyticsChart data={data} />;
}
```

### ❌ Pitfall: Misunderstanding the build output — shipping dynamic routes that should be static

```tsx
// Developer runs next build and sees:
// ƒ /blog/[slug]   ← Dynamic
// But blog posts never change without a new CMS publish

// Investigation finds:
export default async function BlogPost({ params, searchParams }) {
  //                                              ^^^^^^^^^^
  // searchParams accessed as prop — forces dynamic!
  // But searchParams isn't even used in the component
  const post = await cms.getPost(params.slug);
  return <Article post={post} />;
}
```

**Fix:** Remove unused `searchParams` from the destructuring:

```tsx
// ✅ Without searchParams — route becomes static (ISR)
export const revalidate = 3600;
export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  return <Article post={post} />;
}
// Build output:
// ● /blog/[slug]   ← ISR ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/blog/[slug]` route that demonstrates all three strategies in one codebase:

1. The **post content** uses ISR (`revalidate = 3600`) — pre-built, refreshes hourly
2. The **comment count** uses dynamic streaming (`cache: 'no-store'`) — always live
3. The **related posts** uses static data — pre-built at build time
4. `generateStaticParams` pre-builds 3 known posts
5. `dynamicParams = true` allows new posts to render on first visit
6. Show the rendering strategy for each section in comments

### Solution

```tsx
// src/app/blog/[slug]/_components/comment-count.tsx
// Dynamic section — always fresh, streamed progressively

async function getLiveCommentCount(slug: string): Promise<number> {
  // cache: 'no-store' makes this section always dynamic
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/comments/${slug}/count`,
    { cache: "no-store" } // ← forces dynamic rendering for this section
  ).catch(() => null);

  if (!res?.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function CommentCount({ slug }: { slug: string }) {
  const count = await getLiveCommentCount(slug);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <span>💬</span>
      <span>
        {count} comment{count !== 1 ? "s" : ""}
      </span>
      <span className="text-xs text-gray-400">(live)</span>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/_components/related-posts.tsx
// Static section — data fetched at build time via the page's ISR

interface Post {
  slug: string;
  title: string;
  date: string;
}

export function RelatedPosts({ posts }: { posts: Post[] }) {
  // No async — data passed from parent (fetched at ISR time)
  // This component adds zero dynamic overhead ✅
  return (
    <div className="border-t pt-8 mt-8">
      <h3 className="font-semibold text-gray-900 mb-4">Related Posts</h3>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}`}
              className="flex items-start gap-2 group"
            >
              <span className="text-gray-400 group-hover:text-blue-500 mt-0.5">
                →
              </span>
              <div>
                <p
                  className="text-sm font-medium text-gray-800
                               group-hover:text-blue-600 transition-colors"
                >
                  {post.title}
                </p>
                <p className="text-xs text-gray-400">{post.date}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CommentCount } from "./_components/comment-count";
import { RelatedPosts } from "./_components/related-posts";

// ─── Strategy: ISR — pre-built at next build, regenerates every hour ──────────
export const revalidate = 3600; // ← ISR: stale after 1 hour
export const dynamicParams = true; // ← unknown slugs render on first visit, then cached

type Params = Promise<{ slug: string }>;

// Mock CMS data
const ALL_POSTS: Record<
  string,
  {
    title: string;
    date: string;
    excerpt: string;
    content: string;
    author: string;
    related: { slug: string; title: string; date: string }[];
  }
> = {
  "nextjs-16-guide": {
    title: "The Complete Next.js 16 Guide",
    date: "May 15, 2026",
    excerpt: "Everything you need to know about Next.js 16.",
    content:
      "Next.js 16 brings significant improvements to the App Router, including better streaming support, improved caching APIs, and enhanced Server Actions...",
    author: "Mark Austin",
    related: [
      {
        slug: "server-components-deep-dive",
        title: "Server Components Deep Dive",
        date: "May 10, 2026",
      },
      {
        slug: "react-19-features",
        title: "React 19 New Features",
        date: "May 5, 2026",
      },
    ],
  },
  "server-components-deep-dive": {
    title: "Server Components Deep Dive",
    date: "May 10, 2026",
    excerpt: "Understanding React Server Components from first principles.",
    content:
      "React Server Components represent a fundamental shift in how we think about rendering. They run exclusively on the server...",
    author: "Mark Austin",
    related: [
      {
        slug: "nextjs-16-guide",
        title: "The Complete Next.js 16 Guide",
        date: "May 15, 2026",
      },
      {
        slug: "react-19-features",
        title: "React 19 New Features",
        date: "May 5, 2026",
      },
    ],
  },
  "react-19-features": {
    title: "React 19 New Features",
    date: "May 5, 2026",
    excerpt: "A practical look at every major feature in React 19.",
    content:
      "React 19 introduces useActionState, improved Suspense, asset loading, and more. This guide covers every new feature with practical examples...",
    author: "Mark Austin",
    related: [
      {
        slug: "nextjs-16-guide",
        title: "The Complete Next.js 16 Guide",
        date: "May 15, 2026",
      },
      {
        slug: "server-components-deep-dive",
        title: "Server Components Deep Dive",
        date: "May 10, 2026",
      },
    ],
  },
};

// ─── Pre-build known slugs at next build ──────────────────────────────────────
export async function generateStaticParams() {
  // In production: const posts = await cms.getPosts(); return posts.map(p => ({ slug: p.slug }))
  return Object.keys(ALL_POSTS).map((slug) => ({ slug }));
  // Generates: /blog/nextjs-16-guide, /blog/server-components-deep-dive, /blog/react-19-features
}

// ─── Dynamic metadata — also benefits from ISR ────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = ALL_POSTS[slug];
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
    },
  };
}

// ─── Page component ───────────────────────────────────────────────────────────
export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = ALL_POSTS[slug];

  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      {/* ── Static section: pre-built at ISR time ── */}
      <header className="mb-8">
        <p className="text-sm text-blue-600 font-medium mb-2">Blog</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{post.author}</span>
          <span>·</span>
          <time>{post.date}</time>
          <span>·</span>
          {/* ── Dynamic section: live comment count, streams in ── */}
          {/*    Suspense shows "... comments" until CommentCount resolves */}
          <Suspense
            fallback={
              <span className="text-gray-400 text-sm">Loading comments...</span>
            }
          >
            {/* CommentCount uses cache: 'no-store' → always fresh */}
            {/* It STREAMS in independently — doesn't block the article text */}
            <CommentCount slug={slug} />
          </Suspense>
        </div>
      </header>

      {/* ── Static section: pre-built at ISR time ── */}
      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 mb-6 font-medium leading-relaxed">
          {post.excerpt}
        </p>
        <p className="text-gray-700 leading-relaxed">{post.content}</p>
      </div>

      {/* ── Static section: related posts passed from ISR-cached data ── */}
      {/* RelatedPosts receives data fetched at ISR time — zero dynamic overhead */}
      <RelatedPosts posts={post.related} />
    </article>
  );
}

/*
  Rendering strategy breakdown:
  ──────────────────────────────────────────────────────────────────────
  Route:           ISR (revalidate = 3600)
  Article content: Static/ISR — served from CDN in ~5ms
  Comment count:   Dynamic streaming — live, streams in after article
  Related posts:   Static — data from ISR fetch, zero dynamic overhead

  Timeline for a returning visitor (cache warm):
    t=0ms    → CDN serves pre-built HTML (article + related posts visible)
    t=0ms    → CommentCount Suspense fallback shows ("Loading comments...")
    t=~80ms  → CommentCount resolves (live fetch completes), streams in

  Timeline for first visitor after cache expiry:
    t=0ms    → Previous stale HTML served instantly (while regenerating)
    t=~500ms → New HTML built in background (next visitor gets fresh version)
    t=~80ms  → CommentCount always fresh regardless of ISR state

  generateStaticParams pre-built: 3 routes ✅
  dynamicParams = true: new posts work on first visit, then cached ✅
  ──────────────────────────────────────────────────────────────────────
*/
```

---

---

# 10 — Performance Patterns — Bundle Size, Hydration, and Optimization

---

## T — TL;DR

Performance in Next.js 16 comes down to three levers: **minimize JavaScript** (keep Server Components, lazy-load Client Components), **optimize hydration** (defer non-critical interactivity), and **cache aggressively** (static routes, ISR, `React.cache()`). This subtopic gives you concrete, measurable techniques for each lever.

---

## K — Key Concepts

### Lever 1 — Minimize JavaScript Bundle Size

```
The goal: ship the minimum JS required for interactivity.
Server Components contribute ZERO bytes to the bundle.
Every 'use client' file adds to the bundle.

Audit your bundle:
  npx @next/bundle-analyzer

Common bundle bloat causes:
  → 'use client' on large parent components
  → importing heavy libraries in Client Components
  → not using dynamic() for large optional features
  → importing entire icon libraries (import * as Icons from 'lucide-react')
```

```tsx
// ─── Before: heavy icon import
import {
  Home,
  User,
  Settings,
  Bell,
  Search,
  X,
  Check,
  ArrowRight,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Trash,
  Filter,
} from "lucide-react";
// Imports 14 icons — tree shaking helps but named imports are better

// ─── After: import only what you use (same, but be deliberate)
import { Home } from "lucide-react";
import { User } from "lucide-react";
// Each is a separate chunk if using dynamic import for large sets
```

```tsx
// ─── Before: entire date library for one format function
"use client";
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";
// Bundles everything

// ─── After: import only used functions (date-fns supports this)
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
```

### Lever 2 — Optimize Hydration

```tsx
// Hydration = React "attaching" to server-rendered HTML in the browser
// Problems:
//   → Too much JS → slow hydration → page is visible but not interactive
//   → Hydration mismatch → console errors + re-renders

// ─── Strategy 1: Defer non-critical Client Components
import dynamic from "next/dynamic";

// Load intercom/support widget only after page is interactive
const SupportWidget = dynamic(() => import("@/components/support-widget"), {
  ssr: false, // not needed for SSR
  loading: () => null,
});

// Load analytics after a delay
const Analytics = dynamic(() => import("@/components/analytics"), {
  ssr: false,
});

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {/* Non-critical widgets load after main content */}
        <SupportWidget />
        <Analytics />
      </body>
    </html>
  );
}
```

```tsx
// ─── Strategy 2: Avoid hydration mismatches
// Mismatch happens when server HTML ≠ client render
// Common cause: using browser-only values in render

// ❌ Hydration mismatch: new Date() differs between server and client
"use client";
export function Timestamp() {
  return <p>Generated at: {new Date().toLocaleTimeString()}</p>;
  // Server: "10:32:15" → Client: "10:32:16" → MISMATCH
}

// ✅ Fix: use useEffect to set browser-only values
("use client");
import { useState, useEffect } from "react";

export function Timestamp() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString()); // only runs in browser
  }, []);

  return <p>Generated at: {time ?? "..."}</p>;
  // Server: "..." → Client: "..." → no mismatch ✅
  // useEffect runs after hydration → sets real time
}
```

```tsx
// ─── Strategy 3: suppressHydrationWarning for intentional mismatches
// For <html> elements that have browser extensions injecting attributes

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning tells React to ignore attribute mismatches
          caused by browser extensions (password managers, dark mode extensions) */}
      <body>{children}</body>
    </html>
  );
}
```

### Lever 3 — Cache Aggressively

```tsx
// ─── Level 1: React.cache() — per-request deduplication
import { cache } from "react";
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// ─── Level 2: fetch() cache options — HTTP-level caching
// Static: cached indefinitely (default for fetch in Server Components)
const data = await fetch(url);

// ISR: cached, revalidated after N seconds
const data = await fetch(url, { next: { revalidate: 3600 } });

// Tagged: cached, revalidated on demand
const data = await fetch(url, { next: { tags: ["products"] } });

// No cache: always fresh
const data = await fetch(url, { cache: "no-store" });

// ─── Level 3: Full Route caching
// Static routes are cached at the CDN edge — serves in ~5ms globally
// See Subtopic 9 for rendering strategy config
```

### Lever 4 — Image Optimization

```tsx
// next/image handles:
// → WebP/AVIF conversion (30-50% smaller than JPEG)
// → Responsive srcset generation
// → Lazy loading (loading="lazy" by default)
// → Layout shift prevention (reserves space via width/height)
// → Blur placeholder while loading

import Image from "next/image";

// ─── Remote images
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800} // required for remote images
      height={600} // required for remote images
      className="rounded-xl object-cover"
      placeholder="blur" // requires blurDataURL or local image
      blurDataURL="data:image/jpeg;base64,/9j/4AAQ..." // tiny base64 placeholder
    />
  );
}

// ─── Above-the-fold hero image — disable lazy loading
export function HeroImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // ← disables lazy loading, adds <link rel="preload">
      // Use for LCP (Largest Contentful Paint) image only
    />
  );
}

// ─── Fill parent container
export function CoverImage({ src }: { src: string }) {
  return (
    <div className="relative aspect-video">
      <Image
        src={src}
        alt=""
        fill // fills parent
        sizes="(max-width: 768px) 100vw, 50vw" // responsive sizes
        className="object-cover"
      />
    </div>
  );
}
```

### Lever 5 — Font Optimization

```tsx
// src/app/layout.tsx
// next/font: zero layout shift, zero external network requests

import { Inter, Geist_Mono } from "next/font/google";

// ─── Variable font (one file covers all weights)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // CSS custom property
  display: "swap", // fallback font while loading
});

// ─── Monospace for code blocks
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

// tailwind.config.ts — use the CSS variable
// fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] }
```

### Lever 6 — Core Web Vitals Checklist

```
LCP (Largest Contentful Paint) — target: < 2.5s
  ✅ Add priority to above-the-fold <Image>
  ✅ Use ISR/Static for content pages — CDN delivery
  ✅ Preload critical fonts with next/font
  ✅ Use Suspense to stream page shell quickly

FID/INP (Interaction to Next Paint) — target: < 200ms
  ✅ Minimize Client Component JS bundle size
  ✅ Use next/dynamic for heavy components
  ✅ Defer non-critical scripts (analytics, support widgets)
  ✅ Use useTransition for non-urgent state updates

CLS (Cumulative Layout Shift) — target: < 0.1
  ✅ Always specify width + height on <Image> (or use fill)
  ✅ Use font-display: swap with next/font
  ✅ Use Suspense skeleton matching content dimensions (Day 5)
  ✅ Avoid inserting content above existing content dynamically

TTFB (Time to First Byte) — target: < 800ms
  ✅ Static/ISR routes: ~5ms from CDN
  ✅ Dynamic routes: ensure DB queries are fast and parallel
  ✅ Use React.cache() to prevent duplicate queries
  ✅ Use streaming to start sending HTML before all data is ready
```

### Measuring Performance in Next.js

```tsx
// src/app/layout.tsx — report Web Vitals to analytics
// next.js built-in: reportWebVitals is available via instrumentation

// src/instrumentation.ts (or instrumentation.js)
export function register() {
  if (typeof window !== "undefined") {
    // Client-side performance observer
    import("web-vitals").then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS((metric) => sendToAnalytics(metric));
      onFID((metric) => sendToAnalytics(metric));
      onFCP((metric) => sendToAnalytics(metric));
      onLCP((metric) => sendToAnalytics(metric));
      onTTFB((metric) => sendToAnalytics(metric));
    });
  }
}

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Send to your analytics service
  console.log(metric.name, metric.value.toFixed(2));
}
```

---

## W — Why It Matters

- JavaScript bundle size is the single biggest performance lever for most Next.js apps — every KB of unnecessary JS delays Time to Interactive (TTI) and blocks the main thread from responding to user input.
- Hydration mismatches cause visible UI flickers and React warnings in production — they happen when server-rendered HTML doesn't match what React tries to render in the browser, forcing React to throw away the server HTML and re-render from scratch.
- `priority` on the LCP image is a one-line change that can move LCP from 3s to 1.5s — it adds a `<link rel="preload">` to the HTML so the browser fetches the image before parsing JavaScript.
- Understanding the build output (○ vs ƒ) and using bundle analyzer are the two tools that reveal real-world performance issues — code review alone won't show you that a small `'use client'` addition tripled a route's bundle size.

---

## I — Interview Q&A

### Q1: How do Server Components reduce bundle size compared to a traditional React SPA?

**A:** In a traditional SPA, every component's JavaScript is bundled and sent to the browser — even components that only render static HTML from props. Server Components run exclusively on the server and produce HTML directly — their code is never included in the JavaScript bundle. In a typical Next.js dashboard, 70–80% of components might be Server Components (layouts, data tables, stat cards, content areas). None of their code ships to the browser. Only the interactive parts — search inputs, modals, dropdowns — need to be Client Components and appear in the bundle. This can reduce the initial JS bundle by 60%+ compared to an equivalent SPA.

### Q2: What causes a hydration mismatch and how do you fix it?

**A:** A hydration mismatch occurs when the HTML rendered on the server doesn't match what React renders in the browser during hydration. Common causes: using `new Date()`, `Math.random()`, or `window` values directly in render (values differ between server and browser runtime); browser extensions injecting attributes into the DOM; third-party libraries that modify the DOM before hydration. Fix: use `useEffect` to set browser-only values after mount (the component renders with a safe server-compatible initial state, then updates client-side in `useEffect`). For `<html>` attribute mismatches from extensions, add `suppressHydrationWarning` to the `<html>` element.

### Q3: What is the `priority` prop in `next/image` and when should you use it?

**A:** `priority` disables lazy loading for an image and adds a `<link rel="preload">` to the page's `<head>`, telling the browser to fetch the image as early as possible — before JavaScript is even parsed. Use it exclusively for the LCP (Largest Contentful Paint) element — typically the hero image or the main product image above the fold. Using `priority` on every image defeats its purpose (the browser's preload queue has limited capacity). Only one or two images per page should have `priority`. Without it, an above-the-fold image is lazy-loaded, causing a visible delay in the LCP metric.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing a heavy library directly in a Client Component

```tsx
// ❌ Chart.js bundled with EVERY page that imports this component
"use client";
import { Chart } from "chart.js"; // ~200kb
import { Doughnut } from "react-chartjs-2"; // depends on Chart.js

export function RevenueChart({ data }) {
  return <Doughnut data={data} />;
  // 200kb added to the initial bundle even for users who never see this page
}
```

**Fix:** Use `next/dynamic` to lazy-load the component:

```tsx
// page.tsx or parent
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("./_components/revenue-chart"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />,
});
// Chart.js is now a separate chunk — only downloaded when the component renders
```

### ❌ Pitfall: Missing `width` and `height` on `<Image>` causing CLS

```tsx
// ❌ No dimensions — browser doesn't know how much space to reserve
<Image src="/hero.jpg" alt="Hero" className="w-full" />
// Layout shifts as image loads → poor CLS score
```

**Fix:** Always provide dimensions or use `fill` with a sized parent:

```tsx
// ✅ Option A: explicit dimensions
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} className="w-full" />

// ✅ Option B: fill with aspect-ratio container
<div className="relative aspect-video">
  <Image src="/hero.jpg" alt="Hero" fill className="object-cover" />
</div>
```

### ❌ Pitfall: Using `priority` on every image

```tsx
// ❌ All images have priority — browser tries to preload all of them
// Defeats the purpose — preload queue is limited
{
  products.map((p) => (
    <Image
      key={p.id}
      src={p.image}
      alt={p.name}
      width={400}
      height={400}
      priority
    /> // ← ALL marked priority
  ));
}
```

**Fix:** Only the LCP element gets `priority`:

```tsx
// ✅ Only the first/hero image above the fold
{
  products.map((p, index) => (
    <Image
      key={p.id}
      src={p.image}
      alt={p.name}
      width={400}
      height={400}
      priority={index === 0} // ← only the first image ✅
    />
  ));
}
```

### ❌ Pitfall: Loading analytics and tracking scripts synchronously

```tsx
// ❌ Analytics script blocks page rendering
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script src="https://analytics.example.com/track.js" />
        {/* Blocks HTML parsing until script downloads */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Fix:** Use `next/script` with `strategy="afterInteractive"` or `"lazyOnload"`:

```tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://analytics.example.com/track.js"
          strategy="afterInteractive" // ← loads after page is interactive
          // strategy="lazyOnload"      // ← loads during browser idle time
        />
      </body>
    </html>
  );
}
```

### ❌ Pitfall: Not using `React.cache()` for shared data across components

```tsx
// ❌ getUser() called in layout AND page — 2 DB queries
// src/app/(dashboard)/layout.tsx
const user = await db.user.findUnique({ where: { id: userId } }); // DB query 1

// src/app/(dashboard)/dashboard/page.tsx
const user = await db.user.findUnique({ where: { id: userId } }); // DB query 2 — duplicate!
```

**Fix:**

```tsx
// src/lib/queries.ts
import { cache } from "react";
import { db } from "@/lib/db";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
  // Called in layout: DB query ✅
  // Called in page: cache hit ✅ — zero extra queries
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a fully optimized `/products` route that scores well on all Core Web Vitals:

1. **LCP** — hero banner image with `priority` + `next/image`
2. **Bundle size** — `ProductCard` is a Server Component, `QuickViewButton` is a tiny Client Component with `next/dynamic` lazy loading its modal
3. **CLS prevention** — skeleton dimensions match real content; image has explicit dimensions
4. **TTFB** — ISR with `revalidate = 1800`; `Promise.all` for parallel data fetching
5. **Font** — `next/font` for zero layout shift

### Solution

```tsx
// src/app/products/_components/quick-view-modal.tsx
"use client";
// This file is lazy-loaded — only downloaded when user clicks "Quick View"
interface Props {
  productName: string;
  price: number;
  onClose: () => void;
}

export default function QuickViewModal({ productName, price, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="aspect-square bg-gray-100 rounded-xl mb-4
                        flex items-center justify-center text-5xl"
        >
          🛍️
        </div>
        <h2 className="font-bold text-lg">{productName}</h2>
        <p className="text-blue-600 font-bold text-xl mt-1">${price}</p>
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Add to Cart
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border rounded-lg text-sm text-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/_components/quick-view-button.tsx
// Client Component — tiny (just the button + lazy modal)
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Modal JS only downloads when user clicks "Quick View"
const QuickViewModal = dynamic(() => import("./quick-view-modal"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  productName: string;
  price: number;
}

export function QuickViewButton({ productName, price }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 border border-gray-200 text-gray-600 text-xs
                   font-medium rounded-lg hover:border-gray-400
                   hover:bg-gray-50 transition-colors"
      >
        Quick View
      </button>
      {open && (
        <QuickViewModal
          productName={productName}
          price={price}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

```tsx
// src/app/products/_components/product-card.tsx
// ✅ Server Component — zero client JS
import Image from "next/image";
import { QuickViewButton } from "./quick-view-button";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <div
      className="border rounded-xl overflow-hidden bg-white
                    hover:shadow-md transition-shadow"
    >
      {/* ✅ CLS: explicit width/height prevents layout shift */}
      <div className="relative aspect-square">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw,
                 (max-width: 1024px) 50vw,
                 25vw"
          className="object-cover"
          priority={priority} // ← only true for first visible card (LCP)
        />
      </div>
      <div className="p-4">
        <p className="text-xs text-blue-600 font-medium mb-0.5">
          {product.category}
        </p>
        <h3 className="font-semibold text-gray-900 text-sm truncate">
          {product.name}
        </h3>
        <p className="text-lg font-bold text-gray-900 mt-1 mb-3">
          ${product.price}
        </p>
        {/* Tiny Client Component — only interactive part */}
        <QuickViewButton productName={product.name} price={product.price} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx
// ✅ ISR + parallel fetch + Server Components + optimized image
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { ProductCard } from "./_components/product-card";

// ─── ISR: pre-built, regenerates every 30 minutes ─────────────────────────────
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Products",
  description: "Browse our full collection of products.",
};

// ─── Parallel data fetching ────────────────────────────────────────────────────
async function getProducts() {
  // In production: await db.product.findMany({ where: { status: 'active' } })
  return [
    {
      id: "1",
      name: "Air Max 90",
      price: 120,
      category: "Shoes",
      imageUrl: "/products/air-max-90.jpg",
    },
    {
      id: "2",
      name: "Canvas Tote",
      price: 45,
      category: "Bags",
      imageUrl: "/products/canvas-tote.jpg",
    },
    {
      id: "3",
      name: "Wool Cap",
      price: 35,
      category: "Accessories",
      imageUrl: "/products/wool-cap.jpg",
    },
    {
      id: "4",
      name: "Ultraboost 22",
      price: 180,
      category: "Shoes",
      imageUrl: "/products/ultraboost-22.jpg",
    },
    {
      id: "5",
      name: "Leather Belt",
      price: 55,
      category: "Accessories",
      imageUrl: "/products/leather-belt.jpg",
    },
    {
      id: "6",
      name: "Leather Bag",
      price: 220,
      category: "Bags",
      imageUrl: "/products/leather-bag.jpg",
    },
    {
      id: "7",
      name: "Run Shield",
      price: 95,
      category: "Shoes",
      imageUrl: "/products/run-shield.jpg",
    },
    {
      id: "8",
      name: "Sport Cap",
      price: 28,
      category: "Accessories",
      imageUrl: "/products/sport-cap.jpg",
    },
  ];
}

async function getHeroBanner() {
  return {
    headline: "Summer Collection 2026",
    sub: "Up to 40% off selected items",
  };
}

export default async function ProductsPage() {
  // ─── Parallel: hero and products start simultaneously ──────────────────────
  const [products, hero] = await Promise.all([getProducts(), getHeroBanner()]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* ─── LCP element: hero banner image with priority ──────────────────── */}
      {/* priority adds <link rel="preload"> → faster LCP                       */}
      {/* ✅ CLS: explicit width/height reserved before image loads              */}
      <div className="relative rounded-2xl overflow-hidden mb-10">
        <Image
          src="/hero-banner.jpg"
          alt={hero.headline}
          width={1200}
          height={400}
          priority // ← LCP image: disable lazy loading ✅
          className="w-full object-cover rounded-2xl"
        />
        {/* Text overlay — part of static HTML, no layout shift */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent
                        flex flex-col justify-center px-10"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            {hero.headline}
          </h2>
          <p className="text-white/80">{hero.sub}</p>
        </div>
      </div>

      {/* ─── Page header ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Products</h1>

      {/* ─── Product grid ──────────────────────────────────────────────────── */}
      {/* ✅ CLS: skeleton matches card dimensions (aspect-square + p-4 content) */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="border rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-200" />{" "}
                {/* matches Image */}
                <div className="p-4">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1.5" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                  <div className="h-6 w-1/3 bg-gray-200 rounded mb-3" />
                  <div className="h-8 bg-gray-200 rounded-lg" />{" "}
                  {/* matches button */}
                </div>
              </div>
            ))}
          </div>
        }
      >
        {/* ✅ Server Components — zero JS shipped for ProductCard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 4} // ← first 4 cards: priority (above fold)
              // ← remaining: lazy loaded ✅
            />
          ))}
        </div>
      </Suspense>
    </div>
  );
}

/*
  Core Web Vitals optimization breakdown:
  ─────────────────────────────────────────────────────────────────────────────
  LCP   → hero image has priority → preloaded → sub-2s LCP ✅
  CLS   → Image fill with aspect-square container → no shift ✅
          skeleton matches card dimensions exactly → no shift on load ✅
          next/font (in layout) → no font swap shift ✅
  INP   → ProductCard is Server Component → zero hydration cost ✅
          QuickViewModal is lazy (dynamic) → not in initial bundle ✅
          QuickViewButton is tiny Client Component (~1kb) ✅
  TTFB  → ISR (revalidate=1800) → CDN-served → ~5ms TTFB ✅
          Promise.all → parallel queries → no sequential waterfall ✅
  Bundle → Server Components: 0 bytes for ProductCard, ProductsPage ✅
           Client JS: QuickViewButton (~1kb) + lazy QuickViewModal (~3kb) ✅
           QuickViewModal only downloads when user clicks — never on initial load ✅
  ─────────────────────────────────────────────────────────────────────────────
*/
```

---

## ✅ Day 6 Complete — Server and Client Architecture

| #   | Subtopic                                                          | Status |
| --- | ----------------------------------------------------------------- | ------ |
| 1   | Server Components — Default Rendering Model                       | ☐      |
| 2   | Client Components — `'use client'` and the Client Boundary        | ☐      |
| 3   | `'use server'` — Server Actions                                   | ☐      |
| 4   | Suspense and Streaming — Progressive Rendering                    | ☐      |
| 5   | Lazy Loading — `next/dynamic` and Code Splitting                  | ☐      |
| 6   | Composition Patterns — Server Inside Client, Client Inside Server | ☐      |
| 7   | Choosing Server-Client Boundaries — Decision Framework            | ☐      |
| 8   | Data Fetching Patterns — Where Data Lives                         | ☐      |
| 9   | Rendering Strategies — Static, Dynamic, Streaming                 | ☐      |
| 10  | Performance Patterns — Bundle Size, Hydration, and Optimization   | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 6

```
SERVER vs CLIENT DECISION
  Default: Server Component (no directive needed)
  Add 'use client' ONLY when you need:
    useState / useReducer / useContext
    useEffect / useLayoutEffect
    onClick / onChange / any event handler
    window / document / navigator / localStorage
    browser-only library (Leaflet, Three.js, canvas)
  Rule: push 'use client' as DEEP (as far down) as possible

SERVER COMPONENT FACTS
  ✅ Runs only on server — never in browser
  ✅ Can be async — await data directly
  ✅ Zero JS shipped to browser
  ✅ Direct DB access, process.env secrets
  ✅ Can import Client Components
  ❌ No hooks, no event handlers, no browser APIs
  Use 'server-only' package to enforce boundaries

CLIENT COMPONENT FACTS
  ✅ Runs in browser (AND server during SSR)
  ✅ Can use all React hooks
  ✅ Props must be serializable (no functions, Dates, Sets, Maps)
  ❌ Cannot import Server Components
  ❌ Cannot directly access DB or secrets
  Pattern: receive Server data as props (serialized JSON)

'use server' — SERVER ACTIONS
  Marks async functions as server-callable from Client Components
  Two forms: inline ('use server' inside function) or file-level
  Use with useActionState for form state management
  Use useTransition for non-form calls (delete buttons etc.)
  Always call revalidatePath() or revalidateTag() after mutations
  vs API Routes: Server Actions = internal, API Routes = external/webhooks

COMPOSITION RULES
  ✅ Server → imports → Server
  ✅ Server → imports → Client
  ✅ Client → renders → Server (via children/slot props)
  ❌ Client → imports → Server (not allowed)
  Pattern: pass Server Components as children from Server parent
  Pattern: wrap providers in 'use client' file, use as Server children

SUSPENSE + STREAMING
  <Suspense fallback={<Skeleton />}><AsyncComponent /></Suspense>
  → Shell renders immediately (t=0ms)
  → Each Suspense resolves independently (progressive)
  → loading.tsx = route-level Suspense (on navigation)
  → Manual Suspense = component-level (progressive streaming)
  Always use both: loading.tsx for instant feedback, Suspense for sections
  Promise.all for parallel fetches in one component
  React.cache() to deduplicate across components in same request

LAZY LOADING (next/dynamic)
  dynamic(() => import('./component'))              → lazy, with SSR
  dynamic(() => import('./component'), {ssr:false}) → browser-only
  dynamic(() => import('./component'), {loading:()=><Skeleton/>}) → loading state
  Use for: heavy libraries (charts, maps, editors), modals, optional features
  Don't use for: small components, always-visible above-fold content

RENDERING STRATEGIES
  Static  → HTML at build time (default)
            → Fast: ~5ms CDN delivery
  ISR     → Static + auto-regenerate (export const revalidate = N)
            → Stale-while-revalidate pattern
  Dynamic → HTML per request (triggered by cookies/headers/searchParams)
            → Always fresh, slower
  Streaming → Dynamic + progressive (Suspense boundaries)
            → Shell instant, data fills in

WHAT TRIGGERS DYNAMIC RENDERING
  → cookies(), headers() from 'next/headers'
  → searchParams prop
  → cache: 'no-store' fetch
  → export const dynamic = 'force-dynamic'

CACHE CONTROL
  fetch(url)                           → cached (default)
  fetch(url, {next:{revalidate:N}})    → ISR
  fetch(url, {next:{tags:['tag']}})    → tagged (on-demand)
  fetch(url, {cache:'no-store'})       → no cache (always fresh)
  revalidatePath('/path')              → clear specific URL cache
  revalidateTag('tag')                 → clear all tagged fetches
  React.cache(fn)                      → per-request deduplication

DATA FETCHING DECISION
  Initial page content              → Server Component (async)
  Real-time / polled / interactive  → TanStack Query (client)
  Form submission / mutation        → Server Action
  External webhook / public API     → API Route (route.ts)
  Shared across components          → React.cache() + colocated fetch

PERFORMANCE CHECKLIST
  ✅ 'use client' as deep as possible
  ✅ next/dynamic for heavy optional components
  ✅ ssr:false for browser-only libraries
  ✅ priority on LCP image only
  ✅ width + height (or fill) on all images
  ✅ next/font — zero layout shift, zero external requests
  ✅ Promise.all for parallel Server Component fetches
  ✅ React.cache() to prevent duplicate DB queries
  ✅ ISR for content that changes infrequently
  ✅ Suspense skeletons matching content dimensions (prevent CLS)
  ✅ next/script strategy="afterInteractive" for analytics
```

---

> **Your next action:** Open your Next.js project. Find one component with `'use client'` that doesn't use any hooks or event handlers. Remove the directive. Run `next build` and check if the bundle size decreases. If it doesn't compile without it, you found a legitimate client component. If it does — you just made it a Server Component and reduced your JS bundle.
>
> _Doing one small thing beats opening a feed._
