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
