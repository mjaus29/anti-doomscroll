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
