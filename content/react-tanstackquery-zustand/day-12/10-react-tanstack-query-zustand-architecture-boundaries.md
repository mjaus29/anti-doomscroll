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
