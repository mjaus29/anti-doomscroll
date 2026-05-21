
# 📅 Day 11 — Zustand Fundamentals

> **Goal:** Build global client state with Zustand — lean stores, typed selectors, async actions, and a clear boundary between UI state and server cache.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · Zustand 5.0.12

---

## 📋 Day 11 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Why Zustand + No-Provider Model | 8 min |
| 2 | create + Store Shape + State + Actions | 12 min |
| 3 | Selectors | 10 min |
| 4 | Subscriptions | 10 min |
| 5 | Shallow Merge Behavior + Immutable Flat Updates | 10 min |
| 6 | Immutable Nested Updates + Immer Option | 12 min |
| 7 | Async Actions | 10 min |
| 8 | Separating UI State from Server Cache | 12 min |

---

---

# 1 — Why Zustand + No-Provider Model

---

## T — TL;DR

Zustand is a minimal React state library: a hook-based store with zero boilerplate, no provider wrapping, and no reducers. State lives in a module-level store — any component subscribes by calling the hook. Use it for **client state that multiple components share** but that doesn't belong to a server cache.

---

## K — Key Concepts

```tsx
// ── Why not Context + useReducer? ─────────────────────────────────────────
// Context re-renders ALL consumers when ANY part of the context changes.
// Zustand: each component subscribes to only what it reads via selectors.
// Context requires Provider wrapping — Zustand needs nothing.

// ── Why not Redux? ────────────────────────────────────────────────────────
// Redux: actions, reducers, dispatch, selectors, middleware — >100 lines for basic state.
// Zustand: one function call, done. No ceremony.

// ── Why not useState lifted to parent? ────────────────────────────────────
// Lifted state re-renders the parent + every child on every update.
// Zustand: only the subscribing component re-renders.
```

```tsx
// ── No-provider model: store is a singleton module ───────────────────────
// Context:
// <ThemeProvider>       ← must wrap consumers
//   <App />
// </ThemeProvider>

// Zustand: no wrapper needed
import { useThemeStore } from './stores/theme'

function AnyComponentAnywhere() {
  const theme = useThemeStore(s => s.theme)  // just import and use ✅
  return <div data-theme={theme} />
}
// Works from anywhere in the tree — even outside React (plain JS modules)
```

```
── When to choose Zustand ────────────────────────────────────────────────────

Use Zustand for:                      Don't use Zustand for:
────────────────────────────────────  ───────────────────────────────────────
UI state shared across components     Server data (use TanStack Query)
Auth session / user preferences       Form state (use React Hook Form)
Modal/drawer open state (global)      Local component state (use useState)
Shopping cart (local-only)            Server-side computed values
Theme, locale, feature flags
Undo/redo history
Multi-step wizard state
```

---

## W — Why It Matters

- Context re-render thrashing is real in medium-large apps — a global context update for any reason re-renders every consumer. Zustand's selector-based subscriptions eliminate this entirely.
- The no-provider model means stores are testable in isolation (plain function calls, no React wrapper needed) and importable from non-React code (utilities, event handlers, WebSocket listeners).
- Zustand's bundle size is ~1.1KB gzipped — the smallest full-featured state library. There's almost no reason to reach for Redux or MobX in a modern React app unless you need the Redux DevTools ecosystem specifically.

---

## I — Interview Q&A

### Q: Why would you choose Zustand over React Context for global UI state?

**A:** Context re-renders every consumer component when the context value changes — even if a component only uses one field. In Zustand, each component subscribes to a specific slice via a selector function, and only re-renders when that specific slice changes. For high-frequency updates (open/close states, counters, selected items) Context is a performance liability. Zustand is also simpler to set up (no Provider wrapping, no `useReducer` boilerplate), works outside the React tree (WebSocket handlers, utility modules), and is independently testable without a component wrapper.

---

## C — Common Pitfalls + Fix

### ❌ Using Zustand for server data — wrong tool for the job

```tsx
// ❌ Zustand for data that comes from the server
const useProductStore = create<{ products: Product[]; fetchProducts: () => void }>(set => ({
  products: [],
  fetchProducts: async () => {
    const data = await fetch('/api/products').then(r => r.json())
    set({ products: data })
  },
}))
// No cache invalidation, no staleTime, no background sync, no retry,
// no deduplication. You're reimplementing TanStack Query badly. ❌

// ✅ TanStack Query for server data, Zustand for UI state
// Server data → useQuery(['products'], fetchProducts)
// UI state → Zustand: selectedProductId, filterOpen, comparisonList
```

---

## K — Coding Challenge + Solution

### Challenge

List 5 pieces of state from a real e-commerce app. Classify each as: Zustand, TanStack Query, or `useState`.

### Solution

```
State audit — e-commerce app:

1. Product list from /api/products
   → TanStack Query: server state, needs cache + staleness + retry

2. isCartDrawerOpen
   → Zustand (if accessed from Header + CartIcon + Overlay)
   → useState (if only the CartDrawer button needs it)

3. Cart items (client-only, not persisted to server yet)
   → Zustand: shared across Header (count badge), CartDrawer (list), Checkout

4. Current user session from /api/me
   → TanStack Query: server state, auth session can expire

5. activeFilters (category, priceRange, inStock)
   → Zustand if multiple components read/write filters
   → useState if only the FilterPanel controls them

6. selectedCompareIds (local product comparison)
   → Zustand: ProductCard (add/remove) + CompareBar (display) both need it

Rule: "Does another component need this state without prop drilling?"
  YES → Zustand (client) or TanStack Query (server)
  NO  → useState
```

---

---

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

# 3 — Selectors

---

## T — TL;DR

A **selector** is the function you pass to `useMyStore(selector)`. It extracts a slice of the store. Zustand re-renders the component only if the selector's return value changes (`===`). Always select the minimum needed — never the whole store.

---

## K — Key Concepts

```tsx
// ── Selector basics ───────────────────────────────────────────────────────
const useAuthStore = create<AuthStore>(...)

// ✅ Select a single primitive — re-renders only when `isLoggedIn` changes
const isLoggedIn = useAuthStore(s => s.isLoggedIn)

// ✅ Select an action — actions are stable references, never trigger re-renders
const login = useAuthStore(s => s.login)

// ❌ No selector — subscribes to the ENTIRE store object
// Any change to any field → this component re-renders
const store = useAuthStore()
```

```tsx
// ── Selecting multiple values: useShallow ────────────────────────────────
import { useShallow } from 'zustand/react/shallow'

// ❌ Without shallow: new object on every render → always re-renders
const { user, isLoggedIn } = useAuthStore(s => ({
  user:       s.user,
  isLoggedIn: s.isLoggedIn,
}))
// s => ({ ... }) creates a new object every call → reference always changes → always re-renders ❌

// ✅ useShallow: compares each property individually (Object.is)
const { user, isLoggedIn } = useAuthStore(
  useShallow(s => ({ user: s.user, isLoggedIn: s.isLoggedIn }))
)
// Re-renders only when user OR isLoggedIn actually changes ✅
```

```tsx
// ── Derived / computed selectors ─────────────────────────────────────────
const useCartStore = create<CartStore>(...)

// Derived value: computed from state
const itemCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))
// Re-renders only when itemCount changes (not when any individual item field changes)

// Filter selector
const expensiveItems = useCartStore(
  s => s.items.filter(i => i.price > 100)
)
// ⚠️ Returns new array every call (filter always creates new array)
// → use useShallow or memoize outside the hook for expensive derivations

// ── Memoized selector: stable across renders ──────────────────────────────
function useExpensiveItems(threshold: number) {
  return useCartStore(
    useShallow(s => s.items.filter(i => i.price > threshold))
  )
  // useShallow compares array elements with Object.is
  // → no re-render if the filtered array contents haven't changed ✅
}
```

```tsx
// ── Reusable typed selector hooks ────────────────────────────────────────
// Encapsulate selector logic — components don't know store internals
function useCurrentUser() {
  return useAuthStore(s => s.user)         // null | User
}
function useIsAdmin() {
  return useAuthStore(s => s.user?.role === 'admin')
}
function useCartCount() {
  return useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0))
}
// Components: just import and call — zero selector duplication ✅
```

---

## W — Why It Matters

- Selectors are the performance model of Zustand — without them, every component re-renders on every store update. With them, only affected components re-render.
- `useShallow` is required when selecting multiple fields as an object — without it, a new object literal is created every selector call, and the reference change triggers a re-render even when values are identical.
- Derived selectors (`s => s.items.filter(...)`) are computed inline on every render — they're cheap for small arrays but worth extracting into a `useShallow` wrapper for large derived computations.

---

## I — Interview Q&A

### Q: How does Zustand determine when to re-render a component?

**A:** Zustand calls the selector on every store update and compares the new return value to the previous one using `Object.is` (strict reference equality). If they're identical, the component is skipped. If different, the component re-renders. For primitives (`number`, `string`, `boolean`), this works naturally — same value = same reference. For objects and arrays, `{}` !== `{}` even if contents are equal — which is why `useShallow` exists. `useShallow` performs a shallow comparison of the returned object/array's properties, preventing re-renders when the shape is the same even if the container reference changed.

---

## C — Common Pitfalls + Fix

### ❌ Subscribing to the entire store — every update re-renders

```tsx
// ❌ No selector — full store subscription
function NavBarBad() {
  const store = useAppStore()   // re-renders on ANY store field change ❌
  return <nav>{store.user?.name}</nav>
}

// ❌ Inline object selector without useShallow
function NavBarAlsoBad() {
  const { user, theme } = useAppStore(s => ({ user: s.user, theme: s.theme }))
  // New object every call → always re-renders ❌
}

// ✅ Specific selector for each value
function NavBarGood() {
  const userName = useAppStore(s => s.user?.name)  // re-renders only on name change ✅
  const theme    = useAppStore(s => s.theme)        // re-renders only on theme change ✅
  return <nav data-theme={theme}>{userName}</nav>
}

// ✅ Or useShallow for multiple fields
function NavBarShallow() {
  const { userName, theme } = useAppStore(
    useShallow(s => ({ userName: s.user?.name, theme: s.theme }))
  )
  return <nav data-theme={theme}>{userName}</nav>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build three selector hooks for a `useFilterStore` (category, priceRange, inStockOnly, sortBy) that minimize re-renders:
1. `useActiveFilterCount` — number of non-default filters active
2. `useFilterActions` — stable action references only
3. `useAllFilters` — all filter values as a shallow object

### Solution

```tsx
interface FilterStore {
  category:    string
  minPrice:    number
  maxPrice:    number
  inStockOnly: boolean
  sortBy:      string
  setCategory:    (c: string) => void
  setPriceRange:  (min: number, max: number) => void
  setInStockOnly: (v: boolean) => void
  setSortBy:      (s: string) => void
  resetFilters:   () => void
}

const DEFAULTS = { category: 'all', minPrice: 0, maxPrice: Infinity, inStockOnly: false, sortBy: 'popular' }

const useFilterStore = create<FilterStore>(set => ({
  ...DEFAULTS,
  setCategory:    (category)         => set({ category }),
  setPriceRange:  (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setInStockOnly: (inStockOnly)      => set({ inStockOnly }),
  setSortBy:      (sortBy)           => set({ sortBy }),
  resetFilters:   ()                 => set(DEFAULTS),
}))

// 1. Derived count — re-renders only when count changes
export function useActiveFilterCount() {
  return useFilterStore(s => {
    let count = 0
    if (s.category    !== DEFAULTS.category)    count++
    if (s.minPrice    !== DEFAULTS.minPrice)    count++
    if (s.maxPrice    !== DEFAULTS.maxPrice)    count++
    if (s.inStockOnly !== DEFAULTS.inStockOnly) count++
    if (s.sortBy      !== DEFAULTS.sortBy)      count++
    return count   // primitive → stable if unchanged ✅
  })
}

// 2. Actions only — actions are stable references, never trigger re-render
export function useFilterActions() {
  return useFilterStore(
    useShallow(s => ({
      setCategory:    s.setCategory,
      setPriceRange:  s.setPriceRange,
      setInStockOnly: s.setInStockOnly,
      setSortBy:      s.setSortBy,
      resetFilters:   s.resetFilters,
    }))
  )
}

// 3. All filter values — shallow compare, re-renders only when a value changes
export function useAllFilters() {
  return useFilterStore(
    useShallow(s => ({
      category:    s.category,
      minPrice:    s.minPrice,
      maxPrice:    s.maxPrice,
      inStockOnly: s.inStockOnly,
      sortBy:      s.sortBy,
    }))
  )
}
```

---

---

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

# 5 — Shallow Merge Behavior + Immutable Flat Updates

---

## T — TL;DR

`set(partial)` in Zustand **shallow-merges** — it only replaces the top-level keys you provide, leaving everything else untouched. For nested objects, you must spread manually to maintain immutability — Zustand will NOT deep-merge.

---

## K — Key Concepts

```tsx
// ── Shallow merge: set only updates what you provide ─────────────────────
const useStore = create<{ a: number; b: number; c: number }>(set => ({
  a: 1, b: 2, c: 3,
  update: () => set({ a: 10 }),   // b and c are untouched ✅
}))
// After update(): { a: 10, b: 2, c: 3 }  ← b and c preserved

// ── Flat state: straightforward updates ──────────────────────────────────
interface UIStore {
  isDrawerOpen: boolean
  activeTab:    string
  searchQuery:  string
  toggleDrawer: () => void
  setTab:       (tab: string) => void
  setSearch:    (q: string) => void
}

const useUIStore = create<UIStore>(set => ({
  isDrawerOpen: false,
  activeTab:    'overview',
  searchQuery:  '',

  toggleDrawer: () => set(s => ({ isDrawerOpen: !s.isDrawerOpen })),
  setTab:       (activeTab)    => set({ activeTab }),
  setSearch:    (searchQuery)  => set({ searchQuery }),
}))
// All primitives — set({ field }) is safe, clean, immutable ✅
```

```tsx
// ── Shallow merge does NOT deep-merge nested objects ─────────────────────
interface BadStore {
  user: { name: string; age: number }
  updateName: (name: string) => void
}

const useBadStore = create<BadStore>(set => ({
  user: { name: 'Alice', age: 30 },

  updateName: (name) => set({ user: { name } }),
  // ❌ set shallow-merges at the TOP level
  // user key gets fully replaced with { name } → age is GONE
  // Result: { user: { name: 'Bob' } }  — age: 30 lost ❌
}))

// ✅ Spread the nested object to preserve sibling keys
const useGoodStore = create<BadStore>(set => ({
  user: { name: 'Alice', age: 30 },
  updateName: (name) => set(state => ({ user: { ...state.user, name } })),
  // Result: { user: { name: 'Bob', age: 30 } } ✅
}))
```

```tsx
// ── Flat state design: prefer flat over nested where possible ─────────────
// ❌ Nested — more spread boilerplate, harder to update
interface NestedStore {
  user:     { name: string; role: string }
  settings: { theme: string; notifications: boolean }
}

// ✅ Flat — simple set() calls
interface FlatStore {
  userName:              string
  userRole:              string
  settingsTheme:         string
  settingsNotifications: boolean
}
// Each field updated independently with set({ fieldName: value })
// No spread chains needed ✅
```

---

## W — Why It Matters

- Shallow merge is the source of the most common Zustand bug: `set({ user: { name } })` feels like "update user.name" but actually **replaces the entire user object**. Every nested update needs an explicit spread.
- Flat state design sidesteps the problem entirely — if each piece of data is a top-level key, `set({ theme: 'dark' })` is always safe.
- Understanding merge behavior is critical for TypeScript — the type system won't warn you about replacing `user: { name, age }` with `user: { name }` if `age` is optional; the bug is silent at compile time.

---

## I — Interview Q&A

### Q: How does Zustand's `set` work and what are the implications for nested state?

**A:** `set(partial)` performs a **shallow merge** at the top level of the store — it calls `Object.assign(currentState, partial)` internally. For top-level primitive fields, this is safe: `set({ count: 5 })` updates `count` and leaves everything else. For nested objects, it replaces the entire nested object — `set({ user: { name: 'Bob' } })` deletes every other field inside `user`. The fix is manual spreading: `set(s => ({ user: { ...s.user, name: 'Bob' } }))`. The pragmatic solution is to keep state flat where possible, and for deeply nested structures use the Immer middleware to avoid spread chains.

---

## C — Common Pitfalls + Fix

### ❌ Replacing nested object silently — fields disappear

```tsx
interface ProfileStore {
  profile: { name: string; email: string; avatar: string }
  updateEmail: (email: string) => void
}

const useProfileStore = create<ProfileStore>(set => ({
  profile: { name: 'Alice', email: 'alice@old.com', avatar: '/alice.png' },

  // ❌ Replaces entire profile — name and avatar are gone after update
  updateEmail: (email) => set({ profile: { email } }),
  // Result: { profile: { email: 'alice@new.com' } }  name and avatar: GONE ❌
}))

// ✅ Spread to preserve sibling fields
const useProfileStoreFixed = create<ProfileStore>(set => ({
  profile: { name: 'Alice', email: 'alice@old.com', avatar: '/alice.png' },

  updateEmail: (email) =>
    set(state => ({ profile: { ...state.profile, email } })),   // ✅ safe
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useFormStore` with flat state for a signup form: `firstName`, `lastName`, `email`, `password`, `errors`. Actions: `setField`, `setErrors`, `resetForm`. Demonstrate that every update is immutable.

### Solution

```tsx
interface SignupErrors {
  firstName?: string
  lastName?:  string
  email?:     string
  password?:  string
}
interface FormStore {
  firstName:  string
  lastName:   string
  email:      string
  password:   string
  errors:     SignupErrors
  setField:   <K extends 'firstName' | 'lastName' | 'email' | 'password'>(
                key: K, value: string
              ) => void
  setErrors:  (errors: SignupErrors) => void
  resetForm:  () => void
}

const INITIAL_FORM = { firstName: '', lastName: '', email: '', password: '', errors: {} }

const useFormStore = create<FormStore>(set => ({
  ...INITIAL_FORM,

  // Flat fields → direct set — zero nested spreading needed ✅
  setField: (key, value) => set({ [key]: value, errors: {} }),

  // errors is a nested object → spread to merge, not replace
  setErrors: (newErrors) =>
    set(state => ({ errors: { ...state.errors, ...newErrors } })),

  resetForm: () => set(INITIAL_FORM),
}))

// Usage
function SignupForm() {
  const { firstName, lastName, email, errors, setField, resetForm } = useFormStore(
    useShallow(s => ({
      firstName: s.firstName,
      lastName:  s.lastName,
      email:     s.email,
      errors:    s.errors,
      setField:  s.setField,
      resetForm: s.resetForm,
    }))
  )
  return (
    <form onReset={resetForm}>
      <input value={firstName} onChange={e => setField('firstName', e.target.value)} />
      {errors.firstName && <p role="alert">{errors.firstName}</p>}
      <input value={email} onChange={e => setField('email', e.target.value)} />
      {errors.email && <p role="alert">{errors.email}</p>}
    </form>
  )
}
```

---

---

# 6 — Immutable Nested Updates + Immer Option

---

## T — TL;DR

Deep nested updates in Zustand require multi-level spreading — verbose and error-prone. The `immer` middleware lets you **mutate a draft** and automatically produces an immutable result. Use it when your store has 2+ levels of nesting.

---

## K — Key Concepts

```tsx
// ── Deep nested update without Immer — painful ────────────────────────────
interface AppStore {
  user: {
    profile: { name: string; bio: string }
    settings: { theme: string; notifications: { email: boolean; push: boolean } }
  }
}

// ❌ Manual spread chain — 3 levels deep
set(state => ({
  user: {
    ...state.user,
    settings: {
      ...state.user.settings,
      notifications: {
        ...state.user.settings.notifications,
        email: true,   // finally
      }
    }
  }
}))
```

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ── Immer middleware: mutate the draft ───────────────────────────────────
const useAppStore = create<AppStore>()(
  immer(set => ({
    user: {
      profile: { name: 'Alice', bio: '' },
      settings: {
        theme: 'light',
        notifications: { email: true, push: false }
      }
    },

    // ✅ Direct mutation on draft — Immer handles immutability
    updateEmailNotif: (enabled: boolean) => set(state => {
      state.user.settings.notifications.email = enabled
      // ← looks like mutation, but Immer produces a new object ✅
    }),

    updateTheme: (theme: string) => set(state => {
      state.user.settings.theme = theme
    }),

    updateProfile: (name: string, bio: string) => set(state => {
      state.user.profile.name = name
      state.user.profile.bio  = bio
    }),
  }))
)
```

```tsx
// ── Immer for array operations ────────────────────────────────────────────
const useTodoStore = create<TodoStore>()(
  immer(set => ({
    todos: [] as Todo[],

    addTodo: (text: string) => set(state => {
      state.todos.push({ id: Date.now(), text, done: false })   // ✅ push on draft
    }),

    toggleTodo: (id: number) => set(state => {
      const todo = state.todos.find(t => t.id === id)
      if (todo) todo.done = !todo.done   // ✅ direct mutation on draft
    }),

    removeTodo: (id: number) => set(state => {
      const idx = state.todos.findIndex(t => t.id === id)
      if (idx !== -1) state.todos.splice(idx, 1)   // ✅ splice on draft
    }),

    reorderTodos: (fromIdx: number, toIdx: number) => set(state => {
      const [item] = state.todos.splice(fromIdx, 1)
      state.todos.splice(toIdx, 0, item)
    }),
  }))
)
```

```tsx
// ── When to use Immer vs manual spread ───────────────────────────────────
// Use manual spread:
//   - Flat store (no nesting)
//   - 1 level deep updates only
//   - Minimal bundle size is critical

// Use Immer:
//   - 2+ levels of nesting
//   - Array operations (push, splice, sort)
//   - Complex update logic on deeply nested objects
//   - Team prefers "mutation-style" code for readability
```

---

## W — Why It Matters

- Every extra level of nesting in a manual spread is a potential bug source — it's easy to forget a `...spread` at one level, silently replacing sibling fields.
- Immer's `produce` is the industry-standard immutability helper — it's what Redux Toolkit uses internally. Learning it once applies everywhere.
- Immer operations (`push`, `splice`, `direct assignment`) are dramatically more readable for array manipulation than `[...arr.slice(0, i), changed, ...arr.slice(i+1)]`.

---

## I — Interview Q&A

### Q: What is the Immer middleware in Zustand and when should you use it?

**A:** The Immer middleware wraps Zustand's `set` so the updater function receives a **draft** — a mutable proxy of the current state. You write mutations on the draft (direct assignment, array push/splice), and Immer automatically produces a new immutable state object using structural sharing. Use it when: your store has nested objects requiring multi-level spreading (2+ levels deep), you have array operations that are verbose with spread syntax, or you want mutation-style code that's easier to read and maintain. The trade-off is a small bundle size addition (~14KB from Immer) and a slightly different mental model — but for any non-trivial nested state, it's the right default.

---

## C — Common Pitfalls + Fix

### ❌ Returning from an Immer set callback — conflict with Immer's tracking

```tsx
// ❌ Returning a new object from Immer callback — breaks Immer's draft tracking
const useStore = create<Store>()(
  immer(set => ({
    items: [],
    addItem: (item: Item) => set(state => {
      return { items: [...state.items, item] }  // ❌ return + mutation conflict
    }),
  }))
)
// Immer: either mutate the draft OR return a new state — never both

// ✅ Mutate the draft (Immer style)
addItem: (item: Item) => set(state => {
  state.items.push(item)   // ✅ mutate draft, don't return
}),

// ✅ Or return new state (non-Immer style — Immer passes it through)
addItem: (item: Item) => set(state => ({
  items: [...state.items, item]   // ✅ return without mutating draft
})),
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useProjectStore` with Immer: projects contain tasks, tasks contain subtasks. Implement: `addTask`, `toggleSubtask`, `reorderTasks`.

### Solution

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Subtask { id: number; text: string; done: boolean }
interface Task    { id: number; title: string; subtasks: Subtask[] }
interface Project { id: number; name: string; tasks: Task[] }

interface ProjectStore {
  projects:       Project[]
  addTask:        (projectId: number, title: string) => void
  toggleSubtask:  (projectId: number, taskId: number, subtaskId: number) => void
  reorderTasks:   (projectId: number, fromIdx: number, toIdx: number) => void
}

const useProjectStore = create<ProjectStore>()(
  immer(set => ({
    projects: [
      { id: 1, name: 'Website Redesign', tasks: [] }
    ],

    addTask: (projectId, title) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      project?.tasks.push({ id: Date.now(), title, subtasks: [] })
      // Deep mutation — Immer handles all spreading ✅
    }),

    toggleSubtask: (projectId, taskId, subtaskId) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      const task    = project?.tasks.find(t => t.id === taskId)
      const subtask = task?.subtasks.find(s => s.id === subtaskId)
      if (subtask) subtask.done = !subtask.done   // 3 levels deep — clean ✅
    }),

    reorderTasks: (projectId, fromIdx, toIdx) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      if (!project) return
      const [task] = project.tasks.splice(fromIdx, 1)
      project.tasks.splice(toIdx, 0, task)        // splice on draft ✅
    }),
  }))
)
```

---

---

# 7 — Async Actions

---

## T — TL;DR

Zustand actions can be `async`. They call `set` before, during, and after an async operation — managing loading and error state inside the store. There's no middleware required; it's just a regular `async` function inside `create`.

---

## K — Key Concepts

```tsx
// ── Async action pattern ──────────────────────────────────────────────────
interface UserStore {
  user:      User | null
  isLoading: boolean
  error:     string | null
  fetchUser: (id: number) => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

const useUserStore = create<UserStore>(set => ({
  user:      null,
  isLoading: false,
  error:     null,

  fetchUser: async (id) => {
    set({ isLoading: true, error: null })       // loading state ✅
    try {
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const user = await res.json()
      set({ user, isLoading: false })            // success ✅
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })  // error ✅
    }
  },

  updateUser: async (data) => {
    const current = useUserStore.getState().user
    if (!current) return
    set({ isLoading: true })
    try {
      const res = await fetch(`/api/users/${current.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      const updated = await res.json()
      set({ user: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
```

```tsx
// ── Async with optimistic update in the store ─────────────────────────────
const useThemeStore = create<{
  preferences: UserPreferences
  savePref: (key: keyof UserPreferences, value: unknown) => Promise<void>
}>(set => ({
  preferences: { theme: 'light', language: 'en', notifications: true },

  savePref: async (key, value) => {
    const prev = useThemeStore.getState().preferences

    // Optimistic: update immediately
    set(state => ({ preferences: { ...state.preferences, [key]: value } }))

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    } catch (err) {
      // Rollback on failure
      set({ preferences: prev })
      console.error('Preference save failed, rolled back:', err)
    }
  },
}))
```

```tsx
// ── When to put async in Zustand vs TanStack Query ────────────────────────
// Zustand async actions: good for
//   - Login/logout (session management, not GET data)
//   - User preferences (write + immediate local reflection)
//   - File upload state (progress, result)
//   - One-off commands (submit form, trigger action)

// TanStack Query mutations: better for
//   - Any mutation that needs cache invalidation
//   - Optimistic updates tied to query cache
//   - Mutations with retry / rollback via onMutate
//   - Anything that affects useQuery-managed data
```

---

## W — Why It Matters

- Async actions in Zustand keep loading/error state co-located with the data they describe — no separate `useEffect` + `useState` pattern in every component.
- Using `useUserStore.getState()` inside an async action reads the current value at call time (not a stale closure) — essential for reading dependent state mid-async-operation.
- For pure client state with async writes (user preferences, auth), Zustand async actions are simpler than `useMutation` — no provider, no query key, no cache.

---

## I — Interview Q&A

### Q: How do you handle loading and error state in a Zustand async action?

**A:** Async actions call `set` at three points: before the await (`set({ isLoading: true, error: null })`), on success (`set({ data, isLoading: false })`), and in the catch block (`set({ error: message, isLoading: false })`). This is the same pattern as any async state machine — just without React's `useState`. The action is a plain async function inside the `create` callback. For reading state mid-action (to avoid stale closures from the create callback's closure), use `useMyStore.getState()` to get the live current state at that moment.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to clear loading state on error path

```tsx
// ❌ isLoading stays true forever if an error is thrown
const useBadStore = create<Store>(set => ({
  isLoading: false,
  data: null,
  fetchData: async () => {
    set({ isLoading: true })
    const result = await getData()   // throws → isLoading stuck at true ❌
    set({ data: result, isLoading: false })
  },
}))

// ✅ try/finally: always reset loading state
const useGoodStore = create<Store>(set => ({
  isLoading: false,
  data: null,
  error: null,
  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getData()
      set({ data })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })   // ✅ always runs
    }
  },
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useAuthStore` with async `login` and `logout` actions. Login: sets `isLoading`, calls `POST /api/login`, sets `user` on success, sets `error` on failure. Logout: clears user + calls `POST /api/logout`.

### Solution

```tsx
interface User { id: number; name: string; email: string; role: string }
interface AuthStore {
  user:      User | null
  isLoading: boolean
  error:     string | null
  login:     (email: string, password: string) => Promise<boolean>
  logout:    () => Promise<void>
  clearError: () => void
}

const useAuthStore = create<AuthStore>(set => ({
  user:      null,
  isLoading: false,
  error:     null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        credentials: 'include',
      })
      if (res.status === 401) throw new Error('Invalid email or password')
      if (!res.ok)            throw new Error(`Login failed: ${res.status}`)
      const { user } = await res.json()
      set({ user, isLoading: false })
      return true
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      return false
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    } catch { /* silent fail — still clear local state */ }
    finally {
      set({ user: null, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))

function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore(
    useShallow(s => ({ login: s.login, isLoading: s.isLoading, error: s.error, clearError: s.clearError }))
  )
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email}    onChange={e => { clearError(); setEmail(e.target.value) }}    type="email" />
      <input value={password} onChange={e => { clearError(); setPassword(e.target.value) }} type="password" />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
```

---

---

# 8 — Separating UI State from Server Cache

---

## T — TL;DR

**UI state** (what's selected, what's open, what's being edited) belongs in Zustand. **Server state** (what's in the database) belongs in TanStack Query. Mixing them causes stale data, double-fetching, and cache inconsistency. Keep them separate with a clear boundary.

---

## K — Key Concepts

```tsx
// ── The boundary: two kinds of state, two tools ───────────────────────────

// ZUSTAND: UI state — browser-owned, no server involved
// TanStack Query: server state — owned by the database

// ✅ Correct split
// stores/ui.ts — Zustand
export const useUIStore = create<UIStore>(set => ({
  selectedProductId:  null,
  compareProductIds:  [] as number[],
  isFilterPanelOpen:  false,
  searchQuery:        '',
  activeTab:          'overview',

  selectProduct:    (id) => set({ selectedProductId: id }),
  addToCompare:     (id) => set(s => ({
    compareProductIds: s.compareProductIds.includes(id)
      ? s.compareProductIds
      : [...s.compareProductIds, id].slice(-3)  // max 3
  })),
  toggleFilterPanel: () => set(s => ({ isFilterPanelOpen: !s.isFilterPanelOpen })),
  setSearchQuery:   (q) => set({ searchQuery: q }),
}))

// hooks/queries/useProducts.ts — TanStack Query
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn:  ({ signal }) => fetchProducts(filters, signal),
  })
}
```

```tsx
// ── Connecting UI state to server queries ─────────────────────────────────
// The UI state (filter values) drives the query key — but they stay in separate systems

function ProductsPage() {
  // UI state: what filters the user has selected
  const { searchQuery, isFilterPanelOpen } = useUIStore(
    useShallow(s => ({ searchQuery: s.searchQuery, isFilterPanelOpen: s.isFilterPanelOpen }))
  )
  const activeFilters = useFilterStore(useShallow(s => ({
    category: s.category, minPrice: s.minPrice, maxPrice: s.maxPrice
  })))

  // Server state: products matching those filters
  const { data: products, isLoading } = useProducts({
    search: searchQuery,
    ...activeFilters,
  })
  // UI state changes → query key changes → TanStack fetches → no coupling ✅

  return (
    <div>
      {isFilterPanelOpen && <FilterPanel />}
      {isLoading ? <Skeleton /> : <ProductGrid products={products ?? []} />}
    </div>
  )
}
```

```tsx
// ── Anti-pattern: duplicating server data in Zustand ─────────────────────
// ❌ This is the most common Zustand mistake
const useProductStore = create(set => ({
  products: [],              // ← copy of server data in Zustand ❌
  selectedProductId: null,   // ← UI state ✅
  isLoading: false,          // ← loading state duplicated from TanStack ❌
  fetchProducts: async () => { /* re-implementing TanStack Query */ },
}))

// ✅ Products in TanStack, selection in Zustand — separate concerns
function useSelectedProduct() {
  const selectedId = useUIStore(s => s.selectedProductId)
  return useQuery({
    queryKey:  ['product', selectedId],
    queryFn:   ({ signal }) => fetchProduct(selectedId!, signal),
    enabled:   selectedId !== null,
  })
}
// Selection (Zustand UI state) drives the query (TanStack server state) ✅
```

```tsx
// ── Pattern: local edits before saving ───────────────────────────────────
// Server data: in TanStack Query cache (authoritative)
// Edit draft:  in Zustand (local-only until saved)

interface EditStore {
  draft:       Partial<User> | null
  isDirty:     boolean
  startEdit:   (user: User) => void
  updateField: <K extends keyof User>(key: K, value: User[K]) => void
  cancelEdit:  () => void
}

const useEditStore = create<EditStore>(set => ({
  draft:    null,
  isDirty:  false,

  startEdit: (user) => set({ draft: { ...user }, isDirty: false }),
  updateField: (key, value) => set(state => ({
    draft:   state.draft ? { ...state.draft, [key]: value } : null,
    isDirty: true,
  })),
  cancelEdit: () => set({ draft: null, isDirty: false }),
}))

// Save: mutation writes draft to server, TanStack invalidates
function useEditUser(userId: number) {
  const qc = useQueryClient()
  const { draft, cancelEdit } = useEditStore(
    useShallow(s => ({ draft: s.draft, cancelEdit: s.cancelEdit }))
  )

  return useMutation({
    mutationFn: () => patchUser(userId, draft!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
      cancelEdit()   // clear local draft after successful save ✅
    },
  })
}
```

---

## W — Why It Matters

- Duplicating server data in Zustand creates two sources of truth that diverge the moment the server changes — cache invalidation from TanStack mutations won't update the Zustand copy.
- The "UI state drives query" pattern (selection → query key) is the cleanest architecture: Zustand holds what the user chose, TanStack fetches the corresponding server data. Zero duplication.
- Local edit drafts in Zustand are a legitimate use case — the user's in-progress edits are genuinely client state until saved. The pattern is: copy server data into Zustand draft on edit start, write back via mutation on save, clear draft on success.

---

## I — Interview Q&A

### Q: How do you decide where to put state when you have both Zustand and TanStack Query in a project?

**A:** Ask one question: "Where does this data live?" — in the browser or on the server? Server data (products, users, orders — anything fetched from an API) belongs in TanStack Query. It has a source of truth that can change independently, needs caching, staleness tracking, and invalidation. Client data (what the user selected, what panels are open, filter values, draft edits, comparison lists) belongs in Zustand. It originates from user interaction, has no remote source of truth, and never goes stale in the server-state sense. The connection between them: UI state (selection, filters) becomes inputs to query keys — the user's choice drives what TanStack fetches. Never copy server query results into Zustand; never put async fetch operations in Zustand when TanStack Query is available.

---

## C — Common Pitfalls + Fix

### ❌ Storing API response in Zustand + also in TanStack Query — dual source of truth

```tsx
// ❌ Products stored in BOTH systems — mutation invalidates TanStack but not Zustand
const useProductStore = create(set => ({
  products: [],   // ← this will go stale
  loadProducts: async () => {
    const data = await fetch('/api/products').then(r => r.json())
    set({ products: data })
  },
}))

// Meanwhile in a component...
const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
// Two sources of products — one fresh, one stale. Which do components use? ❌

// ✅ Single source of truth: TanStack Query for server data
// Zustand only for UI state derived from user interaction

// Zustand UI store
const useProductUIStore = create(set => ({
  selectedIds:     [] as number[],
  viewMode:        'grid' as 'grid' | 'list',
  sortBy:          'popularity',
  toggleSelect:    (id: number) => set(s => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter(i => i !== id)
      : [...s.selectedIds, id]
  })),
  setViewMode:     (viewMode: 'grid' | 'list') => set({ viewMode }),
  setSortBy:       (sortBy: string) => set({ sortBy }),
}))

// TanStack Query for the actual data
function ProductsPage() {
  const sortBy   = useProductUIStore(s => s.sortBy)
  const { data } = useQuery({
    queryKey: ['products', { sortBy }],
    queryFn:  ({ signal }) => fetchProducts({ sortBy }, signal),
  })
  return <ProductGrid products={data ?? []} />
}
```

---

## ✅ Day 11 Complete — Zustand Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Why Zustand + No-Provider Model | ☐ |
| 2 | create + Store Shape + State + Actions | ☐ |
| 3 | Selectors | ☐ |
| 4 | Subscriptions | ☐ |
| 5 | Shallow Merge Behavior + Immutable Flat Updates | ☐ |
| 6 | Immutable Nested Updates + Immer Option | ☐ |
| 7 | Async Actions | ☐ |
| 8 | Separating UI State from Server Cache | ☐ |

---

## 🗺️ One-Page Mental Model — Day 11

```
WHY ZUSTAND + NO-PROVIDER
  Client state shared between components → Zustand (not Context, not Redux)
  No Provider wrap needed → import and use anywhere, even outside React
  Context: re-renders ALL consumers on ANY change → performance liability
  Zustand: selector-based → only subscribing component re-renders
  Server data → TanStack Query | Form state → React Hook Form | Local → useState

create + STORE SHAPE
  create<StoreType>(set => ({ ...state, ...actions })) — one call, done
  set(partial): shallow merge — untouched fields preserved at top level
  set(state => newPartial): use updater form when new value depends on old
  getState() / setState(): access store outside React (WebSocket, utils, tests)
  INITIAL_STATE constant outside create → clean resetAll without duplication

SELECTORS
  useMyStore(s => s.field) → re-renders only when s.field changes (Object.is)
  No selector → subscribes to entire store → re-renders on every change ❌
  Object selector without useShallow → new object every call → always re-renders ❌
  useShallow: shallow-compares object/array properties → prevents false re-renders
  Encapsulate selectors in custom hooks → components don't know store shape

SUBSCRIPTIONS
  subscribe(listener) → listen outside React, no re-render
  subscribeWithSelector middleware: subscribe(selector, cb) → only fires when slice changes
  Use for: localStorage sync, URL sync, analytics, WebSocket → store updates
  Module-level subscriptions: outlive components, app-wide side effects
  Always cleanup: const unsub = subscribe(…); return unsub in useEffect

SHALLOW MERGE + FLAT UPDATES
  set({ a: 1 }) → only a changes, b/c/d untouched (shallow merge)
  set({ nested: { name } }) → REPLACES entire nested object, siblings gone ❌
  Fix: set(s => ({ nested: { ...s.nested, name } })) → always spread nested
  Flat state design: top-level primitives → set({ field }) always safe
  Flat is simpler; nest only when structure is genuinely hierarchical

NESTED UPDATES + IMMER
  Immer middleware: mutate a draft → Immer produces new immutable state
  create<T>()(immer(set => ({ ... }))) — note: double function call with middleware
  set(state => { state.deeply.nested.field = value }) → clean 3-level update ✅
  Array ops on draft: push, splice, direct index assignment → all work ✅
  Don't return AND mutate in same Immer callback — pick one pattern
  Use Immer for 2+ nesting levels; use manual spread for flat/1-level

ASYNC ACTIONS
  Regular async function inside create callback — no middleware needed
  Pattern: set({ isLoading: true }) → try → set({ data }) → catch → set({ error }) → finally → set({ isLoading: false })
  getState() inside async action: reads live state, avoids stale closure
  Async in Zustand for: auth, preferences, one-off commands, file upload
  Async in TanStack Query for: anything that needs cache invalidation or retry

SEPARATING UI STATE FROM SERVER CACHE
  Server data → TanStack Query (cache, stale, retry, invalidation)
  UI state → Zustand (selection, open/close, draft edits, comparisons)
  Never duplicate API response in Zustand → dual source of truth → diverges
  Pattern: UI state (filters, selection) → drives query key → TanStack fetches
  Edit draft pattern: copy server data to Zustand draft → mutate → invalidate → clear draft
  Single question: "Where does this data live — browser or server?"
```

> **Your next action:** Open your project and find one piece of state that multiple components share via prop drilling. Create a `useXStore` with `create` and move that state into it. Update both components to use the hook directly. Delete the prop chain. That's Zustand's value in practice — takes 10 minutes, immediately cleaner.

> "Doing one small thing beats opening a feed."