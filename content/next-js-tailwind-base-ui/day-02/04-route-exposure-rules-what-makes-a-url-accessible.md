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
