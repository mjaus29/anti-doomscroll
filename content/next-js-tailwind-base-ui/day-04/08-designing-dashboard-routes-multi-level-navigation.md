# 8 — Designing Dashboard Routes — Multi-Level Navigation

---

## T — TL;DR

A dashboard route architecture combines auth-protected route groups, entity-scoped dynamic layouts, nested sub-navigation, and parallel data fetching. Done right, it gives users persistent, fast navigation across a deeply functional app.

---

## K — Key Concepts

### The Complete Dashboard Route Map

```
/dashboard                          → Overview/home
/dashboard/analytics                → Analytics
/dashboard/orders                   → Order list
/dashboard/orders/[orderId]         → Order detail
/dashboard/products                 → Product list
/dashboard/products/new             → Create product
/dashboard/products/[productId]     → Product detail
/dashboard/products/[productId]/edit → Edit product
/dashboard/customers                → Customer list
/dashboard/customers/[customerId]   → Customer profile
/dashboard/settings                 → Settings home
/dashboard/settings/profile         → Profile settings
/dashboard/settings/billing         → Billing settings
/dashboard/settings/team            → Team settings
```

### Full Directory Structure

```
src/app/
└── (dashboard)/
    ├── layout.tsx                             ← auth guard + sidebar
    └── dashboard/
        ├── page.tsx                           → /dashboard
        ├── analytics/
        │   └── page.tsx                       → /dashboard/analytics
        ├── orders/
        │   ├── page.tsx                       → /dashboard/orders
        │   ├── loading.tsx
        │   └── [orderId]/
        │       ├── page.tsx                   → /dashboard/orders/:orderId
        │       └── not-found.tsx
        ├── products/
        │   ├── page.tsx                       → /dashboard/products
        │   ├── new/
        │   │   └── page.tsx                   → /dashboard/products/new (STATIC first)
        │   └── [productId]/
        │       ├── layout.tsx                 ← fetch product for all product sub-routes
        │       ├── page.tsx                   → /dashboard/products/:productId
        │       ├── edit/
        │       │   └── page.tsx               → /dashboard/products/:productId/edit
        │       └── not-found.tsx
        ├── customers/
        │   ├── page.tsx                       → /dashboard/customers
        │   └── [customerId]/
        │       └── page.tsx                   → /dashboard/customers/:customerId
        └── settings/
            ├── layout.tsx                     ← settings sub-nav (tabs)
            ├── page.tsx                       → /dashboard/settings
            ├── profile/
            │   └── page.tsx                   → /dashboard/settings/profile
            ├── billing/
            │   └── page.tsx                   → /dashboard/settings/billing
            └── team/
                └── page.tsx                   → /dashboard/settings/team
```

### Dashboard Group Layout — Auth Guard + Sidebar

```tsx
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
  if (!user) redirect("/login?redirect=/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <DashboardSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

### Product Layout — Entity-Scoped Sub-Navigation

```tsx
// src/app/(dashboard)/dashboard/products/[productId]/layout.tsx
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ productId: string }>;

async function getProduct(id: string) {
  const products: Record<string, { name: string; status: string }> = {
    "prod-1": { name: "Air Max 90", status: "active" },
    "prod-2": { name: "Canvas Tote", status: "draft" },
  };
  return products[id] ?? null;
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  const tabs = [
    { label: "Overview", href: `/dashboard/products/${productId}` },
    { label: "Edit", href: `/dashboard/products/${productId}/edit` },
  ];

  return (
    <div>
      {/* Product header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                product.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {product.status}
            </span>
          </div>
          {/* Sub-navigation tabs */}
          <nav className="flex gap-4 mt-3">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="text-sm text-gray-500 hover:text-gray-900 pb-1
                           border-b-2 border-transparent hover:border-gray-300"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← All Products
        </Link>
      </div>
      {children}
    </div>
  );
}
```

### Settings Layout — Tabs Sub-Navigation

```tsx
// src/app/(dashboard)/dashboard/settings/layout.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s — Settings", default: "Settings" },
};

const SETTINGS_TABS = [
  { label: "General", href: "/dashboard/settings" },
  { label: "Profile", href: "/dashboard/settings/profile" },
  { label: "Billing", href: "/dashboard/settings/billing" },
  { label: "Team", href: "/dashboard/settings/team" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-600
                             hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- The `new/` static segment before `[productId]` is a critical routing decision — without it, `/dashboard/products/new` would match `[productId]` and attempt to load a product with id="new".
- The product-level `layout.tsx` at `[productId]` level enables tab navigation (Overview / Edit) while only fetching the product once — the layout persists as the user switches tabs.
- Settings using a nested layout with side-nav tabs is the industry-standard SaaS pattern — one layout file enables consistent navigation across all settings sub-pages.
- Auth guard in the outermost `(dashboard)/layout.tsx` is the correct architecture — a single server-side check protects all dashboard routes without per-page guards.

---

## I — Interview Q&A

### Q1: Why put `new/` before `[productId]` in the products directory?

**A:** Static segments take priority over dynamic segments in Next.js. If `[productId]` existed without `new/`, visiting `/dashboard/products/new` would try to render a product with id="new", query the database for it, find nothing, and show a 404 or error. By creating `products/new/page.tsx` as a static segment, Next.js routes `/dashboard/products/new` to the creation form — which is the intended behavior. The dynamic `[productId]` only matches non-"new" values.

### Q2: How do you share product data across both the product overview and edit pages?

**A:** Place a `layout.tsx` at the `[productId]` level — it fetches the product once and provides the entity header/sub-navigation. Both the overview page (`page.tsx`) and edit page (`edit/page.tsx`) are rendered as `children` inside this layout. The layout persists while the user switches between the two tabs — no redundant data fetching. For data sharing between layout and page, use React's `cache()` to deduplicate the fetch call.

### Q3: Where is the best place to put the authentication check for a dashboard?

**A:** In the outermost group layout — `src/app/(dashboard)/layout.tsx`. This is a Server Component that runs before any page renders. One auth check protects every route in the group. Middleware (`middleware.ts`) is the other valid location and runs even earlier (before the layout), making it ideal for redirecting unauthenticated users before any server work happens. The defense-in-depth pattern uses both: middleware for the fast redirect, layout for fetching the user object needed by the UI.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `new/` static segment — `/products/new` matches `[productId]`

```
src/app/(dashboard)/dashboard/products/
└── [productId]/
    └── page.tsx       → /dashboard/products/new → tries to load product id="new" → 404
```

**Fix:** Add the static segment first:

```
src/app/(dashboard)/dashboard/products/
├── new/
│   └── page.tsx       → /dashboard/products/new ✅ (static wins)
└── [productId]/
    └── page.tsx       → /dashboard/products/:id ✅ (dynamic fallback)
```

### ❌ Pitfall: Auth guard inside every page instead of the group layout

```tsx
// ❌ Repeated in every dashboard page
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← duplicated 20 times across pages
  // ...
}
```

**Fix:** One auth check in `(dashboard)/layout.tsx` covers all pages:

```tsx
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // ← runs once, protects all dashboard routes
  return <>{children}</>;
}
```

### ❌ Pitfall: Fetching product in both `[productId]/layout.tsx` AND `[productId]/page.tsx`

```tsx
// layout.tsx
const product = await getProduct(productId);

// page.tsx (same segment)
const product = await getProduct(productId); // ← duplicate DB call
```

**Fix:** Wrap the DB call in React's `cache()` so it deduplicates within a request:

```ts
// src/lib/queries.ts
import { cache } from "react";
import { db } from "@/lib/db";

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } });
});
// Called in layout + page → ONE database query total ✅
```

### ❌ Pitfall: Settings layout adding `<html>` and `<body>` tags

```tsx
// src/app/(dashboard)/dashboard/settings/layout.tsx
export default function SettingsLayout({ children }) {
  return (
    <html>
      {" "}
      // ← WRONG — only root layout has these
      <body>{children}</body>
    </html>
  );
}
```

**Fix:** Nested layouts return only their wrapper elements:

```tsx
export default function SettingsLayout({ children }) {
  return (
    <div className="max-w-3xl">
      {" "}
      // ← just the section wrapper
      <h1>Settings</h1>
      {children}
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build the `/dashboard/orders/[orderId]` route with:

1. A group layout (`(dashboard)/layout.tsx`) that checks auth and shows a sidebar
2. An orders list page (`/dashboard/orders`) showing 3 hardcoded orders
3. An order detail page (`/dashboard/orders/[orderId]`) with full typed params
4. A `not-found.tsx` specific to the orders section
5. `generateMetadata` using the order number
6. A back link that returns to the orders list

### Solution

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

// Mock auth
async function getCurrentUser() {
  return { id: "user-1", name: "Mark", role: "admin" };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const NAV = [
    { label: "Overview", href: "/dashboard" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Products", href: "/dashboard/products" },
    { label: "Customers", href: "/dashboard/customers" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-700">
          <span className="font-bold text-lg">Dashboard</span>
          <p className="text-xs text-gray-400 mt-0.5">{user.name}</p>
        </div>
        <nav className="p-3 flex-1 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-400
                         hover:text-white hover:bg-gray-800 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Orders" };

const ORDERS = [
  {
    id: "ord-001",
    number: 1042,
    customer: "Alice Johnson",
    total: 249.0,
    status: "delivered",
    date: "2026-05-10",
  },
  {
    id: "ord-002",
    number: 1043,
    customer: "Bob Smith",
    total: 89.99,
    status: "pending",
    date: "2026-05-15",
  },
  {
    id: "ord-003",
    number: 1044,
    customer: "Carol White",
    total: 420.5,
    status: "shipped",
    date: "2026-05-18",
  },
];

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  shipped: "bg-blue-100 text-blue-700",
};

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Order", "Customer", "Total", "Status", "Date", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ORDERS.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">#{order.number}</td>
                <td className="px-4 py-3 text-gray-600">{order.customer}</td>
                <td className="px-4 py-3 font-medium">
                  ${order.total.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{order.date}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/[orderId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ orderId: string }>;

const ORDERS: Record<
  string,
  {
    number: number;
    customer: string;
    email: string;
    total: number;
    status: string;
    date: string;
    items: { name: string; qty: number; price: number }[];
  }
> = {
  "ord-001": {
    number: 1042,
    customer: "Alice Johnson",
    email: "alice@example.com",
    total: 249.0,
    status: "delivered",
    date: "2026-05-10",
    items: [
      { name: "Air Max 90", qty: 1, price: 120.0 },
      { name: "Canvas Tote", qty: 1, price: 45.0 },
      { name: "Wool Cap", qty: 2, price: 35.0 },
    ],
  },
  "ord-002": {
    number: 1043,
    customer: "Bob Smith",
    email: "bob@example.com",
    total: 89.99,
    status: "pending",
    date: "2026-05-15",
    items: [
      { name: "Leather Belt", qty: 1, price: 55.0 },
      { name: "Wool Cap", qty: 1, price: 35.0 },
    ],
  },
  "ord-003": {
    number: 1044,
    customer: "Carol White",
    email: "carol@example.com",
    total: 420.5,
    status: "shipped",
    date: "2026-05-18",
    items: [
      { name: "Ultraboost 22", qty: 1, price: 180.0 },
      { name: "Leather Bag", qty: 1, price: 220.0 },
      { name: "Wool Cap", qty: 1, price: 35.0 },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { orderId } = await params;
  const order = ORDERS[orderId];
  if (!order) return { title: "Order Not Found" };
  return {
    title: `Order #${order.number}`,
    description: `Order by ${order.customer} — $${order.total}`,
  };
}

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { orderId } = await params;
  const order = ORDERS[orderId];

  if (!order) notFound();

  const STATUS_STYLES: Record<string, string> = {
    delivered: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/orders"
        className="flex items-center gap-1 text-sm text-gray-500
                   hover:text-gray-900 mb-6 transition-colors"
      >
        ← Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.date}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[order.status]}`}
        >
          {order.status}
        </span>
      </div>

      {/* Customer info */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-700 uppercase tracking-wide">
          Customer
        </h2>
        <p className="font-medium">{order.customer}</p>
        <p className="text-sm text-gray-500">{order.email}</p>
      </div>

      {/* Order items */}
      <div className="bg-white border rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
            Items
          </h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.qty}</p>
              </div>
              <span className="font-medium text-sm">
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between px-5 py-3 border-t bg-gray-50">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-blue-600">
            ${order.total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/[orderId]/not-found.tsx
import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📦</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        This order doesn't exist or you don't have permission to view it.
      </p>
      <Link
        href="/dashboard/orders"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← Back to Orders
      </Link>
    </div>
  );
}
```

---

---
