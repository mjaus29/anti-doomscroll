# 10 — Resetting State with Key

---

## T — TL;DR

Changing a component's **`key` prop** forces React to unmount the old instance and mount a new one — resetting all state to initial values. This is the intentional, declarative way to reset a component when its context changes (new record, new user, new route).

---

## K — Key Concepts

```tsx
// ── key forces remount = state reset ─────────────────────────────────────
// ❌ Without key — state persists when userId changes
function ProfileEditor({ userId }: { userId: number }) {
  const [bio, setBio] = useState('')
  // bio from userId=1 persists when userId changes to 2 ❌
  return <textarea value={bio} onChange={e => setBio(e.target.value)} />
}

// ✅ With key — fresh state for every userId
function App() {
  const [userId, setUserId] = useState(1)
  return (
    <>
      <select value={userId} onChange={e => setUserId(+e.target.value)}>
        <option value={1}>User 1</option>
        <option value={2}>User 2</option>
      </select>
      <ProfileEditor key={userId} userId={userId} />
      {/* key changes → React unmounts old → mounts new → state = '' ✅ */}
    </>
  )
}
```

```tsx
// ── Common key reset patterns ─────────────────────────────────────────────

// 1. Reset form when switching records
function RecordEditor({ recordId }: { recordId: number }) {
  return <EditForm key={recordId} recordId={recordId} />
  // EditForm's state resets on every recordId change ✅
}

// 2. Reset after successful submission
function SubmittableForm() {
  const [formKey, setFormKey] = useState(0)

  async function handleSubmit(data: FormData) {
    await save(data)
    setFormKey(k => k + 1)   // increment key → form resets ✅
  }

  return <ContactForm key={formKey} onSubmit={handleSubmit} />
}

// 3. Reset a component on route change (in a simple router)
function Page({ route }: { route: string }) {
  return <PageContent key={route} route={route} />  // fresh state per page ✅
}
```

```tsx
// ── Key vs useEffect for reset — why key is better ────────────────────────
// ❌ useEffect approach — extra render, timing issues
function FormWithEffect({ userId }: { userId: number }) {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    setName('')    // extra render
    setEmail('')   // stale values visible for one render ❌
  }, [userId])
  // Two renders: initial (stale) + after effect (reset)
}

// ✅ Key approach — atomic reset, no extra render, no effects
function ParentWithKey() {
  const [userId, setUserId] = useState(1)
  return <FormWithKey key={userId} userId={userId} />
}
function FormWithKey({ userId }: { userId: number }) {
  const [name,  setName]  = useState('')   // always starts fresh ✅
  const [email, setEmail] = useState('')
}
```

---

## W — Why It Matters

- The key reset pattern replaces the common but incorrect pattern of `useEffect(() => resetState(), [prop])` — the effect approach has a render flash (stale state visible for one frame), the key approach is atomic.
- `key` as a reset mechanism is one of the most powerful and underused patterns — senior React developers reach for it immediately when they need "fresh component when context changes."
- Every CMS admin, data grid, and record editor needs this pattern — switching between records in a list must not carry over state from the previous record.

---

## I — Interview Q&A

### Q: How do you reset a component's state when a prop changes, and why is the `key` prop the best approach?

**A:** Change the `key` prop on the component. When `key` changes, React unmounts the existing component instance and mounts a brand new one — all state initialises fresh. This is better than `useEffect(() => setState(initial), [prop])` for two reasons: (1) The effect fires after the render, meaning there's at least one render with stale state visible before the effect clears it. The key approach resets before the first render of the new context. (2) You don't have to manually list every state variable to reset — adding a new `useState` automatically benefits from the key reset without any changes to the reset logic. The key approach is declarative, atomic, and maintenance-free.

---

## C — Common Pitfalls + Fix

### ❌ Using `Math.random()` as a key to force reset — uncontrolled

```tsx
// ❌ Random key every render — unmounts+remounts on EVERY render (too aggressive)
function Carousel({ items }: { items: string[] }) {
  return (
    <div>
      {items.map(item => (
        <Slide key={Math.random()} item={item} />  // ❌ new key every render → always unmounts
      ))}
    </div>
  )
}

// ❌ Random key for controlled reset — unpredictable
function Form() {
  return <InputField key={Math.random()} />  // ❌ resets on every parent render ❌
}

// ✅ Increment a counter to reset on demand
function Form() {
  const [resetKey, setResetKey] = useState(0)
  return (
    <>
      <InputField key={resetKey} />
      <button onClick={() => setResetKey(k => k + 1)}>Reset form</button>
    </>
  )
}

// ✅ Use stable ID for list items
items.map(item => <Slide key={item.id} item={item} />)   // stable ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `RecordEditor` that loads a different record from a list. The form must reset completely when switching records. Include a `hasUnsavedChanges` indicator that also resets.

### Solution

```tsx
interface Record { id: number; title: string; body: string }

const RECORDS: Record[] = [
  { id: 1, title: 'First Note',  body: 'Content of first note'  },
  { id: 2, title: 'Second Note', body: 'Content of second note' },
  { id: 3, title: 'Third Note',  body: 'Content of third note'  },
]

interface EditFormProps {
  record:    Record
  onSave:    (updated: Record) => void
}

// Form component — will be reset via key
function EditForm({ record, onSave }: EditFormProps) {
  const [title, setTitle] = useState(record.title)
  const [body,  setBody]  = useState(record.body)

  const hasUnsavedChanges = title !== record.title || body !== record.body

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ ...record, title, body })
  }

  return (
    <form onSubmit={handleSubmit}>
      {hasUnsavedChanges && (
        <p className="unsaved-badge">● Unsaved changes</p>
      )}
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="body">Body</label>
        <textarea
          id="body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
        />
      </div>
      <button type="submit" disabled={!hasUnsavedChanges}>Save</button>
    </form>
  )
}

function RecordEditor() {
  const [records,    setRecords]    = useState<Record[]>(RECORDS)
  const [selectedId, setSelectedId] = useState<number>(RECORDS[0].id)

  const selectedRecord = records.find(r => r.id === selectedId)!

  function handleSave(updated: Record) {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
      <ul>
        {records.map(r => (
          <li
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            style={{ fontWeight: r.id === selectedId ? 'bold' : 'normal', cursor: 'pointer' }}
          >
            {r.title}
          </li>
        ))}
      </ul>

      {/* key=selectedId → EditForm remounts on every record switch */}
      {/* hasUnsavedChanges resets too — no stale "unsaved" badge ✅ */}
      <EditForm
        key={selectedId}
        record={selectedRecord}
        onSave={handleSave}
      />
    </div>
  )
}
```

---

## ✅ Day 3 Complete — React State Architecture

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Choosing State Structure | ☐ |
| 2 | Avoiding Redundant State | ☐ |
| 3 | Avoiding Duplicate State | ☐ |
| 4 | Deriving Values During Render | ☐ |
| 5 | Lifting State Up | ☐ |
| 6 | Sharing State Between Components | ☐ |
| 7 | Syncing Sibling State | ☐ |
| 8 | State Colocation | ☐ |
| 9 | Preserving State | ☐ |
| 10 | Resetting State with Key | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
STATE STRUCTURE
  Group values that always change together → { x, y } not separate x, y
  Avoid contradictory booleans → union type: 'idle'|'loading'|'error'|'success'
  Flat is easier to update than nested → spread at every level you modify
  Question for every useState: "do I actually need this in state?"

REDUNDANT STATE
  Can it be computed from other state or props? → DERIVE it, don't store it
  total, fullName, filteredList, count → all computable during render
  Storing derivable values requires manual sync → sync bugs are inevitable
  useEffect to sync derived state → anti-pattern (extra render + stale flash)

DUPLICATE STATE
  Same data in two places → two sources of truth → they will disagree
  selectedItem object → store selectedId instead, find item when needed
  Set of full objects for multi-select → Set of IDs instead
  One update instead of two → physically impossible to forget the second update

DERIVING IN RENDER
  Inline derivation: always accurate, zero maintenance, no sync logic
  Every render = fresh computation from current state
  useMemo: derive inline first → profile → THEN memoize if genuinely slow
  Rule: no useEffect to derive state from state — ever

LIFTING STATE UP
  Two components need to share state → move to lowest common ancestor
  Parent owns state + callback → children receive value + onChangeHandler
  Accordion, tabs, selections → classic lift patterns
  Cost: parent re-renders on change → use memo if subtree is large/expensive

SHARING STATE
  Props down 1–2 levels: direct passing ✅
  Props through 3+ levels (intermediate components don't use them): prop drilling ❌
  Composition / slot pattern: pass pre-wired JSX as children/slot props
  Context (Day 4): broadcast to any depth — auth, theme, locale

SYNCING SIBLINGS
  Siblings cannot communicate directly — never
  Solution: lift state to common parent → pass value + callback to both
  Store one canonical form → derive the other (Celsius/Fahrenheit, USD/EUR)
  Never two states + two useEffects to keep them in sync → causes loops

STATE COLOCATION
  State should live at the LOWEST component that needs it
  Lifting too high → unnecessary re-renders in unrelated subtrees
  Local UI state (hover, open, selected) → stays in the component that shows it
  Push DOWN by default → lift UP only when sharing is required

PRESERVING STATE
  Same component type at same position → state preserved across re-renders
  Different type at same position → unmount + remount → state reset
  hidden attribute → component stays mounted → state preserved
  Bug: same component renders different data (users) at same position → use key
  Never define components inside render → new "type" every render → unmount loop

RESETTING WITH KEY
  Change key → React unmounts old instance → mounts fresh one → state reset
  key={recordId} → form resets on every record switch (atomic, no flash)
  key={formKey} + setFormKey(k => k+1) → reset on demand (submit, cancel)
  Better than useEffect reset: atomic (no stale render), zero maintenance
  Never Math.random() as key → resets on every render (too aggressive)
  Only stable, intentionally-changed values as reset keys
```

> **Your next action:** Find a form in any React project. Check: is any state computable from other state? If yes — delete it and derive it. Ten minutes of real state cleanup teaches this better than rereading this page.

> "Doing one small thing beats opening a feed."
