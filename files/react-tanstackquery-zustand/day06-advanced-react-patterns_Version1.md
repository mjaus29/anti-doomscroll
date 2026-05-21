
# 📅 Day 6 — Advanced React Patterns

> **Goal:** Master performance hooks, global state, concurrent features, composition, and production-ready patterns.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 6 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | useMemo + useCallback | 12 min |
| 2 | useReducer | 12 min |
| 3 | useContext + Reducer + Context Pattern | 12 min |
| 4 | useDeferredValue + useTransition + startTransition | 12 min |
| 5 | useId + useOptimistic + Optimistic UI | 12 min |
| 6 | Composition + Lazy Loading + Suspense | 12 min |
| 7 | Error Boundaries | 10 min |
| 8 | Accessibility | 10 min |
| 9 | Render Optimization Mindset | 10 min |

---

---

# 1 — useMemo + useCallback

---

## T — TL;DR

`useMemo` memoizes a **computed value**; `useCallback` memoizes a **function reference**. Both re-compute only when dependencies change. Use them to avoid expensive recalculations and to stabilize references passed to memoized children — not as a default for every value or function.

---

## K — Key Concepts

```tsx
import { useMemo, useCallback, memo } from 'react'

// ── useMemo: memoize expensive computations ───────────────────────────────
function ProductList({ products, query, sortKey }: Props) {
  // ❌ Without useMemo: runs on every render (fine for small arrays)
  // const filtered = products.filter(p => p.name.includes(query))

  // ✅ With useMemo: only re-runs when products, query, or sortKey change
  const processed = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a[sortKey] > b[sortKey] ? 1 : -1)
  }, [products, query, sortKey])

  return <ul>{processed.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// ── useMemo for referential stability ────────────────────────────────────
function Dashboard({ userId }: { userId: number }) {
  const [count, setCount] = useState(0)

  // Without useMemo: new object reference every render
  // MemoChild sees "new" config even when userId hasn't changed
  const config = useMemo(
    () => ({ userId, theme: 'dark', limit: 20 }),
    [userId]   // stable when userId is stable ✅
  )

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoChild config={config} />  {/* won't re-render on count change ✅ */}
    </>
  )
}
```

```tsx
// ── useCallback: stabilize function references ────────────────────────────
function ParentList({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<number | null>(null)

  // ❌ New function on every render → MemoItem always re-renders
  // const handleSelect = (id: number) => setSelected(id)

  // ✅ Stable function reference — MemoItem only re-renders when needed
  const handleSelect = useCallback((id: number) => {
    setSelected(id)
  }, [])  // no deps: setSelected is stable

  return (
    <ul>
      {items.map(item => (
        <MemoItem
          key={item.id}
          item={item}
          isSelected={selected === item.id}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  )
}

// MemoItem only re-renders when its specific props change
const MemoItem = memo(function MemoItem(
  { item, isSelected, onSelect }: ItemProps
) {
  return (
    <li
      onClick={() => onSelect(item.id)}
      style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
    >
      {item.name}
    </li>
  )
})
```

```tsx
// ── When NOT to memoize ────────────────────────────────────────────────────
// ❌ Memoizing cheap computations — overhead > benefit
const doubled = useMemo(() => count * 2, [count])   // just write: count * 2

// ❌ Memoizing every handler by default — premature optimization
const handleClick = useCallback(() => setOpen(true), [])
// Only needed when passed to a React.memo child

// ✅ Memoize when:
// 1. Computation is measurably slow (large sort/filter, complex math)
// 2. Function/object is passed to React.memo'd child
// 3. Function/object is a useEffect dependency that would cause infinite loops
```

---

## W — Why It Matters

- `useMemo`/`useCallback` are **not** free — they add memory overhead and comparison cost. Using them everywhere slows React down. Profile first.
- The only reason to `useCallback` a handler is to pass it to a `React.memo` child or include it as an effect dependency — otherwise it's noise.
- Referential stability is the key concept: React.memo bails out based on reference equality (`===`). A new function/object reference on every render defeats memoization even if the value is logically identical.

---

## I — Interview Q&A

### Q: What is the difference between `useMemo` and `useCallback`?

**A:** `useMemo` memoizes the **return value** of a function — it runs the function and caches the result, re-running only when dependencies change. `useCallback` memoizes the **function itself** — it returns the same function reference across renders until dependencies change. `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. Use `useMemo` for expensive computed values (filtered/sorted arrays, complex derived data). Use `useCallback` for functions passed to `React.memo` children or included as `useEffect` dependencies where you need a stable reference. Neither should be used by default — only where profiling confirms a benefit.

---

## C — Common Pitfalls + Fix

### ❌ Memoizing with unstable dependencies — memoization never hits

```tsx
// ❌ Options object created in render = new reference every render = useMemo never caches
function Search({ query }: { query: string }) {
  const options = { caseSensitive: false, limit: 50 }  // new every render ❌

  const results = useMemo(
    () => expensiveSearch(query, options),
    [query, options]   // options changes every render → memo recalculates every render ❌
  )
}

// ✅ Move static config outside component — stable reference
const SEARCH_OPTIONS = { caseSensitive: false, limit: 50 } as const

function SearchFixed({ query }: { query: string }) {
  const results = useMemo(
    () => expensiveSearch(query, SEARCH_OPTIONS),
    [query]   // only re-runs when query changes ✅
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `FilteredTable` with `useMemo` for filtered+sorted rows and `useCallback` for a memoized row-click handler passed to `React.memo` rows.

### Solution

```tsx
interface Row { id: number; name: string; score: number }

const TableRow = memo(function TableRow(
  { row, onClick }: { row: Row; onClick: (id: number) => void }
) {
  console.log('TableRow render:', row.id)
  return (
    <tr onClick={() => onClick(row.id)}>
      <td>{row.name}</td>
      <td>{row.score}</td>
    </tr>
  )
})

function FilteredTable({ rows }: { rows: Row[] }) {
  const [query,  setQuery]  = useState('')
  const [sortAsc,setSortAsc] = useState(true)
  const [selected,setSelected] = useState<number | null>(null)

  const processed = useMemo(() => {
    const filtered = rows.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    )
    return [...filtered].sort((a, b) =>
      sortAsc ? a.score - b.score : b.score - a.score
    )
  }, [rows, query, sortAsc])

  const handleClick = useCallback((id: number) => {
    setSelected(id)
  }, [])

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter…" />
      <button onClick={() => setSortAsc(a => !a)}>
        Sort {sortAsc ? '▲' : '▼'}
      </button>
      <table>
        <tbody>
          {processed.map(row => (
            <TableRow key={row.id} row={row} onClick={handleClick} />
          ))}
        </tbody>
      </table>
      {selected !== null && <p>Selected ID: {selected}</p>}
    </div>
  )
}
```

---

---

# 2 — useReducer

---

## T — TL;DR

`useReducer` manages **complex state logic** through a pure `(state, action) → newState` function. Use it when state has multiple sub-values, transitions depend on previous state, or update logic is complex enough to extract and test independently.

---

## K — Key Concepts

```tsx
import { useReducer } from 'react'

// ── Anatomy ────────────────────────────────────────────────────────────────
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'SET'; payload: number }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT': return state + 1
    case 'DECREMENT': return state - 1
    case 'RESET':     return 0
    case 'SET':       return action.payload
    default:          return state
  }
}

function Counter() {
  const [count, dispatch] = useReducer(reducer, 0)
  return (
    <>
      <p>{count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>–</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </>
  )
}
```

```tsx
// ── Real-world: async fetch state ─────────────────────────────────────────
interface FetchState<T> {
  status:  'idle' | 'loading' | 'success' | 'error'
  data:    T | null
  error:   string | null
}

type FetchAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR';   payload: string }
  | { type: 'RESET' }

function createFetchReducer<T>() {
  return function reducer(
    state: FetchState<T>,
    action: FetchAction<T>
  ): FetchState<T> {
    switch (action.type) {
      case 'FETCH_START':
        return { status: 'loading', data: null, error: null }
      case 'FETCH_SUCCESS':
        return { status: 'success', data: action.payload, error: null }
      case 'FETCH_ERROR':
        return { status: 'error',   data: null, error: action.payload }
      case 'RESET':
        return { status: 'idle',    data: null, error: null }
      default:
        return state
    }
  }
}

interface User { id: number; name: string }

function UserPage({ userId }: { userId: number }) {
  const userReducer = useMemo(() => createFetchReducer<User>(), [])
  const [state, dispatch] = useReducer(userReducer, {
    status: 'idle', data: null, error: null
  })

  useEffect(() => {
    dispatch({ type: 'FETCH_START' })
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', payload: err.message }))
  }, [userId])

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error')   return <p>Error: {state.error}</p>
  if (!state.data)                return null
  return <h1>{state.data.name}</h1>
}
```

```tsx
// ── useState vs useReducer ────────────────────────────────────────────────
// useState:    1–2 independent values, simple boolean/string/number updates
// useReducer:  complex object state, multiple sub-fields change together,
//              next state depends on previous in complex ways,
//              logic you want to test in isolation (pure function)

// Signal to switch to useReducer:
// - 3+ useState calls that always change together in handlers
// - Complex if/else logic inside event handlers
// - "This transition should only be allowed from this state"
```

---

## W — Why It Matters

- `useReducer` centralizes all state transitions in one pure function — testable without React, without rendering anything.
- TypeScript discriminated unions for actions (`{ type: 'INCREMENT' } | { type: 'SET'; payload: number }`) give exhaustive switch checking — adding a new action type causes a compile error if the reducer doesn't handle it.
- The reducer pattern scales — the same mental model is Redux, Zustand's `create` with actions, and XState's state machines. Learning `useReducer` well makes all of them intuitive.

---

## I — Interview Q&A

### Q: When would you choose `useReducer` over `useState`?

**A:** `useReducer` is better when: (1) State is an object with multiple fields that change together — one `dispatch` replaces multiple `setState` calls. (2) Next state depends on the current state in complex ways — reducer receives previous state directly, no stale closure risk. (3) You want to test state logic in isolation — the reducer is a pure function, testable with `expect(reducer(state, action)).toEqual(newState)`. (4) State transitions should be constrained — you can add guard logic in the reducer to prevent illegal transitions. The event model (`dispatch({ type: 'SUBMIT' })`) also communicates intent more clearly than `setIsSubmitting(true); setErrors({}); setData(null)`.

---

## C — Common Pitfalls + Fix

### ❌ Mutating state in the reducer

```tsx
// ❌ Mutating state directly — React doesn't detect the change
function badReducer(state: Todo[], action: Action): Todo[] {
  if (action.type === 'TOGGLE') {
    const todo = state.find(t => t.id === action.id)
    if (todo) todo.done = !todo.done   // ❌ mutates original
    return state   // same reference — React bails out
  }
  return state
}

// ✅ Return a new array/object
function goodReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'TOGGLE':
      return state.map(t =>
        t.id === action.id ? { ...t, done: !t.done } : t
      )
    case 'ADD':
      return [...state, { id: Date.now(), text: action.text, done: false }]
    case 'REMOVE':
      return state.filter(t => t.id !== action.id)
    default:
      return state
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a multi-step form reducer with steps 1–3, field updates, validation errors, and submit state. All state lives in one `useReducer`.

### Solution

```tsx
interface FormData { name: string; email: string; plan: 'free' | 'pro' }
interface FormState {
  step:    1 | 2 | 3 | 'submitted'
  data:    FormData
  errors:  Partial<Record<keyof FormData, string>>
  loading: boolean
}
type FormAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SET_FIELD'; field: keyof FormData; value: string }
  | { type: 'SET_ERRORS'; errors: FormState['errors'] }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE' }

const initialState: FormState = {
  step: 1, data: { name: '', email: '', plan: 'free' }, errors: {}, loading: false
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, step: (state.step === 3 ? 3 : state.step + 1) as FormState['step'] }
    case 'BACK':
      return { ...state, step: (state.step === 1 ? 1 : (state.step as number) - 1) as FormState['step'] }
    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value }, errors: {} }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors }
    case 'SUBMIT_START':
      return { ...state, loading: true }
    case 'SUBMIT_DONE':
      return { ...state, loading: false, step: 'submitted' }
    default:
      return state
  }
}

function MultiStepForm() {
  const [state, dispatch] = useReducer(formReducer, initialState)

  async function handleSubmit() {
    dispatch({ type: 'SUBMIT_START' })
    await submitForm(state.data)
    dispatch({ type: 'SUBMIT_DONE' })
  }

  if (state.step === 'submitted') return <p>✅ Submitted!</p>
  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
      <p>Step {state.step} of 3</p>
      {state.step === 1 && (
        <input value={state.data.name}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })} />
      )}
      {state.step === 2 && (
        <input value={state.data.email}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })} />
      )}
      {state.step === 3 && (
        <select value={state.data.plan}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'plan', value: e.target.value })}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      )}
      {state.step > 1 && (
        <button type="button" onClick={() => dispatch({ type: 'BACK' })}>Back</button>
      )}
      {state.step < 3
        ? <button type="button" onClick={() => dispatch({ type: 'NEXT' })}>Next</button>
        : <button type="submit" disabled={state.loading}>Submit</button>
      }
    </form>
  )
}
```

---

---

# 3 — useContext + Reducer + Context Pattern

---

## T — TL;DR

`useContext` reads a value from a React context without prop drilling. Pair it with `useReducer` for global state: the **context provides both the state value and the dispatch function** to any component in the tree. This is the lightweight Redux.

---

## K — Key Concepts

```tsx
import { createContext, useContext, useReducer } from 'react'

// ── Step 1: create typed contexts ─────────────────────────────────────────
interface AuthState { user: User | null; isLoading: boolean }
type AuthAction =
  | { type: 'LOGIN';  payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }

const AuthStateContext    = createContext<AuthState | null>(null)
const AuthDispatchContext = createContext<React.Dispatch<AuthAction> | null>(null)

// ── Step 2: reducer ────────────────────────────────────────────────────────
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':       return { ...state, user: action.payload, isLoading: false }
    case 'LOGOUT':      return { ...state, user: null }
    case 'SET_LOADING': return { ...state, isLoading: action.payload }
    default:            return state
  }
}

// ── Step 3: provider ───────────────────────────────────────────────────────
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, isLoading: false })

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  )
  // Separate state and dispatch contexts:
  // Components that only dispatch don't re-render when state changes ✅
}

// ── Step 4: custom hooks (never expose raw useContext) ────────────────────
function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext)
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider')
  return ctx
}
function useAuthDispatch(): React.Dispatch<AuthAction> {
  const ctx = useContext(AuthDispatchContext)
  if (!ctx) throw new Error('useAuthDispatch must be used within AuthProvider')
  return ctx
}
```

```tsx
// ── Usage at any depth — no prop drilling ─────────────────────────────────
function Header() {
  const { user }    = useAuthState()
  const dispatch    = useAuthDispatch()

  return (
    <header>
      {user
        ? <button onClick={() => dispatch({ type: 'LOGOUT' })}>{user.name}</button>
        : <a href="/login">Login</a>
      }
    </header>
  )
}

function UserSettings() {
  const { user, isLoading } = useAuthState()
  if (isLoading) return <Spinner />
  if (!user)     return <p>Not logged in</p>
  return <form>{/* settings form */}</form>
}
// Header and UserSettings are at different depths — no prop drilling ✅
```

```tsx
// ── When Context is NOT the right tool ────────────────────────────────────
// ❌ Context for frequently changing values (e.g. cursor position, scroll)
//    → every consumer re-renders on every change
// ✅ Context for: auth user, theme, locale, feature flags
//    (values that change rarely, consumed by many components)
// For high-frequency shared state → Zustand / useSyncExternalStore (Day 5)
```

---

## W — Why It Matters

- Separating `StateContext` and `DispatchContext` is the key performance insight — a button that only dispatches actions won't re-render when state changes, because it only subscribes to the dispatch context (which never changes).
- The custom hook guard (`if (!ctx) throw new Error(...)`) gives a clear error message when the hook is used outside its provider — far better than a cryptic `Cannot read properties of null`.
- Context + Reducer covers 80% of global state needs without adding a library. When you need cross-component state, start here before reaching for Zustand.

---

## I — Interview Q&A

### Q: How do you prevent unnecessary re-renders when using Context?

**A:** Split context by how frequently values change and which components read them. (1) **Separate state and dispatch** — dispatch function is stable, so components that only call dispatch don't re-render when state changes. (2) **Split contexts by domain** — don't put all global state in one context. A `ThemeContext` and `AuthContext` mean theme changes don't re-render auth consumers. (3) **Memoize the context value** — if you pass an object as value, wrap it in `useMemo`. (4) For high-frequency state (counters, input values), use a state manager like Zustand instead of Context — Zustand has built-in selector-based subscription so components only re-render when their slice changes.

---

## C — Common Pitfalls + Fix

### ❌ Passing a new object literal as context value every render

```tsx
// ❌ New object on every render — ALL consumers re-render every time
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>  {/* new object ❌ */}
      {children}
    </ThemeContext.Provider>
  )
}

// ✅ Memoize the value object — only new reference when theme changes
function ThemeProviderFixed({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return (
    <ThemeContext.Provider value={value}>   {/* stable when theme unchanged ✅ */}
      {children}
    </ThemeContext.Provider>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `NotificationContext` with reducer: add/dismiss notifications. Any component can add; a `NotificationList` renders them all.

### Solution

```tsx
interface Notification { id: string; message: string; type: 'info' | 'success' | 'error' }
type NotifAction =
  | { type: 'ADD';     payload: Omit<Notification, 'id'> }
  | { type: 'DISMISS'; payload: string }

const NotifStateCtx    = createContext<Notification[]>([])
const NotifDispatchCtx = createContext<React.Dispatch<NotifAction>>(() => {})

function notifReducer(state: Notification[], action: NotifAction): Notification[] {
  switch (action.type) {
    case 'ADD':
      return [...state, { ...action.payload, id: crypto.randomUUID() }]
    case 'DISMISS':
      return state.filter(n => n.id !== action.payload)
    default:
      return state
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, dispatch] = useReducer(notifReducer, [])
  return (
    <NotifStateCtx.Provider value={notifications}>
      <NotifDispatchCtx.Provider value={dispatch}>
        {children}
      </NotifDispatchCtx.Provider>
    </NotifStateCtx.Provider>
  )
}

export function useNotifications()         { return useContext(NotifStateCtx) }
export function useNotificationDispatch()  { return useContext(NotifDispatchCtx) }

export function useNotify() {
  const dispatch = useNotificationDispatch()
  return useCallback((message: string, type: Notification['type'] = 'info') => {
    dispatch({ type: 'ADD', payload: { message, type } })
  }, [dispatch])
}

function NotificationList() {
  const notifications = useNotifications()
  const dispatch      = useNotificationDispatch()
  return (
    <ul style={{ position: 'fixed', top: 16, right: 16 }}>
      {notifications.map(n => (
        <li key={n.id} style={{ background: n.type === 'error' ? '#fee' : '#efe' }}>
          {n.message}
          <button onClick={() => dispatch({ type: 'DISMISS', payload: n.id })}>✕</button>
        </li>
      ))}
    </ul>
  )
}

function BuyButton({ product }: { product: Product }) {
  const notify = useNotify()
  return (
    <button onClick={() => notify(`Added ${product.name} to cart`, 'success')}>
      Buy
    </button>
  )
}
```

---

---

# 4 — useDeferredValue + useTransition + startTransition

---

## T — TL;DR

React 18 concurrent features let you mark updates as **non-urgent** so urgent UI (input responsiveness) stays smooth. `useTransition` wraps state updates; `useDeferredValue` wraps a value. Both defer expensive re-renders until the browser is idle.

---

## K — Key Concepts

```tsx
import { useTransition, useDeferredValue, startTransition } from 'react'

// ── The problem: slow render blocks input ─────────────────────────────────
// User types → query updates → 10,000-item list re-renders → input lags
// ❌ Without concurrent features: every keystroke waits for the slow render

// ── useTransition: mark a state update as non-urgent ─────────────────────
function SearchPage() {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<string[]>([])
  const [isPending, startTransitionFn] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)          // urgent: input stays responsive ✅

    startTransitionFn(() => {
      setResults(expensiveFilter(e.target.value))  // non-urgent: can be interrupted
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <p>Updating…</p>}   {/* show during transition ✅ */}
      <ResultList results={results} />
    </>
  )
}
```

```tsx
// ── useDeferredValue: defer a prop/value you don't control ────────────────
// Use when you CAN'T wrap the state update (e.g. it's from a parent)
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery   // true while deferred value lags

  const results = useMemo(
    () => expensiveFilter(deferredQuery),
    [deferredQuery]   // only re-runs when deferred query updates
  )

  return (
    <ul style={{ opacity: isStale ? 0.5 : 1 }}>   {/* dim while stale ✅ */}
      {results.map((r, i) => <li key={i}>{r}</li>)}
    </ul>
  )
}

function ParentSearch() {
  const [query, setQuery] = useState('')
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults query={query} />   {/* SearchResults defers internally ✅ */}
    </>
  )
}
```

```tsx
// ── startTransition: the standalone function ──────────────────────────────
import { startTransition } from 'react'

// Use outside components — e.g. in router callbacks
function handleNavigation(path: string) {
  startTransition(() => {
    setCurrentRoute(path)   // route change is non-urgent
  })
}

// ── Choosing: useTransition vs useDeferredValue ───────────────────────────
// useTransition: you OWN the state update (can wrap it in startTransition)
//   → gives isPending flag for loading UI
// useDeferredValue: you DON'T own the update (it's a prop, or from parent)
//   → just pass the value, React defers the render
```

---

## W — Why It Matters

- Input responsiveness is a direct UX metric — users tolerate 10ms delay on typing before noticing lag. A 100ms expensive re-render that blocks every keystroke is felt immediately.
- `isPending` from `useTransition` enables proper loading UX: you can show a spinner or dim the stale results while the transition processes, preventing blank flashes.
- `useDeferredValue` is the consumer-side tool — when you receive a fast-changing prop from a parent you don't control, defer the expensive computation that depends on it.

---

## I — Interview Q&A

### Q: What is the difference between `useTransition` and `useDeferredValue`?

**A:** Both defer expensive renders, but from different positions. `useTransition` gives you a `startTransition` wrapper and `isPending` flag — you wrap the **state update** that triggers the expensive render. Use it when you own the state setter. `useDeferredValue` takes a value and returns a lagging copy — React re-renders the slow parts with the old value while showing the fast parts (like the input) with the new value. Use it when you receive a fast-changing **value as a prop** or can't modify the update code. `useTransition` also gives the `isPending` flag which `useDeferredValue` lacks — making it better for showing loading states during the transition.

---

## C — Common Pitfalls + Fix

### ❌ Wrapping urgent UI updates in `startTransition`

```tsx
// ❌ Input value itself wrapped in transition — input becomes laggy
function BadSearch() {
  const [query, setQuery] = useState('')
  const [, startT] = useTransition()

  return (
    <input
      value={query}
      onChange={e => startT(() => setQuery(e.target.value))}  // ❌ input update is urgent!
    />
  )
}

// ✅ Only the slow downstream update is non-urgent
function GoodSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<string[]>([])
  const [pending, startT]     = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)           // urgent — instant input response ✅
    startT(() => setResults(expensiveFilter(e.target.value)))  // non-urgent ✅
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {pending && <span>…</span>}
      <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a tab switcher where each tab renders a `SlowList` of 2000 items. Use `useTransition` so the tab buttons remain responsive while the list renders.

### Solution

```tsx
const SlowList = memo(function SlowList({ query }: { query: string }) {
  const items = Array.from({ length: 2000 }, (_, i) => `Item ${i}: ${query}`)
  return <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
})

const TABS = ['All', 'Active', 'Archived'] as const
type Tab = typeof TABS[number]

function TabSwitcher() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [isPending, startT]       = useTransition()

  function handleTabChange(tab: Tab) {
    startT(() => setActiveTab(tab))   // non-urgent ✅ — tabs click instantly
  }

  return (
    <div>
      <div role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => handleTabChange(tab)}
            style={{
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              opacity:    isPending ? 0.7 : 1,
            }}
          >
            {tab}
          </button>
        ))}
        {isPending && <span> ⏳</span>}
      </div>
      <SlowList query={activeTab} />
    </div>
  )
}
```

---

---

# 5 — useId + useOptimistic + Optimistic UI

---

## T — TL;DR

`useId` generates stable unique IDs for accessibility attributes (no hydration mismatch). `useOptimistic` instantly shows a predicted UI state while an async operation completes — then reconciles with the real result. Together they cover two key production patterns: accessible forms and instant-feeling UIs.

---

## K — Key Concepts

```tsx
import { useId, useOptimistic } from 'react'

// ── useId: server-safe unique IDs ─────────────────────────────────────────
// ❌ Math.random() or counter — mismatches between server and client render
function BadInput() {
  const id = `input-${Math.random()}`  // different on server vs client ❌
  return <><label htmlFor={id}>Name</label><input id={id} /></>
}

// ✅ useId — same value on server and client
function LabeledInput({ label }: { label: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  )
}

// One useId can generate multiple related IDs with a suffix
function RadioGroup({ name, options }: { name: string; options: string[] }) {
  const baseId = useId()
  return (
    <fieldset>
      <legend>{name}</legend>
      {options.map(option => {
        const id = `${baseId}-${option}`
        return (
          <div key={option}>
            <input type="radio" id={id} name={name} value={option} />
            <label htmlFor={id}>{option}</label>
          </div>
        )
      })}
    </fieldset>
  )
}
```

```tsx
// ── useOptimistic: instant UI with async reconciliation ──────────────────
interface Message { id: string; text: string; status: 'sent' | 'pending' | 'error' }

function MessageThread({ messages, onSend }:
  { messages: Message[]; onSend: (text: string) => Promise<Message> }) {

  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    // Reducer: (currentMessages, optimisticValue) → new state
    (current, newMsg: Message) => [...current, newMsg]
  )

  async function handleSend(text: string) {
    const tempMsg: Message = {
      id: crypto.randomUUID(), text, status: 'pending'
    }
    addOptimistic(tempMsg)          // instantly shows message as pending ✅
    await onSend(text)              // actual API call
    // When onSend resolves: React replaces optimistic state with real messages ✅
  }

  return (
    <ul>
      {optimisticMessages.map(msg => (
        <li
          key={msg.id}
          style={{ opacity: msg.status === 'pending' ? 0.6 : 1 }}
        >
          {msg.text}
          {msg.status === 'pending' && ' (sending…)'}
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// ── Optimistic UI: the pattern without useOptimistic ─────────────────────
// For React versions or cases where useOptimistic isn't available:
function OptimisticLike({ postId, initialLikes }: { postId: number; initialLikes: number }) {
  const [likes,      setLikes]      = useState(initialLikes)
  const [isLiked,    setIsLiked]    = useState(false)
  const [isPending,  setIsPending]  = useState(false)

  async function handleLike() {
    // Optimistic update
    const next = !isLiked
    setIsLiked(next)
    setLikes(l => l + (next ? 1 : -1))
    setIsPending(true)

    try {
      await likePost(postId, next)
    } catch {
      // Rollback on error
      setIsLiked(!next)
      setLikes(l => l + (next ? -1 : 1))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      {isLiked ? '❤️' : '🤍'} {likes}
    </button>
  )
}
```

---

## W — Why It Matters

- `useId` is non-negotiable for SSR (Next.js) — using `Math.random()` or module-level counters for IDs causes hydration mismatches that silently break React's reconciliation.
- Optimistic UI is the most impactful UX improvement for CRUD operations — a like button that responds in 0ms feels dramatically better than one that waits 200ms for the server, even though the network request is identical.
- Always roll back on error — optimistic UI without error handling is worse than no optimistic UI (the UI shows a false state that never corrects).

---

## I — Interview Q&A

### Q: What is optimistic UI and what are the risks of implementing it?

**A:** Optimistic UI means immediately updating the UI to reflect the expected outcome of an async operation, before the server confirms it. For example, instantly showing a message as "sent" before the network request completes. The benefit is a 0ms perceived latency. The risks: (1) **Server rejects the action** — you must roll back the UI to the previous state and show an error. (2) **Race conditions** — two rapid actions can produce conflicting optimistic states. (3) **Complex rollback** — if the operation was part of a chain, rolling back one step may require rolling back several. `useOptimistic` handles the reconciliation automatically when the async operation completes, making the rollback pattern cleaner than manual state management.

---

## C — Common Pitfalls + Fix

### ❌ No rollback on optimistic update failure

```tsx
// ❌ Like button: optimistic update, no rollback
function LikeBad({ postId }: { postId: number }) {
  const [liked, setLiked] = useState(false)

  async function handleLike() {
    setLiked(true)    // instant update
    await likePost(postId)  // what if this throws? liked stays true ❌
  }
  return <button onClick={handleLike}>{liked ? '❤️' : '🤍'}</button>
}

// ✅ Always rollback on failure
function LikeGood({ postId }: { postId: number }) {
  const [liked, setLiked] = useState(false)

  async function handleLike() {
    const prev = liked
    setLiked(!prev)   // optimistic
    try {
      await likePost(postId, !prev)
    } catch {
      setLiked(prev)  // ✅ rollback to previous state
    }
  }
  return <button onClick={handleLike}>{liked ? '❤️' : '🤍'}</button>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TodoList` with `useOptimistic` — adding a todo appears instantly with a "saving" opacity while the server call is in flight.

### Solution

```tsx
interface Todo { id: string; text: string; pending?: boolean }

async function saveTodo(text: string): Promise<Todo> {
  await new Promise(r => setTimeout(r, 1000))   // simulated delay
  return { id: crypto.randomUUID(), text }
}

function OptimisticTodoList() {
  const [todos, setTodos]             = useState<Todo[]>([])
  const [input, setInput]             = useState('')
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (current, newTodo: Todo) => [...current, newTodo]
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    addOptimistic({ id: 'temp', text, pending: true })  // instant ✅
    const saved = await saveTodo(text)
    setTodos(prev => [...prev, saved])   // replace optimistic with real ✅
  }

  return (
    <div>
      <form onSubmit={handleAdd}>
        <input value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {optimisticTodos.map((todo, i) => (
          <li key={todo.id + i} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text}{todo.pending && ' ✦'}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

---

# 6 — Composition + Lazy Loading + Suspense

---

## T — TL;DR

**Composition** builds complex UI from small, focused components. **Lazy loading** (`React.lazy`) defers loading a component's bundle until it's needed. **Suspense** shows a fallback while the component loads. Together they enable fast initial load and clean code splitting.

---

## K — Key Concepts

```tsx
// ── Composition patterns ──────────────────────────────────────────────────
// 1. children — nest content
function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return <div className="card"><h3>{title}</h3>{children}</div>
}

// 2. Render props — pass rendering logic as a prop
function DataProvider<T>({
  data, renderItem
}: { data: T[]; renderItem: (item: T, i: number) => React.ReactNode }) {
  return <>{data.map((item, i) => renderItem(item, i))}</>
}

// 3. Compound components — shared implicit state
const Tabs = {
  Root: function TabsRoot({ children, defaultTab }: {
    children: React.ReactNode; defaultTab: string
  }) {
    const [active, setActive] = useState(defaultTab)
    return (
      <TabsContext.Provider value={{ active, setActive }}>
        <div className="tabs">{children}</div>
      </TabsContext.Provider>
    )
  },
  Tab: function Tab({ value, children }: { value: string; children: React.ReactNode }) {
    const { active, setActive } = useContext(TabsContext)!
    return (
      <button aria-selected={active === value} onClick={() => setActive(value)}>
        {children}
      </button>
    )
  },
  Panel: function Panel({ value, children }: { value: string; children: React.ReactNode }) {
    const { active } = useContext(TabsContext)!
    return active === value ? <div>{children}</div> : null
  },
}
// Usage: <Tabs.Root defaultTab="a"><Tabs.Tab value="a">A</Tabs.Tab><Tabs.Panel value="a">…</Tabs.Panel></Tabs.Root>
```

```tsx
import { lazy, Suspense } from 'react'

// ── React.lazy: code-split at component level ─────────────────────────────
// Bundle is loaded only when the component is first rendered
const HeavyChart   = lazy(() => import('./HeavyChart'))
const AdminPanel   = lazy(() => import('./AdminPanel'))
const SettingsPage = lazy(() => import('./SettingsPage'))

// ── Suspense: show fallback while lazy component loads ────────────────────
function App() {
  const [showChart, setShowChart]   = useState(false)
  const [isAdmin,   setIsAdmin]     = useState(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>

      {/* Chart bundle downloads only on first show ✅ */}
      <Suspense fallback={<div>Loading chart…</div>}>
        {showChart && <HeavyChart />}
      </Suspense>

      {/* Admin panel bundle downloads only if isAdmin ✅ */}
      <Suspense fallback={<Spinner />}>
        {isAdmin && <AdminPanel />}
      </Suspense>
    </div>
  )
}
```

```tsx
// ── Route-based code splitting (common in Next.js / React Router) ─────────
// pages/DashboardPage is only loaded when the user navigates there
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage   = lazy(() => import('./pages/ProfilePage'))

function Router({ route }: { route: string }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {route === '/dashboard' && <DashboardPage />}
      {route === '/profile'   && <ProfilePage />}
    </Suspense>
  )
}

// ── Suspense boundaries: granular vs top-level ────────────────────────────
// ❌ One top-level boundary hides ALL content while ANY part loads
// ✅ Nest boundaries so each section shows its own fallback
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart />          {/* own boundary — others stay visible ✅ */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <TransactionTable />
      </Suspense>
    </div>
  )
}
```

---

## W — Why It Matters

- Code splitting with `React.lazy` + `Suspense` is the easiest way to improve initial page load — a heavy chart library (400KB) not loaded until the user clicks "Show Chart" means a faster first paint.
- Granular Suspense boundaries produce better UX than one top-level boundary — users see content progressively as each part loads instead of waiting for everything.
- Compound components (`Tabs.Root` + `Tabs.Tab` + `Tabs.Panel`) share implicit state through context without the consumer needing to manage it — the cleanest API for multi-part UI patterns.

---

## I — Interview Q&A

### Q: What is `React.lazy` and how does `Suspense` work with it?

**A:** `React.lazy` lets you define a component with a dynamic import. React defers loading the component's JavaScript bundle until the component first renders. When the lazy component is about to render and its bundle hasn't loaded yet, React looks up the tree for the nearest `<Suspense>` boundary and renders its `fallback` prop instead. Once the bundle loads, React re-renders with the actual component. This is code splitting at the component level — the browser only downloads the code when needed. For route-based apps, each route can be a lazy component so users only download the code for pages they visit.

---

## C — Common Pitfalls + Fix

### ❌ Defining lazy components inside other components

```tsx
// ❌ New lazy() call every render — re-downloads the bundle every render
function ParentBad() {
  const LazyChild = lazy(() => import('./Child'))   // ❌ inside render
  return <Suspense fallback={null}><LazyChild /></Suspense>
}

// ✅ Always define lazy components at module level
const LazyChild = lazy(() => import('./Child'))   // ✅ defined once

function ParentGood() {
  return <Suspense fallback={<p>Loading…</p>}><LazyChild /></Suspense>
}

// ❌ No Suspense boundary — React throws an unhandled promise error
function NoSuspense() {
  return <LazyChild />  // ❌ will crash without a Suspense ancestor
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a settings page with three tabs: Profile, Notifications, Security. Each tab panel is a `lazy()` component wrapped in its own Suspense boundary. Switching tabs loads the panel on demand.

### Solution

```tsx
const ProfilePanel      = lazy(() => import('./ProfilePanel'))
const NotificationsPanel = lazy(() => import('./NotificationsPanel'))
const SecurityPanel     = lazy(() => import('./SecurityPanel'))

type SettingsTab = 'profile' | 'notifications' | 'security'

const TAB_COMPONENTS: Record<SettingsTab, React.LazyExoticComponent<() => JSX.Element>> = {
  profile:       ProfilePanel,
  notifications: NotificationsPanel,
  security:      SecurityPanel,
}

function SkeletonPanel() {
  return (
    <div className="skeleton-panel">
      {[1,2,3].map(i => <div key={i} className="skeleton-line" />)}
    </div>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [isPending, startT]       = useTransition()
  const ActivePanel = TAB_COMPONENTS[activeTab]

  return (
    <div className="settings">
      <nav>
        {(Object.keys(TAB_COMPONENTS) as SettingsTab[]).map(tab => (
          <button
            key={tab}
            aria-selected={activeTab === tab}
            onClick={() => startT(() => setActiveTab(tab))}   // non-urgent ✅
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <Suspense fallback={<SkeletonPanel />}>
        <ActivePanel />   {/* loaded on demand, each tab has its own boundary ✅ */}
      </Suspense>
    </div>
  )
}
```

---

---

# 7 — Error Boundaries

---

## T — TL;DR

An **Error Boundary** is a class component that catches JavaScript errors in its child tree during render, prevents a blank white screen, and shows a fallback UI. They must be class components — there is no hook equivalent. Use `react-error-boundary` for a modern API.

---

## K — Key Concepts

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

// ── Manual class-based error boundary ────────────────────────────────────
interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  children: ReactNode
}
interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }   // triggers fallback render
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Boundary caught:', error, info.componentStack)
    // Send to error monitoring: Sentry, Datadog, etc.
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      const { fallback } = this.props
      return typeof fallback === 'function'
        ? fallback(this.state.error, this.reset)
        : fallback
    }
    return this.props.children
  }
}
```

```tsx
// ── react-error-boundary: the production-ready solution ──────────────────
// npm install react-error-boundary
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({
  error, resetErrorBoundary
}: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  return (
    // App-level boundary: last resort
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Header />
      {/* Feature-level boundary: isolates a section */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <Dashboard />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  )
}
```

```tsx
// ── What error boundaries DON'T catch ────────────────────────────────────
// ❌ Event handlers (use try/catch there)
// ❌ Async code (useEffect, setTimeout, fetch — handle in the async code)
// ❌ Server-side rendering
// ❌ Errors in the boundary itself
//
// ✅ What they DO catch:
// ✅ Errors during render
// ✅ Errors in lifecycle methods
// ✅ Errors in constructors of child components
```

---

## W — Why It Matters

- Without error boundaries, an unhandled render error crashes the **entire React tree** — the user sees a blank page. A boundary limits the blast radius to just the section that errored.
- `componentDidCatch` is the integration point for error monitoring services — every production app should log caught errors to Sentry/Datadog with `componentStack` for tracing.
- Granular boundaries (one per major feature/section) are better than one global boundary — a widget error shouldn't blank out the entire page.

---

## I — Interview Q&A

### Q: What are error boundaries, what do they catch, and what don't they catch?

**A:** Error boundaries are class components that catch render-time errors in their child tree. They must be classes because the two lifecycle methods — `getDerivedStateFromError` (to switch to fallback UI) and `componentDidCatch` (to log the error) — have no hook equivalents. They catch: errors during rendering, errors in class lifecycle methods, and errors in constructors. They do NOT catch: errors in event handlers (use `try/catch`), errors in async code like `useEffect` or `fetch` callbacks (handle with state), or server-side rendering errors. The `react-error-boundary` package provides a function component wrapper with a convenient API including a `resetErrorBoundary` callback to recover without a full page reload.

---

## C — Common Pitfalls + Fix

### ❌ One global boundary with no recovery path

```tsx
// ❌ One top-level boundary — entire app goes dark on any render error
function AppBad() {
  return (
    <ErrorBoundary fallback={<p>App crashed. Refresh the page.</p>}>
      <EntireApp />   {/* any error → entire app → blank ❌ */}
    </ErrorBoundary>
  )
}

// ✅ Granular boundaries with reset + isolated sections
function AppGood() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <Header />   {/* header errors don't blank the body ✅ */}
      <ErrorBoundary
        FallbackComponent={({ resetErrorBoundary }) => (
          <div>Widget failed. <button onClick={resetErrorBoundary}>Retry</button></div>
        )}
      >
        <StockWidget />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <NewsFeed />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `AsyncErrorBoundary` that catches BOTH render errors (via boundary) and async errors (via a `useError` throw hook).

### Solution

```tsx
import { ErrorBoundary } from 'react-error-boundary'

// Hook to throw async errors into the nearest boundary
function useAsyncError() {
  const [, setError] = useState<Error>()
  return useCallback((error: Error) => {
    setError(() => { throw error })
  }, [])
}

function WeatherWidget({ city }: { city: string }) {
  const [weather,    setWeather]    = useState<string | null>(null)
  const [isLoading,  setIsLoading]  = useState(true)
  const throwError = useAsyncError()   // bridge async errors to boundary

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/weather?city=${city}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setWeather(d.description); setIsLoading(false) })
      .catch(err => throwError(err))   // ✅ sends async error to boundary
  }, [city, throwError])

  if (isLoading) return <Spinner />
  return <p>Weather in {city}: {weather}</p>
}

function WeatherSection({ city }: { city: string }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div>
          <p>Failed to load weather: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      <WeatherWidget city={city} />
    </ErrorBoundary>
  )
}
```

---

---

# 8 — Accessibility

---

## T — TL;DR

Accessible React means: semantic HTML, correct ARIA attributes, keyboard navigation, focus management, and live region announcements. These aren't extras — they're requirements for production code and are tested in technical interviews.

---

## K — Key Concepts

```tsx
// ── Semantic HTML first ───────────────────────────────────────────────────
// ❌ div soup
<div onClick={handleClick} className="button">Submit</div>

// ✅ Native semantics — keyboard, focus, ARIA free
<button type="submit">Submit</button>
<nav><ul><li><a href="/about">About</a></li></ul></nav>
<main><article><h1>Title</h1></article></main>
```

```tsx
// ── ARIA: label, describe, live regions ──────────────────────────────────
// Accessible name for interactive elements
<button aria-label="Close dialog">✕</button>
<input aria-label="Search products" type="search" />
<input id="email" aria-describedby="email-hint" type="email" />
<p id="email-hint">We'll never share your email</p>

// State communication
<button aria-expanded={isOpen} aria-controls="menu">Menu</button>
<ul id="menu" hidden={!isOpen}>…</ul>

<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
</div>

// Live regions: announce async changes to screen readers
<p aria-live="polite" aria-atomic="true">
  {message}   {/* screen reader announces when message changes ✅ */}
</p>
<p role="status">{statusMessage}</p>
<p role="alert">{errorMessage}</p>   {/* urgent — interrupts screen reader */}
```

```tsx
// ── Focus management ───────────────────────────────────────────────────────
// Trap focus inside modal
function Modal({ isOpen, onClose, children }: ModalProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) firstFocusRef.current?.focus()   // move focus into modal ✅
  }, [isOpen])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null
  return (
    <div role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
      <button ref={firstFocusRef} onClick={onClose} aria-label="Close">✕</button>
      {children}
    </div>
  )
}

// ── Keyboard navigation ───────────────────────────────────────────────────
function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li role="menuitem">
      <button
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick()   // redundant but clear
          if (e.key === 'ArrowDown') focusNext()
          if (e.key === 'ArrowUp')   focusPrev()
        }}
      >
        {label}
      </button>
    </li>
  )
}
```

---

## W — Why It Matters

- Accessibility bugs are legal liability in many jurisdictions (ADA, WCAG). An inaccessible product is a defect, not a nice-to-have improvement.
- Screen reader users, keyboard-only users, and users with motor impairments all rely on these patterns — they represent 15–20% of users globally.
- Interviews at FAANG and top startups include a11y questions specifically — "make this button accessible" or "how would you manage focus in a modal?" are common.

---

## I — Interview Q&A

### Q: How do you manage focus when a modal opens and closes?

**A:** Three steps: (1) **On open** — move focus to the first interactive element inside the modal (or the modal container itself with `tabIndex={-1}`). This informs screen reader users they're in the modal. (2) **Trap focus** — prevent Tab/Shift+Tab from leaving the modal while it's open. Query all focusable elements inside and cycle through them. (3) **On close** — return focus to the element that triggered the modal (usually a button). Store a `ref` to the trigger before opening. Not returning focus leaves keyboard users disoriented — they have to tab from the top of the page to find their place. The `Escape` key should always close the modal per ARIA Dialog pattern.

---

## C — Common Pitfalls + Fix

### ❌ Clickable divs instead of buttons — breaks keyboard access

```tsx
// ❌ div with onClick — not focusable, no keyboard event, no semantics
<div onClick={handleDelete} className="delete-btn">Delete</div>
// Tab doesn't reach it, Enter doesn't activate it, screen readers don't announce it

// ❌ Missing label on icon button
<button onClick={onClose}>✕</button>  // screen reader says "button X" — not helpful

// ✅ Native button + aria-label
<button onClick={handleDelete} className="delete-btn">Delete</button>

// ✅ Icon button with accessible name
<button onClick={onClose} aria-label="Close dialog" type="button">
  <CloseIcon aria-hidden="true" />   {/* hide icon from screen reader — label covers it */}
</button>

// ✅ If you MUST use a div (third-party constraint):
<div
  role="button"
  tabIndex={0}
  onClick={handleDelete}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleDelete()}
>
  Delete
</div>
```

---

## K — Coding Challenge + Solution

### Challenge

Make this `Dropdown` component fully accessible: keyboard navigation, ARIA attributes, focus management, and `Escape` to close.

### Solution

```tsx
interface Option { value: string; label: string }

function AccessibleDropdown({
  options, value, onChange, label
}: {
  options: Option[]; value: string; onChange: (v: string) => void; label: string
}) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId  = useId()

  const selectedLabel = options.find(o => o.value === value)?.label ?? label

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) setIsOpen(true)
        setFocusedIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter': case ' ':
        e.preventDefault()
        if (isOpen) { onChange(options[focusedIndex].value); setIsOpen(false) }
        else setIsOpen(true)
        break
      case 'Escape':
        setIsOpen(false)
        triggerRef.current?.focus()   // return focus to trigger ✅
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="dropdown" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => setIsOpen(o => !o)}
        type="button"
      >
        {selectedLabel} ▾
      </button>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listboxId}-${focusedIndex}`}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={opt.value === value}
              data-focused={i === focusedIndex}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---

# 9 — Render Optimization Mindset

---

## T — TL;DR

Render optimization is **measure first, optimize second**. Most React apps are fast by default. The mindset: understand why re-renders happen, know the tools (`React.memo`, `useMemo`, `useCallback`, code splitting, concurrent features), and reach for them only when profiling shows a real problem.

---

## K — Key Concepts

```
── Optimization decision tree ────────────────────────────────────────────────

1. Is the app actually slow?
   NO → stop. Don't optimize.
   YES → open React DevTools Profiler

2. Which component renders most frequently / takes longest?
   → Look at flame chart, ranked chart

3. Why is it re-rendering?
   "Parent rendered" → consider React.memo on child
   "State changed"   → check if state is in the right place (colocation)
   "Context changed" → split contexts, memoize provider value

4. Is it slow because of a heavy computation?
   → useMemo for the computation
   → Only if profiling shows the computation is actually slow

5. Is it slow because children always re-render from new function refs?
   → useCallback on the function + React.memo on the child

6. Is the initial bundle too large?
   → React.lazy + Suspense for code splitting

7. Is a user interaction blocking the UI?
   → useTransition / useDeferredValue for concurrent rendering
```

```tsx
// ── React.memo: skip re-render when props haven't changed ─────────────────
// Only use when the component: (a) renders often, (b) is expensive to render,
// (c) receives the same props frequently
const ExpensiveRow = memo(function ExpensiveRow({ data, onAction }: RowProps) {
  // Expensive rendering...
  return <tr><td>{data.name}</td><td>{data.value}</td></tr>
})
// Without memo: parent re-renders → all rows re-render
// With memo + stable props: rows only re-render when their data changes ✅
```

```tsx
// ── The three questions before adding any memoization ─────────────────────
// 1. Have I profiled and confirmed this is actually slow?
// 2. Does the memoization actually help (deps stable enough to hit cache)?
// 3. Is the added complexity worth the benefit?

// ── Common optimizations ranked by ROI ────────────────────────────────────
// HIGH IMPACT, LOW RISK:
//   - Code splitting with React.lazy (reduces initial bundle)
//   - State colocation (prevents over-rendering from lifted state)
//   - Correct keys in lists (prevents wrong unmount/remount)
//   - Avoid inline object/array creation in render for memo'd children

// MEDIUM IMPACT, SOME COMPLEXITY:
//   - React.memo on large list items
//   - useMemo for genuinely expensive computations (large dataset operations)
//   - useTransition for slow tab/route switches

// LOW IMPACT, HIGH COMPLEXITY:
//   - useCallback on every handler
//   - useMemo on every value
//   - Micro-optimizing components that render in < 1ms
```

```tsx
// ── Virtualization: the real fix for large lists ──────────────────────────
// React.memo can't help if you're rendering 10,000 rows
// Virtual rendering: only render visible items
// Libraries: @tanstack/react-virtual, react-window

import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count:    items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,   // estimated row height
  })

  return (
    <div ref={parentRef} style={{ height: 400, overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtual => (
          <div
            key={virtual.index}
            style={{
              position:  'absolute',
              top:        virtual.start,
              height:     virtual.size,
              width:      '100%',
            }}
          >
            {items[virtual.index]}
          </div>
        ))}
      </div>
    </div>
  )
}
// Renders only ~10–15 visible rows regardless of list size ✅
```

---

## W — Why It Matters

- Premature optimization wastes time and adds complexity without benefit. The React team has said most apps don't need `useMemo`/`useCallback` — profile first.
- The optimization hierarchy matters: colocation → code splitting → memo → concurrent features. Applying them in reverse order (adding `useMemo` everywhere when the real issue is too much state in App) wastes effort.
- Virtualization is the only correct solution for lists of 1000+ items — `React.memo` can't help when 1000 components render their DOM correctly but just have too many DOM nodes.

---

## I — Interview Q&A

### Q: Walk me through how you would diagnose and fix a slow React component.

**A:** (1) **Confirm it's slow** — open DevTools, record a profile while interacting. Look for long frames (>16ms), frequent renders, or expensive components. (2) **Identify the cause** — React DevTools Profiler shows why each component rendered: props changed, state changed, or parent rendered. "Parent rendered" is the most common cause of unnecessary re-renders. (3) **Structural fix first** — can I colocate the state that's changing to a lower component so it only affects the relevant subtree? This is zero-overhead. (4) **React.memo** — if a child receives the same props most of the time but still re-renders because its parent does, wrap it with `React.memo`. Ensure props are stable (no inline objects/functions). (5) **useMemo/useCallback** — only for components where profiling shows the computation or new reference is the actual bottleneck. (6) **Virtualization** — for long lists. (7) **Code splitting** — for large initial bundles.

---

## C — Common Pitfalls + Fix

### ❌ Memoizing everything "just in case"

```tsx
// ❌ useMemo/useCallback on everything — adds overhead, reduces readability
function ProfileCard({ user }: { user: User }) {
  const displayName  = useMemo(() => `${user.first} ${user.last}`, [user.first, user.last])
  const formattedDate = useMemo(() => new Date(user.joined).toLocaleDateString(), [user.joined])
  const handleClick  = useCallback(() => console.log(user.id), [user.id])
  const style        = useMemo(() => ({ color: user.active ? 'green' : 'gray' }), [user.active])

  return <div style={style} onClick={handleClick}>{displayName} · {formattedDate}</div>
}
// None of these improve performance — they add memory and comparison overhead
// for trivial string concatenations and a single console.log

// ✅ Just compute inline — these are not expensive
function ProfileCardFixed({ user }: { user: User }) {
  const displayName   = `${user.first} ${user.last}`
  const formattedDate = new Date(user.joined).toLocaleDateString()
  const style         = { color: user.active ? 'green' : 'gray' }

  return (
    <div style={style} onClick={() => console.log(user.id)}>
      {displayName} · {formattedDate}
    </div>
  )
}
// Inline is faster here — no memoization overhead for sub-microsecond operations
```

---

## K — Coding Challenge + Solution

### Challenge

Profile this component (mentally), identify the optimization opportunity, and apply the minimum fix.

### Solution

```tsx
// BEFORE — identify the problem
function ContactList({ contacts }: { contacts: Contact[] }) {
  const [search,  setSearch]  = useState('')
  const [theme,   setTheme]   = useState<'light'|'dark'>('light')

  // Problem 1: filtered is an expensive operation over 5000 contacts
  // Problem 2: handleCall is new on every render → ContactRow always re-renders
  // Problem 3: theme change re-renders ALL ContactRows unnecessarily

  const filtered  = contacts.filter(c => c.name.includes(search))
  const handleCall = (id: number) => initiateCall(id)

  return (
    <div data-theme={theme}>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      {filtered.map(c => <ContactRow key={c.id} contact={c} onCall={handleCall} />)}
    </div>
  )
}

// AFTER — targeted fixes
const ContactRow = memo(function ContactRow(
  { contact, onCall }: { contact: Contact; onCall: (id: number) => void }
) {
  return (
    <li>
      {contact.name}
      <button onClick={() => onCall(contact.id)}>Call</button>
    </li>
  )
})

function ContactListFixed({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState('')
  const [theme,  setTheme]  = useState<'light'|'dark'>('light')

  // Fix 1: memoize expensive filter — only re-runs when contacts or search changes
  const filtered = useMemo(
    () => contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [contacts, search]
  )

  // Fix 2: stable callback reference — ContactRow won't re-render from theme change
  const handleCall = useCallback((id: number) => initiateCall(id), [])

  return (
    <div data-theme={theme}>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      <ul>
        {/* Theme change: App re-renders, filter result is same → ContactRow skips ✅ */}
        {filtered.map(c => (
          <ContactRow key={c.id} contact={c} onCall={handleCall} />
        ))}
      </ul>
    </div>
  )
}
```

---

## ✅ Day 6 Complete — Advanced React Patterns

| # | Subtopic | Status |
|---|----------|--------|
| 1 | useMemo + useCallback | ☐ |
| 2 | useReducer | ☐ |
| 3 | useContext + Reducer + Context Pattern | ☐ |
| 4 | useDeferredValue + useTransition + startTransition | ☐ |
| 5 | useId + useOptimistic + Optimistic UI | ☐ |
| 6 | Composition + Lazy Loading + Suspense | ☐ |
| 7 | Error Boundaries | ☐ |
| 8 | Accessibility | ☐ |
| 9 | Render Optimization Mindset | ☐ |

---

## 🗺️ One-Page Mental Model — Day 6

```
useMemo + useCallback
  useMemo(() => expr, deps)     → memoize a VALUE
  useCallback(fn, deps)         → memoize a FUNCTION REFERENCE
  Both re-compute only when deps change
  Only useful when: expensive computation | passing to React.memo child | effect dep
  Default: compute inline. Add memo only after profiling confirms benefit

useReducer
  (state, action) → newState — pure function, testable without React
  Dispatch named actions with typed payloads (discriminated unions)
  Use when: 3+ related state fields, complex transitions, testable logic needed
  ❌ Mutate in reducer → return new objects/arrays always
  Pattern: FetchAction union type → impossible invalid states

useContext + Reducer + Context
  createContext → Provider with useReducer → custom hooks to consume
  Split StateCtx and DispatchCtx: dispatch consumers don't re-render on state changes
  Custom hook guard: if(!ctx) throw → clear error outside provider
  ❌ Object literal as value → useMemo the value object
  Use for: auth, theme, locale, notifications — not high-frequency state

Concurrent Features
  useTransition → wrap non-urgent state update, get isPending flag
  useDeferredValue → defer a value you receive as prop
  startTransition → standalone version, usable outside components
  ❌ Wrap urgent updates (input value) in transition → input becomes laggy
  ✅ Wrap slow downstream updates (list filter, tab content) in transition
  isPending → show ⏳ spinner or dim stale content while transition processes

useId + useOptimistic
  useId() → stable server+client safe ID for htmlFor/aria-labelledby
  ❌ Math.random() for IDs → hydration mismatch in SSR
  useOptimistic(state, reducer) → instantly show predicted state during async
  Always roll back on error — optimistic without rollback = lying to the user
  Pattern: addOptimistic(tempItem) → await server → setRealItems(result)

Composition + Lazy + Suspense
  children prop, render props, compound components — three composition patterns
  React.lazy(() => import('./Page')) → code split at component level
  Suspense fallback={<Skeleton />} → show while bundle/data loads
  Granular boundaries > one global boundary → progressive content reveal
  ❌ lazy() inside render → re-downloads bundle every render

Error Boundaries
  Must be class components (no hook equivalent) → use react-error-boundary package
  getDerivedStateFromError → switch to fallback UI
  componentDidCatch → log to Sentry/Datadog
  ❌ Catch: async errors, event handlers → use try/catch / useAsyncError
  ✅ Catch: render errors, lifecycle errors, constructor errors
  Granular boundaries: each section isolated, resetErrorBoundary to recover

Accessibility
  Semantic HTML first: button, nav, main, article, aside — free keyboard + ARIA
  aria-label for icon buttons, aria-describedby for hints, aria-live for announcements
  Modal: focus in on open, Escape to close, focus out to trigger on close
  role="alert" → urgent | aria-live="polite" → non-urgent screen reader announcements
  ❌ div onClick → keyboard unreachable | ❌ icon button without label → "button X"

Render Optimization Mindset
  Profile FIRST — React DevTools Profiler → identify real bottlenecks
  Why did this render? → Props / State / Parent / Context
  Fix hierarchy: colocation → code splitting → React.memo → useMemo → concurrent
  Virtualization (@tanstack/react-virtual): the only fix for 1000+ item lists
  ❌ useMemo/useCallback on every function/value → overhead > benefit
  ✅ Optimize the structure (where state lives) before optimizing the render
```

> **Your next action:** Open React DevTools → Profiler → Record → click something in your app → Stop. Find the component that rendered the most. Ask: "Why? Is the state in the right place?" Fix the structure before reaching for `memo`. Five minutes of real profiling teaches this better than any re-read.

> "Doing one small thing beats opening a feed."