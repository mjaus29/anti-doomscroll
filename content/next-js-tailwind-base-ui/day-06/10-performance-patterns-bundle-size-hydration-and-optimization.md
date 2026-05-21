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
