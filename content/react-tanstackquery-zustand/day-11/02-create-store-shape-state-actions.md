# 2 — create + Store Shape + State + Actions

---

## T — TL;DR

A Zustand store is created with `create(set => ({ ...state, ...actions }))`. The state and the functions that update it live in the same object. `set` merges new values into the store — no reducers, no action types.

---

## K — Key Concepts

```tsx
import { create } from 'zustand'

// ── Minimal store ──────────────────────────────────────────────────────────
interface CounterStore {
  count:     number
  increment: () => void
  decrement: () => void
  reset:     () => void
  setCount:  (n: number) => void
}

const useCounterStore = create<CounterStore>(set => ({
  // State
  count: 0,

  // Actions — functions that call set()
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
  reset:     () => set({ count: 0 }),
  setCount:  (n) => set({ count: n }),
}))
```

```tsx
// ── Store with multiple state fields ─────────────────────────────────────
interface ThemeStore {
  theme:        'light' | 'dark'
  fontSize:     'sm' | 'md' | 'lg'
  sidebarOpen:  boolean
  setTheme:     (t: 'light' | 'dark') => void
  setFontSize:  (s: 'sm' | 'md' | 'lg') => void
  toggleSidebar: () => void
  resetAll:     () => void
}

const INITIAL_STATE = {
  theme:       'light' as const,
  fontSize:    'md'   as const,
  sidebarOpen: false,
}

const useThemeStore = create<ThemeStore>(set => ({
  ...INITIAL_STATE,

  setTheme:      (theme)    => set({ theme }),
  setFontSize:   (fontSize) => set({ fontSize }),
  toggleSidebar: ()         => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  // Reset using initial state constant
  resetAll: () => set(INITIAL_STATE),
}))
```

```tsx
// ── Consuming the store ───────────────────────────────────────────────────
// Option A: select specific value (recommended — see Selectors section)
function ThemeToggle() {
  const theme    = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}

// Option B: select multiple values as object (use shallow — see Selectors)
import { useShallow } from 'zustand/react/shallow'

function SettingsPanel() {
  const { theme, fontSize, setTheme, setFontSize } = useThemeStore(
    useShallow(s => ({ theme: s.theme, fontSize: s.fontSize, setTheme: s.setTheme, setFontSize: s.setFontSize }))
  )
  return <div>{/* settings UI */}</div>
}
```

```tsx
// ── Accessing store outside React ─────────────────────────────────────────
// .getState() returns the current state without subscribing
const currentTheme = useThemeStore.getState().theme

// .setState() updates from outside React
useThemeStore.setState({ theme: 'dark' })
useThemeStore.setState(state => ({ sidebarOpen: !state.sidebarOpen }))

// Useful in: WebSocket handlers, router callbacks, test setup
```

---

## W — Why It Matters

- Co-locating state and actions in the same object is Zustand's ergonomic win — you read and update from the same hook, no separate dispatch, no action creators file.
- `set(state => newState)` receives the **current state** as its argument — this is how you avoid stale closure issues that affect `useState` callbacks. Always use the function form when new state depends on previous state.
- `INITIAL_STATE` as a constant outside `create` gives you a clean `resetAll` action without duplicating values.

---

## I — Interview Q&A

### Q: How do you structure a Zustand store and call actions?

**A:** A Zustand store is a plain object returned from the `create` callback. It contains both state (plain values) and actions (functions). Actions call `set` — either with a partial object for direct assignment, or with an updater function `(state) => newPartial` when new values depend on previous state. The store is a React hook by default — consume it with `useMyStore(selector)`. You can also call `.getState()` and `.setState()` directly on the hook for non-React usage (event handlers, utilities, tests). TypeScript: define an interface for the full store shape and pass it as the generic: `create<MyStore>(set => ({...}))`.

---

## C — Common Pitfalls + Fix

### ❌ Not using the updater function when new state depends on old state

```tsx
// ❌ Stale closure: count captured at creation time, never updates
const useBadStore = create<{ count: number; increment: () => void }>(set => ({
  count: 0,
  // This captures count=0 forever via closure — won't work in rapid updates
  increment: () => set({ count: /* count */ 0 + 1 }),   // ❌ hardcoded old value
}))

// ✅ Always use updater function when reading previous state
const useGoodStore = create<{ count: number; increment: () => void }>(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),   // ✅ always current
}))

// ❌ Calling set with the full state object (wipes other fields)
set({ count: state.count + 1, theme: 'dark' })  // ✅ but verbose
set(state => ({ count: state.count + 1 }))      // ✅ Zustand merges — other fields untouched
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useCartStore` with: `items`, `addItem`, `removeItem`, `updateQty`, `clearCart`, and a `totalItems` derived action.

### Solution

```tsx
interface CartItem { id: number; name: string; price: number; qty: number }

interface CartStore {
  items:      CartItem[]
  addItem:    (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: number) => void
  updateQty:  (id: number, qty: number) => void
  clearCart:  () => void
  totalItems: () => number
  subtotal:   () => number
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (newItem) => set(state => {
    const existing = state.items.find(i => i.id === newItem.id)
    if (existing) {
      return { items: state.items.map(i =>
        i.id === newItem.id ? { ...i, qty: i.qty + 1 } : i
      )}
    }
    return { items: [...state.items, { ...newItem, qty: 1 }] }
  }),

  removeItem: (id) => set(state => ({
    items: state.items.filter(i => i.id !== id)
  })),

  updateQty: (id, qty) => set(state => ({
    items: qty <= 0
      ? state.items.filter(i => i.id !== id)
      : state.items.map(i => i.id === id ? { ...i, qty } : i)
  })),

  clearCart: () => set({ items: [] }),

  // get() reads current state without subscribing
  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
  subtotal:   () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}))

// Usage
function CartIcon() {
  const totalItems = useCartStore(s => s.totalItems())
  return <span>🛒 {totalItems}</span>
}
```

---

---
