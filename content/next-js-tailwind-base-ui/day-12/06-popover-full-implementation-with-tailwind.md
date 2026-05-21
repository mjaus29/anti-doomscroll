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
