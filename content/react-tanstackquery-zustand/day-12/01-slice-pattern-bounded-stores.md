# 1 — Slice Pattern + Bounded Stores

---

## T — TL;DR

As stores grow, split them into **slices** — typed sub-sections of one store — or into **bounded stores** — completely separate `create()` calls per domain. Slices share a single store instance; bounded stores are fully independent.

---

## K — Key Concepts

```tsx
// ── Option A: Bounded stores — one create() per domain ───────────────────
// Simplest. Each store is independent. No cross-store complexity.
// Use when domains are truly unrelated.

// stores/auth.ts
export const useAuthStore = create<AuthStore>(set => ({ user: null, login: async () => {} }))

// stores/ui.ts
export const useUIStore = create<UIStore>(set => ({ sidebarOpen: false }))

// stores/cart.ts
export const useCartStore = create<CartStore>(set => ({ items: [] }))
```

```tsx
// ── Option B: Slice pattern — one create(), multiple slices ───────────────
// Use when slices need to share state or call each other's actions.

// slices/authSlice.ts
export interface AuthSlice {
  user:      User | null
  isLoggedIn: boolean
  setUser:   (user: User | null) => void
}

export const createAuthSlice = (
  set: StoreApi<RootStore>['setState'],
  get: StoreApi<RootStore>['getState']
): AuthSlice => ({
  user:      null,
  isLoggedIn: false,
  setUser: (user) => set({ user, isLoggedIn: !!user }),
})
```

```tsx
// slices/cartSlice.ts
export interface CartSlice {
  items:    CartItem[]
  addItem:  (item: CartItem) => void
  clearCart: () => void
}

export const createCartSlice = (
  set: StoreApi<RootStore>['setState'],
  get: StoreApi<RootStore>['getState']
): CartSlice => ({
  items: [],
  addItem: (item) =>
    set(state => ({ items: [...state.items, item] })),
  clearCart: () => set({ items: [] }),
})
```

```tsx
// stores/root.ts — combine slices
import { create, StoreApi } from 'zustand'
import { AuthSlice, createAuthSlice } from './slices/authSlice'
import { CartSlice, createCartSlice } from './slices/cartSlice'

export type RootStore = AuthSlice & CartSlice

export const useStore = create<RootStore>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCartSlice(set, get),
}))

// Typed selector hooks
export const useUser    = () => useStore(s => s.user)
export const useCart    = () => useStore(s => s.items)
export const useSetUser = () => useStore(s => s.setUser)
```

```
── When to choose which ─────────────────────────────────────────────────────

Bounded stores                      Slice pattern
─────────────────────────────────   ──────────────────────────────────────
Domains are independent             Slices share state or call each other
Simpler — no RootStore type         One DevTools view for the whole state
Good default for most apps          Cross-slice actions are a first-class need
Easier to tree-shake                Needed when "logout clears everything"
```

---

## W — Why It Matters

- A single monolithic store with 30+ fields becomes unmaintainable — slices are the Zustand equivalent of Redux's `combineReducers`, but without the ceremony.
- Bounded stores are the simpler default — start here and only combine into slices if you need cross-store actions.
- The slice pattern centralizes DevTools: one store shows all state in one panel instead of hunting across multiple stores.

---

## I — Interview Q&A

### Q: What is the slice pattern in Zustand and when should you use it?

**A:** The slice pattern splits a large store into typed sub-objects (`AuthSlice`, `CartSlice`), each defined as a factory function that receives `set`/`get` and returns its portion of state and actions. These are spread into a single `create()` call to form a combined store. Use it when multiple domains need to share state or trigger each other's actions — like a logout action that clears auth AND cart AND filters simultaneously. For truly independent domains, separate `create()` calls (bounded stores) are simpler and preferred. The slice pattern's main advantage is a single DevTools view and type-safe cross-slice access via `get()`.

---

## C — Common Pitfalls + Fix

### ❌ Putting everything in one flat file as the store grows

```tsx
// ❌ 200-line create() with auth, cart, UI, filters all mixed
const useStore = create(set => ({
  user: null, isLoggedIn: false, login: () => {}, logout: () => {},
  items: [], addItem: () => {}, removeItem: () => {}, // cart
  theme: 'light', sidebarOpen: false,                 // UI
  category: 'all', sortBy: 'popular',                 // filters
  // ... 30 more fields and actions
}))
// Impossible to navigate, test, or modify safely ❌

// ✅ Slice pattern: each domain in its own file, combined cleanly
export const useStore = create<RootStore>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCartSlice(set, get),
  ...createUISlice(set, get),
  ...createFilterSlice(set, get),
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Create two slices — `NotificationSlice` (list of notifications, `addNotif`, `dismissNotif`) and `UISlice` (sidebarOpen, activeModal) — and combine them into a single `useAppStore`.

### Solution

```tsx
// slices/notificationSlice.ts
export interface Notification { id: number; text: string; type: 'info' | 'error' | 'success' }
export interface NotificationSlice {
  notifications: Notification[]
  addNotif:      (n: Omit<Notification, 'id'>) => void
  dismissNotif:  (id: number) => void
}
export const createNotificationSlice = (set: any): NotificationSlice => ({
  notifications: [],
  addNotif: (n) => set((s: any) => ({
    notifications: [...s.notifications, { ...n, id: Date.now() }]
  })),
  dismissNotif: (id) => set((s: any) => ({
    notifications: s.notifications.filter((n: Notification) => n.id !== id)
  })),
})

// slices/uiSlice.ts
export interface UISlice {
  sidebarOpen: boolean
  activeModal: string | null
  toggleSidebar: () => void
  openModal:     (name: string) => void
  closeModal:    () => void
}
export const createUISlice = (set: any): UISlice => ({
  sidebarOpen: false,
  activeModal: null,
  toggleSidebar: () => set((s: any) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:     (name) => set({ activeModal: name }),
  closeModal:    () => set({ activeModal: null }),
})

// stores/app.ts
type AppStore = NotificationSlice & UISlice
export const useAppStore = create<AppStore>((set, get) => ({
  ...createNotificationSlice(set),
  ...createUISlice(set),
}))
```

---

---
