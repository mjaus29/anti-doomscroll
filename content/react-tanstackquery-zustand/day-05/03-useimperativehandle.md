# 3 — useImperativeHandle

---

## T — TL;DR

`useImperativeHandle` customizes what a parent receives when it holds a `ref` to a child component. Instead of exposing the raw DOM node, you expose a **controlled API object** with only the methods you want parents to call. In React 19 the `ref` arrives as a normal prop (before 19 it was passed through `forwardRef`).

---

## K — Key Concepts

```tsx
import { useImperativeHandle } from 'react'
// Before React 19 you also imported forwardRef and wrapped the component in it

// ── Syntax ────────────────────────────────────────────────────────────────
useImperativeHandle(
  ref,              // the `ref` prop (React 19) — pre-19: the 2nd argument given by forwardRef
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
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
// (pre-19: forwardRef<HTMLInputElement, InputProps>((props, ref) => <input ref={ref} {...props} />))
// Parent can: ref.current.value = 'hack', ref.current.style.display = 'none' ❌
// Parent has unrestricted DOM access

// ✅ Expose only specific, intentional methods
interface InputHandle {
  focus:    () => void
  clear:    () => void
  getValue: () => string
}

function ControlledInput({ ref, ...props }: InputProps & { ref?: React.Ref<InputHandle> }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus:    () => inputRef.current?.focus(),
    clear:    () => { if (inputRef.current) inputRef.current.value = '' },
    getValue: () => inputRef.current?.value ?? '',
  }), [])
  // Parent receives ONLY focus, clear, getValue — nothing else ✅

  return <input ref={inputRef} {...props} />
}
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
  ref?:     React.Ref<ModalHandle>   // React 19: ref is a normal prop
}

function Modal({ title, children, onClose, ref }: ModalProps) {
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
- The modal via ref pattern is a common interview question — it shows understanding of both ref passing (`ref` prop in React 19, `forwardRef` before) and `useImperativeHandle` working together to create an imperative API for a component that manages its own state.
- The deps array in `useImperativeHandle` matters — if the exposed methods close over state (like `isOpen`), include it in deps so the handle is re-created when that state changes.

---

## I — Interview Q&A

### Q: What does `useImperativeHandle` do and when would you use it?

**A:** `useImperativeHandle` replaces the value that the `ref` would normally expose to the parent — instead of the raw DOM node, the parent receives a custom object of methods and properties you define. Use it when: (1) You want to expose a high-level API (`modal.open()`, `input.focus()`, `list.scrollToItem(n)`) rather than raw DOM access. (2) You want to restrict parents from making arbitrary DOM mutations — only the methods you expose are callable. (3) The thing you're exposing isn't a DOM node at all — it's a component's internal behaviour. The common pattern: the component receives the `ref` prop (React 19; via `forwardRef` before 19) and passes it to `useImperativeHandle`, which sets what `.current` contains.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting deps when handle methods close over changing state

```tsx
// ❌ Handle captures stale 'items' state — methods always use initial value
function ListHandle({ items, ref }: { items: string[]; ref?: React.Ref<ListApi> }) {
  const [selected, setSelected] = useState<number | null>(null)

  useImperativeHandle(ref, () => ({
    getSelectedItem: () => selected !== null ? items[selected] : null,
    // 'selected' and 'items' are closed over but NOT in deps array ❌
  }))  // missing deps → stale closure

  return <div>{items.map((item, i) => (
    <p key={i} onClick={() => setSelected(i)}>{item}</p>
  ))}</div>
}

// ✅ Include all closed-over values in deps
useImperativeHandle(ref, () => ({
  getSelectedItem: () => selected !== null ? items[selected] : null,
}), [selected, items])  // ✅ re-creates handle when selected or items changes
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `VideoPlayer` component that takes `ref` as a prop and uses `useImperativeHandle` that exposes `play()`, `pause()`, `seek(seconds)`, and `getProgress()` — without exposing the raw `<video>` element.

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
  ref?:     React.Ref<VideoPlayerHandle>   // React 19: ref is a normal prop
}

function VideoPlayer({ src, poster, onEnded, ref }: VideoPlayerProps) {
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
