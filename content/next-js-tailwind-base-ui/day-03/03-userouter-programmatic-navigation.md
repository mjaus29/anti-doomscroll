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
