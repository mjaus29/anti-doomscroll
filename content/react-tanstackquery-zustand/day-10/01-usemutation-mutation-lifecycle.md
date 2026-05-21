# 1 — useMutation + Mutation Lifecycle

---

## T — TL;DR

`useMutation` handles any state-changing operation: POST, PATCH, PUT, DELETE. It gives you `mutate` / `mutateAsync`, a lifecycle (`onMutate → onSuccess | onError → onSettled`), and loading/error/success states — no `useEffect` needed.

---

## K — Key Concepts

```tsx
import { useMutation } from '@tanstack/react-query'

// ── Basic anatomy ─────────────────────────────────────────────────────────
const {
  mutate,         // (variables) => void — fire and forget
  mutateAsync,    // (variables) => Promise — await the result
  isPending,      // true while mutation is in flight
  isSuccess,      // true after successful completion
  isError,        // true after failure
  error,          // Error | null
  data,           // TData | undefined — response from mutationFn
  reset,          // () => void — reset to idle state
} = useMutation({
  mutationFn: async (newUser: NewUser) => {
    const res = await fetch('/api/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(newUser),
    })
    if (!res.ok) throw new Error(`Create user failed: ${res.status}`)
    return res.json() as Promise<User>
  },
})
```

```tsx
// ── Lifecycle callbacks ────────────────────────────────────────────────────
const mutation = useMutation({
  mutationFn: createUser,

  onMutate: async (variables) => {
    // Fires BEFORE mutationFn — use for optimistic updates
    console.log('About to create:', variables)
    return { timestamp: Date.now() }  // context passed to onError/onSettled
  },

  onSuccess: (data, variables, context) => {
    // Fires after mutationFn resolves
    console.log('Created user:', data)
    // ← best place to invalidate queries
  },

  onError: (error, variables, context) => {
    // Fires after mutationFn throws
    console.error('Failed to create user:', error.message)
    // ← rollback optimistic updates here
  },

  onSettled: (data, error, variables, context) => {
    // Fires after onSuccess OR onError — always
    // ← good place for cleanup regardless of outcome
  },
})
```

```tsx
// ── mutate vs mutateAsync ────────────────────────────────────────────────
function CreateUserForm() {
  const mutation = useMutation({ mutationFn: createUser })

  // mutate: fire-and-forget, errors handled in onError callback
  function handleSimpleSubmit(data: NewUser) {
    mutation.mutate(data)
  }

  // mutateAsync: use when you need to await and handle errors locally
  async function handleAsyncSubmit(data: NewUser) {
    try {
      const user = await mutation.mutateAsync(data)
      router.push(`/users/${user.id}`)    // redirect after success ✅
    } catch (err) {
      console.error('Mutation failed:', err)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate({ name: 'Alice' }) }}>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create User'}
      </button>
      {mutation.isError && (
        <p role="alert">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p>User created!</p>}
    </form>
  )
}
```

```tsx
// ── Mutation state machine ────────────────────────────────────────────────
// idle → pending → success
//              ↘ error
//
// idle:    not yet called, or after reset()
// pending: mutationFn in flight
// success: resolved with data
// error:   threw an error
// reset(): goes back to idle from success or error
```

---

## W — Why It Matters

- `useMutation` replaces the `loading/error/success` state pattern you'd otherwise build with 3 `useState` calls and a `try/catch` in an event handler — every time, consistently.
- The lifecycle callbacks (`onMutate`, `onSuccess`, `onError`, `onSettled`) provide clean hooks for optimistic updates, cache invalidation, analytics, and rollback — co-located with the mutation, not scattered in event handlers.
- `mutateAsync` is essential when the result of a mutation determines navigation or triggers a follow-up action — `mutate` is simpler when side effects live in callbacks.

---

## I — Interview Q&A

### Q: What is the difference between `mutate` and `mutateAsync` in TanStack Query?

**A:** Both call the `mutationFn`. `mutate` is fire-and-forget — it returns `void`, and you handle success/error in the lifecycle callbacks (`onSuccess`, `onError`). It swallows errors so they don't propagate as unhandled promise rejections. `mutateAsync` returns a `Promise` — you can `await` it and handle results inline with `try/catch`. Use `mutate` when the mutation has no follow-up logic in the calling component (callbacks handle everything). Use `mutateAsync` when you need to chain actions on the result — redirect after creation, show a second modal, or trigger a dependent mutation.

---

## C — Common Pitfalls + Fix

### ❌ Calling `mutate` inside `useEffect` — side effects from effects

```tsx
// ❌ mutate in useEffect — fires on every render where deps change
function AutoSaveBad({ data }: { data: FormData }) {
  const mutation = useMutation({ mutationFn: saveData })
  useEffect(() => {
    mutation.mutate(data)   // ❌ fires immediately on every data change
  }, [data])
}

// ✅ Debounce + explicit trigger, or use refetch pattern for reads
function AutoSaveGood({ data }: { data: FormData }) {
  const mutation = useMutation({ mutationFn: saveData })
  const debouncedSave = useDebouncedCallback(
    () => mutation.mutate(data), 1000
  )
  useEffect(() => { debouncedSave() }, [data, debouncedSave])
  return <span>{mutation.isPending ? 'Saving…' : 'Saved'}</span>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `DeleteButton` using `useMutation` with `isPending` disabled state, confirmation step, error display, and `onSuccess` callback.

### Solution

```tsx
async function deletePost(postId: number): Promise<void> {
  const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

function DeleteButton({
  postId, onDeleted
}: { postId: number; onDeleted: () => void }) {
  const [confirmed, setConfirmed] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess:  () => { onDeleted(); setConfirmed(false) },
    onError:    ()  => setConfirmed(false),
  })

  if (!confirmed) {
    return (
      <button onClick={() => setConfirmed(true)} className="btn-danger">
        Delete
      </button>
    )
  }

  return (
    <div className="confirm-row">
      <span>Are you sure?</span>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="btn-danger"
      >
        {mutation.isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={() => setConfirmed(false)} disabled={mutation.isPending}>
        Cancel
      </button>
      {mutation.isError && (
        <p role="alert" className="error">
          {(mutation.error as Error).message}
        </p>
      )}
    </div>
  )
}
```

---

---
