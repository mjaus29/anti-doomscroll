# 8 — Opting Out of Cache — `cache: 'no-store'` and `connection()`

---

## T — TL;DR

`cache: 'no-store'` bypasses the Data Cache for a specific `fetch()` call. `connection()` (Next.js 15+) opts an entire route into dynamic rendering by signaling it depends on the incoming request. These are the two correct ways to guarantee always-fresh, per-request data.

---

## K — Key Concepts

### `cache: 'no-store'` — Skip the Data Cache

```tsx
// Bypasses the Next.js Data Cache entirely
// Every request triggers a fresh fetch to the origin

// ─── On a specific fetch call
const livePrice = await fetch("https://api.example.com/prices/BTC", {
  cache: "no-store", // ← no caching at all
});

// ─── What 'no-store' does:
// 1. Bypasses Data Cache (no read, no write)
// 2. Forces the route to be dynamically rendered per-request
// 3. Response is NOT stored in the Data Cache for future requests
// 4. Every request → origin fetch → fresh data

// ─── Compare to 'no-cache' (HTTP semantics):
fetch(url, { cache: "no-cache" });
// → Checks Data Cache but always revalidates with origin before using
// → Usually equivalent to no-store in practice in Next.js
// → 'no-store' is the recommended choice for truly fresh data
```

### When `cache: 'no-store'` Forces Dynamic Rendering

```tsx
// A route becomes DYNAMIC when ANY fetch in it uses cache: 'no-store'

// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const staticConfig = await fetch("/api/config"); // ← cached
  const liveData = await fetch("/api/live", {
    cache: "no-store", // ← forces dynamic
  });
  // Entire /dashboard route is now DYNAMIC
  // staticConfig is re-fetched on every request despite being cacheable
}

// Fix: isolate no-store fetches in Suspense-wrapped async components
// to avoid making the entire route dynamic (see Subtopic 3)
```

### `connection()` — Opt Into Dynamic Without `fetch`

```tsx
// Next.js 15+ introduces connection() from 'next/server'
// It explicitly opts a route into dynamic rendering even without
// using cookies(), headers(), or cache: 'no-store'

import { connection } from "next/server";

export default async function LiveDashboardPage() {
  // Signal: this page REQUIRES a live connection per request
  // This is semantically clearer than cache: 'no-store' on a dummy fetch
  await connection();

  // From this point on, page is guaranteed fresh per-request
  const data = await db.analytics.getLive(); // direct DB — not cached

  return <LiveDashboard data={data} />;
}

// When to use connection() vs cache: 'no-store':
// connection()        → when using direct DB (not fetch), need dynamic rendering
// cache: 'no-store'  → on specific fetch() calls where you want no caching
```

### `noStore()` — The Previous Approach (Deprecated in 15+)

```tsx
// Next.js 14 approach — still works but connection() is preferred in 15+
import { unstable_noStore as noStore } from "next/cache";

export default async function Page() {
  noStore(); // ← opt into dynamic rendering (equivalent to connection())
  const data = await db.getLiveData();
  return <div>{/* ... */}</div>;
}

// In Next.js 15+, prefer:
import { connection } from "next/server";
await connection();
```

### Combining `cache: 'no-store'` with Sensitive Data

```tsx
// Server Component — 100% safe because it runs server-side only
export default async function PrivateReportsPage() {
  // These fetches:
  // 1. Never cached (no-store)
  // 2. Run on server only (headers/tokens never exposed to browser)
  // 3. Response never stored (sensitive financial data)

  const report = await fetch(`${process.env.INTERNAL_API}/reports/monthly`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`, // ← server only
      "X-Internal-Request": "true",
    },
  });

  if (!report.ok) {
    throw new Error("Failed to fetch private report");
  }

  const data = await report.json();
  return <PrivateReport data={data} />;
}
```

### `cache: 'force-cache'` — Opt Back Into Caching

```tsx
// Explicitly force caching even if the route would be dynamic otherwise
// Useful inside dynamic routes where you still want some data cached

export default async function DynamicPageWithCachedData() {
  // This route is dynamic (cookies() elsewhere)
  // But this fetch can still be cached across requests:
  const staticCategories = await fetch("https://api.example.com/categories", {
    cache: "force-cache", // ← always cached, even in a dynamic route context
  }).then((r) => r.json());

  const liveUserData = await fetch("https://api.example.com/me", {
    cache: "no-store", // ← always fresh
  }).then((r) => r.json());

  return (
    <div>
      <CategoryFilter categories={staticCategories} />
      <UserDashboard user={liveUserData} />
    </div>
  );
}
```

### Request-Level Opt-Out Summary

```
Method                          Effect                       When to use
──────────────────────────────  ──────────────────────────   ─────────────────────────
cache: 'no-store'               Skip Data Cache for fetch    Live prices, inventory
cache: 'force-cache'            Force Data Cache for fetch   Static data in dynamic route
connection()                    Force dynamic rendering      Direct DB in dynamic route
cookies() / headers()           Auto-force dynamic           Auth, personalization
export const dynamic='force-dynamic'  Force entire route dynamic  A/B tests, personalized pages
export const revalidate = 0     Expire immediately           Near-real-time (ISR at t=0)
```

---

## W — Why It Matters

- `cache: 'no-store'` forces the entire route to be dynamic — this is the most common unintentional performance regression in Next.js apps. A single `cache: 'no-store'` fetch buried in a deeply nested component can silently convert a CDN-served static page into a per-request server render.
- `connection()` is the clean way to declare "this route is intentionally dynamic" when you're using direct database calls — it makes the intent explicit in code review, vs relying on the implicit side effect of `cache: 'no-store'`.
- Using `cache: 'force-cache'` inside a dynamic route is a practical optimization — it lets you cache static reference data (categories, config, navigation) even on pages that are dynamically rendered for user-specific content.

---

## I — Interview Q&A

### Q1: What is the difference between `cache: 'no-store'` and `cache: 'no-cache'`?

**A:** In HTTP semantics, `no-store` means "never store this response anywhere — always go to the origin." `no-cache` means "you may store the response, but always revalidate with the origin before serving it." In Next.js's Data Cache context, both effectively bypass caching for fresh data. However, `no-store` is the semantically correct and recommended choice when you want guaranteed fresh data — it clearly communicates that the response should never be cached. `no-cache` with a next.js Data Cache may behave like `no-store` in practice but carries different HTTP semantics that could affect CDN behavior.

### Q2: What does `connection()` do and when should you prefer it over `cache: 'no-store'`?

**A:** `connection()` is a Next.js 15+ API from `'next/server'` that explicitly opts a route into dynamic per-request rendering. Use it when your route uses direct database calls (not `fetch()`) and you need dynamic rendering — there's no fetch to attach `cache: 'no-store'` to, but you still need to signal to Next.js that this route must not be statically cached. It's semantically cleaner than adding a dummy `fetch` with `cache: 'no-store'` just to trigger dynamic rendering. Prefer `cache: 'no-store'` on individual `fetch()` calls; prefer `connection()` for routes using direct DB access or other non-fetch data sources.

### Q3: How can you prevent `cache: 'no-store'` from accidentally making an entire page dynamic?

**A:** Isolate the `no-store` fetch in a separate async Server Component wrapped in `<Suspense>`. The parent page exports a `revalidate` value for ISR, making its shell static. The dynamic-fetching component streams in per-request via Suspense. This is the Partial Pre-rendering pattern — the static shell loads from CDN in ~5ms, and the live section streams in independently. The key insight: `cache: 'no-store'` in a Suspense-wrapped child component doesn't force the parent page to be dynamic — it's isolated to that component's data fetch.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `cache: 'no-store'` on data that doesn't actually change per-request

```tsx
// ❌ Product categories never change per-user — no reason for no-store
const categories = await fetch("/api/categories", {
  cache: "no-store", // ← forces dynamic, fetches origin every request
  // Makes entire page dynamic — 1000 visitors = 1000 origin fetches
});
```

**Fix:** Use `revalidate` for data that changes occasionally:

```tsx
// ✅ Categories cached for 1 hour — still fresh, not dynamic
const categories = await fetch("/api/categories", {
  next: { revalidate: 3600, tags: ["categories"] },
});
```

### ❌ Pitfall: Forgetting that `cache: 'no-store'` in a layout affects all children

```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  // ❌ no-store in the layout makes EVERY dashboard route dynamic
  const user = await fetch("/api/me", { cache: "no-store" }).then((r) =>
    r.json()
  );
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}
// /dashboard, /dashboard/orders, /dashboard/settings — ALL dynamic now
```

**Fix:** Use `cookies()` + session-based lookup, which is naturally dynamic but purposeful:

```tsx
import { cookies } from "next/headers";
export default async function DashboardLayout({ children }) {
  const sessionId = (await cookies()).get("session")?.value;
  // cookies() already makes routes dynamic — no need for no-store
  const user = await getUserBySession(sessionId);
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}
```

### ❌ Pitfall: Combining `cache: 'no-store'` with `next: { revalidate }`

```tsx
// ❌ Contradictory — no-store means never cache, revalidate means cache for N seconds
const data = await fetch(url, {
  cache: "no-store",
  next: { revalidate: 60 }, // ← ignored when cache: 'no-store' is set
});
// Result: no-store wins, data is never cached, revalidate has no effect
```

**Fix:** Choose one or the other:

```tsx
// ✅ Never cache:
fetch(url, { cache: "no-store" });

// ✅ Cache for 60s:
fetch(url, { next: { revalidate: 60 } });
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/live-dashboard` page that:

1. Uses `connection()` to explicitly declare dynamic rendering
2. Has a `CurrentUserBanner` with `cache: 'no-store'` for always-fresh user data
3. Has a `CachedConfig` component with `cache: 'force-cache'` for static site config (even though the route is dynamic)
4. Has a `LiveMetrics` component with direct DB and `connection()` pattern
5. Each section is in its own Suspense with matching skeleton

### Solution

```tsx
// src/app/live-dashboard/_components/current-user-banner.tsx
// Always-fresh user data — no-store
async function getCurrentUserData() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/me`,
    { cache: "no-store" } // ← always fresh
  ).catch(() => null);

  if (!res?.ok) return null;
  return res.json() as Promise<{
    name: string;
    plan: string;
    lastLogin: string;
  }>;
}

export async function CurrentUserBanner() {
  const user = await getCurrentUserData();

  if (!user) {
    return (
      <div className="bg-gray-50 border rounded-xl px-5 py-4 text-sm text-gray-500">
        Could not load user data.
      </div>
    );
  }

  return (
    <div
      className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4
                    flex items-center justify-between"
    >
      <div>
        <p className="font-semibold text-gray-900">{user.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Plan: <span className="text-blue-600 font-medium">{user.plan}</span>
          {" · "}Last login: {user.lastLogin}
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Live
      </span>
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/_components/cached-config.tsx
// Static config — force-cache even though parent route is dynamic
async function getSiteConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/config`,
    {
      cache: "force-cache", // ← cached even in dynamic route
      next: { tags: ["site-config"] }, // ← on-demand revalidation
    }
  ).catch(() => null);

  if (!res?.ok)
    return { appName: "Dashboard", version: "1.0.0", features: [] as string[] };
  return res.json() as Promise<{
    appName: string;
    version: string;
    features: string[];
  }>;
}

export async function CachedConfig() {
  const config = await getSiteConfig();

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          App Config
        </p>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
          force-cache
        </span>
      </div>
      <p className="text-sm font-medium">
        {config.appName} v{config.version}
      </p>
      {config.features.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {config.features.map((f) => (
            <span
              key={f}
              className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/_components/live-metrics.tsx
// Direct DB — dynamic rendering via parent's connection()
async function getLiveMetrics() {
  // Direct DB call — no fetch(), no caching
  // Dynamic rendering guaranteed by connection() in the page
  await new Promise((r) => setTimeout(r, 180)); // simulate DB query
  return {
    activeUsers: 47,
    requestsPerMin: 312,
    errorRate: 0.2,
    p95Latency: 142,
  };
}

export async function LiveMetrics() {
  const metrics = await getLiveMetrics();

  const ITEMS = [
    {
      label: "Active Users",
      value: String(metrics.activeUsers),
      unit: "online",
    },
    {
      label: "Requests/min",
      value: String(metrics.requestsPerMin),
      unit: "req/min",
    },
    { label: "Error Rate", value: `${metrics.errorRate}%`, unit: "" },
    { label: "P95 Latency", value: `${metrics.p95Latency}ms`, unit: "" },
  ];

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Live Metrics</h3>
        <span
          className="text-xs bg-red-50 text-red-600 border border-red-200
                         px-2 py-0.5 rounded font-mono"
        >
          no-cache · direct DB
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {ITEMS.map((item) => (
          <div key={item.label} className="bg-white p-4">
            <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            {item.unit && <p className="text-xs text-gray-400">{item.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/live-dashboard/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CurrentUserBanner } from "./_components/current-user-banner";
import { CachedConfig } from "./_components/cached-config";
import { LiveMetrics } from "./_components/live-metrics";

export const metadata: Metadata = { title: "Live Dashboard" };

export default async function LiveDashboardPage() {
  // ─── Explicitly opt into dynamic rendering ────────────────────────────────
  // Makes intent clear: this page is INTENTIONALLY per-request
  // Necessary because LiveMetrics uses direct DB (no fetch to attach no-store to)
  await connection();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Dashboard</h1>
        <div
          className="flex items-center gap-1.5 text-xs text-red-600 font-medium
                        bg-red-50 border border-red-200 px-3 py-1.5 rounded-full"
        >
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Dynamic · Per-request
        </div>
      </div>

      {/* Always-fresh user data — cache: 'no-store' */}
      <Suspense
        fallback={<div className="h-16 bg-gray-200 rounded-xl animate-pulse" />}
      >
        <CurrentUserBanner />
      </Suspense>

      <div className="grid grid-cols-3 gap-4">
        {/* Static config — force-cache even in dynamic route */}
        <Suspense
          fallback={
            <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <CachedConfig />
        </Suspense>

        {/* Live metrics — direct DB, dynamic via connection() */}
        <div className="col-span-2">
          <Suspense
            fallback={
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="h-12 bg-gray-200 animate-pulse" />
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-4 h-20 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                      <div className="h-7 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <LiveMetrics />
          </Suspense>
        </div>
      </div>

      {/* Cache strategy legend */}
      <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs space-y-1.5">
        <p className="text-gray-400 font-bold text-white mb-2">
          Cache Strategy
        </p>
        <p>
          <span className="text-red-400">connection()</span>
          <span className="text-gray-400">
            {" "}
            → page forced dynamic, renders per-request
          </span>
        </p>
        <p>
          <span className="text-yellow-400">CurrentUserBanner</span>
          <span className="text-gray-400">
            {" "}
            → cache:no-store → always fresh from origin
          </span>
        </p>
        <p>
          <span className="text-green-400">CachedConfig</span>
          <span className="text-gray-400">
            {" "}
            → cache:force-cache → cached despite dynamic route
          </span>
        </p>
        <p>
          <span className="text-cyan-400">LiveMetrics</span>
          <span className="text-gray-400">
            {" "}
            → direct DB → dynamic via connection() above
          </span>
        </p>
      </div>
    </div>
  );
}

/*
  Build output: ƒ /live-dashboard  ← Dynamic ✅ (connection() detected)

  Per-request behavior:
  → CurrentUserBanner: origin fetch every request (cache: no-store)
  → CachedConfig:      served from Data Cache (force-cache)
  → LiveMetrics:       fresh DB query every request (connection())
*/
```

---

---
