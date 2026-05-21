# 📅 Day 11 — Tailwind Advanced Patterns (Tailwind CSS v4.3)

> **Goal:** Master every escape hatch, advanced selector, and architectural pattern in Tailwind v4.3 — arbitrary values, complex selectors, named groups, data attributes, theme strategy, duplication control, extraction, conflict resolution, `!important`, and prefixing.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Stack version:** Tailwind CSS v4.3

---

## 📋 Day 11 Subtopic Overview

| #   | Subtopic                                                              | Time   |
| --- | --------------------------------------------------------------------- | ------ |
| 1   | Arbitrary Values — `[value]` Syntax, CSS Variables, Calc              | 12 min |
| 2   | Arbitrary Properties — `[property:value]` for Any CSS                 | 10 min |
| 3   | Complex Selectors — `&`, `*`, `has-*`, `not-*`, `is-*`                | 12 min |
| 4   | Named Groups and Nested `group-*` Patterns                            | 12 min |
| 5   | Data-Attribute Styling — `data-*` Variants                            | 10 min |
| 6   | Theme Extension Mindset — When to Extend vs Override vs Use Arbitrary | 12 min |
| 7   | Duplication Control — Recognising and Taming Repeated Utilities       | 12 min |
| 8   | Component Extraction — When, How, and What NOT to Extract             | 12 min |
| 9   | Style Conflict Handling — Specificity, Merging, `cn()`, `twMerge`     | 12 min |
| 10  | `!important` — Forced Overrides and When They Are Justified           | 10 min |
| 11  | Prefixing — Namespace Isolation for Third-Party and Embedded Tailwind | 10 min |

---

---

# 1 — Arbitrary Values — `[value]` Syntax, CSS Variables, Calc

---

## T — TL;DR

Arbitrary values (`[value]`) let you use **any CSS value** that isn't in Tailwind's scale — exact pixel sizes, custom CSS variables, `calc()` expressions, or any design token your project needs — without leaving the utility-first workflow.

---

## K — Key Concepts

### Basic Arbitrary Value Syntax

```tsx
{/* ─── Syntax: utility-[value] */}
{/* Square brackets accept ANY valid CSS value for that property */}

{/* Sizing */}
<div className="w-[340px]">         {/* width: 340px */}
<div className="h-[calc(100vh-56px)]"> {/* height: calc(100vh - 56px) */}
<div className="max-w-[1440px]">    {/* max-width: 1440px */}
<div className="min-h-[480px]">     {/* min-height: 480px */}

{/* Spacing */}
<div className="p-[13px]">          {/* padding: 13px */}
<div className="mt-[72px]">         {/* margin-top: 72px */}
<div className="gap-[18px]">        {/* gap: 18px */}

{/* Typography */}
<p className="text-[13px]">         {/* font-size: 13px */}
<p className="text-[1.1rem]">       {/* font-size: 1.1rem */}
<p className="leading-[1.4]">       {/* line-height: 1.4 */}
<p className="tracking-[0.02em]">   {/* letter-spacing: 0.02em */}

{/* Colors */}
<div className="bg-[#1a2b3c]">      {/* exact hex color */}
<div className="bg-[rgb(26,43,60)]">{/* exact rgb color */}
<div className="text-[hsl(220,50%,30%)]"> {/* exact hsl */}

{/* Border radius */}
<div className="rounded-[10px]">    {/* border-radius: 10px */}
<div className="rounded-[50%]">     {/* ellipse */}
<div className="rounded-[4px_12px]">{/* top-left/top-right/... shorthand */}

{/* Z-index */}
<div className="z-[99]">            {/* z-index: 99 */}
<div className="z-[999]">           {/* z-index: 999 */}
```

### CSS Variables Inside Arbitrary Values

```tsx
{/* ─── Reference CSS custom properties */}
{/* Syntax: utility-[--variable-name] OR utility-[var(--variable-name)] */}

<div className="bg-[--color-brand]">
  {/* background-color: var(--color-brand) */}
</div>

<div className="text-[--color-text-muted]">
  {/* color: var(--color-text-muted) */}
</div>

<div className="border-[--color-border]">
  {/* border-color: var(--color-border) */}
</div>

{/* With opacity modifier */}
<div className="bg-[--color-brand]/20">
  {/* background-color: color-mix(in oklch, var(--color-brand) 20%, transparent) */}
</div>

{/* Using var() explicitly for complex expressions */}
<div className="w-[calc(var(--sidebar-width)+2rem)]">
  {/* width: calc(var(--sidebar-width) + 2rem) */}
</div>

{/* ─── Runtime CSS variables (set via style prop) */}
<div
  style={{ '--card-height': '320px' } as React.CSSProperties}
  className="h-[--card-height] relative"
>
  {/* height dynamically set via CSS variable */}
</div>
```

### `calc()` and Complex Expressions

```tsx
{/* ─── calc() inside arbitrary values */}
<div className="h-[calc(100vh-3.5rem)]">
  {/* Full height minus a 56px nav bar */}
</div>

<div className="w-[calc(100%-2rem)]">
  {/* Full width minus 32px for padding */}
</div>

<div className="max-w-[calc(65ch+2rem)]">
  {/* Prose width plus some breathing room */}
</div>

<div className="top-[calc(50%-1.5rem)]">
  {/* Center minus half of element's height */}
</div>

{/* ─── min() and max() */}
<div className="w-[min(100%,400px)]">
  {/* width: min(100%, 400px) — responsive, never exceeds 400px */}
</div>

<div className="p-[clamp(1rem,5vw,3rem)]">
  {/* Fluid padding: min 1rem, max 3rem, fluid in between */}
</div>

{/* ─── env() for safe areas (mobile notch) */}
<div className="pb-[env(safe-area-inset-bottom)]">
  {/* Extra bottom padding for iPhone notch/home indicator */}
</div>
```

### Arbitrary Values with Breakpoints and States

```tsx
{
  /* ─── Arbitrary values work with ALL variants */
}

{
  /* Responsive */
}
<div className="w-[280px] md:w-[360px] lg:w-[420px]">
  Grows at each breakpoint
</div>;

{
  /* Hover */
}
<div className="hover:translate-y-[-3px]">
  {" "}
  {/* or hover:-translate-y-[3px] */}
  Lifts slightly on hover
</div>;

{
  /* Dark mode */
}
<div className="bg-[#ffffff] dark:bg-[#0f172a]">Exact hex per theme</div>;

{
  /* Combined */
}
<div
  className="text-[13px] sm:text-[14px] dark:text-[#f8fafc]
                hover:text-[#1d4ed8] transition-colors"
>
  All variants work on arbitrary values ✅
</div>;
```

### Disambiguating Ambiguous Values

```tsx
{/* ─── When Tailwind can't tell which property the value belongs to */}
{/* Use the CSS property prefix to clarify */}

{/* bg-[#red] could mean background-color or background shorthand */}
{/* Use the full property name if ambiguous */}
<div className="bg-[url('/hero.jpg')]">      {/* background: url('/hero.jpg') */}
<div className="bg-[image:url('/bg.svg')]">  {/* background-image: url('/bg.svg') */}

{/* text-[1rem] = font-size, text-[hsl(0,0,0)] = color */}
{/* Tailwind infers from value format — but you can force it: */}
<p className="text-[length:1.2rem]">         {/* forces font-size interpretation */}
<p className="text-[color:#1a2b3c]">         {/* forces color interpretation */}

{/* Underscore → space (Tailwind convention) */}
<div className="grid-cols-[1fr_2fr_1fr]">
  {/* grid-template-columns: 1fr 2fr 1fr */}
  {/* Underscore _ becomes a space in the CSS value */}
</div>

<div className="bg-[url('/image_with_spaces.jpg')]">
  {/* Use _ for literal spaces in values */}
</div>

{/* Font family with spaces */}
<p className="font-['Playfair_Display']">
  {/* font-family: 'Playfair Display' */}
</p>
```

### Common Arbitrary Value Recipes

```tsx
{
  /* ─── Sidebar layout with exact width */
}
<div className="grid grid-cols-[260px_1fr]">
  <aside>Sidebar</aside>
  <main>Content</main>
</div>;

{
  /* ─── Three-column with named proportions */
}
<div className="grid grid-cols-[1fr_2fr_1fr]">
  <aside>Left</aside>
  <main>Center (double width)</main>
  <aside>Right</aside>
</div>;

{
  /* ─── Absolutely centered with known size */
}
<div
  className="absolute top-[50%] left-[50%]
                -translate-x-[50%] -translate-y-[50%]"
>
  {/* Perfectly centered regardless of parent size */}
</div>;

{
  /* ─── Fluid container */
}
<div className="w-[min(100%,1280px)] mx-auto px-[max(1rem,5vw)]">
  {/* Never wider than 1280px, responsive horizontal padding */}
</div>;

{
  /* ─── Banner with exact background position */
}
<div className="bg-[url('/hero.jpg')] bg-[center_top_20%] bg-cover">
  {/* Shift background position to show face/subject */}
</div>;
```

---

## W — Why It Matters

- Arbitrary values are the escape hatch that makes Tailwind practical on real projects — design systems, third-party integrations, and one-off requirements always produce values outside the default scale. Without arbitrary values, Tailwind would force you back to a separate CSS file for every exception.
- The `calc()` pattern for `h-[calc(100vh-3.5rem)]` is one of the most used in real Next.js apps — sticky navbars create fixed-height headers, and every page's content area needs to fill the remaining viewport height without a scroll glitch.
- CSS variable arbitrary values (`bg-[--color-brand]`) bridge Tailwind's utility system with runtime values — you can dynamically change a CSS variable via JavaScript and every element using that variable in an arbitrary value updates instantly with no class changes.

---

## I — Interview Q&A

### Q1: What are arbitrary values in Tailwind and when should you use them?

**A:** Arbitrary values let you use any CSS value within a utility class by wrapping it in square brackets — `w-[340px]`, `bg-[#1a2b3c]`, `h-[calc(100vh-56px)]`. Use them when the design requires a specific value not in Tailwind's default scale, when integrating with a third-party component that needs exact sizing, when referencing CSS custom properties (`bg-[--color-brand]`), or when using CSS functions like `calc()`, `min()`, `max()`, or `clamp()`. They should not be used as a way to avoid learning the scale — if you find yourself repeatedly using `w-[16px]`, that's `w-4` and you should use the named utility instead.

### Q2: How do you include a space inside an arbitrary value in Tailwind?

**A:** Replace spaces with underscores (`_`) inside arbitrary values. Tailwind converts underscores to spaces in the generated CSS. For example, `grid-cols-[1fr_2fr_1fr]` generates `grid-template-columns: 1fr 2fr 1fr`, and `font-['Playfair_Display']` generates `font-family: 'Playfair Display'`. The one exception is when the underscore must be a literal underscore — in that case Tailwind provides no escaping mechanism, so you'd need to use a CSS custom property instead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using arbitrary values for values that already exist in the scale

```tsx
{/* ❌ These all have named equivalents — use those instead */}
<div className="p-[16px]">   {/* = p-4 */}
<div className="w-[256px]">  {/* = w-64 */}
<div className="gap-[24px]"> {/* = gap-6 */}
<div className="text-[14px]">{/* = text-sm */}

{/* Using arbitrary values for scale values hurts:
    - Readability (p-4 is faster to parse than p-[16px])
    - Consistency (teammates might use p-4, creating duplicates in the bundle)
    - Tooling (IDE autocomplete suggests named values, not arbitrary)
*/}
```

**Fix:** Use named utilities for values on the scale:

```tsx
{/* ✅ Named utilities for scale values */}
<div className="p-4 w-64 gap-6 text-sm">
```

### ❌ Pitfall: Spaces inside arbitrary values break the class entirely

```tsx
{/* ❌ Space inside brackets — Tailwind can't parse this */}
<div className="grid-cols-[1fr 2fr 1fr]">
{/* The space terminates the class — Tailwind reads "grid-cols-[1fr" as a class */}
```

**Fix:** Use underscores for spaces:

```tsx
{/* ✅ Underscore becomes space in generated CSS */}
<div className="grid-cols-[1fr_2fr_1fr]">
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SplitLayout>` component using ONLY arbitrary values where appropriate:

1. Grid: left sidebar exactly `260px`, right main `1fr`
2. Sidebar height: `calc(100vh - 3.5rem)` (sticky below 56px nav)
3. A header with `clamp(1.5rem, 3vw, 2.5rem)` fluid font size
4. A decorative div with background `url('/pattern.svg')` centered, exact `bg-[center_top]`
5. A badge with exact border-radius `rounded-[6px]` and color `bg-[#f0fdf4]`
6. Main content max-width `min(100%, 72ch)`

### Solution

```tsx
// src/components/split-layout.tsx

interface SplitLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  title: string;
}

export function SplitLayout({
  sidebarContent,
  mainContent,
  title,
}: SplitLayoutProps) {
  return (
    // Full page grid: 260px sidebar + 1fr main
    <div className="grid grid-cols-[260px_1fr] min-h-screen">
      {/* Sidebar — sticky, fills remaining viewport below 56px nav */}
      <aside
        className="sticky top-14 h-[calc(100vh-3.5rem)]
                         bg-white dark:bg-gray-900
                         border-r border-gray-200 dark:border-gray-800
                         overflow-y-auto"
      >
        <div className="p-[18px]">{sidebarContent}</div>
      </aside>

      {/* Main area */}
      <main className="bg-gray-50 dark:bg-gray-950 p-8 overflow-y-auto">
        {/* Fluid heading */}
        <h1
          className="text-[clamp(1.5rem,3vw,2.5rem)] font-extrabold
                         text-gray-900 dark:text-white leading-tight
                         tracking-tight mb-6"
        >
          {title}
        </h1>

        {/* Decorative hero band with bg image */}
        <div
          className="relative h-[180px] rounded-2xl overflow-hidden mb-8
                          bg-[url('/pattern.svg')] bg-[center_top]
                          bg-[length:400px_auto] bg-repeat
                          bg-[#f0f9ff] dark:bg-[#0c1a2e]"
        >
          <div
            className="absolute inset-0 bg-gradient-to-r
                            from-white/60 dark:from-gray-950/60
                            to-transparent"
          />
          {/* Badge */}
          <span
            className="absolute top-4 left-4
                             px-3 py-1 rounded-[6px]
                             bg-[#f0fdf4] dark:bg-[#052e16]
                             text-[#166534] dark:text-[#4ade80]
                             text-xs font-semibold border
                             border-[#bbf7d0] dark:border-[#14532d]"
          >
            ✓ Active
          </span>
        </div>

        {/* Content — constrained to readable width */}
        <div className="w-[min(100%,72ch)]">{mainContent}</div>
      </main>
    </div>
  );
}
```

---

---

# 2 — Arbitrary Properties — `[property:value]` for Any CSS

---

## T — TL;DR

**Arbitrary properties** let you write any CSS declaration that has no Tailwind utility equivalent — using `[property:value]` syntax directly in `className`. This covers CSS properties Tailwind doesn't support out of the box: `content-visibility`, `contain`, `scroll-snap-*`, `caret-color`, print properties, and more.

---

## K — Key Concepts

### Syntax and Basic Usage

```tsx
{/* ─── Syntax: [css-property:value] */}
{/* Unlike arbitrary VALUES (which extend existing utilities),
    arbitrary PROPERTIES add entirely new CSS declarations */}

{/* Properties with no Tailwind utility */}
<div className="[content-visibility:auto]">
  {/* content-visibility: auto — skips rendering off-screen content */}
</div>

<div className="[contain:layout_paint]">
  {/* contain: layout paint — CSS containment */}
</div>

<div className="[scroll-snap-type:x_mandatory]">
  {/* scroll-snap-type: x mandatory */}
</div>

<div className="[scroll-snap-align:start]">
  {/* scroll-snap-align: start */}
</div>

<input className="[caret-color:#3b82f6]" />
{/* caret-color: #3b82f6 — the text cursor color */}

<div className="[resize:horizontal]">
  {/* resize: horizontal — allow horizontal resize only */}
</div>

<div className="[touch-action:pan-y]">
  {/* touch-action: pan-y — allow vertical scroll, block horizontal swipe */}
</div>

<div className="[will-change:transform]">
  {/* will-change: transform — GPU compositing hint */}
</div>

<p className="[hanging-punctuation:first]">
  {/* hanging-punctuation: first — advanced typography */}
</p>

{/* Print properties */}
<section className="print:[page-break-inside:avoid]">
  {/* page-break-inside: avoid — for print layout */}
</section>
```

### CSS Variables as Arbitrary Properties

```tsx
{
  /* ─── Setting CSS custom properties via arbitrary property syntax */
}
{
  /* This is how you set --variables inline without style={} */
}

<div className="[--card-gap:1.5rem] [--card-cols:3]">
  {/* Sets CSS variables on this element */}
  {/* Children can reference: grid-cols-[--card-cols] */}
</div>;

{
  /* ─── Real pattern: configurable component via CSS vars */
}
<div
  className="
    [--progress:65%]
    relative h-2 bg-gray-200 rounded-full overflow-hidden
  "
>
  <div
    className="absolute inset-y-0 left-0 w-[--progress]
                   bg-blue-600 rounded-full transition-all duration-500"
  />
</div>;
{
  /* The progress bar width is driven by --progress CSS variable */
}
{
  /* Change [--progress:80%] to update without re-rendering the inner div */
}

{
  /* ─── Stagger animation delays */
}
{
  [0, 1, 2, 3].map((i) => (
    <div
      key={i}
      className="[--delay:calc(var(--i)*100ms)] animation-delay-[--delay]
               animate-fade-in"
      style={{ "--i": i } as React.CSSProperties}
    >
      Item {i}
    </div>
  ));
}
```

### Combining Arbitrary Properties with Variants

```tsx
{
  /* ─── All variant prefixes work on arbitrary properties */
}

{
  /* Hover */
}
<div className="[outline:none] hover:[outline:2px_solid_#3b82f6]">
  Focus outline only on hover
</div>;

{
  /* Dark mode */
}
<div className="[color-scheme:light] dark:[color-scheme:dark]">
  {/* Tells browser the color scheme — affects scrollbars, inputs */}
</div>;

{
  /* Responsive */
}
<div className="[column-count:1] md:[column-count:2] lg:[column-count:3]">
  {/* CSS multi-column layout */}
</div>;

{
  /* Focus */
}
<input className="[caret-color:gray] focus:[caret-color:#3b82f6]" />;

{
  /* Print */
}
<article className="[orphans:3] [widows:3]">
  {/* Typography: prevent single lines at top/bottom of print pages */}
</article>;
```

### Scroll Snap — A Complete Arbitrary Property Pattern

```tsx
{
  /* Horizontal scroll snap carousel — all via arbitrary properties */
}
<div
  className="
    flex overflow-x-auto gap-4 pb-4
    [scroll-snap-type:x_mandatory]
    [scrollbar-width:none]
    [-webkit-overflow-scrolling:touch]
  "
>
  {slides.map((slide) => (
    <div
      key={slide.id}
      className="
        shrink-0 w-80 h-48 rounded-2xl
        [scroll-snap-align:start]
        [scroll-margin-left:1rem]
        bg-gradient-to-br from-blue-500 to-purple-600
      "
    >
      {slide.content}
    </div>
  ))}
</div>;
```

### `content` Utility — Pseudo-Elements

```tsx
{/* ─── ::before and ::after content */}
{/* Tailwind has content-[''] but for complex values use arbitrary */}

<div className="before:content-['Required'] before:text-red-500
                before:text-xs before:mr-1">
  Field label
</div>

<a className="after:content-['_↗'] after:text-xs after:opacity-60">
  External link
</a>

{/* Content with CSS attr() — read from HTML attribute */}
<div
  data-count="42"
  className="after:content-[attr(data-count)]
             after:text-xs after:bg-red-500 after:text-white
             after:rounded-full after:px-1.5 after:py-0.5
             after:ml-1 after:font-bold"
>
  Notifications
</div>
```

---

## W — Why It Matters

- Arbitrary properties prevent the need for a separate CSS file for every non-standard property — `content-visibility: auto`, `contain: layout paint`, and `scroll-snap-type` are performance-critical CSS properties that Tailwind doesn't have named utilities for. Without arbitrary properties, you'd be forced to add `style={{}}` inline styles or a CSS file just for these declarations.
- Setting CSS variables via `[--variable:value]` syntax is more powerful than `style={{ '--variable': 'value' }}` because it participates in Tailwind's variant system — you can write `hover:[--color:#fff]` or `dark:[--shadow:0_0_20px_#000]`, which you cannot do with inline styles.
- The `[color-scheme:dark]` on the root `<html>` element in dark mode apps tells the browser to render native controls (scrollbars, form inputs, checkboxes) in dark style — without this, you get light-coloured native inputs on a dark background.

---

## I — Interview Q&A

### Q1: What is the difference between arbitrary values and arbitrary properties in Tailwind?

**A:** Arbitrary values extend an existing utility with a custom value — `w-[340px]` still uses Tailwind's `width` utility, just with a non-scale value. Arbitrary properties add entirely new CSS declarations for properties that have no Tailwind utility — `[content-visibility:auto]` creates a CSS rule for `content-visibility`, which doesn't exist as a named Tailwind class. Arbitrary values are more common; arbitrary properties are the escape hatch for niche or newer CSS properties that haven't been added to Tailwind's core utilities yet.

### Q2: How do you set CSS custom properties inline in Tailwind without using `style={{}}`?

**A:** Use the arbitrary property syntax: `[--variable-name:value]`. For example, `className="[--progress:65%]"` sets `--progress: 65%` on that element, which children can then reference via arbitrary value syntax: `w-[--progress]`. This approach is superior to `style={{ '--progress': '65%' }}` because it participates in Tailwind's variant system — you can write `hover:[--progress:80%]` or `dark:[--color:#fff]`, which is impossible with inline styles.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using arbitrary properties for things Tailwind already supports

```tsx
{/* ❌ These all have Tailwind utilities — don't use arbitrary properties */}
<div className="[display:flex]">      {/* use: flex */}
<div className="[padding:1rem]">      {/* use: p-4 */}
<div className="[color:#111827]">     {/* use: text-gray-900 */}
<div className="[border-radius:0.75rem]"> {/* use: rounded-xl */}

{/* Arbitrary properties bypass autocomplete, type checking,
    dark mode utilities, and responsive prefixes working cleanly */}
```

**Fix:** Use named utilities whenever they exist. Arbitrary properties are for CSS that truly has no utility equivalent.

### ❌ Pitfall: Forgetting underscores for spaces in arbitrary properties

```tsx
{/* ❌ Space in value breaks the class */}
<div className="[scroll-snap-type:x mandatory]">
```

**Fix:**

```tsx
{/* ✅ Underscore for space */}
<div className="[scroll-snap-type:x_mandatory]">
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SnapCarousel>` component using ONLY arbitrary properties for scroll behaviour:

1. Container: `[scroll-snap-type:x_mandatory]`, `[scrollbar-width:none]`, `[-webkit-overflow-scrolling:touch]`
2. Each slide: `[scroll-snap-align:start]`, `[scroll-margin-left:1rem]`
3. A progress bar driven by `[--progress:N%]` arbitrary property (set dynamically)
4. Caret color on a slide caption input: `[caret-color:#3b82f6]`
5. `[will-change:transform]` on sliding elements for GPU hint
6. `[color-scheme:dark]` on the dark mode wrapper

### Solution

```tsx
// src/components/snap-carousel.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface Slide {
  id: number;
  title: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  { id: 1, title: "Slide One", gradient: "from-blue-500 to-purple-600" },
  { id: 2, title: "Slide Two", gradient: "from-purple-500 to-pink-600" },
  { id: 3, title: "Slide Three", gradient: "from-pink-500 to-rose-600" },
  { id: 4, title: "Slide Four", gradient: "from-rose-500 to-amber-500" },
];

export function SnapCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Update active slide on scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handler = () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      setActiveIdx(idx);
    };
    track.addEventListener("scroll", handler, { passive: true });
    return () => track.removeEventListener("scroll", handler);
  }, []);

  const progress = `${((activeIdx + 1) / SLIDES.length) * 100}%`;

  return (
    <div className="dark:[color-scheme:dark] max-w-lg mx-auto space-y-4">
      {/* Scroll track */}
      <div
        ref={trackRef}
        className="
          flex overflow-x-auto gap-4
          [scroll-snap-type:x_mandatory]
          [scrollbar-width:none]
          [-webkit-overflow-scrolling:touch]
          rounded-2xl
        "
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.id}
            className={`
              shrink-0 w-full h-52 rounded-2xl
              [scroll-snap-align:start]
              [scroll-margin-left:0px]
              [will-change:transform]
              bg-gradient-to-br ${slide.gradient}
              flex flex-col items-center justify-center gap-3
            `}
          >
            <h3 className="text-white text-2xl font-bold">{slide.title}</h3>

            {/* Caption input with blue caret */}
            <input
              className="
                px-3 py-1.5 rounded-lg text-sm
                bg-white/20 text-white placeholder:text-white/60
                border border-white/30 backdrop-blur-sm
                focus:outline-none focus:border-white/60
                [caret-color:#ffffff]
                w-48
              "
              placeholder="Add a caption…"
            />
          </div>
        ))}
      </div>

      {/* Progress bar — driven by [--progress] arbitrary property */}
      <div
        className={`[--progress:${progress}] relative h-1.5 bg-gray-200
                    dark:bg-gray-700 rounded-full overflow-hidden`}
      >
        <div
          className="absolute inset-y-0 left-0 w-[--progress]
                         bg-blue-600 rounded-full
                         transition-all duration-300 ease-out"
        />
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => {
              trackRef.current?.scrollTo({
                left: i * trackRef.current.clientWidth,
                behavior: "smooth",
              });
            }}
            className={`transition-all duration-200 rounded-full
                         ${
                           i === activeIdx
                             ? "w-6 h-2 bg-blue-600"
                             : "w-2 h-2 bg-gray-300 dark:bg-gray-600"
                         }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
```

---

---

# 3 — Complex Selectors — `&`, `*`, `has-*`, `not-*`, `is-*`

---

## T — TL;DR

Tailwind v4.3 supports **complex CSS selectors** as variants — `*:` targets all children, `has-[]:` mirrors CSS `:has()`, `not-[]:` mirrors `:not()`, and `&` in arbitrary variants gives you full selector customisation without leaving the utility workflow.

---

## K — Key Concepts

### The `*:` Variant — Style All Direct Children

```tsx
{
  /* ─── *: applies the utility to all direct children */
}
{
  /* Equivalent to CSS: .parent > * { ... } */
}

{
  /* All children get the same text color */
}
<ul className="*:text-gray-700 *:text-sm">
  <li>Item 1</li> {/* text-gray-700 text-sm */}
  <li>Item 2</li> {/* text-gray-700 text-sm */}
  <li>Item 3</li> {/* text-gray-700 text-sm */}
</ul>;

{
  /* All children get padding and border */
}
<div className="*:px-4 *:py-3 *:border-b *:border-gray-100 *:last:border-0">
  <div>Row 1</div>
  <div>Row 2</div>
  <div>Row 3</div>
</div>;

{
  /* Override child color from parent — useful in Server Components
    where you can't add classes to children directly */
}
<nav className="*:text-gray-600 *:hover:text-gray-900 *:transition-colors">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/blog">Blog</a>
</nav>;

{
  /* Combined with responsive/dark */
}
<div
  className="*:rounded-xl *:border dark:*:border-gray-700
                sm:*:p-6 lg:*:p-8"
>
  {cards.map((card) => (
    <Card key={card.id} {...card} />
  ))}
</div>;
```

### `has-[]:` Variant — Parent Reacts to Child State

```tsx
{
  /* ─── has-[selector]: styles the PARENT when the selector matches a CHILD */
}
{
  /* Mirrors CSS :has() pseudo-class — no JavaScript needed */
}

{
  /* Card highlights when its checkbox is checked */
}
<label
  className="flex items-center gap-3 p-4 rounded-xl border
                   border-gray-200 cursor-pointer
                   has-[:checked]:border-blue-500
                   has-[:checked]:bg-blue-50
                   dark:has-[:checked]:bg-blue-900/20
                   transition-colors"
>
  <input type="checkbox" className="sr-only peer" />
  <span
    className="size-5 rounded border-2 border-gray-300 flex
                    items-center justify-center
                    peer-checked:border-blue-600 peer-checked:bg-blue-600
                    transition-colors"
  >
    <svg
      className="size-3 text-white hidden peer-checked:block"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </span>
  <span
    className="text-sm font-medium text-gray-700
                    peer-checked:text-blue-700"
  >
    Enable feature
  </span>
</label>;

{
  /* Form group error state — parent has invalid input */
}
<div
  className="space-y-1
                has-[:invalid]:ring-2
                has-[:invalid]:ring-red-400
                rounded-xl p-4 border border-transparent"
>
  <label
    className="text-sm font-medium text-gray-700
                     has-[:invalid]:text-red-600"
  >
    Email
  </label>
  <input
    type="email"
    required
    className="w-full px-3 py-2 border rounded-lg text-sm
                     focus:outline-none border-gray-300"
  />
</div>;

{
  /* Navigation item active state */
}
<div
  className="has-[.active]:bg-blue-50 has-[.active]:border-blue-200
                p-3 rounded-xl border border-transparent transition-colors"
>
  <a href="/dashboard" className="active text-sm font-medium text-blue-700">
    Dashboard
  </a>
</div>;
```

### `not-[]:` Variant — Style Everything Except…

```tsx
{
  /* ─── not-[selector]: applies when the element does NOT match selector */
}

{
  /* Style all links except active ones */
}
<nav className="flex gap-6">
  {links.map((link) => (
    <a
      key={link.href}
      href={link.href}
      className={`text-sm font-medium transition-colors
                   not-[.active]:text-gray-500
                   not-[.active]:hover:text-gray-900
                   ${link.active ? "active text-blue-600" : ""}`}
    >
      {link.label}
    </a>
  ))}
</nav>;

{
  /* All items except the first get a top border */
}
<ul className="*:not-[:first-child]:border-t *:not-[:first-child]:border-gray-100">
  {items.map((item) => (
    <li key={item.id} className="py-3 px-4">
      {item.name}
    </li>
  ))}
</ul>;

{
  /* Buttons that are not disabled get hover styles */
}
<button
  className="px-4 py-2 bg-blue-600 text-white rounded-lg
                    not-[:disabled]:hover:bg-blue-700
                    not-[:disabled]:active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all"
>
  Submit
</button>;
```

### Arbitrary Variants — Full Selector Control

```tsx
{/* ─── Arbitrary variants: [&_selector]: parent matches, child selector styles */}
{/* & = the element itself, full CSS selector syntax */}

{/* Style all <p> inside this div */}
<div className="[&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4">
  <p>First paragraph — gets styles</p>
  <div>
    <p>Nested paragraph — also gets styles</p>
  </div>
</div>

{/* Style a sibling element */}
<div className="[&+div]:mt-0 [&+div]:border-t-0">
  First section
</div>
<div className="mt-8 border-t">
  Second section — mt-0 border-t-0 applied by previous sibling
</div>

{/* nth-child */}
<ul className="[&>li:nth-child(odd)]:bg-gray-50
               [&>li:nth-child(even)]:bg-white">
  {items.map(item => <li key={item.id} className="px-4 py-3">{item}</li>)}
</ul>

{/* Attribute selectors */}
<div className="[&[data-state='open']]:block hidden">
  Shown when data-state="open"
</div>

{/* Type selectors */}
<form className="[&_input]:rounded-lg [&_input]:border [&_input]:px-3
                  [&_input]:py-2 [&_textarea]:rounded-lg [&_textarea]:border
                  [&_label]:text-sm [&_label]:font-medium
                  [&_label]:text-gray-700 space-y-4">
  <label>Name</label>
  <input type="text" />
  <label>Message</label>
  <textarea />
</form>
```

### `is-[]:` and Selector Lists

```tsx
{
  /* ─── is-[selector]: equivalent to CSS :is() */
}
{
  /* Matches when the element itself matches the selector */
}

{
  /* Style an element differently when it IS a certain tag */
}
<div className="is-[section]:py-16 is-[article]:prose">Content</div>;

{
  /* Match multiple parent contexts */
}
<a
  className="
  [:where(nav,header)_&]:text-white
  [:where(nav,header)_&]:hover:text-blue-200
  text-blue-600 hover:text-blue-800
"
>
  Link — white in nav/header, blue elsewhere
</a>;

{
  /* Combining selectors */
}
<button
  className="
  [.sidebar_&]:w-full
  [.sidebar_&]:justify-start
  [.sidebar_&]:rounded-lg
  inline-flex items-center px-4 py-2 rounded-xl
"
>
  Action — full width in sidebar, normal elsewhere
</button>;
```

---

## W — Why It Matters

- `has-[]:` enables parent-driven styling that previously required JavaScript — a card that highlights when its inner checkbox is checked, a form group that shows error styles when its input is invalid, a nav item that is active when its link has `.active` — all purely in CSS, zero state management.
- The `*:` variant lets you apply uniform styles to dynamically generated children from a parent wrapper — ideal for CMS-rendered content, `dangerouslySetInnerHTML`, or third-party components where you can't modify the child JSX directly.
- Arbitrary variants `[&_selector]:` are the final escape hatch for any selector that CSS supports — nth-child, sibling selectors, attribute selectors, type selectors — accessible without leaving JSX or writing a CSS file.

---

## I — Interview Q&A

### Q1: What does the `has-[]` variant do in Tailwind v4 and give a real use case?

**A:** `has-[selector]:` applies styles to the element when it contains a descendant matching the selector — it mirrors the CSS `:has()` pseudo-class. A common use case is a selectable card: `has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50` on a `<label>` wrapping a hidden `<input type="checkbox">`. When the checkbox is checked, the entire card gets a highlighted border and background — no JavaScript or state needed. Another use case is form validation: `has-[:invalid]:ring-red-400` on a form group div highlights the entire field group when its input fails validation.

### Q2: When would you use `*:` versus `[&_*]:` in Tailwind?

**A:** `*:` styles only **direct children** — it generates `.parent > * { }` in CSS. `[&_*]:` or `[&_tagname]:` styles **all descendants** — it generates `.parent * { }` in CSS. Use `*:` when you want to style the immediate children uniformly (e.g., `*:py-3 *:border-b` on a list where each direct `<li>` gets a border). Use `[&_p]:` or `[&_a]:` when you want to style a specific element type at any nesting depth inside a container — like applying consistent typography to all paragraphs inside a rich text container you don't control.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Overusing `*:` and creating unintended style leakage

```tsx
{
  /* ❌ *:text-blue-600 applies to ALL direct children — including nested buttons */
}
<div className="*:text-blue-600">
  <p>Text — blue ✅</p>
  <button className="bg-blue-600 text-white">
    {/* Button text is overridden to blue — white lost ❌ */}
    Submit
  </button>
</div>;
```

**Fix:** Be specific — use `*:` only when ALL direct children should truly share that style:

```tsx
{
  /* ✅ Target specific elements, not all children */
}
<div className="[&>p]:text-blue-600">
  <p>Text — blue ✅</p>
  <button className="bg-blue-600 text-white">Submit — unaffected ✅</button>
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SelectableList>` component:

1. Each row: `has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300` — highlights when checked
2. The parent `<ul>`: `*:border-b *:last:border-0` — dividers between rows
3. Status text: `not-[:checked~*]:text-gray-500` — gray unless its sibling is checked
4. A rich text container: `[&_strong]:font-semibold [&_em]:italic [&_a]:text-blue-600 [&_a]:underline` for rendering arbitrary HTML safely

### Solution

```tsx
// src/components/selectable-list.tsx

interface ListItem {
  id: string;
  label: string;
  description: string;
}

const ITEMS: ListItem[] = [
  {
    id: "a",
    label: "Deploy to production",
    description: "Push v1.2.0 to the live environment",
  },
  {
    id: "b",
    label: "Run database migration",
    description: "Apply pending schema changes",
  },
  {
    id: "c",
    label: "Notify stakeholders",
    description: "Send release notes via email",
  },
];

export function SelectableList() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Selectable list — *: dividers */}
      <ul
        className="bg-white dark:bg-gray-800 rounded-2xl border
                      border-gray-200 dark:border-gray-700 overflow-hidden
                      *:border-b *:border-gray-100 *:dark:border-gray-700
                      *:last:border-0"
      >
        {ITEMS.map((item) => (
          <li key={item.id}>
            <label
              className="
              flex items-start gap-3 p-4 cursor-pointer
              has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20
              has-[:checked]:border-l-2
              has-[:checked]:border-l-blue-500
              transition-colors
            "
            >
              <input type="checkbox" id={item.id} className="sr-only peer" />
              {/* Custom checkbox */}
              <span
                className="
                shrink-0 mt-0.5 size-5 rounded border-2 border-gray-300
                flex items-center justify-center transition-colors
                peer-checked:border-blue-600 peer-checked:bg-blue-600
              "
              >
                <svg
                  className="size-3 text-white opacity-0 peer-checked:opacity-100"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold text-gray-900
                               dark:text-white peer-checked:text-blue-700
                               dark:peer-checked:text-blue-300"
                >
                  {item.label}
                </p>
                {/* not-[:checked]: muted — difficult with peer only,
                    so using opacity approach instead */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {item.description}
                </p>
              </div>
            </label>
          </li>
        ))}
      </ul>

      {/* Rich text container — arbitrary descendant selectors */}
      <div
        className="
        bg-white dark:bg-gray-800 rounded-2xl border
        border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-700
        dark:text-gray-300 leading-relaxed
        [&_strong]:font-semibold [&_strong]:text-gray-900
        dark:[&_strong]:text-white
        [&_em]:italic [&_em]:text-gray-500
        [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2
        [&_a]:hover:text-blue-800 [&_a]:transition-colors
        [&_code]:font-mono [&_code]:text-xs [&_code]:bg-gray-100
        [&_code]:dark:bg-gray-700 [&_code]:px-1.5 [&_code]:py-0.5
        [&_code]:rounded [&_code]:text-purple-700
        dark:[&_code]:text-purple-300
        [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300
        [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-500
      "
        dangerouslySetInnerHTML={{
          __html: `
          <p>This is a <strong>rich text</strong> block rendered from a CMS.
          Visit <a href="#">our documentation</a> for more details.</p>
          <blockquote>Typography should be <em>beautiful</em> by default.</blockquote>
          <p>Use <code>@apply</code> sparingly.</p>
        `,
        }}
      />
    </div>
  );
}
```

---

---

# 4 — Named Groups and Nested `group-*` Patterns

---

## T — TL;DR

**Named groups** (`group/{name}`) let multiple independent `group` scopes exist within the same component tree — child elements can target a specific ancestor's hover/focus state by name, enabling complex nested hover interactions with zero JavaScript.

---

## K — Key Concepts

### Basic `group` Recap

```tsx
{
  /* ─── group (unnamed) — any depth of nesting works */
}
{
  /* Hover the parent → children with group-hover: respond */
}

<div className="group p-4 rounded-xl hover:bg-blue-50 transition-colors">
  <p className="text-gray-900 group-hover:text-blue-700">Title</p>
  <p className="text-gray-500 group-hover:text-blue-500">Description</p>
  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
    →
  </span>
</div>;
```

### Named Groups — `group/{name}` and `group-hover/{name}:`

```tsx
{
  /* ─── Problem: nested groups conflict */
}
{
  /* Hovering inner group triggers outer group-hover: classes too */
}

{
  /* ─── Solution: name your groups */
}
{
  /* group/{name} on the parent, group-hover/{name}: on the target child */
}

<div
  className="group/card p-6 rounded-2xl border hover:border-blue-500
                transition-colors"
>
  {/* This responds to group/card hover */}
  <h3 className="font-semibold group-hover/card:text-blue-700">Card Title</h3>

  {/* Nested interactive element with its own named group */}
  <div className="group/action mt-4 flex items-center gap-2">
    {/* Responds to group/action hover only — NOT group/card */}
    <button
      className="group-hover/action:bg-blue-600
                        group-hover/action:text-white
                        px-3 py-1 rounded-lg border text-sm
                        transition-colors"
    >
      Edit
    </button>

    {/* This arrow responds to group/card hover */}
    <span
      className="ml-auto opacity-0 group-hover/card:opacity-100
                      group-hover/card:translate-x-1 transition-all"
    >
      →
    </span>
  </div>
</div>;
```

### Real-World Named Group Patterns

```tsx
{
  /* ─── Pattern 1: Table row with row-level and cell-level interactions */
}
<tr
  className="group/row hover:bg-blue-50 dark:hover:bg-blue-900/10
                transition-colors"
>
  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
    Air Max 90
  </td>
  <td className="px-4 py-3 text-sm text-gray-500">$120</td>
  {/* Action cell — hidden until row hover */}
  <td className="px-4 py-3">
    <div
      className="flex gap-2 opacity-0 group-hover/row:opacity-100
                     transition-opacity"
    >
      <div className="group/edit">
        <button
          className="px-2 py-1 rounded text-xs text-blue-600
                            group-hover/edit:bg-blue-100 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="group/delete">
        <button
          className="px-2 py-1 rounded text-xs text-red-600
                            group-hover/delete:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </td>
</tr>;

{
  /* ─── Pattern 2: Accordion with named group for open state */
}
<div className="group/accordion border rounded-xl overflow-hidden">
  {/* Trigger */}
  <button
    className="w-full flex items-center justify-between px-5 py-4
                text-left font-semibold text-gray-900 dark:text-white
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    aria-expanded="false"
  >
    How does it work?
    {/* Icon rotates based on aria-expanded via data attribute,
        but here we use group state for demo */}
    <span
      className="text-gray-400 group-hover/accordion:text-blue-500
                      transition-colors text-lg"
    >
      +
    </span>
  </button>

  {/* Content — revealed by data-state (see Subtopic 5) */}
  <div
    className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400
                   leading-relaxed border-t border-gray-100
                   dark:border-gray-700"
  >
    Content goes here.
  </div>
</div>;

{
  /* ─── Pattern 3: Navigation with active group and hover group */
}
<nav>
  {navItems.map((item) => (
    <div
      key={item.href}
      className={`group/item ${item.active ? "group/active" : ""}`}
    >
      <a
        href={item.href}
        className="
          flex items-center gap-3 px-3 py-2 rounded-xl text-sm
          transition-colors duration-150
          group-hover/item:bg-gray-100 dark:group-hover/item:bg-gray-800
          group-[.group\/active]/item:bg-blue-50
          group-[.group\/active]/item:text-blue-700
          text-gray-600 dark:text-gray-400
        "
      >
        <span
          className="text-base group-hover/item:scale-110
                          transition-transform"
        >
          {item.icon}
        </span>
        <span className="font-medium">{item.label}</span>

        {/* Badge — only shown on hover */}
        {item.count && (
          <span
            className="ml-auto text-xs bg-gray-200 dark:bg-gray-700
                            rounded-full px-1.5 py-0.5 font-medium
                            opacity-0 group-hover/item:opacity-100
                            transition-opacity"
          >
            {item.count}
          </span>
        )}
      </a>
    </div>
  ))}
</nav>;
```

### `group-focus:`, `group-focus-within:`, `group-active:`

```tsx
{
  /* ─── group supports more than just hover */
}

{
  /* group-focus-within: — parent reacts when ANY child has focus */
}
<div
  className="group/field border rounded-xl p-4 border-gray-200
                 focus-within:border-blue-500 transition-colors"
>
  <label
    className="text-xs font-semibold text-gray-500
                     group-focus-within/field:text-blue-600 transition-colors"
  >
    Email address
  </label>
  <input
    type="email"
    className="mt-1 w-full text-sm border-0 outline-none
                     text-gray-900 dark:text-white bg-transparent"
  />
</div>;

{
  /* group-has-[]: — parent group + has selector */
}
<div className="group/wrapper">
  <input type="checkbox" className="sr-only peer" id="toggle" />
  {/* Sibling reacts to checkbox via peer */}
  {/* Parent group reacts when wrapper has a checked input */}
  <div
    className="group-has-[:checked]/wrapper:bg-blue-50
                   p-4 rounded-xl transition-colors"
  >
    Content changes when checkbox checked
  </div>
</div>;
```

---

## W — Why It Matters

- Named groups solve the most common `group` pain point — when you have a card component with sub-components that each need their own hover states, unnamed groups get ambiguous. Named groups make the intent explicit: `group-hover/card:` means "react to the card's hover", `group-hover/action:` means "react to the action button's hover" — even deep in the tree.
- `group-focus-within:` is the pure CSS solution to the "floating label" pattern — a label that animates up when any input inside its parent is focused, without JavaScript event listeners tracking focus state.
- All group variants (`group-hover/name:`, `group-focus/name:`, `group-active/name:`) generate pure CSS pseudo-class rules — there is zero JavaScript overhead, no re-renders, and no layout thrashing.

---

## I — Interview Q&A

### Q1: Why would you use a named group (`group/name`) instead of a regular `group` in Tailwind?

**A:** Regular `group` creates a single, unnamed group context. If you have nested interactive elements — a card with action buttons inside it — hovering the action buttons also triggers the parent card's `group-hover:` classes, because they're both in the same unnamed group scope. Named groups solve this by creating isolated scopes: `group/card` on the outer card and `group/action` on the inner action container. Children can then use `group-hover/card:` to react to the card's hover and `group-hover/action:` to react to the button's hover independently, with no cross-contamination.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Unnamed groups conflicting in nested interactive components

```tsx
{
  /* ❌ Hovering the button triggers both levels of group-hover */
}
<div className="group hover:bg-blue-50">
  {" "}
  {/* outer group */}
  <h3 className="group-hover:text-blue-700">Title</h3>
  <div className="group">
    {" "}
    {/* inner group — same name! */}
    <button className="group-hover:bg-blue-600 group-hover:text-white px-3 py-1">
      {/* This hover also triggers outer group-hover: classes ❌ */}
      Edit
    </button>
  </div>
</div>;
```

**Fix:** Use named groups:

```tsx
{
  /* ✅ Named groups — isolated scopes */
}
<div className="group/card hover:bg-blue-50">
  <h3 className="group-hover/card:text-blue-700">Title</h3>
  <div className="group/btn">
    <button
      className="group-hover/btn:bg-blue-600 group-hover/btn:text-white
                        px-3 py-1 transition-colors"
    >
      Edit
    </button>
  </div>
</div>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<KanbanCard>` component with three named group scopes:

1. `group/card` — card hover: lift shadow, reveal action bar
2. `group/priority` — priority badge hover: show tooltip
3. `group/assignee` — assignee avatar hover: show name tooltip
4. `group-focus-within/card` — card focus state for accessibility
5. Action bar: `opacity-0 group-hover/card:opacity-100`

### Solution

```tsx
// src/components/kanban-card.tsx

interface KanbanCardProps {
  title: string;
  priority: "low" | "medium" | "high";
  assignee: { name: string; initials: string; color: string };
  tags: string[];
  dueDate: string;
}

const PRIORITY_MAP = {
  low: {
    label: "Low",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  high: {
    label: "High",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

export function KanbanCard({
  title,
  priority,
  assignee,
  tags,
  dueDate,
}: KanbanCardProps) {
  const p = PRIORITY_MAP[priority];

  return (
    // group/card — outer scope
    <div
      className="
      group/card relative flex flex-col gap-3 p-4 bg-white
      dark:bg-gray-800 border border-gray-200 dark:border-gray-700
      rounded-xl shadow-sm
      hover:shadow-md dark:hover:ring-1 dark:hover:ring-gray-600
      hover:-translate-y-0.5
      focus-within:ring-2 focus-within:ring-blue-500
      transition-all duration-200 cursor-pointer
    "
    >
      {/* Action bar — revealed on group/card hover */}
      <div
        className="
        absolute top-2 right-2 flex gap-1
        opacity-0 group-hover/card:opacity-100
        translate-y-[-4px] group-hover/card:translate-y-0
        transition-all duration-150
      "
      >
        {["✏️", "🗑️", "⋯"].map((icon) => (
          <button
            key={icon}
            className="size-6 rounded flex items-center justify-center
                              text-xs bg-white dark:bg-gray-700 border
                              border-gray-200 dark:border-gray-600
                              hover:bg-gray-100 dark:hover:bg-gray-600
                              transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Priority badge — group/priority for tooltip */}
      <div className="group/priority relative w-fit">
        <span
          className={`px-2 py-0.5 text-[10px] font-bold uppercase
                           tracking-wider rounded-full ${p.bg} ${p.text}`}
        >
          {p.label}
        </span>
        {/* Tooltip — visible on group/priority hover */}
        <div
          className="
          absolute bottom-full left-0 mb-1.5 px-2 py-1 text-xs
          bg-gray-900 text-white rounded-lg whitespace-nowrap
          opacity-0 group-hover/priority:opacity-100
          translate-y-1 group-hover/priority:translate-y-0
          transition-all duration-150 pointer-events-none z-10
        "
        >
          {priority === "high"
            ? "🔥 Needs attention"
            : priority === "medium"
              ? "⚠️ Normal priority"
              : "✅ Low urgency"}
          <div
            className="absolute top-full left-3 border-4 border-transparent
                           border-t-gray-900"
          />
        </div>
      </div>

      {/* Title */}
      <p
        className="text-sm font-semibold text-gray-900 dark:text-white
                     leading-snug group-hover/card:text-blue-700
                     dark:group-hover/card:text-blue-400
                     transition-colors pr-16"
      >
        {title}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium
                              bg-gray-100 dark:bg-gray-700
                              text-gray-600 dark:text-gray-400 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div
        className="flex items-center justify-between mt-auto pt-2
                       border-t border-gray-100 dark:border-gray-700"
      >
        {/* Due date */}
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          📅 {dueDate}
        </span>

        {/* Assignee — group/assignee for name tooltip */}
        <div className="group/assignee relative">
          <div
            className={`size-6 rounded-full flex items-center justify-center
                            text-[10px] font-bold text-white cursor-pointer
                            ring-2 ring-white dark:ring-gray-800
                            transition-transform group-hover/assignee:scale-110
                            ${assignee.color}`}
          >
            {assignee.initials}
          </div>
          {/* Name tooltip */}
          <div
            className="
            absolute bottom-full right-0 mb-1.5 px-2 py-1 text-xs
            bg-gray-900 text-white rounded-lg whitespace-nowrap
            opacity-0 group-hover/assignee:opacity-100
            translate-y-1 group-hover/assignee:translate-y-0
            transition-all duration-150 pointer-events-none z-10
          "
          >
            {assignee.name}
            <div
              className="absolute top-full right-2 border-4 border-transparent
                             border-t-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

---

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

# 6 — Theme Extension Mindset — When to Extend vs Override vs Use Arbitrary

---

## T — TL;DR

Every design decision in Tailwind v4 falls into one of three buckets: **extend** (add to `@theme {}`), **override** (replace a default), or **use arbitrary** (one-off value). The correct choice determines whether your codebase stays clean and consistent or becomes a sea of `[value]` scattered everywhere.

---

## K — Key Concepts

### The Decision Framework

```
Ask three questions:

1. Will I use this value 3+ times across the codebase?
   YES → Extend @theme {} with a named token
   NO  → Use arbitrary value [value]

2. Does this replace a Tailwind default I'll NEVER use?
   YES → Override the default in @theme {}
   NO  → Add alongside the default

3. Is this a one-off, layout-specific, or API-driven value?
   YES → Arbitrary value is correct — don't pollute @theme
   NO  → Named token in @theme
```

### When to Extend — Named Tokens in `@theme`

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ─── Extend: brand colors used across the entire app */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  /* ─── Extend: custom spacing values used repeatedly */
  --spacing-13: 3.25rem; /* 52px — used in sidebar widths, avatar rows */
  --spacing-18: 4.5rem; /* 72px — hero padding, section gaps */
  --spacing-22: 5.5rem; /* 88px — nav heights, sticky offsets */
  --spacing-128: 32rem; /* 512px — max-width variants */

  /* ─── Extend: custom breakpoints for the app's layout needs */
  --breakpoint-xs: 30rem; /* 480px — small phones */
  --breakpoint-3xl: 112rem; /* 1792px — wide monitors */

  /* ─── Extend: custom shadows matching design system */
  --shadow-sm-brand: 0 1px 3px 0 rgb(37 99 235 / 0.2);
  --shadow-glow: 0 0 24px -4px rgb(59 130 246 / 0.4);
  --shadow-card: 0 4px 12px -2px rgb(0 0 0 / 0.08);

  /* ─── Extend: animation durations for consistent motion */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 400ms;
}
```

```tsx
{/* ─── Using extended tokens */}
<div className="bg-brand-600 hover:bg-brand-700 text-white p-18 shadow-glow">
  Uses custom tokens — clear intent, consistent
</div>

<section className="py-18 px-4 sm:px-6 max-w-128 mx-auto">
  Custom spacing and max-width
</section>
```

### When to Override — Replacing Defaults

```css
/* ─── Override: completely replace a Tailwind default */
/* Use when: you NEVER want the original value, only yours */
/* Warning: overriding removes the original — all teammates lose it */

@theme {
  /* Replace default font families entirely */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Tighten the default border-radius scale */
  --radius-sm: 0.25rem; /* was 0.125rem */
  --radius-md: 0.5rem; /* was 0.375rem */
  --radius-lg: 0.75rem; /* was 0.5rem */

  /* Override gray to use a warmer stone palette */
  --color-gray-50: #fafaf9; /* stone-50 */
  --color-gray-100: #f5f5f4; /* stone-100 */
  --color-gray-900: #1c1917; /* stone-900 */
}

/* ─── Override: change Tailwind's default transition durations */
@theme {
  --default-transition-duration: 200ms; /* was 150ms */
}
```

### When to Use Arbitrary — One-Off Values

```tsx
{
  /* ─── Arbitrary: values that appear once or twice */
}
{
  /* Don't pollute @theme with one-off values */
}

{
  /* Layout-specific */
}
<div className="grid grid-cols-[260px_1fr_300px]">
  {/* Specific to this dashboard layout — not a design token */}
</div>;

{
  /* API-driven sizes */
}
<div
  style={{ "--progress": `${percentage}%` } as React.CSSProperties}
  className="w-[--progress] h-2 bg-blue-600 rounded-full"
>
  {/* Width comes from data — arbitrary value is correct */}
</div>;

{
  /* Third-party component sizing */
}
<div className="w-[var(--radix-select-trigger-width)]">
  {/* Radix-specific CSS variable — not a design token */}
</div>;

{
  /* Content-based */
}
<div className="min-h-[420px]">
  {/* Minimum height to prevent layout shift for a specific section */}
</div>;
```

### Semantic Design Tokens vs Literal Tokens

```css
/* ─── Anti-pattern: literal tokens */
@theme {
  --color-blue-600: #2563eb; /* ← literal — duplicates Tailwind's default */
  --spacing-16px: 1rem; /* ← literal — just use p-4 */
}

/* ─── Better: semantic tokens that communicate PURPOSE */
@theme {
  /* Semantic: what the color IS for, not what color it is */
  --color-primary: #2563eb; /* primary action color */
  --color-primary-hover: #1d4ed8; /* primary on hover */
  --color-destructive: #dc2626; /* delete/danger actions */
  --color-success: #16a34a; /* success states */
  --color-warning: #d97706; /* warning states */
  --color-muted: #6b7280; /* secondary text */

  /* Semantic spacing: what the spacing IS for */
  --spacing-nav-height: 3.5rem; /* sticky nav height */
  --spacing-sidebar: 16rem; /* sidebar width */
  --spacing-content-gap: 1.5rem; /* gap within content blocks */
}
```

```tsx
{/* ─── Semantic usage — self-documenting */}
<nav className="h-[--spacing-nav-height] sticky top-0 z-40">
<aside className="w-[--spacing-sidebar]">
<main className="h-[calc(100vh-var(--spacing-nav-height))]">
{/* Reading the code tells you WHY, not just WHAT */}
```

---

## W — Why It Matters

- The `@theme {}` extension namespace is your app's design language — if you add everything to it, it becomes noise; if you add nothing, you get arbitrary values everywhere. The three-question framework (`3+ uses? → extend`, `replacing? → override`, `one-off? → arbitrary`) keeps the design system lean and the codebase clean.
- Semantic tokens (`--color-primary`, `--spacing-nav-height`) are significantly more maintainable than literal tokens (`--color-blue-600`, `--spacing-56px`) — when the design changes, you update one CSS variable and every usage updates, vs hunting for every arbitrary `[56px]` in the codebase.
- Overriding Tailwind defaults should be done deliberately — overriding `--font-sans` is appropriate when you have a consistent font stack, but overriding individual color scale values affects every blue-related utility across the entire app, which can produce unexpected results.

---

## I — Interview Q&A

### Q1: When should you add a value to `@theme {}` vs using an arbitrary value in Tailwind v4?

**A:** Add to `@theme {}` when a value is used three or more times across the codebase, when it represents a semantic design decision (brand color, nav height, sidebar width), or when it needs to be consistent across components and teammates. Use arbitrary values for one-off layout-specific measurements, values that come from runtime data (widths from APIs or user input), values specific to a third-party library's CSS variables, and design experiments that haven't been ratified into the design system. The test is: would renaming this value require you to update a CSS variable in one place, or would you have to search for the arbitrary value everywhere?

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Adding every arbitrary value to `@theme` — pollutes the design system

```css
/* ❌ These don't belong in @theme — they're one-off layout values */
@theme {
  --spacing-13px: 0.8125rem; /* used once in one component */
  --spacing-42: 10.5rem; /* used for one specific card height */
  --color-chart-line-1: #ff6b6b; /* recharts-specific color */
  --color-chart-line-2: #4ecdc4;
}
```

**Fix:** Keep one-off values as arbitrary values:

```tsx
{/* ✅ One-off values stay inline */}
<div className="p-[13px]">
<div className="h-[420px]">
<div style={{ '--recharts-color-1': '#ff6b6b' } as CSSProperties}>
```

---

## K — Coding Challenge + Solution

### Challenge

Design a complete `@theme {}` extension for a SaaS dashboard app. Include:

1. Semantic brand colors (primary, primary-hover, destructive, success, warning)
2. UI colors (surface, surface-alt, border, text, text-muted)
3. Semantic spacing tokens (nav-height, sidebar-width, content-max-width)
4. Custom shadows (card, card-hover, glow-brand)
5. Override: default font-sans to Inter
6. Custom breakpoint: `tablet` at 50rem
7. Write a component that uses ALL these tokens — zero arbitrary values

### Solution

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ─── Font override */
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  /* ─── Semantic brand colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #eff6ff;
  --color-primary-text: #1d4ed8;
  --color-destructive: #dc2626;
  --color-destructive-hover: #b91c1c;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-info: #0891b2;

  /* ─── Semantic UI colors */
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-muted: #6b7280;

  /* ─── Semantic spacing */
  --spacing-nav: 3.5rem;
  --spacing-sidebar: 15rem;
  --spacing-content-max: 75rem;

  /* ─── Shadows */
  --shadow-card:
    0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-card-hover:
    0 4px 12px -2px rgb(0 0 0 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.06);
  --shadow-glow-brand: 0 0 20px -4px rgb(37 99 235 / 0.35);

  /* ─── Custom breakpoint */
  --breakpoint-tablet: 50rem;
}

/* Dark mode semantic overrides */
.dark {
  --color-surface: #1e293b;
  --color-surface-alt: #0f172a;
  --color-border: #334155;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-primary-light: #1e3a8a;
  --color-primary-text: #93c5fd;
}
```

```tsx
// src/components/action-card.tsx
// Uses ONLY named tokens — zero arbitrary values

interface ActionCardProps {
  title: string;
  description: string;
  onPrimary: () => void;
  onDelete: () => void;
  status: "active" | "warning" | "error";
}

const STATUS_COLORS = {
  active: "bg-success text-white",
  warning: "bg-warning text-white",
  error: "bg-destructive text-white",
};

export function ActionCard({
  title,
  description,
  onPrimary,
  onDelete,
  status,
}: ActionCardProps) {
  return (
    // Uses: shadow-card, hover shadow-card-hover, color tokens via arbitrary var refs
    <div
      className="
      bg-[--color-surface] border border-[--color-border] rounded-2xl p-6
      shadow-card hover:shadow-card-hover hover:-translate-y-0.5
      transition-all duration-200
    "
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-[--color-text] text-lg leading-tight">
            {title}
          </h3>
          <p className="text-sm text-[--color-text-muted] text-pretty">
            {description}
          </p>
        </div>
        {/* Status badge using semantic color tokens */}
        <span
          className={`shrink-0 ml-3 px-2.5 py-1 text-xs font-bold
                           uppercase tracking-wider rounded-full
                           ${STATUS_COLORS[status]}`}
        >
          {status}
        </span>
      </div>

      {/* Action row */}
      <div className="flex gap-3 mt-5 pt-4 border-t border-[--color-border]">
        <button
          onClick={onPrimary}
          className="
            flex-1 py-2 rounded-xl text-sm font-semibold text-white
            bg-primary hover:bg-primary-hover
            shadow-glow-brand hover:shadow-none
            active:scale-[0.98] transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-primary focus-visible:ring-offset-2
          "
        >
          Primary action
        </button>
        <button
          onClick={onDelete}
          className="
            px-4 py-2 rounded-xl text-sm font-semibold
            text-destructive bg-[--color-surface-alt]
            hover:bg-destructive hover:text-white
            border border-[--color-border]
            active:scale-[0.98] transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-destructive focus-visible:ring-offset-2
          "
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

---

---

# 7 — Duplication Control — Recognising and Taming Repeated Utilities

---

## T — TL;DR

Duplication in Tailwind is a feature until it isn't — the same 15-class string copy-pasted across 20 files becomes a maintenance nightmare. The tools: **React component extraction** (the main tool), **`@apply`** (last resort for non-JSX contexts), and **shared class constants** (middle ground for variant patterns).

---

## K — Key Concepts

### Recognising Duplication Worth Fixing

```tsx
{/* ─── Level 1: Acceptable duplication (same utility, different context) */}
{/* These don't need extraction — they're reading correctly */}
<h1 className="text-4xl font-bold text-gray-900">Page title</h1>
<h2 className="text-3xl font-bold text-gray-900">Section title</h2>
{/* Similar but semantically different — keep as-is */}

{/* ─── Level 2: Suspicious (same meaningful combination, 3+ places) */}
{/* If you see this in 3+ components, extract it */}
<button className="px-4 py-2 bg-blue-600 text-white font-semibold
                    rounded-lg hover:bg-blue-700 transition-colors">
  Button A
</button>
<button className="px-4 py-2 bg-blue-600 text-white font-semibold
                    rounded-lg hover:bg-blue-700 transition-colors">
  Button B
</button>
{/* Same 8-class string → extract to a <Button> component */}

{/* ─── Level 3: Critical (design system atoms used everywhere) */}
{/* Card, input, badge, avatar, label — always extract these */}
```

### Tool 1 — React Component Extraction (Primary)

```tsx
{/* ─── Best solution: extract to a component */}
{/* Component carries the styles — usage sites are clean */}

// src/components/ui/button.tsx
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  // ─── Base classes (always applied)
  `inline-flex items-center justify-center font-semibold
   rounded-xl transition-all duration-150 active:scale-[0.97]
   focus-visible:outline-none focus-visible:ring-2
   focus-visible:ring-offset-2 disabled:opacity-50
   disabled:cursor-not-allowed disabled:pointer-events-none`,
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
        ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline:   'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-500'
      },
      size: {
        xs:  'px-2.5 py-1.5 text-xs gap-1.5',
        sm:  'px-3 py-2 text-sm gap-2',
        md:  'px-5 py-2.5 text-sm gap-2',
        lg:  'px-6 py-3 text-base gap-2.5',
        xl:  'px-8 py-4 text-lg gap-3'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size:    'md'
    }
  }
)

type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
  }

export function Button({ variant, size, isLoading, className, children, ...props }: ButtonProps) {
  return (
    <button
      disabled={isLoading || props.disabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading && <span className="animate-spin text-sm">⟳</span>}
      {children}
    </button>
  )
}

// Usage — clean, semantic, type-safe:
<Button>Primary</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" isLoading>Deleting…</Button>
```

### Tool 2 — Shared Class Constants (Middle Ground)

```tsx
// src/lib/styles.ts
// For patterns that appear in JSX but don't warrant a full component

export const inputBase = [
  "w-full px-3 py-2.5 text-sm rounded-xl",
  "bg-white dark:bg-gray-900",
  "border border-gray-300 dark:border-gray-600",
  "text-gray-900 dark:text-white",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-blue-500",
  "focus:border-transparent",
  "transition-colors duration-150",
].join(" ");

export const inputError = [
  "border-red-400 dark:border-red-500",
  "focus:ring-red-400 dark:focus:ring-red-500",
].join(" ");

export const labelBase =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

export const cardBase = [
  "bg-white dark:bg-gray-800",
  "border border-gray-200 dark:border-gray-700",
  "rounded-2xl shadow-sm",
].join(" ");

// Usage:
import { inputBase, inputError, labelBase, cardBase } from "@/lib/styles";

<div className={cardBase}>
  <label className={labelBase}>Email</label>
  <input
    type="email"
    className={`${inputBase} ${hasError ? inputError : ""}`}
  />
</div>;
```

### Tool 3 — `@apply` (Last Resort: Non-JSX Contexts Only)

```css
/* Use @apply ONLY when you cannot use a React component: */
/* ✅ Email templates (no JSX) */
/* ✅ CMS-generated HTML you can't add classes to */
/* ✅ Third-party library base style overrides */
/* ❌ Regular React components — use component extraction instead */

/* src/app/globals.css */
@layer components {
  /* For CMS-rendered prose content where you can't add classes */
  .prose-acme {
    @apply text-gray-700 leading-relaxed;
  }
  .prose-acme h1 {
    @apply text-3xl font-bold text-gray-900 mb-6;
  }
  .prose-acme h2 {
    @apply text-2xl font-semibold text-gray-900 mb-4 mt-8;
  }
  .prose-acme p {
    @apply mb-4 text-gray-600;
  }
  .prose-acme a {
    @apply text-blue-600 underline underline-offset-2
                          hover:text-blue-800 transition-colors;
  }
  .prose-acme code {
    @apply font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded;
  }

  /* For a third-party date picker you can't modify directly */
  .datepicker-override .rdp-button:hover {
    @apply bg-blue-50 text-blue-700;
  }
}
```

---

## W — Why It Matters

- The primary tool for controlling duplication in Tailwind is **React component extraction**, not `@apply`. A `<Button>` component with variant props is more maintainable than a `.btn` CSS class because it's type-safe, supports composition, carries default props, and lives where it's used.
- `cva` (class-variance-authority) solves the variant management problem — a button with 5 variants × 5 sizes is 25 combinations. `cva` handles the matrix cleanly without 25 separate class strings, and integrates with TypeScript for compile-time variant validation.
- `@apply` in `@layer components` should be reserved for content you cannot control — CMS HTML, email templates, third-party widget overrides. Using it for your own React components recreates the naming problem Tailwind eliminates.

---

## I — Interview Q&A

### Q1: How do you prevent utility class duplication in a large Tailwind codebase?

**A:** The primary strategy is React component extraction — move repeated class combinations into a typed component with variant props managed by `cva`. This is better than `@apply` because the component is composable, testable, supports TypeScript, and keeps styles co-located with markup. For patterns that appear in JSX but are simpler than a full component, export shared class string constants from a `styles.ts` file and import them where needed. Use `@apply` only as a last resort for non-JSX contexts: CMS-generated HTML, email templates, or third-party widget overrides where you cannot add classes to the elements.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Reaching for `@apply` instead of extracting a component

```css
/* ❌ @apply for a component pattern */
@layer components {
  .card {
    @apply bg-white border border-gray-200 rounded-2xl p-6 shadow-sm;
  }
  .card-title {
    @apply text-xl font-semibold text-gray-900;
  }
}
```

**Fix:** Extract a `<Card>` React component:

```tsx
{
  /* ✅ Component-based extraction */
}
export function Card({ title, children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl p-6 shadow-sm",
        className
      )}
    >
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `<Badge>` component using `cva` with:

1. Variants: `default`, `primary`, `success`, `warning`, `destructive`, `outline`
2. Sizes: `sm`, `md`, `lg`
3. An optional `dot` prop that shows a colored indicator dot
4. An `Icon` slot prop for an optional leading icon
5. `className` override support via `cn()`
6. Export `badgeVariants` for use outside the component

### Solution

```tsx
// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn }                      from '@/lib/cn'

export const badgeVariants = cva(
  // Base
  'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        primary:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        success:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        warning:     'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        destructive: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        outline:     'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
      },
      size: {
        sm: 'px-2    py-0.5 text-[10px] tracking-wider uppercase',
        md: 'px-2.5  py-1   text-xs',
        lg: 'px-3    py-1.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size:    'md'
    }
  }
)

const DOT_COLORS: Record<string, string> = {
  default:     'bg-gray-400',
  primary:     'bg-blue-500',
  success:     'bg-green-500',
  warning:     'bg-amber-500',
  destructive: 'bg-red-500',
  outline:     'bg-gray-400'
}

const DOT_SIZES: Record<string, string> = {
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5'
}

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?:  boolean
  icon?: React.ReactNode
}

export function Badge({
  variant = 'default',
  size    = 'md',
  dot     = false,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {/* Leading dot */}
      {dot && (
        <span className={cn(
          'rounded-full animate-pulse',
          DOT_COLORS[variant ?? 'default'],
          DOT_SIZES[size ?? 'md']
        )} />
      )}

      {/* Leading icon */}
      {icon && (
        <span className="shrink-0 leading-none">{icon}</span>
      )}

      {children}
    </span>
  )
}

// Usage:
<Badge>Default</Badge>
<Badge variant="primary" dot>Live</Badge>
<Badge variant="success" size="lg">Deployed ✓</Badge>
<Badge variant="destructive" size="sm" dot>Critical</Badge>
<Badge variant="warning" icon="⚠️">Review needed</Badge>
<Badge variant="outline" className="font-mono">v1.2.0</Badge>
```

---

---

# 8 — Component Extraction — When, How, and What NOT to Extract

---

## T — TL;DR

Extract a Tailwind component when the **same structural pattern + class combination** is reused with varying content. Do NOT extract just because the class string is long. The extraction test: if you'd want to change the styling of all instances at once, extract it.

---

## K — Key Concepts

### The Extraction Decision Matrix

```
Extract when:
  ✅ Same structure AND classes appear 3+ times
  ✅ The component has clear variant/size dimensions
  ✅ Styling changes should propagate to all instances
  ✅ The component is a recognisable UI atom (Button, Badge, Card, Input)
  ✅ The component carries behaviour (onClick, onChange, validation)

Do NOT extract when:
  ❌ Classes are long but appear only once or twice
  ❌ The "component" would just be a div with no props
  ❌ Each instance has completely different content/behaviour
  ❌ You're extracting to shorten a className string (not the right reason)
  ❌ It's a layout wrapper with no styling logic
```

### How to Extract — The `cn()` + `className` Prop Pattern

```tsx
// src/lib/cn.ts
// The canonical Tailwind class merging utility
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Why cn() over just clsx()?
// clsx: joins classes and handles conditionals/arrays
// twMerge: resolves Tailwind conflicts (p-4 + px-6 → px-6 only)
// Together: clean conditional classes + correct conflict resolution ✅
```

```tsx
// ─── Base pattern: always accept className prop for extension
interface CardProps {
  children:   React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      // Base styles (always applied)
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-2xl p-6 shadow-sm',
      // Consumer override (applied last, wins conflicts)
      className
    )}>
      {children}
    </div>
  )
}

// Usage — base styles + extension:
<Card>Default card</Card>
<Card className="p-8 shadow-xl">Larger card — p-8 overrides p-6 via twMerge ✅</Card>
<Card className="border-blue-500 shadow-glow-brand">Highlighted card</Card>
```

### Composing Sub-Components vs Monolithic Components

```tsx
// ─── Anti-pattern: monolithic card with too many props
// Every new layout need adds another prop

interface BadCardProps {
  title:         string
  description:   string
  image?:        string
  badge?:        string
  badgeVariant?: 'success' | 'error'
  footer?:       React.ReactNode
  headerAction?: React.ReactNode
  noPadding?:    boolean
  compact?:      boolean
  // ... grows forever
}

// ─── Better pattern: compound component (composable sub-parts)
// Each part is a separate component that composes via children

// Card.Root — container
// Card.Header — top section
// Card.Body — main content
// Card.Footer — bottom section

interface CardHeaderProps {
  children:   React.ReactNode
  className?: string
}

export function CardRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      'rounded-2xl shadow-sm overflow-hidden',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-4',
      'border-b border-gray-100 dark:border-gray-700',
      className
    )}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-4',
      'border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50',
      className
    )}>
      {children}
    </div>
  )
}

// Export as namespace
export const Card = {
  Root:   CardRoot,
  Header: CardHeader,
  Body:   CardBody,
  Footer: CardFooter
}

// Usage — infinitely composable:
<Card.Root>
  <Card.Header>
    <h3 className="font-semibold text-gray-900 dark:text-white">Revenue</h3>
    <Badge variant="success" dot>Live</Badge>
  </Card.Header>
  <Card.Body>
    Chart content
  </Card.Body>
  <Card.Footer>
    <span className="text-xs text-gray-500">Updated 2 min ago</span>
    <Button size="sm" variant="ghost">Refresh</Button>
  </Card.Footer>
</Card.Root>
```

### What NOT to Extract — Layout Wrappers

```tsx
{
  /* ─── Don't extract layout-only wrappers — they add abstraction with no value */
}

{
  /* ❌ Pointless extraction */
}
export function PageContainer({ children }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  );
}

{
  /* The caller has to learn and remember <PageContainer> exists,
    but gets zero visual or behavioural benefit.
    The class string is short and self-evident. */
}

{
  /* ✅ Just write the classes inline */
}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">Page content</div>;

{
  /* ─── Exception: if layout wrapper has logic, extract it */
}
export function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) redirect("/login");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  );
}
{
  /* This one has logic (auth check) → extraction is justified */
}
```

---

## W — Why It Matters

- The `className` prop with `cn()` is the standard pattern for Tailwind component extensibility — every extracted component should accept it. Without it, consumers are forced to add wrapper divs or rewrite the component to add a specific override, which defeats the purpose.
- Compound components (`Card.Root`, `Card.Header`, `Card.Body`) scale better than monolithic components with many props — they're more composable, easier to test, and don't accumulate a growing prop interface as the design evolves.
- The most common mistake is extracting too early — a two-instance pattern is almost always better left as inline utilities. The cognitive overhead of finding the component definition, understanding its props, and tracking its variants exceeds the benefit for two uses. Three uses with identical structure and a clear concept is the threshold.

---

## I — Interview Q&A

### Q1: When should you NOT extract a Tailwind utility combination into a component?

**A:** Don't extract when the combination appears only once or twice — the overhead of defining, exporting, importing, and documenting a component exceeds the maintenance benefit for fewer than three uses. Don't extract layout wrappers that have no logic — a `<div className="max-w-7xl mx-auto px-4">` with children is readable inline and creates unnecessary abstraction as a component. Don't extract to shorten a class string — length is not a valid reason. The test is: if you needed to change the styling of all instances at once, would having a component save you time? If yes and there are 3+ instances, extract. If no, leave it inline.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Extracted component doesn't accept `className` — can't be extended

```tsx
{
  /* ❌ No className prop — every override needs a wrapper div */
}
export function Tag({ children }) {
  return (
    <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded-full">
      {children}
    </span>
  );
}

{
  /* Can't override bg-gray-100 for a specific use case without:
    <div className="special-override"><Tag>...</Tag></div> */
}
```

**Fix:** Always accept and merge `className`:

```tsx
{
  /* ✅ className prop with cn() — allows targeted overrides */
}
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full",
        className // ← twMerge resolves conflicts: bg-gray-100 + bg-blue-100 → bg-blue-100
      )}
    >
      {children}
    </span>
  );
}

{
  /* Override cleanly */
}
<Tag className="bg-blue-100 text-blue-700">Custom</Tag>;
```

---

## K — Coding Challenge + Solution

### Challenge

Extract a fully composable `<Alert>` compound component:

1. `Alert.Root` — container with variant colors (info/success/warning/error)
2. `Alert.Icon` — leading icon slot
3. `Alert.Title` — bold heading
4. `Alert.Description` — body text
5. `Alert.Action` — optional CTA link or button
6. All parts accept `className` for extension
7. Root uses `cva` for variant management
8. Demo showing all 4 variants composed with different sub-parts

### Solution

```tsx
// src/components/ui/alert.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("flex gap-3 p-4 rounded-xl border", {
  variants: {
    variant: {
      info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
      success:
        "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
      warning:
        "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
      error:
        "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    },
  },
  defaultVariants: { variant: "info" },
});

type AlertRootProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

function AlertRoot({ variant, className, children, ...props }: AlertRootProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AlertIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("shrink-0 text-lg leading-5 mt-0.5", className)}>
      {children}
    </span>
  );
}

function AlertTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-semibold text-sm leading-5", className)}>
      {children}
    </p>
  );
}

function AlertDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm opacity-80 leading-relaxed mt-0.5", className)}>
      {children}
    </p>
  );
}

function AlertAction({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "text-xs font-semibold underline underline-offset-2 mt-1.5 inline-block",
        "hover:opacity-70 transition-opacity",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// ─── Namespace export
export const Alert = {
  Root: AlertRoot,
  Icon: AlertIcon,
  Title: AlertTitle,
  Description: AlertDescription,
  Action: AlertAction,
};

// ─── Re-export variants for external use (e.g. className generation elsewhere)
export { alertVariants };

// ─── Demo: all 4 variants composed differently
export function AlertDemo() {
  return (
    <div className="max-w-lg mx-auto space-y-4 p-6">
      {/* Info — icon + title + description + action */}
      <Alert.Root variant="info">
        <Alert.Icon>ℹ️</Alert.Icon>
        <div className="flex-1 min-w-0">
          <Alert.Title>New update available</Alert.Title>
          <Alert.Description>
            Version 2.4.0 is ready. It includes performance improvements and
            security patches.
          </Alert.Description>
          <Alert.Action href="/changelog">View changelog →</Alert.Action>
        </div>
      </Alert.Root>

      {/* Success — icon + title only */}
      <Alert.Root variant="success">
        <Alert.Icon>✅</Alert.Icon>
        <div>
          <Alert.Title>Changes saved successfully.</Alert.Title>
        </div>
      </Alert.Root>

      {/* Warning — title + description, no icon */}
      <Alert.Root variant="warning">
        <div className="flex-1">
          <Alert.Title>Storage almost full</Alert.Title>
          <Alert.Description>
            You are using 92% of your 5GB storage. Upgrade your plan to avoid
            service interruptions.
          </Alert.Description>
          <Alert.Action href="/billing" className="mt-2">
            Upgrade storage →
          </Alert.Action>
        </div>
      </Alert.Root>

      {/* Error — icon + title + description */}
      <Alert.Root variant="error">
        <Alert.Icon>❌</Alert.Icon>
        <div className="flex-1 min-w-0">
          <Alert.Title>Payment failed</Alert.Title>
          <Alert.Description>
            Your card ending in 4242 was declined. Please update your payment
            method to continue.
          </Alert.Description>
          <Alert.Action href="/billing">Update payment method →</Alert.Action>
        </div>
      </Alert.Root>

      {/* Overridden via className — demonstrates extensibility */}
      <Alert.Root variant="info" className="border-2 border-blue-400 shadow-md">
        <Alert.Icon>🚀</Alert.Icon>
        <div>
          <Alert.Title className="text-base">
            Custom override via className
          </Alert.Title>
          <Alert.Description>
            The Root's className merged via twMerge — border-blue-200 was
            replaced by border-blue-400 cleanly. ✅
          </Alert.Description>
        </div>
      </Alert.Root>
    </div>
  );
}
```

---

---

# 9 — Style Conflict Handling — Specificity, Merging, `cn()`, `twMerge`

---

## T — TL;DR

Tailwind utilities are all the same specificity — the **last class wins** in the generated CSS. When you compose components and pass `className` overrides, two conflicting utilities for the same property (e.g., `p-4` + `p-6`) do NOT automatically resolve — you need **`tailwind-merge`** (`twMerge`) to remove the losing class and keep only the winner.

---

## K — Key Concepts

### Why Tailwind Conflicts Happen

```tsx
{
  /* ─── All Tailwind utilities have identical specificity */
}
{
  /* CSS rule: whichever class is LATER in the stylesheet wins */
}
{
  /* But Tailwind's stylesheet order is determined at BUILD TIME */
}
{
  /* NOT by the order of classes in your className string */
}

{
  /* ❌ This does NOT reliably produce padding: 1.5rem */
}
<div className="p-4 p-6">
  {/* p-4 and p-6 are both in the stylesheet */}
  {/* Whichever appears LATER in the generated CSS wins */}
  {/* That order is alphabetical/content-scan order — not your className order */}
  {/* Result is unpredictable across builds */}
</div>;

{
  /* The real problem: component + className override */
}
function Card({ className, children }) {
  return (
    <div className={`p-4 bg-white rounded-xl ${className}`}>{children}</div>
  );
}

{
  /* ❌ p-4 and p-8 are BOTH in className — conflict! */
}
{
  /* className string is "p-4 bg-white rounded-xl p-8" */
}
{
  /* Which padding wins? Depends on stylesheet order — not what you passed */
}
<Card className="p-8">Content</Card>;
```

### `tailwind-merge` — The Solution

```tsx
// npm install tailwind-merge clsx

// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// How it works:
// 1. clsx()    → joins class strings, handles arrays/objects/conditionals
// 2. twMerge() → removes conflicting Tailwind utilities, keeping the LAST one

// Example:
twMerge("p-4 p-6"); // → 'p-6' (p-4 removed ✅)
twMerge("p-4 px-6"); // → 'p-4 px-6' (different axes — both kept ✅)
twMerge("bg-red-500 bg-blue-600"); // → 'bg-blue-600' (bg-red-500 removed ✅)
twMerge("text-sm font-bold text-lg"); // → 'font-bold text-lg' ✅
twMerge("rounded rounded-xl"); // → 'rounded-xl' ✅

// With clsx conditionals:
cn("p-4", isLarge && "p-8");
// isLarge=true  → twMerge('p-4 p-8') → 'p-8' ✅
// isLarge=false → twMerge('p-4')     → 'p-4' ✅
```

### What `twMerge` Understands

```tsx
// twMerge knows Tailwind's class groups — it resolves:

// Padding conflicts (all axes and sides)
twMerge("p-4 px-6"); // 'p-4 px-6'  — px overrides p on x-axis only
twMerge("px-4 px-6"); // 'px-6'       — same axis, last wins
twMerge("p-4 pt-6"); // 'p-4 pt-6'   — pt overrides p on top only
twMerge("p-4 p-6"); // 'p-6'        — same group, last wins

// Color conflicts
twMerge("text-red-500 text-blue-600"); // 'text-blue-600'
twMerge("bg-white bg-gray-900"); // 'bg-gray-900'
twMerge("bg-white/50 bg-white/80"); // 'bg-white/80'

// Size conflicts
twMerge("w-4 w-8"); // 'w-8'
twMerge("text-sm text-lg"); // 'text-lg'
twMerge("rounded rounded-xl"); // 'rounded-xl'

// Shadow/ring conflicts
twMerge("shadow shadow-xl"); // 'shadow-xl'
twMerge("ring-2 ring-4"); // 'ring-4'

// What twMerge does NOT resolve (different properties — both kept):
twMerge("p-4 m-4"); // 'p-4 m-4'   — different properties ✅
twMerge("text-sm font-bold"); // 'text-sm font-bold' — different props ✅
twMerge("bg-blue-600 text-white"); // 'bg-blue-600 text-white' — different ✅
```

### `cn()` Usage Patterns

```tsx
import { cn } from "@/lib/cn";

// ─── Pattern 1: Component with className override
function Badge({ className, children, variant = "default" }) {
  return (
    <span
      className={cn(
        // Base styles
        "inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full",
        // Variant styles
        variant === "success" && "bg-green-100 text-green-700",
        variant === "error" && "bg-red-100 text-red-700",
        variant === "default" && "bg-gray-100 text-gray-700",
        // Consumer override — wins over base via twMerge
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Pattern 2: Conditional classes (clean, no template literals)
function Button({ isActive, isDisabled, size, children }) {
  return (
    <button
      className={cn(
        // Always applied
        "inline-flex items-center font-semibold rounded-xl transition-all",
        // Conditional
        isActive && "bg-blue-600 text-white",
        !isActive && "bg-gray-100 text-gray-700 hover:bg-gray-200",
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        // Size variant
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base"
      )}
    >
      {children}
    </button>
  );
}

// ─── Pattern 3: Object syntax for readable conditionals
function Input({ hasError, isDisabled, className }) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2.5 text-sm rounded-xl border transition-colors",
        "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
        "focus:outline-none focus:ring-2 focus:border-transparent",
        {
          // Object form: { className: condition }
          "border-gray-300 dark:border-gray-600 focus:ring-blue-500": !hasError,
          "border-red-400 dark:border-red-500 focus:ring-red-400": hasError,
          "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800":
            isDisabled,
        },
        className
      )}
    />
  );
}

// ─── Pattern 4: Spreading arrays
function NavItem({ isActive, className, children }) {
  return (
    <a
      className={cn(
        [
          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm",
          "transition-colors duration-150",
          isActive
            ? ["bg-blue-600 text-white font-semibold"]
            : [
                "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                "dark:text-gray-400 dark:hover:bg-gray-800",
              ],
        ],
        className
      )}
    >
      {children}
    </a>
  );
}
```

### Configuring `twMerge` for Custom Utilities

```tsx
// src/lib/cn.ts
// When you have custom @theme utilities, twMerge needs to know about them
// so it can resolve conflicts involving your custom classes

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Extend twMerge to understand your custom theme tokens
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Tell twMerge that shadow-glow-brand belongs to the shadow group
      shadow: ["shadow-glow-brand", "shadow-card", "shadow-card-hover"],
      // Custom font sizes from @theme
      "font-size": ["text-display", "text-caption"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}

// Now this resolves correctly:
cn("shadow-lg shadow-glow-brand"); // → 'shadow-glow-brand' (conflict resolved ✅)
cn("shadow-glow-brand shadow-card"); // → 'shadow-card' ✅
```

### Common Specificity Pitfalls

```tsx
{
  /* ─── Pitfall 1: Inline styles always win over Tailwind utilities */
}
<div
  style={{ padding: "8px" }} // ← wins: inline styles = highest specificity
  className="p-4" // ← loses: utility = lower specificity
>
  Padding is 8px not 16px
</div>;

{
  /* Fix: don't mix inline styles and Tailwind for the same property */
}

{
  /* ─── Pitfall 2: CSS Modules + Tailwind specificity clash */
}
import styles from "./Component.module.css";
// .component { padding: 2rem !important } ← CSS module class

<div className={cn(styles.component, "p-4")}>
  {/* If CSS module has !important, it wins over Tailwind utility */}
</div>;

{
  /* Fix: don't use !important in CSS modules — use Tailwind's ! modifier
    (see Subtopic 10) or specificity selectors */
}

{
  /* ─── Pitfall 3: Third-party CSS overriding Tailwind */
}
{
  /* If a library's stylesheet loads AFTER Tailwind, its rules win */
}
{
  /* Fix: use Tailwind's layer system — Tailwind utilities are in @layer utilities */
}
{
  /* Any CSS outside a layer has HIGHER specificity than layered CSS */
}
```

---

## W — Why It Matters

- `tailwind-merge` is not optional in component-based Tailwind projects — any component that accepts `className` for extension will produce style conflicts without it. Every UI library built on Tailwind (shadcn/ui, Radix themes, etc.) uses `twMerge` for exactly this reason.
- The distinction between `clsx` and `twMerge` is important — `clsx` handles JavaScript-level class manipulation (arrays, conditionals, objects) but produces conflicts; `twMerge` resolves Tailwind-level conflicts but doesn't handle conditionals elegantly alone. The `cn()` utility combining both is the canonical solution used across the ecosystem.
- Understanding that Tailwind utility specificity is determined by **stylesheet position** (set at build time), not className string order, explains why two conflicting utilities in a string produce unpredictable results without `twMerge`.

---

## I — Interview Q&A

### Q1: Why can't you just order classes correctly in a className string to resolve Tailwind conflicts?

**A:** Tailwind generates one CSS file at build time and orders utility classes within it based on content scanning — not based on the order they appear in your JSX className strings. So `className="p-4 p-6"` and `className="p-6 p-4"` produce the same CSS — whichever of `p-4` or `p-6` appears later in the generated stylesheet wins. That order is determined by the scanner, not you. This is why `tailwind-merge` is required — it operates on the JavaScript level before the CSS is applied, removing conflicting classes from the string so only one utility per property group reaches the browser.

### Q2: What is the difference between `clsx` and `tailwind-merge`, and why do you need both?

**A:** `clsx` is a JavaScript utility that joins class strings while handling conditionals, arrays, and objects — it solves the ergonomics of building dynamic class strings in JSX. But it has no knowledge of Tailwind and won't resolve conflicting utilities. `tailwind-merge` understands Tailwind's class groups and removes utilities that conflict with later utilities for the same CSS property — `twMerge('p-4 p-8')` returns `'p-8'` because it knows `p-4` and `p-8` both set `padding`. You need both: `clsx` for clean conditional class building, `twMerge` for conflict resolution. The `cn()` helper composes them: `clsx` runs first to produce a flat string, then `twMerge` resolves any Tailwind conflicts in that string.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using string concatenation instead of `cn()` for conditional classes

```tsx
{
  /* ❌ Template literal — produces conflicting classes, hard to read */
}
<button
  className={`
  px-4 py-2 rounded-xl font-semibold transition-colors
  ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}
  ${size === "lg" ? "text-base px-6 py-3" : "text-sm"}
`}
>
  {/* px-4 AND px-6 are both in the string when size==='lg' */}
  {/* Template literals concatenate — twMerge doesn't run — conflict! */}
</button>;
```

**Fix:** Use `cn()`:

```tsx
{/* ✅ cn() handles conditionals AND resolves conflicts */}
<button className={cn(
  'px-4 py-2 rounded-xl font-semibold transition-colors',
  isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700',
  size === 'lg' && 'text-base px-6 py-3'  // px-6 overwrites px-4 via twMerge ✅
)}>
```

### ❌ Pitfall: Forgetting `twMerge` in a component's `className` merge

```tsx
{
  /* ❌ Simple string join — conflicts not resolved */
}
function Card({ className, children }) {
  return (
    <div className={`p-6 bg-white rounded-xl ${className ?? ""}`}>
      {/* className="p-10" → string is "p-6 bg-white rounded-xl p-10" */}
      {/* Both p-6 and p-10 exist — result is unpredictable */}
    </div>
  );
}
```

**Fix:**

```tsx
{
  /* ✅ cn() resolves: p-6 is removed, p-10 wins */
}
function Card({ className, children }) {
  return (
    <div className={cn("p-6 bg-white rounded-xl", className)}>{children}</div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<Input>` component that:

1. Has base styles merged via `cn()`
2. Accepts a `state` prop: `'default' | 'error' | 'success' | 'disabled'`
3. When a consumer passes `className="text-lg px-5"` — `text-lg` overrides base `text-sm`, `px-5` overrides base `px-3` via `twMerge`
4. Renders a `<FormField>` wrapper with label, helper text, and error message
5. Shows that `cn('border-gray-300', state === 'error' && 'border-red-400')` correctly resolves to only one border color
6. Configure `extendTailwindMerge` to handle a custom `input-base` class group

### Solution

```tsx
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Teach twMerge that these custom classes belong to the shadow group
      shadow: ["shadow-card", "shadow-card-hover", "shadow-glow-brand"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// src/components/ui/input.tsx
import { cn } from "@/lib/cn";

type InputState = "default" | "error" | "success" | "disabled";

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "disabled"
> {
  state?: InputState;
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

// Separate state-driven class maps for clarity
const STATE_BORDER: Record<InputState, string> = {
  default:
    "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent",
  error:
    "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-transparent",
  success:
    "border-green-400 dark:border-green-600 focus:ring-green-400 focus:border-transparent",
  disabled: "border-gray-200 dark:border-gray-700 cursor-not-allowed",
};

const STATE_BG: Record<InputState, string> = {
  default: "bg-white dark:bg-gray-900",
  error: "bg-red-50/30 dark:bg-red-900/10",
  success: "bg-green-50/30 dark:bg-green-900/10",
  disabled: "bg-gray-50 dark:bg-gray-800",
};

const STATE_TEXT: Record<InputState, string> = {
  default: "text-gray-900 dark:text-white placeholder:text-gray-400",
  error: "text-gray-900 dark:text-white placeholder:text-red-300",
  success: "text-gray-900 dark:text-white placeholder:text-gray-400",
  disabled: "text-gray-400 dark:text-gray-500 placeholder:text-gray-300",
};

const STATE_ICON: Record<InputState, string | null> = {
  default: null,
  error: "⚠️",
  success: "✓",
  disabled: null,
};

const STATE_HELPER_COLOR: Record<InputState, string> = {
  default: "text-gray-500 dark:text-gray-400",
  error: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
  disabled: "text-gray-400 dark:text-gray-500",
};

export function Input({
  state = "default",
  label,
  helperText,
  errorMessage,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;
  const helperText_ =
    state === "error" && errorMessage ? errorMessage : helperText;
  const icon = STATE_ICON[state];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium",
            state === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-700 dark:text-gray-300"
          )}
        >
          {label}
        </label>
      )}

      {/* Input wrapper — for trailing icon */}
      <div className="relative">
        <input
          id={inputId}
          disabled={state === "disabled"}
          aria-invalid={state === "error"}
          aria-describedby={helperText_ ? `${inputId}-helper` : undefined}
          className={cn(
            // Base
            "w-full px-3 py-2.5 text-sm rounded-xl border",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2",
            // State-driven (cn resolves conflicts — only ONE border color wins)
            STATE_BG[state],
            STATE_BORDER[state],
            STATE_TEXT[state],
            // Icon padding if needed
            icon && "pr-9",
            // Disabled pointer events
            state === "disabled" && "cursor-not-allowed",
            // Consumer override — applied LAST so twMerge keeps consumer's value
            // e.g. className="text-lg px-5" → text-sm removed, px-3 removed ✅
            className
          )}
          {...props}
        />

        {/* State icon */}
        {icon && (
          <span
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none",
              state === "error" && "text-red-500",
              state === "success" && "text-green-500"
            )}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Helper / error text */}
      {helperText_ && (
        <p
          id={`${inputId}-helper`}
          role={state === "error" ? "alert" : undefined}
          className={cn("text-xs", STATE_HELPER_COLOR[state])}
        >
          {helperText_}
        </p>
      )}
    </div>
  );
}

// ─── Demo: shows twMerge override behaviour
export function InputDemo() {
  return (
    <div className="max-w-sm mx-auto p-6 space-y-5">
      <Input
        label="Email address"
        placeholder="you@example.com"
        helperText="We'll never share your email."
      />
      <Input
        state="error"
        label="Username"
        defaultValue="ab"
        errorMessage="Username must be at least 3 characters."
      />
      <Input
        state="success"
        label="Password"
        type="password"
        defaultValue="correct-horse-battery"
        helperText="Strong password ✓"
      />
      <Input
        state="disabled"
        label="Account ID"
        defaultValue="usr_abc123"
        helperText="Cannot be changed."
      />
      {/* Consumer override — text-lg and px-5 win over base text-sm and px-3 */}
      <Input
        label="Custom sized input"
        placeholder="Large input…"
        className="text-lg px-5 py-3 rounded-2xl"
        helperText="text-sm → text-lg, px-3 → px-5 via twMerge ✅"
      />
    </div>
  );
}
```

---

---

# 10 — `!important` — Forced Overrides and When They Are Justified

---

## T — TL;DR

Tailwind's `!` prefix generates `!important` for any utility — `!p-4` → `padding: 1rem !important`. Use it as a **last resort** when third-party CSS, injected styles, or unavoidable specificity conflicts cannot be fixed any other way. Overusing `!important` creates a specificity war you can never win cleanly.

---

## K — Key Concepts

### The `!` Modifier Syntax

```tsx
{/* ─── Prefix any utility with ! to add !important */}

<div className="!p-4">
  {/* padding: 1rem !important */}
</div>

<p className="!text-white">
  {/* color: #fff !important */}
</p>

<div className="!bg-blue-600">
  {/* background-color: #2563eb !important */}
</div>

{/* ─── Works with ALL utilities and ALL variants */}
<div className="hover:!bg-red-500">
  {/* hover: background-color: #ef4444 !important */}
</div>

<div className="dark:!text-white">
  {/* dark mode: color: #fff !important */}
</div>

<div className="sm:!p-8">
  {/* sm breakpoint: padding: 2rem !important */}
</div>

<div className="focus:!ring-red-500">
  {/* focus: ring with red-500 !important */}
</div>

{/* ─── Combined variant + ! */}
<div className="dark:hover:!bg-gray-900">
  {/* dark + hover: background-color: #111827 !important */}
</div>
```

### When `!important` IS Justified

```tsx
{
  /* ─── Case 1: Third-party library CSS that uses !important internally */
}
{
  /* Some libraries (old datepickers, rich text editors, map widgets) */
}
{
  /* set styles with !important — you MUST match it to override */
}

{
  /* Third-party: .react-datepicker { background: white !important } */
}
<div className="[&_.react-datepicker]:!bg-gray-900">
  {/* Overrides the library's !important */}
  <DatePicker />
</div>;

{
  /* ─── Case 2: Injected/server-rendered HTML you cannot add classes to */
}
{
  /* e.g. HTML from a headless CMS with inline styles */
}
<div
  className="[&_*]:!font-sans [&_p]:!text-gray-700 [&_p]:!leading-relaxed"
  dangerouslySetInnerHTML={{ __html: cmsContent }}
/>;
{
  /* Inline styles on CMS elements have specificity 1,0,0 */
}
{
  /* !important gives us specificity 1,0,0,!important — wins */
}

{
  /* ─── Case 3: Email template reset */
}
{
  /* Email clients inject their own CSS */
}
<td className="!p-0 !m-0 !border-0">
  {/* Forces reset against email client injected styles */}
</td>;

{
  /* ─── Case 4: Accessibility override */
}
{
  /* Forced color mode / high contrast mode bypass */
}
<div className="forced-colors:!bg-transparent forced-colors:!border-current">
  {/* Respects Windows High Contrast mode */}
</div>;

{
  /* ─── Case 5: Animation keyframe override */
}
{
  /* Some animation utilities need !important to override base transforms */
}
<div className="animate-bounce !transform-none">
  {/* Stop animation on reduced motion */}
</div>;
```

### When `!important` is NOT Justified

```tsx
{/* ─── Anti-pattern 1: Using ! to shortcut a specificity problem you caused */}
{/* If your own CSS files conflict with Tailwind, fix the CSS — don't add ! */}

// globals.css (BAD):
.card { background: white; } /* This has higher specificity outside @layer */

// Component (WRONG fix):
<div className="!bg-gray-900">  {/* ← ! to fight your own CSS ❌ */}

// Correct fix: put your CSS in @layer so Tailwind utilities win
// @layer base { .card { background: white; } }

{/* ─── Anti-pattern 2: Using ! for theming / variant logic */}
{/* Use cva/cn/data-attributes instead */}

{/* ❌ Using ! to force a hover state that "doesn't work" */}
<button className="bg-gray-200 !hover:bg-blue-600">
  {/* hover: works fine without ! — debug the actual problem first */}
</button>

{/* ─── Anti-pattern 3: ! creep — starts with one, grows to many */}
{/* Once you use !important, everything competing with it also needs ! */}
{/* This is the specificity war — avoid starting it */}
<div className="!p-4 !m-2 !bg-white !text-black !border !border-gray-200">
  {/* You're now committed to ! everywhere for this element */}
</div>
```

### `!important` with `@apply`

```css
/* src/app/globals.css */

/* You can use !important inside @apply too */
@layer utilities {
  /* Force reset — for email templates */
  .reset-all {
    @apply !p-0 !m-0 !border-0 !bg-transparent !shadow-none;
  }
}

/* Or directly in CSS with Tailwind @apply */
.third-party-override {
  @apply !bg-gray-900 !text-white;
  /* Generates:
     background-color: #111827 !important;
     color: #ffffff !important; */
}
```

### `@layer` — The Better Alternative to `!important`

```css
/* ─── Understanding why @layer prevents most !important needs */

/* CSS @layer specificity order (lowest to highest): */
/* @layer base → @layer components → @layer utilities → unlayered CSS */

/* Tailwind's utilities are in @layer utilities */
/* Any CSS written OUTSIDE a layer is UNLAYERED → higher specificity */

/* ❌ This beats Tailwind utilities (unlayered = higher specificity): */
.my-component {
  padding: 2rem; /* No @layer — beats bg-white, p-4, etc. */
}

/* ✅ This loses to Tailwind utilities (inside @layer base): */
@layer base {
  .my-component {
    padding: 2rem; /* @layer base → lower than @layer utilities */
  }
}

/* So: if YOUR CSS is conflicting with Tailwind, put it in @layer base */
/* and you DON'T need !important */
@layer base {
  /* These are overridable by Tailwind utilities */
  h1,
  h2,
  h3 {
    font-weight: 600;
    line-height: 1.25;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
}
```

---

## W — Why It Matters

- `!important` should be rare — one or two instances per large project for genuine third-party conflicts. If you're adding `!` to many utilities, it signals a structural CSS architecture problem (CSS outside layers competing with Tailwind, or a library with aggressive styles) that needs a different solution.
- The `@layer` approach eliminates 90% of perceived `!important` needs — most cases where Tailwind utilities "don't work" are because project CSS is written outside a layer, giving it higher specificity. Moving it inside `@layer base {}` restores the correct priority without any `!important`.
- The `forced-colors:!bg-transparent` pattern is the accessibility use case where `!` is genuinely required — Windows High Contrast mode forces its own colors via `!important`, and you must match it to create properly accessible UI in that mode.

---

## I — Interview Q&A

### Q1: When is using `!important` in Tailwind justified and what is the syntax?

**A:** The `!` prefix generates `!important` for any utility — `!p-4` produces `padding: 1rem !important`. It's justified in three main scenarios: overriding third-party library CSS that itself uses `!important` (you must match specificity level to win); overriding injected styles or CMS-rendered HTML with inline styles (inline styles have the highest specificity — `!important` is required to beat them); and email template CSS resets where email clients inject their own styles aggressively. It is not justified for fighting your own CSS conflicts — use `@layer` to fix the architecture instead. Adding `!` to utilities should be rare and always accompanied by a comment explaining why it's necessary.

### Q2: How does CSS `@layer` relate to Tailwind's utility specificity, and how can it prevent most `!important` needs?

**A:** CSS `@layer` creates an explicit cascade ordering — styles in earlier-declared layers lose to styles in later layers, regardless of specificity. Tailwind places its utilities in `@layer utilities`. Any CSS you write outside a `@layer` declaration is "unlayered" — and unlayered CSS has higher specificity than any layered CSS. This means your own CSS classes written outside a layer will override Tailwind utilities, which looks like "Tailwind isn't working." The fix is to put your CSS inside `@layer base { }` so it sits below `@layer utilities` in the cascade. Once your CSS is properly layered, Tailwind utilities win without any `!important`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `!` to fix a problem caused by unlayered project CSS

```css
/* ❌ CSS written outside @layer — beats ALL Tailwind utilities */
/* styles.css */
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
}
```

```tsx
{
  /* ❌ "Fix" with ! — starts the specificity war */
}
<div className="card !bg-gray-900 !p-8 !rounded-2xl">Dark card</div>;
```

**Fix:** Put your CSS inside `@layer base` or `@layer components`:

```css
/* ✅ Layered CSS — Tailwind utilities override it cleanly */
@layer components {
  .card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
  }
}
```

```tsx
{
  /* ✅ No ! needed — Tailwind utilities win over layered CSS */
}
<div className="card bg-gray-900 p-8 rounded-2xl">Dark card</div>;
```

### ❌ Pitfall: Applying `!` globally to "make sure" styles apply

```tsx
{
  /* ❌ Defensive ! usage — cargo-culting !important */
}
<div className="!flex !items-center !gap-4 !p-6 !bg-white !rounded-xl">
  Nothing was actually conflicting — ! is just noise
</div>;
```

**Fix:** Only add `!` when you've confirmed a specific conflict exists and traced its source. Use browser DevTools to find the competing rule, then fix the root cause.

---

## K — Coding Challenge + Solution

### Challenge

You are integrating a third-party rich text editor (`RichTextEditor` from a hypothetical library) that:

1. Injects inline styles on its container: `style="background: #fff; padding: 12px"`
2. Uses `!important` internally on `.ql-toolbar { background: #f3f4f6 !important }`
3. Has a class `.ql-editor` with `font-family: Arial`

Your task:

1. Override the inline-style background using `!bg-gray-900` in dark mode via `[&_.ql-container]:dark:!bg-gray-900`
2. Override the toolbar `!important` background using `[&_.ql-toolbar]:dark:!bg-gray-800`
3. Override the font using `[&_.ql-editor]:!font-sans`
4. Wrap it in a component that accepts a `className` override
5. Write a comment for each `!` explaining WHY it's justified

### Solution

```tsx
// src/components/rich-text-wrapper.tsx
import { cn } from "@/lib/cn";

interface RichTextWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function RichTextWrapper({ children, className }: RichTextWrapperProps) {
  return (
    <div
      className={cn(
        // Base wrapper
        "rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700",

        // ─── Override 1: inline style on container
        // The library sets style="background: #fff" directly (inline = specificity 1,0,0)
        // !important (specificity 1,0,0 + !important) is the only way to beat inline styles
        "[&_.ql-container]:dark:!bg-gray-900",

        // ─── Override 2: library's own !important on toolbar
        // .ql-toolbar uses !important internally — we MUST match it to override
        // Verified in DevTools: "background-color: #f3f4f6 !important" in vendor CSS
        "[&_.ql-toolbar]:!bg-gray-50",
        "[&_.ql-toolbar]:dark:!bg-gray-800",
        "[&_.ql-toolbar]:!border-b",
        "[&_.ql-toolbar]:!border-gray-200",
        "[&_.ql-toolbar]:dark:!border-gray-700",

        // ─── Override 3: font-family on editor
        // The library hardcodes font-family: Arial in its own stylesheet (unlayered)
        // which beats our @layer utilities.
        // Correct fix would be to put our base styles in @layer — but we don't
        // control the library's CSS loading order.
        // !important is justified here as the library stylesheet is external/immutable.
        "[&_.ql-editor]:!font-sans",
        "[&_.ql-editor]:!text-gray-900",
        "[&_.ql-editor]:dark:!text-white",
        "[&_.ql-editor]:!text-sm",
        "[&_.ql-editor]:!leading-relaxed",
        "[&_.ql-editor]:!p-4",

        // ─── Consumer override (no ! — consumer can further override) ✅
        className
      )}
    >
      {children}
    </div>
  );
}

// Usage:
// <RichTextWrapper>
//   <RichTextEditor value={content} onChange={setContent} />
// </RichTextWrapper>
//
// With className override:
// <RichTextWrapper className="border-blue-500 rounded-2xl">
//   <RichTextEditor />
// </RichTextWrapper>
```

---

---

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
