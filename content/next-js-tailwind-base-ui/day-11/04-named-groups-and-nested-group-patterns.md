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
