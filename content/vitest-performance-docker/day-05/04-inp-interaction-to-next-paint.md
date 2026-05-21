# 4 — INP — Interaction to Next Paint

---

## T — TL;DR

INP measures how long from a user interaction (click, tap, keypress) until the browser paints the next frame in response. It captures every interaction and reports the worst one. Poor INP is almost always caused by long JavaScript tasks blocking the main thread. The fix: break up long tasks, move work off the main thread, defer non-critical updates.

---

## K — Key Concepts

```
── INP breakdown — three phases ─────────────────────────────────────────────

User interaction
    │
    ▼
[Input Delay]        Task queue was busy — browser couldn't start event handler
    │                Fix: reduce long tasks running when user interacts
    ▼
[Processing Time]    Event handlers running — your JS executing
    │                Fix: reduce work in event handlers, batch DOM updates
    ▼
[Presentation Delay] Browser rendering the update — style + layout + paint
    │                Fix: avoid forced layout, use CSS transitions, batch writes
    ▼
Next frame painted   ← INP = total time from click to this frame

Target: < 200ms total
```

```typescript
// ── Diagnosing long tasks — the main cause of high input delay ────────────
// DevTools → Performance → record interaction → look for:
//   Long Tasks (red hatching on main thread timeline) > 50ms
//   "Interaction" entry → expand to see Input Delay, Processing, Presentation

// ── Breaking up long tasks with scheduler.yield() ────────────────────────
// scheduler.yield() pauses your task, lets the browser handle pending interactions

async function processLargeList(items: unknown[]) {
  const CHUNK = 50
  for (let i = 0; i < items.length; i += CHUNK) {
    processChunk(items.slice(i, i + CHUNK))

    // Yield to browser every 50 items — allows input events to be processed
    if (i + CHUNK < items.length) {
      await scheduler.yield()    // Chromium 115+
      // Fallback: await new Promise(r => setTimeout(r, 0))
    }
  }
}
```

```typescript
// ── React-specific INP optimizations ─────────────────────────────────────

// 1. startTransition — mark non-urgent updates
import { startTransition, useState } from 'react'

function SearchBox() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)           // urgent: update input immediately

    startTransition(() => {
      setResults(expensiveSearch(e.target.value))  // non-urgent: can be deferred
    })
  }
  return <input value={query} onChange={handleChange} />
}

// 2. useDeferredValue — defer expensive derived state
import { useDeferredValue } from 'react'

function FilteredList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)  // lags behind, keeps UI responsive
  const filtered = items.filter(i => i.name.includes(deferredFilter))
  return <List items={filtered} />
}
```

```typescript
// ── Moving work off the main thread — Web Workers ─────────────────────────
// Heavy computation (parsing, sorting, encryption) → Web Worker

// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { data } = e
  const result = heavyComputation(data)
  self.postMessage(result)
}

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url))
worker.postMessage(largeDataset)
worker.onmessage = (e) => {
  setResults(e.data)  // result arrives without blocking main thread ✅
}
```

```
── Common INP culprits ───────────────────────────────────────────────────────

1. Third-party scripts (ads, analytics, chat widgets)
   → Load async, use Partytown to run in Web Worker

2. Large React component trees re-rendering on every keystroke
   → useMemo, React.memo, virtualization (react-virtual)

3. Synchronous localStorage access in event handlers
   → localStorage.getItem() is synchronous and can block > 10ms for large data
   → Use IndexedDB (async) or cache in memory

4. JSON.parse / JSON.stringify of large objects on click
   → Move to Web Worker or stream parse with structuredClone alternatives
```

---

## W — Why It Matters

- INP measures the worst interaction, not the first — a page can have fast initial load and good FID but terrible INP if it becomes slow after hydration, after data loads, or after a tab has been open for a while. Testing only on page load misses most INP problems.
- Third-party scripts are the silent INP killer — a single analytics script that runs a 200ms task on every click will fail INP even if your own code is optimal. Use the DevTools Performance panel to identify which scripts own long tasks during interactions.
- `startTransition` in React 18+ is a direct INP tool — it tells React that a state update is non-urgent, allowing the browser to interrupt the work and respond to user input. Without it, a slow filter render blocks the entire main thread.

---

## I — Interview Q&A

### Q: What is the difference between input delay and processing time in INP, and how do you reduce each?

**A:** Input delay is the time between the user's interaction and when the browser can start running your event handler — caused by other tasks (long JS execution, third-party scripts) occupying the main thread at the moment of interaction. Reduce it by breaking up long tasks with `scheduler.yield()` or `setTimeout(0)`, and auditing third-party scripts that run during scroll/interaction. Processing time is the time your own event handlers take to execute. Reduce it by moving heavy computation to Web Workers, using `startTransition` to defer non-urgent React updates, memoizing expensive calculations, and batching DOM writes (read all, write all — never interleave reads and writes which forces repeated layout). Presentation delay (the third phase) is reduced by avoiding CSS properties that trigger layout (width, height, top) in favour of compositor-only properties (transform, opacity).

---

## C — Common Pitfalls + Fix

### ❌ Doing expensive work synchronously in a click handler

```typescript
// ❌ 300ms synchronous computation on every click — blocks main thread
button.addEventListener('click', () => {
  const result = items
    .filter(complexFilter)
    .sort(complexSort)
    .map(expensiveTransform)     // 300ms — terrible INP
  render(result)
})

// ✅ Yield mid-computation + defer non-urgent render
button.addEventListener('click', async () => {
  const filtered = items.filter(complexFilter)
  await scheduler.yield()        // let browser breathe

  const sorted = filtered.sort(complexSort)
  await scheduler.yield()

  startTransition(() => {
    setResults(sorted.map(expensiveTransform))  // defer render update
  })
})
```

---

## K — Coding Challenge + Solution

### Challenge

A search input re-renders a list of 5000 items on every keystroke causing INP > 600ms. Fix it using `useDeferredValue` and `React.memo` on the list item component. Show before and after.

### Solution

```tsx
// ❌ Before — 5000 items re-render on every keystroke
function SlowSearch({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter(i => i.name.includes(query))
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>{filtered.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    </>
  )
}

// ✅ After — input updates instantly, list updates deferred
import { useState, useDeferredValue, memo } from 'react'

const ListItem = memo(({ name }: { name: string }) => <li>{name}</li>)

function FastSearch({ items }: { items: Item[] }) {
  const [query, setQuery]   = useState('')
  const deferredQuery       = useDeferredValue(query)  // lags behind deliberately
  const isStale             = query !== deferredQuery  // show loading state

  const filtered = items.filter(i => i.name.includes(deferredQuery))

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}  // always instant ✅
      />
      <ul style={{ opacity: isStale ? 0.6 : 1 }}>
        {filtered.map(i => <ListItem key={i.id} name={i.name} />)}
      </ul>
    </>
  )
}
```

---

---
