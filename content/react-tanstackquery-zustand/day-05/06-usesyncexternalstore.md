# 6 — useSyncExternalStore

---

## T — TL;DR

`useSyncExternalStore` subscribes a component to an **external store** (any non-React state: Redux, Zustand internals, browser APIs like `navigator.onLine`, custom pub-sub) and re-renders it when the store changes. It's tear-safe — correct in React 18 concurrent mode.

---

## K — Key Concepts

```tsx
import { useSyncExternalStore } from 'react'

// ── Syntax ────────────────────────────────────────────────────────────────
const snapshot = useSyncExternalStore(
  subscribe,        // (callback) => unsubscribe — called to subscribe to the store
  getSnapshot,      // () => currentValue — called to read the current value
  getServerSnapshot // () => serverValue — optional, for SSR
)
// React calls getSnapshot on every render to get the current value
// React calls subscribe once to listen for changes
// When the store changes: callback() → React re-renders → getSnapshot() called
```

```tsx
// ── Built-in browser store: online status ────────────────────────────────
function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    // subscribe: attach/detach listeners
    callback => {
      window.addEventListener('online',  callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online',  callback)
        window.removeEventListener('offline', callback)
      }
    },
    // getSnapshot: return current value
    () => navigator.onLine,
    // getServerSnapshot: safe value for SSR (no navigator on server)
    () => true
  )
}

function StatusBar() {
  const isOnline = useOnlineStatus()
  return (
    <p style={{ color: isOnline ? 'green' : 'red' }}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </p>
  )
}
```

```tsx
// ── Custom external store ─────────────────────────────────────────────────
// A minimal pub-sub store compatible with useSyncExternalStore

function createStore<T>(initialState: T) {
  let state      = initialState
  const listeners = new Set<() => void>()

  function getSnapshot() { return state }

  function setState(updater: (prev: T) => T) {
    state = updater(state)
    listeners.forEach(cb => cb())   // notify all subscribers
  }

  function subscribe(callback: () => void) {
    listeners.add(callback)
    return () => listeners.delete(callback)   // returns unsubscribe ✅
  }

  return { getSnapshot, setState, subscribe }
}

// Create a shared counter store (outside React — module-level)
const counterStore = createStore({ count: 0 })

// Hook: any component subscribes with useSyncExternalStore
function useCounter() {
  const { count } = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot
  )
  return { count, increment: () => counterStore.setState(s => ({ count: s.count + 1 })) }
}

// Two independent components — both update when store changes
function ComponentA() {
  const { count, increment } = useCounter()
  return <button onClick={increment}>A: {count}</button>
}
function ComponentB() {
  const { count } = useCounter()
  return <p>B sees: {count}</p>   // updates when A increments ✅
}
```

---

## W — Why It Matters

- `useSyncExternalStore` is the **correct** way to subscribe to non-React state in React 18+ — using `useEffect` + `useState` to subscribe to an external store can miss updates in concurrent mode (tearing).
- Every major state manager (Redux, Zustand, Jotai) uses `useSyncExternalStore` internally — understanding it explains how those libraries work at the React integration level.
- Browser APIs like `navigator.onLine`, `matchMedia`, `localStorage` events, and `history` are all external stores — this hook is the idiomatic way to build hooks that read them.

---

## I — Interview Q&A

### Q: Why was `useSyncExternalStore` introduced and when should you use it over `useState` + `useEffect`?

**A:** `useSyncExternalStore` was introduced in React 18 to solve **tearing** — when different components read different values from an external store during a single concurrent render pass. With `useEffect` + `useState`: you subscribe in an effect (fires after render), and between the render and the effect, another render could read a stale value. `useSyncExternalStore` makes React read the store synchronously during render via `getSnapshot`, and forces a synchronous re-render if the value changes mid-commit. Use it when: subscribing to any state that lives outside React (browser APIs, custom stores, third-party state managers). For state that lives inside React, use `useState` or Context.

---

## C — Common Pitfalls + Fix

### ❌ `getSnapshot` returning a new object on every call — infinite re-render loop

```tsx
// ❌ getSnapshot creates a new object every call → React detects "change" → re-renders → repeat
function useBadStore() {
  return useSyncExternalStore(
    store.subscribe,
    () => ({ value: store.getValue() })   // ❌ new object every call
    // React compares with Object.is: {} !== {} → "changed" → re-render → loop
  )
}

// ✅ Return a stable value — same reference if unchanged, or primitive
function useGoodStore() {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getValue()   // ✅ returns primitive or same reference if unchanged
  )
}

// ✅ Or use a selector that returns the specific field you need
function useStoreField<T>(selector: (state: StoreState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
    // If selector returns a primitive (number, string, boolean) → stable ✅
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useLocalStorage` hook using `useSyncExternalStore` that subscribes to `storage` events so all tabs and all components stay in sync.

### Solution

```tsx
// Cross-tab localStorage store using useSyncExternalStore
function createLocalStorageStore<T>(key: string, initialValue: T) {

  function getSnapshot(): T {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  }

  function getServerSnapshot(): T {
    return initialValue   // SSR: no localStorage
  }

  function subscribe(callback: () => void): () => void {
    // React to external storage changes (other tabs)
    function handleStorage(e: StorageEvent) {
      if (e.key === key) callback()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }

  function setValue(value: T | ((prev: T) => T)): void {
    const current  = getSnapshot()
    const next     = typeof value === 'function'
      ? (value as (prev: T) => T)(current)
      : value
    localStorage.setItem(key, JSON.stringify(next))
    // Dispatch storage event for same-tab listeners (storage event only fires for OTHER tabs)
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }

  return { getSnapshot, getServerSnapshot, subscribe, setValue }
}

// Custom hook
function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const store = useMemo(
    () => createLocalStorageStore<T>(key, initialValue),
    [key]   // recreate store only when key changes
  )

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  )

  return [value, store.setValue]
}

// Usage: syncs across tabs and across components in the same app
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  )
}
```

---

---
