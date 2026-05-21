# 7 — Rendering Data

---

## T — TL;DR

"Rendering data" means displaying JavaScript values in JSX — from props, local variables, or computed values. Arrays are rendered with `.map()`. Objects are never rendered directly (they aren't valid JSX). Dates and numbers need formatting before display.

---

## K — Key Concepts

```tsx
// ── Rendering primitives ──────────────────────────────────────────────────
interface User {
  id:        number
  name:      string
  email:     string
  joinedAt:  Date
  score:     number
  active:    boolean
}

function UserDetail({ user }: { user: User }) {
  return (
    <dl>
      {/* String renders as-is */}
      <dt>Name</dt>
      <dd>{user.name}</dd>

      {/* Number renders as string automatically */}
      <dt>ID</dt>
      <dd>{user.id}</dd>

      {/* Boolean: doesn't render — use ternary for display */}
      <dt>Status</dt>
      <dd>{user.active ? 'Active' : 'Inactive'}</dd>

      {/* Date: must format (Date renders as [object Object] without formatting) */}
      <dt>Joined</dt>
      <dd>{user.joinedAt.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })}</dd>

      {/* Number formatting */}
      <dt>Score</dt>
      <dd>{new Intl.NumberFormat('en-US').format(user.score)}</dd>
    </dl>
  )
}
```

```tsx
// ── Rendering arrays ──────────────────────────────────────────────────────
// Arrays of JSX are rendered inline — each item needs a key
interface Product {
  id:    number
  name:  string
  price: number
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="empty">No products found.</p>
  }

  return (
    <ul className="product-list">
      {products.map(product => (
        <li key={product.id} className="product-item">
          <span className="product-name">{product.name}</span>
          <span className="product-price">
            {new Intl.NumberFormat('en-US', {
              style: 'currency', currency: 'USD'
            }).format(product.price)}
          </span>
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// ── Objects cannot be rendered directly ──────────────────────────────────
interface Config {
  theme: string
  lang:  string
}
function Bad({ config }: { config: Config }) {
  return <div>{config}</div>   // ❌ Error: objects are not valid React children
}

function Good({ config }: { config: Config }) {
  return (
    <div>
      {/* Extract and render each property separately */}
      <p>Theme: {config.theme}</p>
      <p>Language: {config.lang}</p>

      {/* Or serialize for debugging */}
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  )
}
```

---

## W — Why It Matters

- `Date` objects rendering as `[object Object]` is a common beginner surprise — formatting with `toLocaleDateString` or `Intl.DateTimeFormat` is the correct approach, not string coercion.
- The empty state check (`if (products.length === 0) return <EmptyState />`) before the list render is one of the most important UI quality signals — production apps always handle empty states.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` are the correct formatting tools — they handle locale, currency symbols, and number formats without any library, built into the browser.

---

## I — Interview Q&A

### Q: Why can't you render a JavaScript object directly in JSX?

**A:** JSX renders values by converting them to strings. For primitives — numbers, strings, booleans (sort of) — the coercion is well-defined and useful. For objects, `String({})` produces `"[object Object]"` which is meaningless. React explicitly throws an error for objects as children rather than silently rendering this useless string, because rendering an object is almost always a bug — the developer meant to render a specific property or serialize the object. The fix is to always render specific properties (`obj.name`, `obj.id`) or serialize explicitly (`JSON.stringify(obj)`).

---

## C — Common Pitfalls + Fix

### ❌ Rendering a Date object without formatting

```tsx
interface Post {
  title:     string
  createdAt: Date
}

// ❌ Date object renders as [object Object]
function PostMeta({ post }: { post: Post }) {
  return <time>{post.createdAt}</time>   // TypeError in React ❌
}

// ✅ Format before rendering
function PostMeta({ post }: { post: Post }) {
  const formatted = post.createdAt.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
  const iso = post.createdAt.toISOString()   // for machine-readable datetime

  return (
    <time dateTime={iso} className="post-date">
      {formatted}
    </time>
  )
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `DataTable` component that renders an array of objects with dynamic columns. Handle empty state, format currency columns, and format date columns.

### Solution

```tsx
interface Column<T> {
  key:      keyof T
  header:   string
  type?:    'text' | 'currency' | 'date' | 'number'
}

interface DataTableProps<T extends { id: number | string }> {
  rows:    T[]
  columns: Column<T>[]
  emptyMessage?: string
}

function formatCell(value: unknown, type: Column<unknown>['type'] = 'text'): string {
  if (value == null) return '—'
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                     .format(Number(value))
    case 'date':
      return new Date(value as string | Date)
                .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value))
    default:
      return String(value)
  }
}

function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  emptyMessage = 'No data available.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="table-empty">{emptyMessage}</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {formatCell(row[col.key], col.type)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

---
