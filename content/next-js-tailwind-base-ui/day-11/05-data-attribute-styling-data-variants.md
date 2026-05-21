# 5 — Data-Attribute Styling — `data-*` Variants

---

## T — TL;DR

`data-[attribute]:` and `data-[attribute=value]:` variants apply Tailwind utilities when an HTML element has a specific `data-*` attribute. This is the standard pattern for headless UI libraries (Radix, Base UI, Headless UI) and custom component state machines — avoiding JavaScript class toggling entirely.

---

## K — Key Concepts

### `data-[attr]:` Syntax

```tsx
{
  /* ─── data-[attribute]: — style when attribute EXISTS (any value) */
}
<button
  data-active
  className="data-[active]:bg-blue-600 data-[active]:text-white
                                px-4 py-2 rounded-lg transition-colors"
>
  Active button
</button>;

{
  /* ─── data-[attribute=value]: — style when attribute has SPECIFIC value */
}
<div
  data-state="open"
  className="data-[state=open]:block data-[state=closed]:hidden"
>
  Open content
</div>;

{
  /* ─── Multiple data variants */
}
<button
  data-state="loading"
  className="
    data-[state=idle]:bg-blue-600
    data-[state=loading]:bg-blue-400 data-[state=loading]:cursor-wait
    data-[state=success]:bg-green-600
    data-[state=error]:bg-red-600
    px-6 py-3 text-white font-semibold rounded-xl transition-colors
  "
>
  Submit
</button>;
```

### Integration with Headless UI Libraries

```tsx
{/* ─── Radix UI / Base UI emit data-state attributes automatically */}
{/* You style them with data-[state=*]: variants */}

{/* Radix Accordion */}
<Accordion.Item
  value="item-1"
  className="border-b border-gray-200 dark:border-gray-700"
>
  <Accordion.Trigger
    className="
      flex w-full items-center justify-between px-5 py-4 text-left
      font-semibold text-gray-900 dark:text-white
      hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
      data-[state=open]:text-blue-700 dark:data-[state=open]:text-blue-400
    "
  >
    How does pricing work?
    <span className="text-gray-400
                      data-[state=open]:rotate-180
                      transition-transform duration-200">
      ↓
    </span>
  </Accordion.Trigger>

  <Accordion.Content
    className="
      overflow-hidden text-sm text-gray-600 dark:text-gray-400
      data-[state=open]:animate-slideDown
      data-[state=closed]:animate-slideUp
    "
  >
    <div className="px-5 pb-4 leading-relaxed">
      We offer monthly and annual billing.
    </div>
  </Accordion.Content>
</Accordion.Item>

{/* Radix Dialog overlay */}
<Dialog.Overlay
  className="
    fixed inset-0 bg-black/50 backdrop-blur-sm
    data-[state=open]:animate-in data-[state=open]:fade-in
    data-[state=closed]:animate-out data-[state=closed]:fade-out
    duration-200
  "
/>

{/* Base UI Select */}
<Select.Trigger
  className="
    flex items-center justify-between w-full px-3 py-2 rounded-lg
    border border-gray-300 dark:border-gray-600 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500
    data-[placeholder]:text-gray-400
    data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed
  "
>
```

### Custom State Machine with Data Attributes

```tsx
// src/components/async-button.tsx
// State machine driven by data-state — all styles in Tailwind

"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export function AsyncButton({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const [state, setState] = useState<State>("idle");

  async function handleClick() {
    setState("loading");
    try {
      await onSubmit();
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const labels: Record<State, string> = {
    idle: "Save changes",
    loading: "Saving…",
    success: "✓ Saved!",
    error: "✕ Failed — retry",
  };

  return (
    <button
      data-state={state}
      onClick={handleClick}
      disabled={state === "loading"}
      className="
        relative px-6 py-3 rounded-xl font-semibold text-sm text-white
        transition-all duration-200 overflow-hidden

        data-[state=idle]:bg-blue-600 data-[state=idle]:hover:bg-blue-700
        data-[state=loading]:bg-blue-400 data-[state=loading]:cursor-wait
        data-[state=success]:bg-green-600
        data-[state=error]:bg-red-600 data-[state=error]:hover:bg-red-700

        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:cursor-not-allowed

        active:scale-[0.98]
      "
    >
      {labels[state]}
    </button>
  );
}
```

### Dark Mode + Responsive + State Combinations

```tsx
{
  /* ─── All modifier variants stack on data-* variants */
}

<div
  data-expanded="true"
  className="
    data-[expanded=true]:h-auto data-[expanded=false]:h-0
    sm:data-[expanded=true]:h-auto
    dark:data-[expanded=true]:bg-gray-800
    overflow-hidden transition-all duration-300
  "
>
  Collapsible content
</div>;

{
  /* Sidebar active state */
}
<a
  href="/dashboard"
  data-active="true"
  className="
    flex items-center gap-3 px-3 py-2 rounded-xl text-sm
    transition-colors
    data-[active=true]:bg-blue-600 data-[active=true]:text-white
    data-[active=true]:font-semibold data-[active=true]:shadow-sm
    data-[active=false]:text-gray-600 data-[active=false]:hover:bg-gray-100
    dark:data-[active=false]:text-gray-400
    dark:data-[active=false]:hover:bg-gray-800
  "
>
  Dashboard
</a>;
```

---

## W — Why It Matters

- Data attributes are the standard communication channel between headless UI libraries (Radix UI, Base UI, Headless UI) and your styles — these libraries emit `data-state="open"`, `data-state="closed"`, `data-disabled`, `data-highlighted` etc. automatically based on their internal state machine. Tailwind's `data-[]:` variants let you respond to these with zero JavaScript.
- The `data-state` pattern with `data-[state=loading]:bg-blue-400` is cleaner than conditional class strings — instead of `className={isLoading ? 'bg-blue-400' : 'bg-blue-600'}`, you set `data-state={state}` once and all styles are colocated in the className, each clearly labeled by the state it belongs to.
- Data attributes persist through React re-renders as HTML attributes — they're queryable by CSS, accessible in tests via `getByRole`, serializable as HTML, and usable in CSS `attr()` expressions. They're more semantic than toggled class names for state.

---

## I — Interview Q&A

### Q1: What is the `data-[state=]:` variant in Tailwind and why is it used with headless UI libraries?

**A:** The `data-[state=value]:` variant applies utility classes when an element has a specific `data-state` attribute value — for example, `data-[state=open]:block` shows the element when `data-state="open"`. Headless UI libraries like Radix UI and Base UI manage their own internal state (open/closed, checked/unchecked, focused/disabled) and communicate it to the DOM by setting `data-state`, `data-disabled`, `data-highlighted`, and similar attributes on their component elements. By using `data-[state=open]:` in Tailwind, you can style these states purely in CSS without querying state from the library's API, subscribing to events, or adding JavaScript-driven class toggling.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using JavaScript class toggling when data attributes + Tailwind variants would suffice

```tsx
{/* ❌ JS-driven class toggling — verbose, adds re-renders */}
const [isOpen, setIsOpen] = useState(false)
<div className={`${isOpen ? 'h-auto opacity-100' : 'h-0 opacity-0'} overflow-hidden`}>
```

**Fix:** Use data attributes:

```tsx
{/* ✅ Data attribute drives CSS — no className computation */}
<div
  data-open={isOpen}
  className="data-[open=true]:h-auto data-[open=false]:h-0
              data-[open=true]:opacity-100 data-[open=false]:opacity-0
              overflow-hidden transition-all duration-200"
>
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<StatusButton>` component with 5 states (idle/loading/success/error/disabled) using ONLY data-attribute variants — no conditional className logic. All state visual differences must be in `data-[state=]:` variants.

### Solution

```tsx
// src/components/status-button.tsx
"use client";

import { useState } from "react";

type ButtonState = "idle" | "loading" | "success" | "error" | "disabled";

interface StatusButtonProps {
  label: string;
  onAction: () => Promise<void>;
}

export function StatusButton({ label, onAction }: StatusButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");

  async function handleClick() {
    if (state !== "idle") return;
    setState("loading");
    try {
      await onAction();
      setState("success");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const ICONS: Record<ButtonState, string> = {
    idle: "→",
    loading: "⟳",
    success: "✓",
    error: "✕",
    disabled: "—",
  };

  const LABELS: Record<ButtonState, string> = {
    idle: label,
    loading: "Processing…",
    success: "Done!",
    error: "Failed — try again",
    disabled: "Unavailable",
  };

  return (
    <button
      data-state={state}
      onClick={handleClick}
      disabled={state === "loading" || state === "disabled"}
      className="
        inline-flex items-center gap-2 px-6 py-3 rounded-xl
        font-semibold text-sm transition-all duration-200 text-white
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-2

        data-[state=idle]:bg-blue-600
        data-[state=idle]:hover:bg-blue-700
        data-[state=idle]:active:scale-[0.98]
        data-[state=idle]:focus-visible:ring-blue-500

        data-[state=loading]:bg-blue-400
        data-[state=loading]:cursor-wait
        data-[state=loading]:animate-pulse

        data-[state=success]:bg-green-600
        data-[state=success]:focus-visible:ring-green-500

        data-[state=error]:bg-red-600
        data-[state=error]:hover:bg-red-700
        data-[state=error]:focus-visible:ring-red-500

        data-[state=disabled]:bg-gray-300 dark:data-[state=disabled]:bg-gray-700
        data-[state=disabled]:text-gray-500 dark:data-[state=disabled]:text-gray-500
        data-[state=disabled]:cursor-not-allowed
      "
    >
      <span
        data-state={state}
        className="
          transition-transform duration-200
          data-[state=loading]:animate-spin
          data-[state=success]:scale-125
        "
      >
        {ICONS[state]}
      </span>
      {LABELS[state]}
    </button>
  );
}
```

---

---
