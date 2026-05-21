# 6 — Query Cancellation with AbortSignal

---

## T — TL;DR

TanStack Query provides an `AbortSignal` in the `QueryFunctionContext`. Pass it to `fetch` — when the query is cancelled (component unmounts, key changes, `cancelQueries` called), the in-flight request is aborted automatically.

---

## K — Key Concepts

```tsx
// ── How TanStack Query cancels queries ────────────────────────────────────
// When does TanStack Query cancel a query?
// 1. Component unmounts while query is in flight
// 2. queryKey changes (new key = new query; old is cancelled)
// 3. qc.cancelQueries({ queryKey }) is called explicitly
// 4. onMutate calls cancelQueries before optimistic update

// ── Passing signal to fetch ───────────────────────────────────────────────
function useProduct(productId: number) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async ({ signal }) => {       // signal from TanStack ✅
      const res = await fetch(`/api/products/${productId}`, { signal })
      if (!res.ok) throw new Error(`${res.status}`)
      return res.json() as Promise<Product>
    },
  })
  // When productId changes → old request aborted → no stale response written ✅
}
```

```tsx
// ── Signal with third-party HTTP clients ─────────────────────────────────
// axios: pass signal in config
const fetchWithAxios = async ({ queryKey, signal }: QueryFunctionContext) => {
  const [, id] = queryKey as [string, number]
  const { data } = await axios.get(`/api/items/${id}`, { signal })
  return data as Item
}

// Multiple fetch calls in one queryFn — pass signal to each
const fetchUserWithPosts = async ({ queryKey, signal }: QueryFunctionContext) => {
  const [, userId] = queryKey as [string, number]
  const [user, posts] = await Promise.all([
    fetch(`/api/users/${userId}`,          { signal }).then(r => r.json()),
    fetch(`/api/posts?author=${userId}`,   { signal }).then(r => r.json()),
  ])
  // If cancelled: both requests abort ✅
  return { user, posts }
}
```

```tsx
// ── Manual cancelQueries (optimistic update pre-step) ─────────────────────
await qc.cancelQueries({ queryKey: postKeys.detail(postId) })
// Returns a Promise that resolves when the in-flight request is aborted
// ← always await this before setQueryData in onMutate

// ── What happens to the component when its query is cancelled? ─────────────
// If cancelled because component unmounted:
//   → component is gone, no state update needed
// If cancelled because key changed:
//   → TanStack starts new query for new key, old result is discarded
// If cancelled for optimistic update:
//   → setQueryData provides the value, no need for the response
```

---

## W — Why It Matters

- Without signal propagation, switching between users/products fires new requests but also keeps old ones running — the stale response from user 1 can arrive after user 2's data and overwrite it (race condition).
- Aborting on unmount prevents `setState` calls on unmounted components (the "can't perform a React state update on an unmounted component" warning in older React).
- `await cancelQueries` in `onMutate` is how you synchronize cancellation with optimistic cache writes — the await ensures the abort is acknowledged before you write the new value.

---

## I — Interview Q&A

### Q: How does TanStack Query handle query cancellation and why does it matter?

**A:** TanStack Query creates an `AbortController` per query execution and passes its `signal` through `QueryFunctionContext`. When the query is cancelled — due to key change, component unmount, or manual `cancelQueries` — TanStack calls `controller.abort()`, setting `signal.aborted = true`. If you've passed the signal to `fetch`, the browser aborts the underlying HTTP request, freeing the connection. If you haven't passed the signal, the network request continues but TanStack discards the result when it arrives. Passing the signal matters for: preventing race conditions on fast key changes (search typing), avoiding state updates on unmounted components, and ensuring optimistic updates aren't overwritten by stale responses.

---

## C — Common Pitfalls + Fix

### ❌ Catching abort errors as real errors

```tsx
// ❌ AbortError treated as a query failure — shows error state on navigation
const fetchData = async ({ signal }: QueryFunctionContext) => {
  try {
    const res = await fetch('/api/data', { signal })
    return res.json()
  } catch (err) {
    // AbortError fires when signal is aborted — treat it as non-error ✅
    // ❌ Rethrowing it here causes TanStack Query to mark query as error
    throw err
  }
}

// ✅ Let TanStack Query handle AbortError — it ignores it automatically
// Just pass the signal and don't catch AbortError:
const fetchDataFixed = async ({ signal }: QueryFunctionContext) => {
  const res = await fetch('/api/data', { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
  // If aborted: fetch throws AbortError
  // TanStack Query catches it, recognises it as cancellation, does NOT set error state ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `useTypeahead` hook: debounced search, signal passed to fetch, search results cancelled on each new keystroke.

### Solution

```tsx
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

async function searchAPI(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
  if (!res.ok) throw new Error(`search: ${res.status}`)
  return res.json()
}

function useTypeahead(rawInput: string) {
  const debouncedInput = useDebounce(rawInput, 350)
  const isEnabled      = debouncedInput.trim().length >= 2

  return useQuery({
    queryKey: ['typeahead', debouncedInput],
    queryFn:  ({ signal }) => searchAPI(debouncedInput, signal),
    // When debouncedInput changes → old request aborted via signal ✅
    enabled:  isEnabled,
    staleTime: 1000 * 30,
    gcTime:    1000 * 60,
  })
}

function TypeaheadInput() {
  const [input, setInput] = useState('')
  const { data: results = [], isLoading } = useTypeahead(input)

  return (
    <div role="combobox">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
      />
      {isLoading && input.length >= 2 && <Spinner size="sm" />}
      {results.length > 0 && (
        <ul role="listbox">
          {results.map(r => (
            <li key={r.id} role="option">{r.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---
