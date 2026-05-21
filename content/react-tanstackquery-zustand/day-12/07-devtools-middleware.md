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
