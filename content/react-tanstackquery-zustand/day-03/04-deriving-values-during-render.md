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
