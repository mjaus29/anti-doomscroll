# 7 — Async Actions

---

## T — TL;DR

Zustand actions can be `async`. They call `set` before, during, and after an async operation — managing loading and error state inside the store. There's no middleware required; it's just a regular `async` function inside `create`.

---

## K — Key Concepts

```tsx
// ── Async action pattern ──────────────────────────────────────────────────
interface UserStore {
  user:      User | null
  isLoading: boolean
  error:     string | null
  fetchUser: (id: number) => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

const useUserStore = create<UserStore>(set => ({
  user:      null,
  isLoading: false,
  error:     null,

  fetchUser: async (id) => {
    set({ isLoading: true, error: null })       // loading state ✅
    try {
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const user = await res.json()
      set({ user, isLoading: false })            // success ✅
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })  // error ✅
    }
  },

  updateUser: async (data) => {
    const current = useUserStore.getState().user
    if (!current) return
    set({ isLoading: true })
    try {
      const res = await fetch(`/api/users/${current.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      const updated = await res.json()
      set({ user: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
```

```tsx
// ── Async with optimistic update in the store ─────────────────────────────
const useThemeStore = create<{
  preferences: UserPreferences
  savePref: (key: keyof UserPreferences, value: unknown) => Promise<void>
}>(set => ({
  preferences: { theme: 'light', language: 'en', notifications: true },

  savePref: async (key, value) => {
    const prev = useThemeStore.getState().preferences

    // Optimistic: update immediately
    set(state => ({ preferences: { ...state.preferences, [key]: value } }))

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    } catch (err) {
      // Rollback on failure
      set({ preferences: prev })
      console.error('Preference save failed, rolled back:', err)
    }
  },
}))
```

```tsx
// ── When to put async in Zustand vs TanStack Query ────────────────────────
// Zustand async actions: good for
//   - Login/logout (session management, not GET data)
//   - User preferences (write + immediate local reflection)
//   - File upload state (progress, result)
//   - One-off commands (submit form, trigger action)

// TanStack Query mutations: better for
//   - Any mutation that needs cache invalidation
//   - Optimistic updates tied to query cache
//   - Mutations with retry / rollback via onMutate
//   - Anything that affects useQuery-managed data
```

---

## W — Why It Matters

- Async actions in Zustand keep loading/error state co-located with the data they describe — no separate `useEffect` + `useState` pattern in every component.
- Using `useUserStore.getState()` inside an async action reads the current value at call time (not a stale closure) — essential for reading dependent state mid-async-operation.
- For pure client state with async writes (user preferences, auth), Zustand async actions are simpler than `useMutation` — no provider, no query key, no cache.

---

## I — Interview Q&A

### Q: How do you handle loading and error state in a Zustand async action?

**A:** Async actions call `set` at three points: before the await (`set({ isLoading: true, error: null })`), on success (`set({ data, isLoading: false })`), and in the catch block (`set({ error: message, isLoading: false })`). This is the same pattern as any async state machine — just without React's `useState`. The action is a plain async function inside the `create` callback. For reading state mid-action (to avoid stale closures from the create callback's closure), use `useMyStore.getState()` to get the live current state at that moment.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting to clear loading state on error path

```tsx
// ❌ isLoading stays true forever if an error is thrown
const useBadStore = create<Store>(set => ({
  isLoading: false,
  data: null,
  fetchData: async () => {
    set({ isLoading: true })
    const result = await getData()   // throws → isLoading stuck at true ❌
    set({ data: result, isLoading: false })
  },
}))

// ✅ try/finally: always reset loading state
const useGoodStore = create<Store>(set => ({
  isLoading: false,
  data: null,
  error: null,
  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getData()
      set({ data })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })   // ✅ always runs
    }
  },
}))
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useAuthStore` with async `login` and `logout` actions. Login: sets `isLoading`, calls `POST /api/login`, sets `user` on success, sets `error` on failure. Logout: clears user + calls `POST /api/logout`.

### Solution

```tsx
interface User { id: number; name: string; email: string; role: string }
interface AuthStore {
  user:      User | null
  isLoading: boolean
  error:     string | null
  login:     (email: string, password: string) => Promise<boolean>
  logout:    () => Promise<void>
  clearError: () => void
}

const useAuthStore = create<AuthStore>(set => ({
  user:      null,
  isLoading: false,
  error:     null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
        credentials: 'include',
      })
      if (res.status === 401) throw new Error('Invalid email or password')
      if (!res.ok)            throw new Error(`Login failed: ${res.status}`)
      const { user } = await res.json()
      set({ user, isLoading: false })
      return true
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      return false
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    } catch { /* silent fail — still clear local state */ }
    finally {
      set({ user: null, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))

function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore(
    useShallow(s => ({ login: s.login, isLoading: s.isLoading, error: s.error, clearError: s.clearError }))
  )
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email}    onChange={e => { clearError(); setEmail(e.target.value) }}    type="email" />
      <input value={password} onChange={e => { clearError(); setPassword(e.target.value) }} type="password" />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
```

---

---
