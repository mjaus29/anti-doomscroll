# 4 — The Next.js Cache Layers — Full Mental Model

---

## T — TL;DR

Next.js 16 has **four distinct cache layers**, each with a different scope, lifetime, and invalidation mechanism. Knowing which layer stores what — and how they interact — is the mental model that makes every caching decision clear.

---

## K — Key Concepts

### The Four Cache Layers

```
Layer                   What it stores           Scope           Invalidated by
──────────────────────  ──────────────────────   ─────────────   ──────────────────────────
1. Request Memoization  fetch() results          Single request  Automatically (per request)
2. Data Cache           fetch() responses        Persistent       revalidatePath/Tag, deploy
3. Full Route Cache     HTML + RSC payload       Persistent       revalidatePath/Tag, deploy
4. Router Cache         RSC payload (prefetch)   Browser session  navigation, router.refresh()
```

### Layer 1 — Request Memoization (Per-Request)

```tsx
// Scope: ONE server render request
// What: deduplicates identical fetch() calls within the same render tree
// Duration: reset after each request completes
// Automatic: yes — no configuration

// Both calls in the same request → 1 HTTP request, not 2
// layout.tsx
const user = await fetch("/api/me").then((r) => r.json()); // HTTP request → cached

// page.tsx (same request)
const user = await fetch("/api/me").then((r) => r.json()); // cache hit → no HTTP

// Note: React.cache() provides the same for NON-fetch functions
import { cache } from "react";
export const getUser = cache(async (id) =>
  db.user.findUnique({ where: { id } })
);
// Multiple calls to getUser(id) in one request → 1 DB query
```

### Layer 2 — Data Cache (Persistent HTTP Cache)

```tsx
// Scope: Persistent across requests (survives server restarts in production)
// What: stores fetch() response bodies
// Duration: until revalidated or cache is explicitly cleared
// Location: server-side (Next.js data cache store)

// Stores the response for ALL future requests:
const data = await fetch("https://api.example.com/config", {
  next: { revalidate: 3600 }, // cached for 1 hour in the Data Cache
});

// How revalidation works:
// t=0:    first request → cache MISS → fetch from origin → store in Data Cache
// t=1-3599: requests → cache HIT → return cached response (no origin fetch)
// t=3600: first request after expiry → cache STALE → serve stale, re-fetch in BG
// t=3601: cache FRESH again with new data

// Data Cache is SEPARATE from the browser HTTP cache
// Even if the browser cache is cleared, Data Cache persists
```

### Layer 3 — Full Route Cache (HTML + RSC Payload)

```tsx
// Scope: Persistent (stored on server/CDN)
// What: complete HTML output + React Server Component payload for static routes
// Duration: until route is revalidated or redeployed
// Only applies to: STATIC routes (○ and ● in build output)

// Static routes are pre-rendered and stored:
// next build → /products/page.tsx → HTML → stored in Full Route Cache
// Every subsequent request → serve pre-built HTML (no server computation)

// Dynamic routes (ƒ) bypass the Full Route Cache:
// Every request → server renders fresh HTML → not stored in Full Route Cache

// Invalidated by:
// → revalidatePath('/products')          ← clears specific route
// → revalidatePath('/products', 'layout') ← clears route + children
// → next deploy                           ← all static routes regenerated
```

### Layer 4 — Router Cache (Client-Side)

```tsx
// Scope: Browser memory (per navigation session)
// What: RSC (React Server Component) payload for visited/prefetched routes
// Duration: 30 seconds for dynamic routes, 5 minutes for static routes
//           cleared on hard refresh, browser close, or router.refresh()
// Location: client-side (browser memory)

// How it works:
// 1. User visits /products → page fetched, stored in Router Cache
// 2. User navigates to /products/1 → /products/1 fetched
// 3. User clicks back to /products → served from Router Cache (no server request)
// 4. <Link> prefetches routes on hover → stored in Router Cache
// 5. router.refresh() → invalidates Router Cache for current route

// Invalidate from Client Component:
"use client";
import { useRouter } from "next/navigation";
export function RefreshButton() {
  const router = useRouter();
  return <button onClick={() => router.refresh()}>Refresh Data</button>;
}
```

### The Cache Interaction Flow

```
Incoming request to /products
         │
         ▼
  ┌─────────────────────┐
  │  Full Route Cache   │  ← Layer 3: is there pre-built HTML?
  │  (static routes)    │
  └──────┬──────────────┘
         │ MISS (dynamic route or expired static)
         ▼
  ┌─────────────────────┐
  │  Server Render      │  ← generate HTML from components
  │  (React)            │
  └──────┬──────────────┘
         │ each fetch() call goes through:
         ▼
  ┌─────────────────────┐
  │  Request Memoization│  ← Layer 1: same fetch in this request?
  │  (per request)      │
  └──────┬──────────────┘
         │ MISS
         ▼
  ┌─────────────────────┐
  │  Data Cache         │  ← Layer 2: is there a cached response?
  │  (persistent)       │
  └──────┬──────────────┘
         │ MISS
         ▼
  ┌─────────────────────┐
  │  Origin Fetch       │  ← actual HTTP request to the API/DB
  │  (network)          │
  └─────────────────────┘
         │
         ▼ response flows back up, stored in Data Cache
```

### Opting Out of Each Layer

```tsx
// Opt out of Request Memoization:
// Not directly configurable — use different URLs or add unique headers
// (rarely needed — usually you WANT deduplication)

// Opt out of Data Cache:
fetch(url, { cache: "no-store" }); // ← skip Data Cache entirely

// Opt out of Full Route Cache:
export const dynamic = "force-dynamic"; // ← route never pre-rendered
// or use any dynamic API (cookies, headers, searchParams)

// Opt out of Router Cache:
router.refresh(); // ← invalidate current route
// or: add cache-control headers to the route's response
```

---

## W — Why It Matters

- Confusing the four layers is the most common source of "why isn't my data updating?" bugs in Next.js — knowing that a Data Cache hit serves stale content even after a database update (until revalidation is called) prevents hours of debugging.
- The Router Cache is invisible to server-side code — calling `revalidatePath` on the server doesn't clear the Router Cache. Users who navigate back to a page may still see stale content from the Router Cache until they hard-refresh or `router.refresh()` is called. This is a frequent source of confusion.
- The Full Route Cache only applies to static routes — understanding this is why `next build` shows ○ (static) vs ƒ (dynamic) and why CDN delivery is only possible for static routes.

---

## I — Interview Q&A

### Q1: Explain all four Next.js cache layers and their differences.

**A:** Next.js 16 has four cache layers. First: **Request Memoization** — deduplicates identical `fetch()` calls within a single render request, automatic and temporary (resets per request). Second: **Data Cache** — persists `fetch()` responses on the server across requests, configurable with `next.revalidate` and `next.tags`, invalidated by `revalidatePath`/`revalidateTag`. Third: **Full Route Cache** — stores the complete rendered HTML and RSC payload for static routes, served from CDN, invalidated by revalidation or redeployment. Fourth: **Router Cache** — stores RSC payloads in the browser during a session for instant back/forward navigation and prefetching, invalidated by `router.refresh()` or page navigation.

### Q2: Why might `revalidatePath` not immediately show updated data to a user?

**A:** `revalidatePath` clears the Data Cache and Full Route Cache on the server — the next server request will fetch fresh data. However, if the user's browser has the page in the Router Cache (client-side), they may still see the stale cached version when navigating back to the page. The Router Cache survives server-side revalidation because it lives in browser memory. To force a refresh, you need to call `router.refresh()` on the client after the server action, which tells the browser to discard its Router Cache and re-fetch from the server.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting `revalidatePath` to immediately update what the user sees

```tsx
// Server Action
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  await db.product.update({ where: { id }, data });
  revalidatePath(`/products/${id}`); // ← clears server cache

  // User is still on /products/[id] — sees OLD data from Router Cache
  // They need to router.refresh() to see the update
}
```

**Fix:** Combine `revalidatePath` with client-side `router.refresh()`:

```tsx
// Client Component that calls the action
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateProduct } from "../actions";

export function UpdateButton({ id, data }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await updateProduct(id, data); // ← clears server cache
          router.refresh(); // ← clears browser Router Cache ✅
        })
      }
    >
      {isPending ? "Saving..." : "Save"}
    </button>
  );
}
```

### ❌ Pitfall: Confusing Data Cache miss with Request Memoization miss

```tsx
// Developer sees "fetch called twice" in logs and thinks memoization broke
// But the second call has different options → memoization won't deduplicate

// These are different — NOT memoized together:
fetch("/api/user"); // options: {}
fetch("/api/user", { cache: "no-store" }); // options: {cache: 'no-store'}
// Different options = different cache keys = two HTTP requests
```

**Fix:** Ensure identical options for deduplication. Use `React.cache()` for DB calls:

```tsx
import { cache } from "react";
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
// Guaranteed deduplication regardless of call site ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Trace the cache journey for a request to `/blog/nextjs-16`:

1. Show which layer handles each stage
2. Show what happens on first visit, subsequent visits, and after `revalidateTag('blog-posts')`
3. Show what `router.refresh()` does vs `revalidateTag`
4. Write a component that visualizes which cache layer data came from

### Solution

```tsx
// src/app/blog/[slug]/_components/cache-debug-banner.tsx
// Shows cache layer info in development — Server Component
// (In production, omit or hide this component)

export function CacheDebugBanner({
  slug,
  renderedAt,
}: {
  slug: string;
  renderedAt: string; // ISO timestamp from server render
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className="bg-gray-900 text-green-400 font-mono text-xs px-4 py-3
                    rounded-lg mb-6 space-y-1"
    >
      <p className="font-bold text-white">🔍 Cache Debug (dev only)</p>
      <p>
        Route: <span className="text-yellow-400">/blog/{slug}</span>
      </p>
      <p>
        Rendered at: <span className="text-cyan-400">{renderedAt}</span>
      </p>
      <p>
        Strategy: <span className="text-green-400">ISR (revalidate=3600)</span>
      </p>
      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
        <p className="text-gray-400">Cache layer hierarchy:</p>
        <p> Layer 3 (Full Route Cache): checked first for pre-built HTML</p>
        <p> Layer 2 (Data Cache): checked for fetch() responses</p>
        <p> Layer 1 (Req Memoization): deduplicates within this render</p>
        <p> Layer 4 (Router Cache): browser-side, lives 5min for static</p>
      </div>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/page.tsx — with cache layer documentation
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CacheDebugBanner } from "./_components/cache-debug-banner";

export const revalidate = 3600; // ISR: 1 hour
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

const POSTS: Record<
  string,
  { title: string; content: string; author: string }
> = {
  "nextjs-16": {
    title: "Next.js 16 Deep Dive",
    content: "In-depth look...",
    author: "Mark",
  },
  "react-server": {
    title: "React Server Components",
    content: "RSC explained...",
    author: "Mark",
  },
};

export async function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: POSTS[slug]?.title ?? "Post Not Found" };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) notFound();

  // Timestamp of when THIS render ran on the server
  // Same timestamp = served from Full Route Cache (pre-built HTML)
  // Different timestamp = new server render occurred
  const renderedAt = new Date().toISOString();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      {/* Debug banner — visible in development to trace cache behavior */}
      <CacheDebugBanner slug={slug} renderedAt={renderedAt} />

      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-8">By {post.author}</p>
      <p className="text-gray-700 leading-relaxed">{post.content}</p>
    </article>
  );
}

/*
  Cache journey trace for GET /blog/nextjs-16:

  ─── FIRST EVER REQUEST (after next build) ────────────────────────────────────
  1. Full Route Cache: HIT (pre-built at next build) ✅
     → Serve pre-built HTML from Full Route Cache
     → renderedAt = BUILD TIME (same for all visitors during revalidate period)
     → Layers 1, 2 NOT consulted (HTML already built)

  ─── SUBSEQUENT REQUESTS (within 1 hour) ─────────────────────────────────────
  1. Full Route Cache: HIT ✅
     → Same pre-built HTML served
     → Response time: ~5ms from CDN

  ─── REQUEST AFTER 1 HOUR (ISR expiry) ───────────────────────────────────────
  1. Full Route Cache: STALE → serve stale HTML to this visitor
  2. Background: Next.js starts re-render
     → Fetch calls → Layer 1 (Request Memoization): fresh request, no hits
     → Fetch calls → Layer 2 (Data Cache): MISS (also expired) → origin fetch
     → New HTML rendered
  3. Full Route Cache: REFRESHED with new HTML
  4. Next visitor: Full Route Cache HIT with fresh HTML ✅

  ─── AFTER revalidateTag('blog-posts') CALLED ────────────────────────────────
  1. Data Cache: PURGED for tagged fetches ✅
  2. Full Route Cache: PURGED for affected routes ✅
  3. Next request: Full Route Cache MISS → fresh server render → new HTML
  4. User still in browser: Layer 4 (Router Cache) may still have old RSC payload
     → router.refresh() needed to clear browser cache ✅

  ─── router.refresh() CALLED (client-side) ───────────────────────────────────
  1. Layer 4 (Router Cache): CLEARED for current route ✅
  2. Browser re-fetches RSC payload from server
  3. Server: checks Full Route Cache → HIT (if revalidation ran) → fresh HTML
  4. User sees updated content ✅

  ─── revalidateTag vs router.refresh() summary ───────────────────────────────
  revalidateTag → clears server-side Data Cache + Full Route Cache
  router.refresh() → clears client-side Router Cache
  Both needed for user to see immediate update ✅
*/
```

---

---
