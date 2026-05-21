# 3 — useState

---

## T — TL;DR

`useState` adds **memory** to a component — a value that persists across re-renders and triggers a re-render when updated. It returns `[currentValue, setter]`. The setter schedules a re-render with the new value. Never mutate state directly — always use the setter.

---

## K — Key Concepts

```tsx
import { useState } from 'react'

// ── Basic usage ────────────────────────────────────────────────────────────
function Counter() {
  const [count, setCount] = useState(0)          // initial value: 0
  //     ↑ current value  ↑ setter function

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

```tsx
// ── TypeScript inference and explicit types ───────────────────────────────
// TypeScript infers the type from the initial value:
const [count,   setCount]   = useState(0)          // number
const [name,    setName]    = useState('')          // string
const [active,  setActive]  = useState(false)      // boolean

// When initial value can be null or a type:
const [user, setUser] = useState<User | null>(null)  // explicit generic ✅
const [error, setError] = useState<string | null>(null)

// When initial value is an object:
interface FormState { email: string; password: string }
const [form, setForm] = useState<FormState>({ email: '', password: '' })
```

```tsx
// ── Functional updater — use when new state depends on previous ─────────
function Counter() {
  const [count, setCount] = useState(0)

  // ❌ Direct value — stale if called multiple times in one render
  function handleTripleIncrement() {
    setCount(count + 1)   // all three use the same stale 'count'
    setCount(count + 1)
    setCount(count + 1)   // result: count + 1, not count + 3
  }

  // ✅ Functional updater — always gets the latest state
  function handleTripleIncrementFixed() {
    setCount(prev => prev + 1)   // prev = latest queued value
    setCount(prev => prev + 1)   // prev = that + 1
    setCount(prev => prev + 1)   // result: count + 3 ✅
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={handleTripleIncrementFixed}>+3</button>
    </div>
  )
}
```

```tsx
// ── Multiple state variables vs one object ────────────────────────────────
// ✅ Related values together — one update changes both
interface ModalState {
  isOpen:  boolean
  title:   string
  content: React.ReactNode
}
const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null })

function openModal(title: string, content: React.ReactNode) {
  setModal({ isOpen: true, title, content })   // one setState call ✅
}
function closeModal() {
  setModal(prev => ({ ...prev, isOpen: false }))
}

// ✅ Separate independent values — simpler to update individually
const [count,    setCount]    = useState(0)
const [isLoading, setLoading] = useState(false)
const [error,    setError]    = useState<string | null>(null)
// These change independently — grouping them would mean spreading on every update
```

---

## W — Why It Matters

- `useState` is what makes React "reactive" — the setter doesn't just change a variable, it schedules a re-render and React re-runs the component with the new value. Without this, the UI would be static.
- The functional updater (`prev => prev + 1`) is essential for any handler that calls the setter multiple times or for state updates in `useEffect` that depend on the current value — using stale closure values is one of the most common React bugs.
- Choosing between one state object vs multiple `useState` calls shapes how you update state — multiple independent variables are simpler to update individually; grouped related values avoid forgetting to update one field.

---

## I — Interview Q&A

### Q: What is the functional updater form of `useState` and when should you use it?

**A:** Instead of `setCount(count + 1)`, you can pass a function: `setCount(prev => prev + 1)`. React calls this function with the most recent state value and uses the return value as the new state. Use it when: (1) you call the setter multiple times in the same event handler, (2) the update is inside a `useEffect`, timeout, or async callback where the closed-over state value might be stale. The function form is safe because React queues updates and always passes the latest queued value as `prev` — the direct value form reads from the render's closure, which may be stale if updates were batched.

---

## C — Common Pitfalls + Fix

### ❌ Mutating state directly — React doesn't see the change

```tsx
// ❌ Direct mutation — React doesn't know state changed, no re-render
const [user, setUser] = useState({ name: 'Mark', age: 28 })
function handleBirthday() {
  user.age += 1       // ❌ mutates the object — same reference
  setUser(user)       // React sees same reference → may skip re-render
}

// ❌ Array mutation
const [items, setItems] = useState(['a', 'b', 'c'])
function handleAdd() {
  items.push('d')     // ❌ mutates original array
  setItems(items)     // same reference → React may not re-render
}

// ✅ Always create a new value
function handleBirthdayFixed() {
  setUser(prev => ({ ...prev, age: prev.age + 1 }))   // new object ✅
}
function handleAddFixed() {
  setItems(prev => [...prev, 'd'])   // new array ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `StepCounter` with: current step (1-based), total steps, next/previous buttons (disabled at boundaries), a reset button, and a step indicator showing "Step 2 of 5".

### Solution

```tsx
interface StepCounterProps {
  totalSteps: number
  initialStep?: number
}

function StepCounter({ totalSteps, initialStep = 1 }: StepCounterProps) {
  const [step, setStep] = useState(initialStep)

  function handleNext()  { setStep(prev => Math.min(prev + 1, totalSteps)) }
  function handlePrev()  { setStep(prev => Math.max(prev - 1, 1)) }
  function handleReset() { setStep(initialStep) }

  const isFirst = step === 1
  const isLast  = step === totalSteps
  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="step-counter">
      <div className="step-indicator" aria-live="polite">
        Step {step} of {totalSteps}
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="step-controls">
        <button onClick={handlePrev}  disabled={isFirst}>← Previous</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleNext}  disabled={isLast}>Next →</button>
      </div>
    </div>
  )
}
```

---

---
