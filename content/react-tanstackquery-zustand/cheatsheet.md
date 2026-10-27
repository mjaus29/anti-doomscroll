# React / TanStack Query / Zustand Cheat Sheet

A one-page reference for the 12-day track: what to memorize about React, TanStack Query v5 and Zustand, and where each one stops.

## Which tool owns which state

| State | Owner | Example |
| --- | --- | --- |
| Local to one component | `useState` / `useReducer` | input text, toggle, hover |
| Shared client-only UI state | Zustand | sidebar open, selected IDs, theme |
| Data that lives on a server | TanStack Query | users, posts, orders |
| Value computable from other state | Neither: derive in render | `filtered`, `total`, `isValid` |
| Shareable / bookmarkable UI state | The URL | filters, page, tab |

Rule of thumb: if it comes from an API it is TanStack Query. If it is UI-only and shared, it is Zustand. If only one component cares, it is `useState`.

Lessons: [Server vs client state](/group/react-tanstackquery-zustand/day/07/01-server-state-vs-client-state) · [Separating UI state from server cache](/group/react-tanstackquery-zustand/day/11/08-separating-ui-state-from-server-cache) · [Architecture boundaries](/group/react-tanstackquery-zustand/day/12/10-react-tanstack-query-zustand-architecture-boundaries)

## React: components, JSX, props

| Concept | Syntax | Note |
| --- | --- | --- |
| One root | `<>...</>` | Fragment avoids an extra `<div>` |
| Attributes | `className`, `htmlFor`, `onClick` | camelCase, all tags closed |
| Expressions | `{user.name}`, `{a ? b : c}` | expressions only, no `if`/`for` |
| Conditional | `cond && <X />`, ternary, early return | `{0 && <X />}` renders `0` |
| Lists | `items.map(i => <Row key={i.id} />)` | stable data IDs, not index |
| Props | `function Card({ title }: Props)` | read-only; pass JSX as `children` |
| Purity | same props in, same JSX out | no fetch / mutation during render |

```tsx
function TodoList({ todos, onToggle }: Props) {
  if (todos.length === 0) return <p>Nothing to do</p>
  return (
    <ul>
      {todos.map(t => (
        <li key={t.id} onClick={() => onToggle(t.id)}>{t.title}</li>
      ))}
    </ul>
  )
}
```

Strict Mode calls components twice in dev to surface impure renders.

Lessons: [Component purity](/group/react-tanstackquery-zustand/day/01/03-component-purity) · [JSX rules](/group/react-tanstackquery-zustand/day/01/04-jsx-rules) · [Conditional rendering](/group/react-tanstackquery-zustand/day/01/08-conditional-rendering) · [Stable keys](/group/react-tanstackquery-zustand/day/01/09-list-rendering-stable-keys)

## React: events and state

| Concept | Example | Note |
| --- | --- | --- |
| Handler | `onClick={handleClick}` | pass a reference, not `handleClick()` |
| With args | `onClick={() => remove(id)}` | wrap in an arrow |
| Naming | prop `onDelete`, impl `handleDelete` | parent owns logic, child owns UI |
| State | `const [n, setN] = useState(0)` | setter schedules a re-render |
| Lazy init | `useState(() => load())` | runs once, not every render |
| Updater | `setN(prev => prev + 1)` | use when next depends on previous |
| Snapshot | `n` is fixed for this render | setter does not change `n` now |
| Batching | many sets, one re-render | React 18+: also in timeouts/promises |

```tsx
setCount(count + 1)
setCount(count + 1)        // still +1 total: same snapshot
setCount(c => c + 1)
setCount(c => c + 1)       // +2: updaters queue
```

Immutable updates (React compares by reference):

```tsx
setUser(u => ({ ...u, address: { ...u.address, city } }))
setItems(xs => [...xs, item])                     // add
setItems(xs => xs.filter(x => x.id !== id))       // remove
setItems(xs => xs.map(x => x.id === id ? { ...x, done: true } : x))
```

Controlled input: `value={text}` plus `onChange={e => setText(e.target.value)}`.

Lessons: [useState](/group/react-tanstackquery-zustand/day/02/03-usestate) · [State as a snapshot](/group/react-tanstackquery-zustand/day/02/04-state-as-a-snapshot) · [Immutable updates](/group/react-tanstackquery-zustand/day/02/08-updating-objects-and-arrays-immutably)

## React: state structure

| Principle | Do |
| --- | --- |
| No redundant state | compute `fullName` from `first` + `last` in render |
| No duplicate state | store `selectedId`, look up the item |
| Lift state up | move to closest common parent, pass value + callback |
| Colocate | keep state in the lowest component that needs it |
| Preserve | same type at same tree position keeps state |
| Reset | change `key` to remount: `<Form key={userId} />` |

Lessons: [Choosing state structure](/group/react-tanstackquery-zustand/day/03/01-choosing-state-structure) · [Lifting state up](/group/react-tanstackquery-zustand/day/03/05-lifting-state-up) · [Resetting with key](/group/react-tanstackquery-zustand/day/03/10-resetting-state-with-key)

## React: effects and custom hooks

Hook rules: call at the top level only, and only from components or `use*` hooks (React tracks hooks by call order).

| Dependency array | Runs |
| --- | --- |
| none | after every render |
| `[]` | after mount (cleanup on unmount) |
| `[a, b]` | after mount and when `a` or `b` change |

```tsx
useEffect(() => {
  const conn = createConnection(roomId)
  conn.connect()
  return () => conn.disconnect()   // cleanup before re-run and on unmount
}, [roomId])
```

| You wrote an effect to... | Instead |
| --- | --- |
| derive state from props/state | compute during render |
| reset state when a prop changes | `key` |
| respond to a click/submit | do it in the event handler |
| fetch data | TanStack Query |

Effects are for syncing with external systems (DOM APIs, sockets, timers, third-party widgets). Custom hooks (`useOnlineStatus`) bundle state + effects; each call gets its own state. `useDebugValue` labels them in DevTools.

Lessons: [useEffect + cleanup](/group/react-tanstackquery-zustand/day/04/02-useeffect-syntax-purpose-cleanup) · [Removing unnecessary effects](/group/react-tanstackquery-zustand/day/04/06-removing-unnecessary-effects) · [Custom hooks](/group/react-tanstackquery-zustand/day/04/07-custom-hooks)

## React: refs and external stores

| Hook | Use | Note |
| --- | --- | --- |
| `useRef(init)` | DOM node or mutable value | `ref.current` changes do not re-render |
| `forwardRef` | expose a child's DOM node | React 19 also accepts `ref` as a prop |
| `useImperativeHandle` | expose `{ focus, reset }` not the DOM | pair with a forwarded ref |
| `useLayoutEffect` | measure DOM before paint | blocks paint; use only to avoid flicker |
| `useSyncExternalStore` | subscribe to non-React state | tear-safe in concurrent rendering |

```tsx
const online = useSyncExternalStore(
  cb => {
    window.addEventListener('online', cb)
    window.addEventListener('offline', cb)
    return () => {
      window.removeEventListener('online', cb)
      window.removeEventListener('offline', cb)
    }
  },
  () => navigator.onLine,          // getSnapshot
  () => true,                      // getServerSnapshot
)
```

Lessons: [useRef](/group/react-tanstackquery-zustand/day/05/01-useref-mutable-values-without-re-renders) · [useLayoutEffect](/group/react-tanstackquery-zustand/day/05/04-uselayouteffect) · [useSyncExternalStore](/group/react-tanstackquery-zustand/day/05/06-usesyncexternalstore)

## React: performance and advanced hooks

| Tool | What it does | Reach for it when |
| --- | --- | --- |
| `React.memo(C)` | skip re-render if props are `===` | profiler shows a costly child |
| `useMemo(fn, deps)` | cache a computed value | expensive calc or stable object prop |
| `useCallback(fn, deps)` | cache a function reference | passing handlers to memo children |
| `useReducer` | `(state, action) => newState` | many related fields / transitions |
| Context + reducer | provide `state` and `dispatch` | low-frequency app-wide state |
| `useTransition` | mark a state update non-urgent | heavy list re-render after typing |
| `useDeferredValue` | lagging copy of a value | you do not own the setter |
| `useId` | stable SSR-safe IDs | `htmlFor` / `aria-describedby` |
| `useOptimistic` | show predicted state during async | likes, sends, toggles |
| `lazy` + `Suspense` | code-split a component | routes, heavy modals |
| Error boundary | catch render errors below it | class component or `react-error-boundary` |

```tsx
const [isPending, startTransition] = useTransition()
function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  setText(e.target.value)                        // urgent
  startTransition(() => setQuery(e.target.value)) // can lag
}
```

Measure first (React DevTools Profiler), optimize second. Error boundaries do not catch event-handler or async errors.

Lessons: [useMemo + useCallback](/group/react-tanstackquery-zustand/day/06/01-usememo-usecallback) · [useReducer](/group/react-tanstackquery-zustand/day/06/02-usereducer) · [Transitions](/group/react-tanstackquery-zustand/day/06/04-usedeferredvalue-usetransition-starttransition) · [Error boundaries](/group/react-tanstackquery-zustand/day/06/07-error-boundaries)

## TanStack Query: setup and useQuery

```tsx
const queryClient = new QueryClient({          // module level, once
  defaultOptions: { queries: { staleTime: 60_000 } },
})

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

```tsx
const { data, isPending, isError, error, isFetching } = useQuery({
  queryKey: ['post', postId],
  queryFn: async ({ signal }) => {
    const res = await fetch(`/api/posts/${postId}`, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)  // must throw
    return res.json() as Promise<Post>
  },
})
```

| Flag (v5) | True when | Render |
| --- | --- | --- |
| `isPending` | no data yet (`status === 'pending'`) | skeleton |
| `isLoading` | `isPending && isFetching` | first-load spinner |
| `isFetching` | any request in flight, incl. background | small refresh dot |
| `isError` | query failed after retries | error + `refetch()` |
| `isSuccess` | data available | content |
| `isPlaceholderData` | showing `placeholderData` | dim the list |

`fetch` does not reject on 4xx/5xx, so check `res.ok` and throw.

Lessons: [QueryClient](/group/react-tanstackquery-zustand/day/07/03-queryclient-queryclientprovider) · [useQuery core API](/group/react-tanstackquery-zustand/day/07/05-usequery-core-api) · [Loading/error/success](/group/react-tanstackquery-zustand/day/07/06-loading-error-success-states) · [Replacing fetch-in-effect](/group/react-tanstackquery-zustand/day/07/08-replacing-manual-fetch-in-effect-patterns)

## TanStack Query: keys and caching

| Concept | Default | Meaning |
| --- | --- | --- |
| `queryKey` | required array | cache identity; include every variable the fn uses |
| Key hashing | deterministic | object key order ignored: `{a,b}` equals `{b,a}` |
| `staleTime` | `0` | how long data counts as fresh (no refetch) |
| `gcTime` | 5 min | how long an unused entry stays in memory (v4 `cacheTime`) |
| `refetchOnMount` / `OnWindowFocus` / `OnReconnect` | `true` | fire only if stale |
| `retry` | 3 (queries), 0 (mutations) | exponential backoff |
| Structural sharing | on | unchanged parts keep the same reference |

Lifecycle: fetching, then fresh, then stale (after `staleTime`), then inactive (no observers), then garbage-collected (after `gcTime`).

Key factory pattern:

```ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (f: Filters) => [...todoKeys.lists(), f] as const,
  detail: (id: number) => [...todoKeys.all, 'detail', id] as const,
}
```

Lessons: [Query keys](/group/react-tanstackquery-zustand/day/08/01-query-keys-as-unique-serializable-arrays) · [Stale by default](/group/react-tanstackquery-zustand/day/08/04-stale-by-default-behavior) · [staleTime + gcTime](/group/react-tanstackquery-zustand/day/08/07-staletime-gctime) · [Cache lifecycle](/group/react-tanstackquery-zustand/day/08/09-cache-lifecycle)

## TanStack Query: query patterns

| Need | Option / API |
| --- | --- |
| Wait for another query | `enabled: !!user?.id` |
| N queries from an array | `useQueries({ queries: ids.map(id => ...) })` |
| Reshape data per component | `select: data => data.filter(...)` |
| Keep old page while new loads | `placeholderData: keepPreviousData` |
| Seed cache as real data | `initialData` (respects `staleTime`) |
| Temporary display only | `placeholderData` (never cached) |
| Warm cache on hover | `queryClient.prefetchQuery({ queryKey, queryFn })` |
| Many components, one request | automatic deduplication by key |

```ts
export function useUser(id?: number) {
  return useQuery({
    queryKey: userKeys.detail(id!),
    queryFn: ({ signal }) => getUser(id!, signal),
    enabled: id != null,
  })
}
```

Layering: API functions (fetch + throw), key factories, custom hooks. Components never write raw keys.

Lessons: [Dependent queries](/group/react-tanstackquery-zustand/day/09/01-dependent-queries) · [select](/group/react-tanstackquery-zustand/day/09/05-select-data-transformation) · [placeholderData vs initialData](/group/react-tanstackquery-zustand/day/09/06-placeholderdata-vs-initialdata) · [Query organization](/group/react-tanstackquery-zustand/day/09/09-maintainable-query-organization)

## TanStack Query: mutations

```tsx
const qc = useQueryClient()
const create = useMutation({
  mutationFn: (input: NewTodo) => api.createTodo(input),
  onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.lists() }),
})
create.mutate({ title })          // fire and forget; use isPending for UI
await create.mutateAsync(input)   // when you need to await (wrap in try)
```

| After a mutation | Use |
| --- | --- |
| Server response is the new value | `qc.setQueryData(key, data)` |
| Several queries may be affected | `qc.invalidateQueries({ queryKey: prefix })` |
| Want instant UI with rollback | optimistic update (below) |

```tsx
onMutate: async (vars) => {
  await qc.cancelQueries({ queryKey })
  const previous = qc.getQueryData<Todo[]>(queryKey)
  qc.setQueryData<Todo[]>(queryKey, old => apply(old, vars))
  return { previous }
},
onError: (_e, _v, ctx) => qc.setQueryData(queryKey, ctx?.previous),
onSettled: () => qc.invalidateQueries({ queryKey }),
```

Invalidation matches by prefix: `['todos']` hits every todo list and detail.

Lessons: [useMutation](/group/react-tanstackquery-zustand/day/10/01-usemutation-mutation-lifecycle) · [Invalidation](/group/react-tanstackquery-zustand/day/10/02-usequeryclient-invalidation-from-mutations) · [setQueryData](/group/react-tanstackquery-zustand/day/10/04-direct-cache-updates-with-setquerydata) · [Optimistic updates](/group/react-tanstackquery-zustand/day/10/05-optimistic-updates-rollback-mindset)

## TanStack Query: pagination and infinite lists

```tsx
const q = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam, signal }) => getFeed(pageParam, signal),
  initialPageParam: null as string | null,
  getNextPageParam: last => last.nextCursor ?? undefined,  // undefined = end
})
const items = q.data?.pages.flatMap(p => p.items) ?? []
// q.fetchNextPage(), q.hasNextPage, q.isFetchingNextPage
```

Paginated: put `page` in the key plus `placeholderData: keepPreviousData`. Pass `signal` to `fetch` so key changes and unmounts abort old requests.

Lessons: [AbortSignal](/group/react-tanstackquery-zustand/day/10/06-query-cancellation-with-abortsignal) · [Paginated queries](/group/react-tanstackquery-zustand/day/10/07-paginated-queries-placeholderdata-keeppreviousdata) · [useInfiniteQuery](/group/react-tanstackquery-zustand/day/10/08-useinfinitequery-fetchnextpage-getnextpageparam)

## Zustand: store basics

```ts
import { create } from 'zustand'

type CartStore = { items: Item[]; add: (i: Item) => void; clear: () => void }

export const useCartStore = create<CartStore>()(set => ({
  items: [],
  add: item => set(s => ({ items: [...s.items, item] })),
  clear: () => set({ items: [] }),
}))
```

| Concept | Syntax | Note |
| --- | --- | --- |
| No provider | import the hook anywhere | store lives at module level |
| Read one value | `useCartStore(s => s.items)` | re-renders only if it changes (`Object.is`) |
| Read an action | `useCartStore(s => s.add)` | actions are stable |
| Several values | `useStore(useShallow(s => ({ a: s.a, b: s.b })))` | `zustand/react/shallow` |
| Outside React | `useCartStore.getState()` / `.setState()` | in utils, tests, listeners |
| Subscribe | `const unsub = useCartStore.subscribe(fn)` | side effects without re-render |
| `set(partial)` | shallow merge of top-level keys | nested objects: spread yourself |
| `set(next, true)` | replace whole state | rarely needed |
| Async action | `async () => { set({ loading: true }); ... }` | no middleware needed |

Selecting with no selector (`useCartStore()`) subscribes to everything.

Lessons: [Why Zustand](/group/react-tanstackquery-zustand/day/11/01-why-zustand-no-provider-model) · [create + store shape](/group/react-tanstackquery-zustand/day/11/02-create-store-shape-state-actions) · [Selectors](/group/react-tanstackquery-zustand/day/11/03-selectors) · [Shallow merge](/group/react-tanstackquery-zustand/day/11/05-shallow-merge-behavior-immutable-flat-updates)

## Zustand: middleware and scaling

Middleware order used in the lessons (outermost first): `devtools(persist(immer(...)))`.

```ts
export const usePrefs = create<Prefs>()(
  devtools(
    persist(
      set => ({ theme: 'light', setTheme: t => set({ theme: t }) }),
      { name: 'prefs', version: 2, migrate: migratePrefs,
        partialize: s => ({ theme: s.theme }) },
    ),
    { name: 'PrefsStore' },
  ),
)
```

| Middleware / pattern | Key point |
| --- | --- |
| `immer` | mutate a draft for nested updates (`zustand/middleware/immer`) |
| `persist` | `name` = storage key; `createJSONStorage(() => sessionStorage)` |
| `partialize` | persist only what should survive a reload |
| `version` + `migrate` | transform old persisted shapes |
| SSR hydration | server has no `localStorage`; gate on a `_hasHydrated` flag or mount |
| `subscribeWithSelector` | `subscribe(selector, listener)` fires only on slice change |
| `devtools` | Redux DevTools; name actions: `set(fn, false, 'cart/add')` |
| Slices | `createAuthSlice(set, get)` merged into one store |
| Bounded stores | one `create()` per unrelated domain |
| Reset | keep an `INITIAL_STATE` constant; `reset: () => set(INITIAL_STATE)` |
| `Map` / `Set` | new instance per update (or Immer + `enableMapSet()`); convert to arrays for `persist` |

Lessons: [Slice pattern](/group/react-tanstackquery-zustand/day/12/01-slice-pattern-bounded-stores) · [persist](/group/react-tanstackquery-zustand/day/12/03-persist-middleware-storage-choices) · [Hydration + SSR](/group/react-tanstackquery-zustand/day/12/04-hydration-ssr-caveats) · [Reset patterns](/group/react-tanstackquery-zustand/day/12/08-reset-state-patterns)

## Gotchas

| ❌ Mistake | ✅ Fix |
| --- | --- |
| `onClick={handleClick()}` | `onClick={handleClick}` or `() => handleClick(id)` |
| `key={index}` on a reorderable list | `key={item.id}` |
| `{count && <Badge />}` shows `0` | `{count > 0 && <Badge />}` |
| `state.items.push(x); setItems(state.items)` | `setItems(xs => [...xs, x])` |
| Reading state right after `setX` | it is the old snapshot; use the new value directly |
| Storing derived values in state + syncing via effect | compute during render |
| Missing effect deps / stale closure | include every reactive value; use updater functions |
| Effect without cleanup (listener, interval) | return a cleanup function |
| `new QueryClient()` inside a component | create it once at module level |
| `queryFn` not throwing on `!res.ok` | `if (!res.ok) throw new Error(...)` |
| Variable used in `queryFn` but not in `queryKey` | put every input in the key |
| Copying query data into Zustand or `useState` | read it from `useQuery` / `select` |
| Optimistic update without `cancelQueries` | cancel first so a refetch does not overwrite it |
| `useStore(s => ({ a: s.a, b: s.b }))` re-renders always | wrap the selector in `useShallow` |
| `set({ user: { name } })` wipes nested fields | `set(s => ({ user: { ...s.user, name } }))` |

## Interview quick answers

**Q:** What triggers a re-render?
A state change, a parent re-rendering, or a consumed context changing. React then diffs and commits only what changed.

**Q:** Why does `setCount(count + 1)` twice only add one?
Both calls read the same render snapshot. Use `setCount(c => c + 1)` to queue updates.

**Q:** Why are array indexes bad keys?
When items reorder or are inserted, index keys attach state and DOM to the wrong item.

**Q:** When do you actually need `useEffect`?
To synchronize with something outside React: subscriptions, timers, DOM APIs, widgets. Not for derived data or user events.

**Q:** `useMemo` vs `useCallback`?
`useMemo` caches a value, `useCallback` caches a function. Both matter mainly for expensive work or memoized children.

**Q:** `useEffect` vs `useLayoutEffect`?
`useEffect` runs after paint; `useLayoutEffect` runs after DOM mutation but before paint, for measurement that must not flicker.

**Q:** Server state vs client state?
Server state is a borrowed snapshot that can go stale and is shared; client state is owned by the browser. They need different tools.

**Q:** `staleTime` vs `gcTime`?
`staleTime` decides when data is refetch-eligible; `gcTime` decides when an unused cache entry is deleted.

**Q:** `isPending` vs `isLoading` vs `isFetching` (v5)?
`isPending`: no data yet. `isLoading`: no data and fetching. `isFetching`: any request in flight, including background refetches.

**Q:** `placeholderData` vs `initialData`?
`initialData` is written to the cache as real data; `placeholderData` is shown temporarily and never cached.

**Q:** How do you do an optimistic update?
In `onMutate`: cancel queries, snapshot, write the guess, return the snapshot. In `onError`: restore. In `onSettled`: invalidate.

**Q:** Invalidate or `setQueryData`?
`setQueryData` when the response already contains the new value; invalidate when several queries may be affected or the server computes extra fields.

**Q:** Why Zustand over Context for shared state?
No provider, and components subscribe via selectors so they re-render only for the slice they read. Context re-renders every consumer.

**Q:** How do you stop a Zustand component re-rendering on unrelated changes?
Select the smallest value; for multiple values use `useShallow`; never call the hook with no selector.

**Q:** What goes wrong with `persist` and SSR?
The server renders defaults while the client reads storage, causing a hydration mismatch. Render persisted values only after hydration.
