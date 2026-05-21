
# 📅 Day 12 — Zustand Scaling and Integration

> **Goal:** Scale Zustand from one store to a maintainable multi-slice architecture, add persistence, DevTools, and draw the right boundaries between Zustand, TanStack Query, and React.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · Zustand 5.0.12

---

## 📋 Day 12 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Slice Pattern + Bounded Stores | 12 min |
| 2 | Cross-Slice Actions | 10 min |
| 3 | persist Middleware + Storage Choices | 12 min |
| 4 | Hydration + SSR Caveats | 10 min |
| 5 | Versioning + Migration | 10 min |
| 6 | subscribeWithSelector + Granular Subscriptions | 10 min |
| 7 | devtools Middleware | 8 min |
| 8 | Reset-State Patterns | 10 min |
| 9 | Map and Set Usage | 10 min |
| 10 | React + TanStack Query + Zustand Architecture Boundaries | 12 min |

---

---

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

# 3 — persist Middleware + Storage Choices

---

## T — TL;DR

The `persist` middleware auto-saves store state to a storage backend and reloads it on init. Choose `localStorage` (sync, survives refresh), `sessionStorage` (tab-only), or a custom async adapter (IndexedDB, cookies, server).

---

## K — Key Concepts

```tsx
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ── Basic localStorage persistence ────────────────────────────────────────
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem:  (item) => set(s => ({ items: [...s.items, item] })),
      clearCart: ()    => set({ items: [] }),
      totalItems: ()   => get().items.reduce((n, i) => n + i.qty, 0),
    }),
    {
      name:    'cart-storage',          // localStorage key ✅
      storage: createJSONStorage(() => localStorage),  // default, can omit
    }
  )
)
```

```tsx
// ── Partial persistence: only save specific fields ────────────────────────
const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme:       'light',
      sidebarOpen: false,       // ← don't persist this (reset on reload is fine)
      activeModal: null,        // ← don't persist (transient)
      searchQuery: '',          // ← don't persist (stale search is annoying)
      setTheme:    (theme) => set({ theme }),
    }),
    {
      name:    'ui-prefs',
      partialize: (state) => ({ theme: state.theme }),   // ✅ only persist theme
    }
  )
)
```

```tsx
// ── Storage options ───────────────────────────────────────────────────────
import { del, get, set } from 'idb-keyval'  // IndexedDB adapter

const idbStorage = {
  getItem:    (name: string) => get(name),
  setItem:    (name: string, value: string) => set(name, value),
  removeItem: (name: string) => del(name),
}

// Large data (offline cache, files) → IndexedDB
const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({ drafts: [] }),
    {
      name:    'offline-drafts',
      storage: createJSONStorage(() => idbStorage),   // async OK ✅
    }
  )
)

// Session-only (auth tokens that should clear on tab close) → sessionStorage
const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({ token: null }),
    {
      name:    'session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
```

```tsx
// ── Checking hydration status ─────────────────────────────────────────────
// persist adds _hasHydrated and onRehydrateStorage to the store API
const useCartStore = create<CartStore & { _hasHydrated: boolean }>()(
  persist(
    (set) => ({
      items:        [],
      _hasHydrated: false,
    }),
    {
      name: 'cart',
      onRehydrateStorage: () => (state) => {
        state?._hasHydrated && state.set?.({ _hasHydrated: true })
      },
    }
  )
)

// Or use the built-in method from persist:
const hasHydrated = useCartStore.persist.hasHydrated()
```

---

## W — Why It Matters

- `partialize` is the most important persist option — persisting `isLoading`, `activeModal`, and other transient state causes wrong initial renders and confusing bugs on page reload.
- The `name` option is the localStorage key — if two stores accidentally use the same name, they overwrite each other's data silently.
- Custom async storage (IndexedDB) is needed for large payloads (cart with product images, offline documents) — `localStorage` is limited to ~5MB and synchronous (blocks the main thread on large reads).

---

## I — Interview Q&A

### Q: How do you configure `persist` to only save specific fields?

**A:** Use the `partialize` option — a function that receives the full state and returns the object to persist. Only the returned fields are written to storage; the rest are ephemeral. Example: `partialize: (s) => ({ theme: s.theme, locale: s.locale })` saves user preferences but ignores loading states, open/close flags, and derived values. On reload, the persisted fields are merged into the initial state — unpersisted fields use their initial values from `create`. Always `partialize` to exclude transient UI state from persistence, or you'll get confusing hydration bugs where modals appear open on page load.

---

## C — Common Pitfalls + Fix

### ❌ Persisting everything including transient state

```tsx
// ❌ No partialize — all state persisted including transient fields
const useStore = create<AppStore>()(
  persist(
    (set) => ({
      theme:       'light',    // ✅ should persist
      isLoading:   false,      // ❌ persists as false — fine but noisy
      activeModal: 'checkout', // ❌ reopens checkout modal on reload ❌
      error:       'Network error',  // ❌ shows stale error on reload ❌
      searchQuery: 'shoes',    // ❌ restores last search — unexpected ❌
    }),
    { name: 'app-store' }
  )
)

// ✅ partialize: persist only intentional state
const useStoreFixed = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'light', isLoading: false, activeModal: null, error: null, searchQuery: ''
    }),
    {
      name: 'app-store',
      partialize: (s) => ({
        theme: s.theme,     // ✅ user preference
      }),
    }
  )
)
```

---

## K — Coding Challenge + Solution

### Challenge

Persist `usePreferencesStore` (theme, language, fontSize, notificationsEnabled) with `partialize`, add a `resetPreferences` action, and verify hydration before rendering.

### Solution

```tsx
interface PreferencesStore {
  theme:                'light' | 'dark' | 'system'
  language:             string
  fontSize:             'sm' | 'md' | 'lg'
  notificationsEnabled: boolean
  _hydrated:            boolean
  setTheme:             (t: 'light' | 'dark' | 'system') => void
  setLanguage:          (l: string) => void
  setFontSize:          (s: 'sm' | 'md' | 'lg') => void
  setNotifications:     (v: boolean) => void
  resetPreferences:     () => void
}

const DEFAULTS = {
  theme:                'system' as const,
  language:             'en',
  fontSize:             'md' as const,
  notificationsEnabled: true,
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      _hydrated: false,

      setTheme:         (theme)                => set({ theme }),
      setLanguage:      (language)             => set({ language }),
      setFontSize:      (fontSize)             => set({ fontSize }),
      setNotifications: (notificationsEnabled) => set({ notificationsEnabled }),
      resetPreferences: ()                     => set(DEFAULTS),
    }),
    {
      name: 'user-preferences',
      partialize: (s) => ({
        theme:                s.theme,
        language:             s.language,
        fontSize:             s.fontSize,
        notificationsEnabled: s.notificationsEnabled,
      }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ _hydrated: true })
      },
    }
  )
)

function AppPreferencesGate({ children }: { children: React.ReactNode }) {
  const hydrated = usePreferencesStore(s => s._hydrated)
  if (!hydrated) return <div className="app-skeleton" />   // wait for storage read
  return <>{children}</>
}
```

---

---

# 4 — Hydration + SSR Caveats

---

## T — TL;DR

On the server, `localStorage` doesn't exist — `persist` hydrates asynchronously on the client. Without handling this, you get **hydration mismatch** (server HTML ≠ client initial render). Guard with a `_hasHydrated` flag or `useEffect` before reading persisted state.

---

## K — Key Concepts

```tsx
// ── The SSR hydration problem ─────────────────────────────────────────────
// Server renders with initial state (theme: 'light')
// Client hydrates from localStorage (theme: 'dark')
// → React sees mismatched HTML → hydration error or visual flash ❌

// ── Solution 1: Skip persisted state on first render ──────────────────────
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const theme = usePreferencesStore(s => s.theme)

  // Server + first render: use default to match SSR output ✅
  return (
    <div data-theme={mounted ? theme : 'light'}>
      {children}
    </div>
  )
}
```

```tsx
// ── Solution 2: _hasHydrated flag in the store ────────────────────────────
interface ThemeStore {
  theme:        'light' | 'dark'
  _hasHydrated: boolean
  setHydrated:  (v: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme:        'light',
      _hasHydrated: false,
      setHydrated:  (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'theme',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)   // fires after localStorage is read ✅
      },
    }
  )
)

function ThemedLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useThemeStore(s => s._hasHydrated)
  const theme    = useThemeStore(s => s.theme)
  if (!hydrated) return <>{children}</>   // render without theme until hydrated ✅
  return <div data-theme={theme}>{children}</div>
}
```

```tsx
// ── Solution 3: Next.js — skip persist on server entirely ─────────────────
import { createJSONStorage } from 'zustand/middleware'

const noopStorage = {
  getItem:    () => null,
  setItem:    () => {},
  removeItem: () => {},
}

const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({ theme: 'light' }),
    {
      name:    'prefs',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : noopStorage   // ✅
      ),
    }
  )
)
```

---

## W — Why It Matters

- Hydration mismatch is a hard-to-debug React error — the server produces HTML with initial state, but the client immediately re-renders with a different persisted state, causing a flash or a React warning.
- The `onRehydrateStorage` callback is the correct hook point — it fires after the async storage read completes, making it the right place to set `_hasHydrated: true`.
- In Next.js App Router, components that use `localStorage` must be client components (`'use client'`) — attempting `persist` in a server component crashes.

---

## I — Interview Q&A

### Q: What causes hydration mismatch with Zustand persist in Next.js and how do you fix it?

**A:** `persist` reads from `localStorage` asynchronously after the component mounts. On the server and the initial client render, the store has its `initialState` values. After hydration, `localStorage` values replace them — causing a mismatch if the SSR HTML was built with different values. Fix: (1) Use a `_hasHydrated` flag set in `onRehydrateStorage` — render a neutral fallback until hydration completes. (2) Use `mounted` state in the component — skip reading persisted state on first render. (3) Use a `noopStorage` on the server (`typeof window !== 'undefined' ? localStorage : noopStorage`) so the store behaves consistently between server and client. Always `partialize` to minimize the persisted surface area.

---

## C — Common Pitfalls + Fix

### ❌ Reading persisted state synchronously on server — crashes or mismatches

```tsx
// ❌ Server render: localStorage is undefined → throws
const useStore = create<Store>()(
  persist(
    (set) => ({ theme: 'light' }),
    { name: 'theme', storage: createJSONStorage(() => localStorage) }
    // ❌ localStorage is not defined on server → ReferenceError
  )
)

// ✅ Guard with typeof window
const useStore = create<Store>()(
  persist(
    (set) => ({ theme: 'light' }),
    {
      name: 'theme',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : noopStorage  // ✅
      ),
    }
  )
)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useHydratedStore` helper hook that returns `null` until the store has hydrated, preventing SSR mismatch for any persisted store.

### Solution

```tsx
import { useEffect, useState } from 'react'

// Generic hook: blocks rendering until any persist store has hydrated
function useHydrated(store: { persist: { hasHydrated: () => boolean } }) {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated())

  useEffect(() => {
    if (hydrated) return
    const unsub = store.persist.onFinishHydration(() => setHydrated(true))
    // Edge case: hydrated between render and effect
    setHydrated(store.persist.hasHydrated())
    return unsub
  }, [store, hydrated])

  return hydrated
}

// Usage
function PersistedThemeWrapper({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated(usePreferencesStore)
  const theme    = usePreferencesStore(s => s.theme)

  return (
    <div data-theme={hydrated ? theme : 'light'}>
      {hydrated ? children : <AppSkeleton />}
    </div>
  )
}
```

---

---

# 5 — Versioning + Migration

---

## T — TL;DR

When the persisted store's shape changes, old localStorage data will fail to parse or populate wrong fields. The `version` + `migrate` options in `persist` handle safe schema upgrades — old data is transformed before being loaded.

---

## K — Key Concepts

```tsx
// ── The problem: schema change breaks persisted data ─────────────────────
// v1: { items: { id, name, qty }[] }
// v2: items now have { id, name, qty, addedAt: string }
// Old localStorage still has v1 shape → addedAt is undefined everywhere ❌

// ── version + migrate: safe upgrade ──────────────────────────────────────
const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [] as CartItem[],
      addItem: (item) => set(s => ({ items: [...s.items, item] })),
    }),
    {
      name:    'cart-v2',
      version: 2,         // increment when shape changes ✅

      migrate: (persistedState: unknown, fromVersion: number) => {
        const state = persistedState as any

        if (fromVersion === 0) {
          // v0 → v1: items had no qty field
          state.items = (state.items ?? []).map((item: any) => ({
            ...item,
            qty: item.qty ?? 1,
          }))
        }

        if (fromVersion < 2) {
          // v1 → v2: items now have addedAt
          state.items = (state.items ?? []).map((item: any) => ({
            ...item,
            addedAt: item.addedAt ?? new Date().toISOString(),
          }))
        }

        return state as CartStore   // return fully migrated state ✅
      },
    }
  )
)
```

```tsx
// ── Storage key rename: clear old key, use new key ────────────────────────
// If you rename the storage key entirely, old data is abandoned (not migrated).
// Solution A: keep the old key name (recommended — least disruption)
// Solution B: use onRehydrateStorage to manually copy from old key
const useStore = create<Store>()(
  persist(
    (set) => ({ theme: 'light' }),
    {
      name: 'app-prefs-v2',   // new key
      onRehydrateStorage: () => () => {
        // One-time: migrate data from old key
        const old = localStorage.getItem('app-prefs')
        if (old) {
          const parsed = JSON.parse(old)
          useStore.setState({ theme: parsed.theme })
          localStorage.removeItem('app-prefs')   // clean up
        }
      },
    }
  )
)
```

```tsx
// ── When to increment version ─────────────────────────────────────────────
// Increment version when:
//   - Renaming a persisted field
//   - Changing a field's type
//   - Removing a field that old migrate code shouldn't try to use
//   - Adding a REQUIRED field (without default in migrate → undefined bugs)
//
// Don't need to increment when:
//   - Only changing non-persisted fields (partialize excludes them)
//   - Adding optional fields with sensible undefined handling
//   - Changing action implementations (not persisted)
```

---

## W — Why It Matters

- Skipping versioning means the first deploy with a shape change breaks persisted data for all existing users — their cart, preferences, or session data silently has `undefined` fields.
- The `migrate` function is called once per version gap — it must handle every version from 0 to current, chaining transformations so a user who hasn't opened the app in 6 months gets all migrations applied.
- Changing the `name` option (storage key) is effectively a hard reset — users lose their persisted state. Only do this if migration is impossible (e.g., structure is completely incompatible).

---

## I — Interview Q&A

### Q: How does the `migrate` function work in Zustand's persist middleware?

**A:** `migrate(persistedState, version)` receives the raw object from storage and the `version` number it was saved with. It must return the state in the current store's shape. You chain `if (fromVersion < N)` blocks — one per version increment — each transforming the state from the previous shape. Zustand calls `migrate` once if the stored `version` doesn't match the current `version` config. After migration, the returned state is used to hydrate the store. If `migrate` throws or returns `undefined`, the store falls back to initial state (clean slate). Always handle `undefined` gracefully in migration — the user's stored data may be incomplete.

---

## C — Common Pitfalls + Fix

### ❌ Not incrementing version when shape changes — silent undefined fields

```tsx
// ❌ Shape changed but version not incremented
// Old storage: { items: [{ id:1, name:'shoe' }] }  (no price field)
// New store expects: { items: [{ id, name, price }] }
const useStore = create()(
  persist(
    (set) => ({ items: [] as { id: number; name: string; price: number }[] }),
    { name: 'store', version: 1 }   // ❌ still version 1 — migration never runs
    // items loaded from storage, price is undefined → cart shows $NaN everywhere ❌
  )
)

// ✅ Increment version + add migration
const useStoreFixed = create()(
  persist(
    (set) => ({ items: [] as CartItem[] }),
    {
      name:    'store',
      version: 2,   // ✅ incremented
      migrate: (state: any, fromVersion) => {
        if (fromVersion < 2) {
          state.items = (state.items ?? []).map((i: any) => ({
            ...i,
            price: i.price ?? 0,   // ✅ safe default
          }))
        }
        return state
      },
    }
  )
)
```

---

## K — Coding Challenge + Solution

### Challenge

Migrate `useUserPrefsStore` from v1 (`{ theme, lang }`) to v2 (`{ theme, language, fontSize }`). Version 3 renames `theme: 'dark'` to `theme: 'night'`.

### Solution

```tsx
interface PrefsV3 { theme: 'light' | 'night' | 'system'; language: string; fontSize: 'sm' | 'md' | 'lg' }

const useUserPrefsStore = create<PrefsV3>()(
  persist(
    (set) => ({
      theme:    'light' as const,
      language: 'en',
      fontSize: 'md' as const,
      setTheme:    (theme: PrefsV3['theme'])       => set({ theme }),
      setLanguage: (language: string)              => set({ language }),
      setFontSize: (fontSize: PrefsV3['fontSize']) => set({ fontSize }),
    }),
    {
      name:    'user-prefs',
      version: 3,

      migrate: (raw: unknown, fromVersion: number) => {
        const state = { ...(raw as any) }

        if (fromVersion < 2) {
          // v1 → v2: rename lang → language, add fontSize
          state.language = state.lang ?? 'en'
          delete state.lang
          state.fontSize = 'md'
        }

        if (fromVersion < 3) {
          // v2 → v3: rename 'dark' theme to 'night'
          if (state.theme === 'dark') state.theme = 'night'
        }

        return state as PrefsV3
      },

      partialize: (s) => ({
        theme:    s.theme,
        language: s.language,
        fontSize: s.fontSize,
      }),
    }
  )
)
```

---

---

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

# 7 — devtools Middleware

---

## T — TL;DR

The `devtools` middleware connects your Zustand store to the **Redux DevTools Extension** — time-travel debugging, action history, state diffing. Wrap with `devtools()` and name your actions for readable logs.

---

## K — Key Concepts

```tsx
import { create }   from 'zustand'
import { devtools } from 'zustand/middleware'

// ── Basic devtools setup ──────────────────────────────────────────────────
const useCartStore = create<CartStore>()(
  devtools(
    (set, get) => ({
      items: [],
      addItem: (item) => set(
        s => ({ items: [...s.items, item] }),
        false,           // replace: false = merge (default) ✅
        'cart/addItem'   // ← action name in DevTools ✅
      ),
      removeItem: (id) => set(
        s => ({ items: s.items.filter(i => i.id !== id) }),
        false,
        'cart/removeItem'
      ),
      clearCart: () => set({ items: [] }, false, 'cart/clearCart'),
    }),
    { name: 'CartStore' }   // ← store name in DevTools panel ✅
  )
)
```

```tsx
// ── Combining devtools with other middleware ──────────────────────────────
// Middleware order: devtools wraps outermost
const usePrefsStore = create<PrefsStore>()(
  devtools(
    persist(
      immer((set) => ({
        theme: 'light',
        setTheme: (theme: string) => set(state => { state.theme = theme }),
      })),
      { name: 'prefs' }
    ),
    { name: 'PrefsStore', enabled: process.env.NODE_ENV !== 'production' }
  )
)
// Order: devtools(persist(immer(storeCreator))) ✅
```

```tsx
// ── What you see in Redux DevTools ───────────────────────────────────────
// Without action names:
//   anonymous @ 12:34:56 — unhelpful

// With named actions:
//   cart/addItem    → { items: [..., newItem] }
//   cart/removeItem → { items: [...] }
//   auth/setUser    → { user: { id:1, name:'Alice' } }

// Time-travel: click any past action → state rewinds to that point
// Diff view: see exactly what changed between actions
// Export/import state: reproduce bug from user's exact state
```

```tsx
// ── DevTools only in development ──────────────────────────────────────────
const useStore = create<Store>()(
  devtools(
    (set) => ({ count: 0, increment: () => set(s => ({ count: s.count + 1 }), false, 'increment') }),
    {
      name:    'AppStore',
      enabled: process.env.NODE_ENV === 'development',  // ✅ strip in prod
    }
  )
)
```

---

## W — Why It Matters

- Named actions are the single biggest DevTools quality-of-life improvement — `'cart/addItem'` in the action log is instantly readable; an anonymous `set({...})` requires inspecting the diff to understand what happened.
- Time-travel debugging is uniquely valuable for reproducing multi-step bugs — you can rewind to the exact state before the bug appeared without re-doing the user's actions manually.
- `enabled: process.env.NODE_ENV === 'development'` is important — DevTools adds overhead and exposes state structure in the browser; never ship it to production.

---

## I — Interview Q&A

### Q: How do you use the Redux DevTools with Zustand?

**A:** Wrap your store creator with the `devtools` middleware. The third argument to `set()` becomes the action name shown in the DevTools panel — always provide it for readable action history. Configure `{ name: 'StoreName' }` to label the store in the panel when you have multiple stores. Combine with other middleware by nesting: `devtools(persist(immer(creator)))`. Use `enabled: process.env.NODE_ENV === 'development'` to exclude it from production builds. The Redux DevTools Extension (browser extension) must be installed — it's the same extension used with Redux, fully compatible with Zustand's `devtools` middleware.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting action names — unreadable DevTools history

```tsx
// ❌ No action name → all actions appear as "anonymous"
const useStore = create()(
  devtools((set) => ({
    count: 0,
    increment: () => set(s => ({ count: s.count + 1 })),   // ❌ no name
    reset:     () => set({ count: 0 }),                    // ❌ no name
  }))
)
// DevTools: anonymous, anonymous, anonymous — useless

// ✅ Third arg to set = action name
const useStoreFixed = create()(
  devtools((set) => ({
    count: 0,
    increment: () => set(s => ({ count: s.count + 1 }), false, 'counter/increment'),
    reset:     () => set({ count: 0 },                  false, 'counter/reset'),
  }), { name: 'CounterStore' })
)
// DevTools: counter/increment, counter/reset — instantly clear ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Add `devtools` to a combined `AuthSlice + CartSlice` store with named actions and `enabled: dev-only`.

### Solution

```tsx
const useAppStore = create<AuthSlice & CartSlice>()(
  devtools(
    (set, get) => ({
      // Auth slice
      user: null,
      setUser: (user) =>
        set({ user }, false, 'auth/setUser'),
      logout: () =>
        set({ user: null, items: [] }, false, 'auth/logout'),   // cross-slice ✅

      // Cart slice
      items: [],
      addItem: (item) =>
        set(s => ({ items: [...s.items, item] }), false, 'cart/addItem'),
      removeItem: (id) =>
        set(s => ({ items: s.items.filter(i => i.id !== id) }), false, 'cart/removeItem'),
      clearCart: () =>
        set({ items: [] }, false, 'cart/clearCart'),
    }),
    {
      name:    'AppStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)
```

---

---

# 8 — Reset-State Patterns

---

## T — TL;DR

Every Zustand store needs a `reset` story: resetting one slice, all slices, or just specific fields. Three clean patterns: **`INITIAL_STATE` constant**, **`resetAll` at root**, **slice-level `reset` actions**.

---

## K — Key Concepts

```tsx
// ── Pattern 1: INITIAL_STATE constant ────────────────────────────────────
const INITIAL_STATE = {
  items:   [] as CartItem[],
  coupon:  null as string | null,
  total:   0,
}

const useCartStore = create<typeof INITIAL_STATE & { reset: () => void; addItem: (i: CartItem) => void }>(
  set => ({
    ...INITIAL_STATE,
    addItem: (item) => set(s => ({ items: [...s.items, item] })),
    reset:   ()     => set(INITIAL_STATE),   // ✅ guaranteed initial shape
  })
)
```

```tsx
// ── Pattern 2: resetAll at the combined store level ────────────────────────
const INITIAL_SLICES = {
  // auth
  user:        null,
  isLoggedIn:  false,
  // cart
  items:       [] as CartItem[],
  // filters
  category:    'all',
  sortBy:      'popular',
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCartSlice(set, get),
  ...createFilterSlice(set, get),

  resetAll: () => set(INITIAL_SLICES, false, 'app/resetAll'),   // ✅ clears everything
}))
```

```tsx
// ── Pattern 3: Reset specific fields only ─────────────────────────────────
// Useful for "clear filters" without resetting auth or cart
const useFilterStore = create<FilterStore>(set => ({
  category:    'all',
  minPrice:    0,
  maxPrice:    Infinity,
  sortBy:      'popular',
  searchQuery: '',

  // Reset only filter fields — leave other store fields untouched
  resetFilters: () => set({
    category:    'all',
    minPrice:    0,
    maxPrice:    Infinity,
    sortBy:      'popular',
    searchQuery: '',
  }, false, 'filters/reset'),

  // Reset a single field
  clearSearch: () => set({ searchQuery: '' }, false, 'filters/clearSearch'),
}))
```

```tsx
// ── Reset on logout: cross-slice reset ───────────────────────────────────
logout: async () => {
  await fetch('/api/logout', { method: 'POST' })
  useAppStore.getState().resetAll()   // clear all user-specific state ✅
  // Also invalidate TanStack Query cache
  queryClient.clear()
},
```

---

## W — Why It Matters

- Without a `reset` pattern, logout leaves stale user data in stores — the next user who logs in on the same browser session sees the previous user's cart, preferences, or activity.
- The `INITIAL_STATE` constant makes `reset` reliable — it's the single source of truth for what "empty" looks like. If you add a new field, add it to `INITIAL_STATE` and `reset` automatically includes it.
- `queryClient.clear()` should always accompany store reset on logout — TanStack Query caches are user-specific and must be cleared when the user changes.

---

## I — Interview Q&A

### Q: What is the best pattern for resetting Zustand state on logout?

**A:** Three steps: (1) Call `useAppStore.setState(INITIAL_STATE)` or `useAppStore.getState().resetAll()` — this clears all store state to its initial values. If using slices, define a `resetAll` action at the root that spreads each slice's initial values. (2) Call `queryClient.clear()` or `queryClient.removeQueries()` — TanStack Query caches user data that must not persist to the next session. (3) Clear persisted storage: `useCartStore.persist.clearStorage()` for any stores using `persist` middleware. The `INITIAL_STATE` constant pattern is the key — it guarantees `reset` returns to a known good state rather than a partial one assembled from scattered defaults.

---

## C — Common Pitfalls + Fix

### ❌ Manual reset that misses new fields — silent stale state

```tsx
// ❌ reset() lists fields explicitly — easy to forget new ones
const useUserStore = create<UserStore>(set => ({
  profile: null,
  preferences: { theme: 'light' },
  activity: [],

  reset: () => set({
    profile:     null,
    preferences: { theme: 'light' },
    // activity forgotten ❌ — logs persist after logout
  }),
}))

// ✅ INITIAL_STATE constant — can't miss fields
const INITIAL: Omit<UserStore, 'reset' | 'setProfile'> = {
  profile:     null,
  preferences: { theme: 'light' },
  activity:    [],
}

const useUserStoreFixed = create<UserStore>(set => ({
  ...INITIAL,
  setProfile: (p) => set({ profile: p }),
  reset:      ()  => set(INITIAL),   // ✅ INITIAL always up to date
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useSessionStore` with profile, cart, and preferences slices. Add a `fullLogout` action that resets all slices, clears persist storage, and clears the TanStack Query cache.

### Solution

```tsx
const INITIAL_SESSION = {
  profile:     null as User | null,
  items:       [] as CartItem[],
  theme:       'light' as const,
  language:    'en',
}

type SessionStore = typeof INITIAL_SESSION & {
  setProfile:  (u: User) => void
  addItem:     (i: CartItem) => void
  setTheme:    (t: string) => void
  fullLogout:  (queryClient: QueryClient) => Promise<void>
}

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...INITIAL_SESSION,
        setProfile: (profile) => set({ profile },           false, 'session/setProfile'),
        addItem:    (item)    => set(s => ({ items: [...s.items, item] }), false, 'session/addItem'),
        setTheme:   (theme)   => set({ theme } as any,      false, 'session/setTheme'),

        fullLogout: async (queryClient) => {
          // 1. Call API
          await fetch('/api/logout', { method: 'POST' }).catch(() => {})
          // 2. Reset all store state
          set(INITIAL_SESSION, false, 'session/fullLogout')
          // 3. Clear TanStack Query cache
          queryClient.clear()
          // 4. Clear persisted storage
          useSessionStore.persist.clearStorage()
        },
      }),
      {
        name:       'session',
        partialize: (s) => ({ theme: s.theme, language: s.language }),
      }
    ),
    { name: 'SessionStore', enabled: process.env.NODE_ENV === 'development' }
  )
)
```

---

---

# 9 — Map and Set Usage

---

## T — TL;DR

`Map` and `Set` are not JSON-serializable — using them in Zustand with `persist` requires custom serialization. For in-memory (non-persisted) stores, they work fine with Immer. For persisted stores, convert to arrays on write and back on read.

---

## K — Key Concepts

```tsx
// ── Set: selected IDs, active features, visited items ────────────────────
interface SelectionStore {
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
  clearSelection: () => void
  isSelected: (id: number) => boolean
}

// In-memory only (no persist) → Immer handles Set natively
const useSelectionStore = create<SelectionStore>()(
  immer(set => ({
    selectedIds: new Set<number>(),

    toggleSelect: (id) => set(state => {
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id)
      } else {
        state.selectedIds.add(id)
      }
    }),
    clearSelection: () => set(state => { state.selectedIds.clear() }),
    isSelected:     (id) => useSelectionStore.getState().selectedIds.has(id),
  }))
)
```

```tsx
// ── Map: lookup tables, caches, key-value state ───────────────────────────
interface ExpandedStore {
  expandedRows: Map<number, boolean>
  toggleRow:    (id: number) => void
  isExpanded:   (id: number) => boolean
}

const useExpandedStore = create<ExpandedStore>()(
  immer(set => ({
    expandedRows: new Map<number, boolean>(),

    toggleRow: (id) => set(state => {
      const current = state.expandedRows.get(id) ?? false
      state.expandedRows.set(id, !current)   // ✅ Map.set on Immer draft
    }),

    isExpanded: (id) => useExpandedStore.getState().expandedRows.get(id) ?? false,
  }))
)
```

```tsx
// ── Persisting Set/Map: custom storage serialization ─────────────────────
const usePersistedSelectionStore = create<SelectionStore>()(
  persist(
    immer(set => ({
      selectedIds: new Set<number>(),
      toggleSelect:   (id) => set(s => {
        if (s.selectedIds.has(id)) s.selectedIds.delete(id)
        else s.selectedIds.add(id)
      }),
      clearSelection: () => set(s => { s.selectedIds.clear() }),
    })),
    {
      name: 'selection',
      // Serialize Set → Array for storage, deserialize Array → Set on load
      storage: createJSONStorage(() => localStorage, {
        replacer:  (key, value) => value instanceof Set ? { __type: 'Set', data: [...value] } : value,
        reviver:   (key, value) => value?.__type === 'Set' ? new Set(value.data) : value,
      }),
      partialize: (s) => ({ selectedIds: s.selectedIds }),
    }
  )
)
```

```tsx
// ── Prefer plain objects/arrays when persist is needed ────────────────────
// If you need to persist selection, simpler to use an array:
interface SimpleSelectionStore {
  selectedIds: number[]   // array instead of Set — JSON-serializable ✅
  toggleSelect: (id: number) => void
  isSelected:   (id: number) => boolean
}
const useSimpleSelection = create<SimpleSelectionStore>()(
  persist(
    (set, get) => ({
      selectedIds: [],
      toggleSelect: (id) => set(s => ({
        selectedIds: s.selectedIds.includes(id)
          ? s.selectedIds.filter(i => i !== id)
          : [...s.selectedIds, id]
      })),
      isSelected: (id) => get().selectedIds.includes(id),
    }),
    { name: 'selection', partialize: s => ({ selectedIds: s.selectedIds }) }
  )
)
```

---

## W — Why It Matters

- `Set` and `Map` are semantically correct for selection and lookup use cases — they express intent better than arrays with `.includes()` and `.find()`.
- The Immer middleware handles `Set`/`Map` mutations on drafts natively — `.add()`, `.delete()`, `.set()`, `.get()` all work as expected.
- JSON serialization silently converts `Set` → `{}` (empty object) and `Map` → `{}` — always use custom `replacer`/`reviver` or prefer plain arrays/objects when persistence is needed.

---

## I — Interview Q&A

### Q: Can you use `Map` and `Set` in Zustand stores?

**A:** Yes, with caveats. In-memory stores (no `persist`) work fine, especially with Immer middleware — Immer knows how to produce immutable `Map` and `Set` updates from draft mutations. For persisted stores, `JSON.stringify` converts `Set` to `{}` and `Map` to `{}` — the data is silently lost. Fix: use the `replacer`/`reviver` options in `createJSONStorage` to serialize to `{ __type: 'Set', data: [...] }` and back. Alternatively, use plain arrays for selection (`.includes()`) and plain objects for maps — they serialize naturally and avoid the complexity. For large lookup tables where `O(1)` access matters, keep the `Map` in memory and convert to an object for persistence.

---

## C — Common Pitfalls + Fix

### ❌ Using Set in a persisted store without custom serializer

```tsx
// ❌ Set silently serializes to {} — all selections lost on reload
const useStore = create()(
  persist(
    (set) => ({
      selectedIds: new Set([1, 2, 3]),   // ❌
      // localStorage after persist:
      // {"state":{"selectedIds":{}},"version":0}
      // → on reload: selectedIds = {} (empty object, not Set) ❌
    }),
    { name: 'selection' }
  )
)

// ✅ Use array for persisted selection state
const useStoreFixed = create()(
  persist(
    (set, get) => ({
      selectedIds: [1, 2, 3] as number[],   // ✅ JSON-safe
      toggleSelect: (id: number) => set(s => ({
        selectedIds: s.selectedIds.includes(id)
          ? s.selectedIds.filter(i => i !== id)
          : [...s.selectedIds, id],
      })),
      isSelected: (id: number) => get().selectedIds.includes(id),
    }),
    { name: 'selection' }
  )
)
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useMultiSelectStore` with `Set<string>` for selected item keys — in-memory only, Immer, with `toggleSelect`, `selectAll`, `clearAll`, `isSelected`, and `selectedCount`.

### Solution

```tsx
interface MultiSelectStore {
  selected:     Set<string>
  toggleSelect: (key: string) => void
  selectAll:    (keys: string[]) => void
  clearAll:     () => void
  isSelected:   (key: string) => boolean
  selectedCount: number
}

export const useMultiSelectStore = create<MultiSelectStore>()(
  immer((set, get) => ({
    selected: new Set<string>(),

    toggleSelect: (key) => set(state => {
      if (state.selected.has(key)) state.selected.delete(key)
      else                         state.selected.add(key)
    }),

    selectAll: (keys) => set(state => {
      keys.forEach(k => state.selected.add(k))
    }),

    clearAll: () => set(state => { state.selected.clear() }),

    isSelected: (key) => get().selected.has(key),

    get selectedCount() { return get().selected.size },
  }))
)

// Usage
function DataTable({ rows }: { rows: { id: string; name: string }[] }) {
  const { selected, toggleSelect, selectAll, clearAll, selectedCount } =
    useMultiSelectStore(useShallow(s => ({
      selected:     s.selected,
      toggleSelect: s.toggleSelect,
      selectAll:    s.selectAll,
      clearAll:     s.clearAll,
      selectedCount: s.selectedCount,
    })))

  return (
    <div>
      <div>
        <button onClick={() => selectAll(rows.map(r => r.id))}>Select all</button>
        <button onClick={clearAll} disabled={selectedCount === 0}>Clear ({selectedCount})</button>
      </div>
      {rows.map(row => (
        <div key={row.id}>
          <input
            type="checkbox"
            checked={selected.has(row.id)}
            onChange={() => toggleSelect(row.id)}
          />
          {row.name}
        </div>
      ))}
    </div>
  )
}
```

---

---

# 10 — React + TanStack Query + Zustand Architecture Boundaries

---

## T — TL;DR

Each tool has exactly one job: **React** owns component tree + local state, **TanStack Query** owns server state + cache, **Zustand** owns shared client state. The boundary is clear: if it comes from an API, it's TanStack Query. If it's UI-only and shared, it's Zustand. If it's local to one component, it's `useState`.

---

## K — Key Concepts

```
── Full architecture map ─────────────────────────────────────────────────────

Tool              Owns                              Examples
────────────────  ────────────────────────────────  ─────────────────────────────────────
useState          Local component state             formValue, isOpen (single component)
React Context     Dependency injection              ThemeContext (for non-store consumers)
Zustand           Shared client state               auth session, cart, UI flags, filters
TanStack Query    Server state + cache              products, orders, user profile, posts
React Hook Form   Form state + validation           signup, checkout, edit forms
```

```tsx
// ── Auth state ────────────────────────────────────────────────────────────
// Zustand: current user session (who is logged in — client fact)
// TanStack Query: user profile data (what the server says about this user)

// stores/auth.ts (Zustand)
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      userId:  null as number | null,   // just the ID + minimal session info
      token:   null as string | null,
      setAuth: (userId, token) => set({ userId, token }),
      clearAuth: ()            => set({ userId: null, token: null }),
    }),
    { name: 'auth', partialize: s => ({ userId: s.userId, token: s.token }) }
  )
)

// hooks/queries/useCurrentUser.ts (TanStack Query)
export function useCurrentUser() {
  const userId = useAuthStore(s => s.userId)
  return useQuery({
    queryKey: ['user', 'me', userId],
    queryFn:  ({ signal }) => fetchCurrentUser(signal),
    enabled:  !!userId,
    staleTime: 1000 * 60 * 10,
  })
}
// Auth IDENTITY (logged in? who?) → Zustand
// Auth DATA (profile fields, permissions) → TanStack Query
```

```tsx
// ── Theme state ───────────────────────────────────────────────────────────
// Zustand: user's chosen theme (local preference, not server data)
// Persisted to localStorage

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme:     'system' as 'light' | 'dark' | 'system',
      setTheme:  (theme) => set({ theme }),
      resolved:  (): 'light' | 'dark' => {
        const { theme } = useThemeStore.getState()
        if (theme !== 'system') return theme
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      },
    }),
    { name: 'theme', partialize: s => ({ theme: s.theme }) }
  )
)
// Never put theme in TanStack Query unless it's a server-saved preference
// If saved to server: useMutation to save + useQuery to load initial value
```

```tsx
// ── Filter state ──────────────────────────────────────────────────────────
// Zustand: the user's current filter selections (client state)
// TanStack Query: the filtered results (server state)

export const useFilterStore = create<FilterStore>(set => ({
  category:    'all',
  minPrice:    0,
  maxPrice:    Infinity,
  sortBy:      'popular',
  setCategory: (c) => set({ category: c }),
  resetFilters: () => set({ category: 'all', minPrice: 0, maxPrice: Infinity, sortBy: 'popular' }),
}))

// Connection: filter state drives the query key
function useFilteredProducts() {
  const filters = useFilterStore(
    useShallow(s => ({ category: s.category, minPrice: s.minPrice, sortBy: s.sortBy }))
  )
  return useQuery({
    queryKey: ['products', filters],          // Zustand state → TQ key ✅
    queryFn:  ({ signal }) => fetchProducts(filters, signal),
    placeholderData: keepPreviousData,
  })
}
```

```tsx
// ── UI state architecture ─────────────────────────────────────────────────
// Everything that controls what the UI shows — no server involvement

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      sidebarOpen:       false,
      activeModal:       null as string | null,
      toastQueue:        [] as Toast[],
      commandPaletteOpen: false,

      toggleSidebar:   () => set(s => ({ sidebarOpen: !s.sidebarOpen }), false, 'ui/toggleSidebar'),
      openModal:       (name) => set({ activeModal: name },  false, 'ui/openModal'),
      closeModal:      ()     => set({ activeModal: null },  false, 'ui/closeModal'),
      addToast:        (t)    => set(s => ({ toastQueue: [...s.toastQueue, { ...t, id: Date.now() }] }), false, 'ui/addToast'),
      dismissToast:    (id)   => set(s => ({ toastQueue: s.toastQueue.filter(t => t.id !== id) }), false, 'ui/dismissToast'),
      openCommandPalette:  () => set({ commandPaletteOpen: true },  false, 'ui/openCommandPalette'),
      closeCommandPalette: () => set({ commandPaletteOpen: false }, false, 'ui/closeCommandPalette'),
    }),
    { name: 'UIStore', enabled: process.env.NODE_ENV === 'development' }
  )
)
```

---

## W — Why It Matters

- Auth is the most common boundary violation: teams store the user's profile data (name, avatar, permissions) in Zustand when it should be in TanStack Query — then it goes stale, doesn't invalidate after profile updates, and has no retry.
- Filter state in Zustand driving query keys in TanStack is the canonical "Zustand + TanStack connection pattern" — clean, unidirectional, with each tool doing what it's designed for.
- The toast/notification system in Zustand (not Context, not Redux) is a textbook use case: any component can add a toast, the ToastContainer reads and dismisses them, no prop drilling, no re-render thrashing.

---

## I — Interview Q&A

### Q: You have Zustand and TanStack Query in a project. How do you decide which handles user authentication?

**A:** Split by responsibility: Zustand handles the **session identity** — whether a user is logged in, their ID, and the auth token. This is local browser state (set on login, cleared on logout, persisted to localStorage). TanStack Query handles the **user data** — profile fields, permissions, avatar, preferences. This is server state: it can become stale, needs invalidation after profile updates, benefits from caching and retry. The connection: `useQuery({ enabled: !!userId })` — Zustand's session identity gates TanStack's data fetch. On logout: clear Zustand (`clearAuth()`), clear TanStack cache (`queryClient.clear()`), and clear persist storage. Never store the full user object in Zustand — that's the server's job.

---

## C — Common Pitfalls + Fix

### ❌ Storing server response directly in Zustand — bypassing TanStack Query

```tsx
// ❌ Storing server data in Zustand — loses all TanStack benefits
const useUserStore = create(set => ({
  currentUser: null,             // ← server data in Zustand ❌
  isLoading:   false,
  loadUser: async () => {
    set({ isLoading: true })
    const user = await fetchCurrentUser()
    set({ currentUser: user, isLoading: false })
    // No cache, no stale tracking, no refetch on focus, no retry,
    // no invalidation after mutations, no DevTools query panel ❌
  },
}))

// ✅ Server data in TanStack Query, identity in Zustand
// stores/auth.ts (Zustand — identity only)
const useAuthStore = create()(
  persist(
    (set) => ({ userId: null as number | null, setUserId: (id: number) => set({ userId: id }), clearAuth: () => set({ userId: null }) }),
    { name: 'auth', partialize: s => ({ userId: s.userId }) }
  )
)

// hooks/queries/useCurrentUser.ts (TanStack — user data)
export function useCurrentUser() {
  const userId = useAuthStore(s => s.userId)
  return useQuery({
    queryKey:  ['user', 'me'],
    queryFn:   ({ signal }) => fetchCurrentUser(signal),
    enabled:   !!userId,
    staleTime: 1000 * 60 * 10,
  })
}
// Profile updates → qc.invalidateQueries(['user', 'me']) → auto-refreshed ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Design the complete state architecture for a real app page: `ProductListPage` with auth-gated access, filters, paginated results, selected items, and a toast on add-to-cart. Map each piece of state to the correct tool.

### Solution

```tsx
// ── State map ─────────────────────────────────────────────────────────────
//
// Zustand stores:
//   useAuthStore       → userId, token, clearAuth()
//   useFilterStore     → category, sortBy, page, setCategory(), setPage(), reset()
//   useCartStore       → items[], addItem(), totalItems()
//   useUIStore         → toastQueue[], addToast(), dismissToast()
//   useSelectionStore  → selectedIds (Set), toggleSelect(), clearAll()
//
// TanStack Query:
//   useCurrentUser()   → queryKey:['user','me'], enabled:!!userId
//   useProducts(filters) → queryKey:['products', filters], placeholderData: keepPreviousData
//
// useState (local):
//   sortMenuOpen   → in ProductList component (not shared)

// ── ProductListPage component ──────────────────────────────────────────────
function ProductListPage() {
  // Auth gate
  const userId = useAuthStore(s => s.userId)
  const { data: currentUser } = useCurrentUser()
  if (!userId) return <LoginRedirect />

  // Filter state (Zustand)
  const { category, sortBy, page, setCategory, setPage } = useFilterStore(
    useShallow(s => ({ category: s.category, sortBy: s.sortBy, page: s.page, setCategory: s.setCategory, setPage: s.setPage }))
  )

  // Server data (TanStack Query — driven by Zustand filter state)
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['products', { category, sortBy, page }],
    queryFn:  ({ signal }) => fetchProducts({ category, sortBy, page }, signal),
    placeholderData: keepPreviousData,
    enabled: !!currentUser,
  })

  // Cart + toast
  const addItem    = useCartStore(s => s.addItem)
  const addToast   = useUIStore(s => s.addToast)
  const { toggleSelect, selected } = useSelectionStore(
    useShallow(s => ({ toggleSelect: s.toggleSelect, selected: s.selected }))
  )

  function handleAddToCart(product: Product) {
    addItem({ id: product.id, name: product.name, price: product.price, qty: 1 })
    addToast({ text: `${product.name} added to cart`, type: 'success' })
  }

  return (
    <div>
      <FilterBar
        category={category}
        sortBy={sortBy}
        onCategoryChange={setCategory}
      />
      <div style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>
        {isLoading
          ? <ProductGridSkeleton />
          : (data?.items ?? []).map(p => (
              <ProductCard
                key={p.id}
                product={p}
                selected={selected.has(String(p.id))}
                onSelect={() => toggleSelect(String(p.id))}
                onAddToCart={() => handleAddToCart(p)}
              />
            ))
        }
      </div>
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        disabled={isPlaceholderData}
      />
    </div>
  )
}
```

---

## ✅ Day 12 Complete — Zustand Scaling and Integration

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Slice Pattern + Bounded Stores | ☐ |
| 2 | Cross-Slice Actions | ☐ |
| 3 | persist Middleware + Storage Choices | ☐ |
| 4 | Hydration + SSR Caveats | ☐ |
| 5 | Versioning + Migration | ☐ |
| 6 | subscribeWithSelector + Granular Subscriptions | ☐ |
| 7 | devtools Middleware | ☐ |
| 8 | Reset-State Patterns | ☐ |
| 9 | Map and Set Usage | ☐ |
| 10 | React + TanStack Query + Zustand Boundaries | ☐ |

---

## 🗺️ One-Page Mental Model — Day 12

```
SLICE PATTERN + BOUNDED STORES
  Bounded: one create() per domain — default, simplest, good for unrelated domains
  Slice: one create(), multiple factories spread into it — use when cross-slice needed
  createXSlice(set, get): returns partial store object
  useStore = create((set,get) => ({ ...createA(set,get), ...createB(set,get) }))

CROSS-SLICE ACTIONS
  set({ fieldFromAnySlice }): works because all slices share one store object
  get(): reads current state of any slice — avoids stale closure
  Root orchestration: actions at create() level that coordinate across slices
  ❌ Importing bounded store A inside bounded store B → hidden coupling

persist + STORAGE CHOICES
  persist(storeCreator, { name, storage, partialize, version, migrate })
  partialize: ONLY persist intentional state — exclude isLoading, activeModal, errors
  localStorage: default, sync, 5MB limit | sessionStorage: tab-only
  IndexedDB: async, large payloads | noopStorage: server-side no-op
  name: unique key per store — collision = silent data corruption

HYDRATION + SSR
  localStorage not available on server → typeof window check or noopStorage
  hydration mismatch: server renders initial, client overwrites from storage → flash
  Fix: _hasHydrated flag via onRehydrateStorage → skip persisted values until set
  Fix: mounted state in component → use initial value for first render
  Next.js: all persist stores must be in 'use client' components

VERSIONING + MIGRATION
  version: number → increment when persisted shape changes
  migrate(rawState, fromVersion): transform old shape → current shape
  Chain if (fromVersion < N) blocks — handles users who skipped versions
  Always provide defaults for new required fields in migrate
  name change = hard reset for users → avoid; prefer migrate

subscribeWithSelector + GRANULAR SUBSCRIPTIONS
  Enable: create()(subscribeWithSelector(creator))
  subscribe(selector, cb, { equalityFn: shallow }) → fires only when slice changes
  { fireImmediately: true } → initial sync + all future changes in one subscribe
  Module-level subscriptions: localStorage, URL sync, analytics, debounced server save
  Object selector → equalityFn: shallow REQUIRED or fires on every update

devtools MIDDLEWARE
  devtools(creator, { name, enabled })
  set(newState, false, 'slice/actionName') → named action in DevTools log
  devtools(persist(immer(creator))) → devtools outermost
  enabled: process.env.NODE_ENV === 'development' → strip from production
  Time-travel, diff view, state export/import → reproduce bugs from user state

RESET-STATE PATTERNS
  INITIAL_STATE const outside create → reset() = set(INITIAL_STATE) — foolproof
  resetAll at root: cross-slice single call — use for logout
  resetFilters: partial reset — only filter fields, leave auth/cart intact
  On logout: store.resetAll() + queryClient.clear() + persist.clearStorage()

MAP + SET USAGE
  In-memory (no persist) + Immer: Set/Map work natively — .add, .delete, .set ✅
  Persisted: JSON.stringify converts Set/Map to {} silently ❌
  Fix A: custom replacer/reviver in createJSONStorage
  Fix B (simpler): use arrays for persisted selection state
  isSelected(id) = array.includes(id) | toggle = filter + conditionally add

ARCHITECTURE BOUNDARIES
  useState: local, single component — isOpen, formValue, localCounter
  Zustand: shared client state — auth identity, cart, UI flags, filters, toasts
  TanStack Query: server state — products, users, orders, profile data
  React Hook Form: form state + validation — never in Zustand or TQ
  Auth pattern: userId (Zustand) → gates useQuery(['user','me']) (TanStack)
  Filter pattern: filterValues (Zustand) → drive queryKey (TanStack)
  "Where does this data live?" → browser = Zustand, server = TanStack Query
  Never copy API response into Zustand → dual source of truth → diverges
```

> **Your next action:** Open your project and find one `useState` that's passed down more than 2 levels as props. Move it into a `create()` store with one action. Remove the props. That's the whole day justified in practice — 10 minutes, immediate improvement.

> "Doing one small thing beats opening a feed."