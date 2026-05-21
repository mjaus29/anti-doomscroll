# 3 — Component Purity

---

## T — TL;DR

A **pure component** always returns the same JSX for the same props — no side effects during render. React can call your component multiple times (Strict Mode does this intentionally). Reading external mutable variables, mutating objects, or calling APIs during render breaks purity and causes bugs.

---

## K — Key Concepts

```tsx
// ── Pure function analogy ─────────────────────────────────────────────────
// Pure: same input → same output, no side effects
function double(n: number): number {
  return n * 2   // always the same result, nothing external affected ✅
}

// ── Pure component ────────────────────────────────────────────────────────
// Props in → JSX out, deterministically
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>   // same name → same JSX, always ✅
}
```

```tsx
// ── Impurity examples and fixes ───────────────────────────────────────────

// ❌ Reading a mutable external variable
let guestNumber = 0
function GuestCard() {
  guestNumber += 1    // mutation during render — different result each call ❌
  return <p>Guest #{guestNumber}</p>
}

// ✅ Fix: pass as a prop
function GuestCard({ number }: { number: number }) {
  return <p>Guest #{number}</p>   // pure — same number → same output ✅
}

// ❌ Calling an API directly during render
function UserProfile({ userId }: { userId: number }) {
  const user = fetchUser(userId)   // ❌ side effect during render
  return <p>{user.name}</p>
}

// ✅ Fix: use useEffect (Day 3) or a data-fetching library (TanStack Query)
// Never call async operations, fetch, or mutations directly in render

// ❌ Mutating props
function ProductList({ items }: { items: Product[] }) {
  items.sort((a, b) => a.name.localeCompare(b.name))  // ❌ mutates the prop array
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
}

// ✅ Fix: create a new sorted array
function ProductList({ items }: { items: Product[] }) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))  // ✅ copy first
  return <ul>{sorted.map(i => <li key={i.id}>{i.name}</li>)}</ul>
}
```

```tsx
// ── Strict Mode doubles renders (intentionally) ───────────────────────────
// In development, React calls components twice to expose impurity

// With StrictMode:
function ImpureCounter() {
  sideEffectArray.push('render')   // ❌ called twice in dev → two pushes
  return <div />
}

// If your UI looks broken in dev but fine without StrictMode:
// → your component has a purity bug
// Strict Mode is your friend — it catches these early
```

---

## W — Why It Matters

- React Strict Mode (enabled by default in Next.js dev) intentionally double-invokes render functions to surface impurity bugs — understanding purity means you understand why Strict Mode exists and why it helps.
- React 18+ can pause and resume rendering (concurrent features) — if your render has side effects, they run at unexpected times or multiple times, causing subtle bugs that are very hard to debug.
- Pure components can be safely memoized (`React.memo`, `useMemo`) — React skips re-rendering if props haven't changed. Impure components can't be safely skipped because the same props might produce different output.

---

## I — Interview Q&A

### Q: What does it mean for a React component to be pure, and why does React require it?

**A:** A pure component always returns the same JSX output given the same props and state — it has no side effects during rendering. No mutations of external variables, no API calls, no writing to the DOM. React requires purity because it needs to be able to call your component function at any time, potentially multiple times (Strict Mode does this in dev, concurrent mode may do it in production). If render has side effects, React can't safely interrupt, pause, or retry renders. Purity also enables optimizations — `React.memo` can skip re-rendering if props haven't changed, because it knows the output will be identical.

---

## C — Common Pitfalls + Fix

### ❌ Mutating state directly during render

```tsx
// ❌ Mutating an array in props — affects the caller's data
function SortedList({ items }: { items: string[] }) {
  items.sort()   // ❌ mutates the original array passed from the parent
  return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
}

// ❌ Setting state directly during render
function BrokenComponent() {
  const [count, setCount] = useState(0)
  setCount(count + 1)   // ❌ triggers infinite re-render loop
  return <div>{count}</div>
}

// ✅ Compute from existing data — never mutate
function SortedList({ items }: { items: string[] }) {
  const sorted = [...items].sort()   // new array, original untouched ✅
  return <ul>{sorted.map((item, i) => <li key={i}>{item}</li>)}</ul>
}

// ✅ State updates belong in event handlers or effects — not render body
```

---

## K — Coding Challenge + Solution

### Challenge

Identify all purity violations in this component and fix each one.

```tsx
// Find the bugs:
let renderCount = 0
const cachedUsers: User[] = []

function UserList({ users }: { users: User[] }) {
  renderCount++
  cachedUsers.push(...users)
  users.sort((a, b) => a.name.localeCompare(b.name))
  document.title = `${users.length} users`
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### Solution

```tsx
// Bugs identified:
// 1. renderCount++ → mutating external variable
// 2. cachedUsers.push(...users) → mutating external array
// 3. users.sort(...) → mutating the prop array
// 4. document.title = ... → DOM side effect during render

// ✅ Fixed version
function UserList({ users }: { users: User[] }) {
  // 1. No renderCount mutation — use React DevTools Profiler if you need counts
  // 2. No external cache mutation — caching belongs in useMemo or external store
  // 3. Copy before sort — never mutate props
  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name))
  // 4. Document title belongs in useEffect (Day 3)

  return (
    <ul>
      {sorted.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}

// Document title side effect → useEffect (introduced Day 3):
// useEffect(() => { document.title = `${users.length} users` }, [users.length])
```

---

---
