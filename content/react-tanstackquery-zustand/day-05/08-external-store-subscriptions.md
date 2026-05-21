# 8 — External Store Subscriptions

---

## T — TL;DR

An **external store** is any state that lives outside React — a custom store class, a singleton, browser APIs. The full pattern: create the store outside React, expose `subscribe`, `getSnapshot`, and mutator functions, then connect any component to it using `useSyncExternalStore`.

---

## K — Key Concepts

```tsx
// ── Complete external store pattern ──────────────────────────────────────
// Three required pieces:
// 1. subscribe(callback) → returns unsubscribe
// 2. getSnapshot() → returns current state (stable reference if unchanged)
// 3. Mutators that update state and notify listeners

class Store<T> {
  private state:     T
  private listeners: Set<() => void> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  // Required by useSyncExternalStore
  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // Required by useSyncExternalStore — must return stable ref if unchanged
  getSnapshot = (): T => this.state

  // Mutator: update state and notify
  protected setState(updater: (prev: T) => T): void {
    this.state = updater(this.state)
    this.listeners.forEach(cb => cb())
  }
}
```

```tsx
// ── Cart store: real-world example ────────────────────────────────────────
interface CartItem { id: string; name: string; price: number; qty: number }
interface CartState { items: CartItem[]; isOpen: boolean }

class CartStore extends Store<CartState> {
  constructor() {
    super({ items: [], isOpen: false })
  }

  addItem(item: Omit<CartItem, 'qty'>): void {
    this.setState(prev => {
      const existing = prev.items.find(i => i.id === item.id)
      return {
        ...prev,
        items: existing
          ? prev.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
          : [...prev.items, { ...item, qty: 1 }],
      }
    })
  }

  removeItem(id: string): void {
    this.setState(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }))
  }

  toggleCart(): void {
    this.setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }

  clearCart(): void {
    this.setState(() => ({ items: [], isOpen: false }))
  }
}

// Singleton: created once, lives for the app's lifetime
const cartStore = new CartStore()
```

```tsx
// ── Hooks connecting components to the store ──────────────────────────────
// Granular selectors: components only re-render when their slice changes
function useCartItems(): CartItem[] {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => cartStore.getSnapshot().items
  )
}

function useCartOpen(): boolean {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => cartStore.getSnapshot().isOpen
  )
}

function useCartTotal(): number {
  const items = useCartItems()
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

// ── Components ────────────────────────────────────────────────────────────
function CartIcon() {
  const items  = useCartItems()
  const count  = items.reduce((s, i) => s + i.qty, 0)

  return (
    <button onClick={() => cartStore.toggleCart()}>
      🛒 {count > 0 && <span className="badge">{count}</span>}
    </button>
  )
}

function CartPanel() {
  const items  = useCartItems()
  const isOpen = useCartOpen()
  const total  = useCartTotal()

  if (!isOpen) return null
  return (
    <aside className="cart-panel">
      <h2>Your Cart</h2>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name} × {item.qty}</span>
          <span>${(item.price * item.qty).toFixed(2)}</span>
          <button onClick={() => cartStore.removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={() => cartStore.clearCart()}>Clear</button>
    </aside>
  )
}
```

---

## W — Why It Matters

- The pattern here — store class + `useSyncExternalStore` + selector hooks — is exactly how Zustand works internally. Understanding this demystifies state libraries.
- Granular selector hooks (`useCartItems`, `useCartOpen`) mean components only re-render when their slice of state changes — `CartPanel` doesn't re-render when `isOpen` changes if it only subscribes to `items`.
- Singleton stores (module-level) persist across component unmounts — the cart doesn't reset when the `CartPanel` unmounts. This is the key advantage over `useState` for global state.

---

## I — Interview Q&A

### Q: How does `useSyncExternalStore` prevent tearing in concurrent React?

**A:** Tearing happens when React renders different components and they read different values from the same store during one concurrent render pass — one component reads the old value, another reads the new one, producing an inconsistent UI. `useSyncExternalStore` prevents this by: (1) calling `getSnapshot` during render to read the current value, (2) subscribing to the store and re-rendering if the snapshot changes during the render pass — React detects the inconsistency and forces a synchronous re-render before committing. With `useEffect` + `useState`, there's a window between render and the effect subscribing where React could commit a partially-torn state. `useSyncExternalStore` closes this window.

---

## C — Common Pitfalls + Fix

### ❌ Subscribing with a new function on every render — re-subscribes constantly

```tsx
// ❌ New subscribe function on every render — React re-subscribes on every render
function useCartItemsBad() {
  return useSyncExternalStore(
    (callback) => {          // ❌ new function reference every render
      cartStore.subscribe(callback)
      return () => cartStore.unsubscribe(callback)
    },
    () => cartStore.getSnapshot().items
  )
}

// ✅ Pass a stable method reference — or define outside the component
function useCartItemsGood() {
  return useSyncExternalStore(
    cartStore.subscribe,        // ✅ stable method reference (bound in class)
    () => cartStore.getSnapshot().items
  )
}

// ✅ If you need to subscribe with params: memoize with useCallback
function useStoreSlice<T>(selector: (s: StoreState) => T): T {
  const getSnapshot = useCallback(
    () => selector(store.getSnapshot()),
    [selector]
  )
  return useSyncExternalStore(store.subscribe, getSnapshot)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useMediaQuery` hook using `useSyncExternalStore` that subscribes to `window.matchMedia` and returns whether the query matches.

### Solution

```tsx
// Create a stable store per media query string
const mediaQueryStores = new Map<string, {
  subscribe:   (cb: () => void) => () => void
  getSnapshot: () => boolean
}>()

function getMediaQueryStore(query: string) {
  if (!mediaQueryStores.has(query)) {
    const mql = window.matchMedia(query)

    const store = {
      subscribe: (callback: () => void): (() => void) => {
        mql.addEventListener('change', callback)
        return () => mql.removeEventListener('change', callback)
      },
      getSnapshot: (): boolean => mql.matches,
    }
    mediaQueryStores.set(query, store)
  }
  return mediaQueryStores.get(query)!
}

function useMediaQuery(query: string): boolean {
  const store = useMemo(() => getMediaQueryStore(query), [query])

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => false   // SSR: default to false (mobile-first)
  )
}

// Usage
function ResponsiveNav() {
  const isMobile  = useMediaQuery('(max-width: 767px)')
  const isDark    = useMediaQuery('(prefers-color-scheme: dark)')
  const isReduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <nav data-theme={isDark ? 'dark' : 'light'}>
      {isMobile ? <HamburgerMenu />  : <DesktopNav />}
      {isReduced && <p>Reduced motion mode</p>}
    </nav>
  )
}
```

---

## ✅ Day 5 Complete — React Escape Hatches

| # | Subtopic | Status |
|---|----------|--------|
| 1 | useRef — Mutable Values Without Re-renders | ☐ |
| 2 | DOM Access with Refs + forwardRef | ☐ |
| 3 | useImperativeHandle | ☐ |
| 4 | useLayoutEffect | ☐ |
| 5 | Layout Measurement Before Paint | ☐ |
| 6 | useSyncExternalStore | ☐ |
| 7 | Imperative Interoperability | ☐ |
| 8 | External Store Subscriptions | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
useRef
  Mutable box: { current: value } — persists across renders, no re-render on change
  Use for: timer IDs, subscription handles, previous values, DOM nodes
  Use state when: value appears in the UI | Use ref when: internal plumbing
  ref.current read in render = no reactive update — only event handlers/effects
  usePrevious pattern: update in useEffect → returns last render's value

DOM ACCESS + forwardRef
  ref={myRef} → myRef.current = DOM node after mount, null after unmount
  Type: useRef<HTMLInputElement>(null) — TypeScript knows the element API
  forwardRef: lets parent access child's internal DOM node
  Use: focus management, scroll control, canvas drawing, measurements
  Ref callback: fires synchronously on attach/detach — no useEffect needed
  ⚠️ Never access ref.current during render — DOM doesn't exist yet

useImperativeHandle
  Replaces raw DOM node with a custom API object for the parent's ref
  Always used with forwardRef
  Restricts what parents can do — only exposed methods are callable
  Common: modal.open/close, input.focus/clear, player.play/pause/seek
  Deps array: include any state/props the handle methods close over
  Prevents: parents making arbitrary DOM mutations (style, value, attributes)

useLayoutEffect
  Runs synchronously after DOM commit, BEFORE browser paint (blocks paint)
  Use when: DOM measurement → mutation that must happen before user sees anything
  Use case: tooltip/popover positioning, scroll restoration, equal heights
  useEffect: 99% of cases (async, after paint, non-blocking)
  useLayoutEffect: only when you can explain why pre-paint timing is needed
  SSR: useLayoutEffect warns (no DOM) → useIsomorphicLayoutEffect pattern

LAYOUT MEASUREMENT
  getBoundingClientRect: position+size relative to viewport (after layout)
  clientWidth/Height: visible size | scrollWidth/Height: total scrollable size
  offsetTop/Left: position from positioned ancestor
  ResizeObserver: better than window.resize — fires per element, not per viewport
  useLayoutEffect + ResizeObserver = correct pattern for size-reactive components
  Never measure DOM during render — always in useLayoutEffect or ref callbacks

useSyncExternalStore
  Subscribes to state that lives outside React (stores, browser APIs)
  Required: subscribe(callback) → unsubscribe, getSnapshot() → current value
  Optional: getServerSnapshot() → SSR safe value
  Prevents tearing: reads store synchronously during render
  getSnapshot must return stable reference — new object every call = infinite loop
  Used internally by: Redux, Zustand, Jotai, Valtio
  Built-in use cases: navigator.onLine, matchMedia, localStorage events

IMPERATIVE INTEROPERABILITY
  Pattern: React owns container div, library owns interior DOM
  Effect 1 ([] deps): init library, store instance in ref, cleanup = destroy
  Effect 2+ (relevant deps): sync props to library via its API
  Never re-init on every prop change — separate init from sync
  Cleanup is mandatory — Strict Mode double-invoke surfaces missing cleanup
  Rule: never fight the library over the DOM — clear ownership boundaries

EXTERNAL STORE SUBSCRIPTIONS
  Full pattern: subscribe + getSnapshot + mutators (setState + notify)
  Singleton stores: module-level — persist across component unmounts
  Granular selectors: useSelector(store, s => s.items) — re-render only on slice change
  useCartItems, useCartOpen → separate hooks for separate concerns
  subscribe reference must be stable — class method or defined outside component
  This IS how Zustand works internally — understanding it demystifies state libraries
```

> **Your next action:** Find a component using `useEffect` to set `document.title` or subscribe to a window event. Verify it has a cleanup function — add one if missing. Then check if it would benefit from a custom hook extraction. Ten minutes of real code beats rereading this page.

> "Doing one small thing beats opening a feed."
