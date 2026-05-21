# 9 — Nested Layouts — Segment-Based Layout Inheritance

---

## T — TL;DR

Nested layouts stack automatically — every `layout.tsx` wraps all routes in its segment, and parent layouts always wrap child layouts. Each segment adds its own layout layer. The result is a composable layout tree that mirrors your route structure.

---

## K — Key Concepts

### The Nesting Model

```
Route: /dashboard/orders

Render tree (outermost → innermost):
  RootLayout          (app/layout.tsx)
    DashboardLayout   (app/dashboard/layout.tsx)
      OrdersPage      (app/dashboard/orders/page.tsx)

Each layout wraps everything below it in the segment tree.
```

### Visual Example — Three Levels of Nesting

```tsx
// 1. src/app/layout.tsx — Root (html + body + global nav)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GlobalNav /> {/* shown on every page */}
        {children}
        <GlobalFooter /> {/* shown on every page */}
      </body>
    </html>
  );
}

// 2. src/app/dashboard/layout.tsx — Dashboard (sidebar)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <DashboardSidebar /> {/* shown on all /dashboard/* routes */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// 3. src/app/dashboard/orders/layout.tsx — Orders (sub-nav)
export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <OrdersSubNav /> {/* shown on /dashboard/orders/* only */}
      {children}
    </div>
  );
}

// Visiting /dashboard/orders/detail renders:
// <RootLayout>
//   <DashboardLayout>
//     <OrdersLayout>
//       <OrderDetailPage />
//     </OrdersLayout>
//   </DashboardLayout>
// </RootLayout>
```

### Layout Inheritance — What Flows Down

```
RootLayout defines:
  - <html lang="en">
  - <body> className
  - Global font CSS variable
  - Context providers (QueryClient, ThemeProvider)
  - Global navigation bar
  - Global footer

DashboardLayout adds:
  - Flex row container
  - Sidebar component
  - Auth check (redirect if not logged in)

OrdersLayout adds (optional, uncommon):
  - Orders-specific sub-navigation tabs
  - Filter panel persistent between /orders and /orders/[id]

OrderDetailPage renders:
  - The specific order content
  All ancestor layout chrome surrounds it automatically
```

### Opting Out of a Parent Layout — Route Groups

```
Problem: Marketing pages and dashboard pages need different layouts
         but they're in the same domain.

Solution: Route groups — each group gets its own layout,
          parent layout is shared only if explicitly inherited.

src/app/
├── layout.tsx                 ← RootLayout (html + body — applies to ALL)
│
├── (marketing)/               ← route group (no URL segment)
│   ├── layout.tsx             ← marketing layout (top nav + footer)
│   └── page.tsx               → /
│
└── (dashboard)/               ← route group (no URL segment)
    ├── layout.tsx             ← dashboard layout (sidebar, no footer)
    └── dashboard/
        └── page.tsx           → /dashboard

Rendered for /dashboard:
  <RootLayout>                 ← html + body (always)
    <DashboardGroupLayout>     ← dashboard-specific layout
      <DashboardPage />
    </DashboardGroupLayout>
  </RootLayout>

Rendered for /:
  <RootLayout>                 ← html + body (always)
    <MarketingGroupLayout>     ← marketing-specific layout
      <HomePage />
    </MarketingGroupLayout>
  </RootLayout>
```

### Layout Data Fetching — Per-Level

```tsx
// Each layout can fetch its own data independently
// Next.js deduplicates identical requests across layout tree

// src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser(); // fetch #1
  if (!user) redirect("/login");
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}

// src/app/dashboard/orders/layout.tsx
export default async function OrdersLayout({ children }) {
  const orderStats = await getOrderStats(); // fetch #2 (different data)
  return (
    <div>
      <OrderStatsBar stats={orderStats} />
      {children}
    </div>
  );
}

// src/app/dashboard/orders/page.tsx
export default async function OrdersPage() {
  const orders = await getOrders(); // fetch #3 (different data)
  const user = await getCurrentUser(); // deduped — same as layout fetch #1
  return <OrderList orders={orders} />; // user fetched ONCE total
}
```

### Parallel Loading — Layouts and Pages Load Concurrently

```
When visiting /dashboard/orders, Next.js:

  1. Starts loading RootLayout         (no data)
  2. Starts loading DashboardLayout    (getCurrentUser — parallel)
  3. Starts loading OrdersPage         (getOrders — parallel with #2)
  4. When BOTH #2 and #3 resolve → renders the complete page

NOT sequential: layout waits → page waits → render
YES parallel:   layout + page fetch data at the same time → faster
```

---

## W — Why It Matters

- Nested layouts are what enable the "shell loads instantly, content streams in" experience — the outer layout renders first, then page content arrives progressively.
- Route groups + separate layouts per group is the correct architecture for apps with fundamentally different chrome (marketing site vs authenticated dashboard) — understanding this prevents the common mistake of a massive root layout trying to handle both cases.
- Parallel data fetching across layout levels is automatic — layouts and pages within a request all fetch data concurrently, not sequentially, which means deep nesting doesn't add latency.
- Authentication in the layout (not just middleware) is a defense-in-depth pattern — middleware handles the redirect, layout handles the server-side user data for the UI.

---

## I — Interview Q&A

### Q1: How do nested layouts compose in Next.js App Router?

**A:** They stack from outermost to innermost, mirroring the route folder structure. The root layout wraps everything. Each segment's `layout.tsx` wraps all routes below it in that segment. When rendering `/dashboard/orders`, the tree is `RootLayout > DashboardLayout > OrdersPage`. Each layout only renders once when entering its segment — it persists while navigating within the segment.

### Q2: How do you have different layouts for different sections of an app (e.g., marketing vs dashboard) without URL changes?

**A:** Use route groups — folders with parentheses in the name `(marketing)` and `(dashboard)`. Route groups are ignored in the URL but each can have its own `layout.tsx`. The root `app/layout.tsx` (with `<html>` and `<body>`) applies to all groups. Each group layout adds its section-specific chrome without affecting the URL structure.

### Q3: Does nesting layouts deeply make data fetching slower?

**A:** No — Next.js fetches data for all layouts and the page in parallel within a single request. The DashboardLayout's `getCurrentUser()` and the OrdersPage's `getOrders()` run concurrently, not sequentially. Duplicate fetches within the same request are deduplicated via React's `cache()` or Next.js's automatic `fetch()` deduplication.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Nesting `<html>` and `<body>` in non-root layouts

```tsx
// src/app/dashboard/layout.tsx ← NOT the root layout
export default function DashboardLayout({ children }) {
  return (
    <html>
      {" "}
      // ← duplicate html — only root layout should have this
      <body>
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
```

**Fix:** Non-root layouts return only their specific wrapper elements:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {" "}
      // ← just the layout wrapper
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### ❌ Pitfall: Trying to pass data from layout to page via props

```tsx
// layouts don't pass props to pages — this is NOT how Next.js works
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  return <div>{React.cloneElement(children, { user })}</div>; // ❌ won't work
}
```

**Fix:** Share data between layout and page via:

1. React Context (wrap in a Client Component provider)
2. Re-fetching in the page (deduplicated via React `cache()`)
3. Route-level data using `cookies()` or `headers()` called in both

```ts
// src/lib/queries.ts
import { cache } from 'react'
export const getCurrentUser = cache(async () => {
  // Returns same object in layout + page — one DB call
  return db.user.findFirst(...)
})
```

---

## K — Coding Challenge + Solution

### Challenge

Design a 3-level nested layout system for a SaaS app:

1. Root layout — global providers and base HTML
2. `(app)` route group layout — authenticated section with sidebar nav
3. `settings` nested layout — settings-specific sub-navigation tabs

Map the render tree for the route `/settings/profile`.

Show all three layout files and the page file.

### Solution

```
File structure:
src/app/
├── layout.tsx                           ← Level 1: Root
└── (app)/
    ├── layout.tsx                       ← Level 2: App (authenticated)
    └── settings/
        ├── layout.tsx                   ← Level 3: Settings (sub-nav)
        └── profile/
            └── page.tsx                 → /settings/profile
```

```tsx
// src/app/layout.tsx — Level 1: Root
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { template: "%s | SaaSApp", default: "SaaSApp" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-gray-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/(app)/layout.tsx — Level 2: Authenticated app shell
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import { AppSidebar } from "./_components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        user={{ name: user.name, avatarUrl: user.avatarUrl }}
        className="w-64 shrink-0 border-r border-gray-200"
      />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(app)/settings/layout.tsx — Level 3: Settings sub-navigation
import Link from "next/link";

const SETTINGS_TABS = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Account", href: "/settings/account" },
  { label: "Billing", href: "/settings/billing" },
  { label: "Notifications", href: "/settings/notifications" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Sub-navigation tabs — persistent across all /settings/* routes */}
        <nav className="flex gap-1 border-b border-gray-200 mb-8">
          {SETTINGS_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                         hover:bg-gray-100 rounded-t-lg -mb-px transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Page content swaps here — tabs stay mounted */}
        <div>{children}</div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/settings/profile/page.tsx — The page
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/queries";

export const metadata: Metadata = { title: "Profile" };
// → Tab title: "Profile | SaaSApp"

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser(); // deduplicated — same call as AppLayout

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile Information</h2>
        <p className="text-gray-500 text-sm">Update your name and email.</p>
      </div>
      <form className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            defaultValue={user?.name ?? ""}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
```

```
Render tree for /settings/profile:

<RootLayout>                         ← html, body, Inter font, Providers
  <AppLayout>                        ← sidebar + auth check (getCurrentUser ×1)
    <SettingsLayout>                 ← "Settings" heading + tab navigation
      <ProfileSettingsPage />        ← profile form (getCurrentUser deduped)
    </SettingsLayout>
  </AppLayout>
</RootLayout>
```

---

---
