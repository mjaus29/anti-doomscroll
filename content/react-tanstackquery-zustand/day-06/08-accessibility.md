# 8 — Accessibility

---

## T — TL;DR

Accessible React means: semantic HTML, correct ARIA attributes, keyboard navigation, focus management, and live region announcements. These aren't extras — they're requirements for production code and are tested in technical interviews.

---

## K — Key Concepts

```tsx
// ── Semantic HTML first ───────────────────────────────────────────────────
// ❌ div soup
<div onClick={handleClick} className="button">Submit</div>

// ✅ Native semantics — keyboard, focus, ARIA free
<button type="submit">Submit</button>
<nav><ul><li><a href="/about">About</a></li></ul></nav>
<main><article><h1>Title</h1></article></main>
```

```tsx
// ── ARIA: label, describe, live regions ──────────────────────────────────
// Accessible name for interactive elements
<button aria-label="Close dialog">✕</button>
<input aria-label="Search products" type="search" />
<input id="email" aria-describedby="email-hint" type="email" />
<p id="email-hint">We'll never share your email</p>

// State communication
<button aria-expanded={isOpen} aria-controls="menu">Menu</button>
<ul id="menu" hidden={!isOpen}>…</ul>

<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
</div>

// Live regions: announce async changes to screen readers
<p aria-live="polite" aria-atomic="true">
  {message}   {/* screen reader announces when message changes ✅ */}
</p>
<p role="status">{statusMessage}</p>
<p role="alert">{errorMessage}</p>   {/* urgent — interrupts screen reader */}
```

```tsx
// ── Focus management ───────────────────────────────────────────────────────
// Trap focus inside modal
function Modal({ isOpen, onClose, children }: ModalProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) firstFocusRef.current?.focus()   // move focus into modal ✅
  }, [isOpen])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null
  return (
    <div role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
      <button ref={firstFocusRef} onClick={onClose} aria-label="Close">✕</button>
      {children}
    </div>
  )
}

// ── Keyboard navigation ───────────────────────────────────────────────────
function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li role="menuitem">
      <button
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClick()   // redundant but clear
          if (e.key === 'ArrowDown') focusNext()
          if (e.key === 'ArrowUp')   focusPrev()
        }}
      >
        {label}
      </button>
    </li>
  )
}
```

---

## W — Why It Matters

- Accessibility bugs are legal liability in many jurisdictions (ADA, WCAG). An inaccessible product is a defect, not a nice-to-have improvement.
- Screen reader users, keyboard-only users, and users with motor impairments all rely on these patterns — they represent 15–20% of users globally.
- Interviews at FAANG and top startups include a11y questions specifically — "make this button accessible" or "how would you manage focus in a modal?" are common.

---

## I — Interview Q&A

### Q: How do you manage focus when a modal opens and closes?

**A:** Three steps: (1) **On open** — move focus to the first interactive element inside the modal (or the modal container itself with `tabIndex={-1}`). This informs screen reader users they're in the modal. (2) **Trap focus** — prevent Tab/Shift+Tab from leaving the modal while it's open. Query all focusable elements inside and cycle through them. (3) **On close** — return focus to the element that triggered the modal (usually a button). Store a `ref` to the trigger before opening. Not returning focus leaves keyboard users disoriented — they have to tab from the top of the page to find their place. The `Escape` key should always close the modal per ARIA Dialog pattern.

---

## C — Common Pitfalls + Fix

### ❌ Clickable divs instead of buttons — breaks keyboard access

```tsx
// ❌ div with onClick — not focusable, no keyboard event, no semantics
<div onClick={handleDelete} className="delete-btn">Delete</div>
// Tab doesn't reach it, Enter doesn't activate it, screen readers don't announce it

// ❌ Missing label on icon button
<button onClick={onClose}>✕</button>  // screen reader says "button X" — not helpful

// ✅ Native button + aria-label
<button onClick={handleDelete} className="delete-btn">Delete</button>

// ✅ Icon button with accessible name
<button onClick={onClose} aria-label="Close dialog" type="button">
  <CloseIcon aria-hidden="true" />   {/* hide icon from screen reader — label covers it */}
</button>

// ✅ If you MUST use a div (third-party constraint):
<div
  role="button"
  tabIndex={0}
  onClick={handleDelete}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleDelete()}
>
  Delete
</div>
```

---

## K — Coding Challenge + Solution

### Challenge

Make this `Dropdown` component fully accessible: keyboard navigation, ARIA attributes, focus management, and `Escape` to close.

### Solution

```tsx
interface Option { value: string; label: string }

function AccessibleDropdown({
  options, value, onChange, label
}: {
  options: Option[]; value: string; onChange: (v: string) => void; label: string
}) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId  = useId()

  const selectedLabel = options.find(o => o.value === value)?.label ?? label

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) setIsOpen(true)
        setFocusedIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter': case ' ':
        e.preventDefault()
        if (isOpen) { onChange(options[focusedIndex].value); setIsOpen(false) }
        else setIsOpen(true)
        break
      case 'Escape':
        setIsOpen(false)
        triggerRef.current?.focus()   // return focus to trigger ✅
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="dropdown" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => setIsOpen(o => !o)}
        type="button"
      >
        {selectedLabel} ▾
      </button>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listboxId}-${focusedIndex}`}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={opt.value === value}
              data-focused={i === focusedIndex}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

---
