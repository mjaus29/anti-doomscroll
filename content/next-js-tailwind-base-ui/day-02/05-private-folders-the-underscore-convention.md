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
