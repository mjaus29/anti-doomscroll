# 8 — Separating UI State from Server Cache

---

## T — TL;DR

**UI state** (what's selected, what's open, what's being edited) belongs in Zustand. **Server state** (what's in the database) belongs in TanStack Query. Mixing them causes stale data, double-fetching, and cache inconsistency. Keep them separate with a clear boundary.

---

## K — Key Concepts

```tsx
// ── The boundary: two kinds of state, two tools ───────────────────────────

// ZUSTAND: UI state — browser-owned, no server involved
// TanStack Query: server state — owned by the database

// ✅ Correct split
// stores/ui.ts — Zustand
export const useUIStore = create<UIStore>(set => ({
  selectedProductId:  null,
  compareProductIds:  [] as number[],
  isFilterPanelOpen:  false,
  searchQuery:        '',
  activeTab:          'overview',

  selectProduct:    (id) => set({ selectedProductId: id }),
  addToCompare:     (id) => set(s => ({
    compareProductIds: s.compareProductIds.includes(id)
      ? s.compareProductIds
      : [...s.compareProductIds, id].slice(-3)  // max 3
  })),
  toggleFilterPanel: () => set(s => ({ isFilterPanelOpen: !s.isFilterPanelOpen })),
  setSearchQuery:   (q) => set({ searchQuery: q }),
}))

// hooks/queries/useProducts.ts — TanStack Query
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn:  ({ signal }) => fetchProducts(filters, signal),
  })
}
```

```tsx
// ── Connecting UI state to server queries ─────────────────────────────────
// The UI state (filter values) drives the query key — but they stay in separate systems

function ProductsPage() {
  // UI state: what filters the user has selected
  const { searchQuery, isFilterPanelOpen } = useUIStore(
    useShallow(s => ({ searchQuery: s.searchQuery, isFilterPanelOpen: s.isFilterPanelOpen }))
  )
  const activeFilters = useFilterStore(useShallow(s => ({
    category: s.category, minPrice: s.minPrice, maxPrice: s.maxPrice
  })))

  // Server state: products matching those filters
  const { data: products, isLoading } = useProducts({
    search: searchQuery,
    ...activeFilters,
  })
  // UI state changes → query key changes → TanStack fetches → no coupling ✅

  return (
    <div>
      {isFilterPanelOpen && <FilterPanel />}
      {isLoading ? <Skeleton /> : <ProductGrid products={products ?? []} />}
    </div>
  )
}
```

```tsx
// ── Anti-pattern: duplicating server data in Zustand ─────────────────────
// ❌ This is the most common Zustand mistake
const useProductStore = create(set => ({
  products: [],              // ← copy of server data in Zustand ❌
  selectedProductId: null,   // ← UI state ✅
  isLoading: false,          // ← loading state duplicated from TanStack ❌
  fetchProducts: async () => { /* re-implementing TanStack Query */ },
}))

// ✅ Products in TanStack, selection in Zustand — separate concerns
function useSelectedProduct() {
  const selectedId = useUIStore(s => s.selectedProductId)
  return useQuery({
    queryKey:  ['product', selectedId],
    queryFn:   ({ signal }) => fetchProduct(selectedId!, signal),
    enabled:   selectedId !== null,
  })
}
// Selection (Zustand UI state) drives the query (TanStack server state) ✅
```

```tsx
// ── Pattern: local edits before saving ───────────────────────────────────
// Server data: in TanStack Query cache (authoritative)
// Edit draft:  in Zustand (local-only until saved)

interface EditStore {
  draft:       Partial<User> | null
  isDirty:     boolean
  startEdit:   (user: User) => void
  updateField: <K extends keyof User>(key: K, value: User[K]) => void
  cancelEdit:  () => void
}

const useEditStore = create<EditStore>(set => ({
  draft:    null,
  isDirty:  false,

  startEdit: (user) => set({ draft: { ...user }, isDirty: false }),
  updateField: (key, value) => set(state => ({
    draft:   state.draft ? { ...state.draft, [key]: value } : null,
    isDirty: true,
  })),
  cancelEdit: () => set({ draft: null, isDirty: false }),
}))

// Save: mutation writes draft to server, TanStack invalidates
function useEditUser(userId: number) {
  const qc = useQueryClient()
  const { draft, cancelEdit } = useEditStore(
    useShallow(s => ({ draft: s.draft, cancelEdit: s.cancelEdit }))
  )

  return useMutation({
    mutationFn: () => patchUser(userId, draft!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
      cancelEdit()   // clear local draft after successful save ✅
    },
  })
}
```

---

## W — Why It Matters

- Duplicating server data in Zustand creates two sources of truth that diverge the moment the server changes — cache invalidation from TanStack mutations won't update the Zustand copy.
- The "UI state drives query" pattern (selection → query key) is the cleanest architecture: Zustand holds what the user chose, TanStack fetches the corresponding server data. Zero duplication.
- Local edit drafts in Zustand are a legitimate use case — the user's in-progress edits are genuinely client state until saved. The pattern is: copy server data into Zustand draft on edit start, write back via mutation on save, clear draft on success.

---

## I — Interview Q&A

### Q: How do you decide where to put state when you have both Zustand and TanStack Query in a project?

**A:** Ask one question: "Where does this data live?" — in the browser or on the server? Server data (products, users, orders — anything fetched from an API) belongs in TanStack Query. It has a source of truth that can change independently, needs caching, staleness tracking, and invalidation. Client data (what the user selected, what panels are open, filter values, draft edits, comparison lists) belongs in Zustand. It originates from user interaction, has no remote source of truth, and never goes stale in the server-state sense. The connection between them: UI state (selection, filters) becomes inputs to query keys — the user's choice drives what TanStack fetches. Never copy server query results into Zustand; never put async fetch operations in Zustand when TanStack Query is available.

---

## C — Common Pitfalls + Fix

### ❌ Storing API response in Zustand + also in TanStack Query — dual source of truth

```tsx
// ❌ Products stored in BOTH systems — mutation invalidates TanStack but not Zustand
const useProductStore = create(set => ({
  products: [],   // ← this will go stale
  loadProducts: async () => {
    const data = await fetch('/api/products').then(r => r.json())
    set({ products: data })
  },
}))

// Meanwhile in a component...
const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
// Two sources of products — one fresh, one stale. Which do components use? ❌

// ✅ Single source of truth: TanStack Query for server data
// Zustand only for UI state derived from user interaction

// Zustand UI store
const useProductUIStore = create(set => ({
  selectedIds:     [] as number[],
  viewMode:        'grid' as 'grid' | 'list',
  sortBy:          'popularity',
  toggleSelect:    (id: number) => set(s => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter(i => i !== id)
      : [...s.selectedIds, id]
  })),
  setViewMode:     (viewMode: 'grid' | 'list') => set({ viewMode }),
  setSortBy:       (sortBy: string) => set({ sortBy }),
}))

// TanStack Query for the actual data
function ProductsPage() {
  const sortBy   = useProductUIStore(s => s.sortBy)
  const { data } = useQuery({
    queryKey: ['products', { sortBy }],
    queryFn:  ({ signal }) => fetchProducts({ sortBy }, signal),
  })
  return <ProductGrid products={data ?? []} />
}
```

---

## ✅ Day 11 Complete — Zustand Fundamentals

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Why Zustand + No-Provider Model | ☐ |
| 2 | create + Store Shape + State + Actions | ☐ |
| 3 | Selectors | ☐ |
| 4 | Subscriptions | ☐ |
| 5 | Shallow Merge Behavior + Immutable Flat Updates | ☐ |
| 6 | Immutable Nested Updates + Immer Option | ☐ |
| 7 | Async Actions | ☐ |
| 8 | Separating UI State from Server Cache | ☐ |

---

## 🗺️ One-Page Mental Model — Day 11

```
WHY ZUSTAND + NO-PROVIDER
  Client state shared between components → Zustand (not Context, not Redux)
  No Provider wrap needed → import and use anywhere, even outside React
  Context: re-renders ALL consumers on ANY change → performance liability
  Zustand: selector-based → only subscribing component re-renders
  Server data → TanStack Query | Form state → React Hook Form | Local → useState

create + STORE SHAPE
  create<StoreType>(set => ({ ...state, ...actions })) — one call, done
  set(partial): shallow merge — untouched fields preserved at top level
  set(state => newPartial): use updater form when new value depends on old
  getState() / setState(): access store outside React (WebSocket, utils, tests)
  INITIAL_STATE constant outside create → clean resetAll without duplication

SELECTORS
  useMyStore(s => s.field) → re-renders only when s.field changes (Object.is)
  No selector → subscribes to entire store → re-renders on every change ❌
  Object selector without useShallow → new object every call → always re-renders ❌
  useShallow: shallow-compares object/array properties → prevents false re-renders
  Encapsulate selectors in custom hooks → components don't know store shape

SUBSCRIPTIONS
  subscribe(listener) → listen outside React, no re-render
  subscribeWithSelector middleware: subscribe(selector, cb) → only fires when slice changes
  Use for: localStorage sync, URL sync, analytics, WebSocket → store updates
  Module-level subscriptions: outlive components, app-wide side effects
  Always cleanup: const unsub = subscribe(…); return unsub in useEffect

SHALLOW MERGE + FLAT UPDATES
  set({ a: 1 }) → only a changes, b/c/d untouched (shallow merge)
  set({ nested: { name } }) → REPLACES entire nested object, siblings gone ❌
  Fix: set(s => ({ nested: { ...s.nested, name } })) → always spread nested
  Flat state design: top-level primitives → set({ field }) always safe
  Flat is simpler; nest only when structure is genuinely hierarchical

NESTED UPDATES + IMMER
  Immer middleware: mutate a draft → Immer produces new immutable state
  create<T>()(immer(set => ({ ... }))) — note: double function call with middleware
  set(state => { state.deeply.nested.field = value }) → clean 3-level update ✅
  Array ops on draft: push, splice, direct index assignment → all work ✅
  Don't return AND mutate in same Immer callback — pick one pattern
  Use Immer for 2+ nesting levels; use manual spread for flat/1-level

ASYNC ACTIONS
  Regular async function inside create callback — no middleware needed
  Pattern: set({ isLoading: true }) → try → set({ data }) → catch → set({ error }) → finally → set({ isLoading: false })
  getState() inside async action: reads live state, avoids stale closure
  Async in Zustand for: auth, preferences, one-off commands, file upload
  Async in TanStack Query for: anything that needs cache invalidation or retry

SEPARATING UI STATE FROM SERVER CACHE
  Server data → TanStack Query (cache, stale, retry, invalidation)
  UI state → Zustand (selection, open/close, draft edits, comparisons)
  Never duplicate API response in Zustand → dual source of truth → diverges
  Pattern: UI state (filters, selection) → drives query key → TanStack fetches
  Edit draft pattern: copy server data to Zustand draft → mutate → invalidate → clear draft
  Single question: "Where does this data live — browser or server?"
```

> **Your next action:** Open your project and find one piece of state that multiple components share via prop drilling. Create a `useXStore` with `create` and move that state into it. Update both components to use the hook directly. Delete the prop chain. That's Zustand's value in practice — takes 10 minutes, immediately cleaner.

> "Doing one small thing beats opening a feed."
