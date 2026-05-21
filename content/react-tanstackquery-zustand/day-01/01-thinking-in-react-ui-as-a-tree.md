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
