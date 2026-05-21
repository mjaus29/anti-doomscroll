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
