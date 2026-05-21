# 9 — List Rendering + Stable Keys

---

## T — TL;DR

Render arrays with `.map()` — each item needs a **unique, stable `key` prop**. React uses keys to identify which items changed between renders. Bad keys (array index for reorderable lists) cause subtle bugs. Good keys are IDs from your data.

---

## K — Key Concepts

```tsx
// ── Basic list rendering ──────────────────────────────────────────────────
interface Todo {
  id:        number
  text:      string
  completed: boolean
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>    {/* key = stable unique ID from data ✅ */}
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// ── What key does internally ───────────────────────────────────────────────
// React uses key to match old tree nodes to new tree nodes during reconciliation
//
// WITHOUT keys (or with bad keys):
// Old: [A, B, C]  →  New: [X, A, B, C] (X inserted at start)
// React sees: position 0 changed (was A, now X), 1 changed, 2 changed, 3 added
// → re-renders A, B, C even though they didn't change
// → if A, B, C have internal state (input value, scroll position) — it gets LOST
//
// WITH stable keys:
// Old: [A(key=1), B(key=2), C(key=3)]
// New: [X(key=4), A(key=1), B(key=2), C(key=3)]
// React sees: X is new (key=4), A/B/C moved — preserves their state ✅
```

```tsx
// ── Key rules ─────────────────────────────────────────────────────────────

// ✅ GOOD: stable unique ID from data
todos.map(todo => <TodoItem key={todo.id} todo={todo} />)
users.map(user => <UserRow key={user.uuid} user={user} />)
posts.map(post => <PostCard key={post.slug} post={post} />)

// ✅ GOOD: index when list is static (never reordered, never filtered)
['Home', 'About', 'Contact'].map((label, i) => (
  <NavLink key={i} label={label} />    // static navigation — index is fine
))

// ❌ BAD: index for dynamic lists (reordering, filtering, inserting)
todos.map((todo, index) => (
  <TodoItem key={index} todo={todo} />  // ❌ index changes on reorder → state bugs
))

// ❌ BAD: random key on every render
todos.map(todo => (
  <TodoItem key={Math.random()} todo={todo} />  // ❌ new key every render → unmounts+remounts
))

// ❌ BAD: non-unique key
todos.map(todo => (
  <TodoItem key={todo.text} todo={todo} />  // ❌ two "Buy milk" todos = same key
))
```

```tsx
// ── Keys on Fragments for grouped outputs ────────────────────────────────
interface DefinitionItem {
  id:         number
  term:       string
  definition: string
}

function DefinitionList({ items }: { items: DefinitionItem[] }) {
  return (
    <dl>
      {items.map(item => (
        // Fragment with key — needed when map produces multiple sibling elements
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </Fragment>
      ))}
    </dl>
  )
  // Note: <> shorthand doesn't accept key — must use <Fragment key={...}>
}
```

---

## W — Why It Matters

- Wrong keys are silent bugs — React won't warn you when a component gets the wrong state because its key was reused. The bug manifests as: typing in a form field and the value jumps to a different row, or a component flashing/resetting unexpectedly.
- Key is the mechanism for forcing a component to **remount** — changing a key intentionally resets a component's state. `<Form key={userId} />` — when `userId` changes, React unmounts the old form and mounts a fresh one. This is a useful pattern, not just a gotcha.
- The Fragment-with-key pattern is required when `.map()` returns multiple sibling elements — `<dt>` and `<dd>` for a definition list, or two `<tr>` for a grouped table. `<>` doesn't accept `key`, but `<Fragment key={...}>` does.

---

## I — Interview Q&A

### Q: Why does React need `key` props for list items, and what makes a good key?

**A:** React uses keys to identify which items in a list correspond to which items in the previous render — this is how it decides whether to update, move, or create a DOM node. Without keys, React assumes items at the same position are the same item, causing incorrect state preservation when items are added, removed, or reordered. A good key is: (1) **unique among siblings** — not globally unique, but unique within the list, (2) **stable** — the same item always gets the same key across renders, (3) **from your data** — database IDs, slugs, UUIDs. Array index is acceptable only when the list is purely static (no reordering, filtering, or inserting). A random key (`Math.random()`) is always wrong — it causes every item to remount on every render.

---

## C — Common Pitfalls + Fix

### ❌ Array index key for a reorderable/filterable list

```tsx
interface Task {
  id:   number
  text: string
  done: boolean
}

// ❌ Index key — bugs when filtering or reordering
function BadTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {tasks.map((task, index) => (
        <li key={index}>     {/* ❌ index changes when tasks are filtered */}
          <input type="checkbox" defaultChecked={task.done} />
          {task.text}
        </li>
      ))}
    </ul>
  )
}
// Bug: filter out task 0, index 0 now points to old task 1
// React thinks task 1 is the same as old task 0 — wrong checkbox state

// ✅ Stable ID from data
function GoodTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>   {/* ✅ ID never changes, always points to same task */}
          <input type="checkbox" defaultChecked={task.done} />
          {task.text}
        </li>
      ))}
    </ul>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TagList` component that renders removable tags. Each tag has an `id` and `label`. Show add/remove operations and demonstrate why tag IDs (not indices) are the correct key.

### Solution

```tsx
interface Tag {
  id:    string   // e.g. UUID or slug
  label: string
}

interface TagProps {
  tag:      Tag
  onRemove: (id: string) => void
}

function TagItem({ tag, onRemove }: TagProps) {
  return (
    <span className="tag">
      {tag.label}
      <button
        onClick={() => onRemove(tag.id)}
        aria-label={`Remove ${tag.label} tag`}
        className="tag-remove"
      >
        ✕
      </button>
    </span>
  )
}

interface TagListProps {
  tags:     Tag[]
  onRemove: (id: string) => void
  onAdd?:   (label: string) => void
}

function TagList({ tags, onRemove, onAdd }: TagListProps) {
  return (
    <div className="tag-list">
      {tags.length === 0 && (
        <span className="tag-list-empty">No tags added yet.</span>
      )}

      {tags.map(tag => (
        // ✅ key=tag.id — stable even when tags are removed from the middle
        // If we used index and removed tag at index 0:
        //   remaining tags shift indices → React maps wrong state to wrong tag
        <TagItem
          key={tag.id}
          tag={tag}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

// Parent usage example (state management is Day 2):
// const [tags, setTags] = useState<Tag[]>([
//   { id: 'typescript', label: 'TypeScript' },
//   { id: 'react',      label: 'React'      },
//   { id: 'nodejs',     label: 'Node.js'    },
// ])
// const handleRemove = (id: string) =>
//   setTags(prev => prev.filter(t => t.id !== id))
//
// <TagList tags={tags} onRemove={handleRemove} />
```

---

## ✅ Day 1 Complete — React Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Thinking in React + UI as a Tree | ☐ |
| 2 | Breaking UI into Components | ☐ |
| 3 | Component Purity | ☐ |
| 4 | JSX Rules | ☐ |
| 5 | Embedding JavaScript in JSX | ☐ |
| 6 | Props | ☐ |
| 7 | Rendering Data | ☐ |
| 8 | Conditional Rendering | ☐ |
| 9 | List Rendering + Stable Keys | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
UI AS A TREE
  React models UI as a tree of components
  State change → React re-renders that component + children
  Render → Reconcile → Commit (render phase is pure, commit touches DOM)
  Components are just functions: Props in → JSX out

COMPONENT DESIGN
  One responsibility per component — if you need "and", split it
  Name reflects what it IS: ProductCard, NotificationIcon, DismissButton
  Extract when: repeated, complex enough to name, will need own state
  Composition: <Card><Content /></Card> — children prop is the primary API

PURITY
  Same props → same JSX — always (deterministic)
  No mutations of props, no external variable mutation, no API calls in render
  Strict Mode double-invokes to surface purity bugs in development
  Pure = safely memoizable | Impure = unpredictable with concurrent rendering

JSX RULES
  Return one root element (Fragment <> is free of DOM cost)
  Close all tags: <input /> <br /> <img />
  class → className | for → htmlFor | tabindex → tabIndex
  Non-string values in {}: number, boolean, object, function
  style is an object: style={{ color: 'red', fontSize: 16 }}
  Multiline JSX: wrap in parentheses

EXPRESSIONS IN JSX
  {} = escape hatch into JS | must be an EXPRESSION (produces a value)
  Allowed: variables, ternary, &&, function calls, template literals, .map()
  Not allowed: if/for/while statements → convert to ternary/.map()
  JSX is itself an expression → store in variable, pass as prop
  Gotcha: {count && <X>} renders "0" when count=0 → use {count > 0 && <X>}

PROPS
  Function arguments for components — always read-only, never mutate
  Define with TypeScript interface | optional props with ? | defaults in destructure
  Pass any value: string, number, boolean, object, array, function, JSX
  children = content between tags → React.ReactNode type
  Spread {...props} for HTML attribute passthrough

RENDERING DATA
  Primitives (string, number): render as-is
  Boolean: invisible — use ternary for display text
  Date: must format with .toLocaleDateString() or Intl.DateTimeFormat
  Object: cannot render — extract properties or JSON.stringify
  Arrays: render with .map() — each item needs a key prop

CONDITIONAL RENDERING
  Ternary: {a ? <X /> : <Y />}         → if/else, both branches render
  &&:      {cond > 0 && <X />}         → render or nothing (use > 0, not bare value)
  Early return: if (!data) return null  → guard clauses before happy path
  Object lookup: STYLES[variant]        → cleaner than 3+ nested ternaries

LIST RENDERING + KEYS
  Always use .map() — never push to an array in render
  key must be: unique among siblings + stable (same item = same key always)
  Good key: database ID, UUID, slug — from your data
  Bad key: Math.random() (remounts every render) | index (wrong for dynamic lists)
  Index is OK only for static lists that never reorder/filter
  Fragment with key: <Fragment key={id}> when map produces multiple siblings
  Changing key intentionally resets component state (useful pattern)
```

> **Your next action:** Open any React project (or create one with `npm create vite@latest`) and find the biggest component. Can you name three things it's responsible for? If yes — pick the most independent one and extract it into its own component with typed props right now. Ten minutes of real extraction beats rereading this page.

> "Doing one small thing beats opening a feed."
