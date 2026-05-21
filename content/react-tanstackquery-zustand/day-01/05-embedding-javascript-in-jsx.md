# 5 — Embedding JavaScript in JSX

---

## T — TL;DR

Curly braces `{}` in JSX are an escape hatch into JavaScript. You can embed any **expression** (a value-producing piece of code) — variables, function calls, arithmetic, ternaries. You cannot embed **statements** (`if`, `for`, `while`). The JSX `{}` evaluates the expression and renders the result.

---

## K — Key Concepts

```tsx
// ── Expressions you can embed ─────────────────────────────────────────────
const name = 'Mark'
const price = 19.99
const items = ['Apple', 'Banana', 'Cherry']
const isActive = true

function getLabel() { return 'Click me' }

function Demo() {
  return (
    <div>
      {/* String variable */}
      <p>{name}</p>

      {/* Arithmetic */}
      <p>Price: ${(price * 1.12).toFixed(2)}</p>

      {/* Function call */}
      <button>{getLabel()}</button>

      {/* Template literal */}
      <p>{`Hello, ${name}! Welcome back.`}</p>

      {/* Ternary */}
      <span>{isActive ? 'Active' : 'Inactive'}</span>

      {/* Logical AND (render or nothing) */}
      {isActive && <span className="badge">Active</span>}

      {/* Nullish coalescing */}
      <p>{name ?? 'Anonymous'}</p>

      {/* Array expression */}
      <p>Items: {items.length}</p>
    </div>
  )
}
```

```tsx
// ── What you CANNOT embed directly ───────────────────────────────────────
function Bad() {
  return (
    <div>
      {/* ❌ if statement — statement, not expression */}
      {if (isActive) { return <p>Active</p> }}

      {/* ❌ for loop — statement, not expression */}
      {for (const item of items) { <li>{item}</li> }}

      {/* ❌ Objects render as "[object Object]" — not useful */}
      {/* { user } where user = { name: 'Mark' } → error */}
    </div>
  )
}

// ✅ Convert to expressions:
function Good() {
  return (
    <div>
      {/* ternary instead of if */}
      {isActive ? <p>Active</p> : null}

      {/* array.map instead of for */}
      {items.map(item => <li key={item}>{item}</li>)}
    </div>
  )
}
```

```tsx
// ── JSX is an expression too ──────────────────────────────────────────────
// JSX elements are values — store them in variables, pass them around
const header = <h1>Hello</h1>
const icon = <svg>...</svg>

function Page({ title }: { title: string }) {
  const pageTitle = <title>{title}</title>   // JSX as a variable
  const content = title
    ? <main><h1>{title}</h1></main>
    : <main><p>No title</p></main>
  return (
    <>
      {pageTitle}
      {content}
    </>
  )
}
```

---

## W — Why It Matters

- The "expressions only, no statements" rule explains why React uses `array.map()` for lists and ternary/`&&` for conditionals — these are all expressions. Once you internalize this, JSX pattern-matching becomes second nature.
- JSX being "just JavaScript" means you can assign JSX to variables, pass it as arguments, return it from functions, store it in arrays — enabling patterns like renderProps, children-as-props, and component composition.
- The `&&` shorthand (`{count > 0 && <Badge>{count}</Badge>}`) is idiomatic React — but it has a gotcha (see pitfalls). Knowing the pitfall is what separates a beginner from an intermediate developer.

---

## I — Interview Q&A

### Q: Why can't you use `if` statements inside JSX curly braces?

**A:** JSX curly braces `{}` evaluate a JavaScript **expression** — a piece of code that produces a value. `if` is a **statement** — it controls flow but doesn't produce a value. JavaScript's grammar doesn't allow statements where expressions are expected, and JSX compiles to function call arguments (`React.createElement('div', null, expression)`) which require expressions. The fix is to use the ternary operator (`condition ? a : b`), which is an expression, or logical AND (`condition && jsx`). If the logic is complex, extract it into a variable or helper function before the return statement where statements are allowed.

---

## C — Common Pitfalls + Fix

### ❌ `{count && <Badge>}` renders `0` when count is 0

```tsx
// ❌ Falsy value 0 is rendered as the string "0" in JSX
function Cart({ count }: { count: number }) {
  return (
    <div>
      {count && <Badge>{count}</Badge>}
      {/* When count = 0: renders "0" as text node — not nothing! */}
    </div>
  )
}

// ✅ Use boolean coercion or ternary
function Cart({ count }: { count: number }) {
  return (
    <div>
      {/* Option 1: explicit boolean */}
      {count > 0 && <Badge>{count}</Badge>}

      {/* Option 2: ternary */}
      {count > 0 ? <Badge>{count}</Badge> : null}

      {/* Option 3: Boolean() coercion */}
      {Boolean(count) && <Badge>{count}</Badge>}
    </div>
  )
}

// Rule: use `> 0` or `!= null` check before &&, not just the value itself
// This bites everyone exactly once — and then they never forget
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `PricingCard` component that embeds: a formatted price (with discount if provided), a feature list from an array, and a "Most Popular" badge only for certain tiers.

### Solution

```tsx
interface PricingCardProps {
  name:        string
  price:       number
  discount?:   number
  features:    string[]
  popular?:    boolean
  currency?:   string
}

function PricingCard({
  name,
  price,
  discount,
  features,
  popular = false,
  currency = 'USD',
}: PricingCardProps) {
  const finalPrice    = discount ? price * (1 - discount / 100) : price
  const formatter     = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  const formattedPrice = formatter.format(finalPrice)

  return (
    <div className={`pricing-card ${popular ? 'pricing-card--popular' : ''}`}>
      {/* Badge — only rendered when popular is true */}
      {popular && (
        <span className="badge badge--popular">Most Popular</span>
      )}

      <h2 className="plan-name">{name}</h2>

      {/* Price with optional strikethrough original */}
      <div className="price-block">
        {discount != null && (
          <span className="price-original">
            {formatter.format(price)}
          </span>
        )}
        <span className="price-final">{formattedPrice}</span>
        {discount != null && (
          <span className="discount-badge">{discount}% off</span>
        )}
      </div>

      {/* Features from array */}
      <ul className="features">
        {features.map(feature => (
          <li key={feature} className="feature-item">
            ✓ {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

---
