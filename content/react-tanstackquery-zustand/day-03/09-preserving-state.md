# 9 — Preserving State

---

## T — TL;DR

React **preserves** a component's state as long as it renders at the **same position in the tree** with the **same type**. Conditional rendering at the same position with the same type preserves state. Understanding preservation prevents bugs where state persists when it shouldn't.

---

## K — Key Concepts

```tsx
// ── Same position + same type = preserved state ───────────────────────────
function App() {
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div>
      {isPaused
        ? <Counter />     // same position, same type
        : <Counter />     // → state PRESERVED when isPaused changes ✅
      }
    </div>
  )
}
// Toggling isPaused doesn't reset the Counter's count
// React sees: position 0 = Counter before, Counter after → same → keep state
```

```tsx
// ── Different type at same position = state destroyed ──────────────────────
function App() {
  const [isFancy, setIsFancy] = useState(false)

  return (
    <div>
      {isFancy
        ? <FancyCounter />   // different type
        : <Counter />        // → state DESTROYED when switching ✅
      }
    </div>
  )
}
// Counter → FancyCounter: different component types → unmount + remount → fresh state
```

```tsx
// ── Why this matters: the hidden state preservation bug ──────────────────
interface Props { name: string; score: number }

function PlayerCard({ name, score }: Props) {
  const [isHighlighted, setIsHighlighted] = useState(false)

  return (
    <div>
      <p>{name}: {score}</p>
      <button onClick={() => setIsHighlighted(h => !h)}>
        {isHighlighted ? '★' : '☆'}
      </button>
    </div>
  )
}

function Scoreboard() {
  const [showSecond, setShowSecond] = useState(false)

  return (
    <div>
      {/* Both render PlayerCard at position 0 — state persists between players! */}
      {showSecond
        ? <PlayerCard name="Bob"   score={42} />
        : <PlayerCard name="Alice" score={37} />
      }
    </div>
  )
}
// Bug: if Alice's card is highlighted, switching to Bob shows Bob's card highlighted ❌
// Fix: use key prop (subtopic 10) or render both and hide one
```

```tsx
// ── Intentionally preserving state with display:none ─────────────────────
// Sometimes you WANT to preserve state while hiding
function TabbedForm() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} hidden={activeTab !== i}>  {/* hidden keeps component mounted */}
          <StepForm step={i} />   {/* state preserved when hidden ✅ */}
        </div>
      ))}
    </>
  )
}
// hidden attribute: component stays in DOM → state preserved
// vs conditional rendering: component unmounts → state lost
```

---

## W — Why It Matters

- The "same type at same position preserves state" rule explains bugs like: switching between two user profiles with the same component but different IDs — the input state from user A appears on user B.
- `hidden` attribute vs conditional rendering is a real architectural choice — forms especially benefit from `hidden` (user doesn't lose typed data when switching tabs), while lists benefit from conditional rendering (don't mount off-screen items).
- Understanding preservation is the prerequisite for understanding why key-based reset (subtopic 10) works — changing the key changes identity, forcing remount.

---

## I — Interview Q&A

### Q: When does React preserve a component's state vs reset it?

**A:** React preserves state when a component renders at the **same position in the component tree** with the **same type** across renders. The position is determined by the structure of the JSX tree — not the variable names or conditions in your code. If `{condition ? <A /> : <A />}` renders at the same position, state is preserved between condition changes. State is reset when: the component is removed from the tree (unmounted), a different component type renders at that position, or the `key` prop changes. The practical consequence: if the same component type renders at the same position but with different data (like different user IDs), you must use a `key` prop to force fresh state.

---

## C — Common Pitfalls + Fix

### ❌ Nesting component definitions inside render — forces remount every render

```tsx
// ❌ Component defined inside another component — new type on every render
function ParentBad() {
  const [count, setCount] = useState(0)

  // This creates a NEW function reference (new "type") on every render
  function InnerInput() {
    const [text, setText] = useState('')
    return <input value={text} onChange={e => setText(e.target.value)} />
  }

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <InnerInput />  {/* Unmounts and remounts on every render → state lost ❌ */}
    </div>
  )
}

// ✅ Define components at the module level — stable type reference
function InnerInput() {
  const [text, setText] = useState('')
  return <input value={text} onChange={e => setText(e.target.value)} />
}

function ParentGood() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <InnerInput />   {/* same type across renders — state preserved ✅ */}
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Show the preservation bug with a `CommentInput` component that renders for two different users, then add the `hidden` pattern to preserve state while switching views.

### Solution

```tsx
function CommentInput({ authorName }: { authorName: string }) {
  const [text, setText] = useState('')
  return (
    <div>
      <p>Comment as {authorName}:</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write a comment…"
      />
      <p>{text.length} chars</p>
    </div>
  )
}

// ── Version 1: Bug — state preserved across user switch ───────────────────
function BuggyCommentSection() {
  const [showBob, setShowBob] = useState(false)
  return (
    <div>
      <button onClick={() => setShowBob(b => !b)}>
        Switch to {showBob ? 'Alice' : 'Bob'}
      </button>
      {/* Same position, same type → text persists when switching ❌ */}
      {showBob
        ? <CommentInput authorName="Bob"   />
        : <CommentInput authorName="Alice" />
      }
    </div>
  )
}

// ── Version 2: Preserve state for BOTH using hidden ───────────────────────
function PreservingCommentSection() {
  const [activeUser, setActiveUser] = useState<'Alice' | 'Bob'>('Alice')
  const users = ['Alice', 'Bob'] as const

  return (
    <div>
      <div>
        {users.map(u => (
          <button key={u} onClick={() => setActiveUser(u)}
            style={{ fontWeight: u === activeUser ? 'bold' : 'normal' }}>
            {u}
          </button>
        ))}
      </div>
      {/* hidden keeps components mounted → state preserved for both users ✅ */}
      {users.map(u => (
        <div key={u} hidden={activeUser !== u}>
          <CommentInput authorName={u} />
        </div>
      ))}
    </div>
  )
}
```

---

---
