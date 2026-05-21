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
