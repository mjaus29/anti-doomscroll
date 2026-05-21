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
