# 9 — Proxy and Backend-for-Frontend (BFF) Patterns

---

## T — TL;DR

A **Backend-for-Frontend (BFF)** is a server layer that sits between your frontend and external APIs — aggregating, transforming, and securing requests so the browser never calls third-party APIs directly. In Next.js 16, Route Handlers implement the BFF pattern: they proxy requests, attach secrets, merge data sources, and return exactly what the UI needs.

---

## K — Key Concepts

### Why BFF? The Core Problems It Solves

```
Without BFF (frontend calls external API directly):
  ❌ API keys exposed in browser (anyone can see them in DevTools)
  ❌ Frontend receives ALL data — filters/shapes it with client-side code
  ❌ Multiple round-trips for related data (N+1 on the client)
  ❌ CORS issues — external APIs may not allow your origin
  ❌ No request aggregation — 4 endpoints = 4 network requests from browser
  ❌ Rate limits hit by browser — you can't pool them

With BFF (Next.js Route Handler proxies the calls):
  ✅ API keys stay on server — never exposed to browser
  ✅ Server shapes the response — frontend gets exactly what it needs
  ✅ Single browser request → server calls multiple APIs in parallel
  ✅ No CORS issues — server-to-server calls ignore browser CORS policy
  ✅ Rate limit pooling — server IP pool, not individual browser IPs
  ✅ Caching layer — server can cache expensive external API calls
```

### Simple Proxy — Forwarding Requests to External API

```tsx
// src/app/api/products/route.ts
// Proxy: browser calls /api/products → server calls external API with secret key

import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API = process.env.EXTERNAL_PRODUCTS_API_URL!;
const API_KEY = process.env.EXTERNAL_API_KEY!; // ← never exposed to browser

export async function GET(request: NextRequest) {
  // Forward search params to the external API
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${EXTERNAL_API}/products${searchParams ? `?${searchParams}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-API-Key": API_KEY, // ← server-side secret ✅
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "X-Client-Version": "2026-05",
      },
      next: { revalidate: 300, tags: ["external-products"] }, // ← cache the proxy response
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "External API error", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform response — frontend gets only what it needs
    const products = data.items.map((item: ExternalProduct) => ({
      id: item.product_id, // ← normalize field names
      name: item.display_name,
      price: item.price_usd / 100, // ← convert cents to dollars
      imageUrl: item.media?.cover_image?.url ?? null,
    }));

    return NextResponse.json(
      { data: products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("[BFF /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 502 }
    );
  }
}
```

### Data Aggregation BFF — Merge Multiple APIs

```tsx
// src/app/api/dashboard-summary/route.ts
// Aggregation: one browser request → three external API calls in parallel

import { NextRequest, NextResponse } from "next/server";

const CRM_URL = process.env.CRM_API_URL!;
const ANALYTICS_URL = process.env.ANALYTICS_API_URL!;
const BILLING_URL = process.env.BILLING_API_URL!;
const CRM_KEY = process.env.CRM_API_KEY!;
const ANALYTICS_KEY = process.env.ANALYTICS_API_KEY!;
const BILLING_KEY = process.env.BILLING_API_KEY!;

async function fetchCRMStats() {
  const res = await fetch(`${CRM_URL}/stats/monthly`, {
    headers: { "X-API-Key": CRM_KEY },
    next: { revalidate: 600, tags: ["crm-stats"] },
  });
  if (!res.ok) throw new Error(`CRM API error: ${res.status}`);
  return res.json();
}

async function fetchAnalytics() {
  const res = await fetch(`${ANALYTICS_URL}/summary?period=30d`, {
    headers: { Authorization: `Bearer ${ANALYTICS_KEY}` },
    next: { revalidate: 300, tags: ["analytics"] },
  });
  if (!res.ok) return null; // non-critical — graceful fallback
  return res.json();
}

async function fetchBillingOverview() {
  const res = await fetch(`${BILLING_URL}/overview`, {
    headers: { "X-Secret-Key": BILLING_KEY },
    next: { revalidate: 3600, tags: ["billing"] },
  });
  if (!res.ok) throw new Error(`Billing API error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    // Three external API calls → executed in parallel → one browser response
    const [crmRaw, analyticsRaw, billingRaw] = await Promise.allSettled([
      fetchCRMStats(),
      fetchAnalytics(),
      fetchBillingOverview(),
    ]);

    // Shape into exactly what the dashboard widget needs
    const summary = {
      customers: {
        total:
          crmRaw.status === "fulfilled" ? crmRaw.value.total_customers : null,
        newMonth:
          crmRaw.status === "fulfilled" ? crmRaw.value.new_this_month : null,
      },
      analytics:
        analyticsRaw.status === "fulfilled"
          ? {
              pageViews: analyticsRaw.value.page_views_30d,
              uniqueUsers: analyticsRaw.value.unique_visitors_30d,
              bounceRate: analyticsRaw.value.bounce_rate_pct,
            }
          : null,
      billing: {
        mrr:
          billingRaw.status === "fulfilled"
            ? billingRaw.value.mrr_cents / 100
            : null,
        nextInvoice:
          billingRaw.status === "fulfilled"
            ? billingRaw.value.next_invoice_date
            : null,
      },
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { data: summary },
      {
        headers: {
          // Short cache — dashboard data should be reasonably fresh
          "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[BFF /api/dashboard-summary]", error);
    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 502 }
    );
  }
}
```

### Auth-Enriched Proxy — Per-User External API Calls

```tsx
// src/app/api/user/orders/route.ts
// User-specific proxy: add session user context to external API calls

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  // Read user context injected by Middleware (no DB call needed)
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  try {
    const response = await fetch(
      `${process.env.ORDERS_API_URL}/users/${userId}/orders?page=${page}&limit=${limit}`,
      {
        headers: {
          "X-API-Key": process.env.ORDERS_API_KEY!, // ← server secret
          "X-User-Id": userId, // ← forward verified user ID
          "X-Request-Id":
            headerStore.get("x-request-id") ?? crypto.randomUUID(),
        },
        // User-specific: do NOT cache (different per user)
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not load orders" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize field names for the frontend
    const orders = data.results.map((o: ExternalOrder) => ({
      id: o.order_uuid,
      number: o.order_number,
      total: o.total_amount_cents / 100,
      currency: o.currency_code,
      status: o.fulfillment_status.toLowerCase(),
      createdAt: o.created_at_iso,
    }));

    return NextResponse.json({
      data: orders,
      meta: {
        page: data.page,
        total: data.total_count,
        hasMore: data.has_more,
      },
    });
  } catch (error) {
    console.error(`[BFF /api/user/orders] userId=${userId}`, error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 502 }
    );
  }
}
```

### BFF with Server Components — No Route Handler Needed

```tsx
// When your UI is a Server Component, you can skip the BFF Route Handler entirely
// The Server Component IS the BFF — it calls external APIs directly server-side

// src/app/(dashboard)/dashboard/analytics/page.tsx
// Server Component calling external analytics API directly
// API key never reaches the browser ✅

export default async function AnalyticsPage() {
  // Called directly from the Server Component — no /api/analytics route needed
  const [pageViews, conversions] = await Promise.all([
    fetch(`${process.env.ANALYTICS_API}/page-views?period=30d`, {
      headers: { Authorization: `Bearer ${process.env.ANALYTICS_KEY}` },
      next: { revalidate: 300, tags: ["analytics"] },
    }).then((r) => r.json()),

    fetch(`${process.env.ANALYTICS_API}/conversions?period=30d`, {
      headers: { Authorization: `Bearer ${process.env.ANALYTICS_KEY}` },
      next: { revalidate: 300, tags: ["analytics"] },
    }).then((r) => r.json()),
  ]);

  return <AnalyticsDashboard pageViews={pageViews} conversions={conversions} />;
}

// When to use Server Component vs BFF Route Handler:
// Server Component: data is for YOUR Next.js UI only, no external callers
// BFF Route Handler: data is needed by Client Components via TanStack Query,
//                    OR by mobile apps, OR by third-party consumers
```

### Caching Strategy in BFF Route Handlers

```tsx
// src/app/api/catalogue/route.ts
// BFF with layered caching

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  // Layer 1: Next.js Data Cache — cache the external API response
  const externalData = await fetch(
    `${process.env.CATALOGUE_API}/products?category=${category ?? "all"}`,
    {
      headers: { "X-API-Key": process.env.CATALOGUE_KEY! },
      next: {
        revalidate: 1800, // ← 30 min ISR
        tags: ["catalogue", `cat-${category ?? "all"}`],
      },
    }
  ).then((r) => r.json());

  const products = externalData.products.map(normalize);

  // Layer 2: HTTP response Cache-Control — CDN/browser cache
  return NextResponse.json(
    { data: products, total: products.length },
    {
      headers: {
        // CDN caches for 5 min, serves stale for 30 min while revalidating
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        // CDN varies cache by category query param
        Vary: "Accept-Encoding",
      },
    }
  );
}

function normalize(item: ExternalProduct) {
  return {
    id: item.sku,
    name: item.title,
    price: item.price_usd,
    imageUrl: item.images?.[0]?.url ?? null,
    inStock: item.inventory_count > 0,
  };
}
```

---

## W — Why It Matters

- The BFF pattern is a security requirement for production apps — API keys for services like Stripe, SendGrid, HubSpot, and Google Analytics must never appear in browser-side code. A Route Handler BFF keeps them server-side while giving the frontend clean, shaped data.
- Server Component direct API calls are even better than a BFF Route Handler when your client is Server Components — no extra HTTP hop, no route to maintain, and the Next.js Data Cache applies directly to the fetch. Only use a Route Handler BFF when Client Components need to call the API (via TanStack Query), or when external services need to call it.
- The aggregation pattern (one browser request → multiple parallel external API calls) directly reduces the user-perceived latency of data-heavy pages — a dashboard that previously made 4 sequential external calls from the browser (potentially 4 × 300ms = 1200ms) becomes one server request with parallel calls (max(300ms) = 300ms).

---

## I — Interview Q&A

### Q1: What is a Backend-for-Frontend and why is it useful in Next.js?

**A:** A Backend-for-Frontend (BFF) is a server layer that sits between the frontend and external APIs. In Next.js, Route Handlers implement this pattern. The BFF solves several problems: it keeps API keys and secrets on the server (never exposed to the browser), it aggregates multiple external API calls into a single browser request, it normalizes and shapes response data to match exactly what the UI needs, and it provides a caching layer for expensive external calls. Without a BFF, the browser would need to call external APIs directly — requiring CORS headers, exposing secrets, making multiple sequential requests, and receiving over-fetched data that must be filtered client-side.

### Q2: When should you use a Server Component to call external APIs directly vs a BFF Route Handler?

**A:** Use a Server Component directly when the data is only needed for Server-Rendered HTML — no Client Component will call the same data via fetch after hydration. The Server Component IS the BFF in this case: it fetches from the external API server-side (keys hidden, data shaped), renders HTML, and the browser never makes a separate API call. Use a BFF Route Handler when: Client Components need to fetch data after page load (e.g., via TanStack Query for polling or user-triggered refreshes); mobile apps or third-party services need to call the same endpoint; or when you need custom cache headers, CORS headers, or HTTP status codes in the response.

### Q3: How does a BFF Route Handler improve performance compared to the browser calling the external API directly?

**A:** Three ways. First, parallelization: the BFF calls multiple external APIs simultaneously on the server (`Promise.all`), reducing total time to `max(t1, t2, t3)` instead of `t1 + t2 + t3`. Second, proximity: the Next.js server (typically in the same data center or region as external APIs) has lower latency to external APIs than a user's browser in a different country. Third, caching: the BFF can cache external API responses using `next: { revalidate }` — cached responses serve in milliseconds without hitting the external API at all, regardless of how many browser requests come in.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Returning the raw external API response without validation

```tsx
// ❌ External API shape changes → frontend breaks silently
export async function GET() {
  const data = await fetch(EXTERNAL_URL, { headers: { ... } }).then(r => r.json())
  return NextResponse.json(data)   // ← raw pass-through — no shape guarantee
}
```

**Fix:** Validate and transform external responses with Zod:

```tsx
import { z } from 'zod'

const ExternalSchema = z.object({
  items: z.array(z.object({
    product_id:   z.string(),
    display_name: z.string(),
    price_usd:    z.number()
  }))
})

export async function GET() {
  const raw    = await fetch(EXTERNAL_URL, { headers: { ... } }).then(r => r.json())
  const parsed = ExternalSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[BFF] External API schema changed:', parsed.error)
    return NextResponse.json({ error: 'Data format error' }, { status: 502 })
  }

  const products = parsed.data.items.map(item => ({
    id:    item.product_id,
    name:  item.display_name,
    price: item.price_usd / 100
  }))

  return NextResponse.json({ data: products })
}
```

### ❌ Pitfall: Caching user-specific BFF responses with public Cache-Control

```tsx
// ❌ User A's orders cached and served to User B
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const orders = await fetchUserOrders(userId);
  return NextResponse.json(
    { data: orders },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300", // ← cached at CDN, shared across users ❌
      },
    }
  );
}
```

**Fix:** Use `private` or `no-store` for user-specific data:

```tsx
return NextResponse.json(
  { data: orders },
  {
    headers: {
      "Cache-Control": "private, no-store", // ← never cached at CDN ✅
    },
  }
);
```

### ❌ Pitfall: Not handling external API timeouts — hanging requests

```tsx
// ❌ External API hangs → your Route Handler hangs too → user waits forever
const data = await fetch(SLOW_EXTERNAL_API).then((r) => r.json());
```

**Fix:** Use `AbortController` with a timeout:

```tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

try {
  const data = await fetch(SLOW_EXTERNAL_API, {
    signal: controller.signal, // ← abort after 5s ✅
  }).then((r) => r.json());
  clearTimeout(timeoutId);
  return NextResponse.json({ data });
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    return NextResponse.json(
      { error: "External API timed out" },
      { status: 504 }
    );
  }
  return NextResponse.json({ error: "External API error" }, { status: 502 });
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `GET /api/bff/product-detail/[id]` BFF Route Handler that:

1. Calls three "external" API functions in parallel: `fetchExternalProduct(id)`, `fetchExternalReviews(id)`, `fetchExternalInventory(id)`
2. Uses `Promise.allSettled` for graceful degradation
3. Validates and normalizes each response
4. Adds a 5-second timeout on each external call via `AbortController`
5. Returns a single shaped response with correct `Cache-Control` for public (non-user-specific) product data
6. Returns `502` with descriptive error if the product fetch fails (critical), but still returns data if reviews or inventory fail (non-critical)

### Solution

```tsx
// src/app/api/bff/product-detail/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── External API schemas ─────────────────────────────────────────────────────
const ProductSchema = z.object({
  sku: z.string(),
  display_name: z.string(),
  description: z.string(),
  price_cents: z.number(),
  category: z.string(),
  images: z.array(z.object({ url: z.string() })).default([]),
});

const ReviewSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
      author: z.string(),
      created_at: z.string(),
    })
  ),
  avg_rating: z.number(),
  total: z.number(),
});

const InventorySchema = z.object({
  sku: z.string(),
  qty_on_hand: z.number(),
  warehouse: z.string(),
});

// ─── Fetch helpers with timeout ───────────────────────────────────────────────
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & { next?: object },
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ─── Mock "external" API functions ────────────────────────────────────────────
async function fetchExternalProduct(id: string) {
  // Simulated external call with variable latency
  await new Promise((r) => setTimeout(r, 120));
  const PRODUCTS: Record<string, unknown> = {
    p1: {
      sku: "p1",
      display_name: "Air Max 90",
      description: "Classic Nike shoe.",
      price_cents: 12000,
      category: "footwear",
      images: [{ url: "/shoes/air-max-90.jpg" }],
    },
    p2: {
      sku: "p2",
      display_name: "Canvas Tote",
      description: "Durable everyday bag.",
      price_cents: 4500,
      category: "bags",
      images: [],
    },
  };
  const product = PRODUCTS[id];
  if (!product) throw new Error(`Product ${id} not found`);
  return product;
}

async function fetchExternalReviews(id: string) {
  await new Promise((r) => setTimeout(r, 280));
  return {
    reviews: [
      {
        id: "r1",
        rating: 5,
        comment: "Excellent!",
        author: "Alice",
        created_at: "2026-05-01",
      },
      {
        id: "r2",
        rating: 4,
        comment: "Very good.",
        author: "Bob",
        created_at: "2026-05-03",
      },
    ],
    avg_rating: 4.5,
    total: 2,
  };
}

async function fetchExternalInventory(id: string) {
  await new Promise((r) => setTimeout(r, 80));
  return { sku: id, qty_on_hand: 23, warehouse: "US-WEST" };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parallel external calls with timeout — all start at t=0
  const [productResult, reviewsResult, inventoryResult] =
    await Promise.allSettled([
      fetchWithTimeout(
        `https://products-api.example.com/products/${id}`,
        {
          headers: { "X-API-Key": process.env.PRODUCTS_API_KEY ?? "dev-key" },
          // In real app, use actual fetch; here call our mock directly
        },
        5000
      ).catch(() => fetchExternalProduct(id)), // ← use mock in demo

      fetchWithTimeout(
        `https://reviews-api.example.com/products/${id}/reviews`,
        { headers: { "X-API-Key": process.env.REVIEWS_API_KEY ?? "dev-key" } },
        5000
      ).catch(() => fetchExternalReviews(id)),

      fetchWithTimeout(
        `https://inventory-api.example.com/inventory/${id}`,
        {
          headers: { "X-API-Key": process.env.INVENTORY_API_KEY ?? "dev-key" },
        },
        5000
      ).catch(() => fetchExternalInventory(id)),
    ]);

  // ─── Critical: product must succeed
  if (productResult.status === "rejected") {
    console.error(
      `[BFF product-detail] Product fetch failed for id=${id}:`,
      productResult.reason
    );
    return NextResponse.json(
      { error: "Product not found or unavailable" },
      { status: 502 }
    );
  }

  // ─── Validate product (critical)
  const productParsed = ProductSchema.safeParse(productResult.value);
  if (!productParsed.success) {
    console.error(
      "[BFF product-detail] Invalid product schema:",
      productParsed.error
    );
    return NextResponse.json(
      { error: "Product data format error" },
      { status: 502 }
    );
  }

  // ─── Non-critical: reviews and inventory degrade gracefully
  const reviewsParsed =
    reviewsResult.status === "fulfilled"
      ? ReviewSchema.safeParse(reviewsResult.value)
      : null;

  const inventoryParsed =
    inventoryResult.status === "fulfilled"
      ? InventorySchema.safeParse(inventoryResult.value)
      : null;

  if (reviewsResult.status === "rejected") {
    console.warn(
      `[BFF product-detail] Reviews fetch failed for id=${id}:`,
      reviewsResult.reason
    );
  }
  if (inventoryResult.status === "rejected") {
    console.warn(
      `[BFF product-detail] Inventory fetch failed for id=${id}:`,
      inventoryResult.reason
    );
  }

  // ─── Shape into exactly what the frontend needs
  const p = productParsed.data;

  const shaped = {
    id: p.sku,
    name: p.display_name,
    description: p.description,
    price: p.price_cents / 100, // ← cents → dollars
    priceFormatted: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(p.price_cents / 100),
    category: p.category,
    imageUrl: p.images[0]?.url ?? null,

    // Non-critical fields — null if fetch or validation failed
    reviews: reviewsParsed?.success
      ? {
          items: reviewsParsed.data.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            author: r.author,
            createdAt: r.created_at,
          })),
          avgRating: reviewsParsed.data.avg_rating,
          total: reviewsParsed.data.total,
        }
      : null,

    inventory: inventoryParsed?.success
      ? {
          inStock: inventoryParsed.data.qty_on_hand > 0,
          quantity: inventoryParsed.data.qty_on_hand,
          warehouse: inventoryParsed.data.warehouse,
        }
      : null,

    // Metadata for debugging
    meta: {
      fetchedAt: new Date().toISOString(),
      reviewsAvailable: reviewsParsed?.success ?? false,
      inventoryAvailable: inventoryParsed?.success ?? false,
    },
  };

  return NextResponse.json(
    { data: shaped },
    {
      headers: {
        // Public product data: CDN cache 5 min, stale-while-revalidate 30 min
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        "X-Product-Id": id,
      },
    }
  );
}

/*
  BFF behavior breakdown:
  ─────────────────────────────────────────────────────────────────────
  Browser sends: GET /api/bff/product-detail/p1

  Server:
    t=0ms   fetchExternalProduct + fetchExternalReviews + fetchExternalInventory start
    t=80ms  inventory resolves ✅
    t=120ms product resolves  ✅
    t=280ms reviews resolves  ✅
    t=280ms all settled → shape response

  Total: ~280ms (parallel) vs ~480ms (sequential)

  Failures:
    product fails   → 502 immediately (critical) ✅
    reviews fails   → reviews: null in response (non-critical) ✅
    inventory fails → inventory: null in response (non-critical) ✅

  Security:
    API keys: server-side only, never in browser ✅
    Response: shaped — no raw external API data exposed ✅
    Cache: public (non-user-specific product data) ✅
  ─────────────────────────────────────────────────────────────────────
*/
```

---

---
