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
