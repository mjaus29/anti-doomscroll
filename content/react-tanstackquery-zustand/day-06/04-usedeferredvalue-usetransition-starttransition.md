# 4 — useDeferredValue + useTransition + startTransition

---

## T — TL;DR

React 18 concurrent features let you mark updates as **non-urgent** so urgent UI (input responsiveness) stays smooth. `useTransition` wraps state updates; `useDeferredValue` wraps a value. Both defer expensive re-renders until the browser is idle.

---

## K — Key Concepts

```tsx
import { useTransition, useDeferredValue, startTransition } from 'react'

// ── The problem: slow render blocks input ─────────────────────────────────
// User types → query updates → 10,000-item list re-renders → input lags
// ❌ Without concurrent features: every keystroke waits for the slow render

// ── useTransition: mark a state update as non-urgent ─────────────────────
function SearchPage() {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<string[]>([])
  const [isPending, startTransitionFn] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)          // urgent: input stays responsive ✅

    startTransitionFn(() => {
      setResults(expensiveFilter(e.target.value))  // non-urgent: can be interrupted
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <p>Updating…</p>}   {/* show during transition ✅ */}
      <ResultList results={results} />
    </>
  )
}
```

```tsx
// ── useDeferredValue: defer a prop/value you don't control ────────────────
// Use when you CAN'T wrap the state update (e.g. it's from a parent)
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery   // true while deferred value lags

  const results = useMemo(
    () => expensiveFilter(deferredQuery),
    [deferredQuery]   // only re-runs when deferred query updates
  )

  return (
    <ul style={{ opacity: isStale ? 0.5 : 1 }}>   {/* dim while stale ✅ */}
      {results.map((r, i) => <li key={i}>{r}</li>)}
    </ul>
  )
}

function ParentSearch() {
  const [query, setQuery] = useState('')
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults query={query} />   {/* SearchResults defers internally ✅ */}
    </>
  )
}
```

```tsx
// ── startTransition: the standalone function ──────────────────────────────
import { startTransition } from 'react'

// Use outside components — e.g. in router callbacks
function handleNavigation(path: string) {
  startTransition(() => {
    setCurrentRoute(path)   // route change is non-urgent
  })
}

// ── Choosing: useTransition vs useDeferredValue ───────────────────────────
// useTransition: you OWN the state update (can wrap it in startTransition)
//   → gives isPending flag for loading UI
// useDeferredValue: you DON'T own the update (it's a prop, or from parent)
//   → just pass the value, React defers the render
```

---

## W — Why It Matters

- Input responsiveness is a direct UX metric — users tolerate 10ms delay on typing before noticing lag. A 100ms expensive re-render that blocks every keystroke is felt immediately.
- `isPending` from `useTransition` enables proper loading UX: you can show a spinner or dim the stale results while the transition processes, preventing blank flashes.
- `useDeferredValue` is the consumer-side tool — when you receive a fast-changing prop from a parent you don't control, defer the expensive computation that depends on it.

---

## I — Interview Q&A

### Q: What is the difference between `useTransition` and `useDeferredValue`?

**A:** Both defer expensive renders, but from different positions. `useTransition` gives you a `startTransition` wrapper and `isPending` flag — you wrap the **state update** that triggers the expensive render. Use it when you own the state setter. `useDeferredValue` takes a value and returns a lagging copy — React re-renders the slow parts with the old value while showing the fast parts (like the input) with the new value. Use it when you receive a fast-changing **value as a prop** or can't modify the update code. `useTransition` also gives the `isPending` flag which `useDeferredValue` lacks — making it better for showing loading states during the transition.

---

## C — Common Pitfalls + Fix

### ❌ Wrapping urgent UI updates in `startTransition`

```tsx
// ❌ Input value itself wrapped in transition — input becomes laggy
function BadSearch() {
  const [query, setQuery] = useState('')
  const [, startT] = useTransition()

  return (
    <input
      value={query}
      onChange={e => startT(() => setQuery(e.target.value))}  // ❌ input update is urgent!
    />
  )
}

// ✅ Only the slow downstream update is non-urgent
function GoodSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<string[]>([])
  const [pending, startT]     = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)           // urgent — instant input response ✅
    startT(() => setResults(expensiveFilter(e.target.value)))  // non-urgent ✅
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {pending && <span>…</span>}
      <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a tab switcher where each tab renders a `SlowList` of 2000 items. Use `useTransition` so the tab buttons remain responsive while the list renders.

### Solution

```tsx
const SlowList = memo(function SlowList({ query }: { query: string }) {
  const items = Array.from({ length: 2000 }, (_, i) => `Item ${i}: ${query}`)
  return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
})

const TABS = ['All', 'Active', 'Archived'] as const
type Tab = typeof TABS[number]

function TabSwitcher() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [isPending, startT]       = useTransition()

  function handleTabChange(tab: Tab) {
    startT(() => setActiveTab(tab))   // non-urgent ✅ — tabs click instantly
  }

  return (
    <div>
      <div role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => handleTabChange(tab)}
            style={{
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              opacity:    isPending ? 0.7 : 1,
            }}
          >
            {tab}
          </button>
        ))}
        {isPending && <span> ⏳</span>}
      </div>
      <SlowList query={activeTab} />
    </div>
  )
}
```

---

---
