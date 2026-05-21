# 6 — Composition + Lazy Loading + Suspense

---

## T — TL;DR

**Composition** builds complex UI from small, focused components. **Lazy loading** (`React.lazy`) defers loading a component's bundle until it's needed. **Suspense** shows a fallback while the component loads. Together they enable fast initial load and clean code splitting.

---

## K — Key Concepts

```tsx
// ── Composition patterns ──────────────────────────────────────────────────
// 1. children — nest content
function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return <div className="card"><h3>{title}</h3>{children}</div>
}

// 2. Render props — pass rendering logic as a prop
function DataProvider<T>({
  data, renderItem
}: { data: T[]; renderItem: (item: T, i: number) => React.ReactNode }) {
  return <>{data.map((item, i) => renderItem(item, i))}</>
}

// 3. Compound components — shared implicit state
const Tabs = {
  Root: function TabsRoot({ children, defaultTab }: {
    children: React.ReactNode; defaultTab: string
  }) {
    const [active, setActive] = useState(defaultTab)
    return (
      <TabsContext.Provider value={{ active, setActive }}>
        <div className="tabs">{children}</div>
      </TabsContext.Provider>
    )
  },
  Tab: function Tab({ value, children }: { value: string; children: React.ReactNode }) {
    const { active, setActive } = useContext(TabsContext)!
    return (
      <button aria-selected={active === value} onClick={() => setActive(value)}>
        {children}
      </button>
    )
  },
  Panel: function Panel({ value, children }: { value: string; children: React.ReactNode }) {
    const { active } = useContext(TabsContext)!
    return active === value ? <div>{children}</div> : null
  },
}
// Usage: <Tabs.Root defaultTab="a"><Tabs.Tab value="a">A</Tabs.Tab><Tabs.Panel value="a">…</Tabs.Panel></Tabs.Root>
```

```tsx
import { lazy, Suspense } from 'react'

// ── React.lazy: code-split at component level ─────────────────────────────
// Bundle is loaded only when the component is first rendered
const HeavyChart   = lazy(() => import('./HeavyChart'))
const AdminPanel   = lazy(() => import('./AdminPanel'))
const SettingsPage = lazy(() => import('./SettingsPage'))

// ── Suspense: show fallback while lazy component loads ────────────────────
function App() {
  const [showChart, setShowChart]   = useState(false)
  const [isAdmin,   setIsAdmin]     = useState(false)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>

      {/* Chart bundle downloads only on first show ✅ */}
      <Suspense fallback={<div>Loading chart…</div>}>
        {showChart && <HeavyChart />}
      </Suspense>

      {/* Admin panel bundle downloads only if isAdmin ✅ */}
      <Suspense fallback={<Spinner />}>
        {isAdmin && <AdminPanel />}
      </Suspense>
    </div>
  )
}
```

```tsx
// ── Route-based code splitting (common in Next.js / React Router) ─────────
// pages/DashboardPage is only loaded when the user navigates there
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage   = lazy(() => import('./pages/ProfilePage'))

function Router({ route }: { route: string }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {route === '/dashboard' && <DashboardPage />}
      {route === '/profile'   && <ProfilePage />}
    </Suspense>
  )
}

// ── Suspense boundaries: granular vs top-level ────────────────────────────
// ❌ One top-level boundary hides ALL content while ANY part loads
// ✅ Nest boundaries so each section shows its own fallback
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart />          {/* own boundary — others stay visible ✅ */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <TransactionTable />
      </Suspense>
    </div>
  )
}
```

---

## W — Why It Matters

- Code splitting with `React.lazy` + `Suspense` is the easiest way to improve initial page load — a heavy chart library (400KB) not loaded until the user clicks "Show Chart" means a faster first paint.
- Granular Suspense boundaries produce better UX than one top-level boundary — users see content progressively as each part loads instead of waiting for everything.
- Compound components (`Tabs.Root` + `Tabs.Tab` + `Tabs.Panel`) share implicit state through context without the consumer needing to manage it — the cleanest API for multi-part UI patterns.

---

## I — Interview Q&A

### Q: What is `React.lazy` and how does `Suspense` work with it?

**A:** `React.lazy` lets you define a component with a dynamic import. React defers loading the component's JavaScript bundle until the component first renders. When the lazy component is about to render and its bundle hasn't loaded yet, React looks up the tree for the nearest `<Suspense>` boundary and renders its `fallback` prop instead. Once the bundle loads, React re-renders with the actual component. This is code splitting at the component level — the browser only downloads the code when needed. For route-based apps, each route can be a lazy component so users only download the code for pages they visit.

---

## C — Common Pitfalls + Fix

### ❌ Defining lazy components inside other components

```tsx
// ❌ New lazy() call every render — re-downloads the bundle every render
function ParentBad() {
  const LazyChild = lazy(() => import('./Child'))   // ❌ inside render
  return <Suspense fallback={null}><LazyChild /></Suspense>
}

// ✅ Always define lazy components at module level
const LazyChild = lazy(() => import('./Child'))   // ✅ defined once

function ParentGood() {
  return <Suspense fallback={<p>Loading…</p>}><LazyChild /></Suspense>
}

// ❌ No Suspense boundary — React throws an unhandled promise error
function NoSuspense() {
  return <LazyChild />  // ❌ will crash without a Suspense ancestor
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a settings page with three tabs: Profile, Notifications, Security. Each tab panel is a `lazy()` component wrapped in its own Suspense boundary. Switching tabs loads the panel on demand.

### Solution

```tsx
const ProfilePanel      = lazy(() => import('./ProfilePanel'))
const NotificationsPanel = lazy(() => import('./NotificationsPanel'))
const SecurityPanel     = lazy(() => import('./SecurityPanel'))

type SettingsTab = 'profile' | 'notifications' | 'security'

const TAB_COMPONENTS: Record<SettingsTab, React.LazyExoticComponent<() => JSX.Element>> = {
  profile:       ProfilePanel,
  notifications: NotificationsPanel,
  security:      SecurityPanel,
}

function SkeletonPanel() {
  return (
    <div className="skeleton-panel">
      {[1,2,3].map(i => <div key={i} className="skeleton-line" />)}
    </div>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [isPending, startT]       = useTransition()
  const ActivePanel = TAB_COMPONENTS[activeTab]

  return (
    <div className="settings">
      <nav>
        {(Object.keys(TAB_COMPONENTS) as SettingsTab[]).map(tab => (
          <button
            key={tab}
            aria-selected={activeTab === tab}
            onClick={() => startT(() => setActiveTab(tab))}   // non-urgent ✅
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <Suspense fallback={<SkeletonPanel />}>
        <ActivePanel />   {/* loaded on demand, each tab has its own boundary ✅ */}
      </Suspense>
    </div>
  )
}
```

---

---
