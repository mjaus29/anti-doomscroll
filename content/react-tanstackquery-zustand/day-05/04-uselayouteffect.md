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
