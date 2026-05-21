# 6 — Batching Mindset

---

## T — TL;DR

React **batches** multiple `setState` calls in the same event handler into **one re-render**. In React 18+, even async updates (setTimeout, fetch callbacks, Promises) are batched by default. This means one re-render per interaction, not one per `setState` call — efficient and consistent.

---

## K — Key Concepts

```tsx
// ── Batching in event handlers ────────────────────────────────────────────
function Form() {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setName('Mark')       // \
    setEmail('m@ex.com')  //  } batched — ONE re-render after all three
    setSaved(true)        // /
    // React does NOT re-render 3 times — it batches and re-renders once ✅
    console.log('re-renders: 1, not 3')
  }

  return <button onClick={handleSave}>Save</button>
}
```

```tsx
// ── React 18: automatic batching everywhere ───────────────────────────────
// Before React 18: only event handlers were batched
// React 18+: all updates are batched, including async

function DataLoader() {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleFetch() {
    setLoading(true)   // \
    setData(null)      //  } React 18: batched even inside async ✅
    setError(null)     // /

    try {
      const result = await fetchData()
      setData(result)     // \
      setLoading(false)   //  } batched in the microtask after await ✅
    } catch (err) {
      setError('Failed')  // \
      setLoading(false)   //  } batched ✅
    }
  }

  return <button onClick={handleFetch}>Fetch</button>
}
```

```tsx
// ── Opting out of batching: flushSync ────────────────────────────────────
// Rarely needed — forces synchronous DOM update immediately
import { flushSync } from 'react-dom'

function SearchWithScroll() {
  const [results, setResults] = useState<string[]>([])
  const listRef = useRef<HTMLUListElement>(null)

  function handleSearch() {
    flushSync(() => {
      setResults(['a', 'b', 'c'])   // DOM update happens NOW (synchronously)
    })
    // Now the DOM reflects new results — we can measure/scroll
    listRef.current?.scrollTo({ top: 0 })
  }
}
// Use flushSync only when you need to read updated DOM layout immediately
// It's an escape hatch — almost never needed in normal code
```

---

## W — Why It Matters

- Batching means "number of re-renders = number of distinct interactions, not number of setState calls" — this is why React apps stay fast even with complex state updates.
- Before React 18, only browser event handlers were batched — `setTimeout`, Promises, and native event listeners triggered one re-render per setter. Understanding this explains why upgrading to React 18 can improve performance.
- `flushSync` is mentioned so you're not surprised when you encounter it in codebases, but it's a clear signal that someone needed synchronous DOM access — a rare requirement.

---

## I — Interview Q&A

### Q: What is batching in React and what changed in React 18?

**A:** Batching is React's strategy of grouping multiple state updates from the same interaction into one re-render. Before React 18, only updates inside React event handlers were batched — updates in `setTimeout`, `fetch` callbacks, or native event listeners each triggered separate re-renders. React 18 introduced **automatic batching**: all updates are batched regardless of where they originate (async callbacks, Promises, timeouts). This means one re-render per logical interaction instead of one per `setState` call, reducing unnecessary renders. You can opt out with `flushSync` when you specifically need a synchronous DOM update, but this is rarely needed.

---

## C — Common Pitfalls + Fix

### ❌ Calling many separate setters and worrying about re-render count

```tsx
// ❌ Concern: "I'm calling 4 setters — that's 4 re-renders, right?"
function handleReset() {
  setName('')
  setEmail('')
  setAge(0)
  setActive(false)
  // WRONG concern — React batches these into ONE re-render ✅
}

// ✅ Group related state if updates always happen together
interface UserFormState {
  name:   string
  email:  string
  age:    number
  active: boolean
}
const [form, setForm] = useState<UserFormState>({ name: '', email: '', age: 0, active: false })

function handleResetGrouped() {
  setForm({ name: '', email: '', age: 0, active: false })  // one setter, cleaner ✅
}
// Both approaches produce one re-render — choose based on readability
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `NetworkStatus` component that shows loading/error/data states. Call three setters in one async handler and explain how many re-renders happen.

### Solution

```tsx
interface Post { id: number; title: string }

function NetworkStatus() {
  const [posts,     setPosts]     = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleLoad() {
    // Re-render 1: three setters batched into one update (React 18)
    setIsLoading(true)
    setPosts([])
    setError(null)

    try {
      const res  = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5')
      const data = await res.json() as Post[]

      // Re-render 2: two setters batched after the await (React 18 automatic batching)
      setPosts(data)
      setIsLoading(false)
    } catch {
      // Re-render 2 (error path): two setters batched
      setError('Failed to load posts')
      setIsLoading(false)
    }
    // Total re-renders: 2 (not 5) — batching at work ✅
  }

  if (isLoading) return <p>Loading…</p>
  if (error)     return <p className="error">{error}</p>

  return (
    <div>
      <button onClick={handleLoad} disabled={isLoading}>
        Load posts
      </button>
      <ul>
        {posts.map(p => <li key={p.id}>{p.title}</li>)}
      </ul>
    </div>
  )
}
```

---

---
