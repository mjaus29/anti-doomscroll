# 6 — Removing Unnecessary Effects

---

## T — TL;DR

Most effects you think you need, you don't. Common unnecessary effects: deriving state from state (compute inline), resetting state on prop change (use `key`), sending events on user action (use handler), transforming data (compute inline). Fewer effects = simpler code.

---

## K — Key Concepts

```tsx
// ── You don't need useEffect to derive state ──────────────────────────────
// ❌ Effect updates derived state
function SearchList({ items }: { items: string[] }) {
  const [query,    setQuery]    = useState('')
  const [filtered, setFiltered] = useState(items)   // ❌

  useEffect(() => {
    setFiltered(items.filter(i => i.includes(query)))  // ❌ extra render
  }, [items, query])

  return <ul>{filtered.map((i, n) => <li key={n}>{i}</li>)}</ul>
}

// ✅ Just compute it
function SearchListFixed({ items }: { items: string[] }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter(i => i.includes(query))  // derived ✅
  return <ul>{filtered.map((i, n) => <li key={n}>{i}</li>)}</ul>
}
```

```tsx
// ── You don't need useEffect to reset state when props change ─────────────
// ❌ Effect clears form when userId changes — stale flash before effect runs
function UserForm({ userId }: { userId: number }) {
  const [name, setName] = useState('')
  useEffect(() => { setName('') }, [userId])  // ❌ renders once with stale name
  return <input value={name} onChange={e => setName(e.target.value)} />
}

// ✅ Use key — atomic reset, no stale render
function UserFormParent() {
  const [userId, setUserId] = useState(1)
  return <UserForm key={userId} userId={userId} />  // ✅
}
function UserForm({ userId }: { userId: number }) {
  const [name, setName] = useState('')  // always starts empty ✅
  return <input value={name} onChange={e => setName(e.target.value)} />
}
```

```tsx
// ── You don't need useEffect to handle a buy event ────────────────────────
// ❌ Routing user action through state + effect
function ShopItem({ item }: { item: Item }) {
  const [purchased, setPurchased] = useState(false)

  useEffect(() => {
    if (purchased) {
      logPurchase(item.id)   // ❌ side effect for a one-time event
      setPurchased(false)
    }
  }, [purchased, item.id])

  return <button onClick={() => setPurchased(true)}>Buy</button>
}

// ✅ Direct call in event handler
function ShopItemFixed({ item }: { item: Item }) {
  function handleBuy() {
    logPurchase(item.id)   // ✅ direct, runs once per click
  }
  return <button onClick={handleBuy}>Buy</button>
}
```

```tsx
// ── You don't need useEffect to fetch on mount when data is passed as prop ─
// ❌ Fetching inside a component that already receives data as a prop
function ProductList({ categoryId }: { categoryId: number }) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts(categoryId).then(setProducts)
  }, [categoryId])
  // If the parent already has this data, it should pass it as a prop ❌
}

// ✅ Lift the fetch to the parent OR use TanStack Query (Day 5)
// If parent fetches: <ProductList products={products} />
// If component fetches: use TanStack Query — handles caching, dedup, errors
```

---

## W — Why It Matters

- Every unnecessary `useEffect` adds a render cycle, complexity, and potential stale state bugs. The React team explicitly documents that many common `useEffect` uses are anti-patterns.
- Recognizing "I don't need an effect here" is a mark of React maturity — junior developers reach for `useEffect` whenever something "needs to happen"; senior developers ask "is there an external system involved?"
- The `useEffect` for derived state anti-pattern (`setFiltered` in an effect) is especially costly — it causes an extra render on every state change and delays the UI update by one tick.

---

## I — Interview Q&A

### Q: Name three situations where developers incorrectly use `useEffect` and the correct alternatives.

**A:** (1) **Deriving state from other state** — `useEffect(() => setTotal(items.reduce(...)), [items])`. Fix: compute `total` inline during render — it's always current and requires no sync. (2) **Resetting component state when a prop changes** — `useEffect(() => resetForm(), [userId])`. Fix: add `key={userId}` on the component — React remounts it atomically with fresh state. (3) **Performing a side effect in response to a user event** — `useEffect(() => { if (submitted) sendEmail() }, [submitted])`. Fix: call `sendEmail()` directly in the submit event handler — it should run once because the user submitted, not because `submitted` became `true`.

---

## C — Common Pitfalls + Fix

### ❌ Infinite loop from setting state inside an effect with that state in deps

```tsx
// ❌ Classic infinite loop
function InfiniteLoop() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(count + 1)  // updates count
  }, [count])            // which triggers the effect again → infinite ❌
}

// ❌ Object/array created in render in effect deps
function ObjectLoop({ userId }: { userId: number }) {
  const [data, setData] = useState(null)
  const options = { userId, extra: true }   // new reference every render

  useEffect(() => {
    fetchData(options).then(setData)
  }, [options])   // options changes every render → infinite loop ❌
}

// ✅ Use functional updater — no need to read count in the effect
function CounterFixed() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000)  // no count in deps ✅
    return () => clearInterval(id)
  }, [])
}

// ✅ Move object outside component or useMemo (if dynamic)
const OPTIONS = { extra: true } as const
function ObjectLoopFixed({ userId }: { userId: number }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetchData({ ...OPTIONS, userId }).then(setData)
  }, [userId])   // only userId is dynamic ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Audit and fix this component that overuses `useEffect` in four places.

### Solution

```tsx
interface Order { id: number; items: { price: number; qty: number }[]; coupon: string }

// ❌ Before: four unnecessary effects
function OrderSummaryBad({ order, userId }: { order: Order; userId: number }) {
  const [subtotal,   setSubtotal]   = useState(0)
  const [discount,   setDiscount]   = useState(0)
  const [total,      setTotal]      = useState(0)
  const [submitted,  setSubmitted]  = useState(false)

  useEffect(() => {   // ❌ 1: deriving subtotal
    setSubtotal(order.items.reduce((s, i) => s + i.price * i.qty, 0))
  }, [order.items])

  useEffect(() => {   // ❌ 2: deriving discount (depends on subtotal — extra render)
    setDiscount(order.coupon === 'SAVE10' ? subtotal * 0.1 : 0)
  }, [subtotal, order.coupon])

  useEffect(() => {   // ❌ 3: deriving total
    setTotal(subtotal - discount)
  }, [subtotal, discount])

  useEffect(() => {   // ❌ 4: event routed through state
    if (submitted) {
      logOrderSubmit(userId, order.id)
      setSubmitted(false)
    }
  }, [submitted, userId, order.id])

  return (
    <div>
      <p>Subtotal: ${subtotal}</p>
      <p>Discount: -${discount}</p>
      <p>Total: ${total}</p>
      <button onClick={() => setSubmitted(true)}>Submit order</button>
    </div>
  )
}

// ✅ After: zero effects
function OrderSummaryGood({ order, userId }: { order: Order; userId: number }) {
  // 1,2,3: all derived inline — always correct, no extra renders
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = order.coupon === 'SAVE10' ? subtotal * 0.1 : 0
  const total    = subtotal - discount

  // 4: event directly in handler
  function handleSubmit() {
    logOrderSubmit(userId, order.id)   // ✅ once, on click
  }

  return (
    <div>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Discount: -${discount.toFixed(2)}</p>
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={handleSubmit}>Submit order</button>
    </div>
  )
}
```

---

---
