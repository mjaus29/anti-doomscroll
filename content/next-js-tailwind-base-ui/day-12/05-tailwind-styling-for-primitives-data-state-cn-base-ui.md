# 5 — Tailwind Styling for Primitives — `data-[state]`, `cn()`, Base UI

---

## T — TL;DR

Base UI components emit `data-state`, `data-highlighted`, `data-disabled`, `data-checked`, `data-selected`, `data-placeholder`, `data-open`, and `data-popup-open` attributes. Every visual state is driven by these attributes via Tailwind's `data-[]:` variants — no JavaScript-driven class toggling needed.

---

## K — Key Concepts

### Complete `data-*` Attribute Reference

```tsx
{/* ─── data-state: open/closed — floating components */}
<Popover.Popup  className="data-[state=open]:animate-in data-[state=closed]:animate-out">
<Dialog.Popup   className="data-[state=open]:opacity-100 data-[state=closed]:opacity-0">
<Menu.Popup     className="data-[state=closed]:hidden">

{/* ─── data-[starting-style] / data-[ending-style] — animation hooks */}
{/* Set initial state (before open animation starts) */}
{/* Set final state (after close animation ends) */}
<Popover.Popup className="
  transition-all duration-200
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">

{/* ─── data-highlighted: true — currently keyboard-focused item */}
<Menu.Item className="
  data-[highlighted]:bg-blue-50
  data-[highlighted]:text-blue-700
  dark:data-[highlighted]:bg-blue-900/20
  dark:data-[highlighted]:text-blue-300
  rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer
">

{/* ─── data-disabled: true — disabled item */}
<Menu.Item className="
  data-[disabled]:opacity-40
  data-[disabled]:cursor-not-allowed
  data-[disabled]:pointer-events-none
">

{/* ─── data-selected: true — selected option in Select */}
<Select.Option className="
  data-[selected]:font-semibold
  data-[selected]:text-blue-700
  data-[selected]:bg-blue-50
  dark:data-[selected]:bg-blue-900/20
">

{/* ─── data-checked: true — Switch, Checkbox */}
<Switch.Root className="
  bg-gray-300 data-[checked]:bg-blue-600
  transition-colors duration-200
">

{/* ─── data-placeholder — Select trigger shows placeholder */}
<Select.Trigger className="
  data-[placeholder]:text-gray-400
  dark:data-[placeholder]:text-gray-500
">

{/* ─── data-popup-open — trigger when popup is open */}
<Popover.Trigger className="
  data-[popup-open]:bg-blue-50
  data-[popup-open]:text-blue-600
">
```

### Reusable Style Constants for Base UI

```tsx
// src/lib/base-ui-styles.ts
// Shared Tailwind class strings for Base UI component styling

export const POPUP_BASE = [
  "bg-white dark:bg-gray-800",
  "border border-gray-200 dark:border-gray-700",
  "rounded-2xl shadow-xl z-50",
  "outline-none",
].join(" ");

export const POPUP_TRANSITION = [
  "transition-all duration-200 ease-out",
  "origin-[--transform-origin]",
  "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
  "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
].join(" ");

export const ITEM_BASE = [
  "flex items-center gap-2 w-full",
  "px-3 py-2 rounded-lg text-sm",
  "text-gray-700 dark:text-gray-300",
  "cursor-pointer select-none outline-none",
  "transition-colors duration-100",
].join(" ");

export const ITEM_HIGHLIGHTED = [
  "data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20",
  "data-[highlighted]:text-blue-700 dark:data-[highlighted]:text-blue-300",
].join(" ");

export const ITEM_DISABLED = [
  "data-[disabled]:opacity-40",
  "data-[disabled]:cursor-not-allowed",
  "data-[disabled]:pointer-events-none",
].join(" ");

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

export const TRIGGER_BASE = [
  "inline-flex items-center gap-2",
  "font-medium transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
].join(" ");
```

### The `cn()` Pattern with Base UI

```tsx
import { cn } from "@/lib/cn";
import {
  ITEM_BASE,
  ITEM_HIGHLIGHTED,
  ITEM_DISABLED,
} from "@/lib/base-ui-styles";
import * as Menu from "@base-ui/react/menu";

// ─── Compose with cn() — base + shared constants + one-off overrides
function MenuItem({
  children,
  className,
  disabled,
  icon,
  ...props
}: Menu.Item.Props & { icon?: React.ReactNode }) {
  return (
    <Menu.Item
      disabled={disabled}
      className={cn(
        ITEM_BASE, // layout + spacing + text
        ITEM_HIGHLIGHTED, // hover/keyboard highlight state
        ITEM_DISABLED, // disabled state
        className // consumer override
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-base">{icon}</span>}
      {children}
    </Menu.Item>
  );
}
```

---

## W — Why It Matters

- Every Base UI state change is expressed via `data-*` attributes — this is a deliberate API decision that decouples the library's state machine from your styling layer. You never need to import state hooks from Base UI to drive visual changes — the DOM attributes are the styling API.
- Shared style constants (`ITEM_BASE`, `POPUP_TRANSITION`) prevent the "class string soup" problem — Base UI component classes are long. Extracting shared patterns into named constants makes individual component files readable and keeps the design system consistent across all floating components.
- `data-[starting-style]` and `data-[ending-style]` are Base UI v1.4's CSS-based animation hooks — they set CSS on the element at the start of an open animation and at the end of a close animation, enabling pure CSS transitions without JavaScript animation libraries.

---

## I — Interview Q&A

### Q1: How does Base UI communicate state to your Tailwind styles, and why is this better than JavaScript class toggling?

**A:** Base UI sets `data-*` attributes on rendered elements whenever state changes — `data-state="open"` when a popover opens, `data-highlighted` on the currently focused menu item, `data-checked` when a switch is on. Tailwind's `data-[state=open]:` and `data-[highlighted]:` variants respond to these attributes purely in CSS. This is better than JavaScript class toggling (`setIsHighlighted(true)`) because it avoids React re-renders on every hover/focus event, produces more predictable behaviour (CSS transitions are synchronised with the browser's render cycle), is serialisable as HTML for SSR, and is testable via `getByRole` + attribute assertions without needing to inspect React state.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `data-[state=open]:` for close animation — popup disappears instantly

```tsx
{/* ❌ When closed, data-state="closed" — the data-[state=open]: class is removed */}
{/* The popup immediately loses all open styles — no exit animation */}
<Popover.Popup className="
  data-[state=open]:opacity-100 data-[state=open]:scale-100
  opacity-0 scale-95
  transition-all duration-200
">
{/* When closing: data-state switches from open→closed BEFORE transition ends */}
{/* opacity-0 scale-95 applies instantly — transition doesn't run ❌ */}
```

**Fix:** Use `data-[starting-style]` for entry and `data-[ending-style]` for exit:

```tsx
{/* ✅ Base UI applies starting/ending styles at correct animation moments */}
<Popover.Popup className="
  transition-all duration-200 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">
{/* Entry: starts at opacity-0 scale-95, transitions to default (opacity-1 scale-100) */}
{/* Exit:  starts at default, transitions to opacity-0 scale-95 */}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a styled `<HighlightableItem>` that demonstrates ALL Base UI data attributes in one component — `data-[highlighted]`, `data-[disabled]`, `data-[selected]` — with correct Tailwind responses. Prove that the entire visual state machine lives in `className` with zero JavaScript.

### Solution

```tsx
// src/components/ui/highlightable-item.tsx
import * as Select from "@base-ui/react/select";
import { cn } from "@/lib/cn";

interface HighlightableItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function HighlightableItem({
  value,
  children,
  disabled,
  icon,
}: HighlightableItemProps) {
  return (
    <Select.Option
      value={value}
      disabled={disabled}
      className={cn(
        // ─── Layout (always applied)
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl",
        "text-sm cursor-pointer select-none outline-none",
        "transition-colors duration-100",

        // ─── Default state
        "text-gray-700 dark:text-gray-300",

        // ─── data-[highlighted]: keyboard/mouse hover
        "data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20",
        "data-[highlighted]:text-blue-700 dark:data-[highlighted]:text-blue-300",

        // ─── data-[selected]: currently selected value
        "data-[selected]:font-semibold",
        "data-[selected]:text-blue-700 dark:data-[selected]:text-blue-300",

        // ─── data-[highlighted] + data-[selected] together
        "data-[highlighted]:data-[selected]:bg-blue-100",
        "dark:data-[highlighted]:data-[selected]:bg-blue-900/30",

        // ─── data-[disabled]: disabled state — NO JS needed
        "data-[disabled]:opacity-40",
        "data-[disabled]:cursor-not-allowed",
        "data-[disabled]:pointer-events-none"
      )}
    >
      {/* Icon */}
      {icon && (
        <span
          className="shrink-0 text-base
                           text-gray-400 dark:text-gray-500
                           data-[highlighted]:text-blue-500
                           group-data-[selected]:text-blue-600"
        >
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="flex-1 min-w-0 truncate">{children}</span>

      {/* Selected checkmark — shown via data-[selected] */}
      <span
        className="shrink-0 text-blue-600 dark:text-blue-400
                        opacity-0 data-[selected]:opacity-100
                        transition-opacity text-xs"
      >
        ✓
      </span>
    </Select.Option>
  );
}
```

---

---
