# 2 — DOM Access with Refs + forwardRef

---

## T — TL;DR

Pass a ref to a DOM element with `ref={myRef}` — React sets `myRef.current` to the DOM node after mount and `null` on unmount. To let a parent access a child component's internal DOM node, accept `ref` as a regular prop (React 19) — `forwardRef` is only needed before React 19.

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
// ── ref as a prop (React 19): expose a child's DOM node to the parent ────
// React 19: function components receive `ref` like any other prop — no wrapper needed.
// (Before React 19 this required forwardRef — see the note below.)
// ComponentProps<'input'> already includes `ref` in the React 19 types
interface FancyInputProps extends React.ComponentProps<'input'> {
  label: string
}

function FancyInput({ label, ref, ...props }: FancyInputProps) {
  return (
    <label>
      {label}
      <input ref={ref} className="fancy-input" {...props} />
    </label>
  )
}

// Before React 19 (and still common in existing codebases / libraries):
// const FancyInput = forwardRef<HTMLInputElement, FancyInputProps>(
//   function FancyInput({ label, ...props }, ref) { ... <input ref={ref} .../> }
// )
// forwardRef still works in 19 but is deprecated and will be removed in a future major.

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

- Passing `ref` through to the DOM element is required any time a reusable input/button component needs to support focus management from outside — form libraries like React Hook Form (Day 5 group) rely on it. In React 19 that is just a `ref` prop; before 19 it needed `forwardRef`.
- Ref callbacks fire synchronously when the DOM node attaches/detaches — more precise than `useEffect` for one-time measurements because they don't wait for a render cycle.
- Typing refs with the exact DOM element type (`useRef<HTMLInputElement>(null)`) gives TypeScript knowledge of which properties and methods are available — `HTMLInputElement` has `.value`, `.select()`, `.focus()` but not `.play()`.

---

## I — Interview Q&A

### Q: How does a parent get a ref to a DOM node inside a child component, and what is `forwardRef`?

**A:** In React 19, `ref` is an ordinary prop for function components: the child destructures `ref` from its props and passes it to the inner DOM element (`<input ref={ref} />`), so `<FancyInput ref={myRef} />` just works. Before React 19, `ref` was reserved — React did not pass it to function components — so you had to wrap the component in `forwardRef`, which hands the `ref` as a second argument. `forwardRef` still works in 19 but is deprecated, so you will meet it in existing codebases and libraries. It's needed (in either form) when: (1) A reusable component wraps a native element (like `FancyInput` wrapping `<input>`) and the parent needs DOM access — for focus, scroll, measurements. (2) Form libraries use it to register inputs without needing to pass extra props. If the child never forwards `ref` to an element, `myRef.current` stays `null`.

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

Build a `ScrollableList` component with a "Scroll to bottom" button. Use the React 19 `ref` prop (with `useImperativeHandle`) to expose a `scrollToItem(index)` method via the ref from a parent component.

### Solution

```tsx
interface ScrollableListHandle {
  scrollToItem: (index: number) => void
  scrollToBottom: () => void
}

interface ScrollableListProps {
  items: string[]
  ref?:  React.Ref<ScrollableListHandle>   // React 19: ref is a normal prop
}

// Before React 19: const ScrollableList = forwardRef<ScrollableListHandle, {items: string[]}>(...)
function ScrollableList({ items, ref }: ScrollableListProps) {
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
