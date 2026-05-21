# 8 — Data Fetching Patterns — Where Data Lives

---

## T — TL;DR

In the App Router, data fetching has a clear home: **fetch in the Server Component closest to where the data is needed**. This eliminates prop-drilling, avoids waterfalls, and keeps sensitive data on the server. The patterns — per-component fetch, parallel fetch, deduplication, mutations via Server Actions — cover every real-world case.

---

## K — Key Concepts

### Pattern 1 — Fetch Close to Usage (Colocated Fetching)

```tsx
// Instead of fetching everything in the root and drilling props down...

// ✅ Each component fetches what it needs
// src/app/dashboard/_components/order-summary.tsx
async function getOrderSummary() {
  return db.order.aggregate({
    _count: true,
    _sum: { total: true },
    where: { status: "pending" },
  });
}

export async function OrderSummary() {
  const summary = await getOrderSummary();
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-sm text-gray-500">Pending Orders</p>
      <p className="text-2xl font-bold">{summary._count}</p>
      <p className="text-sm text-gray-600">
        Total: ${summary._sum.total?.toFixed(2)}
      </p>
    </div>
  );
}
```

### Pattern 2 — Parallel Fetch with `Promise.all`

```tsx
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  // All three queries start simultaneously
  const [user, orders, notifications] = await Promise.all([
    getCurrentUser(),
    getRecentOrders(),
    getUnreadNotifications(),
  ]);

  return (
    <div>
      <WelcomeBanner user={user} />
      <OrderList orders={orders} />
      <NotificationList notifications={notifications} />
    </div>
  );
}
```

### Pattern 3 — Sequential Fetch (when needed)

```tsx
// Some data depends on previous data — sequential is correct here
export default async function UserOrdersPage({ params }) {
  const { userId } = await params;

  const user = await getUser(userId);
  if (!user) notFound();

  // Order query needs user.orgId — sequential dependency is valid
  const orders = await getOrders({ orgId: user.orgId });

  return <OrderList orders={orders} user={user} />;
}
```

### Pattern 4 — Server Action Mutations + Revalidation

```tsx
// src/app/products/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

export async function archiveProduct(id: string) {
  await db.product.update({
    where: { id },
    data: { status: "archived" },
  });

  // Invalidate all pages that show product data
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidateTag("products"); // clears all fetches tagged 'products'
}
```

### Pattern 5 — Fetch with Next.js Cache Control

```tsx
// src/app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const { slug } = await params;

  // ─── Revalidate on access every hour
  const post = await fetch(`${process.env.CMS_URL}/posts/${slug}`, {
    next: { revalidate: 3600 }, // ISR: re-fetch after 1 hour
  }).then((r) => r.json());

  // ─── Tag for on-demand revalidation
  const categories = await fetch(`${process.env.CMS_URL}/categories`, {
    next: { tags: ["categories"] }, // revalidate with revalidateTag('categories')
  }).then((r) => r.json());

  // ─── Always fresh (no cache)
  const liveInventory = await fetch(
    `${process.env.INVENTORY_URL}/stock/${slug}`,
    {
      cache: "no-store", // fresh on every request
    }
  ).then((r) => r.json());

  return <PostView post={post} categories={categories} stock={liveInventory} />;
}
```

### Pattern 6 — Client-Side Fetch (TanStack Query)

```tsx
// For data that needs to be:
// - frequently updated (real-time feel)
// - user-specific and re-fetched on demand
// - controlled with refetch, mutations, optimistic updates

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function LiveOrderStatus({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetch(`/api/orders/${orderId}`).then((r) => r.json()),
    refetchInterval: 5000, // poll every 5 seconds
  });

  const { mutate: cancelOrder, isPending } = useMutation({
    mutationFn: () =>
      fetch(`/api/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
  });

  if (isLoading)
    return <div className="animate-pulse h-12 bg-gray-100 rounded" />;

  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="font-semibold">Status: {order.status}</p>
      {order.status === "pending" && (
        <button
          onClick={() => cancelOrder()}
          disabled={isPending}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg"
        >
          {isPending ? "Cancelling..." : "Cancel Order"}
        </button>
      )}
    </div>
  );
}
```

### Where Data Lives — Summary Decision

```
Data type                           → Fetch where?
─────────────────────────────────   ────────────────────────────
Initial page content                → Server Component (async)
Secrets / DB access required        → Server Component (async)
Static or slow-changing data        → Server Component + ISR
User-specific on first load         → Server Component (from cookies/session)
Real-time / polled data             → Client Component (TanStack Query)
Optimistic update needed            → Client Component (TanStack Query)
After user action (mutation)        → Server Action + revalidatePath
Form submission                     → Server Action
External API with auth              → Server Component (headers stay server)
```

---

## W — Why It Matters

- Colocated data fetching eliminates prop drilling — a deeply nested component can fetch exactly what it needs without the parent having to fetch and pass it down through multiple levels.
- The choice between Server fetch (with `cache`) and Client fetch (with TanStack Query) is the most important data architecture decision — getting it wrong means either stale data or unnecessary JavaScript on the client.
- `revalidateTag` is the key to clean cache invalidation across multiple pages — tagging fetches and invalidating by tag is more maintainable than manually calling `revalidatePath` for every affected URL.

---

## I — Interview Q&A

### Q1: What is the difference between `cache: 'no-store'`, `next: { revalidate }`, and `next: { tags }`?

**A:** `cache: 'no-store'` bypasses all caching — every request fetches fresh data from the origin. Use for live inventory, real-time prices, or any data that must be current on every page load. `next: { revalidate: N }` enables ISR (Incremental Static Regeneration) — the response is cached and served for N seconds, then re-fetched in the background. Use for blog posts, product details, and data that changes infrequently. `next: { tags: ['tag'] }` tags the cached response — calling `revalidateTag('tag')` from a Server Action purges that cache on demand. Use when you want to invalidate data immediately after a mutation, regardless of the revalidation interval.

### Q2: When should you use TanStack Query instead of Server Component data fetching?

**A:** Use TanStack Query (client-side fetching) for data that needs to be: refreshed automatically (polling with `refetchInterval`), updated optimistically (show the change before the server confirms), mutated with complex state (loading, error, retries), or shared across many client components via the query cache. Use Server Component fetching for: initial page data, data that doesn't need to be interactive, content that should be in the initial HTML for SEO, and anything involving secrets or direct DB access. Most apps use both: Server Components for initial load, TanStack Query for interactive updates.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Fetching in `useEffect` for data that should be server-fetched

```tsx
// ❌ Entire component is Client just to fetch initial data
"use client";
export default function ProductPage({ params }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading)
    return <div className="animate-pulse h-48 bg-gray-100 rounded" />;
  return <ProductView product={product} />;
}
// Problems:
//   → Requires a separate /api/products/[id] route
//   → Ships JS to browser for what is pure data display
//   → Content missing from initial HTML (bad SEO)
//   → Two round-trips: page load → JS → fetch → render
//   → Loading state needed for every visit (even cached pages)
```

**Fix:** Use an async Server Component — zero client JS, content in initial HTML:

```tsx
// ✅ Server Component — no 'use client', no useEffect, no API route needed
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) notFound();

  return <ProductView product={product} />;
  // ✅ Data in initial HTML (SEO-ready)
  // ✅ Zero client JS for this component
  // ✅ No API route needed
  // ✅ No loading state flash
}
```

### ❌ Pitfall: Prop-drilling server data through multiple levels

```tsx
// ❌ Root fetches everything and drills it down 4 levels
export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <DashboardLayout user={user} />;
}

function DashboardLayout({ user }) {
  return <DashboardContent user={user} />;
}

function DashboardContent({ user }) {
  return <UserGreeting user={user} />;
}

function UserGreeting({ user }) {
  return <h2>Hello, {user.name}</h2>;
  // user.name is the ONLY thing needed — but it was fetched 4 levels up
}
```

**Fix:** Use `React.cache()` and fetch at the component that needs it:

```tsx
// src/lib/queries.ts
import { cache } from "react";
export const getCurrentUser = cache(async () => {
  return db.user.findFirst({ where: { session: await getSession() } });
});

// UserGreeting fetches its own data — no prop needed
export async function UserGreeting() {
  const user = await getCurrentUser(); // ← cache hit if called elsewhere
  return <h2>Hello, {user?.name}</h2>;
}

// DashboardPage doesn't need to pass user down at all
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <UserGreeting /> {/* fetches its own user data */}
    </DashboardLayout>
  );
}
```

### ❌ Pitfall: Not tagging fetches that need on-demand revalidation

```tsx
// ❌ Blog post cached with revalidate: 3600 (1 hour)
// Editor publishes an update → visitors see stale post for up to 1 hour
const post = await fetch(`${CMS_URL}/posts/${slug}`, {
  next: { revalidate: 3600 }, // no tag — can't invalidate on demand
});
```

**Fix:** Add a tag so you can invalidate immediately from a Server Action:

```tsx
// ✅ Tagged fetch
const post = await fetch(`${CMS_URL}/posts/${slug}`, {
  next: {
    revalidate: 3600,
    tags: [`post-${slug}`, "posts"], // ← add tags
  },
});

// ✅ Server Action called when editor publishes
export async function publishPost(slug: string) {
  "use server";
  await cms.publishPost(slug);
  revalidateTag(`post-${slug}`); // ← instant cache purge
}
```

### ❌ Pitfall: Using TanStack Query for data that never changes on the client

```tsx
// ❌ Fetching static product categories with TanStack Query
// Categories don't change — no need for client-side fetching
"use client";
export function CategoryList() {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });
  return (
    <ul>
      {data?.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
  // Ships TanStack Query JS + requires API route for data that never changes
}
```

**Fix:** Static/rarely-changing data belongs in a Server Component:

```tsx
// ✅ Server Component — no TanStack Query needed
export async function CategoryList() {
  const categories = await db.category.findMany();
  return (
    <ul>
      {categories.map((c) => (
        <li key={c.id}>{c.name}</li>
      ))}
    </ul>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/dashboard/customers` page demonstrating all four data patterns:

1. **Server fetch with `Promise.all`** — fetch customer list and summary stats in parallel
2. **`React.cache()` deduplication** — `getCustomerCount()` called in two places, hits DB once
3. **Server Action with `revalidateTag`** — archive a customer
4. **Client-side TanStack Query** — live activity ticker that polls every 10 seconds

### Solution

```tsx
// src/lib/customer-queries.ts
import { cache } from "react";

// Deduplicated — called in both CustomerSummary and CustomersPage
// Only hits the DB once per request
export const getCustomerCount = cache(async () => {
  // In production: await db.customer.count()
  return 248;
});

export async function getCustomers() {
  // In production: await db.customer.findMany(...)
  return [
    {
      id: "c1",
      name: "Alice Johnson",
      email: "alice@acme.com",
      plan: "pro",
      status: "active",
    },
    {
      id: "c2",
      name: "Bob Kim",
      email: "bob@beta.co",
      plan: "free",
      status: "active",
    },
    {
      id: "c3",
      name: "Carol Davis",
      email: "carol@cd.io",
      plan: "pro",
      status: "active",
    },
    {
      id: "c4",
      name: "David Park",
      email: "david@dp.dev",
      plan: "free",
      status: "inactive",
    },
  ];
}

export async function getCustomerStats() {
  const count = await getCustomerCount(); // ← cache() call #1
  return {
    total: count,
    pro: count > 0 ? Math.floor(count * 0.6) : 0,
    free: count > 0 ? Math.ceil(count * 0.4) : 0,
    newMonth: 12,
  };
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/actions.ts
"use server";

import { revalidateTag } from "next/cache";

export async function archiveCustomer(customerId: string): Promise<void> {
  // In production: await db.customer.update({ where: { id: customerId }, data: { status: 'archived' } })
  console.log("Archived customer:", customerId);

  // Invalidate all customer-related caches instantly
  revalidateTag("customers");
  revalidateTag(`customer-${customerId}`);
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/customer-summary.tsx
// Server Component — uses getCustomerCount (will be a cache hit)
import { getCustomerStats } from "@/lib/customer-queries";

export async function CustomerSummary() {
  const stats = await getCustomerStats(); // calls getCustomerCount() → cache hit #1

  const ITEMS = [
    { label: "Total", value: stats.total, color: "text-gray-900" },
    { label: "Pro", value: stats.pro, color: "text-blue-600" },
    { label: "Free", value: stats.free, color: "text-gray-600" },
    { label: "New (mo.)", value: stats.newMonth, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/customer-table.tsx
// Server Component — static table, archive button is Client Component
import { ArchiveButton } from "./archive-button";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
}

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const PLAN_STYLE: Record<string, string> = {
    pro: "bg-blue-100 text-blue-700",
    free: "bg-gray-100 text-gray-600",
  };
  const STATUS_STYLE: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {["Name", "Email", "Plan", "Status", ""].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold
                                     text-gray-500 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
              <td className="px-4 py-3 text-gray-500">{c.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium
                                  ${PLAN_STYLE[c.plan]}`}
                >
                  {c.plan}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium
                                  ${STATUS_STYLE[c.status]}`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {/* Tiny Client Component — only the button is interactive */}
                <ArchiveButton customerId={c.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/archive-button.tsx
"use client";

import { useTransition } from "react";
import { archiveCustomer } from "../actions";

export function ArchiveButton({ customerId }: { customerId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => archiveCustomer(customerId))}
      disabled={isPending}
      className="px-3 py-1 text-xs font-medium text-gray-500 border
                 rounded-lg hover:bg-gray-100 disabled:opacity-40
                 transition-colors"
    >
      {isPending ? "..." : "Archive"}
    </button>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/_components/live-activity.tsx
// Client Component — polls for live activity every 10 seconds
"use client";

import { useQuery } from "@tanstack/react-query";

interface ActivityItem {
  id: number;
  event: string;
  time: string;
  type: "signup" | "upgrade" | "cancel" | "login";
}

async function fetchActivity(): Promise<ActivityItem[]> {
  // In production: fetch('/api/customers/activity')
  // Simulated response
  return [
    {
      id: Date.now(),
      event: "Alice viewed pricing page",
      time: "just now",
      type: "login",
    },
    {
      id: Date.now() - 1,
      event: "Bob upgraded to Pro",
      time: "1m ago",
      type: "upgrade",
    },
    {
      id: Date.now() - 2,
      event: "Carol signed up",
      time: "3m ago",
      type: "signup",
    },
    {
      id: Date.now() - 3,
      event: "David cancelled subscription",
      time: "7m ago",
      type: "cancel",
    },
  ];
}

const TYPE_ICON: Record<ActivityItem["type"], string> = {
  signup: "👤",
  upgrade: "⭐",
  cancel: "❌",
  login: "🔑",
};

export function LiveActivity() {
  const { data, isLoading, dataUpdatedAt } = useQuery<ActivityItem[]>({
    queryKey: ["customer-activity"],
    queryFn: fetchActivity,
    refetchInterval: 10_000, // ← poll every 10 seconds
    staleTime: 5_000,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900 text-sm">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">
            {lastUpdated ? `Updated ${lastUpdated}` : "Live"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-3 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {data?.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-base shrink-0" aria-hidden="true">
                {TYPE_ICON[item.type]}
              </span>
              <p className="text-sm text-gray-700 flex-1 truncate">
                {item.event}
              </p>
              <span className="text-xs text-gray-400 shrink-0">
                {item.time}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/customers/page.tsx
// Server Component — orchestrates all patterns
import type { Metadata } from "next";
import { Suspense } from "next";
import { getCustomers, getCustomerCount } from "@/lib/customer-queries";
import { CustomerSummary } from "./_components/customer-summary";
import { CustomerTable } from "./_components/customer-table";
import { LiveActivity } from "./_components/live-activity";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  // Pattern 2: Promise.all — customers + count in parallel
  const [customers, count] = await Promise.all([
    getCustomers(),
    getCustomerCount(), // ← cache() call #2 — same request as CustomerSummary's call
    //   React.cache() deduplicates → only ONE DB query total
  ]);

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count} total</p>
        </div>
      </div>

      {/* Pattern 1: Parallel fetch via Promise.all (stats + customers fetched together) */}
      {/* CustomerSummary also calls getCustomerCount() → React.cache() deduplicates */}
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <CustomerSummary />
      </Suspense>

      <div className="grid grid-cols-3 gap-6">
        {/* Pattern 1 result: server-fetched table (2/3 width) */}
        <div className="col-span-2">
          <CustomerTable customers={customers} />
        </div>

        {/* Pattern 4: Client-side TanStack Query for live activity (1/3 width) */}
        <LiveActivity />
      </div>
    </div>
  );
}

/*
  Data fetching breakdown for this page:
  ─────────────────────────────────────────────────────
  getCustomers()        → Server, parallel via Promise.all (~200ms)
  getCustomerCount()    → Server, parallel via Promise.all → React.cache()
  CustomerSummary       → calls getCustomerStats() → calls getCustomerCount()
                          getCustomerCount() = cache HIT → 0 extra DB queries
  LiveActivity          → Client, TanStack Query, polls every 10s
  archiveCustomer()     → Server Action → revalidateTag('customers')
  ─────────────────────────────────────────────────────
  Total DB queries for initial page render: 2 (customers + count — NOT 3)
  React.cache() saved 1 duplicate query ✅
*/
```

---

---
