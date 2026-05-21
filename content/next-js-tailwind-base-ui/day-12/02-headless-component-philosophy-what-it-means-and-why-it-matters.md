# 2 — Headless Component Philosophy — What It Means and Why It Matters

---

## T — TL;DR

**Headless UI** separates behaviour (state, accessibility, keyboard nav) from appearance (CSS). You get the hard parts for free — ARIA roles, focus management, keyboard patterns — and retain full visual control. Every Base UI component is a behaviour container waiting for your Tailwind classes.

---

## K — Key Concepts

### The Three Layers of a UI Component

```
Every interactive component has three concerns:

Layer 1 — BEHAVIOUR
  - Open/close state management
  - Controlled vs uncontrolled mode
  - Keyboard navigation (arrow keys, Escape, Enter, Space)
  - Focus management (trap focus, restore on close)
  - ARIA attributes (role, aria-expanded, aria-haspopup, etc.)
  - Positioning (Floating UI for popovers, menus, tooltips)

Layer 2 — ACCESSIBILITY
  - Correct semantic HTML structure
  - Screen reader announcements (aria-live, role="dialog")
  - Focus indicators visible at all times
  - Touch and pointer device support

Layer 3 — APPEARANCE
  - Colors, borders, shadows
  - Typography, spacing
  - Animations and transitions
  - Dark mode variants

Headless = Layer 1 + 2 delivered, Layer 3 is yours
```

### What Base UI Gives You vs What You Own

```tsx
{
  /* ─── What @base-ui/react provides automatically */
}

// Dialog: manages open state, traps focus, restores focus on close,
//         adds aria-modal, aria-labelledby, aria-describedby,
//         handles Escape key, prevents body scroll

// Menu: manages open/close, arrow key navigation between items,
//       home/end keys, typeahead search, aria-menu + aria-menuitem roles,
//       submenu support, disabled item handling

// Select: manages selected value, controlled/uncontrolled,
//         keyboard navigation, aria-listbox + aria-option roles,
//         type-ahead filtering, multi-select support

// Popover: manages open/close, Floating UI positioning,
//          arrow key navigation, Escape key, click outside dismiss,
//          aria-expanded on trigger

// Tooltip: manages show/hide on hover/focus,
//          configurable delay, aria-describedby wiring,
//          mobile touch support

{
  /* ─── What YOU provide */
}
<Dialog.Overlay
  className={cn(
    // ALL of this is your responsibility — Base UI renders a <div>
    // with the correct aria-hidden attribute — you style it
    "fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
    "data-[open]:animate-in data-[open]:fade-in",
    "data-[closed]:animate-out data-[closed]:fade-out",
    "duration-200"
  )}
/>;
```

### Controlled vs Uncontrolled Mode

```tsx
{/* ─── Uncontrolled: Base UI manages state internally */}
<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Popup>
      <Dialog.Close>Close</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>

{/* ─── Controlled: YOU manage state, Base UI follows */}
'use client'
const [open, setOpen] = useState(false)

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger onClick={() => setOpen(true)}>Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Popup>
      <Dialog.Close onClick={() => setOpen(false)}>Close</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>

{/* ─── Default open: uncontrolled but starts open */}
<Dialog.Root defaultOpen>
```

### The `render` Prop — Rendering as a Different Element

```tsx
{
  /* ─── Base UI renders specific HTML elements by default */
}
{
  /* But you can override with render prop */
}

{
  /* Default: Trigger renders as <button> */
}
<Popover.Trigger className="...">Click me</Popover.Trigger>;

{
  /* Override: render as your custom Button component */
}
<Popover.Trigger render={<Button variant="secondary" size="sm" />}>
  Click me
</Popover.Trigger>;

{
  /* Override: render as an anchor */
}
<Tooltip.Trigger render={<a href="/help" />}>
  Help link (tooltip on hover)
</Tooltip.Trigger>;

{
  /* Override: render as a div (for non-interactive triggers) */
}
<Popover.Trigger render={<div role="button" tabIndex={0} />}>
  Custom trigger
</Popover.Trigger>;
```

---

## W — Why It Matters

- Accessibility is the hardest part of interactive components — a Dialog alone requires: focus trapping, Escape key handling, `aria-modal`, `aria-labelledby`, `aria-describedby`, focus restoration on close, body scroll prevention, and screen reader announcements. Base UI implements all of this correctly and cross-browser. Getting it wrong is a legal and UX liability.
- The separation of behaviour and appearance is not just aesthetic — it means you can completely redesign your app's visual style (new design system, rebrand, dark mode overhaul) without touching any component logic. The behaviour layer is stable; the appearance layer changes freely.
- `data-state` as the styling API is the key integration point — every time Base UI changes state (open/closed, checked/unchecked, highlighted/disabled), it updates `data-state` on the DOM element. Your Tailwind `data-[state=open]:` variants respond automatically. No `useState` required for visual state.

---

## I — Interview Q&A

### Q1: What is the difference between a headless component library and an unstyled component library?

**A:** The terms are often used interchangeably but have a subtle distinction. "Unstyled" means no CSS is provided — the components render HTML elements without visual styling. "Headless" goes further — it means the component provides only logic, state, and accessibility behaviour, completely decoupled from any rendering concerns. All headless components are unstyled, but not all unstyled components are headless. `@base-ui/react` is headless — it manages open/close state, keyboard navigation, ARIA attributes, focus trapping, and Floating UI positioning, while rendering plain HTML elements you style freely. This is different from, say, an unstyled HTML `<button>` which has no state management logic at all.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Adding `onClick` to manually toggle state when Base UI already manages it

```tsx
{/* ❌ Base UI manages open state — don't fight it with manual toggles */}
const [open, setOpen] = useState(false)

<Popover.Root open={open}>
  <Popover.Trigger onClick={() => setOpen(!open)}>  {/* ← fighting Base UI */}
    Open
  </Popover.Trigger>
```

**Fix:** Use uncontrolled (let Base UI handle it) or use `onOpenChange`:

```tsx
{/* ✅ Uncontrolled — Base UI handles everything */}
<Popover.Root>
  <Popover.Trigger>Open</Popover.Trigger>

{/* ✅ Controlled — use onOpenChange, not manual onClick toggle */}
<Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger>Open</Popover.Trigger>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<FeatureFlag>` toggle using `@base-ui/react/switch` — demonstrate controlled mode, `data-[checked]:` styling, and the behaviour vs appearance separation. The switch must be fully keyboard accessible with no extra code from you.

### Solution

```tsx
// src/components/feature-flag.tsx
"use client";

import { useState } from "react";
import * as Switch from "@base-ui/react/switch";
import { cn } from "@/lib/cn";

interface FeatureFlagProps {
  label: string;
  description?: string;
  defaultEnabled?: boolean;
  onChange?: (enabled: boolean) => void;
}

export function FeatureFlag({
  label,
  description,
  defaultEnabled = false,
  onChange,
}: FeatureFlagProps) {
  const [checked, setChecked] = useState(defaultEnabled);

  function handleChange(value: boolean) {
    setChecked(value);
    onChange?.(value);
  }

  return (
    <div
      className="flex items-center justify-between gap-4 p-4
                     bg-white dark:bg-gray-800 rounded-xl border
                     border-gray-200 dark:border-gray-700"
    >
      {/* Label + description */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Switch — Base UI provides: keyboard toggle (Space/Enter),
          aria-checked, role="switch", focus management
          YOU provide: all visual styling */}
      <Switch.Root
        checked={checked}
        onCheckedChange={handleChange}
        className={cn(
          // Layout + size
          "relative shrink-0 w-11 h-6 rounded-full",
          // Transitions
          "transition-colors duration-200 ease-in-out",
          // Focus ring (keyboard a11y — Base UI adds :focus-visible)
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "cursor-pointer",
          // State-driven colors via data-[checked]:
          "bg-gray-300 dark:bg-gray-600",
          "data-[checked]:bg-blue-600 dark:data-[checked]:bg-blue-500"
        )}
      >
        <Switch.Thumb
          className={cn(
            // The sliding circle
            "block size-5 rounded-full bg-white shadow-sm",
            "absolute top-0.5 left-0.5",
            "transition-transform duration-200 ease-in-out",
            // Slide right when checked — Base UI sets data-checked
            "translate-x-0 data-[checked]:translate-x-5"
          )}
        />
      </Switch.Root>
    </div>
  );
}
```

---

---
