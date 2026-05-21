
# 📅 Day 3 — React State Architecture

> **Goal:** Structure state correctly from the start — know what to put in state, where to put it, and how to share it cleanly.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 3 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Choosing State Structure | 10 min |
| 2 | Avoiding Redundant State | 10 min |
| 3 | Avoiding Duplicate State | 10 min |
| 4 | Deriving Values During Render | 10 min |
| 5 | Lifting State Up | 12 min |
| 6 | Sharing State Between Components | 10 min |
| 7 | Syncing Sibling State | 10 min |
| 8 | State Colocation | 10 min |
| 9 | Preserving State | 10 min |
| 10 | Resetting State with Key | 10 min |

---

---

# 1 — Choosing State Structure

---

## T — TL;DR

Good state structure means storing the **minimal, non-redundant, non-duplicate set of values** that fully describes your UI. Everything else is derived during render. Bad state structure causes bugs where parts of the UI disagree with each other.

---

## K — Key Concepts

```
── Five principles for state structure ──────────────────────────────────────

1. Group related state   → values that always change together go in one object
2. Avoid contradiction   → two state vars that can disagree = bug waiting to happen
3. Avoid redundancy      → if you can compute it from other state, don't store it
4. Avoid duplication     → don't store the same data in two places
5. Avoid deep nesting    → flat structures are easier to update immutably
```

```tsx
// ── Group state that always changes together ──────────────────────────────
// ❌ Two related values that must always change at once
const [x, setX] = useState(0)
const [y, setY] = useState(0)
// If you only call setX and forget setY → inconsistent state

// ✅ One object for related values
const [position, setPosition] = useState({ x: 0, y: 0 })
function handleMove(newX: number, newY: number) {
  setPosition({ x: newX, y: newY })  // atomic update ✅
}
```

```tsx
// ── Avoid contradictory state ─────────────────────────────────────────────
// ❌ isLoading and isError can both be true simultaneously — contradiction
const [isLoading, setIsLoading] = useState(false)
const [isError,   setIsError]   = useState(false)
const [isSuccess, setIsSuccess] = useState(false)
// Bug: if you set isLoading=true and forget to clear isError=true

// ✅ Single status with a union type — only one can be active
type Status = 'idle' | 'loading' | 'error' | 'success'
const [status, setStatus] = useState<Status>('idle')
// Impossible to be in two states simultaneously ✅
```

```tsx
// ── Prefer flat state ─────────────────────────────────────────────────────
// ❌ Deeply nested — every update requires spreading multiple levels
interface DeepState {
  user: {
    profile: {
      address: {
        city: string
        zip:  string
      }
    }
  }
}

// ✅ Flat — easy to update any field
interface FlatState {
  city: string
  zip:  string
  userName: string
}
// Or flatten the relevant parts you actually update
```

---

## W — Why It Matters

- Contradictory state is the root cause of most "why is the UI showing the wrong thing?" bugs — two booleans that disagree produce impossible UI states. A union type makes illegal states unrepresentable.
- Deciding "should this be state?" before writing code is 5 minutes of planning that saves 30 minutes of debugging — the wrong structure forces contortions on every update.
- Grouped vs separate state is a real design decision that affects every downstream `setX` call — wrong choice means either over-spreading or forgetting to update one field.

---

## I — Interview Q&A

### Q: How do you decide whether to group multiple values into one state object or keep them separate?

**A:** Group values when they **always change together** — changing one without the other would leave the state inconsistent. Position `{x, y}`, form fields `{email, password}`, async state as a status union. Keep values separate when they **change independently** — `count`, `isVisible`, `searchQuery` rarely change at the same time and grouping them would mean spreading on every individual update. A secondary signal: if you find yourself always updating both in the same handler, group them. If you update them independently in different handlers, keep them separate.

---

## C — Common Pitfalls + Fix

### ❌ Using two booleans that can contradict each other

```tsx
// ❌ Both can be true — impossible UI state
const [isFetching, setFetching] = useState(false)
const [hasError,   setError]    = useState(false)

async function load() {
  setFetching(true)
  try {
    await fetch('/api/data')
    setFetching(false)
    // Forgot: setError(false) — error might still be true from previous call ❌
  } catch {
    setError(true)
    // Forgot: setFetching(false) — both can be true ❌
  }
}

// ✅ One status — mutually exclusive states
type FetchStatus = 'idle' | 'loading' | 'error' | 'success'
const [status, setStatus] = useState<FetchStatus>('idle')

async function loadFixed() {
  setStatus('loading')
  try {
    await fetch('/api/data')
    setStatus('success')
  } catch {
    setStatus('error')
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Redesign this bad state structure for a wizard form: three booleans for step visibility, a `currentStep` number, and a completed boolean. Make illegal states impossible.

### Solution

```tsx
// ❌ Bad: multiple sources of truth that can contradict
const [showStep1, setShowStep1] = useState(true)
const [showStep2, setShowStep2] = useState(false)
const [showStep3, setShowStep3] = useState(false)
const [currentStep, setCurrentStep] = useState(1)
const [isComplete,  setIsComplete]  = useState(false)
// All five can disagree — which is the truth?

// ✅ Good: one source of truth
type WizardStep = 1 | 2 | 3 | 'complete'

interface WizardState {
  step:      WizardStep
  formData:  { name: string; email: string; plan: string }
}

function Wizard() {
  const [wizard, setWizard] = useState<WizardState>({
    step:     1,
    formData: { name: '', email: '', plan: '' },
  })

  const isComplete = wizard.step === 'complete'    // derived ✅
  const isFirstStep = wizard.step === 1            // derived ✅
  const isLastStep  = wizard.step === 3            // derived ✅

  function goNext() {
    setWizard(prev => ({
      ...prev,
      step: prev.step === 3 ? 'complete' : (prev.step as number + 1) as WizardStep,
    }))
  }
  function goBack() {
    setWizard(prev => ({
      ...prev,
      step: typeof prev.step === 'number' && prev.step > 1
        ? (prev.step - 1) as WizardStep
        : prev.step,
    }))
  }

  if (isComplete) return <p>✅ Done!</p>
  return (
    <div>
      <p>Step {wizard.step} of 3</p>
      <button onClick={goBack}  disabled={isFirstStep}>Back</button>
      <button onClick={goNext}>{isLastStep ? 'Submit' : 'Next'}</button>
    </div>
  )
}
```

---

---

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

# 3 — Avoiding Duplicate State

---

## T — TL;DR

**Duplicate state** is storing the same data in two places. The classic case: storing a full selected item object when you only need to store the selected item's **ID**. The full item is already in your items array — look it up. Two copies diverge and show inconsistent data.

---

## K — Key Concepts

```tsx
interface Message { id: number; text: string; sender: string; read: boolean }

// ❌ Duplicate: selectedMessage is a copy of data already in messages
function Inbox() {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)  // ❌ duplicate

  function handleUpdate(id: number, text: string) {
    // Must update in TWO places — easily forgotten
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m))
    setSelectedMessage(prev => prev?.id === id ? { ...prev, text } : prev)  // ❌ easy to miss
  }
  // If you update messages but forget selectedMessage → they disagree
}

// ✅ Store only the ID — look up the full object when needed
function InboxFixed() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)   // ✅ just the ID

  const selectedMessage = messages.find(m => m.id === selectedId) ?? null  // derived ✅

  function handleUpdate(id: number, text: string) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m))
    // selectedMessage updates automatically — no second update needed ✅
  }
}
```

```tsx
// ── Other duplication patterns ────────────────────────────────────────────

// ❌ Duplicate: tags state and selectedTags contain same Tag objects
interface Tag { id: string; label: string; color: string }
const [allTags,      setAllTags]      = useState<Tag[]>([])
const [selectedTags, setSelectedTags] = useState<Tag[]>([])  // ❌ copies of allTags items

// ✅ Store selected IDs — look up full objects
const [allTags,         setAllTags]         = useState<Tag[]>([])
const [selectedTagIds,  setSelectedTagIds]  = useState<Set<string>>(new Set())  // ✅

const selectedTags = allTags.filter(tag => selectedTagIds.has(tag.id))  // derived ✅

// ❌ Duplicate: form has its own copy of the user being edited
const [user, setUser] = useState<User | null>(null)  // fetched from server
const [form, setForm] = useState<User | null>(null)  // ❌ copy of user for editing

// ✅ Store only the edited fields
const [user,   setUser]   = useState<User | null>(null)
const [edits,  setEdits]  = useState<Partial<User>>({})   // ✅ only the diffs
const preview = user ? { ...user, ...edits } : null       // derived ✅
```

---

## W — Why It Matters

- Duplicate state requires **synchronisation on every mutation** — a two-step update where missing one step is always possible under deadline pressure. The resulting bug (list updated, selected item shows old data) is subtle and hard to trace.
- ID-only selection state is a standard React pattern — it forces you to treat the items array as a single source of truth. The lookup is O(n) but correct; the duplicate approach is O(1) but buggy.
- The pattern appears everywhere in real apps: selected row in a table, active item in a list, editing a record — recognizing it and immediately thinking "store the ID" is a mark of React experience.

---

## I — Interview Q&A

### Q: You have a list of items and want to track which one is selected. Should you store the selected item or its ID? Why?

**A:** Store the **ID**. The item already exists in your items array — storing a copy creates two sources of truth. When the item's data changes (via an update), you must update both the items array and the selectedItem state simultaneously. Miss one and they diverge. Storing just the ID and deriving the selected item with `items.find(i => i.id === selectedId)` means there's only one copy of the data. When the items array is updated, the derived `selectedItem` automatically reflects the latest data. It's also simpler: a `number | null` is easier to initialise, clear, and compare than a `Item | null`.

---

## C — Common Pitfalls + Fix

### ❌ Keeping a `Set` of full objects instead of IDs for multi-select

```tsx
// ❌ Set of objects — object equality is reference-based, full duplicates
const [selected, setSelected] = useState<Set<Product>>(new Set())

function handleSelect(product: Product) {
  setSelected(prev => {
    const next = new Set(prev)
    // Has(product) fails if product is a different reference — even same ID ❌
    if (next.has(product)) next.delete(product)
    else next.add(product)
    return next
  })
}

// ✅ Set of IDs — stable, no reference issues
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

function handleSelectFixed(productId: number) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    return next
  })
}

// Derive selected products when needed
const selectedProducts = products.filter(p => selectedIds.has(p.id))
```

---

## K — Coding Challenge + Solution

### Challenge

Convert this component from storing a duplicate selected user object to storing only the selected user ID. Wire up edit functionality with a separate `edits` partial state.

### Solution

```tsx
interface User { id: number; name: string; email: string; role: string }

// ❌ Before
function UserManagerBad() {
  const [users,        setUsers]        = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)  // ❌ duplicate

  function updateUser(id: number, changes: Partial<User>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u))
    setSelectedUser(prev => prev?.id === id ? { ...prev, ...changes } : prev)  // ❌ easy to miss
  }
}

// ✅ After
function UserManagerGood() {
  const [users,      setUsers]      = useState<User[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [edits,      setEdits]      = useState<Partial<User>>({})

  const selectedUser = users.find(u => u.id === selectedId) ?? null   // derived ✅
  const previewUser  = selectedUser ? { ...selectedUser, ...edits } : null  // derived ✅

  function handleSelect(id: number) {
    setSelectedId(id)
    setEdits({})   // clear edits when switching selection
  }

  function handleFieldChange(field: keyof User, value: string) {
    setEdits(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!selectedId) return
    setUsers(prev => prev.map(u => u.id === selectedId ? { ...u, ...edits } : u))
    setEdits({})
    // selectedUser now reflects the updated data automatically ✅
  }

  return (
    <div>
      <ul>
        {users.map(u => (
          <li key={u.id} onClick={() => handleSelect(u.id)}
            style={{ fontWeight: u.id === selectedId ? 'bold' : 'normal' }}>
            {u.name}
          </li>
        ))}
      </ul>
      {previewUser && (
        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
          <input value={previewUser.name}  onChange={e => handleFieldChange('name',  e.target.value)} />
          <input value={previewUser.email} onChange={e => handleFieldChange('email', e.target.value)} />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEdits({})}>Cancel</button>
        </form>
      )}
    </div>
  )
}
```

---

---

# 4 — Deriving Values During Render

---

## T — TL;DR

**Derive, don't store.** Any value computable from state or props should be computed inline during render — it's always accurate, always in sync, needs no sync logic, and requires zero extra code to maintain.

---

## K — Key Concepts

```tsx
// ── Inline derivation patterns ────────────────────────────────────────────
interface CartItem { id: number; name: string; price: number; qty: number; inStock: boolean }

function CartSummary({ items }: { items: CartItem[] }) {
  // All derived during render — never stored as state
  const total          = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const itemCount      = items.reduce((sum, i) => sum + i.qty, 0)
  const hasOutOfStock  = items.some(i => !i.inStock)
  const isEmpty        = items.length === 0
  const canCheckout    = !isEmpty && !hasOutOfStock
  const savings        = items
    .filter(i => i.price < 10)
    .reduce((sum, i) => sum + (10 - i.price) * i.qty, 0)

  if (isEmpty) return <p>Your cart is empty.</p>

  return (
    <div>
      <p>{itemCount} items · ${total.toFixed(2)}</p>
      {savings > 0 && <p>You saved ${savings.toFixed(2)}!</p>}
      {hasOutOfStock && <p className="warn">Some items are out of stock</p>}
      <button disabled={!canCheckout}>Checkout</button>
    </div>
  )
}
// None of these are state — they're always correct by construction ✅
```

```tsx
// ── What stays as state vs what gets derived ──────────────────────────────
function SearchableSortedList() {
  // STATE: raw data and user choices
  const [items,     setItems]     = useState<string[]>([])
  const [query,     setQuery]     = useState('')
  const [sortAsc,   setSortAsc]   = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const PAGE_SIZE = 20

  // DERIVED: everything computed from state
  const filtered   = items.filter(i => i.toLowerCase().includes(query.toLowerCase()))
  const sorted     = [...filtered].sort((a, b) => sortAsc
    ? a.localeCompare(b) : b.localeCompare(a))
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const page       = sorted.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
  const isEmpty    = filtered.length === 0

  // Note: when query changes, filtered/sorted/totalPages all update automatically
  // No sync logic anywhere ✅
}
```

```tsx
// ── When derivation IS expensive — useMemo ────────────────────────────────
import { useMemo } from 'react'

function HeavyList({ items }: { items: BigDataItem[] }) {
  const [query, setQuery] = useState('')

  // useMemo: only recompute when items or query changes
  // Use ONLY when profiling shows a real performance issue
  const filtered = useMemo(
    () => expensiveFilter(items, query),
    [items, query]
  )
  // Default: derive inline first, add useMemo only after measuring ✅
}
```

---

## W — Why It Matters

- Derived values in render are the React equivalent of a computed getter in a class — they're never stale because they recompute fresh on every render that depends on their source state.
- Inline derivation is free for small lists — JavaScript arrays of <1000 items `.filter` + `.map` in microseconds. Only profile first before reaching for `useMemo`.
- Derived values communicate intent to the reader: `const canSubmit = isValid && !isSubmitting` is a named business rule visible at the point of use, not a hidden state variable.

---

## I — Interview Q&A

### Q: When should you use `useMemo` instead of just computing inline during render?

**A:** Almost never — derive inline first. `useMemo` adds complexity: a dependency array to maintain, potential bugs if dependencies are wrong, and it only helps if the memoized computation is actually slower than the overhead of memoization itself. React's re-renders are fast; simple filter/map/reduce over hundreds of items is microseconds. Use `useMemo` only when: (1) you've profiled with React DevTools and confirmed the computation is a measurable bottleneck, (2) you're creating a new object/array reference that's passed to a `React.memo`-wrapped child (referential stability needed, not just speed). The rule: derive inline → if slow, measure → then consider useMemo.

---

## C — Common Pitfalls + Fix

### ❌ useEffect to "sync" a derived value into state

```tsx
// ❌ Anti-pattern: useEffect to derive state from state
function PriceDisplay({ price, taxRate }: { price: number; taxRate: number }) {
  const [totalWithTax, setTotalWithTax] = useState(0)

  useEffect(() => {
    setTotalWithTax(price * (1 + taxRate))   // ❌ one extra render, always stale by one
  }, [price, taxRate])

  return <p>Total: ${totalWithTax.toFixed(2)}</p>
}
// This causes an extra render cycle and can be stale during the first render

// ✅ Just derive it
function PriceDisplayFixed({ price, taxRate }: { price: number; taxRate: number }) {
  const totalWithTax = price * (1 + taxRate)   // always current ✅
  return <p>Total: ${totalWithTax.toFixed(2)}</p>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Convert a component that useEffects to sync three state values into proper inline derivation.

### Solution

```tsx
interface Order { id: number; items: { price: number; qty: number }[]; discount: number }

// ❌ Before: useEffect syncing derived state
function OrderSummaryBad({ order }: { order: Order }) {
  const [subtotal,  setSubtotal]  = useState(0)
  const [savings,   setSavings]   = useState(0)
  const [total,     setTotal]     = useState(0)

  useEffect(() => {
    const sub  = order.items.reduce((s, i) => s + i.price * i.qty, 0)
    const save = sub * order.discount
    setSubtotal(sub)
    setSavings(save)
    setTotal(sub - save)
  }, [order])

  return (
    <dl>
      <dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd>
      <dt>Discount</dt><dd>−${savings.toFixed(2)}</dd>
      <dt>Total</dt>   <dd>${total.toFixed(2)}</dd>
    </dl>
  )
}

// ✅ After: inline derivation — no useEffect, no extra state, no extra renders
function OrderSummaryGood({ order }: { order: Order }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
  const savings  = subtotal * order.discount
  const total    = subtotal - savings

  return (
    <dl>
      <dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd>
      <dt>Discount ({(order.discount * 100).toFixed(0)}%)</dt>
      <dd>−${savings.toFixed(2)}</dd>
      <dt>Total</dt>   <dd>${total.toFixed(2)}</dd>
    </dl>
  )
}
```

---

---

# 5 — Lifting State Up

---

## T — TL;DR

When two components need to share state, **move the state to their closest common ancestor**. The parent owns the state and passes it down as props. Children receive the value and a callback to request changes. This is the fundamental React data flow pattern.

---

## K — Key Concepts

```tsx
// ── Before lifting: each panel has its own expanded state ─────────────────
// Problem: can't coordinate them (only one open at a time rule)
function AccordionPanel({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false)   // ← lives here
  return (
    <div>
      <button onClick={() => setIsOpen(o => !o)}>{title}</button>
      {isOpen && <p>{content}</p>}
    </div>
  )
}
// Two AccordionPanels can't "know" about each other's state ❌
```

```tsx
// ── After lifting: parent owns the open panel ID ──────────────────────────
interface Panel { id: string; title: string; content: string }

interface AccordionPanelProps {
  panel:    Panel
  isOpen:   boolean               // value comes from parent
  onToggle: (id: string) => void  // requests change from parent
}

function AccordionPanel({ panel, isOpen, onToggle }: AccordionPanelProps) {
  return (
    <div>
      <button onClick={() => onToggle(panel.id)}>{panel.title}</button>
      {isOpen && <p>{panel.content}</p>}
    </div>
  )
}

function Accordion({ panels }: { panels: Panel[] }) {
  const [openId, setOpenId] = useState<string | null>(null)   // ← lifted here

  function handleToggle(id: string) {
    setOpenId(prev => prev === id ? null : id)  // close if already open
  }

  return (
    <div>
      {panels.map(panel => (
        <AccordionPanel
          key={panel.id}
          panel={panel}
          isOpen={openId === panel.id}   // derived per panel ✅
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
// Now only one panel is open at a time — coordination is possible ✅
```

```tsx
// ── The three steps of lifting state ─────────────────────────────────────
// 1. Remove state from children
// 2. Add state to common parent
// 3. Pass value + callback as props to children

// Rule: find the lowest common ancestor of all components that read/write the state
// That's where the state lives
```

---

## W — Why It Matters

- Lifting state up is the answer to "how do I make two components talk to each other?" in React — you don't make components talk, you give them a shared ancestor that coordinates them.
- The accordion example is a classic interview/take-home problem — "only one panel open at a time" is unsolvable with local state but trivial with lifted state.
- The cost of lifting: the parent re-renders on every state change, and all children receive new props. This is the correct trade-off — correctness first, optimization (memo) second if needed.

---

## I — Interview Q&A

### Q: What is "lifting state up" and when should you do it?

**A:** Lifting state up means moving a piece of state from a child component to the nearest common ancestor of all components that need to read or write it. You do it when two or more sibling (or cousin) components need to share or coordinate state — they can't directly access each other's state in React, but they can both receive the same value from a shared parent. The parent owns the state and passes the value and a setter callback as props. The signal to lift: you find yourself wishing a component could "see" another component's state.

---

## C — Common Pitfalls + Fix

### ❌ Lifting too high — causes unnecessary re-renders far up the tree

```tsx
// ❌ Lifting search state all the way to App level
// Every keystroke re-renders the entire application
function App() {
  const [search, setSearch] = useState('')   // ❌ too high — affects everything

  return (
    <div>
      <Navbar />          {/* re-renders on every keystroke — unnecessary */}
      <Sidebar />         {/* same */}
      <ProductSearch search={search} onSearch={setSearch} />
      <Footer />          {/* same */}
    </div>
  )
}

// ✅ Lift only as high as needed — lowest common ancestor
function ProductSection() {
  const [search, setSearch] = useState('')   // ✅ only ProductSection and children re-render

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <ProductList search={search} />
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TabbedContent` component: parent owns the active tab index, two child `Tab` components receive `isActive` and `onSelect` props.

### Solution

```tsx
interface TabProps {
  label:    string
  isActive: boolean
  onSelect: () => void
  children: React.ReactNode
}

function Tab({ label, isActive, onSelect, children }: TabProps) {
  return (
    <div>
      <button
        onClick={onSelect}
        aria-selected={isActive}
        className={isActive ? 'tab tab--active' : 'tab'}
      >
        {label}
      </button>
      {isActive && <div className="tab-content">{children}</div>}
    </div>
  )
}

interface TabConfig { id: string; label: string; content: React.ReactNode }

function TabbedContent({ tabs }: { tabs: TabConfig[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '')   // ← lifted state

  return (
    <div className="tabs" role="tablist">
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          label={tab.label}
          isActive={activeId === tab.id}
          onSelect={() => setActiveId(tab.id)}   // ← callback
        >
          {tab.content}
        </Tab>
      ))}
    </div>
  )
}

// Usage
<TabbedContent tabs={[
  { id: 'overview', label: 'Overview', content: <Overview /> },
  { id: 'reviews',  label: 'Reviews',  content: <Reviews />  },
  { id: 'faq',      label: 'FAQ',      content: <FAQ />      },
]} />
```

---

---

# 6 — Sharing State Between Components

---

## T — TL;DR

Sharing state means **one component owns it, others consume it via props**. Direct prop-passing works for 2–3 levels. When state needs to reach deeply nested components, **prop drilling** becomes painful — that's the signal to consider Context (Day 4) or a state manager (Zustand, Day 4+).

---

## K — Key Concepts

```tsx
// ── Direct sharing: parent → children via props ───────────────────────────
interface Theme { primary: string; background: string }

function App() {
  const [theme, setTheme] = useState<Theme>({ primary: '#0066cc', background: '#fff' })

  return (
    <Layout theme={theme}>
      <Header theme={theme} />
      <Main theme={theme} onThemeChange={setTheme} />
    </Layout>
  )
}
// Works fine for 1–2 levels ✅
```

```tsx
// ── Prop drilling — when it gets painful ────────────────────────────────────
// State lives in App → passed to Page → passed to Section → passed to Widget
// Widget is the only one that USES it — all intermediate components just forward it

// ❌ Pain point: 3+ levels of prop passing for state used by one deep component
function App() {
  const [user, setUser] = useState<User | null>(null)
  return <Page user={user} onLogout={() => setUser(null)} />
}
function Page({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return <Section user={user} onLogout={onLogout} />  // just forwarding ❌
}
function Section({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return <UserMenu user={user} onLogout={onLogout} />  // just forwarding ❌
}
function UserMenu({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  // Only this component actually uses these props
  return user ? <button onClick={onLogout}>{user.name}</button> : null
}
```

```tsx
// ── Signals that suggest Context instead ─────────────────────────────────
// - Props passed through 3+ levels where intermediate components don't use them
// - Many unrelated components at different levels need the same data
// - Auth user, theme, locale, feature flags
// Examples: user session, color theme, language preference
// → Context + useContext is covered in Day 4

// ── Component composition as an alternative to deep drilling ─────────────
// Instead of drilling user through Layout → Header → UserBadge:
// Pass the already-rendered UserBadge as a prop (children/slot pattern)
function App() {
  const [user, setUser] = useState<User | null>(null)
  return (
    <Layout
      headerSlot={user ? <UserBadge user={user} /> : <LoginButton />}  // ✅ no drilling
    >
      <MainContent />
    </Layout>
  )
}
function Layout({ children, headerSlot }: { children: React.ReactNode; headerSlot: React.ReactNode }) {
  return (
    <div>
      <header>{headerSlot}</header>    {/* Layout doesn't know about User ✅ */}
      <main>{children}</main>
    </div>
  )
}
```

---

## W — Why It Matters

- Understanding when prop drilling becomes a problem (3+ levels, intermediate components that don't use the prop) tells you exactly when to reach for Context or a state manager.
- The component composition / slot pattern is an underused alternative to Context for UI structure — `Layout` receiving `headerSlot` as a prop is often cleaner than drilling the user through Layout → Header → UserBadge.
- "Sharing" vs "lifting" — lifting is about moving state up to coordinate siblings; sharing is about passing that state down to the consumers who need it.

---

## I — Interview Q&A

### Q: What is prop drilling and when does it become a problem?

**A:** Prop drilling is passing data through intermediate components that don't use it themselves — just forwarding props to deeper children. It becomes a problem when: the chain is 3+ levels deep, many unrelated components at different depths need the same data, or adding a new prop requires modifying multiple intermediate components. Solutions in order of complexity: (1) **Component composition** — pass pre-composed elements as `children` or named slot props, so intermediate components never see the data. (2) **Context** — broadcast state to any depth without prop chains. (3) **External state manager** (Zustand) — state lives outside the tree, any component subscribes directly.

---

## C — Common Pitfalls + Fix

### ❌ Drilling a callback 4 levels deep when composition solves it

```tsx
// ❌ onAddToCart drills through Catalog → Category → ProductCard
function Catalog({ onAddToCart }: { onAddToCart: (id: number) => void }) {
  return <Category onAddToCart={onAddToCart} />      // just forwarding ❌
}
function Category({ onAddToCart }: { onAddToCart: (id: number) => void }) {
  return products.map(p => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />)
}

// ✅ Lift the pre-wired button up — Catalog renders it without knowing the handler
function App() {
  const [cart, setCart] = useState<number[]>([])
  return (
    <Catalog
      renderProduct={product => (
        <ProductCard
          product={product}
          onAddToCart={() => setCart(prev => [...prev, product.id])}  // wired here ✅
        />
      )}
    />
  )
}
function Catalog({ renderProduct }: { renderProduct: (p: Product) => React.ReactNode }) {
  return <div>{products.map(p => renderProduct(p))}</div>  // no cart knowledge ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Refactor a three-level prop drilling chain using the slot/children composition pattern.

### Solution

```tsx
interface User { name: string; avatar: string }

// ❌ Before: user drills through AppShell → Topbar → UserControls
function AppShellBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div>
      <TopbarBad user={user} onLogout={onLogout} />
      <main>Content</main>
    </div>
  )
}
function TopbarBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <header><UserControlsBad user={user} onLogout={onLogout} /></header>
}
function UserControlsBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <button onClick={onLogout}>{user.name}</button>
}

// ✅ After: composition — AppShell and Topbar know nothing about User
function UserControls({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <button onClick={onLogout}>{user.name}</button>
}

function Topbar({ endSlot }: { endSlot: React.ReactNode }) {
  return <header><nav>My App</nav>{endSlot}</header>  // no user knowledge ✅
}

function AppShell({ topbarEnd, children }: { topbarEnd: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Topbar endSlot={topbarEnd} />   // no user knowledge ✅
      <main>{children}</main>
    </div>
  )
}

// Owner of state wires everything at the top
function App() {
  const [user, setUser] = useState<User>({ name: 'Mark', avatar: '/avatar.jpg' })

  return (
    <AppShell
      topbarEnd={<UserControls user={user} onLogout={() => setUser(null!)} />}  // ✅
    >
      <p>Main content</p>
    </AppShell>
  )
}
```

---

---

# 7 — Syncing Sibling State

---

## T — TL;DR

Two sibling components **cannot share state directly** — they have no way to communicate. The only correct solution is to lift the state to their common parent, which then passes it down to both. This is lifting state up applied to the sibling relationship.

---

## K — Key Concepts

```tsx
// ── Siblings can't see each other's state ────────────────────────────────
function App() {
  return (
    <>
      <TemperatureInput />   {/* Celsius — own state */}
      <TemperatureInput />   {/* Fahrenheit — own state */}
      {/* They have no way to stay in sync ❌ */}
    </>
  )
}
```

```tsx
// ── Lift to parent — parent owns the single source of truth ──────────────
type Scale = 'c' | 'f'
interface TemperatureInputProps {
  value:    string
  scale:    Scale
  onChange: (value: string) => void
}

function TemperatureInput({ value, scale, onChange }: TemperatureInputProps) {
  const label = scale === 'c' ? 'Celsius' : 'Fahrenheit'
  return (
    <label>
      {label}:
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function toCelsius(f: number)    { return (f - 32) * 5 / 9 }
function toFahrenheit(c: number) { return c * 9 / 5 + 32 }

function TemperatureCalculator() {
  const [celsius, setCelsius] = useState('')   // ← single source of truth

  const fahrenheit = celsius !== ''
    ? toFahrenheit(parseFloat(celsius)).toFixed(2)
    : ''

  function handleCelsiusChange(value: string) {
    setCelsius(value)
  }
  function handleFahrenheitChange(value: string) {
    const c = value !== '' ? toCelsius(parseFloat(value)).toFixed(2) : ''
    setCelsius(c)   // always convert back to Celsius ✅
  }

  return (
    <div>
      <TemperatureInput scale="c" value={celsius}     onChange={handleCelsiusChange} />
      <TemperatureInput scale="f" value={fahrenheit}  onChange={handleFahrenheitChange} />
    </div>
  )
}
// Both inputs stay in sync because they both derive from one 'celsius' state ✅
```

```tsx
// ── Syncing via shared ID (both read from the same source) ─────────────────
// Parent owns selectedId → passes to both siblings
function ProductPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div>
      <ProductList
        selectedId={selectedId}
        onSelect={setSelectedId}   // sibling A writes
      />
      <ProductDetail
        productId={selectedId}     // sibling B reads
      />
    </div>
  )
}
// ProductList and ProductDetail stay in sync through parent ✅
```

---

## W — Why It Matters

- The temperature calculator is the canonical React example of synced siblings — it clearly shows why lifting is necessary and what the pattern looks like in a real scenario.
- "Siblings can't communicate directly" is a strict rule in React's architecture — understanding this early prevents the instinct to try `ref`-passing between siblings, which is an anti-pattern.
- The "store one value, derive the other" approach for synced siblings (store Celsius, derive Fahrenheit) is important — storing both leads to duplication and the risk of both being valid sources of truth simultaneously.

---

## I — Interview Q&A

### Q: How do you synchronise state between two sibling components in React?

**A:** You can't directly — siblings have no access to each other's state. The solution is to lift the state to their nearest common parent. The parent owns a single source of truth and passes the current value and an update callback to each sibling as props. When one sibling calls the callback, the parent updates the state, which re-renders both siblings with the new value. If both siblings represent the same data in different units or formats (like Celsius/Fahrenheit), store one canonical form in state and derive the other during render — never store both.

---

## C — Common Pitfalls + Fix

### ❌ Using useEffect to sync one sibling's state when the other changes

```tsx
// ❌ Effect-based sync — two states, two effects, eventual consistency
function TemperatureCalcBad() {
  const [celsius,     setCelsius]     = useState(0)
  const [fahrenheit,  setFahrenheit]  = useState(32)

  useEffect(() => {
    setFahrenheit(celsius * 9/5 + 32)    // ❌ extra render, potential loop
  }, [celsius])

  useEffect(() => {
    setCelsius((fahrenheit - 32) * 5/9)  // ❌ can loop if both effects fire
  }, [fahrenheit])
}

// ✅ Store one, derive the other inline
function TemperatureCalcGood() {
  const [celsius, setCelsius] = useState(0)
  const fahrenheit = celsius * 9/5 + 32   // always in sync, no effects needed ✅

  return (
    <>
      <input type="number" value={celsius}     onChange={e => setCelsius(+e.target.value)} />
      <input type="number" value={fahrenheit}
        onChange={e => setCelsius((+e.target.value - 32) * 5/9)} />
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a currency converter: two inputs (USD and EUR) that stay in sync. Typing in one updates the other. Store only USD, derive EUR.

### Solution

```tsx
const USD_TO_EUR = 0.92

interface CurrencyInputProps {
  label:    string
  value:    string
  onChange: (value: string) => void
}

function CurrencyInput({ label, value, onChange }: CurrencyInputProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min="0"
        step="0.01"
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function CurrencyConverter() {
  const [usd, setUsd] = useState('')   // single source of truth

  // Derive EUR from USD — always in sync
  const eur = usd !== '' ? (parseFloat(usd) * USD_TO_EUR).toFixed(2) : ''

  function handleUsdChange(value: string) {
    setUsd(value)
  }

  function handleEurChange(value: string) {
    // Convert EUR back to USD — store canonical USD
    const usdVal = value !== '' ? (parseFloat(value) / USD_TO_EUR).toFixed(2) : ''
    setUsd(usdVal)
  }

  return (
    <div>
      <CurrencyInput label="USD $" value={usd} onChange={handleUsdChange} />
      <CurrencyInput label="EUR €" value={eur} onChange={handleEurChange} />
      {usd !== '' && (
        <p>${parseFloat(usd).toFixed(2)} = €{eur}</p>
      )}
    </div>
  )
}
```

---

---

# 8 — State Colocation

---

## T — TL;DR

**Colocation** means keeping state as close to where it's used as possible. The opposite of always lifting — if only one component needs the state, keep it there. Colocated state is easier to understand, delete, and refactor, and causes fewer unnecessary re-renders.

---

## K — Key Concepts

```
── Colocation principle ──────────────────────────────────────────────────────

Push state DOWN to the lowest component that needs it.
Lift state UP only when multiple components need it.

The wrong direction:
  → All state in App (global state everything) — massive re-renders, hard to maintain
  → All state in each leaf component — can't coordinate siblings

The right approach:
  → State lives at the lowest common ancestor of its consumers
  → No higher, no lower
```

```tsx
// ── Colocation in action ──────────────────────────────────────────────────
// ❌ Search query lifted too high — causes unnecessary parent re-renders
function App() {
  const [searchQuery, setSearchQuery] = useState('')   // ❌ too high
  // Every keystroke re-renders App and everything it renders

  return (
    <div>
      <Navbar />
      <ProductSearch
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />
      <Footer />   {/* re-renders on every keystroke — unnecessary */}
    </div>
  )
}

// ✅ Search query colocated in ProductSearch — nothing above it re-renders
function App() {
  return (
    <div>
      <Navbar />
      <ProductSearch />   {/* owns its own search query state ✅ */}
      <Footer />          {/* never re-renders from search ✅ */}
    </div>
  )
}

function ProductSearch() {
  const [query, setQuery] = useState('')   // ✅ colocated here

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductList query={query} />
    </div>
  )
}
```

```tsx
// ── What to colocate ──────────────────────────────────────────────────────
// ✅ UI state: tooltip visible, dropdown open, accordion expanded
// ✅ Local form state before submission
// ✅ Hover/focus state
// ✅ Pagination state used by one section
// ✅ Filter/sort state used only within one section

// What to lift:
// → State that coordinates multiple siblings
// → State that defines the "current selection" affecting multiple views
// → State needed by a distant ancestor (auth, cart count in header)
```

---

## W — Why It Matters

- Poorly colocated state is the most common source of unnecessary re-renders — lifting state higher than needed causes the entire subtree to re-render on every change, even components that don't use it.
- Colocated state is easier to delete: when the `DropdownMenu` component is removed, its `isOpen` state disappears with it. State in a parent would need manual cleanup.
- The colocation rule ("as low as possible, as high as necessary") is a heuristic you apply during code review — "does this state need to be in App, or can it move down?"

---

## I — Interview Q&A

### Q: What is state colocation and why does it matter for performance?

**A:** State colocation means keeping state in the component that most directly uses it — not lifting it higher than needed. It matters for performance because a state change triggers a re-render of the component that owns the state and all its children. If a search query lives in `App`, every keystroke re-renders the entire application. If it lives in `SearchSection`, only `SearchSection` and its children re-render. Navbar, Footer, and other siblings are unaffected. Beyond performance, colocated state is easier to understand (the state and its consumers are in the same place) and easier to delete (removing the component removes its state).

---

## C — Common Pitfalls + Fix

### ❌ Putting all UI state in a top-level store or parent

```tsx
// ❌ Global store / top-level state for purely local UI state
// Every dropdown, tooltip, modal open-state in App-level state
function App() {
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [isTooltipVisible, setTooltipVisible] = useState(false)
  const [isModalOpen, setModalOpen] = useState(false)
  // → Any of these changing re-renders entire App tree ❌
  // → These are local UI concerns that have no business in App
}

// ✅ UI state colocated in the components that own it
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)   // ✅ local
  return <div>...</div>
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)  // ✅ local
  return (
    <div onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && <span role="tooltip">{text}</span>}
    </div>
  )
}
// Dropdown opening doesn't re-render App or Tooltip ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Identify which state should be colocated vs lifted in a product page with: a search bar, a product grid with individual card hover states, a selected product panel, and a cart item count in the header.

### Solution

```tsx
// State analysis:
// - search query → colocate in ProductSection (only it + ProductGrid need it)
// - card hover state → colocate in ProductCard (only that card needs it)
// - selected product → lift to ProductPage (ProductGrid + ProductDetail both need it)
// - cart count → lift to App (Header + CartIcon both need it)

// Architecture:
function App() {
  const [cartCount, setCartCount] = useState(0)   // ← lifted: Header + ProductPage need it

  return (
    <>
      <Header cartCount={cartCount} />
      <ProductPage onAddToCart={() => setCartCount(c => c + 1)} />
    </>
  )
}

function ProductPage({ onAddToCart }: { onAddToCart: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)  // ← lifted: Grid + Detail

  return (
    <div>
      <ProductSection selectedId={selectedId} onSelect={setSelectedId} onAddToCart={onAddToCart} />
      <ProductDetail productId={selectedId} />
    </div>
  )
}

function ProductSection({ selectedId, onSelect, onAddToCart }:
  { selectedId: number | null; onSelect: (id: number) => void; onAddToCart: () => void }) {
  const [search, setSearch] = useState('')   // ← colocated: only this section needs it

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <ProductGrid search={search} selectedId={selectedId} onSelect={onSelect} onAddToCart={onAddToCart} />
    </>
  )
}

function ProductCard({ product, isSelected, onSelect, onAddToCart }:
  { product: Product; isSelected: boolean; onSelect: () => void; onAddToCart: () => void }) {
  const [isHovered, setIsHovered] = useState(false)   // ← colocated: only this card needs it

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ outline: isSelected ? '2px solid blue' : isHovered ? '1px solid gray' : 'none' }}
      onClick={onSelect}
    >
      {product.name}
      <button onClick={e => { e.stopPropagation(); onAddToCart() }}>Add to cart</button>
    </div>
  )
}
```

---

---

# 9 — Preserving State

---

## T — TL;DR

React **preserves** a component's state as long as it renders at the **same position in the tree** with the **same type**. Conditional rendering at the same position with the same type preserves state. Understanding preservation prevents bugs where state persists when it shouldn't.

---

## K — Key Concepts

```tsx
// ── Same position + same type = preserved state ───────────────────────────
function App() {
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div>
      {isPaused
        ? <Counter />     // same position, same type
        : <Counter />     // → state PRESERVED when isPaused changes ✅
      }
    </div>
  )
}
// Toggling isPaused doesn't reset the Counter's count
// React sees: position 0 = Counter before, Counter after → same → keep state
```

```tsx
// ── Different type at same position = state destroyed ──────────────────────
function App() {
  const [isFancy, setIsFancy] = useState(false)

  return (
    <div>
      {isFancy
        ? <FancyCounter />   // different type
        : <Counter />        // → state DESTROYED when switching ✅
      }
    </div>
  )
}
// Counter → FancyCounter: different component types → unmount + remount → fresh state
```

```tsx
// ── Why this matters: the hidden state preservation bug ──────────────────
interface Props { name: string; score: number }

function PlayerCard({ name, score }: Props) {
  const [isHighlighted, setIsHighlighted] = useState(false)

  return (
    <div>
      <p>{name}: {score}</p>
      <button onClick={() => setIsHighlighted(h => !h)}>
        {isHighlighted ? '★' : '☆'}
      </button>
    </div>
  )
}

function Scoreboard() {
  const [showSecond, setShowSecond] = useState(false)

  return (
    <div>
      {/* Both render PlayerCard at position 0 — state persists between players! */}
      {showSecond
        ? <PlayerCard name="Bob"   score={42} />
        : <PlayerCard name="Alice" score={37} />
      }
    </div>
  )
}
// Bug: if Alice's card is highlighted, switching to Bob shows Bob's card highlighted ❌
// Fix: use key prop (subtopic 10) or render both and hide one
```

```tsx
// ── Intentionally preserving state with display:none ─────────────────────
// Sometimes you WANT to preserve state while hiding
function TabbedForm() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} hidden={activeTab !== i}>  {/* hidden keeps component mounted */}
          <StepForm step={i} />   {/* state preserved when hidden ✅ */}
        </div>
      ))}
    </>
  )
}
// hidden attribute: component stays in DOM → state preserved
// vs conditional rendering: component unmounts → state lost
```

---

## W — Why It Matters

- The "same type at same position preserves state" rule explains bugs like: switching between two user profiles with the same component but different IDs — the input state from user A appears on user B.
- `hidden` attribute vs conditional rendering is a real architectural choice — forms especially benefit from `hidden` (user doesn't lose typed data when switching tabs), while lists benefit from conditional rendering (don't mount off-screen items).
- Understanding preservation is the prerequisite for understanding why key-based reset (subtopic 10) works — changing the key changes identity, forcing remount.

---

## I — Interview Q&A

### Q: When does React preserve a component's state vs reset it?

**A:** React preserves state when a component renders at the **same position in the component tree** with the **same type** across renders. The position is determined by the structure of the JSX tree — not the variable names or conditions in your code. If `{condition ? <A /> : <A />}` renders at the same position, state is preserved between condition changes. State is reset when: the component is removed from the tree (unmounted), a different component type renders at that position, or the `key` prop changes. The practical consequence: if the same component type renders at the same position but with different data (like different user IDs), you must use a `key` prop to force fresh state.

---

## C — Common Pitfalls + Fix

### ❌ Nesting component definitions inside render — forces remount every render

```tsx
// ❌ Component defined inside another component — new type on every render
function ParentBad() {
  const [count, setCount] = useState(0)

  // This creates a NEW function reference (new "type") on every render
  function InnerInput() {
    const [text, setText] = useState('')
    return <input value={text} onChange={e => setText(e.target.value)} />
  }

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <InnerInput />  {/* Unmounts and remounts on every render → state lost ❌ */}
    </div>
  )
}

// ✅ Define components at the module level — stable type reference
function InnerInput() {
  const [text, setText] = useState('')
  return <input value={text} onChange={e => setText(e.target.value)} />
}

function ParentGood() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <InnerInput />   {/* same type across renders — state preserved ✅ */}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Show the preservation bug with a `CommentInput` component that renders for two different users, then add the `hidden` pattern to preserve state while switching views.

### Solution

```tsx
function CommentInput({ authorName }: { authorName: string }) {
  const [text, setText] = useState('')
  return (
    <div>
      <p>Comment as {authorName}:</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write a comment…"
      />
      <p>{text.length} chars</p>
    </div>
  )
}

// ── Version 1: Bug — state preserved across user switch ───────────────────
function BuggyCommentSection() {
  const [showBob, setShowBob] = useState(false)
  return (
    <div>
      <button onClick={() => setShowBob(b => !b)}>
        Switch to {showBob ? 'Alice' : 'Bob'}
      </button>
      {/* Same position, same type → text persists when switching ❌ */}
      {showBob
        ? <CommentInput authorName="Bob"   />
        : <CommentInput authorName="Alice" />
      }
    </div>
  )
}

// ── Version 2: Preserve state for BOTH using hidden ───────────────────────
function PreservingCommentSection() {
  const [activeUser, setActiveUser] = useState<'Alice' | 'Bob'>('Alice')
  const users = ['Alice', 'Bob'] as const

  return (
    <div>
      <div>
        {users.map(u => (
          <button key={u} onClick={() => setActiveUser(u)}
            style={{ fontWeight: u === activeUser ? 'bold' : 'normal' }}>
            {u}
          </button>
        ))}
      </div>
      {/* hidden keeps components mounted → state preserved for both users ✅ */}
      {users.map(u => (
        <div key={u} hidden={activeUser !== u}>
          <CommentInput authorName={u} />
        </div>
      ))}
    </div>
  )
}
```

---

---

# 10 — Resetting State with Key

---

## T — TL;DR

Changing a component's **`key` prop** forces React to unmount the old instance and mount a new one — resetting all state to initial values. This is the intentional, declarative way to reset a component when its context changes (new record, new user, new route).

---

## K — Key Concepts

```tsx
// ── key forces remount = state reset ─────────────────────────────────────
// ❌ Without key — state persists when userId changes
function ProfileEditor({ userId }: { userId: number }) {
  const [bio, setBio] = useState('')
  // bio from userId=1 persists when userId changes to 2 ❌
  return <textarea value={bio} onChange={e => setBio(e.target.value)} />
}

// ✅ With key — fresh state for every userId
function App() {
  const [userId, setUserId] = useState(1)
  return (
    <>
      <select value={userId} onChange={e => setUserId(+e.target.value)}>
        <option value={1}>User 1</option>
        <option value={2}>User 2</option>
      </select>
      <ProfileEditor key={userId} userId={userId} />
      {/* key changes → React unmounts old → mounts new → state = '' ✅ */}
    </>
  )
}
```

```tsx
// ── Common key reset patterns ─────────────────────────────────────────────

// 1. Reset form when switching records
function RecordEditor({ recordId }: { recordId: number }) {
  return <EditForm key={recordId} recordId={recordId} />
  // EditForm's state resets on every recordId change ✅
}

// 2. Reset after successful submission
function SubmittableForm() {
  const [formKey, setFormKey] = useState(0)

  async function handleSubmit(data: FormData) {
    await save(data)
    setFormKey(k => k + 1)   // increment key → form resets ✅
  }

  return <ContactForm key={formKey} onSubmit={handleSubmit} />
}

// 3. Reset a component on route change (in a simple router)
function Page({ route }: { route: string }) {
  return <PageContent key={route} route={route} />  // fresh state per page ✅
}
```

```tsx
// ── Key vs useEffect for reset — why key is better ────────────────────────
// ❌ useEffect approach — extra render, timing issues
function FormWithEffect({ userId }: { userId: number }) {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    setName('')    // extra render
    setEmail('')   // stale values visible for one render ❌
  }, [userId])
  // Two renders: initial (stale) + after effect (reset)
}

// ✅ Key approach — atomic reset, no extra render, no effects
function ParentWithKey() {
  const [userId, setUserId] = useState(1)
  return <FormWithKey key={userId} userId={userId} />
}
function FormWithKey({ userId }: { userId: number }) {
  const [name,  setName]  = useState('')   // always starts fresh ✅
  const [email, setEmail] = useState('')
}
```

---

## W — Why It Matters

- The key reset pattern replaces the common but incorrect pattern of `useEffect(() => resetState(), [prop])` — the effect approach has a render flash (stale state visible for one frame), the key approach is atomic.
- `key` as a reset mechanism is one of the most powerful and underused patterns — senior React developers reach for it immediately when they need "fresh component when context changes."
- Every CMS admin, data grid, and record editor needs this pattern — switching between records in a list must not carry over state from the previous record.

---

## I — Interview Q&A

### Q: How do you reset a component's state when a prop changes, and why is the `key` prop the best approach?

**A:** Change the `key` prop on the component. When `key` changes, React unmounts the existing component instance and mounts a brand new one — all state initialises fresh. This is better than `useEffect(() => setState(initial), [prop])` for two reasons: (1) The effect fires after the render, meaning there's at least one render with stale state visible before the effect clears it. The key approach resets before the first render of the new context. (2) You don't have to manually list every state variable to reset — adding a new `useState` automatically benefits from the key reset without any changes to the reset logic. The key approach is declarative, atomic, and maintenance-free.

---

## C — Common Pitfalls + Fix

### ❌ Using `Math.random()` as a key to force reset — uncontrolled

```tsx
// ❌ Random key every render — unmounts+remounts on EVERY render (too aggressive)
function Carousel({ items }: { items: string[] }) {
  return (
    <div>
      {items.map(item => (
        <Slide key={Math.random()} item={item} />  // ❌ new key every render → always unmounts
      ))}
    </div>
  )
}

// ❌ Random key for controlled reset — unpredictable
function Form() {
  return <InputField key={Math.random()} />  // ❌ resets on every parent render ❌
}

// ✅ Increment a counter to reset on demand
function Form() {
  const [resetKey, setResetKey] = useState(0)
  return (
    <>
      <InputField key={resetKey} />
      <button onClick={() => setResetKey(k => k + 1)}>Reset form</button>
    </>
  )
}

// ✅ Use stable ID for list items
items.map(item => <Slide key={item.id} item={item} />)   // stable ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `RecordEditor` that loads a different record from a list. The form must reset completely when switching records. Include a `hasUnsavedChanges` indicator that also resets.

### Solution

```tsx
interface Record { id: number; title: string; body: string }

const RECORDS: Record[] = [
  { id: 1, title: 'First Note',  body: 'Content of first note'  },
  { id: 2, title: 'Second Note', body: 'Content of second note' },
  { id: 3, title: 'Third Note',  body: 'Content of third note'  },
]

interface EditFormProps {
  record:    Record
  onSave:    (updated: Record) => void
}

// Form component — will be reset via key
function EditForm({ record, onSave }: EditFormProps) {
  const [title, setTitle] = useState(record.title)
  const [body,  setBody]  = useState(record.body)

  const hasUnsavedChanges = title !== record.title || body !== record.body

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ ...record, title, body })
  }

  return (
    <form onSubmit={handleSubmit}>
      {hasUnsavedChanges && (
        <p className="unsaved-badge">● Unsaved changes</p>
      )}
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="body">Body</label>
        <textarea
          id="body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
        />
      </div>
      <button type="submit" disabled={!hasUnsavedChanges}>Save</button>
    </form>
  )
}

function RecordEditor() {
  const [records,    setRecords]    = useState<Record[]>(RECORDS)
  const [selectedId, setSelectedId] = useState<number>(RECORDS[0].id)

  const selectedRecord = records.find(r => r.id === selectedId)!

  function handleSave(updated: Record) {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
      <ul>
        {records.map(r => (
          <li
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            style={{ fontWeight: r.id === selectedId ? 'bold' : 'normal', cursor: 'pointer' }}
          >
            {r.title}
          </li>
        ))}
      </ul>

      {/* key=selectedId → EditForm remounts on every record switch */}
      {/* hasUnsavedChanges resets too — no stale "unsaved" badge ✅ */}
      <EditForm
        key={selectedId}
        record={selectedRecord}
        onSave={handleSave}
      />
    </div>
  )
}
```

---

## ✅ Day 3 Complete — React State Architecture

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Choosing State Structure | ☐ |
| 2 | Avoiding Redundant State | ☐ |
| 3 | Avoiding Duplicate State | ☐ |
| 4 | Deriving Values During Render | ☐ |
| 5 | Lifting State Up | ☐ |
| 6 | Sharing State Between Components | ☐ |
| 7 | Syncing Sibling State | ☐ |
| 8 | State Colocation | ☐ |
| 9 | Preserving State | ☐ |
| 10 | Resetting State with Key | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
STATE STRUCTURE
  Group values that always change together → { x, y } not separate x, y
  Avoid contradictory booleans → union type: 'idle'|'loading'|'error'|'success'
  Flat is easier to update than nested → spread at every level you modify
  Question for every useState: "do I actually need this in state?"

REDUNDANT STATE
  Can it be computed from other state or props? → DERIVE it, don't store it
  total, fullName, filteredList, count → all computable during render
  Storing derivable values requires manual sync → sync bugs are inevitable
  useEffect to sync derived state → anti-pattern (extra render + stale flash)

DUPLICATE STATE
  Same data in two places → two sources of truth → they will disagree
  selectedItem object → store selectedId instead, find item when needed
  Set of full objects for multi-select → Set of IDs instead
  One update instead of two → physically impossible to forget the second update

DERIVING IN RENDER
  Inline derivation: always accurate, zero maintenance, no sync logic
  Every render = fresh computation from current state
  useMemo: derive inline first → profile → THEN memoize if genuinely slow
  Rule: no useEffect to derive state from state — ever

LIFTING STATE UP
  Two components need to share state → move to lowest common ancestor
  Parent owns state + callback → children receive value + onChangeHandler
  Accordion, tabs, selections → classic lift patterns
  Cost: parent re-renders on change → use memo if subtree is large/expensive

SHARING STATE
  Props down 1–2 levels: direct passing ✅
  Props through 3+ levels (intermediate components don't use them): prop drilling ❌
  Composition / slot pattern: pass pre-wired JSX as children/slot props
  Context (Day 4): broadcast to any depth — auth, theme, locale

SYNCING SIBLINGS
  Siblings cannot communicate directly — never
  Solution: lift state to common parent → pass value + callback to both
  Store one canonical form → derive the other (Celsius/Fahrenheit, USD/EUR)
  Never two states + two useEffects to keep them in sync → causes loops

STATE COLOCATION
  State should live at the LOWEST component that needs it
  Lifting too high → unnecessary re-renders in unrelated subtrees
  Local UI state (hover, open, selected) → stays in the component that shows it
  Push DOWN by default → lift UP only when sharing is required

PRESERVING STATE
  Same component type at same position → state preserved across re-renders
  Different type at same position → unmount + remount → state reset
  hidden attribute → component stays mounted → state preserved
  Bug: same component renders different data (users) at same position → use key
  Never define components inside render → new "type" every render → unmount loop

RESETTING WITH KEY
  Change key → React unmounts old instance → mounts fresh one → state reset
  key={recordId} → form resets on every record switch (atomic, no flash)
  key={formKey} + setFormKey(k => k+1) → reset on demand (submit, cancel)
  Better than useEffect reset: atomic (no stale render), zero maintenance
  Never Math.random() as key → resets on every render (too aggressive)
  Only stable, intentionally-changed values as reset keys
```

> **Your next action:** Find a form in any React project. Check: is any state computable from other state? If yes — delete it and derive it. Ten minutes of real state cleanup teaches this better than rereading this page.

> "Doing one small thing beats opening a feed."