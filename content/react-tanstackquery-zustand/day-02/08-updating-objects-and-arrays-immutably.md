# 8 — Updating Objects and Arrays Immutably

---

## T — TL;DR

React state updates require **new references** — you must create a new object or array instead of mutating the existing one. React uses reference equality to detect changes. The patterns: spread operator for objects (`{...obj, key: newVal}`), spread + map/filter for arrays.

---

## K — Key Concepts

```tsx
// ── Object updates ────────────────────────────────────────────────────────
interface User { id: number; name: string; email: string; active: boolean }
const [user, setUser] = useState<User>({ id: 1, name: 'Mark', email: 'm@ex.com', active: true })

// ✅ Spread to create a new object with one field changed
setUser(prev => ({ ...prev, name: 'Alex' }))
setUser(prev => ({ ...prev, active: false }))

// ✅ Multiple fields at once
setUser(prev => ({ ...prev, name: 'Alex', email: 'alex@ex.com' }))

// ── Nested object updates ─────────────────────────────────────────────────
interface Profile {
  user: { name: string; age: number }
  settings: { theme: 'light' | 'dark'; notifications: boolean }
}

const [profile, setProfile] = useState<Profile>({
  user:     { name: 'Mark', age: 28 },
  settings: { theme: 'light', notifications: true },
})

// ✅ Spread at each level of nesting
function updateTheme(theme: 'light' | 'dark') {
  setProfile(prev => ({
    ...prev,
    settings: { ...prev.settings, theme },   // spread nested object too
  }))
}
```

```tsx
// ── Array updates ─────────────────────────────────────────────────────────
interface Todo { id: number; text: string; done: boolean }
const [todos, setTodos] = useState<Todo[]>([])

// ✅ ADD — spread existing + new item
function addTodo(text: string) {
  const newTodo: Todo = { id: Date.now(), text, done: false }
  setTodos(prev => [...prev, newTodo])
}

// ✅ REMOVE — filter out the item
function removeTodo(id: number) {
  setTodos(prev => prev.filter(todo => todo.id !== id))
}

// ✅ UPDATE — map and replace the matching item
function toggleTodo(id: number) {
  setTodos(prev =>
    prev.map(todo =>
      todo.id === id
        ? { ...todo, done: !todo.done }   // new object for changed item
        : todo                             // same object for unchanged items
    )
  )
}

// ✅ REORDER — create new array with different order
function moveToTop(id: number) {
  setTodos(prev => {
    const item = prev.find(t => t.id === id)
    if (!item) return prev
    return [item, ...prev.filter(t => t.id !== id)]
  })
}
```

```tsx
// ── Quick reference: immutable array operations ───────────────────────────
const arr = [1, 2, 3, 4, 5]

// Instead of: push     → [...arr, newItem]
// Instead of: unshift  → [newItem, ...arr]
// Instead of: pop      → arr.slice(0, -1)
// Instead of: shift    → arr.slice(1)
// Instead of: splice   → [...arr.slice(0, i), newItem, ...arr.slice(i)]
// Instead of: sort     → [...arr].sort()
// Instead of: reverse  → [...arr].reverse()
// Instead of: splice   → arr.filter((_, i) => i !== targetIndex)  (remove by index)
```

---

## W — Why It Matters

- React uses `Object.is` / reference equality to detect state changes — if you mutate an object and pass the same reference to `setState`, React sees the same object and may skip re-rendering. Your UI silently goes stale.
- The spread pattern (`{ ...prev, field: value }`) is the foundational immutable update — everything else (Immer, Zustand's produce) builds on this mental model. Learn spread first, then appreciate what Immer simplifies.
- `array.map` for updating one item in a list is idiomatic React — it's O(n) but the correct trade-off. For very large lists with frequent updates, a `Map<id, item>` state structure is more efficient.

---

## I — Interview Q&A

### Q: Why must you update state immutably in React?

**A:** React detects state changes using reference equality — it compares the new state value with the previous using `Object.is`. If you mutate an object and pass the same reference to `setState`, React sees the same reference and may skip re-rendering, leaving the UI stale. Additionally, React's upcoming concurrent features depend on being able to compare previous and next state — mutation makes this impossible. Creating new objects and arrays (`{ ...prev, key: val }`, `[...arr, item]`) ensures React always sees a new reference for changed state, triggering re-render reliably. It also makes debugging easier — you can compare snapshots of state over time.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to spread nested objects — sibling fields wiped

```tsx
interface Settings {
  theme:     'light' | 'dark'
  language:  string
  timezone:  string
}
interface AppConfig {
  user:     { name: string; email: string }
  settings: Settings
}

const [config, setConfig] = useState<AppConfig>({
  user:     { name: 'Mark', email: 'm@ex.com' },
  settings: { theme: 'light', language: 'en', timezone: 'Asia/Manila' },
})

// ❌ Spread only at top level — nested settings object REPLACED, not merged
function setBadTheme(theme: 'light' | 'dark') {
  setConfig(prev => ({
    ...prev,
    settings: { theme },   // ❌ language and timezone lost!
  }))
}

// ✅ Spread at every nested level you modify
function setGoodTheme(theme: 'light' | 'dark') {
  setConfig(prev => ({
    ...prev,
    settings: { ...prev.settings, theme },   // ✅ language and timezone preserved
  }))
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a full todo list: add, remove, toggle done, and edit text in place — all with immutable state updates.

### Solution

```tsx
interface Todo {
  id:   number
  text: string
  done: boolean
}

function TodoApp() {
  const [todos,   setTodos]   = useState<Todo[]>([])
  const [input,   setInput]   = useState('')
  const [editId,  setEditId]  = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // ADD
  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setTodos(prev => [...prev, { id: Date.now(), text: input.trim(), done: false }])
    setInput('')
  }

  // REMOVE
  function handleRemove(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  // TOGGLE
  function handleToggle(id: number) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
    )
  }

  // EDIT: start
  function handleEditStart(todo: Todo) {
    setEditId(todo.id)
    setEditText(todo.text)
  }

  // EDIT: save
  function handleEditSave(id: number) {
    if (!editText.trim()) return
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, text: editText.trim() } : t)
    )
    setEditId(null)
    setEditText('')
  }

  return (
    <div>
      <form onSubmit={handleAdd}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="New todo…" />
        <button type="submit" disabled={!input.trim()}>Add</button>
      </form>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={() => handleToggle(todo.id)} />
            {editId === todo.id ? (
              <>
                <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
                <button onClick={() => handleEditSave(todo.id)}>Save</button>
                <button onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                  {todo.text}
                </span>
                <button onClick={() => handleEditStart(todo)}>Edit</button>
                <button onClick={() => handleRemove(todo.id)}>✕</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p>{todos.filter(t => !t.done).length} remaining</p>
    </div>
  )
}
```

---

---
