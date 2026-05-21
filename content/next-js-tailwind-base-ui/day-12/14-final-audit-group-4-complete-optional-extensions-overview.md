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
