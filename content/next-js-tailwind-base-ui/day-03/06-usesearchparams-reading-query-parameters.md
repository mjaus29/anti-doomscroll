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
