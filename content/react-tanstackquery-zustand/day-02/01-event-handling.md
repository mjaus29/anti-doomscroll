# 1 — Event Handling

---

## T — TL;DR

React events are **synthetic wrappers** around native browser events — same properties, same names, but camelCased (`onClick`, `onChange`). You pass a **function reference** as a prop — not a call. React calls it when the event fires.

---

## K — Key Concepts

```tsx
// ── Pass a reference, never a call ───────────────────────────────────────
// ❌ Calling the function immediately (runs on every render)
<button onClick={handleClick()}>Click</button>

// ✅ Passing the reference (React calls it on click)
<button onClick={handleClick}>Click</button>

// ✅ Inline arrow function — when you need to pass arguments
<button onClick={() => handleDelete(item.id)}>Delete</button>
```

```tsx
// ── Event handler anatomy ────────────────────────────────────────────────
function Form() {
  // Named handler — preferred for readability
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()               // stop default form submission
    console.log('submitted')
  }

  // Arrow function handler — equivalent
  const handleReset = () => {
    console.log('reset')
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="reset" onClick={handleReset}>Reset</button>
      <button type="submit">Submit</button>
    </form>
  )
}
```

```tsx
// ── Common event types ────────────────────────────────────────────────────
// Mouse events
onClick:       React.MouseEvent<HTMLButtonElement>
onDoubleClick: React.MouseEvent<HTMLDivElement>
onMouseEnter:  React.MouseEvent<HTMLDivElement>
onMouseLeave:  React.MouseEvent<HTMLDivElement>

// Form events
onChange:      React.ChangeEvent<HTMLInputElement>
onSubmit:      React.FormEvent<HTMLFormElement>
onFocus:       React.FocusEvent<HTMLInputElement>
onBlur:        React.FocusEvent<HTMLInputElement>

// Keyboard events
onKeyDown:     React.KeyboardEvent<HTMLInputElement>
onKeyUp:       React.KeyboardEvent<HTMLInputElement>

// Accessing event properties
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value   = e.target.value        // typed value
  const name    = e.target.name         // input name attribute
  const checked = e.target.checked      // for checkboxes
  const files   = e.target.files        // for file inputs
}

function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') { /* submit */ }
  if (e.key === 'Escape') { /* cancel */ }
  if (e.ctrlKey && e.key === 's') { /* save shortcut */ }
}
```

```tsx
// ── Event propagation ────────────────────────────────────────────────────
// React events bubble up the tree — same as native events

function Card({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} className="card">
      <button
        onClick={e => {
          e.stopPropagation()   // prevent click from bubbling to card ✅
          console.log('button clicked — card onClick NOT fired')
        }}
      >
        Inner button
      </button>
    </div>
  )
}
```

---

## W — Why It Matters

- The "reference vs call" distinction (`onClick={fn}` vs `onClick={fn()}`) is the first gotcha every React developer hits — the call version runs the function immediately on render, not on click.
- TypeScript's event types (`React.ChangeEvent<HTMLInputElement>`) give you autocomplete on `e.target.value` and catch mistakes like accessing `.value` on a `<select>` vs `<input>`.
- `e.preventDefault()` is required for form submit, link navigation, and drag-drop — without it, the browser's default behaviour fires in addition to your handler.

---

## I — Interview Q&A

### Q: What is the difference between `onClick={handleClick}` and `onClick={handleClick()}`?

**A:** `onClick={handleClick}` passes a function **reference** — React stores it and calls it when the user clicks. `onClick={handleClick()}` **calls** the function immediately during render and passes its return value (likely `undefined`) as the onClick prop. The first is correct, the second runs the function on every render and registers nothing for the click. The inline arrow pattern `onClick={() => handleDelete(id)}` creates a new function reference on each render that, when called, invokes `handleDelete(id)` — this is the correct way to pass arguments to a handler.

---

## C — Common Pitfalls + Fix

### ❌ Forgetting `e.preventDefault()` on form submit

```tsx
// ❌ Page refreshes on submit — browser default behaviour
function SearchForm() {
  function handleSubmit() {
    console.log('search!')   // runs, then page reloads ❌
  }
  return <form onSubmit={handleSubmit}><button type="submit">Search</button></form>
}

// ✅ Prevent default — stop browser navigation
function SearchForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()       // stops reload ✅
    console.log('search!')
  }
  return <form onSubmit={handleSubmit}><button type="submit">Search</button></form>
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build an `InteractiveCard` that: logs a click on the card, has an inner "Like" button that stops propagation and tracks its own click count (as a console.log for now), and a link that prevents default navigation.

### Solution

```tsx
function InteractiveCard({ title, href }: { title: string; href: string }) {
  function handleCardClick() {
    console.log('card clicked')
  }

  function handleLikeClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()   // card onClick won't fire ✅
    console.log('liked!')
  }

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()    // no navigation ✅
    console.log('link clicked — no navigation')
  }

  return (
    <div onClick={handleCardClick} className="card">
      <h3>{title}</h3>
      <a href={href} onClick={handleLinkClick}>
        Read more
      </a>
      <button onClick={handleLikeClick}>👍 Like</button>
    </div>
  )
}
```

---

---
