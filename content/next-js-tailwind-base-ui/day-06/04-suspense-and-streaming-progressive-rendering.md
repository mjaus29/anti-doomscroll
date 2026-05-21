# 4 — Suspense and Streaming — Progressive Rendering

---

## T — TL;DR

`<Suspense>` wraps async Server Components and shows a fallback while they fetch data. **Streaming** sends HTML in chunks as each Suspense boundary resolves — fast sections appear immediately, slow sections fill in progressively. Together they eliminate the "wait for everything" waterfall.

---

## K — Key Concepts

### The Streaming Model

```
Without Suspense (waterfall):
  Server waits for ALL data → sends complete HTML → browser renders

  t=0ms    → user sees nothing
  t=800ms  → slowest query resolves → full HTML sent → page renders
  t=800ms  → user sees complete page

With Suspense + Streaming (progressive):
  Server sends HTML shell immediately → streams content as each section resolves

  t=0ms    → user sees page shell + skeletons (loading.tsx + Suspense fallbacks)
  t=100ms  → fast section streams in (header, stats)
  t=400ms  → medium section streams in (orders table)
  t=800ms  → slow section streams in (activity feed)
  User sees SOMETHING at t=0ms and content progressively appears
```

### Suspense Inside a Page — Granular Streaming

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { StatsCards } from "./_components/stats-cards"; // fast: ~100ms
import { OrdersTable } from "./_components/orders-table"; // medium: ~400ms
import { ActivityFeed } from "./_components/activity-feed"; // slow: ~800ms

export default function DashboardPage() {
  // Note: page itself is NOT async — individual components are
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats: fast — shows in ~100ms */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Orders: medium — shows in ~400ms */}
      <Suspense fallback={<TableSkeleton rows={5} />}>
        <OrdersTable />
      </Suspense>

      {/* Activity: slow — shows in ~800ms */}
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-10 bg-gray-200 rounded" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />;
}
```

### Each Async Component Fetches Its Own Data

```tsx
// src/app/dashboard/_components/stats-cards.tsx
async function getStats() {
  await new Promise((r) => setTimeout(r, 100)); // fast query
  return { revenue: 78400, orders: 531, customers: 89 };
}

export async function StatsCards() {
  const stats = await getStats();
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Revenue</p>
        <p className="text-2xl font-bold">${stats.revenue.toLocaleString()}</p>
      </div>
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Orders</p>
        <p className="text-2xl font-bold">{stats.orders}</p>
      </div>
      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm text-gray-500">Customers</p>
        <p className="text-2xl font-bold">{stats.customers}</p>
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/activity-feed.tsx
async function getActivity() {
  await new Promise((r) => setTimeout(r, 800)); // slow query
  return [
    { id: 1, text: "New order #1044", time: "2m ago" },
    { id: 2, text: "User signup", time: "5m ago" },
  ];
}

export async function ActivityFeed() {
  const activity = await getActivity();
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold mb-3">Activity</h3>
      <ul className="space-y-2">
        {activity.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>{item.text}</span>
            <span className="text-gray-400">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Parallel vs Sequential Data Fetching

```tsx
// ❌ Sequential — each await blocks the next
export async function SlowPage() {
  const user = await getUser(); // 100ms
  const orders = await getOrders(); // 200ms  (waits for user)
  const products = await getProducts(); // 300ms  (waits for orders)
  // Total: 600ms (sequential waterfall)
}

// ✅ Parallel — all start simultaneously
export async function FastPage() {
  const [user, orders, products] = await Promise.all([
    getUser(), // starts at t=0
    getOrders(), // starts at t=0
    getProducts(), // starts at t=0
  ]);
  // Total: 300ms (max of all three)
}

// ✅ Even Better — independent Suspense boundaries
// Each section renders as soon as ITS data is ready
// No need to await all data in the parent
export function BestPage() {
  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserSection /> {/* fetches user independently */}
      </Suspense>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersSection /> {/* fetches orders independently */}
      </Suspense>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsSection /> {/* fetches products independently */}
      </Suspense>
    </>
  );
}
```

### `React.cache()` — Deduplicate Fetches Across Components

```tsx
// src/lib/queries.ts
import { cache } from "react";
import { db } from "@/lib/db";

// cache() deduplicates: if multiple components call getUser()
// in the same request, DB is only queried ONCE
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

export const getProduct = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } });
});
```

```tsx
// Now layout.tsx and page.tsx can both call getUser(userId)
// and it only hits the database once per request

// src/app/dashboard/layout.tsx
const user = await getUser(userId); // → DB query

// src/app/dashboard/page.tsx
const user = await getUser(userId); // → cache hit, no DB query
```

---

## W — Why It Matters

- Suspense + streaming transforms the user experience from "white screen until fully loaded" to "shell instantly, content progressively" — measurably better Time to First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
- Independent `<Suspense>` boundaries mean each section has its own loading state — a slow analytics section doesn't prevent the fast order count from appearing.
- `Promise.all` for parallel fetching inside a single component is a critical optimization — forgetting it is the most common cause of slow Server Component pages.
- `React.cache()` is essential for deduplication — without it, the same data might be fetched multiple times in one request (once in the layout, once in the page, once in a component).

---

## I — Interview Q&A

### Q1: How does Suspense enable streaming in Next.js?

**A:** Suspense marks sections of the page that can be deferred. When the server encounters a Suspense boundary wrapping an async component, it immediately renders the fallback (skeleton) and flushes that HTML to the browser. The server continues processing other parts of the page. When the async component's data resolves, React generates the HTML for that section and streams it to the browser as a separate chunk. The browser replaces the skeleton with the real content using a small inline script. The user sees the page shell immediately and content fills in progressively.

### Q2: What is the difference between using `Promise.all` and using multiple `<Suspense>` boundaries?

**A:** `Promise.all` parallelizes fetches within a single component — all requests start at the same time, and the component renders when ALL are complete. The component shows its loading state (from `loading.tsx` or a parent Suspense) until all fetches resolve. Multiple Suspense boundaries allow each section to render as soon as its OWN data is ready — fast sections appear early, slow sections later. Suspense gives progressive rendering; `Promise.all` gives parallel (but still blocking-until-all) loading. Best practice: use both — `Promise.all` for data that a single component truly needs together, Suspense for sections that can render independently.

### Q3: What is `React.cache()` and why is it needed?

**A:** `React.cache()` memoizes an async function's result per React render tree. Within a single server request, if multiple components call `getUser(userId)`, `React.cache()` ensures the database is only queried once — subsequent calls return the cached result. This is essential because Server Components have no global request context — each component that needs user data would otherwise independently query the database. `cache()` solves the N+1 problem for cross-component data sharing without prop drilling.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Sequential awaits in a Server Component

```tsx
// ❌ 600ms total (100 + 200 + 300) — each await blocks the next
export default async function Page() {
  const user = await getUser();
  const orders = await getOrders();
  const products = await getProducts();
}
```

**Fix:**

```tsx
// ✅ 300ms total — all start simultaneously
export default async function Page() {
  const [user, orders, products] = await Promise.all([
    getUser(),
    getOrders(),
    getProducts(),
  ]);
}
```

### ❌ Pitfall: Wrapping everything in one giant Suspense

```tsx
// ❌ One Suspense for the whole page
// User waits for the SLOWEST section before seeing ANYTHING
<Suspense fallback={<FullPageSkeleton />}>
  <FastSection /> {/* 100ms */}
  <SlowSection /> {/* 800ms */} {/* blocks FastSection from showing */}
</Suspense>
```

**Fix:** Independent boundaries per section:

```tsx
<Suspense fallback={<FastSkeleton />}>
  <FastSection />    {/* shows at 100ms */}
</Suspense>
<Suspense fallback={<SlowSkeleton />}>
  <SlowSection />    {/* shows at 800ms — doesn't block FastSection */}
</Suspense>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/app/[workspaceId]` overview page with:

1. Three independent async Server Components: `WorkspaceStats`, `RecentProjects`, `TeamActivity`
2. Each wrapped in its own `<Suspense>` with a matching skeleton
3. Stats fetches in 100ms, Projects in 400ms, Activity in 900ms
4. `getWorkspaceStats` and `getTeamActivity` both call `getWorkspace(id)` — use `React.cache()` to deduplicate

### Solution

```tsx
// src/lib/workspace-queries.ts
import { cache } from "react";

// Deduplicates getWorkspace calls within the same request
export const getWorkspace = cache(async (id: string) => {
  await new Promise((r) => setTimeout(r, 50));
  return { id, name: "Acme Corp", plan: "pro", memberCount: 12 };
});

export async function getWorkspaceStats(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId); // → cache hit if called elsewhere
  await new Promise((r) => setTimeout(r, 100));
  return {
    workspaceName: workspace.name,
    revenue: 48200,
    projects: 7,
    tasks: 43,
  };
}

export async function getRecentProjects(workspaceId: string) {
  await new Promise((r) => setTimeout(r, 400));
  return [
    { id: "p1", name: "Website Redesign", progress: 72, status: "active" },
    { id: "p2", name: "Mobile App v2", progress: 38, status: "active" },
    { id: "p3", name: "API Integration", progress: 55, status: "paused" },
  ];
}

export async function getTeamActivity(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId); // → cache hit (same request)
  await new Promise((r) => setTimeout(r, 900));
  return [
    {
      id: 1,
      user: "Alice",
      action: `Updated project in ${workspace.name}`,
      time: "3m ago",
    },
    { id: 2, user: "Bob", action: "Completed task #42", time: "18m ago" },
    { id: 3, user: "Carol", action: "Added comment on PR #7", time: "1h ago" },
  ];
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/workspace-stats.tsx
import { getWorkspaceStats } from "@/lib/workspace-queries";

export async function WorkspaceStats({ workspaceId }: { workspaceId: string }) {
  const stats = await getWorkspaceStats(workspaceId);
  const ITEMS = [
    { label: "Revenue", value: `$${stats.revenue.toLocaleString()}` },
    { label: "Projects", value: String(stats.projects) },
    { label: "Tasks", value: String(stats.tasks) },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {ITEMS.map((item) => (
        <div key={item.label} className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">{item.label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/recent-projects.tsx
import { getRecentProjects } from "@/lib/workspace-queries";

export async function RecentProjects({ workspaceId }: { workspaceId: string }) {
  const projects = await getRecentProjects(workspaceId);
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold">Recent Projects</h3>
      </div>
      <ul className="divide-y">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-5 py-3"
          >
            <span className="text-sm font-medium">{p.name}</span>
            <div className="flex items-center gap-3">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-7">{p.progress}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/_components/team-activity.tsx
import { getTeamActivity } from "@/lib/workspace-queries";

export async function TeamActivity({ workspaceId }: { workspaceId: string }) {
  const activity = await getTeamActivity(workspaceId);
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold">Team Activity</h3>
      </div>
      <ul className="divide-y">
        {activity.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3">
            <div
              className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                            justify-center text-xs font-bold text-blue-700 shrink-0"
            >
              {item.user[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">
                <strong>{item.user}</strong> {item.action}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/page.tsx
import { Suspense } from "react";
import { WorkspaceStats } from "./_components/workspace-stats";
import { RecentProjects } from "./_components/recent-projects";
import { TeamActivity } from "./_components/team-activity";

type Params = Promise<{ workspaceId: string }>;

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceId } = await params;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* Stats — streams in at ~150ms */}
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        }
      >
        <WorkspaceStats workspaceId={workspaceId} />
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        {/* Projects — streams in at ~450ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl h-48 animate-pulse" />
          }
        >
          <RecentProjects workspaceId={workspaceId} />
        </Suspense>

        {/* Activity — streams in at ~950ms */}
        <Suspense
          fallback={
            <div className="bg-white border rounded-xl h-48 animate-pulse" />
          }
        >
          <TeamActivity workspaceId={workspaceId} />
        </Suspense>
      </div>
    </div>
  );
}

// getWorkspace() called in BOTH WorkspaceStats and TeamActivity
// React.cache() ensures it hits the DB only ONCE ✅
```

---

---
