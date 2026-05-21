
# 📅 Day 1 — React Foundations

> **Goal:** Build a correct mental model of React — how it thinks about UI, how components work, and how data flows through JSX.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 1 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Thinking in React + UI as a Tree | 10 min |
| 2 | Breaking UI into Components | 10 min |
| 3 | Component Purity | 10 min |
| 4 | JSX Rules | 10 min |
| 5 | Embedding JavaScript in JSX | 10 min |
| 6 | Props — passing, receiving, defaults, spreading | 12 min |
| 7 | Rendering Data | 10 min |
| 8 | Conditional Rendering | 12 min |
| 9 | List Rendering + Stable Keys | 12 min |

---

---

# 1 — Thinking in React + UI as a Tree

---

## T — TL;DR

React models your UI as a **tree of components** — a parent renders children, which render their children, all the way down. React re-renders a subtree when state changes, not the whole page. Understanding the tree is the foundation for understanding re-renders, data flow, and performance.

---

## K — Key Concepts

```
── UI as a tree ──────────────────────────────────────────────────────────────

App
├── Header
│   ├── Logo
│   └── Nav
│       ├── NavLink ("Home")
│       ├── NavLink ("Products")
│       └── NavLink ("About")
├── Main
│   ├── ProductList
│   │   ├── ProductCard (id: 1)
│   │   ├── ProductCard (id: 2)
│   │   └── ProductCard (id: 3)
│   └── Sidebar
└── Footer

Every box is a component.
Components are functions that return JSX (a description of UI).
React takes this tree, builds a real DOM tree from it.
When state changes, React re-runs affected components and updates only what changed.
```

```tsx
// React's process: render → reconcile → commit
//
// 1. RENDER PHASE: React calls your component functions
//    — produces a new virtual tree (React elements / JSX)
//    — pure: no side effects during render
//
// 2. RECONCILE: React diffs new tree vs previous tree
//    — finds what actually changed
//
// 3. COMMIT: React applies those changes to the real DOM
//    — runs effects, updates refs

// Your component is just a function:
function ProductCard({ name }: { name: string }) {
  return <div className="card">{name}</div>
}
// React calls this function, gets JSX back, uses it to build/update the DOM
```

```
── The Thinking in React process ────────────────────────────────────────────

Given a design mockup and data:

Step 1: Break UI into a component hierarchy
Step 2: Build a static version (no state — just props + JSX)
Step 3: Find the minimal complete representation of state
Step 4: Identify where state should live (which component owns it)
Step 5: Add inverse data flow (child → parent via callbacks)

This order matters: get the shape right first, add interactivity second.
```

---

## W — Why It Matters

- Every React performance question ("why is this re-rendering?") is answered by understanding the tree — a state change in a parent re-renders that parent and all its children by default.
- The "thinking in React" process is how senior engineers approach new UI work — start with structure and data, not with code. Rushing to code before having a clear component hierarchy leads to constant refactoring.
- React's reconciler doing a tree diff (instead of replacing the whole DOM) is why React is fast — it doesn't need to touch the DOM for unchanged subtrees.

---

## I — Interview Q&A

### Q: What is the React render process and what are its three phases?

**A:** React's render process has three phases: (1) **Render phase** — React calls your component functions to produce a new tree of React elements (JSX). This must be pure — no side effects. (2) **Reconciliation** — React compares the new element tree against the previous one (the "virtual DOM diff") to determine the minimal set of changes needed. (3) **Commit phase** — React applies those changes to the real DOM, then runs `useEffect` and `useLayoutEffect`. Only the commit phase touches the DOM. The render phase can be interrupted and restarted (in concurrent mode) which is why purity in render is required.

---

## C — Common Pitfalls + Fix

### ❌ Treating React as "just jQuery with templates"

```tsx
// ❌ Imperative thinking — manually manipulating DOM
document.getElementById('count').textContent = String(count + 1)

// ❌ Thinking React re-renders the whole page on state change

// ✅ Declarative: describe what the UI should look like for a given state
// React figures out the minimum DOM updates needed
function Counter({ count }: { count: number }) {
  return <p>Count: {count}</p>   // React diffs this against previous render
}
// When count changes, React updates only the text node — nothing else
```

---

## K — Coding Challenge + Solution

### Challenge

Draw the component tree for a blog page with: a header (logo + nav), a post list (three post cards each with title, author, date), and a sidebar with recent posts.

### Solution

```
BlogPage
├── Header
│   ├── Logo
│   └── Nav
│       ├── NavLink ("Home")
│       └── NavLink ("Blog")
├── PageBody
│   ├── PostList
│   │   ├── PostCard (post: { id:1, title, author, date })
│   │   ├── PostCard (post: { id:2, title, author, date })
│   │   └── PostCard (post: { id:3, title, author, date })
│   └── Sidebar
│       └── RecentPostList
│           ├── RecentPostLink (post: { id:4, title })
│           └── RecentPostLink (post: { id:5, title })
└── Footer
```

```tsx
// Data flows DOWN through the tree (props)
// Events flow UP through the tree (callbacks)
// State lives in the lowest common ancestor that needs it

// BlogPage owns the posts data → passes to PostList
// PostList passes each post → PostCard
// PostCard just renders — it knows nothing about the list
```

---

---

# 2 — Breaking UI into Components

---

## T — TL;DR

A component should do **one thing** — if it grows, break it into smaller components. Use the **single responsibility principle** as your guide. A good component boundary is one that isolates a concept, reuses a pattern, or matches a natural unit in the design.

---

## K — Key Concepts

```tsx
// ── When to extract a component ──────────────────────────────────────────
// 1. You're repeating the same JSX pattern more than once
// 2. A piece of UI has enough complexity to deserve a name
// 3. A section can be independently reasoned about
// 4. A piece would need its own state later

// ❌ Before: everything in one component — hard to read and reuse
function UserProfile() {
  return (
    <div className="profile">
      <div className="avatar">
        <img src="/avatar.png" alt="user avatar" />
        <span className="status online" />
      </div>
      <div className="info">
        <h2 className="name">Mark Austria</h2>
        <p className="bio">Full-stack developer</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">142</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-value">3.4k</span>
          <span className="stat-label">Followers</span>
        </div>
      </div>
    </div>
  )
}
```

```tsx
// ✅ After: extracted components — each with a clear responsibility
interface AvatarProps {
  src: string
  alt: string
  online?: boolean
}
function Avatar({ src, alt, online = false }: AvatarProps) {
  return (
    <div className="avatar">
      <img src={src} alt={alt} />
      {online && <span className="status online" />}
    </div>
  )
}

interface StatProps {
  value: string | number
  label: string
}
function Stat({ value, label }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface UserInfo {
  name: string
  bio: string
  avatarSrc: string
  posts: number
  followers: number
  online: boolean
}
function UserProfile({ user }: { user: UserInfo }) {
  return (
    <div className="profile">
      <Avatar src={user.avatarSrc} alt={`${user.name} avatar`} online={user.online} />
      <div className="info">
        <h2 className="name">{user.name}</h2>
        <p className="bio">{user.bio}</p>
      </div>
      <div className="stats">
        <Stat value={user.posts}     label="Posts"     />
        <Stat value={user.followers} label="Followers" />
      </div>
    </div>
  )
}
```

```tsx
// ── Single responsibility in practice ────────────────────────────────────
// Each component answers: "what is this responsible for?"
// Avatar    → renders a user's avatar with optional online status
// Stat      → renders one statistic (value + label pair)
// UserProfile → composes Avatar + bio + stats into a profile layout

// Components as vocabulary: when your code reads like
// <Avatar /> <Stat /> <UserProfile /> — the JSX itself is documentation
```

---

## W — Why It Matters

- Small, well-named components are the difference between a codebase you can navigate in 30 seconds and one you need 30 minutes to understand — the component name is the first line of documentation.
- Components that do one thing are easier to test — `Stat` takes `value` and `label` and renders them. One test. Zero setup. Compare to testing a 200-line monolith component.
- Reuse emerges from good decomposition — `Avatar` extracted today is used in `UserProfile`, `CommentHeader`, and `NotificationItem` tomorrow. Extraction is not premature abstraction when there's a clear concept.

---

## I — Interview Q&A

### Q: How do you decide when to extract a new component?

**A:** Three main signals: (1) **Repetition** — the same JSX block appears more than once, suggesting a reusable component with props. (2) **Complexity** — a section of JSX is large enough that it needs scrolling to understand, or has its own internal logic. Giving it a name makes the parent cleaner. (3) **Independent concerns** — a piece of UI has a clear responsibility that can be stated in one sentence (Avatar renders a user's profile picture with online status). The single responsibility principle applies: if you can't name a component without using "and", consider splitting it. Don't over-extract though — if it's only used once and adding a component adds indirection without clarity, keep it inline.

---

## C — Common Pitfalls + Fix

### ❌ Component names that don't communicate intent

```tsx
// ❌ Generic names — what does this render? What are its rules?
function Box({ children }: { children: React.ReactNode }) { ... }
function Item({ data }: { data: any }) { ... }
function Thing() { ... }

// ✅ Names that describe what the component IS, not what it does
function Card({ children }: { children: React.ReactNode }) { ... }
function ProductListItem({ product }: { product: Product }) { ... }
function EmptyStateMessage({ message }: { message: string }) { ... }

// Component name = contract with the reader
// ProductListItem tells you: this is one item, it's in a list, it shows a product
```

---

## K — Coding Challenge + Solution

### Challenge

Break this 30-line JSX block into well-named components with typed props. A notification card with: icon, title, message, timestamp, and a dismiss button.

### Solution

```tsx
// Extracted components

interface NotificationIconProps {
  type: 'info' | 'success' | 'warning' | 'error'
}
function NotificationIcon({ type }: NotificationIconProps) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' } as const
  return <span className={`icon icon-${type}`}>{icons[type]}</span>
}

interface DismissButtonProps {
  onDismiss: () => void
}
function DismissButton({ onDismiss }: DismissButtonProps) {
  return (
    <button
      onClick={onDismiss}
      aria-label="Dismiss notification"
      className="dismiss-btn"
    >
      ✕
    </button>
  )
}

interface NotificationCardProps {
  type:      'info' | 'success' | 'warning' | 'error'
  title:     string
  message:   string
  timestamp: string
  onDismiss: () => void
}
function NotificationCard({ type, title, message, timestamp, onDismiss }: NotificationCardProps) {
  return (
    <div className={`notification notification-${type}`} role="alert">
      <NotificationIcon type={type} />
      <div className="notification-body">
        <strong className="notification-title">{title}</strong>
        <p className="notification-message">{message}</p>
        <time className="notification-time">{timestamp}</time>
      </div>
      <DismissButton onDismiss={onDismiss} />
    </div>
  )
}
```

---

---

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

# 4 — JSX Rules

---

## T — TL;DR

JSX is syntactic sugar over `React.createElement()` — it compiles to JavaScript. **Rules:** Return one root element (or Fragment). Close all tags. Use `className` not `class`. Use `camelCase` for attributes. Expressions go in `{}`. These rules exist because JSX is JavaScript, not HTML.

---

## K — Key Concepts

```tsx
// ── JSX compiles to JavaScript ────────────────────────────────────────────
// JSX:
const el = <h1 className="title">Hello</h1>

// Compiles to:
const el = React.createElement('h1', { className: 'title' }, 'Hello')

// This is why JSX must follow JS syntax rules — it IS JavaScript
```

```tsx
// ── Rule 1: Return one root element ──────────────────────────────────────
// ❌ Two root elements — compile error
function Bad() {
  return (
    <h1>Title</h1>
    <p>Paragraph</p>
  )
}

// ✅ Option A: Wrap in a div
function GoodDiv() {
  return (
    <div>
      <h1>Title</h1>
      <p>Paragraph</p>
    </div>
  )
}

// ✅ Option B: Fragment — renders no DOM element
function GoodFragment() {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph</p>
    </>
  )
}

// ✅ Option C: explicit Fragment (needed when you need a key prop)
import { Fragment } from 'react'
function GoodExplicit() {
  return (
    <Fragment>
      <h1>Title</h1>
      <p>Paragraph</p>
    </Fragment>
  )
}
```

```tsx
// ── Rule 2: Close all tags ─────────────────────────────────────────────────
// ❌ Self-closing tags must be explicit
function Bad() {
  return <input>   // compile error in JSX
}
// ✅
function Good() {
  return <input />   // self-closing ✅
}
// All HTML void elements: input, br, hr, img, link, meta → must self-close in JSX

// ── Rule 3: camelCase attributes ──────────────────────────────────────────
// HTML attribute → JSX attribute
// class         → className
// for           → htmlFor   (label element)
// tabindex      → tabIndex
// onclick       → onClick
// onchange      → onChange
// readonly      → readOnly
// maxlength     → maxLength
// stroke-width  → strokeWidth  (SVG)
// colspan       → colSpan      (table)
```

```tsx
// ── Rule 4: JSX attribute values ─────────────────────────────────────────
// String: use quotes
<button type="button">Click</button>

// Expression (non-string): use curly braces
<input
  type="text"
  value={inputValue}          // variable
  maxLength={100}             // number — not a string
  disabled={isLoading}        // boolean
  onChange={handleChange}     // function reference
  style={{ color: 'red' }}   // object — double braces (outer = JSX, inner = object)
/>

// ── Rule 5: Multiline JSX — wrap in parentheses ───────────────────────────
// Without parens: automatic semicolon insertion can break it
function Component() {
  return (        // ← opening paren
    <div>
      <p>safe</p>
    </div>
  )               // ← closing paren
}
```

---

## W — Why It Matters

- JSX rules aren't arbitrary — they exist because JSX compiles to JavaScript. `class` is a reserved word in JS, so React uses `className`. Understanding the compilation makes the rules memorable.
- Fragment (`<>...</>`) is the correct fix for "one root element" when you don't want a wrapper div — adding unnecessary `<div>` wrappers pollutes the DOM and breaks CSS layouts (especially flexbox/grid children).
- The double-brace `style={{ color: 'red' }}` confuses newcomers — knowing the outer `{}` is "JSX expression" and the inner `{}` is "JavaScript object literal" makes it obvious, not magical.

---

## I — Interview Q&A

### Q: Why does JSX use `className` instead of `class`?

**A:** JSX compiles to JavaScript — `<div class="foo">` becomes `React.createElement('div', { class: 'foo' })`. But `class` is a reserved keyword in JavaScript (it defines a class). Using `class` as a property name in an object literal is technically allowed in modern JS but caused issues in older compilers and is semantically confusing. React standardized on `className` to match the DOM property name (`element.className`), avoid the reserved word ambiguity, and be consistent with the DOM API developers already know. Similarly, `for` (used in HTML `<label for="">`) became `htmlFor` because `for` is also a reserved word (used in `for` loops).

---

## C — Common Pitfalls + Fix

### ❌ `style` receiving a string instead of an object

```tsx
// ❌ HTML style is a string — JSX style must be an object
<div style="color: red; font-size: 16px">Text</div>
// Type error: style expects CSSProperties object, not string

// ✅ JSX style is always an object with camelCase properties
<div style={{ color: 'red', fontSize: '16px' }}>Text</div>

// ✅ Extract to a variable for readability
const textStyle: React.CSSProperties = {
  color:    'red',
  fontSize: '16px',
  fontWeight: 700,
}
<div style={textStyle}>Text</div>
```

---

## K — Coding Challenge + Solution

### Challenge

Fix all JSX errors in this snippet: wrong attribute names, unclosed tags, missing root element, string style.

```tsx
function BrokenForm() {
  return (
    <form class="login-form">
      <label for="email">Email</label>
      <input type="email" id="email" readonly maxlength="100">
      <br>
      <button type="submit" style="background: blue; color: white">
        Submit
      </button>
    </form>
    <p>Don't have an account? <a href="/signup">Sign up</a></p>
  )
}
```

### Solution

```tsx
function FixedForm() {
  return (
    // ✅ Wrapped in Fragment — two root elements → one root
    <>
      <form className="login-form">  {/* class → className */}
        <label htmlFor="email">Email</label>  {/* for → htmlFor */}
        <input
          type="email"
          id="email"
          readOnly                        {/* readonly → readOnly */}
          maxLength={100}                 {/* maxlength → maxLength, number not string */}
        />                               {/* self-closing */}
        <br />                           {/* self-closing */}
        <button
          type="submit"
          style={{ background: 'blue', color: 'white' }}   {/* string → object */}
        >
          Submit
        </button>
      </form>
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </>
  )
}
```

---

---

# 5 — Embedding JavaScript in JSX

---

## T — TL;DR

Curly braces `{}` in JSX are an escape hatch into JavaScript. You can embed any **expression** (a value-producing piece of code) — variables, function calls, arithmetic, ternaries. You cannot embed **statements** (`if`, `for`, `while`). The JSX `{}` evaluates the expression and renders the result.

---

## K — Key Concepts

```tsx
// ── Expressions you can embed ─────────────────────────────────────────────
const name = 'Mark'
const price = 19.99
const items = ['Apple', 'Banana', 'Cherry']
const isActive = true

function getLabel() { return 'Click me' }

function Demo() {
  return (
    <div>
      {/* String variable */}
      <p>{name}</p>

      {/* Arithmetic */}
      <p>Price: ${(price * 1.12).toFixed(2)}</p>

      {/* Function call */}
      <button>{getLabel()}</button>

      {/* Template literal */}
      <p>{`Hello, ${name}! Welcome back.`}</p>

      {/* Ternary */}
      <span>{isActive ? 'Active' : 'Inactive'}</span>

      {/* Logical AND (render or nothing) */}
      {isActive && <span className="badge">Active</span>}

      {/* Nullish coalescing */}
      <p>{name ?? 'Anonymous'}</p>

      {/* Array expression */}
      <p>Items: {items.length}</p>
    </div>
  )
}
```

```tsx
// ── What you CANNOT embed directly ───────────────────────────────────────
function Bad() {
  return (
    <div>
      {/* ❌ if statement — statement, not expression */}
      {if (isActive) { return <p>Active</p> }}

      {/* ❌ for loop — statement, not expression */}
      {for (const item of items) { <li>{item}</li> }}

      {/* ❌ Objects render as "[object Object]" — not useful */}
      {/* { user } where user = { name: 'Mark' } → error */}
    </div>
  )
}

// ✅ Convert to expressions:
function Good() {
  return (
    <div>
      {/* ternary instead of if */}
      {isActive ? <p>Active</p> : null}

      {/* array.map instead of for */}
      {items.map(item => <li key={item}>{item}</li>)}
    </div>
  )
}
```

```tsx
// ── JSX is an expression too ──────────────────────────────────────────────
// JSX elements are values — store them in variables, pass them around
const header = <h1>Hello</h1>
const icon = <svg>...</svg>

function Page({ title }: { title: string }) {
  const pageTitle = <title>{title}</title>   // JSX as a variable
  const content = title
    ? <main><h1>{title}</h1></main>
    : <main><p>No title</p></main>
  return (
    <>
      {pageTitle}
      {content}
    </>
  )
}
```

---

## W — Why It Matters

- The "expressions only, no statements" rule explains why React uses `array.map()` for lists and ternary/`&&` for conditionals — these are all expressions. Once you internalize this, JSX pattern-matching becomes second nature.
- JSX being "just JavaScript" means you can assign JSX to variables, pass it as arguments, return it from functions, store it in arrays — enabling patterns like renderProps, children-as-props, and component composition.
- The `&&` shorthand (`{count > 0 && <Badge>{count}</Badge>}`) is idiomatic React — but it has a gotcha (see pitfalls). Knowing the pitfall is what separates a beginner from an intermediate developer.

---

## I — Interview Q&A

### Q: Why can't you use `if` statements inside JSX curly braces?

**A:** JSX curly braces `{}` evaluate a JavaScript **expression** — a piece of code that produces a value. `if` is a **statement** — it controls flow but doesn't produce a value. JavaScript's grammar doesn't allow statements where expressions are expected, and JSX compiles to function call arguments (`React.createElement('div', null, expression)`) which require expressions. The fix is to use the ternary operator (`condition ? a : b`), which is an expression, or logical AND (`condition && jsx`). If the logic is complex, extract it into a variable or helper function before the return statement where statements are allowed.

---

## C — Common Pitfalls + Fix

### ❌ `{count && <Badge>}` renders `0` when count is 0

```tsx
// ❌ Falsy value 0 is rendered as the string "0" in JSX
function Cart({ count }: { count: number }) {
  return (
    <div>
      {count && <Badge>{count}</Badge>}
      {/* When count = 0: renders "0" as text node — not nothing! */}
    </div>
  )
}

// ✅ Use boolean coercion or ternary
function Cart({ count }: { count: number }) {
  return (
    <div>
      {/* Option 1: explicit boolean */}
      {count > 0 && <Badge>{count}</Badge>}

      {/* Option 2: ternary */}
      {count > 0 ? <Badge>{count}</Badge> : null}

      {/* Option 3: Boolean() coercion */}
      {Boolean(count) && <Badge>{count}</Badge>}
    </div>
  )
}

// Rule: use `> 0` or `!= null` check before &&, not just the value itself
// This bites everyone exactly once — and then they never forget
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `PricingCard` component that embeds: a formatted price (with discount if provided), a feature list from an array, and a "Most Popular" badge only for certain tiers.

### Solution

```tsx
interface PricingCardProps {
  name:        string
  price:       number
  discount?:   number
  features:    string[]
  popular?:    boolean
  currency?:   string
}

function PricingCard({
  name,
  price,
  discount,
  features,
  popular = false,
  currency = 'USD',
}: PricingCardProps) {
  const finalPrice    = discount ? price * (1 - discount / 100) : price
  const formatter     = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  const formattedPrice = formatter.format(finalPrice)

  return (
    <div className={`pricing-card ${popular ? 'pricing-card--popular' : ''}`}>
      {/* Badge — only rendered when popular is true */}
      {popular && (
        <span className="badge badge--popular">Most Popular</span>
      )}

      <h2 className="plan-name">{name}</h2>

      {/* Price with optional strikethrough original */}
      <div className="price-block">
        {discount != null && (
          <span className="price-original">
            {formatter.format(price)}
          </span>
        )}
        <span className="price-final">{formattedPrice}</span>
        {discount != null && (
          <span className="discount-badge">{discount}% off</span>
        )}
      </div>

      {/* Features from array */}
      <ul className="features">
        {features.map(feature => (
          <li key={feature} className="feature-item">
            ✓ {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

---

# 6 — Props

---

## T — TL;DR

**Props** are how data flows from parent to child — they're the component's function arguments. Props are **read-only**. You can pass any JavaScript value: strings, numbers, booleans, objects, arrays, functions, even JSX. TypeScript interfaces make props self-documenting and safe.

---

## K — Key Concepts

```tsx
// ── Defining and receiving props ──────────────────────────────────────────
// Define the interface
interface ButtonProps {
  label:     string
  onClick:   () => void
  variant?:  'primary' | 'secondary' | 'danger'   // ? = optional
  disabled?: boolean
}

// Destructure in function signature (most common pattern)
function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

// Usage: parent passes props
function App() {
  return (
    <Button
      label="Save changes"
      onClick={() => console.log('saved')}
      variant="primary"
    />
  )
}
```

```tsx
// ── Prop types you can pass ───────────────────────────────────────────────
interface AllPropTypes {
  // Primitives
  name:       string
  count:      number
  active:     boolean

  // Objects and arrays
  user:       { id: number; name: string }
  tags:       string[]

  // Functions (event handlers, callbacks)
  onChange:   (value: string) => void
  onSubmit:   (data: FormData) => Promise<void>

  // JSX / React nodes (for composition)
  children:   React.ReactNode           // any JSX, string, number, null, array
  icon:       React.ReactElement        // must be a React element (not null)
  header:     React.ReactNode

  // Refs
  inputRef:   React.RefObject<HTMLInputElement>
}
```

```tsx
// ── children prop ─────────────────────────────────────────────────────────
// children = whatever is placed between opening and closing tags
function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body">{children}</div>
    </div>
  )
}

// Usage: children are the elements between the tags
<Card title="User Details">
  <Avatar src="/user.jpg" alt="user" />
  <p>Mark Austria</p>
  <p>mark@example.com</p>
</Card>

// ── Prop spreading (use carefully) ───────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}
function LabeledInput({ label, ...inputProps }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...inputProps} />   {/* spread all HTML input props */}
    </div>
  )
}
// Usage:
<LabeledInput label="Email" type="email" value={email} onChange={handleChange} />
```

---

## W — Why It Matters

- Props are the primary mechanism of data flow in React — everything starts as `props`. Understanding them fully (especially `children` and function props) unlocks composition patterns, render props, and component APIs.
- TypeScript prop interfaces serve as live documentation — when you type `<Button`, your editor shows every accepted prop, its type, and whether it's required. No need to check the component implementation.
- The rule that **props are read-only** is fundamental — violating it by mutating `props.user.name = 'new'` creates unpredictable behaviour because the parent doesn't know its data changed. Always treat props as immutable.

---

## I — Interview Q&A

### Q: What is the `children` prop and how is it used for component composition?

**A:** `children` is a special prop that represents the JSX content placed between a component's opening and closing tags. It has type `React.ReactNode` which accepts any renderable value — JSX elements, strings, numbers, arrays, `null`, or `undefined`. Components that accept `children` act as layout wrappers or containers — they define structure (card, modal, layout, section) while the content is provided by the caller. This is the primary composition pattern in React: instead of passing content as a data prop (`content={<SomeThing />}`), you nest it as children (`<Card><SomeThing /></Card>`), which reads more naturally and matches HTML's nesting model.

---

## C — Common Pitfalls + Fix

### ❌ Mutating props — breaks data flow

```tsx
// ❌ Mutating a prop object — the parent doesn't know their data changed
function UserCard({ user }: { user: User }) {
  user.name = user.name.toUpperCase()   // ❌ mutates parent's object
  return <div>{user.name}</div>
}

// ❌ Mutating a prop array
function SortedList({ items }: { items: string[] }) {
  items.sort()   // ❌ mutates the array reference the parent holds
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
}

// ✅ Derive new values — never mutate props
function UserCard({ user }: { user: User }) {
  const displayName = user.name.toUpperCase()  // new variable, prop untouched
  return <div>{displayName}</div>
}

function SortedList({ items }: { items: string[] }) {
  const sorted = [...items].sort()   // copy first ✅
  return <ul>{sorted.map(i => <li key={i}>{i}</li>)}</ul>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `Alert` component with props for `type` ('info' | 'success' | 'warning' | 'error'), `title`, optional `description`, optional `onClose` callback, and `children`. Make the close button only appear when `onClose` is provided.

### Solution

```tsx
interface AlertProps {
  type:         'info' | 'success' | 'warning' | 'error'
  title:        string
  description?: string
  onClose?:     () => void
  children?:    React.ReactNode
}

const ALERT_STYLES: Record<AlertProps['type'], { bg: string; icon: string }> = {
  info:    { bg: 'bg-blue-50 border-blue-300',   icon: 'ℹ️' },
  success: { bg: 'bg-green-50 border-green-300', icon: '✅' },
  warning: { bg: 'bg-yellow-50 border-yellow-300', icon: '⚠️' },
  error:   { bg: 'bg-red-50 border-red-300',     icon: '❌' },
}

function Alert({ type, title, description, onClose, children }: AlertProps) {
  const { bg, icon } = ALERT_STYLES[type]

  return (
    <div className={`alert border rounded p-4 ${bg}`} role="alert">
      <div className="alert-header flex justify-between items-start">
        <div className="flex gap-2">
          <span className="alert-icon">{icon}</span>
          <strong className="alert-title">{title}</strong>
        </div>
        {/* Close button only renders if onClose is provided */}
        {onClose != null && (
          <button
            onClick={onClose}
            aria-label="Close alert"
            className="alert-close"
          >
            ✕
          </button>
        )}
      </div>
      {description != null && (
        <p className="alert-description mt-1">{description}</p>
      )}
      {children != null && (
        <div className="alert-content mt-2">{children}</div>
      )}
    </div>
  )
}

// Usage:
<Alert
  type="success"
  title="Payment complete"
  description="Your order #1234 has been confirmed."
  onClose={() => setAlertVisible(false)}
/>
```

---

---

# 7 — Rendering Data

---

## T — TL;DR

"Rendering data" means displaying JavaScript values in JSX — from props, local variables, or computed values. Arrays are rendered with `.map()`. Objects are never rendered directly (they aren't valid JSX). Dates and numbers need formatting before display.

---

## K — Key Concepts

```tsx
// ── Rendering primitives ──────────────────────────────────────────────────
interface User {
  id:        number
  name:      string
  email:     string
  joinedAt:  Date
  score:     number
  active:    boolean
}

function UserDetail({ user }: { user: User }) {
  return (
    <dl>
      {/* String renders as-is */}
      <dt>Name</dt>
      <dd>{user.name}</dd>

      {/* Number renders as string automatically */}
      <dt>ID</dt>
      <dd>{user.id}</dd>

      {/* Boolean: doesn't render — use ternary for display */}
      <dt>Status</dt>
      <dd>{user.active ? 'Active' : 'Inactive'}</dd>

      {/* Date: must format (Date renders as [object Object] without formatting) */}
      <dt>Joined</dt>
      <dd>{user.joinedAt.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })}</dd>

      {/* Number formatting */}
      <dt>Score</dt>
      <dd>{new Intl.NumberFormat('en-US').format(user.score)}</dd>
    </dl>
  )
}
```

```tsx
// ── Rendering arrays ──────────────────────────────────────────────────────
// Arrays of JSX are rendered inline — each item needs a key
interface Product {
  id:    number
  name:  string
  price: number
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="empty">No products found.</p>
  }

  return (
    <ul className="product-list">
      {products.map(product => (
        <li key={product.id} className="product-item">
          <span className="product-name">{product.name}</span>
          <span className="product-price">
            {new Intl.NumberFormat('en-US', {
              style: 'currency', currency: 'USD'
            }).format(product.price)}
          </span>
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// ── Objects cannot be rendered directly ──────────────────────────────────
interface Config {
  theme: string
  lang:  string
}
function Bad({ config }: { config: Config }) {
  return <div>{config}</div>   // ❌ Error: objects are not valid React children
}

function Good({ config }: { config: Config }) {
  return (
    <div>
      {/* Extract and render each property separately */}
      <p>Theme: {config.theme}</p>
      <p>Language: {config.lang}</p>

      {/* Or serialize for debugging */}
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  )
}
```

---

## W — Why It Matters

- `Date` objects rendering as `[object Object]` is a common beginner surprise — formatting with `toLocaleDateString` or `Intl.DateTimeFormat` is the correct approach, not string coercion.
- The empty state check (`if (products.length === 0) return <EmptyState />`) before the list render is one of the most important UI quality signals — production apps always handle empty states.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` are the correct formatting tools — they handle locale, currency symbols, and number formats without any library, built into the browser.

---

## I — Interview Q&A

### Q: Why can't you render a JavaScript object directly in JSX?

**A:** JSX renders values by converting them to strings. For primitives — numbers, strings, booleans (sort of) — the coercion is well-defined and useful. For objects, `String({})` produces `"[object Object]"` which is meaningless. React explicitly throws an error for objects as children rather than silently rendering this useless string, because rendering an object is almost always a bug — the developer meant to render a specific property or serialize the object. The fix is to always render specific properties (`obj.name`, `obj.id`) or serialize explicitly (`JSON.stringify(obj)`).

---

## C — Common Pitfalls + Fix

### ❌ Rendering a Date object without formatting

```tsx
interface Post {
  title:     string
  createdAt: Date
}

// ❌ Date object renders as [object Object]
function PostMeta({ post }: { post: Post }) {
  return <time>{post.createdAt}</time>   // TypeError in React ❌
}

// ✅ Format before rendering
function PostMeta({ post }: { post: Post }) {
  const formatted = post.createdAt.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
  const iso = post.createdAt.toISOString()   // for machine-readable datetime

  return (
    <time dateTime={iso} className="post-date">
      {formatted}
    </time>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `DataTable` component that renders an array of objects with dynamic columns. Handle empty state, format currency columns, and format date columns.

### Solution

```tsx
interface Column<T> {
  key:      keyof T
  header:   string
  type?:    'text' | 'currency' | 'date' | 'number'
}

interface DataTableProps<T extends { id: number | string }> {
  rows:    T[]
  columns: Column<T>[]
  emptyMessage?: string
}

function formatCell(value: unknown, type: Column<unknown>['type'] = 'text'): string {
  if (value == null) return '—'
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                     .format(Number(value))
    case 'date':
      return new Date(value as string | Date)
                .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value))
    default:
      return String(value)
  }
}

function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  emptyMessage = 'No data available.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="table-empty">{emptyMessage}</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {formatCell(row[col.key], col.type)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

---

# 8 — Conditional Rendering

---

## T — TL;DR

React renders **different JSX based on conditions** — using ternary, `&&`, or early returns. Since JSX only accepts expressions (not `if` statements), the idioms are: ternary for if/else, `&&` for if-only, early return for complex guard clauses.

---

## K — Key Concepts

```tsx
// ── Three core patterns ───────────────────────────────────────────────────

// Pattern 1: Ternary (if/else)
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge--green' : 'badge--gray'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

// Pattern 2: && (render or nothing)
function NotificationBell({ count }: { count: number }) {
  return (
    <div className="bell">
      🔔
      {count > 0 && (
        <span className="badge">{count}</span>
      )}
    </div>
  )
}

// Pattern 3: Early return (guard clause — simplest for complex conditions)
function UserCard({ user }: { user: User | null }) {
  if (!user) return null           // early return — nothing to show
  if (!user.active) return <BannedMessage />  // guard for banned user

  // If we reach here, user is valid and active
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}
```

```tsx
// ── Conditional JSX stored in variables ──────────────────────────────────
function LoadableContent({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean
  error:     Error | null
  data:      string | null
}) {
  // Compute what to show — before the return
  let content: React.ReactNode
  if (isLoading) {
    content = <Spinner />
  } else if (error) {
    content = <ErrorMessage message={error.message} />
  } else if (data) {
    content = <p>{data}</p>
  } else {
    content = <EmptyState />
  }

  return (
    <section>
      <h2>Results</h2>
      {content}
    </section>
  )
}

// This pattern is cleaner than deeply nested ternaries
```

```tsx
// ── Nested ternary — use sparingly ────────────────────────────────────────
// Acceptable for 2 levels, hard to read beyond that
function TrafficLight({ status }: { status: 'red' | 'yellow' | 'green' }) {
  return (
    <div className={
      status === 'green'  ? 'light light--green'  :
      status === 'yellow' ? 'light light--yellow' :
                            'light light--red'
    }>
      {status}
    </div>
  )
}

// ✅ Better for 3+ cases: object lookup or early returns
const LIGHT_CLASSES = {
  green:  'light light--green',
  yellow: 'light light--yellow',
  red:    'light light--red',
} as const

function TrafficLight2({ status }: { status: keyof typeof LIGHT_CLASSES }) {
  return <div className={LIGHT_CLASSES[status]}>{status}</div>
}
```

---

## W — Why It Matters

- Early returns for guard clauses (null check, loading, error) are the pattern React developers use to handle async states — every component that fetches data needs to handle loading, error, and empty states before rendering the happy path.
- The `&&` gotcha with `0` (see Day 1 Subtopic 5) is the most common conditional rendering bug — using `count > 0 &&` instead of `count &&` is a non-negotiable habit.
- Object lookup (`LIGHT_CLASSES[status]`) instead of chained ternaries is a TypeScript-friendly pattern — TypeScript can exhaustively check the `keyof` type and error if you add a new status without handling it.

---

## I — Interview Q&A

### Q: What are the different ways to conditionally render in React and when would you use each?

**A:** Three main patterns: (1) **Ternary** (`condition ? <A /> : <B />`) — for if/else where both branches render something meaningful. Best for toggling between two versions of UI. (2) **Logical AND** (`condition && <A />`) — for "show this or nothing". Use `condition != null` or `condition > 0` rather than a bare value to avoid rendering `0` or `false`. (3) **Early return** — for guard clauses at the top of a component. When a component has multiple conditions (loading, error, empty, success), early returns for each unhandled state and then render the happy path below are the cleanest approach. Avoid deeply nested ternaries — use a variable or switch/object lookup for 3+ conditions.

---

## C — Common Pitfalls + Fix

### ❌ Nested ternaries that become unreadable

```tsx
// ❌ Three-level nested ternary — impossible to read
function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={
      plan === 'enterprise' ? 'badge badge-purple' :
      plan === 'pro'        ? 'badge badge-blue'   :
      plan === 'starter'    ? 'badge badge-green'  :
                              'badge badge-gray'
    }>
      {plan === 'enterprise' ? '🏢 Enterprise' :
       plan === 'pro'        ? '⭐ Pro'         :
       plan === 'starter'    ? '🌱 Starter'     :
                               'Free'}
    </span>
  )
}

// ✅ Object lookup — readable and type-safe
const PLAN_CONFIG = {
  enterprise: { className: 'badge badge-purple', label: '🏢 Enterprise' },
  pro:        { className: 'badge badge-blue',   label: '⭐ Pro'        },
  starter:    { className: 'badge badge-green',  label: '🌱 Starter'   },
  free:       { className: 'badge badge-gray',   label: 'Free'         },
} as const

type Plan = keyof typeof PLAN_CONFIG

function PlanBadge({ plan }: { plan: Plan }) {
  const { className, label } = PLAN_CONFIG[plan]
  return <span className={className}>{label}</span>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `FetchState` component that renders four states: loading (spinner), error (error message + retry button), empty (empty state message), and success (children). Accept `onRetry` callback.

### Solution

```tsx
interface FetchStateProps {
  isLoading:  boolean
  error:      Error | null
  isEmpty:    boolean
  onRetry?:   () => void
  children:   React.ReactNode
}

function Spinner() {
  return (
    <div className="spinner" role="status" aria-label="Loading">
      <span className="spinner-ring" />
    </div>
  )
}

function EmptyState({ message = 'No results found.' }: { message?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">📭</span>
      <p>{message}</p>
    </div>
  )
}

function FetchState({ isLoading, error, isEmpty, onRetry, children }: FetchStateProps) {
  // Guard: loading
  if (isLoading) {
    return <Spinner />
  }

  // Guard: error
  if (error) {
    return (
      <div className="error-state" role="alert">
        <p className="error-message">⚠️ {error.message}</p>
        {onRetry != null && (
          <button onClick={onRetry} className="btn btn-secondary">
            Try again
          </button>
        )}
      </div>
    )
  }

  // Guard: empty
  if (isEmpty) {
    return <EmptyState />
  }

  // Happy path: render children
  return <>{children}</>
}

// Usage:
<FetchState
  isLoading={query.isLoading}
  error={query.error}
  isEmpty={query.data?.length === 0}
  onRetry={() => query.refetch()}
>
  <ProductList products={query.data ?? []} />
</FetchState>
```

---

---

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