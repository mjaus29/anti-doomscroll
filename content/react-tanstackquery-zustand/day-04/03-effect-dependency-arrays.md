# 3 — Effect Dependency Arrays

---

## T — TL;DR

The dependency array tells React **when to re-run the effect**. Include every reactive value the effect reads. React's ESLint rule (`exhaustive-deps`) catches missing dependencies. The fix for "my effect runs too often" is almost never removing a dependency — it's restructuring the code.

---

## K — Key Concepts

```tsx
// ── Every reactive value used in the effect must be in deps ───────────────
function SearchResults({ query, page }: { query: string; page: number }) {
  const [results, setResults] = useState<string[]>([])

  useEffect(() => {
    if (!query) return
    fetchResults(query, page).then(setResults)
    //            ↑       ↑
    //            both used in effect — both must be in deps ✅
  }, [query, page])   // ← correct
}
```

```tsx
// ── What counts as "reactive" ─────────────────────────────────────────────
function Component({ userId }: { userId: number }) {
  const [filter, setFilter] = useState('active')
  const BASE_URL = 'https://api.example.com'  // module-level constant

  useEffect(() => {
    // userId → prop → reactive → needs in deps ✅
    // filter → state → reactive → needs in deps ✅
    // BASE_URL → module-level constant → NOT reactive → omit ✅
    // setFilter → state setter → stable reference → safe to omit ✅
    fetch(`${BASE_URL}/users/${userId}?filter=${filter}`)
  }, [userId, filter])
  //  ↑         ↑      setFilter and BASE_URL correctly omitted
}
```

```tsx
// ── Common dep array mistakes ─────────────────────────────────────────────

// ❌ Missing dependency (stale closure)
function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + step)   // reads step but step not in deps ❌
    }, 1000)
    return () => clearInterval(id)
  }, [])  // ← missing step → always uses initial step value (stale closure)
}

// ✅ Fix 1: add step to deps
useEffect(() => {
  const id = setInterval(() => { setCount(count + step) }, 1000)
  return () => clearInterval(id)
}, [count, step])  // restarts timer when either changes

// ✅ Fix 2: functional updater avoids reading count in the effect
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + step)   // doesn't need to read count ✅
  }, 1000)
  return () => clearInterval(id)
}, [step])  // only restarts when step changes ✅
```

```tsx
// ── Object and function dependencies — a trap ─────────────────────────────
// ❌ Object created in render — new reference every render → infinite loop
function UserData({ userId }: { userId: number }) {
  const options = { method: 'GET', cache: 'no-cache' }   // new object every render ❌

  useEffect(() => {
    fetch(`/api/${userId}`, options)
  }, [userId, options])  // options changes every render → infinite loop ❌
}

// ✅ Fix: move static objects outside the component
const FETCH_OPTIONS = { method: 'GET', cache: 'no-cache' } as const

function UserDataFixed({ userId }: { userId: number }) {
  useEffect(() => {
    fetch(`/api/${userId}`, FETCH_OPTIONS)
  }, [userId])   // FETCH_OPTIONS is stable — doesn't need to be in deps ✅
}
```

---

## W — Why It Matters

- The `exhaustive-deps` ESLint rule is your compiler for effects — it catches stale closures before they ship to production. Never disable it without understanding the consequence.
- "Remove the dep to fix the infinite loop" is the wrong fix — the right fix is to stabilize the dep (move it outside render, use `useCallback`, restructure with functional updater). Removing it creates stale closures.
- The functional updater pattern (`setCount(prev => prev + step)`) removes the need for `count` in the dependency array — a key technique for timer effects.

---

## I — Interview Q&A

### Q: What happens if you omit a dependency from a `useEffect` dependency array?

**A:** The effect closes over a stale value — the value from the render in which the effect last ran, not the current value. This is a stale closure bug. For example, if an interval callback reads `count` from its closure and `count` isn't in the dependency array, the interval always sees the initial value of `count` regardless of how many times state updates. The effect won't re-run with the new `count`, so the closure remains stale. The ESLint `exhaustive-deps` rule catches this. The correct fix is adding the missing dependency and restructuring the effect if it causes unwanted re-runs (e.g., use a functional updater to remove the read of `count` from inside the effect).

---

## C — Common Pitfalls + Fix

### ❌ `[]` dependency array when the effect actually uses props

```tsx
// ❌ Empty array but effect uses 'url' prop — stale closure
function DataFetcher({ url }: { url: string }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData)
    // url is used here but not in deps ❌
    // When url prop changes, effect won't re-run → shows stale data
  }, [])  // ← should be [url]

  return <div>{JSON.stringify(data)}</div>
}

// ✅ Include url in deps — re-fetches when url changes
function DataFetcherFixed({ url }: { url: string }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()
  }, [url])  // ✅ re-fetches when url changes, cancels in-flight on change

  return <div>{JSON.stringify(data)}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Fix this effect: a chat room subscription that uses `roomId` and `userId` but has wrong dependencies and no cleanup.

### Solution

```tsx
// ❌ Before: wrong deps, no cleanup
function ChatRoomBad({ roomId, userId }: { roomId: string; userId: number }) {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const sub = subscribeToRoom(roomId, userId, (msg: string) => {
      setMessages(prev => [...prev, msg])
    })
    // no cleanup, missing deps
  }, [roomId])  // ← userId missing, no cleanup function
}

// ✅ After: correct deps, cleanup that unsubscribes
function ChatRoomFixed({ roomId, userId }: { roomId: string; userId: number }) {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    // Setup: subscribe with both roomId and userId
    const sub = subscribeToRoom(roomId, userId, (msg: string) => {
      setMessages(prev => [...prev, msg])
    })

    // Cleanup: unsubscribe before re-running or unmounting
    return () => {
      sub.unsubscribe()
    }
  }, [roomId, userId])  // ✅ both reactive values included

  return (
    <ul>
      {messages.map((m, i) => <li key={i}>{m}</li>)}
    </ul>
  )
}
```

---

---
