# 7 — `revalidateTag` and `unstable_cache` — Tag-Based Invalidation

---

## T — TL;DR

`revalidateTag` purges all cached data tagged with a specific string — in one call, you can refresh multiple pages and multiple fetch responses that share the same tag. `unstable_cache` (now `cacheTag` / `cacheLife` APIs in Next.js 15+) applies Next.js cache semantics to **any async function** — not just `fetch()` — enabling direct DB calls to participate in the cache system.

---

## K — Key Concepts

### `revalidateTag` — Tag-Based Cache Purge

```tsx
// src/app/products/actions.ts
"use server";

import { revalidateTag } from "next/cache";

// When ANY product changes → revalidate everything tagged 'products'
export async function updateProduct(id: string, data: Partial<Product>) {
  await db.product.update({ where: { id }, data });

  revalidateTag("products"); // ← clears ALL fetches tagged 'products'
  revalidateTag(`product-${id}`); // ← clears fetches tagged with this specific ID
}

// When user data changes → revalidate their specific data
export async function updateUserProfile(userId: string, data: ProfileData) {
  await db.user.update({ where: { id: userId }, data });

  revalidateTag(`user-${userId}`); // ← only this user's cached data
}
```

### Tagging `fetch()` Calls

```tsx
// Tag fetches so revalidateTag knows what to clear

// Products list — tagged 'products'
const products = await fetch(`${API_URL}/products`, {
  next: {
    revalidate: 3600,
    tags: ["products"], // ← tagged
  },
}).then((r) => r.json());

// Specific product — tagged with both 'products' AND the specific ID
const product = await fetch(`${API_URL}/products/${id}`, {
  next: {
    revalidate: 3600,
    tags: ["products", `product-${id}`], // ← multiple tags
  },
}).then((r) => r.json());

// Now:
// revalidateTag('products')      → clears products list AND all product detail pages
// revalidateTag('product-abc')   → clears ONLY /products/abc (surgical)
```

### `unstable_cache` — Cache Any Async Function

```tsx
// unstable_cache extends Next.js cache semantics to ANY async function
// This is the way to cache direct database calls (non-fetch)

import { unstable_cache } from "next/cache";

// ─── Basic usage
const getCachedProducts = unstable_cache(
  async () => {
    // Direct DB call — no fetch() involved
    return db.product.findMany({ where: { status: "active" } });
  },
  ["products-list"], // cache key segments
  {
    revalidate: 3600, // ISR: revalidate after 1 hour
    tags: ["products"], // on-demand: revalidateTag('products')
  }
);

// Usage in Server Component:
export default async function ProductsPage() {
  const products = await getCachedProducts(); // ← cached DB call
  return <ProductList products={products} />;
}
```

```tsx
// ─── With dynamic cache key (per-user or per-resource)
const getCachedProduct = unstable_cache(
  async (id: string) => {
    return db.product.findUnique({ where: { id } });
  },
  ["product"], // ← prefix
  {
    revalidate: 1800,
    // tags added dynamically in the function body (see cacheTag below)
  }
);

// ─── With dynamic tags using cacheTag (Next.js 15+)
import { unstable_cache, cacheTag, cacheLife } from "next/cache";

const getCachedProductV2 = unstable_cache(
  async (id: string) => {
    "use cache"; // ← Next.js 15+ directive (if using the new cache API)
    cacheTag(`product-${id}`, "products"); // ← dynamic per-item tags
    cacheLife("hours"); // ← semantic revalidation interval
    return db.product.findUnique({ where: { id } });
  },
  ["product-v2"]
);
```

### `revalidateTag` in Webhook Handlers

```tsx
// src/app/api/webhooks/products/route.ts
// Called by your CMS or PIM (Product Information Management) system

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.PRODUCTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    event: "product.created" | "product.updated" | "product.deleted";
    productId: string;
  };

  switch (body.event) {
    case "product.created":
      // New product: revalidate list only (detail page doesn't exist yet)
      revalidateTag("products");
      break;

    case "product.updated":
      // Updated: revalidate both list AND the specific product page
      revalidateTag("products");
      revalidateTag(`product-${body.productId}`);
      break;

    case "product.deleted":
      // Deleted: revalidate list (product detail will 404 naturally)
      revalidateTag("products");
      break;
  }

  return NextResponse.json({ revalidated: true, event: body.event });
}
```

### `revalidatePath` vs `revalidateTag` — When to Use Each

```
revalidatePath:
  ✅ You know the exact URL that changed
  ✅ You need to clear a specific page and its children (layout type)
  ✅ After mutations in Server Actions where the URL is predictable
  ❌ Doesn't help when same data appears at many unknown URLs

revalidateTag:
  ✅ Same data appears on MULTIPLE pages (product list + detail + homepage)
  ✅ You want to clear ALL pages using a data source at once
  ✅ CMS/webhook integration — clear by content type, not URL
  ✅ Fine-grained: revalidateTag('product-123') for surgical updates
  ✅ Combined with unstable_cache for DB-backed caching

Rule: use revalidatePath for page-level mutations
      use revalidateTag for data-level mutations spanning many pages
```

---

## W — Why It Matters

- `revalidateTag` is the production-grade cache invalidation tool — when a product changes, you want to clear the product list, the product detail page, and any homepage section showing featured products — all in one `revalidateTag('products')` call instead of three `revalidatePath` calls.
- `unstable_cache` is essential for direct database queries — `fetch()` is enhanced by Next.js, but `db.product.findMany()` is not a `fetch()` call. Without `unstable_cache`, direct DB queries in Server Components are never cached across requests (only within a request via `React.cache()`).
- The tag hierarchy (`'products'` + `'product-${id}'`) enables both surgical (one product) and broad (all products) invalidation from the same cache system — you choose the granularity of invalidation at the call site.

---

## I — Interview Q&A

### Q1: When should you use `revalidateTag` instead of `revalidatePath`?

**A:** Use `revalidateTag` when the same data appears on multiple pages and you want to invalidate all of them at once with a single call. For example, product data appears on the product list page, each product detail page, and possibly the homepage featured section — `revalidateTag('products')` clears all of them simultaneously. Use `revalidatePath` when you know the exact URL that was affected and only that URL needs clearing. In practice: use tags for data-centric invalidation (what changed), paths for page-centric invalidation (which URL changed).

### Q2: What is `unstable_cache` and why is it needed?

**A:** `unstable_cache` is a Next.js utility that applies the Data Cache layer to any async function — not just `fetch()` calls. The built-in `fetch()` enhancement only works with HTTP requests. But most production Next.js apps use direct database clients (Prisma, Drizzle) for data access — these are plain JavaScript function calls that Next.js doesn't intercept for caching. `unstable_cache` wraps them, allowing `revalidate` intervals and `tags` for on-demand invalidation, giving direct DB queries the same ISR and tag-based revalidation capabilities as `fetch()`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `revalidateTag` without tagging the fetch in the first place

```tsx
// ❌ Calling revalidateTag('products') but the fetch has no tag
const products = await fetch(`${API_URL}/products`, {
  next: { revalidate: 3600 }, // ← no tags! revalidateTag does nothing
}).then((r) => r.json());

// Server Action:
revalidateTag("products"); // ← has no effect — nothing is tagged 'products'
```

**Fix:** Always add tags to fetches you want to revalidate on-demand:

```tsx
const products = await fetch(`${API_URL}/products`, {
  next: {
    revalidate: 3600,
    tags: ["products"], // ← tagged ✅
  },
}).then((r) => r.json());
```

### ❌ Pitfall: Not keying `unstable_cache` correctly for dynamic data

```tsx
// ❌ Same cache key for all products — every product overwrites the same cache entry
const getCachedProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ["product"], // ← same key for ALL ids → cache collision
  { revalidate: 3600 }
);

// getCachedProduct('prod-1')  → stores under key ['product']
// getCachedProduct('prod-2')  → OVERWRITES prod-1 in cache
// getCachedProduct('prod-1')  → returns prod-2's data ❌
```

**Fix:** Include dynamic parameters in the cache key array:

```tsx
// ✅ Each product gets its own cache entry
const getCachedProduct = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ["product", id], // ← id included in key → unique entry per product ✅
  {
    revalidate: 3600,
    tags: ["products", `product-${id}`],
  }
);
```

But wait — `id` isn't in scope when defining the wrapped function. The correct pattern:

```tsx
// ✅ Correct: create a factory that includes the id in the key
function getCachedProduct(id: string) {
  return unstable_cache(
    () => db.product.findUnique({ where: { id } }),
    ["product", id], // ← unique key per id ✅
    {
      revalidate: 3600,
      tags: ["products", `product-${id}`],
    }
  )();
}

// Usage:
const product = await getCachedProduct("prod-1"); // key: ['product', 'prod-1']
const product = await getCachedProduct("prod-2"); // key: ['product', 'prod-2']
```

### ❌ Pitfall: Calling `revalidateTag` with a tag that contains special characters

```tsx
// ❌ Tags with spaces, slashes, or special chars can cause issues
revalidateTag("user data"); // ← space in tag name
revalidateTag("products/shoes"); // ← slash in tag name
revalidateTag("category:footwear"); // ← colon in tag name
```

**Fix:** Use simple, consistent tag naming conventions — kebab-case or hyphen-separated:

```tsx
// ✅ Consistent tag naming
revalidateTag("user-data");
revalidateTag("products-shoes");
revalidateTag("category-footwear");
revalidateTag(`product-${id}`); // ← dynamic but safe format

// Convention: [resource]-[optional-modifier]-[optional-id]
// 'products'
// 'product-featured'
// `product-${id}`
// `user-${userId}-orders`
```

### ❌ Pitfall: Forgetting `unstable_cache` is a server-only utility

```tsx
"use client";
import { unstable_cache } from "next/cache"; // ❌ runtime error in browser

export function ClientComponent() {
  const getData = unstable_cache(/* ... */); // ← not available client-side
}
```

**Fix:** `unstable_cache` belongs exclusively in Server Components, Server Actions, and Route Handlers:

```tsx
// ✅ Server Component only
// src/lib/cached-queries.ts  (no 'use client' — server-only file)
import "server-only";
import { unstable_cache } from "next/cache";

export const getCachedProducts = unstable_cache(
  async () => db.product.findMany(),
  ["products-list"],
  { revalidate: 3600, tags: ["products"] }
);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a product catalog system with:

1. `getCachedProducts()` — `unstable_cache` wrapping a direct DB call, tagged `'products'`
2. `getCachedProduct(id)` — factory pattern, tagged `['products', 'product-${id}']`
3. `getCachedFeatured()` — separate unstable_cache, tagged `['products', 'featured']`
4. A `ProductsWebhookHandler` route that calls the right `revalidateTag` based on event type
5. Server Actions: `updateProduct`, `featureProduct` each calling the right tags
6. Demonstrate: one `revalidateTag('products')` clears ALL three caches simultaneously

### Solution

```tsx
// src/lib/cached-product-queries.ts
import "server-only";
import { unstable_cache } from "next/cache";

// Simulated DB
const DB = {
  products: [
    {
      id: "p1",
      name: "Air Max 90",
      price: 120,
      featured: true,
      status: "active",
    },
    {
      id: "p2",
      name: "Canvas Tote",
      price: 45,
      featured: false,
      status: "active",
    },
    { id: "p3", name: "Wool Cap", price: 35, featured: true, status: "active" },
    {
      id: "p4",
      name: "Leather Bag",
      price: 220,
      featured: false,
      status: "active",
    },
  ],
};

// ─── 1. All products — tagged 'products' ──────────────────────────────────────
export const getCachedProducts = unstable_cache(
  async () => {
    console.log("[DB] getProducts query executed");
    return DB.products.filter((p) => p.status === "active");
  },
  ["products-list"], // ← cache key
  {
    revalidate: 3600,
    tags: ["products"], // ← revalidateTag('products') clears this ✅
  }
);

// ─── 2. Single product — factory pattern with unique key per id ───────────────
export function getCachedProduct(id: string) {
  return unstable_cache(
    async () => {
      console.log(`[DB] getProduct(${id}) query executed`);
      return DB.products.find((p) => p.id === id) ?? null;
    },
    ["product", id], // ← unique cache key per product
    {
      revalidate: 3600,
      tags: ["products", `product-${id}`],
      // revalidateTag('products')      → clears ALL products ✅
      // revalidateTag('product-p1')   → clears ONLY product p1 ✅
    }
  )();
}

// ─── 3. Featured products — separate cache, tagged 'featured' too ─────────────
export const getCachedFeatured = unstable_cache(
  async () => {
    console.log("[DB] getFeatured query executed");
    return DB.products.filter((p) => p.featured && p.status === "active");
  },
  ["products-featured"], // ← separate cache key
  {
    revalidate: 1800, // ← shorter revalidation (featured changes more often)
    tags: ["products", "featured"],
    // revalidateTag('products') → clears this too ✅
    // revalidateTag('featured') → clears ONLY featured ✅
  }
);
```

```tsx
// src/app/products/actions.ts
"use server";

import { revalidateTag } from "next/cache";

// Update product — surgical: only this product + the list
export async function updateProduct(
  id: string,
  data: { name?: string; price?: number }
): Promise<{ success: boolean; message: string }> {
  try {
    // await db.product.update({ where: { id }, data })
    await new Promise((r) => setTimeout(r, 200)); // simulate DB
    console.log(`Updated product ${id}:`, data);

    revalidateTag(`product-${id}`); // ← surgical: only this product's detail page
    revalidateTag("products"); // ← list pages (name/price shown in listings)

    return { success: true, message: `Product ${id} updated` };
  } catch {
    return { success: false, message: "Update failed" };
  }
}

// Feature product — clears featured + product-specific + general list
export async function featureProduct(
  id: string,
  featured: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // await db.product.update({ where: { id }, data: { featured } })
    await new Promise((r) => setTimeout(r, 150));
    console.log(`${featured ? "Featured" : "Unfeatured"} product ${id}`);

    revalidateTag("featured"); // ← featured list changed ✅
    revalidateTag(`product-${id}`); // ← this product's detail page ✅
    // NOT revalidateTag('products') — non-featured list unchanged

    return {
      success: true,
      message: `Product ${id} ${featured ? "featured" : "unfeatured"}`,
    };
  } catch {
    return { success: false, message: "Action failed" };
  }
}

// Bulk sync — clears everything product-related at once
export async function syncAllProducts(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // await productSyncService.syncAll()
    await new Promise((r) => setTimeout(r, 800));
    console.log("Full product sync complete");

    // ONE tag to clear ALL three caches simultaneously:
    // getCachedProducts    (tagged 'products') ← cleared ✅
    // getCachedProduct(id) (tagged 'products') ← ALL cleared ✅
    // getCachedFeatured    (tagged 'products') ← cleared ✅
    revalidateTag("products");

    return { success: true, message: "All product caches cleared" };
  } catch {
    return { success: false, message: "Sync failed" };
  }
}
```

```tsx
// src/app/api/webhooks/products/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type ProductEvent =
  | { event: "product.created"; productId: string }
  | { event: "product.updated"; fields: string[]; productId: string }
  | { event: "product.deleted"; productId: string }
  | { event: "product.featured"; featured: boolean; productId: string }
  | { event: "products.synced" };

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-products-webhook-secret");
  if (secret !== process.env.PRODUCTS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProductEvent;
  const revalidated: string[] = [];

  switch (body.event) {
    case "product.created":
      // New product: only list changes
      revalidateTag("products");
      revalidated.push("products");
      break;

    case "product.updated":
      // Check if featured status changed — if so, also clear featured
      if ("fields" in body && body.fields.includes("featured")) {
        revalidateTag("featured");
        revalidated.push("featured");
      }
      revalidateTag(`product-${body.productId}`);
      revalidateTag("products");
      revalidated.push(`product-${body.productId}`, "products");
      break;

    case "product.deleted":
      // Removed: clear list (detail page 404s naturally)
      revalidateTag("products");
      revalidated.push("products");
      break;

    case "product.featured":
      // Only featured status changed — surgical
      revalidateTag("featured");
      revalidateTag(`product-${body.productId}`);
      revalidated.push("featured", `product-${body.productId}`);
      break;

    case "products.synced":
      // Full sync: one tag clears all three caches
      revalidateTag("products"); // ← clears getCachedProducts ✅
      //   clears getCachedProduct(ANY id) ✅
      //   clears getCachedFeatured ✅
      revalidated.push("products (clears products + per-product + featured)");
      break;
  }

  return NextResponse.json({
    revalidated: true,
    event: body.event,
    tags: revalidated,
  });
}
```

```tsx
// src/app/products/page.tsx — demonstrates all three caches
import { Suspense } from "react";
import { getCachedProducts } from "@/lib/cached-product-queries";
import { getCachedFeatured } from "@/lib/cached-product-queries";

function FeaturedBanner({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
        Featured
      </p>
      <div className="flex gap-2 flex-wrap">
        {products.map((p) => (
          <span
            key={p.id}
            className="px-3 py-1 bg-blue-600 text-white text-sm
                           font-medium rounded-full"
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function ProductsPage() {
  // Both use unstable_cache — both tagged 'products'
  // revalidateTag('products') clears BOTH simultaneously ✅
  const [products, featured] = await Promise.all([
    getCachedProducts(),
    getCachedFeatured(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      {/* Featured — from getCachedFeatured (tags: products, featured) */}
      <FeaturedBanner products={featured} />

      {/* All products — from getCachedProducts (tag: products) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border rounded-xl p-4 bg-white">
            <p className="font-semibold text-sm">{p.name}</p>
            <p className="text-blue-600 font-bold">${p.price}</p>
            {p.featured && (
              <span className="text-xs text-amber-600 font-medium">
                ★ Featured
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  Tag invalidation map for /products page:
  ─────────────────────────────────────────────────────────────────────
  revalidateTag('products')
    → clears getCachedProducts  (all products list)     ✅
    → clears getCachedFeatured  (featured list)          ✅
    → clears getCachedProduct() (every product detail)   ✅

  revalidateTag('featured')
    → clears getCachedFeatured ONLY                      ✅

  revalidateTag('product-p1')
    → clears getCachedProduct('p1') ONLY                 ✅
  ─────────────────────────────────────────────────────────────────────
*/
```

---

---
