# 10 — Route Conflicts, Priority, and Edge Cases

---

## T — TL;DR

Next.js follows **deterministic routing priority rules** — when multiple files could match a URL, one always wins. Knowing these rules lets you design routes confidently and debug mysterious 404s and wrong-page renders quickly.

---

## K — Key Concepts

### Priority Rule 1 — Static Beats Dynamic

```
Given:
  src/app/products/new/page.tsx      ← static
  src/app/products/[id]/page.tsx     ← dynamic

URL: /products/new
→ Renders: products/new/page.tsx     ← static WINS

URL: /products/42
→ Renders: products/[id]/page.tsx    ← dynamic (no static match)

URL: /products/featured
→ Renders: products/[id]/page.tsx    ← dynamic (no static match)
```

### Priority Rule 2 — Dynamic Beats Catch-All

```
Given:
  src/app/docs/[slug]/page.tsx       ← dynamic (single segment)
  src/app/docs/[...path]/page.tsx    ← catch-all (multiple segments)

URL: /docs/introduction
→ Renders: docs/[slug]/page.tsx      ← dynamic (one segment = exact match)

URL: /docs/api/auth/overview
→ Renders: docs/[...path]/page.tsx   ← catch-all (3 segments, dynamic can't match)
```

### Priority Rule 3 — Required Catch-All Beats Optional When Segments Exist

```
Given:
  src/app/docs/[...required]/page.tsx    ← required catch-all
  src/app/docs/[[...optional]]/page.tsx  ← optional catch-all

⚠️ You cannot have BOTH in the same folder — it's a build error
These are mutually exclusive.

Rule: Choose ONE:
  [[...slug]] if you also want /docs (base path)
  [...slug]   if /docs should be a separate page.tsx
```

### Priority Rule 4 — Specificity Wins at Every Level

```
URL: /blog/2026/05/hello-world

Possible matches (most specific → least specific):
  1. blog/2026/05/[slug]/page.tsx      ← exact depth match with dynamic last
  2. blog/2026/[month]/[slug]/page.tsx ← dynamic month
  3. blog/[year]/[month]/[slug]/page.tsx ← all dynamic
  4. blog/[...path]/page.tsx            ← catch-all (least specific)

Next.js picks #1 (deepest specific match)
```

### Complete Priority Hierarchy

```
Priority order (highest → lowest) for a single URL:
  1. Static segment           → /blog/new/page.tsx
  2. Dynamic segment          → /blog/[slug]/page.tsx
  3. Catch-all segment        → /blog/[...slug]/page.tsx
  4. Optional catch-all       → /blog/[[...slug]]/page.tsx

Within the same type:
  → More specific path wins (more static segments = more specific)
  → /blog/featured/page.tsx  beats  /blog/[slug]/page.tsx

Across nested levels:
  → Static at any level beats dynamic at that level
  → /a/b/c/page.tsx beats /a/b/[x]/page.tsx for /a/b/c
```

### Route Conflicts — What Causes Build Errors

```
❌ Conflict 1: Two files resolve to the same URL
  (groupA)/about/page.tsx  → /about
  (groupB)/about/page.tsx  → /about
  Error: "Conflicting routes: /about"

❌ Conflict 2: page.tsx AND route.ts in same folder
  products/page.tsx         → /products (UI)
  products/route.ts         → /products (API)
  Error: "You cannot define a route and a page at the same level"

❌ Conflict 3: [...slug] AND [[...slug]] in same folder
  docs/[...slug]/page.tsx
  docs/[[...slug]]/page.tsx
  Error: "Conflicting catch-all routes"

❌ Conflict 4: Same dynamic name at same level
  [id]/page.tsx
  [slug]/page.tsx
  (in same parent folder)
  Error: "Two different param names at the same level"
```

### Edge Case — Parallel Routes and Slots

```tsx
// Parallel routes use @ prefix — not a URL segment
// src/app/dashboard/
//   ├── layout.tsx        ← receives @analytics and @revenue
//   ├── page.tsx          → /dashboard (default slot)
//   ├── @analytics/
//   │   └── page.tsx      ← slot content (no URL)
//   └── @revenue/
//       └── page.tsx      ← slot content (no URL)

// layout.tsx
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
      <div>{children}</div>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>{analytics}</div>
        <div>{revenue}</div>
      </div>
    </div>
  );
}
```

### Edge Case — Intercepting Routes

```
// Intercepting routes catch a navigation and render it differently
// (.) = same level  (..) = one level up  (...) = root level

src/app/
├── photos/
│   ├── page.tsx              → /photos (gallery)
│   └── [id]/
│       └── page.tsx          → /photos/42 (full photo page — on direct visit or refresh)
│
└── @modal/
    ├── default.tsx           ← null (no active modal)
    └── (.)photos/
        └── [id]/
            └── page.tsx      ← /photos/42 (modal — when navigated from gallery)
```

```
Behavior:
  Direct URL visit: /photos/42
  → Renders: photos/[id]/page.tsx (full page, no modal)

  Click from /photos gallery:
  → URL changes to /photos/42
  → Renders: @modal/(.)photos/[id]/page.tsx (modal overlay)
  → Gallery remains in background

  Page refresh at /photos/42 when modal is open:
  → Renders: photos/[id]/page.tsx (full page — modal state lost, correct)
```

### `dynamicParams` Behavior Summary

```tsx
// src/app/products/[id]/page.tsx

export const dynamicParams = true; // DEFAULT
// → Unknown params: rendered on-demand (SSR), then cached
// → /products/999 (not in generateStaticParams) → renders ✅

export const dynamicParams = false;
// → Unknown params: 404
// → /products/999 (not in generateStaticParams) → 404 ✅
// Use for: docs sites, blogs — all content known at build time
```

### Debugging Route Issues — Checklist

```
❓ Getting 404 on a route I created?
  ✅ Check: does the folder have a page.tsx (not just layout.tsx)?
  ✅ Check: is the folder inside app/ directory?
  ✅ Check: using [...slug] for base path? Switch to [[...slug]]
  ✅ Check: dynamic segment name matches what you're testing?
  ✅ Check: no typo in folder name (capital letters matter on Linux)

❓ Wrong page rendering for a URL?
  ✅ Check: static vs dynamic priority — does a static route exist?
  ✅ Check: is a route group consuming the segment unexpectedly?
  ✅ Check: are you looking at a cached dev build? Run next build

❓ Build error "conflicting routes"?
  ✅ Check: same URL from two route groups
  ✅ Check: page.tsx + route.ts in same folder
  ✅ Check: two dynamic segments with different names at same level

❓ Params are undefined?
  ✅ Check: awaiting params? (Next.js 15+ requires await)
  ✅ Check: using useParams in Client Component (not props)?
  ✅ Check: the segment name matches the folder name exactly?
```

---

## W — Why It Matters

- Understanding priority rules lets you design routes with confidence — you know exactly which file handles `/products/new` without guessing, and can plan your static/dynamic routing deliberately.
- Route conflict errors are build-time failures — they prevent deployment. Knowing the conflict rules means you catch them in code review, not in CI.
- The intercepting route pattern (`(.)photos/[id]`) is what powers Instagram-style modals — clicking a photo opens a modal with the photo URL, refreshing shows the full photo page. This is a UX pattern used in every major social platform.
- `dynamicParams = false` is a security and correctness tool for content sites — it prevents route enumeration (users guessing IDs) and ensures your app only serves pre-approved content at known URLs.

---

## I — Interview Q&A

### Q1: If you have `/products/new/page.tsx` and `/products/[id]/page.tsx`, which handles `/products/new`?

**A:** `products/new/page.tsx` handles it — static routes always take priority over dynamic routes at the same level. Next.js evaluates routes from most specific to least specific. A literal folder name (`new`) is more specific than a parameterized folder name (`[id]`). This is intentional — it lets you add special pages like `new`, `featured`, or `popular` alongside dynamic product pages without any configuration.

### Q2: What causes a "conflicting routes" build error?

**A:** There are three main causes. First: two route groups have the same folder structure inside them — `(groupA)/about/page.tsx` and `(groupB)/about/page.tsx` both claim `/about`. Second: `page.tsx` and `route.ts` exist in the same directory — they both claim the same URL for UI and API respectively. Third: two different dynamic segment names at the same level — `[id]/page.tsx` and `[slug]/page.tsx` in the same parent folder. All are caught at build time.

### Q3: What is an intercepting route and when would you use one?

**A:** An intercepting route catches a navigation to a URL and renders it differently without changing the URL — typically as a modal overlay. The syntax uses parentheses with dots: `(.)` for same level, `(..)` for one level up. The classic use case is an image gallery: clicking a photo navigates to `/photos/42` and shows a modal while the gallery stays in the background. Refreshing at `/photos/42` shows the full standalone photo page. It's how Instagram, Pinterest, and Vercel's dashboard implement their modal-with-deep-link pattern.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Two dynamic segments with different names at the same level

```
src/app/
└── products/
    ├── [id]/page.tsx      ← dynamic
    └── [slug]/page.tsx    ← ALSO dynamic at same level
// Build error: cannot have two different param names at the same segment
```

**Fix:** Use only one dynamic segment at each level — pick the most semantically correct name:

```
src/app/products/[id]/page.tsx    ← one dynamic segment ✅
```

### ❌ Pitfall: Relying on dynamic segment for a URL that should be static

```
// Developer wants /products/new to show a creation form
// But only has [id]/page.tsx
// User visits /products/new → renders "product with id='new'" → DB query for 'new' → 404
```

**Fix:** Add the static segment BEFORE the dynamic one:

```
src/app/products/
├── new/page.tsx           → /products/new ✅ (static, wins)
└── [id]/page.tsx          → /products/:id ✅ (dynamic fallback)
```

### ❌ Pitfall: Forgetting `default.tsx` in parallel routes

```tsx
// @modal/ slot exists — no default.tsx
// User navigates directly to /dashboard (no modal active)
// → Error: "No route matches for @modal slot"
```

**Fix:** Always add `default.tsx` to parallel route slots:

```tsx
// src/app/dashboard/@modal/default.tsx
export default function ModalDefault() {
  return null; // ← renders nothing when no modal is active
}
```

### ❌ Pitfall: Using `dynamicParams = false` on a blog with new posts

```tsx
// dynamicParams = false on blog posts
// Editor publishes new post after build
// Users visit the new post URL → 404 (not in pre-built params)
```

**Fix:** Use `dynamicParams = true` (default) with ISR for content that updates:

```tsx
export const dynamicParams = true; // unknown slugs render on-demand
export const revalidate = 3600; // re-validate every hour
// New posts are accessible immediately (SSR on first visit, cached after)
```

---

## K — Coding Challenge + Solution

### Challenge

Design and implement a routing solution for a photo portfolio with these requirements:

1. `/gallery` — shows all photos (grid layout)
2. `/gallery/[id]` — full photo page (on direct visit or refresh)
3. Clicking a photo from the gallery opens a modal at `/gallery/[id]` (intercepting route)
4. `/gallery/new` — upload form (static segment, NOT matched by `[id]`)
5. `dynamicParams = false` — only pre-built photo IDs are valid
6. Show the complete file structure and all key files

### Solution

```
File structure:
src/app/
└── (gallery)/
    ├── layout.tsx                         ← gallery shell (handles @modal slot)
    ├── gallery/
    │   ├── page.tsx                       → /gallery (photo grid)
    │   ├── new/
    │   │   └── page.tsx                   → /gallery/new (upload form — static)
    │   └── [id]/
    │       ├── page.tsx                   → /gallery/:id (full page on direct visit)
    │       └── loading.tsx
    └── @modal/
        ├── default.tsx                    ← null (no modal active)
        └── (.)gallery/
            └── [id]/
                └── page.tsx              ← /gallery/:id (modal when clicked from gallery)
```

```tsx
// src/app/(gallery)/layout.tsx
// Receives @modal as a slot — renders it as an overlay when active
export default function GalleryLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode; // ← @modal slot
}) {
  return (
    <>
      {children}
      {modal} {/* ← modal renders here as overlay when intercepted */}
    </>
  );
}
```

```tsx
// src/app/(gallery)/@modal/default.tsx
export default function ModalDefault() {
  return null; // ← nothing rendered when no modal is active
}
```

```tsx
// src/app/(gallery)/gallery/page.tsx
import Link from "next/link";

// Pre-built photo IDs
const PHOTOS = [
  {
    id: "photo-1",
    src: "/photos/1.jpg",
    alt: "Mountain sunset",
    width: 800,
    height: 600,
  },
  {
    id: "photo-2",
    src: "/photos/2.jpg",
    alt: "Ocean waves",
    width: 800,
    height: 533,
  },
  {
    id: "photo-3",
    src: "/photos/3.jpg",
    alt: "Forest trail",
    width: 800,
    height: 1067,
  },
  {
    id: "photo-4",
    src: "/photos/4.jpg",
    alt: "City at night",
    width: 800,
    height: 600,
  },
];

export default function GalleryPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <Link
          href="/gallery/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Upload Photo
        </Link>
      </div>

      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {PHOTOS.map((photo) => (
          // Link to /gallery/:id — intercepted as modal on client navigation
          <Link key={photo.id} href={`/gallery/${photo.id}`} scroll={false}>
            <div
              className="overflow-hidden rounded-xl bg-gray-100 cursor-zoom-in
                            hover:opacity-90 transition-opacity"
            >
              {/* In production: use next/image */}
              <div
                className="w-full bg-gray-200"
                style={{ aspectRatio: `${photo.width}/${photo.height}` }}
                title={photo.alt}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(gallery)/gallery/[id]/page.tsx
// Renders on: direct URL visit, page refresh, or if intercepting route doesn't exist
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ id: string }>;

// Only pre-built IDs are valid
export const dynamicParams = false;

const PHOTOS: Record<
  string,
  { alt: string; photographer: string; date: string }
> = {
  "photo-1": {
    alt: "Mountain sunset",
    photographer: "Alice",
    date: "2026-03-15",
  },
  "photo-2": { alt: "Ocean waves", photographer: "Bob", date: "2026-04-02" },
  "photo-3": { alt: "Forest trail", photographer: "Carol", date: "2026-04-20" },
  "photo-4": {
    alt: "City at night",
    photographer: "David",
    date: "2026-05-01",
  },
};

export function generateStaticParams() {
  return Object.keys(PHOTOS).map((id) => ({ id }));
}

export default async function PhotoFullPage({ params }: { params: Params }) {
  const { id } = await params;
  const photo = PHOTOS[id];
  if (!photo) notFound();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Back link */}
      <div className="p-4">
        <Link
          href="/gallery"
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back to Gallery
        </Link>
      </div>

      {/* Full photo */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <div
            className="bg-gray-800 rounded-xl aspect-[4/3] flex items-center
                          justify-center text-gray-500"
          >
            {photo.alt} {/* In production: <Image> */}
          </div>
          <div className="mt-4 flex items-start justify-between">
            <div>
              <h1 className="text-white font-semibold">{photo.alt}</h1>
              <p className="text-gray-400 text-sm">by {photo.photographer}</p>
            </div>
            <time className="text-gray-500 text-sm">{photo.date}</time>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(gallery)/@modal/(.)gallery/[id]/page.tsx
// Renders as MODAL when navigated from the gallery via <Link>
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reuse the same photo data
const PHOTOS: Record<string, { alt: string; photographer: string }> = {
  "photo-1": { alt: "Mountain sunset", photographer: "Alice" },
  "photo-2": { alt: "Ocean waves", photographer: "Bob" },
  "photo-3": { alt: "Forest trail", photographer: "Carol" },
  "photo-4": { alt: "City at night", photographer: "David" },
};

export default function PhotoModal({ params }: { params: { id: string } }) {
  const router = useRouter();
  const photo = PHOTOS[params.id];

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  if (!photo) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={() => router.back()} // ← click backdrop = close modal
    >
      {/* Modal content — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-gray-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo placeholder */}
        <div
          className="bg-gray-800 aspect-[4/3] flex items-center
                        justify-center text-gray-500"
        >
          {photo.alt} {/* In production: <Image> */}
        </div>

        {/* Photo info */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">{photo.alt}</h2>
            <p className="text-gray-400 text-sm">by {photo.photographer}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

```
Final behavior summary:

User visits /gallery directly:
  → GalleryPage renders (photo grid)
  → @modal renders default.tsx (null — no modal)

User clicks a photo in the gallery:
  → URL changes to /gallery/photo-2
  → GalleryPage stays mounted (layout persists)
  → @modal/(.)gallery/[id]/page.tsx renders as overlay (modal)
  → User sees gallery + modal combined

User refreshes at /gallery/photo-2:
  → gallery/[id]/page.tsx renders (full-page standalone view)
  → No modal (intercepting route only applies to client navigation)

User visits /gallery/new:
  → gallery/new/page.tsx renders (upload form)
  → Static segment wins over [id] ✅

User visits /gallery/invalid-id:
  → dynamicParams = false → 404 ✅
```

---

## ✅ Day 4 Complete — Dynamic Routing and Route Design

| #   | Subtopic                                                      | Status |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Dynamic Segments — `[param]` Deep Dive                        | ☐      |
| 2   | Catch-All Routes — `[...slug]`                                | ☐      |
| 3   | Optional Catch-All Routes — `[[...slug]]`                     | ☐      |
| 4   | Route Groups — `(group)` Organization and Layout Isolation    | ☐      |
| 5   | Nested Segments — Depth, Inheritance, and Composition         | ☐      |
| 6   | `generateStaticParams` — Static Generation for Dynamic Routes | ☐      |
| 7   | Designing Blog Routes — Complete Route Architecture           | ☐      |
| 8   | Designing Dashboard Routes — Multi-Level Navigation           | ☐      |
| 9   | Multi-Section App Structures — Combining All Patterns         | ☐      |
| 10  | Route Conflicts, Priority, and Edge Cases                     | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 4

```
DYNAMIC SEGMENT TYPES
  [param]         → one variable value  (/products/:id)
  [...slug]       → 1+ values as array  (/docs/a/b/c) — base path = 404
  [[...slug]]     → 0+ values as array  (/docs AND /docs/a/b) — base path ✅
  (group)         → no URL segment, own layout.tsx
  @slot           → parallel route (no URL)
  (.)path         → intercepting route (modal pattern)

PRIORITY RULES (highest → lowest)
  1. Static segment       /blog/new
  2. Dynamic segment      /blog/[slug]
  3. Catch-all            /blog/[...slug]
  4. Optional catch-all   /blog/[[...slug]]
  Winner = most specific match at each URL level

ROUTE CONFLICTS (build errors)
  ❌ Same URL from two route groups
  ❌ page.tsx + route.ts in same folder
  ❌ [...slug] + [[...slug]] in same folder
  ❌ Two different [param] names at same level

ACCESSING PARAMS
  Server Component: type Params = Promise<{id:string}>; const {id} = await params
  Client Component: useParams<{id:string}>() from 'next/navigation'
  Catch-all server: type Params = Promise<{slug:string[]}>
  Catch-all client: normalize: [params.slug].flat().filter(Boolean)

generateStaticParams
  Returns array of param objects → pre-renders at next build
  dynamicParams = true (default) → unknown params render on-demand
  dynamicParams = false          → unknown params = 404
  Partial pre-render = generateStaticParams top N + ISR for rest
  Catch-all: { slug: ['a','b'] } not { slug: 'a/b' }

ROUTE GROUP LAYOUT PATTERNS
  (public)      → top nav + footer      → no auth
  (auth)        → centered card         → no auth
  (onboarding)  → full-screen stepper   → user auth
  (app)         → sidebar               → user auth + entity layouts
  (admin)       → admin sidebar         → admin role
  (docs)        → sidebar + TOC         → no auth, [[...path]]

NESTING RULES
  layout.tsx at [entity] level → fetch entity ONCE, applies to all sub-routes
  All layout + page data fetches: PARALLEL (not sequential)
  Dedup identical fetches: import { cache } from 'react'; export const getFoo = cache(...)
  Max practical nesting: 3-4 levels before it becomes unwieldy

BLOG ROUTE DECISIONS
  /blog/[slug]              → posts by slug
  /blog/category/[cat]      → ALWAYS prefix with static segment
  /blog/tag/[tag]           → avoids conflicts with post slugs
  /blog/author/[username]   → same pattern
  /blog/feed.xml/route.ts   → RSS = route.ts returning raw XML

DASHBOARD ROUTE DECISIONS
  products/new/page.tsx     → BEFORE [productId] — static wins
  [productId]/layout.tsx    → fetch product once, sub-nav tabs
  settings/layout.tsx       → tab nav, persists across settings sub-routes
  (dashboard)/layout.tsx    → auth guard (ONE check protects ALL routes)

DEBUGGING CHECKLIST
  404 → does folder have page.tsx? Is it inside app/?
  Wrong page → check static/dynamic priority, check for route groups
  Params undefined → did you await params? Using correct hook?
  Build error → conflicting routes? page.tsx + route.ts conflict?
```

---

> **Your next action:** Open your Next.js project. Create `src/app/(dashboard)/layout.tsx` with a simple auth check that redirects to `/login` if no user. Then add `src/app/(dashboard)/dashboard/page.tsx`. You now have a protected route group in under 5 minutes.
>
> _Doing one small thing beats opening a feed._

**A:** In
