# 📅 Day 10 — Tailwind Fundamentals (Tailwind CSS v4.3)

> **Goal:** Master the utility-first workflow in Tailwind CSS v4.3 — layout, spacing, typography, colors, states, responsiveness, dark mode, and composing real UI from utility primitives.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack version:** Tailwind CSS v4.3 (CSS-first config, `@import "tailwindcss"`, `@theme {}`)

---

## 📋 Day 10 Subtopic Overview

| #   | Subtopic                                                                 | Time   |
| --- | ------------------------------------------------------------------------ | ------ |
| 1   | Utility-First Workflow — Mental Model, Setup, `@apply`                   | 12 min |
| 2   | Layout — Flexbox, Grid, Positioning, z-index, overflow                   | 15 min |
| 3   | Spacing — Padding, Margin, Gap, Space Between                            | 12 min |
| 4   | Sizing — Width, Height, Min/Max, Aspect Ratio                            | 12 min |
| 5   | Typography — Font Size, Weight, Line Height, Tracking, Alignment         | 12 min |
| 6   | Colors — Text, Background, Border, Opacity, CSS Variables                | 12 min |
| 7   | Borders, Shadows, and Visual Effects — Border Radius, Ring, Shadow, Blur | 12 min |
| 8   | Hover, Focus, and Interactive States                                     | 10 min |
| 9   | Responsive Variants — Mobile-First Breakpoints                           | 12 min |
| 10  | Dark Mode — `dark:` Variant, CSS Variable Strategy                       | 12 min |
| 11  | Composing Interfaces — Building Real UI from Utility Primitives          | 15 min |

---

---

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

# 2 — Layout — Flexbox, Grid, Positioning, z-index, overflow

---

## T — TL;DR

Tailwind provides direct utility classes for every CSS layout property. **Flexbox** (`flex`, `items-center`, `justify-between`) and **Grid** (`grid`, `grid-cols-3`, `col-span-2`) handle 95% of layouts. Positioning, z-index, and overflow round out the system.

---

## K — Key Concepts

### Flexbox — The Core Layout Primitive

```tsx
{/* ─── Display */}
<div className="flex">       {/* display: flex (row by default) */}
<div className="inline-flex">{/* display: inline-flex */}
<div className="flex flex-col"> {/* flex-direction: column */}
<div className="flex flex-row"> {/* flex-direction: row (default) */}
<div className="flex flex-row-reverse"> {/* right to left */}
<div className="flex flex-col-reverse"> {/* bottom to top */}

{/* ─── Alignment (cross axis — perpendicular to main axis) */}
<div className="flex items-start">    {/* align-items: flex-start */}
<div className="flex items-center">   {/* align-items: center ← most used */}
<div className="flex items-end">      {/* align-items: flex-end */}
<div className="flex items-stretch">  {/* align-items: stretch (default) */}
<div className="flex items-baseline"> {/* align-items: baseline */}

{/* ─── Justification (main axis) */}
<div className="flex justify-start">    {/* justify-content: flex-start (default) */}
<div className="flex justify-center">   {/* justify-content: center */}
<div className="flex justify-end">      {/* justify-content: flex-end */}
<div className="flex justify-between">  {/* justify-content: space-between ← very common */}
<div className="flex justify-around">   {/* justify-content: space-around */}
<div className="flex justify-evenly">   {/* justify-content: space-evenly */}

{/* ─── Gap (replaces margin-based spacing between flex children) */}
<div className="flex gap-4">     {/* gap: 1rem — both row and column */}
<div className="flex gap-x-4">   {/* column-gap: 1rem */}
<div className="flex gap-y-2">   {/* row-gap: 0.5rem */}

{/* ─── Wrap */}
<div className="flex flex-wrap">     {/* flex-wrap: wrap */}
<div className="flex flex-nowrap">   {/* flex-wrap: nowrap (default) */}
<div className="flex flex-wrap-reverse">

{/* ─── Flex children — grow, shrink, basis */}
<div className="flex-1">      {/* flex: 1 1 0% — grows to fill */}
<div className="flex-auto">   {/* flex: 1 1 auto — grows, keeps natural size */}
<div className="flex-none">   {/* flex: none — no grow or shrink */}
<div className="grow">        {/* flex-grow: 1 */}
<div className="grow-0">      {/* flex-grow: 0 */}
<div className="shrink">      {/* flex-shrink: 1 (default) */}
<div className="shrink-0">    {/* flex-shrink: 0 — IMPORTANT: won't shrink ✅ */}
<div className="basis-1/2">   {/* flex-basis: 50% */}
<div className="basis-64">    {/* flex-basis: 16rem */}
```

### Real Flexbox Patterns

```tsx
{
  /* ─── Navigation bar */
}
<nav className="flex items-center justify-between px-6 h-14 border-b bg-white">
  <span className="font-bold">Logo</span>
  <div className="flex items-center gap-6">
    <a className="text-sm text-gray-600 hover:text-gray-900">Docs</a>
    <a className="text-sm text-gray-600 hover:text-gray-900">Blog</a>
    <button
      className="px-4 py-1.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg"
    >
      Sign in
    </button>
  </div>
</nav>;

{
  /* ─── Card with icon + content side by side */
}
<div className="flex items-start gap-4 p-5 bg-white rounded-xl border">
  <div
    className="shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center
                  justify-center text-blue-600"
  >
    📦
  </div>
  <div className="min-w-0">
    {" "}
    {/* min-w-0 prevents text overflow in flex child */}
    <p className="font-semibold text-gray-900 truncate">Product Name</p>
    <p className="text-sm text-gray-500">Category</p>
  </div>
  <span className="shrink-0 ml-auto font-bold text-gray-900">$120</span>
</div>;

{
  /* ─── Centered page content */
}
<div className="flex min-h-screen items-center justify-center bg-gray-50">
  <div className="w-full max-w-md">{/* centered content */}</div>
</div>;
```

### CSS Grid — Multi-Column Layouts

```tsx
{/* ─── Basic grid */}
<div className="grid grid-cols-3 gap-6">     {/* 3 equal columns */}
<div className="grid grid-cols-4 gap-4">     {/* 4 equal columns */}
<div className="grid grid-cols-12 gap-4">    {/* 12-column layout system */}

{/* ─── Auto-fit responsive grid (NO media queries needed) */}
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
  {/* Each column is minimum 280px, fills available space */}
  {/* 1 column on mobile, 2 on tablet, 3+ on desktop automatically */}
</div>

{/* ─── Spanning columns/rows */}
<div className="col-span-2">    {/* spans 2 columns */}
<div className="col-span-full"> {/* spans all columns */}
<div className="row-span-2">    {/* spans 2 rows */}
<div className="col-start-2">   {/* starts at grid line 2 */}
<div className="col-start-1 col-end-3"> {/* explicit start and end */}

{/* ─── Named template areas with arbitrary values */}
<div className="grid [grid-template-areas:'header_header''sidebar_main''footer_footer']
                grid-cols-[240px_1fr] gap-4">
  <header className="[grid-area:header]">Header</header>
  <aside   className="[grid-area:sidebar]">Sidebar</aside>
  <main    className="[grid-area:main]">Main</main>
  <footer  className="[grid-area:footer]">Footer</footer>
</div>

{/* ─── Row heights */}
<div className="grid grid-rows-3 gap-4">  {/* 3 equal rows */}
<div className="grid auto-rows-fr gap-4"> {/* rows share available height */}
```

### Real Grid Patterns

```tsx
{
  /* ─── Product grid — 1 col mobile, 2 tablet, 3 desktop */
}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {products.map((p) => (
    <ProductCard key={p.id} {...p} />
  ))}
</div>;

{
  /* ─── Dashboard layout: sidebar + content */
}
<div className="grid grid-cols-[240px_1fr] min-h-screen">
  <aside className="bg-gray-900 border-r">Sidebar</aside>
  <main className="bg-gray-50 p-8">Content</main>
</div>;

{
  /* ─── Feature grid: one large + two small */
}
<div className="grid grid-cols-3 grid-rows-2 gap-4 h-[480px]">
  <div className="col-span-2 row-span-2 bg-blue-600 rounded-2xl">Large</div>
  <div className="bg-purple-600 rounded-2xl">Small 1</div>
  <div className="bg-green-600 rounded-2xl">Small 2</div>
</div>;
```

### Positioning — Static, Relative, Absolute, Fixed, Sticky

```tsx
{/* ─── Position values */}
<div className="static">     {/* position: static (default) */}
<div className="relative">   {/* position: relative — context for absolute children */}
<div className="absolute">   {/* position: absolute — relative to nearest positioned ancestor */}
<div className="fixed">      {/* position: fixed — relative to viewport */}
<div className="sticky">     {/* position: sticky — sticks within scroll container */}

{/* ─── Inset / coordinates */}
<div className="absolute inset-0">          {/* top/right/bottom/left: 0 (full cover) */}
<div className="absolute top-0 right-0">    {/* top-right corner */}
<div className="absolute bottom-4 left-4">  {/* 16px from bottom-left */}
<div className="absolute inset-x-0 bottom-0"> {/* full width, pinned to bottom */}
<div className="absolute -top-2 -right-2">  {/* negative: outside the parent */}

{/* ─── Common pattern: badge/dot on icon */}
<div className="relative inline-flex">
  <span className="text-2xl">🔔</span>
  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
                   flex items-center justify-center text-white text-xs font-bold">
    3
  </span>
</div>

{/* ─── Sticky nav */}
<nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b">
  Navigation
</nav>

{/* ─── Fixed overlay */}
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <div className="bg-white rounded-2xl p-6 w-full max-w-md">
    Modal content
  </div>
</div>
```

### z-index and Overflow

```tsx
{/* ─── z-index */}
<div className="z-0">   {/* z-index: 0 */}
<div className="z-10">  {/* z-index: 10 */}
<div className="z-20">  {/* z-index: 20 */}
<div className="z-30">  {/* z-index: 30 */}
<div className="z-40">  {/* z-index: 40 */}
<div className="z-50">  {/* z-index: 50 */}
<div className="z-auto">{/* z-index: auto */}
{/* Tailwind z-index convention: nav=40, modal=50, toast=60 */}

{/* ─── Overflow */}
<div className="overflow-hidden">   {/* clips content */}
<div className="overflow-auto">     {/* scrolls when needed */}
<div className="overflow-scroll">   {/* always shows scrollbar */}
<div className="overflow-x-auto">   {/* horizontal scroll only */}
<div className="overflow-y-auto">   {/* vertical scroll only */}
<div className="overflow-x-hidden overflow-y-auto"> {/* common pattern */}

{/* ─── Common: scrollable list with fixed height */}
<ul className="overflow-y-auto max-h-64 space-y-2 pr-2">
  {items.map(item => <li key={item.id}>{item.name}</li>)}
</ul>
```

---

## W — Why It Matters

- `shrink-0` is one of the most important Tailwind classes — in a flex row, images and icons will distort/shrink to fit available space without it. Adding `shrink-0` to icons and avatars is a must-know.
- `min-w-0` on flex children containing text is equally critical — without it, text will overflow its flex container rather than truncating. The combination `min-w-0` + `truncate` is the canonical pattern for overflow-safe flex layouts.
- CSS Grid with `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` creates fully responsive grids without any media queries — understanding this pattern eliminates the need for 90% of responsive column breakpoints.

---

## I — Interview Q&A

### Q1: What is the difference between `items-center` and `justify-center` in Tailwind flexbox?

**A:** `items-center` sets `align-items: center` — it centers flex children along the **cross axis** (perpendicular to the flex direction). For `flex-row` (horizontal), this centers vertically. For `flex-col` (vertical), this centers horizontally. `justify-center` sets `justify-content: center` — it centers children along the **main axis** (the flex direction). For `flex-row`, this centers horizontally. For `flex-col`, this centers vertically. To center something both horizontally and vertically: `flex items-center justify-center`.

### Q2: When would you use CSS Grid instead of Flexbox in Tailwind?

**A:** Flexbox is one-dimensional — it excels at arranging items in a single row or column with automatic sizing and wrapping. Use it for navbars, button groups, card headers, and any linear sequence. CSS Grid is two-dimensional — it controls both rows and columns simultaneously, making it ideal for overall page layouts (header/sidebar/main/footer), image galleries, dashboard grids, and any layout where items need to align on both axes. In practice: `flex` for components and UI within a section, `grid` for the structural layout of a page or multi-column content sections.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `shrink-0` on icons/avatars in flex rows

```tsx
{
  /* ❌ Icon shrinks when text is long */
}
<div className="flex items-center gap-3">
  <img src="/avatar.jpg" className="w-10 h-10 rounded-full" />
  <p className="text-sm">
    Very long user name that causes the avatar to shrink
  </p>
</div>;
```

**Fix:**

```tsx
{
  /* ✅ shrink-0 prevents the avatar from shrinking */
}
<div className="flex items-center gap-3">
  <img src="/avatar.jpg" className="w-10 h-10 rounded-full shrink-0" />
  <p className="text-sm min-w-0 truncate">
    Very long user name that now truncates properly
  </p>
</div>;
```

### ❌ Pitfall: Using `margin` for spacing between flex children instead of `gap`

```tsx
{
  /* ❌ Margin-based spacing is fragile and hard to maintain */
}
<div className="flex">
  <button className="mr-2">Cancel</button>
  <button className="mr-2">Save</button>
  <button>Submit</button> {/* ← last item has no margin — inconsistent */}
</div>;
```

**Fix:**

```tsx
{
  /* ✅ gap handles spacing between ALL children consistently */
}
<div className="flex gap-2">
  <button>Cancel</button>
  <button>Save</button>
  <button>Submit</button>
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete dashboard layout with:

1. Sticky header (z-40, bg-white/80 backdrop-blur)
2. Sidebar (240px) + main content grid
3. Stats row: 4 equal cards using grid, `gap-4`
4. Content area: 2/3 main + 1/3 sidebar using `col-span-2` and `col-span-1`
5. A notification badge (absolute positioned dot on an icon)

### Solution

```tsx
// src/components/dashboard-layout.tsx
export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm
                         border-b border-gray-200 px-6 h-14 flex items-center
                         justify-between"
      >
        <span className="font-bold text-gray-900">Acme Dashboard</span>
        <div className="flex items-center gap-4">
          {/* Notification bell with badge */}
          <div className="relative inline-flex">
            <span className="text-xl text-gray-600 cursor-pointer">🔔</span>
            <span
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                             rounded-full flex items-center justify-center
                             text-white text-[10px] font-bold shrink-0"
            >
              3
            </span>
          </div>
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center
                          justify-center text-white text-sm font-bold shrink-0"
          >
            M
          </div>
        </div>
      </header>

      {/* Sidebar + content grid */}
      <div className="grid grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside
          className="sticky top-14 h-[calc(100vh-3.5rem)] bg-white
                          border-r border-gray-200 p-4 overflow-y-auto"
        >
          <nav className="flex flex-col gap-1">
            {[
              "Overview",
              "Products",
              "Orders",
              "Customers",
              "Analytics",
              "Settings",
            ].map((item) => (
              <a
                key={item}
                className="flex items-center gap-3 px-3 py-2 rounded-lg
                            text-sm text-gray-600 hover:bg-gray-100
                            hover:text-gray-900 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                {item}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="p-8 overflow-y-auto">
          {/* Stats row — 4 equal cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Revenue",
                value: "$48,200",
                delta: "+12%",
                color: "text-green-600",
              },
              {
                label: "Orders",
                value: "1,284",
                delta: "+8%",
                color: "text-green-600",
              },
              {
                label: "Customers",
                value: "3,891",
                delta: "+5%",
                color: "text-green-600",
              },
              {
                label: "Returns",
                value: "24",
                delta: "-2%",
                color: "text-red-500",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <p
                  className="text-xs font-semibold text-gray-500 uppercase
                               tracking-wider"
                >
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <p className={`text-sm font-medium mt-1 ${stat.color}`}>
                  {stat.delta} this month
                </p>
              </div>
            ))}
          </div>

          {/* Content row — 2/3 + 1/3 */}
          <div className="grid grid-cols-3 gap-6">
            {/* Main chart area */}
            <div
              className="col-span-2 bg-white border border-gray-200
                             rounded-xl p-6"
            >
              <h2 className="font-semibold text-gray-900 mb-4">
                Revenue trend
              </h2>
              <div
                className="h-48 bg-gradient-to-br from-blue-50 to-blue-100
                               rounded-lg flex items-center justify-center
                               text-blue-400 text-sm"
              >
                Chart placeholder
              </div>
            </div>

            {/* Side panel */}
            <div
              className="col-span-1 bg-white border border-gray-200
                             rounded-xl p-6"
            >
              <h2 className="font-semibold text-gray-900 mb-4">Top products</h2>
              <div className="flex flex-col gap-3">
                {["Air Max 90", "Canvas Tote", "Wool Cap"].map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-2
                                  border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="shrink-0 w-6 h-6 rounded-full bg-blue-100
                                       flex items-center justify-center text-blue-600
                                       text-xs font-bold"
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        {name}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-900 ml-2">
                      ${[120, 45, 35][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

---

# 3 — Spacing — Padding, Margin, Gap, Space Between

---

## T — TL;DR

Tailwind's spacing system is built on a `4px` base unit (`1` = `0.25rem` = `4px`). Use **`p-*`/`px-*`/`py-*`** for padding, **`m-*`/`mx-*`/`my-*`** for margin, **`gap-*`** for flex/grid spacing, and avoid margin between siblings — `gap` is almost always better.

---

## K — Key Concepts

### Padding — Full Reference

```tsx
{/* ─── All sides */}
<div className="p-0">     {/* padding: 0 */}
<div className="p-1">     {/* padding: 0.25rem = 4px */}
<div className="p-2">     {/* padding: 0.5rem = 8px */}
<div className="p-3">     {/* padding: 0.75rem = 12px */}
<div className="p-4">     {/* padding: 1rem = 16px — default card */}
<div className="p-5">     {/* padding: 1.25rem = 20px */}
<div className="p-6">     {/* padding: 1.5rem = 24px — comfortable card */}
<div className="p-8">     {/* padding: 2rem = 32px — section padding */}
<div className="p-10">    {/* padding: 2.5rem = 40px */}
<div className="p-12">    {/* padding: 3rem = 48px */}
<div className="p-16">    {/* padding: 4rem = 64px — hero padding */}

{/* ─── Axis shortcuts */}
<div className="px-6">    {/* padding-left + padding-right: 1.5rem */}
<div className="py-4">    {/* padding-top + padding-bottom: 1rem */}

{/* ─── Individual sides */}
<div className="pt-4">    {/* padding-top */}
<div className="pr-4">    {/* padding-right */}
<div className="pb-4">    {/* padding-bottom */}
<div className="pl-4">    {/* padding-left */}

{/* ─── Logical properties (RTL-safe) */}
<div className="ps-4">    {/* padding-inline-start (left in LTR, right in RTL) */}
<div className="pe-4">    {/* padding-inline-end */}

{/* ─── Arbitrary values */}
<div className="p-[13px]">   {/* exactly 13px */}
<div className="px-[22px]">  {/* exactly 22px horizontal */}
```

### Margin — When to Use (and When Not To)

```tsx
{/* ─── Same syntax as padding, prefix m- */}
<div className="m-4">    {/* margin: 1rem all sides */}
<div className="mx-auto">{/* margin-left: auto; margin-right: auto — CENTER ✅ */}
<div className="mt-8">   {/* margin-top: 2rem */}
<div className="mb-4">   {/* margin-bottom: 1rem */}

{/* ─── Negative margin */}
<div className="-mt-4">  {/* margin-top: -1rem (overlap elements) */}
<div className="-mx-6">  {/* negative horizontal margin (full-bleed) */}

{/* ─── ml-auto — push to end in flex row */}
<nav className="flex items-center">
  <span>Logo</span>
  <a className="ml-auto">Sign in</a>  {/* ← pushed to the right ✅ */}
</nav>

{/* ─── When NOT to use margin:
       ❌ Between flex/grid siblings — use gap instead
       ❌ For spacing inside a container — use padding
       ✅ mx-auto — centering a block element
       ✅ mt-* — vertical rhythm between document sections
       ✅ ml-auto — pushing item to end in flex
*/}
```

### Gap — The Right Way to Space Flex/Grid Children

```tsx
{/* ─── Uniform gap */}
<div className="flex gap-2">   {/* 8px between all children */}
<div className="flex gap-4">   {/* 16px between all children */}
<div className="grid grid-cols-3 gap-6"> {/* 24px between all grid cells */}

{/* ─── Separate row and column gaps */}
<div className="grid grid-cols-3 gap-x-6 gap-y-4">
  {/* 24px horizontal, 16px vertical */}
</div>

{/* ─── Why gap > margin for siblings:
   With gap:
     <div className="flex gap-4">     ← one class, works for any number of children
       <button>A</button>             ← no classes needed on children
       <button>B</button>
       <button>C</button>
     </div>

   With margin (old approach):
     <div className="flex">
       <button className="mr-4">A</button>   ← every child needs a class
       <button className="mr-4">B</button>   ← last child problem
       <button>C</button>                     ← or use first:ml-0
     </div>
*/}
```

### Space Between — Alternative for Non-Flex Containers

```tsx
{/* space-x-* adds margin-left to all children except first */}
{/* space-y-* adds margin-top to all children except first */}
{/* Use when you CANNOT use flex/gap (e.g., block elements, prose) */}

<ul className="space-y-2">
  <li>First item</li>
  <li>Second item — has margin-top: 0.5rem</li>
  <li>Third item — has margin-top: 0.5rem</li>
</ul>

<div className="space-y-8">
  <section>Section 1</section>
  <section>Section 2 — 2rem below section 1</section>
</div>

{/* Note: space-* uses the * + * CSS selector trick:
   .space-y-2 > * + * { margin-top: 0.5rem }
   This doesn't work well with hidden/conditional children
   In those cases, use flex gap-* instead
*/}
```

### Padding Patterns in Practice

```tsx
{/* ─── Button padding recipe */}
<button className="px-4 py-2 text-sm">   {/* small button */}
<button className="px-5 py-2.5 text-sm"> {/* medium button */}
<button className="px-6 py-3 text-base"> {/* large button */}

{/* ─── Card padding recipe */}
<div className="p-4">   {/* compact card */}
<div className="p-5">   {/* regular card */}
<div className="p-6">   {/* comfortable card */}
<div className="p-8">   {/* spacious card */}

{/* ─── Section padding recipe */}
<section className="px-4 py-12">   {/* mobile section */}
<section className="px-6 py-16">   {/* tablet section */}
<section className="px-8 py-20">   {/* desktop section */}

{/* ─── Page layout padding */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Standard responsive container */}
</div>
```

---

## W — Why It Matters

- `mx-auto` is the standard way to center a block element horizontally — it sets both margins to `auto`, which equally distributes remaining space. It must be paired with a `max-width` class to work.
- `gap` is universally preferred over `margin` for spacing flex/grid children — it's a single class, works for any number of children, handles last-child correctly without `:last-child` selectors, and doesn't require knowing the layout direction.
- The `4px` base unit creates a visual rhythm — when everything is a multiple of 4px, the design looks internally consistent. Learning the `p-4 = 16px`, `p-8 = 32px`, `p-16 = 64px` anchors lets you estimate spacing values by eye.

---

## I — Interview Q&A

### Q1: What is the difference between `padding` and `margin` in Tailwind and when should you use each?

**A:** Padding (`p-*`, `px-*`, `py-*`) is internal space — between the element's border and its content. Use it to control how much breathing room content has inside a box (cards, buttons, sections). Margin (`m-*`, `mx-*`, `my-*`) is external space — between the element's border and neighboring elements. Use margin sparingly: `mx-auto` to center a block, `ml-auto` to push an element to the end of a flex row, or `mt-*` for vertical rhythm between document sections. For spacing between flex/grid children, use `gap` instead of margin — it's simpler and avoids the last-child problem.

### Q2: Why is `gap` preferred over `space-x-*`/`space-y-*` in Tailwind?

**A:** `gap` is a proper CSS Grid/Flexbox property that adds space between grid/flex tracks — it's understood by the layout algorithm and works correctly regardless of wrapping, direction changes, or hidden children. `space-x-*`/`space-y-*` use the CSS adjacent sibling selector (`* + *`) to add margin to all children except the first — this breaks with hidden/conditionally rendered children (a hidden child creates a visible gap), doesn't work with `flex-wrap` correctly, and requires knowing the layout direction upfront. Use `gap` whenever you have a flex or grid container; use `space-y-*` only for non-flex block elements like article sections.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `space-y-*` with conditionally rendered children

```tsx
{
  /* ❌ Hidden child leaves unexpected gap */
}
<div className="space-y-4">
  <div>Always visible</div>
  {condition && <div className="hidden">Hidden element</div>}
  {/* ↑ .space-y-4 > * + * still adds margin-top to the next sibling
       even when this div is display:none — visual gap appears */}
  <div>Also always visible — has unexpected gap above it</div>
</div>;
```

**Fix:** Use `flex flex-col gap-4` for conditional children:

```tsx
{
  /* ✅ gap respects display:none and conditional rendering */
}
<div className="flex flex-col gap-4">
  <div>Always visible</div>
  {condition && <div>Conditionally visible</div>}
  <div>No unexpected gap ✅</div>
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<PricingCard>` component using ONLY spacing utilities:

1. Card container: `p-8` padding, with inner content stack using `space-y-6`
2. Header section: icon + title side by side with `gap-3`, `items-center`
3. Price display: large number + period/cycle below, using `mt-2`
4. Features list: `space-y-3` with checkmark icon + text using `gap-2`
5. CTA button: full width, `mt-8`, `py-3`
6. A "most popular" absolute badge: `-top-3` positioned, `px-4 py-1`

### Solution

```tsx
// src/components/pricing-card.tsx
interface Feature {
  label: string;
  included: boolean;
}

interface PricingCardProps {
  plan: string;
  price: number;
  cycle: string;
  features: Feature[];
  popular?: boolean;
  icon: string;
}

export function PricingCard({
  plan,
  price,
  cycle,
  features,
  popular = false,
  icon,
}: PricingCardProps) {
  return (
    <div
      className={`relative p-8 rounded-2xl border-2 ${
        popular
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {/* Most popular badge — absolute, -top-3 overlap */}
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2
                         px-4 py-1 bg-blue-500 text-white text-xs
                         font-bold uppercase tracking-widest rounded-full
                         whitespace-nowrap"
        >
          Most popular
        </span>
      )}

      {/* Inner content — vertical stack */}
      <div className="space-y-6">
        {/* Header: icon + plan name */}
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{icon}</span>
          <h3
            className={`text-lg font-bold ${
              popular ? "text-white" : "text-gray-900"
            }`}
          >
            {plan}
          </h3>
        </div>

        {/* Price block */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold">${price}</span>
            <span
              className={`text-sm ${popular ? "text-blue-200" : "text-gray-500"}`}
            >
              / {cycle}
            </span>
          </div>
          <p
            className={`text-sm mt-2 ${popular ? "text-blue-200" : "text-gray-500"}`}
          >
            Billed annually · cancel anytime
          </p>
        </div>

        {/* Features list */}
        <ul className="space-y-3">
          {features.map((f) => (
            <li
              key={f.label}
              className={`flex items-start gap-2 text-sm ${
                !f.included && (popular ? "opacity-50" : "text-gray-400")
              }`}
            >
              <span
                className={`shrink-0 mt-0.5 ${
                  f.included
                    ? popular
                      ? "text-blue-200"
                      : "text-green-500"
                    : "text-gray-300"
                }`}
              >
                {f.included ? "✓" : "✕"}
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>

        {/* CTA button — mt-8 separates it from features */}
        <button
          className={`w-full py-3 rounded-xl font-semibold text-sm
                            transition-colors mt-8 ${
                              popular
                                ? "bg-white text-blue-600 hover:bg-blue-50"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
        >
          Get started with {plan}
        </button>
      </div>
    </div>
  );
}
```

---

---

# 4 — Sizing — Width, Height, Min/Max, Aspect Ratio

---

## T — TL;DR

Tailwind provides width (`w-*`), height (`h-*`), min/max constraints, and `aspect-ratio` utilities. The key patterns: `w-full` for responsive elements, `max-w-*` for content containers, `min-h-screen` for page height, and `aspect-video`/`aspect-square` for media.

---

## K — Key Concepts

### Width Utilities

```tsx
{/* ─── Fixed widths (from spacing scale) */}
<div className="w-0">     {/* 0px */}
<div className="w-4">     {/* 1rem = 16px */}
<div className="w-8">     {/* 2rem = 32px */}
<div className="w-16">    {/* 4rem = 64px */}
<div className="w-32">    {/* 8rem = 128px */}
<div className="w-48">    {/* 12rem = 192px */}
<div className="w-64">    {/* 16rem = 256px */}
<div className="w-80">    {/* 20rem = 320px */}
<div className="w-96">    {/* 24rem = 384px */}

{/* ─── Percentage widths */}
<div className="w-1/2">   {/* 50% */}
<div className="w-1/3">   {/* 33.333% */}
<div className="w-2/3">   {/* 66.666% */}
<div className="w-1/4">   {/* 25% */}
<div className="w-3/4">   {/* 75% */}

{/* ─── Special widths */}
<div className="w-full">   {/* 100% — fills parent width */}
<div className="w-screen"> {/* 100vw — full viewport width */}
<div className="w-auto">   {/* width: auto */}
<div className="w-fit">    {/* width: fit-content */}
<div className="w-max">    {/* width: max-content */}
<div className="w-min">    {/* width: min-content */}

{/* ─── Arbitrary widths */}
<div className="w-[340px]">   {/* exactly 340px */}
<div className="w-[calc(100%-2rem)]"> {/* calc expression */}
```

### Height Utilities

```tsx
{/* ─── Same scale as width */}
<div className="h-4">      {/* 1rem = 16px — icon heights */}
<div className="h-8">      {/* 2rem = 32px */}
<div className="h-10">     {/* 2.5rem = 40px — input heights */}
<div className="h-12">     {/* 3rem = 48px — button heights */}
<div className="h-14">     {/* 3.5rem = 56px — navbar heights */}
<div className="h-16">     {/* 4rem = 64px */}
<div className="h-64">     {/* 16rem = 256px */}
<div className="h-96">     {/* 24rem = 384px */}

{/* ─── Special heights */}
<div className="h-full">    {/* 100% of parent */}
<div className="h-screen">  {/* 100vh */}
<div className="h-dvh">     {/* 100dvh — dynamic viewport (mobile browser chrome aware) */}
<div className="h-svh">     {/* 100svh — small viewport */}
<div className="h-lvh">     {/* 100lvh — large viewport */}
<div className="h-auto">    {/* height: auto */}
<div className="h-fit">     {/* height: fit-content */}
<div className="h-px">      {/* 1px — divider lines */}
<div className="h-0.5">     {/* 2px */}

{/* ─── Calculated heights */}
<div className="h-[calc(100vh-3.5rem)]"> {/* full height minus nav */}
```

### Max Width — Container Pattern

```tsx
{/* ─── max-w-* for content containers */}
<div className="max-w-xs">   {/* 20rem = 320px */}
<div className="max-w-sm">   {/* 24rem = 384px */}
<div className="max-w-md">   {/* 28rem = 448px */}
<div className="max-w-lg">   {/* 32rem = 512px */}
<div className="max-w-xl">   {/* 36rem = 576px */}
<div className="max-w-2xl">  {/* 42rem = 672px */}
<div className="max-w-3xl">  {/* 48rem = 768px */}
<div className="max-w-4xl">  {/* 56rem = 896px */}
<div className="max-w-5xl">  {/* 64rem = 1024px */}
<div className="max-w-6xl">  {/* 72rem = 1152px */}
<div className="max-w-7xl">  {/* 80rem = 1280px — standard page container */}
<div className="max-w-full"> {/* 100% */}
<div className="max-w-none"> {/* none */}
<div className="max-w-prose">{/* 65ch — optimal reading line length ✅ */}

{/* ─── Standard page container pattern */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Page content */}
</div>

{/* ─── Prose/article container */}
<article className="max-w-prose mx-auto px-4 py-12">
  {/* Article text */}
</article>
```

### Aspect Ratio

```tsx
{/* ─── Built-in aspect ratios */}
<div className="aspect-square">  {/* 1:1 — avatars, icons, thumbnails */}
<div className="aspect-video">   {/* 16:9 — video embeds, banners */}
<div className="aspect-auto">    {/* aspect-ratio: auto (default) */}

{/* ─── Arbitrary aspect ratios */}
<div className="aspect-[4/3]">   {/* 4:3 — classic photo ratio */}
<div className="aspect-[3/2]">   {/* 3:2 — photography */}
<div className="aspect-[21/9]">  {/* cinematic */}

{/* ─── Standard pattern: aspect ratio + relative + fill image */}
<div className="relative aspect-video w-full overflow-hidden rounded-xl">
  <Image
    src="/video-thumbnail.jpg"
    alt="Video thumbnail"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 800px"
  />
</div>

{/* ─── Avatar sizes using aspect-square */}
<div className="relative aspect-square w-10 rounded-full overflow-hidden">
  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
</div>
```

### Min/Max Constraints

```tsx
{/* ─── Min width/height */}
<div className="min-w-0">        {/* min-width: 0 — CRITICAL for flex text overflow */}
<div className="min-w-full">     {/* min-width: 100% */}
<div className="min-h-screen">   {/* min-height: 100vh — full page height */}
<div className="min-h-0">        {/* min-height: 0 */}

{/* ─── Max height (for scrollable areas) */}
<div className="max-h-48 overflow-y-auto">  {/* 12rem scroll area */}
<div className="max-h-96 overflow-y-auto">  {/* 24rem scroll area */}
<div className="max-h-[400px] overflow-y-auto"> {/* exact scroll area */}
<div className="max-h-screen overflow-y-auto">   {/* viewport height scroll */}

{/* ─── size-* (shorthand for equal width AND height) */}
<div className="size-4">   {/* w-4 h-4 — 16px × 16px */}
<div className="size-6">   {/* w-6 h-6 — 24px × 24px */}
<div className="size-8">   {/* w-8 h-8 — 32px × 32px */}
<div className="size-10">  {/* w-10 h-10 — 40px × 40px */}
<div className="size-12">  {/* w-12 h-12 — 48px × 48px */}
{/* size-* is the v4 shorthand — much cleaner for square elements */}
```

---

## W — Why It Matters

- `min-h-screen` vs `h-screen` is an important distinction — `h-screen` fixes the element at exactly 100vh (content that overflows is clipped or scrolled within the element), while `min-h-screen` lets the element grow taller if content requires it. Pages should almost always use `min-h-screen`.
- `max-w-prose` (65 characters wide) is the typographically optimal line length for body text — text that's too wide (100%+) fatigues readers. Using `max-w-prose mx-auto` for article content is a professional typography choice.
- The `size-*` shorthand (new in v3/v4) is the clean way to create square elements — `size-10` replaces `w-10 h-10`. Every avatar, icon container, and button icon benefits from this.

---

## I — Interview Q&A

### Q1: What is the difference between `h-screen` and `min-h-screen`?

**A:** `h-screen` sets `height: 100vh` — the element is exactly the viewport height. Content taller than the viewport overflows, which is usually wrong for page layouts. `min-h-screen` sets `min-height: 100vh` — the element is at least the viewport height but grows taller when content requires it. For page layouts, always use `min-h-screen` so short pages fill the viewport and long pages scroll normally. `h-screen` is useful for fixed-height containers where overflow should be managed by the child (like a scrollable sidebar).

### Q2: Why is `min-w-0` important in flex layouts?

**A:** CSS flex items have `min-width: auto` by default, meaning they won't shrink below their content's intrinsic minimum width. This causes text to overflow its flex container rather than wrapping or truncating. Adding `min-w-0` overrides this to `min-width: 0`, allowing the flex child to shrink below its content width — enabling `truncate` or `overflow-hidden` to work correctly. The pattern is: flex child containing text → add `min-w-0` + `truncate` for single-line overflow, or `min-w-0` + `overflow-hidden` for multi-line.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `h-screen` for a page layout — short pages don't fill viewport, long pages clip

```tsx
{
  /* ❌ h-screen: exactly 100vh */
}
<div className="h-screen bg-gray-50">
  {/* If content is taller than viewport, it's clipped and requires overflow handling */}
  {/* If content is shorter, page height is fine but scrolls incorrectly */}
</div>;
```

**Fix:**

```tsx
{
  /* ✅ min-h-screen: at least 100vh, grows with content */
}
<div className="min-h-screen bg-gray-50">
  {/* Short content fills viewport, long content extends naturally */}
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<MediaCard>` component using sizing utilities:

1. Card: `max-w-sm w-full`
2. Media area: `aspect-video` with `relative overflow-hidden` for an image
3. Content: `p-5` padding
4. Author avatar: `size-8 rounded-full` with `shrink-0`
5. Metadata row: flex + `items-center gap-2 min-w-0`
6. Title that truncates with `truncate`

### Solution

```tsx
// src/components/media-card.tsx
import Image from "next/image";

interface MediaCardProps {
  title: string;
  category: string;
  author: string;
  avatarUrl: string;
  coverUrl: string;
  readTime: number;
}

export function MediaCard({
  title,
  category,
  author,
  avatarUrl,
  coverUrl,
  readTime,
}: MediaCardProps) {
  return (
    <article
      className="max-w-sm w-full bg-white border border-gray-200
                         rounded-2xl overflow-hidden hover:shadow-md
                         transition-shadow"
    >
      {/* Media — aspect-video + fill image */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={coverUrl}
          alt={title}
          fill
          className="object-cover hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, 384px"
        />
        {/* Category badge overlay */}
        <span
          className="absolute top-3 left-3 px-2.5 py-1 bg-black/60
                          backdrop-blur-sm text-white text-xs font-semibold
                          rounded-full"
        >
          {category}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Title — truncates on overflow */}
        <h3
          className="font-bold text-gray-900 text-lg leading-snug
                        line-clamp-2 text-balance"
        >
          {title}
        </h3>

        {/* Author row — min-w-0 enables truncation */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar — size-8 = w-8 h-8 */}
          <div className="relative size-8 rounded-full overflow-hidden shrink-0">
            <Image
              src={avatarUrl}
              alt={author}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          {/* Author name — min-w-0 for truncation */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {author}
            </p>
          </div>
          {/* Read time — shrink-0 so it never compresses */}
          <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
            {readTime} min read
          </span>
        </div>
      </div>
    </article>
  );
}
```

---

---

# 5 — Typography — Font Size, Weight, Line Height, Tracking, Alignment

---

## T — TL;DR

Tailwind's typography utilities cover every CSS text property. The core set: `text-sm/base/lg/xl/2xl` for size, `font-medium/semibold/bold` for weight, `leading-tight/normal/relaxed` for line height, `tracking-tight/wide` for letter spacing, and `text-left/center/right` for alignment.

---

## K — Key Concepts

### Font Size Scale

```tsx
{/* Tailwind font size scale with default line heights */}
<p className="text-xs">    {/* 0.75rem / 12px — captions, labels */}
<p className="text-sm">    {/* 0.875rem / 14px — secondary text, metadata */}
<p className="text-base">  {/* 1rem / 16px — body text (default) */}
<p className="text-lg">    {/* 1.125rem / 18px — slightly larger body */}
<p className="text-xl">    {/* 1.25rem / 20px — small headings */}
<p className="text-2xl">   {/* 1.5rem / 24px — card headings */}
<p className="text-3xl">   {/* 1.875rem / 30px — section headings */}
<p className="text-4xl">   {/* 2.25rem / 36px — page headings */}
<p className="text-5xl">   {/* 3rem / 48px — hero headings */}
<p className="text-6xl">   {/* 3.75rem / 60px — display */}
<p className="text-7xl">   {/* 4.5rem / 72px — large display */}
<p className="text-8xl">   {/* 6rem / 96px — huge display */}
<p className="text-9xl">   {/* 8rem / 128px — max display */}

{/* Arbitrary size */}
<p className="text-[13px]">  {/* exactly 13px */}
<p className="text-[1.1rem]">{/* exactly 1.1rem */}

{/* ─── Typography hierarchy recipe */}
{/* Page title:    text-4xl or text-5xl font-bold */}
{/* Section h2:   text-3xl font-bold */}
{/* Card title:   text-xl or text-2xl font-semibold */}
{/* Body text:    text-base or text-sm */}
{/* Caption/meta: text-xs or text-sm text-gray-500 */}
```

### Font Weight

```tsx
<p className="font-thin">       {/* font-weight: 100 */}
<p className="font-extralight"> {/* font-weight: 200 */}
<p className="font-light">      {/* font-weight: 300 */}
<p className="font-normal">     {/* font-weight: 400 — body text */}
<p className="font-medium">     {/* font-weight: 500 — slightly emphasized */}
<p className="font-semibold">   {/* font-weight: 600 — labels, nav items */}
<p className="font-bold">       {/* font-weight: 700 — headings */}
<p className="font-extrabold">  {/* font-weight: 800 — display headings */}
<p className="font-black">      {/* font-weight: 900 — maximum weight */}

{/* Recipe: when to use each weight */}
{/* normal (400):    body text, paragraphs */}
{/* medium (500):    slightly important text, subtle labels */}
{/* semibold (600):  card titles, nav links, table headers */}
{/* bold (700):      section headings, important CTAs */}
{/* extrabold (800): hero headings, display text */}
```

### Line Height

```tsx
{/* ─── Named values */}
<p className="leading-none">    {/* line-height: 1 — no space between lines */}
<p className="leading-tight">   {/* line-height: 1.25 — headings */}
<p className="leading-snug">    {/* line-height: 1.375 */}
<p className="leading-normal">  {/* line-height: 1.5 — body text */}
<p className="leading-relaxed"> {/* line-height: 1.625 — comfortable reading */}
<p className="leading-loose">   {/* line-height: 2 — very open */}

{/* ─── Numeric values (maps to rem) */}
<p className="leading-3">  {/* 0.75rem */}
<p className="leading-4">  {/* 1rem */}
<p className="leading-5">  {/* 1.25rem */}
<p className="leading-6">  {/* 1.5rem */}
<p className="leading-7">  {/* 1.75rem */}
<p className="leading-8">  {/* 2rem */}
<p className="leading-9">  {/* 2.25rem */}
<p className="leading-10"> {/* 2.5rem */}

{/* Recipe: */}
{/* Headings: leading-tight or leading-snug */}
{/* Body text: leading-relaxed */}
{/* Captions: leading-normal */}
```

### Letter Spacing (Tracking)

```tsx
<p className="tracking-tighter"> {/* letter-spacing: -0.05em */}
<p className="tracking-tight">   {/* letter-spacing: -0.025em — large headings */}
<p className="tracking-normal">  {/* letter-spacing: 0 — default */}
<p className="tracking-wide">    {/* letter-spacing: 0.025em */}
<p className="tracking-wider">   {/* letter-spacing: 0.05em */}
<p className="tracking-widest">  {/* letter-spacing: 0.1em — uppercase labels */}

{/* Recipe: */}
{/* Large headings (text-4xl+): tracking-tight */}
{/* Small uppercase labels: uppercase tracking-widest */}
<span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
  Category Label
</span>
```

### Text Alignment and Decoration

```tsx
{/* ─── Alignment */}
<p className="text-left">    {/* left (default) */}
<p className="text-center">  {/* center */}
<p className="text-right">   {/* right */}
<p className="text-justify"> {/* justified (avoid — bad for most UIs) */}

{/* ─── Overflow handling */}
<p className="truncate">        {/* single line truncate with ellipsis */}
<p className="line-clamp-2">    {/* clamp to 2 lines + ellipsis */}
<p className="line-clamp-3">    {/* clamp to 3 lines + ellipsis */}
<p className="whitespace-nowrap">{/* prevent line breaks */}
<p className="break-words">     {/* break long words */}
<p className="break-all">       {/* break anywhere */}

{/* ─── Decoration */}
<p className="underline">        {/* text-decoration: underline */}
<p className="line-through">     {/* strikethrough */}
<p className="no-underline">     {/* remove underline (on <a>) */}
<p className="decoration-blue-600">{/* underline color */}
<p className="decoration-2">     {/* underline thickness */}
<p className="underline-offset-4">{/* underline distance from text */}

{/* ─── Transform */}
<p className="uppercase">    {/* ALL CAPS */}
<p className="lowercase">    {/* all lowercase */}
<p className="capitalize">   {/* Title Case (first char of each word) */}
<p className="normal-case">  {/* reset */}

{/* ─── Whitespace and wrapping */}
<p className="text-balance">   {/* balanced line breaks (headings) */}
<p className="text-pretty">    {/* no orphan words (body text) */}
```

### Typography Compositions

```tsx
{
  /* ─── Hero heading */
}
<h1
  className="text-5xl sm:text-6xl font-extrabold text-gray-900
               leading-tight tracking-tight text-balance"
>
  Build better products
</h1>;

{
  /* ─── Section heading */
}
<h2 className="text-3xl font-bold text-gray-900 leading-tight">
  Our features
</h2>;

{
  /* ─── Card title */
}
<h3 className="text-xl font-semibold text-gray-900 leading-snug text-balance">
  Card title that could be long
</h3>;

{
  /* ─── Body paragraph */
}
<p className="text-base text-gray-600 leading-relaxed text-pretty max-w-prose">
  Body text that's comfortable to read with good line height and a max width to
  keep lines from getting too long.
</p>;

{
  /* ─── Metadata / caption */
}
<p className="text-sm text-gray-500">
  Posted on <time>May 19, 2026</time> · 5 min read
</p>;

{
  /* ─── Uppercase label */
}
<span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
  New Feature
</span>;
```

---

## W — Why It Matters

- `leading-tight` on large headings (`text-4xl` and above) prevents excessive vertical space between lines — the default `leading-normal` (1.5) creates too much gap for large type. Headings should use `leading-tight` (1.25) or `leading-snug` (1.375).
- `line-clamp-*` is the modern replacement for the old JavaScript-based "read more" truncation pattern — it's a single utility that truncates multi-line text with an ellipsis using only CSS.
- `text-balance` (new CSS property) prevents "widow" words (single words on the last line of a heading) — it makes headings look more professionally typeset and is a one-class addition with no downsides for headings.

---

## I — Interview Q&A

### Q1: What is the difference between `truncate` and `line-clamp-*` in Tailwind?

**A:** `truncate` combines `overflow-hidden`, `text-overflow: ellipsis`, and `whitespace-nowrap` — it truncates text to a single line with an ellipsis. It requires the element to have a constrained width to work. `line-clamp-*` uses `-webkit-line-clamp` to clamp text to a specific number of lines (2, 3, etc.) before adding an ellipsis — it works for multi-line truncation. Use `truncate` when you want exactly one line (card titles in a grid, table cells); use `line-clamp-2` or `line-clamp-3` when you want to show a preview of multi-line text (article excerpts, descriptions).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `leading-normal` on large headings — too much space between lines

```tsx
{
  /* ❌ Default leading on a large heading looks too open */
}
<h1 className="text-5xl font-bold">
  Building great products for modern teams
</h1>;
{
  /* line-height: 1.5 on 3rem font = 4.5rem per line → too much gap */
}
```

**Fix:** Use `leading-tight` for headings:

```tsx
{
  /* ✅ Tight leading for headings */
}
<h1 className="text-5xl font-bold leading-tight">
  Building great products for modern teams
</h1>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<BlogPostHeader>` component using ONLY typography utilities:

1. Category label: `text-xs uppercase tracking-widest font-semibold text-blue-600`
2. Title: `text-4xl font-extrabold text-gray-900 leading-tight tracking-tight text-balance`
3. Excerpt: `text-lg text-gray-500 leading-relaxed text-pretty max-w-2xl`
4. Author line: `text-sm text-gray-400` with `·` separators and `font-medium text-gray-700` for the name
5. Reading estimate: `text-sm text-gray-400`

### Solution

```tsx
// src/components/blog-post-header.tsx
interface BlogPostHeaderProps {
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: number;
  tags: string[];
}

export function BlogPostHeader({
  category,
  title,
  excerpt,
  author,
  date,
  readTime,
  tags,
}: BlogPostHeaderProps) {
  return (
    <header className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
      {/* Category label */}
      <span
        className="inline-block text-xs font-semibold uppercase
                        tracking-widest text-blue-600"
      >
        {category}
      </span>

      {/* Title */}
      <h1
        className="text-4xl sm:text-5xl font-extrabold text-gray-900
                      leading-tight tracking-tight text-balance"
      >
        {title}
      </h1>

      {/* Excerpt */}
      <p
        className="text-lg text-gray-500 leading-relaxed text-pretty
                     max-w-2xl mx-auto"
      >
        {excerpt}
      </p>

      {/* Author / meta line */}
      <div
        className="flex items-center justify-center gap-2 text-sm text-gray-400
                       flex-wrap"
      >
        <span className="font-medium text-gray-700">{author}</span>
        <span aria-hidden>·</span>
        <time dateTime={date}>{date}</time>
        <span aria-hidden>·</span>
        <span>{readTime} min read</span>
      </div>

      {/* Tags */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 text-xs font-medium text-gray-600
                            bg-gray-100 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </header>
  );
}
```

---

---

# 6 — Colors — Text, Background, Border, Opacity, CSS Variables

---

## T — TL;DR

Tailwind v4.3's color system uses CSS custom properties — every color utility (`text-blue-600`, `bg-gray-100`) maps to a CSS variable. Custom colors defined in `@theme {}` are immediately available as utilities. Opacity is set via the `/{opacity}` modifier syntax.

---

## K — Key Concepts

### Default Color Palette

```tsx
{/* ─── Color families (same scale for text-, bg-, border-, ring-) */}
{/* Each family: 50 (lightest) → 950 (darkest) */}

{/* Slate — cool gray */}
<div className="bg-slate-50 bg-slate-100 bg-slate-200 bg-slate-300
                bg-slate-400 bg-slate-500 bg-slate-600 bg-slate-700
                bg-slate-800 bg-slate-900 bg-slate-950" />

{/* Gray — neutral gray */}
{/* Zinc — cool gray (slight blue) */}
{/* Neutral — pure gray */}
{/* Stone — warm gray */}

{/* Blues */}
<div className="bg-blue-50">  {/* very light blue — backgrounds */}
<div className="bg-blue-100"> {/* light blue — hover backgrounds */}
<div className="bg-blue-500"> {/* medium blue — icons */}
<div className="bg-blue-600"> {/* primary blue — buttons, links */}
<div className="bg-blue-700"> {/* darker blue — hover states */}
<div className="bg-blue-900"> {/* very dark blue — text on light */}

{/* Same structure for: indigo, violet, purple, fuchsia, pink, rose */}
{/* red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky */}

{/* Semantic colors */}
<div className="text-white">        {/* pure white */}
<div className="text-black">        {/* pure black */}
<div className="bg-transparent">    {/* transparent */}
<div className="bg-current">        {/* currentColor */}
<div className="bg-inherit">        {/* inherit from parent */}
```

### Text, Background, Border Colors

```tsx
{/* ─── Text color */}
<p className="text-gray-900">    {/* near-black body text */}
<p className="text-gray-700">    {/* dark secondary text */}
<p className="text-gray-500">    {/* muted text */}
<p className="text-gray-400">    {/* disabled/placeholder */}
<p className="text-blue-600">    {/* link/accent color */}
<p className="text-red-600">     {/* error text */}
<p className="text-green-600">   {/* success text */}
<p className="text-white">       {/* white on dark backgrounds */}

{/* ─── Background color */}
<div className="bg-white">       {/* card/surface */}
<div className="bg-gray-50">     {/* page background */}
<div className="bg-gray-100">    {/* input background, hover */}
<div className="bg-blue-600">    {/* primary button */}
<div className="bg-blue-50">     {/* light accent area */}
<div className="bg-red-50">      {/* error background */}
<div className="bg-green-50">    {/* success background */}
<div className="bg-amber-50">    {/* warning background */}

{/* ─── Border color */}
<div className="border border-gray-200">  {/* default card border */}
<div className="border border-gray-300">  {/* input border */}
<div className="border border-blue-500">  {/* focused input border */}
<div className="border border-red-400">   {/* error border */}
```

### Opacity Modifier — `/{opacity}`

```tsx
{/* ─── Opacity modifier on any color utility */}
{/* Syntax: color-class/opacity-percentage */}

<div className="bg-blue-600/10">   {/* blue-600 at 10% opacity */}
<div className="bg-blue-600/20">   {/* blue-600 at 20% opacity */}
<div className="bg-blue-600/50">   {/* blue-600 at 50% opacity */}
<div className="bg-blue-600/80">   {/* blue-600 at 80% opacity */}
<div className="bg-black/50">      {/* black at 50% — overlay backdrop */}
<div className="bg-white/80">      {/* white at 80% — frosted glass nav */}

<p className="text-gray-900/70">   {/* text at 70% opacity */}
<div className="border-gray-200/50"> {/* border at 50% opacity */}

{/* ─── Old v3 way (still works but verbose) */}
<div className="bg-blue-600 bg-opacity-50"> {/* ← deprecated pattern */}
{/* ─── v4 way */}
<div className="bg-blue-600/50">            {/* ← clean modifier syntax ✅ */}

{/* ─── Common opacity patterns */}
<div className="bg-black/50 backdrop-blur-sm"> {/* modal overlay */}
<nav className="bg-white/80 backdrop-blur-md"> {/* frosted glass nav */}
<div className="bg-blue-50/50">               {/* very subtle tint */}
```

### Custom Colors from `@theme`

```css
/* globals.css */
@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-900: #1e3a8a;
}
```

```tsx
{/* Custom colors are immediately available as utilities */}
<div className="bg-brand-600">         {/* → background-color: #2563eb */}
<p  className="text-brand-900">        {/* → color: #1e3a8a */}
<div className="border-brand-500">     {/* → border-color: #3b82f6 */}
<div className="bg-brand-50/50">       {/* → with opacity modifier ✅ */}
```

### CSS Variable Colors — Runtime Theming

```tsx
{/* Using CSS variables directly for runtime theming */}
<div style={{ backgroundColor: 'var(--color-surface)' }}>
  {/* This changes at runtime based on dark mode CSS variables */}
</div>

{/* With Tailwind's arbitrary value syntax */}
<div className="bg-[--color-surface]">    {/* reference a CSS variable */}
<p  className="text-[--color-text]">
<div className="border-[--color-border]">

{/* ─── Status color patterns */}
{/* Success */}
<div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
  ✅ Changes saved successfully.
</div>

{/* Error */}
<div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
  ❌ Something went wrong.
</div>

{/* Warning */}
<div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
  ⚠️ This action cannot be undone.
</div>

{/* Info */}
<div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4">
  ℹ️ New update available.
</div>
```

---

## W — Why It Matters

- The `/{opacity}` modifier (e.g., `bg-black/50`) is Tailwind v4's clean way to apply opacity to colors without separate utility classes or inline styles — it generates `rgb(0 0 0 / 0.5)` which is more correct than the old `opacity` property (which affects children too).
- Using consistent color scales (like always using `600` for primary interactive elements, `50` for light backgrounds, `200` for borders) creates visual consistency — once you internalize the scale, you can apply it consistently without design tools.
- The `@theme {}` custom color approach in v4 means custom colors get the same opacity modifier, hover state, dark mode, and responsive support as built-in colors — they're first-class citizens, not afterthoughts.

---

## I — Interview Q&A

### Q1: How does the opacity modifier work for colors in Tailwind v4?

**A:** The `/{opacity}` modifier appends an alpha value to any color utility. For example, `bg-blue-600/50` generates `background-color: oklch(0.5 0.24 264 / 0.5)` (or the equivalent RGB) — the color at 50% opacity. This uses the CSS `color()` function's alpha channel rather than the `opacity` property, which means only the color is transparent, not the children. The syntax works on `bg-*`, `text-*`, `border-*`, `ring-*`, and any other color utility. Common uses: `bg-black/50` for modal overlays, `bg-white/80` for frosted glass navs, `bg-blue-600/10` for subtle tinted backgrounds.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `opacity-50` instead of the color opacity modifier — makes children transparent too

```tsx
{
  /* ❌ opacity-50 makes EVERYTHING in the div transparent (text, children, borders) */
}
<div className="bg-blue-600 opacity-50 text-white">
  This text is also 50% transparent — hard to read ❌
</div>;
```

**Fix:** Use the color opacity modifier for background only:

```tsx
{
  /* ✅ Only the background is transparent — text remains opaque */
}
<div className="bg-blue-600/50 text-white">This text is fully opaque ✅</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<StatusBanner>` component that renders 4 variants (success, error, warning, info) using color utilities:

1. Each has a `bg-*-50 border border-*-200 text-*-800` pattern
2. Title uses `font-semibold`, body uses `text-sm`
3. An icon and a dismiss button using `text-*-400 hover:text-*-600`
4. Custom brand color variant using `@theme` custom colors
5. All composed without any custom CSS

### Solution

```tsx
// src/components/status-banner.tsx
type BannerVariant = "success" | "error" | "warning" | "info" | "brand";

interface BannerProps {
  variant: BannerVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
}

const VARIANTS: Record<
  BannerVariant,
  {
    wrapper: string;
    icon: string;
    dismiss: string;
    emoji: string;
  }
> = {
  success: {
    wrapper: "bg-green-50 border-green-200 text-green-800",
    icon: "text-green-500",
    dismiss: "text-green-400 hover:text-green-600",
    emoji: "✅",
  },
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-500",
    dismiss: "text-red-400 hover:text-red-600",
    emoji: "❌",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "text-amber-500",
    dismiss: "text-amber-400 hover:text-amber-600",
    emoji: "⚠️",
  },
  info: {
    wrapper: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-500",
    dismiss: "text-blue-400 hover:text-blue-600",
    emoji: "ℹ️",
  },
  brand: {
    wrapper: "bg-brand-50 border-brand-200 text-brand-900",
    icon: "text-brand-500",
    dismiss: "text-brand-400 hover:text-brand-600",
    emoji: "🚀",
  },
};

export function StatusBanner({
  variant,
  title,
  message,
  onDismiss,
}: BannerProps) {
  const v = VARIANTS[variant];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${v.wrapper}`}
      role="alert"
    >
      <span className="shrink-0 text-base leading-5">{v.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-5">{title}</p>
        {message && <p className="text-sm mt-0.5 opacity-80">{message}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 text-sm font-medium transition-colors ${v.dismiss}`}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

---

---

# 7 — Borders, Shadows, and Visual Effects

---

## T — TL;DR

Borders (`border`, `border-*`, `rounded-*`), shadows (`shadow-*`), rings (`ring-*`), and effects (`blur-*`, `backdrop-blur-*`, `opacity-*`) handle visual depth and separation. The `ring-*` utilities are Tailwind's preferred way to show focus states — they use `outline` and avoid layout shifts.

---

## K — Key Concepts

### Borders

```tsx
{/* ─── Border width */}
<div className="border">       {/* 1px solid */}
<div className="border-0">     {/* none */}
<div className="border-2">     {/* 2px solid */}
<div className="border-4">     {/* 4px solid */}
<div className="border-8">     {/* 8px solid */}

{/* ─── Border sides */}
<div className="border-t">     {/* top only */}
<div className="border-b">     {/* bottom only */}
<div className="border-l">     {/* left only */}
<div className="border-r">     {/* right only */}
<div className="border-x">     {/* left + right */}
<div className="border-y">     {/* top + bottom */}

{/* ─── Border color */}
<div className="border border-gray-200">   {/* standard card border */}
<div className="border border-gray-300">   {/* input border */}
<div className="border border-blue-500">   {/* focused/active border */}
<div className="border border-red-400">    {/* error border */}
<div className="border border-transparent">{/* no visible border (layout) */}

{/* ─── Border style */}
<div className="border border-dashed border-gray-300">   {/* dashed */}
<div className="border border-dotted border-gray-300">   {/* dotted */}
<div className="border-2 border-solid border-gray-300">  {/* solid (default) */}

{/* ─── Divide — borders between children */}
<ul className="divide-y divide-gray-200">
  <li className="py-3">First item</li>
  <li className="py-3">Second item — border-top from divide-y</li>
  <li className="py-3">Third item</li>
</ul>
```

### Border Radius

```tsx
{/* ─── Uniform radius */}
<div className="rounded-none">   {/* 0 */}
<div className="rounded-sm">     {/* 0.125rem = 2px */}
<div className="rounded">        {/* 0.25rem = 4px */}
<div className="rounded-md">     {/* 0.375rem = 6px */}
<div className="rounded-lg">     {/* 0.5rem = 8px — cards, buttons */}
<div className="rounded-xl">     {/* 0.75rem = 12px — cards */}
<div className="rounded-2xl">    {/* 1rem = 16px — modern cards */}
<div className="rounded-3xl">    {/* 1.5rem = 24px — pill shapes */}
<div className="rounded-full">   {/* 9999px — circles, pills */}

{/* ─── Specific corners */}
<div className="rounded-t-xl">   {/* top corners */}
<div className="rounded-b-xl">   {/* bottom corners */}
<div className="rounded-l-xl">   {/* left corners */}
<div className="rounded-r-xl">   {/* right corners */}
<div className="rounded-tl-xl">  {/* top-left only */}
<div className="rounded-tr-xl">  {/* top-right only */}

{/* ─── Recipe */}
{/* Input fields:       rounded-lg */}
{/* Buttons:            rounded-lg or rounded-xl */}
{/* Cards:              rounded-xl or rounded-2xl */}
{/* Badges/pills:       rounded-full */}
{/* Profile photos:     rounded-full */}
{/* Modal dialogs:      rounded-2xl */}
```

### Box Shadows

```tsx
{/* ─── Default shadows */}
<div className="shadow-none">    {/* no shadow */}
<div className="shadow-sm">      {/* subtle shadow — inputs, small cards */}
<div className="shadow">         {/* default shadow — standard card */}
<div className="shadow-md">      {/* medium — hover card */}
<div className="shadow-lg">      {/* large — modals, dropdowns */}
<div className="shadow-xl">      {/* extra large — floating panels */}
<div className="shadow-2xl">     {/* strongest — primary CTAs */}

{/* ─── Shadow color */}
<div className="shadow-lg shadow-blue-500/25"> {/* blue-tinted shadow */}
<div className="shadow-md shadow-black/10">    {/* subtle shadow */}

{/* ─── Custom shadow (from @theme) */}
<div className="shadow-glow"> {/* → var(--shadow-glow) from globals.css */}

{/* ─── Inner shadow */}
<div className="shadow-inner"> {/* inset shadow — recessed inputs */}
```

### Ring — Focus and Outline States

```tsx
{/* ─── Ring is the CORRECT way to show focus in Tailwind */}
{/* Ring uses CSS outline (not box-shadow) — no layout shift */}

{/* ─── Ring width */}
<button className="ring-0">     {/* no ring */}
<button className="ring-1">     {/* 1px ring */}
<button className="ring-2">     {/* 2px ring — focus indicator */}
<button className="ring-4">     {/* 4px ring */}

{/* ─── Ring color */}
<button className="ring-2 ring-blue-500">    {/* blue ring */}
<button className="ring-2 ring-red-400">     {/* red error ring */}
<button className="ring-2 ring-offset-2">   {/* ring with 2px offset from element */}

{/* ─── Standard focus ring pattern */}
<button className="focus-visible:ring-2 focus-visible:ring-blue-500
                   focus-visible:ring-offset-2 focus-visible:outline-none">
  Button with accessible focus ring
</button>

{/* ─── Outline replacement */}
<input className="border border-gray-300 rounded-lg px-3 py-2
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent" />
```

### Visual Effects

```tsx
{/* ─── Blur */}
<div className="blur-none">    {/* no blur */}
<div className="blur-sm">      {/* blur: 4px */}
<div className="blur">         {/* blur: 8px */}
<div className="blur-md">      {/* blur: 12px */}
<div className="blur-lg">      {/* blur: 16px */}
<div className="blur-xl">      {/* blur: 24px */}
<div className="blur-2xl">     {/* blur: 40px */}
<div className="blur-3xl">     {/* blur: 64px */}

{/* ─── Backdrop blur (frosted glass) */}
<div className="backdrop-blur-sm">   {/* 4px — subtle */}
<div className="backdrop-blur-md">   {/* 12px — standard glass */}
<div className="backdrop-blur-xl">   {/* 24px — heavy glass */}

{/* ─── Frosted glass nav pattern */}
<nav className="bg-white/80 backdrop-blur-sm border-b border-white/20
                sticky top-0 z-40">
  Navigation
</nav>

{/* ─── Opacity */}
<div className="opacity-0">    {/* invisible */}
<div className="opacity-25">   {/* 25% */}
<div className="opacity-50">   {/* 50% */}
<div className="opacity-75">   {/* 75% */}
<div className="opacity-100">  {/* fully visible */}

{/* ─── Gradient backgrounds */}
<div className="bg-gradient-to-r from-blue-600 to-purple-600">  {/* left → right */}
<div className="bg-gradient-to-br from-blue-600 to-purple-700"> {/* top-left → bottom-right */}
<div className="bg-gradient-to-b from-white to-gray-50">        {/* top → bottom */}
<div className="bg-gradient-to-t from-black/60 to-transparent"> {/* image overlay */}
```

---

## W — Why It Matters

- `ring-*` over `outline-*` is Tailwind's approach to focus indicators — `ring-2 ring-blue-500 ring-offset-2` creates a visible, accessible focus ring using CSS outline under the hood. The `focus-visible:` variant (see subtopic 8) ensures it only shows for keyboard users, not mouse users.
- `divide-y divide-gray-200` is the clean way to add borders between list items — it adds a top border to every child except the first, replacing the need for `:not(:last-child)` margin hacks or manual `border-b` on each item except the last.
- The frosted glass pattern (`bg-white/80 backdrop-blur-md`) is ubiquitous in modern design — it creates depth without heavy shadow, and is now achievable with just two utility classes.

---

## I — Interview Q&A

### Q1: What is the difference between `shadow-*` and `ring-*` in Tailwind?

**A:** `shadow-*` applies `box-shadow` — it creates a visual shadow effect for depth and elevation (cards, modals, dropdowns). It adds to the visual layer outside the element's border-box. `ring-*` applies `outline` — it creates a ring around the element for focus/selection states. Unlike `box-shadow`, `outline` doesn't affect layout and renders outside the border-box without taking up space. The `ring-*` utilities are specifically designed for accessibility focus indicators — they're visible to keyboard users and screen reader users. Using `box-shadow` for focus indicators can create layout shifts; `ring-*` does not.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `outline: none` without providing a visible focus indicator

```tsx
{
  /* ❌ Removes focus indicator entirely — accessibility violation */
}
<button className="outline-none">
  {" "}
  {/* keyboard users can't see focus */}
  Submit
</button>;
```

**Fix:** Replace with `focus-visible` ring:

```tsx
{
  /* ✅ Hides outline for mouse, shows ring for keyboard */
}
<button
  className="focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
>
  Submit
</button>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<GlassCard>` component using visual effect utilities:

1. Frosted glass: `bg-white/20 backdrop-blur-md border border-white/30`
2. Gradient background on the containing section: `bg-gradient-to-br from-blue-600 to-purple-700`
3. Card shadow: `shadow-xl shadow-black/20`
4. Rounded: `rounded-2xl`
5. Title and body text in white with different opacities
6. A badge using `ring-1 ring-white/30`

### Solution

```tsx
// src/components/glass-card.tsx
export function GlassCardDemo() {
  return (
    {/* Gradient background container */}
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600
                     to-pink-600 flex items-center justify-center p-8">
      {/* Frosted glass card */}
      <div className="bg-white/20 backdrop-blur-md border border-white/30
                       rounded-2xl shadow-xl shadow-black/20 p-8 max-w-sm w-full">

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6
                          bg-white/20 ring-1 ring-white/30 rounded-full
                          text-white/90 text-xs font-semibold uppercase
                          tracking-widest">
          ✨ Featured
        </span>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white leading-tight mb-3">
          Glass Morphism Card
        </h2>

        {/* Body */}
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          A frosted glass effect using Tailwind's backdrop-blur and
          white opacity utilities — no custom CSS needed.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6 py-4
                         border-y border-white/20">
          {[
            { label: 'Users',   value: '12K' },
            { label: 'Uptime',  value: '99.9%' },
            { label: 'Version', value: 'v4.3' }
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="w-full py-2.5 bg-white text-purple-700 font-semibold
                            text-sm rounded-xl hover:bg-white/90 transition-colors
                            shadow-lg shadow-black/10">
          Get started
        </button>
      </div>
    </div>
  )
}
```

---

---

# 8 — Hover, Focus, and Interactive States

---

## T — TL;DR

Tailwind uses **variant prefixes** (`hover:`, `focus:`, `focus-visible:`, `active:`, `disabled:`, `group-hover:`) to apply styles conditionally. These are pseudo-class utilities — no JavaScript needed. Use `focus-visible:` for accessibility-correct focus rings and `group` + `group-hover:` for parent-triggered child styles.

---

## K — Key Concepts

### Core State Variants

```tsx
{/* ─── hover: — on mouse hover */}
<button className="bg-blue-600 hover:bg-blue-700">   {/* darken on hover */}
<a      className="text-gray-600 hover:text-gray-900 hover:underline">
<div    className="opacity-80 hover:opacity-100">

{/* ─── focus: — when focused (keyboard or mouse) */}
<input  className="border border-gray-300 focus:border-blue-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500/20" />

{/* ─── focus-visible: — ONLY when focused via keyboard (not mouse) */}
<button className="focus-visible:ring-2 focus-visible:ring-blue-500
                   focus-visible:ring-offset-2 focus-visible:outline-none">
  Keyboard-accessible button
</button>

{/* ─── active: — while being clicked */}
<button className="active:scale-95 active:bg-blue-800">

{/* ─── disabled: — when element has disabled attribute */}
<button disabled
        className="disabled:opacity-50 disabled:cursor-not-allowed
                   disabled:pointer-events-none">

{/* ─── visited: — visited links */}
<a className="text-blue-600 visited:text-purple-600">

{/* ─── placeholder: — input placeholder text */}
<input className="placeholder:text-gray-400 placeholder:text-sm" />

{/* ─── selection: — selected text */}
<p className="selection:bg-blue-600 selection:text-white">

{/* ─── first: last: odd: even: — list children */}
<ul>
  {items.map((item, i) => (
    <li key={i}
        className="py-2 first:pt-0 last:pb-0 odd:bg-gray-50 even:bg-white">
      {item}
    </li>
  ))}
</ul>
```

### Transition Utilities — Smooth State Changes

```tsx
{/* ─── transition: controls WHICH properties animate */}
<div className="transition">           {/* all: color, bg, border, opacity, shadow, transform */}
<div className="transition-colors">    {/* only color/background/border */}
<div className="transition-opacity">   {/* only opacity */}
<div className="transition-transform"> {/* only transform */}
<div className="transition-shadow">    {/* only box-shadow */}
<div className="transition-all">       {/* literally everything (expensive) */}
<div className="transition-none">      {/* disable transitions */}

{/* ─── Duration */}
<div className="duration-75">    {/* 75ms */}
<div className="duration-100">   {/* 100ms */}
<div className="duration-150">   {/* 150ms — fast interaction */}
<div className="duration-200">   {/* 200ms — standard */}
<div className="duration-300">   {/* 300ms — entering elements */}
<div className="duration-500">   {/* 500ms — slow/dramatic */}

{/* ─── Easing */}
<div className="ease-linear">   {/* linear */}
<div className="ease-in">       {/* starts slow */}
<div className="ease-out">      {/* ends slow (good for entering) */}
<div className="ease-in-out">   {/* both (good for state changes) */}

{/* ─── Standard interactive button */}
<button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold
                   hover:bg-blue-700 active:scale-[0.97] transition-all
                   duration-150 ease-in-out focus-visible:ring-2
                   focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   focus-visible:outline-none disabled:opacity-50
                   disabled:cursor-not-allowed">
  Submit
</button>
```

### Transform Utilities for Interactions

```tsx
{/* ─── Scale */}
<div className="hover:scale-105">    {/* grow on hover */}
<div className="hover:scale-110">    {/* more growth */}
<div className="active:scale-95">    {/* shrink on click */}
<div className="hover:scale-[1.02]">{/* subtle scale */}

{/* ─── Translate */}
<div className="hover:-translate-y-1">  {/* lift up 4px */}
<div className="hover:translate-x-1">   {/* nudge right */}
<div className="hover:-translate-y-0.5 hover:shadow-md transition-all">
  {/* card lift effect */}
</div>

{/* ─── Rotate */}
<div className="hover:rotate-6">    {/* rotate 6deg */}
<div className="hover:-rotate-3">   {/* rotate -3deg */}
```

### `group` — Parent-Triggered Child Styles

```tsx
{
  /* group on parent, group-hover: on child */
}
{
  /* Hover the parent → children with group-hover: respond */
}

<div
  className="group flex items-center gap-3 p-4 rounded-xl
                hover:bg-blue-50 transition-colors cursor-pointer"
>
  {/* Icon changes color on parent hover */}
  <span
    className="text-gray-400 group-hover:text-blue-600 transition-colors
                   text-xl shrink-0"
  >
    📧
  </span>
  {/* Text changes on parent hover */}
  <div className="min-w-0">
    <p
      className="font-medium text-gray-900 group-hover:text-blue-700
                  transition-colors"
    >
      Email
    </p>
    <p
      className="text-sm text-gray-500 group-hover:text-blue-500
                  transition-colors truncate"
    >
      mark@example.com
    </p>
  </div>
  {/* Arrow slides right on parent hover */}
  <span
    className="ml-auto text-gray-300 group-hover:text-blue-500
                   group-hover:translate-x-1 transition-all shrink-0"
  >
    →
  </span>
</div>;

{
  /* ─── Nested groups (group/{name}) */
}
<div className="group/card border rounded-xl p-4 hover:border-blue-500">
  <div className="group/action flex gap-2 opacity-0 group-hover/card:opacity-100">
    <button className="group-hover/action:bg-blue-100">Edit</button>
    <button className="group-hover/action:bg-red-100">Delete</button>
  </div>
</div>;
```

### `peer` — Sibling-Triggered Styles

```tsx
{/* peer on an element, peer-* on a sibling AFTER it */}
{/* Useful for: checkbox states, input validation, radio groups */}

{/* ─── Custom checkbox */}
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    className="peer sr-only"   {/* visually hidden but functional */}
  />
  {/* Custom checkbox visual — responds to peer state */}
  <span className="w-5 h-5 border-2 border-gray-300 rounded
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                   flex items-center justify-center transition-colors">
    <span className="text-white text-xs opacity-0 peer-checked:opacity-100">
      ✓
    </span>
  </span>
  <span className="text-sm text-gray-700 peer-checked:text-blue-700
                   peer-checked:font-medium">
    Accept terms
  </span>
</label>

{/* ─── Input validation state */}
<div>
  <input
    type="email"
    className="peer w-full border rounded-lg px-3 py-2
               focus:outline-none focus:ring-2 focus:ring-blue-500
               invalid:border-red-400 invalid:focus:ring-red-400"
    required
  />
  <p className="mt-1 text-xs text-red-500 hidden peer-invalid:block">
    Please enter a valid email address.
  </p>
</div>
```

---

## W — Why It Matters

- `focus-visible:` is the accessibility-correct alternative to `focus:` — `focus:` shows focus rings for both mouse and keyboard users (looks wrong for mouse), `focus-visible:` only shows for keyboard navigation. This is the modern standard, removing the need to write `outline: none` while keeping keyboard accessibility intact.
- `group-hover:` eliminates the need for JavaScript-driven hover effects on parent elements — no `useState`, no event handlers, no re-renders. A hover effect that reveals child elements is pure CSS via `group` + `group-hover:opacity-100`.
- `peer-checked:` for custom checkbox and radio styling replaces JavaScript-controlled checked state tracking — a custom checkbox that responds to the `checked` state of a real `<input type="checkbox">` is now achievable with pure Tailwind utilities.

---

## I — Interview Q&A

### Q1: What is the difference between `focus:` and `focus-visible:` variants in Tailwind?

**A:** `focus:` applies styles whenever the element receives focus — both from keyboard navigation (Tab key) and mouse click. `focus-visible:` applies styles only when the browser determines the focus indicator should be shown based on the user's input modality — typically keyboard navigation but not mouse clicks. For accessibility, you should replace `focus:outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500` — this removes the distracting outline for mouse users (who can see what they clicked) while maintaining a clear focus indicator for keyboard users who need to know where focus is.

### Q2: How does `group` work in Tailwind and what problem does it solve?

**A:** Adding `group` to a parent element creates a named scope for child styles. Child elements can then use `group-hover:`, `group-focus:`, `group-active:` variants to apply styles when the parent receives that state — without JavaScript. This solves the problem of "hover over a card to reveal its action buttons" or "hover over a list item to change the arrow color" — traditionally requiring JavaScript event handlers. With `group`, you add the class to the container and `group-hover:opacity-100` to the hidden child — pure CSS, zero JavaScript.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `transition-colors` and having jarring instant state changes

```tsx
{
  /* ❌ Instant color change — looks glitchy */
}
<button className="bg-blue-600 hover:bg-blue-700">Submit</button>;
```

**Fix:** Add transition utilities:

```tsx
{
  /* ✅ Smooth 150ms transition */
}
<button
  className="bg-blue-600 hover:bg-blue-700
                   transition-colors duration-150"
>
  Submit
</button>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<FeatureRow>` list component where:

1. Parent row uses `group` with `hover:bg-blue-50 transition-colors`
2. Icon changes from `text-gray-400` to `text-blue-600` on `group-hover:`
3. Arrow icon slides right on `group-hover:` using `translate-x-1`
4. Action buttons use `opacity-0 group-hover:opacity-100 transition-opacity`
5. A checkbox using `peer` and `peer-checked:` for custom styling
6. All state transitions use `duration-150 ease-in-out`

### Solution

```tsx
// src/components/feature-row.tsx
"use client";

import { useState } from "react";

interface FeatureRowProps {
  icon: string;
  title: string;
  description: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FeatureRow({
  icon,
  title,
  description,
  onEdit,
  onDelete,
}: FeatureRowProps) {
  return (
    <div
      className="group flex items-center gap-4 px-4 py-4 rounded-xl
                     hover:bg-blue-50 transition-colors duration-150 ease-in-out
                     cursor-pointer border border-transparent
                     hover:border-blue-100"
    >
      {/* Icon — changes color on parent hover */}
      <span
        className="shrink-0 text-2xl text-gray-400 group-hover:text-blue-600
                        transition-colors duration-150 ease-in-out"
      >
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-gray-900 group-hover:text-blue-800
                       transition-colors duration-150"
        >
          {title}
        </p>
        <p
          className="text-sm text-gray-500 group-hover:text-blue-600/70
                       transition-colors duration-150 truncate"
        >
          {description}
        </p>
      </div>

      {/* Action buttons — hidden, revealed on group-hover */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                       transition-opacity duration-150 ease-in-out shrink-0"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-100
                      rounded-lg hover:bg-blue-200 active:scale-95
                      transition-all duration-150 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50
                      rounded-lg hover:bg-red-100 active:scale-95
                      transition-all duration-150 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Delete
        </button>
      </div>

      {/* Arrow — slides right on group-hover */}
      <span
        className="shrink-0 text-gray-300 group-hover:text-blue-400
                        group-hover:translate-x-1 transition-all duration-150
                        ease-in-out"
      >
        →
      </span>
    </div>
  );
}

// ─── Custom checkbox using peer ─────────────────────────────────────────────

interface CheckboxProps {
  label: string;
  id: string;
  defaultChecked?: boolean;
}

export function CustomCheckbox({ label, id, defaultChecked }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none group"
    >
      {/* Real input — visually hidden but accessible */}
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />

      {/* Custom checkbox visual — responds to peer state */}
      <span
        className="relative flex shrink-0 size-5 items-center justify-center
                        rounded border-2 border-gray-300 bg-white
                        transition-colors duration-150 ease-in-out
                        peer-checked:border-blue-600 peer-checked:bg-blue-600
                        peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                        peer-focus-visible:ring-offset-2
                        group-hover:border-blue-400"
      >
        {/* Checkmark — hidden until checked */}
        <svg
          className="size-3 text-white opacity-0 peer-checked:opacity-100
                     transition-opacity duration-150 absolute"
          viewBox="0 0 12 12"
          fill="none"
          style={{ pointerEvents: "none" }}
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Label text — changes on checked */}
      <span
        className="text-sm text-gray-700 transition-colors duration-150
                        peer-checked:text-blue-700 peer-checked:font-medium"
      >
        {label}
      </span>
    </label>
  );
}

// ─── Demo page ───────────────────────────────────────────────────────────────

export function InteractiveStatesDemo() {
  const features = [
    {
      icon: "📧",
      title: "Email notifications",
      description: "Get notified via email for every event",
    },
    {
      icon: "🔔",
      title: "Push notifications",
      description: "Instant alerts on your devices",
    },
    {
      icon: "📊",
      title: "Analytics dashboard",
      description: "Real-time insights and reporting",
    },
    {
      icon: "🔒",
      title: "Two-factor auth",
      description: "Extra security for your account",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
      {/* Feature rows */}
      <div
        className="bg-white border border-gray-200 rounded-2xl overflow-hidden
                       divide-y divide-gray-100"
      >
        {features.map((f) => (
          <FeatureRow
            key={f.title}
            {...f}
            onEdit={() => alert(`Edit: ${f.title}`)}
            onDelete={() => alert(`Delete: ${f.title}`)}
          />
        ))}
      </div>

      {/* Custom checkboxes using peer */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Preferences
        </h3>
        <CustomCheckbox
          id="emails"
          label="Receive marketing emails"
          defaultChecked
        />
        <CustomCheckbox id="updates" label="Product update notifications" />
        <CustomCheckbox id="security" label="Security alerts" defaultChecked />
      </div>
    </div>
  );
}

/*
  State variants used:
  group + group-hover:     → parent hover triggers child styles (no JS) ✅
  peer + peer-checked:     → sibling state drives custom checkbox visuals ✅
  focus-visible:ring-*     → keyboard-only focus ring (accessibility) ✅
  active:scale-95          → button press feedback ✅
  transition-* duration-*  → smooth 150ms animations ✅
  opacity-0 + group-hover:opacity-100 → reveal on hover ✅
  translate-x-1 on hover   → directional nudge feedback ✅
*/
```

---

---

# 9 — Responsive Variants — Mobile-First Breakpoints

---

## T — TL;DR

Tailwind is **mobile-first** — unprefixed utilities apply to all screen sizes, and breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) apply at that size **and above**. You build for mobile first, then layer on overrides for larger screens.

---

## K — Key Concepts

### The Breakpoint System

```
Default breakpoints in Tailwind v4.3:

  Prefix   Min-width   Typical device
  ──────────────────────────────────────────────
  (none)   0px         All devices (mobile first)
  sm:      40rem/640px  Large phones, landscape
  md:      48rem/768px  Tablets
  lg:      64rem/1024px Small laptops
  xl:      80rem/1280px Desktops
  2xl:     96rem/1536px Large desktops

Custom breakpoints (added in @theme {}):
  xs:      30rem/480px  Small phones
  3xl:     112rem/1792px Ultra-wide

Rule: classes WITHOUT a prefix → apply at ALL sizes
      sm:class → applies at sm (640px) and ABOVE
      lg:class → applies at lg (1024px) and ABOVE
```

### Mobile-First Mental Model

```tsx
{
  /* ─── Read this left-to-right as sizes increase */
}

{
  /* ❌ Thinking desktop-first (wrong mental model): */
}
{
  /* "On desktop it's 3 columns. On tablet make it 2. On mobile make it 1." */
}

{
  /* ✅ Thinking mobile-first (correct): */
}
{
  /* "On mobile it's 1 column. On tablet (sm:) make it 2. On desktop (lg:) make it 3." */
}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/*            ↑ mobile      ↑ 640px+         ↑ 1024px+          */}
</div>;

{
  /* ─── Font sizes — small on mobile, larger on desktop */
}
<h1
  className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
               font-extrabold leading-tight"
>
  {/* mobile: 30px | sm+: 36px | lg+: 48px | xl+: 60px */}
  Hero Heading
</h1>;

{
  /* ─── Padding — tight on mobile, comfortable on desktop */
}
<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
  {/* mobile: px-16px py-48px | sm: px-24px py-64px | lg: px-32px py-80px */}
</section>;

{
  /* ─── Flex direction — vertical on mobile, horizontal on desktop */
}
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
  <img className="w-full sm:w-48 rounded-xl" />
  <div>Content</div>
</div>;
```

### Responsive Visibility

```tsx
{
  /* ─── Show/hide at breakpoints */
}

{
  /* Hidden on mobile, visible on md+ */
}
<div className="hidden md:block">Desktop-only sidebar</div>;

{
  /* Visible on mobile, hidden on md+ */
}
<div className="block md:hidden">Mobile hamburger menu</div>;

{
  /* Visible only on sm (640px–768px) */
}
<div className="hidden sm:block md:hidden">Tablet only</div>;

{
  /* ─── Responsive navigation pattern */
}
<nav className="flex items-center justify-between px-4 h-14">
  <span className="font-bold">Logo</span>

  {/* Desktop nav links — hidden on mobile */}
  <div className="hidden md:flex items-center gap-6">
    <a className="text-sm text-gray-600 hover:text-gray-900">Docs</a>
    <a className="text-sm text-gray-600 hover:text-gray-900">Blog</a>
    <button
      className="px-4 py-2 bg-blue-600 text-white text-sm
                        rounded-lg font-medium"
    >
      Sign in
    </button>
  </div>

  {/* Mobile hamburger — hidden on desktop */}
  <button className="md:hidden p-2 text-gray-600">☰</button>
</nav>;
```

### Responsive Layout Patterns

```tsx
{
  /* ─── Responsive hero section */
}
<section
  className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
                     py-16 sm:py-20 lg:py-28"
>
  <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
    {/* Text content — full width on mobile, half on desktop */}
    <div className="w-full lg:w-1/2 text-center lg:text-left">
      <h1
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold
                      text-gray-900 leading-tight text-balance"
      >
        Build faster with Tailwind
      </h1>
      <p
        className="mt-4 text-lg sm:text-xl text-gray-500 leading-relaxed
                     text-pretty max-w-prose mx-auto lg:mx-0"
      >
        A utility-first CSS framework for rapidly building custom UIs.
      </p>
      <div
        className="mt-8 flex flex-col sm:flex-row gap-3
                       justify-center lg:justify-start"
      >
        <button
          className="px-6 py-3 bg-blue-600 text-white font-semibold
                            rounded-xl hover:bg-blue-700 transition-colors"
        >
          Get started
        </button>
        <button
          className="px-6 py-3 border border-gray-300 text-gray-700
                            font-semibold rounded-xl hover:bg-gray-50
                            transition-colors"
        >
          View docs
        </button>
      </div>
    </div>

    {/* Image — full width on mobile, half on desktop */}
    <div
      className="w-full lg:w-1/2 aspect-video lg:aspect-square relative
                     rounded-2xl overflow-hidden bg-gradient-to-br
                     from-blue-100 to-purple-100"
    >
      {/* Image placeholder */}
      <div
        className="absolute inset-0 flex items-center justify-center
                       text-blue-300 text-6xl"
      >
        🎨
      </div>
    </div>
  </div>
</section>;

{
  /* ─── Responsive card grid */
}
<div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                 xl:grid-cols-4 gap-4 sm:gap-6"
>
  {cards.map((card) => (
    <Card key={card.id} {...card} />
  ))}
</div>;

{
  /* ─── Responsive table — scroll on mobile */
}
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="min-w-full divide-y divide-gray-200">
    <thead>
      <tr>
        <th
          className="px-4 sm:px-6 py-3 text-left text-xs font-semibold
                        text-gray-500 uppercase tracking-wider"
        >
          Name
        </th>
        {/* Hide less-important columns on mobile */}
        <th
          className="hidden sm:table-cell px-6 py-3 text-left text-xs
                        font-semibold text-gray-500 uppercase tracking-wider"
        >
          Email
        </th>
        <th
          className="px-4 sm:px-6 py-3 text-left text-xs font-semibold
                        text-gray-500 uppercase tracking-wider"
        >
          Status
        </th>
      </tr>
    </thead>
  </table>
</div>;
```

### Responsive Typography Scale

```tsx
{/* ─── The responsive type recipe */}
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
               font-extrabold leading-tight tracking-tight">
  Display heading
</h1>

<h2 className="text-2xl sm:text-3xl lg:text-4xl
               font-bold leading-tight">
  Section heading
</h2>

<h3 className="text-xl sm:text-2xl font-semibold leading-snug">
  Card / sub-section heading
</h3>

<p className="text-base sm:text-lg leading-relaxed text-gray-600">
  Body text — slightly larger on bigger screens
</p>

{/* ─── Responsive spacing scale */}
{/* padding: tight → comfortable as screen grows */}
<div className="p-4 sm:p-6 lg:p-8">Card content</div>

{/* margin/gap: smaller on mobile, larger on desktop */}
<div className="grid gap-4 sm:gap-6 lg:gap-8">Grid</div>
```

### Custom Breakpoints in `@theme`

```css
/* globals.css */
@theme {
  --breakpoint-xs: 30rem; /* 480px — small phones */
  --breakpoint-3xl: 112rem; /* 1792px — ultra-wide */
}
```

```tsx
{/* Custom breakpoints are available as variants immediately */}
<div className="text-sm xs:text-base lg:text-lg">
  Responsive with custom xs breakpoint
</div>

<div className="max-w-7xl 3xl:max-w-[1600px] mx-auto">
  Wider container on ultra-wide screens
</div>
```

### Arbitrary Breakpoints

```tsx
{/* ─── One-off breakpoint values */}
<div className="min-[500px]:flex">     {/* flex at ≥500px */}
<div className="max-[400px]:hidden">   {/* hidden at ≤400px */}
<div className="min-[900px]:grid-cols-3"> {/* 3 cols at ≥900px */}

{/* ─── Range queries */}
<div className="sm:max-lg:bg-blue-50"> {/* sm to lg only */}
<div className="md:max-xl:text-lg">    {/* md to xl only */}
```

---

## W — Why It Matters

- The mobile-first approach means your CSS loads with mobile styles as the base — on mobile devices (usually on slower networks), no media query parsing is needed for the default styles. Larger breakpoint overrides are only applied when the screen is wide enough.
- Understanding that `sm:grid-cols-2` means "2 columns at 640px AND ABOVE" (not "only at 640px") is the most common source of confusion for Tailwind beginners. Reading the breakpoint prefix as "at this size and up" prevents the vast majority of responsive layout bugs.
- `hidden md:block` and `block md:hidden` are the two most-used responsive visibility patterns — every responsive layout needs to show/hide elements between mobile and desktop, and these two class combinations cover nearly every case.

---

## I — Interview Q&A

### Q1: What does "mobile-first" mean in Tailwind CSS and how does it affect how you write responsive classes?

**A:** Mobile-first means that unprefixed utilities apply to all screen sizes starting from the smallest, and breakpoint prefixes like `sm:`, `md:`, `lg:` act as minimum-width overrides — they apply at that breakpoint and all larger sizes. You write base styles for mobile (no prefix), then layer on overrides for progressively larger screens. For example, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` starts as 1 column on mobile, becomes 2 at 640px+, and 3 at 1024px+. The mental model is additive: start simple for the smallest screen and add complexity as the viewport grows.

### Q2: How do you make an element visible only on mobile and hidden on desktop in Tailwind?

**A:** Use `block md:hidden` — this shows the element on all screens below 768px (the `md` breakpoint) and hides it at 768px and above. The inverse, `hidden md:block`, hides the element on mobile and shows it at 768px and above. The key insight is that `hidden` sets `display: none` for all sizes, and `md:block` overrides it to `display: block` at 768px+. You can swap `block` for `flex`, `grid`, or `inline` as needed — e.g., `hidden md:flex` for a flex nav that only appears on desktop.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Thinking `sm:` means "only on small screens" — it means "small and above"

```tsx
{
  /* ❌ Expecting 2 columns ONLY on sm, 1 column everywhere else */
}
<div className="grid-cols-1 sm:grid-cols-2">
  {/* This gives: mobile=1col, sm+=2col (stays 2 forever) */}
  {/* Not: mobile=1col, sm-only=2col, md+=1col again */}
</div>;

{
  /* If you want: mobile=1col, sm=2col, lg=3col */
}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {/* Each breakpoint prefix overrides the previous at that size and up ✅ */}
</div>;
```

### ❌ Pitfall: Writing desktop-first (adding `sm:` to reduce columns)

```tsx
{
  /* ❌ Desktop-first thinking — starting with 3 cols and reducing */
}
<div className="grid grid-cols-3 sm:grid-cols-1">
  {/* This gives: mobile=3cols (wrong!), sm+=1col */}
  {/* sm: means 640px+, so mobile gets 3 cols — not what you want */}
</div>;
```

**Fix:** Always start with mobile (no prefix) and increase:

```tsx
{
  /* ✅ Mobile-first — start with 1 col, increase for larger screens */
}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"></div>;
```

### ❌ Pitfall: Using `max-w-*` without `mx-auto` — container doesn't center

```tsx
{
  /* ❌ max-w-7xl constrains the width but doesn't center the element */
}
<div className="max-w-7xl px-4">{/* Content hugs the left edge */}</div>;
```

**Fix:**

```tsx
{
  /* ✅ mx-auto centers the max-width container */
}
<div className="max-w-7xl mx-auto px-4">{/* Centered content ✅ */}</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a fully responsive `<LandingSection>` component:

1. Section padding: `px-4 py-12` → `sm:px-6 sm:py-16` → `lg:px-8 lg:py-24`
2. Two-column layout: stacked on mobile, side-by-side on `lg:`
3. Heading: `text-3xl` → `sm:text-4xl` → `lg:text-5xl`
4. Buttons: stacked (`flex-col`) on mobile, row (`sm:flex-row`) on `sm:`
5. Stats row: 2-col grid on mobile, 4-col on `sm:`
6. An element hidden on mobile, visible on `md:`, and a separate element visible only on mobile (`md:hidden`)

### Solution

```tsx
// src/components/landing-section.tsx
interface Stat {
  label: string;
  value: string;
}

const STATS: Stat[] = [
  { label: "Active users", value: "50K+" },
  { label: "Components", value: "200+" },
  { label: "GitHub stars", value: "18K" },
  { label: "Uptime", value: "99.9%" },
];

export function LandingSection() {
  return (
    <section
      className="max-w-7xl mx-auto px-4 py-12
                         sm:px-6 sm:py-16
                         lg:px-8 lg:py-24"
    >
      {/* Mobile-only banner */}
      <div
        className="md:hidden mb-6 flex items-center gap-2 px-4 py-2.5
                       bg-blue-50 border border-blue-100 rounded-xl"
      >
        <span className="text-blue-600 text-sm">📱</span>
        <p className="text-xs text-blue-700 font-medium">
          Optimised for mobile — try desktop for the full experience
        </p>
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
        {/* Left: text content */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          {/* Label */}
          <span
            className="inline-block text-xs font-semibold uppercase
                            tracking-widest text-blue-600 mb-4"
          >
            Now in v4.3
          </span>

          {/* Responsive heading */}
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl
                          font-extrabold text-gray-900 leading-tight
                          tracking-tight text-balance"
          >
            Build beautiful UIs at the speed of thought
          </h1>

          {/* Body copy */}
          <p
            className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed
                         text-pretty max-w-xl mx-auto lg:mx-0"
          >
            Tailwind CSS v4.3 brings a CSS-first workflow, lightning-fast
            builds, and a design system that scales from prototype to
            production.
          </p>

          {/* Responsive button group */}
          <div
            className="mt-8 flex flex-col sm:flex-row gap-3
                           justify-center lg:justify-start"
          >
            <button
              className="px-6 py-3 bg-blue-600 text-white font-semibold
                                rounded-xl hover:bg-blue-700 active:scale-[0.98]
                                transition-all duration-150 text-sm sm:text-base"
            >
              Get started free
            </button>
            <button
              className="px-6 py-3 border border-gray-300 text-gray-700
                                font-semibold rounded-xl hover:bg-gray-50
                                active:scale-[0.98] transition-all duration-150
                                text-sm sm:text-base"
            >
              View documentation
            </button>
          </div>

          {/* Social proof — hidden on mobile, shown on md+ */}
          <div
            className="hidden md:flex items-center gap-2 mt-6
                           justify-center lg:justify-start"
          >
            <div className="flex -space-x-2">
              {["🧑", "👩", "🧑", "👨"].map((emoji, i) => (
                <span
                  key={i}
                  className="size-7 rounded-full bg-gradient-to-br
                                  from-blue-400 to-purple-500 border-2
                                  border-white flex items-center justify-center
                                  text-xs"
                >
                  {emoji}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">50,000+</span>{" "}
              developers trust Tailwind
            </p>
          </div>
        </div>

        {/* Right: visual — hidden on mobile, shown on lg+ */}
        <div className="hidden lg:block w-full lg:w-1/2">
          <div
            className="relative aspect-square rounded-3xl overflow-hidden
                           bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50
                           border border-gray-200 shadow-xl"
          >
            <div
              className="absolute inset-0 flex items-center justify-center
                             text-8xl opacity-20"
            >
              🎨
            </div>
            {/* Floating code snippet card */}
            <div
              className="absolute bottom-6 left-6 right-6 bg-gray-900/95
                             backdrop-blur-sm rounded-xl p-4 shadow-2xl"
            >
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                {`<div class="flex items-center
  gap-4 p-6 bg-white
  rounded-2xl shadow-lg
  hover:shadow-xl
  transition-shadow">
  ...
</div>`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row — 2-col on mobile, 4-col on sm+ */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-16
                       pt-12 border-t border-gray-200"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {stat.value}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

---

# 10 — Dark Mode — `dark:` Variant, CSS Variable Strategy

---

## T — TL;DR

Tailwind's `dark:` variant applies styles when dark mode is active. In v4.3, dark mode is configured via the `@variant dark` rule in CSS — supporting `prefers-color-scheme`, class-based, and attribute-based strategies. The **CSS variable strategy** is the cleanest approach: define tokens in `:root` and override them in `dark:`, then use those variables in your Tailwind utilities.

---

## K — Key Concepts

### Dark Mode Strategies in Tailwind v4.3

```css
/* globals.css */
@import "tailwindcss";

/* ─── Strategy 1: Media query (automatic, no JS needed) */
/* This is the DEFAULT in v4 — no extra config needed */
/* @variant dark (&:where(.dark, .dark *)); — NOT needed for media strategy */

/* ─── Strategy 2: Class-based (requires adding .dark to <html>) */
@variant dark (&:where(.dark, .dark *));
/* In your app: document.documentElement.classList.toggle('dark') */

/* ─── Strategy 3: Data-attribute-based */
@variant dark (&:where([data-theme=dark], [data-theme=dark] *));
/* In your app: document.documentElement.setAttribute('data-theme', 'dark') */
```

```tsx
// For class-based dark mode in Next.js layout:
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    // Add class="dark" to enable dark mode
    // In practice: controlled by a ThemeProvider
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

### `dark:` Variant — Basic Usage

```tsx
{/* ─── Every utility can be prefixed with dark: */}
<div className="bg-white dark:bg-gray-900">
<p  className="text-gray-900 dark:text-white">
<p  className="text-gray-600 dark:text-gray-400">
<div className="border border-gray-200 dark:border-gray-700">
<div className="bg-gray-50 dark:bg-gray-800">

{/* ─── Combined with responsive and state variants */}
<button className="bg-blue-600 dark:bg-blue-500
                   hover:bg-blue-700 dark:hover:bg-blue-400
                   text-white transition-colors">
  Button
</button>

{/* ─── Shadow in dark mode */}
<div className="shadow-md dark:shadow-none dark:ring-1 dark:ring-gray-700">
  {/* Light: use shadow. Dark: use ring border instead (shadows don't show on dark bg) */}
</div>
```

### CSS Variable Strategy — The Professional Approach

```css
/* globals.css — define tokens, override in dark mode */
@import "tailwindcss";

/* ─── Light mode tokens */
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f9fafb;
  --color-bg-muted: #f3f4f6;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;

  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-text-subtle: #9ca3af;

  --color-border: #e5e7eb;
  --color-border-muted: #f3f4f6;

  --color-brand: #2563eb;
  --color-brand-hover: #1d4ed8;
  --color-brand-light: #eff6ff;
  --color-brand-text: #1d4ed8;
}

/* ─── Dark mode tokens — override same variables */
.dark {
  --color-bg: #0f172a;
  --color-bg-alt: #1e293b;
  --color-bg-muted: #334155;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;

  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-text-subtle: #64748b;

  --color-border: #334155;
  --color-border-muted: #1e293b;

  --color-brand: #3b82f6;
  --color-brand-hover: #60a5fa;
  --color-brand-light: #1e3a8a;
  --color-brand-text: #93c5fd;
}

/* ─── For prefers-color-scheme (if using media strategy) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-alt: #1e293b;
    /* ... same overrides */
  }
}
```

```tsx
{
  /* Using CSS variable utilities — automatic dark mode, zero dark: classes needed */
}
<div style={{ backgroundColor: "var(--color-bg)" }}>
  <p style={{ color: "var(--color-text)" }}>
    This text adapts to dark mode automatically via CSS variables
  </p>
</div>;

{
  /* Or using Tailwind arbitrary value syntax to reference CSS vars */
}
<div className="bg-[--color-bg]">
  <p className="text-[--color-text]">Auto dark mode ✅</p>
  <p className="text-[--color-text-muted]">Muted text ✅</p>
  <div className="border border-[--color-border]">
    Border adapts automatically ✅
  </div>
</div>;
```

### Combining `dark:` Classes with CSS Variables

```tsx
{/* Real-world component using BOTH strategies together */}

export function Card({ title, body }: { title: string; body: string }) {
  return (
    {/*
      Strategy A (explicit dark: classes):
        Works when you have a handful of specific overrides
    */}
    <div className="bg-white dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700
                     rounded-2xl p-6 shadow-sm dark:shadow-none
                     dark:ring-1 dark:ring-gray-700">

      <h3 className="text-gray-900 dark:text-white
                      font-semibold text-lg mb-2">
        {title}
      </h3>

      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
        {body}
      </p>
    </div>
  )
}
```

### Theme Toggle — Class-Based Dark Mode Implementation

```tsx
// src/components/theme-toggle.tsx
"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem("theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldBeDark = stored === "dark" || (!stored && systemDark);

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="relative flex items-center justify-center size-9
                  rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  hover:text-gray-900 dark:hover:text-white
                  transition-all duration-150 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-blue-500
                  focus-visible:ring-offset-2"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon — visible in dark mode */}
      <span className="hidden dark:block text-base">☀️</span>
      {/* Moon icon — visible in light mode */}
      <span className="block dark:hidden text-base">🌙</span>
    </button>
  );
}
```

### Dark Mode for Common UI Patterns

```tsx
{
  /* ─── Input field */
}
<input
  className="w-full px-3 py-2 rounded-lg text-sm
              bg-white dark:bg-gray-900
              border border-gray-300 dark:border-gray-600
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent transition-colors"
  placeholder="Enter email..."
/>;

{
  /* ─── Navigation */
}
<nav
  className="bg-white dark:bg-gray-900
                 border-b border-gray-200 dark:border-gray-800
                 sticky top-0 z-40"
>
  <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
    <span className="font-bold text-gray-900 dark:text-white">Acme</span>
    <div className="flex items-center gap-4">
      <a
        className="text-sm text-gray-600 dark:text-gray-400
                     hover:text-gray-900 dark:hover:text-white
                     transition-colors"
      >
        Docs
      </a>
      <ThemeToggle />
    </div>
  </div>
</nav>;

{
  /* ─── Code block */
}
<pre
  className="bg-gray-900 dark:bg-gray-950
                 border border-gray-800 dark:border-gray-700
                 rounded-xl p-4 text-sm font-mono
                 text-gray-100 overflow-x-auto"
>
  <code>const x = 'Hello, world!'</code>
</pre>;

{
  /* ─── Badge/tag */
}
<span
  className="px-2.5 py-1 text-xs font-medium rounded-full
                  bg-blue-100 dark:bg-blue-900/30
                  text-blue-700 dark:text-blue-300
                  border border-blue-200 dark:border-blue-800"
>
  New
</span>;
```

---

## W — Why It Matters

- The CSS variable strategy scales better than explicit `dark:` classes — a component using CSS variables for colors requires zero dark mode classes; the variables switch automatically when the `.dark` class is toggled on `<html>`. A large codebase with explicit `dark:` classes on every element becomes hard to maintain.
- `suppressHydrationWarning` on the `<html>` element is necessary for Next.js dark mode — on first render, the server doesn't know the user's theme preference. The class is added client-side, causing a mismatch. `suppressHydrationWarning` tells React to ignore this specific attribute's mismatch.
- `dark:shadow-none dark:ring-1 dark:ring-gray-700` is the correct dark mode shadow technique — box shadows are nearly invisible on dark backgrounds (they depend on contrast between the element and the background). Replacing shadows with a subtle ring border is how professional dark UIs handle depth.

---

## I — Interview Q&A

### Q1: What are the three dark mode strategies in Tailwind v4 and when should you use each?

**A:** The three strategies are: **media query** (default) — uses `prefers-color-scheme: dark` automatically, no JavaScript needed, but the user can't override it without an OS setting change; **class-based** — you add/remove a `dark` class on the `<html>` element with JavaScript, giving users a manual toggle that persists via `localStorage`, the most common choice for apps; and **attribute-based** — uses a `data-theme` attribute, useful when you need multiple themes (not just light/dark) or when integrating with a design system that uses data attributes. Class-based is the standard for most apps that need a user-controlled theme toggle.

### Q2: Why is the CSS variable strategy preferred over explicit `dark:` classes on every element?

**A:** Explicit `dark:` classes require duplicating every color decision in every component — `bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700`. As the app grows, this becomes verbose, easy to miss, and hard to change (a design token change requires updating hundreds of `dark:` classes). The CSS variable strategy defines design tokens once in `:root` and `.dark`, then components reference the variable — `bg-[--color-surface] text-[--color-text]`. When the `.dark` class toggles on `<html>`, all variables update simultaneously across the entire app. Changing a dark mode color requires updating one line in CSS, not hunting through dozens of components.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `suppressHydrationWarning` on `<html>` in Next.js

```tsx
{
  /* ❌ Hydration mismatch warning — server renders without .dark class,
       client adds it, React sees a difference */
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {" "}
      {/* ← missing suppressHydrationWarning */}
      <body>{children}</body>
    </html>
  );
}
```

**Fix:**

```tsx
{
  /* ✅ Suppress the expected html class attribute mismatch */
}
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

### ❌ Pitfall: Using `opacity` for dark mode color adjustments instead of dedicated dark colors

```tsx
{
  /* ❌ opacity affects children too — text inside becomes transparent */
}
<div className="bg-blue-600 dark:opacity-80">
  <p className="text-white">This text is also 80% opaque in dark mode ❌</p>
</div>;
```

**Fix:** Use a dedicated dark mode color:

```tsx
{
  /* ✅ Explicit dark mode background — children unaffected */
}
<div className="bg-blue-600 dark:bg-blue-800">
  <p className="text-white">Text remains fully opaque ✅</p>
</div>;
```

### ❌ Pitfall: Not handling the FOUC (Flash of Unstyled Content) on first load

```tsx
{
  /* ❌ Without the inline script, dark mode class is applied after
       React hydrates → user sees a flash of light mode on dark-preference devices */
}
```

**Fix:** Add an inline script in `layout.tsx` that runs before React to prevent FOUC:

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script runs BEFORE any React code — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            try {
              const stored = localStorage.getItem('theme')
              const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
              if (stored === 'dark' || (!stored && systemDark)) {
                document.documentElement.classList.add('dark')
              }
            } catch(e) {}
          `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete dark mode system:

1. `globals.css` with CSS variables for light and dark (background, surface, text, border, brand)
2. `@variant dark` for class-based dark mode
3. A `ThemeToggle` button using `dark:` variants for its own appearance
4. A `<DarkCard>` component using ONLY CSS variable arbitrary values (`bg-[--color-surface]`) — zero `dark:` classes on the card itself
5. A `<NavBar>` using explicit `dark:` classes for comparison
6. FOUC-prevention inline script in root layout

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Class-based dark mode */
@variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
}

/* Light mode tokens */
:root {
  --color-bg: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-alt: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
  --color-brand-light: #eff6ff;
  --color-brand-text: #1d4ed8;
}

/* Dark mode tokens */
.dark {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-brand: #3b82f6;
  --color-brand-light: #1e3a8a;
  --color-brand-text: #93c5fd;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 200ms ease,
    color 200ms ease;
}
```

```tsx
// src/app/layout.tsx
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — runs synchronously before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          try {
            const s = localStorage.getItem('theme')
            const d = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (s === 'dark' || (!s && d)) {
              document.documentElement.classList.add('dark')
            }
          } catch(e) {}
        `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/components/theme-toggle.tsx
"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read the state that was already applied by the inline script
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative size-9 rounded-xl flex items-center justify-center
                  border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  hover:text-gray-900 dark:hover:text-white
                  transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <span className="block dark:hidden" aria-hidden>
        🌙
      </span>
      <span className="hidden dark:block" aria-hidden>
        ☀️
      </span>
    </button>
  );
}
```

```tsx
// src/components/nav-bar.tsx
// Uses explicit dark: classes — simple, readable
import { ThemeToggle } from "./theme-toggle";

export function NavBar() {
  return (
    <nav
      className="sticky top-0 z-40
                     bg-white/90 dark:bg-gray-900/90
                     backdrop-blur-md
                     border-b border-gray-200 dark:border-gray-800
                     transition-colors duration-200"
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 h-14
                       flex items-center justify-between"
      >
        <span className="font-bold text-gray-900 dark:text-white text-lg">
          Acme
        </span>

        <div className="flex items-center gap-4 sm:gap-6">
          {["Docs", "Blog", "Pricing"].map((link) => (
            <a
              key={link}
              className="hidden sm:block text-sm text-gray-600
                           dark:text-gray-400 hover:text-gray-900
                           dark:hover:text-white transition-colors"
            >
              {link}
            </a>
          ))}
          <ThemeToggle />
          <button
            className="px-4 py-1.5 bg-blue-600 dark:bg-blue-500
                              hover:bg-blue-700 dark:hover:bg-blue-400
                              text-white text-sm font-semibold rounded-lg
                              transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </nav>
  );
}
```

```tsx
// src/components/dark-card.tsx
// Uses ONLY CSS variable utilities — zero dark: classes needed
// Dark mode works automatically via CSS variable overrides in .dark

interface DarkCardProps {
  icon: string;
  title: string;
  body: string;
  badge?: string;
}

export function DarkCard({ icon, title, body, badge }: DarkCardProps) {
  return (
    // All colors reference CSS variables — adapt automatically ✅
    <div
      className="bg-[--color-surface] border border-[--color-border]
                     rounded-2xl p-6 shadow-sm
                     hover:border-[--color-brand] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        {badge && (
          <span
            className="px-2.5 py-0.5 text-xs font-semibold rounded-full
                            bg-[--color-brand-light] text-[--color-brand-text]
                            border border-[--color-brand]/20"
          >
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-[--color-text] font-semibold text-lg mb-2 leading-snug">
        {title}
      </h3>

      <p className="text-[--color-text-muted] text-sm leading-relaxed text-pretty">
        {body}
      </p>

      <div className="mt-5 pt-4 border-t border-[--color-border]">
        <button
          className="text-[--color-brand] text-sm font-semibold
                            hover:text-[--color-brand-text] transition-colors"
        >
          Learn more →
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/page.tsx — Demo page wiring it all together
import { NavBar } from "@/components/nav-bar";
import { DarkCard } from "@/components/dark-card";

const CARDS = [
  {
    icon: "⚡",
    title: "Lightning fast",
    body: "Sub-millisecond HMR and instant production builds.",
    badge: "v4.3",
  },
  {
    icon: "🎨",
    title: "CSS-first config",
    body: "Configure your design system entirely in CSS.",
    badge: "New",
  },
  {
    icon: "🌗",
    title: "Built-in dark mode",
    body: "Class-based or media-query dark mode out of the box.",
  },
  {
    icon: "📐",
    title: "Arbitrary values",
    body: "Escape the scale with [value] syntax whenever you need.",
  },
  {
    icon: "🔌",
    title: "No config file needed",
    body: "Zero configuration required to get started.",
    badge: "v4",
  },
  {
    icon: "♿",
    title: "Accessible by default",
    body: "focus-visible utilities for keyboard navigation built in.",
  },
];

export default function DemoPage() {
  return (
    // bg-[--color-bg] adapts automatically to dark mode via CSS variables
    <div className="min-h-screen bg-[--color-bg]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-extrabold text-[--color-text]
                          leading-tight tracking-tight text-balance"
          >
            Tailwind v4.3 Features
          </h1>
          <p className="mt-3 text-lg text-[--color-text-muted] text-pretty max-w-xl mx-auto">
            Toggle dark mode with the button in the nav. All cards adapt via CSS
            variables — zero dark: classes on the cards themselves.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CARDS.map((card) => (
            <DarkCard key={card.title} {...card} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

---

---

# 11 — Composing Interfaces — Building Real UI from Utility Primitives

---

## T — TL;DR

Real UI composition means layering Tailwind utilities — layout + spacing + typography + color + states + responsiveness + dark mode — into cohesive components. The patterns: **card anatomy**, **form anatomy**, **data table**, **modal**, and **empty state** are the five building blocks that compose most production interfaces.

---

## K — Key Concepts

### Component Anatomy — Thinking in Layers

```
Every component = stacking utility layers in order:

Layer 1: Layout    → flex/grid, position, display
Layer 2: Sizing    → width, height, max-w, aspect ratio
Layer 3: Spacing   → padding, margin, gap
Layer 4: Visual    → bg, border, radius, shadow
Layer 5: Typography→ text size, weight, color
Layer 6: States    → hover, focus, active, disabled
Layer 7: Motion    → transition, transform, animation
Layer 8: Responsive→ sm:, md:, lg: prefixes
Layer 9: Dark mode → dark: prefix or CSS variables

Build one layer at a time — don't try to write all classes at once
```

### Pattern 1 — Complete Card Anatomy

```tsx
// src/components/product-card.tsx
// Every class annotated with its layer

import Image from "next/image";

interface ProductCardProps {
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  inStock: boolean;
}

export function ProductCard({
  name,
  price,
  category,
  imageUrl,
  rating,
  reviewCount,
  isNew,
  inStock,
}: ProductCardProps) {
  return (
    // Layer 1+3+4+7: layout, padding context, visual, hover lift animation
    <article
      className="group flex flex-col bg-white dark:bg-gray-800
                         border border-gray-200 dark:border-gray-700
                         rounded-2xl overflow-hidden
                         hover:-translate-y-0.5 hover:shadow-lg
                         dark:hover:shadow-none dark:hover:ring-1
                         dark:hover:ring-gray-600
                         transition-all duration-200 ease-out"
    >
      {/* Image area — Layer 1+2+4 */}
      <div
        className="relative aspect-square overflow-hidden bg-gray-50
                       dark:bg-gray-900"
      >
        <Image
          src={imageUrl}
          alt={`Photo of ${name}`}
          fill
          className="object-cover group-hover:scale-105
                      transition-transform duration-300 ease-out"
          sizes="(max-width: 640px) 100vw,
                 (max-width: 1024px) 50vw,
                 33vw"
        />

        {/* "New" badge — Layer 1+2+3+4+5 */}
        {isNew && (
          <span
            className="absolute top-3 left-3
                            px-2.5 py-1
                            bg-blue-600 dark:bg-blue-500
                            text-white
                            text-xs font-semibold
                            rounded-full"
          >
            New
          </span>
        )}

        {/* Out of stock overlay — Layer 1+4+5 */}
        {!inStock && (
          <div
            className="absolute inset-0 bg-white/70 dark:bg-gray-900/70
                           backdrop-blur-[2px] flex items-center justify-center"
          >
            <span
              className="text-sm font-semibold text-gray-500
                              dark:text-gray-400 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700
                              px-3 py-1 rounded-full"
            >
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Content area — Layer 3 */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Category label — Layer 5 */}
        <span
          className="text-xs font-semibold uppercase tracking-widest
                           text-blue-600 dark:text-blue-400"
        >
          {category}
        </span>

        {/* Name — Layer 5 */}
        <h3
          className="text-gray-900 dark:text-white font-semibold text-base
                         leading-snug line-clamp-2 text-balance"
        >
          {name}
        </h3>

        {/* Rating row — Layer 1+5 */}
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-sm">
            {"★".repeat(Math.round(rating))}
            {"☆".repeat(5 - Math.round(rating))}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({reviewCount})
          </span>
        </div>

        {/* Price + CTA row — Layer 1+6 (pushed to bottom with mt-auto) */}
        <div
          className="flex items-center justify-between mt-auto pt-3
                          border-t border-gray-100 dark:border-gray-700"
        >
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${price}
          </span>
          <button
            disabled={!inStock}
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white
                        text-xs font-semibold rounded-lg
                        hover:bg-blue-700 dark:hover:bg-blue-400
                        active:scale-95 disabled:opacity-40
                        disabled:cursor-not-allowed
                        transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}
```

### Pattern 2 — Form Anatomy

```tsx
// src/components/contact-form.tsx
// Complete form with label, input, error, textarea, select, submit

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ id, label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
        >
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// Shared input class string — used across input/textarea/select
const inputBase = `
  w-full px-3 py-2.5 text-sm rounded-xl
  bg-white dark:bg-gray-900
  border border-gray-300 dark:border-gray-600
  text-gray-900 dark:text-white
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:outline-none focus:ring-2 focus:ring-blue-500
  focus:border-transparent dark:focus:ring-blue-400
  transition-colors duration-150
`
  .replace(/\s+/g, " ")
  .trim();

const inputError = `
  border-red-400 dark:border-red-500
  focus:ring-red-400 dark:focus:ring-red-500
`
  .replace(/\s+/g, " ")
  .trim();

export function ContactForm() {
  return (
    <form
      className="max-w-lg mx-auto bg-white dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Contact us
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We'll get back to you within 24 hours.
        </p>
      </div>

      {/* Name row — side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="first-name" label="First name" required>
          <input
            id="first-name"
            name="firstName"
            type="text"
            placeholder="Mark"
            className={inputBase}
          />
        </FormField>

        <FormField id="last-name" label="Last name" required>
          <input
            id="last-name"
            name="lastName"
            type="text"
            placeholder="Austin"
            className={inputBase}
          />
        </FormField>
      </div>

      {/* Email — with error state */}
      <FormField
        id="email"
        label="Email address"
        required
        error="Please enter a valid email address."
      >
        <input
          id="email"
          name="email"
          type="email"
          placeholder="mark@example.com"
          className={`${inputBase} ${inputError}`}
          aria-describedby="email-error"
          aria-invalid="true"
        />
      </FormField>

      {/* Subject select */}
      <FormField id="subject" label="Subject">
        <select
          id="subject"
          name="subject"
          className={`${inputBase} cursor-pointer`}
        >
          <option value="">Choose a topic...</option>
          <option value="support">Technical support</option>
          <option value="billing">Billing inquiry</option>
          <option value="general">General question</option>
          <option value="feedback">Product feedback</option>
        </select>
      </FormField>

      {/* Message textarea */}
      <FormField id="message" label="Message" required>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Describe your question in detail..."
          className={`${inputBase} resize-none`}
        />
      </FormField>

      {/* Submit button + loading state */}
      <button
        type="submit"
        className="w-full py-3 bg-blue-600 dark:bg-blue-500 text-white
                          font-semibold text-sm rounded-xl
                          hover:bg-blue-700 dark:hover:bg-blue-400
                          active:scale-[0.98] transition-all duration-150
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-blue-500 focus-visible:ring-offset-2
                          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send message
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        By submitting you agree to our{" "}
        <a
          href="#"
          className="underline underline-offset-2
                                hover:text-gray-600 dark:hover:text-gray-300
                                transition-colors"
        >
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
```

### Pattern 3 — Data Table Anatomy

```tsx
// src/components/data-table.tsx

interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right" | "center";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
}

const ALIGN = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  caption,
}: DataTableProps<T>) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border border-gray-200
                     dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {caption && (
          <caption
            className="px-6 py-3 text-left text-xs text-gray-500
                               dark:text-gray-400"
          >
            {caption}
          </caption>
        )}

        {/* Head */}
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className={`px-6 py-3 text-xs font-semibold
                               text-gray-500 dark:text-gray-400
                               uppercase tracking-wider
                               ${ALIGN[col.align ?? "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm
                              text-gray-400 dark:text-gray-500"
              >
                No data to display.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-blue-50/50
                               dark:hover:bg-gray-700/30
                               ${
                                 rowIndex % 2 === 0
                                   ? ""
                                   : "bg-gray-50/50 dark:bg-gray-900/20"
                               }`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-6 py-4 text-sm text-gray-700
                                   dark:text-gray-300 whitespace-nowrap
                                   ${ALIGN[col.align ?? "left"]}`}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### Pattern 4 — Modal Anatomy

```tsx
// src/components/modal.tsx
"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) el.showModal();
    else el.close();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Fixed full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm
                       animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog panel */}
      <div
        className={`relative w-full ${SIZES[size]}
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        rounded-2xl shadow-2xl
                        flex flex-col max-h-[90vh]
                        animate-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between
                          px-6 py-4 border-b border-gray-100
                          dark:border-gray-700 shrink-0"
        >
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center
                        text-gray-400 dark:text-gray-500
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        hover:text-gray-700 dark:hover:text-gray-300
                        transition-colors duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>

        {/* Footer slot — children can include this via composition */}
      </div>
    </div>
  );
}
```

### Pattern 5 — Empty State Anatomy

```tsx
// src/components/empty-state.tsx

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href: string };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center
                     text-center py-16 px-6 max-w-sm mx-auto"
    >
      {/* Icon container */}
      <div
        className="size-16 rounded-2xl bg-gray-100 dark:bg-gray-800
                       flex items-center justify-center text-3xl mb-5
                       border border-gray-200 dark:border-gray-700"
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm text-gray-500 dark:text-gray-400
                     leading-relaxed text-pretty mb-6"
      >
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="px-5 py-2.5 bg-blue-600 dark:bg-blue-500 text-white
                        font-semibold text-sm rounded-xl
                        hover:bg-blue-700 dark:hover:bg-blue-400
                        active:scale-[0.98] transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <a
            href={secondaryAction.href}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 font-semibold text-sm
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800
                         active:scale-[0.98] transition-all duration-150
                         text-center"
          >
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}
```

### Composing a Full Page from Primitives

```tsx
// src/app/products/page.tsx — full page using all Day 10 patterns
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";

const MOCK_PRODUCTS = [
  {
    id: "p1",
    name: "Air Max 90",
    price: 120,
    category: "Footwear",
    imageUrl: "/products/airmax.jpg",
    rating: 4.5,
    reviewCount: 128,
    isNew: true,
    inStock: true,
  },
  {
    id: "p2",
    name: "Canvas Tote",
    price: 45,
    category: "Bags",
    imageUrl: "/products/tote.jpg",
    rating: 4.2,
    reviewCount: 34,
    isNew: false,
    inStock: true,
  },
  {
    id: "p3",
    name: "Wool Cap",
    price: 35,
    category: "Headwear",
    imageUrl: "/products/cap.jpg",
    rating: 3.8,
    reviewCount: 18,
    isNew: false,
    inStock: false,
  },
  {
    id: "p4",
    name: "Leather Belt",
    price: 65,
    category: "Belts",
    imageUrl: "/products/belt.jpg",
    rating: 4.7,
    reviewCount: 55,
    isNew: true,
    inStock: true,
  },
  {
    id: "p5",
    name: "Denim Jacket",
    price: 195,
    category: "Outerwear",
    imageUrl: "/products/jacket.jpg",
    rating: 4.9,
    reviewCount: 89,
    isNew: false,
    inStock: true,
  },
  {
    id: "p6",
    name: "Silk Scarf",
    price: 80,
    category: "Scarves",
    imageUrl: "/products/scarf.jpg",
    rating: 4.3,
    reviewCount: 12,
    isNew: true,
    inStock: false,
  },
];

export default function ProductsPage() {
  const hasProducts = MOCK_PRODUCTS.length > 0;

  return (
    // Page uses CSS variable bg — auto dark mode, no dark: needed here
    <div className="min-h-screen bg-[--color-bg]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header — responsive */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                          sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold
                            text-[--color-text] tracking-tight"
            >
              Products
            </h1>
            <p className="text-sm text-[--color-text-muted] mt-1">
              {MOCK_PRODUCTS.length} items
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter chips */}
            <div
              className="flex items-center gap-2 overflow-x-auto
                             pb-1 scrollbar-hide"
            >
              {["All", "Footwear", "Bags", "Outerwear"].map((filter, i) => (
                <button
                  key={filter}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold
                                     rounded-full transition-colors duration-150 ${
                                       i === 0
                                         ? "bg-blue-600 text-white"
                                         : "bg-[--color-surface-alt] text-[--color-text-muted] hover:text-[--color-text] border border-[--color-border]"
                                     }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Add product button */}
            <button
              className="shrink-0 px-4 py-2 bg-blue-600 dark:bg-blue-500
                                text-white text-sm font-semibold rounded-xl
                                hover:bg-blue-700 dark:hover:bg-blue-400
                                transition-colors focus-visible:outline-none
                                focus-visible:ring-2 focus-visible:ring-blue-500
                                focus-visible:ring-offset-2"
            >
              + Add product
            </button>
          </div>
        </div>

        {/* Product grid or empty state */}
        {hasProducts ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                           xl:grid-cols-4 gap-5 sm:gap-6"
          >
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div
            className="bg-[--color-surface] rounded-2xl border
                           border-[--color-border] py-4"
          >
            <EmptyState
              icon="📦"
              title="No products yet"
              description="Add your first product to start building your catalog."
              action={{ label: "+ Add first product", onClick: () => {} }}
              secondaryAction={{ label: "Import CSV", href: "/import" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## W — Why It Matters

- Real UI composition is never about individual utilities — it's about understanding the **anatomy of a component**: image area → content area → action area. Each area has a predictable set of utility layers. Once you know the anatomy, you can build any variant of it (small card, large card, horizontal card) by adjusting the same layers.
- The **shared input class string** pattern (storing the base input classes in a `const` and concatenating with error/disabled variants) is the right balance between Tailwind utilities and maintainability — without creating a full CSS component or a custom plugin.
- Composing dark mode with CSS variables at the page/section level (rather than on each component) is the architectural decision that makes large apps maintainable — components use semantic variable names (`text-[--color-text-muted]`) that are always correct in both themes, rather than parallel `text-gray-500 dark:text-gray-400` declarations.

---

## I — Interview Q&A

### Q1: How do you handle a large number of repeated Tailwind utility classes across many similar elements without using `@apply`?

**A:** The cleanest pattern is to extract the class strings to JavaScript constants or small component wrappers. For example, a shared `inputBase` string constant that's concatenated with variant-specific classes — `className={${inputBase} ${hasError ? inputError : ''}}`. For structural patterns (card, button, badge) extract a React component that accepts variant props and maps them to class strings. For very large apps, a helper like `cva` (class-variance-authority) provides typed variant management without moving styles to CSS. The goal is to keep styles co-located with markup in JSX, not extracted to CSS files.

### Q2: Walk me through how you would build a card component with a hover lift effect in Tailwind.

**A:** Layer by layer: first layout — `flex flex-col` for vertical stacking; then sizing — `max-w-sm w-full`; then visual — `bg-white border border-gray-200 rounded-2xl overflow-hidden`; then the hover lift — `hover:-translate-y-0.5 hover:shadow-lg`; then motion — `transition-all duration-200 ease-out` to animate the transform and shadow change smoothly. For dark mode, add `dark:bg-gray-800 dark:border-gray-700 dark:hover:shadow-none dark:hover:ring-1 dark:hover:ring-gray-600` — swapping shadow for a ring because shadows aren't visible on dark backgrounds. The image inside gets `group-hover:scale-105 transition-transform duration-300` on the parent's `group` class for a subtle zoom.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Writing all classes in one long string — unreadable and unmaintainable

```tsx
{
  /* ❌ All on one line — impossible to read, review, or debug */
}
<button className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400">
  Submit
</button>;
```

**Fix:** Break into logical groups — one layer per line:

```tsx
{
  /* ✅ Layered, readable, reviewable */
}
<button
  className="
  inline-flex items-center justify-center
  px-6 py-3
  bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-xl
  hover:bg-blue-700 dark:hover:bg-blue-400
  active:scale-95
  transition-all duration-150
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-blue-500 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
"
>
  Submit
</button>;
```

### ❌ Pitfall: Using inline `style` for colors that should be Tailwind classes

```tsx
{
  /* ❌ Bypasses Tailwind's dark mode, hover states, and responsive variants */
}
<div style={{ backgroundColor: "#2563eb", color: "white" }}>Button</div>;
```

**Fix:** Use Tailwind utilities — get dark mode, hover, and responsive support for free:

```tsx
{
  /* ✅ All Tailwind — dark: hover: and sm: work on this */
}
<div
  className="bg-blue-600 dark:bg-blue-500 text-white
                 hover:bg-blue-700 dark:hover:bg-blue-400"
>
  Button
</div>;
```

### ❌ Pitfall: Not using `overflow-hidden` on rounded containers with images

```tsx
{
  /* ❌ Image corners bleed outside the rounded card */
}
<div className="rounded-2xl border">
  <img src="/photo.jpg" className="w-full" />
  {/* Image corners are square — they overflow the rounded card */}
</div>;
```

**Fix:**

```tsx
{
  /* ✅ overflow-hidden clips the image to the rounded corners */
}
<div className="rounded-2xl border overflow-hidden">
  <img src="/photo.jpg" className="w-full" />
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `<ProfileCard>` component that combines ALL Day 10 concepts:

1. **Layout:** flex column, image on top, content below
2. **Sizing:** `max-w-xs`, `aspect-square` image, `size-16` avatar
3. **Spacing:** `p-6`, `gap-3`, `space-y-2`
4. **Typography:** display name `text-xl font-bold`, bio `text-sm leading-relaxed line-clamp-3`, username `text-xs uppercase tracking-wider`
5. **Colors:** brand accent badge, gray muted text
6. **Borders/shadows:** `rounded-2xl`, `shadow-md`, `ring-*` on avatar
7. **States:** follow button with `hover:`, `active:scale-95`, `focus-visible:ring-*`
8. **Responsive:** stacks vertically on mobile, horizontal on `sm:`
9. **Dark mode:** `dark:` classes OR CSS variables throughout
10. **Composition:** group hover showing social links

### Solution

```tsx
// src/components/profile-card.tsx
interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface ProfileCardProps {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  role: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  socials: SocialLink[];
}

export function ProfileCard({
  name,
  username,
  bio,
  avatarUrl,
  role,
  followers,
  following,
  isFollowing,
  socials,
}: ProfileCardProps) {
  return (
    // 1. Layout + 6. Visual + 8. Responsive
    <article
      className="group max-w-xs w-full
                          flex flex-col
                          bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          rounded-2xl shadow-md dark:shadow-none
                          dark:ring-1 dark:ring-gray-700
                          overflow-hidden
                          hover:-translate-y-0.5
                          hover:shadow-xl dark:hover:shadow-none
                          dark:hover:ring-blue-800
                          transition-all duration-200 ease-out"
    >
      {/* Cover gradient area */}
      <div
        className="h-20 bg-gradient-to-br from-blue-500 via-purple-500
                       to-pink-500 relative shrink-0"
      >
        {/* Role badge */}
        <span
          className="absolute bottom-2 right-3
                           px-2.5 py-0.5 text-[10px] font-bold uppercase
                           tracking-wider text-white/90
                           bg-black/30 backdrop-blur-sm rounded-full"
        >
          {role}
        </span>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 p-5">
        {/* Avatar — overlaps the cover */}
        <div
          className="relative size-16 rounded-full overflow-hidden
                          ring-4 ring-white dark:ring-gray-800
                          shadow-md -mt-10 mb-3 shrink-0 bg-gray-200"
        >
          {/* Placeholder avatar */}
          <div
            className="size-full bg-gradient-to-br from-blue-400 to-purple-500
                            flex items-center justify-center
                            text-2xl font-bold text-white"
          >
            {name.charAt(0)}
          </div>
        </div>

        {/* Name + username */}
        <div className="space-y-0.5 mb-3">
          <h3
            className="text-xl font-bold text-gray-900 dark:text-white
                           leading-tight tracking-tight"
          >
            {name}
          </h3>
          {/* 5. Typography: username label */}
          <p
            className="text-xs font-semibold uppercase tracking-wider
                           text-blue-600 dark:text-blue-400"
          >
            @{username}
          </p>
        </div>

        {/* Bio — line-clamp-3 */}
        <p
          className="text-sm text-gray-500 dark:text-gray-400
                        leading-relaxed line-clamp-3 text-pretty mb-4 flex-1"
        >
          {bio}
        </p>

        {/* Stats row */}
        <div
          className="flex gap-4 pb-4 mb-4 border-b border-gray-100
                          dark:border-gray-700"
        >
          <div className="text-center">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {followers >= 1000
                ? `${(followers / 1000).toFixed(1)}K`
                : followers}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Followers
            </p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {following}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Following
            </p>
          </div>
        </div>

        {/* Social links — hidden, revealed on group-hover */}
        <div
          className="flex items-center gap-2 mb-4
                          opacity-0 group-hover:opacity-100
                          -translate-y-1 group-hover:translate-y-0
                          transition-all duration-200 ease-out h-8"
        >
          {socials.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              aria-label={s.platform}
              className="size-8 rounded-lg flex items-center justify-center
                            text-gray-400 dark:text-gray-500 text-base
                            bg-gray-100 dark:bg-gray-700
                            hover:bg-blue-100 dark:hover:bg-blue-900/40
                            hover:text-blue-600 dark:hover:text-blue-400
                            transition-colors duration-150
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-blue-500"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Follow button — 7. States + 9. Dark mode */}
        <button
          className={`w-full py-2.5 text-sm font-semibold rounded-xl
                        transition-all duration-150 active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-offset-2
                        ${
                          isFollowing
                            ? `bg-gray-100 dark:bg-gray-700
                             text-gray-700 dark:text-gray-300
                             hover:bg-red-50 dark:hover:bg-red-900/30
                             hover:text-red-600 dark:hover:text-red-400
                             hover:border-red-200 dark:hover:border-red-800
                             border border-gray-200 dark:border-gray-600
                             focus-visible:ring-gray-400`
                            : `bg-blue-600 dark:bg-blue-500 text-white
                             hover:bg-blue-700 dark:hover:bg-blue-400
                             focus-visible:ring-blue-500`
                        }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </article>
  );
}

// ─── Usage demo ───────────────────────────────────────────────────────────────
export function ProfileCardDemo() {
  return (
    <div
      className="min-h-screen bg-[--color-bg] flex items-center
                     justify-center p-8"
    >
      <ProfileCard
        name="Mark Austin"
        username="markaustria97"
        bio="Full-stack developer building with Next.js, TypeScript, and Tailwind. Currently working through a 70-day curriculum to go from zero to production."
        avatarUrl="/avatar.jpg"
        role="Developer"
        followers={4820}
        following={312}
        isFollowing={false}
        socials={[
          { platform: "GitHub", url: "#", icon: "🐙" },
          { platform: "Twitter", url: "#", icon: "𝕏" },
          { platform: "LinkedIn", url: "#", icon: "💼" },
        ]}
      />
    </div>
  );
}
```

---

## ✅ Day 10 Complete — Tailwind CSS v4.3 Fundamentals

| #   | Subtopic                                                         | Status |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | Utility-First Workflow — Mental Model, Setup, `@apply`           | ☐      |
| 2   | Layout — Flexbox, Grid, Positioning, z-index, overflow           | ☐      |
| 3   | Spacing — Padding, Margin, Gap, Space Between                    | ☐      |
| 4   | Sizing — Width, Height, Min/Max, Aspect Ratio                    | ☐      |
| 5   | Typography — Font Size, Weight, Line Height, Tracking, Alignment | ☐      |
| 6   | Colors — Text, Background, Border, Opacity, CSS Variables        | ☐      |
| 7   | Borders, Shadows, and Visual Effects                             | ☐      |
| 8   | Hover, Focus, and Interactive States                             | ☐      |
| 9   | Responsive Variants — Mobile-First Breakpoints                   | ☐      |
| 10  | Dark Mode — `dark:` Variant, CSS Variable Strategy               | ☐      |
| 11  | Composing Interfaces — Building Real UI from Utility Primitives  | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 10

```
SETUP (v4.3)
  Entry point:     @import "tailwindcss" in globals.css (one import only)
  Config:          @theme {} in CSS — replaces tailwind.config.js
  Custom colors:   --color-brand-600: #2563eb → bg-brand-600 ✅
  Custom spacing:  --spacing-18: 4.5rem → p-18, gap-18 ✅
  Custom fonts:    --font-display: var(--font-playfair) → font-display ✅
  Custom utils:    @layer utilities { .text-balance { text-wrap: balance } }
  @apply:          Last resort for 10+ repeated patterns — use sparingly

LAYOUT
  flex / grid:     flex row (default), flex-col, grid grid-cols-3
  flex alignment:  items-center (cross axis), justify-between (main axis)
  gap:             gap-4, gap-x-6, gap-y-2 — ALWAYS prefer over margin between siblings
  grid patterns:   grid-cols-[repeat(auto-fill,minmax(280px,1fr))] — responsive with NO breakpoints
  positioning:     relative → absolute child, sticky top-0, fixed inset-0
  z-index:         z-10/20/30/40/50 (nav=40, modal=50, toast=60)
  shrink-0:        CRITICAL on icons/avatars in flex rows — prevents distortion
  min-w-0:         CRITICAL on flex text children — enables truncate to work
  overflow:        overflow-hidden (clip), overflow-x-auto (scroll), overflow-y-auto

SPACING
  Scale:           1 unit = 0.25rem = 4px
  Memorize:        p-4=16px, p-8=32px, p-12=48px, p-16=64px
  Padding:         p-* px-* py-* pt-* pr-* pb-* pl-*
  Margin:          mx-auto (center), ml-auto (push right), mt-8 (vertical rhythm)
  Gap:             gap-* gap-x-* gap-y-* — between flex/grid children
  space-y-*:       Only for block element stacks — NOT for conditional children

SIZING
  Widths:          w-full (100%), w-screen (100vw), w-auto, w-1/2, w-64 (16rem)
  Heights:         h-screen (100vh), min-h-screen (grow), h-fit, h-px (1px divider)
  dvh:             h-dvh — dynamic viewport height (mobile browser chrome aware)
  Max-width:       max-w-7xl (1280px page), max-w-prose (65ch reading), max-w-sm/md/lg
  Aspect ratio:    aspect-square (1:1), aspect-video (16:9), aspect-[4/3]
  size-*:          size-10 = w-10 h-10 — clean square element shorthand

TYPOGRAPHY
  Size scale:      xs=12px sm=14px base=16px lg=18px xl=20px 2xl=24px 3xl=30px 4xl=36px 5xl=48px
  Weight:          normal(400), medium(500), semibold(600), bold(700), extrabold(800)
  Line height:     leading-tight (headings), leading-relaxed (body), leading-none (display)
  Tracking:        tracking-tight (large headings), tracking-widest (uppercase labels)
  Overflow:        truncate (1 line), line-clamp-2/3 (multi-line), min-w-0 (required on parent)
  Wrapping:        text-balance (headings), text-pretty (body)

COLORS
  Scale:           50 (lightest) → 950 (darkest) per color family
  Common:          -600 for interactive, -50 for light bg, -200 for borders, -900 for dark text
  Opacity:         bg-blue-600/50 — NOT opacity-50 (opacity affects children too)
  Status:          green=success, red=error, amber=warning, blue=info
  CSS vars:        bg-[--color-surface], text-[--color-text] — semantic + auto dark mode

BORDERS & EFFECTS
  Border:          border (1px), border-2, border-gray-200
  Divide:          divide-y divide-gray-200 — borders between list children
  Radius:          rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px), rounded-full (pill)
  Shadow:          shadow-sm (inputs), shadow-md (cards), shadow-lg (modals)
  Ring:            ring-2 ring-blue-500 ring-offset-2 — use for focus, NOT shadow
  Dark shadows:    shadow-none dark:ring-1 dark:ring-gray-700 (shadows invisible on dark bg)
  Effects:         backdrop-blur-md + bg-white/80 = frosted glass
  Gradient:        bg-gradient-to-r from-blue-600 to-purple-600

STATES
  hover:           hover:bg-blue-700 hover:scale-105 hover:-translate-y-1
  focus-visible:   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   ALWAYS prefer over focus: — keyboard only, not mouse
  active:          active:scale-95 active:scale-[0.98]
  disabled:        disabled:opacity-50 disabled:cursor-not-allowed
  group:           group on parent, group-hover: on child — no JS needed
  peer:            peer on input, peer-checked:/peer-invalid: on sibling — custom checkboxes
  transition:      transition-colors duration-150 on every interactive element

RESPONSIVE (mobile-first)
  Breakpoints:     sm:640px md:768px lg:1024px xl:1280px 2xl:1536px
  Rule:            No prefix = ALL sizes. sm: = 640px AND ABOVE (not only at 640px)
  Common patterns: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                   flex-col sm:flex-row
                   text-3xl sm:text-4xl lg:text-5xl
                   hidden md:block / block md:hidden
  Container:       max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

DARK MODE
  Strategy A:      @variant dark (&:where(.dark,.dark *)) + class toggle via JS
  Strategy B:      media query (default) — no JS, follows OS setting
  dark: classes:   dark:bg-gray-800 dark:text-white dark:border-gray-700
  CSS vars:        Define :root and .dark vars → use bg-[--color-surface] → zero dark: needed
  FOUC:            Add inline script in <html> before React to prevent flash
  suppressHydrationWarning: always on <html> element in Next.js

COMPOSITION LAYERS (build in this order)
  1. Layout        flex/grid, position
  2. Sizing        w-* h-* max-w-* aspect-*
  3. Spacing       p-* gap-* mx-auto
  4. Visual        bg-* border-* rounded-* shadow-*
  5. Typography    text-* font-* leading-* tracking-*
  6. States        hover: focus-visible: active: disabled:
  7. Motion        transition-* duration-* ease-*
  8. Responsive    sm: md: lg: prefixes
  9. Dark mode     dark: or CSS variables

5 CORE PATTERNS
  Card:       flex flex-col + overflow-hidden + rounded-2xl + hover lift
  Form:       shared inputBase const + error variant + FormField wrapper
  Table:      divide-y + overflow-x-auto + odd:bg-gray-50 + hover:bg-blue-50
  Modal:      fixed inset-0 z-50 + backdrop + animate-in zoom-in-95
  Empty:      flex flex-col items-center text-center + icon + CTA
```

---

> **Your next action:** Open your current project. Find any component with `style={{ backgroundColor: '...', color: '...' }}` inline styles. Replace them with Tailwind color utilities. Add `transition-colors duration-150` to any button that's missing it. Then add `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200` to one card component. Run the dev server and watch the hover effect.
>
> _Doing one small thing beats opening a feed._
