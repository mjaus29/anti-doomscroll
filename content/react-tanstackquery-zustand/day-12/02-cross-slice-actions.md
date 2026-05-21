# 2 — Cross-Slice Actions

---

## T — TL;DR

A **cross-slice action** modifies multiple slices at once — e.g., `logout` clears auth, cart, and filters in one call. Use `get()` to read any slice's state, and `set()` to update fields across slices from any action.

---

## K — Key Concepts

```tsx
// ── get() enables cross-slice reads ──────────────────────────────────────
export const createAuthSlice = (
  set: SetState<RootStore>,
  get: GetState<RootStore>
): AuthSlice => ({
  user: null,

  logout: async () => {
    await fetch('/api/logout', { method: 'POST' })

    // Cross-slice: clear auth + cart + filters in one set call ✅
    set({
      // Auth fields
      user:      null,
      isLoggedIn: false,
      // Cart fields (from CartSlice)
      items:     [],
      // Filter fields (from FilterSlice)
      category:  'all',
      sortBy:    'popular',
    })
  },
})
```

```tsx
// ── Cross-slice action as a standalone orchestrator ────────────────────────
// Alternative: keep slices pure, add a "root-level" action that orchestrates

export const useStore = create<RootStore>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCartSlice(set, get),
  ...createFilterSlice(set, get),

  // Orchestration action: lives at root, calls into multiple slices
  resetAppState: () => {
    // Reset each slice to its initial state
    set({
      user:        null,
      isLoggedIn:  false,
      items:       [],
      category:    'all',
      sortBy:      'popular',
      sidebarOpen: false,
    })
  },

  checkout: async () => {
    const { items, user } = get()   // read both slices via get() ✅
    if (!user || items.length === 0) return

    await submitOrder({ userId: user.id, items })

    // Post-checkout: clear cart only, keep auth
    set({ items: [] })
    get().addNotif({ text: 'Order placed!', type: 'success' })   // call another slice action
  },
}))
```

```tsx
// ── Calling a slice action from another slice via get() ───────────────────
export const createCartSlice = (
  set: SetState<RootStore>,
  get: GetState<RootStore>
): CartSlice => ({
  items: [],

  addItemWithNotif: (item) => {
    set(s => ({ items: [...s.items, item] }))
    // Call another slice's action
    get().addNotif({ text: `${item.name} added to cart`, type: 'success' })  // ✅
  },
})
```

---

## W — Why It Matters

- The main reason to use slices over bounded stores is precisely this: `logout` in one store needs to clear another store's state. With bounded stores you'd need to import both stores — possible but creates hidden coupling. With slices and `get()`, it's explicit and co-located.
- `get()` is the escape hatch for reading current state without subscribing — it's synchronous and always returns the live value, unlike closure captures that go stale.
- Orchestration actions at the root level (`checkout`, `resetAppState`) are a clean pattern: slices stay focused on their domain, root-level actions coordinate across them.

---

## I — Interview Q&A

### Q: How do you implement an action that modifies multiple slices in Zustand?

**A:** Two approaches: (1) From within a slice — call `set()` with keys from other slices. Since all slices are merged into one store object, `set({ user: null, items: [] })` works even if `user` is in AuthSlice and `items` is in CartSlice. (2) Root-level orchestration — define the cross-slice action at the `create()` level, not inside a slice factory. It has access to `set` and `get` and can call slice actions via `get().sliceAction()` or spread multiple slice resets in one `set()` call. The second pattern keeps slices cleaner by keeping orchestration concerns out of them.

---

## C — Common Pitfalls + Fix

### ❌ Importing one bounded store inside another — hidden coupling

```tsx
// ❌ CartStore imports AuthStore — circular dependency risk
import { useAuthStore } from './authStore'

const useCartStore = create(set => ({
  items: [],
  checkout: async () => {
    const user = useAuthStore.getState().user  // ❌ tight coupling between bounded stores
    if (!user) return
    await submitOrder({ userId: user.id })
  },
}))

// ✅ If two stores need to coordinate: merge into slices
// Or: pass the needed value as an argument to the action
const useCartStore = create(set => ({
  items: [],
  checkout: async (userId: number) => {   // ✅ caller provides what's needed
    await submitOrder({ userId })
    set({ items: [] })
  },
}))
// Component:
const { checkout } = useCartStore(s => s.checkout)
const userId       = useAuthStore(s => s.user?.id)
// <button onClick={() => userId && checkout(userId)}>Checkout</button>
```

---

## K — Coding Challenge + Solution

### Challenge

Add a `placeOrder` root action to a store with `AuthSlice + CartSlice + NotificationSlice` — it reads user + cart, submits, clears cart, and adds a success notification.

### Solution

```tsx
type AppStore = AuthSlice & CartSlice & NotificationSlice & {
  placeOrder: () => Promise<void>
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCartSlice(set, get),
  ...createNotificationSlice(set),

  placeOrder: async () => {
    const { user, items, clearCart, addNotif } = get()

    if (!user)           return addNotif({ text: 'Please log in first',   type: 'error' })
    if (items.length === 0) return addNotif({ text: 'Your cart is empty', type: 'info' })

    try {
      await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id, items }),
      }).then(r => { if (!r.ok) throw new Error(`Order failed: ${r.status}`) })

      clearCart()   // CartSlice action via get() ✅
      addNotif({ text: `Order placed for ${user.name}!`, type: 'success' })
    } catch (err) {
      addNotif({ text: (err as Error).message, type: 'error' })
    }
  },
}))
```

---

---
