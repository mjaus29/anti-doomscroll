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
