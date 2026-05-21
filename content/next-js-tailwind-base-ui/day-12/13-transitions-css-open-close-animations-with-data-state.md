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
