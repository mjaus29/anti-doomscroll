# 2 — Breaking UI into Components

---

## T — TL;DR

A component should do **one thing** — if it grows, break it into smaller components. Use the **single responsibility principle** as your guide. A good component boundary is one that isolates a concept, reuses a pattern, or matches a natural unit in the design.

---

## K — Key Concepts

```tsx
// ── When to extract a component ──────────────────────────────────────────
// 1. You're repeating the same JSX pattern more than once
// 2. A piece of UI has enough complexity to deserve a name
// 3. A section can be independently reasoned about
// 4. A piece would need its own state later

// ❌ Before: everything in one component — hard to read and reuse
function UserProfile() {
  return (
    <div className="profile">
      <div className="avatar">
        <img src="/avatar.png" alt="user avatar" />
        <span className="status online" />
      </div>
      <div className="info">
        <h2 className="name">Mark Austria</h2>
        <p className="bio">Full-stack developer</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">142</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-value">3.4k</span>
          <span className="stat-label">Followers</span>
        </div>
      </div>
    </div>
  )
}
```

```tsx
// ✅ After: extracted components — each with a clear responsibility
interface AvatarProps {
  src: string
  alt: string
  online?: boolean
}
function Avatar({ src, alt, online = false }: AvatarProps) {
  return (
    <div className="avatar">
      <img src={src} alt={alt} />
      {online && <span className="status online" />}
    </div>
  )
}

interface StatProps {
  value: string | number
  label: string
}
function Stat({ value, label }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

interface UserInfo {
  name: string
  bio: string
  avatarSrc: string
  posts: number
  followers: number
  online: boolean
}
function UserProfile({ user }: { user: UserInfo }) {
  return (
    <div className="profile">
      <Avatar src={user.avatarSrc} alt={`${user.name} avatar`} online={user.online} />
      <div className="info">
        <h2 className="name">{user.name}</h2>
        <p className="bio">{user.bio}</p>
      </div>
      <div className="stats">
        <Stat value={user.posts}     label="Posts"     />
        <Stat value={user.followers} label="Followers" />
      </div>
    </div>
  )
}
```

```tsx
// ── Single responsibility in practice ────────────────────────────────────
// Each component answers: "what is this responsible for?"
// Avatar    → renders a user's avatar with optional online status
// Stat      → renders one statistic (value + label pair)
// UserProfile → composes Avatar + bio + stats into a profile layout

// Components as vocabulary: when your code reads like
// <Avatar /> <Stat /> <UserProfile /> — the JSX itself is documentation
```

---

## W — Why It Matters

- Small, well-named components are the difference between a codebase you can navigate in 30 seconds and one you need 30 minutes to understand — the component name is the first line of documentation.
- Components that do one thing are easier to test — `Stat` takes `value` and `label` and renders them. One test. Zero setup. Compare to testing a 200-line monolith component.
- Reuse emerges from good decomposition — `Avatar` extracted today is used in `UserProfile`, `CommentHeader`, and `NotificationItem` tomorrow. Extraction is not premature abstraction when there's a clear concept.

---

## I — Interview Q&A

### Q: How do you decide when to extract a new component?

**A:** Three main signals: (1) **Repetition** — the same JSX block appears more than once, suggesting a reusable component with props. (2) **Complexity** — a section of JSX is large enough that it needs scrolling to understand, or has its own internal logic. Giving it a name makes the parent cleaner. (3) **Independent concerns** — a piece of UI has a clear responsibility that can be stated in one sentence (Avatar renders a user's profile picture with online status). The single responsibility principle applies: if you can't name a component without using "and", consider splitting it. Don't over-extract though — if it's only used once and adding a component adds indirection without clarity, keep it inline.

---

## C — Common Pitfalls + Fix

### ❌ Component names that don't communicate intent

```tsx
// ❌ Generic names — what does this render? What are its rules?
function Box({ children }: { children: React.ReactNode }) { ... }
function Item({ data }: { data: any }) { ... }
function Thing() { ... }

// ✅ Names that describe what the component IS, not what it does
function Card({ children }: { children: React.ReactNode }) { ... }
function ProductListItem({ product }: { product: Product }) { ... }
function EmptyStateMessage({ message }: { message: string }) { ... }

// Component name = contract with the reader
// ProductListItem tells you: this is one item, it's in a list, it shows a product
```

---

## K — Coding Challenge + Solution

### Challenge

Break this 30-line JSX block into well-named components with typed props. A notification card with: icon, title, message, timestamp, and a dismiss button.

### Solution

```tsx
// Extracted components

interface NotificationIconProps {
  type: 'info' | 'success' | 'warning' | 'error'
}
function NotificationIcon({ type }: NotificationIconProps) {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' } as const
  return <span className={`icon icon-${type}`}>{icons[type]}</span>
}

interface DismissButtonProps {
  onDismiss: () => void
}
function DismissButton({ onDismiss }: DismissButtonProps) {
  return (
    <button
      onClick={onDismiss}
      aria-label="Dismiss notification"
      className="dismiss-btn"
    >
      ✕
    </button>
  )
}

interface NotificationCardProps {
  type:      'info' | 'success' | 'warning' | 'error'
  title:     string
  message:   string
  timestamp: string
  onDismiss: () => void
}
function NotificationCard({ type, title, message, timestamp, onDismiss }: NotificationCardProps) {
  return (
    <div className={`notification notification-${type}`} role="alert">
      <NotificationIcon type={type} />
      <div className="notification-body">
        <strong className="notification-title">{title}</strong>
        <p className="notification-message">{message}</p>
        <time className="notification-time">{timestamp}</time>
      </div>
      <DismissButton onDismiss={onDismiss} />
    </div>
  )
}
```

---

---
