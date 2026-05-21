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
