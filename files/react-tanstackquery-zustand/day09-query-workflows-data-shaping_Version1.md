
# 📅 Day 9 — Query Workflows and Data Shaping

> **Goal:** Orchestrate multiple queries, shape data at the query layer, and build an organized, maintainable query architecture.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · @tanstack/react-query 5.100.1

---

## 📋 Day 9 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Dependent Queries | 10 min |
| 2 | Parallel Queries + useQueries | 12 min |
| 3 | Conditional Queries with enabled | 10 min |
| 4 | Reusable Query Hooks | 12 min |
| 5 | select — Data Transformation | 10 min |
| 6 | placeholderData vs initialData | 10 min |
| 7 | Prefetching | 12 min |
| 8 | Background Refetching + Deduplication | 10 min |
| 9 | Maintainable Query Organization | 12 min |

---

---

# 1 — Dependent Queries

---

## T — TL;DR

A **dependent query** waits for the result of another query before it runs. Use `enabled: !!prerequisite` to gate the second query on the first. This replaces sequential `useEffect` chains with a clean declarative dependency graph.

---

## K — Key Concepts

```tsx
// ── Basic dependent query pattern ─────────────────────────────────────────
function UserDashboard({ userId }: { userId: number }) {
  // Step 1: fetch user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  // Step 2: fetch org — only when user.orgId is available
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org', user?.orgId],
    queryFn:  ({ signal }) => getOrg(user!.orgId, signal),
    enabled:  !!user?.orgId,   // ← dependency gate ✅
  })

  // Step 3: fetch billing — depends on org
  const { data: billing } = useQuery({
    queryKey: ['billing', org?.id],
    queryFn:  ({ signal }) => getBilling(org!.id, signal),
    enabled:  !!org?.id,       // ← depends on step 2 ✅
  })

  return (
    <div>
      <p>{user?.name}</p>
      {orgLoading ? <Spinner /> : <p>{org?.name}</p>}
      <p>{billing?.plan}</p>
    </div>
  )
}
```

```tsx
// ── Loading state across a dependency chain ───────────────────────────────
function ProfilePage({ userId }: { userId: number }) {
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  const postsQuery = useQuery({
    queryKey: ['posts', { authorId: userQuery.data?.id }],
    queryFn:  ({ signal }) => getPostsByAuthor(userQuery.data!.id, signal),
    enabled:  !!userQuery.data?.id,
  })

  // Aggregate loading: show skeleton until the full chain resolves
  const isFullyLoaded = userQuery.isSuccess && postsQuery.isSuccess

  if (!isFullyLoaded) return <ProfileSkeleton />
  if (userQuery.isError) return <ErrorCard error={userQuery.error as Error} />

  return (
    <div>
      <UserCard user={userQuery.data!} />
      <PostList posts={postsQuery.data ?? []} />
    </div>
  )
}
```

```tsx
// ── Dependent query with data transformation at each step ─────────────────
function TeamBillingPanel({ teamId }: { teamId: number }) {
  // Fetch team to get adminUserId
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn:  ({ signal }) => getTeam(teamId, signal),
    select:   t => ({ adminId: t.adminUserId, name: t.name }),
  })

  // Fetch admin user — depends on team.adminId
  const { data: admin } = useQuery({
    queryKey: ['user', team?.adminId],
    queryFn:  ({ signal }) => getUser(team!.adminId, signal),
    enabled:  !!team?.adminId,
    select:   u => ({ email: u.email, name: u.name }),
  })

  // Fetch billing — depends on teamId directly but show admin info too
  const { data: billing } = useQuery({
    queryKey: ['billing', teamId],
    queryFn:  ({ signal }) => getBilling(teamId, signal),
    enabled:  !!team,  // only fetch billing once team is confirmed to exist
  })

  return (
    <div>
      <h2>{team?.name}</h2>
      <p>Admin: {admin?.name} ({admin?.email})</p>
      <p>Plan: {billing?.plan} · ${billing?.monthlyAmount}/mo</p>
    </div>
  )
}
```

---

## W — Why It Matters

- Sequential `useEffect` chains for dependent data are fragile — a missed cleanup or stale closure corrupts the chain. Dependent queries are declarative: each query simply states what it needs to exist before running.
- The `enabled` gate prevents queries from firing with `undefined` arguments — which would either crash the query function or return wrong data.
- Each query in the chain is independently cached — if the user navigates away and back, each step serves from cache (if fresh) rather than re-running the entire chain.

---

## I — Interview Q&A

### Q: How do you implement a dependent query in TanStack Query?

**A:** Use `enabled` to gate the second query on a value from the first. Pattern: fetch A, then `enabled: !!a.data?.id` on query B, which passes `a.data.id` into the `queryFn`. TanStack Query won't start B until `enabled` becomes truthy. Each query is independently cached — if A's result is already fresh in cache, B starts immediately without waiting for A to re-fetch. The loading state is cumulative: A's `isLoading` covers its fetch, and B's `isLoading` covers its fetch. For a final "everything ready" signal, check both `isSuccess` flags together.

---

## C — Common Pitfalls + Fix

### ❌ Non-null assertion without `enabled` guard — crashes on undefined

```tsx
// ❌ user?.id could be undefined on first render — queryFn crashes
function PostsByUser({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn:  ({ signal }) => getPosts(user!.id, signal), // ❌ user is undefined on first render
    // No enabled guard — fires immediately with user=undefined
  })
}

// ✅ enabled guard prevents premature execution
function PostsByUserFixed({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn:  ({ signal }) => getPosts(user!.id, signal),
    enabled:  !!user?.id,   // ✅ waits for user to resolve
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a 3-step dependent chain: fetch `Project` → fetch project's `Owner` (user) → fetch owner's `Team`. Show aggregate loading state and individual error states.

### Solution

```tsx
interface Project { id: number; name: string; ownerId: number }
interface Owner   { id: number; name: string; teamId: number }
interface Team    { id: number; name: string; memberCount: number }

function ProjectDetailPanel({ projectId }: { projectId: number }) {
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn:  ({ signal }) => fetchProject(projectId, signal),
  })

  const ownerQuery = useQuery({
    queryKey: ['user', projectQuery.data?.ownerId],
    queryFn:  ({ signal }) => fetchUser(projectQuery.data!.ownerId, signal),
    enabled:  !!projectQuery.data?.ownerId,
  })

  const teamQuery = useQuery({
    queryKey: ['team', ownerQuery.data?.teamId],
    queryFn:  ({ signal }) => fetchTeam(ownerQuery.data!.teamId, signal),
    enabled:  !!ownerQuery.data?.teamId,
  })

  const isLoading = projectQuery.isLoading || ownerQuery.isLoading || teamQuery.isLoading
  if (isLoading) return <PanelSkeleton />

  return (
    <div className="project-panel">
      {projectQuery.isError && (
        <ErrorCard error={projectQuery.error as Error} label="Project" />
      )}
      {ownerQuery.isError && (
        <ErrorCard error={ownerQuery.error as Error} label="Owner" />
      )}
      {teamQuery.isError && (
        <ErrorCard error={teamQuery.error as Error} label="Team" />
      )}
      {projectQuery.data && <h2>{projectQuery.data.name}</h2>}
      {ownerQuery.data   && <p>Owner: {ownerQuery.data.name}</p>}
      {teamQuery.data    && (
        <p>Team: {teamQuery.data.name} · {teamQuery.data.memberCount} members</p>
      )}
    </div>
  )
}
```

---

---

# 2 — Parallel Queries + useQueries

---

## T — TL;DR

**Parallel queries** fire simultaneously — each `useQuery` in a component fires at the same time. `useQueries` handles a **dynamic number** of parallel queries (e.g., fetch N resources by ID) in a single call, returning an array of results.

---

## K — Key Concepts

```tsx
// ── Static parallel queries: just call useQuery multiple times ─────────────
// TanStack Query runs them concurrently — no sequential waiting
function Dashboard() {
  const usersQuery   = useQuery({ queryKey: ['users'],   queryFn: ({ signal }) => getUsers(signal) })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: ({ signal }) => getProducts(signal) })
  const statsQuery   = useQuery({ queryKey: ['stats'],   queryFn: ({ signal }) => getStats(signal) })
  // All three fire simultaneously on mount ✅ — no sequential waterfall

  const isLoading = usersQuery.isLoading || productsQuery.isLoading || statsQuery.isLoading
  const hasError  = usersQuery.isError   || productsQuery.isError   || statsQuery.isError

  if (isLoading) return <DashboardSkeleton />
  if (hasError)  return <ErrorPage />

  return (
    <div>
      <StatsPanel    data={statsQuery.data!} />
      <UsersSection  users={usersQuery.data ?? []} />
      <ProductsTable products={productsQuery.data ?? []} />
    </div>
  )
}
```

```tsx
import { useQueries } from '@tanstack/react-query'

// ── useQueries: dynamic parallel queries ─────────────────────────────────
// When you don't know the count of queries at compile time
function ProductComparison({ productIds }: { productIds: number[] }) {
  const results = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['product', id],
      queryFn:  ({ signal }: { signal: AbortSignal }) => getProduct(id, signal),
      staleTime: 1000 * 60 * 5,
    })),
  })
  // results is an array matching productIds.length
  // results[0] = { data, isLoading, isError, ... } for productIds[0]

  const isLoading = results.some(r => r.isLoading)
  const products  = results.map(r => r.data).filter(Boolean) as Product[]

  if (isLoading) return <ComparisonSkeleton count={productIds.length} />

  return (
    <div className="comparison-grid">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

```tsx
// ── useQueries with combine: aggregate results ────────────────────────────
// combine: transform the array of results into one value
function useMultipleUsers(userIds: number[]) {
  return useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn:  ({ signal }: { signal: AbortSignal }) => getUser(id, signal),
    })),
    combine: (results) => ({
      users:     results.map(r => r.data).filter(Boolean) as User[],
      isLoading: results.some(r => r.isLoading),
      isError:   results.some(r => r.isError),
      errors:    results.filter(r => r.isError).map(r => r.error as Error),
    }),
  })
}

// Usage: clean API — one hook, combined state
function TeamMembers({ memberIds }: { memberIds: number[] }) {
  const { users, isLoading, isError } = useMultipleUsers(memberIds)

  if (isLoading) return <MembersSkeleton />
  if (isError)   return <p>Failed to load some members</p>

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

---

## W — Why It Matters

- Static parallel queries (multiple `useQuery` calls) are the default for known-count data sources — the React rules of hooks require a fixed number of `useQuery` calls, so you can't put them in a loop.
- `useQueries` fills the dynamic gap — fetching N users by ID, comparing N products, loading N files. Without it, you'd need a single query that fetches all IDs in one request (worse caching granularity).
- `combine` turns `useQueries` from an array of results into a clean single object that consuming components can destructure — it's the composability layer for dynamic parallel queries.

---

## I — Interview Q&A

### Q: When would you use `useQueries` instead of multiple `useQuery` calls?

**A:** Use `useQueries` when the number of queries is dynamic — determined by an array of IDs or keys that changes at runtime. React's rules of hooks forbid calling hooks in loops or conditionally, so `const results = ids.map(id => useQuery(...))` is illegal. `useQueries` is specifically designed for this: it accepts an array of query option objects and returns an array of results, each with the same shape as a single `useQuery` result. The `combine` option further lets you reduce the array into a single aggregated object, keeping the consuming component's API clean. For a fixed, known number of parallel queries (dashboard with 3 panels), separate `useQuery` calls are simpler and preferable.

---

## C — Common Pitfalls + Fix

### ❌ Using `useQuery` in a loop — violates rules of hooks

```tsx
// ❌ Hooks in a loop — illegal, causes "rendered more hooks than previous render"
function BadComparison({ ids }: { ids: number[] }) {
  const results = ids.map(id => useQuery({  // ❌ hook in .map
    queryKey: ['item', id],
    queryFn:  () => getItem(id),
  }))
  return <div>{results.map(r => r.data?.name)}</div>
}

// ✅ useQueries for dynamic parallel queries
function GoodComparison({ ids }: { ids: number[] }) {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['item', id] as const,
      queryFn:  ({ signal }: { signal: AbortSignal }) => getItem(id, signal),
    })),
  })
  return (
    <div>
      {results.map((r, i) => (
        <div key={ids[i]}>
          {r.isLoading ? <Spinner /> : r.data?.name}
        </div>
      ))}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useCartProducts`: given a cart (`{ productId, qty }[]`), use `useQueries` + `combine` to return `{ lineItems, subtotal, isLoading }`.

### Solution

```tsx
interface CartItem    { productId: number; qty: number }
interface Product     { id: number; name: string; price: number }
interface LineItem    { product: Product; qty: number; lineTotal: number }
interface CartSummary { lineItems: LineItem[]; subtotal: number; isLoading: boolean }

function useCartProducts(cart: CartItem[]): CartSummary {
  return useQueries({
    queries: cart.map(item => ({
      queryKey: ['product', item.productId] as const,
      queryFn:  ({ signal }: { signal: AbortSignal }) =>
                  fetchProduct(item.productId, signal),
      staleTime: 1000 * 60 * 5,
    })),
    combine: (results) => {
      const isLoading = results.some(r => r.isLoading)
      const lineItems: LineItem[] = results
        .map((r, i) => r.data
          ? { product: r.data, qty: cart[i].qty, lineTotal: r.data.price * cart[i].qty }
          : null
        )
        .filter(Boolean) as LineItem[]

      const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0)
      return { lineItems, subtotal, isLoading }
    },
  })
}

function CartSummaryPanel({ cart }: { cart: CartItem[] }) {
  const { lineItems, subtotal, isLoading } = useCartProducts(cart)
  if (isLoading) return <CartSkeleton />
  return (
    <div>
      {lineItems.map(li => (
        <div key={li.product.id}>
          {li.product.name} × {li.qty} = ${li.lineTotal.toFixed(2)}
        </div>
      ))}
      <p>Subtotal: <strong>${subtotal.toFixed(2)}</strong></p>
    </div>
  )
}
```

---

---

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

# 4 — Reusable Query Hooks

---

## T — TL;DR

Extract `useQuery` calls into **named custom hooks** (`useUser`, `useProducts`). Components declare intent with a readable hook name; the hook owns the key, queryFn, and options. One change to the hook updates every consumer.

---

## K — Key Concepts

```tsx
// ── The pattern: colocate key + queryFn + options in one hook ─────────────
// hooks/queries/useUser.ts

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys }  from '../query-keys/users'
import { getUser, getUsersByRole, User } from '../api/users'

// Single user
export function useUser(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,
    staleTime: 1000 * 60 * 5,
  })
}

// User list with filters
export function useUsers(role?: string) {
  return useQuery({
    queryKey:  role ? userKeys.list({ role }) : userKeys.lists(),
    queryFn:   ({ signal }) => getUsersByRole(role ?? 'all', signal),
    staleTime: 1000 * 60 * 2,
  })
}

// Paired mutation invalidator
export function useInvalidateUser() {
  const qc = useQueryClient()
  return {
    invalidateUser:  (id: number) => qc.invalidateQueries({ queryKey: userKeys.detail(id) }),
    invalidateUsers: ()           => qc.invalidateQueries({ queryKey: userKeys.all() }),
  }
}
```

```tsx
// ── Components become thin consumers ──────────────────────────────────────
// Before: component knows queryKey structure, queryFn, staleTime
function UserCardBefore({ userId }: { userId: number }) {
  const { data: user } = useQuery({
    queryKey: ['user', 'detail', userId],     // key details leaked into component
    queryFn:  ({ signal }) => fetch(`/api/users/${userId}`, { signal }).then(r => r.json()),
    staleTime: 1000 * 60 * 5,
  })
  return <div>{user?.name}</div>
}

// After: component declares intent, knows nothing about implementation
function UserCardAfter({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)    // clean, readable, zero coupling ✅
  return <div>{user?.name}</div>
}
```

```tsx
// ── Composing hooks: data from multiple queries in one hook ────────────────
// hooks/queries/useUserWithPosts.ts
interface UserWithPosts {
  user:      User
  posts:     Post[]
  postCount: number
}

function useUserWithPosts(userId: number) {
  const userQuery = useUser(userId)

  const postsQuery = useQuery({
    queryKey:  postKeys.byAuthor(userId),
    queryFn:   ({ signal }) => getPostsByAuthor(userId, signal),
    enabled:   !!userQuery.data,
    staleTime: 1000 * 60,
    select:    posts => ({ posts, postCount: posts.length }),
  })

  return {
    user:       userQuery.data,
    posts:      postsQuery.data?.posts      ?? [],
    postCount:  postsQuery.data?.postCount  ?? 0,
    isLoading:  userQuery.isLoading || postsQuery.isLoading,
    isError:    userQuery.isError   || postsQuery.isError,
    error:      userQuery.error     ?? postsQuery.error,
  }
}

// Usage: one hook, full context
function AuthorProfile({ userId }: { userId: number }) {
  const { user, posts, postCount, isLoading } = useUserWithPosts(userId)
  if (isLoading) return <ProfileSkeleton />
  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{postCount} posts</p>
      <PostGrid posts={posts} />
    </div>
  )
}
```

---

## W — Why It Matters

- When query key structure changes (renaming an endpoint, adding a field), a reusable hook means one file update instead of hunting through every component.
- Hook names document intent: `useActiveProducts()` is more readable than a raw `useQuery` with a complex key in every component. Code becomes self-documenting.
- Reusable hooks can encapsulate `select`, error transformation, retry config, and staleTime — implementation details invisible to consumers. Swap the backend URL or response shape in one place.

---

## I — Interview Q&A

### Q: Why should `useQuery` calls be extracted into custom hooks?

**A:** Extracting `useQuery` into a named hook (`useUser`, `useOrders`) provides: (1) **Single source of truth** — query key, query function, staleTime, and select logic live in one place. Refactoring touches one file, not every component. (2) **Readable component code** — `useUser(id)` communicates intent instantly; a raw `useQuery` with a complex key leaks implementation. (3) **Encapsulation** — consumers don't know whether data comes from REST, GraphQL, or cache. You can swap the implementation without touching components. (4) **Composability** — hooks can call other hooks, building a dependency graph declaratively. (5) **Type safety** — the return type is inferred once in the hook definition and propagates everywhere.

---

## C — Common Pitfalls + Fix

### ❌ Copy-pasting queryKey strings across files

```tsx
// ❌ Same key in three places — one typo and invalidation breaks silently
// ProductList.tsx
useQuery({ queryKey: ['products', 'list'], queryFn: getProducts })

// ProductForm.tsx (mutation)
qc.invalidateQueries({ queryKey: ['product', 'list'] })  // ❌ typo: 'product' not 'products'
// Invalidation silently misses

// ProductSearch.tsx
useQuery({ queryKey: ['products', 'list'], queryFn: searchProducts })
// Different queryFn, same key → wrong data served from cache ❌

// ✅ One hook, one source of truth
// hooks/queries/useProducts.ts
export function useProducts() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn:  ({ signal }) => getProducts(signal),
    staleTime: 1000 * 60 * 5,
  })
}
// ProductList.tsx, ProductSearch.tsx, ProductForm.tsx all import useProducts ✅
// Invalidation uses productKeys.list() — never a raw string ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useNotifications` hook that returns unread count, marks all as read (via `setQueryData`), and exposes `isLoading` + `error`.

### Solution

```tsx
// query-keys/notifications.ts
export const notifKeys = {
  all:    ()           => ['notifications']              as const,
  list:   (userId: number) => ['notifications', userId, 'list'] as const,
  unread: (userId: number) => ['notifications', userId, 'unread'] as const,
}

// api/notifications.ts
export interface Notification {
  id:     number
  text:   string
  read:   boolean
  sentAt: string
}

export async function fetchNotifications(
  userId: number, signal: AbortSignal
): Promise<Notification[]> {
  const res = await fetch(`/api/users/${userId}/notifications`, { signal })
  if (!res.ok) throw new Error(`fetchNotifications: ${res.status}`)
  return res.json()
}

export async function markAllReadAPI(userId: number): Promise<void> {
  const res = await fetch(`/api/users/${userId}/notifications/read-all`, { method: 'POST' })
  if (!res.ok) throw new Error(`markAllRead: ${res.status}`)
}

// hooks/queries/useNotifications.ts
function useNotifications(userId: number) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey:  notifKeys.list(userId),
    queryFn:   ({ signal }) => fetchNotifications(userId, signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
    select: notifications => ({
      all:         notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    }),
  })

  async function markAllRead() {
    // Optimistic update
    qc.setQueryData<Notification[]>(notifKeys.list(userId), old =>
      old?.map(n => ({ ...n, read: true })) ?? []
    )
    try {
      await markAllReadAPI(userId)
      qc.invalidateQueries({ queryKey: notifKeys.list(userId) })
    } catch (err) {
      qc.invalidateQueries({ queryKey: notifKeys.list(userId) })
      throw err
    }
  }

  return {
    notifications: query.data?.all         ?? [],
    unreadCount:   query.data?.unreadCount ?? 0,
    isLoading:     query.isLoading,
    error:         query.error as Error | null,
    markAllRead,
  }
}

function NotificationBell({ userId }: { userId: number }) {
  const { unreadCount, notifications, markAllRead, isLoading } = useNotifications(userId)
  return (
    <div>
      <button onClick={markAllRead} aria-label={`${unreadCount} unread notifications`}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {!isLoading && (
        <ul>
          {notifications.map(n => (
            <li key={n.id} style={{ fontWeight: n.read ? 'normal' : 'bold' }}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---

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

# 6 — placeholderData vs initialData

---

## T — TL;DR

Both provide data while a query is loading. **`initialData`** seeds the cache as if a fetch succeeded — it counts as real data and affects staleTime. **`placeholderData`** is a temporary display value that never enters the cache and never marks the query as fresh.

---

## K — Key Concepts

```
── Key differences ────────────────────────────────────────────────────────────

                      placeholderData       initialData
─────────────────     ─────────────────     ──────────────────────
Goes into cache?      NO                    YES
isPlaceholderData?    true while showing    —
Marks query fresh?    NO                    YES (if initialDataUpdatedAt set)
staleTime affected?   NO                    YES
Use case              Skeleton / fake UX    Data from parent query / SSR
```

```tsx
import { keepPreviousData } from '@tanstack/react-query'

// ── placeholderData: show something while loading ─────────────────────────
// Use case 1: keepPreviousData — no flash between paginated pages
function PaginatedList() {
  const [page, setPage] = useState(1)
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['list', page],
    queryFn:  ({ signal }) => fetchPage(page, signal),
    placeholderData: keepPreviousData,   // show old page while new loads ✅
  })
  return (
    <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      <ItemGrid items={data?.items ?? []} />
      <button disabled={isPlaceholderData || !data?.hasNext}
              onClick={() => setPage(p => p + 1)}>
        Next
      </button>
    </div>
  )
}

// Use case 2: static placeholder — show a skeleton shape with fake data
function UserCard({ userId }: { userId: number }) {
  const { data: user, isPlaceholderData } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    placeholderData: { id: userId, name: 'Loading…', email: '' } as User,
  })
  return (
    <div style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      <h3>{user!.name}</h3>
      <p>{user!.email}</p>
    </div>
  )
}
```

```tsx
// ── initialData: seed cache from known data ───────────────────────────────
// Use case 1: list → detail — parent list already has the item
function ProductDetail({ productId }: { productId: number }) {
  const qc = useQueryClient()

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn:  ({ signal }) => getProduct(productId, signal),
    initialData: () => {
      // Try to find this product in the already-fetched list
      const list = qc.getQueryData<Product[]>(['products', 'list'])
      return list?.find(p => p.id === productId)
      // If found: shows data instantly, no loading state ✅
      // If not found: returns undefined → normal loading state
    },
    initialDataUpdatedAt: () => {
      // Tell TanStack Query when the list was last fetched
      // so it knows if this initialData is stale
      return qc.getQueryState(['products', 'list'])?.dataUpdatedAt
    },
  })

  return <div>{product?.name ?? 'Loading…'}</div>
}

// Use case 2: SSR — seed with server-fetched data
function SSRProductPage({ serverProduct }: { serverProduct: Product }) {
  const { data: product } = useQuery({
    queryKey: ['product', serverProduct.id],
    queryFn:  ({ signal }) => getProduct(serverProduct.id, signal),
    initialData: serverProduct,         // from server render
    initialDataUpdatedAt: Date.now(),   // treat as fresh now
  })
  return <ProductView product={product!} />
}
```

---

## W — Why It Matters

- `keepPreviousData` is the UX fix for any paginated or filtered list — without it, every page change shows a loading state even though you already have related data. With it, the old page stays visible (dimmed) while the new page loads.
- `initialData` from a parent query is a performance optimization: navigating from a product list to a product detail can show the name/price immediately (from list cache) while the detail fetch completes in the background.
- Setting `initialDataUpdatedAt` is critical — without it, `initialData` is treated as perfectly fresh (`staleTime` measured from `Infinity`) and TanStack Query may never refetch the real data.

---

## I — Interview Q&A

### Q: What is the difference between `placeholderData` and `initialData`?

**A:** Both show data before the fetch completes, but they're used for different purposes and have different cache semantics. `placeholderData` is a temporary display value — it's never stored in the cache, doesn't affect staleTime, and triggers `isPlaceholderData: true` so you can dim or style the placeholder differently. It's for UX: showing something meaningful while loading. `initialData` goes into the cache as if a fetch succeeded — it affects staleTime and `dataUpdatedAt`. Use it when you already have the data from another query (parent list, SSR) and want to avoid a loading state. Always set `initialDataUpdatedAt` to tell TanStack Query how old the initial data is, so it can decide whether to immediately refetch or wait for the staleTime to expire.

---

## C — Common Pitfalls + Fix

### ❌ Using `initialData` without `initialDataUpdatedAt` — prevents background refresh

```tsx
// ❌ initialData without updatedAt — treated as fresh forever
function UserDetailBad({ userId }: { userId: number }) {
  const qc = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    initialData: qc.getQueryData<User[]>(['users'])?.find(u => u.id === userId),
    // Without initialDataUpdatedAt: treated as if fetched at Infinity
    // → staleTime never expires from this timestamp → no background refetch ❌
  })
}

// ✅ Set initialDataUpdatedAt to inherit staleness from the source query
function UserDetailGood({ userId }: { userId: number }) {
  const qc = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn:  ({ signal }) => getUser(userId, signal),
    initialData: () =>
      qc.getQueryData<User[]>(['users'])?.find(u => u.id === userId),
    initialDataUpdatedAt: () =>
      qc.getQueryState(['users'])?.dataUpdatedAt,   // ✅ inherits list's timestamp
    // If list is stale → initialData is stale → background refetch fires ✅
  })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductDetailPage` that uses `initialData` from the product list cache. Show "quick" vs "full" data states with appropriate UI feedback.

### Solution

```tsx
interface ProductSummary { id: number; name: string; price: number }
interface ProductDetail  extends ProductSummary { description: string; stock: number; images: string[] }

function useProductDetail(productId: number) {
  const qc = useQueryClient()

  return useQuery({
    queryKey: ['product', productId, 'detail'],
    queryFn:  ({ signal }) => fetchProductDetail(productId, signal),
    staleTime: 1000 * 60 * 5,
    // Seed from list cache for instant display
    initialData: (): ProductDetail | undefined => {
      const list = qc.getQueryData<ProductSummary[]>(['products', 'list'])
      const found = list?.find(p => p.id === productId)
      // Can only use if it has all required ProductDetail fields
      // In practice: cast with a "partial detail" flag or use placeholderData instead
      return found ? { ...found, description: '', stock: 0, images: [] } : undefined
    },
    initialDataUpdatedAt: () =>
      qc.getQueryState(['products', 'list'])?.dataUpdatedAt,
  })
}

function ProductDetailPage({ productId }: { productId: number }) {
  const { data: product, isLoading, isFetching } = useProductDetail(productId)

  if (isLoading) return <ProductDetailSkeleton />

  const isQuickData = !product?.description   // initialData has empty description

  return (
    <article>
      {isFetching && <RefreshIndicator />}
      <h1>{product!.name}</h1>
      <p className="price">${product!.price}</p>
      {isQuickData ? (
        <p className="loading-detail">Loading full details…</p>
      ) : (
        <>
          <p>{product!.description}</p>
          <p>In stock: {product!.stock}</p>
          <ImageGallery images={product!.images} />
        </>
      )}
    </article>
  )
}
```

---

---

# 7 — Prefetching

---

## T — TL;DR

**Prefetching** warms the cache before the user navigates to a page or component. When they arrive, data is already cached — zero loading state. Use `queryClient.prefetchQuery` on hover, route change, or app init.

---

## K — Key Concepts

```tsx
import { useQueryClient } from '@tanstack/react-query'

// ── prefetchQuery: load into cache before component mounts ────────────────
const qc = useQueryClient()

// Basic prefetch — resolves when data is in cache
await qc.prefetchQuery({
  queryKey: ['product', 42],
  queryFn:  ({ signal }) => getProduct(42, signal),
  staleTime: 1000 * 60 * 5,  // don't re-prefetch if already fresh
})
// Now ['product', 42] is in cache.
// When <ProductPage productId={42} /> mounts — no loading state ✅
```

```tsx
// ── Prefetch on hover: anticipate navigation ──────────────────────────────
function ProductLink({ product }: { product: ProductSummary }) {
  const qc = useQueryClient()

  function handleMouseEnter() {
    qc.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn:  ({ signal }) => getProductDetail(product.id, signal),
      staleTime: 1000 * 60 * 5,
    })
    // By the time the user clicks and the page renders: data is in cache ✅
  }

  return (
    <a
      href={`/products/${product.id}`}
      onMouseEnter={handleMouseEnter}   // 100–200ms head start ✅
      onFocus={handleMouseEnter}        // keyboard users ✅
    >
      {product.name}
    </a>
  )
}
```

```tsx
// ── Prefetch next page for pagination ────────────────────────────────────
function PaginatedProducts() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['products', { page }],
    queryFn:  ({ signal }) => fetchProductsPage(page, signal),
    placeholderData: keepPreviousData,
  })

  // Prefetch the next page while current page is displayed
  useEffect(() => {
    if (data?.hasNextPage) {
      qc.prefetchQuery({
        queryKey: ['products', { page: page + 1 }],
        queryFn:  ({ signal }) => fetchProductsPage(page + 1, signal),
      })
    }
  }, [page, data?.hasNextPage, qc])

  return (
    <div>
      <ProductGrid products={data?.items ?? []} />
      <button onClick={() => setPage(p => p + 1)}
              disabled={!data?.hasNextPage}>
        Next →
      </button>
    </div>
  )
}
```

```tsx
// ── Prefetch in route loader (React Router v6 / Next.js) ──────────────────
// React Router: data loader runs before component mounts
export async function productLoader({ params }: LoaderArgs) {
  await queryClient.prefetchQuery({
    queryKey: productKeys.detail(Number(params.id)),
    queryFn:  ({ signal }) => getProduct(Number(params.id), signal),
    staleTime: 1000 * 60 * 5,
  })
  return null  // data is in cache — component useQuery call hits cache ✅
}

// Component: no loading state when accessed via loader-prefetched route
function ProductPage() {
  const { id } = useParams()
  const { data: product } = useQuery({
    queryKey: productKeys.detail(Number(id)),
    queryFn:  ({ signal }) => getProduct(Number(id!), signal),
    staleTime: 1000 * 60 * 5,
  })
  return <ProductView product={product!} />  // data guaranteed in cache ✅
}
```

---

## W — Why It Matters

- Prefetch on hover gives a 150–300ms head start — for most API responses this is enough to eliminate the loading state entirely, making navigation feel instant.
- Prefetching the next pagination page means "Next" button clicks never show a spinner — the page is already cached when the user clicks.
- `staleTime` in `prefetchQuery` prevents wasteful re-prefetching: if the data is still fresh, the prefetch is a no-op.

---

## I — Interview Q&A

### Q: What is prefetching in TanStack Query and when should you use it?

**A:** Prefetching is loading data into the cache before the component that needs it mounts — so when that component renders, it reads from cache instead of showing a loading state. Use it when: (1) You can predict the user's next action with reasonable confidence (hovering a link, reaching the end of a page). (2) Data is needed for a route and you have a route loader that runs before the component. (3) You want to preload next page data in pagination so clicks feel instant. The key option is `staleTime` in `prefetchQuery` — if fresh data is already in cache, the prefetch is skipped. Without it, you'd re-fetch on every hover even if the data is seconds old.

---

## C — Common Pitfalls + Fix

### ❌ Prefetching without `staleTime` — re-fetches on every hover

```tsx
// ❌ No staleTime in prefetch — fires a new request every time the user hovers
function ProductLinkBad({ id }: { id: number }) {
  const qc = useQueryClient()
  return (
    <a href={`/p/${id}`}
       onMouseEnter={() => qc.prefetchQuery({
         queryKey: ['product', id],
         queryFn:  ({ signal }) => getProduct(id, signal),
         // No staleTime → always refetches → network spam on every hover ❌
       })}>
      View
    </a>
  )
}

// ✅ staleTime prevents redundant prefetches
function ProductLinkGood({ id }: { id: number }) {
  const qc = useQueryClient()
  function handleHover() {
    qc.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn:  ({ signal }) => getProduct(id, signal),
      staleTime: 1000 * 60 * 5,   // ✅ skip if data fetched in last 5 min
    })
  }
  return (
    <a href={`/p/${id}`} onMouseEnter={handleHover} onFocus={handleHover}>
      View
    </a>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useNextPagePrefetch` hook that automatically prefetches the next page whenever the current page data arrives.

### Solution

```tsx
interface PageResult<T> { items: T[]; totalPages: number; currentPage: number }

function useNextPagePrefetch<T>(
  queryKeyBase: readonly unknown[],
  queryFn: (page: number, signal: AbortSignal) => Promise<PageResult<T>>,
  currentPage: number,
  currentData: PageResult<T> | undefined
) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!currentData) return
    const hasNextPage = currentPage < currentData.totalPages
    if (!hasNextPage) return

    const nextPage = currentPage + 1
    qc.prefetchQuery({
      queryKey:  [...queryKeyBase, { page: nextPage }],
      queryFn:   ({ signal }) => queryFn(nextPage, signal),
      staleTime: 1000 * 60,   // skip if next page already fresh ✅
    })
  }, [currentPage, currentData, qc, queryKeyBase, queryFn])
}

// Usage
function PostsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page }],
    queryFn:  ({ signal }) => fetchPostsPage(page, signal),
    placeholderData: keepPreviousData,
  })

  // Prefetch next page automatically whenever current page data arrives ✅
  useNextPagePrefetch(['posts'], fetchPostsPage, page, data)

  return (
    <div>
      {isLoading ? <Spinner /> : <PostGrid posts={data?.items ?? []} />}
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={!data || page >= data.totalPages}
      >
        Next → {/* instant — already prefetched ✅ */}
      </button>
    </div>
  )
}
```

---

---

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

# 9 — Maintainable Query Organization

---

## T — TL;DR

A maintainable query architecture has three layers: **API functions** (fetch + throw on error), **query key factories** (hierarchical, co-located), and **custom query hooks** (combine key + fn + options). Components import hooks, never raw `useQuery` with inline keys.

---

## K — Key Concepts

```
── Three-layer architecture ──────────────────────────────────────────────────

src/
  api/                       ← Layer 1: Pure async functions (no React)
    users.ts                 → getUser, getUsers, patchUser
    products.ts              → getProduct, getProducts
    orders.ts                → getOrders, createOrder

  query-keys/                ← Layer 2: Key factories (no React, no fetch)
    users.ts                 → userKeys.all(), .detail(id), .list(filters)
    products.ts              → productKeys
    orders.ts                → orderKeys

  hooks/queries/             ← Layer 3: Custom query hooks (React + TQ)
    useUser.ts               → useUser(id), useUsers(filters)
    useProducts.ts           → useProducts(filters), useProductDetail(id)
    useOrders.ts             → useOrders(userId), useOrderDetail(id)

  components/                ← Consumers: import hooks only
    UserCard.tsx             → import { useUser }
    ProductList.tsx          → import { useProducts }
```

```tsx
// ── Layer 1: api/users.ts ─────────────────────────────────────────────────
export interface User { id: number; name: string; email: string; role: string }

export async function getUser(id: number, signal: AbortSignal): Promise<User> {
  const res = await fetch(`/api/users/${id}`, { signal })
  if (!res.ok) throw new Error(`getUser(${id}): ${res.status}`)
  return res.json()
}

export async function getUsers(
  filters: { role?: string; active?: boolean } = {},
  signal: AbortSignal
): Promise<User[]> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined))
  )
  const res = await fetch(`/api/users?${params}`, { signal })
  if (!res.ok) throw new Error(`getUsers: ${res.status}`)
  return res.json()
}
```

```tsx
// ── Layer 2: query-keys/users.ts ──────────────────────────────────────────
interface UserListFilters { role?: string; active?: boolean }

export const userKeys = {
  all:     ()                          => ['users']                        as const,
  lists:   ()                          => [...userKeys.all(), 'list']      as const,
  list:    (filters: UserListFilters)  => [...userKeys.lists(), filters]   as const,
  details: ()                          => [...userKeys.all(), 'detail']    as const,
  detail:  (id: number)               => [...userKeys.details(), id]       as const,
}
```

```tsx
// ── Layer 3: hooks/queries/useUser.ts ─────────────────────────────────────
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userKeys }  from '../../query-keys/users'
import { getUser, getUsers, User, UserListFilters } from '../../api/users'

export function useUser(userId: number | null) {
  return useQuery({
    queryKey:  userKeys.detail(userId ?? 0),
    queryFn:   ({ signal }) => getUser(userId!, signal),
    enabled:   userId !== null && userId > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUsers(filters: UserListFilters = {}) {
  return useQuery({
    queryKey:  userKeys.list(filters),
    queryFn:   ({ signal }) => getUsers(filters, signal),
    staleTime: 1000 * 60 * 2,
  })
}

export function useActiveUsers() {
  return useQuery({
    queryKey:  userKeys.list({ active: true }),
    queryFn:   ({ signal }) => getUsers({ active: true }, signal),
    staleTime: 1000 * 60 * 2,
    select:    users => users.filter(u => u.active),
  })
}

// Invalidation helpers: co-located with the keys
export function useUserInvalidation() {
  const qc = useQueryClient()
  return {
    invalidateUser:  (id: number) => qc.invalidateQueries({ queryKey: userKeys.detail(id) }),
    invalidateAll:   ()           => qc.invalidateQueries({ queryKey: userKeys.all() }),
  }
}
```

```tsx
// ── File organization for scale ────────────────────────────────────────────
// Option A: one file per resource (small–medium apps)
// hooks/queries/useUser.ts    — all user-related hooks
// hooks/queries/useProduct.ts — all product-related hooks

// Option B: feature-based (large apps)
// features/users/hooks/useUser.ts
// features/products/hooks/useProduct.ts
// features/orders/hooks/useOrder.ts

// Option C: co-located with components (very small apps)
// components/UserCard/useUserCard.ts  — query hook lives next to its component

// Rule of thumb:
// Start with Option A. Move to B when features have distinct teams/domains.
```

---

## W — Why It Matters

- The three-layer architecture decouples concerns: the API layer doesn't know about React, the key factory doesn't know about queries, and the hook layer assembles them. Each is independently testable and replaceable.
- When an endpoint changes (URL, response shape), only Layer 1 changes — the key factory and hook are untouched. Components using the hook don't change at all.
- Co-locating invalidation helpers in the query hook file means mutations can import `useUserInvalidation` and invalidate precisely without knowing key structure.

---

## I — Interview Q&A

### Q: How would you organize TanStack Query code in a medium-to-large React application?

**A:** Three layers: (1) **API layer** (`src/api/`) — pure async functions that fetch data and throw on non-2xx. No React, no TanStack Query imports. Testable with just a mock fetch. (2) **Query key factories** (`src/query-keys/`) — plain objects of functions that return typed key arrays. No React, no imports except TypeScript interfaces. Ensure every usage of a key goes through the factory. (3) **Custom query hooks** (`src/hooks/queries/`) — combine the API function and key factory into a `useQuery` call with configured options. Export one hook per logical query, plus invalidation helpers. Components import only from Layer 3 and never use raw `useQuery` with inline keys. This means query key changes, endpoint migrations, and config tuning all happen in one place.

---

## C — Common Pitfalls + Fix

### ❌ Mixing all three layers into one component file

```tsx
// ❌ Component owns everything: key, fetch, transform, options
function ProductPageMessy({ id }: { id: number }) {
  // Key defined inline — can't reuse for invalidation ❌
  // Fetch defined inline — can't test without React ❌
  // Options scattered — no central config ❌
  const { data } = useQuery({
    queryKey: ['product', id, 'detail'],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/products/${id}`, { signal })
      if (!res.ok) throw new Error(res.statusText)
      const raw = await res.json()
      return { id: raw.product_id, name: raw.product_name, price: raw.price_usd }
    },
    staleTime: 300_000,
    retry: 2,
  })
  return <div>{data?.name}</div>
}

// ✅ Three layers — component is a thin consumer
// api/products.ts
async function getProductDetail(id: number, signal: AbortSignal): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}`, { signal })
  if (!res.ok) throw new Error(`getProductDetail(${id}): ${res.status}`)
  const raw = await res.json()
  return { id: raw.product_id, name: raw.product_name, price: raw.price_usd }
}

// hooks/queries/useProduct.ts
function useProductDetail(id: number) {
  return useQuery({
    queryKey:  productKeys.detail(id),
    queryFn:   ({ signal }) => getProductDetail(id, signal),
    staleTime: 1000 * 60 * 5,
    retry:     2,
  })
}

// components/ProductPage.tsx
function ProductPageClean({ id }: { id: number }) {
  const { data: product, isLoading } = useProductDetail(id)   // ✅ thin consumer
  if (isLoading) return <ProductSkeleton />
  return <div>{product?.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design the complete three-layer architecture for an `Order` resource: API layer, key factory, and three hooks: `useOrders`, `useOrderDetail`, and `useOrderInvalidation`.

### Solution

```tsx
// ── Layer 1: api/orders.ts ────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export interface OrderSummary { id: number; total: number; status: OrderStatus; createdAt: string }
export interface OrderDetail extends OrderSummary {
  items:       { productId: number; name: string; qty: number; price: number }[]
  shippingAddr: string
  trackingCode: string | null
}
export interface OrderFilters { status?: OrderStatus; page?: number; limit?: number }

export async function fetchOrders(
  userId: number, filters: OrderFilters, signal: AbortSignal
): Promise<{ orders: OrderSummary[]; totalPages: number }> {
  const params = new URLSearchParams({ userId: String(userId), ...filters as Record<string,string> })
  const res = await fetch(`/api/orders?${params}`, { signal })
  if (!res.ok) throw new Error(`fetchOrders: ${res.status}`)
  return res.json()
}

export async function fetchOrderDetail(
  orderId: number, signal: AbortSignal
): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${orderId}`, { signal })
  if (!res.ok) throw new Error(`fetchOrderDetail(${orderId}): ${res.status}`)
  return res.json()
}

// ── Layer 2: query-keys/orders.ts ─────────────────────────────────────────
export const orderKeys = {
  all:     ()                                       => ['orders']                          as const,
  lists:   ()                                       => [...orderKeys.all(), 'list']        as const,
  list:    (userId: number, filters: OrderFilters)  => [...orderKeys.lists(), userId, filters] as const,
  details: ()                                       => [...orderKeys.all(), 'detail']     as const,
  detail:  (id: number)                             => [...orderKeys.details(), id]       as const,
}

// ── Layer 3: hooks/queries/useOrders.ts ───────────────────────────────────
function useOrders(userId: number, filters: OrderFilters = {}) {
  return useQuery({
    queryKey:  orderKeys.list(userId, filters),
    queryFn:   ({ signal }) => fetchOrders(userId, filters, signal),
    enabled:   userId > 0,
    staleTime: 1000 * 60,           // 1 min — order status can change
    placeholderData: keepPreviousData,  // smooth pagination
  })
}

function useOrderDetail(orderId: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey:  orderKeys.detail(orderId ?? 0),
    queryFn:   ({ signal }) => fetchOrderDetail(orderId!, signal),
    enabled:   orderId !== null,
    staleTime: 1000 * 30,          // 30s — tracking updates frequently
    // Seed from list cache for instant display
    initialData: (): OrderDetail | undefined => {
      const allLists = qc.getQueriesData<{ orders: OrderSummary[] }>({
        queryKey: orderKeys.lists()
      })
      for (const [, data] of allLists) {
        const found = data?.orders.find(o => o.id === orderId)
        if (found) return { ...found, items: [], shippingAddr: '', trackingCode: null }
      }
    },
    initialDataUpdatedAt: () => {
      const states = qc.getQueriesData({ queryKey: orderKeys.lists() })
      return states[0]?.[1] ? qc.getQueryState(states[0][0])?.dataUpdatedAt : undefined
    },
  })
}

function useOrderInvalidation() {
  const qc = useQueryClient()
  return {
    invalidateOrder:  (id: number) => qc.invalidateQueries({ queryKey: orderKeys.detail(id) }),
    invalidateOrders: (userId: number) =>
      qc.invalidateQueries({ queryKey: orderKeys.list(userId, {}) }),
    invalidateAll:    () => qc.invalidateQueries({ queryKey: orderKeys.all() }),
  }
}

// ── Component: thin consumer ──────────────────────────────────────────────
function OrderList({ userId }: { userId: number }) {
  const [filters, setFilters] = useState<OrderFilters>({ page: 1 })
  const { data, isLoading, isFetching } = useOrders(userId, filters)

  return (
    <div style={{ opacity: isFetching && !isLoading ? 0.7 : 1 }}>
      {isLoading ? <OrdersSkeleton /> : (
        <ul>{data?.orders.map(o => <OrderRow key={o.id} order={o} />)}</ul>
      )}
    </div>
  )
}
```

---

## ✅ Day 9 Complete — Query Workflows and Data Shaping

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Dependent Queries | ☐ |
| 2 | Parallel Queries + useQueries | ☐ |
| 3 | Conditional Queries with enabled | ☐ |
| 4 | Reusable Query Hooks | ☐ |
| 5 | select — Data Transformation | ☐ |
| 6 | placeholderData vs initialData | ☐ |
| 7 | Prefetching | ☐ |
| 8 | Background Refetching + Deduplication | ☐ |
| 9 | Maintainable Query Organization | ☐ |

---

## 🗺️ One-Page Mental Model — Day 9

```
DEPENDENT QUERIES
  enabled: !!prerequisite.data?.id → gate the second query
  Replaces useEffect sequential chains with declarative dependency graph
  Each query in chain is independently cached → re-runs only its stale step
  Aggregate loading: check all isLoading flags | Aggregate error: check all isError

PARALLEL QUERIES + useQueries
  Multiple useQuery calls: static parallel (known count at compile time)
  useQueries: dynamic parallel (array of IDs, unknown count)
  combine: reduce array of results into one named object → clean consumer API
  ❌ useQuery in a loop: violates hooks rules → use useQueries

CONDITIONAL QUERIES WITH enabled
  enabled: false → status='pending', no network request
  enabled: !!value → don't fetch until value exists
  isLoading: pending + fetching | isPending: pending (includes disabled)
  Check the enabled condition yourself for the "nothing selected" empty state
  Patterns: auth-gate, search min-length, on-demand load, dependent guard

REUSABLE QUERY HOOKS
  Extract: useUser(id), useProducts(filters) — one hook per logical query
  Components declare intent, not implementation
  Co-locate: key + queryFn + options + select in one hook file
  Co-locate invalidation helpers: useUserInvalidation() in same file
  One file update → all consumers updated automatically

select — DATA TRANSFORMATION
  select runs after fetch → transforms data before returning to component
  Component only re-renders if selected value changes (structural sharing on result)
  Multiple subscribers to same key, each with different select → one request
  Stable select function: useCallback if it closes over changing variables
  Use for: API→app shape normalization, filtering, derived values, single-item from list

placeholderData vs initialData
  placeholderData: NOT cached, isPlaceholderData=true, only for UX display
  initialData: goes INTO cache, affects staleTime, treated as real data
  keepPreviousData: no flash between page/filter changes (pagination pattern)
  initialDataUpdatedAt: REQUIRED with initialData → tells TQ how old the seed is
  Use initialData for: parent list → detail seeding, SSR data hydration

PREFETCHING
  prefetchQuery: warm cache before component mounts
  Hover/focus on link → prefetch detail → instant navigation ✅
  Prefetch next page in useEffect after current page data arrives
  staleTime in prefetchQuery: skip if already fresh → no redundant requests
  Route loaders (React Router/Next.js): prefetch before render → guaranteed no loading state

BACKGROUND REFETCHING + DEDUPLICATION
  isFetching=true, isLoading=false → background refetch (show subtle ↻ indicator)
  isLoading=true → initial load (show skeleton)
  Dedup: N components, same queryKey → 1 request, all share the response
  Same queryKey + different queryFns → first queryFn wins (data inconsistency bug)
  → Always use different keys for different data shapes
  refetch() → manual background refetch → isFetching=true, no skeleton

MAINTAINABLE QUERY ORGANIZATION
  Layer 1: api/ — pure async functions, throw on !res.ok, accept signal
  Layer 2: query-keys/ — key factories, no React, hierarchical arrays
  Layer 3: hooks/queries/ — custom hooks combining key + fn + options
  Components: import hooks only, never inline useQuery with raw keys
  Co-locate invalidation with query hooks (not in mutation files)
  Start: one file per resource. Scale to: one folder per feature domain.
```

> **Your next action:** Find a component with two `useQuery` calls where the second depends on the first. Check: does the second have `enabled: !!firstQuery.data?.id`? If not, add it. Then extract both into a single `useXWithY` custom hook. Ten minutes of real refactoring locks in this entire day's content.

> "Doing one small thing beats opening a feed."