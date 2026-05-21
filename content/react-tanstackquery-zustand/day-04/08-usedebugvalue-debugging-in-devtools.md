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
