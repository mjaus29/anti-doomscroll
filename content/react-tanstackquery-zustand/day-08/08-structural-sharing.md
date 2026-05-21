# 8 — Structural Sharing

---

## T — TL;DR

**Structural sharing** means TanStack Query reuses the same JavaScript object references for unchanged parts of the response. If a refetch returns the same data, the component does NOT re-render. Only changed parts get new references — React's `===` comparison catches unchanged props and bails out.

---

## K — Key Concepts

```tsx
// ── What structural sharing does ──────────────────────────────────────────
// Without structural sharing:
//   Every fetch → new objects → new references → everything re-renders

// With structural sharing (TanStack Query default):
//   Fetch returns same data → same references kept → no re-renders
//   Fetch returns partially changed data → only changed subtrees get new refs

// Example:
const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob',   active: false },
]

// Refetch returns: only Bob's active changed to true
const newUsers = [
  { id: 1, name: 'Alice', active: true },   // identical to previous
  { id: 2, name: 'Bob',   active: true },   // changed
]

// With structural sharing:
//   newUsers[0] === users[0]   → true  (same reference ✅ — Alice's component doesn't re-render)
//   newUsers[1] === users[1]   → false (new reference — Bob's component re-renders ✅)
```

```tsx
// ── Structural sharing + React.memo ──────────────────────────────────────
const UserRow = memo(function UserRow({ user }: { user: User }) {
  console.log('UserRow render:', user.id)
  return <tr><td>{user.name}</td><td>{user.active ? 'Active' : 'Inactive'}</td></tr>
})

function UserTable() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
  })
  // Background refetch runs — only Bob changed
  // UserRow for Alice: memo receives same reference → skips render ✅
  // UserRow for Bob: memo receives new reference → re-renders ✅
  return (
    <table>
      <tbody>{users.map(u => <UserRow key={u.id} user={u} />)}</tbody>
    </table>
  )
}
```

```tsx
// ── select + structural sharing: precision subscriptions ─────────────────
// Component A: only cares about active user count
function ActiveCount() {
  const { data: count } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active).length,
    // Structural sharing on SELECT result:
    // If count hasn't changed → same primitive → no re-render ✅
  })
  return <p>Active: {count}</p>
}

// Component B: only cares about admin names
function AdminNames() {
  const { data: adminNames } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users
      .filter(u => u.role === 'admin')
      .map(u => u.name),
    // Both components subscribe to ['users'] — ONE network request
    // But each gets its own select transformation ✅
  })
  return <ul>{adminNames?.map(n => <li key={n}>{n}</li>)}</ul>
}
```

```tsx
// ── Disabling structural sharing ──────────────────────────────────────────
// Rare use case: when you intentionally need a new reference on every fetch
useQuery({
  queryKey: ['stream-data'],
  queryFn:  getStreamData,
  structuralSharing: false,   // every fetch = new references = re-render everything
})

// Also accept a custom comparison function (advanced):
useQuery({
  queryKey: ['data'],
  queryFn:  getData,
  structuralSharing: (oldData, newData) => {
    // Return oldData if logically equal, newData if different
    return JSON.stringify(oldData) === JSON.stringify(newData) ? oldData : newData
  },
})
```

---

## W — Why It Matters

- Structural sharing is the reason background refetches don't cause the entire UI to flash — only the components whose data actually changed re-render.
- Combined with `React.memo` and `select`, structural sharing creates surgically precise re-renders: a list of 100 users where only one changed produces exactly one row re-render.
- When a background refetch returns identical data (common when `staleTime` is short and the data doesn't change often), zero re-renders happen. The network request fires but the UI is completely undisturbed.

---

## I — Interview Q&A

### Q: What is structural sharing in TanStack Query and why does it improve performance?

**A:** After a query refetch, TanStack Query deeply compares the new response against the cached data. For any part of the response that is identical (deep equality), it reuses the existing JavaScript object reference instead of using the new one. For parts that changed, it creates new references. This matters because React uses reference equality (`===`) for change detection — `React.memo` and `useMemo` dependencies check if a reference changed. With structural sharing: a background refetch that returns unchanged data produces zero re-renders. A refetch that changes one item in a 100-item list produces one re-render for that item's component, not 100. Without structural sharing, every refetch would produce all-new references, causing every subscriber to re-render regardless of whether their data changed.

---

## C — Common Pitfalls + Fix

### ❌ Expecting structural sharing to work through a select that creates a new array

```tsx
// ❌ select creates a new array reference on every call — even if contents are same
function ActiveUsersBad() {
  const { data: activeUsers } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    select: users => users.filter(u => u.active),
    // [].filter() ALWAYS returns a new array reference ❌
    // Even if the active users haven't changed → new reference → re-render
  })
  // Passes activeUsers to a memo'd child → memo always sees "new" prop → always re-renders ❌
}

// ✅ Structural sharing DOES work on the select result for objects inside the array
// The array itself is new, but the objects inside are stable if unchanged ✅
// For the array reference stability: use a custom selector or useMemo

function ActiveUsersFixed() {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  ({ signal }) => getUsers(signal),
    // No select — keep full data, structural sharing works for objects ✅
  })
  // Filter outside — memo'd child receives stable user objects ✅
  const activeUsers = useMemo(() => allUsers.filter(u => u.active), [allUsers])
  // allUsers reference only changes when TQ detects data changed
  // So activeUsers only recomputes when actual data changes ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Demonstrate structural sharing with a `memo`'d list row: show that only the changed row re-renders after a background refetch that modifies one item.

### Solution

```tsx
interface Product { id: number; name: string; price: number; stock: number }

// Memo'd row — only re-renders when its product reference changes
const ProductRow = memo(function ProductRow({ product }: { product: Product }) {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <tr style={{ background: renderCount.current > 1 ? '#fffbcd' : 'white' }}>
      <td>{product.name}</td>
      <td>${product.price}</td>
      <td>{product.stock}</td>
      <td style={{ fontSize: 11, color: '#888' }}>
        Renders: {renderCount.current}
      </td>
    </tr>
  )
})
// After a background refetch where only product id=2's stock changed:
// → ProductRow for id=1: same object reference → memo bails out → 1 render total ✅
// → ProductRow for id=2: new object reference  → re-renders                    → ✅

function ProductInventoryTable() {
  const qc = useQueryClient()
  const { data: products = [], isFetching } = useQuery({
    queryKey: ['products'],
    queryFn:  ({ signal }) => getProducts(signal),
    staleTime: 0,
  })

  // Simulate a change to product id=2 only
  function simulateStockUpdate() {
    qc.setQueryData<Product[]>(['products'], old => old?.map(p =>
      p.id === 2 ? { ...p, stock: p.stock - 1 } : p   // only product 2 changes
    ) ?? [])
  }

  return (
    <div>
      {isFetching && <p>🔄 Refreshing…</p>}
      <button onClick={simulateStockUpdate}>Sell one of product #2</button>
      <table>
        <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Debug</th></tr></thead>
        <tbody>
          {products.map(p => <ProductRow key={p.id} product={p} />)}
        </tbody>
      </table>
      <p style={{ fontSize: 12 }}>
        Only the row for product #2 should increment its render count ✅
      </p>
    </div>
  )
}
```

---

---
