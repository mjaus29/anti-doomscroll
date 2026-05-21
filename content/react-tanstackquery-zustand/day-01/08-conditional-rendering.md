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
