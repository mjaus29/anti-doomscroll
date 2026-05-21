# 6 — Sharing State Between Components

---

## T — TL;DR

Sharing state means **one component owns it, others consume it via props**. Direct prop-passing works for 2–3 levels. When state needs to reach deeply nested components, **prop drilling** becomes painful — that's the signal to consider Context (Day 4) or a state manager (Zustand, Day 4+).

---

## K — Key Concepts

```tsx
// ── Direct sharing: parent → children via props ───────────────────────────
interface Theme { primary: string; background: string }

function App() {
  const [theme, setTheme] = useState<Theme>({ primary: '#0066cc', background: '#fff' })

  return (
    <Layout theme={theme}>
      <Header theme={theme} />
      <Main theme={theme} onThemeChange={setTheme} />
    </Layout>
  )
}
// Works fine for 1–2 levels ✅
```

```tsx
// ── Prop drilling — when it gets painful ────────────────────────────────────
// State lives in App → passed to Page → passed to Section → passed to Widget
// Widget is the only one that USES it — all intermediate components just forward it

// ❌ Pain point: 3+ levels of prop passing for state used by one deep component
function App() {
  const [user, setUser] = useState<User | null>(null)
  return <Page user={user} onLogout={() => setUser(null)} />
}
function Page({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return <Section user={user} onLogout={onLogout} />  // just forwarding ❌
}
function Section({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return <UserMenu user={user} onLogout={onLogout} />  // just forwarding ❌
}
function UserMenu({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  // Only this component actually uses these props
  return user ? <button onClick={onLogout}>{user.name}</button> : null
}
```

```tsx
// ── Signals that suggest Context instead ─────────────────────────────────
// - Props passed through 3+ levels where intermediate components don't use them
// - Many unrelated components at different levels need the same data
// - Auth user, theme, locale, feature flags
// Examples: user session, color theme, language preference
// → Context + useContext is covered in Day 4

// ── Component composition as an alternative to deep drilling ─────────────
// Instead of drilling user through Layout → Header → UserBadge:
// Pass the already-rendered UserBadge as a prop (children/slot pattern)
function App() {
  const [user, setUser] = useState<User | null>(null)
  return (
    <Layout
      headerSlot={user ? <UserBadge user={user} /> : <LoginButton />}  // ✅ no drilling
    >
      <MainContent />
    </Layout>
  )
}
function Layout({ children, headerSlot }: { children: React.ReactNode; headerSlot: React.ReactNode }) {
  return (
    <div>
      <header>{headerSlot}</header>    {/* Layout doesn't know about User ✅ */}
      <main>{children}</main>
    </div>
  )
}
```

---

## W — Why It Matters

- Understanding when prop drilling becomes a problem (3+ levels, intermediate components that don't use the prop) tells you exactly when to reach for Context or a state manager.
- The component composition / slot pattern is an underused alternative to Context for UI structure — `Layout` receiving `headerSlot` as a prop is often cleaner than drilling the user through Layout → Header → UserBadge.
- "Sharing" vs "lifting" — lifting is about moving state up to coordinate siblings; sharing is about passing that state down to the consumers who need it.

---

## I — Interview Q&A

### Q: What is prop drilling and when does it become a problem?

**A:** Prop drilling is passing data through intermediate components that don't use it themselves — just forwarding props to deeper children. It becomes a problem when: the chain is 3+ levels deep, many unrelated components at different depths need the same data, or adding a new prop requires modifying multiple intermediate components. Solutions in order of complexity: (1) **Component composition** — pass pre-composed elements as `children` or named slot props, so intermediate components never see the data. (2) **Context** — broadcast state to any depth without prop chains. (3) **External state manager** (Zustand) — state lives outside the tree, any component subscribes directly.

---

## C — Common Pitfalls + Fix

### ❌ Drilling a callback 4 levels deep when composition solves it

```tsx
// ❌ onAddToCart drills through Catalog → Category → ProductCard
function Catalog({ onAddToCart }: { onAddToCart: (id: number) => void }) {
  return <Category onAddToCart={onAddToCart} />      // just forwarding ❌
}
function Category({ onAddToCart }: { onAddToCart: (id: number) => void }) {
  return products.map(p => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />)
}

// ✅ Lift the pre-wired button up — Catalog renders it without knowing the handler
function App() {
  const [cart, setCart] = useState<number[]>([])
  return (
    <Catalog
      renderProduct={product => (
        <ProductCard
          product={product}
          onAddToCart={() => setCart(prev => [...prev, product.id])}  // wired here ✅
        />
      )}
    />
  )
}
function Catalog({ renderProduct }: { renderProduct: (p: Product) => React.ReactNode }) {
  return <div>{products.map(p => renderProduct(p))}</div>  // no cart knowledge ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Refactor a three-level prop drilling chain using the slot/children composition pattern.

### Solution

```tsx
interface User { name: string; avatar: string }

// ❌ Before: user drills through AppShell → Topbar → UserControls
function AppShellBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div>
      <TopbarBad user={user} onLogout={onLogout} />
      <main>Content</main>
    </div>
  )
}
function TopbarBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <header><UserControlsBad user={user} onLogout={onLogout} /></header>
}
function UserControlsBad({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <button onClick={onLogout}>{user.name}</button>
}

// ✅ After: composition — AppShell and Topbar know nothing about User
function UserControls({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <button onClick={onLogout}>{user.name}</button>
}

function Topbar({ endSlot }: { endSlot: React.ReactNode }) {
  return <header><nav>My App</nav>{endSlot}</header>  // no user knowledge ✅
}

function AppShell({ topbarEnd, children }: { topbarEnd: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Topbar endSlot={topbarEnd} />   // no user knowledge ✅
      <main>{children}</main>
    </div>
  )
}

// Owner of state wires everything at the top
function App() {
  const [user, setUser] = useState<User>({ name: 'Mark', avatar: '/avatar.jpg' })

  return (
    <AppShell
      topbarEnd={<UserControls user={user} onLogout={() => setUser(null!)} />}  // ✅
    >
      <p>Main content</p>
    </AppShell>
  )
}
```

---

---
