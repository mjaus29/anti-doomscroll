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
