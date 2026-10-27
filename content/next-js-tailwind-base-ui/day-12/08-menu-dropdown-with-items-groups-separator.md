# 8 — Menu — Dropdown with Items, Groups, Separator

---

## T — TL;DR

`Menu` renders an accessible command list — keyboard navigable with arrow keys, typeahead search, and correct `role="menu"` / `role="menuitem"` ARIA. Anatomy: `Root → Trigger → Portal → Positioner → Popup → Item | Group | GroupLabel | Separator`.

---

## K — Key Concepts

### Reusable Menu Wrapper

```tsx
// src/components/ui/menu.tsx
"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/cn";

const MenuRoot = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

function MenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  children,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "min-w-[180px] max-w-xs p-1.5",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-xl z-50 outline-none",
            "transition-all duration-150 ease-out origin-(--transform-origin)",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({
  className,
  icon,
  shortcut,
  children,
  ...props
}: MenuPrimitive.Item.Props & {
  icon?: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-xl",
        "text-sm text-gray-700 dark:text-gray-300",
        "cursor-pointer select-none outline-none",
        "transition-colors duration-100",
        "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700",
        "data-[highlighted]:text-gray-900 dark:data-[highlighted]:text-white",
        "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className="shrink-0 text-base text-gray-400
                                  data-[highlighted]:text-gray-600"
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">{children}</span>
      {shortcut && (
        <span
          className="shrink-0 text-xs text-gray-400 dark:text-gray-500
                           font-mono ml-auto"
        >
          {shortcut}
        </span>
      )}
    </MenuPrimitive.Item>
  );
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn("my-1 h-px bg-gray-100 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

function MenuGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <MenuPrimitive.Group className={cn("", className)}>
      {children}
    </MenuPrimitive.Group>
  );
}

function MenuGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
        "text-gray-400 dark:text-gray-500",
        className
      )}
    >
      {children}
    </MenuPrimitive.GroupLabel>
  );
}

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
};
```

### Usage — Action Dropdown

```tsx
// src/components/action-menu.tsx
import { Menu } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";

export function ActionMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button variant="secondary" size="sm">
            Actions ▾
          </Button>
        }
      />
      <Menu.Content>
        <Menu.Group>
          <Menu.GroupLabel>File</Menu.GroupLabel>
          <Menu.Item icon="📄" shortcut="⌘N" onClick={() => {}}>
            New file
          </Menu.Item>
          <Menu.Item icon="📂" shortcut="⌘O" onClick={() => {}}>
            Open
          </Menu.Item>
          <Menu.Item icon="💾" shortcut="⌘S" onClick={() => {}}>
            Save
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.GroupLabel>Edit</Menu.GroupLabel>
          <Menu.Item icon="✂️" shortcut="⌘X" onClick={() => {}}>
            Cut
          </Menu.Item>
          <Menu.Item icon="📋" shortcut="⌘C" onClick={() => {}}>
            Copy
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item
          icon="🗑️"
          className="text-red-600 dark:text-red-400
                                         data-[highlighted]:bg-red-50
                                         dark:data-[highlighted]:bg-red-900/20"
          onClick={() => {}}
        >
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
```

---

## W — Why It Matters

- `Menu` vs a custom dropdown built with `useState` + `onClick`: Base UI's menu implements all keyboard navigation (arrow keys, Home/End, typeahead) and ARIA (`role="menu"`, `role="menuitem"`) automatically. A custom dropdown that looks like a menu but isn't one is inaccessible by default — screen readers can't navigate it with menu keyboard patterns.
- `onClick` on `Menu.Item` is the correct handler — Base UI has no `onSelect` prop on menu items. Its `onClick` also fires when the item is activated with Enter/Space, so keyboard, mouse and touch behave consistently.
- Destructive items should be visually differentiated (`text-red-600`) and placed after a `Separator` to prevent accidental activation.

---

## I — Interview Q&A

### Q1: Which handler do you use for `Menu.Item` actions — `onClick` or `onSelect`?

**A:** `onClick`. `Menu.Item` documents `onClick` (it receives a `BaseUIEvent` wrapping the React mouse event) and a `closeOnClick` prop (default `true`) that controls whether the menu closes after activation. Base UI items are focusable `role="menuitem"` elements, and activating one with Enter or Space dispatches the same click, so you do not need a separate keyboard handler. `onSelect` is a Radix UI prop name (and the DOM `select` event for text selection) — it is not a Base UI menu item prop, so it is silently ignored.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `onSelect` (Radix habit) instead of `onClick` on Menu.Item

```tsx
{
  /* ❌ onSelect is not a Base UI Menu.Item prop — handleDelete never runs */
}
<Menu.Item onClick={handleDelete}>Delete</Menu.Item>;
```

**Fix:**

```tsx
{
  /* ✅ onClick fires for mouse, touch and keyboard (Enter/Space) activation */
}
<Menu.Item onClick={handleDelete}>Delete</Menu.Item>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<RowActionsMenu>` for a data table row with: Edit, Duplicate, Copy ID, a separator, and Delete (danger styled). Each item calls a different handler. The trigger is an icon-only `⋯` button with `aria-label`.

### Solution

```tsx
// src/components/row-actions-menu.tsx
import { Menu } from "@/components/ui/menu";

interface RowActionsProps {
  id: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RowActionsMenu({
  id,
  onEdit,
  onDuplicate,
  onDelete,
}: RowActionsProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Row actions"
        className="inline-flex items-center justify-center size-8 rounded-lg
                    text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-blue-500
                    data-[popup-open]:bg-gray-100 data-[popup-open]:text-gray-700"
      >
        ⋯
      </Menu.Trigger>
      <Menu.Content side="bottom" align="end">
        <Menu.Item icon="✏️" onClick={onEdit}>
          Edit
        </Menu.Item>
        <Menu.Item icon="📋" onClick={onDuplicate}>
          Duplicate
        </Menu.Item>
        <Menu.Item icon="🔗" onClick={() => navigator.clipboard.writeText(id)}>
          Copy ID
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item
          icon="🗑️"
          onClick={onDelete}
          className="text-red-600 dark:text-red-400
                      data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20
                      data-[highlighted]:text-red-700"
        >
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
```

---

---
