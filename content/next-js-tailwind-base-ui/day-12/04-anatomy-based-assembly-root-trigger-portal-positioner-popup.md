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
