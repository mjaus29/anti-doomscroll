# 2 — Avoiding Redundant State

---

## T — TL;DR

**Redundant state** is state you can compute from existing props or state. If it can be derived, don't store it — compute it during render. Storing derivable values creates sync bugs: the derived state goes stale when the source changes.

---

## K — Key Concepts

```tsx
// ── Classic redundant state bug ───────────────────────────────────────────
interface Item { id: number; name: string; price: number; qty: number }

// ❌ total is redundant — computable from items
function Cart() {
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)    // ❌ redundant

  function addItem(item: Item) {
    setItems(prev => [...prev, item])
    setTotal(prev => prev + item.price * item.qty)   // must remember to sync ❌
  }
  function removeItem(id: number) {
    const item = items.find(i => i.id === id)!
    setItems(prev => prev.filter(i => i.id !== id))
    setTotal(prev => prev - item.price * item.qty)   // easy to forget or get wrong ❌
  }
  // Total can drift out of sync with items ❌
}

// ✅ Derive total during render — always in sync
function CartFixed() {
  const [items, setItems] = useState<Item[]>([])
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)  // computed ✅

  function addItem(item: Item) {
    setItems(prev => [...prev, item])   // one update — total follows automatically ✅
  }
  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id))   // total correct automatically ✅
  }
}
```

```tsx
// ── Full name from first + last ───────────────────────────────────────────
// ❌ fullName is redundant
const [firstName, setFirstName] = useState('')
const [lastName,  setLastName]  = useState('')
const [fullName,  setFullName]  = useState('')   // ❌ must sync manually

// ✅ Derive during render
const [firstName, setFirstName] = useState('')
const [lastName,  setLastName]  = useState('')
const fullName = `${firstName} ${lastName}`.trim()   // always accurate ✅
```

```tsx
// ── "Mirror state" anti-pattern ───────────────────────────────────────────
// ❌ Copying prop into state — prop changes don't update the state copy
interface ListProps { initialItems: string[] }
function List({ initialItems }: ListProps) {
  const [items, setItems] = useState(initialItems)   // ❌ copy of prop

  // If parent changes initialItems, state won't update
  // (state is initialised once — prop change doesn't re-init)
}

// ✅ Only copy prop into state if you NEED to edit it locally
// AND name it clearly to signal it starts as the prop value:
function ListEditable({ initialItems }: ListProps) {
  const [items, setItems] = useState(initialItems)   // intentional: editing locally ✅
  // Document: state diverges intentionally from prop after first render
}

// ✅ If you only need to display it: just use the prop directly
function ListDisplay({ items }: { items: string[] }) {
  return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
}
```

---

## W — Why It Matters

- Redundant state is the leading cause of "the total shows the wrong amount" type bugs — you update one value and forget to update the derived one. Removing it makes the bug physically impossible.
- The "mirror prop to state" anti-pattern is extremely common for beginners — they `useState(props.value)` and wonder why the component doesn't update when the parent passes a new value. State only initialises once.
- Every `useState` call you remove is one fewer thing to synchronise, one fewer test case, one fewer stale-closure risk.

---

## I — Interview Q&A

### Q: What is redundant state and why is it dangerous?

**A:** Redundant state is a value stored in `useState` that can be computed directly from other state or props. It's dangerous because it creates two sources of truth that must be kept in sync manually. Every update to the source value requires a matching update to the derived value — miss one and the UI shows inconsistent data. The fix is to remove the redundant state and compute the value during render instead. Since render runs on every state change, derived values are always accurate. The only exception: computations that are genuinely expensive to repeat on every render, where `useMemo` (Day 4) is the right tool — not extra state.

---

## C — Common Pitfalls + Fix

### ❌ Storing filter results as state instead of deriving them

```tsx
interface Product { id: number; name: string; category: string; price: number }

// ❌ filteredProducts is redundant — computable from products + filter
function ProductPage() {
  const [products,         setProducts]         = useState<Product[]>([])
  const [categoryFilter,   setCategoryFilter]   = useState('all')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])   // ❌

  function handleFilter(cat: string) {
    setCategoryFilter(cat)
    setFilteredProducts(cat === 'all' ? products : products.filter(p => p.category === cat))
    // Bug: if products change (add/remove), filteredProducts goes stale ❌
  }
}

// ✅ Derive — always in sync with both products and filter
function ProductPageFixed() {
  const [products,       setProducts]       = useState<Product[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredProducts = categoryFilter === 'all'
    ? products
    : products.filter(p => p.category === categoryFilter)
  // Always correct — recomputed on every render ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Audit this component and remove all redundant state. A user list with search, filter by status, and a count display.

### Solution

```tsx
interface User { id: number; name: string; email: string; active: boolean }

// ❌ Before: three redundant state variables
function UserListBad() {
  const [users,         setUsers]         = useState<User[]>([])
  const [search,        setSearch]        = useState('')
  const [showActive,    setShowActive]    = useState(false)
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])  // ❌ redundant
  const [userCount,     setUserCount]     = useState(0)           // ❌ redundant
  const [activeCount,   setActiveCount]   = useState(0)           // ❌ redundant
}

// ✅ After: only genuine state, rest derived
function UserListGood() {
  const [users,      setUsers]      = useState<User[]>([])
  const [search,     setSearch]     = useState('')
  const [showActive, setShowActive] = useState(false)

  // Derived during render — always correct
  const filtered = users
    .filter(u => !showActive || u.active)
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  const totalCount  = users.length            // derived ✅
  const activeCount = users.filter(u => u.active).length   // derived ✅

  return (
    <div>
      <p>{activeCount} active / {totalCount} total</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
      <label>
        <input type="checkbox" checked={showActive} onChange={e => setShowActive(e.target.checked)} />
        Active only
      </label>
      <ul>
        {filtered.map(u => (
          <li key={u.id}>{u.name} — {u.active ? 'Active' : 'Inactive'}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

---
