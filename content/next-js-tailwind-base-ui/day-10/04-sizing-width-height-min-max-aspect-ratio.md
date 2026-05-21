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
