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
