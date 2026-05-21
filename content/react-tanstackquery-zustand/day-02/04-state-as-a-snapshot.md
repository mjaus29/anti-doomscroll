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
