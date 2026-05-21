# 7 — Error Boundaries

---

## T — TL;DR

An **Error Boundary** is a class component that catches JavaScript errors in its child tree during render, prevents a blank white screen, and shows a fallback UI. They must be class components — there is no hook equivalent. Use `react-error-boundary` for a modern API.

---

## K — Key Concepts

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

// ── Manual class-based error boundary ────────────────────────────────────
interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  children: ReactNode
}
interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }   // triggers fallback render
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Boundary caught:', error, info.componentStack)
    // Send to error monitoring: Sentry, Datadog, etc.
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      const { fallback } = this.props
      return typeof fallback === 'function'
        ? fallback(this.state.error, this.reset)
        : fallback
    }
    return this.props.children
  }
}
```

```tsx
// ── react-error-boundary: the production-ready solution ──────────────────
// npm install react-error-boundary
import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({
  error, resetErrorBoundary
}: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  return (
    // App-level boundary: last resort
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Header />
      {/* Feature-level boundary: isolates a section */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <Dashboard />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  )
}
```

```tsx
// ── What error boundaries DON'T catch ────────────────────────────────────
// ❌ Event handlers (use try/catch there)
// ❌ Async code (useEffect, setTimeout, fetch — handle in the async code)
// ❌ Server-side rendering
// ❌ Errors in the boundary itself
//
// ✅ What they DO catch:
// ✅ Errors during render
// ✅ Errors in lifecycle methods
// ✅ Errors in constructors of child components
```

---

## W — Why It Matters

- Without error boundaries, an unhandled render error crashes the **entire React tree** — the user sees a blank page. A boundary limits the blast radius to just the section that errored.
- `componentDidCatch` is the integration point for error monitoring services — every production app should log caught errors to Sentry/Datadog with `componentStack` for tracing.
- Granular boundaries (one per major feature/section) are better than one global boundary — a widget error shouldn't blank out the entire page.

---

## I — Interview Q&A

### Q: What are error boundaries, what do they catch, and what don't they catch?

**A:** Error boundaries are class components that catch render-time errors in their child tree. They must be classes because the two lifecycle methods — `getDerivedStateFromError` (to switch to fallback UI) and `componentDidCatch` (to log the error) — have no hook equivalents. They catch: errors during rendering, errors in class lifecycle methods, and errors in constructors. They do NOT catch: errors in event handlers (use `try/catch`), errors in async code like `useEffect` or `fetch` callbacks (handle with state), or server-side rendering errors. The `react-error-boundary` package provides a function component wrapper with a convenient API including a `resetErrorBoundary` callback to recover without a full page reload.

---

## C — Common Pitfalls + Fix

### ❌ One global boundary with no recovery path

```tsx
// ❌ One top-level boundary — entire app goes dark on any render error
function AppBad() {
  return (
    <ErrorBoundary fallback={<p>App crashed. Refresh the page.</p>}>
      <EntireApp />   {/* any error → entire app → blank ❌ */}
    </ErrorBoundary>
  )
}

// ✅ Granular boundaries with reset + isolated sections
function AppGood() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <Header />   {/* header errors don't blank the body ✅ */}
      <ErrorBoundary
        FallbackComponent={({ resetErrorBoundary }) => (
          <div>Widget failed. <button onClick={resetErrorBoundary}>Retry</button></div>
        )}
      >
        <StockWidget />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <NewsFeed />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `AsyncErrorBoundary` that catches BOTH render errors (via boundary) and async errors (via a `useError` throw hook).

### Solution

```tsx
import { ErrorBoundary } from 'react-error-boundary'

// Hook to throw async errors into the nearest boundary
function useAsyncError() {
  const [, setError] = useState<Error>()
  return useCallback((error: Error) => {
    setError(() => { throw error })
  }, [])
}

function WeatherWidget({ city }: { city: string }) {
  const [weather,    setWeather]    = useState<string | null>(null)
  const [isLoading,  setIsLoading]  = useState(true)
  const throwError = useAsyncError()   // bridge async errors to boundary

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/weather?city=${city}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => { setWeather(d.description); setIsLoading(false) })
      .catch(err => throwError(err))   // ✅ sends async error to boundary
  }, [city, throwError])

  if (isLoading) return <Spinner />
  return <p>Weather in {city}: {weather}</p>
}

function WeatherSection({ city }: { city: string }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div>
          <p>Failed to load weather: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      <WeatherWidget city={city} />
    </ErrorBoundary>
  )
}
```

---

---
