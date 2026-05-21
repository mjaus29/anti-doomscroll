# 3 — Accessibility-First Composition — ARIA, Focus, Keyboard Nav

---

## T — TL;DR

Base UI automatically manages the accessibility layer — ARIA roles, `aria-expanded`, `aria-labelledby`, focus trapping, and keyboard patterns. Your job: provide visible focus indicators, sufficient color contrast, correct `id` linkages for labels, and never remove the accessibility attributes Base UI sets.

---

## K — Key Concepts

### ARIA Attributes Base UI Manages Automatically

```tsx
{
  /* ─── Base UI auto-manages these — you MUST NOT remove them */
}

// Popover.Trigger gets:
//   aria-haspopup="dialog"
//   aria-expanded="true/false"
//   aria-controls="{popup-id}"

// Dialog.Popup gets:
//   role="dialog"
//   aria-modal="true"
//   aria-labelledby="{title-id}"   (when Dialog.Title is present)
//   aria-describedby="{desc-id}"   (when Dialog.Description is present)

// Menu.Item gets:
//   role="menuitem"
//   aria-disabled="true/false"

// Select.Option gets:
//   role="option"
//   aria-selected="true/false"

// Tabs.Tab gets:
//   role="tab"
//   aria-selected="true/false"
//   aria-controls="{panel-id}"
```

### Keyboard Patterns by Component

```
Base UI implements these keyboard patterns automatically:

Popover / Dialog:
  Enter / Space  → Open trigger
  Escape         → Close popup
  Tab / Shift+Tab → Navigate within popup (focus trap in Dialog)

Menu:
  Enter / Space  → Open trigger, activate item
  Arrow Down/Up  → Navigate items
  Home / End     → First / last item
  Escape         → Close menu
  Type a letter  → Jump to item starting with that letter

Select:
  Enter / Space  → Open, select item
  Arrow Down/Up  → Navigate options
  Home / End     → First / last option
  Escape         → Close without selecting
  Type letters   → Type-ahead search

Tabs:
  Arrow Left/Right → Navigate tabs (horizontal)
  Arrow Up/Down    → Navigate tabs (vertical, if orientation="vertical")
  Home / End       → First / last tab

Tooltip:
  Focus (Tab)    → Show tooltip
  Blur (Shift+Tab) → Hide tooltip
  Escape         → Hide tooltip
```

### Visible Focus Indicators — Your Responsibility

```tsx
{/* ─── Base UI does NOT add focus styles — YOU must */}
{/* focus-visible: is the correct variant — keyboard only */}

{/* ─── Standard focus ring pattern for ALL interactive Base UI components */}
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'

{/* Applied to every interactive element */}
<Popover.Trigger className={cn('px-4 py-2 rounded-xl', FOCUS_RING)}>
<Menu.Item       className={cn('px-3 py-2 rounded-lg',  FOCUS_RING)}>
<Tabs.Tab        className={cn('px-4 py-2 rounded-xl',  FOCUS_RING)}>
<Select.Trigger  className={cn('px-3 py-2 rounded-xl',  FOCUS_RING)}>
```

### Labelling — `id` and `aria-label`

```tsx
{
  /* ─── Rule: every interactive component needs a label */
}

{
  /* Option 1: visible text label (preferred) */
}
<Dialog.Title className="text-lg font-semibold text-gray-900">
  Confirm deletion
  {/* Base UI auto-wires Dialog.Title id to Dialog.Popup aria-labelledby */}
</Dialog.Title>;

{
  /* Option 2: aria-label for icon-only triggers */
}
<Popover.Trigger aria-label="Open user settings" className="...">
  ⚙️
</Popover.Trigger>;

{
  /* Option 3: aria-labelledby — point to an existing label */
}
<Select.Root aria-labelledby="country-label">
  <label id="country-label">Country</label>
  <Select.Trigger>...</Select.Trigger>
</Select.Root>;

{
  /* ─── Dialog.Description — auto-wired to aria-describedby */
}
<Dialog.Description className="text-sm text-gray-600">
  This action cannot be undone. All data will be permanently deleted.
</Dialog.Description>;
```

### Color Contrast — Your Responsibility

```tsx
{/* ─── Base UI does not enforce color contrast — you must */}

{/* WCAG AA requirements: */}
{/* Normal text (< 18pt): 4.5:1 contrast ratio */}
{/* Large text (≥ 18pt or 14pt bold): 3:1 contrast ratio */}
{/* UI components (borders, icons): 3:1 contrast ratio */}

{/* ─── Tailwind color pairs that meet WCAG AA */}
{/* ✅ text-white on bg-blue-600    — 4.5:1 ✅ */}
{/* ✅ text-gray-900 on bg-white    — 16:1  ✅ */}
{/* ✅ text-gray-700 on bg-gray-50  — 7:1   ✅ */}
{/* ⚠️  text-gray-400 on bg-white   — 2.7:1 ❌ (too low for small text) */}
{/* ✅ text-gray-500 on bg-white    — 4.6:1 ✅ (borderline) */}

{/* ─── Muted text — use gray-600 minimum on white backgrounds */}
<p className="text-gray-600">  {/* NOT text-gray-400 for body text */}
```

---

## W — Why It Matters

- WCAG 2.1 accessibility compliance is increasingly a legal requirement — many countries mandate it for public websites. Base UI handles the complex ARIA patterns that are easy to get wrong, but color contrast, focus visibility, and correct labelling remain your responsibility.
- `focus-visible:` (keyboard-only focus ring) vs `focus:` is the difference between a product that looks professional (no distracting focus rings on mouse click) and one that is keyboard accessible (clear indicators for keyboard users). Base UI triggers focus correctly — you just need to style it.
- The `Dialog` component's focus trap is non-trivial to implement correctly — it must prevent Tab from leaving the dialog, handle dynamically added focusable elements, restore focus to the trigger when closed, and work correctly with nested modals. Base UI handles all of this automatically.

---

## I — Interview Q&A

### Q1: What accessibility behaviours does @base-ui/react provide automatically, and what remains your responsibility?

**A:** Base UI automatically manages: ARIA roles (`role="dialog"`, `role="menu"`, `role="option"`), ARIA states (`aria-expanded`, `aria-checked`, `aria-selected`, `aria-disabled`), ARIA relationships (`aria-labelledby`, `aria-describedby`, `aria-controls`), keyboard navigation patterns (arrow keys, Escape, Home/End, typeahead), focus trapping in dialogs, focus restoration when components close, and portal rendering for correct z-index stacking. Your responsibilities are: visible focus indicators (focus-visible ring styles), sufficient color contrast for text and UI elements (WCAG 4.5:1 for normal text), correct `id` linkages for external labels, meaningful accessible names for icon-only buttons (`aria-label`), and semantic HTML structure around the Base UI components.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `outline-none` without providing an alternative focus indicator

```tsx
{
  /* ❌ Removes focus ring entirely — keyboard users can't see focus */
}
<Menu.Item className="px-3 py-2 rounded-lg outline-none">
  Delete item
</Menu.Item>;
```

**Fix:** Use `focus-visible:` ring:

```tsx
{
  /* ✅ Ring visible for keyboard, invisible for mouse */
}
<Menu.Item
  className="px-3 py-2 rounded-lg
                       focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-blue-500
                       focus-visible:ring-inset"
>
  Delete item
</Menu.Item>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build an accessible `<IconButton>` wrapper that:

1. Uses the `render` prop to render Base UI's `Popover.Trigger` as a custom element
2. Has `aria-label` required as a prop (TypeScript error without it)
3. Has a visible `focus-visible:ring-2` focus indicator
4. Shows a tooltip (via `title` attribute) as a fallback for non-JS environments
5. Demonstrates `data-[popup-open]:` styling when the popover is open

### Solution

```tsx
// src/components/ui/icon-button.tsx
import * as Popover from '@base-ui/react/popover'
import { cn }       from '@/lib/cn'

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string  // Required — TypeScript enforces it
  icon:          React.ReactNode
  className?:    string
}

export function IconButton({
  'aria-label': ariaLabel,
  icon,
  className,
  title,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      title={title ?? ariaLabel}  // Fallback tooltip
      className={cn(
        'relative inline-flex items-center justify-center',
        'size-9 rounded-xl text-gray-500 dark:text-gray-400',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'hover:text-gray-900 dark:hover:text-white',
        'transition-all duration-150',
        // Focus ring — keyboard only
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        // State when popover is open (Base UI sets data-popup-open)
        'data-[popup-open]:bg-blue-50 dark:data-[popup-open]:bg-blue-900/20',
        'data-[popup-open]:text-blue-600 dark:data-[popup-open]:text-blue-400',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  )
}

// Usage: as a standalone button
<IconButton aria-label="Delete item" icon="🗑️" onClick={handleDelete} />

// Usage: as a Popover trigger via render prop
<Popover.Trigger render={<IconButton aria-label="User settings" icon="⚙️" />} />
```

---

---
