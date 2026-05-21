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
