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
