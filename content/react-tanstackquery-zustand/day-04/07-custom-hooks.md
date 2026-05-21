# 7 — Custom Hooks

---

## T — TL;DR

A **custom hook** is a function starting with `use` that calls other hooks. It lets you extract stateful logic — the combination of `useState` + `useEffect` + handlers — into a reusable, testable unit. Components become declarations of intent; hooks become implementations of behaviour.

---

## K — Key Concepts

```tsx
// ── Custom hook anatomy ───────────────────────────────────────────────────
// 1. Name starts with 'use' (required for ESLint rules to apply)
// 2. Can call any other hooks (useState, useEffect, useRef, other custom hooks)
// 3. Returns whatever the consumer needs (value, array, object, function)
// 4. Each component that calls it gets ISOLATED state (not shared)

function useCounter(initialValue = 0, step = 1) {
  const [count, setCount] = useState(initialValue)

  const increment = () => setCount(c => c + step)
  const decrement = () => setCount(c => c - step)
  const reset     = () => setCount(initialValue)

  return { count, increment, decrement, reset }
}

// Usage: two independent counters
function App() {
  const counterA = useCounter(0, 1)
  const counterB = useCounter(100, 10)
  // counterA and counterB are completely independent ✅
}
```

```tsx
// ── Custom hook wrapping useEffect ────────────────────────────────────────
interface FetchState<T> {
  data:      T | null
  isLoading: boolean
  error:     string | null
}

function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null, isLoading: true, error: null
  })

  useEffect(() => {
    setState({ data: null, isLoading: true, error: null })
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(err => {
        if (err.name !== 'AbortError')
          setState({ data: null, isLoading: false, error: err.message })
      })

    return () => controller.abort()
  }, [url])

  return state
}

// Usage: component has zero useEffect, zero state management
interface User { id: number; name: string }

function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading, error } = useFetch<User>(`/api/users/${userId}`)

  if (isLoading) return <Spinner />
  if (error)     return <ErrorMessage message={error} />
  if (!user)     return null
  return <div>{user.name}</div>
}
```

```tsx
// ── Custom hook naming and return shape conventions ────────────────────────
// Return an object when there are multiple named values:
function useFormField(initial: string) {
  const [value,     setValue]  = useState(initial)
  const [isTouched, setTouched] = useState(false)
  const isValid = value.length > 0

  return {
    value,
    isTouched,
    isValid,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
      setTouched(true)
    },
    reset: () => { setValue(initial); setTouched(false) },
  }
}

// Return a tuple [value, setter] when mimicking useState:
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue(v => !v)
  return [value, toggle]
}

const [isOpen, toggleOpen] = useToggle()   // tuple destructuring ✅
```

---

## W — Why It Matters

- Custom hooks are the primary reuse mechanism in React — they replace render props and HOCs for sharing stateful logic. Every repeated `useState` + `useEffect` pattern in your codebase is a custom hook waiting to be extracted.
- Components that use custom hooks become declarative: `const { data, isLoading } = useFetch('/api/users')` reads like a requirement, not an implementation. This is the goal.
- Each call to a custom hook creates **new isolated state** — unlike a utility function, the hook maintains its own state between renders. This makes custom hooks powerful for encapsulating independent UI logic.

---

## I — Interview Q&A

### Q: What is a custom hook and how does it differ from a utility function?

**A:** A custom hook is a function that starts with `use` and can call other React hooks. It encapsulates stateful logic — `useState`, `useEffect`, `useRef`, etc. — and returns whatever the consumer needs. It differs from a utility function in two ways: (1) It can use React's hook system (maintain state, subscribe to lifecycle). A plain utility function cannot. (2) Each component that calls the hook gets its own isolated state instance. Two components calling `useCounter()` have two independent counters. Custom hooks extract the *combination* of state + effects + handlers that repeat across components, without sharing state between those components (for shared state, use Context or Zustand).

---

## C — Common Pitfalls + Fix

### ❌ Thinking custom hooks share state between components

```tsx
// Custom hook definition
function useSharedCounter() {
  const [count, setCount] = useState(0)   // isolated per caller
  return { count, increment: () => setCount(c => c + 1) }
}

// ❌ Expecting both components to share one count
function ComponentA() {
  const { count, increment } = useSharedCounter()  // gets its OWN count = 0
  return <button onClick={increment}>A: {count}</button>
}
function ComponentB() {
  const { count } = useSharedCounter()  // gets its OWN separate count = 0
  return <p>B: {count}</p>
}
// Incrementing A's count does NOT update B ❌ (different state instances)

// ✅ For shared state: lift to common parent or use Context/Zustand
function Parent() {
  const { count, increment } = useSharedCounter()  // one instance ✅
  return (
    <>
      <ComponentA count={count} onIncrement={increment} />
      <ComponentB count={count} />
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Extract a `useDebounce` hook that debounces a value by a given delay. Use it in a `DebouncedSearch` component.

### Solution

```tsx
// useDebounce: returns a debounced version of the value
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    // Set a timer to update debounced value after delay
    const timer = setTimeout(() => setDebounced(value), delayMs)

    // Cleanup: cancel the timer if value changes before delay expires
    return () => clearTimeout(timer)
  }, [value, delayMs])
  // Every time value changes, the previous timer is cancelled
  // and a new one starts. debounced only updates after the user stops typing.

  return debounced
}

// useFetch (from earlier in this subtopic)
// useDebounced search component
interface SearchResult { id: number; title: string }

function DebouncedSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 400)   // waits 400ms after typing stops

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => { setResults(data); setLoading(false) })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false) })
    return () => controller.abort()
  }, [debouncedQuery])   // only fires 400ms after typing stops ✅

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
      />
      {loading && <p>Searching…</p>}
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </div>
  )
}
```

---

---
