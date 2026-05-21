# 5 — Lifting State Up

---

## T — TL;DR

When two components need to share state, **move the state to their closest common ancestor**. The parent owns the state and passes it down as props. Children receive the value and a callback to request changes. This is the fundamental React data flow pattern.

---

## K — Key Concepts

```tsx
// ── Before lifting: each panel has its own expanded state ─────────────────
// Problem: can't coordinate them (only one open at a time rule)
function AccordionPanel({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false)   // ← lives here
  return (
    <div>
      <button onClick={() => setIsOpen(o => !o)}>{title}</button>
      {isOpen && <p>{content}</p>}
    </div>
  )
}
// Two AccordionPanels can't "know" about each other's state ❌
```

```tsx
// ── After lifting: parent owns the open panel ID ──────────────────────────
interface Panel { id: string; title: string; content: string }

interface AccordionPanelProps {
  panel:    Panel
  isOpen:   boolean               // value comes from parent
  onToggle: (id: string) => void  // requests change from parent
}

function AccordionPanel({ panel, isOpen, onToggle }: AccordionPanelProps) {
  return (
    <div>
      <button onClick={() => onToggle(panel.id)}>{panel.title}</button>
      {isOpen && <p>{panel.content}</p>}
    </div>
  )
}

function Accordion({ panels }: { panels: Panel[] }) {
  const [openId, setOpenId] = useState<string | null>(null)   // ← lifted here

  function handleToggle(id: string) {
    setOpenId(prev => prev === id ? null : id)  // close if already open
  }

  return (
    <div>
      {panels.map(panel => (
        <AccordionPanel
          key={panel.id}
          panel={panel}
          isOpen={openId === panel.id}   // derived per panel ✅
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
// Now only one panel is open at a time — coordination is possible ✅
```

```tsx
// ── The three steps of lifting state ─────────────────────────────────────
// 1. Remove state from children
// 2. Add state to common parent
// 3. Pass value + callback as props to children

// Rule: find the lowest common ancestor of all components that read/write the state
// That's where the state lives
```

---

## W — Why It Matters

- Lifting state up is the answer to "how do I make two components talk to each other?" in React — you don't make components talk, you give them a shared ancestor that coordinates them.
- The accordion example is a classic interview/take-home problem — "only one panel open at a time" is unsolvable with local state but trivial with lifted state.
- The cost of lifting: the parent re-renders on every state change, and all children receive new props. This is the correct trade-off — correctness first, optimization (memo) second if needed.

---

## I — Interview Q&A

### Q: What is "lifting state up" and when should you do it?

**A:** Lifting state up means moving a piece of state from a child component to the nearest common ancestor of all components that need to read or write it. You do it when two or more sibling (or cousin) components need to share or coordinate state — they can't directly access each other's state in React, but they can both receive the same value from a shared parent. The parent owns the state and passes the value and a setter callback as props. The signal to lift: you find yourself wishing a component could "see" another component's state.

---

## C — Common Pitfalls + Fix

### ❌ Lifting too high — causes unnecessary re-renders far up the tree

```tsx
// ❌ Lifting search state all the way to App level
// Every keystroke re-renders the entire application
function App() {
  const [search, setSearch] = useState('')   // ❌ too high — affects everything

  return (
    <div>
      <Navbar />          {/* re-renders on every keystroke — unnecessary */}
      <Sidebar />         {/* same */}
      <ProductSearch search={search} onSearch={setSearch} />
      <Footer />          {/* same */}
    </div>
  )
}

// ✅ Lift only as high as needed — lowest common ancestor
function ProductSection() {
  const [search, setSearch] = useState('')   // ✅ only ProductSection and children re-render

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <ProductList search={search} />
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TabbedContent` component: parent owns the active tab index, two child `Tab` components receive `isActive` and `onSelect` props.

### Solution

```tsx
interface TabProps {
  label:    string
  isActive: boolean
  onSelect: () => void
  children: React.ReactNode
}

function Tab({ label, isActive, onSelect, children }: TabProps) {
  return (
    <div>
      <button
        onClick={onSelect}
        aria-selected={isActive}
        className={isActive ? 'tab tab--active' : 'tab'}
      >
        {label}
      </button>
      {isActive && <div className="tab-content">{children}</div>}
    </div>
  )
}

interface TabConfig { id: string; label: string; content: React.ReactNode }

function TabbedContent({ tabs }: { tabs: TabConfig[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '')   // ← lifted state

  return (
    <div className="tabs" role="tablist">
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          label={tab.label}
          isActive={activeId === tab.id}
          onSelect={() => setActiveId(tab.id)}   // ← callback
        >
          {tab.content}
        </Tab>
      ))}
    </div>
  )
}

// Usage
<TabbedContent tabs={[
  { id: 'overview', label: 'Overview', content: <Overview /> },
  { id: 'reviews',  label: 'Reviews',  content: <Reviews />  },
  { id: 'faq',      label: 'FAQ',      content: <FAQ />      },
]} />
```

---

---
