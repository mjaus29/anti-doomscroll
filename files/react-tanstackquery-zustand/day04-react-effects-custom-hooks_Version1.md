
# 📅 Day 4 — React Effects and Custom Hooks

> **Goal:** Know exactly when to use `useEffect`, when NOT to, and how to extract logic into custom hooks.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 4 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | Hook Rules | 8 min |
| 2 | useEffect — Syntax, Purpose, Cleanup | 12 min |
| 3 | Effect Dependency Arrays | 12 min |
| 4 | Synchronizing with External Systems | 12 min |
| 5 | Separating Events from Effects | 10 min |
| 6 | Removing Unnecessary Effects | 12 min |
| 7 | Custom Hooks | 12 min |
| 8 | useDebugValue + Debugging in DevTools | 8 min |

---

---

# 1 — Hook Rules

---

## T — TL;DR

There are two rules for hooks: **only call hooks at the top level** (never inside loops, conditions, or nested functions), and **only call hooks from React function components or custom hooks**. These rules exist because React identifies hooks by their call order — breaking the order corrupts state.

---

## K — Key Concepts

```tsx
// ── Rule 1: Only call hooks at the top level ──────────────────────────────
// ❌ Hook inside a condition — call order changes based on condition
function BrokenComponent({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    const [name, setName] = useState('') // ❌ only called sometimes
  }
  const [email, setEmail] = useState('')  // React now thinks THIS is hook #1
}

// ❌ Hook inside a loop
function BrokenList({ items }: { items: string[] }) {
  return items.map((item, i) => {
    const [checked, setChecked] = useState(false) // ❌ number of hooks varies
    return <li key={i}>{item}</li>
  })
}

// ❌ Hook inside a nested function
function BrokenForm() {
  function handleSubmit() {
    const [error, setError] = useState('') // ❌ inside a nested function
  }
}

// ✅ All hooks at top level, unconditionally
function CorrectComponent({ isAdmin }: { isAdmin: boolean }) {
  const [name,  setName]  = useState('')   // always hook #1
  const [email, setEmail] = useState('')   // always hook #2

  // Condition is inside the JSX or logic — not wrapping the hook call
  if (!isAdmin) return null
  return <form>...</form>
}
```

```tsx
// ── Rule 2: Only call hooks from React functions ───────────────────────────
// ❌ Hook in a plain utility function
function formatUser(id: number) {
  const [user, setUser] = useState(null)  // ❌ plain function, not a component
  return user
}

// ❌ Hook in a class component
class MyClass extends React.Component {
  render() {
    const [x] = useState(0)  // ❌ hooks don't work in class components
    return null
  }
}

// ✅ Hook in a function component
function UserProfile({ id }: { id: number }) {
  const [user, setUser] = useState(null)  // ✅
  return <div>{user?.name}</div>
}

// ✅ Hook in a custom hook (function starting with 'use')
function useUser(id: number) {
  const [user, setUser] = useState(null)  // ✅ custom hook
  return user
}
```

```
── Why the rules exist ────────────────────────────────────────────────────────

React tracks hooks by CALL ORDER, not by name.
Each component render: hook call 1 → useState slot 1
                       hook call 2 → useState slot 2
                       hook call 3 → useEffect slot 1

If a hook call is skipped (condition) or added (loop):
  render 1: hook1=slot1, hook2=slot2, hook3=slot3
  render 2: hook1 skipped → hook2 gets slot1 (wrong data!) ❌

ESLint plugin: eslint-plugin-react-hooks enforces both rules automatically
Install: npm install --save-dev eslint-plugin-react-hooks
```

---

## W — Why It Matters

- The rules aren't arbitrary restrictions — they're a consequence of React's implementation. Hook call order is the only way React maps each hook call to its stored state. Violating order corrupts state silently.
- `eslint-plugin-react-hooks` catches violations at development time — it's non-optional in any professional React project. Not installing it means relying on runtime errors.
- Custom hooks (any function starting with `use`) follow the same rules and get the same ESLint enforcement — this is why the naming convention is mandatory, not stylistic.

---

## I — Interview Q&A

### Q: Why can't you call a hook inside an `if` statement?

**A:** React identifies each hook call by its **call order** within a component — not by name or variable. On every render, the first `useState` call maps to slot 1, the second to slot 2, and so on. If a hook is inside an `if` statement, it may or may not be called depending on the condition. When it's skipped, all subsequent hook calls shift positions — React reads the wrong state for every hook that follows. This produces bugs that are extremely hard to trace. The rule is enforced by `eslint-plugin-react-hooks` at development time. To conditionally use a value, call the hook unconditionally and then apply the condition to its output.

---

## C — Common Pitfalls + Fix

### ❌ Early return before all hooks are called

```tsx
// ❌ Early return before hooks — hooks after the return are skipped
function UserCard({ user }: { user: User | null }) {
  if (!user) return null    // ❌ early return BEFORE hooks below

  const [expanded, setExpanded] = useState(false)   // sometimes skipped
  useEffect(() => { document.title = user.name }, [user.name])  // sometimes skipped
}

// ✅ Call all hooks first, then handle the condition
function UserCardFixed({ user }: { user: User | null }) {
  const [expanded, setExpanded] = useState(false)   // always called ✅
  useEffect(() => {
    if (!user) return
    document.title = user.name
  }, [user?.name])

  if (!user) return null   // early return AFTER hooks ✅
  return <div>{user.name}</div>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Find all hook rule violations in this component and fix them without changing the intended behaviour.

```tsx
function Dashboard({ userId, showStats }: { userId: number; showStats: boolean }) {
  if (!userId) return <p>No user</p>
  const [name, setName] = useState('')
  for (let i = 0; i < 3; i++) {
    useEffect(() => { console.log(i) }, [])
  }
  if (showStats) {
    const [stats, setStats] = useState<number[]>([])
  }
  return <div>{name}</div>
}
```

### Solution

```tsx
function Dashboard({ userId, showStats }: { userId: number; showStats: boolean }) {
  // ✅ All hooks moved to top level — no conditions, no loops
  const [name,  setName]  = useState('')
  const [stats, setStats] = useState<number[]>([])

  // ✅ Three separate effects instead of looped hooks
  useEffect(() => { console.log(0) }, [])
  useEffect(() => { console.log(1) }, [])
  useEffect(() => { console.log(2) }, [])

  // ✅ Guard clause AFTER all hooks
  if (!userId) return <p>No user</p>

  return (
    <div>
      {name}
      {showStats && <ul>{stats.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    </div>
  )
}
```

---

---

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

# 4 — Synchronizing with External Systems

---

## T — TL;DR

`useEffect` is specifically for **synchronizing React state with external systems** — the DOM, browser APIs, third-party libraries, network connections, timers. When the component mounts, set it up. When it unmounts (or deps change), tear it down. This is the only valid purpose for `useEffect`.

---

## K — Key Concepts

```tsx
// ── What counts as an "external system" ──────────────────────────────────
// Browser APIs:    document.title, localStorage, navigator, IntersectionObserver
// DOM nodes:       focus, scroll, resize, canvas, video player
// Network:         WebSocket, EventSource, long-polling
// Third-party:     maps SDK, analytics, chat widget, video SDK
// Timers:          setInterval, setTimeout
// OS:              geolocation, clipboard, notifications
```

```tsx
// ── DOM synchronization ───────────────────────────────────────────────────
function AutoFocusInput({ shouldFocus }: { shouldFocus: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (shouldFocus) {
      inputRef.current?.focus()    // sync DOM state with React state ✅
    }
  }, [shouldFocus])

  return <input ref={inputRef} type="text" />
}

// ── localStorage synchronization ─────────────────────────────────────────
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))  // sync to external system ✅
    } catch (e) {
      console.error('localStorage write failed', e)
    }
  }, [key, value])

  return [value, setValue] as const
}
```

```tsx
// ── Third-party map library ────────────────────────────────────────────────
interface MapProps { center: { lat: number; lng: number }; zoom: number }

function MapWidget({ center, zoom }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<ThirdPartyMap | null>(null)

  // Effect 1: initialise map once on mount
  useEffect(() => {
    if (!containerRef.current) return
    mapRef.current = new ThirdPartyMap(containerRef.current, { center, zoom })
    return () => mapRef.current?.destroy()   // cleanup ✅
  }, [])  // only on mount

  // Effect 2: sync center/zoom when props change
  useEffect(() => {
    mapRef.current?.setView(center, zoom)    // sync external system ✅
  }, [center, zoom])

  return <div ref={containerRef} style={{ height: 400 }} />
}
```

```tsx
// ── WebSocket connection ──────────────────────────────────────────────────
function useLivePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`wss://prices.example.com/${symbol}`)
    ws.onmessage = e => setPrice(JSON.parse(e.data).price)
    ws.onerror   = () => console.error('WebSocket error')

    return () => ws.close()   // cleanup: close connection ✅
  }, [symbol])   // re-connect when symbol changes

  return price
}
```

---

## W — Why It Matters

- The mental model "useEffect synchronizes React with an external system" explains both when TO use it and when NOT to — if there's no external system involved, you probably don't need an effect.
- Third-party libraries (maps, video players, charts) often have imperative APIs that must be initialized once and kept in sync — this is the exact use case effects were designed for.
- Separating initialization and sync into two effects (init once, sync on prop change) is cleaner than one effect that tries to do both — each effect has a single clear purpose.

---

## I — Interview Q&A

### Q: What types of operations belong in `useEffect` vs what should NOT be there?

**A:** `useEffect` is for **side effects that synchronize with external systems**: subscribing to browser events, connecting to WebSockets, initializing third-party libraries, syncing with localStorage, updating `document.title`, managing timers. These need cleanup when the component unmounts. What should NOT be in `useEffect`: (1) Deriving state from other state — compute inline during render. (2) Transforming data for rendering — compute inline. (3) Handling user events — use event handlers. (4) Fetching data in modern React — use TanStack Query or `use()`. (5) Resetting state when props change — use the `key` prop. The presence of an `useEffect` to "sync derived state" almost always signals a design smell.

---

## C — Common Pitfalls + Fix

### ❌ Using `useEffect` to sync external library without cleanup

```tsx
// ❌ Chart initialized but never destroyed — memory leak
function SalesChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: { datasets: [{ data }] }
    })
    // ❌ No cleanup — Chart instance leaks on unmount/re-render
  }, [data])

  return <canvas ref={canvasRef} />
}

// ✅ Destroy chart in cleanup
function SalesChartFixed({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    chartRef.current?.destroy()   // destroy previous before creating new ✅
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { datasets: [{ data }] }
    })
    return () => {
      chartRef.current?.destroy()  // cleanup on unmount ✅
      chartRef.current = null
    }
  }, [data])

  return <canvas ref={canvasRef} />
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useGeolocation` custom hook that uses the browser's geolocation API, cleans up the watcher, and returns `{ lat, lng, error }`.

### Solution

```tsx
interface GeoPosition { lat: number; lng: number }
interface GeoState {
  position: GeoPosition | null
  error:    string | null
  loading:  boolean
}

function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    position: null,
    error:    null,
    loading:  true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: 'Geolocation not supported', loading: false })
      return
    }

    // Setup: watch position
    const watchId = navigator.geolocation.watchPosition(
      pos => setState({
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        error:    null,
        loading:  false,
      }),
      err => setState({ position: null, error: err.message, loading: false }),
      { enableHighAccuracy: true }
    )

    // Cleanup: clear watcher on unmount ✅
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])  // run once on mount

  return state
}

// Usage
function LocationDisplay() {
  const { position, error, loading } = useGeolocation()
  if (loading)   return <p>Getting location…</p>
  if (error)     return <p>Error: {error}</p>
  return <p>Lat: {position!.lat.toFixed(4)}, Lng: {position!.lng.toFixed(4)}</p>
}
```

---

---

# 5 — Separating Events from Effects

---

## T — TL;DR

**Events** run in direct response to a specific user action — once. **Effects** run whenever their dependencies change — to keep things in sync. The question is: "should this code run because the user did X, or because some value is Y?" If it's the former, use an event handler. If the latter, use an effect.

---

## K — Key Concepts

```
── Events vs Effects ─────────────────────────────────────────────────────────

Event handler:
  → Triggered by a specific interaction (click, submit, keypress)
  → Runs once per interaction
  → Not reactive to state changes
  → Place: onClick, onSubmit, onChange handlers

Effect:
  → Triggered by a dependency value changing
  → Runs whenever that value is different
  → Reactive — re-runs to stay "in sync"
  → Place: useEffect

Question: "If the user did nothing but a state/prop changed, should this run?"
  Yes → Effect
  No  → Event handler
```

```tsx
// ── Clear event handler: analytics on button click ─────────────────────────
function BuyButton({ productId }: { productId: number }) {
  function handleClick() {
    // ✅ Event handler: fires BECAUSE the user clicked — once, intentionally
    trackAnalytics('purchase_intent', { productId })
    addToCart(productId)
  }
  return <button onClick={handleClick}>Buy now</button>
}

// ❌ Wrong: putting click-specific logic in useEffect
function BuyButtonWrong({ productId }: { productId: number }) {
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    if (clicked) {
      // Runs whenever 'clicked' becomes true — even if it wasn't a new click ❌
      trackAnalytics('purchase_intent', { productId })
      addToCart(productId)
      setClicked(false)
    }
  }, [clicked, productId])

  return <button onClick={() => setClicked(true)}>Buy now</button>
}
```

```tsx
// ── Clear effect: sync connection when roomId changes ─────────────────────
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    // ✅ Effect: fires because roomId changed — should stay connected to current room
    const conn = connect(roomId)
    return () => conn.disconnect()
  }, [roomId])
  // This is reactive — if roomId changes while sitting on the page,
  // we should automatically reconnect. That's an effect.
}
```

```tsx
// ── The ambiguous case: notification on connect ───────────────────────────
function ChatRoom({ roomId, isVisible }: { roomId: string; isVisible: boolean }) {
  useEffect(() => {
    const conn = connect(roomId)
    // Should this fire every time isVisible changes? Probably not.
    // Showing a notification is an EVENT (connection happened)
    // not a synchronization (should always show notification when isVisible=true)
    if (isVisible) showNotification(`Joined ${roomId}`)  // ← debatable placement
    return () => conn.disconnect()
  }, [roomId, isVisible])  // ← fires too often (on every isVisible change)
}

// ✅ Cleaner: notification triggered by connect event, not by isVisible sync
function ChatRoomFixed({ roomId }: { roomId: string }) {
  const isVisible = useIsVisible()   // separate hook for visibility

  useEffect(() => {
    const conn = connect(roomId)
    conn.onConnect = () => {
      if (isVisible) showNotification(`Joined ${roomId}`)  // at connect time ✅
    }
    return () => conn.disconnect()
  }, [roomId, isVisible])
}
```

---

## W — Why It Matters

- Putting event logic in `useEffect` with a flag state is an over-engineered anti-pattern — it adds an extra render, makes the intent unclear, and creates edge cases (what if the flag was already true?).
- The "event vs effect" distinction shapes your component architecture — misplacing logic in the wrong bucket leads to effects that run at unexpected times.
- A notification sent on every `isVisible` change is a classic effect overcorrection — it feels "safe" to put everything in an effect, but effects re-run on dependency changes, not just on meaningful events.

---

## I — Interview Q&A

### Q: How do you decide whether to put code in an event handler or a `useEffect`?

**A:** Ask: "Should this code run **because a specific user interaction happened**, or because **some value changed** to a certain state?" User interactions (click, submit, keypress) belong in event handlers — they run once, triggered by the user. Reactive synchronization (stay connected to the right room, document title reflects count, localStorage reflects theme) belongs in effects — they run whenever a dependency changes. The key diagnostic: if you removed the user interaction and just changed the state directly in code, should the side effect still run? If yes, it's an effect. If no (it was caused by the specific interaction), it's an event handler.

---

## C — Common Pitfalls + Fix

### ❌ Routing through state to trigger a one-time event

```tsx
// ❌ Using a flag state to trigger a one-time action in useEffect
function SubmitForm() {
  const [formData,   setFormData]   = useState({ name: '', email: '' })
  const [shouldSave, setShouldSave] = useState(false)

  useEffect(() => {
    if (shouldSave) {
      saveToAPI(formData)   // ❌ extra render, confusing flow
      setShouldSave(false)
    }
  }, [shouldSave, formData])

  return (
    <button onClick={() => setShouldSave(true)}>Save</button>
  )
}

// ✅ Just call the function directly in the event handler
function SubmitFormFixed() {
  const [formData, setFormData] = useState({ name: '', email: '' })

  function handleSave() {
    saveToAPI(formData)   // ✅ direct, clear, runs once per click
  }

  return (
    <button onClick={handleSave}>Save</button>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Audit this component: identify what is incorrectly in an effect (should be an event handler) and what is correctly in an effect.

### Solution

```tsx
function ProductPage({ productId }: { productId: number }) {
  const [product,     setProduct]     = useState<Product | null>(null)
  const [addedToCart, setAddedToCart] = useState(false)
  const [cartCount,   setCartCount]   = useState(0)

  // 1: fetch product when productId changes → ✅ CORRECT in effect (reactive sync)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/products/${productId}`, { signal: controller.signal })
      .then(r => r.json()).then(setProduct)
    return () => controller.abort()
  }, [productId])

  // 2: track analytics when addedToCart becomes true → ❌ WRONG in effect
  useEffect(() => {
    if (addedToCart) {
      trackEvent('add_to_cart', { productId })  // should be in handler
      setAddedToCart(false)
    }
  }, [addedToCart, productId])

  // 3: document title follows product name → ✅ CORRECT in effect (sync)
  useEffect(() => {
    if (product) document.title = product.name
    return () => { document.title = 'Shop' }
  }, [product])

  // ✅ Fixed: move cart event tracking to the event handler
  function handleAddToCart() {
    setCartCount(c => c + 1)
    trackEvent('add_to_cart', { productId })  // ✅ runs once, on click
  }

  return (
    <div>
      <h1>{product?.name}</h1>
      <button onClick={handleAddToCart}>Add to cart ({cartCount})</button>
    </div>
  )
}
```

---

---

# 6 — Removing Unnecessary Effects

---

## T — TL;DR

Most effects you think you need, you don't. Common unnecessary effects: deriving state from state (compute inline), resetting state on prop change (use `key`), sending events on user action (use handler), transforming data (compute inline). Fewer effects = simpler code.

---

## K — Key Concepts

```tsx
// ── You don't need useEffect to derive state ──────────────────────────────
// ❌ Effect updates derived state
function SearchList({ items }: { items: string[] }) {
  const [query,    setQuery]    = useState('')
  const [filtered, setFiltered] = useState(items)   // ❌

  useEffect(() => {
    setFiltered(items.filter(i => i.includes(query)))  // ❌ extra render
  }, [items, query])

  return <ul>{filtered.map((i, n) => <li key={n}>{i}</li>)}</ul>
}

// ✅ Just compute it
function SearchListFixed({ items }: { items: string[] }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter(i => i.includes(query))  // derived ✅
  return <ul>{filtered.map((i, n) => <li key={n}>{i}</li>)}</ul>
}
```

```tsx
// ── You don't need useEffect to reset state when props change ─────────────
// ❌ Effect clears form when userId changes — stale flash before effect runs
function UserForm({ userId }: { userId: number }) {
  const [name, setName] = useState('')
  useEffect(() => { setName('') }, [userId])  // ❌ renders once with stale name
  return <input value={name} onChange={e => setName(e.target.value)} />
}

// ✅ Use key — atomic reset, no stale render
function UserFormParent() {
  const [userId, setUserId] = useState(1)
  return <UserForm key={userId} userId={userId} />  // ✅
}
function UserForm({ userId }: { userId: number }) {
  const [name, setName] = useState('')  // always starts empty ✅
  return <input value={name} onChange={e => setName(e.target.value)} />
}
```

```tsx
// ── You don't need useEffect to handle a buy event ────────────────────────
// ❌ Routing user action through state + effect
function ShopItem({ item }: { item: Item }) {
  const [purchased, setPurchased] = useState(false)

  useEffect(() => {
    if (purchased) {
      logPurchase(item.id)   // ❌ side effect for a one-time event
      setPurchased(false)
    }
  }, [purchased, item.id])

  return <button onClick={() => setPurchased(true)}>Buy</button>
}

// ✅ Direct call in event handler
function ShopItemFixed({ item }: { item: Item }) {
  function handleBuy() {
    logPurchase(item.id)   // ✅ direct, runs once per click
  }
  return <button onClick={handleBuy}>Buy</button>
}
```

```tsx
// ── You don't need useEffect to fetch on mount when data is passed as prop ─
// ❌ Fetching inside a component that already receives data as a prop
function ProductList({ categoryId }: { categoryId: number }) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts(categoryId).then(setProducts)
  }, [categoryId])
  // If the parent already has this data, it should pass it as a prop ❌
}

// ✅ Lift the fetch to the parent OR use TanStack Query (Day 5)
// If parent fetches: <ProductList products={products} />
// If component fetches: use TanStack Query — handles caching, dedup, errors
```

---

## W — Why It Matters

- Every unnecessary `useEffect` adds a render cycle, complexity, and potential stale state bugs. The React team explicitly documents that many common `useEffect` uses are anti-patterns.
- Recognizing "I don't need an effect here" is a mark of React maturity — junior developers reach for `useEffect` whenever something "needs to happen"; senior developers ask "is there an external system involved?"
- The `useEffect` for derived state anti-pattern (`setFiltered` in an effect) is especially costly — it causes an extra render on every state change and delays the UI update by one tick.

---

## I — Interview Q&A

### Q: Name three situations where developers incorrectly use `useEffect` and the correct alternatives.

**A:** (1) **Deriving state from other state** — `useEffect(() => setTotal(items.reduce(...)), [items])`. Fix: compute `total` inline during render — it's always current and requires no sync. (2) **Resetting component state when a prop changes** — `useEffect(() => resetForm(), [userId])`. Fix: add `key={userId}` on the component — React remounts it atomically with fresh state. (3) **Performing a side effect in response to a user event** — `useEffect(() => { if (submitted) sendEmail() }, [submitted])`. Fix: call `sendEmail()` directly in the submit event handler — it should run once because the user submitted, not because `submitted` became `true`.

---

## C — Common Pitfalls + Fix

### ❌ Infinite loop from setting state inside an effect with that state in deps

```tsx
// ❌ Classic infinite loop
function InfiniteLoop() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(count + 1)  // updates count
  }, [count])            // which triggers the effect again → infinite ❌
}

// ❌ Object/array created in render in effect deps
function ObjectLoop({ userId }: { userId: number }) {
  const [data, setData] = useState(null)
  const options = { userId, extra: true }   // new reference every render

  useEffect(() => {
    fetchData(options).then(setData)
  }, [options])   // options changes every render → infinite loop ❌
}

// ✅ Use functional updater — no need to read count in the effect
function CounterFixed() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000)  // no count in deps ✅
    return () => clearInterval(id)
  }, [])
}

// ✅ Move object outside component or useMemo (if dynamic)
const OPTIONS = { extra: true } as const
function ObjectLoopFixed({ userId }: { userId: number }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetchData({ ...OPTIONS, userId }).then(setData)
  }, [userId])   // only userId is dynamic ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Audit and fix this component that overuses `useEffect` in four places.

### Solution

```tsx
interface Order { id: number; items: { price: number; qty: number }[]; coupon: string }

// ❌ Before: four unnecessary effects
function OrderSummaryBad({ order, userId }: { order: Order; userId: number }) {
  const [subtotal,   setSubtotal]   = useState(0)
  const [discount,   setDiscount]   = useState(0)
  const [total,      setTotal]      = useState(0)
  const [submitted,  setSubmitted]  = useState(false)

  useEffect(() => {   // ❌ 1: deriving subtotal
    setSubtotal(order.items.reduce((s, i) => s + i.price * i.qty, 0))
  }, [order.items])

  useEffect(() => {   // ❌ 2: deriving discount (depends on subtotal — extra render)
    setDiscount(order.coupon === 'SAVE10' ? subtotal * 0.1 : 0)
  }, [subtotal, order.coupon])

  useEffect(() => {   // ❌ 3: deriving total
    setTotal(subtotal - discount)
  }, [subtotal, discount])

  useEffect(() => {   // ❌ 4: event routed through state
    if (submitted) {
      logOrderSubmit(userId, order.id)
      setSubmitted(false)
    }
  }, [submitted, userId, order.id])

  return (
    <div>
      <p>Subtotal: ${subtotal}</p>
      <p>Discount: -${discount}</p>
      <p>Total: ${total}</p>
      <button onClick={() => setSubmitted(true)}>Submit order</button>
    </div>
  )
}

// ✅ After: zero effects
function OrderSummaryGood({ order, userId }: { order: Order; userId: number }) {
  // 1,2,3: all derived inline — always correct, no extra renders
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = order.coupon === 'SAVE10' ? subtotal * 0.1 : 0
  const total    = subtotal - discount

  // 4: event directly in handler
  function handleSubmit() {
    logOrderSubmit(userId, order.id)   // ✅ once, on click
  }

  return (
    <div>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Discount: -${discount.toFixed(2)}</p>
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={handleSubmit}>Submit order</button>
    </div>
  )
}
```

---

---

# 7 — Custom Hooks

---

## T — TL;DR

A **custom hook** is a function starting with `use` that calls other hooks. It lets you extract stateful logic — the combination of `useState` + `useEffect` + handlers — into a reusable, testable unit. Components become declarations of intent; hooks become implementations of behaviour.

---

## K — Key Concepts

```tsx
// ── Custom hook anatomy ───────────────────────────────────────────────────
// 1. Name starts with 'use' (required for ESLint rules to apply)
// 2. Can call any other hooks (useState, useEffect, useRef, other custom hooks)
// 3. Returns whatever the consumer needs (value, array, object, function)
// 4. Each component that calls it gets ISOLATED state (not shared)

function useCounter(initialValue = 0, step = 1) {
  const [count, setCount] = useState(initialValue)

  const increment = () => setCount(c => c + step)
  const decrement = () => setCount(c => c - step)
  const reset     = () => setCount(initialValue)

  return { count, increment, decrement, reset }
}

// Usage: two independent counters
function App() {
  const counterA = useCounter(0, 1)
  const counterB = useCounter(100, 10)
  // counterA and counterB are completely independent ✅
}
```

```tsx
// ── Custom hook wrapping useEffect ────────────────────────────────────────
interface FetchState<T> {
  data:      T | null
  isLoading: boolean
  error:     string | null
}

function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null, isLoading: true, error: null
  })

  useEffect(() => {
    setState({ data: null, isLoading: true, error: null })
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(err => {
        if (err.name !== 'AbortError')
          setState({ data: null, isLoading: false, error: err.message })
      })

    return () => controller.abort()
  }, [url])

  return state
}

// Usage: component has zero useEffect, zero state management
interface User { id: number; name: string }

function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading, error } = useFetch<User>(`/api/users/${userId}`)

  if (isLoading) return <Spinner />
  if (error)     return <ErrorMessage message={error} />
  if (!user)     return null
  return <div>{user.name}</div>
}
```

```tsx
// ── Custom hook naming and return shape conventions ────────────────────────
// Return an object when there are multiple named values:
function useFormField(initial: string) {
  const [value,     setValue]  = useState(initial)
  const [isTouched, setTouched] = useState(false)
  const isValid = value.length > 0

  return {
    value,
    isTouched,
    isValid,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
      setTouched(true)
    },
    reset: () => { setValue(initial); setTouched(false) },
  }
}

// Return a tuple [value, setter] when mimicking useState:
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue(v => !v)
  return [value, toggle]
}

const [isOpen, toggleOpen] = useToggle()   // tuple destructuring ✅
```

---

## W — Why It Matters

- Custom hooks are the primary reuse mechanism in React — they replace render props and HOCs for sharing stateful logic. Every repeated `useState` + `useEffect` pattern in your codebase is a custom hook waiting to be extracted.
- Components that use custom hooks become declarative: `const { data, isLoading } = useFetch('/api/users')` reads like a requirement, not an implementation. This is the goal.
- Each call to a custom hook creates **new isolated state** — unlike a utility function, the hook maintains its own state between renders. This makes custom hooks powerful for encapsulating independent UI logic.

---

## I — Interview Q&A

### Q: What is a custom hook and how does it differ from a utility function?

**A:** A custom hook is a function that starts with `use` and can call other React hooks. It encapsulates stateful logic — `useState`, `useEffect`, `useRef`, etc. — and returns whatever the consumer needs. It differs from a utility function in two ways: (1) It can use React's hook system (maintain state, subscribe to lifecycle). A plain utility function cannot. (2) Each component that calls the hook gets its own isolated state instance. Two components calling `useCounter()` have two independent counters. Custom hooks extract the *combination* of state + effects + handlers that repeat across components, without sharing state between those components (for shared state, use Context or Zustand).

---

## C — Common Pitfalls + Fix

### ❌ Thinking custom hooks share state between components

```tsx
// Custom hook definition
function useSharedCounter() {
  const [count, setCount] = useState(0)   // isolated per caller
  return { count, increment: () => setCount(c => c + 1) }
}

// ❌ Expecting both components to share one count
function ComponentA() {
  const { count, increment } = useSharedCounter()  // gets its OWN count = 0
  return <button onClick={increment}>A: {count}</button>
}
function ComponentB() {
  const { count } = useSharedCounter()  // gets its OWN separate count = 0
  return <p>B: {count}</p>
}
// Incrementing A's count does NOT update B ❌ (different state instances)

// ✅ For shared state: lift to common parent or use Context/Zustand
function Parent() {
  const { count, increment } = useSharedCounter()  // one instance ✅
  return (
    <>
      <ComponentA count={count} onIncrement={increment} />
      <ComponentB count={count} />
    </>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Extract a `useDebounce` hook that debounces a value by a given delay. Use it in a `DebouncedSearch` component.

### Solution

```tsx
// useDebounce: returns a debounced version of the value
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    // Set a timer to update debounced value after delay
    const timer = setTimeout(() => setDebounced(value), delayMs)

    // Cleanup: cancel the timer if value changes before delay expires
    return () => clearTimeout(timer)
  }, [value, delayMs])
  // Every time value changes, the previous timer is cancelled
  // and a new one starts. debounced only updates after the user stops typing.

  return debounced
}

// useFetch (from earlier in this subtopic)
// useDebounced search component
interface SearchResult { id: number; title: string }

function DebouncedSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 400)   // waits 400ms after typing stops

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => { setResults(data); setLoading(false) })
      .catch(err => { if (err.name !== 'AbortError') setLoading(false) })
    return () => controller.abort()
  }, [debouncedQuery])   // only fires 400ms after typing stops ✅

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
      />
      {loading && <p>Searching…</p>}
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </div>
  )
}
```

---

---

# 8 — useDebugValue + Debugging in DevTools

---

## T — TL;DR

`useDebugValue` adds a custom label to a custom hook in **React DevTools** — it shows up next to the hook in the component inspector. It's purely for developer experience during debugging. The DevTools profiler shows re-render causes; the component inspector shows hook state.

---

## K — Key Concepts

```tsx
import { useDebugValue } from 'react'

// ── Basic useDebugValue ───────────────────────────────────────────────────
function useUser(userId: number) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<'idle'|'loading'|'error'|'success'>('idle')

  // Without useDebugValue: DevTools shows "State: null, State: 'idle'"
  // With useDebugValue: DevTools shows "useUser: Mark Austria (success)"
  useDebugValue(
    user ? `${user.name} (${status})` : status
  )

  useEffect(() => {
    setStatus('loading')
    fetchUser(userId)
      .then(u => { setUser(u); setStatus('success') })
      .catch(() => setStatus('error'))
  }, [userId])

  return { user, status }
}
```

```tsx
// ── useDebugValue with formatter (defer expensive formatting) ─────────────
// The second argument is a formatting function — only called when DevTools
// is open and inspecting the component (avoids computation in production)
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Formatter: only evaluated when DevTools inspects this hook
  useDebugValue(isOnline, online => online ? '🟢 Online' : '🔴 Offline')

  return isOnline
}
```

```tsx
// ── Debugging custom hooks in React DevTools ──────────────────────────────
// In React DevTools:
// 1. Select a component in the Components panel
// 2. Right panel shows hooks by name
//    - Hooks from built-in: "State", "Effect", "Ref"
//    - Hooks from custom hooks: shown by hook function name
//    - useDebugValue labels appear next to the hook name

// What you see without useDebugValue:
//   ▾ useUser
//     State: null
//     State: "loading"
//     Effect: …

// What you see WITH useDebugValue(user ? user.name : 'loading'):
//   ▾ useUser: "loading"  ← custom label ✅
//     State: null
//     State: "loading"

// ── Profiler for re-render investigation ─────────────────────────────────
// React DevTools → Profiler tab → Record → interact → Stop
// Shows:
//   - Which components re-rendered and why ("Props changed", "State changed", "Parent rendered")
//   - How long each render took (flame chart / ranked chart)
//   - Re-render count per component
// Use to identify: components re-rendering unnecessarily,
//                  expensive renders to optimize,
//                  effects causing cascading renders
```

```tsx
// ── Practical debugging workflow ──────────────────────────────────────────
// 1. Something renders unexpectedly:
//    → Profiler → find the component → check "why did this render"
//    → "Parent rendered" = parent re-renders, consider React.memo
//    → "State changed" = check which state setter is called

// 2. Hook state looks wrong:
//    → Components tab → select component → expand Hooks section
//    → useDebugValue labels help identify which custom hook is which
//    → You can edit State values directly in DevTools for testing

// 3. Effect running too often:
//    → Add console.log('effect running', deps) to the effect body
//    → Check DevTools console for rapid repeat calls
//    → Compare dep values across renders with useRef to detect instability
function useEffectDebugger(deps: unknown[], labels: string[]) {
  const prevDeps = useRef<unknown[]>([])
  useEffect(() => {
    const changed = deps
      .map((dep, i) => ({ label: labels[i], prev: prevDeps.current[i], next: dep }))
      .filter(d => d.prev !== d.next)
    if (changed.length) console.log('[Effect deps changed]', changed)
    prevDeps.current = deps
  })
}
// Usage: useEffectDebugger([userId, filter], ['userId', 'filter'])
```

---

## W — Why It Matters

- `useDebugValue` is a low-cost DX improvement for any custom hook used in more than one component — without it, the DevTools show a generic "State: …" row with no context about which hook it belongs to.
- The DevTools Profiler is the primary tool for diagnosing performance problems — "why is this re-rendering 50 times?" is answered in 2 minutes with Profiler, versus hours of console.logging.
- Knowing how to read the Components inspector (hook state, current values, manually editing state) is a fundamental debugging skill — it's the equivalent of the browser's Elements panel for React state.

---

## I — Interview Q&A

### Q: What is `useDebugValue` and when would you use it?

**A:** `useDebugValue` adds a display label to a custom hook in React DevTools. It takes a value (or a value + formatter function) and displays it next to the hook's name in the Components panel. Use it in custom hooks that you or your team uses frequently to give DevTools-readers instant context — instead of seeing "State: null / State: loading", they see "useUser: Mark (success)". The formatter function (second argument) is only evaluated when DevTools is open, making it safe to include expensive formatting without impacting production performance. It's purely a developer tool — it has no effect on runtime behaviour.

---

## C — Common Pitfalls + Fix

### ❌ Debugging re-renders by console.logging inside render

```tsx
// ❌ console.log inside render — fires on every render, pollutes console
function ProductCard({ product }: { product: Product }) {
  console.log('ProductCard rendered', product)  // ❌ noisy, imprecise

  return <div>{product.name}</div>
}

// ✅ Use React DevTools Profiler instead
// Profiler shows: which component, why it rendered, how long it took
// No code changes needed

// ✅ If you need to log deps in an effect for debugging:
function useDataLogger(data: unknown, label: string) {
  useEffect(() => {
    console.log(`[${label}] effect ran with:`, data)
  })  // runs after every render — useful temporarily
}

// ✅ Add useDebugValue to custom hooks so DevTools shows context
function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  useDebugValue(user?.email ?? 'not authenticated')  // visible in DevTools ✅
  return user
}
```

---

## K — Coding Challenge + Solution

### Challenge

Add `useDebugValue` to a `useFormField` hook with a formatter. Then write a `useEffectLogger` utility hook for temporarily debugging which deps changed.

### Solution

```tsx
// ── useFormField with useDebugValue ──────────────────────────────────────
interface FieldState {
  value:     string
  isTouched: boolean
  isValid:   boolean
}

function useFormField(initial: string, validate?: (v: string) => boolean) {
  const [value,     setValue]  = useState(initial)
  const [isTouched, setTouched] = useState(false)
  const isValid = validate ? validate(value) : value.length > 0

  // DevTools label: "useFormField: 'mark@ex.com' ✅" or "useFormField: '' ❌"
  useDebugValue<FieldState>(
    { value, isTouched, isValid },
    state => `"${state.value}" ${state.isValid ? '✅' : '❌'}${state.isTouched ? ' (touched)' : ''}`
  )

  return {
    value,
    isTouched,
    isValid,
    inputProps: {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
        setTouched(true)
      },
    },
    reset: () => { setValue(initial); setTouched(false) },
  }
}

// ── useEffectLogger: debug tool for dep changes ───────────────────────────
function useEffectLogger(
  label:  string,
  deps:   unknown[],
  names:  string[]
) {
  const prevRef = useRef<unknown[]>([])

  useEffect(() => {
    const changed = deps
      .map((dep, i) => ({
        name: names[i] ?? `dep[${i}]`,
        prev: prevRef.current[i],
        next: dep,
        changed: prevRef.current[i] !== dep,
      }))
      .filter(d => d.changed)

    if (prevRef.current.length === 0) {
      console.log(`[${label}] mounted`)
    } else if (changed.length > 0) {
      console.table(changed.map(d => ({
        Dep: d.name, 'Previous': d.prev, 'Next': d.next
      })))
    }
    prevRef.current = deps
  })
}

// Usage — add during debugging, remove before commit
function ChatRoom({ roomId, userId }: { roomId: string; userId: number }) {
  useEffectLogger('ChatRoom', [roomId, userId], ['roomId', 'userId'])
  // Console output when roomId changes:
  // ┌─────────┬──────────┬──────────────────┬──────────────────┐
  // │   Dep   │ Previous │      Next        │                  │
  // ├─────────┼──────────┼──────────────────┼──────────────────┤
  // │ roomId  │ "room-1" │    "room-2"      │                  │
  // └─────────┴──────────┴──────────────────┴──────────────────┘
  return <div>Room: {roomId}</div>
}
```

---

## ✅ Day 4 Complete — React Effects and Custom Hooks

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Hook Rules | ☐ |
| 2 | useEffect — Syntax, Purpose, Cleanup | ☐ |
| 3 | Effect Dependency Arrays | ☐ |
| 4 | Synchronizing with External Systems | ☐ |
| 5 | Separating Events from Effects | ☐ |
| 6 | Removing Unnecessary Effects | ☐ |
| 7 | Custom Hooks | ☐ |
| 8 | useDebugValue + Debugging in DevTools | ☐ |

---

## 🗺️ One-Page Mental Model — Day 4

```
HOOK RULES
  Only call hooks at the TOP LEVEL — never in conditions, loops, nested functions
  Only call hooks from FUNCTION COMPONENTS or CUSTOM HOOKS
  React tracks hooks by call order — skipping one corrupts all subsequent hooks
  Early returns: must come AFTER all hook calls, never before
  eslint-plugin-react-hooks enforces both rules — mandatory in every project

useEffect ANATOMY
  setup fn → runs after commit | cleanup fn → runs before next setup or unmount
  [], (no array), [deps] → three forms, three behaviors
  No array: every render | [] mount only | [a,b]: when a or b change
  Strict Mode double-invokes in dev → surfaces missing cleanups
  Every cleanup pattern: clearInterval, removeEventListener, abort, disconnect

DEPENDENCY ARRAYS
  Include EVERY reactive value (props, state, context) the effect reads
  Omit: module-level constants, state setters (stable refs), non-reactive
  Stale closure = missing dep → effect reads old value from render snapshot
  Fix infinite loop: stabilize deps (move outside render, useMemo, useCallback)
  Functional updater: setCount(prev => prev + step) removes count from deps
  exhaustive-deps ESLint rule: never silence it — understand and fix instead

SYNCHRONIZING EXTERNAL SYSTEMS
  useEffect = bridge between React and the outside world
  Browser APIs, third-party libs, network connections, timers → effects
  Two effects for init + sync (create once, sync on dep change)
  AbortController: cancel fetch on cleanup — prevents state update after unmount
  Every connection/subscription/timer must have a matching cleanup

EVENTS VS EFFECTS
  Event handler: runs once, triggered by specific user interaction
  Effect: runs whenever a dependency changes — to stay in sync
  Test: "Would this run if the user did nothing but state changed?" → effect
  Test: "Did a user explicitly trigger this?" → event handler
  Never route user events through state + useEffect — direct calls in handlers

REMOVING UNNECESSARY EFFECTS
  Deriving state from state → compute inline during render (no effect needed)
  Resetting state on prop change → use key prop (atomic, no flash)
  Sending analytics on click → call directly in the event handler
  Syncing derived value → always inline, never effect
  Rule: if there's no external system involved, you probably don't need an effect

CUSTOM HOOKS
  Function starting with 'use' that calls other hooks
  Extracts state + effects + handlers into a reusable, named unit
  Each call = isolated state instance (NOT shared between callers)
  Return object (multiple named values) or tuple [value, setter] (useState-like)
  Components using custom hooks are declarative — hooks are the implementation
  For SHARED state: Context or Zustand — not custom hooks

useDebugValue + DEVTOOLS
  useDebugValue(value) → shows label next to hook in DevTools Components panel
  Second arg formatter: only called when DevTools open — safe for expensive formatting
  React DevTools Profiler → which components re-rendered, why, how long
  "Why did this render": Props changed | State changed | Parent rendered | Context changed
  Components panel: inspect and live-edit hook state values
  useEffectLogger utility: temporarily log dep changes to diagnose effect timing
```

> **Your next action:** Find a `useEffect` in any React project you have access to. Ask: "Is there an external system involved?" If no — it's a candidate for removal. Try removing it and computing the value inline instead. Five minutes of real effect removal teaches this better than any re-read.

> "Doing one small thing beats opening a feed."