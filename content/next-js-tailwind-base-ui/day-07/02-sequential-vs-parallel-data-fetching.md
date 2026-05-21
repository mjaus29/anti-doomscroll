# 2 — Sequential vs Parallel Data Fetching

---

## T — TL;DR

**Sequential** fetches run one after another — each `await` blocks until the previous completes, creating a waterfall. **Parallel** fetches start simultaneously using `Promise.all` — total time equals the slowest, not the sum. Choosing correctly can reduce page load time by 60–80% on data-heavy pages.

---

## K — Key Concepts

### The Waterfall Problem — Sequential Fetching

```tsx
// ❌ Sequential — 100ms + 200ms + 300ms = 600ms total
export default async function DashboardPage() {
  const user = await getUser(); // starts at t=0,   done at t=100ms
  const orders = await getOrders(); // starts at t=100, done at t=300ms
  const products = await getProducts(); // starts at t=300, done at t=600ms
  // User waits 600ms for data that could load in 300ms
}

// Sequential is ONLY correct when data depends on the previous result:
export default async function OrderPage({ params }) {
  const user = await getUser(); // 100ms
  const orders = await getOrders({ userId: user.id }); // DEPENDS on user.id
  // This sequential pattern is CORRECT — order query needs user.id
}
```

### Parallel with `Promise.all`

```tsx
// ✅ Parallel — all start at t=0, done at max(100, 200, 300) = 300ms
export default async function DashboardPage() {
  const [user, orders, products] = await Promise.all([
    getUser(), // starts at t=0
    getOrders(), // starts at t=0
    getProducts(), // starts at t=0
  ]);
  // Total: 300ms (max) instead of 600ms (sum) — 50% faster
}
```

### `Promise.all` Error Behavior

```tsx
// ❌ Problem: if ANY promise rejects, Promise.all rejects entirely
const [user, orders, products] = await Promise.all([
  getUser(), // ✅ succeeds
  getOrders(), // ❌ throws — entire Promise.all fails
  getProducts(), // never used
]);

// Fix Option 1: use Promise.allSettled for independent optional data
const results = await Promise.allSettled([
  getUser(),
  getOrders(),
  getProducts(),
]);

const user = results[0].status === "fulfilled" ? results[0].value : null;
const orders = results[1].status === "fulfilled" ? results[1].value : [];
const products = results[2].status === "fulfilled" ? results[2].value : [];

// Fix Option 2: wrap individual fetches in try/catch
async function safeGetOrders() {
  try {
    return await getOrders();
  } catch {
    return [];
  } // graceful fallback
}

const [user, orders, products] = await Promise.all([
  getUser(),
  safeGetOrders(),
  getProducts(),
]);
```

### Parallel with Independent Suspense Boundaries

```tsx
// ✅ Best pattern: each component fetches its OWN data in parallel
// No need for Promise.all in the page — components are their own fetching units
// Each section streams in as soon as ITS data resolves

// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { StatsSection } from "./_components/stats-section"; // 100ms query
import { OrdersTable } from "./_components/orders-table"; // 300ms query
import { ActivityFeed } from "./_components/activity-feed"; // 500ms query

export default function DashboardPage() {
  // page.tsx is NOT async — no data fetching here
  // Each component handles its own data fetching independently
  return (
    <div className="space-y-6">
      {/* All three queries START simultaneously (parallel) */}
      {/* Each RENDERS as soon as its own data is ready (streaming) */}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection /> {/* renders at ~100ms */}
      </Suspense>

      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersTable /> {/* renders at ~300ms */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed /> {/* renders at ~500ms */}
      </Suspense>
    </div>
  );
}

// vs Promise.all in page:
// With Promise.all → page waits 500ms for ALL, then renders EVERYTHING at once
// With Suspense    → page renders progressively: 100ms, 300ms, 500ms
```

### Sequential When You Must — Minimize the Waterfall

```tsx
// When sequential is required, minimize the chain
export default async function UserOrdersPage({ params }) {
  const { userId } = await params;

  // Step 1: must be sequential — orders need userId
  const user = await getUser(userId); // 100ms
  if (!user) notFound();

  // Step 2: now parallelize everything that needs user
  const [orders, preferences, notifications] = await Promise.all([
    getOrders(user.id), // all start simultaneously
    getUserPreferences(user.id), // after the sequential getUser
    getNotifications(user.id), // after the sequential getUser
  ]);

  // Pattern: sequential chain → parallel fan-out
  // Total: 100ms (user) + max(orders, prefs, notifications)
  // vs: 100ms + orders + prefs + notifications (fully sequential)
}
```

### Initiating Fetches Early — "Waterfall Prevention" Pattern

```tsx
// Advanced: start fetches before awaiting them
export default async function ProductPage({ params }) {
  const { id } = await params;

  // Start ALL fetches immediately (don't await yet)
  const productPromise = getProduct(id); // starts at t=0
  const reviewsPromise = getReviews(id); // starts at t=0
  const relatedPromise = getRelatedProducts(); // starts at t=0

  // Now await only what you need for the initial render
  const product = await productPromise; // waits for product (100ms)
  if (!product) notFound();

  // reviews and related are already in-flight
  // pass promises to Suspense-wrapped components
  return (
    <div>
      <ProductDetail product={product} />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews reviewsPromise={reviewsPromise} /> {/* resolves ~200ms */}
      </Suspense>
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts relatedPromise={relatedPromise} />{" "}
        {/* resolves ~150ms */}
      </Suspense>
    </div>
  );
}
```

---

## W — Why It Matters

- Sequential fetching in a dashboard is the most common cause of unnecessarily slow pages — a page with three independent 200ms queries takes 600ms sequentially vs 200ms in parallel. The fix is one line: `Promise.all`.
- The independent Suspense pattern (each component fetches its own data) is even better than `Promise.all` because it combines parallelism with progressive rendering — fast sections appear early while slow ones continue loading.
- The "start fetches early before awaiting" pattern is important when you have a required sequential fetch followed by independent fetches — it prevents the sequential fetch from delaying the start of subsequent independent fetches.

---

## I — Interview Q&A

### Q1: When is sequential fetching correct vs a performance mistake?

**A:** Sequential fetching is correct when data truly depends on previous results — you need a user's `orgId` before fetching their org's data, so `getUser()` must complete before `getOrgData()` starts. It's a performance mistake when fetches are independent — user profile, recent orders, and notification count can all start at `t=0` since none depends on the others. The test: "does fetch B need any data from fetch A to construct its request?" If no, parallelize with `Promise.all`.

### Q2: What is the difference between `Promise.all` and independent Suspense boundaries for parallel data?

**A:** `Promise.all` in a page component parallelizes the fetches but blocks the entire page until all promises resolve — the page renders once, showing all sections simultaneously at the time of the slowest fetch. Independent Suspense boundaries also parallelize fetches (all components start fetching at the same time) but enable streaming — each section renders and streams to the browser as soon as its own data resolves. A 100ms section appears at 100ms instead of waiting for the 500ms section. Suspense gives both parallelism and progressive rendering; `Promise.all` gives only parallelism.

### Q3: How does `Promise.allSettled` differ from `Promise.all` and when should you use it?

**A:** `Promise.all` rejects as soon as any single promise rejects, discarding all other results. `Promise.allSettled` waits for all promises to settle (fulfill or reject) and returns an array of result objects with a `status` field (`'fulfilled'` or `'rejected'`). Use `Promise.allSettled` when fetches are independent and you want graceful degradation — if the notifications API fails, you still want to show the user's orders and profile. Use `Promise.all` when all data is required for the page to make sense, and a single failure should surface an error state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Sequential awaits for independent data in a loop

```tsx
// ❌ N sequential DB queries — O(N) time complexity
const orders = await db.order.findMany();
const enrichedOrders = [];
for (const order of orders) {
  const customer = await db.customer.findUnique({
    // ← N sequential queries!
    where: { id: order.customerId },
  });
  enrichedOrders.push({ ...order, customer });
}
// 10 orders = 10 sequential queries = 10 × query time
```

**Fix:** Use `Promise.all` or a JOIN:

```tsx
// ✅ Option A: Promise.all — all customer queries in parallel
const orders = await db.order.findMany();
const customers = await Promise.all(
  orders.map((o) => db.customer.findUnique({ where: { id: o.customerId } }))
);
const enriched = orders.map((o, i) => ({ ...o, customer: customers[i] }));

// ✅ Option B (best): JOIN query — one DB round trip
const enriched = await db.order.findMany({
  include: { customer: true }, // ← single JOIN, not N+1
});
```

### ❌ Pitfall: Awaiting a promise unnecessarily early

```tsx
// ❌ productPromise is awaited before relatedPromise even starts
const product = await getProduct(id); // ← blocks
const related = await getRelatedProducts(); // ← only starts after product finishes
```

**Fix:** Start both simultaneously:

```tsx
// ✅ Both start at t=0
const [product, related] = await Promise.all([
  getProduct(id),
  getRelatedProducts(),
]);
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/dashboard/overview` page that:

1. Has ONE required sequential fetch: `getWorkspace(id)` (needs params)
2. Then fans out to THREE parallel fetches: `getStats(workspaceId)`, `getRecentOrders(workspaceId)`, `getTeamMembers(workspaceId)`
3. Uses `Promise.allSettled` so partial failures degrade gracefully
4. Each section shows a fallback if its fetch failed
5. Uses independent Suspense boundaries for progressive streaming

### Solution

```tsx
// src/lib/overview-queries.ts
export async function getWorkspace(id: string) {
  await new Promise((r) => setTimeout(r, 80));
  if (id === "invalid") throw new Error("Workspace not found");
  return { id, name: "Acme Corp", plan: "pro" };
}

export async function getStats(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 150));
  return { revenue: 48200, orders: 312, members: 8, growth: "+14%" };
}

export async function getRecentOrders(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 350));
  return [
    {
      id: "o1",
      number: 1044,
      customer: "Alice",
      total: 249,
      status: "delivered",
    },
    { id: "o2", number: 1045, customer: "Bob", total: 89, status: "pending" },
    {
      id: "o3",
      number: 1046,
      customer: "Carol",
      total: 420,
      status: "shipped",
    },
  ];
}

export async function getTeamMembers(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 200));
  return [
    { id: "u1", name: "Alice Chen", role: "Admin" },
    { id: "u2", name: "Bob Kim", role: "Developer" },
    { id: "u3", name: "Carol Davis", role: "Designer" },
  ];
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/stats-grid.tsx
interface Stats {
  revenue: number;
  orders: number;
  members: number;
  growth: string;
}

export function StatsGrid({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm
                      text-red-700"
      >
        Failed to load stats.{" "}
        <a href="." className="underline">
          Refresh
        </a>
      </div>
    );
  }
  const ITEMS = [
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}` },
    { label: "Orders", value: String(stats.orders) },
    { label: "Members", value: String(stats.members) },
    { label: "Growth", value: stats.growth },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/orders-list.tsx
interface Order {
  id: string;
  number: number;
  customer: string;
  total: number;
  status: string;
}

export function OrdersList({ orders }: { orders: Order[] | null }) {
  if (!orders) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Could not load recent orders.
      </div>
    );
  }
  const STATUS: Record<string, string> = {
    delivered: "text-green-600 bg-green-50",
    pending: "text-yellow-600 bg-yellow-50",
    shipped: "text-blue-600 bg-blue-50",
  };
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Recent Orders</h3>
      </div>
      <ul className="divide-y">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div>
              <p className="text-sm font-medium">#{o.number}</p>
              <p className="text-xs text-gray-500">{o.customer}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium
                                ${STATUS[o.status]}`}
              >
                {o.status}
              </span>
              <span className="text-sm font-bold">${o.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/_components/team-list.tsx
interface Member {
  id: string;
  name: string;
  role: string;
}

export function TeamList({ members }: { members: Member[] | null }) {
  if (!members) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Could not load team members.
      </div>
    );
  }
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Team</h3>
      </div>
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <div
              className="w-8 h-8 rounded-full bg-blue-500 flex items-center
                            justify-center text-white text-xs font-bold shrink-0"
            >
              {m.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-gray-400">{m.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/overview/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getWorkspace,
  getStats,
  getRecentOrders,
  getTeamMembers,
} from "@/lib/overview-queries";
import { StatsGrid } from "./_components/stats-grid";
import { OrdersList } from "./_components/orders-list";
import { TeamList } from "./_components/team-list";

export const metadata: Metadata = { title: "Overview" };

type Params = Promise<{ workspaceId: string }>;

export default async function OverviewPage({ params }: { params: Params }) {
  const { workspaceId } = await params;

  // Step 1 — SEQUENTIAL (required — everything depends on workspace)
  const workspace = await getWorkspace(workspaceId); // t=0 → t=80ms
  if (!workspace) notFound();

  // Step 2 — PARALLEL FAN-OUT (all independent, start simultaneously at t=80ms)
  // Promise.allSettled: graceful degradation if any fetch fails
  const [statsResult, ordersResult, teamResult] = await Promise.allSettled([
    getStats(workspaceId), // t=80ms → t=230ms
    getRecentOrders(workspaceId), // t=80ms → t=430ms
    getTeamMembers(workspaceId), // t=80ms → t=280ms
  ]);

  // Extract values with fallback to null on failure
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const orders =
    ordersResult.status === "fulfilled" ? ordersResult.value : null;
  const members = teamResult.status === "fulfilled" ? teamResult.value : null;

  // Total time: 80ms (workspace) + 350ms (slowest: orders) = ~430ms
  // Fully sequential would be: 80+150+350+200 = 780ms

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{workspace.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Plan: {workspace.plan} · Workspace: {workspaceId}
        </p>
      </div>

      {/* Stats — resolved at ~230ms after page load */}
      <Suspense
        fallback={
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <StatsGrid stats={stats} />
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        {/* Orders — resolved at ~430ms */}
        <Suspense
          fallback={
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <OrdersList orders={orders} />
        </Suspense>

        {/* Team — resolved at ~280ms */}
        <Suspense
          fallback={
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          }
        >
          <TeamList members={members} />
        </Suspense>
      </div>
    </div>
  );
}

/*
  Timing breakdown:
  ─────────────────────────────────────────────────────────
  t=0ms    getWorkspace() starts (SEQUENTIAL — required)
  t=80ms   workspace resolved → fan-out starts
  t=80ms   getStats(), getRecentOrders(), getTeamMembers() all start (PARALLEL)
  t=230ms  stats resolved → StatsGrid streams in ✅
  t=280ms  team resolved  → TeamList streams in ✅
  t=430ms  orders resolved → OrdersList streams in ✅
  Total:   430ms (vs 780ms fully sequential)
  Saving:  ~45% faster ✅

  Resilience: Promise.allSettled means stats/team/orders each
  degrade independently — one failure shows a red error card,
  others still show their data ✅
*/
```

---

---
