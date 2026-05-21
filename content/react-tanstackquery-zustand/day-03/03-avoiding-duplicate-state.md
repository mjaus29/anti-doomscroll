# 3 — Avoiding Duplicate State

---

## T — TL;DR

**Duplicate state** is storing the same data in two places. The classic case: storing a full selected item object when you only need to store the selected item's **ID**. The full item is already in your items array — look it up. Two copies diverge and show inconsistent data.

---

## K — Key Concepts

```tsx
interface Message { id: number; text: string; sender: string; read: boolean }

// ❌ Duplicate: selectedMessage is a copy of data already in messages
function Inbox() {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)  // ❌ duplicate

  function handleUpdate(id: number, text: string) {
    // Must update in TWO places — easily forgotten
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m))
    setSelectedMessage(prev => prev?.id === id ? { ...prev, text } : prev)  // ❌ easy to miss
  }
  // If you update messages but forget selectedMessage → they disagree
}

// ✅ Store only the ID — look up the full object when needed
function InboxFixed() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)   // ✅ just the ID

  const selectedMessage = messages.find(m => m.id === selectedId) ?? null  // derived ✅

  function handleUpdate(id: number, text: string) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m))
    // selectedMessage updates automatically — no second update needed ✅
  }
}
```

```tsx
// ── Other duplication patterns ────────────────────────────────────────────

// ❌ Duplicate: tags state and selectedTags contain same Tag objects
interface Tag { id: string; label: string; color: string }
const [allTags,      setAllTags]      = useState<Tag[]>([])
const [selectedTags, setSelectedTags] = useState<Tag[]>([])  // ❌ copies of allTags items

// ✅ Store selected IDs — look up full objects
const [allTags,         setAllTags]         = useState<Tag[]>([])
const [selectedTagIds,  setSelectedTagIds]  = useState<Set<string>>(new Set())  // ✅

const selectedTags = allTags.filter(tag => selectedTagIds.has(tag.id))  // derived ✅

// ❌ Duplicate: form has its own copy of the user being edited
const [user, setUser] = useState<User | null>(null)  // fetched from server
const [form, setForm] = useState<User | null>(null)  // ❌ copy of user for editing

// ✅ Store only the edited fields
const [user,   setUser]   = useState<User | null>(null)
const [edits,  setEdits]  = useState<Partial<User>>({})   // ✅ only the diffs
const preview = user ? { ...user, ...edits } : null       // derived ✅
```

---

## W — Why It Matters

- Duplicate state requires **synchronisation on every mutation** — a two-step update where missing one step is always possible under deadline pressure. The resulting bug (list updated, selected item shows old data) is subtle and hard to trace.
- ID-only selection state is a standard React pattern — it forces you to treat the items array as a single source of truth. The lookup is O(n) but correct; the duplicate approach is O(1) but buggy.
- The pattern appears everywhere in real apps: selected row in a table, active item in a list, editing a record — recognizing it and immediately thinking "store the ID" is a mark of React experience.

---

## I — Interview Q&A

### Q: You have a list of items and want to track which one is selected. Should you store the selected item or its ID? Why?

**A:** Store the **ID**. The item already exists in your items array — storing a copy creates two sources of truth. When the item's data changes (via an update), you must update both the items array and the selectedItem state simultaneously. Miss one and they diverge. Storing just the ID and deriving the selected item with `items.find(i => i.id === selectedId)` means there's only one copy of the data. When the items array is updated, the derived `selectedItem` automatically reflects the latest data. It's also simpler: a `number | null` is easier to initialise, clear, and compare than a `Item | null`.

---

## C — Common Pitfalls + Fix

### ❌ Keeping a `Set` of full objects instead of IDs for multi-select

```tsx
// ❌ Set of objects — object equality is reference-based, full duplicates
const [selected, setSelected] = useState<Set<Product>>(new Set())

function handleSelect(product: Product) {
  setSelected(prev => {
    const next = new Set(prev)
    // Has(product) fails if product is a different reference — even same ID ❌
    if (next.has(product)) next.delete(product)
    else next.add(product)
    return next
  })
}

// ✅ Set of IDs — stable, no reference issues
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

function handleSelectFixed(productId: number) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    return next
  })
}

// Derive selected products when needed
const selectedProducts = products.filter(p => selectedIds.has(p.id))
```

---

## K — Coding Challenge + Solution

### Challenge

Convert this component from storing a duplicate selected user object to storing only the selected user ID. Wire up edit functionality with a separate `edits` partial state.

### Solution

```tsx
interface User { id: number; name: string; email: string; role: string }

// ❌ Before
function UserManagerBad() {
  const [users,        setUsers]        = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)  // ❌ duplicate

  function updateUser(id: number, changes: Partial<User>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u))
    setSelectedUser(prev => prev?.id === id ? { ...prev, ...changes } : prev)  // ❌ easy to miss
  }
}

// ✅ After
function UserManagerGood() {
  const [users,      setUsers]      = useState<User[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [edits,      setEdits]      = useState<Partial<User>>({})

  const selectedUser = users.find(u => u.id === selectedId) ?? null   // derived ✅
  const previewUser  = selectedUser ? { ...selectedUser, ...edits } : null  // derived ✅

  function handleSelect(id: number) {
    setSelectedId(id)
    setEdits({})   // clear edits when switching selection
  }

  function handleFieldChange(field: keyof User, value: string) {
    setEdits(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!selectedId) return
    setUsers(prev => prev.map(u => u.id === selectedId ? { ...u, ...edits } : u))
    setEdits({})
    // selectedUser now reflects the updated data automatically ✅
  }

  return (
    <div>
      <ul>
        {users.map(u => (
          <li key={u.id} onClick={() => handleSelect(u.id)}
            style={{ fontWeight: u.id === selectedId ? 'bold' : 'normal' }}>
            {u.name}
          </li>
        ))}
      </ul>
      {previewUser && (
        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
          <input value={previewUser.name}  onChange={e => handleFieldChange('name',  e.target.value)} />
          <input value={previewUser.email} onChange={e => handleFieldChange('email', e.target.value)} />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEdits({})}>Cancel</button>
        </form>
      )}
    </div>
  )
}
```

---

---
