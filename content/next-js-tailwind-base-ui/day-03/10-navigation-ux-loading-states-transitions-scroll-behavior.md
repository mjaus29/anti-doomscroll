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
