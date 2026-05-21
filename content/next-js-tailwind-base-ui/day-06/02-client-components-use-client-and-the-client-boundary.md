# 2 — Client Components — `'use client'` and the Client Boundary

---

## T — TL;DR

`'use client'` marks a component as a **Client Component** — it runs in the browser, can use React hooks and event handlers, and its JavaScript is bundled and sent to the client. It creates a boundary: this component and everything it imports below it is a Client Component.

---

## K — Key Concepts

### The `'use client'` Directive

```tsx
// The directive MUST be the first line of the file
"use client";

import { useState } from "react";

// Now this is a Client Component:
// ✅ Can use useState, useEffect, useContext
// ✅ Can attach event handlers (onClick, onChange)
// ✅ Can use browser APIs (window, document, localStorage)
// ✅ Runs in the browser
// ❌ Cannot be async (top-level async function)
// ❌ Cannot directly query the database
// ❌ Cannot access server-only secrets
```

### The Client Boundary — What It Means

```
'use client' creates a BOUNDARY in the component tree.

The component with 'use client' AND everything it IMPORTS
below it becomes client-side code.

src/app/
└── page.tsx (Server Component)
    └── Dashboard.tsx (Server Component)
        └── StatsChart.tsx  ← 'use client'
            ├── ChartLib.tsx          ← NOW Client Component (imported by StatsChart)
            └── ChartControls.tsx     ← NOW Client Component (imported by StatsChart)

StatsChart.tsx and EVERYTHING IT IMPORTS = Client Component
But: Dashboard.tsx above it remains a Server Component
```

### When You NEED `'use client'`

```
Rule: Add 'use client' ONLY when the component needs:
  1. React state        → useState, useReducer
  2. React effects      → useEffect, useLayoutEffect
  3. React context      → useContext (as consumer)
  4. Event handlers     → onClick, onChange, onSubmit
  5. Browser APIs       → window, document, navigator, localStorage
  6. Custom hooks       → any hook that uses the above
  7. Third-party libs   → libraries that use the above internally

Does NOT need 'use client':
  ❌ Components that just render JSX from props
  ❌ Components that fetch data (use async Server Component instead)
  ❌ Static layouts and templates
  ❌ Typography, icon, badge, avatar components
```

### Minimal Client Component Examples

```tsx
// src/components/ui/counter.tsx
"use client";

import { useState } from "react";

export function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setCount((c) => c - 1)}
        className="w-8 h-8 rounded-full border flex items-center justify-center
                   hover:bg-gray-100"
      >
        −
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">
        {count}
      </span>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="w-8 h-8 rounded-full border flex items-center justify-center
                   hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
```

```tsx
// src/components/ui/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Browser API — only available client-side
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

### Client Components CAN Receive Server Data as Props

```tsx
// src/app/products/page.tsx — Server Component
import { ProductSearch } from "./_components/product-search";
import { db } from "@/lib/db";

export default async function ProductsPage() {
  // Fetch on server
  const categories = await db.category.findMany();

  // Pass server data to Client Component as props
  // categories is serialized (JSON) and sent to client
  return (
    <div>
      <ProductSearch categories={categories} /> {/* Client Component */}
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-search.tsx
"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
}

export function ProductSearch({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="border rounded-lg px-3 py-2"
      />
      <div className="flex gap-2 mt-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="px-3 py-1 border rounded-full text-sm"
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Props Must Be Serializable

```tsx
// Props passed from Server Component to Client Component
// MUST be serializable (JSON-compatible)

// ✅ Serializable — safe to pass
<ClientComponent
  string="hello"
  number={42}
  boolean={true}
  array={[1, 2, 3]}
  object={{ id: '1', name: 'Mark' }}
  null={null}
  date="2026-05-19"   {/* ← strings, not Date objects */}
/>

// ❌ Not serializable — will error
<ClientComponent
  fn={() => {}}        {/* ← functions (unless 'use server' Server Action) */}
  date={new Date()}    {/* ← Date objects */}
  set={new Set()}      {/* ← Set, Map */}
  classInstance={new User()} {/* ← class instances */}
  symbol={Symbol()}    {/* ← Symbols */}
/>
```

---

## W — Why It Matters

- The `'use client'` boundary being a "door" rather than a tag on individual components is the key insight — once you open the door with `'use client'`, everything inside is client-side. This is why you place `'use client'` as deep as possible — it minimizes the client boundary.
- Props serialization constraint is a practical gotcha — you can't pass a `Date` object or a function (unless it's a Server Action) from a Server Component to a Client Component. This shapes how you design component APIs.
- Client Components still render on the server for the initial HTML (SSR) — `'use client'` doesn't mean "skip SSR." It means "this component needs the React client runtime for interactivity." The component runs server-side for initial HTML AND client-side for hydration.

---

## I — Interview Q&A

### Q1: What does `'use client'` actually do?

**A:** `'use client'` marks a module as a client boundary — the component in that file and everything it imports below it is treated as client-side code, bundled and sent to the browser. It doesn't prevent the component from running on the server during SSR — Client Components still render server-side for the initial HTML. What it enables is the React client runtime: hooks, state, effects, event handlers, and browser APIs. Think of it as "this component needs to be interactive and shipped to the browser."

### Q2: Where should you place `'use client'` in the component tree?

**A:** As deep (as far down the tree) as possible. The goal is to isolate interactivity to small leaf components — a `<LikeButton>` or a `<SearchInput>` — while keeping parent components as Server Components. A page with a server-rendered product list and a client-side search box should have `'use client'` only on the search box component, not on the page or the product list. This keeps the JS bundle small and maximizes the server-rendered HTML.

### Q3: Can Client Components receive data from Server Components?

**A:** Yes — through props. Server Components can fetch data and pass it as props to Client Components. The props are serialized to JSON and sent as part of the HTML payload. The constraint is that props must be serializable (strings, numbers, booleans, plain objects and arrays). Non-serializable values like `Date` objects, functions (except Server Actions), class instances, Sets, and Maps cannot be passed as props from Server to Client Components.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: `'use client'` not at the top of the file

```tsx
// Some comment
// Another comment
"use client"; // ← not the first line — Next.js may not recognize it
```

**Fix:** `'use client'` MUST be the absolute first line (before imports):

```tsx
"use client"; // ← first line, before any imports ✅

import { useState } from "react";
```

### ❌ Pitfall: Making a parent a Client Component when only a child needs it

```tsx
// ❌ Entire page becomes client-side because one button needs onClick
"use client";
export default function ProductsPage() {
  // This page fetches data, renders a list, AND has one button
  // Making the whole page 'use client' is wasteful
}
```

**Fix:** Extract the interactive part to its own file:

```tsx
// page.tsx — stays Server Component
import { AddToCartButton } from "./_components/add-to-cart-button";

export default async function ProductsPage() {
  const products = await db.product.findMany();
  return products.map((p) => (
    <div key={p.id}>
      <h3>{p.name}</h3>
      <AddToCartButton productId={p.id} /> {/* Only this is Client */}
    </div>
  ));
}
```

```tsx
// _components/add-to-cart-button.tsx
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  return <button onClick={() => addToCart(productId)}>Add to Cart</button>;
}
```

### ❌ Pitfall: Passing non-serializable props to Client Components

```tsx
// ❌ Date object — not serializable
<DatePicker defaultDate={new Date()} />

// ❌ Function — not serializable (unless Server Action)
<FilterList onFilter={(items) => items.filter(i => i.active)} />
```

**Fix:**

```tsx
// ✅ Pass ISO string instead of Date
<DatePicker defaultDate={new Date().toISOString()} />

// ✅ Define the function inside the Client Component
// OR pass a Server Action (marked with 'use server')
```

---

## K — Coding Challenge + Solution

### Challenge

Build a product page where:

1. `page.tsx` is a Server Component that fetches 4 products
2. A `ProductCard` Server Component renders each product's static info
3. An `AddToCartButton` Client Component handles the cart interaction
4. A `CartCount` Client Component shows a count (uses context or state)
5. `'use client'` appears in exactly 2 files — `AddToCartButton` and `CartCount`

### Solution

```tsx
// src/app/products/_components/add-to-cart-button.tsx
"use client"; // ← File 1 with 'use client'

import { useState } from "react";

export function AddToCartButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    setAdded(true);
    // In production: dispatch to cart context or call server action
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full py-2 text-sm font-medium rounded-lg transition-all ${
        added
          ? "bg-green-500 text-white"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {added ? "✓ Added!" : "Add to Cart"}
    </button>
  );
}
```

```tsx
// src/app/products/_components/cart-count.tsx
"use client"; // ← File 2 with 'use client'

import { useState, useEffect } from "react";

export function CartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("cart-count") ?? "0", 10);
    setCount(stored);
  }, []);

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5
                     bg-blue-600 text-white text-xs font-bold rounded-full"
    >
      {count}
    </span>
  );
}
```

```tsx
// src/app/products/_components/product-card.tsx
// ✅ Server Component — no 'use client' needed (no hooks/events)

import { AddToCartButton } from "./add-to-cart-button";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function ProductCard({ product }: { product: Product }) {
  // This is a Server Component that imports a Client Component — that's fine ✅
  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="aspect-square bg-gray-100 flex items-center
                      justify-center text-4xl"
      >
        🛍️
      </div>
      <div className="p-4">
        <p className="text-xs text-blue-600 font-medium mb-0.5">
          {product.category}
        </p>
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        <p className="text-lg font-bold text-gray-900 mb-3">${product.price}</p>
        {/* Client Component nested inside Server Component ✅ */}
        <AddToCartButton productId={product.id} productName={product.name} />
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx
// ✅ Server Component — fetches data directly, no 'use client'

import { ProductCard } from "./_components/product-card";
import { CartCount } from "./_components/cart-count";

// Simulated DB fetch
async function getProducts() {
  return [
    { id: "1", name: "Air Max 90", price: 120, category: "Shoes" },
    { id: "2", name: "Canvas Tote", price: 45, category: "Bags" },
    { id: "3", name: "Wool Cap", price: 35, category: "Accessories" },
    { id: "4", name: "Ultraboost 22", price: 180, category: "Shoes" },
  ];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Cart</span>
          <CartCount /> {/* Client Component — only this interactive piece */}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// 'use client' appears in exactly 2 files:
// → AddToCartButton (state + onClick)
// → CartCount (state + useEffect + localStorage)
// Everything else: Server Components ✅
```

---

---
