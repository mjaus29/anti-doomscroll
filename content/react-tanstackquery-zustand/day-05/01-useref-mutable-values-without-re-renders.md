# 1 — useRef — Mutable Values Without Re-renders

---

## T — TL;DR

`useRef` stores a **mutable value in a box** (`ref.current`) that persists across renders but **never triggers a re-render** when changed. Two use cases: (1) storing a DOM node, (2) storing any mutable value that must survive re-renders but doesn't control UI output.

---

## K — Key Concepts

```tsx
import { useRef } from 'react'

// ── useRef anatomy ────────────────────────────────────────────────────────
const ref = useRef(initialValue)
// ref = { current: initialValue }
// ref.current is mutable — you can write to it at any time
// Writing to ref.current does NOT trigger a re-render
// ref object itself is stable — same reference across all renders
```

```tsx
// ── Use case 1: persisting a value across renders without re-rendering ─────
function Stopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  //    ↑ stores the interval ID — doesn't need to be state (doesn't affect UI directly)

  function start() {
    if (intervalRef.current) return   // already running
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 10)
    }, 10)
  }

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null   // mutate ref directly — no re-render ✅
    }
    setIsRunning(false)
  }

  function reset() {
    stop()
    setElapsed(0)
  }

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(2)}s</p>
      <button onClick={start}  disabled={isRunning}>Start</button>
      <button onClick={stop}   disabled={!isRunning}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

```tsx
// ── Use case 2: reading the latest value in an effect/callback ─────────────
// The "ref trick" — reading current value without it being a dep
function usePrevious<T>(value: T): T | undefined {
  const prevRef = useRef<T | undefined>(undefined)

  useEffect(() => {
    prevRef.current = value   // update after render
  })   // no deps: runs after every render

  return prevRef.current   // returns value from PREVIOUS render
}

function Counter() {
  const [count, setCount] = useState(0)
  const prevCount = usePrevious(count)

  return (
    <p>
      Current: {count} | Previous: {prevCount ?? 'none'}
    </p>
  )
}
```

```tsx
// ── ref vs state: when to use which ──────────────────────────────────────
//
// USE STATE when: the value affects what the UI renders
//   → new value = re-render needed to show it
//
// USE REF when: the value is internal plumbing — not rendered
//   → timer IDs, subscription handles, previous values, DOM nodes
//   → changing it should NOT trigger a re-render

// ❌ Using state for an interval ID — causes unnecessary re-renders
const [timerId, setTimerId] = useState<number | null>(null)

// ✅ Using ref for an interval ID
const timerRef = useRef<number | null>(null)
```

---

## W — Why It Matters

- The "mutable box" mental model explains why refs don't cause re-renders — React doesn't track mutations to `ref.current`, only `setState` calls. Refs are outside React's reactivity system.
- The interval ID stored in a ref is a canonical example: you need it to call `clearInterval`, but it doesn't belong in the UI — putting it in state would trigger an unnecessary re-render every time you start/stop.
- The `usePrevious` pattern (reading the previous render's value) is a real technique used in animations, diffs, and "what changed" logic — only possible because refs persist across renders without causing them.

---

## I — Interview Q&A

### Q: What is the difference between `useRef` and `useState`?

**A:** Both persist a value across renders. The critical difference: calling `setState` triggers a re-render; mutating `ref.current` does not. `useState` is for values that should be reflected in the UI — changing them should update what the user sees. `useRef` is for values that are internal implementation details — interval IDs, previous values, DOM nodes, subscription handles. If you put an interval ID in state, the component would re-render when you start and stop the timer, which is unnecessary. Another difference: `ref.current` can be mutated directly anywhere, including during event handlers and effects; state must only be changed via the setter.

---

## C — Common Pitfalls + Fix

### ❌ Reading `ref.current` during render and expecting it to be reactive

```tsx
// ❌ Reading ref.current in render — doesn't cause re-renders when changed
function BrokenDisplay() {
  const countRef = useRef(0)

  function handleClick() {
    countRef.current += 1    // updates ref — no re-render
    console.log(countRef.current)  // correct in console
  }

  // But the displayed value never updates — no re-render triggered ❌
  return <p>Count: {countRef.current}</p>
}

// ✅ If the value needs to appear in the UI: use state
function WorkingDisplay() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useLatestCallback` hook: stores the latest version of a callback in a ref so an effect can always call the latest version without it being a dependency.

### Solution

```tsx
import { useRef, useLayoutEffect, useCallback } from 'react'

// Stores the latest callback in a ref — safe to call from effects/timers
// without adding it to the dependency array
function useLatestCallback<T extends (...args: unknown[]) => unknown>(callback: T): T {
  const callbackRef = useRef<T>(callback)

  // useLayoutEffect: update synchronously before any effects run
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  // Stable wrapper — never changes reference, always calls latest callback
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []   // stable across renders ✅
  )
}

// Usage: interval that always calls the latest onTick without restarting
function AutoSave({ onSave }: { onSave: () => void }) {
  const stableOnSave = useLatestCallback(onSave)

  useEffect(() => {
    const id = setInterval(stableOnSave, 5000)  // stableOnSave never changes ✅
    return () => clearInterval(id)
  }, [stableOnSave])  // dep is stable — interval never restarts unnecessarily

  return <p>Auto-saving every 5 seconds…</p>
}
```

---

---
