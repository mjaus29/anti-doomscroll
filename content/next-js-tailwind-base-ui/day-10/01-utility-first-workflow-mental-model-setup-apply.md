# 1 — Utility-First Workflow — Mental Model, Setup, `@apply`

---

## T — TL;DR

**Utility-first** means styling directly in HTML/JSX with single-purpose classes (`flex`, `p-4`, `text-blue-600`) instead of writing CSS. Tailwind v4.3 is configured entirely in CSS via `@import "tailwindcss"` and `@theme {}` — there is no `tailwind.config.js`.

---

## K — Key Concepts

### The Mental Model Shift

```
Traditional CSS (semantic naming):
  HTML:  <button class="btn btn-primary btn-large">Save</button>
  CSS:   .btn { display: inline-flex; align-items: center; ... }
         .btn-primary { background: blue; color: white; ... }
         .btn-large { padding: 12px 24px; font-size: 16px; }

  Problem: you write CSS in two places (HTML + CSS file)
           naming is hard ("is it .btn--primary or .btn-primary?")
           CSS files grow unbounded over time

Utility-first (Tailwind):
  HTML:  <button class="inline-flex items-center px-6 py-3 bg-blue-600
                         text-white font-semibold rounded-xl hover:bg-blue-700">
           Save
         </button>
  CSS:   nothing ← no CSS file needed for this component

  Benefit: ALL styling is in one place (the HTML/JSX)
           no naming decisions to make
           CSS bundle never grows (utilities are shared, not duplicated)
           delete a component → its styles are deleted automatically
```

### Tailwind v4.3 Setup — CSS-First Configuration

```css
/* src/app/globals.css — the ONLY config file you need */

/* Step 1: Import Tailwind — replaces @tailwind base/components/utilities */
@import "tailwindcss";

/* Step 2: Extend the design system in CSS (replaces tailwind.config.js) */
@theme {
  /* Custom colors — accessible as bg-brand-500, text-brand-600, etc. */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  /* Custom spacing — accessible as p-18, gap-18, etc. */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
  --spacing-128: 32rem;

  /* Custom fonts — accessible as font-sans, font-display, font-mono */
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-playfair), Georgia, serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  /* Custom border radius */
  --radius-4xl: 2rem;
  --radius-5xl: 2.5rem;

  /* Custom breakpoints */
  --breakpoint-xs: 30rem; /* 480px  */
  --breakpoint-3xl: 112rem; /* 1792px */

  /* Custom shadows */
  --shadow-glow: 0 0 20px -4px rgb(59 130 246 / 0.5);
}

/* Step 3: Custom utilities (replaces plugins for simple utilities) */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
  .scrollbar-hide {
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

/* Step 4: Base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}
body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
:focus-visible {
  outline: 2px solid theme(--color-brand-500);
  outline-offset: 2px;
}
```

### How Tailwind Generates Classes

```
Tailwind v4 scans your source files at build time
and generates ONLY the CSS for classes you actually use.

Source file contains:
  <div className="flex items-center gap-4 p-6 bg-white rounded-xl">

Generated CSS (only what's used):
  .flex           { display: flex }
  .items-center   { align-items: center }
  .gap-4          { gap: 1rem }
  .p-6            { padding: 1.5rem }
  .bg-white       { background-color: #ffffff }
  .rounded-xl     { border-radius: 0.75rem }

Classes you DON'T use → NOT in the final CSS bundle ✅
Final bundle for most apps: 5-20KB (gzipped) vs 300KB+ for full Bootstrap
```

### The Spacing Scale — Knowing the Numbers

```
Tailwind's default spacing scale: 1 unit = 0.25rem = 4px

| Class | rem    | px  | Visual use case            |
|-------|--------|-----|----------------------------|
| p-0   | 0      | 0   | Reset                      |
| p-0.5 | 0.125  | 2   | Hairline spacing           |
| p-1   | 0.25   | 4   | Tiny gaps                  |
| p-2   | 0.5    | 8   | Icon padding               |
| p-3   | 0.75   | 12  | Small button padding       |
| p-4   | 1      | 16  | Default card padding       |
| p-5   | 1.25   | 20  | Medium spacing             |
| p-6   | 1.5    | 24  | Card padding               |
| p-8   | 2      | 32  | Section padding            |
| p-10  | 2.5    | 40  | Large section              |
| p-12  | 3      | 48  | Hero padding               |
| p-16  | 4      | 64  | Full section               |
| p-20  | 5      | 80  | Page section               |
| p-24  | 6      | 96  | Hero/banner                |

Memorize: p-4 = 16px, p-8 = 32px, p-12 = 48px, p-16 = 64px
```

### `@apply` — When to Extract Repeated Patterns

```css
/* Use @apply SPARINGLY — only for patterns you repeat 10+ times */
/* @apply recreates the "semantic class" problem — defeats utility-first purpose */

/* ✅ Good use of @apply: base element styles repeated everywhere */
@layer components {
  /* Applied to EVERY <button> in the app — not component-specific */
  .btn {
    @apply inline-flex items-center justify-center font-semibold
           rounded-xl transition-all duration-150 focus-visible:ring-2
           focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700
           focus-visible:ring-blue-500;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 border border-gray-200
           hover:bg-gray-50 focus-visible:ring-gray-400;
  }
}

/* ❌ Bad use of @apply: making per-component classes */
/* This defeats the purpose — just use utilities in JSX */
.product-card-title {
  @apply text-lg font-semibold text-gray-900 leading-tight;
}
/* Better: <h3 className="text-lg font-semibold text-gray-900 leading-tight"> */
```

### Tailwind v4 vs v3 — What Changed

```
v3 (old):                          v4 (current):
─────────────────────────────────────────────────────
tailwind.config.js                 @theme {} in CSS
@tailwind base/components/utilities @import "tailwindcss"
theme.extend.colors.brand: {...}   --color-brand-500: #3b82f6 in @theme
arbitrary values: bg-[#1a2b3c]     Still works ✅
JIT (just-in-time)                 Always-on (no separate JIT config)
purge/content: [...]               Automatic content detection ✅
plugins: [...]                     @layer utilities {} in CSS
```

---

## W — Why It Matters

- Utility-first eliminates the "dead CSS" problem — every class in the bundle is used. Traditional CSS files accumulate unused rules over time because there's no automated way to know if a selector is still referenced.
- Tailwind's v4 CSS-first config means your design tokens (colors, spacing, fonts) live in the same CSS file as your global styles — no context switching between a JS config and a CSS file, no need to restart the dev server after config changes.
- `@apply` should be a last resort, not a first instinct — the entire point of Tailwind is to avoid writing CSS. Using `@apply` for component styles recreates the naming problem Tailwind eliminates and increases bundle size by duplicating utility rules.

---

## I — Interview Q&A

### Q1: What is utility-first CSS and what problem does it solve?

**A:** Utility-first CSS means building UIs by composing single-purpose, low-level utility classes directly in your HTML/JSX rather than writing custom CSS. Each class does exactly one thing: `flex` sets `display: flex`, `p-4` sets `padding: 1rem`, `text-blue-600` sets `color: #2563eb`. It solves three problems: naming (you don't name components or states), specificity (all utilities are the same specificity), and dead code (unused classes are never generated). The build process scans source files and outputs only the CSS for classes actually used, resulting in tiny bundles — 5-20KB gzipped for most production apps.

### Q2: What changed in Tailwind CSS v4 compared to v3?

**A:** The biggest change is the shift from JavaScript-based configuration to CSS-first configuration. In v3, you customized Tailwind in `tailwind.config.js`. In v4, you use `@import "tailwindcss"` and `@theme {}` blocks inside your CSS file — custom colors, fonts, spacing, and breakpoints are defined as CSS custom properties. The `@tailwind` directives are replaced with a single import. Content detection is now automatic (no `content: [...]` config needed). The plugin system is replaced by `@layer utilities {}` for custom utilities. All utility class syntax remains the same — the only change is where configuration lives.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing `tailwindcss` in component CSS files

```css
/* ❌ Importing Tailwind in multiple files — duplicates entire framework */
/* button.module.css */
@import "tailwindcss"; /* ← generates full Tailwind CSS again ❌ */
.button {
  @apply px-4 py-2;
}
```

**Fix:** Import Tailwind only in `globals.css`:

```css
/* globals.css — only place */
@import "tailwindcss";

/* button.module.css — use @apply, no @import */
.button {
  @apply px-4 py-2 rounded-lg;
} /* ← works because globals.css imported it ✅ */
```

### ❌ Pitfall: Using `@apply` for one-off styles instead of inline utilities

```css
/* ❌ Creating a class for styles used once */
.hero-title {
  @apply text-5xl font-bold text-gray-900 leading-tight text-balance;
}
```

**Fix:** Write utilities directly in JSX:

```tsx
/* ✅ No CSS needed — utilities directly in JSX */
<h1 className="text-5xl font-bold text-gray-900 leading-tight text-balance">
  Welcome
</h1>
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete Tailwind v4.3 config in `globals.css` with:

1. `@import "tailwindcss"`
2. `@theme` block with 4 brand colors, custom spacing (`18`, `22`), 2 font stacks, and a custom shadow
3. `@layer utilities` with `text-balance`, `text-pretty`, and `scrollbar-hide`
4. A base `body` style using the font variable
5. Write a `<HeroCard>` component using ONLY Tailwind utilities (no CSS) — flex layout, padding, brand color background, custom font

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;

  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-playfair), Georgia, serif;

  --shadow-glow: 0 0 24px -4px rgb(59 130 246 / 0.4);
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
  .scrollbar-hide {
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

```tsx
// src/components/hero-card.tsx
export function HeroCard() {
  return (
    <div
      className="flex flex-col items-start gap-6 bg-brand-600 rounded-2xl
                    p-18 max-w-2xl shadow-glow"
    >
      <span
        className="text-xs font-semibold text-brand-200 uppercase
                       tracking-widest"
      >
        New in 2026
      </span>
      <h1
        className="font-display text-5xl font-bold text-white
                     leading-tight text-balance"
      >
        Build UIs at the speed of thought
      </h1>
      <p className="text-brand-100 text-lg leading-relaxed text-pretty max-w-lg">
        Tailwind v4.3 — CSS-first configuration, zero config, instant utility
        classes exactly where you need them.
      </p>
      <div className="flex items-center gap-3">
        <button
          className="px-6 py-3 bg-white text-brand-700 font-semibold
                           rounded-xl hover:bg-brand-50 transition-colors"
        >
          Get started
        </button>
        <button
          className="px-6 py-3 border border-brand-400 text-white
                           font-semibold rounded-xl hover:bg-brand-700
                           transition-colors"
        >
          Learn more
        </button>
      </div>
    </div>
  );
}
```

---

---
