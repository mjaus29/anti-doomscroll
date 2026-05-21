# 4 — Subscriptions

---

## T — TL;DR

`useMyStore.subscribe(listener)` listens to state changes **outside React** — no component, no re-render, just a callback. Use it for side effects: syncing to `localStorage`, analytics, WebSocket messages, URL state.

---

## K — Key Concepts

```tsx
// ── subscribe: listen outside React ──────────────────────────────────────
const unsubscribe = useCartStore.subscribe(
  (state, prevState) => {
    console.log('Cart changed:', state.items, prevState.items)
  }
)
// Call unsubscribe() to stop listening
// No selector: fires on ANY state change

// ── subscribeWithSelector: listen to a specific slice ────────────────────
import { subscribeWithSelector } from 'zustand/middleware'

const useCartStore = create<CartStore>()(
  subscribeWithSelector(set => ({
    items: [],
    addItem: (item) => set(state => ({ items: [...state.items, item] })),
  }))
)

// Subscribe only to items — fires only when items change
const unsubscribe = useCartStore.subscribe(
  state => state.items,           // selector
  (items, prevItems) => {
    localStorage.setItem('cart', JSON.stringify(items))
  },
  { equalityFn: shallow, fireImmediately: true }
)
```

```tsx
// ── Common subscription patterns ──────────────────────────────────────────

// 1. Persist to localStorage
useCartStore.subscribe(
  s => s.items,
  items => localStorage.setItem('cart', JSON.stringify(items))
)

// 2. Sync URL with filter state
useFilterStore.subscribe(
  s => ({ category: s.category, page: s.page }),
  filters => {
    const params = new URLSearchParams(filters as Record<string, string>)
    window.history.replaceState(null, '', `?${params}`)
  }
)

// 3. Analytics — track significant state changes
useCheckoutStore.subscribe(
  s => s.step,
  (step, prevStep) => {
    if (step !== prevStep) {
      analytics.track('checkout_step', { step, prevStep })
    }
  }
)

// 4. WebSocket: update store from outside React
wsClient.on('cart:updated', (serverCart) => {
  useCartStore.setState({ items: serverCart.items })
})
```

```tsx
// ── Subscribe in a React component's useEffect (cleanup) ─────────────────
function CartPersistence() {
  useEffect(() => {
    const unsub = useCartStore.subscribe(
      s => s.items,
      items => localStorage.setItem('cart', JSON.stringify(items))
    )
    return unsub   // cleanup on unmount ✅
  }, [])
  return null
}
// Or better: put subscriptions in a top-level module (not a component)
// They outlive component lifecycles
```

---

## W — Why It Matters

- Subscriptions decouple side effects from component renders — persistence, analytics, and URL sync happen once globally, not in every component that touches the store.
- `subscribeWithSelector` avoids running the side effect on every state update — you only react when the specific slice you care about changes, same as component selectors.
- WebSocket-driven state updates via `setState` from subscription handlers bridge real-time server events into the Zustand store without any React component involvement.

---

## I — Interview Q&A

### Q: When would you use `subscribe` instead of a `useEffect` inside a component?

**A:** Use `subscribe` for side effects that should run regardless of which component is mounted — or when there's no relevant component at all. Examples: (1) persisting cart to `localStorage` on every change — this should happen even if the cart component is unmounted. (2) Sending analytics events on step changes — these are app-level concerns, not component concerns. (3) Syncing store state to the URL — the URL is global, not owned by any component. (4) WebSocket event handlers updating the store — the WebSocket lifecycle is longer than any component. If the side effect is truly component-specific and should stop when the component unmounts, `useEffect` in the component is correct. If it's app-wide and should run as long as the app is running, module-level `subscribe` is correct.

---

## C — Common Pitfalls + Fix

### ❌ Subscribing without `subscribeWithSelector` — fires on every update

```tsx
// ❌ Without subscribeWithSelector: fires every time ANY state changes
const useStore = create<AppStore>(set => ({ count: 0, theme: 'light', /* ... */ }))

useStore.subscribe((state) => {
  // This runs when count changes, theme changes, anything changes ❌
  localStorage.setItem('theme', state.theme)  // unnecessary writes
})

// ✅ subscribeWithSelector: only fires when theme changes
const useStore = create<AppStore>()(
  subscribeWithSelector(set => ({ count: 0, theme: 'light' }))
)

useStore.subscribe(
  s => s.theme,        // selector
  theme => localStorage.setItem('theme', theme)  // only when theme changes ✅
)
```

---

## K — Coding Challenge + Solution

### Challenge

Add `localStorage` persistence to `useCartStore` using `subscribe`. Load initial state from `localStorage`. Unsubscribe on app teardown.

### Solution

```tsx
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const STORAGE_KEY = 'cart-items'

function loadCartItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => ({
    items: loadCartItems(),   // hydrate from localStorage on init ✅

    addItem: (item) => set(state => {
      const existing = state.items.find(i => i.id === item.id)
      return existing
        ? { items: state.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) }
        : { items: [...state.items, { ...item, qty: 1 }] }
    }),
    removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
    clearCart:  ()   => set({ items: [] }),
    totalItems: ()   => get().items.reduce((sum, i) => sum + i.qty, 0),
  }))
)

// Subscribe at module level — persists as long as the app runs
const unsubCart = useCartStore.subscribe(
  s => s.items,
  items => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn('Cart persist failed:', e)
    }
  }
)

// App teardown (if needed)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', unsubCart)
}

export { useCartStore, unsubCart }
```

---

---
