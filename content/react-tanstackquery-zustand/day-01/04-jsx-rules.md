# 4 — JSX Rules

---

## T — TL;DR

JSX is syntactic sugar over `React.createElement()` — it compiles to JavaScript. **Rules:** Return one root element (or Fragment). Close all tags. Use `className` not `class`. Use `camelCase` for attributes. Expressions go in `{}`. These rules exist because JSX is JavaScript, not HTML.

---

## K — Key Concepts

```tsx
// ── JSX compiles to JavaScript ────────────────────────────────────────────
// JSX:
const el = <h1 className="title">Hello</h1>

// Compiles to:
const el = React.createElement('h1', { className: 'title' }, 'Hello')

// This is why JSX must follow JS syntax rules — it IS JavaScript
```

```tsx
// ── Rule 1: Return one root element ──────────────────────────────────────
// ❌ Two root elements — compile error
function Bad() {
  return (
    <h1>Title</h1>
    <p>Paragraph</p>
  )
}

// ✅ Option A: Wrap in a div
function GoodDiv() {
  return (
    <div>
      <h1>Title</h1>
      <p>Paragraph</p>
    </div>
  )
}

// ✅ Option B: Fragment — renders no DOM element
function GoodFragment() {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph</p>
    </>
  )
}

// ✅ Option C: explicit Fragment (needed when you need a key prop)
import { Fragment } from 'react'
function GoodExplicit() {
  return (
    <Fragment>
      <h1>Title</h1>
      <p>Paragraph</p>
    </Fragment>
  )
}
```

```tsx
// ── Rule 2: Close all tags ─────────────────────────────────────────────────
// ❌ Self-closing tags must be explicit
function Bad() {
  return <input>   // compile error in JSX
}
// ✅
function Good() {
  return <input />   // self-closing ✅
}
// All HTML void elements: input, br, hr, img, link, meta → must self-close in JSX

// ── Rule 3: camelCase attributes ──────────────────────────────────────────
// HTML attribute → JSX attribute
// class         → className
// for           → htmlFor   (label element)
// tabindex      → tabIndex
// onclick       → onClick
// onchange      → onChange
// readonly      → readOnly
// maxlength     → maxLength
// stroke-width  → strokeWidth  (SVG)
// colspan       → colSpan      (table)
```

```tsx
// ── Rule 4: JSX attribute values ─────────────────────────────────────────
// String: use quotes
<button type="button">Click</button>

// Expression (non-string): use curly braces
<input
  type="text"
  value={inputValue}          // variable
  maxLength={100}             // number — not a string
  disabled={isLoading}        // boolean
  onChange={handleChange}     // function reference
  style={{ color: 'red' }}   // object — double braces (outer = JSX, inner = object)
/>

// ── Rule 5: Multiline JSX — wrap in parentheses ───────────────────────────
// Without parens: automatic semicolon insertion can break it
function Component() {
  return (        // ← opening paren
    <div>
      <p>safe</p>
    </div>
  )               // ← closing paren
}
```

---

## W — Why It Matters

- JSX rules aren't arbitrary — they exist because JSX compiles to JavaScript. `class` is a reserved word in JS, so React uses `className`. Understanding the compilation makes the rules memorable.
- Fragment (`<>...</>`) is the correct fix for "one root element" when you don't want a wrapper div — adding unnecessary `<div>` wrappers pollutes the DOM and breaks CSS layouts (especially flexbox/grid children).
- The double-brace `style={{ color: 'red' }}` confuses newcomers — knowing the outer `{}` is "JSX expression" and the inner `{}` is "JavaScript object literal" makes it obvious, not magical.

---

## I — Interview Q&A

### Q: Why does JSX use `className` instead of `class`?

**A:** JSX compiles to JavaScript — `<div class="foo">` becomes `React.createElement('div', { class: 'foo' })`. But `class` is a reserved keyword in JavaScript (it defines a class). Using `class` as a property name in an object literal is technically allowed in modern JS but caused issues in older compilers and is semantically confusing. React standardized on `className` to match the DOM property name (`element.className`), avoid the reserved word ambiguity, and be consistent with the DOM API developers already know. Similarly, `for` (used in HTML `<label for="">`) became `htmlFor` because `for` is also a reserved word (used in `for` loops).

---

## C — Common Pitfalls + Fix

### ❌ `style` receiving a string instead of an object

```tsx
// ❌ HTML style is a string — JSX style must be an object
<div style="color: red; font-size: 16px">Text</div>
// Type error: style expects CSSProperties object, not string

// ✅ JSX style is always an object with camelCase properties
<div style={{ color: 'red', fontSize: '16px' }}>Text</div>

// ✅ Extract to a variable for readability
const textStyle: React.CSSProperties = {
  color:    'red',
  fontSize: '16px',
  fontWeight: 700,
}
<div style={textStyle}>Text</div>
```

---

## K — Coding Challenge + Solution

### Challenge

Fix all JSX errors in this snippet: wrong attribute names, unclosed tags, missing root element, string style.

```tsx
function BrokenForm() {
  return (
    <form class="login-form">
      <label for="email">Email</label>
      <input type="email" id="email" readonly maxlength="100">
      <br>
      <button type="submit" style="background: blue; color: white">
        Submit
      </button>
    </form>
    <p>Don't have an account? <a href="/signup">Sign up</a></p>
  )
}
```

### Solution

```tsx
function FixedForm() {
  return (
    // ✅ Wrapped in Fragment — two root elements → one root
    <>
      <form className="login-form">  {/* class → className */}
        <label htmlFor="email">Email</label>  {/* for → htmlFor */}
        <input
          type="email"
          id="email"
          readOnly                        {/* readonly → readOnly */}
          maxLength={100}                 {/* maxlength → maxLength, number not string */}
        />                               {/* self-closing */}
        <br />                           {/* self-closing */}
        <button
          type="submit"
          style={{ background: 'blue', color: 'white' }}   {/* string → object */}
        >
          Submit
        </button>
      </form>
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </>
  )
}
```

---

---
