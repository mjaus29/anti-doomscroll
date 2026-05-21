
# 📅 Day 5 — React Escape Hatches

> **Goal:** Know when and how to step outside React's declarative model — refs, DOM access, layout measurement, and external store subscriptions.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack:** React 19.2.5 · TypeScript 6.0 · strict mode always on

---

## 📋 Day 5 Subtopic Overview

| # | Subtopic | Time |
|---|----------|------|
| 1 | useRef — Mutable Values Without Re-renders | 10 min |
| 2 | DOM Access with Refs + forwardRef | 12 min |
| 3 | useImperativeHandle | 10 min |
| 4 | useLayoutEffect | 10 min |
| 5 | Layout Measurement Before Paint | 12 min |
| 6 | useSyncExternalStore | 12 min |
| 7 | Imperative Interoperability | 10 min |
| 8 | External Store Subscriptions | 12 min |

---

---

# 1 — useRef — Mutable Values Without Re-renders

---

## T — TL;DR

`useRef` stores a **mutable value in a box** (`ref.current`) that persists across renders but **never triggers a re-render** when changed. Two use cases: (1) storing a DOM node, (2) storing any mutable value that must survive re-renders but doesn't control UI output.

---

## K — Key Concepts

```tsx
import { useRef } from 'react'

// ── useRef anatomy ────────────────────────────────────────────────────────
const ref = useRef(initialValue)
// ref = { current: initialValue }
// ref.current is mutable — you can write to it at any time
// Writing to ref.current does NOT trigger a re-render
// ref object itself is stable — same reference across all renders
```

```tsx
// ── Use case 1: persisting a value across renders without re-rendering ─────
function Stopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  //    ↑ stores the interval ID — doesn't need to be state (doesn't affect UI directly)

  function start() {
    if (intervalRef.current) return   // already running
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 10)
    }, 10)
  }

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null   // mutate ref directly — no re-render ✅
    }
    setIsRunning(false)
  }

  function reset() {
    stop()
    setElapsed(0)
  }

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(2)}s</p>
      <button onClick={start}  disabled={isRunning}>Start</button>
      <button onClick={stop}   disabled={!isRunning}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

```tsx
// ── Use case 2: reading the latest value in an effect/callback ─────────────
// The "ref trick" — reading current value without it being a dep
function usePrevious<T>(value: T): T | undefined {
  const prevRef = useRef<T | undefined>(undefined)

  useEffect(() => {
    prevRef.current = value   // update after render
  })   // no deps: runs after every render

  return prevRef.current   // returns value from PREVIOUS render
}

function Counter() {
  const [count, setCount] = useState(0)
  const prevCount = usePrevious(count)

  return (
    <p>
      Current: {count} | Previous: {prevCount ?? 'none'}
    </p>
  )
}
```

```tsx
// ── ref vs state: when to use which ──────────────────────────────────────
//
// USE STATE when: the value affects what the UI renders
//   → new value = re-render needed to show it
//
// USE REF when: the value is internal plumbing — not rendered
//   → timer IDs, subscription handles, previous values, DOM nodes
//   → changing it should NOT trigger a re-render

// ❌ Using state for an interval ID — causes unnecessary re-renders
const [timerId, setTimerId] = useState<number | null>(null)

// ✅ Using ref for an interval ID
const timerRef = useRef<number | null>(null)
```

---

## W — Why It Matters

- The "mutable box" mental model explains why refs don't cause re-renders — React doesn't track mutations to `ref.current`, only `setState` calls. Refs are outside React's reactivity system.
- The interval ID stored in a ref is a canonical example: you need it to call `clearInterval`, but it doesn't belong in the UI — putting it in state would trigger an unnecessary re-render every time you start/stop.
- The `usePrevious` pattern (reading the previous render's value) is a real technique used in animations, diffs, and "what changed" logic — only possible because refs persist across renders without causing them.

---

## I — Interview Q&A

### Q: What is the difference between `useRef` and `useState`?

**A:** Both persist a value across renders. The critical difference: calling `setState` triggers a re-render; mutating `ref.current` does not. `useState` is for values that should be reflected in the UI — changing them should update what the user sees. `useRef` is for values that are internal implementation details — interval IDs, previous values, DOM nodes, subscription handles. If you put an interval ID in state, the component would re-render when you start and stop the timer, which is unnecessary. Another difference: `ref.current` can be mutated directly anywhere, including during event handlers and effects; state must only be changed via the setter.

---

## C — Common Pitfalls + Fix

### ❌ Reading `ref.current` during render and expecting it to be reactive

```tsx
// ❌ Reading ref.current in render — doesn't cause re-renders when changed
function BrokenDisplay() {
  const countRef = useRef(0)

  function handleClick() {
    countRef.current += 1    // updates ref — no re-render
    console.log(countRef.current)  // correct in console
  }

  // But the displayed value never updates — no re-render triggered ❌
  return <p>Count: {countRef.current}</p>
}

// ✅ If the value needs to appear in the UI: use state
function WorkingDisplay() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useLatestCallback` hook: stores the latest version of a callback in a ref so an effect can always call the latest version without it being a dependency.

### Solution

```tsx
import { useRef, useLayoutEffect, useCallback } from 'react'

// Stores the latest callback in a ref — safe to call from effects/timers
// without adding it to the dependency array
function useLatestCallback<T extends (...args: unknown[]) => unknown>(callback: T): T {
  const callbackRef = useRef<T>(callback)

  // useLayoutEffect: update synchronously before any effects run
  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  // Stable wrapper — never changes reference, always calls latest callback
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []   // stable across renders ✅
  )
}

// Usage: interval that always calls the latest onTick without restarting
function AutoSave({ onSave }: { onSave: () => void }) {
  const stableOnSave = useLatestCallback(onSave)

  useEffect(() => {
    const id = setInterval(stableOnSave, 5000)  // stableOnSave never changes ✅
    return () => clearInterval(id)
  }, [stableOnSave])  // dep is stable — interval never restarts unnecessarily

  return <p>Auto-saving every 5 seconds…</p>
}
```

---

---

# 2 — DOM Access with Refs + forwardRef

---

## T — TL;DR

Pass a ref to a DOM element with `ref={myRef}` — React sets `myRef.current` to the DOM node after mount and `null` on unmount. Use `forwardRef` to let parent components access a child component's internal DOM node.

---

## K — Key Concepts

```tsx
// ── Attaching a ref to a DOM element ─────────────────────────────────────
function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  //                       ↑ TypeScript: type the DOM element

  function handleFocus() {
    inputRef.current?.focus()   // safe optional chain — null before mount
  }

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={handleFocus}>Focus input</button>
    </>
  )
}
// After mount: inputRef.current = <input> DOM node ✅
// After unmount: inputRef.current = null ✅
```

```tsx
// ── Common DOM ref patterns ────────────────────────────────────────────────
// Focus management
const inputRef = useRef<HTMLInputElement>(null)
inputRef.current?.focus()
inputRef.current?.select()

// Scroll control
const listRef = useRef<HTMLUListElement>(null)
listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
listRef.current?.scrollIntoView({ behavior: 'smooth' })

// Canvas drawing
const canvasRef = useRef<HTMLCanvasElement>(null)
const ctx = canvasRef.current?.getContext('2d')
ctx?.fillRect(0, 0, 100, 100)

// Video/audio control
const videoRef = useRef<HTMLVideoElement>(null)
videoRef.current?.play()
videoRef.current?.pause()

// Measuring size
const divRef = useRef<HTMLDivElement>(null)
const rect = divRef.current?.getBoundingClientRect()
```

```tsx
// ── forwardRef: expose a child's DOM node to the parent ──────────────────
import { forwardRef } from 'react'

// Without forwardRef: parent can't access <input> inside FancyInput
// ✅ With forwardRef: parent receives the internal <input> ref
interface FancyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

const FancyInput = forwardRef<HTMLInputElement, FancyInputProps>(
  function FancyInput({ label, ...props }, ref) {
    return (
      <label>
        {label}
        <input ref={ref} className="fancy-input" {...props} />
      </label>
    )
  }
)
FancyInput.displayName = 'FancyInput'   // ✅ required for DevTools clarity

// Parent uses ref as normal
function LoginForm() {
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()   // focuses the <input> inside FancyInput ✅
  }, [])

  return (
    <form>
      <FancyInput ref={emailRef} label="Email" type="email" />
    </form>
  )
}
```

```tsx
// ── Ref callback: run code when ref attaches/detaches ─────────────────────
// Instead of useRef + useEffect, a ref callback fires synchronously on attach
function MeasuredBox() {
  const [height, setHeight] = useState(0)

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height)  // fires when DOM node attaches
    }
  }, [])

  return (
    <>
      <div ref={callbackRef} className="resizable-box">Content</div>
      <p>Height: {height}px</p>
    </>
  )
}
```

---

## W — Why It Matters

- `forwardRef` is required any time a reusable input/button component needs to support focus management from outside — form libraries like React Hook Form (Day 5 group) use this extensively.
- Ref callbacks fire synchronously when the DOM node attaches/detaches — more precise than `useEffect` for one-time measurements because they don't wait for a render cycle.
- Typing refs with the exact DOM element type (`useRef<HTMLInputElement>(null)`) gives TypeScript knowledge of which properties and methods are available — `HTMLInputElement` has `.value`, `.select()`, `.focus()` but not `.play()`.

---

## I — Interview Q&A

### Q: What is `forwardRef` and why is it needed?

**A:** By default, the `ref` prop is not forwarded to the DOM node inside a function component — the component consumes it or ignores it. `forwardRef` is a wrapper that explicitly passes the `ref` received by the component to a specific internal DOM element. It's needed when: (1) A reusable component wraps a native element (like `FancyInput` wrapping `<input>`) and the parent needs DOM access — for focus, scroll, measurements. (2) Form libraries use it to register inputs without needing to pass extra props. Without `forwardRef`, `<FancyInput ref={myRef} />` does nothing — `myRef.current` stays `null` because the ref never reached the DOM node.

---

## C — Common Pitfalls + Fix

### ❌ Accessing `ref.current` before mount (still null)

```tsx
// ❌ Ref is null during the first render — DOM doesn't exist yet
function AutoFocus() {
  const inputRef = useRef<HTMLInputElement>(null)
  inputRef.current?.focus()   // runs during render — DOM not yet committed ❌
  // React creates DOM after render completes — ref is still null here

  return <input ref={inputRef} />
}

// ✅ Access DOM nodes in useEffect (after commit) or event handlers
function AutoFocusFixed() {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()   // after commit — DOM node exists ✅
  }, [])

  return <input ref={inputRef} />
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ScrollableList` component with a "Scroll to bottom" button. Use `forwardRef` to expose a `scrollToItem(index)` method via the ref from a parent component.

### Solution

```tsx
interface ScrollableListHandle {
  scrollToItem: (index: number) => void
  scrollToBottom: () => void
}

interface ScrollableListProps {
  items: string[]
}

const ScrollableList = forwardRef<ScrollableListHandle, ScrollableListProps>(
  function ScrollableList({ items }, ref) {
    const listRef     = useRef<HTMLUListElement>(null)
    const itemRefs    = useRef<(HTMLLIElement | null)[]>([])

    useImperativeHandle(ref, () => ({
      scrollToItem: (index: number) => {
        itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      },
      scrollToBottom: () => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      },
    }), [])

    return (
      <ul ref={listRef} style={{ height: 200, overflowY: 'auto' }}>
        {items.map((item, i) => (
          <li key={i} ref={el => { itemRefs.current[i] = el }}>
            {item}
          </li>
        ))}
      </ul>
    )
  }
)
ScrollableList.displayName = 'ScrollableList'

function App() {
  const listRef = useRef<ScrollableListHandle>(null)
  const items   = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`)

  return (
    <div>
      <ScrollableList ref={listRef} items={items} />
      <button onClick={() => listRef.current?.scrollToBottom()}>
        Scroll to bottom
      </button>
      <button onClick={() => listRef.current?.scrollToItem(24)}>
        Scroll to item 25
      </button>
    </div>
  )
}
```

---

---

# 3 — useImperativeHandle

---

## T — TL;DR

`useImperativeHandle` customizes what a parent receives when it holds a `ref` to a child component. Instead of exposing the raw DOM node, you expose a **controlled API object** with only the methods you want parents to call. Used with `forwardRef`.

---

## K — Key Concepts

```tsx
import { useImperativeHandle, forwardRef } from 'react'

// ── Syntax ────────────────────────────────────────────────────────────────
useImperativeHandle(
  ref,              // the ref passed via forwardRef
  () => ({          // factory: returns the object parents will receive
    methodA() { },
    methodB() { },
  }),
  [deps]            // re-creates the handle when deps change (optional)
)
```

```tsx
// ── Why: restrict what parents can do ────────────────────────────────────
// ❌ Exposing the raw DOM node lets parents do ANYTHING (dangerous)
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
))
// Parent can: ref.current.value = 'hack', ref.current.style.display = 'none' ❌
// Parent has unrestricted DOM access

// ✅ Expose only specific, intentional methods
interface InputHandle {
  focus:    () => void
  clear:    () => void
  getValue: () => string
}

const ControlledInput = forwardRef<InputHandle, InputProps>(
  function ControlledInput(props, ref) {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus:    () => inputRef.current?.focus(),
      clear:    () => { if (inputRef.current) inputRef.current.value = '' },
      getValue: () => inputRef.current?.value ?? '',
    }), [])
    // Parent receives ONLY focus, clear, getValue — nothing else ✅

    return <input ref={inputRef} {...props} />
  }
)
```

```tsx
// ── Practical: modal exposed via ref ─────────────────────────────────────
interface ModalHandle {
  open:  () => void
  close: () => void
}

interface ModalProps {
  title:    string
  children: React.ReactNode
  onClose?: () => void
}

const Modal = forwardRef<ModalHandle, ModalProps>(
  function Modal({ title, children, onClose }, ref) {
    const [isOpen, setIsOpen] = useState(false)

    useImperativeHandle(ref, () => ({
      open:  () => setIsOpen(true),
      close: () => setIsOpen(false),
    }), [])

    if (!isOpen) return null
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={() => { setIsOpen(false); onClose?.() }}>✕</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    )
  }
)

// Usage: parent opens modal without owning isOpen state
function App() {
  const modalRef = useRef<ModalHandle>(null)

  return (
    <>
      <button onClick={() => modalRef.current?.open()}>Open modal</button>
      <Modal ref={modalRef} title="Confirm action">
        <p>Are you sure?</p>
        <button onClick={() => modalRef.current?.close()}>Cancel</button>
      </Modal>
    </>
  )
}
```

---

## W — Why It Matters

- `useImperativeHandle` enforces encapsulation — the parent can only call what you explicitly expose. Without it, any parent with a ref has unrestricted access to mutate DOM styles, attributes, and values.
- The modal via ref pattern is a common interview question — it shows understanding of both `forwardRef` and `useImperativeHandle` working together to create an imperative API for a component that manages its own state.
- The deps array in `useImperativeHandle` matters — if the exposed methods close over state (like `isOpen`), include it in deps so the handle is re-created when that state changes.

---

## I — Interview Q&A

### Q: What does `useImperativeHandle` do and when would you use it?

**A:** `useImperativeHandle` replaces the value that `forwardRef` would expose to the parent's ref — instead of the raw DOM node, the parent receives a custom object of methods and properties you define. Use it when: (1) You want to expose a high-level API (`modal.open()`, `input.focus()`, `list.scrollToItem(n)`) rather than raw DOM access. (2) You want to restrict parents from making arbitrary DOM mutations — only the methods you expose are callable. (3) The thing you're exposing isn't a DOM node at all — it's a component's internal behaviour. The common pattern: `forwardRef` receives the ref, passes it to `useImperativeHandle` which sets what `.current` contains.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting deps when handle methods close over changing state

```tsx
// ❌ Handle captures stale 'items' state — methods always use initial value
const ListHandle = forwardRef<ListApi, { items: string[] }>(
  function ListHandle({ items }, ref) {
    const [selected, setSelected] = useState<number | null>(null)

    useImperativeHandle(ref, () => ({
      getSelectedItem: () => selected !== null ? items[selected] : null,
      // 'selected' and 'items' are closed over but NOT in deps array ❌
    }))  // missing deps → stale closure

    return <div>{items.map((item, i) => (
      <p key={i} onClick={() => setSelected(i)}>{item}</p>
    ))}</div>
  }
)

// ✅ Include all closed-over values in deps
useImperativeHandle(ref, () => ({
  getSelectedItem: () => selected !== null ? items[selected] : null,
}), [selected, items])  // ✅ re-creates handle when selected or items changes
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `VideoPlayer` component with `forwardRef` + `useImperativeHandle` that exposes `play()`, `pause()`, `seek(seconds)`, and `getProgress()` — without exposing the raw `<video>` element.

### Solution

```tsx
interface VideoPlayerHandle {
  play:        () => void
  pause:       () => void
  seek:        (seconds: number) => void
  getProgress: () => number
}

interface VideoPlayerProps {
  src:      string
  poster?:  string
  onEnded?: () => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, poster, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    useImperativeHandle(ref, () => ({
      play() {
        videoRef.current?.play()
        setIsPlaying(true)
      },
      pause() {
        videoRef.current?.pause()
        setIsPlaying(false)
      },
      seek(seconds: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, seconds)
        }
      },
      getProgress() {
        if (!videoRef.current) return 0
        const { currentTime, duration } = videoRef.current
        return duration ? (currentTime / duration) * 100 : 0
      },
    }), [])
    // No deps: these methods only access videoRef.current (stable)

    return (
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          onEnded={() => { setIsPlaying(false); onEnded?.() }}
        />
        <span className="status">{isPlaying ? '▶ Playing' : '⏸ Paused'}</span>
      </div>
    )
  }
)
VideoPlayer.displayName = 'VideoPlayer'

// Parent: imperative control without raw video DOM access
function CoursePage() {
  const playerRef = useRef<VideoPlayerHandle>(null)

  return (
    <div>
      <VideoPlayer ref={playerRef} src="/course/lesson-1.mp4" />
      <div className="controls">
        <button onClick={() => playerRef.current?.play()}>Play</button>
        <button onClick={() => playerRef.current?.pause()}>Pause</button>
        <button onClick={() => playerRef.current?.seek(30)}>Skip to 0:30</button>
        <button onClick={() => console.log(playerRef.current?.getProgress() + '%')}>
          Log progress
        </button>
      </div>
    </div>
  )
}
```

---

---

# 4 — useLayoutEffect

---

## T — TL;DR

`useLayoutEffect` fires **synchronously after DOM mutations but before the browser paints**. Use it when you need to measure the DOM or make DOM changes that must happen before the user sees anything — avoiding the visual flicker that `useEffect` causes.

---

## K — Key Concepts

```tsx
import { useLayoutEffect } from 'react'

// ── Timing comparison ─────────────────────────────────────────────────────
//
// React render → commit DOM mutations
//   → useLayoutEffect fires (synchronous, blocks paint)
//   → Browser paints the screen
//   → useEffect fires (asynchronous, after paint)
//
// Rule of thumb:
//   useEffect:       99% of cases — async, non-blocking, after paint
//   useLayoutEffect: DOM measurement + mutation that must happen before paint
```

```tsx
// ── The flicker problem useLayoutEffect solves ────────────────────────────
// ❌ useEffect: tooltip position calculated AFTER paint → visible jump
function TooltipBad({ text, targetRect }: { text: string; targetRect: DOMRect }) {
  const [top, setTop] = useState(0)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    const tooltipHeight = tooltip.getBoundingClientRect().height
    // Calculates position AFTER paint → tooltip renders at wrong position first
    setTop(targetRect.top - tooltipHeight - 8)
    // → user sees tooltip jump ❌
  }, [targetRect])

  return <div ref={tooltipRef} style={{ position: 'fixed', top }} className="tooltip">{text}</div>
}

// ✅ useLayoutEffect: position calculated before paint — no jump
function TooltipGood({ text, targetRect }: { text: string; targetRect: DOMRect }) {
  const [top, setTop] = useState(0)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    const tooltipHeight = tooltip.getBoundingClientRect().height
    setTop(targetRect.top - tooltipHeight - 8)
    // Runs before paint → tooltip renders in correct position immediately ✅
  }, [targetRect])

  return <div ref={tooltipRef} style={{ position: 'fixed', top }} className="tooltip">{text}</div>
}
```

```tsx
// ── useLayoutEffect for synchronous DOM reads + writes ────────────────────
function EqualHeightColumns({ children }: { children: React.ReactNode[] }) {
  const colRefs = useRef<(HTMLDivElement | null)[]>([])

  useLayoutEffect(() => {
    const heights = colRefs.current.map(el => el?.scrollHeight ?? 0)
    const maxHeight = Math.max(...heights)
    colRefs.current.forEach(el => {
      if (el) el.style.height = `${maxHeight}px`  // DOM mutation before paint ✅
    })
  })  // run after every render (no deps)

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {children.map((child, i) => (
        <div key={i} ref={el => { colRefs.current[i] = el }}>
          {child}
        </div>
      ))}
    </div>
  )
}
```

```tsx
// ── useLayoutEffect in SSR: avoid completely ──────────────────────────────
// ⚠️ useLayoutEffect throws a warning during server-side rendering (Next.js)
// The server has no DOM — layout effects can't run
// Fix: use useEffect for SSR-compatible code, or guard:
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
// Use this in libraries/hooks that run in both SSR and browser environments
```

---

## W — Why It Matters

- The visual flicker from `useEffect` during DOM measurement is the primary reason `useLayoutEffect` exists — tooltip positioning, scroll restoration, and animation starting points all need pre-paint timing.
- `useLayoutEffect` blocks the browser from painting until it finishes — this is a feature (no flicker) but also a responsibility (don't do slow work in it).
- SSR environments (Next.js) have no DOM, so `useLayoutEffect` warns during server rendering. The `useIsomorphicLayoutEffect` pattern is the standard fix in shared hook libraries.

---

## I — Interview Q&A

### Q: What is the difference between `useEffect` and `useLayoutEffect`?

**A:** Both run after React commits to the DOM, but at different times: `useLayoutEffect` runs **synchronously** after DOM updates and **before** the browser paints — the browser is blocked from rendering until it finishes. `useEffect` runs **asynchronously after** the browser has painted. Use `useLayoutEffect` when you need to: (1) read the DOM and immediately make a corrective mutation (tooltip/popover positioning, scroll restoration), or (2) ensure the user never sees an intermediate state — the component renders into the correct state before the first pixel is painted. For everything else, prefer `useEffect` — it doesn't block paint and keeps the UI responsive. `useLayoutEffect` with slow code visually freezes the page.

---

## C — Common Pitfalls + Fix

### ❌ Using `useLayoutEffect` for everything "to be safe"

```tsx
// ❌ Using useLayoutEffect for a simple data fetch — blocks paint unnecessarily
function UserList() {
  const [users, setUsers] = useState<User[]>([])

  useLayoutEffect(() => {   // ❌ blocks paint for no reason — no DOM measurement
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// ✅ useEffect for async operations with no DOM measurement
function UserListFixed() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {   // ✅ after paint — doesn't block rendering
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
// Rule: only use useLayoutEffect when you can clearly explain why
// the pre-paint timing is necessary
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `OverflowTooltip` component: truncates text with CSS, shows full text in a tooltip only when overflow is detected. Use `useLayoutEffect` to check overflow before paint.

### Solution

```tsx
interface OverflowTooltipProps {
  text:      string
  maxWidth?: number
}

function OverflowTooltip({ text, maxWidth = 200 }: OverflowTooltipProps) {
  const spanRef         = useRef<HTMLSpanElement>(null)
  const [showTip, setShowTip] = useState(false)
  const [visible, setVisible] = useState(false)

  // Check overflow synchronously before paint — no flash of un-truncated text
  useLayoutEffect(() => {
    const el = spanRef.current
    if (!el) return
    // scrollWidth > clientWidth means text is overflowing
    setShowTip(el.scrollWidth > el.clientWidth)
  }, [text, maxWidth])

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => showTip && setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        ref={spanRef}
        style={{
          display:     'inline-block',
          maxWidth:    maxWidth,
          overflow:    'hidden',
          whiteSpace:  'nowrap',
          textOverflow:'ellipsis',
          verticalAlign:'bottom',
        }}
      >
        {text}
      </span>
      {showTip && visible && (
        <span
          role="tooltip"
          style={{
            position:    'absolute',
            bottom:      '100%',
            left:        0,
            background:  '#222',
            color:       '#fff',
            padding:     '4px 8px',
            borderRadius: 4,
            whiteSpace:  'nowrap',
            zIndex:       1000,
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
```

---

---

# 5 — Layout Measurement Before Paint

---

## T — TL;DR

**Layout measurement** reads computed geometry from the DOM (`getBoundingClientRect`, `offsetWidth`, `scrollHeight`) after React commits but before the browser paints. Combine with `useLayoutEffect` or ref callbacks for flicker-free dynamic sizing, positioning, and animation setup.

---

## K — Key Concepts

```tsx
// ── Key measurement APIs ───────────────────────────────────────────────────
const el = ref.current!

// Position and size relative to viewport
const rect = el.getBoundingClientRect()
// → { top, right, bottom, left, width, height, x, y }

// Size including padding, not border
el.clientWidth   // visible width
el.clientHeight  // visible height

// Size including content overflow (total scrollable height)
el.scrollWidth   // total scrollable width
el.scrollHeight  // total scrollable height

// Position relative to offsetParent
el.offsetTop     // top offset from positioned ancestor
el.offsetLeft    // left offset from positioned ancestor
el.offsetWidth   // width including border
el.offsetHeight  // height including border

// Scroll position
el.scrollTop     // pixels scrolled from top
el.scrollLeft    // pixels scrolled from left
```

```tsx
// ── useLayoutEffect for anchored popover positioning ─────────────────────
interface AnchoredPopoverProps {
  anchorRef: React.RefObject<HTMLElement>
  children:  React.ReactNode
  open:      boolean
}

function AnchoredPopover({ anchorRef, children, open }: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [style,    setStyle]    = useState<React.CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !popoverRef.current) return

    const anchorRect  = anchorRef.current.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const viewportH   = window.innerHeight

    // Decide: show above or below based on available space
    const spaceBelow = viewportH - anchorRect.bottom
    const spaceAbove = anchorRect.top
    const showAbove  = spaceBelow < popoverRect.height && spaceAbove > spaceBelow

    setStyle({
      position: 'fixed',
      left:     anchorRect.left,
      top:      showAbove
        ? anchorRect.top - popoverRect.height - 8
        : anchorRect.bottom + 8,
      width:    anchorRect.width,
    })
  }, [open, anchorRef])   // recalculate when open state changes

  if (!open) return null
  return (
    <div ref={popoverRef} style={style} className="popover">
      {children}
    </div>
  )
}
```

```tsx
// ── ResizeObserver: react to size changes over time ─────────────────────
function useElementSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // Initial measurement
    const { width, height } = el.getBoundingClientRect()
    setSize({ width, height })

    // Observe future size changes
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()   // cleanup ✅
  }, [ref])

  return size
}

function ResponsiveChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(containerRef)

  return (
    <div ref={containerRef} style={{ width: '100%', height: 300 }}>
      <svg width={width} height={height}>
        {/* Chart adapts to container size ✅ */}
        <rect width={width} height={height} fill="#f0f0f0" />
        <text x={width / 2} y={height / 2} textAnchor="middle">
          {width} × {height}
        </text>
      </svg>
    </div>
  )
}
```

---

## W — Why It Matters

- Popovers, dropdowns, tooltips, and context menus all need layout measurement — computing "show above or below the button" requires knowing the button's position AND the popover's height before painting.
- `ResizeObserver` is the modern replacement for `window.resize` for element-level size tracking — it fires only when the specific element's size changes, not on every window resize.
- Every charting/visualization library (D3, Chart.js, custom SVG) needs the container width before drawing — `useLayoutEffect` + `ResizeObserver` is the standard pattern.

---

## I — Interview Q&A

### Q: When would you use `ResizeObserver` over `window.resize` event?

**A:** `ResizeObserver` observes a specific element's size — it fires when that element changes size, regardless of the cause (window resize, CSS changes, content changes, parent layout changes). `window.resize` only fires when the viewport size changes. If a sidebar collapses or a panel is toggled, `window.resize` won't fire but `ResizeObserver` will — because the element's available space changed. `ResizeObserver` is also more performant: it only notifies about observed elements, and the callback receives the new dimensions directly via `entry.contentRect` without requiring a `getBoundingClientRect()` call. For anything that should respond to an element's size (charts, responsive components), prefer `ResizeObserver`.

---

## C — Common Pitfalls + Fix

### ❌ Measuring the DOM in render (before commit)

```tsx
// ❌ getBoundingClientRect during render — DOM not yet updated
function BadMeasure() {
  const ref = useRef<HTMLDivElement>(null)
  const height = ref.current?.getBoundingClientRect().height ?? 0  // ❌ measures STALE DOM

  return (
    <div ref={ref}>
      <p>Height: {height}px</p>   {/* shows 0 or stale value */}
    </div>
  )
}

// ✅ Measure in useLayoutEffect — after DOM commit, before paint
function GoodMeasure() {
  const ref       = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const h = ref.current?.getBoundingClientRect().height ?? 0
    setHeight(h)   // triggers re-render with correct value, before paint ✅
  })

  return (
    <div ref={ref}>
      <p>Height: {height}px</p>
    </div>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useContainerQuery` hook: returns the current breakpoint ('sm' | 'md' | 'lg') based on the container's own width using `ResizeObserver`.

### Solution

```tsx
type Breakpoint = 'sm' | 'md' | 'lg'

function getBreakpoint(width: number): Breakpoint {
  if (width >= 768) return 'lg'
  if (width >= 480) return 'md'
  return 'sm'
}

function useContainerQuery(ref: React.RefObject<HTMLElement>): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // Initial measurement
    setBreakpoint(getBreakpoint(el.getBoundingClientRect().width))

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBreakpoint(getBreakpoint(entry.contentRect.width))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return breakpoint
}

// Usage: component adapts its own layout to its container, not the viewport
function AdaptiveCard() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const breakpoint    = useContainerQuery(containerRef)

  const layouts: Record<Breakpoint, React.CSSProperties> = {
    sm: { flexDirection: 'column' },
    md: { flexDirection: 'row' },
    lg: { flexDirection: 'row', gap: '2rem' },
  }

  return (
    <div ref={containerRef} style={{ ...layouts[breakpoint], display: 'flex' }}>
      <img src="/product.jpg" alt="product"
        style={{ width: breakpoint === 'sm' ? '100%' : 160 }} />
      <div>
        <h2>Product Title</h2>
        <p>Breakpoint: <strong>{breakpoint}</strong></p>
        {breakpoint === 'lg' && <p>Extended description only on large containers.</p>}
      </div>
    </div>
  )
}
```

---

---

# 6 — useSyncExternalStore

---

## T — TL;DR

`useSyncExternalStore` subscribes a component to an **external store** (any non-React state: Redux, Zustand internals, browser APIs like `navigator.onLine`, custom pub-sub) and re-renders it when the store changes. It's tear-safe — correct in React 18 concurrent mode.

---

## K — Key Concepts

```tsx
import { useSyncExternalStore } from 'react'

// ── Syntax ────────────────────────────────────────────────────────────────
const snapshot = useSyncExternalStore(
  subscribe,        // (callback) => unsubscribe — called to subscribe to the store
  getSnapshot,      // () => currentValue — called to read the current value
  getServerSnapshot // () => serverValue — optional, for SSR
)
// React calls getSnapshot on every render to get the current value
// React calls subscribe once to listen for changes
// When the store changes: callback() → React re-renders → getSnapshot() called
```

```tsx
// ── Built-in browser store: online status ────────────────────────────────
function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    // subscribe: attach/detach listeners
    callback => {
      window.addEventListener('online',  callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online',  callback)
        window.removeEventListener('offline', callback)
      }
    },
    // getSnapshot: return current value
    () => navigator.onLine,
    // getServerSnapshot: safe value for SSR (no navigator on server)
    () => true
  )
}

function StatusBar() {
  const isOnline = useOnlineStatus()
  return (
    <p style={{ color: isOnline ? 'green' : 'red' }}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </p>
  )
}
```

```tsx
// ── Custom external store ─────────────────────────────────────────────────
// A minimal pub-sub store compatible with useSyncExternalStore

function createStore<T>(initialState: T) {
  let state      = initialState
  const listeners = new Set<() => void>()

  function getSnapshot() { return state }

  function setState(updater: (prev: T) => T) {
    state = updater(state)
    listeners.forEach(cb => cb())   // notify all subscribers
  }

  function subscribe(callback: () => void) {
    listeners.add(callback)
    return () => listeners.delete(callback)   // returns unsubscribe ✅
  }

  return { getSnapshot, setState, subscribe }
}

// Create a shared counter store (outside React — module-level)
const counterStore = createStore({ count: 0 })

// Hook: any component subscribes with useSyncExternalStore
function useCounter() {
  const { count } = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot
  )
  return { count, increment: () => counterStore.setState(s => ({ count: s.count + 1 })) }
}

// Two independent components — both update when store changes
function ComponentA() {
  const { count, increment } = useCounter()
  return <button onClick={increment}>A: {count}</button>
}
function ComponentB() {
  const { count } = useCounter()
  return <p>B sees: {count}</p>   // updates when A increments ✅
}
```

---

## W — Why It Matters

- `useSyncExternalStore` is the **correct** way to subscribe to non-React state in React 18+ — using `useEffect` + `useState` to subscribe to an external store can miss updates in concurrent mode (tearing).
- Every major state manager (Redux, Zustand, Jotai) uses `useSyncExternalStore` internally — understanding it explains how those libraries work at the React integration level.
- Browser APIs like `navigator.onLine`, `matchMedia`, `localStorage` events, and `history` are all external stores — this hook is the idiomatic way to build hooks that read them.

---

## I — Interview Q&A

### Q: Why was `useSyncExternalStore` introduced and when should you use it over `useState` + `useEffect`?

**A:** `useSyncExternalStore` was introduced in React 18 to solve **tearing** — when different components read different values from an external store during a single concurrent render pass. With `useEffect` + `useState`: you subscribe in an effect (fires after render), and between the render and the effect, another render could read a stale value. `useSyncExternalStore` makes React read the store synchronously during render via `getSnapshot`, and forces a synchronous re-render if the value changes mid-commit. Use it when: subscribing to any state that lives outside React (browser APIs, custom stores, third-party state managers). For state that lives inside React, use `useState` or Context.

---

## C — Common Pitfalls + Fix

### ❌ `getSnapshot` returning a new object on every call — infinite re-render loop

```tsx
// ❌ getSnapshot creates a new object every call → React detects "change" → re-renders → repeat
function useBadStore() {
  return useSyncExternalStore(
    store.subscribe,
    () => ({ value: store.getValue() })   // ❌ new object every call
    // React compares with Object.is: {} !== {} → "changed" → re-render → loop
  )
}

// ✅ Return a stable value — same reference if unchanged, or primitive
function useGoodStore() {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getValue()   // ✅ returns primitive or same reference if unchanged
  )
}

// ✅ Or use a selector that returns the specific field you need
function useStoreField<T>(selector: (state: StoreState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
    // If selector returns a primitive (number, string, boolean) → stable ✅
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useLocalStorage` hook using `useSyncExternalStore` that subscribes to `storage` events so all tabs and all components stay in sync.

### Solution

```tsx
// Cross-tab localStorage store using useSyncExternalStore
function createLocalStorageStore<T>(key: string, initialValue: T) {

  function getSnapshot(): T {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  }

  function getServerSnapshot(): T {
    return initialValue   // SSR: no localStorage
  }

  function subscribe(callback: () => void): () => void {
    // React to external storage changes (other tabs)
    function handleStorage(e: StorageEvent) {
      if (e.key === key) callback()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }

  function setValue(value: T | ((prev: T) => T)): void {
    const current  = getSnapshot()
    const next     = typeof value === 'function'
      ? (value as (prev: T) => T)(current)
      : value
    localStorage.setItem(key, JSON.stringify(next))
    // Dispatch storage event for same-tab listeners (storage event only fires for OTHER tabs)
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }

  return { getSnapshot, getServerSnapshot, subscribe, setValue }
}

// Custom hook
function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const store = useMemo(
    () => createLocalStorageStore<T>(key, initialValue),
    [key]   // recreate store only when key changes
  )

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  )

  return [value, store.setValue]
}

// Usage: syncs across tabs and across components in the same app
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  )
}
```

---

---

# 7 — Imperative Interoperability

---

## T — TL;DR

When integrating **imperative third-party libraries** (maps, charts, rich text editors, jQuery plugins), React owns the container `<div>`, and the library owns everything inside it. Use `useEffect` to initialise and `useLayoutEffect` to sync prop changes — and always clean up.

---

## K — Key Concepts

```tsx
// ── The integration pattern ───────────────────────────────────────────────
// 1. Render an empty container element with a ref
// 2. In useEffect (empty deps): initialize the library, attach to container
// 3. In useEffect (relevant deps): sync prop changes to the library
// 4. In cleanup: destroy/tear down the library instance
// React ←→ ref ←→ Library (React never touches the library's inner DOM)
```

```tsx
// ── Map library integration ───────────────────────────────────────────────
interface Marker { id: string; lat: number; lng: number; label: string }
interface MapProps {
  center:  { lat: number; lng: number }
  zoom:    number
  markers: Marker[]
}

function InteractiveMap({ center, zoom, markers }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<LeafletMap | null>(null)
  const markerLayerRef = useRef<LeafletLayerGroup | null>(null)

  // Effect 1: initialize once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, { center, zoom })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()          // cleanup: destroy Leaflet instance ✅
      mapRef.current = null
    }
  }, [])  // ← empty deps: init once

  // Effect 2: sync center/zoom when props change
  useEffect(() => {
    mapRef.current?.setView(center, zoom)
  }, [center, zoom])

  // Effect 3: sync markers when they change
  useEffect(() => {
    const layer = markerLayerRef.current
    if (!layer) return
    layer.clearLayers()   // remove old markers
    markers.forEach(m => {
      L.marker([m.lat, m.lng])
        .bindPopup(m.label)
        .addTo(layer)
    })
  }, [markers])

  return <div ref={containerRef} style={{ height: 400, width: '100%' }} />
}
```

```tsx
// ── Rich text editor (e.g. Quill) ────────────────────────────────────────
interface RichEditorProps {
  value:    string
  onChange: (html: string) => void
  readOnly?: boolean
}

function RichEditor({ value, onChange, readOnly = false }: RichEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef    = useRef<Quill | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const quill = new Quill(containerRef.current, { theme: 'snow', readOnly })
    quill.root.innerHTML = value
    quill.on('text-change', () => onChange(quill.root.innerHTML))
    editorRef.current = quill

    return () => {
      editorRef.current = null
      // Quill doesn't have a destroy() — remove the container's children
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])  // init once — don't re-init on every value change

  // Sync readOnly separately
  useEffect(() => {
    editorRef.current?.enable(!readOnly)
  }, [readOnly])

  // Don't sync 'value' on every change — editor manages its own content
  // Only sync if externally changed (e.g. loaded from API)
  // (this is the key insight for imperative editors: avoid fighting the library)

  return <div ref={containerRef} />
}
```

---

## W — Why It Matters

- The "separate init and sync into different effects" pattern avoids the pitfall of re-initializing the entire library on every prop change — each effect has one responsibility.
- Forgetting the cleanup (not calling `map.remove()`) causes memory leaks and ghost event listeners. In React Strict Mode, the double-invoke makes this immediately obvious.
- The key tension: React wants to own the DOM; imperative libraries want to own the DOM. The solution is React owns the container, the library owns the contents — never let them fight.

---

## I — Interview Q&A

### Q: How do you integrate an imperative third-party library with React?

**A:** The pattern is: (1) Render an empty `<div>` with a `ref` — React owns this node but nothing inside it. (2) In a `useEffect` with empty deps, initialise the library, attach it to `ref.current`, and store the library instance in a separate `useRef`. (3) In separate `useEffect` hooks (with relevant deps), sync specific prop changes to the library instance using its API. (4) In the first effect's cleanup, destroy the library instance. Keep init and sync in separate effects so props updating doesn't re-initialise the entire library. Never fight the library over the DOM — if the library mutates the inner DOM, don't also try to control that DOM from React.

---

## C — Common Pitfalls + Fix

### ❌ Re-initializing the library on every prop change

```tsx
// ❌ One effect that inits AND syncs — re-creates library on every prop change
function ChartBad({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    // Destroys and recreates chart every time data OR color changes ❌
    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: { datasets: [{ data, backgroundColor: color }] }
    })
    return () => chart.destroy()
  }, [data, color])  // ← runs on every change, expensive

  return <canvas ref={canvasRef} />
}

// ✅ Separate init from sync
function ChartGood({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {   // init once
    if (!canvasRef.current) return
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { datasets: [{ data: [], backgroundColor: '' }] }
    })
    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [])

  useEffect(() => {   // sync data
    if (!chartRef.current) return
    chartRef.current.data.datasets[0].data = data
    chartRef.current.update()
  }, [data])

  useEffect(() => {   // sync color
    if (!chartRef.current) return
    chartRef.current.data.datasets[0].backgroundColor = color
    chartRef.current.update()
  }, [color])

  return <canvas ref={canvasRef} />
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useEventListener` custom hook for attaching event listeners to any target (window, document, or a DOM element ref) with proper cleanup.

### Solution

```tsx
type EventTarget = Window | Document | HTMLElement | null

function useEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler:   (event: WindowEventMap[K]) => void,
  target?:   EventTarget | React.RefObject<HTMLElement>,
  options?:  AddEventListenerOptions
): void {
  const handlerRef = useRef(handler)

  // Always keep handlerRef current without re-subscribing
  useLayoutEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    // Resolve target: ref object, direct target, or window
    const el: EventTarget =
      target && 'current' in target
        ? target.current
        : (target ?? window)

    if (!el) return

    const listener = (event: Event) =>
      handlerRef.current(event as WindowEventMap[K])

    el.addEventListener(eventType, listener, options)
    return () => el.removeEventListener(eventType, listener, options)
  }, [eventType, target, options])
  // handler intentionally omitted — handlerRef always current via useLayoutEffect
}

// Usage examples
function KeyboardShortcuts() {
  useEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      console.log('Save shortcut triggered')
    }
  })  // defaults to window

  return <p>Press Ctrl+S to save</p>
}

function ClickOutside({ onOutside }: { onOutside: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEventListener('mousedown', (e) => {
    if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
      onOutside()
    }
  }, document)

  return <div ref={boxRef} className="box">Click outside me</div>
}
```

---

---

# 8 — External Store Subscriptions

---

## T — TL;DR

An **external store** is any state that lives outside React — a custom store class, a singleton, browser APIs. The full pattern: create the store outside React, expose `subscribe`, `getSnapshot`, and mutator functions, then connect any component to it using `useSyncExternalStore`.

---

## K — Key Concepts

```tsx
// ── Complete external store pattern ──────────────────────────────────────
// Three required pieces:
// 1. subscribe(callback) → returns unsubscribe
// 2. getSnapshot() → returns current state (stable reference if unchanged)
// 3. Mutators that update state and notify listeners

class Store<T> {
  private state:     T
  private listeners: Set<() => void> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  // Required by useSyncExternalStore
  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // Required by useSyncExternalStore — must return stable ref if unchanged
  getSnapshot = (): T => this.state

  // Mutator: update state and notify
  protected setState(updater: (prev: T) => T): void {
    this.state = updater(this.state)
    this.listeners.forEach(cb => cb())
  }
}
```

```tsx
// ── Cart store: real-world example ────────────────────────────────────────
interface CartItem { id: string; name: string; price: number; qty: number }
interface CartState { items: CartItem[]; isOpen: boolean }

class CartStore extends Store<CartState> {
  constructor() {
    super({ items: [], isOpen: false })
  }

  addItem(item: Omit<CartItem, 'qty'>): void {
    this.setState(prev => {
      const existing = prev.items.find(i => i.id === item.id)
      return {
        ...prev,
        items: existing
          ? prev.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
          : [...prev.items, { ...item, qty: 1 }],
      }
    })
  }

  removeItem(id: string): void {
    this.setState(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }))
  }

  toggleCart(): void {
    this.setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }

  clearCart(): void {
    this.setState(() => ({ items: [], isOpen: false }))
  }
}

// Singleton: created once, lives for the app's lifetime
const cartStore = new CartStore()
```

```tsx
// ── Hooks connecting components to the store ──────────────────────────────
// Granular selectors: components only re-render when their slice changes
function useCartItems(): CartItem[] {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => cartStore.getSnapshot().items
  )
}

function useCartOpen(): boolean {
  return useSyncExternalStore(
    cartStore.subscribe,
    () => cartStore.getSnapshot().isOpen
  )
}

function useCartTotal(): number {
  const items = useCartItems()
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

// ── Components ────────────────────────────────────────────────────────────
function CartIcon() {
  const items  = useCartItems()
  const count  = items.reduce((s, i) => s + i.qty, 0)

  return (
    <button onClick={() => cartStore.toggleCart()}>
      🛒 {count > 0 && <span className="badge">{count}</span>}
    </button>
  )
}

function CartPanel() {
  const items  = useCartItems()
  const isOpen = useCartOpen()
  const total  = useCartTotal()

  if (!isOpen) return null
  return (
    <aside className="cart-panel">
      <h2>Your Cart</h2>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name} × {item.qty}</span>
          <span>${(item.price * item.qty).toFixed(2)}</span>
          <button onClick={() => cartStore.removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <p>Total: ${total.toFixed(2)}</p>
      <button onClick={() => cartStore.clearCart()}>Clear</button>
    </aside>
  )
}
```

---

## W — Why It Matters

- The pattern here — store class + `useSyncExternalStore` + selector hooks — is exactly how Zustand works internally. Understanding this demystifies state libraries.
- Granular selector hooks (`useCartItems`, `useCartOpen`) mean components only re-render when their slice of state changes — `CartPanel` doesn't re-render when `isOpen` changes if it only subscribes to `items`.
- Singleton stores (module-level) persist across component unmounts — the cart doesn't reset when the `CartPanel` unmounts. This is the key advantage over `useState` for global state.

---

## I — Interview Q&A

### Q: How does `useSyncExternalStore` prevent tearing in concurrent React?

**A:** Tearing happens when React renders different components and they read different values from the same store during one concurrent render pass — one component reads the old value, another reads the new one, producing an inconsistent UI. `useSyncExternalStore` prevents this by: (1) calling `getSnapshot` during render to read the current value, (2) subscribing to the store and re-rendering if the snapshot changes during the render pass — React detects the inconsistency and forces a synchronous re-render before committing. With `useEffect` + `useState`, there's a window between render and the effect subscribing where React could commit a partially-torn state. `useSyncExternalStore` closes this window.

---

## C — Common Pitfalls + Fix

### ❌ Subscribing with a new function on every render — re-subscribes constantly

```tsx
// ❌ New subscribe function on every render — React re-subscribes on every render
function useCartItemsBad() {
  return useSyncExternalStore(
    (callback) => {          // ❌ new function reference every render
      cartStore.subscribe(callback)
      return () => cartStore.unsubscribe(callback)
    },
    () => cartStore.getSnapshot().items
  )
}

// ✅ Pass a stable method reference — or define outside the component
function useCartItemsGood() {
  return useSyncExternalStore(
    cartStore.subscribe,        // ✅ stable method reference (bound in class)
    () => cartStore.getSnapshot().items
  )
}

// ✅ If you need to subscribe with params: memoize with useCallback
function useStoreSlice<T>(selector: (s: StoreState) => T): T {
  const getSnapshot = useCallback(
    () => selector(store.getSnapshot()),
    [selector]
  )
  return useSyncExternalStore(store.subscribe, getSnapshot)
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useMediaQuery` hook using `useSyncExternalStore` that subscribes to `window.matchMedia` and returns whether the query matches.

### Solution

```tsx
// Create a stable store per media query string
const mediaQueryStores = new Map<string, {
  subscribe:   (cb: () => void) => () => void
  getSnapshot: () => boolean
}>()

function getMediaQueryStore(query: string) {
  if (!mediaQueryStores.has(query)) {
    const mql = window.matchMedia(query)

    const store = {
      subscribe: (callback: () => void): (() => void) => {
        mql.addEventListener('change', callback)
        return () => mql.removeEventListener('change', callback)
      },
      getSnapshot: (): boolean => mql.matches,
    }
    mediaQueryStores.set(query, store)
  }
  return mediaQueryStores.get(query)!
}

function useMediaQuery(query: string): boolean {
  const store = useMemo(() => getMediaQueryStore(query), [query])

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => false   // SSR: default to false (mobile-first)
  )
}

// Usage
function ResponsiveNav() {
  const isMobile  = useMediaQuery('(max-width: 767px)')
  const isDark    = useMediaQuery('(prefers-color-scheme: dark)')
  const isReduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <nav data-theme={isDark ? 'dark' : 'light'}>
      {isMobile ? <HamburgerMenu />  : <DesktopNav />}
      {isReduced && <p>Reduced motion mode</p>}
    </nav>
  )
}
```

---

## ✅ Day 5 Complete — React Escape Hatches

| # | Subtopic | Status |
|---|----------|--------|
| 1 | useRef — Mutable Values Without Re-renders | ☐ |
| 2 | DOM Access with Refs + forwardRef | ☐ |
| 3 | useImperativeHandle | ☐ |
| 4 | useLayoutEffect | ☐ |
| 5 | Layout Measurement Before Paint | ☐ |
| 6 | useSyncExternalStore | ☐ |
| 7 | Imperative Interoperability | ☐ |
| 8 | External Store Subscriptions | ☐ |

---

## 🗺️ One-Page Mental Model — Day 5

```
useRef
  Mutable box: { current: value } — persists across renders, no re-render on change
  Use for: timer IDs, subscription handles, previous values, DOM nodes
  Use state when: value appears in the UI | Use ref when: internal plumbing
  ref.current read in render = no reactive update — only event handlers/effects
  usePrevious pattern: update in useEffect → returns last render's value

DOM ACCESS + forwardRef
  ref={myRef} → myRef.current = DOM node after mount, null after unmount
  Type: useRef<HTMLInputElement>(null) — TypeScript knows the element API
  forwardRef: lets parent access child's internal DOM node
  Use: focus management, scroll control, canvas drawing, measurements
  Ref callback: fires synchronously on attach/detach — no useEffect needed
  ⚠️ Never access ref.current during render — DOM doesn't exist yet

useImperativeHandle
  Replaces raw DOM node with a custom API object for the parent's ref
  Always used with forwardRef
  Restricts what parents can do — only exposed methods are callable
  Common: modal.open/close, input.focus/clear, player.play/pause/seek
  Deps array: include any state/props the handle methods close over
  Prevents: parents making arbitrary DOM mutations (style, value, attributes)

useLayoutEffect
  Runs synchronously after DOM commit, BEFORE browser paint (blocks paint)
  Use when: DOM measurement → mutation that must happen before user sees anything
  Use case: tooltip/popover positioning, scroll restoration, equal heights
  useEffect: 99% of cases (async, after paint, non-blocking)
  useLayoutEffect: only when you can explain why pre-paint timing is needed
  SSR: useLayoutEffect warns (no DOM) → useIsomorphicLayoutEffect pattern

LAYOUT MEASUREMENT
  getBoundingClientRect: position+size relative to viewport (after layout)
  clientWidth/Height: visible size | scrollWidth/Height: total scrollable size
  offsetTop/Left: position from positioned ancestor
  ResizeObserver: better than window.resize — fires per element, not per viewport
  useLayoutEffect + ResizeObserver = correct pattern for size-reactive components
  Never measure DOM during render — always in useLayoutEffect or ref callbacks

useSyncExternalStore
  Subscribes to state that lives outside React (stores, browser APIs)
  Required: subscribe(callback) → unsubscribe, getSnapshot() → current value
  Optional: getServerSnapshot() → SSR safe value
  Prevents tearing: reads store synchronously during render
  getSnapshot must return stable reference — new object every call = infinite loop
  Used internally by: Redux, Zustand, Jotai, Valtio
  Built-in use cases: navigator.onLine, matchMedia, localStorage events

IMPERATIVE INTEROPERABILITY
  Pattern: React owns container div, library owns interior DOM
  Effect 1 ([] deps): init library, store instance in ref, cleanup = destroy
  Effect 2+ (relevant deps): sync props to library via its API
  Never re-init on every prop change — separate init from sync
  Cleanup is mandatory — Strict Mode double-invoke surfaces missing cleanup
  Rule: never fight the library over the DOM — clear ownership boundaries

EXTERNAL STORE SUBSCRIPTIONS
  Full pattern: subscribe + getSnapshot + mutators (setState + notify)
  Singleton stores: module-level — persist across component unmounts
  Granular selectors: useSelector(store, s => s.items) — re-render only on slice change
  useCartItems, useCartOpen → separate hooks for separate concerns
  subscribe reference must be stable — class method or defined outside component
  This IS how Zustand works internally — understanding it demystifies state libraries
```

> **Your next action:** Find a component using `useEffect` to set `document.title` or subscribe to a window event. Verify it has a cleanup function — add one if missing. Then check if it would benefit from a custom hook extraction. Ten minutes of real code beats rereading this page.

> "Doing one small thing beats opening a feed."