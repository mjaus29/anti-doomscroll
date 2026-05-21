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
