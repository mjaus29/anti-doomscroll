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
