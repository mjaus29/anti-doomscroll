# 4 — `default.tsx` — Parallel Route Fallbacks

---

## T — TL;DR

`default.tsx` is the **fallback rendered for a parallel route slot** when there is no active page match for that slot. Without it, hard refreshes and direct URL visits in apps with parallel routes crash with a 404. It's the safety net that keeps slots silent when they have nothing to show.

---

## K — Key Concepts

### Why `default.tsx` Exists

```
Parallel routes use @slots — each slot renders independently.

Problem:
  Layout has @modal and @sidebar slots.
  User navigates from /dashboard to /dashboard/orders via <Link>.
  → @modal: no matching page → renders nothing (stays empty)
  → On client navigation: React keeps previous @modal state

  User refreshes at /dashboard/orders:
  → Next.js must determine what to render for EACH slot from URL alone
  → @modal: no page match for /dashboard/orders URL
  → Without default.tsx: 404 error
  → WITH default.tsx: renders default.tsx (null or fallback content)
```

### Basic `default.tsx`

```tsx
// src/app/dashboard/@modal/default.tsx
// Renders when no modal is active — return null for "nothing"
export default function ModalDefault() {
  return null;
}
```

```tsx
// src/app/@sidebar/default.tsx
// Renders when no specific sidebar content is provided for the current route
export default function SidebarDefault() {
  return (
    <div className="w-64 bg-gray-50 border-r p-4">
      <p className="text-sm text-gray-400">Select an item to see details</p>
    </div>
  );
}
```

### When `default.tsx` Is Needed

```
Scenario 1 — Modal slot with no active modal (most common):
  @modal/default.tsx → return null
  → No modal visible when there's no ?modal=... in URL

Scenario 2 — Sidebar slot with generic content:
  @sidebar/default.tsx → return <DefaultSidebar />
  → Shows generic sidebar on pages that don't have specific sidebar content

Scenario 3 — Multi-column layout:
  @left/default.tsx   → return <EmptyState label="left" />
  @right/default.tsx  → return <EmptyState label="right" />
  → Prevents 404 when navigating between pages that don't all use both slots

Scenario 4 — Navigation between pages:
  Page A: /dashboard — has @analytics/analytics/page.tsx
  Page B: /dashboard/orders — has NO @analytics match
  → Without default: navigating to orders with analytics slot active → crash
  → With default: @analytics/default.tsx renders (empty or fallback)
```

### Full Parallel Route Structure with Defaults

```
src/app/dashboard/
├── layout.tsx                    ← receives children, @modal, @panel
├── page.tsx                      → /dashboard
│
├── @modal/
│   ├── default.tsx               ← null (no modal by default) ✅ REQUIRED
│   └── (.)orders/
│       └── [orderId]/
│           └── page.tsx          ← modal content for /orders/:id
│
└── @panel/
    ├── default.tsx               ← generic empty panel ✅ REQUIRED
    └── analytics/
        └── page.tsx              ← panel content for /dashboard/analytics
```

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  modal,
  panel,
}: {
  children: React.ReactNode;
  modal: React.ReactNode; // null when @modal/default.tsx renders
  panel: React.ReactNode; // generic when @panel/default.tsx renders
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">{panel}</aside>
      <main className="flex-1">{children}</main>
      {modal} {/* null = renders nothing */}
    </div>
  );
}
```

---

## W — Why It Matters

- `default.tsx` is the most commonly forgotten parallel routes file — developers build their modal/slot system, test it with client navigation, and everything works. Then they hard-refresh or share a URL, and the app crashes with a 404. `default.tsx` is the fix.
- Returning `null` from `default.tsx` is the correct pattern for optional slots (modals) — it signals "nothing to render here" without any visual impact.
- Understanding `default.tsx` unlocks the full parallel routes pattern, which is used for Instagram-style modals, split-pane layouts, and independent loading sections.

---

## I — Interview Q&A

### Q1: When is `default.tsx` required in parallel routes?

**A:** Whenever a parallel route slot doesn't have a matching page for every possible URL the app might be at. On client navigation, React keeps previous slot state. But on hard refresh or direct URL visit, Next.js must independently resolve what each slot should render from the URL alone. If no matching page is found for a slot, Next.js looks for `default.tsx`. Without it, the app returns a 404 for the slot. In practice: every `@slot/` folder needs a `default.tsx` to handle the "no match" case.

### Q2: What should `default.tsx` return for a modal slot?

**A:** `null` — it should render nothing. The modal slot is empty when no modal is active. Returning `null` from `default.tsx` ensures no modal UI appears when the URL doesn't have modal params. The layout renders the slot with `{modal}` and since that evaluates to `null`, nothing appears.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `default.tsx` and getting 404 on refresh

```
src/app/dashboard/@modal/
└── (.)orders/[orderId]/page.tsx   ← only file in @modal
// User clicks an order → modal appears ✅
// User refreshes → 404: no match for @modal slot ❌
```

**Fix:**

```
src/app/dashboard/@modal/
├── default.tsx                   ← return null ✅
└── (.)orders/[orderId]/page.tsx
```

---

## K — Coding Challenge + Solution

### Challenge

Create a dashboard with a `@notifications` parallel slot that:

1. Has a `default.tsx` returning a "No notifications" empty state
2. Has a `notifications/page.tsx` with 3 hardcoded notification items
3. Layout shows both `children` and `notifications` side by side

### Solution

```tsx
// src/app/dashboard/@notifications/default.tsx
export default function NotificationsDefault() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full
                    text-center p-6"
    >
      <div className="text-3xl mb-2">🔔</div>
      <p className="text-sm text-gray-400">No notifications</p>
    </div>
  );
}
```

```tsx
// src/app/dashboard/@notifications/notifications/page.tsx
const NOTIFS = [
  { id: 1, text: "New order #1044 received", time: "2m ago", unread: true },
  { id: 2, text: 'Product "Air Max 90" updated', time: "1h ago", unread: true },
  { id: 3, text: "Monthly report ready", time: "3h ago", unread: false },
];

export default function NotificationsPanel() {
  return (
    <div className="p-4">
      <h3 className="font-semibold text-sm text-gray-900 mb-3">
        Notifications
      </h3>
      <ul className="space-y-2">
        {NOTIFS.map((n) => (
          <li
            key={n.id}
            className={`p-3 rounded-lg text-sm ${
              n.unread ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
            }`}
          >
            <p
              className={
                n.unread ? "font-medium text-gray-900" : "text-gray-600"
              }
            >
              {n.text}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  notifications,
}: {
  children: React.ReactNode;
  notifications: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 overflow-auto p-6">{children}</main>
      <aside className="w-72 border-l bg-white overflow-auto">
        {notifications}
      </aside>
    </div>
  );
}
```

---

---
