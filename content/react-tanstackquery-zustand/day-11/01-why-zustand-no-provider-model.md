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
