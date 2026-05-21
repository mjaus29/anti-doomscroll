# 3 — Conditional Queries with enabled

---

## T — TL;DR

`enabled: false` tells TanStack Query **don't fetch yet**. Use it for queries that depend on user interaction, prerequisites, permissions, or debounced input. The query stays in `pending` state until `enabled` becomes `true`.

---

## K — Key Concepts

```tsx
// ── enabled: the query gate ───────────────────────────────────────────────
// false  → query does not execute, status = 'pending'
// true   → query executes normally
// Can be any boolean expression

// ── Pattern 1: Auth-gated query ───────────────────────────────────────────
function PrivateFeed({ user }: { user: User | null }) {
  const { data: feed } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn:  ({ signal }) => getFeed(user!.id, signal),
    enabled:  !!user,   // only fetch when logged in ✅
  })
  if (!user)  return <LoginPrompt />
  return <FeedList items={feed ?? []} />
}

// ── Pattern 2: Search — don't fetch empty or short queries ─────────────────
function SearchInput() {
  const [query, setQuery] = useState('')
  const debouncedQuery    = useDebounce(query, 400)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn:  ({ signal }) => search(debouncedQuery, signal),
    enabled:  debouncedQuery.trim().length >= 2,  // min 2 chars ✅
    staleTime: 1000 * 30,
  })

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" />
      {isLoading && query.length >= 2 && <Spinner />}
      <ul>{results.map((r, i) => <li key={i}>{r.title}</li>)}</ul>
    </>
  )
}

// ── Pattern 3: On-demand fetch — triggered by user action ─────────────────
function LazyPreview({ reportId }: { reportId: number }) {
  const [shouldLoad, setShouldLoad] = useState(false)

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn:  ({ signal }) => fetchReport(reportId, signal),
    enabled:  shouldLoad,   // only fetch when user requests it ✅
  })

  if (!shouldLoad) {
    return (
      <button onClick={() => setShouldLoad(true)}>Load Preview</button>
    )
  }
  if (isLoading) return <ReportSkeleton />
  return <ReportViewer report={report!} />
}
```

```tsx
// ── enabled with isFetching: show loading only when actively fetching ──────
function ConditionalDetails({ id }: { id: number | null }) {
  const { data, isLoading, isFetching, isPending } = useQuery({
    queryKey: ['detail', id],
    queryFn:  ({ signal }) => getDetail(id!, signal),
    enabled:  id !== null,
  })

  // isPending: true when disabled OR when fetching with no cache
  // isLoading: true only when pending AND fetching (initial load)
  // Safe pattern: check enabled condition yourself for empty state
  if (id === null) return <p>Select an item to see details</p>
  if (isLoading)   return <DetailSkeleton />
  return <DetailPanel data={data!} />
}
```

---

## W — Why It Matters

- Without `enabled`, a query fires immediately with `undefined` arguments — causing either a network request to `/api/users/undefined` or a crash inside the query function.
- `enabled` is the idiomatic way to express "this data only makes sense in this context" — it's declarative and co-located with the query definition rather than scattered in `useEffect` guards.
- The `enabled: shouldLoad` pattern with a button trigger is a clean "load on demand" UI — the data is lazily fetched and then cached for subsequent interactions.

---

## I — Interview Q&A

### Q: What is the `enabled` option in TanStack Query and what are its common use cases?

**A:** `enabled` is a boolean that controls whether a query should execute. When `false`, the query stays in `pending` state with no network request. When it becomes `true`, the query executes normally. Common use cases: (1) **Dependent queries** — `enabled: !!previousQuery.data?.id` waits for a prerequisite. (2) **Search inputs** — `enabled: query.length >= 2` prevents fetching on empty or short strings. (3) **Auth-gated data** — `enabled: !!user` prevents fetching before login. (4) **On-demand loading** — `enabled: userClickedLoad` lazily loads data only when requested. (5) **Pagination guards** — `enabled: page > 0` prevents negative page fetches. In all cases, `enabled: false` is cleaner than `if` statements around `useEffect` fetches.

---

## C — Common Pitfalls + Fix

### ❌ Checking `isLoading` when `enabled` is false — always shows loading

```tsx
// ❌ isLoading is true when: isPending AND isFetching
// With enabled: false → isPending=true, isFetching=false → isLoading=false ✅ actually fine
// BUT: isPending is true when disabled → can mislead

function UserSearch({ query }: { query: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['search', query],
    queryFn:  ({ signal }) => searchUsers(query, signal),
    enabled:  query.length >= 2,
  })

  // ❌ Shows "Loading…" even before user has typed anything
  if (isPending) return <p>Loading…</p>   // isPending = true when disabled ❌
  return <ul>{(data ?? []).map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// ✅ Check the enabled condition explicitly for empty state
function UserSearchFixed({ query }: { query: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn:  ({ signal }) => searchUsers(query, signal),
    enabled:  query.length >= 2,
  })

  if (query.length < 2) return <p>Type at least 2 characters to search.</p>
  if (isLoading)        return <Spinner />  // isLoading: pending + actively fetching ✅
  if (data.length === 0) return <p>No results for "{query}"</p>
  return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `PermissionGatedQuery`: fetch resource data only when the user has the required permission. Show "Unauthorized" when they don't, skeleton while loading, data when ready.

### Solution

```tsx
type Permission = 'read:reports' | 'read:billing' | 'read:admin'
interface User       { id: number; permissions: Permission[] }
interface ReportData { id: number; title: string; summary: string }

function useReport(reportId: number, user: User | null) {
  const hasPermission = user?.permissions.includes('read:reports') ?? false

  return useQuery({
    queryKey: ['report', reportId],
    queryFn:  ({ signal }) => fetchReport(reportId, signal),
    enabled:  !!user && hasPermission,   // both: logged in AND has permission ✅
    staleTime: 1000 * 60 * 5,
  })
}

function ReportPanel({ reportId, user }: { reportId: number; user: User | null }) {
  const { data: report, isLoading, isError, error } = useReport(reportId, user)

  if (!user)                          return <LoginRequired />
  if (!user.permissions.includes('read:reports')) {
    return (
      <div role="alert" className="unauthorized">
        <p>🔒 You don't have permission to view this report.</p>
        <p>Contact your admin to request access.</p>
      </div>
    )
  }
  if (isLoading) return <ReportSkeleton />
  if (isError)   return <ErrorCard error={error as Error} />

  return (
    <article>
      <h2>{report!.title}</h2>
      <p>{report!.summary}</p>
    </article>
  )
}
```

---

---
