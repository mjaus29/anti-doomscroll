# 8 — State Colocation

---

## T — TL;DR

**Colocation** means keeping state as close to where it's used as possible. The opposite of always lifting — if only one component needs the state, keep it there. Colocated state is easier to understand, delete, and refactor, and causes fewer unnecessary re-renders.

---

## K — Key Concepts

```
── Colocation principle ──────────────────────────────────────────────────────

Push state DOWN to the lowest component that needs it.
Lift state UP only when multiple components need it.

The wrong direction:
  → All state in App (global state everything) — massive re-renders, hard to maintain
  → All state in each leaf component — can't coordinate siblings

The right approach:
  → State lives at the lowest common ancestor of its consumers
  → No higher, no lower
```

```tsx
// ── Colocation in action ──────────────────────────────────────────────────
// ❌ Search query lifted too high — causes unnecessary parent re-renders
function App() {
  const [searchQuery, setSearchQuery] = useState('')   // ❌ too high
  // Every keystroke re-renders App and everything it renders

  return (
    <div>
      <Navbar />
      <ProductSearch
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />
      <Footer />   {/* re-renders on every keystroke — unnecessary */}
    </div>
  )
}

// ✅ Search query colocated in ProductSearch — nothing above it re-renders
function App() {
  return (
    <div>
      <Navbar />
      <ProductSearch />   {/* owns its own search query state ✅ */}
      <Footer />          {/* never re-renders from search ✅ */}
    </div>
  )
}

function ProductSearch() {
  const [query, setQuery] = useState('')   // ✅ colocated here

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductList query={query} />
    </div>
  )
}
```

```tsx
// ── What to colocate ──────────────────────────────────────────────────────
// ✅ UI state: tooltip visible, dropdown open, accordion expanded
// ✅ Local form state before submission
// ✅ Hover/focus state
// ✅ Pagination state used by one section
// ✅ Filter/sort state used only within one section

// What to lift:
// → State that coordinates multiple siblings
// → State that defines the "current selection" affecting multiple views
// → State needed by a distant ancestor (auth, cart count in header)
```

---

## W — Why It Matters

- Poorly colocated state is the most common source of unnecessary re-renders — lifting state higher than needed causes the entire subtree to re-render on every change, even components that don't use it.
- Colocated state is easier to delete: when the `DropdownMenu` component is removed, its `isOpen` state disappears with it. State in a parent would need manual cleanup.
- The colocation rule ("as low as possible, as high as necessary") is a heuristic you apply during code review — "does this state need to be in App, or can it move down?"

---

## I — Interview Q&A

### Q: What is state colocation and why does it matter for performance?

**A:** State colocation means keeping state in the component that most directly uses it — not lifting it higher than needed. It matters for performance because a state change triggers a re-render of the component that owns the state and all its children. If a search query lives in `App`, every keystroke re-renders the entire application. If it lives in `SearchSection`, only `SearchSection` and its children re-render. Navbar, Footer, and other siblings are unaffected. Beyond performance, colocated state is easier to understand (the state and its consumers are in the same place) and easier to delete (removing the component removes its state).

---

## C — Common Pitfalls + Fix

### ❌ Putting all UI state in a top-level store or parent

```tsx
// ❌ Global store / top-level state for purely local UI state
// Every dropdown, tooltip, modal open-state in App-level state
function App() {
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [isTooltipVisible, setTooltipVisible] = useState(false)
  const [isModalOpen, setModalOpen] = useState(false)
  // → Any of these changing re-renders entire App tree ❌
  // → These are local UI concerns that have no business in App
}

// ✅ UI state colocated in the components that own it
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)   // ✅ local
  return <div>...</div>
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)  // ✅ local
  return (
    <div onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && <span role="tooltip">{text}</span>}
    </div>
  )
}
// Dropdown opening doesn't re-render App or Tooltip ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Identify which state should be colocated vs lifted in a product page with: a search bar, a product grid with individual card hover states, a selected product panel, and a cart item count in the header.

### Solution

```tsx
// State analysis:
// - search query → colocate in ProductSection (only it + ProductGrid need it)
// - card hover state → colocate in ProductCard (only that card needs it)
// - selected product → lift to ProductPage (ProductGrid + ProductDetail both need it)
// - cart count → lift to App (Header + CartIcon both need it)

// Architecture:
function App() {
  const [cartCount, setCartCount] = useState(0)   // ← lifted: Header + ProductPage need it

  return (
    <>
      <Header cartCount={cartCount} />
      <ProductPage onAddToCart={() => setCartCount(c => c + 1)} />
    </>
  )
}

function ProductPage({ onAddToCart }: { onAddToCart: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)  // ← lifted: Grid + Detail

  return (
    <div>
      <ProductSection selectedId={selectedId} onSelect={setSelectedId} onAddToCart={onAddToCart} />
      <ProductDetail productId={selectedId} />
    </div>
  )
}

function ProductSection({ selectedId, onSelect, onAddToCart }:
  { selectedId: number | null; onSelect: (id: number) => void; onAddToCart: () => void }) {
  const [search, setSearch] = useState('')   // ← colocated: only this section needs it

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <ProductGrid search={search} selectedId={selectedId} onSelect={onSelect} onAddToCart={onAddToCart} />
    </>
  )
}

function ProductCard({ product, isSelected, onSelect, onAddToCart }:
  { product: Product; isSelected: boolean; onSelect: () => void; onAddToCart: () => void }) {
  const [isHovered, setIsHovered] = useState(false)   // ← colocated: only this card needs it

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ outline: isSelected ? '2px solid blue' : isHovered ? '1px solid gray' : 'none' }}
      onClick={onSelect}
    >
      {product.name}
      <button onClick={e => { e.stopPropagation(); onAddToCart() }}>Add to cart</button>
    </div>
  )
}
```

---

---
