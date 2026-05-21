# 6 — subscribeWithSelector + Granular Subscriptions

---

## T — TL;DR

`subscribeWithSelector` middleware upgrades `subscribe` to accept a **selector + equality check** — your side effect only fires when the selected slice actually changes, not on every store update.

---

## K — Key Concepts

```tsx
import { create }                   from 'zustand'
import { subscribeWithSelector }    from 'zustand/middleware'
import { shallow }                  from 'zustand/shallow'

// ── Enable subscribeWithSelector ──────────────────────────────────────────
const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => ({
    items: [],
    addItem:  (item) => set(s => ({ items: [...s.items, item] })),
    clearCart: ()    => set({ items: [] }),
    totalItems: ()   => get().items.reduce((n, i) => n + i.qty, 0),
  }))
)
```

```tsx
// ── subscribe with selector: only fire when slice changes ─────────────────
// Without selector: fires on EVERY state change
useCartStore.subscribe((state) => {
  localStorage.setItem('cart', JSON.stringify(state.items))
  // ❌ fires even if items didn't change (e.g. isLoading toggled)
})

// With selector: fires only when items changes
useCartStore.subscribe(
  s => s.items,                    // selector ✅
  (items, prevItems) => {
    localStorage.setItem('cart', JSON.stringify(items))
  }
)
```

```tsx
// ── Equality function: control when "changed" means re-fire ───────────────
// Default: Object.is (strict reference equality)
// For arrays/objects: use shallow to prevent firing when contents are same

useCartStore.subscribe(
  s => s.items,
  (items) => syncCartToServer(items),
  { equalityFn: shallow }     // ✅ don't fire if items array contents are same
)

// fireImmediately: run callback once on subscription (useful for initial sync)
useCartStore.subscribe(
  s => s.items,
  (items) => localStorage.setItem('cart', JSON.stringify(items)),
  { fireImmediately: true }   // ✅ fires once on subscribe with current value
)
```

```tsx
// ── Granular subscription patterns ───────────────────────────────────────
// 1. URL sync — only when filters change
useFilterStore.subscribe(
  s => ({ category: s.category, sortBy: s.sortBy, page: s.page }),
  (filters) => {
    const p = new URLSearchParams(filters as Record<string, string>)
    history.replaceState(null, '', `?${p}`)
  },
  { equalityFn: shallow }
)

// 2. Analytics — fire on step change only
useCheckoutStore.subscribe(
  s => s.currentStep,
  (step, prev) => analytics.track('checkout_progress', { step, prev })
)

// 3. Debounced server sync
let saveTimer: ReturnType<typeof setTimeout>
useEditorStore.subscribe(
  s => s.content,
  (content) => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveToServer(content), 2000)
  }
)
```

---

## W — Why It Matters

- Module-level `subscribe` without a selector is a footgun — it fires on any action anywhere in the store, causing localStorage writes and analytics events on every keystroke if any shared store field changes.
- `{ equalityFn: shallow }` is crucial for array/object selectors — without it, `s.items` returns the same array contents but a new reference after unrelated updates, causing spurious side effects.
- `fireImmediately: true` synchronizes the initial value without a separate initialization call — subscribe once and the callback handles both initial state and all future changes.

---

## I — Interview Q&A

### Q: What does `subscribeWithSelector` add over the default `subscribe`?

**A:** The default `subscribe(listener)` fires on every state change with `(newState, prevState)`. `subscribeWithSelector` adds three capabilities: (1) **Selector** — `subscribe(s => s.theme, cb)` fires only when `s.theme` changes, not on any other update. (2) **Equality function** — `{ equalityFn: shallow }` controls what "changed" means, preventing spurious fires when array/object contents are identical. (3) **fireImmediately** — runs the callback once with the current value at subscription time, useful for initial state synchronization. Together, these make subscriptions surgical and efficient — exactly like component selectors but for side effects.

---

## C — Common Pitfalls + Fix

### ❌ Subscribing to an object slice without shallow equality — fires constantly

```tsx
// ❌ Object selector without equalityFn: new reference every call → fires always
useStore.subscribe(
  s => ({ a: s.a, b: s.b }),      // ← new object on every state change
  (slice) => expensiveSync(slice)  // fires on EVERY state change ❌
)

// ✅ shallow equality: only fire when a or b actually changes
useStore.subscribe(
  s => ({ a: s.a, b: s.b }),
  (slice) => expensiveSync(slice),
  { equalityFn: shallow }   // ✅ compares {a,b} properties individually
)
```

---

## K — Coding Challenge + Solution

### Challenge

Set up three granular subscriptions for `useAppStore`: (1) persist `theme` to localStorage, (2) sync `activeFilters` to URL, (3) debounce-save `searchQuery` to analytics.

### Solution

```tsx
import { shallow } from 'zustand/shallow'

// Run at app init (e.g., main.tsx or App.tsx useEffect)
function setupStoreSubscriptions() {
  // 1. Theme → localStorage (simple value, no equalityFn needed)
  const unsubTheme = useAppStore.subscribe(
    s => s.theme,
    (theme) => localStorage.setItem('app-theme', theme),
    { fireImmediately: true }
  )

  // 2. Filters → URL (object selector → need shallow)
  const unsubFilters = useAppStore.subscribe(
    s => ({ category: s.category, sortBy: s.sortBy, minPrice: s.minPrice }),
    (filters) => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)]))
      )
      history.replaceState(null, '', `?${params}`)
    },
    { equalityFn: shallow }
  )

  // 3. SearchQuery → analytics (debounced)
  let analyticsTimer: ReturnType<typeof setTimeout>
  const unsubSearch = useAppStore.subscribe(
    s => s.searchQuery,
    (query, prev) => {
      if (query === prev || query.length < 2) return
      clearTimeout(analyticsTimer)
      analyticsTimer = setTimeout(() => {
        analytics.track('search', { query })
      }, 1000)
    }
  )

  // Return cleanup
  return () => { unsubTheme(); unsubFilters(); unsubSearch() }
}
```

---

---
