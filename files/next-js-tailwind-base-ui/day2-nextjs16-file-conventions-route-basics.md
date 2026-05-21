# 📅 Day 2 — File Conventions and Route Basics (Next.js 16)

> **Goal:** Master every special file Next.js recognizes inside `app/` — what each one does, how they compose, and the rules that control what becomes a URL and what stays private.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 1 complete — project scaffolded, App Router mental model understood.

---

## 📋 Day 2 Subtopic Overview

| #   | Subtopic                                                                      | Time   |
| --- | ----------------------------------------------------------------------------- | ------ |
| 1   | `page.tsx` — The Route File                                                   | 10 min |
| 2   | `layout.tsx` — Persistent Wrappers                                            | 15 min |
| 3   | `template.tsx` — Remounting Layouts                                           | 10 min |
| 4   | Route Exposure Rules — What Makes a URL Accessible                            | 10 min |
| 5   | Private Folders — The Underscore Convention                                   | 8 min  |
| 6   | Co-located Files — Keeping Code Close                                         | 10 min |
| 7   | Metadata Files — Convention-Based Static Assets                               | 12 min |
| 8   | Root Layout — The Required Foundation                                         | 15 min |
| 9   | Nested Layouts — Segment-Based Layout Inheritance                             | 15 min |
| 10  | Segment-Based Organization — Route Groups, Dynamic Segments, Catch-All Routes | 15 min |

---

---

# 1 — `page.tsx` — The Route File

---

## T — TL;DR

`page.tsx` is the **only file that makes a folder a publicly accessible URL**. Without it, the folder exists but has no route. Every route in your app traces back to exactly one `page.tsx` file.

---

## K — Key Concepts

### The Rule

```
Folder with page.tsx    → publicly accessible URL
Folder without page.tsx → NOT a URL (can hold components, hooks, utils)

src/app/
├── about/
│   └── page.tsx        → /about ✅ accessible
├── components/
│   └── Button.tsx      → NOT a route ✅ private by nature
└── utils/
    └── format.ts       → NOT a route ✅ private by nature
```

### The Minimal `page.tsx`

```tsx
// src/app/page.tsx — home route (/)
// A page is just a React component — default export required

export default function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
    </main>
  );
}
```

### Server Component by Default

```tsx
// page.tsx is a Server Component by default — no 'use client' needed
// This means you can:
//   ✅ use async/await directly
//   ✅ access databases, filesystem, environment variables
//   ✅ ship zero client-side JavaScript for this component

// src/app/products/page.tsx
import { db } from "@/lib/db";

export default async function ProductsPage() {
  // Direct database access — runs on server only
  const products = await db.product.findMany({ take: 20 });

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} — ${p.price}
        </li>
      ))}
    </ul>
  );
}
```

### The Two Props — `params` and `searchParams`

```tsx
// page.tsx receives two special props from Next.js:
// params       — dynamic route segments (e.g., /products/[id])
// searchParams — URL query parameters (?q=shoes&page=2)

// In Next.js 15+ both are Promises — must be awaited

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params; // route param: /products/[id]
  const { q } = await searchParams; // query param: ?q=shoes

  return (
    <div>
      <h1>Product ID: {id}</h1>
      <p>Search: {q ?? "none"}</p>
    </div>
  );
}
```

### Static vs Dynamic Rendering

```tsx
// Static page (default) — rendered at build time
// No dynamic data dependencies → Next.js pre-renders to static HTML
export default function AboutPage() {
  return <h1>About Us</h1>; // ← static, no data fetching
}

// Dynamic page — rendered at request time
// Accessing searchParams, cookies, headers → opts into dynamic rendering
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme"); // ← accessing request data = dynamic
  return <div data-theme={theme?.value}>Dashboard</div>;
}
```

### `generateStaticParams` — Pre-render Dynamic Routes

```tsx
// src/app/products/[id]/page.tsx
// Tell Next.js which [id] values to pre-render at build time

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } });

  return products.map((p) => ({ id: p.id }));
  // → Next.js pre-renders /products/1, /products/2, /products/3 etc.
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  return <div>{product?.name}</div>;
}
```

### Metadata Export — Per-Page SEO

```tsx
// src/app/about/page.tsx
import type { Metadata } from "next";

// Static metadata
export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about our company",
};

// Dynamic metadata (function form)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product.name };
}

export default function AboutPage() {
  return <h1>About Us</h1>;
}
```

---

## W — Why It Matters

- The "only `page.tsx` creates routes" rule means you can safely co-locate components, hooks, and utilities inside route folders without accidentally exposing them as URLs — critical for App Router architecture.
- `params` being a `Promise` in Next.js 15+ is a breaking change from v14 — understanding this prevents the most common migration bug where `params.id` returns `undefined`.
- `generateStaticParams` is how you get the performance of static generation (`next build` pre-renders pages) for dynamic routes — essential for SEO-sensitive pages like product listings and blog posts.
- The `searchParams` prop in `page.tsx` is the App Router equivalent of reading URL query params — but accessing it opts the entire page into dynamic rendering. Cache carefully.

---

## I — Interview Q&A

### Q1: What is the minimum requirement for a folder in `app/` to become a public URL?

**A:** The folder must contain a `page.tsx` (or `page.js`) file that exports a default React component. Without `page.tsx`, the folder is treated as a non-route segment — it can hold components, utilities, and configuration but produces no URL. Other files like `layout.tsx` or `loading.tsx` exist without `page.tsx` only when they serve nested routes deeper in the tree.

### Q2: What is the difference between `params` and `searchParams` in a `page.tsx`?

**A:** `params` contains the dynamic route segments from the URL path — for a route `products/[id]`, accessing `/products/42` gives `params = { id: '42' }`. `searchParams` contains the query string parameters — for `/products/42?color=red&size=lg`, `searchParams = { color: 'red', size: 'lg' }`. In Next.js 15+, both are `Promise<>` and must be awaited before accessing their values.

### Q3: What does accessing `searchParams` in a `page.tsx` do to rendering?

**A:** It forces the page into dynamic rendering — the page is rendered on every request instead of being pre-rendered at build time. This is because query parameters are request-specific and can't be known at build time. If you need query params for client-side filtering without sacrificing static rendering, read them in a Client Component using `useSearchParams()` from `next/navigation` instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Named export instead of default export

```tsx
// ❌ Named export — Next.js won't recognize this as a page
export function HomePage() {
  return <h1>Home</h1>;
}
// Result: Route is defined but Next.js throws a build error
// "The default export is not a React Component in page: /"
```

**Fix:** Always use `default export` for the page component:

```tsx
export default function HomePage() {
  // ✅
  return <h1>Home</h1>;
}
```

### ❌ Pitfall: Not awaiting `params` in Next.js 15+

```tsx
// ❌ Synchronous params access — Next.js 15+ breaking change
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>;
  // params.id is undefined — params is a Promise, not an object
}
```

**Fix:**

```tsx
// ✅ Async page + awaited params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

### ❌ Pitfall: Putting interactive components directly in `page.tsx` without `'use client'`

```tsx
// ❌ useState in a Server Component
export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false); // Error: hooks in Server Component
  return <button onClick={() => setSubmitted(true)}>Submit</button>;
}
```

**Fix:** Move interactive parts to a Client Component, keep `page.tsx` as a Server Component:

```tsx
// src/app/contact/_components/contact-form.tsx
"use client";
import { useState } from "react";
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  return <button onClick={() => setSubmitted(true)}>Submit</button>;
}

// src/app/contact/page.tsx — stays Server Component
import { ContactForm } from "./_components/contact-form";
export default function ContactPage() {
  return <ContactForm />;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `/blog/[slug]` page that:

1. Uses typed, awaited `params`
2. Exports `generateStaticParams` with 3 hardcoded slugs
3. Exports dynamic `generateMetadata` using the slug
4. Renders the slug and a hardcoded "coming soon" message
5. Returns `notFound()` if slug is not in the allowed list

### Solution

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── Allowed slugs (in production, this comes from DB/CMS)
const ALLOWED_SLUGS = ["hello-world", "nextjs-tips", "typescript-guide"];

// ─── Types
type Params = Promise<{ slug: string }>;

// ─── Static params (pre-render at build time)
export function generateStaticParams() {
  return ALLOWED_SLUGS.map((slug) => ({ slug }));
}

// ─── Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title,
    description: `Read our article: ${title}`,
  };
}

// ─── Page component
export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  if (!ALLOWED_SLUGS.includes(slug)) notFound();

  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <article className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-gray-500">
        This post is coming soon. Check back later!
      </p>
    </article>
  );
}
```

---

---

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

# 3 — `template.tsx` — Remounting Layouts

---

## T — TL;DR

`template.tsx` looks identical to `layout.tsx` but does the **opposite** — it creates a **new instance on every navigation**. State resets, effects re-run, and animations replay. Use it when you specifically need a fresh component on every route change.

---

## K — Key Concepts

### `template.tsx` vs `layout.tsx` — The Core Difference

```
layout.tsx:
  - Renders ONCE when you enter the segment
  - Persists across navigations within the segment
  - State is PRESERVED between child route changes
  - useEffect runs ONCE on mount

template.tsx:
  - Creates a NEW instance on EVERY navigation
  - Unmounts and remounts when child routes change
  - State is RESET on every navigation
  - useEffect runs on EVERY navigation
```

### File Structure — Same Position as Layout

```
src/app/
├── layout.tsx      ← persistent wrapper (use for most things)
└── template.tsx    ← remounting wrapper (use for specific cases)

# Can coexist — template wraps children INSIDE the layout:
# <Layout>
#   <Template>       ← new instance on each navigation
#     <Page />
#   </Template>
# </Layout>
```

### The Syntax — Identical to Layout

```tsx
// src/app/dashboard/template.tsx
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

// ← Same signature as layout.tsx
// The difference is BEHAVIOR (remounts), not syntax
```

### Use Case 1 — Page Transition Animations

```tsx
// src/app/template.tsx
// Every page navigation triggers a fresh mount → animation plays each time
"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// layout.tsx:    animation plays ONCE (on first visit to segment)
// template.tsx:  animation plays on EVERY navigation within the segment ✅
```

### Use Case 2 — Per-Page Analytics / View Tracking

```tsx
// src/app/template.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageTrackingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Runs on EVERY page navigation — template remounts each time
    analytics.track("page_view", { path: pathname });
  }, [pathname]);
  // With layout.tsx, this useEffect would only run once on initial load

  return <>{children}</>;
}
```

### Use Case 3 — Resetting Form State Between Routes

```tsx
// src/app/(wizard)/template.tsx
"use client";

import { useEffect } from "react";
import { useFormStore } from "@/stores/form-store";

export default function WizardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const resetForm = useFormStore((state) => state.reset);

  useEffect(() => {
    // Reset form state on every wizard step navigation
    return () => resetForm(); // cleanup = reset when leaving
  }, [resetForm]);

  return <>{children}</>;
}
```

### When to Use `template.tsx` vs `layout.tsx`

```
Use layout.tsx (default — 95% of cases):
  ✅ Navigation bars
  ✅ Sidebars
  ✅ Auth wrappers
  ✅ Context providers
  ✅ Any persistent UI

Use template.tsx (specific need — 5% of cases):
  ✅ Page transition animations (need to replay on each navigation)
  ✅ Per-page analytics tracking with useEffect
  ✅ Resetting UI state (form wizard steps, onboarding flows)
  ✅ Third-party libraries that require re-initialization per page
  ✅ useEffect-based "enter page" logic
```

---

## W — Why It Matters

- The default behavior of `layout.tsx` (persists) catches developers off-guard when they expect `useEffect` in a layout to re-run on navigation — it won't. `template.tsx` is the escape hatch for when re-running on navigation is exactly what you need.
- Page transition animations are one of the most common "how do I do this in Next.js App Router?" questions — `template.tsx` is the correct answer, not `layout.tsx`.
- Analytics page view tracking via `useEffect` in a `layout.tsx` is a common bug — it only fires once, missing subsequent navigations. `template.tsx` fixes this.
- Understanding the distinction demonstrates depth of App Router knowledge in interviews — most developers know `layout.tsx` but not `template.tsx`.

---

## I — Interview Q&A

### Q1: What is the key behavioral difference between `layout.tsx` and `template.tsx`?

**A:** `layout.tsx` persists between navigations — it renders once when you enter a segment and stays mounted as you navigate between child routes. State, effects, and context values are preserved. `template.tsx` creates a new instance on every navigation — it unmounts and remounts on each route change, resetting all state and re-running all `useEffect` callbacks. They have identical syntax; the difference is purely behavioral.

### Q2: When would you use `template.tsx` instead of `layout.tsx`?

**A:** When you specifically need behavior to trigger on every navigation: page transition animations (so the animation replays on each page change), per-page analytics tracking via `useEffect`, resetting form state between wizard steps, or re-initializing third-party libraries that need a fresh start per page. For everything else — navigation bars, sidebars, auth wrappers — use `layout.tsx`.

### Q3: Can `layout.tsx` and `template.tsx` coexist in the same segment?

**A:** Yes. If both exist in the same segment, the render order is: `layout.tsx` wraps `template.tsx`, which wraps `page.tsx`. So you get both behaviors — the persistent outer layout (sidebar, nav) and the remounting inner template (animations, tracking). The layout handles the persistent chrome; the template handles per-navigation effects.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `layout.tsx` for page analytics — effect only fires once

```tsx
// src/app/layout.tsx
"use client";
export default function Layout({ children }) {
  const pathname = usePathname();
  useEffect(() => {
    analytics.page(pathname); // ← Only fires ONCE on initial load
  }, [pathname]); // ← Does NOT re-fire on navigation (layout persists)
  return <>{children}</>;
}
```

**Fix:** Use `template.tsx` — it remounts on every navigation:

```tsx
// src/app/template.tsx
"use client";
export default function Template({ children }) {
  const pathname = usePathname();
  useEffect(() => {
    analytics.page(pathname); // ✅ fires on EVERY navigation
  }, [pathname]);
  return <>{children}</>;
}
```

### ❌ Pitfall: Using `template.tsx` for auth guards — re-checks on every navigation

```tsx
// src/app/(dashboard)/template.tsx
export default async function Template({ children }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // ← Auth check runs on EVERY dashboard page navigation
  // → Unnecessary database call 10x per user session
}
```

**Fix:** Auth guards belong in `layout.tsx` (runs once per segment entry) or `middleware.ts`:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function Layout({ children }) {
  const user = await getUser(); // ← runs once on entering the dashboard segment
  if (!user) redirect("/login");
  return <>{children}</>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `template.tsx` at the root `app/` level that:

1. Tracks page views — logs `pathname` to console on every navigation
2. Applies a fade-in animation using Tailwind CSS classes (no external library)
3. Must be a Client Component
4. Does not affect the visual layout (no added padding/margin)

### Solution

```tsx
// src/app/template.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Fires on EVERY navigation — template remounts each time
    console.log("[Page View]", pathname);
    // In production: analytics.track('page_view', { path: pathname })
  }, [pathname]);

  return (
    // Tailwind animate-in — applies fade on mount (every navigation)
    <div className="animate-in fade-in duration-200">{children}</div>
  );
}

// Note: add to tailwind.config.ts if animate-in isn't available:
// plugins: [require('tailwindcss-animate')]
// Or use a custom keyframe in globals.css:
/*
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-page-in {
  animation: fade-in 0.2s ease-out;
}
*/
```

---

---

# 4 — Route Exposure Rules — What Makes a URL Accessible

---

## T — TL;DR

In the App Router, a URL is only accessible if there is a `page.tsx` file at that path. Every other file — no matter what it's named — does NOT create a publicly accessible URL. Understanding exactly which files expose routes and which don't is the foundation of secure, intentional routing.

---

## K — Key Concepts

### The Master Rule

```
ONLY these files create publicly accessible routes:
  page.tsx / page.js       → renders UI at the URL
  route.ts / route.js      → creates an API endpoint at the URL

EVERYTHING ELSE is invisible to the router:
  layout.tsx               → wraps routes (not accessible directly)
  loading.tsx              → only shown while page loads
  error.tsx                → only shown when an error occurs
  not-found.tsx            → only shown when notFound() is called
  template.tsx             → wraps routes (not accessible directly)
  Any other file name      → completely ignored by the router
```

### Demonstration

```
src/app/
├── page.tsx               → / ✅ accessible
├── layout.tsx             → NOT accessible
├── loading.tsx            → NOT accessible
├── error.tsx              → NOT accessible
├── about/
│   ├── page.tsx           → /about ✅ accessible
│   └── layout.tsx         → NOT accessible
├── dashboard/
│   ├── layout.tsx         → NOT accessible (but wraps /dashboard routes)
│   └── page.tsx           → /dashboard ✅ accessible
├── api/
│   └── products/
│       └── route.ts       → /api/products ✅ accessible (API endpoint)
├── components/
│   └── Button.tsx         → NOT accessible (no page.tsx in folder)
└── utils/
    └── format.ts          → NOT accessible (no page.tsx)
```

### A Folder with NO `page.tsx` — Still Useful

```
src/app/dashboard/
├── layout.tsx             ← wraps all child routes
├── page.tsx               → /dashboard ✅
├── orders/
│   └── page.tsx           → /dashboard/orders ✅
└── _components/           ← no page.tsx anywhere here
    └── sidebar.tsx        ← used by layout.tsx — NEVER exposed as URL
```

### What Happens When You Navigate to a Route with No `page.tsx`

```
# User navigates to /components (a folder in app/ with no page.tsx)
# Result: 404 Not Found

# But /components/Button.tsx exists...
# Result: STILL 404 — Next.js does not expose component files as routes
```

### Dynamic Routes — The `[param]` Convention

```
src/app/
├── products/
│   └── [id]/
│       └── page.tsx       → /products/:id  (any value for :id)
│                            /products/1
│                            /products/abc
│                            /products/anything
│
├── blog/
│   └── [...slug]/
│       └── page.tsx       → /blog/*  (catch-all)
│                            /blog/2026/may/hello-world
│                            /blog/a/b/c/d
│
└── docs/
    └── [[...path]]/
        └── page.tsx       → /docs  AND /docs/*  (optional catch-all)
                             /docs              (path = undefined)
                             /docs/getting-started
                             /docs/a/b/c
```

### Route Conflicts — When Two Routes Match the Same URL

```
src/app/
├── blog/
│   ├── [slug]/page.tsx    → /blog/:slug  (dynamic)
│   └── featured/page.tsx  → /blog/featured (static)

# Both match /blog/featured — who wins?
# Static routes ALWAYS win over dynamic routes
# /blog/featured → app/blog/featured/page.tsx ✅
# /blog/anything-else → app/blog/[slug]/page.tsx ✅
```

### Route vs API Handler — Cannot Both Exist

```
src/app/products/
├── page.tsx               → GET /products (UI)
└── route.ts               → GET /products (API)
# ← CONFLICT: both claim /products
# Result: Build error — cannot have both page.tsx and route.ts in the same folder

# Fix: move the API to app/api/products/route.ts
```

---

## W — Why It Matters

- The "only `page.tsx` creates routes" rule is a security feature — you can co-locate components, utilities, and API client code directly inside `app/` without accidentally exposing them over HTTP.
- Static routes winning over dynamic routes is critical for performance — you can have `/blog/[slug]` for all posts and `/blog/new` for a specific static page without conflict.
- Understanding route conflicts (page.tsx + route.ts in same folder) prevents a confusing build error that's hard to diagnose without knowing the rule.
- The `[...slug]` vs `[[...slug]]` distinction (required catch-all vs optional catch-all) controls whether the base path (`/docs`) is accessible — a common source of 404s.

---

## I — Interview Q&A

### Q1: What files in the `app/` directory create publicly accessible URLs?

**A:** Only `page.tsx` (or `page.js`) and `route.ts` (or `route.js`). `page.tsx` creates a UI route, `route.ts` creates an API endpoint. All other files — `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, and any other file — are completely ignored by the router and create no public URL, regardless of their name or location.

### Q2: What is the difference between `[...slug]` and `[[...slug]]` in route params?

**A:** `[...slug]` is a required catch-all — the route only matches URLs with at least one segment after the base path. `/docs` returns 404; `/docs/getting-started` matches with `slug = ['getting-started']`. `[[...slug]]` is an optional catch-all — it matches both the base path and any segments below it. `/docs` matches with `slug = undefined`; `/docs/getting-started` matches with `slug = ['getting-started']`. Use the optional form when you want the root path to also render the page.

### Q3: If both `/blog/featured/page.tsx` and `/blog/[slug]/page.tsx` exist, which handles a request to `/blog/featured`?

**A:** The static route `/blog/featured/page.tsx` wins — static (literal) routes always take priority over dynamic (parameterized) routes in Next.js. This allows you to have special pages like `/blog/new` or `/blog/featured` that use a different layout or data source, while the dynamic `[slug]` route handles all other post URLs.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting a component file to be accessible as a URL

```
src/app/components/Button.tsx
# Developer expects this to be accessible at /components/Button
# Reality: 404 — only page.tsx creates routes
```

**Fix:** Components belong in `src/components/`, not `src/app/`. If you need `/components` as a URL, create `src/app/components/page.tsx`.

### ❌ Pitfall: Using `[...slug]` catch-all when the base path also needs a page

```
src/app/docs/
└── [...slug]/
    └── page.tsx  → /docs/anything ✅  but /docs itself → 404 ❌

# User navigates to /docs → 404 because [...slug] requires at least one segment
```

**Fix:** Use optional catch-all `[[...slug]]`:

```
src/app/docs/
└── [[...slug]]/
    └── page.tsx  → /docs ✅  AND /docs/anything ✅
```

### ❌ Pitfall: Having `page.tsx` AND `route.ts` in the same folder

```
src/app/products/
├── page.tsx    ← wants to be the /products UI
└── route.ts    ← wants to be the /products API
# Build error: conflict
```

**Fix:** Move API routes to `app/api/`:

```
src/app/
├── products/
│   └── page.tsx        → /products (UI) ✅
└── api/
    └── products/
        └── route.ts    → /api/products (API) ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design the `app/` folder structure for a documentation site that needs:

1. `/docs` — the docs home page
2. `/docs/getting-started/installation` — a nested page
3. `/docs/getting-started/configuration` — a nested page
4. `/docs/api/overview` — an API reference page
5. `/docs/[...slug]` — catch-all for any docs page not explicitly defined
6. `/docs` must work (base path accessible)
7. An API endpoint at `/api/search` for docs full-text search

Map every URL to its file path.

### Solution

```
src/app/
│
├── docs/
│   ├── page.tsx                               → /docs ✅
│   │                                          (also caught by [[...slug]] if used,
│   │                                           but explicit page takes priority)
│   ├── layout.tsx                             ← docs sidebar layout (not a URL)
│   │
│   ├── getting-started/                       ← static segment
│   │   ├── installation/
│   │   │   └── page.tsx                       → /docs/getting-started/installation ✅
│   │   └── configuration/
│   │       └── page.tsx                       → /docs/getting-started/configuration ✅
│   │
│   ├── api/                                   ← static segment ("api" folder)
│   │   └── overview/
│   │       └── page.tsx                       → /docs/api/overview ✅
│   │
│   └── [...slug]/                             ← catch-all (required)
│       └── page.tsx                           → /docs/anything/else ✅
│                                              (NOT /docs itself — use [[...slug]] for that)
│
└── api/
    └── search/
        └── route.ts                           → /api/search ✅ (GET/POST search endpoint)

URL → File mapping:
  /docs                                → src/app/docs/page.tsx
  /docs/getting-started/installation   → src/app/docs/getting-started/installation/page.tsx
  /docs/getting-started/configuration  → src/app/docs/getting-started/configuration/page.tsx
  /docs/api/overview                   → src/app/docs/api/overview/page.tsx
  /docs/any/unknown/path               → src/app/docs/[...slug]/page.tsx
  /api/search                          → src/app/api/search/route.ts

Priority order (when multiple routes could match):
  1. Static routes win  (getting-started/, api/)
  2. Dynamic routes     ([slug])
  3. Catch-all routes   ([...slug])
```

---

---

# 5 — Private Folders — The Underscore Convention

---

## T — TL;DR

Prefix a folder with `_` (underscore) to **permanently opt it out of the routing system**. `_components`, `_utils`, `_hooks` inside `app/` can never become routes — even if someone accidentally adds a `page.tsx` inside them.

---

## K — Key Concepts

### The Underscore Rule

```
Normal folder → CAN become a route if page.tsx is added
_prefixed folder → NEVER a route, regardless of contents

src/app/
├── products/              ← CAN be a route (/products if page.tsx added)
└── _components/           ← NEVER a route (underscore opts out permanently)
    └── page.tsx           ← even this file is ignored — never exposed
```

### Without Underscore — Accidental Route Risk

```
src/app/
├── helpers/
│   └── format.ts          ← utility file, not a route
# /helpers → 404 (no page.tsx) — safe for now
# But if someone adds page.tsx accidentally...
├── helpers/
│   ├── format.ts
│   └── page.tsx           ← now /helpers is a public route — unintentional!
```

### With Underscore — Explicitly Private

```
src/app/
├── _helpers/
│   └── format.ts          ← permanently private — routing system ignores entirely
# /helpers → 404 always, even if page.tsx is added
# _helpers/page.tsx → still not a route
```

### Common Private Folder Patterns

```
src/app/
├── (marketing)/
│   ├── _components/       ← marketing-only components — never a route
│   │   ├── hero.tsx
│   │   └── features-grid.tsx
│   ├── layout.tsx
│   └── page.tsx
│
├── dashboard/
│   ├── _components/       ← dashboard-only components
│   │   ├── stat-card.tsx
│   │   └── activity-feed.tsx
│   ├── layout.tsx
│   └── page.tsx
│
└── _lib/                  ← app-level utilities co-located in app/ (rare)
    └── format-date.ts
```

### Underscore in Different Contexts

```
src/app/_components/     ← private from routing (underscore convention)
src/components/          ← shared components (not in app/, no routing conflict)

Both are safe — but _components/ INSIDE app/ uses underscore to be explicit
that these are app-directory co-located files that must never become routes.
```

### What the Underscore Actually Does

```
Without _:
  app/helpers/page.tsx → Next.js sees: folder "helpers" → segment "helpers" → route /helpers
  app/helpers/style.css → Next.js sees: file in segment "helpers" → ignored (not a route file)

With _:
  app/_helpers/ → Next.js sees: underscore prefix → SKIP this folder entirely
  app/_helpers/page.tsx → completely invisible to the router
  app/_helpers/anything.ts → completely invisible to the router

Effect: underscore removes the folder from Next.js's route tree entirely
```

---

## W — Why It Matters

- The underscore convention communicates **intent** — a folder named `_components` says "this is definitely private, do not route through it." A folder named `components` leaves ambiguity.
- In team environments, the underscore prevents a class of bugs where a junior developer adds a `page.tsx` to a components folder and accidentally exposes internal utilities as public routes.
- Co-locating private components next to the route that uses them (in `_components/`) is the App Router recommended pattern for feature-specific UI — it makes code deletion safe (remove the route folder, remove all its private components at once).
- Understanding this convention is necessary for reading real-world Next.js codebases — every production app uses `_components` folders extensively.

---

## I — Interview Q&A

### Q1: What does the underscore prefix on a folder do in Next.js App Router?

**A:** It opts the folder and all its contents out of the routing system entirely. Next.js completely ignores underscore-prefixed folders when building the route tree — no file inside them can ever become a URL, even if someone adds a `page.tsx`. This is the official convention for co-locating private components, hooks, or utilities next to routes without risking accidental route exposure.

### Q2: What's the difference between putting components in `src/components/` vs `src/app/route/_components/`?

**A:** `src/components/` is for shared components used across multiple routes — they're outside the `app/` directory and have no risk of becoming routes. `src/app/route/_components/` is for components private to one route — they're co-located for discoverability and the underscore prefix ensures they can never become routes. The rule: if a component is used in two or more routes, move it to `src/components/`. If it's only used in one route, keep it in `_components/` next to that route.

### Q3: Is the underscore prefix necessary, or is it just a convention?

**A:** It's a real Next.js routing rule, not just a naming convention. The underscore prefix has mechanical effect — Next.js's file-system router skips any folder whose name starts with `_` when building the route tree. Without the prefix, any folder inside `app/` could potentially become a route if `page.tsx` is added. The prefix makes the exclusion permanent and enforced by the framework.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Naming co-located folders without underscore and wondering why routes appear

```
src/app/products/
├── page.tsx
└── components/              ← no underscore
    └── product-card.tsx

# /products/components → 404 (safe now)
# But later: developer adds page.tsx to components/ → /products/components exposed
```

**Fix:** Always use underscore for co-located component folders inside `app/`:

```
src/app/products/
├── page.tsx
└── _components/             ← underscore = permanently private ✅
    └── product-card.tsx
```

### ❌ Pitfall: Confusing URL path with folder name for underscore folders

```
# Developer creates: src/app/products/_featured/page.tsx
# Expects route: /products/_featured
# Reality: _featured is a private folder — the page.tsx inside is IGNORED
# Result: 404
```

**Fix:** Never add `page.tsx` inside underscore-prefixed folders — they will never become routes. Use normal folder names for routes:

```
src/app/products/
├── featured/
│   └── page.tsx             → /products/featured ✅
└── _components/             ← private (no page.tsx here)
    └── featured-banner.tsx
```

---

## K — Coding Challenge + Solution

### Challenge

Given this poorly organized app directory, refactor it using the underscore convention for all non-route files:

```
src/app/
├── page.tsx
├── layout.tsx
├── store/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── components/
│   │   ├── product-card.tsx
│   │   └── filter-sidebar.tsx
│   ├── hooks/
│   │   └── use-filters.ts
│   └── [category]/
│       ├── page.tsx
│       └── components/
│           └── category-banner.tsx
└── components/              ← root-level components inside app/
    ├── navbar.tsx
    └── footer.tsx
```

### Solution

```
src/app/
├── page.tsx
├── layout.tsx
├── _components/             ← root-level shared UI (private via underscore)
│   ├── navbar.tsx
│   └── footer.tsx
└── store/
    ├── page.tsx
    ├── layout.tsx
    ├── _components/         ← store-private components (never a route)
    │   ├── product-card.tsx
    │   └── filter-sidebar.tsx
    ├── _hooks/              ← store-private hooks (never a route)
    │   └── use-filters.ts
    └── [category]/
        ├── page.tsx
        └── _components/     ← category-private components (never a route)
            └── category-banner.tsx

Changes made:
  components/   → _components/   (root level)
  components/   → _components/   (store level)
  hooks/        → _hooks/         (store level)
  components/   → _components/   (category level)

Why src/components/ instead of src/app/_components/ for truly shared UI:
  If navbar + footer are used across ALL segments (marketing, store, dashboard),
  they should live in src/components/layout/ — outside app/ entirely.
  _components/ inside app/ is for route-specific co-location, not global sharing.
```

---

---

# 6 — Co-located Files — Keeping Code Close

---

## T — TL;DR

Co-location means keeping files that belong together **physically together** in the folder structure. In Next.js App Router, any non-route file can live inside `app/` right next to the route that uses it — no routing exposure happens unless you add `page.tsx`. This makes code easier to find, test, and delete.

---

## K — Key Concepts

### The Co-location Principle

```
Traditional structure (type-based):        App Router co-location:
  src/                                       src/app/
    components/                                products/
      ProductCard.tsx   ←──────────────────────── _components/
    hooks/                                           ProductCard.tsx
      useProducts.ts    ←──────────────────────── _hooks/
    types/                                           useProducts.ts
      product.ts        ←──────────────────────── _types/
    app/                                         product.ts
      products/
        page.tsx

Co-location asks: "Is this code ONLY used by this route?"
  Yes → Put it right next to the route (in _components/, _hooks/, etc.)
  No  → Put it in src/components/, src/hooks/, src/types/
```

### What CAN Be Co-located

```
src/app/products/[id]/
├── page.tsx                     ← route file
├── loading.tsx                  ← route file
├── error.tsx                    ← route file
├── _components/                 ← private components
│   ├── product-gallery.tsx
│   ├── product-details.tsx
│   └── add-to-cart-button.tsx
├── _hooks/                      ← private hooks
│   └── use-product-form.ts
├── _types/                      ← private types (or inline in component)
│   └── product-form.types.ts
└── _utils/                      ← private utilities
    └── format-specs.ts
```

### Testing Files — Co-locate Test Files Too

```
src/app/products/[id]/
├── page.tsx
├── page.test.tsx                ← co-located test (alternative to __tests__/)
├── _components/
│   ├── product-gallery.tsx
│   └── product-gallery.test.tsx ← test right next to the component
```

### The "Finder Test" — Good Co-location

```
Can a new developer find the ProductGallery component in 10 seconds?

Bad (scattered):
  "It's in... src/components/... or maybe src/features/products/...
   or wait, is it src/app/products/_components/...?"

Good (co-located):
  "I'm on the /products/[id] route. The gallery is obviously in:
   src/app/products/[id]/_components/product-gallery.tsx"

Rule: if you know the route, you know where to find its private code.
```

### The Decision Flowchart

```
Is this file used by more than one route?
  YES → src/components/, src/hooks/, src/lib/
  NO  → co-locate next to the route in _components/, _hooks/, etc.

Does this file have route-system behavior (layout, loading, error)?
  YES → it's a Next.js special file (no underscore, exact name required)
  NO  → it's a co-located private file (underscore prefix, any name)
```

### CSS Modules — Co-location Example

```
src/app/products/[id]/
├── page.tsx
├── _components/
│   ├── product-gallery.tsx
│   └── product-gallery.module.css  ← co-located CSS Module
```

```tsx
// product-gallery.tsx
import styles from "./product-gallery.module.css";

export function ProductGallery({ images }: { images: string[] }) {
  return (
    <div className={styles.gallery}>
      {images.map((img) => (
        <img key={img} src={img} alt="" />
      ))}
    </div>
  );
}
```

---

## W — Why It Matters

- Co-location is a refactoring safety net — when you delete a route, you can delete its entire folder and know you've removed all the code that was specific to it. Scattered files mean you're never sure what's safe to delete.
- New developers orient themselves by starting from the URL (what page am I on?) → finding the route folder → reading the co-located files. This is a faster mental model than "what type is this file?" (component? hook? service?).
- The Next.js App Router was specifically designed to support co-location — the rule that only `page.tsx` creates routes exists precisely to enable this pattern safely.
- Co-location of tests next to source files (instead of in `__tests__/`) reduces the friction of writing tests — the test file is right there when you create the component.

---

## I — Interview Q&A

### Q1: What is the benefit of co-locating component files next to their routes in the `app/` directory?

**A:** Three main benefits: discoverability (if you know the URL, you know where to find the code), deletion safety (removing a route folder removes all its private code), and reduced indirection (no cross-folder imports for route-specific logic). It also makes code review easier — all changes for a feature are in one folder, not scattered across `components/`, `hooks/`, and `types/`.

### Q2: How does Next.js prevent co-located files from becoming public routes?

**A:** Through the route exposure rules — only `page.tsx` and `route.ts` create URLs. Any other filename inside `app/` is completely ignored by the router. Additionally, the underscore prefix (`_components/`) explicitly opts a folder out of the routing system, providing an extra layer of protection even if a `page.tsx` is accidentally added inside.

### Q3: When should you move a co-located component to `src/components/`?

**A:** When a second route needs to use the same component. The rule is: one route uses it → co-locate. Two or more routes use it → move to `src/components/` (type-based) or `src/features/` (feature-based). This keeps `src/components/` as a curated library of truly shared UI rather than a dumping ground for everything.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not co-locating route-specific types — creating a massive `types/` folder

```
src/types/
  product-gallery-props.ts      ← used only by one component
  product-form-state.ts         ← used only by one form
  dashboard-stat-card-props.ts  ← used only by one route
  ...50 more files all used in only one place
```

**Fix:** Co-locate types with the component that uses them:

```
src/app/products/[id]/_components/product-gallery.tsx
// Types defined inline or in a co-located file:
// _components/product-gallery.types.ts
```

### ❌ Pitfall: Moving everything to `src/components/` "just in case" it's needed elsewhere

```
src/components/
├── DashboardStatCard.tsx      ← only used in /dashboard
├── CheckoutSummary.tsx        ← only used in /checkout
├── ProductSpecTable.tsx       ← only used in /products/[id]
```

**Fix:** Start co-located. Move to `src/components/` only when a second consumer exists:

```
src/app/
├── dashboard/_components/dashboard-stat-card.tsx   ← co-located
├── checkout/_components/checkout-summary.tsx       ← co-located
└── products/[id]/_components/product-spec-table.tsx ← co-located
```

---

## K — Coding Challenge + Solution

### Challenge

Organize the following files using co-location rules. Classify each as:

- **Co-locate** (only used by one route) → show the `app/route/_folder/` path
- **Shared** (used by 2+ routes) → show the `src/folder/` path

Files to classify:

1. `ProductGallery` — used only in `/products/[id]`
2. `Button` — used in every page
3. `useProductForm` — used only in `/products/[id]`
4. `useDebounce` — used in `/products` search and `/dashboard/orders` search
5. `formatPrice` — used in `/products/[id]`, `/cart`, and `/checkout`
6. `OrderSummary` — used only in `/checkout`
7. `AuthGuard` — used in `/dashboard`, `/checkout`, `/account`
8. `CartItemRow` — used only in `/cart`

### Solution

```
Classification:

1. ProductGallery (only /products/[id])
   → src/app/products/[id]/_components/product-gallery.tsx  (co-located)

2. Button (every page)
   → src/components/ui/button.tsx  (shared)

3. useProductForm (only /products/[id])
   → src/app/products/[id]/_hooks/use-product-form.ts  (co-located)

4. useDebounce (/products + /dashboard/orders)
   → src/hooks/use-debounce.ts  (shared — used in 2 routes)

5. formatPrice (/products/[id] + /cart + /checkout)
   → src/lib/utils.ts  (shared — utility used in 3 routes)

6. OrderSummary (only /checkout)
   → src/app/checkout/_components/order-summary.tsx  (co-located)

7. AuthGuard (/dashboard + /checkout + /account)
   → src/components/auth/auth-guard.tsx  (shared — used in 3 routes)
   OR: src/app/(protected)/layout.tsx  (even better — layout handles auth)

8. CartItemRow (only /cart)
   → src/app/cart/_components/cart-item-row.tsx  (co-located)

Final structure:
src/
├── app/
│   ├── products/[id]/
│   │   └── _components/product-gallery.tsx     (1)
│   │   └── _hooks/use-product-form.ts           (3)
│   ├── checkout/
│   │   └── _components/order-summary.tsx        (6)
│   └── cart/
│       └── _components/cart-item-row.tsx        (8)
├── components/
│   ├── ui/button.tsx                             (2)
│   └── auth/auth-guard.tsx                      (7)
├── hooks/
│   └── use-debounce.ts                          (4)
└── lib/
    └── utils.ts  (formatPrice + cn + others)    (5)
```

---

---

# 7 — Metadata Files — Convention-Based Static Assets

---

## T — TL;DR

Next.js recognizes specific **filenames** placed inside `app/` segments as metadata — `favicon.ico`, `opengraph-image.png`, `robots.txt`, `sitemap.xml`, and more. Drop the file in the right place with the right name and Next.js serves and links it automatically — no `<link>` tags needed.

---

## K — Key Concepts

### The Two Ways to Define Metadata

```
1. File conventions     → drop a file with a specific name in the right folder
2. Metadata exports     → export metadata or generateMetadata from page/layout

This subtopic covers FILE CONVENTIONS — the static file approach.
```

### App Icon Files — Convention-Based

```
src/app/
├── favicon.ico            → /favicon.ico
│                          → automatically added to <head> by root layout
│                          → 32x32 or 16x16 .ico format
│
├── icon.png               → /icon.png
├── icon.jpg               → /icon.jpg
├── icon.svg               → /icon.svg
│                          → alternative icon formats
│                          → Use icon.png for best compatibility
│
├── apple-icon.png         → /apple-icon.png
│                          → iOS home screen icon
│                          → 180x180px recommended
│
└── icon1.png              → can have multiple icons (numbered suffix)
    icon2.png
```

```tsx
// ✅ Auto-linked — no code needed
// Next.js generates in <head>:
// <link rel="icon" href="/favicon.ico" />
// <link rel="apple-touch-icon" href="/apple-icon.png" />

// ❌ Manual approach — no longer needed
// <link rel="icon" href="/favicon.ico" />  ← don't add manually
```

### OpenGraph & Twitter Image Files

```
src/app/
├── opengraph-image.png        → /opengraph-image.png
│                              → for the root route (/)
│                              → 1200x630px recommended
│
├── twitter-image.png          → /twitter-image.png
│                              → Twitter/X card image
│
└── products/
    └── [id]/
        ├── opengraph-image.png → /products/:id/opengraph-image.png
        │                       → route-specific OG image (static)
        └── opengraph-image.tsx → dynamically generated OG image
```

```tsx
// src/app/products/[id]/opengraph-image.tsx
// Dynamic OG image using Next.js ImageResponse

import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/db";

export const runtime = "edge";
export const alt = "Product image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#1a1a1a",
        alignItems: "center",
        padding: "48px",
      }}
    >
      <h1 style={{ color: "white", fontSize: "64px" }}>{product?.name}</h1>
    </div>
  );
}
// → /products/42 has OG image auto-linked in <head>
```

### Sitemap and Robots

```
src/app/
├── robots.txt             → serves /robots.txt as static file
│
├── robots.ts              → generates /robots.txt dynamically (preferred)
│
├── sitemap.xml            → serves /sitemap.xml as static file
│
└── sitemap.ts             → generates /sitemap.xml dynamically (preferred)
```

```ts
// src/app/robots.ts — dynamic (takes priority over robots.txt)
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/dashboard/" }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts — dynamic
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: "https://mysite.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
```

### Manifest (PWA)

```
src/app/
└── manifest.json          → serves /manifest.json
    OR
└── manifest.ts            → generates /manifest.json dynamically
```

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My App",
    short_name: "App",
    description: "My Next.js 16 App",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

### Segment-Level OG Images

```
OG image resolution — closest wins:

/blog/my-post → Next.js looks for opengraph-image in order:
  1. src/app/blog/[slug]/opengraph-image.tsx  ← most specific
  2. src/app/blog/opengraph-image.png         ← blog-level fallback
  3. src/app/opengraph-image.png              ← root fallback

This allows per-page, per-section, and global OG images.
```

---

## W — Why It Matters

- File-convention metadata eliminates entire categories of `<head>` management bugs — no more forgetting to add `<link rel="icon">` or using the wrong path.
- Dynamic OG image generation (`opengraph-image.tsx`) via `ImageResponse` enables per-product, per-post, and per-user social share images without a separate service — this is a significant SEO and social sharing improvement.
- Route-level OG images (each route can have its own) make social sharing dramatically better — a shared product link shows the product image, not the generic site image.
- `manifest.ts` is the App Router way to enable PWA support — the dynamic form means you can read environment variables for the app name and description.

---

## I — Interview Q&A

### Q1: How does Next.js handle `favicon.ico` in the App Router? Do you need a `<link>` tag?

**A:** No. Place `favicon.ico` in `src/app/` and Next.js automatically serves it at `/favicon.ico` and adds the appropriate `<link rel="icon">` tag to `<head>`. The same applies to `apple-icon.png`, `opengraph-image.png`, and other convention-named files. You don't need to manually add any `<link>` or `<meta>` tags for these.

### Q2: What is `opengraph-image.tsx` and how is it different from `opengraph-image.png`?

**A:** `opengraph-image.png` is a static file — the same image is used for every URL in that segment. `opengraph-image.tsx` is a dynamic generator — it's a React component that uses `ImageResponse` to generate an image on-the-fly using data from the route params. This enables per-product, per-blog-post OG images that show the specific content's name and image, making social sharing much more engaging.

### Q3: Should you use `robots.txt` (static) or `robots.ts` (dynamic)?

**A:** Use `robots.ts` (dynamic) in most cases — it lets you read environment variables (e.g., use the correct site URL, block all robots in staging environments) and ensures the sitemap URL is always correct. Use static `robots.txt` only if the content never changes and you don't need environment-specific behavior. If both exist, the TypeScript generator takes priority.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `favicon.ico` in `public/` and manually adding a `<link>` tag

```tsx
// public/favicon.ico exists, and in layout.tsx:
export const metadata: Metadata = {
  icons: { icon: "/favicon.ico" }, // ← manual specification not needed
};
```

**Fix:** Place `favicon.ico` directly in `src/app/` — Next.js handles the rest automatically. Files in `public/` work but require manual metadata configuration; `app/favicon.ico` is zero-config.

### ❌ Pitfall: Wrong OG image dimensions

```
opengraph-image.png — 800x600px
```

**Fix:** OG images should be `1200x630px` (1.91:1 ratio) for Facebook/LinkedIn, and `1200x600px` for Twitter. Wrong dimensions cause images to be cropped or not displayed.

### ❌ Pitfall: Not setting `export const size` in dynamic OG image generators

```tsx
// opengraph-image.tsx without size export
export default function OGImage() {
  return new ImageResponse(<div>Title</div>);
  // ← Default size: 1200x630 — works but not documented
}
```

**Fix:** Always explicitly export `size` and `contentType` for clarity:

```tsx
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the complete metadata file conventions for a blog site:

1. A `favicon.ico` and `apple-icon.png` at app root
2. A root-level static `opengraph-image.png`
3. A dynamic OG image for `/blog/[slug]` that shows the post title
4. A `sitemap.ts` with 2 static pages + dynamic blog posts
5. A `robots.ts` that allows all but blocks `/admin`

### Solution

```
File placement:
src/app/
├── favicon.ico              ← place here (not public/)
├── apple-icon.png           ← 180x180px
├── opengraph-image.png      ← 1200x630px (root fallback)
├── robots.ts
├── sitemap.ts
└── blog/
    └── [slug]/
        └── opengraph-image.tsx   ← dynamic per-post OG image
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com"}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com";

type Post = { slug: string; updatedAt: string };

async function getPosts(): Promise<Post[]> {
  // In production: fetch from DB or CMS
  return [
    { slug: "hello-world", updatedAt: "2026-01-01" },
    { slug: "nextjs-16-tips", updatedAt: "2026-05-01" },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();

  return [
    { url: BASE, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), priority: 0.9 },
    ...posts.map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      priority: 0.7,
    })),
  ];
}
```

```tsx
// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ slug: string }>;

export default async function BlogOGImage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#0f172a",
        padding: "64px",
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: "28px", margin: "0 0 16px" }}>
        My Blog
      </p>
      <h1
        style={{
          color: "#f1f5f9",
          fontSize: "72px",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
    </div>
  );
}
```

---

---

# 8 — Root Layout — The Required Foundation

---

## T — TL;DR

`src/app/layout.tsx` is the **only required file** in a Next.js 16 app. It must render `<html>` and `<body>` tags and wrap `{children}`. It is the outermost shell of every page — the place for global fonts, CSS, providers, and metadata.

---

## K — Key Concepts

### The Minimum Valid Root Layout

```tsx
// src/app/layout.tsx — REQUIRED — cannot be deleted
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

### Why `<html>` and `<body>` Must Be Here

```
In Next.js App Router:
  - Next.js does NOT inject <html> and <body> automatically
  - The root layout is responsible for these tags
  - Without them: build error
  - Only the ROOT layout includes <html> and <body>
  - Nested layouts do NOT repeat <html> and <body>
```

### The Full Production Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Cal_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./_providers";
import "./globals.css";

// ─── Fonts (loaded once, available globally)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // CSS variable for use in Tailwind
});

// ─── Static metadata (applies to all pages unless overridden)
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myapp.com"
  ),
  title: {
    template: "%s | MyApp",
    default: "MyApp — Build Better",
  },
  description: "The best app for building better things",
  keywords: ["nextjs", "react", "typescript"],
  authors: [{ name: "Mark", url: "https://myapp.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://myapp.com",
    siteName: "MyApp",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@myapp",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ─── Viewport (separate from metadata in Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ─── Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning // ← prevents hydration mismatch from dark mode
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {" "}
          {/* context providers (theme, auth, query) */}
          {children}
          <Toaster /> {/* global toast notification portal */}
        </Providers>
      </body>
    </html>
  );
}
```

### Providers Pattern — Keeping Root Layout Clean

```tsx
// src/app/_providers.tsx
// Client-side providers extracted to keep root layout a Server Component
"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient must be created with useState — one instance per user session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### `suppressHydrationWarning` — Why It's Needed

```tsx
// The root <html> element often gets attributes added by browser extensions
// or dark mode scripts BEFORE React hydrates — causing hydration mismatch warnings
// suppressHydrationWarning silences these expected warnings at the root level only

<html lang="en" suppressHydrationWarning>
  ← NOT the same as suppressing all hydration warnings everywhere
  ← Only suppresses warnings on the html element itself (one level deep)
  ← Still catches real hydration bugs in child components
```

### `next/font` in Root Layout

```tsx
// next/font loads fonts at build time — zero CLS, no external network request
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans", // use as var(--font-sans) in CSS
  display: "swap", // FOIT → FOUT (better than blocking)
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* globals.css — use font variables with Tailwind */
@theme {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-roboto-mono);
}
```

---

## W — Why It Matters

- The root layout is the **single point of truth** for global configuration — fonts, global CSS, providers, and base metadata all live here. Getting it right prevents a class of "why is my font not loading?" and "why does my context not work?" bugs.
- The `Providers` extraction pattern is critical for Next.js architecture — context providers (TanStack Query, next-themes) require `'use client'`, but the root layout should stay a Server Component. Wrapping providers in a separate Client Component solves this.
- `suppressHydrationWarning` on `<html>` is not a hack — it's the official recommendation. Dark mode scripts and browser extensions modify the DOM before React hydrates, causing false warnings. Suppressing only at the html level is precise and safe.
- `next/font` in the root layout eliminates Cumulative Layout Shift from font loading — one of the biggest real-world CWV improvements with zero extra effort.

---

## I — Interview Q&A

### Q1: Why must the root `layout.tsx` include `<html>` and `<body>` tags?

**A:** Next.js App Router does not inject these tags automatically — the root layout is solely responsible for the full HTML document shell. Nested layouts do not add `<html>` or `<body>`. If the root layout omits them, the build fails with an error. This design gives developers full control over the `<html>` attributes (like `lang`, `dir`, dark mode classes) and `<body>` styling.

### Q2: How do you add React context providers (TanStack Query, next-themes) to a Next.js 16 app without making the root layout a Client Component?

**A:** Extract all providers into a separate `Providers` Client Component (`'use client'`), then render `<Providers>` inside the root layout. The root layout remains a Server Component — it can fetch data, access environment variables, and avoid shipping unnecessary JavaScript. The `Providers` component is the smallest possible Client Component boundary that wraps all client-side context.

### Q3: What does the `title.template` in root layout metadata do?

**A:** It defines a template string for page titles. `%s` is replaced by the title defined in each page's metadata export. For example, if `template: '%s | MyApp'` and a page exports `title: 'Products'`, the rendered `<title>` is `Products | MyApp`. The `default` value is used for any page that doesn't define its own title. This prevents every page from needing to append the site name manually.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `'use client'` on the root layout

```tsx
"use client"; // ← on root layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
// Now the ENTIRE app tree is a Client Component boundary
// Server Components in pages cannot be truly server-rendered
// All data fetching loses server benefits
```

**Fix:** Keep root layout as a Server Component. Move any client-side code (`useState`, context) into a `_providers.tsx` Client Component.

### ❌ Pitfall: Adding `<html>` and `<body>` in nested layouts

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — duplicate html tag
      <body>
        {" "}
        // ← WRONG — duplicate body tag
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
// Result: invalid HTML — nested html/body tags
```

**Fix:** Only the root `app/layout.tsx` has `<html>` and `<body>`. Nested layouts return only the wrapper elements needed:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      {" "}
      // ← correct — just the wrapper
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### ❌ Pitfall: Importing `globals.css` in both root layout and individual pages

```tsx
// src/app/layout.tsx
import "./globals.css"; // ✅ correct

// src/app/products/page.tsx
import "../globals.css"; // ❌ duplicate import — double styles
```

**Fix:** Import `globals.css` **only once** in `src/app/layout.tsx`.

---

## K — Coding Challenge + Solution

### Challenge

Build a complete production-ready root layout that:

1. Stays a Server Component (no `'use client'`)
2. Loads the `Inter` font via `next/font/google`
3. Has complete static metadata (title template, description, OG, Twitter)
4. Wraps children in a `Providers` component (TanStack Query + a hypothetical ThemeProvider)
5. Includes a global `Toaster` for notifications
6. Sets `suppressHydrationWarning` correctly
7. Imports `globals.css`

### Solution

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myapp.com"
  ),
  title: {
    template: "%s | MyApp",
    default: "MyApp",
  },
  description: "Build better products with MyApp",
  openGraph: {
    type: "website",
    siteName: "MyApp",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@myapp",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/_providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

---

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

# 10 — Segment-Based Organization — Route Groups, Dynamic Segments, Catch-All Routes

---

## T — TL;DR

Next.js gives you four tools to organize the `app/` folder beyond plain folders: **route groups** `(name)` to organize without affecting URLs, **dynamic segments** `[param]` for variable URL parts, **catch-all routes** `[...slug]` for wildcard paths, and **parallel routes** `@slot` for simultaneous page rendering. Together they cover every routing pattern.

---

## K — Key Concepts

### Tool 1 — Route Groups `(name)`

```
Purpose: Organize folders without adding URL segments

(name)/     ← parentheses = ignored in URL, used for organization only
```

```
src/app/
├── (marketing)/            ← no URL impact
│   ├── layout.tsx          ← marketing layout
│   ├── page.tsx            → /
│   ├── about/page.tsx      → /about
│   └── pricing/page.tsx    → /pricing
│
├── (auth)/                 ← no URL impact
│   ├── layout.tsx          ← centered card layout
│   ├── login/page.tsx      → /login
│   └── register/page.tsx   → /register
│
└── (dashboard)/            ← no URL impact
    ├── layout.tsx          ← sidebar layout
    └── dashboard/
        └── page.tsx        → /dashboard

URLs generated:
  /           ← from (marketing)/page.tsx
  /about      ← from (marketing)/about/page.tsx
  /login      ← from (auth)/login/page.tsx
  /dashboard  ← from (dashboard)/dashboard/page.tsx
```

### Tool 2 — Dynamic Segments `[param]`

```
Single dynamic segment:
  [id]          → matches any single value
  /products/1
  /products/abc
  /products/anything

  Type: params.id → string
```

```tsx
// src/app/products/[id]/page.tsx
type Params = Promise<{ id: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  return <div>Product: {id}</div>;
}
```

### Tool 3 — Catch-All Routes `[...slug]`

```
Required catch-all: [...slug]
  → Matches /docs/a, /docs/a/b, /docs/a/b/c
  → Does NOT match /docs (404 — base path)
  → params.slug → string[]

Optional catch-all: [[...slug]]
  → Matches /docs AND /docs/a AND /docs/a/b
  → params.slug → string[] | undefined
```

```tsx
// src/app/docs/[...slug]/page.tsx
type Params = Promise<{ slug: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const path = slug.join("/"); // 'getting-started/installation'

  return <div>Docs path: {path}</div>;
}

// src/app/docs/[[...slug]]/page.tsx — optional
type OptionalParams = Promise<{ slug?: string[] }>;

export default async function DocsPage({ params }: { params: OptionalParams }) {
  const { slug } = await params;
  const path = slug?.join("/") ?? ""; // '' for /docs, 'a/b' for /docs/a/b

  if (!slug) return <div>Docs Home</div>;
  return <div>Docs: {path}</div>;
}
```

### Route Priority — Conflict Resolution

```
Priority order (highest to lowest):
  1. Static segments        /blog/new
  2. Dynamic segments       /blog/[slug]
  3. Catch-all segments     /blog/[...slug]

Example:
  /blog/new       → app/blog/new/page.tsx              (static wins)
  /blog/my-post   → app/blog/[slug]/page.tsx           (dynamic)
  /blog/a/b/c     → app/blog/[...slug]/page.tsx        (catch-all)
```

### Tool 4 — Parallel Routes `@slot`

```
Purpose: Render multiple pages simultaneously in the same layout
         (modals, split views, dashboards with independent sections)

Syntax: folders starting with @ are "slots"
```

```
src/app/
└── dashboard/
    ├── layout.tsx          ← receives @analytics and @revenue as props
    ├── page.tsx            → default slot content
    ├── @analytics/
    │   └── page.tsx        → analytics slot
    └── @revenue/
        └── page.tsx        → revenue slot
```

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  revenue,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode; // ← @analytics/page.tsx
  revenue: React.ReactNode; // ← @revenue/page.tsx
}) {
  return (
    <div>
      <div className="main">{children}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>{analytics}</div> {/* loads independently */}
        <div>{revenue}</div> {/* loads independently */}
      </div>
    </div>
  );
}
// Each slot can have its own loading.tsx and error.tsx
// Both slots load in parallel — faster than sequential
```

### Tool 5 — Intercepting Routes `(.)path`

```
Purpose: Open a route as a modal/overlay while keeping the URL
         (Instagram-style: click photo → modal opens, URL changes,
          refresh → full page view of the photo)

Syntax: (.) same level, (..) one level up, (...) root level
```

```
src/app/
├── photos/
│   ├── page.tsx              → /photos (gallery page)
│   └── [id]/
│       └── page.tsx          → /photos/42 (full photo page on refresh)
│
└── @modal/
    ├── default.tsx           ← shown when no modal is active (null)
    └── (.)photos/
        └── [id]/
            └── page.tsx      → intercepted /photos/42 (modal view)
```

### Segment Organization — Complete Example

```
src/app/
│
├── (marketing)/
│   ├── layout.tsx                    ← marketing nav + footer
│   ├── page.tsx                      → /
│   └── blog/
│       ├── page.tsx                  → /blog (list)
│       └── [slug]/                   ← dynamic
│           ├── page.tsx              → /blog/:slug
│           └── opengraph-image.tsx   ← per-post OG image
│
├── (auth)/
│   ├── layout.tsx                    ← centered card layout
│   ├── login/page.tsx                → /login
│   └── register/page.tsx            → /register
│
├── (app)/
│   ├── layout.tsx                    ← auth check + sidebar
│   ├── dashboard/
│   │   ├── page.tsx                  → /dashboard
│   │   ├── @overview/page.tsx        ← parallel slot
│   │   └── @recentOrders/page.tsx    ← parallel slot
│   ├── products/
│   │   ├── page.tsx                  → /products
│   │   └── [id]/page.tsx            → /products/:id
│   └── docs/
│       └── [[...slug]]/page.tsx     → /docs AND /docs/:any/:depth
│
└── api/
    ├── products/route.ts             → /api/products
    └── products/[id]/route.ts        → /api/products/:id
```

---

## W — Why It Matters

- Route groups are the App Router answer to "how do I have multiple layouts without changing URLs" — not knowing them leads to incorrectly nested layouts or duplicated layout code.
- Dynamic segments with `generateStaticParams` are the core of static site generation for blogs, product catalogs, and documentation — understanding them is essential for any content-heavy Next.js app.
- Optional catch-all `[[...slug]]` is frequently chosen over `[...slug]` — knowing the difference (base path accessible vs 404) prevents a subtle and frustrating routing bug.
- Parallel routes enable truly independent loading sections — a dashboard where analytics and revenue charts load in parallel, each with their own `loading.tsx`, is dramatically better UX than sequential loading.

---

## I — Interview Q&A

### Q1: What are route groups and what problem do they solve?

**A:** Route groups are folders whose names are wrapped in parentheses — `(marketing)`, `(dashboard)`, `(auth)`. They're completely ignored by the URL router (no URL segment is created) but allow you to organize routes into groups that share a common `layout.tsx`. This solves the problem of having distinct layouts for different sections of an app (marketing site with top nav, dashboard with sidebar) without creating URL nesting (`/marketing/about` instead of `/about`).

### Q2: What is the difference between `[...slug]` and `[[...slug]]`?

**A:** `[...slug]` is a required catch-all — it only matches URLs with at least one path segment after the folder. The base path returns 404. `[[...slug]]` is an optional catch-all — it matches both the base path (where `slug` is `undefined`) and any depth of URL below it. Use `[[...slug]]` when you want the root of the segment to also render (common for documentation sites where `/docs` is the docs home).

### Q3: How do parallel routes (`@slot`) improve loading performance?

**A:** Each `@slot` loads independently — it has its own loading state, error boundary, and data fetching lifecycle. In a dashboard layout with `@analytics` and `@revenue` slots, both sections fetch their data concurrently. If analytics data arrives in 200ms and revenue data takes 800ms, the analytics section renders immediately while revenue shows a skeleton. Without parallel routes, you'd either fetch both in one component (slower) or manually orchestrate the concurrent loading.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using a route group folder for URL nesting instead of organization

```
src/app/
└── (features)/
    └── dashboard/
        └── page.tsx    → /dashboard ✅ (correct — group ignored)
```

But developer expects:

```
src/app/
└── features/           ← no parentheses — this IS a URL segment
    └── dashboard/
        └── page.tsx    → /features/dashboard ← probably not intended
```

**Fix:** Use parentheses `(features)` when you want organization without URL impact. Use plain folder `features` when you want a URL segment.

### ❌ Pitfall: `[...slug]` for a docs root that should be accessible

```
src/app/docs/
└── [...slug]/
    └── page.tsx         → /docs/anything ✅  BUT /docs → 404 ❌
```

**Fix:** Use optional catch-all `[[...slug]]`:

```
src/app/docs/
└── [[...slug]]/
    └── page.tsx         → /docs ✅  AND /docs/anything ✅
```

### ❌ Pitfall: Forgetting `default.tsx` in parallel route slots

```tsx
// @modal slot exists but no default.tsx
// User navigates directly to /photos (not via modal interception)
// → Error: No matching route found for slot @modal
```

**Fix:** Add `default.tsx` to every parallel slot — it's the fallback when the slot has no active page:

```tsx
// src/app/@modal/default.tsx
export default function ModalDefault() {
  return null; // ← renders nothing when no modal is active
}
```

---

## K — Coding Challenge + Solution

```tsx
// src/app/(docs)/docs/[[...path]]/page.tsx — COMPLETE
import type { Metadata } from "next";

type Params = Promise<{ path?: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { path } = await params;
  const title = path
    ? path[path.length - 1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    : "Documentation";
  return { title };
}

export default async function DocsPage({ params }: { params: Params }) {
  const { path } = await params;

  // ─── Docs home (/docs)
  if (!path) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">Documentation</h1>
        <p className="text-gray-600">
          Welcome to the docs. Choose a section from the sidebar.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <a
            href="/docs/getting-started/installation"
            className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
          >
            <h2 className="font-semibold">Getting Started</h2>
            <p className="text-sm text-gray-500 mt-1">
              Install and configure the app
            </p>
          </a>
          <a
            href="/docs/api/authentication"
            className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
          >
            <h2 className="font-semibold">API Reference</h2>
            <p className="text-sm text-gray-500 mt-1">Full API documentation</p>
          </a>
        </div>
      </div>
    );
  }

  // ─── Dynamic docs page (/docs/a/b/c)
  const docPath = path.join("/");
  const pageTitle = path[path.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Breadcrumb from path segments
  const breadcrumbs = path.map((segment, i) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    href: "/docs/" + path.slice(0, i + 1).join("/"),
  }));

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <a href="/docs" className="hover:text-gray-900">
          Docs
        </a>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-2">
            <span>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <a href={crumb.href} className="hover:text-gray-900">
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>

      {/* Page title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
      <p className="text-sm text-gray-400 font-mono mb-8">/docs/{docPath}</p>

      {/* Placeholder content — in production: fetch MDX from CMS */}
      <div className="prose prose-gray max-w-none">
        <p>
          Content for <strong>{pageTitle}</strong> coming soon.
        </p>
      </div>
    </article>
  );
}
```

```tsx
// src/app/(docs)/layout.tsx — docs layout with sidebar
import Link from "next/link";

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    links: [
      { label: "Installation", href: "/docs/getting-started/installation" },
      { label: "Configuration", href: "/docs/getting-started/configuration" },
      { label: "Quick Start", href: "/docs/getting-started/quick-start" },
    ],
  },
  {
    title: "API Reference",
    links: [
      { label: "Authentication", href: "/docs/api/authentication" },
      { label: "Products", href: "/docs/api/products" },
      { label: "Orders", href: "/docs/api/orders" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6">
        <Link href="/docs" className="font-semibold text-gray-900 block mb-6">
          Documentation
        </Link>
        <nav className="space-y-6">
          {DOC_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block px-2 py-1.5 text-sm text-gray-600
                                 rounded hover:bg-gray-200 hover:text-gray-900
                                 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 max-w-3xl px-12 py-10">{children}</main>
    </div>
  );
}
```

```ts
// src/app/api/docs/search/route.ts — GET /api/docs/search
import { NextRequest, NextResponse } from "next/server";

// Fake docs index — in production: Algolia, Postgres full-text, etc.
const DOCS_INDEX = [
  {
    path: "getting-started/installation",
    title: "Installation",
    excerpt: "How to install the app",
  },
  {
    path: "getting-started/configuration",
    title: "Configuration",
    excerpt: "Configure your environment",
  },
  {
    path: "api/authentication",
    title: "Authentication",
    excerpt: "Auth tokens and sessions",
  },
  { path: "api/products", title: "Products API", excerpt: "CRUD for products" },
];

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = DOCS_INDEX.filter(
    (doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.excerpt.toLowerCase().includes(q)
  ).map((doc) => ({
    title: doc.title,
    excerpt: doc.excerpt,
    url: `/docs/${doc.path}`,
  }));

  return NextResponse.json({ results });
}
```

```
Final URL → File mapping (complete):

  /                                → src/app/(marketing)/page.tsx
  /pricing                         → src/app/(marketing)/pricing/page.tsx
  /login                           → src/app/(auth)/login/page.tsx
  /docs                            → src/app/(docs)/docs/[[...path]]/page.tsx  (path = undefined)
  /docs/getting-started/install... → src/app/(docs)/docs/[[...path]]/page.tsx  (path = ['getting-started','installation'])
  /docs/api/authentication         → src/app/(docs)/docs/[[...path]]/page.tsx  (path = ['api','authentication'])
  /api/docs/search                 → src/app/api/docs/search/route.ts

Layouts applied per route:

  /                     → RootLayout → MarketingLayout → HomePage
  /pricing              → RootLayout → MarketingLayout → PricingPage
  /login                → RootLayout → AuthLayout      → LoginPage
  /docs                 → RootLayout → DocsLayout      → DocsPage (home)
  /docs/api/auth...     → RootLayout → DocsLayout      → DocsPage (dynamic)
  /api/docs/search      → No layout (API route — no UI)
```

---

## ✅ Day 2 Complete — File Conventions and Route Basics

| #   | Subtopic                                                                      | Status |
| --- | ----------------------------------------------------------------------------- | ------ |
| 1   | `page.tsx` — The Route File                                                   | ☐      |
| 2   | `layout.tsx` — Persistent Wrappers                                            | ☐      |
| 3   | `template.tsx` — Remounting Layouts                                           | ☐      |
| 4   | Route Exposure Rules — What Makes a URL Accessible                            | ☐      |
| 5   | Private Folders — The Underscore Convention                                   | ☐      |
| 6   | Co-located Files — Keeping Code Close                                         | ☐      |
| 7   | Metadata Files — Convention-Based Static Assets                               | ☐      |
| 8   | Root Layout — The Required Foundation                                         | ☐      |
| 9   | Nested Layouts — Segment-Based Layout Inheritance                             | ☐      |
| 10  | Segment-Based Organization — Route Groups, Dynamic Segments, Catch-All Routes | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 2

```
SPECIAL FILES — only these create routes or affect routing behavior
  page.tsx        → makes a folder a URL (default export required, async OK)
  layout.tsx      → persists between navigations, wraps children (no searchParams)
  template.tsx    → remounts on every navigation (animations, analytics, state reset)
  loading.tsx     → automatic Suspense fallback while page loads
  error.tsx       → error boundary ('use client' required, has reset() prop)
  not-found.tsx   → shown when notFound() is called
  route.ts        → API endpoint (GET/POST/etc. named exports, no page.tsx conflict)
  middleware.ts   → runs before routing (src/ root or project root)

ROUTE EXPOSURE RULES
  Only page.tsx and route.ts create accessible URLs
  All other files are invisible to the router regardless of name
  Static routes win over dynamic routes over catch-all routes

PRIVATE FOLDERS
  _folder/        → underscore = permanently opted out of routing
  _components/    → route-private UI components (most common pattern)
  _hooks/         → route-private hooks
  _utils/         → route-private utilities

CO-LOCATION
  Used in 1 route  → co-locate in app/route/_components/
  Used in 2+ routes → move to src/components/ (shared)
  Tests            → co-locate next to the file they test

METADATA FILES (drop file, zero config needed)
  favicon.ico           → auto-linked as browser icon
  apple-icon.png        → auto-linked as iOS icon
  opengraph-image.png   → auto-linked as OG image (static)
  opengraph-image.tsx   → dynamic OG image via ImageResponse
  robots.ts             → generates /robots.txt
  sitemap.ts            → generates /sitemap.xml
  manifest.ts           → generates /manifest.json (PWA)

ROOT LAYOUT (src/app/layout.tsx — REQUIRED)
  Must include <html> and <body> tags
  Import globals.css here (only once)
  Load next/font here
  Add context providers via _providers.tsx Client Component
  Export metadata with title.template for all pages
  suppressHydrationWarning on <html> (dark mode + extensions)

NESTED LAYOUTS
  Stack from outermost to innermost (mirrors folder structure)
  Each layout wraps all routes in its segment
  Data fetching: parallel across levels, deduplicated via React cache()
  Route groups (name) → separate layouts per section, no URL impact

SEGMENT TOOLS
  (group)        → route group (organize + separate layouts, no URL)
  [param]        → dynamic segment (one value, string)
  [...slug]      → required catch-all (1+ segments, string[])
  [[...slug]]    → optional catch-all (0+ segments, string[] | undefined)
  @slot          → parallel route (independent loading sections)
  (.)path        → intercepting route (modal pattern)
```

---

> **Your next action:** Open your scaffolded Next.js 16 project. Create `src/app/blog/[slug]/page.tsx` with typed awaited params. Add a `loading.tsx` next to it with a skeleton. Navigate to `/blog/hello-world` in the browser and watch the loading state appear.
>
> _Doing one small thing beats opening a feed._
