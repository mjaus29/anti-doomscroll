# 5 — select — Data Transformation

---

## T — TL;DR

`select` transforms raw API data **before it reaches the component**. It runs after every successful fetch, the component only re-renders if the selected value changes, and it keeps components free of mapping/filtering logic.

---

## K — Key Concepts

```tsx
// ── select: transform at the query layer ─────────────────────────────────
interface ApiUser { user_id: number; full_name: string; is_active: boolean }
interface AppUser { id: number; name: string; active: boolean }

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal) as Promise<ApiUser[]>,
    select: (apiUsers): AppUser[] =>
      apiUsers.map(u => ({
        id:     u.user_id,
        name:   u.full_name,
        active: u.is_active,
      })),
    // Components receive AppUser[] — never see ApiUser shape ✅
  })
}
```

```tsx
// ── select for filtering: component only re-renders when filtered result changes
function useActiveUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active),
    // If a non-active user's field changes → filtered array unchanged
    // → structural sharing: same reference → no re-render ✅
  })
}

// ── select for a single item from a list ─────────────────────────────────
// Multiple components can subscribe to ['users'] — each selects its slice
function useUserById(id: number) {
  return useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.find(u => u.id === id),
    // Component only re-renders when THIS user's data changes ✅
    // One request serves all useUserById calls ✅
  })
}

// ── select for derived values ─────────────────────────────────────────────
function useActiveUserCount() {
  return useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active).length,
    // Re-renders only when count changes — not on any user field change ✅
  })
}
```

```tsx
// ── Stable select function: memoize if it closes over changing values ──────
function useUsersByRole(role: string) {
  // ❌ New function every render — select re-runs unnecessarily
  // return useQuery({ ..., select: users => users.filter(u => u.role === role) })

  // ✅ Stable select when role changes are infrequent
  const selectByRole = useCallback(
    (users: User[]) => users.filter(u => u.role === role),
    [role]   // re-create only when role changes ✅
  )

  return useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select:   selectByRole,
  })
}
```

---

## W — Why It Matters

- `select` is the boundary between "server shape" and "app shape" — APIs often return snake_case, nested objects, or fields your component doesn't need. `select` normalizes this without polluting component logic.
- The re-render optimization is real: a component using `select: d => d.count` subscribes to the same query as one using `select: d => d.items` — but each only re-renders when its selected slice changes.
- All components using `select` on the same `queryKey` still share **one network request** — deduplication works regardless of how many different `select` functions are applied.

---

## I — Interview Q&A

### Q: What does the `select` option do and how does it affect re-renders?

**A:** `select` is a transformation function that runs after a successful fetch — it receives the raw cached data and returns a transformed version for the component. It serves two purposes: (1) **Data shaping** — normalize API response format, rename fields, derive values — keeping components free of transformation logic. (2) **Re-render optimization** — TanStack Query uses structural sharing on the `select` result. If the selected value is referentially identical to the previous selected value, the component does not re-render — even if the underlying cached data changed. This means a component using `select: d => d.activeCount` only re-renders when the count changes, not when any other field in the response changes.

---

## C — Common Pitfalls + Fix

### ❌ Performing select logic inside the component — misses re-render optimization

```tsx
// ❌ Transformation in the component — runs on every render, no optimization
function ActiveUsersBad() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    // No select — receives all user data
  })
  const activeUsers = users.filter(u => u.active)   // runs on every render ❌
  return <ul>{activeUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// ✅ select in the query — TanStack re-renders only when filtered result changes
function ActiveUsersGood() {
  const { data: activeUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select:   users => users.filter(u => u.active),  // ✅ at query layer
  })
  return <ul>{activeUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useOrderSummary`: fetches orders, selects `{ pending, completed, totalRevenue, recentOrders }` — the component re-renders only when the summary values change.

### Solution

```tsx
interface Order {
  id:        number
  status:    'pending' | 'completed' | 'cancelled'
  total:     number
  createdAt: string
}
interface OrderSummary {
  pending:      number
  completed:    number
  totalRevenue: number
  recentOrders: Order[]
}

function useOrderSummary(userId: number) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn:  ({ signal }) => fetchOrders(userId, signal),
    staleTime: 1000 * 60,
    select: (orders): OrderSummary => {
      const pending      = orders.filter(o => o.status === 'pending').length
      const completed    = orders.filter(o => o.status === 'completed').length
      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total, 0)
      const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      return { pending, completed, totalRevenue, recentOrders }
    },
    // Re-renders ONLY when summary values change, not on any order field change ✅
  })
}

function OrderDashboard({ userId }: { userId: number }) {
  const { data: summary, isLoading } = useOrderSummary(userId)
  if (isLoading) return <DashboardSkeleton />
  return (
    <div>
      <Stat label="Pending"       value={summary!.pending} />
      <Stat label="Completed"     value={summary!.completed} />
      <Stat label="Revenue"       value={`$${summary!.totalRevenue.toFixed(2)}`} />
      <RecentOrdersList orders={summary!.recentOrders} />
    </div>
  )
}
```

---

---
