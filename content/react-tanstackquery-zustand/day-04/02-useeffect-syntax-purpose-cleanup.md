# 2 — useEffect — Syntax, Purpose, Cleanup

---

## T — TL;DR

`useEffect` runs **after** React commits to the DOM, for side effects that need to synchronize with the outside world — subscriptions, timers, DOM manipulation, analytics. It returns an optional **cleanup function** that runs before the next effect or when the component unmounts.

---

## K — Key Concepts

```tsx
import { useEffect } from 'react'

// ── Anatomy of useEffect ──────────────────────────────────────────────────
useEffect(
  () => {             // setup function — runs after render
    // side effect here

    return () => {    // cleanup function (optional)
      // undo the side effect
    }
  },
  [deps]              // dependency array (controls when it re-runs)
)
```

```tsx
// ── Three dependency array forms ──────────────────────────────────────────
// 1. No array: runs after EVERY render
useEffect(() => {
  console.log('runs after every render')
})

// 2. Empty array: runs ONCE after the initial render (mount)
useEffect(() => {
  console.log('runs once on mount')
  return () => console.log('runs once on unmount')
}, [])

// 3. With dependencies: runs when any dependency changes
useEffect(() => {
  console.log('runs when userId or filter changes')
}, [userId, filter])
```

```tsx
// ── Cleanup in practice ───────────────────────────────────────────────────
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    // Setup: connect to chat room
    const connection = createChatConnection(roomId)
    connection.connect()
    console.log(`Connected to ${roomId}`)

    // Cleanup: disconnect before next effect or unmount
    return () => {
      connection.disconnect()
      console.log(`Disconnected from ${roomId}`)
    }
  }, [roomId])
  // When roomId changes:
  //   1. Cleanup runs (disconnect old room)
  //   2. Effect runs (connect new room)
  // When component unmounts:
  //   1. Cleanup runs (disconnect)
}
```

```tsx
// ── Common effect patterns ────────────────────────────────────────────────

// Timers
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(id)   // cleanup: stop timer ✅
}, [])

// Event listeners
useEffect(() => {
  function handleResize() { setWidth(window.innerWidth) }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)  // cleanup ✅
}, [])

// Document title
useEffect(() => {
  const previous = document.title
  document.title = `${count} new messages`
  return () => { document.title = previous }  // restore on unmount ✅
}, [count])

// AbortController for fetch
useEffect(() => {
  const controller = new AbortController()
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
  return () => controller.abort()   // cleanup: cancel in-flight request ✅
}, [userId])
```

---

## W — Why It Matters

- Cleanup is what separates "it works in development" from "it works in production" — subscriptions without cleanup leak memory and cause stale callbacks on unmounted components.
- React Strict Mode mounts components **twice** in development (intentionally) to surface missing cleanup — if your effect runs twice and the page breaks, the cleanup is wrong or missing.
- The `AbortController` pattern is essential for fetch in effects — without it, a fast user navigating away while a request is in-flight triggers a state update on an unmounted component.

---

## I — Interview Q&A

### Q: What is the cleanup function in `useEffect` and when does it run?

**A:** The cleanup function is the optional return value from the `useEffect` setup function. React runs it in two situations: (1) before the effect re-runs — when dependencies change, React first runs the previous cleanup, then runs the new setup. (2) When the component unmounts — React runs the final cleanup. The purpose is to undo whatever the setup did: cancel a subscription, clear a timer, abort a fetch, remove an event listener. Without cleanup, subscriptions accumulate (memory leak), event listeners fire on stale components, and fetch responses update unmounted components (triggering warnings). In Strict Mode (development), React intentionally runs the setup and cleanup twice to verify cleanup is correct.

---

## C — Common Pitfalls + Fix

### ❌ setState on unmounted component after async operation

```tsx
// ❌ No cleanup — setState called after unmount
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser(data))  // ❌ might run after unmount
  }, [userId])
}

// ✅ AbortController cancels the in-flight request on cleanup
function UserProfileFixed({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()   // ✅ cancel on cleanup
  }, [userId])

  return <div>{user?.name ?? 'Loading…'}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useWindowSize` effect: subscribes to `window.resize`, returns `{ width, height }`, cleans up the listener. Show the full lifecycle in comments.

### Solution

```tsx
interface WindowSize { width: number; height: number }

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width:  window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    // SETUP: add resize listener
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    console.log('resize listener added')

    // CLEANUP: remove listener before next effect or unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      console.log('resize listener removed')
    }
  }, [])
  // Empty deps: setup once on mount, cleanup once on unmount
  // Resize event fires → setSize → component re-renders with new size

  return size
}

// Usage
function ResponsiveLayout() {
  const { width, height } = useWindowSize()
  return (
    <div>
      <p>Window: {width} × {height}</p>
      {width < 768 ? <MobileNav /> : <DesktopNav />}
    </div>
  )
}
```

---

---
