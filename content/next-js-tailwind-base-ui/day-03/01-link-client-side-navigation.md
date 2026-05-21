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
