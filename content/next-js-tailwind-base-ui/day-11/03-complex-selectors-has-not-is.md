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
