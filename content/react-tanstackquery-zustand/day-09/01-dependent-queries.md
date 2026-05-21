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
