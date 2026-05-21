# 8 — Background Refetching + Deduplication

---

## T — TL;DR

**Background refetching** silently fetches fresh data while showing the cached version — the user never sees a loading state for a re-fetch. **Deduplication** ensures multiple components subscribing to the same `queryKey` share exactly one network request, not N requests.

---

## K — Key Concepts

```tsx
// ── Background refetch: isFetching without isLoading ─────────────────────
function UsersList() {
  const { data: users = [], isLoading, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    staleTime: 0,    // always stale — will background-refetch on mount/focus
  })

  return (
    <div>
      {/* isFetching=true during background refetch; isLoading=false (data exists) */}
      {isFetching && !isLoading && (
        <span className="bg-refresh" aria-label="Refreshing data…">↻</span>
      )}
      {isLoading
        ? <ListSkeleton />
        : <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
      }
    </div>
  )
}
// Timeline on window focus:
// 1. Cached data rendered immediately (isLoading=false, data=stale users)
// 2. Background fetch starts (isFetching=true)
// 3. Response arrives → if data changed: re-render with new data
// 4. If data unchanged: structural sharing, no re-render ✅
```

```tsx
// ── Deduplication: N components, 1 request ────────────────────────────────
// These three components mount simultaneously, all call useQuery(['users']):
function HeaderUserCount() {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  return <span>{users.length} users</span>
}
function SidebarUserList() {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
function MainUserTable() {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  return <table>…</table>
}

// Network requests fired: 1 (not 3) ✅
// All three components receive the same data from the single response
// Observer count in DevTools: 3
```

```tsx
// ── Deduplication across mounting order ──────────────────────────────────
// Component A mounts → fetch starts for ['products']
// Component B mounts 50ms later → query already in flight
// → B subscribes to the same in-flight request, not a new one ✅

// Verify deduplication: check Network tab while DevTools shows 3 observers
// You should see exactly 1 request despite 3 subscribers

// ── Manual refetch vs background refetch ─────────────────────────────────
function DataPanel() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['data'],
    queryFn:  ({ signal }) => fetchData(signal),
  })

  return (
    <div>
      <button onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? '↻ Refreshing…' : '↻ Refresh'}
      </button>
      <DataView data={data} />
    </div>
  )
}
// refetch() triggers a background refetch — shows isFetching=true
// but data remains visible, no loading skeleton ✅
```

---

## W — Why It Matters

- Deduplication is the most valuable default behavior in TanStack Query for medium-large apps — a header, sidebar, and main content all fetching the same user data fires one request. With manual fetch, it's three.
- Background refetch preserving the current data display is the "stale-while-revalidate" pattern — the user sees content immediately and only notices an update if the data changed. Perceived performance is dramatically better than showing a spinner on every re-fetch.
- `isFetching && !isLoading` is the discriminator for a subtle "refreshing" indicator vs a full loading skeleton — use the first for background updates, the second for initial load.

---

## I — Interview Q&A

### Q: How does TanStack Query deduplicate requests and what triggers a background refetch?

**A:** Deduplication works through the query cache: when a component mounts and calls `useQuery` with a key, TanStack Query checks if a request for that key is already in flight. If yes, the component subscribes to the same in-flight promise — no new request is started. If multiple components mount at the same time with the same key, the first one starts the request and all others wait for the same result. Background refetching is triggered when a stale query encounters a refetch trigger: window focus, component mount, network reconnect, or manual `refetch()`. During a background refetch, `isFetching` is `true` but `isLoading` is `false` (because cached data exists), so the component continues showing the cached data while the silent network request runs.

---

## C — Common Pitfalls + Fix

### ❌ Different queryFn for the same queryKey defeats deduplication

```tsx
// ❌ Same key, different queryFn — TanStack uses the FIRST registered queryFn
// This is a data consistency bug, not a dedup bug
function ComponentA() {
  useQuery({
    queryKey: ['users'],
    queryFn:  () => fetchUsers({ role: 'admin' }),   // ← admin only ❌
  })
}
function ComponentB() {
  useQuery({
    queryKey: ['users'],
    queryFn:  () => fetchUsers({ role: 'all' }),     // ← all users
  })
}
// Both use ['users'] key → same cache entry → ComponentA's queryFn may run
// → ComponentB receives admin-only data ❌

// ✅ Different filters → different keys
function ComponentAFixed() {
  useQuery({
    queryKey: ['users', { role: 'admin' }],
    queryFn:  ({ signal }) => fetchUsers({ role: 'admin' }, signal),
  })
}
function ComponentBFixed() {
  useQuery({
    queryKey: ['users', { role: 'all' }],
    queryFn:  ({ signal }) => fetchUsers({ role: 'all' }, signal),
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate deduplication: render 3 components that all subscribe to `['activity-feed']`. Log how many times the queryFn runs. Add a "Refresh all" button that triggers one background refetch for all three.

### Solution

```tsx
let fetchCount = 0

async function fetchActivityFeed(signal: AbortSignal) {
  fetchCount++
  console.log(`fetchActivityFeed called — total calls: ${fetchCount}`)
  const res = await fetch('/api/activity', { signal })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<ActivityItem[]>
}

function useActivityFeed() {
  return useQuery({
    queryKey: ['activity-feed'],
    queryFn:  ({ signal }) => fetchActivityFeed(signal),
    staleTime: 0,
  })
}

// 3 subscribers — but only 1 network request
function FeedHeader() {
  const { data: feed = [] } = useActivityFeed()
  return <p>Latest: {feed[0]?.text ?? 'none'}</p>
}
function FeedSidebar() {
  const { data: feed = [] } = useActivityFeed()
  return <ul>{feed.slice(0, 3).map((f, i) => <li key={i}>{f.text}</li>)}</ul>
}
function FeedMain() {
  const { data: feed = [], isFetching } = useActivityFeed()
  return (
    <div>
      {isFetching && <span>↻ Refreshing</span>}
      <ActivityList items={feed} />
    </div>
  )
}

function DeduplicationDemo() {
  const qc = useQueryClient()
  return (
    <div>
      <button onClick={() => {
        qc.invalidateQueries({ queryKey: ['activity-feed'] })
        // Triggers ONE background refetch → all 3 subscribers update ✅
        // fetchCount increments by 1, not 3
      }}>
        Refresh all (check console for fetch count)
      </button>
      <FeedHeader />
      <FeedSidebar />
      <FeedMain />
    </div>
  )
}
```

---

---
