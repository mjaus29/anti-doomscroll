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
