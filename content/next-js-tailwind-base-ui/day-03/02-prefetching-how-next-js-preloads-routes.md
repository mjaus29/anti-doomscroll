# 2 — Prefetching — How Next.js Preloads Routes

---

## T — TL;DR

Prefetching means Next.js **silently downloads the code and data for a route before the user clicks** — so when they do click, the page loads instantly. It happens automatically for `<Link>` components visible in the viewport. Understanding it helps you tune performance and avoid wasted requests.

---

## K — Key Concepts

### How Prefetching Works

```
1. User loads /products page
2. <Link href="/products/42"> enters the viewport
3. Next.js silently fetches the route bundle for /products/42
4. User hovers — route is already cached
5. User clicks — instant navigation (no network request needed)

Timeline:
  t=0ms   Page loads
  t=100ms Link enters viewport → prefetch begins in background
  t=300ms Route bundle cached
  t=2000ms User clicks → 0ms navigation latency
```

### The Three Prefetch Modes

```tsx
// ─── null (default) — smart prefetch
<Link href="/products/42">Product 42</Link>
// Behavior:
//   Static routes  → prefetch full route when link enters viewport
//   Dynamic routes → prefetch layout only (not page data)
//   In development → NO prefetching (works only in production build)

// ─── true — always prefetch (eager)
<Link href="/products/42" prefetch={true}>Product 42</Link>
// Behavior:
//   Prefetch full route including page data, regardless of static/dynamic
//   Higher bandwidth usage — use sparingly (featured/important links)

// ─── false — never prefetch (lazy)
<Link href="/products/42" prefetch={false}>Product 42</Link>
// Behavior:
//   No background prefetch
//   Route loaded only when user clicks
//   Use for: low-traffic routes, authenticated routes with sensitive data,
//            long lists where prefetching all would waste bandwidth
```

### Static vs Dynamic Routes — Prefetch Difference

```
Static route (/about, /pricing):
  → Next.js prefetches the FULL page (RSC payload + layout + page data)
  → User clicks → renders from cache instantly

Dynamic route (/products/[id]):
  → Next.js prefetches ONLY the layout (not the page data)
  → User clicks → layout renders instantly from cache
  → Page data fetches at click time (still fast — just not instant)

Why the difference?
  Static: data is the same for every user → safe to cache
  Dynamic: data depends on params/user/time → can't cache speculatively
```

### Prefetching in Production Only

```bash
# Development mode (next dev)
# → Prefetching is DISABLED
# → Link clicking triggers a full route load
# → Normal — don't test prefetch behavior in dev

# Production mode (next build && next start)
# → Prefetching is ACTIVE
# → Links in viewport are prefetched automatically

# To test prefetching locally:
npm run build && npm run start
# Then observe Network tab — you'll see RSC payloads prefetched
```

### Router Cache — How Long Prefetched Routes Last

```
Next.js Router Cache (client-side):
  Static routes:  5 minutes by default
  Dynamic routes: 30 seconds by default

After expiry:
  → Next navigation to the route re-fetches from server
  → Cache is per-tab — not shared across tabs

Invalidate with:
  router.refresh()              ← re-fetches current page
  revalidatePath('/products')   ← server-side revalidation (Server Actions)
  revalidateTag('products')     ← tag-based revalidation
```

### Manual Prefetch — `router.prefetch()`

```tsx
// src/components/product-card.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();

  return (
    <div
      // Prefetch on hover — earlier than viewport entry
      onMouseEnter={() => router.prefetch(`/products/${product.id}`)}
    >
      <Link href={`/products/${product.id}`}>{product.name}</Link>
    </div>
  );
}
```

### When to Disable Prefetching

```tsx
// Disable prefetching for:

// 1. Long lists — prefetching 100 items wastes bandwidth
{products.map(p => (
  <Link key={p.id} href={`/products/${p.id}`} prefetch={false}>
    {p.name}
  </Link>
))}

// 2. Authenticated/sensitive routes
<Link href="/admin/users" prefetch={false}>Admin</Link>
// ← Don't prefetch admin routes even for logged-in users
//   (prefetch requests go through auth middleware — but still conservative)

// 3. Low-probability navigation (rarely clicked links)
<Link href="/legal/privacy-policy" prefetch={false}>Privacy</Link>
```

---

## W — Why It Matters

- Prefetching is what makes Next.js feel instant — without it, every navigation has 100–300ms of latency from loading JS bundles and data. With it, sub-10ms transitions are possible.
- The static vs dynamic prefetch distinction explains a common developer confusion: "Why does my dynamic route feel slower than my static pages?" — the answer is that static pages are fully prefetched, dynamic pages only have their layout prefetched.
- Disabling prefetch on long lists (`prefetch={false}`) is a real performance optimization — a product list of 50 items without this makes 50 background network requests as the user scrolls.
- Prefetching only works in production builds — a common debugging mistake is assuming prefetch is broken when testing with `next dev`.

---

## I — Interview Q&A

### Q1: What is prefetching in Next.js and when does it happen?

**A:** Prefetching is Next.js's mechanism for loading route resources in the background before the user clicks a link. By default, `<Link>` components automatically prefetch their destination route when the link enters the browser viewport — using the Intersection Observer API. This pre-downloads the JavaScript bundle and RSC payload for the route, so when the user clicks, the page renders from cache with near-zero latency.

### Q2: Why is there a difference in what gets prefetched for static vs dynamic routes?

**A:** Static routes have data that's the same for every user and doesn't change between requests — Next.js can safely prefetch the full page including content. Dynamic routes have request-specific data (depends on params, auth, time) — prefetching the full page would mean fetching data for a route the user might never visit, wasting server resources and potentially serving stale data. So Next.js prefetches only the layout for dynamic routes, which is consistent across navigations.

### Q3: How would you optimize a page with 100 product links to avoid excessive prefetch requests?

**A:** Add `prefetch={false}` to each `<Link>` in the list. This disables automatic viewport-based prefetching — the route loads only when the user actually clicks. For the most likely next routes (featured products, first item in a list), you can selectively enable prefetching or use `router.prefetch()` on hover to prefetch only when the user shows intent.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Testing prefetch behavior in development

```bash
pnpm dev
# Developer checks Network tab — no prefetch requests
# Conclusion: "prefetching is broken"
# Reality: prefetching is disabled in development
```

**Fix:**

```bash
pnpm build && pnpm start  # production build
# Now check Network tab — RSC payloads prefetched as you scroll
```

### ❌ Pitfall: Not disabling prefetch on large lists

```tsx
// ❌ 100 items × prefetch = 100 background requests as user scrolls
{
  products.map((p) => <Link href={`/products/${p.id}`}>{p.name}</Link>);
}
```

**Fix:**

```tsx
// ✅ Disable prefetch on long lists
{
  products.map((p) => (
    <Link key={p.id} href={`/products/${p.id}`} prefetch={false}>
      {p.name}
    </Link>
  ));
}
// Selectively re-enable on hover via router.prefetch() if needed
```

### ❌ Pitfall: Expecting `router.refresh()` to clear prefetch cache

```tsx
// ❌ router.refresh() re-fetches the CURRENT page from server
// It does NOT clear the Router Cache for other routes
router.refresh();
// User navigates to /products — may still see stale cached version
```

**Fix:** For cache invalidation after mutations, use Server Actions with `revalidatePath`:

```ts
// Server Action
import { revalidatePath } from "next/cache";
async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath("/products"); // ✅ clears /products from all caches
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `FeaturedProductsRow` component that:

1. Renders 5 featured products as links
2. Eagerly prefetches all 5 (high conversion probability)
3. Renders a second "All Products" list of 50 items with prefetch disabled
4. Triggers `router.prefetch()` on hover for items in the "all products" list

### Solution

```tsx
// src/app/(marketing)/_components/featured-products-row.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Props {
  featured: Product[];
  all: Product[];
}

export function FeaturedProductsRow({ featured, all }: Props) {
  const router = useRouter();

  return (
    <section>
      {/* ─── Featured: eager prefetch (high conversion) */}
      <h2 className="text-xl font-bold mb-4">Featured</h2>
      <div className="flex gap-4 mb-12">
        {featured.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            prefetch={true} // ← eager: always prefetch
            className="block p-4 border rounded-lg hover:border-blue-500 transition-colors w-40"
          >
            <p className="font-medium truncate">{p.name}</p>
            <p className="text-sm text-gray-500">${p.price}</p>
          </Link>
        ))}
      </div>

      {/* ─── All products: lazy prefetch (large list) */}
      <h2 className="text-xl font-bold mb-4">All Products</h2>
      <ul className="grid grid-cols-4 gap-3">
        {all.map((p) => (
          <li key={p.id}>
            <Link
              href={`/products/${p.id}`}
              prefetch={false} // ← disabled: too many items
              onMouseEnter={() =>
                // ← prefetch on hover intent
                router.prefetch(`/products/${p.id}`)
              }
              className="block p-3 border rounded hover:border-blue-400 transition-colors"
            >
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-gray-400">${p.price}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

---
