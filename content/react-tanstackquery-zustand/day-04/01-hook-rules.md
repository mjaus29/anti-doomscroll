# 1 — Hook Rules

---

## T — TL;DR

There are two rules for hooks: **only call hooks at the top level** (never inside loops, conditions, or nested functions), and **only call hooks from React function components or custom hooks**. These rules exist because React identifies hooks by their call order — breaking the order corrupts state.

---

## K — Key Concepts

```tsx
// ── Rule 1: Only call hooks at the top level ──────────────────────────────
// ❌ Hook inside a condition — call order changes based on condition
function BrokenComponent({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    const [name, setName] = useState('') // ❌ only called sometimes
  }
  const [email, setEmail] = useState('')  // React now thinks THIS is hook #1
}

// ❌ Hook inside a loop
function BrokenList({ items }: { items: string[] }) {
  return items.map((item, i) => {
    const [checked, setChecked] = useState(false) // ❌ number of hooks varies
    return <li key={i}>{item}</li>
  })
}

// ❌ Hook inside a nested function
function BrokenForm() {
  function handleSubmit() {
    const [error, setError] = useState('') // ❌ inside a nested function
  }
}

// ✅ All hooks at top level, unconditionally
function CorrectComponent({ isAdmin }: { isAdmin: boolean }) {
  const [name,  setName]  = useState('')   // always hook #1
  const [email, setEmail] = useState('')   // always hook #2

  // Condition is inside the JSX or logic — not wrapping the hook call
  if (!isAdmin) return null
  return <form>...</form>
}
```

```tsx
// ── Rule 2: Only call hooks from React functions ───────────────────────────
// ❌ Hook in a plain utility function
function formatUser(id: number) {
  const [user, setUser] = useState(null)  // ❌ plain function, not a component
  return user
}

// ❌ Hook in a class component
class MyClass extends React.Component {
  render() {
    const [x] = useState(0)  // ❌ hooks don't work in class components
    return null
  }
}

// ✅ Hook in a function component
function UserProfile({ id }: { id: number }) {
  const [user, setUser] = useState(null)  // ✅
  return <div>{user?.name}</div>
}

// ✅ Hook in a custom hook (function starting with 'use')
function useUser(id: number) {
  const [user, setUser] = useState(null)  // ✅ custom hook
  return user
}
```

```
── Why the rules exist ────────────────────────────────────────────────────────

React tracks hooks by CALL ORDER, not by name.
Each component render: hook call 1 → useState slot 1
                       hook call 2 → useState slot 2
                       hook call 3 → useEffect slot 1

If a hook call is skipped (condition) or added (loop):
  render 1: hook1=slot1, hook2=slot2, hook3=slot3
  render 2: hook1 skipped → hook2 gets slot1 (wrong data!) ❌

ESLint plugin: eslint-plugin-react-hooks enforces both rules automatically
Install: npm install --save-dev eslint-plugin-react-hooks
```

---

## W — Why It Matters

- The rules aren't arbitrary restrictions — they're a consequence of React's implementation. Hook call order is the only way React maps each hook call to its stored state. Violating order corrupts state silently.
- `eslint-plugin-react-hooks` catches violations at development time — it's non-optional in any professional React project. Not installing it means relying on runtime errors.
- Custom hooks (any function starting with `use`) follow the same rules and get the same ESLint enforcement — this is why the naming convention is mandatory, not stylistic.

---

## I — Interview Q&A

### Q: Why can't you call a hook inside an `if` statement?

**A:** React identifies each hook call by its **call order** within a component — not by name or variable. On every render, the first `useState` call maps to slot 1, the second to slot 2, and so on. If a hook is inside an `if` statement, it may or may not be called depending on the condition. When it's skipped, all subsequent hook calls shift positions — React reads the wrong state for every hook that follows. This produces bugs that are extremely hard to trace. The rule is enforced by `eslint-plugin-react-hooks` at development time. To conditionally use a value, call the hook unconditionally and then apply the condition to its output.

---

## C — Common Pitfalls + Fix

### ❌ Early return before all hooks are called

```tsx
// ❌ Early return before hooks — hooks after the return are skipped
function UserCard({ user }: { user: User | null }) {
  if (!user) return null    // ❌ early return BEFORE hooks below

  const [expanded, setExpanded] = useState(false)   // sometimes skipped
  useEffect(() => { document.title = user.name }, [user.name])  // sometimes skipped
}

// ✅ Call all hooks first, then handle the condition
function UserCardFixed({ user }: { user: User | null }) {
  const [expanded, setExpanded] = useState(false)   // always called ✅
  useEffect(() => {
    if (!user) return
    document.title = user.name
  }, [user?.name])

  if (!user) return null   // early return AFTER hooks ✅
  return <div>{user.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Find all hook rule violations in this component and fix them without changing the intended behaviour.

```tsx
function Dashboard({ userId, showStats }: { userId: number; showStats: boolean }) {
  if (!userId) return <p>No user</p>
  const [name, setName] = useState('')
  for (let i = 0; i < 3; i++) {
    useEffect(() => { console.log(i) }, [])
  }
  if (showStats) {
    const [stats, setStats] = useState<number[]>([])
  }
  return <div>{name}</div>
}
```

### Solution

```tsx
function Dashboard({ userId, showStats }: { userId: number; showStats: boolean }) {
  // ✅ All hooks moved to top level — no conditions, no loops
  const [name,  setName]  = useState('')
  const [stats, setStats] = useState<number[]>([])

  // ✅ Three separate effects instead of looped hooks
  useEffect(() => { console.log(0) }, [])
  useEffect(() => { console.log(1) }, [])
  useEffect(() => { console.log(2) }, [])

  // ✅ Guard clause AFTER all hooks
  if (!userId) return <p>No user</p>

  return (
    <div>
      {name}
      {showStats && <ul>{stats.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    </div>
  )
}
```

---

---
