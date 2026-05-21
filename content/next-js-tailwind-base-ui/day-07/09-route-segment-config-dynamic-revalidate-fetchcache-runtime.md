# 9 — Route Segment Config — `dynamic`, `revalidate`, `fetchCache`, `runtime`

---

## T — TL;DR

Route segment config exports are special constants in `page.tsx`, `layout.tsx`, and `route.ts` files that control rendering strategy, caching behavior, runtime environment, and request timeouts for that entire route segment — overriding any per-fetch settings.

---

## K — Key Concepts

### All Route Segment Config Options

```tsx
// These are exported constants that Next.js reads at build time
// Place them at the top of page.tsx, layout.tsx, or route.ts

// ─── 1. dynamic — rendering strategy
export const dynamic = "auto"; // default: auto-detect
export const dynamic = "force-dynamic"; // always dynamic (per-request)
export const dynamic = "force-static"; // always static (ignore dynamic APIs)
export const dynamic = "error"; // throw error if dynamic APIs used

// ─── 2. revalidate — ISR interval
export const revalidate = false; // default: never auto-revalidate
export const revalidate = 0; // revalidate immediately (near-dynamic)
export const revalidate = 60; // revalidate after 60 seconds
export const revalidate = 3600; // revalidate after 1 hour
export const revalidate = Infinity; // never auto-revalidate (same as false)

// ─── 3. fetchCache — default cache behavior for ALL fetch() calls in route
export const fetchCache = "auto"; // default
export const fetchCache = "default-cache"; // cache unless fetch specifies otherwise
export const fetchCache = "only-cache"; // error if any fetch opts out of cache
export const fetchCache = "force-cache"; // force ALL fetches to use cache
export const fetchCache = "default-no-store"; // no-store unless fetch specifies otherwise
export const fetchCache = "only-no-store"; // error if any fetch uses cache
export const fetchCache = "force-no-store"; // force ALL fetches to bypass cache

// ─── 4. runtime — compute environment
export const runtime = "nodejs"; // default: Node.js runtime (full Node APIs)
export const runtime = "edge"; // Edge runtime (lighter, faster, limited APIs)

// ─── 5. preferredRegion — deployment region (Vercel-specific)
export const preferredRegion = "auto";
export const preferredRegion = "global";
export const preferredRegion = "home";
export const preferredRegion = ["iad1", "sfo1"]; // specific regions

// ─── 6. maxDuration — request timeout in seconds
export const maxDuration = 30; // default varies by plan/runtime
export const maxDuration = 300; // 5 minutes (for long-running server actions)

// ─── 7. dynamicParams — for routes with generateStaticParams
export const dynamicParams = true; // default: render unknown params on demand
export const dynamicParams = false; // 404 for params not in generateStaticParams
```

### `dynamic` — The Most Important Config

```tsx
// ─── force-dynamic: always fresh, always per-request
// src/app/admin/dashboard/page.tsx
export const dynamic = "force-dynamic";

// Use when:
// → A/B testing (different content per user)
// → Admin pages that must show latest data always
// → Pages where caching is dangerous (security)
// → You want SSR behavior equivalent to Pages Router getServerSideProps

// ─── force-static: always pre-rendered, even if dynamic APIs are present
// src/app/marketing/[locale]/page.tsx
export const dynamic = "force-static";

// Use when:
// → Locale-based pages that are identical for each locale
// → pages that technically access cookies but don't NEED to for rendering
// → Warning: cookies(), headers() return empty/undefined when force-static

// ─── error: safeguard — fail the build if dynamic APIs are accidentally used
// src/app/blog/[slug]/page.tsx
export const dynamic = "error";

// Use when:
// → You want to GUARANTEE a page is static
// → Accidental use of cookies() or headers() should be a build error
// → Good for critical marketing/landing pages
```

### `fetchCache` — Route-Level Fetch Default

```tsx
// ─── force-no-store: make ALL fetches in this route bypass cache
// src/app/admin/reports/page.tsx
export const fetchCache = "force-no-store";

// Now every fetch in this route behaves as if { cache: 'no-store' } was set
// Even if individual fetches have next: { revalidate } — all are bypassed
// Useful: admin pages where stale data is never acceptable

export default async function AdminReportsPage() {
  const report = await fetch("/api/reports/summary").then((r) => r.json());
  // ↑ behaves as cache: 'no-store' because of fetchCache: 'force-no-store'

  const audit = await fetch("/api/audit/recent").then((r) => r.json());
  // ↑ also behaves as cache: 'no-store'

  return <AdminReports report={report} audit={audit} />;
}
```

```tsx
// ─── only-cache: enforce that ALL fetches use cache (fail if any opt out)
// src/app/blog/[slug]/page.tsx
export const fetchCache = "only-cache";

// If any fetch uses cache: 'no-store' → build error
// Good for: ensuring no accidental dynamic fetches in a static page
```

### `runtime` — Node.js vs Edge

```tsx
// Node.js runtime (default):
// ✅ Full Node.js API (fs, crypto, Buffer, etc.)
// ✅ All npm packages work
// ✅ Prisma, bcrypt, etc.
// ❌ Slightly slower cold starts

// Edge runtime:
// ✅ Faster cold starts (~0ms vs ~100ms)
// ✅ Closer to users (runs at CDN edge)
// ✅ Web APIs only (fetch, Request, Response, URL, etc.)
// ❌ No Node.js APIs (no fs, no Buffer, no crypto)
// ❌ Many npm packages don't work (anything using Node built-ins)
// ❌ No Prisma, no bcrypt, no heavy libraries

// ─── Edge runtime for lightweight pages
// src/app/api/health/route.ts
export const runtime = "edge"; // fast health check endpoint

export async function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

```tsx
// ─── Edge runtime for middleware-like pages
// src/app/auth/verify/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  // JWT verification using Web Crypto API (available in Edge)
  const isValid = await verifyJWT(token);

  return NextResponse.json({ valid: isValid });
}
```

### `maxDuration` — Request Timeouts

```tsx
// src/app/api/ai/generate/route.ts
// AI generation can take minutes — increase timeout
export const maxDuration = 300; // 5 minutes (max on Vercel Pro)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const result = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return NextResponse.json({ content: result.choices[0].message.content });
}
```

```tsx
// src/app/api/pdf/export/route.ts
// PDF generation — needs more than default timeout
export const maxDuration = 60; // 1 minute
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { data } = await request.json();
  const pdf = await generatePDF(data); // can take 30-50s for large reports
  return new NextResponse(pdf, {
    headers: { "Content-Type": "application/pdf" },
  });
}
```

### Config Priority — Who Wins

```
Lowest specificity → Highest specificity
─────────────────────────────────────────────────────────────────────
fetchCache (route default)
  ↓ overridden by
individual fetch() cache option { cache: 'no-store' }
  ↓ overridden by
dynamic = 'force-dynamic' (entire route)

revalidate hierarchy (lowest value wins):
  route segment revalidate: 3600
    ↓ a fetch with revalidate: 60
      → route uses 60 (fastest wins)
```

---

## W — Why It Matters

- `dynamic = 'error'` is the underused guardian for critical static pages — if someone accidentally adds `cookies()` to a marketing landing page or blog post, the build fails immediately instead of silently degrading performance in production.
- `fetchCache = 'force-no-store'` is cleaner than adding `cache: 'no-store'` to every fetch in an admin page — a single export at the top of the file ensures every data fetch in the route is always fresh without having to audit each fetch call.
- The `runtime = 'edge'` choice is a performance optimization for appropriate routes — lightweight API endpoints and auth-related routes see significant cold start improvements on edge runtimes, but it requires careful attention to which npm packages and Node APIs are being used.

---

## I — Interview Q&A

### Q1: What is the difference between `dynamic = 'force-dynamic'` and `cache: 'no-store'` on a fetch?

**A:** `dynamic = 'force-dynamic'` is a route-level declaration that forces the entire route to render dynamically on every request — it affects the Full Route Cache, the rendering pipeline, and signals to Next.js that this route should never be pre-rendered. `cache: 'no-store'` on a fetch is a data-level directive that bypasses the Data Cache for that specific HTTP request — as a side effect, it also forces the route to be dynamic. The difference: `force-dynamic` is an explicit, intentional architectural decision visible at a glance; `cache: 'no-store'` is a per-fetch optimization that has a route-level side effect. Use `force-dynamic` when the whole page should be dynamic; use `cache: 'no-store'` when specific data needs to bypass the cache.

### Q2: When should you choose `runtime = 'edge'` over the default Node.js runtime?

**A:** Use Edge runtime for lightweight, latency-sensitive routes that don't need Node.js APIs — simple API endpoints, authentication token verification, geolocation-based redirects, and feature flag lookups. The benefits are faster cold starts (~0ms vs ~100ms for Node.js) and closer proximity to users. Avoid Edge runtime when your code uses Node.js built-ins (`fs`, `Buffer`, `crypto`), Prisma, bcrypt, or any npm package that depends on Node.js internals — these will fail silently or throw at runtime in Edge. When in doubt, use Node.js; only switch to Edge after profiling confirms cold starts are a meaningful bottleneck.

### Q3: What does `dynamic = 'error'` do and when is it useful?

**A:** `dynamic = 'error'` tells Next.js to throw a build-time error if the route uses any dynamic APIs — `cookies()`, `headers()`, `searchParams`, or `cache: 'no-store'`. It's a static correctness guarantee — if someone modifies a route that must be static and accidentally introduces dynamic behavior, the build fails immediately with a clear error rather than silently converting a CDN-served page into a per-request server render. Use it for critical static pages like landing pages, blog posts, and documentation where static rendering is a performance requirement that must not be accidentally broken.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting `runtime = 'edge'` and using Prisma or Node.js APIs

```tsx
// ❌ Prisma uses Node.js internals — not available in Edge runtime
export const runtime = "edge";

export default async function Page() {
  const users = await db.user.findMany(); // ← Prisma fails in Edge
  // Error: "PrismaClient is not available in Edge runtime"
}
```

**Fix:** Only use Edge runtime for routes that are truly edge-compatible:

```tsx
// ✅ Keep Node.js for DB access
export const runtime = "nodejs"; // default — Prisma works fine

// ✅ OR: move DB query to a separate Node.js API route, fetch from Edge
export const runtime = "edge";
const users = await fetch("/api/users").then((r) => r.json()); // calls Node.js API
```

### ❌ Pitfall: Setting `revalidate = false` thinking it means "dynamic"

```tsx
// ❌ false means "never auto-revalidate" — not "always dynamic"
export const revalidate = false;

// This means the page is STATIC and only revalidated manually
// It does NOT mean "render per-request"
// For dynamic: use dynamic = 'force-dynamic'
```

**Fix:**

```tsx
export const dynamic = "force-dynamic"; // ← truly dynamic ✅
// OR
export const revalidate = 0; // ← expire immediately (near-dynamic) ✅
```

### ❌ Pitfall: Using `fetchCache = 'force-no-store'` on pages that should be static

```tsx
// ❌ Entire blog post route becomes dynamic — defeats ISR
// src/app/blog/[slug]/page.tsx
export const fetchCache = "force-no-store"; // ← ALL fetches bypass cache
// Blog post re-renders on every request — no CDN benefit
```

**Fix:** Only use `force-no-store` for intentionally dynamic routes like admin pages:

```tsx
// ✅ Blog post uses ISR
// src/app/blog/[slug]/page.tsx
export const revalidate = 3600; // ← ISR ✅

// ✅ Admin page uses force-no-store
// src/app/admin/reports/page.tsx
export const fetchCache = "force-no-store"; // ← always fresh ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create three routes that each demonstrate a different segment config combination:

1. `/blog/[slug]` — `dynamic: 'error'` + `revalidate: 3600` (must be static, fail on dynamic APIs)
2. `/admin/reports` — `dynamic: 'force-dynamic'` + `fetchCache: 'force-no-store'` (always fresh)
3. `/api/health` — `runtime: 'edge'` + `dynamic: 'force-static'` (fastest possible health check)

### Solution

```tsx
// src/app/blog/[slug]/page.tsx
// ─── Config: static correctness guarantee ─────────────────────────────────────
export const dynamic = "error"; // ← BUILD FAILS if dynamic APIs used accidentally
export const revalidate = 3600; // ← ISR: 1 hour

// If a developer adds cookies() here → build error:
// "Route /blog/[slug] with `dynamic = "error"` cannot use dynamic APIs"

import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

const POSTS: Record<string, { title: string; body: string }> = {
  "nextjs-16": { title: "Next.js 16 Guide", body: "Content..." },
  "typescript-6": { title: "TypeScript 6 Guide", body: "Content..." },
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

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-2">
        <span className="text-xs text-green-600 font-mono bg-green-50 px-2 py-0.5 rounded">
          dynamic=error · revalidate=3600
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-600">{post.body}</p>
    </article>
  );
}
```

```tsx
// src/app/admin/reports/page.tsx
// ─── Config: always fresh, no caching at all ──────────────────────────────────
export const dynamic = "force-dynamic"; // ← per-request rendering
export const fetchCache = "force-no-store"; // ← all fetches bypass cache

// No need to add cache: 'no-store' to individual fetches —
// fetchCache: 'force-no-store' handles them all

async function getReportSummary() {
  // In production: await db.reports.getSummary()
  return {
    totalRevenue: 78400,
    totalOrders: 531,
    avgOrderValue: 147,
    generatedAt: new Date().toISOString(), // ← changes every render → proves dynamic
  };
}

async function getRecentAuditLog() {
  return [
    { id: 1, action: "Product updated", user: "admin@co.com", at: "2m ago" },
    { id: 2, action: "User role changed", user: "admin@co.com", at: "14m ago" },
    { id: 3, action: "Order refunded", user: "support@co.com", at: "1h ago" },
  ];
}

export default async function AdminReportsPage() {
  const [summary, auditLog] = await Promise.all([
    getReportSummary(),
    getRecentAuditLog(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Reports</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">
            force-dynamic · fetchCache=force-no-store
          </span>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Report Summary</h2>
          <p className="text-xs text-gray-400 font-mono">
            Generated: {new Date(summary.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Revenue",
              value: `$${summary.totalRevenue.toLocaleString()}`,
            },
            { label: "Orders", value: String(summary.totalOrders) },
            { label: "Avg Order", value: `$${summary.avgOrderValue}` },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Audit Log</h2>
        </div>
        <ul className="divide-y">
          {auditLog.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{entry.action}</p>
                <p className="text-xs text-gray-400">{entry.user}</p>
              </div>
              <span className="text-xs text-gray-400">{entry.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

```tsx
// src/app/api/health/route.ts
// ─── Config: fastest possible response ────────────────────────────────────────
export const runtime = "edge"; // ← ~0ms cold start
export const dynamic = "force-static"; // ← cached at CDN edge, instant

import { NextResponse } from "next/server";

// Health check — built at deploy time, served from edge cache
// Response time: ~1ms from CDN edge worldwide
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "acme-api",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Runtime": "edge",
      },
    }
  );
}

/*
  Expected behavior:
  ─────────────────────────────────────────────────────────
  /api/health GET
    → runtime: edge     → cold start ~0ms ✅
    → force-static      → cached at edge CDN ✅
    → Response: ~1ms from nearest edge location ✅
    → Cache-Control: serves cached response for 60s,
      stale-while-revalidate for 5 minutes ✅
*/
```

---

---
