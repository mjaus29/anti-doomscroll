# 4 — Route Groups — `(group)` Organization and Layout Isolation

---

## T — TL;DR

Route groups are folders wrapped in parentheses — `(marketing)`, `(auth)`, `(dashboard)` — that **organize routes without affecting the URL**. Their killer feature: each group gets its own `layout.tsx`, enabling multiple distinct layouts in one app with no URL nesting.

---

## K — Key Concepts

### The Rule

```
(group-name)/     → completely invisible to the URL router
                     acts only as an organizational container
                     can have its own layout.tsx

Normal folder:    creates a URL segment
(Group folder):   creates NO URL segment — organization only
```

### URL Proof

```
src/app/
├── (marketing)/
│   ├── page.tsx          → /          (NOT /marketing/)
│   └── about/page.tsx    → /about     (NOT /marketing/about)
│
├── (dashboard)/
│   └── dashboard/
│       └── page.tsx      → /dashboard (NOT /dashboard-group/dashboard)
│
└── (auth)/
    └── login/page.tsx    → /login     (NOT /auth/login)

The parentheses vanish from the URL completely.
```

### Multiple Layouts via Route Groups

```tsx
// ─── 1. Root layout (required — shared by ALL routes)
// src/app/layout.tsx
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

```tsx
// ─── 2. Marketing layout — top nav + footer
// src/app/(marketing)/layout.tsx
import { TopNav } from "./_components/top-nav";
import { Footer } from "./_components/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
```

```tsx
// ─── 3. Auth layout — centered card, no nav/footer
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {children}
      </div>
    </div>
  );
}
```

```tsx
// ─── 4. Dashboard layout — sidebar + auth guard
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "./_components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
```

### Complete App Structure with Route Groups

```
src/app/
│
├── layout.tsx                        ← ROOT layout (html + body)
│
├── (marketing)/                      ← top nav + footer
│   ├── layout.tsx
│   ├── page.tsx                      → /
│   ├── about/page.tsx                → /about
│   ├── pricing/page.tsx              → /pricing
│   └── blog/
│       ├── page.tsx                  → /blog
│       └── [slug]/page.tsx           → /blog/:slug
│
├── (auth)/                           ← centered card, no chrome
│   ├── layout.tsx
│   ├── login/page.tsx                → /login
│   ├── register/page.tsx             → /register
│   └── forgot-password/page.tsx      → /forgot-password
│
├── (dashboard)/                      ← sidebar, auth required
│   ├── layout.tsx
│   ├── dashboard/page.tsx            → /dashboard
│   ├── dashboard/orders/page.tsx     → /dashboard/orders
│   ├── dashboard/products/page.tsx   → /dashboard/products
│   └── dashboard/settings/page.tsx   → /dashboard/settings
│
└── api/                              ← no layout (API routes)
    └── products/route.ts             → /api/products
```

### Same URL from Different Groups — Conflict

```
// ❌ Conflict: two files claim the same URL
src/app/
├── (groupA)/
│   └── about/page.tsx    → /about
└── (groupB)/
    └── about/page.tsx    → /about
// Build error: duplicate route /about
```

**Rule:** Route groups eliminate URL segments — but the remaining URL must still be unique across all groups.

### Route Groups for Shared Layout Subsets

```
// Authenticated routes that need a different sub-layout
src/app/
└── (dashboard)/
    ├── layout.tsx                     ← main dashboard layout
    ├── dashboard/
    │   └── page.tsx                   → /dashboard
    │
    ├── (settings)/                    ← nested group for settings sections
    │   ├── layout.tsx                 ← settings-specific sub-layout
    │   ├── settings/page.tsx          → /settings
    │   ├── settings/profile/page.tsx  → /settings/profile
    │   └── settings/billing/page.tsx  → /settings/billing
    │
    └── (fullscreen)/                  ← group for full-screen views (no sidebar)
        ├── layout.tsx                 ← different layout (no sidebar)
        └── reports/page.tsx           → /reports
```

---

## W — Why It Matters

- Route groups solve the "I need three different layouts for different sections of my app without fake URL nesting" problem — the most architecturally important Next.js feature after the App Router itself.
- Placing auth guards in `(dashboard)/layout.tsx` means every route inside the group is protected by a single server-side check — no per-page `if (!user) redirect()` needed.
- The `(auth)` group pattern is responsible for the clean centered login form you see in every modern SaaS product — one layout file, all auth pages benefit.
- Nested route groups (a group inside another group) let you apply different sub-layouts within an already-grouped section — enabling granular layout control without URL pollution.

---

## I — Interview Q&A

### Q1: What do route groups do and what don't they do?

**A:** Route groups organize files into named folders whose names are excluded from the URL. They allow you to: apply different layouts to groups of routes, co-locate related route files, and isolate layout inheritance. What they don't do: create URL segments, affect routing behavior, or change how params work. The parentheses are purely organizational — the URL router ignores them completely.

### Q2: How do you implement a site where marketing pages have a top nav, auth pages have a centered layout, and dashboard pages have a sidebar — all at the root URL level?

**A:** Use three route groups: `(marketing)`, `(auth)`, and `(dashboard)`. Each has its own `layout.tsx` that defines the section's chrome. The root `app/layout.tsx` provides `<html>` and `<body>`. Marketing routes (`/`, `/about`, `/pricing`) live in `(marketing)`, auth routes (`/login`, `/register`) in `(auth)`, and dashboard routes in `(dashboard)`. All URLs are at the root level — `/login` not `/auth/login`.

### Q3: Can you have a conflict between route groups?

**A:** Yes — if two route groups each contain a folder with the same name, they both resolve to the same URL. For example, `(groupA)/about/page.tsx` and `(groupB)/about/page.tsx` both claim `/about` — Next.js throws a build error. Route groups remove the group name from the URL but the remaining path must still be unique across the entire `app/` directory.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting the group name to appear in the URL

```
src/app/(auth)/login/page.tsx
// Developer expects: /auth/login
// Actual URL:        /login
```

**Fix:** Route groups are invisible in URLs — they're for organization only. The URL is determined by the folder structure inside the group, not the group itself.

### ❌ Pitfall: Adding `<html>` and `<body>` to a group layout

```tsx
// src/app/(dashboard)/layout.tsx ← NOT the root layout
export default function DashboardLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — only root layout
      <body>
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
```

**Fix:** Group layouts return only their section's wrapper:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      {" "}
      // ← just the section wrapper
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### ❌ Pitfall: Conflicting routes across groups

```
src/app/
├── (marketing)/about/page.tsx   → /about
└── (info)/about/page.tsx        → /about
// Build error: duplicate route
```

**Fix:** Each URL must be unique. Move one to a different path, or consolidate into one group.

---

## K — Coding Challenge + Solution

### Challenge

Design a route group structure for a SaaS app with:

1. `(public)` group — `/`, `/pricing`, `/changelog` — minimal nav layout
2. `(onboarding)` group — `/onboarding/welcome`, `/onboarding/setup`, `/onboarding/done` — full-screen stepper layout with no nav
3. `(app)` group — `/app/dashboard`, `/app/projects`, `/app/settings` — sidebar layout, auth required
4. `(admin)` group — `/admin`, `/admin/users`, `/admin/billing` — separate admin sidebar, admin role required

Show: full directory structure, all layout files (content), and the rendered tree for `/app/projects`.

### Solution

```
Directory structure:
src/app/
│
├── layout.tsx                           ← ROOT (html + body + providers)
│
├── (public)/
│   ├── layout.tsx                       ← minimal top nav
│   ├── page.tsx                         → /
│   ├── pricing/page.tsx                 → /pricing
│   └── changelog/page.tsx              → /changelog
│
├── (onboarding)/
│   ├── layout.tsx                       ← full-screen stepper, no nav
│   └── onboarding/
│       ├── welcome/page.tsx             → /onboarding/welcome
│       ├── setup/page.tsx               → /onboarding/setup
│       └── done/page.tsx                → /onboarding/done
│
├── (app)/
│   ├── layout.tsx                       ← sidebar + auth guard
│   └── app/
│       ├── dashboard/page.tsx           → /app/dashboard
│       ├── projects/page.tsx            → /app/projects
│       └── settings/page.tsx           → /app/settings
│
└── (admin)/
    ├── layout.tsx                       ← admin sidebar + role guard
    ├── admin/page.tsx                   → /admin
    ├── admin/users/page.tsx             → /admin/users
    └── admin/billing/page.tsx          → /admin/billing
```

```tsx
// src/app/layout.tsx — ROOT
import { Providers } from "./_providers";
import "./globals.css";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/(public)/layout.tsx
import Link from "next/link";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="h-16 border-b flex items-center justify-between px-6">
        <Link href="/" className="font-bold text-xl">
          SaaSApp
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/changelog" className="text-gray-600 hover:text-gray-900">
            Changelog
          </Link>
          <Link
            href="/app/dashboard"
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg"
          >
            Dashboard
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
```

```tsx
// src/app/(onboarding)/layout.tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50
                    flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <span className="font-bold text-xl text-blue-600">SaaSApp Setup</span>
        </div>
        {children}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/app/dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <span className="font-semibold">SaaSApp</span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {[
            { label: "Dashboard", href: "/app/dashboard" },
            { label: "Projects", href: "/app/projects" },
            { label: "Settings", href: "/app/settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm
                             text-gray-400 hover:text-white hover:bg-gray-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/app/dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-red-950 text-red-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-red-800">
          <span className="font-semibold text-red-200">Admin Panel</span>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { label: "Overview", href: "/admin" },
            { label: "Users", href: "/admin/users" },
            { label: "Billing", href: "/admin/billing" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm
                             text-red-300 hover:text-white hover:bg-red-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  );
}
```

```
Rendered tree for /app/projects:

<RootLayout>                    ← html, body, Providers (app/layout.tsx)
  <AppLayout>                   ← sidebar + auth guard ((app)/layout.tsx)
    <ProjectsPage />            ← (app)/app/projects/page.tsx
  </AppLayout>
</RootLayout>

What does NOT render:
  ❌ PublicLayout   (wrong group)
  ❌ OnboardingLayout (wrong group)
  ❌ AdminLayout    (wrong group)
```

---

---
