# 📅 Day 3 — Navigation and URL State (Next.js 16)

> **Goal:** Master every navigation primitive Next.js provides — `<Link>`, `useRouter`, `usePathname`, `useParams`, `useSearchParams` — and the patterns that make URL state the single source of truth for UI like filters, tabs, modals, and pagination.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 2 complete — route structure and file conventions understood.

---

## 📋 Day 3 Subtopic Overview

| #   | Subtopic                                                     | Time   |
| --- | ------------------------------------------------------------ | ------ |
| 1   | `<Link>` — Client-Side Navigation                            | 10 min |
| 2   | Prefetching — How Next.js Preloads Routes                    | 10 min |
| 3   | `useRouter` — Programmatic Navigation                        | 12 min |
| 4   | `usePathname` — Reading the Current Path                     | 8 min  |
| 5   | `useParams` — Reading Dynamic Route Params Client-Side       | 8 min  |
| 6   | `useSearchParams` — Reading Query Parameters                 | 12 min |
| 7   | Search Param Patterns — Filter, Sort, Pagination via URL     | 15 min |
| 8   | Route-Aware Navigation — Active Links and Breadcrumbs        | 12 min |
| 9   | URL-Driven UI State — The Complete Pattern                   | 15 min |
| 10  | Navigation UX — Loading States, Transitions, Scroll Behavior | 12 min |

---

---

# 1 — `<Link>` — Client-Side Navigation

---

## T — TL;DR

`<Link>` is the Next.js replacement for `<a>` tags. It enables **client-side navigation** — route transitions without full page reloads. It prefetches routes automatically, preserves scroll, and integrates with the App Router. Use it for every internal link.

---

## K — Key Concepts

### The Basics

```tsx
import Link from 'next/link'

// ─── Minimal usage
<Link href="/about">About</Link>

// ─── vs plain anchor (wrong for internal links)
<a href="/about">About</a>   // ← full page reload — loses state, slower
```

### All Props

```tsx
<Link
  href="/products?category=shoes" // ← string URL
  replace={false} // ← push to history (default) vs replace
  scroll={true} // ← scroll to top on navigation (default)
  prefetch={null} // ← null = auto (viewport), true = always, false = never
  className="text-blue-600" // ← any HTML attribute passes through
>
  Shop Shoes
</Link>
```

### `href` — String vs Object

```tsx
// ─── String form (most common)
<Link href="/products">Products</Link>
<Link href="/products?sort=price&page=2">Sorted</Link>
<Link href="/products/42">Product 42</Link>
<Link href="/products/42#reviews">Product 42 Reviews</Link>

// ─── Object form (URL object — useful for dynamic query params)
<Link
  href={{
    pathname: '/products',
    query:    { sort: 'price', category: 'shoes', page: 2 }
  }}
>
  Filtered Products
</Link>
// ← generates: /products?sort=price&category=shoes&page=2

// ─── Dynamic segment
<Link href={`/products/${product.id}`}>
  {product.name}
</Link>
```

### `replace` — History Behavior

```tsx
// Default (replace={false}) — PUSH to history stack
<Link href="/step-2">Next Step</Link>
// History: [/, /step-1, /step-2]  ← back button works

// replace={true} — REPLACE current history entry
<Link href="/step-2" replace>Next Step</Link>
// History: [/, /step-2]  ← back button skips /step-1
// Use for: login redirects, wizard steps where back = skip step
```

### `scroll` — Scroll Behavior

```tsx
// Default (scroll={true}) — scrolls to top of page on navigation
<Link href="/products/43">Next Product</Link>
// ← page scrolls to top when /products/43 loads

// scroll={false} — preserves scroll position
<Link href="/products/43" scroll={false}>Next Product</Link>
// ← maintains scroll position — useful for infinite scroll, modal-like UX

// Scroll to a specific element via hash
<Link href="/about#team">Meet the Team</Link>
// ← scrolls to element with id="team" on the /about page
```

### Rendering Inside Different Elements

```tsx
// ─── Link wrapping a div (valid in Next.js App Router)
<Link href="/products/42">
  <div className="card">
    <img src={product.image} alt={product.name} />
    <p>{product.name}</p>
  </div>
</Link>

// ─── Link with custom component (must forward ref)
import { forwardRef } from 'react'

const MyButton = forwardRef<HTMLButtonElement, { children: React.ReactNode }>(
  ({ children, ...props }, ref) => (
    <button ref={ref} className="btn" {...props}>{children}</button>
  )
)
MyButton.displayName = 'MyButton'

// Use passHref when wrapping a custom component that renders <a>
<Link href="/about" passHref legacyBehavior>
  <MyButton>About</MyButton>
</Link>
// ← legacyBehavior needed only for components that expect href directly
```

### External Links — Use `<a>` Not `<Link>`

```tsx
// External links — plain <a> with security attributes
<a
  href="https://github.com"
  target="_blank"
  rel="noopener noreferrer" // ← security: prevents tab-napping
>
  GitHub
</a>

// ─── Rule: Link for internal routes, <a> for external URLs
```

---

## W — Why It Matters

- `<Link>` is the foundation of the SPA-like experience in Next.js — without it every navigation causes a full HTTP request and page reload, losing React state, scroll position, and the smooth feel of a modern app.
- The URL object form (`href={{ pathname, query }}`) is the correct way to build dynamic query strings — it handles encoding automatically and is type-safe when combined with TypeScript.
- `replace={true}` in auth flows prevents the user from pressing "back" to get to a protected page after logout — a critical UX and security pattern.
- `scroll={false}` is how you implement tab/filter navigation that doesn't jump to the top of the page — essential for filter UIs, pagination, and tab-based interfaces.

---

## I — Interview Q&A

### Q1: What is the difference between `<Link href="/about">` and `<a href="/about">`?

**A:** `<Link>` performs client-side navigation — React updates the page content without a full HTTP request, preserving all in-memory React state (component state, context, scroll position of other elements). `<a>` triggers a full page reload — the browser makes a new HTTP request, the server re-renders the page, all JavaScript is re-executed, and all React state is lost. `<Link>` also prefetches the destination route in the background, making the transition feel instant.

### Q2: When would you use `replace={true}` on a `<Link>`?

**A:** When you don't want the user to be able to navigate back to the current page. Common cases: redirecting after login (don't let the user "back" to the login page), wizard steps where going back should skip the completed step, and replacing the current search/filter state rather than pushing to history. `replace` replaces the current entry in the browser's history stack instead of pushing a new one.

### Q3: How does the URL object form of `href` work in `<Link>`?

**A:** Instead of a string, `href` accepts an object with `pathname` and `query` properties. `query` is an object where keys become query parameter names and values become query parameter values. Next.js serializes this to a URL string automatically, handling encoding. This is cleaner than manual string concatenation — `href={{ pathname: '/products', query: { sort: 'price', page: 2 } }}` produces `/products?sort=price&page=2` without any manual `encodeURIComponent` calls.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `<a>` for internal navigation

```tsx
// ❌ Full page reload — loses state, slower
<a href="/dashboard">Dashboard</a>
```

**Fix:**

```tsx
import Link from "next/link";
<Link href="/dashboard">Dashboard</Link>; // ✅
```

### ❌ Pitfall: Building query strings manually in `href`

```tsx
// ❌ Error-prone — values not encoded, easy to get wrong
<Link href={`/products?category=${category}&sort=${sort}&page=${page}`}>
```

**Fix:** Use the URL object form or `query-string`:

```tsx
// ✅ URL object form — auto-encoded
<Link href={{ pathname: "/products", query: { category, sort, page } }}>
  Products
</Link>
```

### ❌ Pitfall: Using `<Link>` for external URLs

```tsx
// ❌ Link wrapping external URL — works but wrong tool
<Link href="https://github.com">GitHub</Link>
```

**Fix:**

```tsx
// ✅ Plain anchor for external links
<a href="https://github.com" target="_blank" rel="noopener noreferrer">
  GitHub
</a>
```

### ❌ Pitfall: Forgetting `scroll={false}` on filter/tab navigation

```tsx
// ❌ User clicks a filter tab → page jumps to top → disorienting
<Link href="/products?category=shoes">Shoes</Link>
```

**Fix:**

```tsx
// ✅ Stay at current scroll position when changing filters
<Link href="/products?category=shoes" scroll={false}>
  Shoes
</Link>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductFilters` component that renders three filter tabs (All, Shoes, Bags) using `<Link>`. Requirements:

1. Currently active filter is highlighted
2. Changing a filter resets `page` to 1 but preserves `sort`
3. No scroll jump when switching filters
4. Uses URL object form for `href`

### Solution

```tsx
// src/app/products/_components/product-filters.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Shoes", value: "shoes" },
  { label: "Bags", value: "bags" },
];

export function ProductFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentCat = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  return (
    <div className="flex gap-2 border-b border-gray-200 pb-2 mb-6">
      {CATEGORIES.map((cat) => {
        const isActive = currentCat === cat.value;

        return (
          <Link
            key={cat.value}
            href={{
              pathname,
              query: {
                // Preserve sort, reset page, update category
                ...(cat.value && { category: cat.value }),
                ...(currentSort && { sort: currentSort }),
                page: 1, // ← always reset page on filter change
              },
            }}
            scroll={false} // ← no scroll jump
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors",
              isActive
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {cat.label}
          </Link>
        );
      })}
    </div>
  );
}
```

---

---

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

# 3 — `useRouter` — Programmatic Navigation

---

## T — TL;DR

`useRouter` gives you the router object in Client Components so you can **navigate programmatically** — after form submissions, button clicks, timers, or any code that isn't a `<Link>`. It's the escape hatch from declarative links to imperative navigation.

---

## K — Key Concepts

### Import — App Router vs Pages Router

```tsx
// ─── App Router (Next.js 13+) — CORRECT
import { useRouter } from "next/navigation";

// ─── Pages Router — WRONG for App Router
import { useRouter } from "next/router"; // ← old API, different behavior
// Common mistake: App Router developers accidentally import from 'next/router'
```

### The Router API

```tsx
"use client";
import { useRouter } from "next/navigation";

export function MyComponent() {
  const router = useRouter();

  // ─── push() — navigate and ADD to history stack
  router.push("/dashboard");
  router.push("/products?sort=price");
  router.push(`/products/${id}`);

  // ─── replace() — navigate WITHOUT adding to history stack
  router.replace("/login"); // ← user can't "back" to current page

  // ─── back() — go back in browser history
  router.back(); // ← equivalent to browser back button

  // ─── forward() — go forward in browser history
  router.forward(); // ← equivalent to browser forward button

  // ─── refresh() — re-fetch current page data from server
  router.refresh(); // ← re-runs Server Components on current route

  // ─── prefetch() — manually prefetch a route
  router.prefetch("/products"); // ← pre-downloads route (no navigation)
}
```

### Common Pattern — Navigate After Form Submit

```tsx
// src/app/products/new/_components/create-product-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create product");

      const { id } = await res.json();

      // ─── Navigate to new product after creation
      router.push(`/products/${id}`);
      router.refresh(); // ← invalidate cached data for the products list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input
        name="name"
        required
        placeholder="Product name"
        className="input w-full"
      />
      <input
        name="price"
        required
        placeholder="Price"
        className="input w-full"
        type="number"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
```

### `router.push()` vs `router.replace()`

```tsx
// push() — use when the user should be able to go back
router.push("/checkout/step-2");
// History: [..., /checkout/step-1, /checkout/step-2]
// Back button → /checkout/step-1 ✅

// replace() — use when the user should NOT be able to go back
router.replace("/dashboard"); // after successful login
router.replace("/login"); // after logout
// History: [..., /dashboard]
// Back button → wherever they were before login ✅
```

### `router.refresh()` — When to Use It

```tsx
// router.refresh() tells Next.js to:
// 1. Re-fetch Server Component data on the current page
// 2. NOT cause a full page reload (React state is preserved)
// 3. NOT reset scroll position

// Use after:
//   - Mutations that affect the current page (delete item from list)
//   - After optimistic updates that need server confirmation
//   - After Server Actions that update data shown on current page

// Example: delete a product and refresh the list
async function handleDelete(productId: string) {
  await fetch(`/api/products/${productId}`, { method: "DELETE" });
  router.refresh(); // ← re-fetches the product list without full reload
}
```

### Navigating with Query Params Programmatically

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

function SortSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSortChange(sort: string) {
    // Build new query string preserving existing params
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.set("page", "1"); // reset page on sort change
    params.delete("undefined"); // clean up any bad values

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select onChange={(e) => handleSortChange(e.target.value)}>
      <option value="price">Price</option>
      <option value="rating">Rating</option>
      <option value="createdAt">Newest</option>
    </select>
  );
}
```

### App Router vs Pages Router — Key API Differences

```
App Router (next/navigation):    Pages Router (next/router):
  router.push()                    router.push()
  router.replace()                 router.replace()
  router.back()                    router.back()
  router.forward()                 router.forward()
  router.refresh()                 router.reload()  ← different!
  router.prefetch()                router.prefetch()
  NO router.pathname               router.pathname
  NO router.query                  router.query
  NO router.asPath                 router.asPath
  NO router.events                 router.events  ← no route events in App Router
```

---

## W — Why It Matters

- The most common App Router mistake is importing `useRouter` from `next/router` (Pages Router) instead of `next/navigation` — it causes cryptic errors because the APIs are incompatible.
- `router.push()` vs `router.replace()` is a UX decision that directly affects whether users can use the back button — getting this wrong in auth flows causes frustrating UX (users navigating back to see a protected page after logout).
- `router.refresh()` is the App Router's way to sync UI after mutations without a full page reload — essential when Server Components display data that just changed.
- The App Router deliberately removed `router.events` (from Pages Router) — there is no `routeChangeStart` event. Loading states in App Router use `useTransition` or `loading.tsx`, not router events.

---

## I — Interview Q&A

### Q1: What is the difference between `router.push()` and `router.replace()`?

**A:** Both navigate to a new URL. `push()` adds a new entry to the browser's history stack — the user can press back to return to the previous page. `replace()` replaces the current entry in the history stack — the user cannot press back to the page they just left. Use `replace()` after login (don't go back to login page), after logout (don't go back to dashboard), and for wizard steps where going back should skip completed steps.

### Q2: What does `router.refresh()` do in the App Router?

**A:** It tells Next.js to re-fetch Server Component data for the current route without a full page reload. Client Component state (useState, useRef), scroll position, and React context are all preserved — only the Server Component tree re-renders with fresh data from the server. Use it after mutations that affect data displayed by Server Components on the current page.

### Q3: Why is `router.events` missing from the App Router's `useRouter`?

**A:** The App Router removed route events because loading states are handled differently — via `loading.tsx` files for automatic Suspense boundaries, and via `useTransition` for manual pending states. The Pages Router used `router.events` for things like showing a global loading bar, but the App Router achieves this through the Suspense streaming model instead. If you need a loading indicator between navigations, use `useTransition` + a custom pending state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing from `next/router` in App Router

```tsx
// ❌ Wrong import — Pages Router API
import { useRouter } from "next/router";

// Error: "NextRouter was not mounted" or unexpected behavior
```

**Fix:**

```tsx
// ✅ Correct import for App Router
import { useRouter } from "next/navigation";
```

### ❌ Pitfall: Using `router.push()` after login instead of `router.replace()`

```tsx
// ❌ User logs in → redirected to /dashboard
router.push("/dashboard");
// User presses back → goes to /login (already logged in → confusing)
```

**Fix:**

```tsx
// ✅ Replace history — back button skips login page
router.replace("/dashboard");
// User presses back → goes to whatever was before /login
```

### ❌ Pitfall: Forgetting `router.refresh()` after mutations

```tsx
// ❌ Delete item — API call succeeds but list still shows deleted item
await fetch(`/api/products/${id}`, { method: "DELETE" });
// ← Server Component list data is stale — shows old data
```

**Fix:**

```tsx
// ✅ Refresh to re-fetch Server Component data
await fetch(`/api/products/${id}`, { method: "DELETE" });
router.refresh(); // ← list re-renders with the item gone
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `LoginForm` component that:

1. Posts credentials to `/api/auth/login`
2. On success: redirects to the `redirect` query param value (e.g., `?redirect=/dashboard`) or `/dashboard` as fallback — using `replace` (can't go back to login)
3. On error: shows the error message from the API
4. Shows a loading state during submission
5. Prefetches `/dashboard` on mount for instant redirect

### Solution

```tsx
// src/app/(auth)/login/_components/login-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefetch the destination on mount — instant redirect after login
  useEffect(() => {
    router.prefetch(redirectTo);
  }, [router, redirectTo]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const pass = form.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Invalid credentials");
        return;
      }

      // ─── Success: replace history (no back to login)
      router.replace(redirectTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border rounded-lg px-3 py-2 focus:outline-none
                     focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border rounded-lg px-3 py-2 focus:outline-none
                     focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

---

---

# 4 — `usePathname` — Reading the Current Path

---

## T — TL;DR

`usePathname` returns the **current URL pathname as a string** — everything before the `?`. It's a Client Component hook used for active link detection, conditional rendering based on route, and breadcrumb generation. It updates automatically on every navigation.

---

## K — Key Concepts

### Basic Usage

```tsx
"use client";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      className={isActive ? "text-blue-600 font-semibold" : "text-gray-600"}
    >
      {children}
    </a>
  );
}
```

### What `usePathname` Returns

```tsx
// URL: https://myapp.com/products/42?sort=price#reviews
// pathname → '/products/42'
//            ← no protocol, no domain, no query string, no hash

// URL: https://myapp.com/
// pathname → '/'

// URL: https://myapp.com/dashboard/settings
// pathname → '/dashboard/settings'
```

### Exact Match vs Starts-With Match

```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean; // true = exact match, false = startsWith
}

export function NavItem({ href, children, exact = false }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  // startsWith check: /dashboard is active on /dashboard/orders too

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

// Usage:
// <NavItem href="/dashboard" exact>Overview</NavItem>
//   → active on: /dashboard only
//
// <NavItem href="/dashboard/orders">Orders</NavItem>
//   → active on: /dashboard/orders AND /dashboard/orders/42
```

### Conditional Rendering Based on Route

```tsx
"use client";
import { usePathname } from "next/navigation";

export function PageHeader() {
  const pathname = usePathname();

  // Hide header on fullscreen pages
  const isFullscreen = ["/onboarding", "/checkout/payment"].includes(pathname);
  if (isFullscreen) return null;

  // Show different titles per section
  const title = pathname.startsWith("/dashboard")
    ? "Dashboard"
    : pathname.startsWith("/store")
      ? "Store"
      : pathname.startsWith("/account")
        ? "Account"
        : "MyApp";

  return (
    <header className="h-16 border-b flex items-center px-6">
      <h1 className="font-semibold">{title}</h1>
    </header>
  );
}
```

### Building Breadcrumbs from Pathname

```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

function capitalize(str: string) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // '/dashboard/orders/42' → ['dashboard', 'orders', '42']

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, i) => ({
    label: capitalize(segment),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-gray-900 font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-gray-700"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Server Component Alternative

```tsx
// In Server Components — use headers() to read the pathname
// (usePathname is a Client-only hook)

import { headers } from "next/headers";

export default async function ServerNav() {
  const headersList = await headers();
  const pathname = headersList.get("x-current-path") ?? "/";
  // ← Only works if middleware sets this header

  // Better: pass pathname as a prop from a Client Component parent
  // OR: use usePathname in a 'use client' component
}
```

---

## W — Why It Matters

- `usePathname` is the foundation of active navigation states — without it, nav links can't know which route is "current." This is the most common use case in the entire codebase.
- The `startsWith` vs exact match distinction is critical for nested routes: `/dashboard` should be active in the nav when viewing `/dashboard/orders`, but the exact `/dashboard` link should only be active on the overview page.
- `aria-current="page"` on active nav links is an accessibility requirement — screen readers use it to announce the current page in navigation. `usePathname` is the enabler.
- `usePathname` is reactive — it subscribes to route changes and re-renders the component whenever the pathname changes. This makes it perfect for any UI that needs to respond to navigation events.

---

## I — Interview Q&A

### Q1: What does `usePathname` return and what does it not include?

**A:** `usePathname` returns the pathname portion of the URL — the path segments starting with `/`, not including the query string (`?key=value`) or the hash fragment (`#section`). For `https://myapp.com/products/42?sort=price#reviews`, it returns `/products/42`. If you need query params, use `useSearchParams`. If you need the full URL, use `window.location.href` or construct it from both hooks.

### Q2: How do you implement an active link that is also active on child routes?

**A:** Use `pathname.startsWith(href + '/')` combined with an exact match check. For a nav item with `href="/dashboard"`, the condition `pathname === href || pathname.startsWith(href + '/')` returns true for both `/dashboard` (exact) and `/dashboard/orders` (child). The `/` suffix in `startsWith` prevents `/dashboard-settings` from incorrectly matching `/dashboard`.

### Q3: Can you use `usePathname` in Server Components?

**A:** No — `usePathname` is a React hook and hooks only work in Client Components. For Server Components that need the current path, options are: read the `x-pathname` header (if set by middleware), accept the path as a prop passed down from a Client Component ancestor, or restructure so that the route-aware logic lives in a `'use client'` component.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `usePathname` in a Server Component

```tsx
// ❌ usePathname is a hook — can't use in Server Components
import { usePathname } from "next/navigation";

export default async function Layout({ children }) {
  const pathname = usePathname(); // Error: hooks in Server Components
}
```

**Fix:** Move route-aware logic to a Client Component:

```tsx
// 'use client' component
"use client";
import { usePathname } from "next/navigation";
export function ActiveNav() {
  const pathname = usePathname();
  return <nav>{/* active states based on pathname */}</nav>;
}
```

### ❌ Pitfall: Exact match fails on child routes

```tsx
// ❌ Nav item for /dashboard is NOT highlighted on /dashboard/orders
const isActive = pathname === "/dashboard";
// /dashboard/orders → pathname !== '/dashboard' → not active
```

**Fix:**

```tsx
// ✅ Active on exact match AND all child routes
const isActive =
  pathname === "/dashboard" || pathname.startsWith("/dashboard/");
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `Sidebar` component with navigation items. Each item must:

1. Be active on exact match for top-level items (`/dashboard`)
2. Be active on child routes for section items (`/dashboard/orders` active for `/dashboard/orders/42`)
3. Show a different icon color when active
4. Include `aria-current="page"` for accessibility
5. Collapse all items not in the active section

### Solution

```tsx
// src/app/(dashboard)/_components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji for simplicity
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  {
    label: "Orders",
    href: "/dashboard/orders",
    icon: "📦",
    children: [
      { label: "All Orders", href: "/dashboard/orders" },
      { label: "Pending", href: "/dashboard/orders/pending" },
      { label: "Completed", href: "/dashboard/orders/completed" },
    ],
  },
  { label: "Products", href: "/dashboard/products", icon: "🛍️" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

function isPathActive(href: string, pathname: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <span className="font-bold text-lg">MyApp</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = isPathActive(item.href, pathname, !item.children);
          const showChildren =
            item.children && isPathActive(item.href, pathname);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive && !showChildren ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>

              {/* Child nav items — only show when section is active */}
              {showChildren && item.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-lg transition-colors",
                          childActive
                            ? "text-white font-medium"
                            : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

---

# 5 — `useParams` — Reading Dynamic Route Params Client-Side

---

## T — TL;DR

`useParams` reads the **dynamic route segment values** (e.g., `[id]`, `[slug]`) in Client Components. It's the client-side equivalent of awaiting `params` in Server Components. Returns an object — `{ id: '42' }` — always with string values.

---

## K — Key Concepts

### Basic Usage

```tsx
"use client";
import { useParams } from "next/navigation";

// Route: /products/[id]/reviews/[reviewId]
// URL:   /products/42/reviews/7

export function ReviewActions() {
  const params = useParams<{ id: string; reviewId: string }>();

  // params.id       → '42'
  // params.reviewId → '7'

  return (
    <button onClick={() => deleteReview(params.reviewId)}>Delete Review</button>
  );
}
```

### Type-Safe Usage

```tsx
// ─── Without generic (untyped)
const params = useParams();
// params → { id: string | string[] }  ← loose

// ─── With generic (typed)
const params = useParams<{ id: string; slug: string }>();
// params.id   → string
// params.slug → string

// ─── Catch-all routes
const params = useParams<{ slug: string[] }>();
// Route: /docs/[...slug]
// URL:   /docs/api/auth
// params.slug → ['api', 'auth']
```

### Server vs Client Param Access

```tsx
// ─── Server Component — await params prop
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ← await the Promise
  const product = await db.product.findUnique({ where: { id } });
  return <ProductView product={product} />;
}

// ─── Client Component — useParams hook
("use client");
import { useParams } from "next/navigation";

export function AddToCartButton() {
  const { id } = useParams<{ id: string }>();
  // id → current product ID from URL
  // No prop drilling needed — reads directly from URL
  return <button onClick={() => addToCart(id)}>Add to Cart</button>;
}
```

### Real-World Pattern — Deep Client Components

```tsx
// Problem: deep component needs route param but prop-drilling is 5 levels deep
// Solution: useParams reads directly from URL — no props needed

// ─── Without useParams — prop drilling hell
<ProductPage id="42">
  <ProductLayout id="42">
    <ProductContent id="42">
      <ProductActions id="42">
        <AddToCartButton productId="42" /> // ← passed through 4 levels
      </ProductActions>
    </ProductContent>
  </ProductLayout>
</ProductPage>;

// ─── With useParams — clean
// AddToCartButton.tsx
("use client");
export function AddToCartButton() {
  const { id } = useParams<{ id: string }>(); // reads from URL directly
  return <button onClick={() => addToCart(id)}>Add to Cart</button>;
}

// No prop passing needed anywhere in the tree
```

### Handling Array Values (Catch-All Routes)

```tsx
"use client";
import { useParams } from "next/navigation";

// Route: /docs/[...slug]/page.tsx
export function DocsBreadcrumb() {
  const params = useParams<{ slug: string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug : [params.slug];
  // ← always normalize to array — useParams can return string or string[]

  return (
    <nav>
      {slug.map((segment, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {segment.replace(/-/g, " ")}
        </span>
      ))}
    </nav>
  );
}
```

---

## W — Why It Matters

- `useParams` eliminates prop drilling for route parameters in deeply nested Client Component trees — any component anywhere in the tree can read the current route params directly from the URL.
- The generic type parameter (`useParams<{ id: string }>()`) prevents a class of runtime errors where `params.nonExistentKey` silently returns `undefined` — TypeScript catches it at compile time.
- Understanding the difference between `params` as a Server Component prop (awaited Promise) vs `useParams()` as a hook is a common App Router knowledge gap — interviewers test this distinction.
- Array values from catch-all routes (`[...slug]`) require normalization — `useParams` can return either a `string` or `string[]` for catch-all segments depending on context.

---

## I — Interview Q&A

### Q1: How do you access route params in a Client Component vs a Server Component?

**A:** In Server Components, route params arrive as a `params` prop typed as `Promise<{ key: string }>` — you must `await params` to access the values. In Client Components, use the `useParams()` hook from `next/navigation` — it returns the current route params synchronously as an object. The hook is reactive and updates automatically when the route changes.

### Q2: What type does `useParams` return for a catch-all route `[...slug]`?

**A:** It returns `{ slug: string | string[] }` — Next.js may return either a single string or an array of strings. Always normalize the value: `const slug = Array.isArray(params.slug) ? params.slug : params.slug ? [params.slug] : []`. This handles all cases correctly: single segment, multiple segments, and missing slug.

### Q3: When would you prefer `useParams` over passing params as props from a Server Component?

**A:** When the component needing the param is deeply nested in a Client Component tree and prop drilling would be cumbersome. `useParams()` reads directly from the URL — no prop passing needed. It also helps when a Client Component is used across multiple route segments and needs to be self-contained (e.g., an `AddToCartButton` that works in any product page regardless of the param name).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not normalizing catch-all param to array

```tsx
const params = useParams<{ slug: string[] }>();
params.slug.join("/"); // TypeError: Cannot read properties of undefined
// or: params.slug is a string, not array
```

**Fix:**

```tsx
const params = useParams();
const slug = [params.slug].flat().filter((s): s is string => Boolean(s));
const docPath = slug.join("/"); // ✅ always an array
```

### ❌ Pitfall: Using `useParams` in a Server Component

```tsx
// ❌ Server Component
import { useParams } from "next/navigation";

export default async function ProductPage() {
  const { id } = useParams(); // Error: hooks not allowed in Server Components
}
```

**Fix:** In Server Components, use the `params` prop:

```tsx
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `WishlistButton` Client Component that:

1. Reads `productId` from the URL using `useParams` (route: `/store/[category]/product/[id]`)
2. Reads `category` from params too
3. Toggles wishlist state (local state — no API)
4. Shows the category and product ID it's acting on
5. Is fully typed with generics

### Solution

```tsx
// src/app/(store)/store/[category]/product/[id]/_components/wishlist-button.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

type RouteParams = { category: string; id: string };

export function WishlistButton() {
  const { category, id } = useParams<RouteParams>();
  const [wishlisted, setWishlisted] = useState(false);

  function handleToggle() {
    setWishlisted((prev) => !prev);
    // In production: call API to save wishlist state
    console.log(
      wishlisted
        ? `Removed product ${id} (${category}) from wishlist`
        : `Added product ${id} (${category}) to wishlist`
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleToggle}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
          ${
            wishlisted
              ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
              : "bg-white  border-gray-300 text-gray-700 hover:bg-gray-50"
          }
        `}
      >
        <span>{wishlisted ? "❤️" : "🤍"}</span>
        <span>{wishlisted ? "Wishlisted" : "Add to Wishlist"}</span>
      </button>
      <p className="text-xs text-gray-400">
        {category} / product {id}
      </p>
    </div>
  );
}
```

---

---

# 6 — `useSearchParams` — Reading Query Parameters

---

## T — TL;DR

`useSearchParams` gives Client Components **read-only access to the URL query string**. It returns a `URLSearchParams`-like object. To update query params, combine it with `useRouter` and `usePathname`. Always wrap components using `useSearchParams` in `<Suspense>`.

---

## K — Key Concepts

### Basic Usage

```tsx
"use client";
import { useSearchParams } from "next/navigation";

export function SearchResults() {
  const searchParams = useSearchParams();

  // Get single value
  const q = searchParams.get("q"); // string | null
  const page = searchParams.get("page"); // '2' (always string)
  const sort = searchParams.get("sort"); // 'price' | null

  // Get all values for a key (multi-select filters)
  const brands = searchParams.getAll("brand"); // string[]
  // URL: ?brand=nike&brand=adidas → ['nike', 'adidas']

  // Check if param exists
  const hasFilter = searchParams.has("category"); // boolean

  // Iterate all params
  for (const [key, value] of searchParams.entries()) {
    console.log(key, value);
  }

  return (
    <div>
      <p>Search: {q ?? "none"}</p>
      <p>Page: {Number(page ?? "1")}</p>
    </div>
  );
}
```

### The `<Suspense>` Requirement

```tsx
// ⚠️ REQUIRED: useSearchParams causes the component to suspend
// during static rendering if not wrapped in Suspense

// ❌ Without Suspense — build warning / hydration issues
export default function ProductsPage() {
  return <ProductFilters />; // ← useSearchParams inside
}

// ✅ With Suspense — correct
export default function ProductsPage() {
  return (
    <Suspense fallback={<FilterSkeleton />}>
      <ProductFilters /> {/* ← useSearchParams inside */}
    </Suspense>
  );
}
```

### Why `<Suspense>` — Technical Reason

```
useSearchParams reads from the URL at render time.
During static rendering (next build), the URL is unknown.
Without Suspense:
  → Next.js can't statically render the component
  → Entire page falls back to dynamic rendering (performance hit)

With Suspense:
  → The Suspense boundary is statically rendered as the fallback
  → The inner component hydrates client-side with actual search params
  → Performance preserved ✅
```

### Updating Search Params — Read + Write Pattern

```tsx
"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";

export function SortSelector() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentSort = searchParams.get("sort") ?? "createdAt";

  function updateSort(newSort: string) {
    // Create mutable copy of current params
    const params = new URLSearchParams(searchParams.toString());

    params.set("sort", newSort);
    params.set("page", "1"); // reset page on sort change
    params.delete("cursor"); // remove cursor-based pagination if present

    // Navigate to new URL (preserves all other params)
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => updateSort(e.target.value)}
      className="border rounded px-3 py-1.5 text-sm"
    >
      <option value="createdAt">Newest</option>
      <option value="price">Price: Low to High</option>
      <option value="-price">Price: High to Low</option>
      <option value="rating">Top Rated</option>
    </select>
  );
}
```

### Reading Params in Server vs Client

```tsx
// ─── Server Component — searchParams prop (no Suspense needed)
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { sort, page, category } = await searchParams;
  // Use for initial render + SSR
}

// ─── Client Component — useSearchParams hook (needs Suspense)
("use client");
export function ClientFilters() {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  // Use for interactive updates
}
```

### Multi-Value Params (Arrays)

```tsx
// URL: /products?brand=nike&brand=adidas&brand=puma

// ─── Reading array params
const brands = searchParams.getAll("brand"); // ['nike', 'adidas', 'puma']

// ─── Writing array params
function toggleBrand(brand: string) {
  const params = new URLSearchParams(searchParams.toString());
  const brands = params.getAll("brand");

  if (brands.includes(brand)) {
    // Remove: delete all, re-add the others
    params.delete("brand");
    brands.filter((b) => b !== brand).forEach((b) => params.append("brand", b));
  } else {
    params.append("brand", brand); // ← append adds another value for same key
  }

  params.set("page", "1"); // reset page
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
}
```

---

## W — Why It Matters

- The `<Suspense>` requirement for `useSearchParams` is a frequent source of build warnings and subtle performance issues — understanding it prevents both the warning and the accidental opt-out of static rendering.
- `new URLSearchParams(searchParams.toString())` is the correct pattern for immutable updates — `URLSearchParams` is read-only directly from `useSearchParams`, so you must create a mutable copy first.
- Multi-value params (`getAll`, `append`, `delete`) are how multi-select filters work — using `.set('brand', 'nike')` when you want multiple brands destroys the previous selections. `.append()` is the correct method.
- Reading search params in a Server Component (`searchParams` prop) vs Client Component (`useSearchParams`) serve different purposes — server for initial data fetching, client for interactive updates.

---

## I — Interview Q&A

### Q1: Why must components using `useSearchParams` be wrapped in `<Suspense>`?

**A:** During static generation (`next build`), the URL's search params are unknown — they vary per user request. `useSearchParams` reads from the URL at render time, which causes the component to "suspend" because that information isn't available during static rendering. Wrapping in `<Suspense>` tells Next.js to statically render the fallback, then hydrate the real component client-side with the actual search params. Without `<Suspense>`, Next.js must opt the entire page into dynamic (per-request) rendering, losing static generation performance.

### Q2: How do you update a search param without losing the other existing params?

**A:** Create a mutable copy of the current params: `const params = new URLSearchParams(searchParams.toString())`. Then use `params.set(key, value)` to update or add, `params.delete(key)` to remove, and `params.append(key, value)` to add a multi-value entry. Finally, navigate: `router.push(pathname + '?' + params.toString(), { scroll: false })`. This pattern preserves all untouched params while updating only the ones you intend to change.

### Q3: What is the difference between `searchParams.get()` and `searchParams.getAll()`?

**A:** `.get(key)` returns the first value for a key as a string, or `null` if the key doesn't exist. `.getAll(key)` returns all values for a key as a `string[]` — this is used when a param can appear multiple times (`?brand=nike&brand=adidas`). For single-value params (sort, page, query), use `.get()`. For multi-select filters (brands, categories, tags), use `.getAll()`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `<Suspense>` around `useSearchParams`

```tsx
// page.tsx
export default function ProductsPage() {
  return <SearchFilters />; // useSearchParams inside — no Suspense
}
// Warning: useSearchParams() should be wrapped in a suspense boundary
// Performance: entire page becomes dynamic
```

**Fix:**

```tsx
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <Suspense
      fallback={<div className="h-10 bg-gray-100 animate-pulse rounded" />}
    >
      <SearchFilters />
    </Suspense>
  );
}
```

### ❌ Pitfall: Mutating `searchParams` directly

```tsx
// ❌ URLSearchParams from useSearchParams is read-only
const searchParams = useSearchParams();
searchParams.set("page", "2"); // TypeError or silent fail
```

**Fix:** Create a mutable copy:

```tsx
// ✅ Copy first, then mutate
const params = new URLSearchParams(searchParams.toString());
params.set("page", "2"); // ← mutate the copy
router.push(`${pathname}?${params.toString()}`);
```

### ❌ Pitfall: Using `.set()` for multi-value params

```tsx
// ❌ Overwrites previous selections
params.set("brand", "puma");
// URL: ?brand=puma   ← lost nike and adidas
```

**Fix:**

```tsx
// ✅ Use append for multi-value
params.append("brand", "puma");
// URL: ?brand=nike&brand=adidas&brand=puma ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SearchBox` component that:

1. Reads the current `q` param from the URL
2. Debounces input — only updates URL after 300ms of no typing
3. Preserves all other query params when updating `q`
4. Resets `page` to 1 when the query changes
5. Clears `q` when input is empty (deletes the param entirely)
6. Wrapped correctly in Suspense at the parent level

### Solution

```tsx
// src/components/search-box.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

function SearchBoxInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external URL changes back to input (e.g., user uses back button)
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setValue(newValue);

    // Debounce URL update
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue.trim()) {
        params.set("q", newValue.trim());
      } else {
        params.delete("q"); // ← remove param entirely when empty
      }

      params.set("page", "1"); // ← reset page on search
      params.delete("cursor"); // ← remove cursor pagination if any

      router.push(
        `${pathname}${params.toString() ? "?" + params.toString() : ""}`,
        { scroll: false }
      );
    }, 300);
  }

  function handleClear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set("page", "1");
    router.push(
      `${pathname}${params.toString() ? "?" + params.toString() : ""}`,
      { scroll: false }
    );
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search products..."
        className="w-full border rounded-lg pl-10 pr-8 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Export with built-in Suspense boundary
export function SearchBox() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-10 bg-gray-100 animate-pulse rounded-lg" />
      }
    >
      <SearchBoxInner />
    </Suspense>
  );
}
```

---

---

# 7 — Search Param Patterns — Filter, Sort, Pagination via URL

---

## T — TL;DR

The URL is the best state manager for filters, sort order, and pagination. Storing this state in the URL makes it **shareable, bookmarkable, and back-button safe** — without any global state library. The pattern: serialize state to query params, deserialize on render, update via router navigation.

---

## K — Key Concepts

### The Core Pattern — URL as State

```
State in useState:                State in URL:
  - Lost on refresh                 + Survives refresh
  - Not shareable                   + Fully shareable link
  - Back button broken              + Back button works
  - Can't be bookmarked             + Bookmarkable
  - No SSR support                  + SSR support (searchParams prop)
  - Need global store for           + Zero state library needed
    cross-component access

Rule: if a user would want to share the current view, put that state in the URL.
```

### The Complete Filter/Sort/Page Hook

```tsx
// src/hooks/use-url-filters.ts
"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export interface FilterState {
  q: string;
  category: string;
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: string;
  order: "asc" | "desc";
  page: number;
  limit: number;
}

const DEFAULTS: FilterState = {
  q: "",
  category: "",
  brands: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  sort: "createdAt",
  order: "desc",
  page: 1,
  limit: 20,
};

export function useUrlFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // ─── Deserialize URL → state
  const filters: FilterState = useMemo(
    () => ({
      q: searchParams.get("q") ?? DEFAULTS.q,
      category: searchParams.get("category") ?? DEFAULTS.category,
      brands: searchParams.getAll("brand"),
      minPrice: searchParams.has("minPrice")
        ? Number(searchParams.get("minPrice"))
        : null,
      maxPrice: searchParams.has("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : null,
      inStock: searchParams.get("inStock") === "true",
      sort: searchParams.get("sort") ?? DEFAULTS.sort,
      order: (searchParams.get("order") ?? DEFAULTS.order) as "asc" | "desc",
      page: Math.max(1, Number(searchParams.get("page") ?? "1")),
      limit: Math.min(
        100,
        Math.max(1, Number(searchParams.get("limit") ?? "20"))
      ),
    }),
    [searchParams]
  );

  // ─── Serialize state → URL
  const navigate = useCallback(
    (
      updates: Partial<FilterState>,
      options?: { resetPage?: boolean; scroll?: boolean }
    ) => {
      const next: FilterState = { ...filters, ...updates };

      // Auto-reset page when filter/sort changes (not when page itself changes)
      const isFilterChange = !("page" in updates);
      if (isFilterChange || options?.resetPage) {
        next.page = 1;
      }

      const params = new URLSearchParams();

      // Only add non-default values to keep URL clean
      if (next.q) params.set("q", next.q);
      if (next.category) params.set("category", next.category);
      next.brands.forEach((b) => params.append("brand", b));
      if (next.minPrice != null) params.set("minPrice", String(next.minPrice));
      if (next.maxPrice != null) params.set("maxPrice", String(next.maxPrice));
      if (next.inStock) params.set("inStock", "true");
      if (next.sort !== DEFAULTS.sort) params.set("sort", next.sort);
      if (next.order !== DEFAULTS.order) params.set("order", next.order);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== DEFAULTS.limit)
        params.set("limit", String(next.limit));

      const qs = params.toString();
      router.push(`${pathname}${qs ? "?" + qs : ""}`, {
        scroll: options?.scroll ?? false,
      });
    },
    [filters, pathname, router]
  );

  const reset = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, navigate, reset };
}
```

### Using the Hook

```tsx
// src/app/(store)/store/_components/product-list-controls.tsx
"use client";

import { Suspense } from "react";
import { useUrlFilters } from "@/hooks/use-url-filters";

function Controls() {
  const { filters, navigate, reset } = useUrlFilters();

  return (
    <div className="flex flex-wrap gap-3 items-center mb-6">
      {/* Search */}
      <input
        type="search"
        value={filters.q}
        onChange={(e) => navigate({ q: e.target.value })}
        placeholder="Search..."
        className="border rounded-lg px-3 py-1.5 text-sm w-48"
      />

      {/* Category */}
      <select
        value={filters.category}
        onChange={(e) => navigate({ category: e.target.value })}
        className="border rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="">All Categories</option>
        <option value="shoes">Shoes</option>
        <option value="bags">Bags</option>
        <option value="accessories">Accessories</option>
      </select>

      {/* Sort */}
      <select
        value={`${filters.sort}-${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split("-") as [
            string,
            "asc" | "desc",
          ];
          navigate({ sort, order });
        }}
        className="border rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="createdAt-desc">Newest</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating-desc">Top Rated</option>
      </select>

      {/* In Stock Toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={filters.inStock}
          onChange={(e) => navigate({ inStock: e.target.checked })}
          className="rounded"
        />
        In Stock Only
      </label>

      {/* Active filter count + reset */}
      <button
        onClick={reset}
        className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Clear Filters
      </button>
    </div>
  );
}

export function ProductListControls() {
  return (
    <Suspense
      fallback={<div className="h-12 bg-gray-100 animate-pulse rounded" />}
    >
      <Controls />
    </Suspense>
  );
}
```

### Pagination Component Using URL State

```tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

interface PaginationProps {
  total: number;
  limit?: number;
}

function PaginationInner({ total, limit = 20 }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const totalPages = Math.ceil(total / limit);

  function buildPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center gap-2 justify-center mt-8"
      aria-label="Pagination"
    >
      <Link
        href={buildPageUrl(currentPage - 1)}
        scroll={false}
        aria-disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded border text-sm ${
          currentPage === 1
            ? "pointer-events-none text-gray-300 border-gray-200"
            : "hover:bg-gray-50"
        }`}
      >
        ← Prev
      </Link>

      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const page = i + 1;
        return (
          <Link
            key={page}
            href={buildPageUrl(page)}
            scroll={false}
            aria-current={currentPage === page ? "page" : undefined}
            className={`px-3 py-1.5 rounded border text-sm ${
              currentPage === page
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-gray-50"
            }`}
          >
            {page}
          </Link>
        );
      })}

      <Link
        href={buildPageUrl(currentPage + 1)}
        scroll={false}
        aria-disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded border text-sm ${
          currentPage === totalPages
            ? "pointer-events-none text-gray-300 border-gray-200"
            : "hover:bg-gray-50"
        }`}
      >
        Next →
      </Link>
    </nav>
  );
}

export function Pagination(props: PaginationProps) {
  return (
    <Suspense fallback={null}>
      <PaginationInner {...props} />
    </Suspense>
  );
}
```

---

## W — Why It Matters

- URL-based filter state is table stakes for e-commerce and search UIs — a product filter page that resets on refresh is broken. Users must be able to bookmark and share filtered views.
- The "only add non-default values" pattern keeps URLs clean (`/products` instead of `/products?page=1&limit=20&sort=createdAt&order=desc`) — clean URLs are more shareable and less confusing.
- The auto-reset page logic (`if (isFilterChange) next.page = 1`) is the most common pagination bug — always reset to page 1 when any filter changes.
- Using `<Link>` for pagination (instead of `router.push`) gives you prefetch behavior for free — hovering over page 3 prefetches the data for page 3.

---

## I — Interview Q&A

### Q1: Why should filter, sort, and pagination state be stored in the URL instead of `useState`?

**A:** URL state is persistent across refreshes, shareable via links, bookmarkable, and compatible with the browser's back/forward navigation. State in `useState` is ephemeral — it's lost on refresh, can't be shared, breaks the back button for filtering, and requires global state management (Zustand/Context) for cross-component access. URL state gives you all of this for free, using the browser's built-in history API.

### Q2: How do you prevent the URL from becoming a mess of default parameters?

**A:** Only serialize non-default values to the URL. Establish defaults (e.g., `page=1`, `sort=createdAt`, `order=desc`) and skip adding them to the query string when building the URL. When deserializing, fall back to defaults for missing params. This keeps URLs like `/products?category=shoes` clean instead of `/products?category=shoes&page=1&sort=createdAt&order=desc&limit=20`.

### Q3: How do you ensure changing a filter resets pagination to page 1?

**A:** In the `navigate` function, detect whether the update is a filter/sort change (not a page change) using `'page' in updates` — if it's not a page update, force `next.page = 1`. This is the single most important pagination correctness rule — without it, changing a filter while on page 5 leaves the user on page 5 of the new filter results, which may not exist.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Storing filters in useState — loses state on refresh

```tsx
const [category, setCategory] = useState("");
const [sort, setSort] = useState("createdAt");
const [page, setPage] = useState(1);
// Refresh → all filters reset → user loses their work
```

**Fix:** Store all filter state in URL params using `useUrlFilters()` hook.

### ❌ Pitfall: Not resetting page when filter changes

```tsx
function updateCategory(cat: string) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("category", cat);
  // ← forgot to reset page
  router.push(`${pathname}?${params.toString()}`);
}
// User on page 7 → changes category → still on page 7 of new category → may be empty
```

**Fix:** Always reset page on filter change:

```tsx
params.set("category", cat);
params.set("page", "1"); // ← always reset page
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useTabState(tabs, defaultTab)` hook that stores the active tab in the URL as `?tab=value`, supports a default tab (omitted from URL when active), and returns `{ activeTab, setTab }`.

### Solution

```tsx
// src/hooks/use-tab-state.ts
"use client";

import { useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export function useTabState(
  tabs: string[],
  defaultTab: string
): { activeTab: string; setTab: (tab: string) => void } {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawTab = searchParams.get("tab");
  const activeTab = rawTab && tabs.includes(rawTab) ? rawTab : defaultTab;

  const setTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === defaultTab) {
        params.delete("tab"); // ← omit default from URL — keeps it clean
      } else {
        params.set("tab", tab);
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
    },
    [searchParams, pathname, router, defaultTab]
  );

  return { activeTab, setTab };
}

// Usage:
// const { activeTab, setTab } = useTabState(
//   ['overview', 'orders', 'reviews'],
//   'overview'
// )
// URL /dashboard         → activeTab = 'overview' (default, no ?tab in URL)
// URL /dashboard?tab=orders → activeTab = 'orders'
```

---

---

# 8 — Route-Aware Navigation — Active Links and Breadcrumbs

---

## T — TL;DR

Route-aware navigation means UI components that **know which route is active** and render accordingly — highlighted nav items, breadcrumb trails, and contextual page titles. All three are built from `usePathname` and the route structure.

---

## K — Key Concepts

### The Complete Active Link Component

```tsx
// src/components/layout/active-link.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ActiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClass?: string;
  exact?: boolean;
}

export function ActiveLink({
  href,
  children,
  className = "",
  activeClass = "text-blue-600 font-semibold",
  exact = false,
}: ActiveLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClass)}
    >
      {children}
    </Link>
  );
}
```

### Breadcrumbs — From Route Config (Production-Grade)

```tsx
// src/lib/breadcrumbs.ts
export interface BreadcrumbItem {
  label: string;
  href: string;
}

// Map path segments to human-readable labels
// Handles dynamic segments like [id] and [slug]
export function buildBreadcrumbs(
  pathname: string,
  labelMap?: Record<string, string> // e.g., { '42': 'Product Name' }
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Use custom label if provided (e.g., product name instead of ID)
    const label =
      labelMap?.[segment] ??
      segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}
```

```tsx
// src/components/layout/breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";

interface BreadcrumbsProps {
  labelMap?: Record<string, string>;
  className?: string;
}

export function Breadcrumbs({ labelMap, className }: BreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname, labelMap);

  if (crumbs.length <= 1) return null; // don't show on home

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-gray-400" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Usage in a product page layout:
// <Breadcrumbs labelMap={{ '42': 'Air Max 90' }} />
// → Home / Products / Air Max 90
```

### Section-Based Navigation Config

```tsx
// src/config/navigation.ts
export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

export const DASHBOARD_NAV: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", href: "/dashboard", icon: HomeIcon, exact: true },
      { label: "Orders", href: "/dashboard/orders", icon: PackageIcon },
      { label: "Products", href: "/dashboard/products", icon: ShoppingBagIcon },
      { label: "Customers", href: "/dashboard/customers", icon: UsersIcon },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "General",
        href: "/dashboard/settings",
        icon: SettingsIcon,
        exact: true,
      },
      { label: "Billing", href: "/dashboard/billing", icon: CreditCardIcon },
      { label: "Team", href: "/dashboard/team", icon: TeamIcon },
    ],
  },
];
```

```tsx
// src/components/layout/dashboard-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/config/navigation";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {DASHBOARD_NAV.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-blue-600" : "text-gray-400"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

---

## W — Why It Matters

- `aria-current="page"` on the active nav item is an WCAG accessibility requirement — without it, screen readers can't identify the current page in navigation menus.
- Extracting nav items to a config file (`navigation.ts`) means adding a new nav item requires changing one file — not hunting through component JSX. This is a maintainability win at scale.
- The `exact` flag distinction (`/dashboard` vs `/dashboard/orders`) is the subtle bug that makes the wrong nav item highlighted — always think about parent routes when building nav.
- Dynamic breadcrumb labels (replacing IDs with names via `labelMap`) require passing data from Server Components (where you have DB access) to the Client Component `Breadcrumbs` — this is the composition pattern at work.

---

## I — Interview Q&A

### Q1: What is `aria-current="page"` and why should active nav links have it?

**A:** `aria-current="page"` is an ARIA attribute that tells assistive technologies (screen readers) which link represents the currently active page in a navigation list. Without it, users relying on screen readers hear all nav links without knowing which one is current. It's a WCAG 2.1 Level AA requirement for navigation landmarks. In React, set it conditionally: `aria-current={isActive ? 'page' : undefined}`.

### Q2: How do you display a product name in a breadcrumb instead of the product ID from the URL?

**A:** Pass a `labelMap` prop to the Breadcrumbs component — a mapping from URL segment values to human-readable labels. The Server Component (which has DB access) fetches the product name, then passes it down: `<Breadcrumbs labelMap={{ [product.id]: product.name }} />`. The Client Component breadcrumb builder uses the map to substitute labels while building the trail.

### Q3: What is the advantage of a navigation config object over hardcoded nav items in JSX?

**A:** Configuration-driven navigation provides a single source of truth: adding, removing, or reordering nav items requires changing one config file instead of editing component JSX. The same config can drive sidebar navigation, mobile menus, breadcrumb generation, and sitemap generation. It also enables programmatic operations — checking if a route requires auth, finding the current section title, or generating structured data.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Parent nav item not active on child routes

```tsx
// Dashboard nav item: /dashboard
// Current route: /dashboard/orders
const isActive = pathname === "/dashboard"; // ← false on /dashboard/orders
// Sidebar shows NO active item
```

**Fix:**

```tsx
const isActive =
  pathname === "/dashboard" || pathname.startsWith("/dashboard/"); // ← active on all child routes
```

### ❌ Pitfall: Breadcrumb shows raw ID instead of entity name

```
URL: /dashboard/orders/ord_42abc
Breadcrumb: Home / Dashboard / Orders / Ord 42abc
Should be:  Home / Dashboard / Orders / Order #1042
```

**Fix:** Pass `labelMap` from the Server Component that has the order data:

```tsx
// src/app/dashboard/orders/[id]/page.tsx (Server Component)
const order = await getOrder(id);
return (
  <>
    <Breadcrumbs labelMap={{ [id]: `Order #${order.number}` }} />
    <OrderDetail order={order} />
  </>
);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TopNav` component for a marketing site with:

1. Logo that links to `/`
2. Nav links: Products (`/products`), Pricing (`/pricing`), Blog (`/blog`)
3. Each link is active when on that route or any sub-route
4. A CTA button: "Get Started" → `/register`
5. Hides on `/register` and `/login` pages
6. Fully accessible with `aria-current`

### Solution

```tsx
// src/app/(marketing)/_components/top-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

const HIDDEN_PATHS = ["/register", "/login"];

export function TopNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header
      className="sticky top-0 z-50 bg-white/95 backdrop-blur
                        border-b border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors"
        >
          MyApp
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA */}
        <Link
          href="/register"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
```

---

---

# 9 — URL-Driven UI State — The Complete Pattern

---

## T — TL;DR

URL-driven UI state means **every meaningful UI state lives in the URL** — tabs, modals, filters, sidebars, panels, expanded items. The URL becomes the single source of truth. Any UI state a user would want to share, bookmark, or return to via the back button belongs in the URL.

---

## K — Key Concepts

### What Should Live in the URL vs State

```
URL (shareable, persistent):         useState (ephemeral, local):
  ✅ Active tab                         ✅ Hover/focus state
  ✅ Search query                       ✅ Animation state
  ✅ Filters + sort + page              ✅ Dropdown open/closed
  ✅ Selected item ID                   ✅ Form input (before submit)
  ✅ Expanded/collapsed sections        ✅ Tooltip visibility
  ✅ Modal open state (with content)    ✅ Loading spinners
  ✅ View mode (grid/list)              ✅ Error messages
  ✅ Sidebar open (for sharable layout) ✅ Temporary notifications
```

### Pattern 1 — URL-Driven Tabs

```tsx
// src/components/ui/url-tabs.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface UrlTabsProps {
  tabs: Tab[];
  defaultTab: string;
  paramKey?: string; // URL param name, default: 'tab'
}

function UrlTabsInner({ tabs, defaultTab, paramKey = "tab" }: UrlTabsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get(paramKey) ?? defaultTab;

  const activeContent =
    tabs.find((t) => t.id === activeTab)?.content ??
    tabs.find((t) => t.id === defaultTab)?.content;

  function buildTabUrl(tabId: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === defaultTab) params.delete(paramKey);
    else params.set(paramKey, tabId);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div>
      {/* Tab bar */}
      <div role="tablist" className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive =
            tab.id === activeTab ||
            (tab.id === defaultTab && !searchParams.has(paramKey));

          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div role="tabpanel" className="pt-6">
        {activeContent}
      </div>
    </div>
  );
}

export function UrlTabs(props: UrlTabsProps) {
  return (
    <Suspense
      fallback={<div className="h-12 bg-gray-100 animate-pulse rounded" />}
    >
      <UrlTabsInner {...props} />
    </Suspense>
  );
}
```

### Pattern 2 — URL-Driven Modal

```tsx
// Open a modal by setting ?modal=product&id=42 in the URL
// Close by removing those params
// Shareable: user can send the URL and recipient sees the modal

"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function ModalInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const modalType = searchParams.get("modal");
  const modalId = searchParams.get("id");
  const isOpen = Boolean(modalType);

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    params.delete("id");
    const qs = params.toString();
    router.push(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={closeModal}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2">
          {modalType === "product" ? "Product Details" : "Details"}
        </h2>
        <p className="text-gray-600">ID: {modalId}</p>
      </div>
    </div>
  );
}

// Trigger: <Link href="?modal=product&id=42" scroll={false}>View</Link>
export function UrlModal() {
  return (
    <Suspense fallback={null}>
      <ModalInner />
    </Suspense>
  );
}
```

### Pattern 3 — URL-Driven View Mode (Grid/List)

```tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

function ViewToggleInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = (searchParams.get("view") ?? "grid") as "grid" | "list";

  function buildViewUrl(v: "grid" | "list"): string {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "grid")
      params.delete("view"); // grid is default — clean URL
    else params.set("view", v);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="flex gap-1 border rounded-lg p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <Link
          key={v}
          href={buildViewUrl(v)}
          scroll={false}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === v
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
          aria-label={`${v} view`}
        >
          {v === "grid" ? "⊞" : "≡"}
        </Link>
      ))}
    </div>
  );
}

export function ViewToggle() {
  return (
    <Suspense
      fallback={
        <div className="w-24 h-9 bg-gray-100 animate-pulse rounded-lg" />
      }
    >
      <ViewToggleInner />
    </Suspense>
  );
}
```

---

## W — Why It Matters

- URL-driven tabs and modals are shareable — a customer service rep can send a link that opens the exact tab or modal their customer needs to see. This is impossible with `useState`-based tabs.
- The `defaultTab` omitted from URL pattern keeps URLs clean for the most common state — `/products` instead of `/products?tab=all&view=grid`. Users share the clean URL, and defaults are applied automatically.
- URL-driven modals are the foundation of "intercepting routes" (`@modal` parallel routes) — understanding the basic pattern prepares you for the advanced App Router modal pattern.
- Every `useSearchParams` component needs `<Suspense>` — the URL-driven UI pattern creates multiple components that need the same wrapper. Baking `<Suspense>` into the component export (as shown above) prevents callers from forgetting.

---

## I — Interview Q&A

### Q1: What UI state should live in the URL vs `useState`?

**A:** URL state is for anything the user would want to share, bookmark, or restore via the back button: active tabs, search queries, filter/sort state, selected item IDs, view modes (grid/list), and modal open state with content IDs. `useState` is for ephemeral, non-shareable state: hover/focus states, animation state, dropdown open/closed, tooltip visibility, and form input before submission. The test: "Would a user be surprised if this reset on page refresh?" If yes, use URL state.

### Q2: How does a URL-driven modal differ from a traditional `useState` modal?

**A:** A URL-driven modal stores its open state and content ID in the URL (`?modal=product&id=42`). This means: the modal state survives refresh (users can refresh and the modal stays open), the URL is shareable (users can send a link that opens the modal directly), and the back button closes the modal naturally (navigating back removes the modal params). A `useState` modal loses all these properties.

### Q3: Why do you delete the default tab value from the URL instead of explicitly setting it?

**A:** Clean URLs are more shareable and readable. `/products` is cleaner than `/products?tab=all`. When a user shares the URL, they share the minimal required parameters — the receiver gets the same view via defaults. Keeping defaults out of the URL also makes it easier to change defaults later without breaking existing shared links (the absence of the param means "use the current default," not "use the old default").

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Modal state in useState — breaks sharing

```tsx
const [isOpen, setIsOpen] = useState(false);
const [productId, setProductId] = useState<string | null>(null);
// User opens product modal, copies URL → shares it → recipient gets blank page
```

**Fix:** Use URL params for modal state — `?modal=product&id=42`.

### ❌ Pitfall: Not wrapping URL-driven components in Suspense

```tsx
// ❌ Each component uses useSearchParams — all need Suspense
<ViewToggle />    // no Suspense → build warning
<UrlTabs />       // no Suspense → performance hit
<SortSelector />  // no Suspense → dynamic rendering
```

**Fix:** Bake `<Suspense>` into the component's export function — the consumer never forgets:

```tsx
export function ViewToggle() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ViewToggleInner /> {/* useSearchParams is in here */}
    </Suspense>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductDetailTabs` component with URL-driven tabs: Description, Specifications, Reviews. Requirements:

1. Default tab is `description` — omitted from URL when active
2. Each tab preserves existing query params (e.g., `?color=red` stays)
3. Reviews tab shows a count badge (static number is fine)
4. Proper ARIA roles
5. Built-in Suspense

### Solution

```tsx
// src/app/(store)/store/[category]/product/[id]/_components/product-detail-tabs.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "description", label: "Description", badge: null },
  { id: "specifications", label: "Specifications", badge: null },
  { id: "reviews", label: "Reviews", badge: "24" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const DEFAULT_TAB: TabId = "description";

interface Props {
  description: React.ReactNode;
  specifications: React.ReactNode;
  reviews: React.ReactNode;
}

function ProductDetailTabsInner({
  description,
  specifications,
  reviews,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab =
    rawTab && TABS.some((t) => t.id === rawTab) ? rawTab : DEFAULT_TAB;

  const contentMap: Record<TabId, React.ReactNode> = {
    description,
    specifications,
    reviews,
  };

  function buildTabUrl(tabId: TabId): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === DEFAULT_TAB) params.delete("tab");
    else params.set("tab", tabId);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="mt-10">
      {/* Tab list */}
      <div role="tablist" className="flex border-b border-gray-200 gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              scroll={false}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium",
                "border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
              {tab.badge && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="pt-8"
        >
          {contentMap[tab.id]}
        </div>
      ))}
    </div>
  );
}

export function ProductDetailTabs(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mt-10">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <div
                key={tab.id}
                className="h-12 w-28 bg-gray-100 animate-pulse rounded-t"
              />
            ))}
          </div>
          <div className="h-48 bg-gray-50 animate-pulse rounded mt-4" />
        </div>
      }
    >
      <ProductDetailTabsInner {...props} />
    </Suspense>
  );
}
```

---

---

# 10 — Navigation UX — Loading States, Transitions, Scroll Behavior

---

## T — TL;DR

Smooth navigation UX requires three things: **instant feedback** when a link is clicked (loading indicator), **smooth transitions** between pages, and **correct scroll behavior** (top on new pages, preserved on filter changes). Next.js 16 handles scroll automatically — loading states and transitions need deliberate implementation.

---

## K — Key Concepts

### The App Router Navigation Loading Model

```
App Router loading sequence for a navigation:

1. User clicks <Link href="/products">
2. React starts transition (page is NOT yet changed)
3. Next.js fetches the RSC payload for /products
4. React streams the new page
5. Layout updates with new content (no flash)

No router.events to hook into.
No routeChangeStart callback.
Loading state = useTransition pending state OR loading.tsx
```

### Method 1 — `loading.tsx` (Automatic Suspense)

```tsx
// src/app/products/loading.tsx
// Shown automatically while products/page.tsx is fetching data

export default function ProductsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6" />
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square bg-gray-200 animate-pulse rounded-xl" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Method 2 — Global Loading Bar with `useTransition`

```tsx
// src/app/template.tsx
// template.tsx remounts on every navigation → effect runs on every nav
"use client";

import { useEffect, useRef } from "react";

export default function PageTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Component mounted = navigation completed
    // Quickly show + hide progress bar
    const el = progressRef.current;
    if (!el) return;

    el.style.width = "0%";
    el.style.opacity = "1";
    el.style.transition = "width 0.3s ease";

    const timer = setTimeout(() => {
      el.style.width = "100%";
      setTimeout(() => {
        el.style.opacity = "0";
      }, 300);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Top progress bar */}
      <div
        ref={progressRef}
        className="fixed top-0 left-0 h-0.5 bg-blue-500 z-[9999] opacity-0"
        style={{ width: "0%" }}
      />
      {children}
    </>
  );
}
```

### Method 3 — `useTransition` for Pending States on Buttons

```tsx
// src/components/nav-link-with-pending.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLinkWithPending({ href, children, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(() => {
      router.push(href);
      // isPending = true until the new page finishes rendering
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "relative transition-opacity",
        isPending && "opacity-60 cursor-wait",
        className
      )}
    >
      {isPending && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent
                           rounded-full animate-spin"
          />
        </span>
      )}
      <span className={isPending ? "invisible" : ""}>{children}</span>
    </button>
  );
}
```

### The Three Loading Patterns — When to Use Which

```
Pattern 1 — loading.tsx (Automatic Suspense):
  USE WHEN: Page itself has slow data fetching (DB, API)
  HOW IT WORKS: Shown while page.tsx is awaiting data
  SCOPE: Per-route (each route has its own loading.tsx)
  EFFORT: Zero — just create the file
  EXAMPLE: /products loading skeleton while products fetch from DB

Pattern 2 — template.tsx progress bar:
  USE WHEN: You want a global visual indicator for every navigation
  HOW IT WORKS: template.tsx remounts on every nav → runs animation
  SCOPE: Global (root template.tsx covers all routes)
  EFFORT: Low — one file at app root
  EXAMPLE: Thin top progress bar like GitHub or YouTube

Pattern 3 — useTransition (manual pending state):
  USE WHEN: A specific button/action triggers navigation programmatically
  HOW IT WORKS: router.push inside startTransition → isPending = true
  SCOPE: Per-component
  EFFORT: Medium — wrap each router.push call
  EXAMPLE: "Save & Continue" button shows spinner while navigating
```

### Scroll Behavior — The Full Picture

```tsx
// ─── 1. Default: scroll to top on navigation
<Link href="/products/42">Product</Link>
// → Navigating to a new route → browser scrolls to top ✅

// ─── 2. Preserve scroll (filters, tabs, pagination)
<Link href="/products?page=2" scroll={false}>Next Page</Link>
// → User stays at their scroll position ✅

// ─── 3. Scroll to element via hash
<Link href="/about#team">Meet the Team</Link>
// → Page loads, scrolls to <section id="team"> ✅

// ─── 4. Programmatic navigation with scroll control
router.push('/products?sort=price', { scroll: false })  // ← preserve scroll
router.push('/products/42')                             // ← scroll to top (default)

// ─── 5. Scroll to top manually after router.push
router.push('/products/42')
window.scrollTo({ top: 0, behavior: 'smooth' })        // ← manual smooth scroll
```

### Restoring Scroll on Back Navigation

```
Next.js App Router behavior:
  → Forward navigation: scroll to top (default) ✅
  → Back/forward navigation: restores previous scroll position ✅
  → This is AUTOMATIC — no code needed

When it breaks:
  → Dynamic content that changes height after hydration
  → Infinite scroll implementations (scroll position lost when items unmount)

Fix for infinite scroll scroll restoration:
  → Use scroll={false} on "load more" links
  → Virtualize long lists (react-virtual)
  → Or use cursor-based pagination (URL-driven, no scroll issues)
```

### Page Transition Animation with `template.tsx`

```tsx
// src/app/template.tsx
// Fade + slide up animation on every page navigation
"use client";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Tailwind animate-in — class applied fresh on every mount (every navigation)
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

// Requires tailwindcss-animate plugin OR custom keyframes in globals.css:
/*
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-page {
    animation: fade-in 0.25s ease-out both;
  }
*/
```

### NProgress-Style Top Loading Bar (Complete)

```tsx
// src/app/template.tsx — full top loading bar implementation
"use client";

import { useEffect, useRef } from "react";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Reset → animate → complete → fade out
    bar.style.transition = "none";
    bar.style.width = "0%";
    bar.style.opacity = "1";

    // Micro-task: start animation after reset applied
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
        bar.style.width = "85%"; // ← stop at 85% (not 100% — we don't know when done)

        // Complete after a delay simulating "done"
        const completeTimer = setTimeout(() => {
          bar.style.transition = "width 0.2s ease, opacity 0.3s ease";
          bar.style.width = "100%";
          setTimeout(() => {
            bar.style.opacity = "0";
          }, 200);
        }, 400);

        return () => clearTimeout(completeTimer);
      });
    });
  }, []); // ← runs on every mount (template.tsx remounts per navigation)

  return (
    <>
      {/* Top loading bar */}
      <div
        ref={barRef}
        aria-hidden="true"
        className="fixed top-0 left-0 h-[2px] bg-blue-500
                   z-[9999] rounded-full shadow-sm shadow-blue-400"
        style={{ width: "0%", opacity: 0 }}
      />
      {children}
    </>
  );
}
```

### Handling Navigation in Forms — Full UX Pattern

```tsx
// src/app/(dashboard)/products/new/_components/new-product-form.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function NewProductForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setError(error ?? "Something went wrong");
        return;
      }

      const { id } = await res.json();

      // ─── Wrap navigation in startTransition for isPending feedback
      startTransition(() => {
        router.push(`/products/${id}`);
        router.refresh(); // ← invalidate product list cache
      });
    } catch {
      setError("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Product Name</label>
        <input
          name="name"
          required
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Price ($)</label>
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          disabled={isPending}
          className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-50"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg
                   hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait
                   flex items-center justify-center gap-2 transition-colors"
      >
        {isPending ? (
          <>
            <span
              className="w-4 h-4 border-2 border-white border-t-transparent
                             rounded-full animate-spin"
            />
            Creating...
          </>
        ) : (
          "Create Product"
        )}
      </button>
    </form>
  );
}
```

### Back Button Behavior — Designing for It

```tsx
// Design principle: navigation should be reversible via back button

// ✅ Good: back button takes user back to the list
router.push('/products')                   // from /products/new

// ✅ Good: filter change → back button reverts to previous filter
<Link href="/products?category=shoes" scroll={false}>Shoes</Link>
// each filter change pushes a new history entry → back = previous filter

// ❌ Bad for auth: back button goes to login after logout
router.push('/login')                      // use router.replace instead

// ✅ Fixed: back button skips login after logout
router.replace('/login')

// ─── replace vs push decision:
// Ask: "Should the user be able to back to this page?"
//   YES → router.push()    (normal nav, filters, product pages)
//   NO  → router.replace() (login redirect, logout, post-form success)
```

---

## W — Why It Matters

- The App Router has **no `routeChangeStart` event** — the entire loading-bar-on-navigation pattern must be reimplemented using `template.tsx` + remounting effects. Understanding this prevents hours of searching for a non-existent API.
- `useTransition` for programmatic navigation (`router.push` inside `startTransition`) is the **only correct way** to get a pending state for imperative navigation in the App Router — without it, there's no feedback to the user during slow navigations.
- `scroll={false}` on filter/pagination links is not optional for production UX — without it, every filter click scrolls the user back to the top of the page, destroying the experience for users who scroll to see more items.
- The `router.push` vs `router.replace` decision is a UX and security concern — using `push` for auth redirects allows the back button to leak users back into protected routes after logout.

---

## I — Interview Q&A

### Q1: How do you implement a loading indicator between page navigations in the Next.js App Router?

**A:** There are two main approaches. For page-level loading, create a `loading.tsx` file in the route segment — Next.js wraps the page in Suspense and shows the loading file while data fetches. For a global top loading bar (like NProgress), use `template.tsx` at the app root — `template.tsx` remounts on every navigation, so a `useEffect` inside it runs on every route change, allowing you to trigger a progress bar animation on mount.

### Q2: What is `useTransition` and how does it improve navigation UX?

**A:** `useTransition` is a React 18 hook that marks a state update as non-urgent. When you wrap `router.push()` inside `startTransition()`, React sets `isPending` to `true` while the new page is being prepared — giving you a pending state to show a spinner or disable a button. Without `useTransition`, there's no way to know when a programmatic navigation is in progress. The `isPending` flag stays `true` until the new page fully renders.

### Q3: When should you use `scroll={false}` on a `<Link>`?

**A:** Use `scroll={false}` any time navigation should not jump the user to the top of the page — specifically: filter changes (user is mid-page browsing filtered results), tab switching (tabs are below the fold), pagination (user scrolls down then pages — should stay where they are), sort order changes, and any URL update that is a refinement of the current view rather than a navigation to a new page. The default (`scroll={true}`) is correct for navigating to genuinely new pages.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Looking for `router.events` in App Router

```tsx
// ❌ This API does not exist in App Router
import { useRouter } from "next/navigation";

const router = useRouter();
router.events.on("routeChangeStart", () => {
  setLoading(true); // TypeError: Cannot read properties of undefined
});
```

**Fix:** Use `template.tsx` for global navigation events, or `useTransition` for per-component pending states:

```tsx
// src/app/template.tsx — remounts on every navigation
"use client";
export default function Template({ children }) {
  useEffect(() => {
    // This effect runs on every navigation (template remounts)
    analytics.page();
  }, []);
  return <>{children}</>;
}
```

### ❌ Pitfall: Not using `scroll={false}` on filter links — page jumps to top

```tsx
// ❌ User is browsing at y=800, clicks a filter — page jumps to top
<Link href="/products?category=shoes">Shoes</Link>
```

**Fix:**

```tsx
// ✅ Stay in place when applying filters
<Link href="/products?category=shoes" scroll={false}>
  Shoes
</Link>
```

### ❌ Pitfall: `router.push` without `startTransition` — no loading feedback

```tsx
// ❌ Slow API call → router.push → no feedback between click and page change
async function handleSave() {
  await saveData(); // 2 seconds
  router.push("/done"); // user has no idea what's happening
}
```

**Fix:**

```tsx
// ✅ isPending gives feedback during both the API call and navigation
const [isPending, startTransition] = useTransition();

async function handleSave() {
  await saveData();
  startTransition(() => {
    router.push("/done"); // isPending stays true until /done renders
  });
}
// Use isPending to show spinner on the save button
```

### ❌ Pitfall: Using `router.push` after logout — back button reveals protected UI

```tsx
// ❌ After logout, back button can navigate back to /dashboard
async function handleLogout() {
  await signOut();
  router.push("/login"); // history: [..., /dashboard, /login]
  // back button → /dashboard (layout re-renders, auth guard kicks in — but flickery)
}
```

**Fix:**

```tsx
// ✅ Replace history — /dashboard is no longer in history stack
async function handleLogout() {
  await signOut();
  router.replace("/login"); // history: [..., /login]
  // back button → wherever they were before /dashboard ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `NavigationProgress` component and a `SubmitWithNavigation` button that together demonstrate all loading UX patterns:

1. `NavigationProgress` — a thin top bar that animates on every page navigation (using `template.tsx` placement logic, but as a component for flexibility)
2. `SubmitWithNavigation` — a button that:
   - Calls an async `onSubmit` function
   - Navigates to a success URL using `router.push` inside `startTransition`
   - Shows a spinner + "Saving..." text while `isPending`
   - Disables itself during pending state
   - Handles errors by calling an `onError` callback
3. Show how both are wired together in a real page

### Solution

```tsx
// src/components/ui/navigation-progress.tsx
// Drop this into app/template.tsx as a child, or use directly
"use client";

import { useEffect, useRef } from "react";

export function NavigationProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // ─── Phase 1: Reset
    bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.width = "0%";

    // ─── Phase 2: Animate to 85% (simulates progress)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        bar.style.width = "85%";

        // ─── Phase 3: Complete to 100%, then fade out
        const doneTimer = setTimeout(() => {
          bar.style.transition = "width 0.15s ease-out";
          bar.style.width = "100%";

          const fadeTimer = setTimeout(() => {
            bar.style.transition = "opacity 0.3s ease";
            bar.style.opacity = "0";
          }, 150);

          return () => clearTimeout(fadeTimer);
        }, 500);

        return () => clearTimeout(doneTimer);
      });
    });
  }, []); // ← runs once on mount (template.tsx remounts each navigation)

  return (
    <div
      ref={barRef}
      role="progressbar"
      aria-label="Page loading"
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-blue-500
                 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
      style={{ width: "0%", opacity: 0 }}
    />
  );
}
```

```tsx
// src/app/template.tsx — wire NavigationProgress into the template
"use client";

import { NavigationProgress } from "@/components/ui/navigation-progress";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavigationProgress />
      <div className="animate-in fade-in duration-200">{children}</div>
    </>
  );
}
```

```tsx
// src/components/ui/submit-with-navigation.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SubmitWithNavigationProps {
  onSubmit: () => Promise<void>;
  successUrl: string;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  pendingText?: string;
  className?: string;
  replace?: boolean; // use router.replace instead of push
}

export function SubmitWithNavigation({
  onSubmit,
  successUrl,
  onError,
  children = "Save",
  pendingText = "Saving...",
  className,
  replace = false,
}: SubmitWithNavigationProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    try {
      // ─── 1. Run the async action
      await onSubmit();

      // ─── 2. Navigate inside startTransition — isPending stays true
      //        until the new page finishes rendering
      startTransition(() => {
        if (replace) router.replace(successUrl);
        else router.push(successUrl);
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "px-5 py-2.5 rounded-lg font-medium text-sm",
        "bg-blue-600 text-white",
        "hover:bg-blue-700 transition-colors",
        "disabled:opacity-60 disabled:cursor-wait",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {isPending ? (
        <>
          {/* Spinner */}
          <span
            className="w-4 h-4 border-2 border-white border-t-transparent
                       rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
          <span>{pendingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

```tsx
// src/app/(dashboard)/products/new/page.tsx
// Wiring both components together in a real page
import type { Metadata } from "next";
import { NewProductPageContent } from "./_components/new-product-page-content";

export const metadata: Metadata = { title: "New Product" };

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Create New Product
      </h1>
      <NewProductPageContent />
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/products/new/_components/new-product-page-content.tsx
"use client";

import { useRef, useState } from "react";
import { SubmitWithNavigation } from "@/components/ui/submit-with-navigation";

export function NewProductPageContent() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  // The async action — called by SubmitWithNavigation before navigating
  async function handleSubmit() {
    setError(null);

    if (!formRef.current) throw new Error("Form not found");
    const data = Object.fromEntries(new FormData(formRef.current));

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Failed to create product");
    }

    const { id } = await res.json();
    setProductId(id); // store for successUrl
  }

  function handleError(err: Error) {
    setError(err.message);
  }

  return (
    <form
      ref={formRef}
      className="space-y-5"
      onSubmit={(e) => e.preventDefault()}
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Air Max 90"
          className="w-full border rounded-lg px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1.5">
          Price ($) <span className="text-red-500">*</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="0.00"
          className="w-full border rounded-lg px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium mb-1.5"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Product description..."
          className="w-full border rounded-lg px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SubmitWithNavigation
          onSubmit={handleSubmit}
          successUrl={productId ? `/products/${productId}` : "/products"}
          onError={handleError}
          pendingText="Creating product..."
          className="flex-1 py-3"
        >
          Create Product
        </SubmitWithNavigation>

        <a
          href="/products"
          className="px-5 py-3 text-sm font-medium text-gray-600
                     border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
```

---

## ✅ Day 3 Complete — Navigation and URL State

| #   | Subtopic                                                     | Status |
| --- | ------------------------------------------------------------ | ------ |
| 1   | `<Link>` — Client-Side Navigation                            | ☐      |
| 2   | Prefetching — How Next.js Preloads Routes                    | ☐      |
| 3   | `useRouter` — Programmatic Navigation                        | ☐      |
| 4   | `usePathname` — Reading the Current Path                     | ☐      |
| 5   | `useParams` — Reading Dynamic Route Params Client-Side       | ☐      |
| 6   | `useSearchParams` — Reading Query Parameters                 | ☐      |
| 7   | Search Param Patterns — Filter, Sort, Pagination via URL     | ☐      |
| 8   | Route-Aware Navigation — Active Links and Breadcrumbs        | ☐      |
| 9   | URL-Driven UI State — The Complete Pattern                   | ☐      |
| 10  | Navigation UX — Loading States, Transitions, Scroll Behavior | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 3

```
NAVIGATION PRIMITIVES
  <Link href="/path">           → client-side nav (no reload, prefetches)
  <Link href={{ pathname, query }}>  → object form for dynamic query strings
  <Link replace>                → replace history (no back to current page)
  <Link scroll={false}>         → preserve scroll position on navigation
  <Link prefetch={false}>       → disable auto-prefetch (use on long lists)
  <a href="https://...">        → external links (not <Link>)

PROGRAMMATIC NAVIGATION (import from 'next/navigation' — NOT 'next/router')
  router.push(url)              → navigate + add to history
  router.replace(url)           → navigate + replace history (no back)
  router.back()                 → browser back button
  router.refresh()              → re-fetch current page Server Components
  router.prefetch(url)          → manually prefetch a route

READING ROUTE STATE (all Client Component hooks — 'use client' required)
  usePathname()                 → '/products/42' (no query, no hash)
  useParams<{id:string}>()      → { id: '42' } (dynamic route segments)
  useSearchParams()             → URLSearchParams object (?q=shoes&page=2)
                                   ⚠️ MUST be wrapped in <Suspense>

UPDATING SEARCH PARAMS (the correct pattern)
  const params = new URLSearchParams(searchParams.toString())  // mutable copy
  params.set('key', 'value')    → set/replace single value
  params.append('key', 'val')   → add value (multi-select: ?brand=a&brand=b)
  params.delete('key')          → remove param
  router.push(`${pathname}?${params.toString()}`, { scroll: false })

URL AS STATE (when to use URL vs useState)
  URL:       filters, sort, page, tabs, view mode, modal open+id, search query
  useState:  hover, focus, animations, dropdowns, tooltips, form input (pre-submit)
  Rule:      "Would user want to share/bookmark this state?" → YES = URL

ACTIVE LINKS (using usePathname)
  exact:       pathname === href
  child-aware: pathname === href || pathname.startsWith(`${href}/`)
  aria-current={isActive ? 'page' : undefined}  ← accessibility required

LOADING PATTERNS
  loading.tsx       → automatic Suspense for slow page data (per-route)
  template.tsx      → progress bar / analytics (remounts every navigation)
  useTransition     → isPending for programmatic router.push (per-component)

PREFETCHING
  Default (null)    → auto-prefetch when link enters viewport
  prefetch={true}   → eager prefetch always (featured/important links)
  prefetch={false}  → disabled (use on long lists, 50+ items)
  Only active in production (next build && next start)

SCROLL RULES
  scroll={true}    (default) → scroll to top on navigation (new pages)
  scroll={false}             → preserve position (filters, tabs, pagination)
  replace after auth         → router.replace('/login') not router.push

SUSPENSE REQUIREMENT
  Every component using useSearchParams MUST be wrapped in <Suspense>
  Best practice: bake <Suspense> into the component's export function
  export function MyFilter() {
    return <Suspense fallback={<Skeleton />}><MyFilterInner /></Suspense>
  }
```

---

> **Your next action:** Open your Next.js project. Add `usePathname` to your nav component and apply an active class to the current route's link. Add `aria-current="page"` to the active item. Takes 5 minutes — you'll see the difference immediately.
>
> _Doing one small thing beats opening a feed._

```tsx
// src/components/nav-link-with-pending.tsx
'use client'

import Link                        from 'next/link'
import { useTransition }           from 'react'
import { useRouter }               from 'next/navigation'
import { cn }                      from '@/lib/utils'

interface Props {
  href:     string
  children: React.ReactNode
}

export function NavLinkWithPending({ href, children }: Props) {
  const [isPending
```
