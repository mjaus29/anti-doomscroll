# 11 — Prefixing — Namespace Isolation for Third-Party and Embedded Tailwind

---

## T — TL;DR

Tailwind's **prefix** configuration adds a custom prefix to every generated utility class — `tw-flex`, `tw-p-4`, `tw-bg-blue-600`. This is essential when embedding Tailwind-styled components into a host page that already has CSS (another framework, legacy styles, or another Tailwind instance) to prevent class name collisions.

---

## K — Key Concepts

### Why Prefixing Exists

```
Problem: You embed a Tailwind-powered widget into:
  - A WordPress site using Bootstrap (which also has .flex, .p-4)
  - A legacy app with custom CSS (which has its own .container, .btn)
  - A host page running a DIFFERENT version of Tailwind
  - A micro-frontend that loads alongside another Tailwind app

Without prefix:
  Your .flex  ↔  their .flex  → collision → one overrides the other
  Your .p-4   ↔  their .p-4   → same name, different or same values
  Your .btn   ↔  their .btn   → unpredictable styles

With prefix "tw-":
  Your .tw-flex  → no collision
  Your .tw-p-4   → no collision
  Their .flex    → unaffected
```

### Configuring a Prefix in Tailwind v4

```css
/* src/app/globals.css */
@import "tailwindcss" prefix(tw);

/* That's it — all generated utilities now have the tw- prefix */

/* Alternative: use a more specific prefix for your library */
@import "tailwindcss" prefix(acme);
/* → .acme-flex, .acme-p-4, .acme-bg-blue-600, etc. */
```

```tsx
{/* ─── With prefix(tw) configured, every utility gets the prefix */}

{/* Without prefix: */}
<div className="flex items-center gap-4 p-6 bg-white rounded-xl">

{/* With prefix(tw): */}
<div className="tw-flex tw-items-center tw-gap-4 tw-p-6 tw-bg-white tw-rounded-xl">

{/* ─── ALL utilities get the prefix */}
<div className="tw-grid tw-grid-cols-3 tw-gap-6">
<p  className="tw-text-xl tw-font-bold tw-text-gray-900">
<button className="tw-hover:tw-bg-blue-700 tw-transition-colors tw-duration-150">
{/* Variants also get the prefix on the utility part */}
<div className="tw-dark:tw-bg-gray-900">
<div className="tw-sm:tw-grid-cols-2">
```

### Prefixed Variants — What Changes and What Doesn't

```tsx
{/* ─── Responsive and state variants: ONLY the utility gets the prefix */}
{/* The variant prefix (sm:, dark:, hover:) stays unchanged */}

{/* Without prefix: */}
<div className="sm:flex dark:bg-gray-900 hover:bg-blue-700">

{/* With prefix(tw): */}
<div className="sm:tw-flex dark:tw-bg-gray-900 hover:tw-bg-blue-700">
{/*              ↑ variant is unchanged, utility gets tw- prefix */}

{/* ─── Arbitrary values still work */}
<div className="tw-w-[340px] tw-h-[calc(100vh-3.5rem)]">

{/* ─── Arbitrary properties still work */}
<div className="tw-[content-visibility:auto]">
{/* → .tw-\[content-visibility\:auto\] { content-visibility: auto } */}
```

### `@apply` with Prefixes

```css
/* src/app/globals.css */
@import "tailwindcss" prefix(tw);

/* When using @apply with a prefix, include the prefix */
@layer components {
  .btn {
    @apply tw-inline-flex tw-items-center tw-px-4 tw-py-2
           tw-font-semibold tw-rounded-xl tw-transition-colors;
  }

  .btn-primary {
    @apply tw-bg-blue-600 tw-text-white tw-hover:tw-bg-blue-700;
  }
}
```

### Real-World Prefixing Scenarios

```tsx
// ─── Scenario 1: Embeddable widget (chat, form, survey)
// Your widget is loaded onto third-party pages via script tag
// The host page has unpredictable CSS — prefix prevents collision

// widget/globals.css
// @import "tailwindcss" prefix(widget);

// widget/ChatWidget.tsx
export function ChatWidget() {
  return (
    <div
      className="widget-fixed widget-bottom-4 widget-right-4
                     widget-z-[9999] widget-w-80 widget-bg-white
                     widget-rounded-2xl widget-shadow-xl
                     widget-border widget-border-gray-200"
    >
      <div
        className="widget-flex widget-items-center widget-justify-between
                       widget-px-4 widget-py-3 widget-border-b
                       widget-border-gray-100 widget-bg-blue-600
                       widget-rounded-t-2xl"
      >
        <span className="widget-font-semibold widget-text-white widget-text-sm">
          Support Chat
        </span>
        <button
          className="widget-text-white/80 widget-hover:widget-text-white
                            widget-transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="widget-p-4 widget-h-64 widget-overflow-y-auto">
        {/* Chat messages */}
      </div>
    </div>
  );
}

// ─── Scenario 2: Design system package consumed by different teams
// Teams may have their own Tailwind instances with different configs
// Prefix prevents the library's classes from conflicting with theirs

// packages/design-system/globals.css
// @import "tailwindcss" prefix(ds);

// Usage in consuming app:
// <ds-Button> internally uses ds-inline-flex ds-px-4 ds-py-2 etc.
// Consuming app uses unprefixed flex px-4 py-2 — no conflict

// ─── Scenario 3: Shadow DOM component
// Custom elements with Shadow DOM have style isolation
// BUT if you use a shared stylesheet (not in Shadow DOM), prefix helps

// ─── Scenario 4: Next.js micro-frontend
// Multiple Next.js apps on the same domain (sub-paths)
// App A: no prefix
// App B: prefix(b) → b-flex, b-p-4
// Both can share the same HTML page without style conflicts
```

### Practical Setup for a Prefixed Component Library

```tsx
// packages/ui/src/globals.css
// @import "tailwindcss" prefix(ui);

// packages/ui/src/components/button.tsx
// ALL utilities have the ui- prefix

import { cn } from "./cn";

// The cn() utility works exactly the same with prefixed classes
// twMerge recognises prefixed Tailwind classes automatically

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base — all with ui- prefix
        "ui-inline-flex ui-items-center ui-justify-center",
        "ui-font-semibold ui-rounded-xl ui-transition-all ui-duration-150",
        "ui-active:ui-scale-[0.98]",
        "focus-visible:ui-outline-none focus-visible:ui-ring-2",
        "focus-visible:ui-ring-offset-2",
        "ui-disabled:ui-opacity-50 ui-disabled:ui-cursor-not-allowed",
        // Variant
        variant === "primary" &&
          "ui-bg-blue-600 ui-text-white hover:ui-bg-blue-700 focus-visible:ui-ring-blue-500",
        variant === "secondary" &&
          "ui-bg-white ui-text-gray-700 ui-border ui-border-gray-300 hover:ui-bg-gray-50",
        variant === "danger" &&
          "ui-bg-red-600 ui-text-white hover:ui-bg-red-700 focus-visible:ui-ring-red-500",
        // Size
        size === "sm" && "ui-px-3 ui-py-1.5 ui-text-xs",
        size === "md" && "ui-px-5 ui-py-2.5 ui-text-sm",
        size === "lg" && "ui-px-7 ui-py-3.5 ui-text-base",
        // Consumer className override
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

### When NOT to Use Prefixes

```
Skip prefixing when:

✅ Building a standard Next.js app (one Tailwind instance, no third-party embedding)
✅ Building a component library consumed in-monorepo (consumers won't add their own Tailwind)
✅ Your app is fully isolated (no external pages, no embedded widgets)

Use prefixing when:

✅ Building an embeddable widget loaded on arbitrary third-party pages
✅ Publishing a component library as an npm package for diverse consumers
✅ Building micro-frontends that share a DOM with other Tailwind apps
✅ Any scenario where your CSS loads alongside CSS you don't control
```

---

## W — Why It Matters

- Tailwind generates short utility names (`flex`, `p-4`, `grid`) that are common CSS class names used by many other frameworks and legacy stylesheets. In an iframe-free embedded context (a widget loaded via `<script>` tag onto an arbitrary host page), class collisions are unavoidable without a prefix.
- Prefixing is the standard solution for publishing Tailwind-based UI component libraries to npm — consumers of the library may have their own Tailwind instance, their own `flex` or `p-4` definitions with different values, or entirely different CSS frameworks. The prefix creates a clean namespace.
- In v4.3, the prefix is set in a single line — `@import "tailwindcss" prefix(tw)` — and applies globally to every generated class. There is no per-utility configuration needed.

---

## I — Interview Q&A

### Q1: What is Tailwind's prefix configuration and when would you use it?

**A:** Adding `prefix(tw)` to the `@import "tailwindcss"` line in `globals.css` prepends `tw-` to every generated utility class — `flex` becomes `tw-flex`, `p-4` becomes `tw-p-4`, `bg-blue-600` becomes `tw-bg-blue-600`. Use it when embedding Tailwind-styled components into environments with existing CSS you don't control — third-party pages where your widget loads via script tag, npm component libraries consumed by apps that may have their own Tailwind or other CSS frameworks, and micro-frontend architectures where multiple independent apps share the same DOM. For standard standalone Next.js apps, prefixing adds boilerplate without benefit.

### Q2: What changes with a Tailwind prefix and what stays the same?

**A:** The generated utility class names gain the prefix — every class in your JSX must include it. Variant prefixes (`sm:`, `dark:`, `hover:`, `focus:`) stay unchanged — only the utility portion gets the prefix, so `dark:bg-gray-900` becomes `dark:tw-bg-gray-900`. Arbitrary values and arbitrary properties still work — `tw-w-[340px]`, `tw-[content-visibility:auto]`. The `@apply` directive requires the prefix — `@apply tw-flex tw-items-center`. The `cn()`/`twMerge` utilities work unchanged — `tailwind-merge` automatically recognises prefixed class groups and resolves conflicts correctly.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting the prefix in `@apply` after enabling it

```css
/* prefix(tw) is configured in globals.css */

@layer components {
  /* ❌ @apply without prefix — classes not found */
  .btn {
    @apply inline-flex items-center px-4 py-2 font-semibold;
    /* Error: class 'inline-flex' not found (it's now 'tw-inline-flex') */
  }
}
```

**Fix:** Include the prefix in every `@apply` call:

```css
@layer components {
  /* ✅ Prefix included in @apply */
  .btn {
    @apply tw-inline-flex tw-items-center tw-px-4 tw-py-2 tw-font-semibold;
  }
}
```

### ❌ Pitfall: Using a prefix in a standard Next.js app — unnecessary boilerplate

```tsx
{
  /* ❌ Prefix adds noise when there's no collision risk */
}
{
  /* This is a standalone Next.js app — no third-party CSS conflict */
}
<div
  className="tw-flex tw-items-center tw-gap-4 tw-p-6 tw-bg-white
                 tw-rounded-xl tw-border tw-border-gray-200"
>
  {/* Every class has tw- for no reason — harder to read, more to type */}
</div>;
```

**Fix:** Only use prefixes when there is a genuine isolation requirement. Standard apps — no prefix:

```tsx
{/* ✅ Clean, unprefixed utilities for standard apps */}
<div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200">
```

### ❌ Pitfall: Mixing prefixed and unprefixed classes in the same project

```tsx
{
  /* ❌ Once you set a prefix, ALL utilities need the prefix */
}
{
  /* Mixing breaks styles — unprefixed classes don't exist in the stylesheet */
}
<div className="tw-flex items-center tw-gap-4 p-6">
  {/* items-center and p-6 generate no CSS — they're not in the stylesheet */}
  {/* Only tw-flex and tw-gap-4 have styles */}
</div>;
```

**Fix:** Use a prefix consistently — every utility in the project needs the prefix:

```tsx
{/* ✅ All utilities consistently prefixed */}
<div className="tw-flex tw-items-center tw-gap-4 tw-p-6">
```

---

## K — Coding Challenge + Solution

### Challenge

Build an embeddable `<FeedbackWidget>` component designed to be loaded on third-party pages:

1. Configure `prefix(widget)` in a separate `widget-globals.css`
2. All utilities must use the `widget-` prefix
3. The widget is fixed to `bottom-4 right-4` with `z-[9999]`
4. It has a toggle button that shows/hides a feedback form
5. The form has a textarea and a submit button — all with `widget-` utilities
6. Uses `data-[open]:` for show/hide state
7. A `widgetCn()` helper (same as `cn()`) that works with prefixed classes

### Solution

```css
/* src/widget/widget-globals.css */
@import "tailwindcss" prefix(widget);

/* Widget-specific base styles */
:root {
  --widget-brand: #2563eb;
  --widget-brand-hover: #1d4ed8;
}

/* Widget container scope — reset to prevent host page interference */
.widget-scope * {
  box-sizing: border-box;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  line-height: 1.5;
}
```

```tsx
// src/lib/widget-cn.ts
// Same as cn() — twMerge works identically with prefixed classes
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function widgetCn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// src/widget/FeedbackWidget.tsx
"use client";

import { useState } from "react";
import { widgetCn } from "@/lib/widget-cn";

type WidgetState = "closed" | "open" | "submitting" | "done";

export function FeedbackWidget() {
  const [state, setState] = useState<WidgetState>("closed");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    await new Promise((res) => setTimeout(res, 1200)); // simulate API
    setState("done");
    setTimeout(() => {
      setState("closed");
      setFeedback("");
      setRating(null);
    }, 2500);
  }

  return (
    // Scope class — resets box-sizing and font from host page
    // Fixed position — does not affect host page layout
    <div
      className="widget-scope widget-fixed widget-bottom-4 widget-right-4
                     widget-z-[9999] widget-flex widget-flex-col widget-items-end
                     widget-gap-3"
    >
      {/* Feedback panel — shown/hidden via data-open */}
      <div
        data-open={state !== "closed"}
        className={widgetCn(
          // Base panel styles — all prefixed
          "widget-w-80 widget-bg-white widget-rounded-2xl",
          "widget-border widget-border-gray-200",
          "widget-shadow-xl",
          "widget-overflow-hidden",
          // Show/hide via data attribute
          "data-[open=false]:widget-hidden",
          "data-[open=true]:widget-block"
        )}
      >
        {/* Header */}
        <div
          className="widget-flex widget-items-center widget-justify-between
                         widget-px-4 widget-py-3
                         widget-bg-blue-600
                         widget-border-b widget-border-blue-700"
        >
          <span className="widget-font-semibold widget-text-white widget-text-sm">
            Share feedback
          </span>
          <button
            onClick={() => setState("closed")}
            className="widget-text-white/70 hover:widget-text-white
                        widget-transition-colors widget-text-lg widget-leading-none
                        widget-p-1 widget-rounded"
            aria-label="Close feedback widget"
          >
            ✕
          </button>
        </div>

        {/* Done state */}
        {state === "done" ? (
          <div
            className="widget-flex widget-flex-col widget-items-center
                           widget-justify-center widget-py-10 widget-px-4
                           widget-text-center widget-gap-2"
          >
            <span className="widget-text-4xl">🎉</span>
            <p className="widget-font-semibold widget-text-gray-900 widget-text-sm">
              Thanks for your feedback!
            </p>
            <p className="widget-text-xs widget-text-gray-500">
              We'll use it to improve the experience.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="widget-p-4 widget-space-y-4">
            {/* Star rating */}
            <div>
              <p
                className="widget-text-xs widget-font-medium widget-text-gray-600
                              widget-mb-2"
              >
                How would you rate your experience?
              </p>
              <div className="widget-flex widget-gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={widgetCn(
                      "widget-text-2xl widget-transition-transform hover:widget-scale-110",
                      "widget-leading-none",
                      star <= (rating ?? 0)
                        ? "widget-text-amber-400"
                        : "widget-text-gray-300"
                    )}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label
                className="widget-block widget-text-xs widget-font-medium
                                  widget-text-gray-600 widget-mb-1.5"
              >
                Tell us more (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What's working well? What could be better?"
                rows={3}
                className="widget-w-full widget-px-3 widget-py-2 widget-text-sm
                             widget-rounded-xl widget-border widget-border-gray-300
                             widget-bg-white widget-text-gray-900
                             widget-placeholder:widget-text-gray-400
                             widget-resize-none
                             focus:widget-outline-none focus:widget-ring-2
                             focus:widget-ring-blue-500 focus:widget-border-transparent
                             widget-transition-colors widget-duration-150"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={state === "submitting" || rating === null}
              data-state={state}
              className="widget-w-full widget-py-2.5 widget-rounded-xl
                           widget-font-semibold widget-text-sm widget-text-white
                           widget-transition-all widget-duration-150
                           data-[state=submitting]:widget-bg-blue-400
                           data-[state=submitting]:widget-cursor-wait
                           data-[state=submitting]:widget-animate-pulse
                           widget-bg-blue-600 hover:widget-bg-blue-700
                           widget-active:widget-scale-[0.98]
                           focus-visible:widget-outline-none
                           focus-visible:widget-ring-2
                           focus-visible:widget-ring-blue-500
                           focus-visible:widget-ring-offset-2
                           widget-disabled:widget-opacity-50
                           widget-disabled:widget-cursor-not-allowed"
            >
              {state === "submitting" ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>

      {/* Toggle button — always visible */}
      <button
        onClick={() => setState((s) => (s === "closed" ? "open" : "closed"))}
        aria-label={state === "closed" ? "Open feedback" : "Close feedback"}
        aria-expanded={state !== "closed"}
        className="widget-size-12 widget-rounded-full widget-bg-blue-600
                     hover:widget-bg-blue-700 widget-text-white widget-text-xl
                     widget-shadow-lg hover:widget-shadow-xl
                     widget-transition-all widget-duration-150
                     widget-flex widget-items-center widget-justify-center
                     widget-active:widget-scale-95
                     focus-visible:widget-outline-none focus-visible:widget-ring-2
                     focus-visible:widget-ring-blue-500 focus-visible:widget-ring-offset-2"
      >
        {state === "closed" ? "💬" : "✕"}
      </button>
    </div>
  );
}
```

---

## ✅ Day 11 Complete — Tailwind CSS v4.3 Advanced Patterns

| #   | Subtopic                                                              | Status |
| --- | --------------------------------------------------------------------- | ------ |
| 1   | Arbitrary Values — `[value]` Syntax, CSS Variables, Calc              | ☐      |
| 2   | Arbitrary Properties — `[property:value]` for Any CSS                 | ☐      |
| 3   | Complex Selectors — `&`, `*`, `has-*`, `not-*`, `is-*`                | ☐      |
| 4   | Named Groups and Nested `group-*` Patterns                            | ☐      |
| 5   | Data-Attribute Styling — `data-*` Variants                            | ☐      |
| 6   | Theme Extension Mindset — When to Extend vs Override vs Use Arbitrary | ☐      |
| 7   | Duplication Control — Recognising and Taming Repeated Utilities       | ☐      |
| 8   | Component Extraction — When, How, and What NOT to Extract             | ☐      |
| 9   | Style Conflict Handling — Specificity, Merging, `cn()`, `twMerge`     | ☐      |
| 10  | `!important` — Forced Overrides and When They Are Justified           | ☐      |
| 11  | Prefixing — Namespace Isolation for Third-Party and Embedded Tailwind | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 11

```
ARBITRARY VALUES  [value]
  Syntax:          utility-[value] — any valid CSS value
  Spaces:          use _ (underscore) for spaces inside brackets
  CSS vars:        bg-[--color-brand], text-[--color-text]
  calc():          h-[calc(100vh-3.5rem)], w-[calc(100%-2rem)]
  min/max/clamp:   text-[clamp(1rem,3vw,2rem)], w-[min(100%,400px)]
  Disambiguation:  text-[length:1.2rem] vs text-[color:#111]
  All variants:    sm:[value], hover:[value], dark:[value] all work ✅
  Rule:            Use named utility if on scale. Arbitrary = off-scale/one-off.

ARBITRARY PROPERTIES  [property:value]
  Syntax:          [css-property:value] — adds entirely new CSS declaration
  Use for:         content-visibility, contain, scroll-snap-*, caret-color,
                   will-change, touch-action, resize, print properties
  CSS vars inline: [--variable:value] — sets CSS custom property via Tailwind
                   Better than style={{}} — participates in dark:/hover: variants
  Spaces:          [scroll-snap-type:x_mandatory] — _ for spaces
  All variants:    hover:[outline:2px_solid_#3b82f6], dark:[color-scheme:dark]
  Rule:            Only for CSS properties with no Tailwind utility equivalent

COMPLEX SELECTORS
  *:               .parent > * { } — styles ALL direct children
  [&_selector]:    .parent selector { } — descendant selector (all depths)
  has-[selector]:  .parent:has(selector) — parent reacts to child state
  not-[selector]:  :not(selector) — style when element doesn't match
  is-[selector]:   :is(selector) — element matches selector
  [.context_&]:    styles element when inside a .context ancestor
  group + group-*: parent-triggered child styles — no JS needed

NAMED GROUPS  group/{name}
  Syntax:          group/card on parent, group-hover/card: on child
  Benefit:         Multiple independent group scopes in same tree
  Supported:       group-hover/ group-focus/ group-active/ group-focus-within/
  named peer:      peer/name + peer-checked/name: — named sibling selectors
  Rule:            Use named groups when nested interactive elements conflict

DATA ATTRIBUTES  data-[attr=value]:
  Syntax:          data-[state=open]:block, data-[active]:bg-blue-600
  Headless UI:     Radix/Base UI emit data-state="open/closed" automatically
  State machines:  Set data-state={state} once → all styles in className
  All variants:    dark:data-[state=open]:bg-gray-800, sm:data-[open]:flex
  vs JS classes:   data-[state=open]: is more semantic, testable, serializable
  Rule:            Prefer data-[state=]: over isOpen && 'class' conditional

THEME EXTENSION
  3 buckets:
    extend   → add to @theme {} — used 3+ times, semantic name
    override → replace a default in @theme {} — you'll NEVER use original
    arbitrary → [value] — one-off, layout-specific, API-driven
  Semantic > literal:
    --color-primary vs --color-blue-600
    --spacing-nav-height vs --spacing-56px
  @theme contents:
    --color-*, --spacing-*, --font-*, --shadow-*, --radius-*, --breakpoint-*
  Rule:            @theme = design system. Arbitrary = escape hatch.

DUPLICATION CONTROL
  Primary tool:    React component extraction + cva for variants
  Middle ground:   Shared class constants in lib/styles.ts
  Last resort:     @apply in @layer components — ONLY for non-JSX contexts
  When to extract: Same structure + classes 3+ times AND clear concept
  cva pattern:     cva('base', { variants: { variant: {}, size: {} } })
  Rule:            Component first. Constant second. @apply third.

COMPONENT EXTRACTION
  Accept className: ALWAYS accept className prop in extracted components
  Merge with:       cn(baseClasses, className) — twMerge resolves conflicts
  Compound:         Card.Root / Card.Header / Card.Body / Card.Footer
  Do NOT extract:   Layout wrappers with no logic, one/two-instance patterns
  Threshold:        3+ identical instances + clear concept = extract
  className test:   Would you want all instances to update together? → extract

cn() + twMerge
  Setup:           import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge'
  cn():            export function cn(...i) { return twMerge(clsx(i)) }
  clsx:            handles conditionals/arrays/objects → flat string
  twMerge:         resolves Tailwind conflicts → last class per group wins
  Key:             p-4 + p-6 → p-6 (not both)
                   p-4 + px-6 → p-4 px-6 (different axes — BOTH kept)
  Custom tokens:   extendTailwindMerge to register custom class groups
  Usage:           cn(base, variant && variantClass, className)
  Rule:            Every component with className prop needs cn() not string concat

!IMPORTANT
  Syntax:          !utility — prefix any utility with !
  Generates:       padding: 1rem !important
  Justified:       Third-party CSS using !important internally
                   CMS/injected inline styles (specificity 1,0,0)
                   Email template resets (email clients inject own CSS)
                   Accessibility: forced-colors: mode
  NOT justified:   Fighting your own CSS (fix with @layer instead)
                   Debugging ("let me just add ! and see")
                   Theming/variant logic (use cva/data-attributes instead)
  Better fix:      @layer base { } — makes YOUR CSS lose to Tailwind utilities
  @layer order:    @layer base < @layer components < @layer utilities < unlayered

PREFIXING
  Syntax:          @import "tailwindcss" prefix(tw) in globals.css
  Effect:          ALL utilities get tw- prefix: flex → tw-flex, p-4 → tw-p-4
  Variants:        sm:tw-flex, dark:tw-bg-gray-900 (variant unchanged, utility prefixed)
  @apply:          Must include prefix: @apply tw-flex tw-items-center
  cn():            Works identically — twMerge recognises prefixed classes
  When needed:     Embeddable widgets on third-party pages
                   npm component libraries for diverse consumers
                   Micro-frontends sharing a DOM
                   Any CSS loaded alongside uncontrolled external CSS
  When NOT needed: Standard standalone Next.js app
                   Monorepo libraries consumed only internally
  Rule:            Prefix when isolation is a genuine requirement, not by default

DECISION FLOWCHART
  Styling problem → Can I use a named utility? → YES → use it
                                               → NO  → arbitrary value [v]

  Need new CSS property? → Does Tailwind have a utility? → YES → use it
                                                         → NO  → [property:value]

  Same class combo 3+ times? → YES → extract React component + cva
                             → NO  → keep inline

  className conflict in component? → YES → use cn() + twMerge
                                   → NO  → plain string is fine

  Third-party CSS overriding Tailwind? → Is it your CSS? → YES → use @layer
                                                          → NO  → use !utility

  Embedding in third-party page? → YES → add prefix(widget) to @import
                                 → NO  → no prefix needed
```

---

> **Your next action:** Open your most-used component (Button, Card, or Input). Check if it accepts a `className` prop. If not, add `className?: string` and wrap the className with `cn(baseClasses, className)`. Install `tailwind-merge` and `clsx` if not already present. Run the app and verify a consumer override like `className="p-8"` correctly overrides the base `p-4` without both being present.
>
> _Doing one small thing beats opening a feed._
