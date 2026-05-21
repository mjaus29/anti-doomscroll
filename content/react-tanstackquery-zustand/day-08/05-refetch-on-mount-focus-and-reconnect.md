# 5 — Refetch on Mount, Focus, and Reconnect

---

## T — TL;DR

TanStack Query has three automatic refetch triggers: **mount** (component mounts), **focus** (window regains focus), and **reconnect** (network comes back online). All are enabled by default and only fire when the query is **stale**. Together they keep data fresh passively without any polling.

---

## K — Key Concepts

```tsx
// ── Three refetch triggers and their defaults ─────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount:        true,    // refetch stale query when component mounts
      refetchOnWindowFocus:  true,    // refetch stale queries when tab regains focus
      refetchOnReconnect:    true,    // refetch stale queries when network reconnects
    }
  }
})

// Each can be overridden per query:
useQuery({
  queryKey: ['user', userId],
  queryFn:  ({ signal }) => getUser(userId, signal),
  refetchOnMount:       true,    // 'always' | true | false
  refetchOnWindowFocus: true,    // 'always' | true | false
  refetchOnReconnect:   true,    // 'always' | true | false
})
```

```tsx
// ── refetchOnMount: three modes ───────────────────────────────────────────
// true (default):
//   Refetch if stale on mount. If fresh → serve cache, no network request.
useQuery({ queryKey: ['posts'], queryFn: getPosts, refetchOnMount: true })

// 'always':
//   Always refetch on mount, even if fresh. Use for critical real-time data.
useQuery({
  queryKey: ['notifications'],
  queryFn: getNotifications,
  refetchOnMount: 'always',   // fetch every time the component appears ✅
})

// false:
//   Never trigger a refetch on mount. Only fetch the first time.
useQuery({
  queryKey: ['config'],
  queryFn: getAppConfig,
  refetchOnMount: false,      // fetch once, never auto-refetch on mount
  staleTime: Infinity,
})
```

```tsx
// ── refetchOnWindowFocus: the "user returns to tab" pattern ───────────────
// Scenario: user switches tabs, does something elsewhere, returns
// With refetchOnWindowFocus: true + staleTime: 0
//   → immediately background-refetches all stale queries
//   → new data shown without user doing anything
//   → feels like near-real-time without WebSockets

// Disable globally in development (reduces noise when debugging):
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: process.env.NODE_ENV !== 'development',
    }
  }
})

// Disable per query for data that focus-refetch would be annoying for:
useQuery({
  queryKey: ['draft', draftId],
  queryFn:  ({ signal }) => getDraft(draftId, signal),
  refetchOnWindowFocus: false,  // editing a draft — don't overwrite local changes
})
```

```tsx
// ── refetchOnReconnect: offline recovery ──────────────────────────────────
// User loses network → reconnects
// All stale queries background-refetch automatically
// Component shows cached data during offline, refreshes on reconnect ✅

// Pair with online status for UX
function useOnlineStatus() {
  return useSyncExternalStore(
    cb => { window.addEventListener('online', cb); window.addEventListener('offline', cb)
             return () => { window.removeEventListener('online', cb)
                            window.removeEventListener('offline', cb) } },
    () => navigator.onLine, () => true
  )
}

function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return <div className="offline-banner">You're offline — showing cached data</div>
}
```

---

## W — Why It Matters

- `refetchOnWindowFocus` simulates real-time data without WebSockets for most apps — a user spending 10 minutes in another tab comes back to see current data, not 10-minute-old snapshots.
- `refetchOnMount: 'always'` is the escape hatch for components where you must guarantee fresh data (payment confirmation, order status) regardless of staleTime.
- Disabling `refetchOnWindowFocus` in development is a quality-of-life setting — every time you Alt+Tab from your IDE to the browser, the dev tools trigger refetches that clutter your network panel.

---

## I — Interview Q&A

### Q: When does TanStack Query automatically refetch and how can you control it?

**A:** TanStack Query refetches stale queries on three triggers: (1) **Mount** — when a component using a stale query mounts, a background refetch starts. (2) **Window focus** — when the browser tab/window regains focus, all stale queries refetch. (3) **Network reconnect** — when the network comes back online after being offline. All three are enabled by default. Each trigger has three possible values: `true` (refetch if stale), `'always'` (always refetch), or `false` (never). They can be set globally on the `QueryClient` or per query. The key condition: **these only fire if the query is currently stale** — if `staleTime` hasn't expired yet, the trigger is ignored and cached data is served without any network request.

---

## C — Common Pitfalls + Fix

### ❌ Infinite refetch loop from refetchOnWindowFocus during form editing

```tsx
// ❌ User is editing a form. Focus trigger refetches, overwrites local form state
function EditProfile({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    // refetchOnWindowFocus: true (default)
  })
  const [name, setName] = useState(user?.name ?? '')
  // User types in an external app, returns → refetch fires → user.name updates
  // → name state doesn't re-init (it's in state) but the data beneath it changes
  // confusing inconsistency between form and server data ❌
}

// ✅ Disable focus refetch for editing screens + invalidate on save
function EditProfileFixed({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    refetchOnWindowFocus: false,   // ✅ user is actively editing — don't disrupt
    staleTime: 1000 * 60 * 5,
  })
  const [name, setName] = useState(user?.name ?? '')

  const qc = useQueryClient()
  async function handleSave() {
    await updateUser(userId, { name })
    qc.invalidateQueries({ queryKey: ['user', userId] })   // explicit refresh on save ✅
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `LiveOrderStatus` component: always refetch on mount, refetch every 10 seconds, and show an offline banner when disconnected.

### Solution

```tsx
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
interface Order { id: number; status: OrderStatus; updatedAt: string }

function useOrderStatus(orderId: number) {
  return useQuery({
    queryKey:  ['order', orderId, 'status'],
    queryFn:   ({ signal }) => fetchOrderStatus(orderId, signal),
    refetchOnMount:       'always',     // always fresh on mount ✅
    refetchOnWindowFocus: true,
    refetchOnReconnect:   true,
    refetchInterval:      1000 * 10,    // poll every 10 seconds ✅
    staleTime:            0,            // always stale — real-time status
  })
}

function LiveOrderStatus({ orderId }: { orderId: number }) {
  const isOnline = useOnlineStatus()
  const { data: order, isLoading, isFetching, error } = useOrderStatus(orderId)

  const STATUS_COLORS: Record<OrderStatus, string> = {
    pending:    '#f59e0b',
    processing: '#3b82f6',
    shipped:    '#8b5cf6',
    delivered:  '#10b981',
    cancelled:  '#ef4444',
  }

  return (
    <div className="order-status-card">
      {!isOnline && (
        <div className="offline-banner" role="status">
          📴 Offline — showing last known status
        </div>
      )}
      {isLoading ? (
        <div className="skeleton" style={{ height: 60 }} />
      ) : error ? (
        <p role="alert">Failed to load order status</p>
      ) : order ? (
        <div>
          <span
            className="status-badge"
            style={{ background: STATUS_COLORS[order.status] }}
          >
            {order.status.toUpperCase()}
          </span>
          <p>Last updated: {new Date(order.updatedAt).toLocaleTimeString()}</p>
          {isFetching && <span className="pulse-dot" aria-label="Refreshing" />}
        </div>
      ) : null}
    </div>
  )
}
```

---

---
