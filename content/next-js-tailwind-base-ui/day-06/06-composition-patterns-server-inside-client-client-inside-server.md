# 6 — Composition Patterns — Server Inside Client, Client Inside Server

---

## T — TL;DR

Server and Client Components can be **composed together** — but only in specific ways. The key constraint: you can't import a Server Component inside a Client Component. Instead, pass Server Components as `children` or props. Understanding this pattern is what makes complex hybrid UIs possible.

---

## K — Key Concepts

### The Composition Rules

```
ALLOWED:
  Server Component → imports → Server Component    ✅
  Server Component → imports → Client Component    ✅
  Client Component → renders → children (Server)   ✅ (via props)
  Client Component → renders → slot props (Server)  ✅ (via props)

NOT ALLOWED:
  Client Component → imports → Server Component    ❌
  (The import crosses the client boundary — Server Component
   becomes a Client Component, losing server benefits)
```

### Why Client Can't Import Server

```tsx
// ❌ This doesn't work — importing a Server Component into a Client Component
"use client";
import { ServerDataTable } from "./server-data-table"; // ← Server Component

export function ClientWrapper() {
  const [filter, setFilter] = useState("");
  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ServerDataTable filter={filter} />{" "}
      {/* ← ERROR: can't import Server into Client */}
    </div>
  );
}

// Why? When Client Component boundary is established, everything
// imported INTO it must be client-compatible.
// Server Components can have async code, DB access — these don't work in the browser.
```

### The Fix — Pass as Props (children pattern)

```tsx
// ✅ Solution: parent Server Component passes Server Component as children

// src/app/products/page.tsx — Server Component (parent)
import { FilterWrapper } from "./_components/filter-wrapper"; // Client
import { ProductTable } from "./_components/product-table"; // Server

export default async function ProductsPage() {
  return (
    // FilterWrapper is a Client Component
    // ProductTable is a Server Component passed as children
    <FilterWrapper>
      <ProductTable /> {/* ← Server Component passed as children prop */}
    </FilterWrapper>
  );
}
```

```tsx
// src/app/products/_components/filter-wrapper.tsx
"use client";

import { useState } from "react";

export function FilterWrapper({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState("");

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter..."
        className="border rounded-lg px-3 py-2 mb-4 w-full"
      />
      {/* children (ProductTable) renders here — Server Component */}
      {children}
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-table.tsx
// Server Component — fetches its own data
import { db } from "@/lib/db";

export async function ProductTable() {
  const products = await db.product.findMany();
  return (
    <table>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>${p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### The Slot Pattern — Passing Multiple Server Components

```tsx
// Server Component — parent
import { Modal }       from './_components/modal'       // Client
import { ModalHeader } from './_components/modal-header' // Server
import { ModalBody }   from './_components/modal-body'   // Server

export default function ProductDetailPage({ product }) {
  return (
    <Modal
      header={<ModalHeader title={product.name} />}   {/* Server via prop */}
      body={<ModalBody product={product} />}           {/* Server via prop */}
    />
  )
}
```

```tsx
// _components/modal.tsx — Client Component
"use client";

import { useState } from "react";

interface ModalProps {
  header: React.ReactNode; // receives Server Component output
  body: React.ReactNode; // receives Server Component output
}

export function Modal({ header, body }: ModalProps) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          {header} {/* Server Component renders here */}
          <button onClick={() => setOpen(false)}>×</button>
        </div>
        {body} {/* Server Component renders here */}
      </div>
    </div>
  );
}
```

### Context Provider Pattern — Server → Client → Server

```tsx
// ThemeContext.tsx — Client Component (context must be client-side)
"use client";

import { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

```tsx
// src/app/layout.tsx — Server Component wraps Client Provider
import { ThemeProvider } from "@/components/theme-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* ThemeProvider is Client, but children (Server Components) pass through */}
        <ThemeProvider>
          {children}{" "}
          {/* ← Server Components can be children of Client Provider */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- The children-as-server-component pattern is the critical insight for mixing interactivity with server data — a client-side modal can contain server-rendered content by receiving it as `children`, not by importing the server component directly.
- Context providers MUST be Client Components (they use `createContext` and `useState`), but they can wrap Server Components via `children`. This is how global state (theme, auth, cart) is provided to the entire app while still allowing Server Components throughout the tree.
- The composition pattern is the key to building complex UIs like interactive data tables with server-fetched data, sidebars with filter state and server content, and modal dialogs with dynamic server-rendered body content.

---

## I — Interview Q&A

### Q1: Why can't a Client Component import a Server Component?

**A:** When a Client Component boundary is established with `'use client'`, everything imported into it must be bundleable as client-side JavaScript. Server Components may contain `async` functions with direct database access, server-only imports, and environment secrets — none of which can exist in the browser bundle. Importing a Server Component into a Client Component would either cause a build error or silently convert the Server Component to a Client Component (losing its server benefits). The solution is to pass Server Components as `children` or props from a Server Component parent.

### Q2: How do you pass Server Component output to a Client Component?

**A:** Through `children` or named slot props. A Server Component parent renders both the Client Component and the Server Component, passing the Server Component as `children` or a prop (like `header={<ServerHeader />}`). The Client Component receives and renders `React.ReactNode` — it doesn't need to know whether the content is from a Server or Client Component. The key is that the Server Component is rendered by the Server Component parent, not imported by the Client Component.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trying to import Server Component into Client Component

```tsx
"use client";
import { ServerDataTable } from "./server-data-table"; // ❌ Server Component
// Build error or ServerDataTable silently becomes client-side
```

**Fix:** Lift the composition to a Server Component parent:

```tsx
// Server Component parent — composes both
export default function Page() {
  return (
    <ClientWrapper>
      <ServerDataTable />{" "}
      {/* ← passed as children, not imported by ClientWrapper */}
    </ClientWrapper>
  );
}
```

### ❌ Pitfall: Putting context providers in Server Components

```tsx
// ❌ createContext requires client runtime
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
// Error: createContext is not available in Server Components
```

**Fix:** Wrap providers in a `'use client'` file:

```tsx
// src/app/_providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

```tsx
// src/app/layout.tsx — Server Component
import { Providers } from "./_providers";
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SearchableProductList>` where:

1. `page.tsx` (Server) fetches products and passes them to `SearchableProductList`
2. `SearchableProductList` (Client) manages a search input with state
3. `ProductCard` (Server Component) is passed as `children` to avoid importing it in the Client Component
4. The search filtering happens client-side using JavaScript

### Solution

```tsx
// src/app/products/_components/product-card-static.tsx
// Server Component — pure display, no interactivity
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function ProductCardStatic({ product }: { product: Product }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <p className="text-xs text-blue-600 font-medium mb-1">
        {product.category}
      </p>
      <h3 className="font-semibold text-gray-900">{product.name}</h3>
      <p className="text-lg font-bold text-gray-900 mt-1">${product.price}</p>
    </div>
  );
}
```

```tsx
// src/app/products/_components/searchable-list.tsx
"use client";

import { useState, useMemo } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Props {
  products: Product[];
  renderCard: (product: Product) => React.ReactNode; // ← receives render function from server
}

export function SearchableList({ products, renderCard }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      ),
    [products, query]
  );

  return (
    <div>
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full border rounded-xl px-4 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {filtered.length} of {products.length} products
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No products match "{query}"
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((product) => renderCard(product))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx — Server Component
import { SearchableList } from "./_components/searchable-list";
import { ProductCardStatic } from "./_components/product-card-static";

async function getProducts() {
  return [
    { id: "1", name: "Air Max 90", price: 120, category: "Shoes" },
    { id: "2", name: "Canvas Tote", price: 45, category: "Bags" },
    { id: "3", name: "Wool Cap", price: 35, category: "Accessories" },
    { id: "4", name: "Ultraboost 22", price: 180, category: "Shoes" },
    { id: "5", name: "Leather Belt", price: 55, category: "Accessories" },
    { id: "6", name: "Leather Bag", price: 220, category: "Bags" },
  ];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <SearchableList
        products={products}
        renderCard={(product) => (
          <ProductCardStatic key={product.id} product={product} />
        )}
      />
    </div>
  );
}
// SearchableList is Client (manages search state)
// ProductCardStatic is Server Component output passed via renderCard prop
// Client-side filtering uses the products array passed as prop ✅
```

---

---
