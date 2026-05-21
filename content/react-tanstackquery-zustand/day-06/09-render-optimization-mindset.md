# 9 — Render Optimization Mindset

---

## T — TL;DR

Render optimization is **measure first, optimize second**. Most React apps are fast by default. The mindset: understand why re-renders happen, know the tools (`React.memo`, `useMemo`, `useCallback`, code splitting, concurrent features), and reach for them only when profiling shows a real problem.

---

## K — Key Concepts

```
── Optimization decision tree ────────────────────────────────────────────────

1. Is the app actually slow?
   NO → stop. Don't optimize.
   YES → open React DevTools Profiler

2. Which component renders most frequently / takes longest?
   → Look at flame chart, ranked chart

3. Why is it re-rendering?
   "Parent rendered" → consider React.memo on child
   "State changed"   → check if state is in the right place (colocation)
   "Context changed" → split contexts, memoize provider value

4. Is it slow because of a heavy computation?
   → useMemo for the computation
   → Only if profiling shows the computation is actually slow

5. Is it slow because children always re-render from new function refs?
   → useCallback on the function + React.memo on the child

6. Is the initial bundle too large?
   → React.lazy + Suspense for code splitting

7. Is a user interaction blocking the UI?
   → useTransition / useDeferredValue for concurrent rendering
```

```tsx
// ── React.memo: skip re-render when props haven't changed ─────────────────
// Only use when the component: (a) renders often, (b) is expensive to render,
// (c) receives the same props frequently
const ExpensiveRow = memo(function ExpensiveRow({ data, onAction }: RowProps) {
  // Expensive rendering...
  return <tr><td>{data.name}</td><td>{data.value}</td></tr>
})
// Without memo: parent re-renders → all rows re-render
// With memo + stable props: rows only re-render when their data changes ✅
```

```tsx
// ── The three questions before adding any memoization ─────────────────────
// 1. Have I profiled and confirmed this is actually slow?
// 2. Does the memoization actually help (deps stable enough to hit cache)?
// 3. Is the added complexity worth the benefit?

// ── Common optimizations ranked by ROI ────────────────────────────────────
// HIGH IMPACT, LOW RISK:
//   - Code splitting with React.lazy (reduces initial bundle)
//   - State colocation (prevents over-rendering from lifted state)
//   - Correct keys in lists (prevents wrong unmount/remount)
//   - Avoid inline object/array creation in render for memo'd children

// MEDIUM IMPACT, SOME COMPLEXITY:
//   - React.memo on large list items
//   - useMemo for genuinely expensive computations (large dataset operations)
//   - useTransition for slow tab/route switches

// LOW IMPACT, HIGH COMPLEXITY:
//   - useCallback on every handler
//   - useMemo on every value
//   - Micro-optimizing components that render in < 1ms
```

```tsx
// ── Virtualization: the real fix for large lists ──────────────────────────
// React.memo can't help if you're rendering 10,000 rows
// Virtual rendering: only render visible items
// Libraries: @tanstack/react-virtual, react-window

import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count:    items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,   // estimated row height
  })

  return (
    <div ref={parentRef} style={{ height: 400, overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtual => (
          <div
            key={virtual.index}
            style={{
              position:  'absolute',
              top:        virtual.start,
              height:     virtual.size,
              width:      '100%',
            }}
          >
            {items[virtual.index]}
          </div>
        ))}
      </div>
    </div>
  )
}
// Renders only ~10–15 visible rows regardless of list size ✅
```

---

## W — Why It Matters

- Premature optimization wastes time and adds complexity without benefit. The React team has said most apps don't need `useMemo`/`useCallback` — profile first.
- The optimization hierarchy matters: colocation → code splitting → memo → concurrent features. Applying them in reverse order (adding `useMemo` everywhere when the real issue is too much state in App) wastes effort.
- Virtualization is the only correct solution for lists of 1000+ items — `React.memo` can't help when 1000 components render their DOM correctly but just have too many DOM nodes.

---

## I — Interview Q&A

### Q: Walk me through how you would diagnose and fix a slow React component.

**A:** (1) **Confirm it's slow** — open DevTools, record a profile while interacting. Look for long frames (>16ms), frequent renders, or expensive components. (2) **Identify the cause** — React DevTools Profiler shows why each component rendered: props changed, state changed, or parent rendered. "Parent rendered" is the most common cause of unnecessary re-renders. (3) **Structural fix first** — can I colocate the state that's changing to a lower component so it only affects the relevant subtree? This is zero-overhead. (4) **React.memo** — if a child receives the same props most of the time but still re-renders because its parent does, wrap it with `React.memo`. Ensure props are stable (no inline objects/functions). (5) **useMemo/useCallback** — only for components where profiling shows the computation or new reference is the actual bottleneck. (6) **Virtualization** — for long lists. (7) **Code splitting** — for large initial bundles.

---

## C — Common Pitfalls + Fix

### ❌ Memoizing everything "just in case"

```tsx
// ❌ useMemo/useCallback on everything — adds overhead, reduces readability
function ProfileCard({ user }: { user: User }) {
  const displayName  = useMemo(() => `${user.first} ${user.last}`, [user.first, user.last])
  const formattedDate = useMemo(() => new Date(user.joined).toLocaleDateString(), [user.joined])
  const handleClick  = useCallback(() => console.log(user.id), [user.id])
  const style        = useMemo(() => ({ color: user.active ? 'green' : 'gray' }), [user.active])

  return <div style={style} onClick={handleClick}>{displayName} · {formattedDate}</div>
}
// None of these improve performance — they add memory and comparison overhead
// for trivial string concatenations and a single console.log

// ✅ Just compute inline — these are not expensive
function ProfileCardFixed({ user }: { user: User }) {
  const displayName   = `${user.first} ${user.last}`
  const formattedDate = new Date(user.joined).toLocaleDateString()
  const style         = { color: user.active ? 'green' : 'gray' }

  return (
    <div style={style} onClick={() => console.log(user.id)}>
      {displayName} · {formattedDate}
    </div>
  )
}
// Inline is faster here — no memoization overhead for sub-microsecond operations
```

---

## K — Coding Challenge + Solution

### Challenge

Profile this component (mentally), identify the optimization opportunity, and apply the minimum fix.

### Solution

```tsx
// BEFORE — identify the problem
function ContactList({ contacts }: { contacts: Contact[] }) {
  const [search,  setSearch]  = useState('')
  const [theme,   setTheme]   = useState<'light'|'dark'>('light')

  // Problem 1: filtered is an expensive operation over 5000 contacts
  // Problem 2: handleCall is new on every render → ContactRow always re-renders
  // Problem 3: theme change re-renders ALL ContactRows unnecessarily

  const filtered  = contacts.filter(c => c.name.includes(search))
  const handleCall = (id: number) => initiateCall(id)

  return (
    <div data-theme={theme}>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      {filtered.map(c => <ContactRow key={c.id} contact={c} onCall={handleCall} />)}
    </div>
  )
}

// AFTER — targeted fixes
const ContactRow = memo(function ContactRow(
  { contact, onCall }: { contact: Contact; onCall: (id: number) => void }
) {
  return (
    <li>
      {contact.name}
      <button onClick={() => onCall(contact.id)}>Call</button>
    </li>
  )
})

function ContactListFixed({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState('')
  const [theme,  setTheme]  = useState<'light'|'dark'>('light')

  // Fix 1: memoize expensive filter — only re-runs when contacts or search changes
  const filtered = useMemo(
    () => contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [contacts, search]
  )

  // Fix 2: stable callback reference — ContactRow won't re-render from theme change
  const handleCall = useCallback((id: number) => initiateCall(id), [])

  return (
    <div data-theme={theme}>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      <ul>
        {/* Theme change: App re-renders, filter result is same → ContactRow skips ✅ */}
        {filtered.map(c => (
          <ContactRow key={c.id} contact={c} onCall={handleCall} />
        ))}
      </ul>
    </div>
  )
}
```

---

## ✅ Day 6 Complete — Advanced React Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | useMemo + useCallback | ☐ |
| 2 | useReducer | ☐ |
| 3 | useContext + Reducer + Context Pattern | ☐ |
| 4 | useDeferredValue + useTransition + startTransition | ☐ |
| 5 | useId + useOptimistic + Optimistic UI | ☐ |
| 6 | Composition + Lazy Loading + Suspense | ☐ |
| 7 | Error Boundaries | ☐ |
| 8 | Accessibility | ☐ |
| 9 | Render Optimization Mindset | ☐ |

---

## 🗺️ One-Page Mental Model — Day 6

```
useMemo + useCallback
  useMemo(() => expr, deps)     → memoize a VALUE
  useCallback(fn, deps)         → memoize a FUNCTION REFERENCE
  Both re-compute only when deps change
  Only useful when: expensive computation | passing to React.memo child | effect dep
  Default: compute inline. Add memo only after profiling confirms benefit

useReducer
  (state, action) → newState — pure function, testable without React
  Dispatch named actions with typed payloads (discriminated unions)
  Use when: 3+ related state fields, complex transitions, testable logic needed
  ❌ Mutate in reducer → return new objects/arrays always
  Pattern: FetchAction union type → impossible invalid states

useContext + Reducer + Context
  createContext → Provider with useReducer → custom hooks to consume
  Split StateCtx and DispatchCtx: dispatch consumers don't re-render on state changes
  Custom hook guard: if(!ctx) throw → clear error outside provider
  ❌ Object literal as value → useMemo the value object
  Use for: auth, theme, locale, notifications — not high-frequency state

Concurrent Features
  useTransition → wrap non-urgent state update, get isPending flag
  useDeferredValue → defer a value you receive as prop
  startTransition → standalone version, usable outside components
  ❌ Wrap urgent updates (input value) in transition → input becomes laggy
  ✅ Wrap slow downstream updates (list filter, tab content) in transition
  isPending → show ⏳ spinner or dim stale content while transition processes

useId + useOptimistic
  useId() → stable server+client safe ID for htmlFor/aria-labelledby
  ❌ Math.random() for IDs → hydration mismatch in SSR
  useOptimistic(state, reducer) → instantly show predicted state during async
  Always roll back on error — optimistic without rollback = lying to the user
  Pattern: addOptimistic(tempItem) → await server → setRealItems(result)

Composition + Lazy + Suspense
  children prop, render props, compound components — three composition patterns
  React.lazy(() => import('./Page')) → code split at component level
  Suspense fallback={<Skeleton />} → show while bundle/data loads
  Granular boundaries > one global boundary → progressive content reveal
  ❌ lazy() inside render → re-downloads bundle every render

Error Boundaries
  Must be class components (no hook equivalent) → use react-error-boundary package
  getDerivedStateFromError → switch to fallback UI
  componentDidCatch → log to Sentry/Datadog
  ❌ Catch: async errors, event handlers → use try/catch / useAsyncError
  ✅ Catch: render errors, lifecycle errors, constructor errors
  Granular boundaries: each section isolated, resetErrorBoundary to recover

Accessibility
  Semantic HTML first: button, nav, main, article, aside — free keyboard + ARIA
  aria-label for icon buttons, aria-describedby for hints, aria-live for announcements
  Modal: focus in on open, Escape to close, focus out to trigger on close
  role="alert" → urgent | aria-live="polite" → non-urgent screen reader announcements
  ❌ div onClick → keyboard unreachable | ❌ icon button without label → "button X"

Render Optimization Mindset
  Profile FIRST — React DevTools Profiler → identify real bottlenecks
  Why did this render? → Props / State / Parent / Context
  Fix hierarchy: colocation → code splitting → React.memo → useMemo → concurrent
  Virtualization (@tanstack/react-virtual): the only fix for 1000+ item lists
  ❌ useMemo/useCallback on every function/value → overhead > benefit
  ✅ Optimize the structure (where state lives) before optimizing the render
```

> **Your next action:** Open React DevTools → Profiler → Record → click something in your app → Stop. Find the component that rendered the most. Ask: "Why? Is the state in the right place?" Fix the structure before reaching for `memo`. Five minutes of real profiling teaches this better than any re-read.

> "Doing one small thing beats opening a feed."
