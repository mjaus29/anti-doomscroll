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
