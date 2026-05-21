# 10 — Combining All Special Files — Complete Route Boundary Architecture

---

## T — TL;DR

Every special file has a precise responsibility and scope. Combining them into a coherent architecture means every failure mode — loading, error, missing, forbidden, unauthorized, modal, parallel — has a deliberate, user-tested response. This subtopic assembles the complete picture.

---

## K — Key Concepts

### The Complete Special Files Reference

```
File                  Trigger                        HTTP   Scope
─────────────────     ─────────────────────────      ────   ──────────────────────────
loading.tsx           page.tsx suspends (data fetch)  200   same segment + children
error.tsx             page.tsx throws at runtime       500   same segment (not layout)
not-found.tsx         notFound() called                404   nearest ancestor
global-error.tsx      root layout.tsx throws           500   root only (replaces html/body)
default.tsx           parallel slot has no match       —     specific @slot folder
forbidden.tsx         forbidden() called               403   nearest ancestor
unauthorized.tsx      unauthorized() called            401   nearest ancestor
template.tsx          remounts on every navigation     —     same segment + children
```

### The Scope Diagram — All Files Together

```
src/app/
├── layout.tsx            ← root layout (html + body)
├── template.tsx          ← remounts per navigation (progress bar, analytics)
├── global-error.tsx      ← catches root layout.tsx crashes (replaces html/body)
├── not-found.tsx         ← root 404 fallback (unknown URLs + notFound() fallback)
├── loading.tsx           ← root loading fallback (rarely used at root level)
│
└── (dashboard)/
    ├── layout.tsx        ← group layout (auth guard, sidebar)
    │
    └── dashboard/
        ├── layout.tsx    ← section layout (section-specific chrome)
        ├── loading.tsx   ← covers dashboard/ page AND all children below
        ├── error.tsx     ← covers dashboard/ page errors (NOT layout errors)
        ├── not-found.tsx ← covers notFound() from dashboard/* pages
        ├── forbidden.tsx ← covers forbidden() from dashboard/* pages
        ├── unauthorized.tsx ← covers unauthorized() from dashboard/* pages
        ├── page.tsx      ← /dashboard
        │
        ├── @modal/
        │   ├── default.tsx    ← null (no modal active)
        │   └── (.)orders/
        │       └── [orderId]/
        │           └── page.tsx  ← modal render
        │
        └── orders/
            ├── loading.tsx   ← overrides parent loading.tsx for /dashboard/orders
            ├── error.tsx     ← overrides parent error.tsx for /dashboard/orders
            ├── not-found.tsx ← overrides parent not-found for orders
            ├── page.tsx      → /dashboard/orders
            └── [orderId]/
                ├── page.tsx  → /dashboard/orders/:id
                └── not-found.tsx  ← most specific not-found for order detail
```

### Decision Tree — Which File to Create

```
User sees something unexpected while navigating?
│
├─ "The page is loading slowly"
│   └── Create: loading.tsx
│       → Use granular <Suspense> inside page for progressive streaming
│
├─ "Something crashed"
│   ├─ Did layout.tsx crash?
│   │   ├─ Root layout → global-error.tsx (includes html + body)
│   │   └─ Section layout → parent's error.tsx
│   └─ Did page.tsx crash?
│       └── Create: error.tsx in same segment
│           → 'use client', has reset() + router.refresh()
│
├─ "The resource doesn't exist"
│   └── Call: notFound()
│       └── Create: not-found.tsx (section-level for layout context)
│
├─ "User is not logged in"
│   ├─ Option A: redirect('/login?redirect=<url>') — most common
│   └── Option B: unauthorized() + unauthorized.tsx — inline auth prompt
│
├─ "User is logged in but lacks permission"
│   └── Call: forbidden()
│       └── Create: forbidden.tsx with upgrade CTA or contact admin link
│
└─ "Modal / split view needed"
    ├─ Create: @slot/ folder + layout prop
    ├─ Create: @slot/default.tsx (always required)
    └─ For modal: @slot/(.)target/[param]/page.tsx (intercepting route)
```

### Complete Architecture — SaaS Dashboard Section

```
src/app/
│
├── layout.tsx                          ← ROOT: html, body, providers
├── template.tsx                        ← global nav progress bar
├── global-error.tsx                    ← last resort error (root layout crash)
├── not-found.tsx                       ← root 404 with search + quick links
│
└── (dashboard)/
    ├── layout.tsx                      ← auth guard + global sidebar
    │
    └── dashboard/
        ├── layout.tsx                  ← dashboard section layout
        ├── loading.tsx                 ← dashboard section skeleton
        ├── error.tsx                   ← dashboard section error + retry
        ├── forbidden.tsx               ← feature gating (upgrade CTA)
        ├── unauthorized.tsx            ← session expired prompt
        ├── page.tsx                    → /dashboard
        │
        ├── @modal/
        │   ├── default.tsx             ← null
        │   └── (.)orders/
        │       └── [orderId]/
        │           ├── page.tsx        ← order modal
        │           └── loading.tsx     ← modal loading state
        │
        ├── orders/
        │   ├── loading.tsx             ← orders-specific skeleton
        │   ├── error.tsx               ← orders error + offline detection
        │   ├── not-found.tsx           ← order not found (inside layout)
        │   ├── page.tsx                → /dashboard/orders
        │   └── [orderId]/
        │       ├── page.tsx            → /dashboard/orders/:id
        │       └── not-found.tsx       ← individual order not found
        │
        └── settings/
            ├── layout.tsx              ← settings tabs nav
            ├── forbidden.tsx           ← plan-gated settings (upgrade)
            ├── page.tsx                → /dashboard/settings
            ├── billing/
            │   ├── forbidden.tsx       ← billing needs pro plan
            │   └── page.tsx
            └── team/
                ├── forbidden.tsx       ← team needs enterprise plan
                └── page.tsx
```

### How Special Files Interact — A Walkthrough

```
Scenario: User on free plan visits /dashboard/settings/billing

1. (dashboard)/layout.tsx runs
   → getCurrentUser() → user found (authenticated) ✅
   → dashboard sidebar renders

2. dashboard/layout.tsx runs
   → settings tabs layout renders

3. dashboard/settings/billing/page.tsx runs
   → const user = await getCurrentUser()  [cached — no extra DB query]
   → user.plan === 'free'
   → forbidden()  ← throws

4. Next.js walks up the tree looking for forbidden.tsx:
   → dashboard/settings/billing/forbidden.tsx ✅ found
   → renders inside BOTH layouts (sidebar + settings tabs stay visible)
   → shows "Upgrade to Pro" CTA

5. HTTP response: 403 Forbidden
   → Search engines won't index this page ✅
   → User sees upgrade CTA with full navigation context ✅

Scenario: User visits /dashboard/orders/nonexistent-id

1. Layouts render (auth passes) ✅
2. dashboard/orders/[orderId]/page.tsx runs
   → getOrder('nonexistent-id') → null
   → notFound()  ← throws

3. Next.js walks up:
   → dashboard/orders/[orderId]/not-found.tsx ✅ (most specific)
   → renders inside layouts (sidebar + orders context visible)

4. HTTP response: 404 Not Found ✅

Scenario: /dashboard/orders/[orderId]/page.tsx throws unexpected error

1. Layouts render ✅
2. page.tsx throws Error('Database connection timeout')
3. Next.js finds error.tsx:
   → dashboard/orders/error.tsx ✅
   → renders inside layouts (sidebar stays)
   → shows retry button + error digest

4. User clicks "Try Again":
   → router.refresh() clears cache
   → reset() re-renders page.tsx
   → If DB recovered: page renders ✅
   → If still failing: error.tsx shows again (with retry count)
```

### Full Special Files Implementation — Dashboard Section

```tsx
// src/app/layout.tsx — ROOT
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { template: "%s | AppName", default: "AppName" },
  description: "Your SaaS dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/global-error.tsx — ROOT LAYOUT CRASH
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          className="min-h-screen bg-gray-50 flex items-center
                        justify-center text-center px-4"
        >
          <div>
            <p className="text-6xl mb-4">💥</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Critical Application Error
            </h1>
            <p className="text-gray-500 mb-6 max-w-xs">
              A critical error occurred. Please refresh the page or try again.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 font-mono mb-4">
                Ref: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm
                           font-medium rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-5 py-2.5 border text-gray-600 text-sm
                           font-medium rounded-lg hover:bg-gray-50"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

```tsx
// src/app/(dashboard)/layout.tsx — AUTH GUARD
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/loading.tsx
export default function DashboardSectionLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-lg mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white border rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white border rounded-xl" />
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/error.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Something Went Wrong
      </h2>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => {
            router.refresh();
            reset();
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border text-gray-600 text-sm
                     rounded-lg hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/forbidden.tsx
import Link from "next/link";

export default function DashboardForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⭐</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This feature is not available on your current plan. Upgrade to unlock
        full access.
      </p>
      <div className="flex gap-3">
        <Link
          href="/pricing"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          View Plans
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/unauthorized.tsx
import Link from "next/link";

export default function DashboardUnauthorized() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Your session has expired. Sign in again to continue.
      </p>
      <Link
        href="/login?redirect=/dashboard"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        Sign In Again
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/not-found.tsx
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This dashboard page doesn't exist.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        ← Dashboard Home
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/@modal/default.tsx
export default function DashboardModalDefault() {
  return null;
}
```

```tsx
// src/app/(dashboard)/dashboard/@modal/(.)orders/[orderId]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const ORDERS: Record<
  string,
  { number: number; customer: string; total: number; status: string }
> = {
  "ord-001": {
    number: 1042,
    customer: "Alice Johnson",
    total: 249.0,
    status: "delivered",
  },
  "ord-002": {
    number: 1043,
    customer: "Bob Smith",
    total: 89.99,
    status: "pending",
  },
  "ord-003": {
    number: 1044,
    customer: "Carol White",
    total: 420.5,
    status: "shipped",
  },
};

export default function OrderModal({
  params,
}: {
  params: { orderId: string };
}) {
  const router = useRouter();
  const order = ORDERS[params.orderId];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (!order) return null;

  const STATUS_STYLE: Record<string, string> = {
    delivered: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center
                 justify-center p-4"
      onClick={() => router.back()}
      role="dialog"
      aria-modal="true"
      aria-label={`Order #${order.number}`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-900">Order #{order.number}</h2>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium">{order.customer}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-blue-600">
              ${order.total.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500">Status</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${STATUS_STYLE[order.status]}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Link
            href={`/dashboard/orders/${params.orderId}`}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium
                       rounded-lg hover:bg-blue-700 text-center"
          >
            View Full Details
          </Link>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border text-gray-600 text-sm rounded-lg
                       hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- The complete boundary architecture is what makes a Next.js app production-ready — every failure mode has a deliberate, user-oriented response that keeps users in context and gives them a clear path forward.
- Understanding how all special files compose together (scope, inheritance, which catches what) prevents the silent failures and confusing 404s that show up after deployment.
- The decision tree (loading? error? not-found? forbidden? unauthorized?) is the mental model you apply to every new route — it becomes second nature and prevents "what do users see if X fails?" from being an afterthought.
- Parallel routes + intercepting routes + `default.tsx` is the trio that enables the modal patterns used by every major SaaS product — without understanding all three, the pattern breaks at the edges (hard refresh, direct URL, back button).

---

## I — Interview Q&A

### Q1: Walk me through every special file and what it handles.

**A:**

- `loading.tsx` — automatic Suspense boundary, shows while `page.tsx` is fetching async data. Scoped to the same segment and children. Enables streaming HTML.
- `error.tsx` — Client Component error boundary for `page.tsx` runtime errors. Has `reset()` to retry. Does NOT catch `layout.tsx` errors at the same level. Returns 500.
- `global-error.tsx` — catches root `layout.tsx` errors only. Must include `<html>` and `<body>`. Last resort.
- `not-found.tsx` — renders when `notFound()` is called. Returns 404. Scoped to nearest ancestor. Root version handles unknown URLs.
- `default.tsx` — fallback for parallel route `@slots` when no page matches. Required to prevent 404 on hard refresh.
- `forbidden.tsx` — renders when `forbidden()` is called. Returns 403. For authenticated users lacking permission.
- `unauthorized.tsx` — renders when `unauthorized()` is called. Returns 401. For unauthenticated users.
- `template.tsx` — like `layout.tsx` but remounts on every navigation. Used for progress bars and analytics.

### Q2: What happens if you don't have a `default.tsx` for a parallel route slot?

**A:** Client navigation works fine — React preserves the previous slot state when navigating between pages. But on hard refresh or direct URL visit, Next.js must independently determine what each slot should render from the URL alone. If no matching page exists for a slot and there's no `default.tsx`, Next.js can't render the page — it returns a 404. `default.tsx` is the fallback that says "render this (or nothing) when no specific page matches this slot." Every `@slot/` folder must have one.

### Q3: In what order does Next.js look for special files when `notFound()` is called deep in a nested route?

**A:** Next.js walks up the directory tree from the call site, looking for the nearest `not-found.tsx`. For a call in `app/(dashboard)/dashboard/orders/[orderId]/page.tsx`, it checks: `orders/[orderId]/not-found.tsx` (doesn't exist) → `orders/not-found.tsx` (found, use this). If that didn't exist either: `dashboard/not-found.tsx` → `(dashboard)/not-found.tsx` → `app/not-found.tsx`. The key benefit: whichever `not-found.tsx` is found renders inside ALL parent layouts above it, so the dashboard sidebar and section navigation stay visible when a specific order isn't found.

### Q4: Can you use `loading.tsx` and manual `<Suspense>` in the same page?

**A:** Yes — and this is the recommended best practice. `loading.tsx` provides instant route-level feedback the moment a user navigates to the page. Manual `<Suspense>` boundaries inside `page.tsx` enable individual sections to stream in independently as each resolves. The result: the skeleton appears at t=0ms (loading.tsx), then fast sections appear at t=100ms (Suspense), then slow sections at t=800ms (Suspense). This is the full streaming experience — route-level skeleton + progressive section rendering.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Relying on only root `not-found.tsx` for all 404s

```tsx
// Only src/app/not-found.tsx exists
// User is in /dashboard, clicks an order link, order is deleted
// notFound() triggers root not-found.tsx
// Entire page replaces with full-screen 404 — dashboard sidebar GONE
// User has to use browser back button to return to their work
```

**Fix:** Place `not-found.tsx` at every meaningful section:

```
dashboard/orders/not-found.tsx       ← renders inside dashboard layout ✅
dashboard/orders/[orderId]/not-found.tsx ← most specific ✅
```

### ❌ Pitfall: Using `error.tsx` to handle 404s

```tsx
// ❌ Developer throws a custom error for missing resources
if (!product) throw new Error("Product not found");
// error.tsx catches it — shows "Something went wrong" + retry button
// Retry will always fail (product still doesn't exist)
// HTTP status is 500, not 404 — bad for SEO and monitoring
```

**Fix:** Use `notFound()` for missing resources, `error.tsx` only for unexpected failures:

```tsx
if (!product) notFound(); // ← 404, renders not-found.tsx, no retry needed
```

### ❌ Pitfall: Putting auth logic in `page.tsx` when it should be in layout

```tsx
// ❌ Auth check in every single page
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // repeated 20+ times
  // ...
}
```

**Fix:** One auth check in the group layout:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function Layout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← ONE check, ALL dashboard routes protected
  return <>{children}</>;
}
```

### ❌ Pitfall: No `global-error.tsx` — root layout crash = blank page in production

```tsx
// Root layout.tsx throws (provider crash, font loading error, etc.)
// No global-error.tsx → users see blank white page in production
// No retry, no navigation, no context
```

**Fix:**

```tsx
// src/app/global-error.tsx
"use client";
export default function GlobalError({ reset }) {
  return (
    <html>
      <body>
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <h1>Application Error</h1>
          <button onClick={reset}>Try Again</button>
          <br />
          <a href="/">Reload</a>
        </div>
      </body>
    </html>
  );
}
```

### ❌ Pitfall: `error.tsx` catching `notFound()` calls

```tsx
// notFound() throws a special Next.js error internally
// If you wrap notFound() in try/catch, you swallow it
try {
  if (!product) notFound(); // ← notFound() throws
} catch (e) {
  // ❌ You just caught the notFound() throw — 404 never happens
  // Page renders as if no error occurred, with null product
}
```

**Fix:** Never wrap `notFound()`, `forbidden()`, `unauthorized()`, or `redirect()` in try/catch:

```tsx
// These all throw internally — always let them propagate
if (!product) notFound();
if (!user) redirect("/login");
if (!user.isAdmin) forbidden();
if (!user.session) unauthorized();

// If you need try/catch for OTHER errors:
try {
  await riskyOperation();
} catch (e) {
  // handle specific error types here
  // but don't call notFound/forbidden/redirect inside this block
}
if (!product) notFound(); // ← after the try/catch ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build the complete route boundary architecture for a `/dashboard/projects/[projectId]` route section. It must include:

1. `loading.tsx` — 2-column skeleton matching the real layout
2. `error.tsx` — with retry, go-back, and offline detection
3. `not-found.tsx` — project-specific 404 with link to projects list
4. `forbidden.tsx` — for projects on pro plan only (shows upgrade CTA)
5. `page.tsx` — calls `notFound()` for invalid IDs, `forbidden()` for free plan, has one `<Suspense>` for a slow team members section
6. A `_components/team-members.tsx` async Server Component
7. Document the full render tree for each failure scenario

### Solution

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/loading.tsx
export default function ProjectLoading() {
  return (
    <div className="p-8 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main content — 2/3 width */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5">
            <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              {[90, 80, 70, 60].map((w) => (
                <div
                  key={w}
                  className="h-4 bg-gray-100 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-xl p-5 h-40">
            <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-24 bg-gray-100 rounded-lg" />
          </div>
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <div className="w-7 h-7 bg-gray-200 rounded-full shrink-0" />
                <div className="h-4 bg-gray-100 rounded flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/error.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    console.error("[ProjectError]", error);
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      router.refresh();
      reset();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router, reset]);

  if (!online) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      min-h-[400px] text-center px-4"
      >
        <p className="text-5xl mb-4">📡</p>
        <h2 className="text-xl font-bold mb-2">No Connection</h2>
        <p className="text-gray-500 text-sm mb-4">
          Will automatically reload when you're back online.
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Waiting for connection...
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Failed to Load Project
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-4">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => {
            router.refresh();
            reset();
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border text-gray-600 text-sm
                     rounded-lg hover:bg-gray-50"
        >
          Go Back
        </button>
        <a
          href="/dashboard/projects"
          className="px-4 py-2 border text-gray-600 text-sm
                      rounded-lg hover:bg-gray-50"
        >
          All Projects
        </a>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/not-found.tsx
import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">📋</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Project Not Found
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        This project doesn't exist, was deleted, or you don't have access.
      </p>
      <Link
        href="/dashboard/projects"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                   font-medium rounded-lg hover:bg-blue-700"
      >
        ← All Projects
      </Link>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/forbidden.tsx
import Link from "next/link";

export default function ProjectForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <p className="text-5xl mb-4">⭐</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Advanced project management is available on the Pro plan. Upgrade to
        create and manage unlimited projects.
      </p>
      <div className="flex gap-3">
        <Link
          href="/pricing"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700"
        >
          Upgrade to Pro
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border text-gray-600 text-sm
                     font-medium rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/_components/team-members.tsx
// Slow async Server Component — streams in independently
async function getTeamMembers(projectId: string) {
  await new Promise((r) => setTimeout(r, 700)); // simulate DB join query
  return [
    { id: "u1", name: "Alice Chen", role: "Lead", initial: "A" },
    { id: "u2", name: "Bob Kim", role: "Developer", initial: "B" },
    { id: "u3", name: "Carol Davis", role: "Designer", initial: "C" },
  ];
}

export async function TeamMembers({ projectId }: { projectId: string }) {
  const members = await getTeamMembers(projectId);

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3
        className="text-sm font-semibold text-gray-700 uppercase
                     tracking-wide mb-3"
      >
        Team ({members.length})
      </h3>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center
                            justify-center text-white text-xs font-bold shrink-0"
            >
              {m.initial}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-400">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/projects/[projectId]/page.tsx
import type { Metadata } from "next";
import { notFound, forbidden } from "next/navigation";
import { Suspense } from "react";
import { TeamMembers } from "./_components/team-members";
import { getCurrentUser } from "@/lib/auth";

type Params = Promise<{ projectId: string }>;

// Mock project data
async function getProject(id: string, userId: string) {
  const projects: Record<
    string,
    {
      name: string;
      plan: string;
      status: string;
      ownerId: string;
      desc: string;
    }
  > = {
    "proj-free": {
      name: "Free Project",
      plan: "free",
      status: "active",
      ownerId: "u1",
      desc: "A basic project on the free plan.",
    },
    "proj-pro": {
      name: "Pro Project",
      plan: "pro",
      status: "active",
      ownerId: "u1",
      desc: "An advanced project on the Pro plan.",
    },
  };
  return projects[id] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Project" };
  const project = await getProject(projectId, user.id);
  return { title: project?.name ?? "Project Not Found" };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) forbidden(); // session expired

  const project = await getProject(projectId, user!.id);

  // ─── Not found
  if (!project) notFound();

  // ─── Plan gate — pro projects require pro plan
  if (project!.plan === "pro" && user!.plan === "free") {
    forbidden();
  }

  const STATUS_COLOR: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    done: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project!.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium
                              ${STATUS_COLOR[project!.status]}`}
            >
              {project!.status}
            </span>
            <span className="text-xs text-gray-400">ID: {projectId}</span>
          </div>
        </div>
        <button
          className="px-4 py-2 border rounded-lg text-sm text-gray-600
                           hover:bg-gray-50"
        >
          Edit Project
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main — 2/3 */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 text-sm">{project!.desc}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Tasks</h2>
            <p className="text-gray-400 text-sm italic">No tasks yet.</p>
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div>
          {/* Team members — streams in at ~700ms */}
          <Suspense
            fallback={
              <div className="bg-white border rounded-xl p-4 animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <div className="w-7 h-7 bg-gray-200 rounded-full shrink-0" />
                    <div className="h-4 bg-gray-100 rounded flex-1" />
                  </div>
                ))}
              </div>
            }
          >
            <TeamMembers projectId={projectId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

```
Render tree for each failure scenario:

1. /dashboard/projects/proj-pro (free plan user)
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectForbidden />   ← forbidden() triggers forbidden.tsx
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 403 — sidebar stays ✅, upgrade CTA shown ✅

2. /dashboard/projects/nonexistent-id
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectNotFound />    ← notFound() triggers not-found.tsx
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 404 — sidebar stays ✅, link to projects list ✅

3. /dashboard/projects/proj-pro (page.tsx throws at runtime)
   <RootLayout>
     <DashboardGroupLayout>   ← auth passes
       <ProjectError />       ← error.tsx catches throw
     </DashboardGroupLayout>
   </RootLayout>
   HTTP: 500 — retry button ✅, offline detection ✅, escape routes ✅

4. /dashboard/projects/proj-pro (loading)
   <RootLayout>
     <DashboardGroupLayout>
       <ProjectLoading />     ← loading.tsx shows while page fetches
     </DashboardGroupLayout>
   </RootLayout>
   t=0ms:   2-column skeleton ✅
   t=?ms:   page renders, team members slot still showing skeleton
   t=700ms: TeamMembers streams in, replaces sidebar skeleton ✅

5. /dashboard/projects/proj-pro (session expired)
   <RootLayout>
     <DashboardGroupLayout>
       <ProjectForbidden />   ← forbidden() (no user = forbidden)
     </DashboardGroupLayout>
   </RootLayout>
   OR: getCurrentUser() fails → DashboardGroupLayout redirects to /login first
```

---

## ✅ Day 5 Complete — Route Boundaries and Special Files

| #   | Subtopic                                                           | Status |
| --- | ------------------------------------------------------------------ | ------ |
| 1   | `loading.tsx` — Streaming and Suspense Boundaries                  | ☐      |
| 2   | `error.tsx` — Error Boundaries and Recovery                        | ☐      |
| 3   | `not-found.tsx` — 404 Handling and `notFound()`                    | ☐      |
| 4   | `default.tsx` — Parallel Route Fallbacks                           | ☐      |
| 5   | `forbidden.tsx` — 403 Authorization Errors                         | ☐      |
| 6   | `unauthorized.tsx` — 401 Authentication Errors                     | ☐      |
| 7   | Parallel Routes — `@slot` Architecture                             | ☐      |
| 8   | Intercepting Routes — Modal Patterns                               | ☐      |
| 9   | Resilient Navigation and Recovery Flows                            | ☐      |
| 10  | Combining All Special Files — Complete Route Boundary Architecture | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 5

```
SPECIAL FILE REFERENCE
  loading.tsx      → Suspense boundary around page.tsx; shows on navigation
  error.tsx        → Error boundary for page.tsx throws; 'use client' required
  global-error.tsx → Error boundary for root layout.tsx; includes html+body
  not-found.tsx    → Renders on notFound(); HTTP 404
  default.tsx      → Fallback for @slot when no page matches; prevents 404 on refresh
  forbidden.tsx    → Renders on forbidden(); HTTP 403; authenticated, no permission
  unauthorized.tsx → Renders on unauthorized(); HTTP 401; not authenticated
  template.tsx     → Remounts every navigation; progress bar, analytics

SCOPE RULES
  loading.tsx      → same segment + all children (unless child overrides)
  error.tsx        → same segment's page.tsx ONLY — NOT same-level layout.tsx
  not-found.tsx    → nearest ancestor walking UP from call site
  default.tsx      → specific @slot folder only
  forbidden.tsx    → nearest ancestor walking UP from call site
  unauthorized.tsx → nearest ancestor walking UP from call site
  global-error.tsx → root layout.tsx errors ONLY

WHAT EACH DOES NOT CATCH
  error.tsx        → does NOT catch same-level layout.tsx errors
                     use parent's error.tsx for that
  not-found.tsx    → does NOT affect HTTP status on its own
                     must call notFound() to get HTTP 404
  loading.tsx      → does NOT show for client state updates, mutations
                     use isPending from useTransition for those

TRIGGER FUNCTIONS (import from 'next/navigation')
  notFound()       → HTTP 404 → nearest not-found.tsx
  forbidden()      → HTTP 403 → nearest forbidden.tsx
  unauthorized()   → HTTP 401 → nearest unauthorized.tsx
  redirect(url)    → HTTP 307/308 → navigates to url
  ⚠️ All four THROW internally — never wrap in try/catch

RESET PATTERN (error.tsx)
  ❌ reset()                     ← retries with stale cache
  ✅ router.refresh(); reset()   ← clears cache THEN retries

PARALLEL ROUTES
  @slot/           → named slot folder (no URL impact)
  layout receives: { children, slotName } as props
  @slot/default.tsx → REQUIRED — prevents 404 on hard refresh
  @slot/loading.tsx → slot-specific loading (independent)
  @slot/error.tsx   → slot-specific error (doesn't affect other slots)

INTERCEPTING ROUTES
  (.)path    → intercept sibling route (same directory level)
  (..)path   → intercept one level up
  (...)path  → intercept at app root
  On client nav: renders intercepted version (modal)
  On direct URL: renders normal version (full page)
  On refresh:    renders normal version (modal state lost — correct)
  ⚠️ ALWAYS needs scroll={false} on the <Link> that triggers it

RECOVERY FLOW DECISION
  "Slow load"          → loading.tsx + granular <Suspense>
  "Page crashed"       → error.tsx with reset() + router.refresh()
  "Layout crashed"     → parent's error.tsx
  "Root crashed"       → global-error.tsx
  "Resource missing"   → notFound() → not-found.tsx (section-level)
  "Not authenticated"  → redirect('/login') OR unauthorized()
  "No permission"      → forbidden() → forbidden.tsx with upgrade CTA

BEST PRACTICES
  ✅ Section-level not-found.tsx — keeps layout context visible
  ✅ error.tsx always has 2+ escape routes (retry + back + home)
  ✅ Show error.digest as support reference, never raw error.stack in prod
  ✅ Use forbidden() for plan gating (never just hide the route)
  ✅ Every @slot/ needs default.tsx (no exceptions)
  ✅ loading.tsx + manual <Suspense> together for best perceived performance
  ✅ global-error.tsx — the safety net you always need, rarely notice
  ✅ Auto-retry + countdown for transient errors (network, cold start)
  ✅ Offline detection + auto-recover in error.tsx for mobile users
```

---

> **Your next action:** Open your Next.js project. Create `src/app/error.tsx` with `'use client'`, a friendly message, and a retry button that calls `router.refresh()` then `reset()`. You now have a safety net for every unhandled page error in your app. 5 minutes of work that prevents blank screens forever.
>
> _Doing one small thing beats opening a feed._
