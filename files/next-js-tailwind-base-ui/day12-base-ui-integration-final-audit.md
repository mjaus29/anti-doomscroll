# 📅 Day 12 — Base UI Integration and Final Audit (@base-ui/react v1.4.1)

> **Goal:** Build a complete, accessible component library using `@base-ui/react` styled with Tailwind CSS v4.3. Master every major primitive, understand the headless pattern, and complete the Group 4 curriculum audit.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack versions:** @base-ui/react v1.4.1 · Tailwind CSS v4.3 · React 19 · Next.js 16

---

## 📋 Day 12 Subtopic Overview

| #   | Subtopic                                                          | Time   |
| --- | ----------------------------------------------------------------- | ------ |
| 1   | Installing @base-ui/react — Setup, Peer Deps, CSS Strategy        | 10 min |
| 2   | Headless Component Philosophy — What It Means and Why It Matters  | 10 min |
| 3   | Accessibility-First Composition — ARIA, Focus, Keyboard Nav       | 12 min |
| 4   | Anatomy-Based Assembly — Root, Trigger, Portal, Positioner, Popup | 12 min |
| 5   | Tailwind Styling for Primitives — `data-[state]`, `cn()`, Base UI | 12 min |
| 6   | Popover — Full Implementation with Tailwind                       | 12 min |
| 7   | Dialog — Modal with Overlay, Focus Trap, Accessible Anatomy       | 12 min |
| 8   | Menu — Dropdown with Items, Groups, Separator                     | 12 min |
| 9   | Select — Controlled and Uncontrolled Dropdown Select              | 12 min |
| 10  | Tabs — Tab List, Panels, Keyboard Navigation                      | 10 min |
| 11  | Tooltip — Hover/Focus Tooltip with Delay and Positioning          | 10 min |
| 12  | Toast / Notifications — Toast Pattern with Base UI Primitives     | 12 min |
| 13  | Transitions — CSS Open/Close Animations with `data-[state]`       | 12 min |
| 14  | Final Audit — Group 4 Complete; Optional Extensions Overview      | 10 min |

---

---

# 1 — Installing @base-ui/react — Setup, Peer Deps, CSS Strategy

---

## T — TL;DR

`@base-ui/react` is a zero-style headless component library from the MUI team. It provides fully accessible, unstyled React primitives — you supply 100% of the styling via Tailwind. Install it with its peer dependencies and import it with no global CSS required.

---

## K — Key Concepts

### Installation

```bash
# Install @base-ui/react (no CSS required — fully headless)
npm install @base-ui/react

# Peer dependencies (React 19 already in your stack)
# @base-ui/react requires React 18+ and React DOM 18+
# With React 19 you're fully covered

# Verify install
npm list @base-ui/react
# Should show: @base-ui/react@1.4.1
```

### What @base-ui/react Does and Doesn't Include

```
INCLUDES:
  ✅ Accessible ARIA attributes (auto-managed)
  ✅ Keyboard navigation (arrow keys, Escape, Tab, Enter)
  ✅ Focus management (focus trap in dialogs, focus restoration)
  ✅ Floating UI positioning (Popover, Menu, Select, Tooltip)
  ✅ Open/close state management (controlled + uncontrolled)
  ✅ data-state attributes ("open", "closed", "checked", etc.)
  ✅ Portal rendering (outside DOM tree)
  ✅ Composable anatomy (Root/Trigger/Content/etc.)

DOES NOT INCLUDE:
  ❌ Any CSS or styles — 100% unstyled
  ❌ Icons — you provide them
  ❌ Animations — you implement via CSS/Tailwind
  ❌ Theme tokens — you use @theme {} in Tailwind
  ❌ Global stylesheet to import — no CSS file to add
```

### Project Integration — Next.js App Router

```tsx
// src/app/layout.tsx
// No special provider needed for most @base-ui components
// Just import and use — components are self-contained

import "./globals.css"; // Your Tailwind CSS

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[--color-bg] text-[--color-text] font-sans
                        antialiased"
      >
        {children}
      </body>
    </html>
  );
}
```

```tsx
// Example: using a Base UI component directly in a page
// No provider, no setup, no CSS import — just import and use

import * as Popover from "@base-ui/react/popover";

export default function Page() {
  return (
    <Popover.Root>
      <Popover.Trigger>Open</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup>Content</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

### Import Patterns

```tsx
// ─── Namespace import (recommended — clear which component set)
import * as Popover from "@base-ui/react/popover";
import * as Dialog from "@base-ui/react/dialog";
import * as Menu from "@base-ui/react/menu";
import * as Select from "@base-ui/react/select";
import * as Tabs from "@base-ui/react/tabs";
import * as Tooltip from "@base-ui/react/tooltip";
import * as Toast from "@base-ui/react/toast";
import * as Switch from "@base-ui/react/switch";
import * as Checkbox from "@base-ui/react/checkbox";
import * as Slider from "@base-ui/react/slider";
import * as Progress from "@base-ui/react/progress";

// ─── Named import (alternative — for tree-shaking explicit control)
import {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
} from "@base-ui/react/popover";

// ─── Usage with namespace (preferred in this curriculum)
<Popover.Root>
  <Popover.Trigger>Click me</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner>
      <Popover.Popup>Popover content</Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>;
```

### File Structure for Base UI Components

```
src/
  components/
    ui/
      popover.tsx        ← Wrapped Popover with Tailwind styles
      dialog.tsx         ← Wrapped Dialog with Tailwind styles
      menu.tsx           ← Wrapped Menu with Tailwind styles
      select.tsx         ← Wrapped Select with Tailwind styles
      tabs.tsx           ← Wrapped Tabs with Tailwind styles
      tooltip.tsx        ← Wrapped Tooltip with Tailwind styles
      toast.tsx          ← Wrapped Toast with Tailwind styles
      button.tsx         ← Button (not Base UI — your own)
      badge.tsx          ← Badge (not Base UI — your own)
      input.tsx          ← Input (not Base UI — your own)
  lib/
    cn.ts                ← cn() = twMerge(clsx())
```

---

## W — Why It Matters

- `@base-ui/react` was built by the MUI team with accessibility as the primary constraint — WAI-ARIA patterns, keyboard navigation, focus management, and screen reader compatibility are built in and tested. Building these from scratch is weeks of work; Base UI provides them for free.
- The zero-style philosophy means your design system is never constrained by component library defaults — you don't spend time overriding another library's CSS, fighting specificity, or loading unused styles. The final bundle contains only the CSS you write.
- Base UI v1.4.1 uses `data-state` attributes (open/closed, checked/unchecked, etc.) as its styling API — this integrates perfectly with Tailwind's `data-[state=]:` variant system covered in Day 11.

---

## I — Interview Q&A

### Q1: What is a headless component library and why would you choose @base-ui/react over a styled library like shadcn/ui or MUI?

**A:** A headless component library provides behaviour, accessibility, and state management without any visual styling — you supply 100% of the CSS. `@base-ui/react` provides accessible Popovers, Dialogs, Menus, Selects, and more with correct ARIA attributes, keyboard navigation, focus trapping, and portal rendering out of the box, but no visual opinions. You'd choose it over a styled library when: your design system is highly custom and fighting another library's CSS is more work than styling from scratch; when bundle size matters (no unused styles loaded); or when accessibility guarantees matter more than development speed. You'd choose shadcn/ui if you want pre-built Tailwind-styled components you can copy into your project without writing the accessibility layer yourself.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Expecting @base-ui/react to provide styles or a CSS file to import

```tsx
{
  /* ❌ Looking for a CSS import — there is none */
}
import "@base-ui/react/styles.css"; // ← does not exist
import "@base-ui/react/dist/index.css"; // ← does not exist

{
  /* @base-ui is 100% unstyled — no CSS to import */
}
```

**Fix:** All styling is done via Tailwind utilities on the Base UI component's `className` prop. No CSS import needed.

---

## K — Coding Challenge + Solution

### Challenge

Set up `@base-ui/react` in a Next.js project:

1. Install the package
2. Create a `src/lib/cn.ts` utility
3. Create a barrel `src/components/ui/index.ts` that will export all Base UI wrappers
4. Write a simple `<TestPopover>` component importing directly from `@base-ui/react/popover` to verify the install works

### Solution

```bash
npm install @base-ui/react tailwind-merge clsx class-variance-authority
```

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// src/components/ui/test-popover.tsx
"use client";

import * as Popover from "@base-ui/react/popover";
import { cn } from "@/lib/cn";

export function TestPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="px-4 py-2 bg-blue-600 text-white
                                   font-semibold rounded-xl text-sm
                                   hover:bg-blue-700 transition-colors"
      >
        Open Popover
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup
            className="bg-white border border-gray-200
                                     rounded-xl shadow-lg p-4 text-sm
                                     text-gray-700 max-w-xs z-50"
          >
            ✅ @base-ui/react is installed and working!
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

---

---

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

# 4 — Anatomy-Based Assembly — Root, Trigger, Portal, Positioner, Popup

---

## T — TL;DR

Every Base UI floating component follows a **5-part anatomy**: `Root` (state/context), `Trigger` (opens it), `Portal` (renders outside DOM), `Positioner` (places it via Floating UI), and `Popup` (the visible content). Understanding this pattern unlocks all floating components — Popover, Menu, Select, Tooltip — because they all follow the same structure.

---

## K — Key Concepts

### The 5-Part Anatomy Pattern

```
Root
  └── Trigger              (the thing you interact with)
  └── Portal               (teleports children to <body>)
       └── Positioner      (positions floating content)
            └── Popup      (the visible floating panel)
                 └── Arrow (optional pointing arrow)
```

```tsx
{/* ─── Universal pattern — same shape for Popover, Menu, Select, Tooltip */}

<ComponentName.Root>         {/* Context + state machine */}
  <ComponentName.Trigger>   {/* Opener — button/element */}
    Open
  </ComponentName.Trigger>

  <ComponentName.Portal>    {/* Renders into <body> via React Portal */}
                            {/* Avoids z-index/overflow:hidden traps */}

    <ComponentName.Positioner {/* Floating UI — computes x/y position */}
      side="bottom"          {/* Preferred side */}
      sideOffset={8}         {/* Gap from trigger */}
      align="center"         {/* Alignment within side */}
    >
      <ComponentName.Popup>  {/* The visible content container */}
        Content goes here
        <ComponentName.Arrow /> {/* Optional arrow pointing at trigger */}
      </ComponentName.Popup>
    </ComponentName.Positioner>

  </ComponentName.Portal>
</ComponentName.Root>
```

### Root — State Machine and Context

```tsx
{/* ─── Root props common across floating components */}

<Popover.Root
  // Uncontrolled (Root manages state)
  defaultOpen={false}

  // Controlled (you manage state)
  open={isOpen}
  onOpenChange={setIsOpen}

  // Delay for hover-triggered components
  delay={200}          // Open delay (Tooltip)
  closeDelay={100}     // Close delay (Tooltip)
>
```

### Portal — Why It's Necessary

```tsx
{
  /* ─── Without Portal: z-index and overflow traps */
}
{
  /* Problem: if the trigger is inside a container with overflow:hidden
    or a low z-index stacking context, the popup gets clipped */
}

{
  /* ❌ Without portal — popup clipped by overflow:hidden parent */
}
<div className="overflow-hidden">
  <Popover.Root>
    <Popover.Trigger>Open</Popover.Trigger>
    {/* NO Portal — Popup is a child of overflow:hidden → CLIPPED */}
    <Popover.Positioner>
      <Popover.Popup>Clipped!</Popover.Popup>
    </Popover.Positioner>
  </Popover.Root>
</div>;

{
  /* ✅ With Portal — Popup teleports to <body>, never clipped */
}
<div className="overflow-hidden">
  <Popover.Root>
    <Popover.Trigger>Open</Popover.Trigger>
    <Popover.Portal>
      {" "}
      {/* ← teleports to document.body */}
      <Popover.Positioner>
        <Popover.Popup>Never clipped!</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
</div>;
```

### Positioner — Floating UI Configuration

```tsx
{/* ─── Positioner controls WHERE the popup appears relative to trigger */}

<Popover.Positioner
  // Side: which side of the trigger the popup appears on
  side="bottom"          // bottom | top | left | right
  side="top"
  side="right"
  side="left"

  // Alignment within the side
  align="center"         // start | center | end
  align="start"          // left-aligned with trigger

  // Offset from trigger
  sideOffset={8}         // px gap between trigger and popup

  // Alignment offset
  alignOffset={0}        // px shift along the alignment axis

  // Collision avoidance — flip to opposite side if no room
  // (enabled by default — Floating UI handles this)
>
```

### Popup — Content Container with Data State

```tsx
{
  /* ─── Popup receives data-state from Base UI */
}
{
  /* data-state="open" when visible */
}
{
  /* data-state="closed" when hidden (during exit animation) */
}
{
  /* data-[starting-style] — initial CSS for enter animation */
}
{
  /* data-[ending-style]   — final CSS for exit animation */
}

<Popover.Popup
  className={cn(
    // Base styles
    "bg-white dark:bg-gray-800",
    "border border-gray-200 dark:border-gray-700",
    "rounded-2xl shadow-xl p-4 z-50 max-w-sm",
    // Entry animation — data-[starting-style] = initial state
    "transition-all duration-200 ease-out",
    "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
    // Exit animation — data-[ending-style] = final state
    "data-[ending-style]:opacity-0 data-[ending-style]:scale-95"
  )}
>
  Content
</Popover.Popup>;
```

---

## W — Why It Matters

- Understanding the anatomy pattern means you only need to learn it once — Popover, Menu, Select, and Tooltip all share Root/Trigger/Portal/Positioner/Popup. Once this structure is internalised, every new floating component is familiar.
- The `Portal` component solves a real CSS architecture problem — the `overflow: hidden` and `z-index` issues that plague floating UI in complex layouts. Every dropdown, tooltip, and popover in a production app needs portal rendering, and Base UI provides it for free.
- `Positioner` uses Floating UI under the hood — the same library used by Radix, Floating UI React, and Popper.js. It handles collision detection (flips side if no room), alignment, and viewport awareness automatically.

---

## I — Interview Q&A

### Q1: Why is `Portal` necessary in floating component anatomy and what problem does it solve?

**A:** `Portal` renders its children into a DOM node outside the normal React component tree — typically appended to `document.body`. This solves two CSS architecture problems: first, `overflow: hidden` — if a popup's ancestor has `overflow: hidden`, the popup would be clipped to that container's bounds without a portal. Second, stacking context — CSS `z-index` only works within the same stacking context. A popup inside a component with `transform`, `opacity`, `filter`, or `will-change` creates a new stacking context, which can prevent the popup from appearing above other elements regardless of `z-index` value. Portaling to `<body>` places the popup in the root stacking context, making `z-50` or `z-[9999]` reliably effective.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `Portal` — popup gets clipped in modals or cards

```tsx
{
  /* ❌ No Portal — popup clips inside overflow:hidden parent */
}
<div className="overflow-hidden rounded-xl">
  <Menu.Root>
    <Menu.Trigger>Open menu</Menu.Trigger>
    {/* Missing Portal! Menu clips to card boundary */}
    <Menu.Positioner>
      <Menu.Popup>Items...</Menu.Popup>
    </Menu.Positioner>
  </Menu.Root>
</div>;
```

**Fix:** Always wrap Positioner in Portal:

```tsx
{
  /* ✅ Portal teleports to body — never clipped */
}
<Menu.Root>
  <Menu.Trigger>Open menu</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner>
      <Menu.Popup>Items...</Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a reusable `<FloatingCard>` primitive that wraps the anatomy pattern, accepting:

1. `trigger` — a React node rendered as the trigger
2. `side`, `align`, `sideOffset` — positioner props forwarded
3. `children` — popup content
4. Entry/exit CSS transitions via `data-[starting-style]` and `data-[ending-style]`
5. An `Arrow` component pointing at the trigger

### Solution

```tsx
// src/components/ui/floating-card.tsx
"use client";

import * as Popover from "@base-ui/react/popover";
import { cn } from "@/lib/cn";

interface FloatingCardProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export function FloatingCard({
  trigger,
  children,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  className,
}: FloatingCardProps) {
  return (
    <Popover.Root>
      {/* Trigger — render the consumer's trigger node */}
      <Popover.Trigger render={trigger as React.ReactElement} />

      <Popover.Portal>
        <Popover.Positioner side={side} align={align} sideOffset={sideOffset}>
          {/* Popup with enter/exit CSS transitions */}
          <Popover.Popup
            className={cn(
              "bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700",
              "rounded-2xl shadow-xl z-50",
              "min-w-[200px] max-w-xs",
              // Transition
              "transition-all duration-200 ease-out origin-[--transform-origin]",
              // Enter: starting state → current state
              "data-[starting-style]:opacity-0",
              "data-[starting-style]:scale-95",
              // Exit: current state → ending state
              "data-[ending-style]:opacity-0",
              "data-[ending-style]:scale-95",
              className
            )}
          >
            {/* Arrow */}
            <Popover.Arrow
              className="fill-white dark:fill-gray-800
                          [filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.1))]"
            />
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Usage:
<FloatingCard
  trigger={
    <button className="px-4 py-2 bg-blue-600 text-white rounded-xl">
      Open
    </button>
  }
  side="bottom"
  align="start"
>
  <div className="p-4">
    <p className="text-sm text-gray-700">Floating content here</p>
  </div>
</FloatingCard>;
```

---

---

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

# 6 — Popover — Full Implementation with Tailwind

---

## T — TL;DR

`Popover` is the base floating panel — a trigger opens a positioned popup that closes on outside click or Escape. Use it for user profile cards, contextual help, rich form inputs, and any floating content that isn't a menu or tooltip.

---

## K — Key Concepts

### Complete Popover Anatomy

```tsx
// Root → Trigger → Portal → Positioner → Popup → (Arrow, Close)
import * as Popover from '@base-ui/react/popover'

<Popover.Root>
  <Popover.Trigger>          {/* Opens/closes popup */}
  <Popover.Portal>           {/* Teleports to <body> */}
    <Popover.Positioner>     {/* Floating UI positioning */}
      <Popover.Popup>        {/* Content container */}
        <Popover.Title>      {/* Optional: accessible title */}
        <Popover.Description>{/* Optional: accessible description */}
        <Popover.Close>      {/* Optional: explicit close button */}
        <Popover.Arrow>      {/* Optional: pointing arrow */}
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>
```

### Reusable Popover Wrapper

```tsx
// src/components/ui/popover.tsx
"use client";

import * as PopoverPrimitive from "@base-ui/react/popover";
import { cn } from "@/lib/cn";

// ─── Root
const PopoverRoot = PopoverPrimitive.Root;

// ─── Trigger
const PopoverTrigger = PopoverPrimitive.Trigger;

// ─── Content (Portal + Positioner + Popup combined)
interface PopoverContentProps extends PopoverPrimitive.Popup.Props {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  showArrow?: boolean;
}

function PopoverContent({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  showArrow = true,
  className,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          className={cn(
            // Base
            "relative bg-white dark:bg-gray-800 z-50",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-xl outline-none",
            "min-w-[220px] max-w-sm",
            // Transition
            "transition-all duration-200 ease-out",
            "origin-[--transform-origin]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {showArrow && (
            <PopoverPrimitive.Arrow
              className="
              data-[side=bottom]:top-[-5px]
              data-[side=top]:bottom-[-5px]
              data-[side=left]:right-[-5px]
              data-[side=right]:left-[-5px]
              fill-white dark:fill-gray-800
              [filter:drop-shadow(0_1px_0_#e5e7eb)]
              dark:[filter:drop-shadow(0_1px_0_#374151)]
            "
            />
          )}
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

// ─── Header slot
function PopoverHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-4 pt-4 pb-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Body slot
function PopoverBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 pb-4 text-sm text-gray-600 dark:text-gray-400",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Close button
function PopoverClose({
  className,
  children,
  ...props
}: PopoverPrimitive.Close.Props) {
  return (
    <PopoverPrimitive.Close
      className={cn(
        "inline-flex items-center justify-center size-7 rounded-lg",
        "text-gray-400 dark:text-gray-500",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "hover:text-gray-700 dark:hover:text-gray-300",
        "transition-colors duration-150 shrink-0",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500",
        className
      )}
      {...props}
    >
      {children ?? "✕"}
    </PopoverPrimitive.Close>
  );
}

// ─── Namespace export
export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Header: PopoverHeader,
  Body: PopoverBody,
  Close: PopoverClose,
};
```

### Usage Examples

```tsx
// src/app/examples/popover-demo.tsx
import { Popover } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// ─── Simple info popover
export function InfoPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="secondary" size="sm">
            ℹ️ Learn more
          </Button>
        }
      />
      <Popover.Content side="bottom" align="start">
        <Popover.Header>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              How this works
            </p>
          </div>
          <Popover.Close />
        </Popover.Header>
        <Popover.Body>
          This feature uses machine learning to automatically categorise your
          transactions. Accuracy improves over time.
        </Popover.Body>
      </Popover.Content>
    </Popover.Root>
  );
}

// ─── User card popover
export function UserCardPopover({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="flex items-center gap-2 rounded-xl p-1.5
                                   hover:bg-gray-100 dark:hover:bg-gray-800
                                   transition-colors
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-blue-500"
      >
        <div
          className="size-8 rounded-full bg-blue-600 flex items-center
                          justify-center text-white text-sm font-bold shrink-0"
        >
          {user.name.charAt(0)}
        </div>
        <span
          className="text-sm font-medium text-gray-700 dark:text-gray-300
                           hidden sm:block"
        >
          {user.name}
        </span>
      </Popover.Trigger>
      <Popover.Content side="bottom" align="end" sideOffset={12}>
        <div className="p-4 space-y-3">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-blue-600 flex items-center
                              justify-center text-white font-bold shrink-0"
            >
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          {/* Role badge */}
          <span
            className="inline-block px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30
                             text-blue-700 dark:text-blue-300 text-xs font-semibold
                             rounded-full"
          >
            {user.role}
          </span>
          {/* Actions */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
            {["Profile settings", "Billing", "Sign out"].map((item) => (
              <button
                key={item}
                className="w-full text-left px-2 py-1.5 text-sm rounded-lg
                                  text-gray-600 dark:text-gray-400
                                  hover:bg-gray-100 dark:hover:bg-gray-800
                                  hover:text-gray-900 dark:hover:text-white
                                  transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
```

---

## W — Why It Matters

- Popover is the generic floating panel — use it when you need a contextual floating surface that isn't a navigation menu (use Menu) or a status message (use Tooltip). The distinction matters for accessibility — screen readers announce popovers as dialogs, menus as menus, and tooltips as descriptions.
- The `Popover.Arrow` component renders an SVG pointing arrow that Floating UI positions automatically relative to the trigger — no manual calculation of arrow offset needed.
- `showArrow={false}` for modern flat designs and `showArrow={true}` for contextual help popovers where visual connection to the trigger matters — both are valid.

---

## I — Interview Q&A

### Q1: When should you use Popover vs Dialog vs Tooltip vs Menu?

**A:** Use **Tooltip** for read-only supplementary information triggered by hover/focus — never put interactive content in a tooltip. Use **Popover** for contextual floating panels with interactive content that doesn't fit the menu/select pattern — user cards, settings panels, help sections, rich date pickers. Use **Menu** specifically for command lists where each item is an action — file menus, context menus, action dropdowns. Use **Dialog** for operations that require user confirmation or full attention — alerts, confirmation dialogs, forms that block the underlying page. The key question: does the user need to interact with the rest of the page while this is open? If no → Dialog. If yes and it's a list of actions → Menu. If yes and it's rich content → Popover.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Nesting interactive content inside `Tooltip` — use `Popover` instead

```tsx
{
  /* ❌ Tooltips should be read-only — interactive content inside breaks a11y */
}
<Tooltip.Root>
  <Tooltip.Trigger>Help</Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Positioner>
      <Tooltip.Popup>
        <button onClick={handleLearnMore}>Learn more →</button> {/* ❌ */}
      </Tooltip.Popup>
    </Tooltip.Positioner>
  </Tooltip.Portal>
</Tooltip.Root>;
```

**Fix:** Use Popover for interactive floating content:

```tsx
{
  /* ✅ Popover for floating content with interaction */
}
<Popover.Root>
  <Popover.Trigger>Help</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner>
      <Popover.Popup className="p-4">
        <button onClick={handleLearnMore}>Learn more →</button> {/* ✅ */}
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<ColorPickerPopover>` — a trigger button showing the current color, a popover with a 6-swatch color grid, and a "Custom" input for hex values. Use controlled mode (`open` + `onOpenChange`) and close on color select.

### Solution

```tsx
// src/components/color-picker-popover.tsx
"use client";

import { useState } from "react";
import * as PopoverPrimitive from "@base-ui/react/popover";
import { cn } from "@/lib/cn";

const SWATCHES = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#64748b",
  "#1e293b",
  "#ffffff",
  "#f8fafc",
];

interface ColorPickerPopoverProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPickerPopover({
  value,
  onChange,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value);

  function selectColor(color: string) {
    onChange(color);
    setCustom(color);
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Trigger — shows current color */}
      <PopoverPrimitive.Trigger
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border",
          "border-gray-300 dark:border-gray-600",
          "bg-white dark:bg-gray-900",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          "transition-colors text-sm font-medium text-gray-700 dark:text-gray-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "data-[popup-open]:border-blue-500"
        )}
      >
        <span
          className="size-5 rounded-md border border-black/10 shrink-0"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-xs">{value}</span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="bottom" align="start" sideOffset={8}>
          <PopoverPrimitive.Popup
            className={cn(
              "bg-white dark:bg-gray-800 border border-gray-200",
              "dark:border-gray-700 rounded-2xl shadow-xl z-50 p-4 w-56",
              "transition-all duration-200 origin-[--transform-origin]",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0   data-[ending-style]:scale-95"
            )}
          >
            <p
              className="text-xs font-semibold text-gray-500 dark:text-gray-400
                           uppercase tracking-wider mb-3"
            >
              Color
            </p>

            {/* Swatch grid */}
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  className={cn(
                    "size-7 rounded-lg border-2 transition-transform",
                    "hover:scale-110 active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                    value === color
                      ? "border-blue-500 scale-110"
                      : "border-transparent hover:border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                  aria-pressed={value === color}
                />
              ))}
            </div>

            {/* Custom hex input */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
                Custom hex
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && selectColor(custom)}
                  placeholder="#000000"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg
                              border border-gray-300 dark:border-gray-600
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-blue-500
                              focus:border-transparent"
                />
                <button
                  onClick={() => selectColor(custom)}
                  className="px-2.5 py-1.5 bg-blue-600 text-white text-xs
                              font-semibold rounded-lg hover:bg-blue-700
                              transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
```

---

---

# 7 — Dialog — Modal with Overlay, Focus Trap, Accessible Anatomy

---

## T — TL;DR

`Dialog` renders a modal that traps focus, prevents body scroll, closes on Escape, and sets `aria-modal`. Anatomy: `Root → Trigger → Portal → Backdrop → Popup → Title → Description → Close`. Always include `Title` and `Description` for screen reader accessibility.

---

## K — Key Concepts

### Dialog Anatomy and Reusable Wrapper

```tsx
// src/components/ui/dialog.tsx
"use client";

import * as DialogPrimitive from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";

const DialogRoot = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
        "transition-opacity duration-200",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function DialogPopup({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        // Layout — centered in viewport
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "z-50 w-full max-w-lg mx-4",
        // Visual
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "rounded-2xl shadow-2xl outline-none",
        // Transition
        "transition-all duration-200 ease-out",
        "data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:-translate-x-1/2 data-[starting-style]:-translate-y-[calc(50%-8px)]",
        "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Popup>
  );
}

function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        "px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
}

function DialogTitle({
  className,
  children,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-lg font-semibold text-gray-900 dark:text-white leading-tight",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  className,
  children,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4",
        "border-t border-gray-100 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
}

function DialogClose({
  className,
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-xl shrink-0",
        "text-gray-400 dark:text-gray-500",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "hover:text-gray-700 dark:hover:text-gray-300",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
      {...props}
    >
      {children ?? "✕"}
    </DialogPrimitive.Close>
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  Body: DialogBody,
  Footer: DialogFooter,
  Close: DialogClose,
};
```

### Usage — Confirmation Dialog

```tsx
// src/components/confirm-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  variant?: "danger" | "primary";
  children: React.ReactNode; // The trigger
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  variant = "danger",
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={children as React.ReactElement} />

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close />
          </Dialog.Header>

          <Dialog.Footer>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant}
              size="sm"
              onClick={handleConfirm}
              isLoading={loading}
            >
              {variant === "danger" ? "Delete" : "Confirm"}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Usage:
<ConfirmDialog
  title="Delete account?"
  description="This action cannot be undone. All your data will be permanently deleted."
  onConfirm={handleDelete}
  variant="danger"
>
  <Button variant="danger">Delete account</Button>
</ConfirmDialog>;
```

---

## W — Why It Matters

- `Dialog.Title` and `Dialog.Description` are not optional from an accessibility standpoint — screen readers announce `aria-labelledby` and `aria-describedby` when the dialog opens. Without them, a screen reader user only hears "dialog" with no context. Base UI auto-wires these IDs, but you must render the components.
- `Dialog.Backdrop` with `backdrop-blur-sm` provides the modern frosted glass backdrop effect — but ensure sufficient opacity (`bg-black/50` minimum) so the backdrop clearly separates the dialog from the content behind it for users with visual processing difficulties.
- Focus trap is the hardest part of an accessible dialog — Base UI manages it automatically. Do not add `tabIndex={-1}` or `tabIndex={0}` to elements inside the dialog unless you have a specific reason, as it affects the focus trap's tab order.

---

## I — Interview Q&A

### Q1: What does `Dialog.Backdrop` vs `Dialog.Popup` do in Base UI, and why are both needed?

**A:** `Dialog.Backdrop` renders the overlay — a fixed full-screen element behind the dialog popup that visually darkens the page and captures clicks to close the dialog. It receives `data-starting-style` and `data-ending-style` for fade-in/out animations. `Dialog.Popup` renders the dialog container itself — the white card centered in the viewport that contains the actual content. It receives `aria-modal="true"`, `role="dialog"`, and the focus trap behaviour. Both are needed because they have separate visual and functional roles: the backdrop is the dim overlay, the popup is the focused content. They can be styled and animated independently — the backdrop fades while the popup can scale in from a slightly smaller size.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `Dialog.Title` — screen readers announce only "dialog" with no context

```tsx
{
  /* ❌ No title — screen reader says "dialog" — no context for user */
}
<Dialog.Popup>
  <p>Are you sure you want to delete this item?</p>
  <button>Yes</button>
  <button>No</button>
</Dialog.Popup>;
```

**Fix:** Always include `Dialog.Title` and optionally `Dialog.Description`:

```tsx
{
  /* ✅ Screen reader announces: "Delete item dialog" then description */
}
<Dialog.Popup>
  <Dialog.Header>
    <Dialog.Title>Delete item</Dialog.Title>
    <Dialog.Description>This action cannot be undone.</Dialog.Description>
  </Dialog.Header>
  <Dialog.Footer>
    <button>Yes, delete</button>
    <button>Cancel</button>
  </Dialog.Footer>
</Dialog.Popup>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<FormDialog>` — a dialog triggered by a button that contains a small form (name + email), a loading state on submit, and closes on successful submission. Use fully controlled mode.

### Solution

```tsx
// src/components/form-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export function FormDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setOpen(false);
    setForm({ name: "", email: "" });
  }

  const inputCls = cn(
    "w-full px-3 py-2.5 text-sm rounded-xl border",
    "border-gray-300 dark:border-gray-600",
    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
    "placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "transition-colors"
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="px-5 py-2.5 bg-blue-600 text-white
                                   font-semibold text-sm rounded-xl
                                   hover:bg-blue-700 transition-colors
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Invite member
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Header>
            <div>
              <Dialog.Title>Invite a team member</Dialog.Title>
              <Dialog.Description>
                They'll receive an invitation email to join your workspace.
              </Dialog.Description>
            </div>
            <Dialog.Close />
          </Dialog.Header>

          <form onSubmit={handleSubmit}>
            <Dialog.Body className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Alex Johnson"
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="alex@company.com"
                  className={inputCls}
                />
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl
                                  border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-50 dark:hover:bg-gray-700
                                  transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl
                                  bg-blue-600 text-white hover:bg-blue-700
                                  transition-all active:scale-[0.98]
                                  disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? "⟳ Sending…" : "Send invitation"}
              </button>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

---

# 8 — Menu — Dropdown with Items, Groups, Separator

---

## T — TL;DR

`Menu` renders an accessible command list — keyboard navigable with arrow keys, typeahead search, and correct `role="menu"` / `role="menuitem"` ARIA. Anatomy: `Root → Trigger → Portal → Positioner → Popup → Item | Group | GroupLabel | Separator`.

---

## K — Key Concepts

### Reusable Menu Wrapper

```tsx
// src/components/ui/menu.tsx
"use client";

import * as MenuPrimitive from "@base-ui/react/menu";
import { cn } from "@/lib/cn";

const MenuRoot = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

function MenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  children,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "min-w-[180px] max-w-xs p-1.5",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-xl z-50 outline-none",
            "transition-all duration-150 ease-out origin-[--transform-origin]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({
  className,
  icon,
  shortcut,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  icon?: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-xl",
        "text-sm text-gray-700 dark:text-gray-300",
        "cursor-pointer select-none outline-none",
        "transition-colors duration-100",
        "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700",
        "data-[highlighted]:text-gray-900 dark:data-[highlighted]:text-white",
        "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className="shrink-0 text-base text-gray-400
                                  data-[highlighted]:text-gray-600"
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">{children}</span>
      {shortcut && (
        <span
          className="shrink-0 text-xs text-gray-400 dark:text-gray-500
                           font-mono ml-auto"
        >
          {shortcut}
        </span>
      )}
    </MenuPrimitive.Item>
  );
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn("my-1 h-px bg-gray-100 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

function MenuGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <MenuPrimitive.Group className={cn("", className)}>
      {children}
    </MenuPrimitive.Group>
  );
}

function MenuGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
        "text-gray-400 dark:text-gray-500",
        className
      )}
    >
      {children}
    </MenuPrimitive.GroupLabel>
  );
}

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
};
```

### Usage — Action Dropdown

```tsx
// src/components/action-menu.tsx
import { Menu } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";

export function ActionMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button variant="secondary" size="sm">
            Actions ▾
          </Button>
        }
      />
      <Menu.Content>
        <Menu.Group>
          <Menu.GroupLabel>File</Menu.GroupLabel>
          <Menu.Item icon="📄" shortcut="⌘N" onSelect={() => {}}>
            New file
          </Menu.Item>
          <Menu.Item icon="📂" shortcut="⌘O" onSelect={() => {}}>
            Open
          </Menu.Item>
          <Menu.Item icon="💾" shortcut="⌘S" onSelect={() => {}}>
            Save
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Edit</Menu.GroupLabel>
          <Menu.Item icon="✂️" shortcut="⌘X" onSelect={() => {}}>
            Cut
          </Menu.Item>
          <Menu.Item icon="📋" shortcut="⌘C" onSelect={() => {}}>
            Copy
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item
          icon="🗑️"
          className="text-red-600 dark:text-red-400
                                         data-[highlighted]:bg-red-50
                                         dark:data-[highlighted]:bg-red-900/20"
          onSelect={() => {}}
        >
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
```

---

## W — Why It Matters

- `Menu` vs a custom dropdown built with `useState` + `onClick`: Base UI's menu implements all keyboard navigation (arrow keys, Home/End, typeahead) and ARIA (`role="menu"`, `role="menuitem"`) automatically. A custom dropdown that looks like a menu but isn't one is inaccessible by default — screen readers can't navigate it with menu keyboard patterns.
- `onSelect` on `Menu.Item` (not `onClick`) is the correct handler — Base UI calls `onSelect` after keyboard activation, mouse click, and touch, ensuring consistent behaviour across all input modalities.
- Destructive items should be visually differentiated (`text-red-600`) and placed after a `Separator` to prevent accidental activation.

---

## I — Interview Q&A

### Q1: What is the difference between `Menu.Item`'s `onSelect` and a regular `onClick` handler?

**A:** `onClick` fires only on mouse click events. `onSelect` is Base UI's cross-input handler — it fires when the item is activated by any input method: mouse click, Enter or Space key on a focused item, or touch tap. It also receives the original event and handles the menu close behaviour correctly. Using `onClick` on menu items means keyboard users who navigate with arrow keys and press Enter get no response, and touch users on some devices may get inconsistent behaviour. Always use `onSelect` for menu item actions in Base UI.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `onClick` instead of `onSelect` on Menu.Item

```tsx
{
  /* ❌ onClick doesn't fire for keyboard activation */
}
<Menu.Item onClick={handleDelete}>Delete</Menu.Item>;
```

**Fix:**

```tsx
{
  /* ✅ onSelect fires for all input methods */
}
<Menu.Item onSelect={handleDelete}>Delete</Menu.Item>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<RowActionsMenu>` for a data table row with: Edit, Duplicate, Copy ID, a separator, and Delete (danger styled). Each item calls a different handler. The trigger is an icon-only `⋯` button with `aria-label`.

### Solution

```tsx
// src/components/row-actions-menu.tsx
import { Menu } from "@/components/ui/menu";

interface RowActionsProps {
  id: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RowActionsMenu({
  id,
  onEdit,
  onDuplicate,
  onDelete,
}: RowActionsProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Row actions"
        className="inline-flex items-center justify-center size-8 rounded-lg
                    text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-blue-500
                    data-[popup-open]:bg-gray-100 data-[popup-open]:text-gray-700"
      >
        ⋯
      </Menu.Trigger>
      <Menu.Content side="bottom" align="end">
        <Menu.Item icon="✏️" onSelect={onEdit}>
          Edit
        </Menu.Item>
        <Menu.Item icon="📋" onSelect={onDuplicate}>
          Duplicate
        </Menu.Item>
        <Menu.Item icon="🔗" onSelect={() => navigator.clipboard.writeText(id)}>
          Copy ID
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item
          icon="🗑️"
          onSelect={onDelete}
          className="text-red-600 dark:text-red-400
                      data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20
                      data-[highlighted]:text-red-700"
        >
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
```

---

---

# 9 — Select — Controlled Dropdown Select

---

## T — TL;DR

`Select` renders an accessible dropdown for choosing a value — like a native `<select>` but fully styleable. Anatomy: `Root → Trigger → Value → Portal → Positioner → Popup → (Arrow) → Option | Group | GroupLabel | Separator`.

---

## K — Key Concepts

### Reusable Select Wrapper

```tsx
// src/components/ui/select.tsx
"use client";

import * as SelectPrimitive from "@base-ui/react/select";
import { cn } from "@/lib/cn";

interface SelectRootProps extends SelectPrimitive.Root.Props {}
const SelectRoot = SelectPrimitive.Root;

function SelectTrigger({
  className,
  children,
  placeholder,
  ...props
}: SelectPrimitive.Trigger.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex items-center justify-between gap-2",
        "w-full px-3 py-2.5 rounded-xl border text-sm",
        "bg-white dark:bg-gray-900",
        "border-gray-300 dark:border-gray-600",
        "text-gray-900 dark:text-white",
        "hover:border-gray-400 dark:hover:border-gray-500",
        "transition-colors cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:border-transparent",
        "data-[popup-open]:border-blue-500 data-[popup-open]:ring-2",
        "data-[popup-open]:ring-blue-500/20",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Value
        placeholder={placeholder ?? "Select…"}
        className="data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-gray-500 truncate"
      />
      <span
        className="shrink-0 text-gray-400 text-xs
                        transition-transform data-[popup-open]:rotate-180"
      >
        ▾
      </span>
    </SelectPrimitive.Trigger>
  );
}

function SelectPopup({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6}>
        <SelectPrimitive.Popup
          className={cn(
            "min-w-[--anchor-width] max-h-64 overflow-y-auto p-1.5",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-xl z-50 outline-none",
            "transition-all duration-150 ease-out origin-[--transform-origin]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectOption({
  className,
  children,
  icon,
  ...props
}: SelectPrimitive.Option.Props & { icon?: React.ReactNode }) {
  return (
    <SelectPrimitive.Option
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl",
        "text-sm text-gray-700 dark:text-gray-300",
        "cursor-pointer select-none outline-none",
        "transition-colors duration-100",
        "data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20",
        "data-[highlighted]:text-blue-700 dark:data-[highlighted]:text-blue-300",
        "data-[selected]:font-semibold",
        "data-[selected]:text-blue-700 dark:data-[selected]:text-blue-300",
        "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-base">{icon}</span>}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <span
        className="shrink-0 text-blue-500 text-sm
                        opacity-0 data-[selected]:opacity-100"
      >
        ✓
      </span>
    </SelectPrimitive.Option>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn("my-1 h-px bg-gray-100 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <SelectPrimitive.Group>{children}</SelectPrimitive.Group>;
}

function SelectGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(
        "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
        "text-gray-400 dark:text-gray-500",
        className
      )}
    >
      {children}
    </SelectPrimitive.GroupLabel>
  );
}

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Popup: SelectPopup,
  Option: SelectOption,
  Separator: SelectSeparator,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
};
```

### Usage

```tsx
// src/components/country-select.tsx
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

const COUNTRIES = [
  { value: "us", label: "United States", icon: "🇺🇸" },
  { value: "gb", label: "United Kingdom", icon: "🇬🇧" },
  { value: "ca", label: "Canada", icon: "🇨🇦" },
  { value: "au", label: "Australia", icon: "🇦🇺" },
  { value: "de", label: "Germany", icon: "🇩🇪" },
  { value: "fr", label: "France", icon: "🇫🇷" },
];

export function CountrySelect() {
  const [value, setValue] = useState<string>("");

  return (
    <div className="space-y-1.5 max-w-xs">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Country
      </label>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.Trigger placeholder="Select a country…" />
        <Select.Popup>
          {COUNTRIES.map((country) => (
            <Select.Option
              key={country.value}
              value={country.value}
              icon={country.icon}
            >
              {country.label}
            </Select.Option>
          ))}
        </Select.Popup>
      </Select.Root>
    </div>
  );
}
```

---

## W — Why It Matters

- Native `<select>` is impossible to style consistently across browsers — especially on iOS, Windows, and macOS. Base UI's Select gives you full CSS control while maintaining all the accessibility and keyboard behaviour of native select.
- `min-w-[--anchor-width]` is the key trick for matching the popup width to the trigger — Base UI exposes `--anchor-width` as a CSS variable on the Positioner so the dropdown automatically matches its trigger's width without JavaScript measurement.
- Typeahead search (type letters to jump to options) is built in — this is expected behaviour for accessibility and power users.

---

## I — Interview Q&A

### Q1: Why use Base UI's Select instead of a native HTML `<select>` element?

**A:** Native `<select>` cannot be styled reliably across platforms — iOS renders it as a native picker wheel, Windows shows a system-styled dropdown, and macOS has its own appearance. There's no way to add icons, custom option layouts, option groups with custom headers, search filtering, or multi-select with custom checkboxes. Base UI's Select provides the same keyboard navigation (arrow keys, typeahead), ARIA attributes (`role="listbox"`, `aria-selected`), and form integration as a native select, while being fully styleable with Tailwind. The trade-off is that it requires JavaScript — for form fields in an email or print context, a native `<select>` hidden with CSS and a Base UI Select shown for sighted users can provide both accessibility and style.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Popup width not matching trigger width

```tsx
{/* ❌ Popup uses default min-width — narrower than the trigger */}
<SelectPrimitive.Popup className="min-w-[200px]">
```

**Fix:** Use `--anchor-width` CSS variable:

```tsx
{/* ✅ Popup is at least as wide as the trigger */}
<SelectPrimitive.Popup className="min-w-[--anchor-width]">
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<TimeZoneSelect>` with grouped options — "Americas", "Europe", "Asia Pacific" — each with city name and UTC offset. Show the selected value in the trigger with the UTC offset.

### Solution

```tsx
// src/components/timezone-select.tsx
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

const TIMEZONES = {
  Americas: [
    { value: "America/New_York", label: "New York", offset: "UTC-5" },
    { value: "America/Chicago", label: "Chicago", offset: "UTC-6" },
    { value: "America/Denver", label: "Denver", offset: "UTC-7" },
    { value: "America/Los_Angeles", label: "Los Angeles", offset: "UTC-8" },
    { value: "America/Sao_Paulo", label: "São Paulo", offset: "UTC-3" },
  ],
  Europe: [
    { value: "Europe/London", label: "London", offset: "UTC+0" },
    { value: "Europe/Paris", label: "Paris", offset: "UTC+1" },
    { value: "Europe/Berlin", label: "Berlin", offset: "UTC+1" },
    { value: "Europe/Moscow", label: "Moscow", offset: "UTC+3" },
  ],
  "Asia Pacific": [
    { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+9" },
    { value: "Asia/Shanghai", label: "Shanghai", offset: "UTC+8" },
    { value: "Australia/Sydney", label: "Sydney", offset: "UTC+11" },
  ],
};

export function TimeZoneSelect() {
  const [value, setValue] = useState("");

  const allTz = Object.values(TIMEZONES).flat();
  const selected = allTz.find((tz) => tz.value === value);

  return (
    <div className="space-y-1.5 max-w-sm">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Time zone
      </label>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.Trigger placeholder="Select time zone…" className="min-w-0" />
        <Select.Popup className="max-h-72">
          {Object.entries(TIMEZONES).map(([region, zones], i) => (
            <Select.Group key={region}>
              <Select.GroupLabel>{region}</Select.GroupLabel>
              {zones.map((tz) => (
                <Select.Option key={tz.value} value={tz.value}>
                  <span className="flex-1">{tz.label}</span>
                  <span
                    className="shrink-0 text-xs font-mono text-gray-400
                                    data-[highlighted]:text-blue-400
                                    data-[selected]:text-blue-400"
                  >
                    {tz.offset}
                  </span>
                </Select.Option>
              ))}
              {i < Object.keys(TIMEZONES).length - 1 && <Select.Separator />}
            </Select.Group>
          ))}
        </Select.Popup>
      </Select.Root>

      {selected && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected: {selected.label} ({selected.offset})
        </p>
      )}
    </div>
  );
}
```

---

---

# 10 — Tabs — Tab List, Panels, Keyboard Navigation

---

## T — TL;DR

`Tabs` manages tab selection state, keyboard navigation (arrow keys), and `aria-selected`/`role="tabpanel"` ARIA automatically. Anatomy: `Root → List → Tab → Panel`. Simpler than floating components — no Portal or Positioner needed.

---

## K — Key Concepts

### Reusable Tabs Wrapper

```tsx
// src/components/ui/tabs.tsx
"use client";

import * as TabsPrimitive from "@base-ui/react/tabs";
import { cn } from "@/lib/cn";
import { cva } from "class-variance-authority";

const tabsVariants = cva("", {
  variants: {
    variant: {
      default: "",
      pills: "",
      underline: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const TabsRoot = TabsPrimitive.Root;

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & { variant?: "default" | "pills" | "underline" }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center gap-1",
        variant === "default" && "bg-gray-100 dark:bg-gray-800 p-1 rounded-xl",
        variant === "pills" && "gap-2",
        variant === "underline" &&
          "border-b border-gray-200 dark:border-gray-700 gap-0",
        className
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.Tab.Props & { variant?: "default" | "pills" | "underline" }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex items-center justify-center font-medium text-sm",
        "transition-all duration-150 cursor-pointer select-none outline-none",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        // Default pill in container
        variant === "default" &&
          cn(
            "px-4 py-1.5 rounded-lg",
            "text-gray-600 dark:text-gray-400",
            "hover:text-gray-900 dark:hover:text-white",
            "data-[selected]:bg-white dark:data-[selected]:bg-gray-700",
            "data-[selected]:text-gray-900 dark:data-[selected]:text-white",
            "data-[selected]:shadow-sm"
          ),
        // Standalone pills
        variant === "pills" &&
          cn(
            "px-4 py-2 rounded-xl",
            "text-gray-600 dark:text-gray-400",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "data-[selected]:bg-blue-600 data-[selected]:text-white",
            "data-[selected]:shadow-sm data-[selected]:hover:bg-blue-700"
          ),
        // Underline
        variant === "underline" &&
          cn(
            "px-4 py-2.5 rounded-none border-b-2 border-transparent -mb-px",
            "text-gray-500 dark:text-gray-400",
            "hover:text-gray-900 dark:hover:text-white",
            "hover:border-gray-300 dark:hover:border-gray-600",
            "data-[selected]:border-blue-600 data-[selected]:text-blue-600",
            "dark:data-[selected]:border-blue-400 dark:data-[selected]:text-blue-400"
          ),
        className
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("outline-none mt-4", "data-[hidden]:hidden", className)}
      {...props}
    />
  );
}

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
};
```

### Usage — All Three Variants

```tsx
// src/components/tabs-demo.tsx
import { Tabs } from "@/components/ui/tabs";

export function TabsDemo() {
  return (
    <div className="space-y-10 p-6">
      {/* Default — pills in container */}
      <Tabs.Root defaultValue="overview">
        <Tabs.List variant="default">
          <Tabs.Tab variant="default" value="overview">
            Overview
          </Tabs.Tab>
          <Tabs.Tab variant="default" value="analytics">
            Analytics
          </Tabs.Tab>
          <Tabs.Tab variant="default" value="settings">
            Settings
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <div
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border
                           border-gray-200 dark:border-gray-700 text-sm text-gray-600"
          >
            Overview panel content
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="analytics">Analytics panel</Tabs.Panel>
        <Tabs.Panel value="settings">Settings panel</Tabs.Panel>
      </Tabs.Root>

      {/* Underline variant */}
      <Tabs.Root defaultValue="month">
        <Tabs.List variant="underline">
          {["day", "week", "month", "year"].map((period) => (
            <Tabs.Tab
              key={period}
              variant="underline"
              value={period}
              className="capitalize"
            >
              {period}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="month">
          <p className="text-sm text-gray-600 mt-2">Monthly data</p>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
```

---

## W — Why It Matters

- Tabs keyboard navigation (arrow keys to move between tabs) is mandated by the WAI-ARIA Tabs pattern — Base UI implements it correctly. A custom tab implementation using `onClick` only fails keyboard users who expect arrow key navigation.
- `data-[hidden]:hidden` on `Tabs.Panel` ensures inactive panels are hidden from both display and accessibility tree — Base UI sets the `hidden` attribute, but you must apply the CSS to visually hide it.
- `data-[selected]:` on `Tabs.Tab` drives the active tab styling — no `isActive` prop or conditional class needed.

---

## I — Interview Q&A

### Q1: How does Base UI's Tabs handle keyboard navigation and what does this mean for your implementation?

**A:** Base UI's Tabs implements the WAI-ARIA Tabs pattern — arrow keys navigate between tabs in the Tab List, activating a tab with Enter or Space (or automatically on arrow key, depending on `activateOnFocus` prop) shows the corresponding panel. Home/End keys jump to first/last tab. Tab key moves focus from the Tab List to the active panel's content. This means you don't add any keyboard event handlers — Base UI handles all of it. Your only responsibility is to style `data-[selected]:` on `Tabs.Tab` for the active visual state and ensure the `Tabs.Panel` value attributes match the `Tabs.Tab` value attributes.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `data-[hidden]:hidden` on `Tabs.Panel` — all panels show at once

```tsx
{
  /* ❌ No hidden style — all panels render visibly */
}
<Tabs.Panel value="analytics">Analytics</Tabs.Panel>;

{
  /* Base UI sets hidden attribute on inactive panels,
    but without CSS, hidden attribute doesn't visually hide the element
    in all browsers/contexts */
}
```

**Fix:**

```tsx
{
  /* ✅ data-[hidden]:hidden — or use the built-in hidden CSS behaviour */
}
<Tabs.Panel value="analytics" className="data-[hidden]:hidden">
  Analytics
</Tabs.Panel>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SettingsTabs>` component with `Profile`, `Security`, and `Notifications` tabs. Each panel has a distinct form-like content area. Uses underline variant, starts on Security tab, and has a badge showing a notification count on the Notifications tab.

### Solution

```tsx
// src/components/settings-tabs.tsx
import { Tabs } from "@/components/ui/tabs";

const UNREAD_NOTIFICATIONS = 3;

export function SettingsTabs() {
  return (
    <div
      className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl
                     border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <Tabs.Root defaultValue="security">
        {/* Header with underline tab list */}
        <div className="px-6 pt-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Settings
          </h2>
          <Tabs.List variant="underline">
            <Tabs.Tab variant="underline" value="profile">
              Profile
            </Tabs.Tab>
            <Tabs.Tab variant="underline" value="security">
              Security
            </Tabs.Tab>
            <Tabs.Tab variant="underline" value="notifications">
              <span className="flex items-center gap-2">
                Notifications
                {UNREAD_NOTIFICATIONS > 0 && (
                  <span
                    className="inline-flex items-center justify-center
                                    size-4 rounded-full bg-red-500 text-white
                                    text-[10px] font-bold leading-none"
                  >
                    {UNREAD_NOTIFICATIONS}
                  </span>
                )}
              </span>
            </Tabs.Tab>
          </Tabs.List>
        </div>

        {/* Profile panel */}
        <Tabs.Panel
          value="profile"
          className="data-[hidden]:hidden p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div
              className="size-16 rounded-full bg-gradient-to-br
                              from-blue-500 to-purple-600
                              flex items-center justify-center
                              text-white text-xl font-bold shrink-0"
            >
              M
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Mark Austin
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                mark@example.com
              </p>
            </div>
            <button
              className="ml-auto text-sm font-medium text-blue-600
                                 hover:text-blue-700 dark:text-blue-400
                                 transition-colors"
            >
              Change avatar
            </button>
          </div>
          {[
            { label: "Full name", placeholder: "Mark Austin", type: "text" },
            {
              label: "Email address",
              placeholder: "mark@example.com",
              type: "email",
            },
            { label: "Username", placeholder: "markaustria97", type: "text" },
          ].map((field) => (
            <div key={field.label}>
              <label
                className="block text-sm font-medium text-gray-700
                                  dark:text-gray-300 mb-1.5"
              >
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                defaultValue={field.placeholder}
                className="w-full px-3 py-2.5 text-sm rounded-xl border
                             border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition-colors"
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Save changes
            </button>
          </div>
        </Tabs.Panel>

        {/* Security panel */}
        <Tabs.Panel
          value="security"
          className="data-[hidden]:hidden p-6 space-y-5"
        >
          <div className="space-y-3">
            {[
              { label: "Current password", placeholder: "••••••••" },
              { label: "New password", placeholder: "At least 8 characters" },
              { label: "Confirm password", placeholder: "Repeat new password" },
            ].map((field) => (
              <div key={field.label}>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  {field.label}
                </label>
                <input
                  type="password"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border
                               border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               focus:border-transparent transition-colors"
                />
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between p-4
                            bg-amber-50 dark:bg-amber-900/20 rounded-xl
                            border border-amber-200 dark:border-amber-800"
          >
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Two-factor authentication
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Not enabled — your account is less secure
              </p>
            </div>
            <button
              className="text-sm font-semibold text-amber-700
                                 dark:text-amber-300 hover:text-amber-900
                                 dark:hover:text-amber-100 transition-colors"
            >
              Enable →
            </button>
          </div>
          <div className="flex justify-end">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Update password
            </button>
          </div>
        </Tabs.Panel>

        {/* Notifications panel */}
        <Tabs.Panel
          value="notifications"
          className="data-[hidden]:hidden p-6 space-y-4"
        >
          {[
            {
              id: "email-all",
              label: "Email notifications",
              desc: "All activity in your workspaces",
              defaultChecked: true,
            },
            {
              id: "email-mnt",
              label: "Mentions only",
              desc: "Only when you are @mentioned",
              defaultChecked: false,
            },
            {
              id: "push-deploy",
              label: "Deployment alerts",
              desc: "Success, failure, and rollback",
              defaultChecked: true,
            },
            {
              id: "push-weekly",
              label: "Weekly digest",
              desc: "Summary every Monday morning",
              defaultChecked: false,
            },
          ].map((item) => (
            <label
              key={item.id}
              htmlFor={item.id}
              className="flex items-start gap-3 cursor-pointer
                                group hover:bg-gray-50 dark:hover:bg-gray-700/50
                                p-3 rounded-xl transition-colors -mx-3"
            >
              <input
                id={item.id}
                type="checkbox"
                defaultChecked={item.defaultChecked}
                className="mt-0.5 size-4 rounded border-gray-300
                             text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </label>
          ))}
          <div className="flex justify-end pt-2">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Save preferences
            </button>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
```

---

---

# 11 — Tooltip — Hover/Focus Tooltip with Delay and Positioning

---

## T — TL;DR

`Tooltip` shows a small read-only label on hover or keyboard focus. It auto-wires `aria-describedby` between the trigger and popup. Anatomy: `Provider → Root → Trigger → Portal → Positioner → Popup → (Arrow)`. The `Provider` wraps your app once and enables instant subsequent tooltips after the first hover.

---

## K — Key Concepts

### Tooltip Anatomy and the `Provider`

```tsx
{/* ─── Provider: wrap once at the app/layout level */}
{/* Enables "group delay" — after hovering one tooltip, subsequent ones */}
{/* open instantly (no delay) until the mouse rests for a moment */}
import * as TooltipPrimitive from '@base-ui/react/tooltip'

// src/app/layout.tsx
<TooltipPrimitive.Provider delay={400} closeDelay={100}>
  {children}
</TooltipPrimitive.Provider>

{/* ─── Individual tooltip anatomy */}
<TooltipPrimitive.Root>
  <TooltipPrimitive.Trigger />   {/* The element that triggers the tooltip */}
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner>
      <TooltipPrimitive.Popup />   {/* The label content */}
        <TooltipPrimitive.Arrow /> {/* Optional pointing arrow */}
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
</TooltipPrimitive.Root>
```

### Reusable Tooltip Wrapper

```tsx
// src/components/ui/tooltip.tsx
"use client";

import * as TooltipPrimitive from "@base-ui/react/tooltip";
import { cn } from "@/lib/cn";

// ─── Provider — add to layout.tsx once
export const TooltipProvider = TooltipPrimitive.Provider;

// ─── Simple tooltip component (most common usage)
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root delay={delay}>
      {/* Trigger — renders as the child element */}
      <TooltipPrimitive.Trigger render={children} />

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} align={align} sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              // Base
              "px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "bg-gray-900 dark:bg-gray-100",
              "text-white dark:text-gray-900",
              "shadow-lg max-w-xs text-center z-[60]",
              // Transition
              "transition-all duration-150 ease-out",
              "origin-[--transform-origin]",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-100" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ─── Compound API for complex tooltip content
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 6,
  children,
  ...props
}: TooltipPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "px-3 py-2 rounded-xl text-sm",
            "bg-gray-900 dark:bg-gray-100",
            "text-white dark:text-gray-900",
            "shadow-xl max-w-xs z-[60]",
            "transition-all duration-150 ease-out",
            "origin-[--transform-origin]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-100" />
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export const TooltipCompound = {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
};
```

### Provider Integration in Layout

```tsx
// src/app/layout.tsx
import * as TooltipPrimitive from "@base-ui/react/tooltip";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Provider enables group hover delay — wrap once at app root */}
        <TooltipPrimitive.Provider delay={500} closeDelay={100}>
          {children}
        </TooltipPrimitive.Provider>
      </body>
    </html>
  );
}
```

### Usage Examples

```tsx
// src/components/tooltip-demo.tsx
import { Tooltip, TooltipCompound } from "@/components/ui/tooltip";

// ─── Simple string tooltip
export function SimpleTooltipDemo() {
  return (
    <div className="flex items-center gap-4 p-8 flex-wrap">
      <Tooltip content="New file" side="top">
        <button
          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800
                             flex items-center justify-center text-lg
                             hover:bg-gray-200 dark:hover:bg-gray-700
                             transition-colors
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-blue-500"
          aria-label="New file"
        >
          📄
        </button>
      </Tooltip>

      <Tooltip content="Open folder" side="top">
        <button
          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800
                             flex items-center justify-center text-lg
                             hover:bg-gray-200 dark:hover:bg-gray-700
                             transition-colors
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-blue-500"
          aria-label="Open folder"
        >
          📂
        </button>
      </Tooltip>

      <Tooltip content="Permanently delete — cannot be undone" side="top">
        <button
          className="size-9 rounded-xl bg-red-50 dark:bg-red-900/20
                             flex items-center justify-center text-lg
                             hover:bg-red-100 dark:hover:bg-red-900/40
                             transition-colors
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-red-400"
          aria-label="Delete permanently"
        >
          🗑️
        </button>
      </Tooltip>
    </div>
  );
}

// ─── Rich tooltip with compound API
export function RichTooltipDemo() {
  return (
    <TooltipCompound.Root>
      <TooltipCompound.Trigger
        className="inline-flex items-center gap-1.5 text-sm text-blue-600
                    dark:text-blue-400 underline underline-offset-2
                    cursor-help focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-blue-500
                    focus-visible:rounded"
      >
        What is a webhook? ℹ️
      </TooltipCompound.Trigger>
      <TooltipCompound.Content side="right" align="start">
        <p className="font-semibold mb-1">Webhooks</p>
        <p className="text-xs opacity-80 leading-relaxed">
          A webhook sends a POST request to your URL when an event occurs.
          Useful for real-time integrations.
        </p>
        <a
          href="/docs/webhooks"
          className="block text-xs mt-2 underline opacity-60
                       hover:opacity-100 transition-opacity"
        >
          Read documentation →
        </a>
      </TooltipCompound.Content>
    </TooltipCompound.Root>
  );
}
```

---

## W — Why It Matters

- `Tooltip.Provider` is essential for the "instant subsequent tooltip" pattern — after a user hovers the first tooltip and it shows with the configured delay (e.g., 500ms), subsequent tooltips open instantly while the mouse stays active. Without Provider, every tooltip would have an independent delay, making rapid exploration of a toolbar feel slow and broken.
- Tooltips must be read-only — placing interactive content (buttons, links) inside a tooltip creates accessibility problems. Screen readers cannot focus inside a tooltip. Keyboard users cannot Tab into it. If the content needs interaction, use `Popover` instead.
- `aria-describedby` is auto-wired by Base UI between `Tooltip.Trigger` and `Tooltip.Popup` — screen readers announce the tooltip content after announcing the trigger's accessible name. You get this for free without manually managing `id` attributes.

---

## I — Interview Q&A

### Q1: What is `Tooltip.Provider` and why must it wrap the application rather than each individual tooltip?

**A:** `Tooltip.Provider` creates a shared context for all tooltips within it, enabling the "group delay" behaviour — after a user hovers a tooltip and it opens with the initial delay, all subsequent tooltip triggers open instantly as long as the mouse remains in motion. If each tooltip had its own independent delay, a user hovering across a toolbar would wait 500ms for every single icon's tooltip, making rapid exploration feel sluggish. Provider wraps at the layout level (once) so the delay state is shared across the entire app. It also allows consistent delay/closeDelay configuration in one place rather than repeating it on every tooltip.

### Q2: A tooltip shows on hover but a screen reader user never encounters it — how do you fix this?

**A:** Base UI automatically handles this — `Tooltip.Trigger` gets `aria-describedby` pointing to `Tooltip.Popup`'s `id`. When a screen reader user Tabs to the trigger, the screen reader reads the trigger's accessible name and then reads the tooltip content as its description. So a button with `aria-label="Delete"` and a tooltip containing "Permanently delete — cannot be undone" is announced as "Delete, button — Permanently delete, cannot be undone". No extra work is required from you; ensure the trigger has an accessible name (`aria-label` for icon buttons) and the tooltip content is descriptive.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting interactive content (buttons, links) inside a Tooltip

```tsx
{
  /* ❌ Interactive content in tooltip — inaccessible, focus cannot enter */
}
<Tooltip.Root>
  <Tooltip.Trigger>Help</Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Positioner>
      <Tooltip.Popup>
        Need help? <a href="/docs">Read the docs</a>{" "}
        {/* ❌ unreachable by keyboard */}
      </Tooltip.Popup>
    </Tooltip.Positioner>
  </Tooltip.Portal>
</Tooltip.Root>;
```

**Fix:** Use `Popover` for interactive floating content:

```tsx
{
  /* ✅ Popover for interactive content */
}
<Popover.Root>
  <Popover.Trigger>Help</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner>
      <Popover.Popup className="p-4">
        Need help?{" "}
        <a href="/docs" className="text-blue-600 underline">
          Read the docs
        </a>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>;
```

### ❌ Pitfall: Using `delay={0}` everywhere — tooltips flash on every accidental hover

```tsx
{/* ❌ Instant tooltips feel noisy — every hover triggers them */}
<Tooltip.Root delay={0}>
```

**Fix:** Use Provider-level delay (400–600ms) as default. Only override to `delay={0}` for intentional instant tooltips like status indicators:

```tsx
{
  /* ✅ Provider sets sensible default — individual overrides where justified */
}
<TooltipProvider delay={500} closeDelay={100}>
  {/* ...all tooltips inherit 500ms delay */}
</TooltipProvider>;

{
  /* Override: status badge — user is deliberately hovering */
}
<Tooltip content="3 active deployments" delay={0}>
  <StatusBadge />
</Tooltip>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<ToolbarWithTooltips>` — a row of 5 icon buttons, each with a tooltip, using `Tooltip.Provider`. Requirements:

1. All tooltips show on hover AND keyboard focus with 400ms delay via Provider
2. Each button has `aria-label` matching the tooltip content
3. A disabled button shows a tooltip explaining why it's disabled
4. One button shows a rich tooltip with a keyboard shortcut displayed
5. Tooltips positioned `side="bottom"` with an arrow

### Solution

```tsx
// src/components/toolbar-with-tooltips.tsx
'use client'

import * as TooltipPrimitive from '@base-ui/react/tooltip'
import { cn }                from '@/lib/cn'

// ─── Simple tooltip helper (inline for brevity)
function TT({
  label, shortcut, disabled, disabledReason, children
}: {
  label:          string
  shortcut?:      string
  disabled?:      boolean
  disabledReason?: string
  children:       React.ReactElement
}) {
  const content = (
    <span className="flex items-center gap-2">
      {disabled ? disabledReason ?? 'Unavailable' : label}
      {shortcut && !disabled && (
        <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono
                         bg-white/20 border border-white/30">
          {shortcut}
        </kbd>
      )}
    </span>
  )

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="bottom" sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium',
              'bg-gray-900 text-white shadow-lg z-[60]',
              'flex items-center gap-2',
              'transition-all duration-150 origin-[--transform-origin]',
              'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
              'data-[ending-style]:opacity-0   data-[ending-style]:scale-95'
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

const TOOLS = [
  { icon: '📄', label: 'New file',  shortcut: '⌘N',  disabled: false },
  { icon: '💾', label: 'Save',      shortcut: '⌘S',  disabled: false },
  { icon: '📋', label: 'Copy',      shortcut: '⌘C',  disabled: false },
  { icon: '↩️', label: 'Undo',      shortcut: '⌘Z',  disabled: false },
  { icon: '↪️', label: 'Redo',      shortcut: '⌘⇧Z', disabled: true,
    disabledReason: 'Nothing to redo' }
]

export function ToolbarWithTooltips() {
  return (
    {/* Provider at component scope (move to layout.tsx in a real app) */}
    <TooltipPrimitive.Provider delay={400} closeDelay={100}>
      <div className="inline-flex items-center gap-1 p-1.5
                       bg-white dark:bg-gray-800 border border-gray-200
                       dark:border-gray-700 rounded-2xl shadow-sm">
        {TOOLS.map(tool => (
          <TT
            key={tool.label}
            label={tool.label}
            shortcut={tool.shortcut}
            disabled={tool.disabled}
            disabledReason={tool.disabledReason}
          >
            <button
              aria-label={tool.label}
              disabled={tool.disabled}
              className={cn(
                'size-9 rounded-xl flex items-center justify-center text-base',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                tool.disabled
                  ? 'opacity-35 cursor-not-allowed text-gray-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'  +
                    ' dark:hover:bg-gray-700 hover:text-gray-900' +
                    ' dark:hover:text-white'
              )}
            >
              {tool.icon}
            </button>
          </TT>
        ))}
      </div>
    </TooltipPrimitive.Provider>
  )
}
```

---

---

# 12 — Toast / Notifications — Toast Pattern with Base UI Primitives

---

## T — TL;DR

`@base-ui/react/toast` provides a full toast notification system — a `useToast` hook, `Viewport` for rendering toasts, and individual `Root`/`Title`/`Description`/`Close`/`Action` anatomy. Toasts are live regions announced by screen readers automatically.

---

## K — Key Concepts

### Toast Anatomy

```tsx
{
  /* ─── Full anatomy */
}
import * as Toast from "@base-ui/react/toast";

{
  /* 1. ToastProvider — wraps the app, manages the toast queue */
}
<Toast.Provider>
  {children}
  {/* 2. Viewport — renders the toast stack (fixed position, portalled) */}
  <Toast.Viewport />
</Toast.Provider>;

{
  /* 3. Individual toast — rendered inside Viewport automatically */
}
<Toast.Root>
  <Toast.Title /> {/* Bold heading */}
  <Toast.Description /> {/* Supporting text */}
  <Toast.Action /> {/* Optional CTA button */}
  <Toast.Close /> {/* Dismiss button */}
</Toast.Root>;
```

### Full Toast Implementation

```tsx
// src/components/ui/toast.tsx
"use client";

import * as ToastPrimitive from "@base-ui/react/toast";
import { cn } from "@/lib/cn";

// ─── Provider — wrap app root once
export const ToastProvider = ToastPrimitive.Provider;

// ─── Viewport — where toasts render (add once near app root)
export function ToastViewport({ className }: { className?: string }) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        // Fixed stack in bottom-right corner
        "fixed bottom-4 right-4 z-[100]",
        "flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]",
        // Remove default list styling
        "outline-none",
        className
      )}
    />
  );
}

// ─── Toast variant styles
type ToastVariant = "default" | "success" | "error" | "warning" | "info";

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  success: "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800",
  error: "bg-white dark:bg-gray-800 border-red-200 dark:border-red-800",
  warning: "bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800",
  info: "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  default: "🔔",
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

const VARIANT_TITLE_COLOR: Record<ToastVariant, string> = {
  default: "text-gray-900 dark:text-white",
  success: "text-green-800 dark:text-green-200",
  error: "text-red-800 dark:text-red-200",
  warning: "text-amber-800 dark:text-amber-200",
  info: "text-blue-800 dark:text-blue-200",
};

// ─── Individual toast component
interface ToastItemProps extends ToastPrimitive.Root.Props {
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

export function ToastItem({
  title,
  description,
  variant = "default",
  actionLabel,
  onAction,
  className,
  ...props
}: ToastItemProps) {
  return (
    <ToastPrimitive.Root
      className={cn(
        // Layout
        "flex items-start gap-3 p-4 rounded-2xl",
        "border shadow-lg",
        "w-full pointer-events-auto",
        // Transition — slide in from right + fade
        "transition-all duration-300 ease-out",
        "data-[starting-style]:opacity-0 data-[starting-style]:translate-x-4",
        "data-[ending-style]:opacity-0   data-[ending-style]:translate-x-4",
        // Variant color
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      {/* Icon */}
      <span className="shrink-0 text-xl leading-none mt-0.5">
        {VARIANT_ICONS[variant]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <ToastPrimitive.Title
          className={cn(
            "text-sm font-semibold leading-tight",
            VARIANT_TITLE_COLOR[variant]
          )}
        >
          {title}
        </ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </ToastPrimitive.Description>
        )}
        {/* Action button */}
        {actionLabel && onAction && (
          <ToastPrimitive.Action
            onClick={onAction}
            className="mt-2 text-xs font-semibold text-blue-600
                        dark:text-blue-400 hover:text-blue-800
                        dark:hover:text-blue-300 transition-colors
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:rounded"
          >
            {actionLabel} →
          </ToastPrimitive.Action>
        )}
      </div>

      {/* Close button */}
      <ToastPrimitive.Close
        className="shrink-0 size-6 rounded-lg flex items-center justify-center
                    text-gray-400 dark:text-gray-500 text-xs
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    hover:text-gray-600 dark:hover:text-gray-300
                    transition-colors
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-gray-400"
        aria-label="Dismiss notification"
      >
        ✕
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ─── useToast hook — the imperative API to trigger toasts
export function useToast() {
  const { add } = ToastPrimitive.useToastManager();

  return {
    toast: (options: Omit<ToastItemProps, keyof ToastPrimitive.Root.Props>) => {
      add({
        // Render the ToastItem with our styled component
        render: (props) => <ToastItem {...props} {...options} />,
        timeout: 5000,
      });
    },
    success: (title: string, description?: string) =>
      add({
        render: (props) => (
          <ToastItem
            {...props}
            title={title}
            description={description}
            variant="success"
          />
        ),
        timeout: 4000,
      }),
    error: (title: string, description?: string) =>
      add({
        render: (props) => (
          <ToastItem
            {...props}
            title={title}
            description={description}
            variant="error"
          />
        ),
        timeout: 6000,
      }),
    warning: (title: string, description?: string) =>
      add({
        render: (props) => (
          <ToastItem
            {...props}
            title={title}
            description={description}
            variant="warning"
          />
        ),
        timeout: 5000,
      }),
    info: (title: string, description?: string) =>
      add({
        render: (props) => (
          <ToastItem
            {...props}
            title={title}
            description={description}
            variant="info"
          />
        ),
        timeout: 4000,
      }),
  };
}
```

### Provider + Viewport in Layout

```tsx
// src/app/layout.tsx
import * as ToastPrimitive from "@base-ui/react/toast";
import { ToastViewport } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastPrimitive.Provider>
          {children}
          {/* Viewport renders all active toasts — one instance per app */}
          <ToastViewport />
        </ToastPrimitive.Provider>
      </body>
    </html>
  );
}
```

### Usage — Triggering Toasts

```tsx
// src/components/toast-demo.tsx
"use client";

import { useToast } from "@/components/ui/toast";

export function ToastDemo() {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-3 p-6">
      <button
        onClick={() =>
          toast.success("Changes saved", "Your profile has been updated.")
        }
        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-green-700 transition-colors"
      >
        Success toast
      </button>

      <button
        onClick={() => toast.error("Upload failed", "File exceeds 10MB limit.")}
        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-red-700 transition-colors"
      >
        Error toast
      </button>

      <button
        onClick={() =>
          toast.warning(
            "Storage almost full",
            "You are using 92% of your storage."
          )
        }
        className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold
                    rounded-xl hover:bg-amber-600 transition-colors"
      >
        Warning toast
      </button>

      <button
        onClick={() =>
          toast.toast({
            title: "Deployment started",
            description: "v1.2.3 is being deployed to production.",
            variant: "info",
            actionLabel: "View logs",
            onAction: () => console.log("View logs clicked"),
          })
        }
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-blue-700 transition-colors"
      >
        Info + action toast
      </button>
    </div>
  );
}
```

---

## W — Why It Matters

- `Toast.Viewport` is an ARIA live region — screen readers announce new toasts automatically when they appear. This means users with visual impairments get the same feedback as sighted users without any extra work on your part.
- The imperative `useToast()` hook pattern (call `toast.success(...)` from event handlers) is superior to state-driven toast arrays because toasts are fire-and-forget notifications, not part of the render tree's data model. Keeping them in a queue managed by `ToastProvider` rather than in `useState` means they survive component unmounts and can be triggered from async callbacks.
- `timeout` on each toast ensures toasts auto-dismiss — leaving toasts on screen indefinitely creates visual clutter and can block interactive content on smaller screens. 4–6 seconds is the standard range, with longer timeouts for error toasts that may require action.

---

## I — Interview Q&A

### Q1: Why is a toast notification accessible without extra ARIA attributes, and what does Base UI handle automatically?

**A:** `Toast.Viewport` renders as an ARIA live region (`aria-live="polite"` for default/success/info, `aria-live="assertive"` for errors) which instructs screen readers to announce any new content added to it. When a toast appears, its `Toast.Title` and `Toast.Description` text is read aloud immediately without the user needing to navigate to it. Base UI manages the live region role, the toast role (`role="status"` or `role="alert"`), and the announcement timing. You only need to ensure the title and description text is meaningful and concise.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Placing `ToastViewport` inside a component that unmounts — toasts disappear

```tsx
{
  /* ❌ Viewport inside a page component — unmounts when navigating */
}
export default function DashboardPage() {
  return (
    <>
      <DashboardContent />
      <ToastViewport /> {/* ← unmounts on navigation — active toasts vanish */}
    </>
  );
}
```

**Fix:** Place `ToastViewport` and `ToastProvider` in `layout.tsx` — they persist across page navigations:

```tsx
{
  /* ✅ In root layout — persists across all routes */
}
export default function RootLayout({ children }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastViewport /> {/* ← always mounted */}
    </ToastPrimitive.Provider>
  );
}
```

### ❌ Pitfall: Triggering toasts from Server Components — `useToast` is client-only

```tsx
{/* ❌ Cannot use useToast in a Server Component */}
export default async function ServerPage() {
  const toast = useToast()  // ← Error: hooks don't work in Server Components
```

**Fix:** Move the toast trigger into a `'use client'` component:

```tsx
{
  /* ✅ Client component handles user interaction and toast */
}
("use client");
export function DeleteButton({ id }: { id: string }) {
  const toast = useToast();
  async function handleDelete() {
    await deleteItem(id);
    toast.success("Item deleted");
  }
  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SaveFormButton>` that:

1. Calls a mock async `saveForm()` API
2. Shows an info toast when save starts: "Saving changes…"
3. On success: shows success toast with action "View history"
4. On error: shows error toast with action "Retry" that re-triggers the save
5. Prevents double-submission while saving (`disabled` during load)
6. Uses the `useToast` hook

### Solution

```tsx
// src/components/save-form-button.tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

// Mock async API
async function saveForm(): Promise<void> {
  await new Promise((resolve, reject) =>
    setTimeout(
      () =>
        Math.random() > 0.3
          ? resolve(undefined)
          : reject(new Error("Network error")),
      1500
    )
  );
}

export function SaveFormButton() {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    toast.info("Saving changes…", "Your form data is being saved.");

    try {
      await saveForm();
      toast.success("Changes saved", "Your form has been saved successfully.");
    } catch {
      toast.toast({
        title: "Save failed",
        description: "Unable to save. Please check your connection.",
        variant: "error",
        actionLabel: "Retry",
        onAction: handleSave,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={cn(
        "inline-flex items-center gap-2",
        "px-6 py-2.5 rounded-xl text-sm font-semibold text-white",
        "transition-all duration-150 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        saving ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
      )}
    >
      {saving && <span className="animate-spin text-sm leading-none">⟳</span>}
      {saving ? "Saving…" : "Save changes"}
    </button>
  );
}
```

---

---

# 13 — Transitions — CSS Open/Close Animations with `data-[state]`

---

## T — TL;DR

Base UI exposes `data-[starting-style]` (initial enter state) and `data-[ending-style]` (final exit state) on floating components, enabling pure CSS transitions for open/close animations — no animation libraries needed. The pattern: define the animated-FROM state in `data-[starting-style]:` and the animated-TO state in `data-[ending-style]:`, with a CSS `transition` between.

---

## K — Key Concepts

### How Base UI Transitions Work

```
Normal CSS transitions need a FROM state and a TO state.
For popups, the challenge is: how do you set the initial state
BEFORE the element renders, and the final state BEFORE it unmounts?

Base UI solves this with two data attributes:

data-[starting-style]:  Applied on the FIRST frame the element mounts
                        → defines the FROM state for the enter transition
                        → CSS transitions FROM this TO the element's base styles

data-[ending-style]:    Applied just BEFORE the element unmounts
                        → defines the TO state for the exit transition
                        → CSS transitions FROM base styles TO this
                        → Base UI keeps the element in the DOM until the
                           transition ends, then removes it
```

```tsx
{
  /* ─── The complete transition recipe */
}
<Popup
  className="
    {/* 1. Always-applied base (the visible state) */}
    opacity-100 scale-100 translate-y-0

    {/* 2. Transition properties — what to animate and how */}
    transition-all duration-200 ease-out

    {/* 3. Enter FROM state — data-[starting-style] is the initial frame */}
    data-[starting-style]:opacity-0
    data-[starting-style]:scale-95
    data-[starting-style]:translate-y-[-4px]

    {/* 4. Exit TO state — data-[ending-style] is the final frame */}
    data-[ending-style]:opacity-0
    data-[ending-style]:scale-95
    data-[ending-style]:translate-y-[-4px]
  "
/>;
```

### Direction-Aware Transitions Using `data-[side]`

```tsx
{/* ─── Positioner sets data-side on the popup */}
{/* Use it to animate in the correct direction */}

<Popup className="
  transition-all duration-200 ease-out

  {/* Slide from above when appearing below trigger */}
  data-[side=bottom]:data-[starting-style]:translate-y-[-8px]
  data-[side=bottom]:data-[ending-style]:translate-y-[-8px]

  {/* Slide from below when appearing above trigger */}
  data-[side=top]:data-[starting-style]:translate-y-[8px]
  data-[side=top]:data-[ending-style]:translate-y-[8px]

  {/* Slide from right when appearing left of trigger */}
  data-[side=left]:data-[starting-style]:translate-x-[8px]
  data-[side=left]:data-[ending-style]:translate-x-[8px]

  {/* Slide from left when appearing right of trigger */}
  data-[side=right]:data-[starting-style]:translate-x-[-8px]
  data-[side=right]:data-[ending-style]:translate-x-[-8px]

  data-[starting-style]:opacity-0
  data-[ending-style]:opacity-0
">
```

### `origin-[--transform-origin]` — Correct Scale Origin

```tsx
{/* ─── Base UI sets --transform-origin CSS variable on the positioner */}
{/* This ensures scale() animations grow from the correct corner/edge */}
{/* relative to the trigger, not always from the center */}

<Popup className="
  transition-all duration-200 ease-out

  {/* Use the CSS variable set by Positioner for correct scale origin */}
  origin-[--transform-origin]

  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">
```

### Common Transition Recipes

```tsx
// ─── Recipe 1: Fade + scale (Popover, Menu, Select)
const FADE_SCALE = `
  transition-all duration-200 ease-out
  origin-[--transform-origin]
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
`;

// ─── Recipe 2: Fade + slide down (Tooltip, small popups)
const FADE_SLIDE_DOWN = `
  transition-all duration-150 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:-translate-y-1
  data-[ending-style]:opacity-0   data-[ending-style]:-translate-y-1
`;

// ─── Recipe 3: Fade only (Dialog backdrop)
const FADE_ONLY = `
  transition-opacity duration-200
  data-[starting-style]:opacity-0
  data-[ending-style]:opacity-0
`;

// ─── Recipe 4: Slide up from bottom (mobile sheets, bottom sheets)
const SLIDE_UP = `
  transition-all duration-300 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:translate-y-4
  data-[ending-style]:opacity-0   data-[ending-style]:translate-y-4
`;

// ─── Recipe 5: Dialog popup — scale + slide up slightly
const DIALOG_POPUP = `
  transition-all duration-200 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[starting-style]:-translate-x-1/2 data-[starting-style]:-translate-y-[calc(50%-8px)]
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
`;

// ─── Recipe 6: Toast — slide in from right
const TOAST_SLIDE = `
  transition-all duration-300 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:translate-x-4
  data-[ending-style]:opacity-0   data-[ending-style]:translate-x-4
`;
```

### Animating `Dialog.Backdrop` Separately from `Dialog.Popup`

```tsx
{/* ─── Backdrop and popup can have different transitions */}
{/* Backdrop: simple fade */}
{/* Popup: scale + fade */}

<Dialog.Backdrop
  className="
    fixed inset-0 bg-black/50 backdrop-blur-sm z-40
    transition-opacity duration-300
    data-[starting-style]:opacity-0
    data-[ending-style]:opacity-0
  "
/>

<Dialog.Popup
  className="
    fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
    w-full max-w-lg z-50
    bg-white dark:bg-gray-800 rounded-2xl shadow-2xl

    transition-all duration-200 ease-out
    origin-center
    data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.97]
    data-[starting-style]:-translate-x-1/2
    data-[starting-style]:-translate-y-[calc(50%-6px)]
    data-[ending-style]:opacity-0   data-[ending-style]:scale-[0.97]
  "
/>
```

### Respecting `prefers-reduced-motion`

```tsx
{
  /* ─── Disable animations for users who prefer reduced motion */
}
{
  /* Add to globals.css */
}
```

```css
/* src/app/globals.css */
@media (prefers-reduced-motion: reduce) {
  /* Remove all Base UI popup transitions */
  [data-starting-style],
  [data-ending-style] {
    transition: none !important;
    animation: none !important;
  }
}
```

```tsx
{/* ─── Or use Tailwind's motion-safe: variant on transition classes */}
<Popup className="
  motion-safe:transition-all motion-safe:duration-200
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">
```

---

## W — Why It Matters

- `data-[starting-style]` and `data-[ending-style]` solve the enter/exit animation problem that has plagued React for years — React removes elements from the DOM immediately on state change, so exit animations never played without animation libraries like Framer Motion or React Spring. Base UI keeps the element mounted during the exit transition and removes it only when the CSS transition ends.
- `origin-[--transform-origin]` is the detail that makes scale animations feel polished — without it, a menu that appears below-left of its trigger would scale from the center (visually popping in from the wrong corner). Base UI's Positioner calculates the correct `transform-origin` and exposes it as a CSS variable.
- `prefers-reduced-motion` support is an accessibility requirement for animations — users with vestibular disorders, migraines, or ADHD can be adversely affected by motion. Always add a reduced-motion override.

---

## I — Interview Q&A

### Q1: Why does Base UI use `data-[starting-style]` and `data-[ending-style]` instead of CSS `@keyframes` or `animate-in/animate-out` classes for popup transitions?

**A:** CSS `@keyframes` animations don't respond to transition interruption — if a user hovers in and out rapidly, keyframe animations restart rather than reversing. `data-[starting-style]` works with CSS `transition`, which is interruptible — if the user opens and immediately closes a menu, the transition reverses smoothly from its current position. Additionally, `@keyframes` animations always run at their own speed regardless of the element's current state; CSS transitions interpolate between current and target values, making interrupted animations feel natural. The `data-[starting-style]` hook gives CSS the initial FROM value it needs to start the transition correctly on mount, while `data-[ending-style]` gives the TO value while keeping the element mounted until the transition completes.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Popup snaps open/closed — transition property missing

```tsx
{/* ❌ Starting/ending styles defined but no transition — instant snap */}
<Popup className="
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">
{/* No transition-* class → CSS has a from and to state but no interpolation */}
```

**Fix:** Always pair with `transition-*` classes:

```tsx
{/* ✅ transition-all enables CSS interpolation between states */}
<Popup className="
  transition-all duration-200 ease-out
  data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  data-[ending-style]:opacity-0   data-[ending-style]:scale-95
">
```

### ❌ Pitfall: Scale animation visually pops from wrong corner — missing `origin-[--transform-origin]`

```tsx
{/* ❌ Default transform-origin is "center" — popup appears to grow from middle */}
{/* A bottom-left menu should grow from its top-left corner */}
<Popup className="
  transition-all duration-200
  data-[starting-style]:scale-95
  data-[ending-style]:scale-95
">
```

**Fix:** Use the CSS variable set by the Positioner:

```tsx
{/* ✅ origin-[--transform-origin] — Base UI sets the correct corner */}
<Popup className="
  transition-all duration-200
  origin-[--transform-origin]
  data-[starting-style]:scale-95
  data-[ending-style]:scale-95
">
```

---

## K — Coding Challenge + Solution

### Challenge

Implement 4 distinct transitions for 4 different components on a demo page:

1. **Menu** — fade + scale with `origin-[--transform-origin]`
2. **Dialog** — backdrop fade + popup scale with separate durations (backdrop 300ms, popup 200ms)
3. **Toast** — slides in from the right
4. **Tooltip** — fast directional slide (side-aware) + fade
   All must respect `prefers-reduced-motion`.

### Solution

```css
/* src/app/globals.css — reduced motion override */
@import "tailwindcss";

@media (prefers-reduced-motion: reduce) {
  [data-starting-style],
  [data-ending-style] {
    transition: none !important;
    animation: none !important;
  }
}
```

```tsx
// src/components/transition-showcase.tsx
"use client";

import * as MenuPrimitive from "@base-ui/react/menu";
import * as DialogPrimitive from "@base-ui/react/dialog";
import * as TooltipPrimitive from "@base-ui/react/tooltip";
import * as ToastPrimitive from "@base-ui/react/toast";
import { cn } from "@/lib/cn";

// ─── 1. Menu — fade + scale with correct origin
function TransitionMenu() {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className="px-4 py-2 bg-white dark:bg-gray-800
                                         border border-gray-200 dark:border-gray-700
                                         rounded-xl text-sm font-medium
                                         hover:bg-gray-50 dark:hover:bg-gray-700
                                         transition-colors focus-visible:outline-none
                                         focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Menu (fade + scale) ▾
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner side="bottom" align="start" sideOffset={6}>
          <MenuPrimitive.Popup
            className={cn(
              "min-w-[160px] p-1.5 bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700",
              "rounded-2xl shadow-xl z-50 outline-none",
              // Transition — fade + scale from correct origin
              "motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-out",
              "origin-[--transform-origin]",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0   data-[ending-style]:scale-95"
            )}
          >
            {["Cut", "Copy", "Paste", "Delete"].map((item) => (
              <MenuPrimitive.Item
                key={item}
                className="px-3 py-2 text-sm rounded-xl text-gray-700
                             dark:text-gray-300 cursor-pointer outline-none
                             data-[highlighted]:bg-gray-100
                             dark:data-[highlighted]:bg-gray-700"
              >
                {item}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

// ─── 2. Dialog — backdrop 300ms fade, popup 200ms scale
function TransitionDialog() {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className="px-4 py-2 bg-blue-600 text-white
                                            rounded-xl text-sm font-medium
                                            hover:bg-blue-700 transition-colors
                                            focus-visible:outline-none
                                            focus-visible:ring-2
                                            focus-visible:ring-blue-500
                                            focus-visible:ring-offset-2"
      >
        Dialog (dual transition)
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        {/* Backdrop: 300ms fade */}
        <DialogPrimitive.Backdrop
          className="
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40
          motion-safe:transition-opacity motion-safe:duration-300
          data-[starting-style]:opacity-0
          data-[ending-style]:opacity-0
        "
        />
        {/* Popup: 200ms scale */}
        <DialogPrimitive.Popup
          className="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          z-50 w-full max-w-md mx-4
          bg-white dark:bg-gray-800 rounded-2xl shadow-2xl outline-none
          motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out
          origin-center
          data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.97]
          data-[starting-style]:-translate-x-1/2
          data-[starting-style]:-translate-y-[calc(50%-6px)]
          data-[ending-style]:opacity-0   data-[ending-style]:scale-[0.97]
        "
        >
          <div className="p-6">
            <DialogPrimitive.Title
              className="text-lg font-bold text-gray-900
                                               dark:text-white mb-2"
            >
              Backdrop 300ms, popup 200ms
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-gray-500 mb-4">
              Each part of the dialog has its own independent transition.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              className="px-4 py-2 bg-gray-100
                                               dark:bg-gray-700 rounded-xl
                                               text-sm font-medium
                                               hover:bg-gray-200
                                               dark:hover:bg-gray-600
                                               transition-colors"
            >
              Close
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── 3. Tooltip — fast directional slide + fade
function TransitionTooltip() {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        className="px-4 py-2 bg-purple-600 text-white
                                             rounded-xl text-sm font-medium
                                             hover:bg-purple-700 transition-colors
                                             focus-visible:outline-none
                                             focus-visible:ring-2
                                             focus-visible:ring-purple-500
                                             focus-visible:ring-offset-2"
      >
        Tooltip (directional slide)
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" sideOffset={6}>
          <TooltipPrimitive.Popup
            className="
            px-2.5 py-1.5 rounded-lg text-xs font-medium
            bg-gray-900 text-white shadow-lg z-[60]
            motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-out
            data-[starting-style]:opacity-0
            data-[side=top]:data-[starting-style]:-translate-y-1
            data-[side=bottom]:data-[starting-style]:translate-y-1
            data-[side=left]:data-[starting-style]:-translate-x-1
            data-[side=right]:data-[starting-style]:translate-x-1
            data-[ending-style]:opacity-0
            data-[side=top]:data-[ending-style]:-translate-y-1
            data-[side=bottom]:data-[ending-style]:translate-y-1
          "
          >
            Slides from the correct side ✦
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// ─── Demo page
export function TransitionShowcase() {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center
                     justify-center p-8"
    >
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transition Recipes
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          All transitions use CSS only via{" "}
          <code
            className="font-mono text-xs bg-gray-100 dark:bg-gray-800
                            px-1.5 py-0.5 rounded"
          >
            data-[starting-style]
          </code>{" "}
          and{" "}
          <code
            className="font-mono text-xs bg-gray-100 dark:bg-gray-800
                            px-1.5 py-0.5 rounded"
          >
            data-[ending-style]
          </code>
          . Respects{" "}
          <code
            className="font-mono text-xs bg-gray-100 dark:bg-gray-800
                                     px-1.5 py-0.5 rounded"
          >
            prefers-reduced-motion
          </code>
          .
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <TransitionMenu />
          <TransitionDialog />
          <TransitionTooltip />
        </div>
      </div>
    </div>
  );
}
```

---

---

# 14 — Final Audit — Group 4 Complete; Optional Extensions Overview

---

## T — TL;DR

**Group 4 is complete.** You have covered Next.js 16, Tailwind CSS v4.3, and Base UI v1.4.1 — the full stack for building production-grade, accessible, styled Next.js applications. The optional extensions (i18n, MDX, PWA, Edge patterns) are non-core enhancements for specific project requirements — not prerequisites for shipping.

---

## K — Key Concepts

### Group 4 Curriculum Completion Audit

```
GROUP 4 — Next.js / Tailwind / Base UI (12 days) ✅

Day 9  — Next.js Core Concepts
  ✅ App Router, file-based routing, layouts, pages
  ✅ Server Components vs Client Components ('use client')
  ✅ Data fetching: fetch + cache, revalidation
  ✅ Loading UI, Suspense, error.tsx, not-found.tsx
  ✅ Route handlers (API routes)
  ✅ Metadata API, SEO
  ✅ Image, Font, Link optimisation
  ✅ Middleware, environment variables

Day 10 — Tailwind CSS v4.3 Fundamentals
  ✅ Utility-first mental model, @import "tailwindcss"
  ✅ Layout: flex, grid, position
  ✅ Spacing, sizing, aspect ratio
  ✅ Typography, colors, borders, shadows
  ✅ Hover/focus/active/disabled states
  ✅ Responsive mobile-first breakpoints
  ✅ Dark mode — class strategy + CSS variables
  ✅ Composing interfaces from primitives

Day 11 — Tailwind Advanced Patterns
  ✅ Arbitrary values [value] and arbitrary properties [property:value]
  ✅ Complex selectors: *, has-[], not-[], is-[], &
  ✅ Named groups group/{name}
  ✅ data-[attribute=value]: variants
  ✅ @theme {} extension strategy
  ✅ Duplication control + component extraction
  ✅ cn() + tailwind-merge conflict resolution
  ✅ !important modifier
  ✅ Prefixing for namespace isolation

Day 12 — Base UI Integration
  ✅ @base-ui/react setup, headless philosophy
  ✅ Accessibility-first composition
  ✅ Anatomy pattern: Root/Trigger/Portal/Positioner/Popup
  ✅ data-[state]:, data-[highlighted]:, data-[selected]: styling
  ✅ Popover, Dialog, Menu, Select, Tabs, Tooltip, Toast
  ✅ CSS transitions with data-[starting-style] / data-[ending-style]

RESULT: GROUP 4 IS COMPLETE ✅
```

### What You Can Build Now

```
With Group 4 complete, you can build:

✅ Full Next.js applications with App Router and Server Components
✅ Accessible UI component libraries (popover, dialog, menu, select, tabs, tooltip, toast)
✅ Design systems with Tailwind CSS v4.3 + semantic @theme tokens
✅ Dark mode with CSS variable strategy and no flash of unstyled content
✅ Complex responsive layouts (sidebar, kanban, data tables, dashboards)
✅ Floating UI (menus, tooltips, dropdowns) positioned correctly
✅ Form-heavy pages with accessible, styleable inputs
✅ Embeddable widgets with Tailwind prefixing
✅ Animated UI with CSS-only enter/exit transitions
✅ WCAG-compliant components (focus management, ARIA, keyboard navigation)
```

### Optional Extensions — Overview

```
These are non-core — add them when your specific project needs them.
No order is prescribed. Each is a self-contained addition.

1. i18n (Internationalisation)
   Library:   next-intl or next-i18next
   When:      Multi-language product
   Adds:      Locale routing, message catalogs, RTL support,
              pluralisation, date/number formatting per locale
   Est. time: 1–2 days

2. MDX (Markdown + JSX)
   Library:   @next/mdx or contentlayer
   When:      Blog, documentation site, content-heavy pages
   Adds:      .mdx files as pages, custom components in Markdown,
              syntax highlighting, table of contents generation
   Est. time: 0.5–1 day

3. PWA (Progressive Web App)
   Library:   next-pwa or @ducanh2912/next-pwa
   When:      Offline support, installable app, mobile-first
   Adds:      Service worker, offline caching, web app manifest,
              install prompts, push notifications
   Est. time: 0.5–1 day

4. Edge Patterns (Edge Runtime / Edge Middleware)
   Built-in:  Next.js Edge Runtime
   When:      Geo-routing, A/B testing at edge, auth middleware,
              ultra-low latency API routes
   Adds:      Edge-compatible middleware, edge route handlers,
              edge-compatible ORMs (Prisma Accelerate, Neon HTTP)
   Est. time: 1 day

5. Advanced Image Optimisation
   Built-in:  next/image extended patterns
   When:      Media-heavy sites, art direction, responsive images
   Adds:      Blur placeholder generation, custom loaders,
              responsive srcset, WebP/AVIF format control
   Est. time: 0.5 day

6. Analytics and Monitoring
   Libraries: @vercel/analytics, Sentry, PostHog
   When:      Production apps needing observability
   Adds:      Page view tracking, error monitoring, session replay,
              feature flag integration
   Est. time: 0.5 day
```

### Group 4 → Group 5 Transition

```
What you learned in Group 4 (Next.js / Tailwind / Base UI) feeds directly into:

Group 5 — RHF / Zod / date-fns (8 days)
  → React Hook Form: build the forms that go inside your Dialog components
  → Zod: validate the data from those forms with type-safe schemas
  → date-fns: format and manipulate dates in your components

The Base UI inputs (Select, Checkbox, Switch, Slider) integrate with
React Hook Form via the Controller API — you will use both together.

Group 5 starts tomorrow. The bridge:
  Dialog + Form (RHF) = the standard pattern for forms in modals
  Select (Base UI) + Controller (RHF) = accessible custom selects in forms
  Zod schema + RHF resolver = end-to-end validated, typed forms
```

### The One-Page Cheat Sheet — Group 4

```
NEXT.JS 16 (App Router)
  Routing:         app/ directory, page.tsx, layout.tsx, loading.tsx, error.tsx
  Components:      Server Component (default), Client Component ('use client')
  Fetch:           fetch(url, { next: { revalidate: 60 } }) in Server Components
  Navigation:      useRouter() (client), redirect() (server)
  Metadata:        export const metadata: Metadata = { title, description }
  Image:           <Image src fill sizes> — always specify sizes
  Font:            next/font/google — zero CLS, self-hosted
  Middleware:      middleware.ts at project root, export config.matcher

TAILWIND CSS v4.3
  Setup:           @import "tailwindcss" in globals.css — one line
  Config:          @theme {} in CSS — no tailwind.config.js needed
  Dark mode:       @variant dark (&:where(.dark,.dark *)) — class strategy
  CSS vars:        bg-[--color-surface], text-[--color-text]
  Arbitrary:       w-[340px], h-[calc(100vh-3.5rem)], [content-visibility:auto]
  Selectors:       *:, has-[]:, not-[]:, group/{name}, data-[state=]:
  Conflicts:       cn() = twMerge(clsx()) — always on className prop
  Duplication:     Component extraction first, @apply last resort
  !important:      ! prefix — last resort for third-party CSS only

BASE UI v1.4.1
  Install:         npm install @base-ui/react — no CSS needed
  Anatomy:         Root → Trigger → Portal → Positioner → Popup
  State API:       data-[state=open/closed] + data-[highlighted] + data-[selected]
  Transitions:     data-[starting-style]: (enter from) + data-[ending-style]: (exit to)
  Scale origin:    origin-[--transform-origin] — always use with scale transitions
  Components:
    Popover:       floating panel, click to open, click outside to close
    Dialog:        modal, focus trap, body scroll lock, Backdrop + Popup
    Menu:          command list, arrow key nav, typeahead, onSelect not onClick
    Select:        styled dropdown, min-w-[--anchor-width], data-[selected]
    Tabs:          Root → List → Tab → Panel, data-[hidden]:hidden on Panel
    Tooltip:       Provider at layout, read-only only, aria-describedby auto-wired
    Toast:         Provider + Viewport in layout, useToast() hook imperative API
  A11y rules:
    - focus-visible:ring-2 on ALL interactive elements
    - Dialog.Title + Dialog.Description always present
    - aria-label on icon-only buttons
    - Never interactive content in Tooltip — use Popover
    - text-gray-600 minimum for body text on white (contrast)
    - prefers-reduced-motion override in globals.css
```

---

## W — Why It Matters

- Knowing where you are in the curriculum prevents scope creep — the optional extensions exist because different projects need different things. A blog needs MDX but not PWA. A mobile-first app needs PWA but not MDX. Ship without them unless your project explicitly requires them.
- The bridge from Group 4 to Group 5 is real — React Hook Form's `Controller` API is designed specifically to wrap non-native inputs like Base UI's `Select`, `Checkbox`, and `Switch`. Day 12's components become the UI layer for Day 13+'s forms.
- The mental model shift from Group 4 to future groups: you've built the **visual and interaction layer** (Next.js routing + Tailwind styling + Base UI accessibility). Groups 5–7 build the **data and logic layer** (forms, validation, database, auth, testing). Both layers exist simultaneously in a production app.

---

## I — Interview Q&A

### Q1: If a client asks "can you build a production-ready Next.js app with accessible components and a custom design system?", what does Group 4 give you?

**A:** Group 4 covers the complete stack for that deliverable. Next.js 16 provides the application framework — App Router, Server Components, data fetching, SEO metadata, image optimisation, and API routes. Tailwind CSS v4.3 provides the design system layer — semantic design tokens in `@theme {}`, responsive layouts, dark mode via CSS variables, and a complete utility vocabulary. Base UI v1.4.1 provides the accessible component primitives — Popover, Dialog, Menu, Select, Tabs, Tooltip, and Toast with correct ARIA, keyboard navigation, and focus management built in. Together, these enable building any standard web application interface with accessibility, performance, and design system consistency included by default.

### Q2: What are the most common interview questions that test knowledge of the Day 9–12 stack?

**A:**

- **Next.js**: "Explain Server Components vs Client Components and when you'd use each." — RSC by default, Client for hooks/events/browser APIs
- **Next.js**: "How does data fetching work in the App Router?" — `fetch()` with `{ next: { revalidate } }` or `cache: 'no-store'` in Server Components
- **Tailwind**: "How do you handle class conflicts when passing `className` to a component?" — `tailwind-merge` via `cn()` utility
- **Tailwind**: "What does mobile-first mean in Tailwind?" — unprefixed = all sizes, `sm:` = 640px and above
- **Base UI**: "How do you style Base UI components?" — `className` with Tailwind, `data-[state=]:` variants respond to component state
- **Accessibility**: "What accessibility does Base UI provide vs what is your responsibility?" — ARIA/keyboard/focus = Base UI; color contrast/focus rings/labels = you

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Starting optional extensions before completing core Group 4 patterns

```
❌ Jumping to i18n before understanding App Router routing
❌ Adding PWA service workers before the core app is stable
❌ Setting up MDX before knowing how to create basic Next.js pages

Optional extensions built on shaky core foundations create
compounding complexity that's hard to debug.
```

**Fix:** Ship one complete, working feature using core Group 4 patterns before adding any extension. The test: "Can I build a page with Server Component data fetching, a Dialog form, and dark mode support confidently?" If yes — add extensions. If no — consolidate core knowledge first.

---

## K — Coding Challenge + Solution

### Challenge

Build a `<ComponentShowcase>` page that demonstrates ALL Day 12 components on a single screen — Popover, Dialog, Menu, Select, Tabs, Tooltip, and Toast — as a final integration test proving the complete setup works together.

### Solution

```tsx
// src/app/showcase/page.tsx
// Final integration test — all Base UI components on one page

import { ComponentShowcase } from "@/components/component-showcase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Component Showcase — Day 12 Final Audit",
  description: "Base UI + Tailwind CSS v4.3 component integration test",
};

export default function ShowcasePage() {
  return <ComponentShowcase />;
}
```

```tsx
// src/components/component-showcase.tsx
"use client";

import * as PopoverP from "@base-ui/react/popover";
import * as DialogP from "@base-ui/react/dialog";
import * as MenuP from "@base-ui/react/menu";
import * as SelectP from "@base-ui/react/select";
import * as TabsP from "@base-ui/react/tabs";
import * as TooltipP from "@base-ui/react/tooltip";
import * as ToastP from "@base-ui/react/toast";
import { useState } from "react";
import { cn } from "@/lib/cn";

// ─── Shared style tokens
const POPUP =
  "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 outline-none";
const TRANS =
  "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out origin-[--transform-origin] data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95";
const ITEM =
  "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none outline-none transition-colors data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20 data-[highlighted]:text-blue-700 data-[disabled]:opacity-40 data-[disabled]:pointer-events-none";
const BTN =
  "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]";
const BTN_P = `${BTN} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`;
const BTN_S = `${BTN} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:ring-gray-400`;

export function ComponentShowcase() {
  const [selectVal, setSelectVal] = useState("");
  const { add } = ToastP.useToastManager();

  function fireToast(variant: string, title: string, desc: string) {
    add({
      render: (props) => (
        <ToastP.Root
          {...props}
          className={cn(
            "flex items-start gap-3 p-4 rounded-2xl border shadow-lg w-80",
            "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
            "motion-safe:transition-all motion-safe:duration-300",
            "data-[starting-style]:opacity-0 data-[starting-style]:translate-x-4",
            "data-[ending-style]:opacity-0   data-[ending-style]:translate-x-4"
          )}
        >
          <span className="shrink-0 text-xl mt-0.5">
            {variant === "success" ? "✅" : variant === "error" ? "❌" : "ℹ️"}
          </span>
          <div className="flex-1 min-w-0">
            <ToastP.Title className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </ToastP.Title>
            <ToastP.Description className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {desc}
            </ToastP.Description>
          </div>
          <ToastP.Close
            className="shrink-0 size-6 rounded-lg text-xs flex items-center
                                    justify-center text-gray-400 hover:bg-gray-100
                                    dark:hover:bg-gray-700 transition-colors"
          >
            ✕
          </ToastP.Close>
        </ToastP.Root>
      ),
      timeout: 4000,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Day 12 — Component Showcase
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Final integration test — all Base UI primitives styled with Tailwind
            CSS v4.3
          </p>
        </div>

        {/* Grid of components */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* ─── Popover */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Popover
            </p>
            <PopoverP.Root>
              <PopoverP.Trigger className={BTN_S}>
                Open popover
              </PopoverP.Trigger>
              <PopoverP.Portal>
                <PopoverP.Positioner side="bottom" sideOffset={8}>
                  <PopoverP.Popup
                    className={cn(POPUP, TRANS, "p-4 min-w-[220px]")}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      Popover title
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      A floating panel for contextual content.
                    </p>
                  </PopoverP.Popup>
                </PopoverP.Positioner>
              </PopoverP.Portal>
            </PopoverP.Root>
          </div>

          {/* ─── Dialog */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dialog
            </p>
            <DialogP.Root>
              <DialogP.Trigger className={BTN_P}>Open dialog</DialogP.Trigger>
              <DialogP.Portal>
                <DialogP.Backdrop
                  className="fixed inset-0 bg-black/50 z-40
                                              motion-safe:transition-opacity
                                              motion-safe:duration-300
                                              data-[starting-style]:opacity-0
                                              data-[ending-style]:opacity-0"
                />
                <DialogP.Popup
                  className="fixed top-1/2 left-1/2 -translate-x-1/2
                                           -translate-y-1/2 z-50 w-full max-w-md mx-4
                                           bg-white dark:bg-gray-800 rounded-2xl
                                           shadow-2xl outline-none
                                           motion-safe:transition-all
                                           motion-safe:duration-200
                                           data-[starting-style]:opacity-0
                                           data-[starting-style]:scale-[0.97]
                                           data-[starting-style]:-translate-x-1/2
                                           data-[starting-style]:-translate-y-[calc(50%-6px)]
                                           data-[ending-style]:opacity-0
                                           data-[ending-style]:scale-[0.97]"
                >
                  <div className="p-6">
                    <DialogP.Title
                      className="text-lg font-bold text-gray-900
                                               dark:text-white mb-1"
                    >
                      Dialog title
                    </DialogP.Title>
                    <DialogP.Description className="text-sm text-gray-500 mb-5">
                      Focus is trapped inside. Escape key closes it.
                    </DialogP.Description>
                    <div className="flex justify-end gap-3">
                      <DialogP.Close className={BTN_S}>Cancel</DialogP.Close>
                      <DialogP.Close className={BTN_P}>Confirm</DialogP.Close>
                    </div>
                  </div>
                </DialogP.Popup>
              </DialogP.Portal>
            </DialogP.Root>
          </div>

          {/* ─── Menu */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Menu
            </p>
            <MenuP.Root>
              <MenuP.Trigger className={BTN_S}>Open menu ▾</MenuP.Trigger>
              <MenuP.Portal>
                <MenuP.Positioner side="bottom" align="start" sideOffset={6}>
                  <MenuP.Popup
                    className={cn(POPUP, TRANS, "p-1.5 min-w-[160px]")}
                  >
                    {["Edit", "Duplicate", "Archive"].map((item) => (
                      <MenuP.Item key={item} className={ITEM}>
                        {item}
                      </MenuP.Item>
                    ))}
                    <MenuP.Separator className="my-1 h-px bg-gray-100 dark:bg-gray-700" />
                    <MenuP.Item
                      className={cn(
                        ITEM,
                        "text-red-600 dark:text-red-400 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20"
                      )}
                    >
                      Delete
                    </MenuP.Item>
                  </MenuP.Popup>
                </MenuP.Positioner>
              </MenuP.Portal>
            </MenuP.Root>
          </div>

          {/* ─── Select */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Select
            </p>
            <SelectP.Root value={selectVal} onValueChange={setSelectVal}>
              <SelectP.Trigger
                className="flex items-center justify-between gap-2 w-full
                                           px-3 py-2.5 rounded-xl border text-sm
                                           bg-white dark:bg-gray-900
                                           border-gray-300 dark:border-gray-600
                                           text-gray-900 dark:text-white
                                           hover:border-gray-400 transition-colors
                                           cursor-pointer
                                           focus-visible:outline-none focus-visible:ring-2
                                           focus-visible:ring-blue-500
                                           data-[popup-open]:border-blue-500"
              >
                <SelectP.Value
                  placeholder="Select framework…"
                  className="data-[placeholder]:text-gray-400 truncate"
                />
                <span className="shrink-0 text-gray-400 text-xs">▾</span>
              </SelectP.Trigger>
              <SelectP.Portal>
                <SelectP.Positioner sideOffset={6}>
                  <SelectP.Popup
                    className={cn(POPUP, TRANS, "p-1.5 min-w-[--anchor-width]")}
                  >
                    {["Next.js", "Remix", "Astro", "SvelteKit"].map((fw) => (
                      <SelectP.Option
                        key={fw}
                        value={fw}
                        className={cn(
                          ITEM,
                          "data-[selected]:font-semibold data-[selected]:text-blue-700",
                          "dark:data-[selected]:text-blue-300"
                        )}
                      >
                        <span className="flex-1">{fw}</span>
                        <span className="opacity-0 data-[selected]:opacity-100 text-blue-500 text-xs">
                          ✓
                        </span>
                      </SelectP.Option>
                    ))}
                  </SelectP.Popup>
                </SelectP.Positioner>
              </SelectP.Portal>
            </SelectP.Root>
          </div>

          {/* ─── Tabs */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tabs
            </p>
            <TabsP.Root defaultValue="one">
              <TabsP.List
                className="flex gap-1 bg-gray-100 dark:bg-gray-900
                                      p-1 rounded-xl"
              >
                {["one", "two", "three"].map((v) => (
                  <TabsP.Tab
                    key={v}
                    value={v}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg
                                 capitalize text-gray-500 dark:text-gray-400
                                 transition-all cursor-pointer
                                 data-[selected]:bg-white dark:data-[selected]:bg-gray-700
                                 data-[selected]:text-gray-900 dark:data-[selected]:text-white
                                 data-[selected]:shadow-sm
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  >
                    {v}
                  </TabsP.Tab>
                ))}
              </TabsP.List>
              {["one", "two", "three"].map((v) => (
                <TabsP.Panel
                  key={v}
                  value={v}
                  className="data-[hidden]:hidden pt-3 text-xs text-gray-500
                               dark:text-gray-400"
                >
                  Panel {v} — keyboard navigable with arrow keys ✅
                </TabsP.Panel>
              ))}
            </TabsP.Root>
          </div>

          {/* ─── Tooltip + Toast */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border
                            border-gray-200 dark:border-gray-700 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tooltip + Toast
            </p>
            <div className="flex flex-col gap-2">
              <TooltipP.Root>
                <TooltipP.Trigger
                  className={cn(BTN_S, "w-full justify-center")}
                >
                  Hover for tooltip
                </TooltipP.Trigger>
                <TooltipP.Portal>
                  <TooltipP.Positioner side="top" sideOffset={6}>
                    <TooltipP.Popup
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium
                                                bg-gray-900 text-white shadow-lg z-[60]
                                                motion-safe:transition-all motion-safe:duration-150
                                                data-[starting-style]:opacity-0
                                                data-[starting-style]:-translate-y-1
                                                data-[ending-style]:opacity-0
                                                data-[ending-style]:-translate-y-1"
                    >
                      Tooltip content — read only ✓
                      <TooltipP.Arrow className="fill-gray-900" />
                    </TooltipP.Popup>
                  </TooltipP.Positioner>
                </TooltipP.Portal>
              </TooltipP.Root>

              <button
                onClick={() =>
                  fireToast(
                    "success",
                    "Toast fired!",
                    "All components working ✅"
                  )
                }
                className={cn(BTN_P, "w-full justify-center")}
              >
                Fire toast
              </button>
            </div>
          </div>
        </div>

        {/* Completion badge */}
        <div className="text-center py-8">
          <div
            className="inline-flex flex-col items-center gap-3 px-8 py-6
                            bg-white dark:bg-gray-800 rounded-2xl border
                            border-green-200 dark:border-green-800 shadow-sm"
          >
            <span className="text-5xl">🎉</span>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">
              Group 4 Complete
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Next.js 16 · Tailwind CSS v4.3 · Base UI v1.4.1
            </p>
            <p
              className="text-xs text-green-700 dark:text-green-400 font-semibold
                            bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full
                            border border-green-200 dark:border-green-800"
            >
              Ready for Group 5 → RHF / Zod / date-fns
            </p>
          </div>
        </div>
      </div>

      {/* Toast viewport */}
      <ToastP.Viewport
        className="fixed bottom-4 right-4 z-[100]
                                    flex flex-col gap-2 w-80 outline-none"
      />
    </div>
  );
}
```

---

## ✅ Day 12 Complete — Base UI Integration and Final Audit

| #   | Subtopic                                                          | Status |
| --- | ----------------------------------------------------------------- | ------ |
| 1   | Installing @base-ui/react — Setup, Peer Deps, CSS Strategy        | ☐      |
| 2   | Headless Component Philosophy — What It Means and Why It Matters  | ☐      |
| 3   | Accessibility-First Composition — ARIA, Focus, Keyboard Nav       | ☐      |
| 4   | Anatomy-Based Assembly — Root, Trigger, Portal, Positioner, Popup | ☐      |
| 5   | Tailwind Styling for Primitives — `data-[state]`, `cn()`, Base UI | ☐      |
| 6   | Popover — Full Implementation with Tailwind                       | ☐      |
| 7   | Dialog — Modal with Overlay, Focus Trap, Accessible Anatomy       | ☐      |
| 8   | Menu — Dropdown with Items, Groups, Separator                     | ☐      |
| 9   | Select — Controlled Dropdown Select                               | ☐      |
| 10  | Tabs — Tab List, Panels, Keyboard Navigation                      | ☐      |
| 11  | Tooltip — Hover/Focus Tooltip with Delay and Positioning          | ☐      |
| 12  | Toast — Notifications with Base UI Toast Primitives               | ☐      |
| 13  | Transitions — CSS Open/Close Animations with `data-[state]`       | ☐      |
| 14  | Final Audit — Group 4 Complete; Optional Extensions Overview      | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 12

```
SETUP
  Install:         npm install @base-ui/react
  No CSS import:   zero stylesheets — 100% headless
  Providers:       TooltipProvider + ToastProvider in layout.tsx
  Viewport:        <ToastViewport /> once in layout.tsx

HEADLESS PHILOSOPHY
  Base UI gives:   Behaviour + Accessibility
  You give:        100% of visual styling via Tailwind
  State API:       data-* attributes → Tailwind data-[]:  variants
  Controlled:      open/onOpenChange, value/onValueChange
  Uncontrolled:    defaultOpen, defaultValue (Base UI manages)
  render prop:     render={<YourElement />} — render as any element

ANATOMY PATTERN (universal for ALL floating components)
  Root             → state machine + context
  Trigger          → opens it (gets aria-expanded, aria-controls auto)
  Portal           → teleports to <body> → no z-index/overflow trap
  Positioner       → Floating UI positioning (side/align/sideOffset)
  Popup            → visible content (gets aria-modal, role, data-state)
  Arrow            → optional pointing arrow (auto-positioned)

DATA ATTRIBUTES (the styling API)
  data-[state=open]          → floating component is open
  data-[state=closed]        → closing (during exit transition)
  data-[highlighted]         → keyboard/mouse hover on menu/select item
  data-[selected]            → currently selected option
  data-[checked]             → switch/checkbox is on
  data-[disabled]            → item is disabled
  data-[placeholder]         → select showing placeholder
  data-[popup-open]          → trigger when its popup is open
  data-[side=top/bottom...]  → which side the positioner placed the popup
  data-[starting-style]      → initial CSS frame for enter transition
  data-[ending-style]        → final CSS frame for exit transition

COMPONENT SUMMARY
  Popover:    contextual floating panel, interactive OK, click outside closes
  Dialog:     modal, focus trap, body scroll lock, Backdrop + Popup separate
  Menu:       command list, arrow keys, typeahead, onSelect not onClick
  Select:     styled dropdown, min-w-[--anchor-width], data-[selected] ✓ mark
  Tabs:       List → Tab → Panel, data-[hidden]:hidden, arrow key nav
  Tooltip:    Provider at root, read-only only, hover+focus shows, delay via Provider
  Toast:      Provider+Viewport in layout.tsx, useToastManager() imperative add()

TRANSITIONS RECIPE
  Entry:     data-[starting-style]:opacity-0 data-[starting-style]:scale-95
  Exit:      data-[ending-style]:opacity-0   data-[ending-style]:scale-95
  Always:    transition-all duration-200 ease-out
  Scale fix: origin-[--transform-origin] — correct scale origin from positioner
  Direction: data-[side=bottom]:data-[starting-style]:-translate-y-2
  Reduced:   @media (prefers-reduced-motion: reduce) { transition: none !important }

ACCESSIBILITY CHECKLIST
  □ focus-visible:ring-2 focus-visible:ring-blue-500 on every interactive element
  □ Dialog.Title present — screen reader announces on open
  □ Dialog.Description present — context for screen reader users
  □ aria-label on icon-only buttons (no visible text)
  □ Tooltip content is read-only — use Popover for interactive content
  □ text-gray-600 minimum on white (meets WCAG AA contrast)
  □ prefers-reduced-motion override in globals.css
  □ Never suppress Base UI's ARIA attributes

GROUP 4 STATUS
  Day 9  Next.js 16         ✅ Complete
  Day 10 Tailwind v4.3      ✅ Complete
  Day 11 Tailwind Advanced  ✅ Complete
  Day 12 Base UI v1.4.1     ✅ Complete

  → Group 4 COMPLETE ✅
  → Next: Group 5 — RHF / Zod / date-fns (Day 13)
```

---

> **Your next action:** Open your project. Add `@base-ui/react` with `npm install @base-ui/react`. Create `src/lib/cn.ts` with the `cn()` utility. Build one `<Dialog>` wrapper component from the Day 12 pattern. Trigger it from a button click. Verify focus is trapped, Escape closes it, and `Dialog.Title` is present. That's a production-grade accessible modal in under 15 minutes.
>
> _Doing one small thing beats opening a feed._

```tsx
// src/components/settings-tabs.tsx
import { Tabs } from '@/components/ui/tabs'

export function SettingsTabs() {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl
                     border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Tab list */}
      <div className="px-6 pt-4">
        <Tabs.Root defaultValue="security">
          <Tabs
```
