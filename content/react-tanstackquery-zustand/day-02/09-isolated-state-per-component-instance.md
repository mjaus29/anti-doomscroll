# 9 — Isolated State Per Component Instance

---

## T — TL;DR

Each **instance** of a component gets its own isolated state. Rendering `<Counter />` twice creates two independent counters. State is tied to the **component's position in the tree** — not to the component function itself. Moving a component in the tree resets its state.

---

## K — Key Concepts

```tsx
// ── Each instance is independent ──────────────────────────────────────────
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}

function App() {
  return (
    <div>
      <Counter />   {/* instance A — own state: count=0 */}
      <Counter />   {/* instance B — own state: count=0 */}
      <Counter />   {/* instance C — own state: count=0 */}
    </div>
  )
}
// Clicking +1 on instance A doesn't affect B or C ✅
// Three separate state "slots" in React's tree
```

```tsx
// ── State is tied to position, not to the component ──────────────────────
function App() {
  const [showFirst, setShowFirst] = useState(true)

  return (
    <div>
      {showFirst ? <Counter /> : <Counter />}
      {/* Both branches render <Counter /> at the SAME tree position */}
      {/* React sees: same position, same component type → SAME state preserved */}
      {/* Even though it's "different" in the code */}

      <button onClick={() => setShowFirst(s => !s)}>Toggle</button>
    </div>
  )
}

// To RESET state: change the key
function AppWithReset() {
  const [showFirst, setShowFirst] = useState(true)
  return (
    <div>
      {showFirst
        ? <Counter key="first"  />
        : <Counter key="second" />
      }
      {/* Different keys → different identity → state resets on toggle ✅ */}
    </div>
  )
}
```

```tsx
// ── Resetting state intentionally with key ────────────────────────────────
// Changing key forces remount — all state is reset
// Common use cases:

// 1. Reset a form when switching between records
function UserEditor({ userId }: { userId: number }) {
  return (
    <EditForm key={userId} userId={userId} />
    // When userId changes, key changes → form unmounts+remounts → fresh state ✅
    // No need for a manual "reset" inside EditForm
  )
}

// 2. Reset a search input when navigating to a new category
function CategoryPage({ categoryId }: { categoryId: string }) {
  return (
    <SearchBar key={categoryId} />  // fresh search on every category ✅
  )
}
```

```tsx
// ── What "same position" means ────────────────────────────────────────────
function ConditionalDemo() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <div>
      {isLoggedIn
        ? <UserPanel />        // position 0: UserPanel
        : <GuestBanner />      // position 0: GuestBanner
      }
      {/* Different component types at same position → React DOES reset state */}
      {/* UserPanel and GuestBanner are different types → different identity */}
    </div>
  )
}
// If both branches render the SAME component type, state is preserved
// If they render DIFFERENT types, state is destroyed and re-created
```

---

## W — Why It Matters

- "State belongs to the position in the tree, not the component" explains the key reset pattern — the most elegant way to reset a form when switching users or records without writing cleanup logic.
- Isolated state per instance is what makes component reuse clean — you don't need to manually manage which counter or which input is "active." React handles isolation automatically.
- The "same position = same state" rule explains the bug where two different components rendered at the same position unexpectedly share state transitions — understanding this prevents a whole class of conditional rendering bugs.

---

## I — Interview Q&A

### Q: How does React determine whether to preserve or reset a component's state?

**A:** React preserves state for a component as long as it renders **the same component type at the same position in the tree**. If a component is unmounted (removed from the tree) or replaced by a different component type at the same position, its state is destroyed. If the same component type re-renders at the same position, state is preserved — even if the surrounding conditions changed. You can force React to treat an instance as a new component (and reset its state) by changing its `key` prop — a new key causes unmount + remount. This is the idiomatic way to reset a form component when the user switches records.

---

## C — Common Pitfalls + Fix

### ❌ Expecting state to reset when props change

```tsx
// ❌ Assumes state resets when userId prop changes
function UserProfile({ userId }: { userId: number }) {
  const [notes, setNotes] = useState('')   // ❌ persists across userId changes
  // Same component, same position → state preserved even when userId changes

  return (
    <textarea
      value={notes}
      onChange={e => setNotes(e.target.value)}
      placeholder={`Notes for user ${userId}`}
    />
  )
}
// Bug: notes from user 1 still show when you switch to user 2

// ✅ Fix 1: key prop — forces remount on userId change
function ParentFixed({ userId }: { userId: number }) {
  return <UserProfile key={userId} userId={userId} />
}

// ✅ Fix 2: useEffect to reset state when prop changes (less clean)
function UserProfileEffect({ userId }: { userId: number }) {
  const [notes, setNotes] = useState('')
  useEffect(() => {
    setNotes('')   // reset when userId changes
  }, [userId])
  return <textarea value={notes} onChange={e => setNotes(e.target.value)} />
}
// Prefer Fix 1 (key) — it's declarative and has no timing issues
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TabPanel` where each tab has its own independent counter. Show that switching tabs preserves each tab's counter state. Then add a "Reset All" button that resets all counters using the key pattern.

### Solution

```tsx
const TABS = ['Alpha', 'Beta', 'Gamma'] as const
type TabName = typeof TABS[number]

// Independent counter with its own state
function TabContent({ label }: { label: string }) {
  const [count, setCount] = useState(0)
  return (
    <div className="tab-content">
      <p>{label} counter: <strong>{count}</strong></p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset this tab</button>
    </div>
  )
}

function TabPanel() {
  const [activeTab, setActiveTab] = useState<TabName>('Alpha')
  const [resetKey,  setResetKey]  = useState(0)

  function handleResetAll() {
    setResetKey(k => k + 1)   // changing key on ALL TabContent forces remount ✅
  }

  return (
    <div>
      <div className="tab-bar" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab active' : 'tab'}
          >
            {tab}
          </button>
        ))}
        <button onClick={handleResetAll} className="btn-reset-all">
          Reset all tabs
        </button>
      </div>

      <div role="tabpanel">
        {TABS.map(tab => (
          // Render all tabs but only show the active one
          // key={`${tab}-${resetKey}`} resets state when resetKey changes
          <div key={`${tab}-${resetKey}`} hidden={activeTab !== tab}>
            <TabContent label={tab} />
          </div>
        ))}
      </div>
    </div>
  )
}
// Each TabContent has isolated state — switching tabs preserves their counts
// Changing resetKey forces all TabContent instances to remount → counters reset
```

---

## ✅ Day 2 Complete — React Interactivity

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Event Handling | ☐ |
| 2 | Passing Handlers | ☐ |
| 3 | useState | ☐ |
| 4 | State as a Snapshot | ☐ |
| 5 | Re-render Cycle | ☐ |
| 6 | Batching Mindset | ☐ |
| 7 | Controlled Inputs | ☐ |
| 8 | Updating Objects and Arrays Immutably | ☐ |
| 9 | Isolated State Per Component Instance | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
EVENT HANDLING
  onClick={fn}  not  onClick={fn()}  — reference, not call
  () => fn(arg) — inline arrow when you need to pass args
  e.preventDefault()  → stop browser default (form submit, link)
  e.stopPropagation() → stop bubbling to parent
  Type: React.ChangeEvent<HTMLInputElement>, React.MouseEvent<HTMLButtonElement>

PASSING HANDLERS
  Props named 'on': onDelete, onChange, onSelect (the signal)
  Implementation named 'handle': handleDelete, handleChange (the response)
  Child fires → parent handles → state updates → child re-renders with new data
  Lifting state up: move state to nearest common ancestor of components that need it
  Pass state setter directly as handler: onChange={setValue} ✅

useState
  const [value, setValue] = useState(initialValue)
  setter SCHEDULES a re-render — does not mutate value in place
  TypeScript: useState<T | null>(null) for nullable state
  Functional updater: setValue(prev => prev + 1) — safe for multiple calls
  Multiple setters → choose: grouped object (always change together) or separate vars
  Never mutate state directly — always use the setter

STATE AS A SNAPSHOT
  Each render captures state as frozen constants for that render
  Calling setter doesn't change current render's value — schedules next render
  Stale closure: setTimeout/async closures capture snapshot values, not live values
  Fix stale closure: use functional updater OR use ref (Day 3)
  Local variable trick: const next = val + 1; setter(next); use(next) for same-render access

RE-RENDER CYCLE
  Triggers: state change | parent re-render | context change
  Process: call component fn → reconcile (diff) → commit (minimal DOM update)
  Re-render ≠ DOM repaint — React only touches what changed
  Same primitive value: Object.is → React bails out, no re-render
  Same object reference (mutated): React bails out → stale UI bug

BATCHING
  Multiple setters in one event → ONE re-render (not one per setter)
  React 18: batching everywhere — including setTimeout, fetch, Promises
  flushSync: force synchronous DOM update (rare — only for DOM measurement)
  Group related state that always changes together → single setState call

CONTROLLED INPUTS
  value={state} + onChange → React owns the value
  Checkbox: checked={bool} + onChange={e => setState(e.target.checked)}
  Select: value={str} + onChange={e => setState(e.target.value)}
  value without onChange = read-only (React warns you)
  defaultValue = uncontrolled with initial value
  Generic handler: e.target.name as object key → one handler for many inputs

IMMUTABLE UPDATES
  Objects:  setUser(prev => ({ ...prev, field: newVal }))
  Nested:   spread at every level you modify
  Add:      setArr(prev => [...prev, newItem])
  Remove:   setArr(prev => prev.filter(item => item.id !== id))
  Update:   setArr(prev => prev.map(item => item.id === id ? {...item, field: val} : item))
  Never: push, pop, splice, sort (in place) — always copy first

ISOLATED STATE PER INSTANCE
  State belongs to the POSITION in the tree, not the component function
  Same component type, same position → state preserved across re-renders
  Different component type at same position → state destroyed and recreated
  Change key → force remount → state reset (idiomatic "reset on prop change")
  Use case: <Form key={userId} /> resets form when userId changes
```

> **Your next action:** Open a React project and find a form or button. Add one `useState` variable, wire `value` + `onChange` on an input, and console.log the value on submit. Five minutes of real controlled input beats rereading this page.

> "Doing one small thing beats opening a feed."
