# 5 — Re-render Cycle

---

## T — TL;DR

React re-renders a component when: its **state changes**, its **parent re-renders**, or its **context changes** (Day 3). A re-render calls the component function again — React diffs the new JSX against the previous and updates only what changed in the DOM. Re-renders are cheap by design; unnecessary DOM updates are not.

---

## K — Key Concepts

```tsx
// ── What triggers a re-render ─────────────────────────────────────────────
// 1. State change via setter
setCount(count + 1)           // this component re-renders

// 2. Parent re-renders (default behaviour — all children re-render)
function Parent() {
  const [x, setX] = useState(0)
  return (
    <>
      <button onClick={() => setX(x + 1)}>+</button>
      <Child />   {/* re-renders every time Parent re-renders, even with no props */}
    </>
  )
}

// 3. Context value changes (Day 3)
```

```tsx
// ── Re-render does NOT mean DOM update ────────────────────────────────────
// React reconciler diffs the new element tree against the previous
// Only actual DOM changes are applied

function Counter() {
  const [count, setCount] = useState(0)
  // Every click:
  //   1. setCount called → schedules re-render
  //   2. React calls Counter() → produces new JSX
  //   3. Reconciler diffs: only the text in <p> changed
  //   4. DOM update: only that text node is updated
  //   The <button> DOM node is untouched ✅
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
```

```tsx
// ── React skips re-render when state is the same ──────────────────────────
const [count, setCount] = useState(0)
setCount(0)   // same value — React bails out, no re-render
// React uses Object.is() for comparison
// Object.is(0, 0) = true → skip
// Object.is({}, {}) = false → re-render (different reference even if same content)
```

```tsx
// ── Visualising the cycle ─────────────────────────────────────────────────
// 1. Initial render: React calls component → builds DOM
// 2. User clicks → event handler calls setter
// 3. React queues state update (may batch with others)
// 4. React calls component function again with new state
// 5. New JSX produced
// 6. React diffs new vs previous JSX (reconciliation)
// 7. React applies only the diffs to real DOM (commit)
// 8. Effects run (if any) — Day 3
// → Component is ready for next interaction
```

---

## W — Why It Matters

- "Re-render doesn't mean re-paint" is the key insight — React component functions can run hundreds of times per second in interactive UIs, but the DOM update is minimal because of reconciliation. Fear of re-renders leads to premature optimisation.
- Understanding that children re-render when parents do explains performance complaints — a slow child component will be called on every parent state change. `React.memo` (Day 3) is the tool to break this chain.
- `Object.is` comparison for primitive state (numbers, strings, booleans) means setting the same value is free — React optimizes it away. For objects/arrays, a new reference always triggers a re-render even if the content is identical.

---

## I — Interview Q&A

### Q: When does a React component re-render and does a re-render always update the DOM?

**A:** A component re-renders when its state changes, when its parent re-renders (passing new props or not), or when a context it subscribes to changes. A re-render calls the component function to produce new JSX — but it does **not** necessarily update the DOM. React's reconciler diffs the new element tree against the previous one and only applies the minimal set of actual DOM changes. If the output is identical, the DOM is untouched entirely. Re-renders are inexpensive (calling a JavaScript function); unnecessary DOM mutations are the expensive part. React also bails out early with `Object.is` comparison — setting state to the same primitive value skips re-rendering.

---

## C — Common Pitfalls + Fix

### ❌ Creating new object/array state inline — triggers unnecessary re-renders

```tsx
// ❌ New array reference on every render — children always see "new" data
function Parent() {
  const [count, setCount] = useState(0)
  const tags = ['react', 'typescript']  // new array reference every render ❌

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoizedTagList tags={tags} />  {/* memo is bypassed — always re-renders ❌ */}
    </>
  )
}

// ✅ Move constants outside component or use useMemo (Day 3)
const TAGS = ['react', 'typescript'] as const   // stable reference ✅

function ParentFixed() {
  const [count, setCount] = useState(0)
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoizedTagList tags={TAGS} />   {/* stable reference → memo works ✅ */}
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Trace the re-render cascade: clicking a button in `App` updates state. Which components re-render? Show why and how to verify with React DevTools.

### Solution

```tsx
// Setup — trace which components re-render on button click
let renderLog: string[] = []

function Header() {
  renderLog.push('Header rendered')
  return <header>My App</header>
}

function Sidebar() {
  renderLog.push('Sidebar rendered')
  return <aside>Sidebar</aside>
}

function Counter({ count }: { count: number }) {
  renderLog.push(`Counter rendered (count=${count})`)
  return <p>Count: {count}</p>
}

function App() {
  renderLog.push('App rendered')
  const [count, setCount] = useState(0)

  return (
    <div>
      <Header />              {/* re-renders when App re-renders */}
      <Sidebar />             {/* re-renders when App re-renders */}
      <Counter count={count} />{/* re-renders when App re-renders */}
      <button onClick={() => setCount(c => c + 1)}>Click</button>
    </div>
  )
}

// On click: App, Header, Sidebar, Counter ALL re-render
// React DevTools Profiler → shows highlighted components on each interaction

// ── To prevent unnecessary re-renders (when needed) ──────────────────────
// React.memo wraps a component — skips re-render if props unchanged
const MemoHeader  = React.memo(Header)   // Header won't re-render if no props change
const MemoSidebar = React.memo(Sidebar)  // Sidebar won't re-render
// Counter must still re-render — count prop changed
```

---

---
