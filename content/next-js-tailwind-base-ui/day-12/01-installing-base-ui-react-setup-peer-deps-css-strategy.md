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
