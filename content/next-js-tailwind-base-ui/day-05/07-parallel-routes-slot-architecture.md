# 7 — Parallel Routes — `@slot` Architecture

---

## T — TL;DR

Parallel routes render **multiple pages simultaneously inside one layout** using `@slot` folders. Each slot is a named prop in the layout, renders independently, and has its own loading/error states. Used for split-pane views, dashboards with independent sections, and the modal pattern.

---

## K — Key Concepts

### The Mental Model

```
Traditional layout:          Parallel routes layout:
  Layout                       Layout
  └── Page (one page)          ├── @children (default slot)
                               ├── @sidebar (independent)
                               └── @modal   (independent)

Each slot:
  → Has its own URL matching
  → Has its own loading.tsx and error.tsx
  → Loads independently (no waterfall)
  → Can be null (via default.tsx)
```

### File Structure

```
src/app/dashboard/
├── layout.tsx                    ← receives children, @sidebar, @modal
├── page.tsx                      → /dashboard (children slot)
│
├── @sidebar/
│   ├── default.tsx               ← shown when no sidebar content matches
│   └── page.tsx                  → renders in sidebar slot on /dashboard
│       (OR named sub-routes)
│
└── @modal/
    ├── default.tsx               ← null (no modal by default)
    └── (.)orders/
        └── [orderId]/
            └── page.tsx          ← modal content when navigating to an order
```

### Layout — Receiving All Slots

```tsx
// src/app/dashboard/layout.tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  sidebar,
  modal,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar slot */}
      <aside className="w-72 border-r bg-white overflow-auto shrink-0">
        {sidebar}
      </aside>

      {/* Main content — children slot */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Modal slot — null when default.tsx renders */}
      {modal}
    </div>
  );
}
```

### Each Slot Has Independent Loading and Error

```
src/app/dashboard/
├── @sidebar/
│   ├── default.tsx
│   ├── loading.tsx      ← sidebar-specific skeleton
│   ├── error.tsx        ← sidebar-specific error (won't affect main content)
│   └── page.tsx
│
├── @modal/
│   └── default.tsx
│
├── loading.tsx          ← children slot loading
└── error.tsx            ← children slot error
```

```tsx
// src/app/dashboard/@sidebar/loading.tsx
export default function SidebarLoading() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded-lg" />
      ))}
    </div>
  );
}
```

### Real Pattern — Analytics Dashboard with Independent Slots

```tsx
// src/app/dashboard/@kpis/page.tsx
async function getKpis() {
  await new Promise((r) => setTimeout(r, 300));
  return { revenue: 48200, orders: 312, customers: 89 };
}

export default async function KpisSlot() {
  const kpis = await getKpis();
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        KPIs
      </h3>
      <div className="space-y-3">
        {Object.entries(kpis).map(([key, val]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 capitalize">{key}</p>
            <p className="text-xl font-bold">{val.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/@activity/page.tsx
async function getActivity() {
  await new Promise((r) => setTimeout(r, 800)); // slower query
  return [
    { id: 1, event: "New order #1044", time: "2m ago" },
    { id: 2, event: "Product updated", time: "15m ago" },
    { id: 3, event: "Customer signup", time: "1h ago" },
  ];
}

export default async function ActivitySlot() {
  const activity = await getActivity();
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Activity
      </h3>
      <ul className="space-y-2">
        {activity.map((item) => (
          <li
            key={item.id}
            className="flex justify-between text-sm py-2 border-b"
          >
            <span className="text-gray-700">{item.event}</span>
            <span className="text-gray-400 text-xs">{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/dashboard/layout.tsx — four-slot dashboard
export default function DashboardLayout({
  children,
  kpis,
  activity,
  modal,
}: {
  children: React.ReactNode;
  kpis: React.ReactNode;
  activity: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* KPIs sidebar — loads in 300ms */}
      <aside className="w-56 border-r bg-white overflow-auto shrink-0">
        {kpis}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Activity feed — loads in 800ms */}
      <aside className="w-64 border-l bg-white overflow-auto shrink-0">
        {activity}
      </aside>

      {/* Modal overlay */}
      {modal}
    </div>
  );
}
```

---

## W — Why It Matters

- Parallel routes solve the "independent loading sections" problem — without them, a slow activity feed blocks everything on the page from rendering. With them, fast sections appear immediately and slow ones stream in later.
- Each slot having its own `error.tsx` means a failure in the activity feed doesn't crash the rest of the dashboard — isolated failures with individual recovery.
- The modal slot pattern (with intercepting routes) is how production apps like Vercel's dashboard implement "click a deployment → see details in a modal while list stays visible."

---

## I — Interview Q&A

### Q1: What is the main advantage of parallel routes over putting everything in a single page?

**A:** Independent rendering and loading. Each slot in a parallel route fetches data, loads, and handles errors independently. A slow section (like an activity feed making a complex DB query) doesn't block fast sections (like KPI cards making simple queries). Each slot also has its own `loading.tsx` and `error.tsx` — a failure in one section doesn't crash others. In a single page, one slow `await` blocks all content, and one error crashes the entire page.

### Q2: How many slots can a layout have?

**A:** There's no hard limit — layouts can receive as many named slots as needed. Each `@slotName` folder becomes a prop in the layout. In practice, most apps use 1–3 slots (children + modal + one sidebar). More slots add complexity and require more `default.tsx` files — every slot needs a fallback for the cases where no specific page matches.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `default.tsx` causes 404 on hard refresh

```
@modal/ has no default.tsx
User refreshes → Next.js can't resolve @modal slot → 404
```

**Fix:** Every `@slot/` folder needs `default.tsx`.

### ❌ Pitfall: Slot names clash with param names

```tsx
// ❌ Naming a slot @id conflicts with dynamic [id] segments
export default function Layout({ children, id }) { ... }
// TypeScript error + routing confusion
```

**Fix:** Use descriptive slot names that don't clash: `@modal`, `@sidebar`, `@panel`, `@preview`.

---

## K — Coding Challenge + Solution

### Challenge

Build a `/app/inbox` page with two parallel slots:

1. `@list` — shows 4 message previews, each is a link
2. `@detail` — shows a default "Select a message" empty state, or message detail when a message is selected (via intercepting route pattern at `/app/inbox/[messageId]`)
3. Both slots have `loading.tsx` and `default.tsx`

### Solution

```tsx
// src/app/(app)/app/inbox/layout.tsx
export default function InboxLayout({
  children,
  list,
  detail,
}: {
  children: React.ReactNode;
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Message list */}
      <div className="w-80 border-r bg-white overflow-auto shrink-0">
        {list}
      </div>
      {/* Message detail */}
      <div className="flex-1 overflow-auto">{detail}</div>
      {children}
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@list/default.tsx
// The list always shows — this is its base state
export { default } from "./page";
```

```tsx
// src/app/(app)/app/inbox/@list/page.tsx
import Link from "next/link";

const MESSAGES = [
  {
    id: "m1",
    from: "Alice",
    subject: "Q2 Review",
    preview: "Can we schedule...",
    time: "10:32am",
    unread: true,
  },
  {
    id: "m2",
    from: "Bob",
    subject: "Design Feedback",
    preview: "Great work on...",
    time: "9:15am",
    unread: true,
  },
  {
    id: "m3",
    from: "Carol",
    subject: "Re: Project Update",
    preview: "Sounds good, I...",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "m4",
    from: "David",
    subject: "Invoice #1042",
    preview: "Please find...",
    time: "Mon",
    unread: false,
  },
];

export default function MessageList() {
  return (
    <ul className="divide-y">
      {MESSAGES.map((msg) => (
        <li key={msg.id}>
          <Link
            href={`/app/inbox/${msg.id}`}
            scroll={false}
            className="flex flex-col px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <span
                className={`text-sm ${msg.unread ? "font-semibold" : "font-medium text-gray-600"}`}
              >
                {msg.from}
              </span>
              <span className="text-xs text-gray-400">{msg.time}</span>
            </div>
            <span
              className={`text-sm mt-0.5 ${msg.unread ? "text-gray-900 font-medium" : "text-gray-600"}`}
            >
              {msg.subject}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 truncate">
              {msg.preview}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/default.tsx
export default function DetailDefault() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-5xl mb-3">📬</div>
      <h3 className="font-semibold text-gray-900 mb-1">No message selected</h3>
      <p className="text-sm text-gray-400">Click a message to read it here.</p>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/loading.tsx
export default function DetailLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded"
            style={{ width: `${85 - i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/inbox/@detail/(.)inbox/[messageId]/page.tsx
// Intercepting route — shows message in detail slot when navigated from list

const MESSAGES: Record<
  string,
  { from: string; subject: string; body: string; time: string }
> = {
  m1: {
    from: "Alice",
    subject: "Q2 Review",
    body: "Can we schedule a review session this Friday? I want to go over the Q2 numbers before the board meeting.",
    time: "10:32am",
  },
  m2: {
    from: "Bob",
    subject: "Design Feedback",
    body: "Great work on the new dashboard design! I have a few small suggestions for the color palette.",
    time: "9:15am",
  },
  m3: {
    from: "Carol",
    subject: "Re: Project Update",
    body: "Sounds good, I'll prepare the presentation for Monday.",
    time: "Yesterday",
  },
  m4: {
    from: "David",
    subject: "Invoice #1042",
    body: "Please find attached the invoice for services rendered in April 2026.",
    time: "Monday",
  },
};

export default function MessageDetail({
  params,
}: {
  params: { messageId: string };
}) {
  const msg = MESSAGES[params.messageId];
  if (!msg) return <div className="p-6 text-gray-400">Message not found.</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{msg.subject}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{msg.from}</span>
          <span>·</span>
          <span>{msg.time}</span>
        </div>
      </div>
      <div className="prose prose-gray text-sm">
        <p>{msg.body}</p>
      </div>
      <div className="flex gap-2 mt-8">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Reply
        </button>
        <button className="px-4 py-2 border text-gray-600 text-sm rounded-lg hover:bg-gray-50">
          Forward
        </button>
      </div>
    </div>
  );
}
```

---

---
