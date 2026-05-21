# 11 — Project Structure Overview — Putting It All Together

> Picking up from **Feature-Based vs Type-Based Structure**, continuing through **W, I, C, and K**.

---

## K — Key Concepts _(continued)_

### Feature-Based vs Type-Based Structure

```
TYPE-BASED (what we've shown above):
  src/
    components/
    hooks/
    services/
    types/
  → Simple, obvious, works well for small-medium apps (< 10 features)
  → Easy to onboard new developers — everyone knows where "components" are

FEATURE-BASED (scales better for large apps):
  src/
    features/
      products/
        components/
          product-card.tsx
          product-grid.tsx
        hooks/
          use-products.ts
        services/
          product-service.ts
        types/
          product.ts
        index.ts          ← public API of the feature
      cart/
        components/
        hooks/
        stores/
        types/
        index.ts
      auth/
        components/
        hooks/
        services/
        types/
        index.ts
    components/           ← truly shared (Button, Card, Input)
    lib/                  ← infrastructure (db, api, auth)
  → Scales to 20+ features / 50+ developers
  → All code for one feature is co-located — easy to find and delete

Recommendation:
  Start with type-based.
  Switch to feature-based when a single components/ folder exceeds 20 files
  OR when two developers keep editing the same files for different features.
```

### The Barrel File Pattern (`index.ts`)

```ts
// src/components/ui/index.ts — barrel file
// Collects all exports from a folder into one entry point

export { Button } from "./button";
export { Card } from "./card";
export { Input } from "./input";
export { Dialog } from "./dialog";
export { Badge } from "./badge";

// Import from the folder instead of individual files:
import { Button, Card, Input } from "@/components/ui";
// instead of:
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

> ⚠️ **Barrel file caveat:** Next.js and Turbopack can tree-shake correctly, but large barrel files in deeply nested imports can slow down HMR. Use barrels for `components/ui/` and `types/` — avoid them for `services/` or `lib/` where each file may have heavy dependencies.

### The `middleware.ts` Position

```
src/
├── middleware.ts      ← CORRECT position when using src/ directory
└── app/

# middleware.ts must be at the root of src/ (or project root without src/)
# It is NOT inside app/ — it intercepts requests before routing

# Common uses:
- Auth redirect: redirect /dashboard → /login if no session
- Locale detection: redirect /products → /en/products
- A/B testing: rewrite to different page variants
- Rate limiting on API routes
```

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Auth guard: protect dashboard routes
  const isProtected = pathname.startsWith("/dashboard");
  const token = request.cookies.get("auth-token")?.value;

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ─── Matcher: only run middleware on these paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    // Exclude static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### The `components/ui/` Pattern — shadcn/ui Convention

```
The industry standard in 2025/2026:

src/components/ui/     ← low-level, unstyled primitives
  button.tsx           ← wraps a <button> with Tailwind + variants
  card.tsx
  input.tsx
  label.tsx
  dialog.tsx           ← wraps Radix Dialog
  select.tsx           ← wraps Radix Select
  badge.tsx
  skeleton.tsx         ← loading skeleton shape

src/components/        ← composed feature components
  navbar.tsx           ← uses Button, Link from ui/
  product-card.tsx     ← uses Card, Badge from ui/
  auth-form.tsx        ← uses Input, Button, Label from ui/
```

Why this separation matters:

```tsx
// ❌ Without the layer separation:
// ProductCard needs a button — directly uses button styles
<button className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 ...">
  Add to Cart
</button>;
// → Button styles duplicated in 40 components → hard to update globally

// ✅ With ui/ layer:
// ProductCard uses the Button primitive
import { Button } from "@/components/ui/button";
<Button variant="primary" size="sm">
  Add to Cart
</Button>;
// → Update button styles in ONE file → all 40 usages updated
```

### Recommended File Naming in Practice

```
Page components (app/ special files):
  page.tsx, layout.tsx, loading.tsx, error.tsx  ← lowercase (Next.js convention)

Shared components:
  product-card.tsx        ← kebab-case file
  export function ProductCard() {}  ← PascalCase export

Hooks:
  use-cart.ts             ← kebab-case file
  export function useCart() {}  ← camelCase "use" prefix export

Services:
  product-service.ts      ← kebab-case
  export const productService = { ... }  ← camelCase export

Types:
  product.ts              ← kebab-case file
  export interface Product { ... }  ← PascalCase type

Stores:
  cart-store.ts           ← kebab-case
  export const useCartStore = create(...)  ← camelCase export

Utilities:
  utils.ts
  export function formatPrice() {}
  export function cn() {}
```

### Reading the Project at a Glance

```
When a new developer joins, they should be able to answer these in 60 seconds:

Q: Where is the home page?          → src/app/(marketing)/page.tsx
Q: Where are reusable buttons?      → src/components/ui/button.tsx
Q: Where does auth logic live?      → src/lib/auth.ts + src/middleware.ts
Q: Where are product API calls?     → src/services/product-service.ts
Q: Where are environment variables? → .env.local (see .env.example for keys)
Q: Where is global CSS?             → src/app/globals.css
Q: How do I run this locally?       → README.md → pnpm dev
Q: Where do I put a new page?       → src/app/(section)/new-page/page.tsx
Q: Where do I put a shared hook?    → src/hooks/use-thing.ts
Q: How is the API configured?       → src/lib/api.ts
```

---

## W — Why It Matters

- A consistent project structure is a **communication tool** — it tells the next developer exactly where to look without asking anyone. This is the difference between a project that's easy to contribute to and one that requires a 2-hour onboarding call.
- The `_components/` co-location pattern (underscore prefix = private, next to the route that owns it) reduces the cognitive overhead of deciding "is this shared or specific?" — if it's only used in one route, it lives next to that route.
- Route groups `(marketing)`, `(store)`, `(dashboard)` solve the "one app, three layouts" problem without polluting the URL — essential for any app with distinct sections for different user types.
- The decision guide ("where does X go?") eliminates daily friction — developers stop making one-off decisions and start following a rule. This is what makes a codebase scale.

---

## I — Interview Q&A

### Q1: How do you decide whether a component goes in `app/route/_components/` vs `src/components/`?

**A:** The rule is reuse. If a component is used only by one route, co-locate it next to that route in `_components/` — the underscore prefix marks it as private and the router ignores it. If two or more routes use the same component, or if it's clearly a general-purpose UI primitive (Button, Card, Input), it belongs in `src/components/`. Co-location keeps related code together and makes it obvious what can be safely deleted when a route is removed.

### Q2: What is the purpose of `src/lib/` vs `src/services/` vs `src/hooks/`?

**A:** `lib/` contains infrastructure and external integrations — the Axios instance, database client, auth configuration, Zod schemas. These are low-level utilities that services and components depend on. `services/` contains API layer functions that call HTTP endpoints, organized by resource (`productService.list()`, `orderService.create()`). `hooks/` contains custom React hooks for client-side behavior — they wrap browser APIs, state, and services into reusable React primitives. The separation means each layer has a single responsibility: lib = infrastructure, services = HTTP, hooks = React state.

### Q3: Walk me through where you'd put each of these: a reusable Modal component, a `useDebounce` hook, a function to format currency, and an API call to create an order.

**A:** Modal → `src/components/ui/modal.tsx` (it's a low-level UI primitive used across the app). `useDebounce` → `src/hooks/use-debounce.ts` (custom React hook, client-side behavior). `formatCurrency` → `src/lib/utils.ts` (pure utility function, no React or HTTP concerns). `createOrder` API call → `src/services/order-service.ts` (HTTP service function, part of the service layer from Day 4).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Everything in `src/app/` — using app/ as a dumping ground

```
src/app/
├── page.tsx
├── layout.tsx
├── Button.tsx           ← component sitting in app/ root
├── utils.ts             ← utility in app/
├── useCart.ts           ← hook in app/
└── products/
    ├── page.tsx
    └── ProductCard.tsx  ← component in route folder but not _components/
```

**Fix:** The `app/` directory is for **routing files only** (`page.tsx`, `layout.tsx`, etc.) and co-located private route components (`_components/`). Everything else goes in `src/components/`, `src/hooks/`, `src/lib/`:

```
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── products/
│       ├── page.tsx
│       └── _components/
│           └── product-card.tsx  ← private to this route
├── components/
│   └── ui/
│       └── button.tsx            ← shared component
├── hooks/
│   └── use-cart.ts               ← shared hook
└── lib/
    └── utils.ts                  ← shared utility
```

### ❌ Pitfall: Creating deeply nested `components/` subdirectories with no rule

```
src/components/
├── common/
│   └── shared/
│       └── reusable/
│           └── button/
│               └── index.tsx    ← 5 levels deep for a button
```

**Fix:** Maximum 2 levels of nesting in `components/`:

```
src/components/
├── ui/           ← level 1: primitives
│   └── button.tsx
├── layout/       ← level 1: layout components
│   └── navbar.tsx
└── product/      ← level 1: feature components
    └── product-card.tsx
```

### ❌ Pitfall: Mixing Server and Client Component concerns in `lib/`

```ts
// src/lib/utils.ts
'use client'                        // ← why is a utility file client-only?
import { useState } from 'react'

export function cn(...) {}          // pure utility — doesn't need useState
export function useToggle() {}      // hook — belongs in hooks/, not lib/
```

**Fix:** Keep `lib/` free of React hooks and browser APIs — it should be importable in both Server and Client Components:

```ts
// src/lib/utils.ts — pure, no React, works everywhere
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// src/hooks/use-toggle.ts — React hook, belongs in hooks/
("use client");
import { useState } from "react";
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;
}
```

### ❌ Pitfall: No `index.ts` barrel for `types/` — importing from deeply nested type files everywhere

```ts
// Repeated in 20 files:
import type { Product } from "@/types/product";
import type { User } from "@/types/user";
import type { Order } from "@/types/order";
import type { ApiError } from "@/types/api";
```

**Fix:** Create a barrel `src/types/index.ts`:

```ts
// src/types/index.ts
export type { Product, ProductVariant } from "./product";
export type { User, UserProfile } from "./user";
export type { Order, OrderItem } from "./order";
export type { ApiError, ApiErrorDetail } from "./api";

// Now import from one place:
import type { Product, User, Order } from "@/types";
```

---

## K — Coding Challenge + Solution

### Challenge

You've inherited a Next.js 16 project with this flat, unorganized structure. Reorganize it into the recommended structure from this subtopic:

```
my-shop/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── ProductCard.tsx          ← component in app/
│   ├── AddToCartButton.tsx      ← component in app/
│   ├── useCart.ts               ← hook in app/
│   ├── formatPrice.ts           ← utility in app/
│   ├── api.ts                   ← axios instance in app/
│   ├── products/
│   │   ├── page.tsx
│   │   └── ProductGrid.tsx      ← component in route
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       └── checkout/
│           └── route.ts
├── types.ts                     ← all types in one root file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Requirements:**

1. Move all files to the correct `src/` locations
2. Apply the `_components/` convention for route-specific components
3. Separate the single `types.ts` into individual type files with a barrel
4. Update the `tsconfig.json` `paths` for the `src/` move
5. Show two example import statements before and after the refactor

### Solution

```
my-shop/                              ← after reorganization
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── _components/         ← route-private components
│   │   │       └── product-grid.tsx
│   │   ├── (dashboard)/             ← route group (add layout later)
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── checkout/
│   │           └── route.ts
│   │
│   ├── components/
│   │   └── product/
│   │       ├── product-card.tsx     ← was ProductCard.tsx in app/
│   │       └── add-to-cart-button.tsx  ← was AddToCartButton.tsx in app/
│   │
│   ├── hooks/
│   │   └── use-cart.ts              ← was useCart.ts in app/
│   │
│   ├── lib/
│   │   ├── api.ts                   ← was api.ts in app/
│   │   └── utils.ts                 ← was formatPrice.ts in app/
│   │
│   └── types/
│       ├── index.ts                 ← barrel file
│       ├── product.ts               ← split from types.ts
│       ├── cart.ts                  ← split from types.ts
│       └── api.ts                   ← split from types.ts
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

```json
// tsconfig.json — updated paths for src/
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string;
  inStock: boolean;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
}
```

```ts
// src/types/cart.ts
import type { Product } from "./product";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
```

```ts
// src/types/api.ts
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  status: number | null;
}
```

```ts
// src/types/index.ts — barrel export
export type { Product, ProductVariant } from "./product";
export type { CartItem, Cart } from "./cart";
export type { ApiError, ApiErrorDetail } from "./api";
```

```ts
// src/lib/utils.ts — renamed + expanded from formatPrice.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
```

```tsx
// ─── BEFORE refactor — messy imports ─────────────────────

// src/app/products/page.tsx (old)
import ProductCard from "../ProductCard";
import { useCart } from "../useCart";
import { formatPrice } from "../formatPrice";
import type { Product } from "../../types";

// src/app/page.tsx (old)
import AddToCartButton from "./AddToCartButton";
import ProductCard from "./ProductCard";
import type { Cart } from "../types";
```

```tsx
// ─── AFTER refactor — clean @/ alias imports ─────────────

// src/app/products/page.tsx (new)
import { ProductGrid } from "./_components/product-grid"; // ← co-located
import type { Product } from "@/types"; // ← clean barrel import

// src/app/page.tsx (new)
import { ProductCard } from "@/components/product/product-card";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import type { Cart, Product } from "@/types"; // ← single import

// src/hooks/use-cart.ts (new)
import { formatPrice } from "@/lib/utils"; // ← clear lib import
import type { Cart } from "@/types"; // ← barrel type import
```

---

## ✅ Day 1 Complete — Environment Setup & Mental Model

| #   | Subtopic                                             | Status |
| --- | ---------------------------------------------------- | ------ |
| 1   | `create-next-app` — Scaffolding the Project          | ☐      |
| 2   | TypeScript in Next.js 16                             | ☐      |
| 3   | ESLint — Configuration & Rules                       | ☐      |
| 4   | Tailwind CSS Integration                             | ☐      |
| 5   | App Router Mental Model                              | ☐      |
| 6   | The `app/` Directory — Structure & Conventions       | ☐      |
| 7   | The `src/` Directory — Why and When                  | ☐      |
| 8   | The `public/` Directory                              | ☐      |
| 9   | Top-Level Config Files                               | ☐      |
| 10  | Local Development Flow                               | ☐      |
| 11  | Project Structure Overview — Putting It All Together | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 1

```
SCAFFOLD
  npx create-next-app@latest --typescript --eslint --tailwind --src-dir --app --turbopack

CONFIG FILES (root level — don't touch without understanding)
  next.config.ts     ← framework behavior (images, redirects, headers, env)
  tsconfig.json      ← TypeScript (strict: true, moduleResolution: bundler, @/* alias)
  tailwind.config.ts ← Tailwind theme + content paths
  eslint.config.mjs  ← code quality rules (next/core-web-vitals + next/typescript)
  .env.local         ← secrets (git ignored — never commit)

ROUTING (file system = routes)
  src/app/page.tsx          → /
  src/app/about/page.tsx    → /about
  src/app/[id]/page.tsx     → /:id  (dynamic)
  src/app/(group)/          → route group (no URL impact)
  src/app/api/x/route.ts   → API endpoint

SPECIAL FILES (each has ONE job)
  page.tsx      → UI for a route
  layout.tsx    → persistent wrapper (survives navigation)
  loading.tsx   → automatic Suspense fallback
  error.tsx     → error boundary ('use client' required)
  not-found.tsx → 404 UI
  route.ts      → API handler (GET, POST, etc.)
  middleware.ts → runs before routing (auth, redirects)

COMPONENT TYPES
  Default           → Server Component (zero JS shipped, async/await allowed)
  'use client'      → Client Component (hooks, events, browser APIs)
  Rule: push 'use client' as far down the tree as possible

SOURCE STRUCTURE
  src/app/           ← routes only + _components/ for co-located private UI
  src/components/    ← shared UI (ui/ for primitives, feature/ for composed)
  src/lib/           ← infrastructure (db, api, auth, utils)
  src/hooks/         ← custom React hooks (client-side)
  src/services/      ← API service functions (HTTP layer)
  src/stores/        ← client state (Zustand, Jotai)
  src/types/         ← TypeScript types + barrel index.ts
  src/middleware.ts  ← edge middleware
  public/            ← static assets at root URL (not in src/)

DEV LOOP
  pnpm dev           → http://localhost:3000 (Turbopack, instant HMR)
  pnpm type-check    → TypeScript errors
  pnpm lint          → ESLint errors
  pnpm build         → production build
  rm -rf .next       → fix mysterious errors
```

---

> **Your next action:** Run `npx create-next-app@latest my-first-app --typescript --eslint --tailwind --src-dir --app --turbopack` right now. Open the project in VS Code. Spend 5 minutes just reading the generated file structure — match every file to what you just learned.
>
> _Doing one small thing beats opening a feed._

### The Complete Recommended Project Structure

```
my-app/
│
├── src/                              ← ALL application code
│   │
│   ├── app/                          ← Next.js App Router (routes + layouts)
│   │   ├── (marketing)/              ← route group: marketing layout
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              → /
│   │   │   ├── about/page.tsx        → /about
│   │   │   └── pricing/page.tsx      → /pricing
│   │   │
│   │   ├── (store)/                  ← route group: store layout
│   │   │   ├── layout.tsx
│   │   │   └── store/
│   │   │       ├── page.tsx          → /store
│   │   │       └── [category]/
│   │   │           ├── page.tsx      → /store/:category
│   │   │           ├── loading.tsx
│   │   │           ├── error.tsx
│   │   │           └── _components/  ← co-located, private
│   │   │               ├── CategoryHero.tsx
│   │   │               └── ProductGrid.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       └── orders/
│   │   │           ├── page.tsx
│   │   │           ├── loading.tsx
│   │   │           └── error.tsx
│   │   │
│   │   ├── api/                      ← API routes
│   │   │   ├── products/route.ts     → GET/POST /api/products
│   │   │   └── checkout/route.ts     → POST /api/checkout
│   │   │
│   │   ├── globals.css               ← Tailwind import + global styles
│   │   ├── layout.tsx                ← ROOT layout (required)
│   │   ├── not-found.tsx             ← global 404
│   │   ├── error.tsx                 ← global error boundary
│   │   ├── robots.ts                 ← dynamic robots.txt
│   │   └── sitemap.ts                ← dynamic sitemap.xml
│   │
│   ├── components/                   ← shared, reusable UI components
│   │   ├── ui/                       ← low-level primitives (shadcn/ui pattern)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── dialog.tsx
│   │   ├── layout/                   ← layout components
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── sidebar.tsx
│   │   └── product/                  ← feature-specific shared components
│   │       ├── product-card.tsx
│   │       └── product-image.tsx
│   │
│   ├── lib/                          ← utilities, API clients, external services
│   │   ├── api.ts                    ← Axios instance + interceptors (Day 4)
│   │   ├── db.ts                     ← database client (Prisma, Drizzle)
│   │   ├── auth.ts                   ← auth configuration (next-auth, clerk)
│   │   ├── utils.ts                  ← cn() + general utilities
│   │   └── validations.ts            ← Zod schemas
│   │
│   ├── hooks/                        ← custom React hooks (client-side)
│   │   ├── use-cart.ts
│   │   ├── use-auth.ts
│   │   └── use-local-storage.ts
│   │
│   ├── stores/                       ← client-side state (Zustand, Jotai)
│   │   ├── cart-store.ts
│   │   └── ui-store.ts
│   │
│   ├── services/                     ← API service functions (from Day 4)
│   │   ├── product-service.ts
│   │   ├── order-service.ts
│   │   └── user-service.ts
│   │
│   ├── types/                        ← TypeScript type definitions
│   │   ├── api.ts                    ← API request/response types
│   │   ├── product.ts
│   │   └── user.ts
│   │
│   └── middleware.ts                 ← Edge middleware (auth redirects)
│
├── public/                           ← static assets (NOT in src/)
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── manifest.json
│   └── images/
│       └── og-default.jpg
│
├── next.config.ts                    ← Next.js config
├── tailwind.config.ts                ← Tailwind config
├── tsconfig.json                     ← TypeScript config
├── eslint.config.mjs                 ← ESLint config
├── postcss.config.mjs                ← PostCSS config
├── package.json                      ← dependencies + scripts
├── .env.local                        ← local secrets (git ignored)
├── .env.example                      ← env template (committed)
├── .gitignore
└── README.md
```

### Decision Guide — Where Does X Go?

```
UI component used in one route only     → app/.../route/_components/
UI component used in 2+ routes         → src/components/feature/
Low-level UI primitive (button, input) → src/components/ui/
Data fetching function                  → src/services/ OR co-locate in app/route/
Database queries                        → src/lib/db.ts or src/lib/queries/
Shared TypeScript type                  → src/types/
Shared utility function                 → src/lib/utils.ts
Custom hook with browser APIs          → src/hooks/
Global state (Zustand/Jotai)           → src/stores/
API route handler                       → src/app/api/resource/route.ts
Edge middleware (auth, redirects)       → src/middleware.ts
Static file (favicon, robot.txt)       → public/
```

### The Naming Convention Standard

```
Files/folders:     kebab-case
  product-card.tsx  ✅
  ProductCard.tsx   ❌ (PascalCase for files is a React convention, not Next.js)

Components:        PascalCase
  export function ProductCard() {}  ✅

Hooks:             camelCase with "use" prefix
  useCart.ts, use-cart.ts  ← both acceptable (kebab for file, camelCase for export)

Types:             PascalCase
  interface ProductCardProps {}  ✅

Constants:         SCREAMING_SNAKE_CASE
  const MAX_PRODUCTS = 100  ✅

Utilities:         camelCase
  function formatPrice() {}  ✅
```

### Feature-Based vs Type-Based Structure

```
TYPE-BASED (what we've shown above):
  components/
  hooks/
  services/
  types/
  → Simple, works well for small-medium apps

FEATURE-BASED (scales better for large apps):
  features/
    products/
      components/
      hooks/
      services/
      types/
    cart/
      components
```
