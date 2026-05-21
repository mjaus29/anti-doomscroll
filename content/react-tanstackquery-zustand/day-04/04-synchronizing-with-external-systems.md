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
