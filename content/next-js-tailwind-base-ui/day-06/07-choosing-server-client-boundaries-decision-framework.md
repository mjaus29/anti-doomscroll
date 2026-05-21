# 7 — Choosing Server-Client Boundaries — Decision Framework

---

## T — TL;DR

Every component decision comes down to one question: **"Does this component need to run in the browser?"** If the answer is no, keep it a Server Component. If yes — for state, events, or browser APIs — make it a Client Component, but place the boundary as deep as possible.

---

## K — Key Concepts

### The Decision Flowchart

```
Does the component need:
  → useState / useReducer?          → Client Component
  → useEffect / useLayoutEffect?    → Client Component
  → useContext (consuming)?         → Client Component
  → onClick / onChange / onSubmit?  → Client Component
  → window / document / navigator?  → Client Component
  → browser-only library?           → Client Component
  → Custom hook with any of above?  → Client Component

None of the above?
  → Does it fetch data?             → Server Component (async)
  → Does it render from props?      → Server Component (sync)
  → Does it access process.env secrets? → Server Component
  → Does it need the DB directly?   → Server Component

Rule of thumb: Default to Server. Opt into Client only when necessary.
```

### Boundary Placement — Go Leaf-Deep

```
❌ Bad — boundary too high (entire page is client-side):
  page.tsx ('use client')
  └── ProductList ('use client' via inheritance)
      └── ProductCard ('use client' via inheritance)
          └── AddToCartButton  ← only THIS needs 'use client'

✅ Good — boundary at the leaf:
  page.tsx (Server Component)
  └── ProductList (Server Component)
      └── ProductCard (Server Component)
          └── AddToCartButton ('use client') ← only this one
```

### Component Classification Examples

```
Server Component — these almost always stay server:
  ✅ Page layouts (page.tsx, layout.tsx)
  ✅ Data-fetching wrapper components
  ✅ Static navigation menus (no active state)
  ✅ Content components (blog post body, product description)
  ✅ Server-side error boundaries (not-found.tsx)
  ✅ SEO-related components (metadata, schema.org)
  ✅ Email template components

Client Component — these almost always need client:
  ✅ Form inputs (useState for controlled inputs)
  ✅ Modal/drawer open/close state
  ✅ Toggle switches, tabs, accordions
  ✅ Real-time data displays (WebSocket consumers)
  ✅ Drag and drop
  ✅ Video/audio players
  ✅ Third-party widgets (Stripe, Intercom, analytics)
  ✅ Global navigation with active-state detection

Could be either — look at the specific usage:
  ❓ Navigation bar — no active state = Server, active state = Client
  ❓ Product card — no interaction = Server, has favorite button = extract button as Client
  ❓ User avatar — static = Server, has dropdown menu = Client (or extract dropdown)
```

### The Extract Pattern — Minimize Client Surface

```tsx
// ❌ Don't make the whole card Client just for one button
"use client";
export function ProductCard({ product }) {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <img src={product.image} /> {/* doesn't need client */}
      <h3>{product.name}</h3> {/* doesn't need client */}
      <p>${product.price}</p> {/* doesn't need client */}
      <button onClick={() => setSaved((s) => !s)}>
        {" "}
        {/* ONLY this needs client */}
        {saved ? "♥ Saved" : "♡ Save"}
      </button>
    </div>
  );
}
```

```tsx
// ✅ Extract ONLY the interactive part
// product-card.tsx — Server Component
export function ProductCard({ product }) {
  return (
    <div>
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <SaveButton productId={product.id} /> {/* ← tiny Client Component */}
    </div>
  );
}

// save-button.tsx — Client Component (just the button)
("use client");
import { useState } from "react";
export function SaveButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button onClick={() => setSaved((s) => !s)}>
      {saved ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
```

### Decision Matrix — At a Glance

```
Component type              Server  Client  Notes
────────────────────────    ──────  ──────  ─────────────────────────
page.tsx                      ✅             Usually Server
layout.tsx                    ✅             Usually Server
Data fetching                 ✅             Always Server
Static content                ✅             Always Server
Form with validation          ✅     ✅      Action = Server, UI = Client
Table with sorting                   ✅     Sort state = Client
Table with server data        ✅             Data fetch = Server, table = Server
Active nav link                      ✅     usePathname needs client
Theme toggle                         ✅     localStorage = Client
Modal open/close state               ✅     useState = Client
Modal content                 ✅             Can be Server via children
Dropdown menu                        ✅     open/close state
Search input                         ✅     controlled input
Search results                ✅             data fetch from URL params
Auth state consumer                  ✅     useSession/useAuth = Client
Auth guard                    ✅             Server-side redirect
Error boundary                       ✅     error.tsx = Client
Loading skeleton              ✅             loading.tsx = Server (or either)
```

---

## W — Why It Matters

- The boundary placement decision directly controls your JavaScript bundle size — a poorly placed `'use client'` on a layout can make 20+ child components client-side unnecessarily, shipping hundreds of KB of extra JavaScript.
- The extract pattern (pull the interactive element into its own tiny file) is the most impactful refactoring you can do for performance — turning a client-side card component into a server-side card with a tiny client-side button.
- Knowing the matrix by heart means you make the right decision instantly during code reviews and architecture discussions, instead of defaulting to "add 'use client' everywhere."

---

## I — Interview Q&A

### Q1: How do you decide whether a component should be Server or Client?

**A:** Start with Server by default — every component is a Server Component unless it needs the React client runtime. Ask one question: "Does this component need to run in the browser?" If it needs `useState`, `useEffect`, event handlers, browser APIs, or client-only libraries — it needs `'use client'`. If it just renders JSX from props or fetches data — it stays a Server Component. The key optimization: if only a small part of a larger component needs interactivity, extract that part into a separate file with `'use client'`, keeping the parent as a Server Component.

### Q2: What happens to bundle size when you place `'use client'` too high in the tree?

**A:** Everything below a `'use client'` boundary — the component itself and everything it imports — gets bundled and sent to the browser. If you add `'use client'` to a layout component that contains 15 child components, all 15 become client-side code in the bundle, even if 12 of them never use any client features. The JavaScript bundle grows unnecessarily, increasing initial load time and worsening Core Web Vitals scores. The fix is to push the boundary as far down the tree as possible.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Defaulting to `'use client'` for all components

```tsx
// Developer adds 'use client' to avoid errors without thinking
"use client";
export function ProductDescription({ description }: { description: string }) {
  return <p className="text-gray-600">{description}</p>;
  // Zero hooks, zero events, zero browser APIs — completely unnecessary
}
```

**Fix:** Remove `'use client'` — this is a perfectly fine Server Component:

```tsx
// ✅ No directive needed
export function ProductDescription({ description }: { description: string }) {
  return <p className="text-gray-600">{description}</p>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Classify each component as Server or Client and write the minimal implementation:

1. `PageHeader` — shows page title from props, has no interaction
2. `NotificationBell` — shows a count badge, has a dropdown on click
3. `UserAvatar` — shows user initials from props, no interaction
4. `FilterBar` — manages active filter state with buttons
5. `ProductGrid` — fetches products from DB, renders a grid

### Solution

```tsx
// 1. PageHeader — Server Component (no interaction)
// ✅ No 'use client'
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
```

```tsx
// 2. NotificationBell — Client Component (dropdown open/close state)
"use client";
import { useState } from "react";

export function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative p-2">
        🔔
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500
                           text-white text-xs rounded-full flex items-center justify-center"
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-10 w-64 bg-white border rounded-xl
                        shadow-lg p-3 z-10"
        >
          <p className="text-sm text-gray-500">
            {count} notification{count !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
```

```tsx
// 3. UserAvatar — Server Component (no interaction)
// ✅ No 'use client'
export function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-500 flex items-center
                    justify-center text-white font-bold shrink-0`}
    >
      {name[0].toUpperCase()}
    </div>
  );
}
```

```tsx
// 4. FilterBar — Client Component (active filter state)
"use client";
import { useState } from "react";

const FILTERS = ["All", "Shoes", "Bags", "Accessories"];

export function FilterBar({ onFilter }: { onFilter?: (f: string) => void }) {
  const [active, setActive] = useState("All");

  function handleSelect(filter: string) {
    setActive(filter);
    onFilter?.(filter);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => handleSelect(f)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border
                      transition-colors ${
                        active === f
                          ? "bg-blue-600 text-white border-blue-600"
                          : "text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// 5. ProductGrid — Server Component (fetches data, no interactivity)
// ✅ No 'use client' — async Server Component
import { db } from "@/lib/db";

export async function ProductGrid() {
  const products = await db.product.findMany({ take: 8 });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <div key={p.id} className="border rounded-xl p-4">
          <h3 className="font-semibold text-sm">{p.name}</h3>
          <p className="text-blue-600 font-bold">${p.price}</p>
        </div>
      ))}
    </div>
  );
}
```

---

---
