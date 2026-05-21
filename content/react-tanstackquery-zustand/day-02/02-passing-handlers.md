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
