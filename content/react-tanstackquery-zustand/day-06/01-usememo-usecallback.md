# 1 — useMemo + useCallback

---

## T — TL;DR

`useMemo` memoizes a **computed value**; `useCallback` memoizes a **function reference**. Both re-compute only when dependencies change. Use them to avoid expensive recalculations and to stabilize references passed to memoized children — not as a default for every value or function.

---

## K — Key Concepts

```tsx
import { useMemo, useCallback, memo } from 'react'

// ── useMemo: memoize expensive computations ───────────────────────────────
function ProductList({ products, query, sortKey }: Props) {
  // ❌ Without useMemo: runs on every render (fine for small arrays)
  // const filtered = products.filter(p => p.name.includes(query))

  // ✅ With useMemo: only re-runs when products, query, or sortKey change
  const processed = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a[sortKey] > b[sortKey] ? 1 : -1)
  }, [products, query, sortKey])

  return <ul>{processed.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// ── useMemo for referential stability ────────────────────────────────────
function Dashboard({ userId }: { userId: number }) {
  const [count, setCount] = useState(0)

  // Without useMemo: new object reference every render
  // MemoChild sees "new" config even when userId hasn't changed
  const config = useMemo(
    () => ({ userId, theme: 'dark', limit: 20 }),
    [userId]   // stable when userId is stable ✅
  )

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoChild config={config} />  {/* won't re-render on count change ✅ */}
    </>
  )
}
```

```tsx
// ── useCallback: stabilize function references ────────────────────────────
function ParentList({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<number | null>(null)

  // ❌ New function on every render → MemoItem always re-renders
  // const handleSelect = (id: number) => setSelected(id)

  // ✅ Stable function reference — MemoItem only re-renders when needed
  const handleSelect = useCallback((id: number) => {
    setSelected(id)
  }, [])  // no deps: setSelected is stable

  return (
    <ul>
      {items.map(item => (
        <MemoItem
          key={item.id}
          item={item}
          isSelected={selected === item.id}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  )
}

// MemoItem only re-renders when its specific props change
const MemoItem = memo(function MemoItem(
  { item, isSelected, onSelect }: ItemProps
) {
  return (
    <li
      onClick={() => onSelect(item.id)}
      style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
    >
      {item.name}
    </li>
  )
})
```

```tsx
// ── When NOT to memoize ────────────────────────────────────────────────────
// ❌ Memoizing cheap computations — overhead > benefit
const doubled = useMemo(() => count * 2, [count])   // just write: count * 2

// ❌ Memoizing every handler by default — premature optimization
const handleClick = useCallback(() => setOpen(true), [])
// Only needed when passed to a React.memo child

// ✅ Memoize when:
// 1. Computation is measurably slow (large sort/filter, complex math)
// 2. Function/object is passed to React.memo'd child
// 3. Function/object is a useEffect dependency that would cause infinite loops
```

---

## W — Why It Matters

- `useMemo`/`useCallback` are **not** free — they add memory overhead and comparison cost. Using them everywhere slows React down. Profile first.
- The only reason to `useCallback` a handler is to pass it to a `React.memo` child or include it as an effect dependency — otherwise it's noise.
- Referential stability is the key concept: React.memo bails out based on reference equality (`===`). A new function/object reference on every render defeats memoization even if the value is logically identical.

---

## I — Interview Q&A

### Q: What is the difference between `useMemo` and `useCallback`?

**A:** `useMemo` memoizes the **return value** of a function — it runs the function and caches the result, re-running only when dependencies change. `useCallback` memoizes the **function itself** — it returns the same function reference across renders until dependencies change. `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. Use `useMemo` for expensive computed values (filtered/sorted arrays, complex derived data). Use `useCallback` for functions passed to `React.memo` children or included as `useEffect` dependencies where you need a stable reference. Neither should be used by default — only where profiling confirms a benefit.

---

## C — Common Pitfalls + Fix

### ❌ Memoizing with unstable dependencies — memoization never hits

```tsx
// ❌ Options object created in render = new reference every render = useMemo never caches
function Search({ query }: { query: string }) {
  const options = { caseSensitive: false, limit: 50 }  // new every render ❌

  const results = useMemo(
    () => expensiveSearch(query, options),
    [query, options]   // options changes every render → memo recalculates every render ❌
  )
}

// ✅ Move static config outside component — stable reference
const SEARCH_OPTIONS = { caseSensitive: false, limit: 50 } as const

function SearchFixed({ query }: { query: string }) {
  const results = useMemo(
    () => expensiveSearch(query, SEARCH_OPTIONS),
    [query]   // only re-runs when query changes ✅
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `FilteredTable` with `useMemo` for filtered+sorted rows and `useCallback` for a memoized row-click handler passed to `React.memo` rows.

### Solution

```tsx
interface Row { id: number; name: string; score: number }

const TableRow = memo(function TableRow(
  { row, onClick }: { row: Row; onClick: (id: number) => void }
) {
  console.log('TableRow render:', row.id)
  return (
    <tr onClick={() => onClick(row.id)}>
      <td>{row.name}</td>
      <td>{row.score}</td>
    </tr>
  )
})

function FilteredTable({ rows }: { rows: Row[] }) {
  const [query,  setQuery]  = useState('')
  const [sortAsc,setSortAsc] = useState(true)
  const [selected,setSelected] = useState<number | null>(null)

  const processed = useMemo(() => {
    const filtered = rows.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    )
    return [...filtered].sort((a, b) =>
      sortAsc ? a.score - b.score : b.score - a.score
    )
  }, [rows, query, sortAsc])

  const handleClick = useCallback((id: number) => {
    setSelected(id)
  }, [])

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter…" />
      <button onClick={() => setSortAsc(a => !a)}>
        Sort {sortAsc ? '▲' : '▼'}
      </button>
      <table>
        <tbody>
          {processed.map(row => (
            <TableRow key={row.id} row={row} onClick={handleClick} />
          ))}
        </tbody>
      </table>
      {selected !== null && <p>Selected ID: {selected}</p>}
    </div>
  )
}
```

---

---
