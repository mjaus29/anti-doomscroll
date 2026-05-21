# 2 — `layout.tsx` — Persistent Wrappers

---

## T — TL;DR

`layout.tsx` wraps its segment's routes and **persists across navigations** — it renders once and never unmounts when the user moves between routes in the same segment. It is the mechanism for persistent sidebars, navigation bars, and shared context.

---

## K — Key Concepts

### The Fundamental Behavior

```
User navigates: /dashboard → /dashboard/orders → /dashboard/settings

Without layout.tsx:
  → Full re-render on every navigation
  → Sidebar re-mounts, scroll position lost, animations reset

With layout.tsx:
  → layout.tsx renders ONCE
  → Only the {children} (page.tsx) swaps out
  → Sidebar state, scroll position, and context all preserved
```

### The Minimum Layout

```tsx
// src/app/layout.tsx — root layout (REQUIRED)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Layout Props — Only `children` (No `params` Access by Default)

```tsx
// ⚠️ layouts DO receive params — but only for their own segment
// src/app/users/[userId]/layout.tsx
export default function UserLayout({
  children,
  params, // ← layout can receive params for its own segment
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  // Note: layout does NOT receive searchParams — only page.tsx does
  return (
    <div className="flex">
      <UserSidebar userId={params} />
      <main>{children}</main>
    </div>
  );
}
```

```tsx
// ✅ Correct: await params in layout
export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getUser(userId);

  return (
    <div>
      <header>Welcome, {user.name}</header>
      <main>{children}</main>
    </div>
  );
}
```

### Layout Does NOT Receive `searchParams`

```tsx
// ❌ This does NOT work — layout has no searchParams prop
export default function Layout({
  children,
  searchParams  // ← undefined — layouts don't get searchParams
}: {
  children:     React.ReactNode
  searchParams: Record<string, string>
}) { ... }

// ✅ Read searchParams in page.tsx, pass as props to children
// or use useSearchParams() in a Client Component inside the layout
```

### Nested Layout Composition

```
src/app/
├── layout.tsx                    ← RootLayout (html + body)
│   └── dashboard/
│       ├── layout.tsx            ← DashboardLayout (sidebar)
│       │   ├── page.tsx          → /dashboard
│       │   └── orders/
│       │       ├── page.tsx      → /dashboard/orders
│       │       └── layout.tsx    ← (optional) OrdersLayout
```

```tsx
// Rendered tree for /dashboard/orders:
<RootLayout>
  {" "}
  // app/layout.tsx
  <DashboardLayout>
    {" "}
    // app/dashboard/layout.tsx
    <OrdersPage /> // app/dashboard/orders/page.tsx
  </DashboardLayout>
</RootLayout>
```

### Layout with Data Fetching

```tsx
// src/app/dashboard/layout.tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Layouts can fetch data — runs on every navigation to this segment
  const user = await getCurrentUser();

  // ✅ Layouts can redirect
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} className="w-64 shrink-0" />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
```

### What Persists vs What Changes

```
PERSISTS (layout.tsx):            CHANGES (page.tsx):
  ─────────────────────             ─────────────────────
  Sidebar state (open/closed)       Main content area
  Navigation active states          Page-specific data
  Scroll position of sidebar        Page title / metadata
  useContext values                 Loading/error states
  Audio/video playback              URL-specific content
  WebSocket connections
```

### Metadata in Layouts

```tsx
// Metadata in layout.tsx applies to ALL routes in the segment
// (unless overridden by page.tsx metadata)

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard", // %s = page-specific title
    default: "Dashboard", // fallback if page has no title
  },
};

// /dashboard      → title: "Dashboard"
// /dashboard/orders (with title: 'Orders') → title: "Orders | Dashboard"
```

---

## W — Why It Matters

- Layout persistence is what makes Next.js feel like a native app — navigating between routes doesn't flash or reset UI state the way a full page reload would. This is powered by React Server Components + streaming.
- The restriction that layouts don't receive `searchParams` is intentional — if they did, every query string change would force a layout re-render. Keeping layouts `searchParams`-free is a performance boundary.
- Authentication guards in `layout.tsx` (check session, redirect to login) are the correct pattern in App Router — they run server-side before any page content is rendered, preventing flash of unauthorized content.
- Data fetched in `layout.tsx` is cached per navigation — if you navigate from `/dashboard/orders` to `/dashboard/settings`, the layout's `getCurrentUser()` call is deduplicated and not re-fetched.

---

## I — Interview Q&A

### Q1: What makes `layout.tsx` different from just wrapping `page.tsx` content in a shared component?

**A:** A shared wrapper component re-renders on every navigation — it mounts, runs its effects, and fetches data again every time the page changes. `layout.tsx` persists — it renders once and stays mounted while child routes change. Only the `{children}` slot swaps. This means sidebar state, context values, and any expensive data fetching in the layout runs only once per "entering the segment," not on every navigation within it.

### Q2: Can a layout redirect users? Where should auth checks go?

**A:** Yes — layouts are Server Components by default and can call `redirect()` from `next/navigation`. The recommended pattern is to put auth checks in the layout of protected segments: fetch the session, and if not authenticated, call `redirect('/login')`. This runs server-side before any page content renders — preventing flash of unauthorized content. For more granular control across many routes, use `middleware.ts` instead.

### Q3: Why don't layouts receive `searchParams`?

**A:** If layouts received `searchParams`, any change to the URL query string would force the layout to re-render — including re-fetching any data in the layout. This would break the persistence model and cause unnecessary server work. Query parameters are page-specific concerns. Read them in `page.tsx` (Server Component) or with `useSearchParams()` in a Client Component that's inside the page, not the layout.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting the root `layout.tsx` is required

```
src/app/
├── page.tsx    ← exists
            ← NO layout.tsx
```

**Result:** Build error — `app/layout.tsx` is required and must include `<html>` and `<body>` tags.

**Fix:** Always have `src/app/layout.tsx` with `<html>` and `<body>`:

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### ❌ Pitfall: Fetching the same data in both layout and page

```tsx
// layout.tsx
const user = await getUser(); // ← fetches user

// page.tsx (same segment)
const user = await getUser(); // ← fetches user AGAIN — duplicate request
```

**Fix:** Next.js automatically **deduplicates** `fetch()` calls with the same URL + options within a single request. For database calls, use React's `cache()`:

```ts
// src/lib/queries.ts
import { cache } from "react";
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
// getUser(id) called in layout + page → only ONE database query ✅
```

### ❌ Pitfall: Adding `'use client'` to a layout that needs server data

```tsx
// ❌ Can't fetch from DB in a Client Component layout
"use client";
export default function DashboardLayout({ children }) {
  const user = await getUser(); // Error: can't use await in Client Component
}
```

**Fix:** Keep layouts as Server Components. Pass data down as props to Client Components within the layout:

```tsx
// ✅ Server Component layout → passes data to Client Component
import { Sidebar } from "@/components/layout/sidebar"; // 'use client' component
import { getUser } from "@/lib/queries";

export default async function DashboardLayout({ children }) {
  const user = await getUser(); // ✅ runs on server
  return (
    <div className="flex">
      <Sidebar user={user} /> {/* Sidebar has 'use client' for interactivity */}
      <main>{children}</main>
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/app` dashboard layout that:

1. Checks for an auth token cookie — redirects to `/login` if missing
2. Fetches and displays the current user's name in the sidebar
3. Has a responsive sidebar (collapses on mobile via Client Component)
4. Exports metadata with `title.template` for all dashboard pages
5. The layout itself remains a Server Component

### Solution

```tsx
// src/app/(dashboard)/layout.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "./_components/dashboard-sidebar";
import { getUser } from "@/lib/queries";

export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard",
    default: "Dashboard",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ─── Auth check (server-side)
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    redirect("/login");
  }

  // ─── Fetch user data
  const user = await getUser(token);
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Client Component handles collapse state */}
      <DashboardSidebar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/_components/dashboard-sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

interface User {
  name: string;
  email: string;
}

export function DashboardSidebar({ user }: { user: User }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
      bg-gray-900 text-white transition-all duration-300
      ${collapsed ? "w-16" : "w-64"}
    `}
    >
      <div className="p-4">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-white"
          aria-label="Toggle sidebar"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <nav className="p-4 space-y-1">
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded hover:bg-gray-700"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/orders"
              className="block px-3 py-2 rounded hover:bg-gray-700"
            >
              Orders
            </Link>
            <Link
              href="/dashboard/profile"
              className="block px-3 py-2 rounded hover:bg-gray-700"
            >
              Profile
            </Link>
          </nav>
        </>
      )}
    </aside>
  );
}
```

---

---
