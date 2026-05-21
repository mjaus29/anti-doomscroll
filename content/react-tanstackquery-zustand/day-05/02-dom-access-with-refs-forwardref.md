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
