
# 📅 Day 2 — React Interactivity

> **Goal:** Wire up real user interactions — events, state, controlled inputs, and immutable updates.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 2 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Event Handling | 10 min |
| 2 | Passing Handlers | 10 min |
| 3 | useState | 12 min |
| 4 | State as a Snapshot | 10 min |
| 5 | Re-render Cycle | 10 min |
| 6 | Batching Mindset | 8 min |
| 7 | Controlled Inputs | 12 min |
| 8 | Updating Objects and Arrays Immutably | 12 min |
| 9 | Isolated State Per Component Instance | 10 min |

---

---

# 1 — Event Handling

---

## T — TL;DR

React events are **synthetic wrappers** around native browser events — same properties, same names, but camelCased (`onClick`, `onChange`). You pass a **function reference** as a prop — not a call. React calls it when the event fires.

---

## K — Key Concepts

```tsx
// ── Pass a reference, never a call ───────────────────────────────────────
// ❌ Calling the function immediately (runs on every render)
<button onClick={handleClick()}>Click</button>

// ✅ Passing the reference (React calls it on click)
<button onClick={handleClick}>Click</button>

// ✅ Inline arrow function — when you need to pass arguments
<button onClick={() => handleDelete(item.id)}>Delete</button>
```

```tsx
// ── Event handler anatomy ────────────────────────────────────────────────
function Form() {
  // Named handler — preferred for readability
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()               // stop default form submission
    console.log('submitted')
  }

  // Arrow function handler — equivalent
  const handleReset = () => {
    console.log('reset')
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="reset" onClick={handleReset}>Reset</button>
      <button type="submit">Submit</button>
    </form>
  )
}
```

```tsx
// ── Common event types ────────────────────────────────────────────────────
// Mouse events
onClick:       React.MouseEvent<HTMLButtonElement>
onDoubleClick: React.MouseEvent<HTMLDivElement>
onMouseEnter:  React.MouseEvent<HTMLDivElement>
onMouseLeave:  React.MouseEvent<HTMLDivElement>

// Form events
onChange:      React.ChangeEvent<HTMLInputElement>
onSubmit:      React.FormEvent<HTMLFormElement>
onFocus:       React.FocusEvent<HTMLInputElement>
onBlur:        React.FocusEvent<HTMLInputElement>

// Keyboard events
onKeyDown:     React.KeyboardEvent<HTMLInputElement>
onKeyUp:       React.KeyboardEvent<HTMLInputElement>

// Accessing event properties
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value   = e.target.value        // typed value
  const name    = e.target.name         // input name attribute
  const checked = e.target.checked      // for checkboxes
  const files   = e.target.files        // for file inputs
}

function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') { /* submit */ }
  if (e.key === 'Escape') { /* cancel */ }
  if (e.ctrlKey && e.key === 's') { /* save shortcut */ }
}
```

```tsx
// ── Event propagation ────────────────────────────────────────────────────
// React events bubble up the tree — same as native events

function Card({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} className="card">
      <button
        onClick={e => {
          e.stopPropagation()   // prevent click from bubbling to card ✅
          console.log('button clicked — card onClick NOT fired')
        }}
      >
        Inner button
      </button>
    </div>
  )
}
```

---

## W — Why It Matters

- The "reference vs call" distinction (`onClick={fn}` vs `onClick={fn()}`) is the first gotcha every React developer hits — the call version runs the function immediately on render, not on click.
- TypeScript's event types (`React.ChangeEvent<HTMLInputElement>`) give you autocomplete on `e.target.value` and catch mistakes like accessing `.value` on a `<select>` vs `<input>`.
- `e.preventDefault()` is required for form submit, link navigation, and drag-drop — without it, the browser's default behaviour fires in addition to your handler.

---

## I — Interview Q&A

### Q: What is the difference between `onClick={handleClick}` and `onClick={handleClick()}`?

**A:** `onClick={handleClick}` passes a function **reference** — React stores it and calls it when the user clicks. `onClick={handleClick()}` **calls** the function immediately during render and passes its return value (likely `undefined`) as the onClick prop. The first is correct, the second runs the function on every render and registers nothing for the click. The inline arrow pattern `onClick={() => handleDelete(id)}` creates a new function reference on each render that, when called, invokes `handleDelete(id)` — this is the correct way to pass arguments to a handler.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `e.preventDefault()` on form submit

```tsx
// ❌ Page refreshes on submit — browser default behaviour
function SearchForm() {
  function handleSubmit() {
    console.log('search!')   // runs, then page reloads ❌
  }
  return <form onSubmit={handleSubmit}><button type="submit">Search</button></form>
}

// ✅ Prevent default — stop browser navigation
function SearchForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()       // stops reload ✅
    console.log('search!')
  }
  return <form onSubmit={handleSubmit}><button type="submit">Search</button></form>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `InteractiveCard` that: logs a click on the card, has an inner "Like" button that stops propagation and tracks its own click count (as a console.log for now), and a link that prevents default navigation.

### Solution

```tsx
function InteractiveCard({ title, href }: { title: string; href: string }) {
  function handleCardClick() {
    console.log('card clicked')
  }

  function handleLikeClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()   // card onClick won't fire ✅
    console.log('liked!')
  }

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()    // no navigation ✅
    console.log('link clicked — no navigation')
  }

  return (
    <div onClick={handleCardClick} className="card">
      <h3>{title}</h3>
      <a href={href} onClick={handleLinkClick}>
        Read more
      </a>
      <button onClick={handleLikeClick}>👍 Like</button>
    </div>
  )
}
```

---

---

# 2 — Passing Handlers

---

## T — TL;DR

**Pass event handlers as props** to let parent components respond to events that happen inside children. The child owns the UI; the parent owns the logic. Naming convention: `on` prefix for the prop (`onDelete`), `handle` prefix for the implementation (`handleDelete`).

---

## K — Key Concepts

```tsx
// ── Pattern: child fires, parent handles ──────────────────────────────────
interface DeleteButtonProps {
  onDelete: () => void       // prop named with 'on' prefix
  label?:   string
}

function DeleteButton({ onDelete, label = 'Delete' }: DeleteButtonProps) {
  return (
    <button className="btn btn-danger" onClick={onDelete}>
      {label}
    </button>
  )
  // DeleteButton doesn't know WHAT gets deleted
  // It just tells the parent "user clicked delete"
}

function TaskItem({ task, onDelete }: { task: Task; onDelete: (id: number) => void }) {
  return (
    <li className="task">
      <span>{task.text}</span>
      <DeleteButton onDelete={() => onDelete(task.id)} />
      {/* passes id up through the callback chain ✅ */}
    </li>
  )
}

function TaskList({ tasks, onDeleteTask }: { tasks: Task[]; onDeleteTask: (id: number) => void }) {
  return (
    <ul>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onDelete={onDeleteTask} />
      ))}
    </ul>
  )
}
```

```tsx
// ── Common handler prop patterns ──────────────────────────────────────────
interface ComponentProps {
  // Simple: no args
  onClose:    () => void
  onRefresh:  () => void

  // With value
  onChange:   (value: string) => void
  onSelect:   (id: number) => void
  onToggle:   (checked: boolean) => void

  // With full object
  onSubmit:   (data: FormValues) => void
  onSort:     (column: string, direction: 'asc' | 'desc') => void

  // Async handlers
  onSave:     (data: FormValues) => Promise<void>
}
```

```tsx
// ── Lifting state up with handlers ───────────────────────────────────────
// Child raises an event → parent updates state → re-renders child with new data
// This is "lifting state up" — the core React data flow

interface RatingProps {
  value:    number
  onChange: (rating: number) => void
}

function StarRating({ value, onChange }: RatingProps) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}    // ← raises event to parent
          className={star <= value ? 'star filled' : 'star'}
          aria-label={`Rate ${star} out of 5`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// Parent owns the state and responds to changes
function ReviewForm() {
  const [rating, setRating] = React.useState(0)

  return (
    <form>
      <StarRating
        value={rating}
        onChange={setRating}   // setRating IS the handler ✅
      />
      <p>You rated: {rating}/5</p>
    </form>
  )
}
```

---

## W — Why It Matters

- Passing handlers from parent to child is the fundamental **inverse data flow** in React — props go down, events go up. This pattern appears everywhere: forms, modals, lists, pickers.
- The `on/handle` naming convention is a team contract — `onDelete` in the interface signals "this is a callback for something that happened", while `handleDelete` in the implementation signals "this is the function that responds to it."
- `onChange={setRating}` passing a state setter directly as a handler is idiomatic React — the setter IS already a function with the right signature `(value: T) => void`.

---

## I — Interview Q&A

### Q: Why do we pass event handlers as props and what is "lifting state up"?

**A:** React data flows downward through props, but events (user actions) happen inside children. To make a parent respond to a child's event, you pass a callback function as a prop. The child calls it when the event occurs — effectively sending data back up to the parent. "Lifting state up" is the pattern where two sibling components need to share state: you move the state to their closest common ancestor, which then passes the value and setter (as a handler prop) to both children. This is the standard solution to sibling communication — no special event bus needed.

---

## C — Common Pitfalls + Fix

### ❌ Creating new handler functions on every render unnecessarily

```tsx
// ❌ New function reference on every render — can break React.memo
function ParentList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <MemoizedItem
          key={item.id}
          item={item}
          // New arrow function every render → MemoizedItem always re-renders
          onDelete={() => deleteItem(item.id)}
        />
      ))}
    </ul>
  )
}

// ✅ For most cases, this is fine — don't prematurely optimise
// Only matters when the child is wrapped in React.memo AND the list is large
// Use useCallback (Day 3) when optimization is actually needed
// Premature optimisation is the enemy of readable code
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `QuantitySelector` component (– / count / +) that accepts `value`, `onChange`, `min`, and `max` props. The parent owns the state. Show the full parent + child wiring.

### Solution

```tsx
interface QuantitySelectorProps {
  value:     number
  onChange:  (value: number) => void
  min?:      number
  max?:      number
}

function QuantitySelector({ value, onChange, min = 1, max = 99 }: QuantitySelectorProps) {
  function handleDecrement() {
    if (value > min) onChange(value - 1)
  }
  function handleIncrement() {
    if (value < max) onChange(value + 1)
  }

  return (
    <div className="quantity-selector" role="group" aria-label="Quantity">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        –
      </button>
      <span className="quantity-value" aria-live="polite">{value}</span>
      <button
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}

// Parent owns and controls the state
function ProductPage({ product }: { product: Product }) {
  const [quantity, setQuantity] = React.useState(1)

  function handleAddToCart() {
    console.log(`Add ${quantity} × ${product.name} to cart`)
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <QuantitySelector
        value={quantity}
        onChange={setQuantity}   // state setter as handler ✅
        min={1}
        max={product.stock}
      />
      <p>Total: ${(product.price * quantity).toFixed(2)}</p>
      <button onClick={handleAddToCart}>Add to cart</button>
    </div>
  )
}
```

---

---

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

# 4 — State as a Snapshot

---

## T — TL;DR

When React calls your component, it captures the current state values as **constants for that render**. The component's JSX, event handlers, and all other code in that render closure see a **frozen snapshot** of state — not a live reference. Calling the setter doesn't change the current snapshot; it queues the next one.

---

## K — Key Concepts

```tsx
// ── State is fixed per render ─────────────────────────────────────────────
function AlertDemo() {
  const [message, setMessage] = useState('Hello')

  function handleClick() {
    setMessage('Goodbye')       // schedules next render with 'Goodbye'
    alert(message)              // still 'Hello' — this render's snapshot ❌ surprise
    console.log(message)        // 'Hello' — same snapshot
  }

  // After React re-renders, message WILL be 'Goodbye' in the new snapshot
  // But in THIS render's closure, message = 'Hello' forever
  return <button onClick={handleClick}>{message}</button>
}
```

```tsx
// ── Multiple setters in one handler ──────────────────────────────────────
function VoteCounter() {
  const [votes, setVotes] = useState(0)

  function handleThreeVotes() {
    // All three lines read from the SAME snapshot (votes = 0)
    setVotes(votes + 1)   // queue: set to 0 + 1 = 1
    setVotes(votes + 1)   // queue: set to 0 + 1 = 1 (same snapshot!)
    setVotes(votes + 1)   // queue: set to 0 + 1 = 1 (same snapshot!)
    // Result after re-render: votes = 1, not 3 ← surprising but correct per model
  }

  function handleThreeVotesFixed() {
    // Functional updater works with the latest queued value
    setVotes(prev => prev + 1)   // 0 → 1
    setVotes(prev => prev + 1)   // 1 → 2
    setVotes(prev => prev + 1)   // 2 → 3 ✅
  }

  return <button onClick={handleThreeVotesFixed}>+3 votes ({votes})</button>
}
```

```tsx
// ── setTimeout captures the snapshot ─────────────────────────────────────
function TimerDemo() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 5)   // schedules next render: count = 5

    // This closure captures count = 0 (current snapshot)
    setTimeout(() => {
      alert(`count in timeout: ${count}`)   // alerts 0, not 5 ← snapshot!
    }, 3000)

    // To get the latest value in async code: use a ref (Day 3)
  }

  return <button onClick={handleClick}>Add 5 (current: {count})</button>
}
// This is "stale closure" — the most common source of async bugs in React
```

---

## W — Why It Matters

- Snapshot semantics are the explanation for the most common React "bug reports" — "why does my state show the old value inside setTimeout?" The snapshot model answers it immediately.
- Understanding snapshots explains why calling `setCount(count + 1)` three times only increments by 1 — all three read the same `count` from the snapshot. This drives the need for the functional updater.
- Every render is an isolated function call with its own constants — there's no "live" state variable. This mental shift from imperative (variables that change in place) to declarative (new snapshots on each render) is the fundamental React mindset.

---

## I — Interview Q&A

### Q: What does "state as a snapshot" mean in React?

**A:** Each time React calls your component function, it provides the current state values as fixed constants for that render — they don't change during the execution of that render, even if you call `setState`. Think of each render as a photograph — it captures state at a moment in time. Calling `setState` doesn't modify the photo; it requests a new photo to be taken. Any closures created during that render (event handlers, timeouts, effects) will always see the state values from their render's snapshot. This explains why state inside `setTimeout` can be stale — the callback closed over an old snapshot. The functional updater form (`prev => prev + 1`) escapes this by not relying on the closure value.

---

## C — Common Pitfalls + Fix

### ❌ Reading state right after setting it and expecting the new value

```tsx
// ❌ Expecting updated state immediately after setter call
function Form() {
  const [email, setEmail] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmail('')                      // schedules re-render
    console.log(email)                // still the old value ❌
    sendEmail(email)                  // also old value ✅ (this one is fine)
    // email won't be '' until the NEXT render
  }
  return <input value={email} onChange={e => setEmail(e.target.value)} />
}

// ✅ Work with the local value you already have
function FormFixed() {
  const [email, setEmail] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendEmail(email)     // use the current snapshot value ✅
    setEmail('')         // then schedule clearing
  }
  return <input value={email} onChange={e => setEmail(e.target.value)} />
}
```

---

## K — Coding Challenge + Solution

### Challenge

Predict the output of this component — what does the alert show and what does the counter display? Then fix it to show the updated value in the alert.

```tsx
function Quiz() {
  const [score, setScore] = useState(10)
  function handleAdd() {
    setScore(score + 5)
    alert(`Score is now: ${score}`)
  }
  return <button onClick={handleAdd}>Add 5 (current: {score})</button>
}
```

### Solution

```tsx
// Prediction:
// - alert shows: "Score is now: 10" (snapshot value — not 15)
// - button label shows: 10 (before click), then 15 (after re-render)
// The setter schedules, the alert runs synchronously in the same snapshot

// ✅ Fix 1: capture the new value in a local variable
function QuizFixed() {
  const [score, setScore] = useState(10)

  function handleAdd() {
    const newScore = score + 5     // compute new value once
    setScore(newScore)             // schedule update
    alert(`Score is now: ${newScore}`)   // use local variable ✅
  }

  return <button onClick={handleAdd}>Add 5 (current: {score})</button>
}

// ✅ Fix 2: show in UI instead of alert (the React way)
function QuizBetter() {
  const [score,      setScore]      = useState(10)
  const [lastAdded,  setLastAdded]  = useState<number | null>(null)

  function handleAdd() {
    setScore(prev => prev + 5)
    setLastAdded(5)
  }

  return (
    <div>
      <p>Score: {score}</p>
      {lastAdded != null && <p>Last added: +{lastAdded}</p>}
      <button onClick={handleAdd}>Add 5</button>
    </div>
  )
}
```

---

---

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

# 7 — Controlled Inputs

---

## T — TL;DR

A **controlled input** has its value driven by React state — `value={state}` plus `onChange` to update it. React owns the source of truth. An **uncontrolled input** manages its own DOM value (accessed via `ref`). Controlled is the default for forms in React.

---

## K — Key Concepts

```tsx
// ── Controlled input: React owns the value ────────────────────────────────
function EmailInput() {
  const [email, setEmail] = useState('')

  return (
    <input
      type="email"
      value={email}                             // ← React controls the value
      onChange={e => setEmail(e.target.value)}  // ← update state on change
      placeholder="Enter email"
    />
  )
  // State → input value (display)
  // User types → onChange → setEmail → re-render → input shows new value
}
```

```tsx
// ── Full controlled form ──────────────────────────────────────────────────
interface LoginFormValues {
  email:    string
  password: string
}

function LoginForm({ onSubmit }: { onSubmit: (values: LoginFormValues) => void }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSubmit({ email, password })
  }

  function handleReset() {
    setEmail('')
    setPassword('')
  }

  return (
    <form onSubmit={handleSubmit} onReset={handleReset}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <button type="reset">Clear</button>
      <button type="submit">Log in</button>
    </form>
  )
}
```

```tsx
// ── Controlled checkbox, select, textarea ─────────────────────────────────
// Checkbox: uses 'checked' not 'value'
const [agreed, setAgreed] = useState(false)
<input
  type="checkbox"
  checked={agreed}
  onChange={e => setAgreed(e.target.checked)}   // .checked not .value
/>

// Select
const [country, setCountry] = useState('PH')
<select value={country} onChange={e => setCountry(e.target.value)}>
  <option value="PH">Philippines</option>
  <option value="US">United States</option>
  <option value="JP">Japan</option>
</select>

// Textarea: same as input
const [bio, setBio] = useState('')
<textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} />
```

```tsx
// ── Generic change handler for multi-field form ───────────────────────────
interface ProfileForm {
  name:     string
  email:    string
  website:  string
}

function ProfileEditor() {
  const [form, setForm] = useState<ProfileForm>({ name: '', email: '', website: '' })

  // One handler for all text inputs — uses input 'name' attribute as key
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))   // [name] = computed property key
  }

  return (
    <form>
      <input name="name"    value={form.name}    onChange={handleChange} />
      <input name="email"   value={form.email}   onChange={handleChange} />
      <input name="website" value={form.website} onChange={handleChange} />
    </form>
  )
}
```

---

## W — Why It Matters

- Controlled inputs give React complete ownership of form state — you can validate on every keystroke, compute derived values (character count, validation message), enable/disable buttons based on input, and reset forms programmatically.
- The generic `handleChange` using `e.target.name` as a key is the standard multi-field form pattern — it scales to 20 fields without 20 separate handlers.
- The most common controlled input bug: setting `value` without an `onChange` makes the input read-only (React warns you). If you want uncontrolled with a default, use `defaultValue` instead of `value`.

---

## I — Interview Q&A

### Q: What is the difference between a controlled and uncontrolled input in React?

**A:** A **controlled input** has its value managed by React state — `value={state}` binds the display value, and `onChange` updates the state when the user types. React is the single source of truth. A **uncontrolled input** manages its own value in the DOM — you access it via a `ref` (`inputRef.current.value`) when you need it (typically on submit). Controlled inputs enable real-time validation, conditional rendering, and computed values from the input. Uncontrolled inputs are simpler for file inputs and cases where you only need the value on submit. React Hook Form (Day 5 group) uses uncontrolled inputs under the hood for performance.

---

## C — Common Pitfalls + Fix

### ❌ `value` without `onChange` — read-only input

```tsx
// ❌ value set but no onChange — React makes the input read-only
// React warns: "You provided a `value` prop without an `onChange` handler"
function BrokenInput() {
  const [name, setName] = useState('Mark')
  return <input value={name} />   // user can't type ❌
}

// ✅ Always pair value with onChange
function WorkingInput() {
  const [name, setName] = useState('Mark')
  return (
    <input
      value={name}
      onChange={e => setName(e.target.value)}   // ✅
    />
  )
}

// ✅ If you want a pre-filled but uncontrolled input: use defaultValue
function UncontrolledInput() {
  return <input defaultValue="Mark" />   // user can edit, DOM owns the value
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `SearchInput` controlled component with: live character count, disable submit when empty, clear button that resets state, and a minimum length validation message.

### Solution

```tsx
interface SearchInputProps {
  onSearch: (query: string) => void
  minLength?: number
  maxLength?: number
}

function SearchInput({ onSearch, minLength = 3, maxLength = 100 }: SearchInputProps) {
  const [query, setQuery] = useState('')

  const charCount   = query.length
  const isTooShort  = charCount > 0 && charCount < minLength
  const isEmpty     = charCount === 0
  const isValid     = charCount >= minLength && charCount <= maxLength

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isValid) onSearch(query)
  }

  function handleClear() {
    setQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="input-wrapper">
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={`Search (min ${minLength} chars)…`}
          maxLength={maxLength}
          aria-describedby="search-hint"
        />
        {charCount > 0 && (
          <button type="button" onClick={handleClear} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>

      <div id="search-hint" className="search-meta">
        <span className={charCount > maxLength * 0.9 ? 'count warn' : 'count'}>
          {charCount}/{maxLength}
        </span>
        {isTooShort && (
          <span className="validation-msg">
            At least {minLength} characters required
          </span>
        )}
      </div>

      <button type="submit" disabled={!isValid}>Search</button>
    </form>
  )
}
```

---

---

# 8 — Updating Objects and Arrays Immutably

---

## T — TL;DR

React state updates require **new references** — you must create a new object or array instead of mutating the existing one. React uses reference equality to detect changes. The patterns: spread operator for objects (`{...obj, key: newVal}`), spread + map/filter for arrays.

---

## K — Key Concepts

```tsx
// ── Object updates ────────────────────────────────────────────────────────
interface User { id: number; name: string; email: string; active: boolean }
const [user, setUser] = useState<User>({ id: 1, name: 'Mark', email: 'm@ex.com', active: true })

// ✅ Spread to create a new object with one field changed
setUser(prev => ({ ...prev, name: 'Alex' }))
setUser(prev => ({ ...prev, active: false }))

// ✅ Multiple fields at once
setUser(prev => ({ ...prev, name: 'Alex', email: 'alex@ex.com' }))

// ── Nested object updates ─────────────────────────────────────────────────
interface Profile {
  user: { name: string; age: number }
  settings: { theme: 'light' | 'dark'; notifications: boolean }
}

const [profile, setProfile] = useState<Profile>({
  user:     { name: 'Mark', age: 28 },
  settings: { theme: 'light', notifications: true },
})

// ✅ Spread at each level of nesting
function updateTheme(theme: 'light' | 'dark') {
  setProfile(prev => ({
    ...prev,
    settings: { ...prev.settings, theme },   // spread nested object too
  }))
}
```

```tsx
// ── Array updates ─────────────────────────────────────────────────────────
interface Todo { id: number; text: string; done: boolean }
const [todos, setTodos] = useState<Todo[]>([])

// ✅ ADD — spread existing + new item
function addTodo(text: string) {
  const newTodo: Todo = { id: Date.now(), text, done: false }
  setTodos(prev => [...prev, newTodo])
}

// ✅ REMOVE — filter out the item
function removeTodo(id: number) {
  setTodos(prev => prev.filter(todo => todo.id !== id))
}

// ✅ UPDATE — map and replace the matching item
function toggleTodo(id: number) {
  setTodos(prev =>
    prev.map(todo =>
      todo.id === id
        ? { ...todo, done: !todo.done }   // new object for changed item
        : todo                             // same object for unchanged items
    )
  )
}

// ✅ REORDER — create new array with different order
function moveToTop(id: number) {
  setTodos(prev => {
    const item = prev.find(t => t.id === id)
    if (!item) return prev
    return [item, ...prev.filter(t => t.id !== id)]
  })
}
```

```tsx
// ── Quick reference: immutable array operations ───────────────────────────
const arr = [1, 2, 3, 4, 5]

// Instead of: push     → [...arr, newItem]
// Instead of: unshift  → [newItem, ...arr]
// Instead of: pop      → arr.slice(0, -1)
// Instead of: shift    → arr.slice(1)
// Instead of: splice   → [...arr.slice(0, i), newItem, ...arr.slice(i)]
// Instead of: sort     → [...arr].sort()
// Instead of: reverse  → [...arr].reverse()
// Instead of: splice   → arr.filter((_, i) => i !== targetIndex)  (remove by index)
```

---

## W — Why It Matters

- React uses `Object.is` / reference equality to detect state changes — if you mutate an object and pass the same reference to `setState`, React sees the same object and may skip re-rendering. Your UI silently goes stale.
- The spread pattern (`{ ...prev, field: value }`) is the foundational immutable update — everything else (Immer, Zustand's produce) builds on this mental model. Learn spread first, then appreciate what Immer simplifies.
- `array.map` for updating one item in a list is idiomatic React — it's O(n) but the correct trade-off. For very large lists with frequent updates, a `Map<id, item>` state structure is more efficient.

---

## I — Interview Q&A

### Q: Why must you update state immutably in React?

**A:** React detects state changes using reference equality — it compares the new state value with the previous using `Object.is`. If you mutate an object and pass the same reference to `setState`, React sees the same reference and may skip re-rendering, leaving the UI stale. Additionally, React's upcoming concurrent features depend on being able to compare previous and next state — mutation makes this impossible. Creating new objects and arrays (`{ ...prev, key: val }`, `[...arr, item]`) ensures React always sees a new reference for changed state, triggering re-render reliably. It also makes debugging easier — you can compare snapshots of state over time.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to spread nested objects — sibling fields wiped

```tsx
interface Settings {
  theme:     'light' | 'dark'
  language:  string
  timezone:  string
}
interface AppConfig {
  user:     { name: string; email: string }
  settings: Settings
}

const [config, setConfig] = useState<AppConfig>({
  user:     { name: 'Mark', email: 'm@ex.com' },
  settings: { theme: 'light', language: 'en', timezone: 'Asia/Manila' },
})

// ❌ Spread only at top level — nested settings object REPLACED, not merged
function setBadTheme(theme: 'light' | 'dark') {
  setConfig(prev => ({
    ...prev,
    settings: { theme },   // ❌ language and timezone lost!
  }))
}

// ✅ Spread at every nested level you modify
function setGoodTheme(theme: 'light' | 'dark') {
  setConfig(prev => ({
    ...prev,
    settings: { ...prev.settings, theme },   // ✅ language and timezone preserved
  }))
}
```

---

## K — Coding Challenge + Solution

### Challenge

Implement a full todo list: add, remove, toggle done, and edit text in place — all with immutable state updates.

### Solution

```tsx
interface Todo {
  id:   number
  text: string
  done: boolean
}

function TodoApp() {
  const [todos,   setTodos]   = useState<Todo[]>([])
  const [input,   setInput]   = useState('')
  const [editId,  setEditId]  = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  // ADD
  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setTodos(prev => [...prev, { id: Date.now(), text: input.trim(), done: false }])
    setInput('')
  }

  // REMOVE
  function handleRemove(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  // TOGGLE
  function handleToggle(id: number) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
    )
  }

  // EDIT: start
  function handleEditStart(todo: Todo) {
    setEditId(todo.id)
    setEditText(todo.text)
  }

  // EDIT: save
  function handleEditSave(id: number) {
    if (!editText.trim()) return
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, text: editText.trim() } : t)
    )
    setEditId(null)
    setEditText('')
  }

  return (
    <div>
      <form onSubmit={handleAdd}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="New todo…" />
        <button type="submit" disabled={!input.trim()}>Add</button>
      </form>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={() => handleToggle(todo.id)} />
            {editId === todo.id ? (
              <>
                <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
                <button onClick={() => handleEditSave(todo.id)}>Save</button>
                <button onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                  {todo.text}
                </span>
                <button onClick={() => handleEditStart(todo)}>Edit</button>
                <button onClick={() => handleRemove(todo.id)}>✕</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p>{todos.filter(t => !t.done).length} remaining</p>
    </div>
  )
}
```

---

---

# 9 — Isolated State Per Component Instance

---

## T — TL;DR

Each **instance** of a component gets its own isolated state. Rendering `<Counter />` twice creates two independent counters. State is tied to the **component's position in the tree** — not to the component function itself. Moving a component in the tree resets its state.

---

## K — Key Concepts

```tsx
// ── Each instance is independent ──────────────────────────────────────────
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}

function App() {
  return (
    <div>
      <Counter />   {/* instance A — own state: count=0 */}
      <Counter />   {/* instance B — own state: count=0 */}
      <Counter />   {/* instance C — own state: count=0 */}
    </div>
  )
}
// Clicking +1 on instance A doesn't affect B or C ✅
// Three separate state "slots" in React's tree
```

```tsx
// ── State is tied to position, not to the component ──────────────────────
function App() {
  const [showFirst, setShowFirst] = useState(true)

  return (
    <div>
      {showFirst ? <Counter /> : <Counter />}
      {/* Both branches render <Counter /> at the SAME tree position */}
      {/* React sees: same position, same component type → SAME state preserved */}
      {/* Even though it's "different" in the code */}

      <button onClick={() => setShowFirst(s => !s)}>Toggle</button>
    </div>
  )
}

// To RESET state: change the key
function AppWithReset() {
  const [showFirst, setShowFirst] = useState(true)
  return (
    <div>
      {showFirst
        ? <Counter key="first"  />
        : <Counter key="second" />
      }
      {/* Different keys → different identity → state resets on toggle ✅ */}
    </div>
  )
}
```

```tsx
// ── Resetting state intentionally with key ────────────────────────────────
// Changing key forces remount — all state is reset
// Common use cases:

// 1. Reset a form when switching between records
function UserEditor({ userId }: { userId: number }) {
  return (
    <EditForm key={userId} userId={userId} />
    // When userId changes, key changes → form unmounts+remounts → fresh state ✅
    // No need for a manual "reset" inside EditForm
  )
}

// 2. Reset a search input when navigating to a new category
function CategoryPage({ categoryId }: { categoryId: string }) {
  return (
    <SearchBar key={categoryId} />  // fresh search on every category ✅
  )
}
```

```tsx
// ── What "same position" means ────────────────────────────────────────────
function ConditionalDemo() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <div>
      {isLoggedIn
        ? <UserPanel />        // position 0: UserPanel
        : <GuestBanner />      // position 0: GuestBanner
      }
      {/* Different component types at same position → React DOES reset state */}
      {/* UserPanel and GuestBanner are different types → different identity */}
    </div>
  )
}
// If both branches render the SAME component type, state is preserved
// If they render DIFFERENT types, state is destroyed and re-created
```

---

## W — Why It Matters

- "State belongs to the position in the tree, not the component" explains the key reset pattern — the most elegant way to reset a form when switching users or records without writing cleanup logic.
- Isolated state per instance is what makes component reuse clean — you don't need to manually manage which counter or which input is "active." React handles isolation automatically.
- The "same position = same state" rule explains the bug where two different components rendered at the same position unexpectedly share state transitions — understanding this prevents a whole class of conditional rendering bugs.

---

## I — Interview Q&A

### Q: How does React determine whether to preserve or reset a component's state?

**A:** React preserves state for a component as long as it renders **the same component type at the same position in the tree**. If a component is unmounted (removed from the tree) or replaced by a different component type at the same position, its state is destroyed. If the same component type re-renders at the same position, state is preserved — even if the surrounding conditions changed. You can force React to treat an instance as a new component (and reset its state) by changing its `key` prop — a new key causes unmount + remount. This is the idiomatic way to reset a form component when the user switches records.

---

## C — Common Pitfalls + Fix

### ❌ Expecting state to reset when props change

```tsx
// ❌ Assumes state resets when userId prop changes
function UserProfile({ userId }: { userId: number }) {
  const [notes, setNotes] = useState('')   // ❌ persists across userId changes
  // Same component, same position → state preserved even when userId changes

  return (
    <textarea
      value={notes}
      onChange={e => setNotes(e.target.value)}
      placeholder={`Notes for user ${userId}`}
    />
  )
}
// Bug: notes from user 1 still show when you switch to user 2

// ✅ Fix 1: key prop — forces remount on userId change
function ParentFixed({ userId }: { userId: number }) {
  return <UserProfile key={userId} userId={userId} />
}

// ✅ Fix 2: useEffect to reset state when prop changes (less clean)
function UserProfileEffect({ userId }: { userId: number }) {
  const [notes, setNotes] = useState('')
  useEffect(() => {
    setNotes('')   // reset when userId changes
  }, [userId])
  return <textarea value={notes} onChange={e => setNotes(e.target.value)} />
}
// Prefer Fix 1 (key) — it's declarative and has no timing issues
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TabPanel` where each tab has its own independent counter. Show that switching tabs preserves each tab's counter state. Then add a "Reset All" button that resets all counters using the key pattern.

### Solution

```tsx
const TABS = ['Alpha', 'Beta', 'Gamma'] as const
type TabName = typeof TABS[number]

// Independent counter with its own state
function TabContent({ label }: { label: string }) {
  const [count, setCount] = useState(0)
  return (
    <div className="tab-content">
      <p>{label} counter: <strong>{count}</strong></p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset this tab</button>
    </div>
  )
}

function TabPanel() {
  const [activeTab, setActiveTab] = useState<TabName>('Alpha')
  const [resetKey,  setResetKey]  = useState(0)

  function handleResetAll() {
    setResetKey(k => k + 1)   // changing key on ALL TabContent forces remount ✅
  }

  return (
    <div>
      <div className="tab-bar" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab active' : 'tab'}
          >
            {tab}
          </button>
        ))}
        <button onClick={handleResetAll} className="btn-reset-all">
          Reset all tabs
        </button>
      </div>

      <div role="tabpanel">
        {TABS.map(tab => (
          // Render all tabs but only show the active one
          // key={`${tab}-${resetKey}`} resets state when resetKey changes
          <div key={`${tab}-${resetKey}`} hidden={activeTab !== tab}>
            <TabContent label={tab} />
          </div>
        ))}
      </div>
    </div>
  )
}
// Each TabContent has isolated state — switching tabs preserves their counts
// Changing resetKey forces all TabContent instances to remount → counters reset
```

---

## ✅ Day 2 Complete — React Interactivity

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Event Handling | ☐ |
| 2 | Passing Handlers | ☐ |
| 3 | useState | ☐ |
| 4 | State as a Snapshot | ☐ |
| 5 | Re-render Cycle | ☐ |
| 6 | Batching Mindset | ☐ |
| 7 | Controlled Inputs | ☐ |
| 8 | Updating Objects and Arrays Immutably | ☐ |
| 9 | Isolated State Per Component Instance | ☐ |

---

## 🗺️ One-Page Mental Model — Day 2

```
EVENT HANDLING
  onClick={fn}  not  onClick={fn()}  — reference, not call
  () => fn(arg) — inline arrow when you need to pass args
  e.preventDefault()  → stop browser default (form submit, link)
  e.stopPropagation() → stop bubbling to parent
  Type: React.ChangeEvent<HTMLInputElement>, React.MouseEvent<HTMLButtonElement>

PASSING HANDLERS
  Props named 'on': onDelete, onChange, onSelect (the signal)
  Implementation named 'handle': handleDelete, handleChange (the response)
  Child fires → parent handles → state updates → child re-renders with new data
  Lifting state up: move state to nearest common ancestor of components that need it
  Pass state setter directly as handler: onChange={setValue} ✅

useState
  const [value, setValue] = useState(initialValue)
  setter SCHEDULES a re-render — does not mutate value in place
  TypeScript: useState<T | null>(null) for nullable state
  Functional updater: setValue(prev => prev + 1) — safe for multiple calls
  Multiple setters → choose: grouped object (always change together) or separate vars
  Never mutate state directly — always use the setter

STATE AS A SNAPSHOT
  Each render captures state as frozen constants for that render
  Calling setter doesn't change current render's value — schedules next render
  Stale closure: setTimeout/async closures capture snapshot values, not live values
  Fix stale closure: use functional updater OR use ref (Day 3)
  Local variable trick: const next = val + 1; setter(next); use(next) for same-render access

RE-RENDER CYCLE
  Triggers: state change | parent re-render | context change
  Process: call component fn → reconcile (diff) → commit (minimal DOM update)
  Re-render ≠ DOM repaint — React only touches what changed
  Same primitive value: Object.is → React bails out, no re-render
  Same object reference (mutated): React bails out → stale UI bug

BATCHING
  Multiple setters in one event → ONE re-render (not one per setter)
  React 18: batching everywhere — including setTimeout, fetch, Promises
  flushSync: force synchronous DOM update (rare — only for DOM measurement)
  Group related state that always changes together → single setState call

CONTROLLED INPUTS
  value={state} + onChange → React owns the value
  Checkbox: checked={bool} + onChange={e => setState(e.target.checked)}
  Select: value={str} + onChange={e => setState(e.target.value)}
  value without onChange = read-only (React warns you)
  defaultValue = uncontrolled with initial value
  Generic handler: e.target.name as object key → one handler for many inputs

IMMUTABLE UPDATES
  Objects:  setUser(prev => ({ ...prev, field: newVal }))
  Nested:   spread at every level you modify
  Add:      setArr(prev => [...prev, newItem])
  Remove:   setArr(prev => prev.filter(item => item.id !== id))
  Update:   setArr(prev => prev.map(item => item.id === id ? {...item, field: val} : item))
  Never: push, pop, splice, sort (in place) — always copy first

ISOLATED STATE PER INSTANCE
  State belongs to the POSITION in the tree, not the component function
  Same component type, same position → state preserved across re-renders
  Different component type at same position → state destroyed and recreated
  Change key → force remount → state reset (idiomatic "reset on prop change")
  Use case: <Form key={userId} /> resets form when userId changes
```

> **Your next action:** Open a React project and find a form or button. Add one `useState` variable, wire `value` + `onChange` on an input, and console.log the value on submit. Five minutes of real controlled input beats rereading this page.

> "Doing one small thing beats opening a feed."