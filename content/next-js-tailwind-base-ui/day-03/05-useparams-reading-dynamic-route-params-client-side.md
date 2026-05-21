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
