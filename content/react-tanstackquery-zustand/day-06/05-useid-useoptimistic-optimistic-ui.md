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
