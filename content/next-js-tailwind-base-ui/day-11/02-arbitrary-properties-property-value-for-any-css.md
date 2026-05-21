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
