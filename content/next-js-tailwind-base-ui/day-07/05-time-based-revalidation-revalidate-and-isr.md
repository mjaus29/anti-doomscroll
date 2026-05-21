# 5 — Time-Based Revalidation — `revalidate` and ISR

---

## T — TL;DR

**ISR (Incremental Static Regeneration)** pre-builds pages at build time and automatically regenerates them in the background after a `revalidate` period expires. Users always get fast pre-built HTML; the content stays fresh without a full rebuild.

---

## K — Key Concepts

### `revalidate` at Route Segment Level

```tsx
// src/app/blog/page.tsx
// Sets the revalidation window for the ENTIRE route

export const revalidate = 3600; // regenerate after 1 hour

// All fetch() calls in this route inherit this revalidate value
// UNLESS they override it with their own next.revalidate

export default async function BlogPage() {
  const posts = await fetch("https://cms.example.com/posts").then((r) =>
    r.json()
  );
  // ← this fetch uses revalidate: 3600 (inherited from route)
  return <PostList posts={posts} />;
}
```

### `revalidate` at fetch() Level

```tsx
// Per-fetch revalidation — overrides the route-level revalidate
export default async function MixedPage() {
  // Fast-changing: revalidate every 60s
  const prices = await fetch("https://api.example.com/prices", {
    next: { revalidate: 60 },
  }).then((r) => r.json());

  // Slow-changing: revalidate every 24h
  const config = await fetch("https://api.example.com/config", {
    next: { revalidate: 86400 },
  }).then((r) => r.json());

  // Static: never revalidate automatically (on-demand only)
  const legal = await fetch("https://api.example.com/legal", {
    next: { revalidate: false },
  }).then((r) => r.json());

  return <div>{/* render */}</div>;
}

// Route-level revalidate = MINIMUM of all fetch revalidate values in the route
// If route has revalidate: 3600 but a fetch has revalidate: 60 → route = 60
```

### The Stale-While-Revalidate Behavior

```
How ISR actually works:

t=0s     First request → cache MISS → fetch origin → build HTML → store
         User A sees: fresh HTML (200ms wait for origin)

t=1-3599s Subsequent requests → cache HIT → serve stored HTML
         Users B-Z see: pre-built HTML (~5ms)

t=3600s  Cache expires (marked stale)
         User X requests → served STALE HTML immediately (still ~5ms)
         Background: Next.js re-renders, re-fetches, builds new HTML

t=3601s  Cache FRESH with new HTML
         Next users see: updated HTML (~5ms)

Key: User X sees stale content briefly, but never waits for re-render
     This is "stale-while-revalidate" — serve stale, update in background
```

### ISR with `generateStaticParams`

```tsx
// src/app/products/[id]/page.tsx
export const revalidate = 1800; // 30 min
export const dynamicParams = true; // allow new products (not in generateStaticParams)

// Pre-build known products at build time
export async function generateStaticParams() {
  const products = await db.product.findMany({
    select: { id: true },
  });
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) notFound();
  return <ProductView product={product} />;
}

// Known products: pre-built at build time, then ISR every 30 min
// New products:   built on first request (dynamicParams: true), then ISR
// Deleted products: notFound() renders 404, cached in Full Route Cache
```

### Special `revalidate` Values

```tsx
// src/app/page.tsx

export const revalidate = 0; // ← effectively no cache (same as force-dynamic)
//   re-renders on every request

export const revalidate = false; // ← (default) never auto-revalidate
//   only revalidates via revalidatePath/Tag
//   or on next deploy

export const revalidate = Infinity; // ← same as false — cache forever

export const revalidate = 60; // ← revalidate after 60 seconds

// Note: revalidate: 0 does NOT equal cache: 'no-store'
// revalidate: 0 → Full Route Cache is used but regenerated every request
// cache: 'no-store' → bypasses Data Cache entirely, forces dynamic rendering
```

### Combining `revalidate` with `tags` — Best of Both

```tsx
// Combined: auto-revalidate after 1 hour AND on-demand when content changes
const posts = await fetch("https://cms.example.com/posts", {
  next: {
    revalidate: 3600, // ← auto: max 1 hour stale
    tags: ["posts"], // ← on-demand: immediate via revalidateTag('posts')
  },
});

// Use case:
// CMS webhook: calls revalidateTag('posts') when editor publishes → immediate update
// Between publishes: ISR ensures max 1h staleness even without webhook
```

---

## W — Why It Matters

- ISR is the correct strategy for the vast majority of web content — blog posts, product pages, documentation, landing pages. It delivers CDN-speed performance with automated freshness, without requiring a full redeploy when content changes.
- The stale-while-revalidate behavior is a feature, not a bug — users always get an instant response, and content is refreshed in the background. The brief window of stale content (a few seconds) is acceptable for most use cases and vastly better than waiting for a full re-render.
- Understanding that `revalidate: 0` and `cache: 'no-store'` are conceptually different helps avoid confusion — `revalidate: 0` still goes through the cache mechanism (just expires immediately), while `cache: 'no-store'` bypasses the Data Cache entirely.

---

## I — Interview Q&A

### Q1: How does ISR work in Next.js and what problem does it solve?

**A:** ISR (Incremental Static Regeneration) solves the conflict between static performance and data freshness. Traditional static sites are fast but stale — you need a full rebuild to update any content. SSR is always fresh but slow — every user pays the server rendering cost. ISR combines both: pages are pre-built statically (fast CDN delivery) and then automatically regenerated in the background after a `revalidate` period expires. The first request after expiry gets the stale page (still fast) while the server regenerates in the background. All subsequent requests get the fresh page. Individual pages revalidate independently — no full rebuild needed.

### Q2: What happens if `revalidate` is set at both the route segment and individual `fetch` calls?

**A:** Next.js uses the **lowest** `revalidate` value. If the route segment has `revalidate = 3600` but one fetch has `next: { revalidate: 60 }`, the route revalidates every 60 seconds — as fast as the shortest-lived data. This is logical: if any data on the page changes every 60 seconds, the page itself can't be cached longer than that. Conversely, individual fetches can have longer revalidation than the route segment — a fetch with `revalidate: 86400` on a page with `revalidate: 3600` will still be refreshed every hour (driven by the route segment).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting `revalidate = 0` thinking it means "no cache"

```tsx
// Developer wants fresh data on every request
export const revalidate = 0;
// ❌ This does NOT mean the same as cache: 'no-store'
// It means "expire the cache immediately" — subtle difference
// For true no-cache behavior, use force-dynamic or cache: 'no-store'
```

**Fix:** Use `force-dynamic` for true per-request rendering:

```tsx
export const dynamic = "force-dynamic"; // ← explicit per-request rendering
// OR on specific fetches:
fetch(url, { cache: "no-store" });
```

### ❌ Pitfall: Not setting `dynamicParams` when using `generateStaticParams`

```tsx
// generateStaticParams pre-builds known product IDs
export async function generateStaticParams() {
  return [{ id: "prod-1" }, { id: "prod-2" }];
}

// Default: dynamicParams = true (unknown IDs render on first request, then ISR)
// If you want unknown IDs to return 404:
export const dynamicParams = false;
// → /products/new-product-id → 404 immediately ✅
// → Useful for: finite sets (categories, static pages) where unknown = invalid
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `/events/[id]` page that:

1. Pre-builds 3 known events with `generateStaticParams`
2. Uses `revalidate = 900` (15 minutes) for ISR
3. Allows unknown event IDs with `dynamicParams = true`
4. A specific event fetch also uses `tags: ['events', `event-${id}`]` for on-demand revalidation
5. Shows a "Last updated" timestamp using `Date.now()` at render time to verify ISR behavior

### Solution

```tsx
// src/app/events/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── ISR configuration ────────────────────────────────────────────────────────
export const revalidate = 900; // ← regenerate after 15 minutes
export const dynamicParams = true; // ← new event IDs render on first request

type Params = Promise<{ id: string }>;

// Simulated CMS event data
const EVENTS: Record<
  string,
  {
    title: string;
    date: string;
    location: string;
    capacity: number;
    desc: string;
  }
> = {
  "evt-001": {
    title: "Next.js 16 Workshop",
    date: "2026-06-10",
    location: "San Francisco, CA",
    capacity: 50,
    desc: "A hands-on workshop covering the latest Next.js 16 features.",
  },
  "evt-002": {
    title: "React Summit 2026",
    date: "2026-07-15",
    location: "Amsterdam, NL",
    capacity: 500,
    desc: "The largest React conference in Europe.",
  },
  "evt-003": {
    title: "TypeScript Conf",
    date: "2026-08-20",
    location: "Online",
    capacity: 2000,
    desc: "Annual TypeScript conference with talks from the TypeScript team.",
  },
};

async function getEvent(id: string) {
  // Tagged fetch — can be invalidated by revalidateTag('events') or
  // revalidateTag(`event-${id}`) for surgical per-event revalidation
  const res = await fetch(`https://api.example.com/events/${id}`, {
    next: {
      revalidate: 900, // ← matches route revalidate
      tags: ["events", `event-${id}`], // ← tag for on-demand invalidation
    },
  }).catch(() => null);

  // Fallback to mock data if API unavailable
  if (!res?.ok) return EVENTS[id] ?? null;
  return res.json();
}

// ─── Pre-build known events at next build ─────────────────────────────────────
export async function generateStaticParams() {
  // In production: const events = await db.event.findMany({ select: { id: true } })
  return Object.keys(EVENTS).map((id) => ({ id }));
  // Pre-builds: /events/evt-001, /events/evt-002, /events/evt-003
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  return {
    title: event?.title ?? "Event Not Found",
    description: event?.desc,
  };
}

export default async function EventPage({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  // Render timestamp — changes when a new ISR render occurs
  // Same timestamp across requests = served from Full Route Cache (static)
  // Different timestamp = ISR regeneration happened
  const renderedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* ISR debug info — helpful in development */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                        mb-8 text-xs font-mono text-amber-700"
        >
          <p className="font-bold">ISR Debug</p>
          <p>Route revalidate: 900s (15 min)</p>
          <p>Tags: events, event-{id}</p>
          <p>Rendered at: {renderedAt}</p>
          <p className="text-amber-500 mt-1">
            If this timestamp is static across refreshes → Full Route Cache HIT
            ✅
          </p>
        </div>
      )}

      {/* Event details */}
      <div className="mb-2">
        <span className="text-xs text-blue-600 font-semibold uppercase">
          Event
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

      <div className="bg-white border rounded-xl p-6 space-y-4 mb-8">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
            <p className="font-semibold">{eventDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">
              Location
            </p>
            <p className="font-semibold">{event.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">
              Capacity
            </p>
            <p className="font-semibold">{event.capacity} attendees</p>
          </div>
        </div>
      </div>

      <p className="text-gray-600 leading-relaxed mb-8">{event.desc}</p>

      <button
        className="w-full py-3 bg-blue-600 text-white font-semibold
                         rounded-xl hover:bg-blue-700 transition-colors"
      >
        Register for this Event
      </button>

      {/* Production-safe last updated note */}
      <p className="text-xs text-gray-400 text-center mt-6">
        Content refreshes every 15 minutes · Last render: {renderedAt}
      </p>
    </div>
  );
}

/*
  Build output expected:
  ─────────────────────────────────────────────────────────────
  ● /events/[id]                 ← ISR (revalidate: 900) ✅
    ├── /events/evt-001           pre-built at build time
    ├── /events/evt-002           pre-built at build time
    └── /events/evt-003           pre-built at build time

  New events (e.g. /events/evt-004):
    → First request: dynamic render → cached → ISR from then on ✅

  On-demand revalidation targets:
    revalidateTag('events')         → regenerates ALL event pages
    revalidateTag('event-evt-001')  → regenerates ONLY evt-001 ✅
*/
```

---

---
