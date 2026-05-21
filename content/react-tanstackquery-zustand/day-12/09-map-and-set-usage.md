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
